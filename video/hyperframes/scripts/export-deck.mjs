// Export an HTML deck (1920x1080 <section class="slide"> pages) to PDF and PNGs.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/export-deck.mjs templates/deck/deck.html out/deck
//
// Copies the deck, its assets/ and the shared brand kit into the output folder, then writes
// <out>/appbricx-deck.pdf and <out>/slide-01.png ... (1920x1080 each).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [deckArg, outArg] = process.argv.slice(2);
const deck = path.resolve(deckArg), out = path.resolve(outArg || 'out/deck');
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'templates', 'shared'), path.join(out, 'assets'), { recursive: true });
if (fs.existsSync(path.join(path.dirname(deck), 'assets'))) fs.cpSync(path.join(path.dirname(deck), 'assets'), path.join(out, 'assets'), { recursive: true });
fs.copyFileSync(deck, path.join(out, 'deck.html'));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(out, 'deck.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(out, 'appbricx-deck.pdf'), width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const slides = await page.$$('section.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(out, `slide-${String(i + 1).padStart(2, '0')}.png`) });
await browser.close();
console.log(`exported ${slides.length} slides to ${out}`);
