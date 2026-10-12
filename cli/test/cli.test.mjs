// CLI unit + contract tests: argument parsing, report formatting, and the
// command → HTTP mapping against a fake developer API (no platform).

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main, parseArgs, parseWhere } from "../src/main.mjs";
import { formatVerifyReport, formatContractReport, formatRows } from "../src/format.mjs";

test("parseArgs: positionals, booleans, values, repeatable --where", () => {
  const a = parseArgs(["query", "job", "--where", "status=open", "--where=site=s1", "--limit", "5", "--json"]);
  assert.deepEqual(a._, ["query", "job"]);
  assert.deepEqual(a.flags, { where: ["status=open", "site=s1"], limit: "5", json: true });
  assert.deepEqual(parseWhere(["a=1", "b=x=y"]), { a: "1", b: "x=y" });
  assert.throws(() => parseWhere(["nope"]), /col=value/);
});

test("formatVerifyReport shows every check, its items and the fix on failures", () => {
  const out = formatVerifyReport({
    project: "p", status: "fail", ms: 1200,
    stages: [
      { stage: "static", status: "pass", checks: [{ id: "contract", status: "pass", evidence: "ok" }] },
      { stage: "data", status: "fail", checks: [{ id: "role-matrix", status: "fail", evidence: "shopper reads 12 orders", fix: "set owner", items: ["order: read"] }] },
      { stage: "browser", status: "skipped", reason: "data stage failed" },
    ],
  });
  assert.match(out, /✗ verify fail — p \(1\.2s\)/);
  assert.match(out, /✗ role-matrix: shopper reads 12 orders/);
  assert.match(out, /- order: read/);
  assert.match(out, /fix: set owner/);
  assert.match(out, /○ browser — data stage failed/);
});

test("formatContractReport and formatRows", () => {
  const out = formatContractReport({ ok: false, errors: ["entities: Required"], fixes: [], warnings: [], summary: null });
  assert.match(out, /✗ contract has 1 error/);
  assert.equal(formatRows([]), "(no rows)");
  assert.match(formatRows([{ id: "1", title: "Fix boiler", user_id: "u" }]), /title/);
  assert.doesNotMatch(formatRows([{ id: "1", user_id: "u" }]), /user_id/);
});

/** A fake developer API that records calls. */
async function fakeApi(routes) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : undefined });
    const key = `${req.method} ${req.url}`;
    const r = routes[key] ?? { status: 404, body: { error: `no route ${key}` } };
    res.writeHead(r.status, { "content-type": "application/json" });
    res.end(JSON.stringify(r.body));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { api: `http://127.0.0.1:${port}`, calls, close: () => new Promise((r) => server.close(r)) };
}

test("contract: create links the directory; apply sends the contract file; verify maps red to exit 1", async () => {
  const pid = "11111111-1111-4111-8111-111111111111";
  const report = (status) => ({ report: { project: "p", status, ms: 10, stages: [{ stage: "static", status, checks: [] }] } });
  const f = await fakeApi({
    "POST /dev/v1/projects": { status: 201, body: { project: { id: pid, name: "Demo", slug: "demo" } } },
    [`POST /dev/v1/projects/${pid}/apply`]: { status: 200, body: { report: { ok: true, errors: [], fixes: [], warnings: [], summary: null }, summary: "built", warnings: [] } },
    [`POST /dev/v1/projects/${pid}/verify`]: { status: 200, body: report("fail") },
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "apx-cli-"));
  process.env.APPBRICX_CONFIG = path.join(dir, "cfg.json");
  process.env.APPBRICX_API = f.api;
  process.env.APPBRICX_TOKEN = "apx_pat_test";
  delete process.env.APPBRICX_PROJECT;
  const out = [];
  const io = { cwd: dir, out: (s) => out.push(s), err: (s) => out.push(s) };
  try {
    assert.equal(await main(["create", "Demo"], io), 0);
    const link = JSON.parse(await fs.readFile(path.join(dir, ".appbricx", "project.json"), "utf-8"));
    assert.equal(link.projectId, pid);

    await fs.writeFile(path.join(dir, "appbricx.json"), JSON.stringify({ app: { name: "Demo", tagline: "t" }, entities: [] }));
    assert.equal(await main(["apply"], io), 0);
    const applyCall = f.calls.find((c) => c.url.endsWith("/apply"));
    assert.equal(applyCall.auth, "Bearer apx_pat_test");
    assert.deepEqual(applyCall.body, { contract: { app: { name: "Demo", tagline: "t" }, entities: [] }, force: false });

    assert.equal(await main(["verify"], io), 1, "a red verify is exit 1");
    assert.equal(await main(["verify", "--json"], io), 1);
    assert.ok(out.some((l) => l.includes('"status": "fail"')));
  } finally {
    await f.close();
  }
});

