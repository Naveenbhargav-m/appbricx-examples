// Assemble a montage ("reel") from several recordings.
//
//   node scripts/build-reel.mjs --picks reels/showcase.json --out out/showcase-reel [--intro 3.4 --outro 4.5]
//
// picks file: { "items": [ { "clip": "clips/kanbo.cues.json", "name": "Kanbo", "tag": "Team board",
//                            "url": "kanbo.apps.appbricx.com",
//                            "shots": [ { "cue": "sign-in", "dur": 2 }, { "cue": "In-app AI", "after": true, "dur": 4 } ] } ] }
// A shot finds the first caption cue containing `cue` (case-insensitive). By default it starts
// at that cue; with "after": true it starts at the first kept segment after the cue (for an AI
// answer that arrives after a cut wait). `skip` seconds can shift the start. Each shot uses only
// kept footage. The caption shown is the cue's own text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: a } = parseArgs({ options: {
  template: { type: 'string', default: 'reel' }, picks: { type: 'string' }, out: { type: 'string' },
  intro: { type: 'string', default: '3.4' }, outro: { type: 'string', default: '4.5' }, xfade: { type: 'string', default: '0.25' },
} });
const r2 = (n) => +n.toFixed(3);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const picks = JSON.parse(fs.readFileSync(a.picks, 'utf8'));
const out = path.resolve(a.out);
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'templates', a.template), out, { recursive: true });
fs.cpSync(path.join(root, 'templates', 'shared'), path.join(out, 'assets'), { recursive: true });
fs.mkdirSync(path.join(out, 'assets', 'clips'), { recursive: true });

const intro = +a.intro, xfade = +a.xfade;
let t = intro;
const track = [];
let vid = 0;
picks.items.forEach((it, idx) => {
  const rec = JSON.parse(fs.readFileSync(it.clip, 'utf8'));
  const src = `assets/clips/${rec.source}`;
  if (!fs.existsSync(path.join(out, src))) fs.copyFileSync(path.join(path.dirname(it.clip), rec.source), path.join(out, src));
  const itemStart = t;
  for (const sh of it.shots) {
    const cue = rec.cues.find((c) => c.text && c.text.toLowerCase().includes(sh.cue.toLowerCase()));
    if (!cue) throw new Error(`${it.name}: no cue matching "${sh.cue}"`);
    let seg = sh.after ? rec.segments.find((g) => g[0] > cue.t + 0.01) : rec.segments.find((g) => cue.t >= g[0] - 0.01 && cue.t <= g[1]);
    if (!seg) throw new Error(`${it.name}: no footage for "${sh.cue}"`);
    const from = (sh.after ? seg[0] : cue.t) + (sh.skip || 0);
    const dur = Math.min(sh.dur, seg[1] - from);
    const start = vid ? t - xfade : t;
    track.push(`      <video id="v${++vid}" class="rec" src="${src}" muted playsinline data-start="${r2(start)}" data-duration="${r2(dur)}" data-media-start="${r2(from)}" data-track-index="3"${vid > 1 ? ` data-xfade="${xfade}"` : ''}></video>`);
    track.push(`      <div class="clip caption" data-start="${r2(start + 0.2)}" data-duration="${r2(dur - 0.3)}" data-track-index="5"><span>${esc(sh.caption || cue.text)}</span></div>`);
    t = start + dur;
  }
  const len = t - itemStart;
  track.push(`      <div class="clip urlclip" data-start="${r2(itemStart)}" data-duration="${r2(len)}" data-track-index="4"><span>https://<b>${esc(it.url)}</b></span></div>`);
  track.push(`      <div class="clip chip" data-start="${r2(itemStart + 0.15)}" data-duration="${r2(len - 0.2)}" data-track-index="6"><span>${esc(it.name)} <small>${idx + 1}/${picks.items.length} · ${esc(it.tag || '')}</small></span></div>`);
});
const clipEnd = t, endStart = r2(clipEnd - 0.2), total = r2(endStart + +a.outro);
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<!-- @CLIP_TRACK[^>]*-->/, track.join('\n'));
const tokens = { __TOTAL__: total, __INTRO__: intro, __CLIP_START__: intro, __CLIP_LEN__: r2(clipEnd - intro), __END_START__: endStart, __OUTRO__: r2(total - endStart) };
for (const [k, v] of Object.entries(tokens)) html = html.replaceAll(k, String(v));
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`built ${path.relative(root, out)}: ${total}s, ${vid} shots from ${picks.items.length} recordings`);
