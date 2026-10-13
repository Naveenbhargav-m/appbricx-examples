// appbricx — the developer CLI (Wave 3 X2). One command per developer-API
// verb; exit code 0 = success, 1 = the server said no (an invalid
// contract, a red verify), 2 = usage error.

import path from "node:path";
import { readFile } from "node:fs/promises";
import { client, ApiError } from "./api.mjs";
import {
  CONTRACT_FILE,
  configPath,
  loadConfig,
  saveConfig,
  linkedProject,
  saveLink,
  readContractFile,
  writeContractFile,
} from "./config.mjs";
import { formatContractReport, formatVerifyReport, formatRows, formatSqlResult, formatRowsResult, formatSchema, formatTail, formatTemplateList, formatTemplate, formatTemplateUse } from "./format.mjs";
import { browserLogin, refreshTokens, revokeTokens } from "./oauth.mjs";

export const VERSION = "0.1.0";
export const DEFAULT_API = "https://appbricx.com/api";

const HELP = `appbricx ${VERSION}: build on the appbricx runtime from your terminal or coding agent

Usage: appbricx <command> [options]

Setup
  login [--api <url>]    sign in with your browser: opens Appbricx, you click
                         Authorize, the CLI stores the tokens (refreshed automatically)
                         --no-browser   print the sign-in URL instead of opening it
                         --api defaults to https://appbricx.com/api (self-hosted: your own)
  login --token <pat>    use a personal access token instead (CI, headless machines)
  login --email <e> --password <p> [--workspace <id>]
                         password sign-in; mints a token for you
  logout                 revoke the browser sign-in and forget the saved tokens
  whoami                 the signed-in user, scopes, workspaces
  projects               list projects
  create <name>          create a project and link this directory to it
  link <project-id>      link this directory to an existing project

Contract (./${CONTRACT_FILE})
  pull                   write the project's contract to ./${CONTRACT_FILE}
  check [file]           normalize and report, no changes
  apply [file] [--force] build the dev environment from the contract
  patch <ops.json> [--dry-run]
                         apply typed edit ops (add_entity, add_field, set_workflow, …)

Runtime
  verify                 the verify report (exit 1 when red)
  query <table> [--where col=value ...] [--limit n]
                         rows from the dev database
  logs [--workflow id] [--limit n]
                         workflow runs and notifications
  deploy [--subdomain <name>] [--skip-verify] [--preview]
                         publish (runs verify first)

Operate the running app (--env dev|prod, default dev; prod writes snapshot first)
  sql "<sql>" | sql --file <f.sql>
                         run SQL like the builder's SQL editor (reads: read scope;
                         writes: apply on dev, deploy on prod)
  rows <insert|update|delete> <table> [--data <json|@file>] [--id <id>] [--ids a,b]
       [--patch <json|@file>] [--as admin|<role>]
                         edit rows through the app's rules, RLS and change events
  schema                 the real database schema (tables, keys, indexes, views,
                         functions, triggers; which tables the contract manages)
  snapshots [list | create | restore <id>]
                         database snapshots (restore needs deploy)
  deploys [list | rollback <deployment-id>]
                         deploy history, roll back what's live (needs deploy)
  run workflow <id> [--input <json|@file>] [--as <role>]
  run get <run-id> | run dead-letters | run replay [job-id ...]
                         run a workflow now, read a run, the dead-letter queue
  tail <events|requests|errors> [--since 15m] [--limit n]
                         recent change events, topic messages, requests, errors
  secrets [list | set <name> <value|-> | delete <name>]
                         the app's secrets: names only, never values (- reads stdin)

Templates (apps, blocks, workflows, components: appbricx.com/templates)
  templates search [words] [--kind app|block|workflow|component] [--category c] [--limit n]
                         find a template before building a common feature yourself
  templates show <slug>  what it adds, its params, and how to use it
  templates use <slug> [--param name=value ...] [--prefix p] [--dry-run] [--name <name>]
                         app: create a project from it (and link this directory);
                         block/workflow/component: merge it into the linked project
                         and apply to dev (--dry-run: show the diff and the check only)

Agents
  mcp-config [--token-header]
                         print the .mcp.json entry for Claude Code / Cursor
                         (browser sign-in; --token-header adds a Bearer header for CI)
  docs                   print the contract guide (markdown)

Global: --json (raw server JSON), --project <id> (instead of the link)
Env:    APPBRICX_API, APPBRICX_TOKEN, APPBRICX_PROJECT, APPBRICX_CONFIG`;

