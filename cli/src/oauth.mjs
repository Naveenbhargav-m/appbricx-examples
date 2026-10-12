// Browser sign-in for the CLI: OAuth 2.1 authorization code + PKCE with a
// loopback redirect (RFC 8252), against the same authorization server the
// MCP clients use (services/api/src/oauth).
//
//   1. discover   GET <api>/.well-known/oauth-authorization-server
//                 (falls back to RFC 9728 discovery from <api>/mcp)
//   2. register   POST registration_endpoint, redirect http://127.0.0.1:<port>/callback
//   3. authorize  open the browser to authorization_endpoint (the consent page)
//   4. callback   the loopback server receives ?code&state
//   5. token      POST token_endpoint (code + code_verifier) → access + refresh
// Refresh tokens rotate: every refresh returns a new one, which is saved.

import http from "node:http";
import os from "node:os";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

export const SCOPES = "read apply deploy";

/** @param {string} u */
async function getJson(u) {
  const res = await fetch(u, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${u} answered ${res.status}`);
  return /** @type {Record<string, any>} */ (await res.json());
}

/**
 * Find the authorization server for an appbricx API base.
 * @param {string} api e.g. https://appbricx.com/api
 * @returns {Promise<Record<string, any>>}
 */
export async function discover(api) {
  const base = api.replace(/\/+$/, "");
  try {
    return await getJson(`${base}/.well-known/oauth-authorization-server`);
  } catch {
    // Standard MCP discovery: protected resource → authorization server.
    const resource = new URL(`${base}/mcp`);
    const prm = await getJson(`${resource.origin}/.well-known/oauth-protected-resource${resource.pathname}`);
    const issuer = String(prm.authorization_servers?.[0] ?? "").replace(/\/+$/, "");
    if (!issuer) throw new Error("the server doesn't advertise an authorization server");
    return getJson(`${issuer}/.well-known/oauth-authorization-server`);
  }
}

/** @returns {{ verifier: string, challenge: string }} */
export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

/** Best effort: open a URL in the default browser. @param {string} url */
export function openBrowser(url) {
  const cmd = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    const child = spawn(/** @type {string} */ (cmd[0]), /** @type {string[]} */ (cmd[1]), { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* the URL is printed too */
  }
}

const PAGE = (/** @type {string} */ title, /** @type {string} */ msg) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;color:#222"><div style="text-align:center"><h1 style="font-size:20px">${title}</h1><p>${msg}</p></div></body>`;

/**
 * Listen on 127.0.0.1 (random port) for one OAuth callback.
 * @param {number} timeoutMs
 */
async function loopback(timeoutMs) {
  /** @type {(v: URLSearchParams) => void} */
  let resolveParams = () => {};
  /** @type {(e: Error) => void} */
  let rejectParams = () => {};
  const params = new Promise((res, rej) => { resolveParams = res; rejectParams = rej; });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const ok = u.searchParams.has("code");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(ok ? PAGE("Signed in to Appbricx", "You can close this window and go back to your terminal.") : PAGE("Sign-in did not complete", "Go back to your terminal for details."));
    resolveParams(u.searchParams);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(undefined)));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const timer = setTimeout(() => rejectParams(new Error("timed out waiting for the browser sign-in (5 minutes)")), timeoutMs);
  return {
    redirectUri: `http://127.0.0.1:${port}/callback`,
    wait: /** @type {Promise<URLSearchParams>} */ (params),
    close: () => { clearTimeout(timer); server.close(); },
  };
}

/**
 * @param {string} url @param {Record<string, string>} form
 * @returns {Promise<Record<string, any>>}
 */
async function postForm(url, form) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(form).toString(),
  });
  const body = /** @type {Record<string, any>} */ (await res.json().catch(() => ({})));
  if (!res.ok) {
    const e = new Error(body.error_description ?? body.error ?? `token endpoint answered ${res.status}`);
    /** @type {any} */ (e).oauthError = body.error;
    throw e;
  }
  return body;
}

