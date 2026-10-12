// Scouting helper: sign in to a showcase app, run a few steps, then screenshot and
// list the interactive elements and visible headings.
//
//   node scripts/explore.mjs <slug> <email|-> <password|-> <outPrefix> ['[{"click":"text=Book"},{"wait":1000}]']
//
// Steps: {click: selector} {fill: [selector, text]} {goto: path} {wait: ms} {shot: name}
import { chromium } from 'playwright-core';
const [slug, email, pw, out, stepsJson] = process.argv.slice(2);
const steps = stepsJson ? JSON.parse(stepsJson) : [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on('response', async (r) => { if (/\/ai\b|\/ai\//.test(r.url())) { let b=''; try { b=(await r.text()).slice(0,300);} catch {} console.log('AI-RESP', r.status(), r.url(), b); } });
page.on('console', (m) => { if (m.type()==='error') console.log('CONSOLE', m.text().slice(0,200)); });
const base = `https://${slug}.apps.appbricx.com`;
await page.goto(base, { waitUntil: 'networkidle' });
if (email !== '-') {
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', pw);
  await page.locator('button:has-text("Sign in")').first().click({ timeout: 8000 }).catch(() => page.locator('button:has-text("Sign in")').first().click({ force: true }));
  await page.waitForSelector('input[type=password]', { state: 'detached', timeout: 30000 }).catch((e) => console.log('still on login', e.message));
  await page.waitForTimeout(2500);
}
for (const st of steps) {
  try {
    if (st.click) { const l = page.locator(st.click).first(); await l.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {}); await l.click({ timeout: 6000 }).catch(() => l.click({ force: true, timeout: 6000 })); }
    if (st.fill) await page.locator(st.fill[0]).first().fill(st.fill[1]);
    if (st.press) await page.keyboard.press(st.press);
    if (st.goto) await page.goto(base + st.goto, { waitUntil: 'networkidle' });
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.shot) await page.screenshot({ path: `${out}-${st.shot}.png` });
    if (st.full) await page.screenshot({ path: `${out}-${st.full}.png`, fullPage: true });
  } catch (e) { console.log('STEP FAILED', JSON.stringify(st), e.message.split('\n')[0]); }
}
await page.waitForTimeout(800);
await page.screenshot({ path: out + '.png' });
console.log('URL', page.url());
console.log(await page.$$eval('h1,h2,h3,a,button,input,select,textarea,[role=button],[role=tab]', (els) => els.slice(0, 120).map((e) => {
  const r = e.getBoundingClientRect();
  return `${e.tagName} ${e.type || ''} ${r.width ? '' : '(hidden)'} y=${Math.round(r.y)} aria=${e.getAttribute('aria-label') || ''} ph=${e.placeholder || ''} href=${e.getAttribute('href') || ''} txt=${(e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`;
}).join('\n')));
await browser.close();
