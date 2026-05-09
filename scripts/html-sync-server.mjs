import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const host = process.env.PHD_WORKBENCH_HTML_HOST || "127.0.0.1";
const port = Number(process.env.PHD_WORKBENCH_HTML_PORT || 47637);
const entryFile = "博士工作台_整合打卡逻辑优化版_fix5_sidebar_trim.html";
const proxyPath = "/__sync_proxy__/request";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function normalizeHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (!key) continue;
    out[String(key)] = String(value ?? "");
  }
  return out;
}

function responseHeaders(headers) {
  const out = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function injectProxyConfig(html) {
  const snippet = `<script>window.PHD_WORKBENCH_SYNC_PROXY_URL="${proxyPath}";</script>`;
  return html.includes("PHD_WORKBENCH_SYNC_PROXY_URL")
    ? html
    : html.replace("</head>", `  ${snippet}\n</head>`);
}

async function handleProxy(req, res) {
  if (req.method !== "POST") {
    send(res, 405, JSON.stringify({ error: "method not allowed" }), { "Content-Type": "application/json; charset=utf-8" });
    return;
  }

  try {
    const raw = await readRequestBody(req);
    const payload = JSON.parse(raw.toString("utf8") || "{}");
    const target = new URL(String(payload.url || ""));
    if (!["http:", "https:"].includes(target.protocol)) {
      throw new Error("只允许代理 http/https WebDAV 地址");
    }

    const headers = normalizeHeaders(payload.headers);
    const init = {
      method: String(payload.method || "GET").toUpperCase(),
      headers,
    };
    if (typeof payload.bodyBase64 === "string" && payload.bodyBase64) {
      init.body = Buffer.from(payload.bodyBase64, "base64");
    } else if (typeof payload.body === "string") {
      init.body = payload.body;
    }

    const upstream = await fetch(target, init);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    const headersOut = responseHeaders(upstream.headers);
    const result = {
      status: upstream.status,
      body: payload.responseBase64 ? "" : bytes.toString("utf8"),
      bodyBase64: payload.responseBase64 ? bytes.toString("base64") : "",
      headers: headersOut,
      etag: headersOut.etag || "",
      lastModified: headersOut["last-modified"] || "",
      size: Number(headersOut["content-length"]) || bytes.length,
    };

    send(res, 200, JSON.stringify(result), { "Content-Type": "application/json; charset=utf-8" });
  } catch (err) {
    send(
      res,
      502,
      JSON.stringify({ status: 0, body: "", bodyBase64: "", headers: {}, error: err?.message || String(err) }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (decoded === "/" || decoded === "/index.html") return path.join(rootDir, entryFile);
  if (decoded.startsWith("/sync/")) return path.join(rootDir, "app", decoded.slice(1));
  if (decoded.startsWith("/assets/")) return path.join(rootDir, "app", decoded.slice(1));
  if (decoded.startsWith("/scripts/")) return path.join(rootDir, "app", decoded.slice(1));
  return path.join(rootDir, decoded.replace(/^\/+/, ""));
}

function isInside(base, candidate) {
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function handleStatic(req, res) {
  const filePath = resolveStaticPath(req.url || "/");
  if (!isInside(rootDir, filePath)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  let body = fs.readFileSync(filePath);
  if (ext === ".html") body = Buffer.from(injectProxyConfig(body.toString("utf8")), "utf8");
  send(res, 200, body, {
    "Cache-Control": "no-cache",
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
  });
}

const server = http.createServer(async (req, res) => {
  if ((req.url || "").startsWith(proxyPath)) {
    await handleProxy(req, res);
    return;
  }
  await handleStatic(req, res);
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/`;
  console.log(`博士工作台 HTML 版已启动：${url}`);
  console.log("这个入口会为坚果云 WebDAV 同步提供本地代理。按 Ctrl+C 停止。");
});
