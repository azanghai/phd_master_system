import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.PHD_WORKBENCH_DATA_DIR || path.join(root, "data");
const uploadDir = path.join(dataDir, "attachments");
fs.mkdirSync(uploadDir, { recursive: true });
const db = new DatabaseSync(process.env.PHD_WORKBENCH_DB || path.join(dataDir, "workbench.sqlite"));
db.exec("PRAGMA journal_mode = WAL");
db.exec(fs.readFileSync(path.join(root, "server", "schema.sql"), "utf8"));
if (!db.prepare("PRAGMA table_info(workspace_state)").all().some((column) => column.name === "version")) {
  db.exec("ALTER TABLE workspace_state ADD COLUMN version INTEGER NOT NULL DEFAULT 0");
}
if (!db.prepare("PRAGMA table_info(attachments)").all().some((column) => column.name === "storage_key")) {
  db.exec("ALTER TABLE attachments ADD COLUMN storage_key TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS attachments_user_storage_idx ON attachments(user_id, storage_key)");
}
const sessionDays = Number(process.env.PHD_WORKBENCH_SESSION_DAYS || 14);
const sessionCookie = "phd_session";
const csrfMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const secureCookie = process.env.PHD_WORKBENCH_COOKIE_SECURE === "1";
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;
const backupDir = path.join(dataDir, "backups");
fs.mkdirSync(backupDir, { recursive: true });

