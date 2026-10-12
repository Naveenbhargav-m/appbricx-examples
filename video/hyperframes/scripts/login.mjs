// Sign in to the Appbricx builder once and save the session for recordings.
//
//   APPBRICX_EMAIL=... APPBRICX_PASSWORD=... PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scripts/login.mjs [.auth/builder.json]
//
// Then record builder scenarios with STORAGE_STATE=.auth/builder.json so that no
// password appears on screen or in a scenario file. Use a dedicated test account
// with seeded demo data; never record a real customer workspace. .auth/ is secret.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || '.auth/builder.json');
const { APPBRICX_EMAIL: email, APPBRICX_PASSWORD: password, APPBRICX_URL: base = 'https://appbricx.com' } = process.env;
if (!email || !password) { console.error('set APPBRICX_EMAIL and APPBRICX_PASSWORD'); process.exit(1); }

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.locator('button:has-text("Got it")').click({ timeout: 2000 }).catch(() => {}); // cookie banner
await page.fill('input[type=email]', email);
await page.fill('input[type=password]', password);
await page.click('button[type=submit]:has-text("Sign in")');
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
await context.storageState({ path: out });
fs.chmodSync(out, 0o600);
console.log('signed in, landed on', page.url(), '- session saved to', out);
await browser.close();