/**
 * Parse argv into positionals and --flags (repeatable flags collect).
 * @param {string[]} argv
 * @returns {{ _: string[], flags: Record<string, string | boolean | string[]> }}
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const _ = [];
  /** @type {Record<string, string | boolean | string[]>} */
  const flags = {};
  const REPEAT = new Set(["where", "param"]);
  const BOOL = new Set(["json", "force", "dry-run", "skip-verify", "preview", "help", "no-browser", "token-header"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (!a.startsWith("--")) { _.push(a); continue; }
    const eq = a.indexOf("=");
    const key = eq > 0 ? a.slice(2, eq) : a.slice(2);
    let val = /** @type {string | boolean} */ (eq > 0 ? a.slice(eq + 1) : true);
    if (val === true && !BOOL.has(key) && i + 1 < argv.length && !(argv[i + 1] ?? "").startsWith("--")) val = argv[++i] ?? "";
    if (REPEAT.has(key)) {
      const prev = flags[key];
      flags[key] = [...(Array.isArray(prev) ? prev : []), String(val)];
    } else flags[key] = val;
  }
  return { _, flags };
}

/**
 * `col=value` pairs → an equality filter object.
 * @param {string[]} pairs
 * @returns {Record<string, string>}
 */
export function parseWhere(pairs) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const p of pairs) {
    const i = p.indexOf("=");
    if (i <= 0) throw new UsageError(`--where expects col=value, got "${p}"`);
    out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}

class UsageError extends Error {}

/**
 * A JSON flag value: inline JSON, or @path to a JSON file.
 * @param {string | undefined} raw @param {string} cwd @param {string} flag
 * @returns {Promise<any>}
 */
export async function readJsonFlag(raw, cwd, flag) {
  if (raw === undefined) return undefined;
  const text = raw.startsWith("@") ? await readFile(path.resolve(cwd, raw.slice(1)), "utf-8") : raw;
  try {
    return JSON.parse(text);
  } catch {
    throw new UsageError(`--${flag} expects JSON (or @file.json)`);
  }
}

/**
 * `--param name=value` pairs → a params object.
 * @param {string[]} pairs
 * @returns {Record<string, string>}
 */
export function parseParams(pairs) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const p of pairs) {
    const i = p.indexOf("=");
    if (i <= 0) throw new UsageError(`--param expects name=value, got "${p}"`);
    out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  return out;
}

/**
 * `--as admin` or `--as <role>` → the server's `as`.
 * @param {string | undefined} raw
 * @returns {"admin" | { role: string } | undefined}
 */
export function parseAs(raw) {
  if (raw === undefined) return undefined;
  return raw === "admin" ? "admin" : { role: raw };
}

/** @returns {Promise<string>} */
async function readStdin() {
  let s = "";
  for await (const chunk of process.stdin) s += chunk;
  return s.replace(/\r?\n$/, "");
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, out?: (s: string) => void, err?: (s: string) => void, openBrowser?: (url: string) => void | Promise<void> }} [io]
 * @returns {Promise<number>}
 */