/**
 * The whole browser flow. Returns the token set to save.
 * @param {{ api: string, open?: (url: string) => void | Promise<void>, log?: (s: string) => void, timeoutMs?: number }} opts
 */
export async function browserLogin(opts) {
  const log = opts.log ?? (() => {});
  const meta = await discover(opts.api);
  if (!meta.registration_endpoint || !meta.authorization_endpoint || !meta.token_endpoint) {
    throw new Error("this server doesn't support browser sign-in; use `appbricx login --token <pat>`");
  }
  const cb = await loopback(opts.timeoutMs ?? 5 * 60_000);
  try {
    const regRes = await fetch(meta.registration_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: `Appbricx CLI (${os.hostname().slice(0, 40)})`,
        redirect_uris: [cb.redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    const reg = /** @type {Record<string, any>} */ (await regRes.json().catch(() => ({})));
    if (!regRes.ok || !reg.client_id) throw new Error(`client registration failed: ${reg.error_description ?? reg.error ?? regRes.status}`);

    const { verifier, challenge } = pkcePair();
    const state = randomBytes(16).toString("base64url");
    const resource = `${opts.api.replace(/\/+$/, "")}/mcp`;
    const authUrl = new URL(meta.authorization_endpoint);
    for (const [k, v] of Object.entries({
      response_type: "code",
      client_id: reg.client_id,
      redirect_uri: cb.redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: SCOPES,
      state,
      resource,
    })) authUrl.searchParams.set(k, v);

    log(`Opening your browser to sign in to Appbricx. If it doesn't open, visit:\n  ${authUrl.toString()}`);
    await (opts.open ?? openBrowser)(authUrl.toString());

    const params = await cb.wait;
    if (params.get("state") !== state) throw new Error("sign-in answered with a different state; try again");
    const err = params.get("error");
    if (err) throw new Error(err === "access_denied" ? "sign-in was cancelled in the browser" : `sign-in failed: ${params.get("error_description") ?? err}`);
    const code = params.get("code");
    if (!code) throw new Error("sign-in returned no code");

    const tok = await postForm(meta.token_endpoint, {
      grant_type: "authorization_code",
      code,
      redirect_uri: cb.redirectUri,
      client_id: reg.client_id,
      code_verifier: verifier,
      resource,
    });
    return toSaved(tok, { clientId: reg.client_id, tokenEndpoint: meta.token_endpoint, revocationEndpoint: meta.revocation_endpoint ?? null });
  } finally {
    cb.close();
  }
}

/**
 * @param {Record<string, any>} tok
 * @param {{ clientId: string, tokenEndpoint: string, revocationEndpoint: string | null }} client
 */
function toSaved(tok, client) {
  return {
    token: /** @type {string} */ (tok.access_token),
    refreshToken: /** @type {string} */ (tok.refresh_token),
    expiresAt: Date.now() + Number(tok.expires_in ?? 3600) * 1000,
    oauth: client,
  };
}

/**
 * Swap a refresh token for a new pair (the old one stops working).
 * @param {{ refreshToken: string, oauth: { clientId: string, tokenEndpoint: string, revocationEndpoint: string | null } }} saved
 */
export async function refreshTokens(saved) {
  const tok = await postForm(saved.oauth.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: saved.refreshToken,
    client_id: saved.oauth.clientId,
  });
  return toSaved(tok, saved.oauth);
}

/**
 * Best-effort RFC 7009 revocation of the refresh token (ends the grant).
 * @param {{ refreshToken: string, oauth: { clientId: string, revocationEndpoint: string | null } }} saved
 */
export async function revokeTokens(saved) {
  if (!saved.oauth.revocationEndpoint) return;
  await fetch(saved.oauth.revocationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: saved.refreshToken, token_type_hint: "refresh_token", client_id: saved.oauth.clientId }).toString(),
  }).catch(() => {});
}
