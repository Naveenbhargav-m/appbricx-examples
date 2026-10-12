// Usage: node probe.mjs <url> <outPrefix>  -- screenshot + list interactive elements
import { chromium } from 'playwright-core';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: false });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out + '.png' });
console.log('URL', page.url(), 'TITLE', await page.title());
console.log(await page.$$eval('a,button,input,select,textarea,[role=button]', els => els.slice(0,60).map(e => `${e.tagName} ${e.type||''} name=${e.name||''} ph=${e.placeholder||''} href=${e.getAttribute('href')||''} txt=${(e.innerText||e.value||'').trim().slice(0,40)}`).join('\n')));
await browser.close();
