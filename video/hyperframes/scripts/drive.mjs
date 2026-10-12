// Scouting helper: a long-lived browser you drive over HTTP, for working out
// scenario steps without signing in again each time.
//
//   node scripts/drive.mjs 9333 &
//   curl -s localhost:9333 -d '{"goto":"https://kanbo.apps.appbricx.com"}'
//   curl -s localhost:9333 -d '{"login":["email","password"]}'
//   curl -s localhost:9333 -d '{"click":"text=Board"}'
//   curl -s localhost:9333 -d '{"eval":"document.title"}'
//   curl -s localhost:9333 -d '{"shot":"probe/x/a.png"}'
//   curl -s localhost:9333 -d '{"els":1}'      # interactive elements in the viewport
//   curl -s localhost:9333 -d '{"text":1}'     # visible text
import http from 'node:http';
import { chromium } from 'playwright-core';
const port = +(process.argv[2] || 9333);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
let ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(process.env.STORAGE_STATE ? { storageState: process.env.STORAGE_STATE } : {}) });
let page = await ctx.newPage();
const log = [];
const hook = (p) => {
  p.on('response', async (r) => { if (/__appbricx\/ai\//.test(r.url())) { let b = ''; try { b = (await r.text()).slice(0, 200); } catch {} log.push(`AI ${r.status()} ${b}`); } });
  p.on('console', (m) => { if (m.type() === 'error') log.push('CONSOLE ' + m.text().replace(/token=[^&' ]+/g, 'token=***').slice(0, 160)); });
};
hook(page);
const els = () => page.$$eval('h1,h2,h3,a,button,input,select,textarea,[role=button],[role=tab]', (es) => es.map((e) => {
  const r = e.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
  return `${e.tagName}${e.type ? ':' + e.type : ''} @${Math.round(r.x)},${Math.round(r.y)} ${e.getAttribute('aria-label') ? 'aria=' + e.getAttribute('aria-label') + ' ' : ''}${e.placeholder ? 'ph=' + e.placeholder + ' ' : ''}${(e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 70)}`;
}).filter(Boolean).join('\n'));
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const cmd = JSON.parse(body || '{}');
  let out = '';
  try {
    if (cmd.reset) { await ctx.close(); ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); page = await ctx.newPage(); hook(page); }
    if (cmd.goto) await page.goto(cmd.goto, { waitUntil: 'networkidle' });
    if (cmd.login) {
      await page.fill('input[type=email]', cmd.login[0]);
      await page.fill('input[type=password]', cmd.login[1]);
      await page.locator('button:has-text("Sign in")').first().click({ force: true });
      await page.waitForSelector('input[type=password]', { state: 'detached', timeout: 30000 });
      await page.waitForTimeout(2000);
    }
    if (cmd.click) { const l = page.locator(cmd.click).first(); await l.click({ timeout: 5000 }).catch(() => l.click({ force: true, timeout: 5000 })); await page.waitForTimeout(cmd.wait ?? 1200); }
    if (cmd.fill) { await page.locator(cmd.fill[0]).first().fill(cmd.fill[1]); }
    if (cmd.press) await page.keyboard.press(cmd.press);
    if (cmd.scroll) { await page.locator(cmd.scroll).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(600); }
    if (cmd.waitms) await page.waitForTimeout(cmd.waitms);
    if (cmd.eval) out += JSON.stringify(await page.evaluate(cmd.eval)) + '\n';
    if (cmd.shot) await page.screenshot({ path: cmd.shot });
    if (cmd.els) out += await els() + '\n';
    if (cmd.text) out += (await page.evaluate(() => document.body.innerText)).slice(0, cmd.text > 1 ? cmd.text : 3000) + '\n';
    if (cmd.state) { await ctx.storageState({ path: cmd.state }); }
  } catch (e) { out += 'ERR ' + e.message.split('\n')[0] + '\n'; }
  out = `URL ${page.url()}\n` + (log.length ? log.splice(0).join('\n') + '\n' : '') + out;
  res.end(out);
}).listen(port, () => console.log('drive on', port));
