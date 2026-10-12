// Where the CLI keeps its state:
//   ~/.config/appbricx/config.json   { api, token, refreshToken?, expiresAt?, oauth? }
//                                    (APPBRICX_CONFIG overrides; mode 0600)
//     token         a personal access token, or the OAuth access token from
//                   browser sign-in (1h, refreshed automatically)
//     refreshToken  browser sign-in only; rotates on every refresh
//     oauth         { clientId, tokenEndpoint, revocationEndpoint }
//   ./.appbricx/project.json         { projectId, name } (the linked project)
//   ./appbricx.json                  the contract you edit (pull writes it)
// APPBRICX_API / APPBRICX_TOKEN / APPBRICX_PROJECT override the files —
// what CI and coding agents use.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const CONTRACT_FILE = "appbricx.json";

export function configPath() {
  return process.env.APPBRICX_CONFIG ?? path.join(os.homedir(), ".config", "appbricx", "config.json");
}

/** @param {string} file */
async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

/** @param {string} file @param {unknown} value @param {number} [mode] */
async function writeJson(file, value, mode) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", { encoding: "utf-8", ...(mode ? { mode } : {}) });
}

/**
 * @typedef {{ clientId: string, tokenEndpoint: string, revocationEndpoint: string | null }} OAuthClientInfo
 * @typedef {{ api: string, token: string, refreshToken?: string, expiresAt?: number, oauth?: OAuthClientInfo }} SavedConfig
 */

/** @returns {Promise<{ api: string | null, token: string | null, tokenFromEnv: boolean, saved: Partial<SavedConfig> | null }>} */
export async function loadConfig() {
  const file = /** @type {Partial<SavedConfig> | null} */ (await readJson(configPath()));
  return {
    api: process.env.APPBRICX_API ?? file?.api ?? null,
    token: process.env.APPBRICX_TOKEN ?? file?.token ?? null,
    tokenFromEnv: process.env.APPBRICX_TOKEN !== undefined,
    saved: file,
  };
}

/** @param {SavedConfig | { api: string }} cfg */
export async function saveConfig(cfg) {
  // 0600: the token is a credential.
  await writeJson(configPath(), cfg, 0o600);
}

/** @param {string} cwd */
export function linkPath(cwd) {
  return path.join(cwd, ".appbricx", "project.json");
}

/** @param {string} cwd @returns {Promise<string | null>} */
export async function linkedProject(cwd) {
  if (process.env.APPBRICX_PROJECT) return process.env.APPBRICX_PROJECT;
  const link = /** @type {{ projectId?: string } | null} */ (await readJson(linkPath(cwd)));
  return link?.projectId ?? null;
}

/** @param {string} cwd @param {{ projectId: string, name?: string }} link */
export async function saveLink(cwd, link) {
  await writeJson(linkPath(cwd), link);
}

/** @param {string} file */
export async function readContractFile(file) {
  const raw = await fs.readFile(file, "utf-8").catch(() => null);
  if (raw === null) throw new Error(`no contract at ${file} — run \`appbricx pull\` or write one`);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** @param {string} file @param {unknown} contract */
export async function writeContractFile(file, contract) {
  await writeJson(file, contract);
}