export async function main(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const out = io.out ?? ((s) => process.stdout.write(s + "\n"));
  const err = io.err ?? ((s) => process.stderr.write(s + "\n"));
  const { _, flags } = parseArgs(argv);
  const cmd = _[0];
  const json = flags["json"] === true;
  /** @param {unknown} body @param {() => string} human */
  const print = (body, human) => out(json ? JSON.stringify(body, null, 2) : human());

  if (!cmd || cmd === "help" || flags["help"] === true) { out(HELP); return cmd ? 0 : 2; }
  if (cmd === "version" || cmd === "--version") { out(VERSION); return 0; }

  try {
    const cfg = await loadConfig();
    const str = (/** @type {string} */ k) => (typeof flags[k] === "string" ? /** @type {string} */ (flags[k]) : undefined);

    if (cmd === "login") {
      const api = str("api") ?? cfg.api ?? DEFAULT_API;
      let token = str("token");
      /** @type {import("./config.mjs").SavedConfig} */
      let saved;
      if (token) {
        saved = { api, token };
      } else if (str("email") || str("password")) {
        const email = str("email"), password = str("password");
        if (!email || !password) throw new UsageError("password sign-in needs both --email and --password");
        const session = await client({ api, token: null }).login(email, password);
        const jwt = session?.tokens?.accessToken;
        if (!jwt) throw new Error("sign-in didn't return a session (MFA accounts: run `appbricx login` for browser sign-in)");
        const sc = client({ api, token: jwt });
        const me = await sc.me();
        const workspaceId = str("workspace") ?? me.workspaces?.[0]?.id;
        if (!workspaceId) throw new Error("this account has no workspace");
        const minted = await sc.mintToken({ name: `cli ${new Date().toISOString().slice(0, 10)}`, workspaceId, scopes: ["read", "apply", "deploy"] });
        token = /** @type {string} */ (minted.token);
        saved = { api, token };
      } else {
        const noBrowser = flags["no-browser"] === true;
        const got = await browserLogin({
          api,
          log: err,
          open: noBrowser ? () => {} : io.openBrowser,
        });
        token = got.token;
        saved = { api, ...got };
      }
      const me = await client({ api, token }).me();
      await saveConfig(saved);
      print({ ok: true, email: me.email, scopes: me.scopes, config: configPath() }, () => `✓ signed in as ${me.email} (scopes: ${me.scopes.join(", ")}). Saved to ${configPath()}`);
      return 0;
    }

    if (cmd === "logout") {
      const s = cfg.saved;
      if (s?.refreshToken && s.oauth) await revokeTokens({ refreshToken: s.refreshToken, oauth: s.oauth });
      if (s?.api) await saveConfig({ api: s.api });
      print({ ok: true }, () => (s?.refreshToken ? "✓ signed out; this CLI's authorization is revoked" : "✓ signed out (a personal access token stays valid until you revoke it in Workspace settings, Coding agents)"));
      return 0;
    }

    if (cmd === "mcp-config") {
      const api = cfg.api ?? "<your appbricx API url>";
      const project = str("project") ?? (await linkedProject(cwd));
      const url = `${api.replace(/\/+$/, "")}/mcp${project ? `?project=${project}` : ""}`;
      const withToken = flags["token-header"] === true;
      const entry = { mcpServers: { appbricx: { type: "http", url, ...(withToken ? { headers: { Authorization: "Bearer ${APPBRICX_TOKEN}" } } : {}) } } };
      out(JSON.stringify(entry, null, 2));
      if (!json) {
        err(withToken
          ? "(put this in .mcp.json and export APPBRICX_TOKEN with your token; the file stays secret-free)"
          : "(put this in .mcp.json; on first connect your agent opens a browser window to authorize it)");
      }
      return 0;
    }

    if (!cfg.api || !cfg.token) throw new UsageError("not signed in: run `appbricx login` (or set APPBRICX_API and APPBRICX_TOKEN)");
    // Browser sign-in: refresh the 1h access token shortly before it lapses.
    // The refresh token rotates, so the new pair is saved at once.
    let token = cfg.token;
    const s = cfg.saved;
    if (!cfg.tokenFromEnv && s?.refreshToken && s.oauth && s.api && (s.expiresAt ?? 0) - Date.now() < 60_000) {
      try {
        const fresh = await refreshTokens({ refreshToken: s.refreshToken, oauth: s.oauth });
        await saveConfig({ api: s.api, ...fresh });
        token = fresh.token;
      } catch (e) {
        if (/** @type {any} */ (e).oauthError === "invalid_grant") throw new UsageError("your sign-in expired or was revoked: run `appbricx login`");
        throw e;
      }
    }
    const api = client({ api: cfg.api, token });
    const needProject = async () => {
      const id = str("project") ?? (await linkedProject(cwd));
      if (!id) throw new UsageError("no project — run `appbricx create <name>` or `appbricx link <project-id>` here, or pass --project");
      return id;
    };
    const contractFile = (/** @type {string | undefined} */ f) => path.resolve(cwd, f ?? CONTRACT_FILE);
    const env = str("env");
    if (env !== undefined && !["dev", "prod"].includes(env) && cmd !== "secrets") throw new UsageError(`--env is dev or prod, got "${env}"`);

    switch (cmd) {
      case "whoami": {
        const me = await api.me();
        print(me, () => [`${me.email} (${me.auth}; scopes: ${me.scopes.join(", ")})`, ...me.workspaces.map((/** @type {any} */ w) => `  workspace ${w.name} — ${w.id} (${w.role})`)].join("\n"));
        return 0;
      }
      case "docs": {
        out(await api.docs());
        return 0;
      }
      case "projects": {
        const r = await api.listProjects();
        print(r, () => (r.projects.length === 0 ? "(no projects — appbricx create <name>)" : r.projects.map((/** @type {any} */ p) => `${p.id}  ${p.name}`).join("\n")));
        return 0;
      }
      case "create": {
        const name = _.slice(1).join(" ").trim();
        if (!name) throw new UsageError("create needs a name");
        const r = await api.createProject(name);
        await saveLink(cwd, { projectId: r.project.id, name: r.project.name });
        print(r, () => `✓ created ${r.project.name} (${r.project.id}) and linked this directory`);
        return 0;
      }
      case "link": {
        const id = _[1];
        if (!id) throw new UsageError("link needs a project id");
        const r = await api.project(id);
        await saveLink(cwd, { projectId: r.project.id, name: r.project.name });
        print(r, () => `✓ linked to ${r.project.name} (${r.project.id})`);
        return 0;
      }
      case "pull": {
        const id = await needProject();
        const r = await api.contract(id);
        if (!r.contract) {
          print(r, () => `○ ${id} has no contract yet — write ./${CONTRACT_FILE} (appbricx docs) and run appbricx apply`);
          return 0;
        }
        const file = contractFile(_[1]);
        await writeContractFile(file, r.contract);
        print(r, () => `✓ wrote ${path.relative(cwd, file) || file}`);
        return 0;
      }
      case "check": {
        const id = await needProject();
        const r = await api.check(id, await readContractFile(contractFile(_[1])));
        print(r, () => formatContractReport(r.report));
        return r.report.ok ? 0 : 1;
      }
      case "apply": {
        const id = await needProject();
        const r = await api.apply(id, await readContractFile(contractFile(_[1])), flags["force"] === true);
        print(r, () => [formatContractReport(r.report), "", r.summary, ...(r.warnings ?? []).map((/** @type {string} */ w) => `⚠ ${w}`)].join("\n"));
        return 0;
      }
      case "patch": {
        const id = await needProject();
        if (!_[1]) throw new UsageError("patch needs a file of ops (a JSON array)");
        const ops = await readContractFile(path.resolve(cwd, _[1]));
        const r = await api.patch(id, Array.isArray(ops) ? ops : [ops], flags["dry-run"] === true);
        print(r, () => [formatContractReport(r.report), "", r.summary].join("\n"));
        return 0;
      }
      case "verify": {
        const id = await needProject();
        const r = await api.verify(id);
        print(r, () => formatVerifyReport(r.report));
        return r.report.status === "pass" ? 0 : 1;
      }
      case "query": {
        const id = await needProject();
        const table = _[1];
        if (!table) throw new UsageError("query needs a table name");
        const where = Array.isArray(flags["where"]) ? parseWhere(/** @type {string[]} */ (flags["where"])) : undefined;
        const limit = str("limit") ? Number(str("limit")) : undefined;
        const r = await api.query(id, { table, ...(where ? { where } : {}), ...(limit ? { limit } : {}) });
        print(r, () => formatRows(r.rows));
        return 0;
      }
      case "logs": {
        const id = await needProject();
        const r = await api.logs(id, { workflow: str("workflow"), limit: str("limit") ? Number(str("limit")) : undefined });
        print(r, () => {
          const lines = r.runs.map((/** @type {any} */ x) => `${x.created_at}  ${x.workflow_id}  ${x.status}${x.error ? `  ${x.error}` : ""}`);
          const notes = r.notifications.map((/** @type {any} */ n) => `${n.created_at}  🔔 ${n.title}${n.meta?.role ? ` (→ ${n.meta.role})` : ""}`);
          return [lines.length ? "runs:" : "(no workflow runs yet)", ...lines.map((/** @type {string} */ l) => `  ${l}`), ...(notes.length ? ["notifications:", ...notes.map((/** @type {string} */ l) => `  ${l}`)] : [])].join("\n");
        });
        return 0;
      }
      case "deploy": {
        const id = await needProject();
        const r = await api.deploy(id, { skipVerify: flags["skip-verify"] === true, environment: flags["preview"] === true ? "preview" : "production", ...(str("subdomain") ? { subdomain: str("subdomain") } : {}) });
        print(r, () => `✓ deployed: ${r.url} (${r.status})`);
        return 0;
      }
      case "sql": {
        const id = await needProject();
        const file = str("file");
        const text = file ? await readFile(path.resolve(cwd, file), "utf-8") : _.slice(1).join(" ");
        if (!text.trim()) throw new UsageError("sql needs a statement (in quotes) or --file <f.sql>");
        const r = await api.sql(id, { sql: text, ...(env ? { env } : {}) });
        print(r, () => formatSqlResult(r));
        return 0;
      }
      case "rows": {
        const id = await needProject();
        const op = _[1], table = _[2];
        if (!op || !["insert", "update", "delete"].includes(op) || !table) throw new UsageError("rows needs <insert|update|delete> <table>");
        const data = await readJsonFlag(str("data"), cwd, "data");
        const patch = await readJsonFlag(str("patch"), cwd, "patch");
        const ids = str("ids")?.split(",").map((s) => s.trim()).filter(Boolean);
        const as = parseAs(str("as"));
        const r = await api.rows(id, {
          table, op, ...(env ? { env } : {}),
          ...(data !== undefined ? { rows: Array.isArray(data) ? data : [data] } : {}),
          ...(str("id") ? { id: str("id") } : {}), ...(ids ? { ids } : {}),
          ...(patch !== undefined ? { patch } : {}), ...(as ? { as } : {}),
        });
        print(r, () => formatRowsResult(r));
        return r.failed > 0 ? 1 : 0;
      }
      case "schema": {
        const id = await needProject();
        const r = await api.schema(id, env);
        print(r, () => formatSchema(r));
        return 0;
      }
      case "snapshots": {
        const id = await needProject();
        const action = _[1] ?? "list";
        if (action === "list") {
          const r = await api.snapshots(id, env);
          print(r, () => (r.snapshots.length === 0 ? "(no snapshots)" : r.snapshots.map((/** @type {any} */ s) => `${s.id}  ${s.env}  ${s.reason}  ${s.createdAt}  ${Math.round(s.bytes / 1024)} KB`).join("\n")));
          return 0;
        }
        if (action === "create") {
          const r = await api.createSnapshot(id, env);
          print(r, () => `✓ snapshot ${r.snapshot.id} (${r.snapshot.env})`);
          return 0;
        }
        if (action === "restore") {
          if (!_[2]) throw new UsageError("snapshots restore needs a snapshot id (appbricx snapshots)");
          const r = await api.restoreSnapshot(id, _[2]);
          print(r, () => `✓ restored ${r.env} from ${r.restored}${r.undoSnapshotId ? ` (undo: appbricx snapshots restore ${r.undoSnapshotId})` : ""}`);
          return 0;
        }
        throw new UsageError("snapshots [list | create | restore <id>]");
      }
      case "deploys": {
        const id = await needProject();
        const action = _[1] ?? "list";
        if (action === "list") {
          const r = await api.deploys(id, { limit: str("limit") ? Number(str("limit")) : undefined, environment: flags["preview"] === true ? "preview" : undefined });
          print(r, () => (r.deployments.length === 0 ? "(no deployments)" : r.deployments.map((/** @type {any} */ d) => `${d.id}  ${d.environment}  ${d.status}  ${d.created_at}${d.url ? `  ${d.url}` : ""}`).join("\n")));
          return 0;
        }
        if (action === "rollback") {
          if (!_[2]) throw new UsageError("deploys rollback needs a deployment id (appbricx deploys)");
          const r = await api.rollback(id, _[2]);
          print(r, () => `✓ rolled back to ${_[2]}: ${r.data?.url ?? ""} (${r.data?.mode ?? "done"})`);
          return 0;
        }
        throw new UsageError("deploys [list | rollback <deployment-id>]");
      }
      case "run": {
        const id = await needProject();
        const action = _[1];
        if (action === "workflow") {
          if (!_[2]) throw new UsageError("run workflow needs a workflow id");
          const input = await readJsonFlag(str("input"), cwd, "input");
          const as = parseAs(str("as"));
          const r = await api.runWorkflow(id, _[2], { ...(input !== undefined ? { input } : {}), ...(env ? { env } : {}), ...(as && as !== "admin" ? { as } : {}) });
          print(r, () => `${r.finished ? "✓" : "…"} run ${r.runId}: ${r.status}${r.finished ? `\n${JSON.stringify(r.result ?? null, null, 2)}` : ` (appbricx run get ${r.runId})`}`);
          return 0;
        }
        if (action === "get") {
          if (!_[2]) throw new UsageError("run get needs a run id");
          const r = await api.getRun(id, _[2]);
          print(r, () => [
            `${r.run.workflow_id}  ${r.run.status}${r.run.error ? `  ${r.run.error}` : ""}`,
            ...(r.run.logs ?? []).map((/** @type {any} */ l) => `  ${l.ts}  ${l.level}  ${l.message}`),
          ].join("\n"));
          return 0;
        }
        if (action === "dead-letters") {
          const r = await api.deadLetters(id, str("limit") ? Number(str("limit")) : undefined);
          print(r, () => (r.deadLetters.length === 0 ? "(no dead letters)" : r.deadLetters.map((/** @type {any} */ j) => `${j.id}  ${j.workflow_id}  ${j.env ?? ""}  ${j.last_error ?? ""}`).join("\n")));
          return 0;
        }
        if (action === "replay") {
          const r = await api.replay(id, _.slice(2));
          print(r, () => [`✓ replayed ${r.replayed.length}`, ...r.skipped.map((/** @type {any} */ s) => `  skipped ${s.id}: ${s.reason}`)].join("\n"));
          return 0;
        }
        throw new UsageError("run workflow <id> | run get <run-id> | run dead-letters | run replay [job-id ...]");
      }
      case "tail": {
        const id = await needProject();
        const kind = _[1];
        if (!kind || !["events", "requests", "errors"].includes(kind)) throw new UsageError("tail needs <events|requests|errors>");
        const r = await api.tail(id, { kind, env, since: str("since"), limit: str("limit") ? Number(str("limit")) : undefined });
        print(r, () => formatTail(r));
        return 0;
      }
      case "secrets": {
        const id = await needProject();
        const action = _[1] ?? "list";
        if (action === "list") {
          const r = await api.secrets(id);
          print(r, () => [
            ...(r.secrets.length === 0 ? ["(no secrets)"] : r.secrets.map((/** @type {any} */ s) => `${s.name}  ${s.env}  ${s.scope}  updated ${s.updatedAt}`)),
            ...(r.missing?.length ? [`missing (declared by the app): ${r.missing.join(", ")}`] : []),
          ].join("\n"));
          return 0;
        }
        const name = _[2];
        if (!name) throw new UsageError(`secrets ${action} needs a name`);
        const secretEnv = str("env");
        if (action === "set") {
          if (_[3] === undefined) throw new UsageError("secrets set needs a value, or - to read it from stdin (keeps it out of shell history)");
          const value = _[3] === "-" ? await readStdin() : _[3];
          const r = await api.setSecret(id, name, value, secretEnv);
          print(r, () => `✓ ${r.created ? "created" : "updated"} ${r.name} (${r.env})`);
          return 0;
        }
        if (action === "delete") {
          const r = await api.deleteSecret(id, name, secretEnv);
          print(r, () => `✓ deleted ${r.deleted} (${r.envs.join(", ")})`);
          return 0;
        }
        throw new UsageError("secrets [list | set <name> <value|-> | delete <name>]");
      }
      case "templates": {
        const action = _[1] ?? "search";
        if (action === "search") {
          const kind = str("kind");
          if (kind !== undefined && !["app", "block", "workflow", "component"].includes(kind)) throw new UsageError(`--kind is app, block, workflow or component, got "${kind}"`);
          const r = await api.searchTemplates({ query: _.slice(2).join(" ") || undefined, kind, category: str("category"), limit: str("limit") ? Number(str("limit")) : undefined });
          print(r, () => formatTemplateList(r.templates));
          return 0;
        }
        if (action === "show") {
          if (!_[2]) throw new UsageError("templates show needs a template slug (appbricx templates search)");
          const r = await api.template(_[2]);
          print(r, () => formatTemplate(r.template));
          return 0;
        }
        if (action === "use") {
          const slug = _[2];
          if (!slug) throw new UsageError("templates use needs a template slug (appbricx templates search)");
          const params = Array.isArray(flags["param"]) ? parseParams(/** @type {string[]} */ (flags["param"])) : undefined;
          const dryRun = flags["dry-run"] === true;
          const { template } = await api.template(slug);
          const isApp = template.kind === "app";
          // An app starts a new project unless one is named; everything else adds to the linked project.
          const projectId = isApp ? str("project") : await needProject();
          const r = await api.useTemplate(slug, {
            ...(projectId ? { project_id: projectId } : {}),
            ...(str("name") ? { name: str("name") } : {}),
            ...(params ? { params } : {}),
            ...(str("prefix") ? { prefix: str("prefix") } : {}),
            ...(dryRun ? { dry_run: true } : {}),
          });
          if (isApp && r.created && r.project?.id) await saveLink(cwd, { projectId: r.project.id, name: r.project.name });
          print(r, () => formatTemplateUse(r));
          return 0;
        }
        throw new UsageError("templates [search [words] | show <slug> | use <slug>]");
      }
      default:
        throw new UsageError(`unknown command "${cmd}" — appbricx help`);
    }
  } catch (e) {
    if (e instanceof UsageError) { err(`appbricx: ${e.message}`); return 2; }
    if (e instanceof ApiError) {
      if (json) out(JSON.stringify(e.body, null, 2));
      else {
        err(`✗ ${e.message}${e.body?.code ? ` [${e.body.code}]` : ""}`);
        if (e.body?.report?.stages) err(formatVerifyReport(e.body.report));
        else if (e.body?.report) err(formatContractReport(e.body.report));
        if (Array.isArray(e.body?.errors)) for (const x of e.body.errors) err(`  ${x}`);
        if (Array.isArray(e.body?.new_fixes)) for (const x of e.body.new_fixes) err(`  fix: ${x}`);
        if (e.body?.hint) err(`  hint: ${e.body.hint}`);
        if (e.status === 401) err("  hint: run `appbricx login` to sign in again");
      }
      return 1;
    }
    throw e;
  }
}
