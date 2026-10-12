// Record a scripted browser session as an MP4, plus caption cues on the same clock.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/record.mjs <scenario> [outDir]
//
// Scenarios live in scripts/scenarios/<name>.mjs and export
//   { name, url, viewport?, colorScheme?, storageState?, run: async (page, s) => {} }
// `s` helpers: s.cue(text) starts a caption, s.keep()/s.cut() bracket footage to
// keep (dead time such as a slow sign-in is dropped), s.click/s.type/s.moveTo drive
// a visible cursor, s.pause(ms) waits.
//
// Frames come from the Chrome DevTools screencast. Each frame carries its own
// timestamp, so cue times line up exactly with the footage (Playwright's
// recordVideo adds an unknown lead-in and encodes VP8 at a low bitrate).
//
// Env: STORAGE_STATE=path.json reuses a signed-in session (see scripts/login.mjs);
//      CHROME_PATH overrides the Chromium binary.
//
// Output: <outDir>/<name>.mp4        H.264, CRF 18, 30 fps, viewport size
//         <outDir>/<name>.cues.json  { duration, segments: [[in,out]...], cues: [{t,text}] }
//                                    seconds on the MP4's clock
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [scenarioName, outDirArg] = process.argv.slice(2);
if (!scenarioName) { console.error('usage: node scripts/record.mjs <scenario> [outDir]'); process.exit(1); }
const outDir = path.resolve(outDirArg || path.join(here, '..', 'clips'));
fs.mkdirSync(outDir, { recursive: true });
const scenario = (await import(pathToFileURL(path.join(here, 'scenarios', scenarioName + '.mjs')))).default;
const viewport = scenario.viewport || { width: 1280, height: 720 };
const storageState = process.env.STORAGE_STATE || scenario.storageState;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  args: ['--disable-background-networking', '--hide-scrollbars'],
});
const context = await browser.newContext({
  viewport,
  colorScheme: scenario.colorScheme || 'light',
  ...(storageState ? { storageState } : {}),
});