test("contract: a 422 shows the report; usage errors exit 2", async () => {
  const pid = "22222222-2222-4222-8222-222222222222";
  const f = await fakeApi({
    [`POST /dev/v1/projects/${pid}/apply`]: { status: 422, body: { error: "the contract doesn't normalize cleanly", code: "CONTRACT_INVALID", report: { ok: false, errors: ["pages[0]: bad"], fixes: [], warnings: [], summary: null } } },
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "apx-cli-"));
  process.env.APPBRICX_API = f.api;
  process.env.APPBRICX_TOKEN = "apx_pat_test";
  process.env.APPBRICX_PROJECT = pid;
  const out = [];
  const io = { cwd: dir, out: (s) => out.push(s), err: (s) => out.push(s) };
  try {
    await fs.writeFile(path.join(dir, "appbricx.json"), "{}");
    assert.equal(await main(["apply"], io), 1);
    assert.ok(out.some((l) => l.includes("[CONTRACT_INVALID]")) && out.some((l) => l.includes("pages[0]: bad")));
    assert.equal(await main(["query"], io), 2);
    assert.equal(await main(["frobnicate"], io), 2);
  } finally {
    delete process.env.APPBRICX_PROJECT;
    await f.close();
  }
});

/** A fake authorization server + developer API for the browser sign-in. */
async function fakeAuthServer() {
  const calls = [];
  let refreshN = 0;
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const u = new URL(req.url, "http://x");
    calls.push({ method: req.method, path: u.pathname, auth: req.headers.authorization, body });
    const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    const base = `http://127.0.0.1:${server.address().port}`;
    if (u.pathname === "/.well-known/oauth-authorization-server") {
      return send(200, {
        issuer: base, authorization_endpoint: `${base}/oauth/authorize`, token_endpoint: `${base}/oauth/token`,
        registration_endpoint: `${base}/oauth/register`, revocation_endpoint: `${base}/oauth/revoke`, code_challenge_methods_supported: ["S256"],
      });
    }
    if (u.pathname === "/oauth/register") {
      const reg = JSON.parse(body);
      return send(201, { client_id: "apx_cl_test", redirect_uris: reg.redirect_uris, token_endpoint_auth_method: "none" });
    }
    if (u.pathname === "/oauth/token") {
      const p = new URLSearchParams(body);
      if (p.get("grant_type") === "authorization_code") {
        if (p.get("code") !== "the-code" || !p.get("code_verifier") || p.get("client_id") !== "apx_cl_test") return send(400, { error: "invalid_grant" });
        return send(200, { access_token: "apx_pat_access1", refresh_token: "apx_rt_1", expires_in: 3600, token_type: "Bearer" });
      }
      if (p.get("grant_type") === "refresh_token") {
        if (p.get("refresh_token") !== `apx_rt_${refreshN + 1}`) return send(400, { error: "invalid_grant", error_description: "reused" });
        refreshN++;
        return send(200, { access_token: `apx_pat_access${refreshN + 1}`, refresh_token: `apx_rt_${refreshN + 1}`, expires_in: 3600, token_type: "Bearer" });
      }
    }
    if (u.pathname === "/oauth/revoke") return send(200, {});
    if (u.pathname === "/dev/v1/me") return send(200, { email: "dev@example.com", auth: "pat", scopes: ["read", "apply", "deploy"], workspaces: [] });
    if (u.pathname === "/dev/v1/projects") return send(200, { projects: [] });
    send(404, { error: "no route" });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { api: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => server.close(r)) };
}

