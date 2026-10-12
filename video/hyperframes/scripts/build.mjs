// Assemble a HyperFrames project from a template and a recording.
//
//   node scripts/build.mjs --template showcase-demo --clip clips/kanbo.cues.json --out out/kanbo-demo \
//        [--intro 3.2] [--outro 4] [--xfade 0.3]
//
// Copies templates/<template>/ and templates/shared/ (as assets/) into --out, copies
// the recording into assets/clips/, then fills the template's timing tokens and the
// <!-- @CLIP_TRACK --> marker with one <video> per kept segment and one timed
// caption per cue. Text copy stays in HyperFrames variables, so the same build can
// be rendered with different --variables.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: a } = parseArgs({ options: {
  template: { type: 'string', default: 'showcase-demo' },
  clip: { type: 'string' },
  out: { type: 'string' },
  intro: { type: 'string', default: '3.2' },
  outro: { type: 'string', default: '4' },
  xfade: { type: 'string', default: '0.3' },
} });
if (!a.clip || !a.out) { console.error('usage: node scripts/build.mjs --clip <cues.json> --out <dir> [--template showcase-demo]'); process.exit(1); }

const intro = +a.intro, outro = +a.outro, xfade = +a.xfade;
const cuesPath = path.resolve(a.clip);
const rec = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
const out = path.resolve(a.out);
const r2 = (n) => +n.toFixed(3);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'templates', a.template), out, { recursive: true });
fs.cpSync(path.join(root, 'templates', 'shared'), path.join(out, 'assets'), { recursive: true });
fs.mkdirSync(path.join(out, 'assets', 'clips'), { recursive: true });
const clipFile = `assets/clips/${rec.source}`;
fs.copyFileSync(path.join(path.dirname(cuesPath), rec.source), path.join(out, clipFile));

// Lay the kept segments end to end after the intro; each later one overlaps the
// previous by `xfade` seconds and fades in over it.
const segs = (rec.segments?.length ? rec.segments : [[0, rec.duration]]);
let t = intro;
const placed = segs.map(([sin, sout], i) => {
  const start = i === 0 ? t : t - xfade;
  const p = { sin, sout, start: r2(start), dur: r2(sout - sin) };
  t = start + (sout - sin);
  return p;
});
const clipEnd = t;
const endStart = r2(clipEnd - 0.2); // end card fades in over the last frames
const total = r2(endStart + outro);

// Map a time on the recording's clock to the output timeline.
const toOut = (ts) => {
  const p = placed.find((q) => ts >= q.sin - 1e-6 && ts <= q.sout + 1e-6);
  return p ? { at: p.start + (ts - p.sin), seg: p } : null;
};

const lines = [];
placed.forEach((p, i) => {
  lines.push(`      <video id="rec-${i + 1}" class="rec" src="${clipFile}" muted playsinline`
    + ` data-start="${p.start}" data-duration="${p.dur}" data-media-start="${r2(p.sin)}" data-track-index="3"`
    + (i > 0 ? ` data-xfade="${xfade}"` : '') + `></video>`);
});
rec.cues.forEach((c, i) => {
  if (!c.text) return;
  const from = toOut(c.t);
  if (!from) { console.warn(`cue "${c.text}" at ${c.t}s is outside every kept segment; skipped`); return; }
  const next = rec.cues[i + 1];
  const nextOut = next ? toOut(next.t) : null;
  // A caption ends at the next cue, or at the end of its own segment, whichever is first.
  let end = Math.min(from.seg.start + from.seg.dur, nextOut ? nextOut.at : Infinity);
  const start = Math.max(from.at, placed[0].start + 0.5); // let the window land first
  if (end - start < 0.8) { console.warn(`cue "${c.text}" is too short to read; skipped`); return; }
  lines.push(`      <div id="cap-${i + 1}" class="clip caption" data-start="${r2(start)}" data-duration="${r2(end - start - 0.05)}" data-track-index="5"><span>${esc(c.text)}</span></div>`);
});

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<!-- @CLIP_TRACK[^>]*-->/, lines.join('\n'));
const tokens = { __TOTAL__: total, __INTRO__: intro, __CLIP_START__: placed[0].start, __CLIP_LEN__: r2(clipEnd - placed[0].start), __END_START__: endStart, __OUTRO__: r2(total - endStart) };
for (const [k, v] of Object.entries(tokens)) html = html.replaceAll(k, String(v));
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({ template: a.template, clip: path.relative(root, cuesPath), ...tokens, segments: placed }, null, 2));
console.log(`built ${path.relative(root, out)}: ${total}s (intro ${intro}s, clip ${r2(clipEnd - intro)}s, outro ${outro}s), ${lines.length} timed elements`);
