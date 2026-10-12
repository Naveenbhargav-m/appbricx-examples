// Assemble the explainer: copies templates/explainer and places real footage.
//
//   node scripts/build-explainer.mjs --config explainers/main.json --out out/explainer
//
// config: { "footage": [ { "slot": "ch1"|"ch2"|..."ch5"|"cut", "file": "out/learnly-build.mp4", "from": 10.2,
//                          "start": 11.4, "dur": 5.6, "label": "..." }  // or "cues": "clips/x.cues.json", "cue": "...", "after": true
//          ] }
// "ch*" slots play inside the chapter's frame, "cut" slots fill the quick-cuts frame.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: a } = parseArgs({ options: { template: { type: 'string', default: 'explainer' }, config: { type: 'string' }, out: { type: 'string' } } });
const r2 = (n) => +n.toFixed(3);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cfg = JSON.parse(fs.readFileSync(a.config, 'utf8'));
const out = path.resolve(a.out);
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'templates', a.template), out, { recursive: true });
fs.cpSync(path.join(root, 'templates', 'shared'), path.join(out, 'assets'), { recursive: true });
fs.mkdirSync(path.join(out, 'assets', 'clips'), { recursive: true });
const track = [];
cfg.footage.forEach((f, i) => {
  let file = f.file, from = f.from;
  if (f.cues) {
    const rec = JSON.parse(fs.readFileSync(f.cues, 'utf8'));
    file = path.join(path.dirname(f.cues), rec.source);
    const cue = rec.cues.find((c) => c.text && c.text.toLowerCase().includes(f.cue.toLowerCase()));
    if (!cue) throw new Error('no cue ' + f.cue);
    const seg = f.after ? rec.segments.find((g) => g[0] > cue.t + 0.01) : rec.segments.find((g) => cue.t >= g[0] - 0.01 && cue.t <= g[1]);
    from = (f.after ? seg[0] : cue.t) + (f.skip || 0);
  }
  const name = path.basename(file);
  const dest = path.join(out, 'assets', 'clips', name);
  if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
  const cls = f.slot === 'cut' ? 'cut' : 'inframe';
  track.push(`      <video id="f${i + 1}" class="${cls}" src="assets/clips/${name}" muted playsinline data-start="${f.start}" data-duration="${f.dur}" data-media-start="${r2(from)}" data-track-index="${3 + (i % 2)}"></video>`);
  if (f.label) track.push(`      <div class="clip cutlabel" data-start="${r2(f.start + 0.1)}" data-duration="${r2(f.dur - 0.2)}" data-track-index="5"><span>${esc(f.label)}</span></div>`);
});
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/<!-- @CLIP_TRACK[^>]*-->/, track.join('\n'));
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`built ${path.relative(root, out)} with ${cfg.footage.length} footage clips`);