test("login: browser sign-in (loopback + PKCE), auto refresh with rotation, logout revokes", async () => {
  const f = await fakeAuthServer();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "apx-cli-"));
  const cfgFile = path.join(dir, "cfg.json");
  process.env.APPBRICX_CONFIG = cfgFile;
  delete process.env.APPBRICX_API;
  delete process.env.APPBRICX_TOKEN;
  delete process.env.APPBRICX_PROJECT;
  const out = [];
  let opened = null;
  // The "browser": checks the authorize URL, then lands on the loopback callback.
  const openBrowser = async (url) => {
    opened = new URL(url);
    const redirect = opened.searchParams.get("redirect_uri");
    await fetch(`${redirect}?code=the-code&state=${opened.searchParams.get("state")}`);
  };
  const io = { cwd: dir, out: (s) => out.push(s), err: (s) => out.push(s), openBrowser };
  try {
    assert.equal(await main(["login", "--api", f.api], io), 0);
    assert.equal(opened.pathname, "/oauth/authorize");
    assert.equal(opened.searchParams.get("code_challenge_method"), "S256");
    assert.equal(opened.searchParams.get("scope"), "read apply deploy");
    assert.equal(opened.searchParams.get("resource"), `${f.api}/mcp`);
    assert.match(opened.searchParams.get("redirect_uri"), /^http:\/\/127\.0\.0\.1:\d+\/callback$/);
    const reg = JSON.parse(f.calls.find((c) => c.path === "/oauth/register").body);
    assert.deepEqual(reg.redirect_uris, [opened.searchParams.get("redirect_uri")]);
    let saved = JSON.parse(await fs.readFile(cfgFile, "utf-8"));
    assert.equal(saved.token, "apx_pat_access1");
    assert.equal(saved.refreshToken, "apx_rt_1");
    assert.equal(saved.oauth.clientId, "apx_cl_test");
    if (process.platform !== "win32") assert.equal((await fs.stat(cfgFile)).mode & 0o777, 0o600);

    // Fresh token: used as is.
    assert.equal(await main(["projects"], io), 0);
    assert.equal(f.calls.at(-1).auth, "Bearer apx_pat_access1");

    // About to lapse: refreshed first, the rotated pair saved.
    await fs.writeFile(cfgFile, JSON.stringify({ ...saved, expiresAt: Date.now() + 10_000 }));
    assert.equal(await main(["projects"], io), 0);
    assert.equal(f.calls.at(-1).auth, "Bearer apx_pat_access2");
    saved = JSON.parse(await fs.readFile(cfgFile, "utf-8"));
    assert.equal(saved.refreshToken, "apx_rt_2");

    // A refresh the server refuses: tell the user to sign in again.
    await fs.writeFile(cfgFile, JSON.stringify({ ...saved, refreshToken: "apx_rt_1", expiresAt: 0 }));
    assert.equal(await main(["projects"], io), 2);
    assert.ok(out.some((l) => l.includes("run `appbricx login`")));

    await fs.writeFile(cfgFile, JSON.stringify(saved));
    assert.equal(await main(["logout"], io), 0);
    const revoke = f.calls.find((c) => c.path === "/oauth/revoke");
    assert.equal(new URLSearchParams(revoke.body).get("token"), "apx_rt_2");
    assert.deepEqual(JSON.parse(await fs.readFile(cfgFile, "utf-8")), { api: f.api });
  } finally {
    await f.close();
  }
});

test("login --token keeps the PAT path; mcp-config has no token unless asked", async () => {
  const f = await fakeAuthServer();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "apx-cli-"));
  process.env.APPBRICX_CONFIG = path.join(dir, "cfg.json");
  delete process.env.APPBRICX_API;
  delete process.env.APPBRICX_TOKEN;
  const out = [];
  const io = { cwd: dir, out: (s) => out.push(s), err: (s) => out.push(s), openBrowser: () => { throw new Error("must not open a browser"); } };
  try {
    assert.equal(await main(["login", "--api", f.api, "--token", "apx_pat_manual"], io), 0);
    assert.equal(f.calls.find((c) => c.path === "/dev/v1/me").auth, "Bearer apx_pat_manual");
    assert.ok(!f.calls.some((c) => c.path.startsWith("/oauth")));
    out.length = 0;
    assert.equal(await main(["mcp-config", "--json"], io), 0);
    const entry = JSON.parse(out[0]);
    assert.equal(entry.mcpServers.appbricx.url, `${f.api}/mcp`);
    assert.equal(entry.mcpServers.appbricx.headers, undefined);
    out.length = 0;
    assert.equal(await main(["mcp-config", "--json", "--token-header"], io), 0);
    assert.equal(JSON.parse(out[0]).mcpServers.appbricx.headers.Authorization, "Bearer ${APPBRICX_TOKEN}");
  } finally {
    await f.close();
  }
});