// A visible cursor and click ripple, since headless sessions have none.
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById('__rec_cursor')) return;
    const c = document.createElement('div');
    c.id = '__rec_cursor';
    c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:left .45s cubic-bezier(.22,1,.36,1),top .45s cubic-bezier(.22,1,.36,1)';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    window.__recMove = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
    window.__recRipple = (x, y) => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;border-radius:50%;background:rgba(11,122,78,.35);z-index:2147483646;pointer-events:none;transform:scale(.3);opacity:1;transition:transform .5s ease-out,opacity .5s ease-out`;
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.6)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    };
    try { const l = JSON.parse(sessionStorage.getItem('__recLast')); if (l) window.__recMove(l[0], l[1]); } catch {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
});

const page = await context.newPage();
const frameDir = fs.mkdtempSync(path.join(outDir, '.frames-'));
const frames = []; // { file, ts } with ts in epoch seconds
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = path.join(frameDir, String(frames.length).padStart(6, '0') + '.jpg');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, ts: metadata.timestamp ?? Date.now() / 1000 });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

const t0 = Date.now() / 1000; // the MP4's time zero
const now = () => Date.now() / 1000 - t0;
const r2 = (t) => +t.toFixed(2);
const cues = [];
const segments = [];
let segOpen = null;
let last = [viewport.width / 2, viewport.height / 2];

const s = {
  page,
  now,
  pause: (ms) => page.waitForTimeout(ms),
  cue: (text) => { cues.push({ t: r2(now()), text }); console.log(`[${now().toFixed(2)}s] cue: ${text}`); },
  // mark()/rewind(t): drop everything recorded since t (footage and captions), for
  // an optional step that did not work out (for example an AI reply that never came).
  mark: () => r2(now()),
  rewind(t) {
    if (segOpen !== null) s.cut();
    while (segments.length && segments.at(-1)[0] >= t) segments.pop();
    if (segments.length && segments.at(-1)[1] > t) segments.at(-1)[1] = t;
    while (cues.length && cues.at(-1).t >= t) cues.pop();
    console.log(`[${now().toFixed(2)}s] rewound to ${t}s`);
  },
  keep: () => { if (segOpen === null) segOpen = r2(now()); },
  cut: () => { if (segOpen !== null) { segments.push([segOpen, r2(now())]); segOpen = null; } },
  // Smoothly scroll an element to the middle of its scroll container.
  async scrollTo(locator, block = 'center') {
    const loc = page.locator(locator).first();
    await loc.waitFor({ state: 'attached', timeout: 20000 });
    await loc.evaluate((e, b) => e.scrollIntoView({ behavior: 'smooth', block: b }), block);
    await page.waitForTimeout(1000);
  },
  async scrollBy(dy, sel) {
    await page.evaluate(([dy, sel]) => (sel ? document.querySelector(sel) : window).scrollBy({ top: dy, behavior: 'smooth' }), [dy, sel || null]);
    await page.waitForTimeout(1000);
  },
  async moveTo(locator) {
    const loc = page.locator(locator).first();
    await loc.waitFor({ state: 'visible', timeout: 20000 });
    const b0 = await loc.boundingBox();
    if (!b0 || b0.y < 0 || b0.y + b0.height > viewport.height) await s.scrollTo(locator);
    const box = await loc.boundingBox();
    if (!box) throw new Error('not visible: ' + locator);
    last = [box.x + box.width / 2, box.y + box.height / 2];
    await page.evaluate(([x, y]) => {
      try { sessionStorage.setItem('__recLast', JSON.stringify([x, y])); } catch {}
      window.__recMove && window.__recMove(x, y);
    }, last);
    await page.mouse.move(last[0], last[1], { steps: 8 });
    await page.waitForTimeout(500);
  },
  async click(locator) {
    await s.moveTo(locator);
    await page.evaluate(([x, y]) => window.__recRipple && window.__recRipple(x, y), last);
    const l = page.locator(locator).first();
    await l.click({ timeout: 1200 }).catch(() => l.click({ force: true, timeout: 8000 }));
  },
  // Press an in-app AI button and keep only the useful part: the click and a
  // moment of the loading state stay, the wait for the answer is cut, and a
  // reply that comes back empty or truncated (it happens) is re-asked off camera.
  // Returns the answer text.
  async ai(button, { retry = button, min = 40, tries = 12, loading = 900, settle = 1200, optional = false } = {}) {
    let n = 0;
    while (n++ < tries) {
      const resp = page.waitForResponse((r) => /__appbricx\/ai\//.test(r.url()), { timeout: 60000 }).catch(() => null);
      await s.click(n === 1 ? button : retry);
      await page.waitForTimeout(n === 1 ? loading : 0);
      s.cut();
      let content = '';
      try { content = (await (await resp)?.json())?.content || ''; } catch {}
      console.log(`  ai try ${n}: ${content.length} chars`);
      if (content.trim().length >= min) {
        await page.waitForTimeout(settle);
        s.keep();
        return content;
      }
      await page.waitForTimeout(1500);
    }
    if (optional) return null;
    s.keep();
    throw new Error('AI never returned a usable answer');
  },
  async type(locator, text, delay = 55) {
    await s.click(locator);
    await page.locator(locator).first().pressSequentially(text, { delay });
  },
};

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: viewport.width, maxHeight: viewport.height, everyNthFrame: 1 });
let failed = null;
try {
  await page.goto(scenario.url, { waitUntil: 'networkidle' });
  await scenario.run(page, s);
} catch (e) {
  failed = e;
  console.error('scenario failed:', e.message);
} finally {
  s.cue('');
  s.cut();
  await page.waitForTimeout(300);
  const tEnd = now();
  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();

  // Turn the variable-rate frame stream into a constant 30 fps MP4. A frame is
  // shown until the next one arrived; the first frame also fills the lead-in.
  const list = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const start = i === 0 ? 0 : f.ts - t0;
    const end = i + 1 < frames.length ? frames[i + 1].ts - t0 : tEnd;
    list.push(`file '${path.basename(f.file)}'`, `duration ${Math.max(0.001, end - start).toFixed(4)}`);
  });
  if (frames.length) list.push(`file '${path.basename(frames.at(-1).file)}'`);
  fs.writeFileSync(path.join(frameDir, 'list.ffconcat'), list.join('\n'));
  const dest = path.join(outDir, scenario.name + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(frameDir, 'list.ffconcat'),
    '-vf', `fps=30,scale=${viewport.width}:${viewport.height}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '15', '-movflags', '+faststart', dest]);
  fs.rmSync(frameDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, scenario.name + '.cues.json'), JSON.stringify({
    source: path.basename(dest), duration: r2(tEnd), viewport, segments, cues,
  }, null, 2));
  console.log(`wrote ${dest} (${frames.length} frames, ${tEnd.toFixed(1)}s)`);
  if (failed) process.exitCode = 1;
}
