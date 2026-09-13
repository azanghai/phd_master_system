import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".server-test-data");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
process.env.NODE_ENV = "test";
process.env.PHD_WORKBENCH_DATA_DIR = dir;
process.env.PHD_WORKBENCH_DB = path.join(dir, "test.sqlite");
const { app, db } = await import("../scripts/server.mjs");
import http from "node:http";
import bcrypt from "bcryptjs";

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers: { "content-type": "application/json", ...headers } }, res => {
      const chunks = []; res.on("data", c => chunks.push(c)); res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const body = (res.headers["content-type"] || "").includes("json") ? JSON.parse(raw.toString() || "{}") : raw;
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    }); req.on("error", reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}
const server = app.listen(0);
const base = await new Promise(resolve => server.once("listening", () => resolve(`http://127.0.0.1:${server.address().port}`)));
test("health endpoint", async () => assert.equal((await request("GET", `${base}/api/health`)).status, 200));
test("unauthenticated workspace is rejected", async () => assert.equal((await request("GET", `${base}/api/workspace/state`)).status, 401));
test("users can save isolated workspace state", async () => {
  db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)").run("alice", bcrypt.hashSync("correct horse battery staple", 4), "user");
  db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)").run("bob", bcrypt.hashSync("correct horse battery staple", 4), "user");
  const aliceLogin = await request("POST", `${base}/api/auth/login`, { username: "alice", password: "correct horse battery staple" });
  assert.equal(aliceLogin.status, 200);
  const aliceCookie = aliceLogin.headers["set-cookie"][0].split(";")[0];
  const saved = await request("PUT", `${base}/api/workspace`, { state: { tasks: [{ id: "a1" }] }, version: 0 }, { cookie: aliceCookie });
  assert.equal(saved.status, 200);
  const loaded = await request("GET", `${base}/api/workspace`, undefined, { cookie: aliceCookie });
  assert.deepEqual(loaded.body.state, { tasks: [{ id: "a1" }] });
  const bobLogin = await request("POST", `${base}/api/auth/login`, { username: "bob", password: "correct horse battery staple" });
  const bobCookie = bobLogin.headers["set-cookie"][0].split(";")[0];
  const bobLoaded = await request("GET", `${base}/api/workspace`, undefined, { cookie: bobCookie });
  assert.deepEqual(bobLoaded.body.state, {});
});
test("regular users cannot access admin APIs", async () => {
  const login = await request("POST", `${base}/api/auth/login`, { username: "alice", password: "correct horse battery staple" });
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  assert.equal((await request("GET", `${base}/api/admin/users`, undefined, { cookie })).status, 403);
  assert.equal((await request("GET", `${base}/api/admin/stats`, undefined, { cookie })).status, 403);
});
test("administrators can list users and cannot demote themselves", async () => {
  db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)").run("root", bcrypt.hashSync("correct horse battery staple", 4), "admin");
  const login = await request("POST", `${base}/api/auth/login`, { username: "root", password: "correct horse battery staple" });
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  const users = await request("GET", `${base}/api/admin/users`, undefined, { cookie });
  assert.equal(users.status, 200);
  assert.ok(users.body.users.some((user) => user.username === "alice"));
  assert.equal((await request("PATCH", `${base}/api/admin/users/3`, { role: "admin" }, { cookie })).status, 200);
  const self = await request("PATCH", `${base}/api/admin/users/3`, { role: "user" }, { cookie });
  assert.equal(self.status, 400);
  assert.equal((await request("GET", `${base}/api/admin/backup`, undefined, { cookie })).status, 200);
});
test.after(() => { server.close(); db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