test("operate: each command maps to its developer API route", async () => {
  const pid = "33333333-3333-4333-8333-333333333333";
  const P = `/dev/v1/projects/${pid}`;
  const f = await fakeApi({
    [`POST ${P}/sql`]: { status: 200, body: { env: "prod", readOnly: false, rows: [], rowCount: 2, truncated: false, durationMs: 5, snapshotId: "prod-x-agent-sql", statements: [{ sql: "UPDATE job SET x = 1", command: "UPDATE", rowCount: 2 }] } },
    [`POST ${P}/rows`]: { status: 200, body: { op: "insert", table: "job", env: "dev", succeeded: 1, failed: 0, results: [{ ok: true, id: "1" }] } },
    [`GET ${P}/schema?env=prod`]: { status: 200, body: { env: "prod", summary: { tables: 1, contractTables: 1, handMadeTables: 0, views: 0, functions: 0, triggers: 0 }, tables: [{ name: "job", origin: "contract", rls: true, internal: false, columns: [{ name: "id", type: "uuid", nullable: false, default: null, managedByContract: true }], foreignKeys: [], indexes: [], triggers: [] }], views: [], functions: [] } },
    [`GET ${P}/snapshots`]: { status: 200, body: { snapshots: [] } },
    [`POST ${P}/snapshots/prod-1-manual/restore`]: { status: 200, body: { restored: "prod-1-manual", env: "prod" } },
    [`GET ${P}/deploys`]: { status: 200, body: { deployments: [] } },
    [`POST ${P}/workflows/nightly/run`]: { status: 200, body: { runId: "r1", status: "succeeded", finished: true, result: { n: 1 } } },
    [`GET ${P}/runs/r1`]: { status: 200, body: { run: { workflow_id: "nightly", status: "succeeded", logs: [] } } },
    [`POST ${P}/dead-letters/replay`]: { status: 200, body: { replayed: ["j1"], skipped: [] } },
    [`GET ${P}/tail?kind=errors&since=15m`]: { status: 200, body: { kind: "errors", requests: [{ at: "t", status: 500, method: "GET", path: "/__appbricx/api/v1/job", ms: 3, error: "boom" }] } },
    [`GET ${P}/secrets`]: { status: 200, body: { secrets: [{ name: "STRIPE_KEY", env: "all", scope: "project", updatedAt: "t" }] } },
    [`PUT ${P}/secrets/STRIPE_KEY`]: { status: 201, body: { name: "STRIPE_KEY", env: "prod", created: true } },
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "apx-cli-"));
  process.env.APPBRICX_API = f.api;
  process.env.APPBRICX_TOKEN = "apx_pat_test";
  process.env.APPBRICX_PROJECT = pid;
  const out = [];
  const io = { cwd: dir, out: (s) => out.push(s), err: (s) => out.push(s) };
  const last = (url) => f.calls.filter((c) => c.url.startsWith(url)).at(-1);
  try {
    assert.equal(await main(["sql", "UPDATE job SET x = 1", "--env", "prod"], io), 0);
    assert.deepEqual(last(`${P}/sql`).body, { sql: "UPDATE job SET x = 1", env: "prod" });
    assert.ok(out.some((l) => l.includes("snapshots restore prod-x-agent-sql")));

    assert.equal(await main(["rows", "insert", "job", "--data", '{"title":"Fix"}', "--as", "dispatcher"], io), 0);
    assert.deepEqual(last(`${P}/rows`).body, { table: "job", op: "insert", rows: [{ title: "Fix" }], as: { role: "dispatcher" } });
    assert.equal(await main(["rows", "delete", "job", "--ids", "a,b"], io), 0);
    assert.deepEqual(last(`${P}/rows`).body, { table: "job", op: "delete", ids: ["a", "b"] });

    assert.equal(await main(["schema", "--env", "prod"], io), 0);
    assert.ok(out.some((l) => l.includes("job  [contract]  rls")));
    assert.equal(await main(["snapshots"], io), 0);
    assert.equal(await main(["snapshots", "restore", "prod-1-manual"], io), 0);
    assert.equal(await main(["deploys"], io), 0);
    assert.equal(await main(["run", "workflow", "nightly", "--input", '{"day":"mon"}'], io), 0);
    assert.deepEqual(last(`${P}/workflows/nightly/run`).body, { input: { day: "mon" } });
    assert.equal(await main(["run", "get", "r1"], io), 0);
    assert.equal(await main(["run", "replay", "j1"], io), 0);
    assert.deepEqual(last(`${P}/dead-letters/replay`).body, { ids: ["j1"] });
    assert.equal(await main(["tail", "errors", "--since", "15m"], io), 0);
    assert.ok(out.some((l) => l.includes("500  GET /__appbricx/api/v1/job")));
    assert.equal(await main(["secrets"], io), 0);
    assert.equal(await main(["secrets", "set", "STRIPE_KEY", "sk_test_1", "--env", "prod"], io), 0);
    assert.deepEqual(last(`${P}/secrets/STRIPE_KEY`).body, { value: "sk_test_1", env: "prod" });
    assert.ok(!out.some((l) => l.includes("sk_test_1")), "a secret value is never printed");

    assert.equal(await main(["sql"], io), 2);
    assert.equal(await main(["rows", "upsert", "job"], io), 2);
    assert.equal(await main(["tail", "logs"], io), 2);
    assert.equal(await main(["sql", "select 1", "--env", "staging"], io), 2);
    assert.equal(await main(["secrets", "set", "X"], io), 2);
  } finally {
    delete process.env.APPBRICX_PROJECT;
    await f.close();
  }
});