const app = express();
app.disable("x-powered-by");
if (process.env.PHD_WORKBENCH_TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(express.json({ limit: "32mb" }));
app.use(cookieParser());

function jsonError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}
function tokenHash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function sameOrigin(req) {
  const origin = req.get("origin");
  if (origin) return origin === `${req.protocol}://${req.get("host")}`;
  const referer = req.get("referer");
  return !referer || new URL(referer).origin === `${req.protocol}://${req.get("host")}`;
}
app.use((req, res, next) => {
  if (csrfMethods.has(req.method) && req.path.startsWith("/api/") && !sameOrigin(req)) {
    return jsonError(res, 403, "CSRF_ORIGIN", "Request origin is not allowed");
  }
  next();
});
app.use((req, res, next) => {
  const token = req.cookies[sessionCookie];
  if (!token) return next();
  const row = db.prepare(`SELECT s.*, u.username, u.role, u.disabled_at FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > datetime('now')`).get(tokenHash(token));
  if (!row || row.disabled_at) return next();
  req.user = { id: row.user_id, username: row.username, role: row.role };
  req.session = row;
  db.prepare("UPDATE sessions SET last_seen_at=datetime('now') WHERE id=?").run(row.id);
  next();
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") && !req.path.startsWith("/api/auth/") && !req.path.startsWith("/api/health")) {
    const lock = db.prepare("SELECT enabled,reason FROM maintenance WHERE id=1").get();
    if (lock?.enabled && !(req.user && req.user.role === "admin")) return jsonError(res, 503, "MAINTENANCE", lock.reason || "System is under maintenance");
  }
  next();
});
function auth(req, res, next) { return req.user ? next() : jsonError(res, 401, "AUTH_REQUIRED", "Authentication required"); }
function admin(req, res, next) { return auth(req, res, () => req.user.role === "admin" ? next() : jsonError(res, 403, "ADMIN_REQUIRED", "Administrator access required")); }
function publicUser(user) { return { id: user.id, username: user.username, role: user.role, createdAt: user.created_at, disabledAt: user.disabled_at || null }; }
function audit(actor, action, targetUserId = null, details = {}) {
  db.prepare("INSERT INTO audit_logs(actor_id,action,target_user_id,details_json) VALUES(?,?,?,?)")
    .run(actor?.id || null, action, targetUserId, JSON.stringify(details));
}
function adminCount() { return db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND disabled_at IS NULL").get().count; }
function serializeBackup() {
  const tables = {};
  for (const table of ["users", "sessions", "workspace_state", "attachments"]) {
    tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  tables.attachments = tables.attachments.map((attachment) => {
    const filePath = path.join(uploadDir, attachment.stored_name);
    if (!fs.existsSync(filePath)) {
      throw Object.assign(new Error(`Attachment file is missing: ${attachment.stored_name}`), { code: "BACKUP_FILE_MISSING" });
    }
    return { ...attachment, dataBase64: fs.readFileSync(filePath).toString("base64") };
  });
  return zlib.gzipSync(Buffer.from(JSON.stringify({ format: "phd-workbench-backup", version: 1, tables })));
}
function restoreBackup(buffer, actor) {
  let payload;
  try { payload = JSON.parse(zlib.gunzipSync(buffer).toString("utf8")); } catch { throw Object.assign(new Error("Invalid backup archive"), { code: "INVALID_BACKUP" }); }
  if (!payload || payload.format !== "phd-workbench-backup" || payload.version !== 1 || !payload.tables ||
      !["users", "sessions", "workspace_state", "attachments"].every((t) => Array.isArray(payload.tables[t]))) {
    throw Object.assign(new Error("Invalid backup archive"), { code: "INVALID_BACKUP" });
  }
  const users = payload.tables.users;
  if (!users.length || users.some((u) => !u.username || !u.password_hash || !["admin", "user"].includes(u.role))) {
    throw Object.assign(new Error("Backup must contain valid users"), { code: "INVALID_BACKUP" });
  }
  const userIds = new Set(users.map((user) => user.id));
  const stagedAttachments = [];
  const stageDir = path.join(backupDir, `restore-stage-${crypto.randomBytes(12).toString("hex")}`);
  try {
    fs.mkdirSync(stageDir, { recursive: true });
    for (const attachment of payload.tables.attachments) {
      if (!userIds.has(attachment.user_id) || typeof attachment.stored_name !== "string" ||
          path.basename(attachment.stored_name) !== attachment.stored_name ||
          !/^[A-Za-z0-9._-]{1,255}$/.test(attachment.stored_name) ||
          typeof attachment.dataBase64 !== "string") {
        throw Object.assign(new Error("Invalid attachment in backup"), { code: "INVALID_BACKUP" });
      }
      let bytes;
      try { bytes = Buffer.from(attachment.dataBase64, "base64"); } catch { bytes = null; }
      if (!bytes || bytes.toString("base64") !== attachment.dataBase64 || bytes.length !== attachment.size) {
        throw Object.assign(new Error("Invalid attachment bytes in backup"), { code: "INVALID_BACKUP" });
      }
      const stagedPath = path.join(stageDir, attachment.stored_name);
      fs.writeFileSync(stagedPath, bytes, { flag: "wx" });
      stagedAttachments.push({ stagedPath, storedName: attachment.stored_name });
    }
  } catch (error) {
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
  const tempPath = path.join(backupDir, `pre-restore-${Date.now()}.json.gz`);
  fs.writeFileSync(tempPath, serializeBackup());
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM attachments; DELETE FROM workspace_state; DELETE FROM sessions; DELETE FROM users;");
    const addUser = db.prepare("INSERT INTO users(id,username,password_hash,role,created_at,disabled_at) VALUES(?,?,?,?,?,?)");
    for (const u of users) addUser.run(u.id, u.username, u.password_hash, u.role, u.created_at, u.disabled_at);
    const addState = db.prepare("INSERT INTO workspace_state(user_id,state_json,version,updated_at) VALUES(?,?,?,?)");
    for (const s of payload.tables.workspace_state) addState.run(s.user_id, s.state_json, s.version, s.updated_at);
    const addAttachment = db.prepare("INSERT INTO attachments(id,user_id,original_name,storage_key,stored_name,mime_type,size,created_at) VALUES(?,?,?,?,?,?,?,?)");
    for (const a of payload.tables.attachments) addAttachment.run(a.id, a.user_id, a.original_name, a.storage_key, a.stored_name, a.mime_type, a.size, a.created_at);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
  for (const attachment of payload.tables.attachments) {
    fs.rmSync(path.join(uploadDir, attachment.stored_name), { force: true });
  }
  for (const staged of stagedAttachments) {
    fs.renameSync(staged.stagedPath, path.join(uploadDir, staged.storedName));
  }
  fs.rmSync(stageDir, { recursive: true, force: true });
  db.prepare("DELETE FROM sessions").run();
  audit(actor, "backup.restore", null, { automaticBackup: tempPath });
  return tempPath;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "phd-workbench", time: new Date().toISOString() }));
app.post("/api/auth/login", (req, res) => {
  const address = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (loginAttempts.get(address) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  if (recent.length >= LOGIN_LIMIT) {
    return jsonError(res, 429, "LOGIN_RATE_LIMITED", "Too many login attempts; try again later");
  }
  const { username, password } = req.body || {};
  const user = typeof username === "string" ? db.prepare("SELECT * FROM users WHERE username=?").get(username.trim()) : null;
  if (!user || user.disabled_at || typeof password !== "string" || !bcrypt.compareSync(password, user.password_hash)) {
    recent.push(now);
    loginAttempts.set(address, recent);
    return jsonError(res, 401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  loginAttempts.delete(address);
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now', ?))")
    .run(tokenHash(token), user.id, `+${sessionDays} days`);
  res.cookie(sessionCookie, token, { httpOnly: true, sameSite: "strict", secure: secureCookie, maxAge: sessionDays * 86400000, path: "/" });
  res.json({ user: publicUser(user) });
});
app.post("/api/auth/logout", (req, res) => {
  if (req.cookies[sessionCookie]) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(req.cookies[sessionCookie]));
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "strict", secure: secureCookie, path: "/" });
  res.json({ ok: true });
});
app.get("/api/auth/me", (req, res) => {
  if (!req.user) return jsonError(res, 401, "AUTH_REQUIRED", "Authentication required");
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  return res.json({ user: publicUser(user) });
});
function createUser(req, res) {
  const { username, password, role = "user" } = req.body || {};
  if (typeof username !== "string" || !/^[A-Za-z0-9_.-]{3,64}$/.test(username) || typeof password !== "string" || password.length < 12 || !["user", "admin"].includes(role)) {
    return jsonError(res, 400, "INVALID_USER", "Username must be 3-64 characters and password at least 12 characters");
  }
  try {
    const result = db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)").run(username, bcrypt.hashSync(password, 12), role);
    res.status(201).json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(result.lastInsertRowid)) });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return jsonError(res, 409, "USERNAME_TAKEN", "Username already exists");
    throw error;
  }
}
app.post("/api/admin/users", admin, createUser);
app.post("/api/auth/users", admin, createUser);
app.get("/api/admin/users", admin, (_req, res) => {
  res.json({ users: db.prepare("SELECT id,username,role,created_at,disabled_at FROM users ORDER BY id").all().map(publicUser) });
});
function updateUser(req, res) {
  const id = Number(req.params.id);
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (!target) return jsonError(res, 404, "NOT_FOUND", "User not found");
  const changes = req.body || {};
  const newRole = changes.role === undefined ? target.role : changes.role;
  const disabling = changes.disabled !== undefined ? Boolean(changes.disabled) : Boolean(target.disabled_at);
  if (!["user", "admin"].includes(newRole) || (id === req.user.id && (newRole !== "admin" || disabling))) {
    return jsonError(res, 400, "SELF_PROTECTION", "You cannot disable or demote your own account");
  }
  if (target.role === "admin" && target.disabled_at === null && (newRole !== "admin" || disabling) && adminCount() <= 1) {
    return jsonError(res, 400, "LAST_ADMIN", "The last active administrator cannot be removed");
  }
  const disabledAt = disabling ? (target.disabled_at || new Date().toISOString()) : null;
  const passwordHash = typeof changes.password === "string"
    ? (changes.password.length >= 12 ? bcrypt.hashSync(changes.password, 12) : null)
    : null;
  if (changes.password !== undefined && !passwordHash) {
    return jsonError(res, 400, "INVALID_PASSWORD", "Password must be at least 12 characters");
  }
  db.prepare("UPDATE users SET role=?,disabled_at=?,password_hash=COALESCE(?,password_hash) WHERE id=?").run(newRole, disabledAt, passwordHash, id);
  if (disabling) db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
  if (passwordHash) db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
  audit(req.user, passwordHash ? "user.password.reset" : changes.role !== undefined ? "user.role.update" : "user.status.update", id, { role: newRole, disabled: disabling });
  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(id)) });
}
app.patch("/api/admin/users/:id", admin, updateUser);
app.put("/api/admin/users/:id/role", admin, updateUser);
app.post("/api/admin/users/:id/disable", admin, (req, res) => { req.body = { ...(req.body || {}), disabled: true }; return updateUser(req, res); });
app.post("/api/admin/users/:id/enable", admin, (req, res) => { req.body = { ...(req.body || {}), disabled: false }; return updateUser(req, res); });
app.post("/api/admin/users/:id/reset-password", admin, (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare("SELECT id FROM users WHERE id=?").get(id);
  if (!target || typeof req.body?.password !== "string" || req.body.password.length < 12) return jsonError(res, 400, "INVALID_PASSWORD", "Password must be at least 12 characters");
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(req.body.password, 12), id);
  db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
  audit(req.user, "user.password.reset", id);
  res.json({ ok: true });
});
app.get(["/api/admin/stats", "/api/admin/system-stats"], admin, (_req, res) => {
  const count = (sql) => db.prepare(sql).get().count;
  res.json({ stats: {
    users: count("SELECT COUNT(*) AS count FROM users"),
    activeUsers: count("SELECT COUNT(*) AS count FROM users WHERE disabled_at IS NULL"),
    admins: count("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND disabled_at IS NULL"),
    sessions: count("SELECT COUNT(*) AS count FROM sessions WHERE expires_at > datetime('now')"),
    attachments: count("SELECT COUNT(*) AS count FROM attachments")
  } });
});
app.get(["/api/admin/backup", "/api/admin/backup/download"], admin, (req, res) => {
  audit(req.user, "backup.download");
  res.type("application/gzip").set("Content-Disposition", `attachment; filename="workbench-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz"`).send(serializeBackup());
});
const backupUpload = multer({ dest: backupDir, limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
app.post(["/api/admin/restore", "/api/admin/backup/restore", "/api/admin/backup"], admin, backupUpload.any(), (req, res) => {
  const file = req.files?.[0];
  if (!file) return jsonError(res, 400, "FILE_REQUIRED", "A backup archive is required");
  db.prepare("INSERT INTO maintenance(id,enabled,reason) VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET enabled=1,reason=excluded.reason,updated_at=datetime('now')").run("Backup restore in progress");
  try {
    restoreBackup(fs.readFileSync(file.path), req.user);
    res.json({ ok: true });
  } catch (error) {
    return jsonError(res, error.code === "INVALID_BACKUP" ? 400 : 500, error.code || "RESTORE_FAILED", error.message);
  } finally {
    fs.rmSync(file.path, { force: true });
    db.prepare("UPDATE maintenance SET enabled=0,reason=NULL,updated_at=datetime('now') WHERE id=1").run();
  }
});
app.post("/api/admin/maintenance", admin, (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  db.prepare("INSERT INTO maintenance(id,enabled,reason) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,reason=excluded.reason,updated_at=datetime('now')").run(enabled ? 1 : 0, enabled ? String(req.body?.reason || "Maintenance") : null);
  audit(req.user, enabled ? "maintenance.enable" : "maintenance.disable");
  res.json({ enabled });
});
app.get("/api/admin/maintenance", admin, (_req, res) => {
  const lock = db.prepare("SELECT enabled,reason,updated_at FROM maintenance WHERE id=1").get();
  res.json({ enabled: Boolean(lock?.enabled), reason: lock?.reason || null, updatedAt: lock?.updated_at || null });
});
app.get("/api/admin/audit", admin, (_req, res) => {
  res.json({ entries: db.prepare("SELECT id,actor_id,action,target_user_id,details_json,created_at FROM audit_logs ORDER BY id DESC LIMIT 500").all() });
});
app.get("/api/workspace/state", auth, (req, res) => {
  const row = db.prepare("SELECT state_json,version,updated_at FROM workspace_state WHERE user_id=?").get(req.user.id);
  res.json({ state: row ? JSON.parse(row.state_json) : {}, version: row?.version || 0, updatedAt: row?.updated_at || null });
});
app.put("/api/workspace/state", auth, (req, res) => {
  const state = req.body?.state ?? req.body;
  let stateJson;
  try { stateJson = JSON.stringify(state); } catch { return jsonError(res, 400, "INVALID_STATE", "Workspace state must be valid JSON"); }
  if (Buffer.byteLength(stateJson) > 5 * 1024 * 1024) return jsonError(res, 413, "STATE_TOO_LARGE", "Workspace state is too large");
  const current = db.prepare("SELECT version FROM workspace_state WHERE user_id=?").get(req.user.id);
  const requestedVersion = req.body?.version;
  if (current && requestedVersion !== undefined && Number(requestedVersion) !== current.version) {
    return jsonError(res, 409, "VERSION_CONFLICT", "Workspace state has changed; reload before saving");
  }
  const version = current ? current.version + 1 : 1;
  db.prepare(`INSERT INTO workspace_state(user_id,state_json,version) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json,version=excluded.version,updated_at=datetime('now')`).run(req.user.id, stateJson, version);
  res.json({ version });
});
// Short aliases keep the API convenient for the desktop/web sync adapter.
app.get("/api/workspace", auth, (req, res) => {
  const row = db.prepare("SELECT state_json,version,updated_at FROM workspace_state WHERE user_id=?").get(req.user.id);
  res.json({ state: row ? JSON.parse(row.state_json) : {}, version: row?.version || 0, updatedAt: row?.updated_at || null });
});
app.put("/api/workspace", auth, (req, res) => {
  const state = req.body?.state ?? req.body;
  let stateJson;
  try { stateJson = JSON.stringify(state); } catch { return jsonError(res, 400, "INVALID_STATE", "Workspace state must be valid JSON"); }
  if (Buffer.byteLength(stateJson) > 5 * 1024 * 1024) return jsonError(res, 413, "STATE_TOO_LARGE", "Workspace state is too large");
  const current = db.prepare("SELECT version FROM workspace_state WHERE user_id=?").get(req.user.id);
  const requestedVersion = req.body?.version;
  if (current && requestedVersion !== undefined && Number(requestedVersion) !== current.version) {
    return jsonError(res, 409, "VERSION_CONFLICT", "Workspace state has changed; reload before saving");
  }
  const version = current ? current.version + 1 : 1;
  db.prepare(`INSERT INTO workspace_state(user_id,state_json,version) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json,version=excluded.version,updated_at=datetime('now')`).run(req.user.id, stateJson, version);
  res.json({ version });
});
app.delete("/api/workspace", auth, (req, res) => {
  db.prepare("DELETE FROM workspace_state WHERE user_id=?").run(req.user.id);
  res.json({ ok: true });
});
app.post("/__sync_proxy__/request", async (req, res) => {
  try {
    const target = new URL(String(req.body?.url || ""));
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS targets are supported");
    const headers = Object.fromEntries(Object.entries(req.body?.headers || {}).map(([key, value]) => [key, String(value)]));
    const init = { method: String(req.body?.method || "GET").toUpperCase(), headers };
    if (typeof req.body?.bodyBase64 === "string" && req.body.bodyBase64) init.body = Buffer.from(req.body.bodyBase64, "base64");
    else if (typeof req.body?.body === "string") init.body = req.body.body;
    const upstream = await fetch(target, init);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    const outputHeaders = Object.fromEntries(upstream.headers.entries());
    res.json({ status: upstream.status, body: req.body?.responseBase64 ? "" : bytes.toString("utf8"),
      bodyBase64: req.body?.responseBase64 ? bytes.toString("base64") : "", headers: outputHeaders,
      etag: outputHeaders.etag || "", lastModified: outputHeaders["last-modified"] || "", size: bytes.length });
  } catch (error) {
    res.status(502).json({ status: 0, body: "", bodyBase64: "", headers: {}, error: error.message || "Proxy request failed" });
  }
});
const upload = multer({ dest: uploadDir, limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
app.post("/api/attachments", auth, upload.single("file"), (req, res) => {
  if (!req.file) return jsonError(res, 400, "FILE_REQUIRED", "A file is required");
  const storageKey = String(req.body?.storageKey || "").trim();
  const existing = storageKey
    ? db.prepare("SELECT * FROM attachments WHERE user_id=? AND storage_key=?").get(req.user.id, storageKey)
    : null;
  if (existing) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(200).json({ attachment: existing });
  }
  const storedName = path.basename(req.file.filename);
  db.prepare("INSERT INTO attachments(user_id,original_name,storage_key,stored_name,mime_type,size) VALUES(?,?,?,?,?,?)")
    .run(req.user.id, req.file.originalname, storageKey || null, storedName, req.file.mimetype || "application/octet-stream", req.file.size);
  const attachment = db.prepare("SELECT * FROM attachments WHERE stored_name=?").get(storedName);
  res.status(201).json({ attachment });
});
app.get("/api/attachments/key/:storageKey", auth, (req, res) => {
  const item = db.prepare("SELECT * FROM attachments WHERE user_id=? AND storage_key=?").get(req.user.id, req.params.storageKey);
  if (!item) return jsonError(res, 404, "NOT_FOUND", "Attachment not found");
  const filePath = path.join(uploadDir, item.stored_name);
  if (!fs.existsSync(filePath)) return jsonError(res, 404, "FILE_MISSING", "Attachment file is missing");
  res.json({ attachment: item, dataBase64: fs.readFileSync(filePath).toString("base64") });
});
app.delete("/api/attachments", auth, (req, res) => {
  const items = db.prepare("SELECT stored_name FROM attachments WHERE user_id=?").all(req.user.id);
  db.prepare("DELETE FROM attachments WHERE user_id=?").run(req.user.id);
  for (const item of items) fs.rmSync(path.join(uploadDir, item.stored_name), { force: true });
  res.json({ ok: true });
});
app.get("/api/attachments/:id", auth, (req, res) => {
  const item = db.prepare("SELECT * FROM attachments WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!item) return jsonError(res, 404, "NOT_FOUND", "Attachment not found");
  res.type(item.mime_type).download(path.join(uploadDir, item.stored_name), item.original_name);
});
app.get(["/", "/index.html"], (_req, res) => {
  const indexPath = path.join(root, "app", "index.html");
  if (!fs.existsSync(indexPath)) return jsonError(res, 404, "FRONTEND_NOT_BUILT", "Frontend has not been built");
  let html = fs.readFileSync(indexPath, "utf8");
  if (!html.includes("PHD_WORKBENCH_SYNC_PROXY_URL")) {
    html = html.replace("</head>", '<script>window.PHD_WORKBENCH_SYNC_PROXY_URL="/__sync_proxy__/request";</script></head>');
  }
  res.type("html").send(html);
});
app.use(express.static(path.join(root, "app"), { index: false }));
app.use((req, res) => req.path.startsWith("/api/") ? jsonError(res, 404, "NOT_FOUND", "API endpoint not found") : res.sendFile(path.join(root, "app", "index.html")));
app.use((error, _req, res, _next) => {
  console.error(error);
  return jsonError(res, error.code === "LIMIT_FILE_SIZE" ? 413 : 500, error.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "INTERNAL_ERROR", error.code === "LIMIT_FILE_SIZE" ? "File is too large" : "Internal server error");
});

if (process.env.NODE_ENV !== "test") {
  const adminUsername = process.env.PHD_WORKBENCH_ADMIN_USERNAME;
  const adminPassword = process.env.PHD_WORKBENCH_ADMIN_PASSWORD;
  if (adminUsername && adminPassword && !db.prepare("SELECT 1 FROM users LIMIT 1").get()) {
    db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?, 'admin')").run(adminUsername, bcrypt.hashSync(adminPassword, 12));
    console.log(`Created initial administrator: ${adminUsername}`);
  }
  const host = process.env.PHD_WORKBENCH_HOST || "0.0.0.0";
  const port = Number(process.env.PHD_WORKBENCH_PORT || 47637);
  app.listen(port, host, () => console.log(`PhD Workbench server listening on http://${host}:${port}`));
}
export { app, db };
