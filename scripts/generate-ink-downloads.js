#!/usr/bin/env node
/**
 * PuniCodex — Check Before You Ink: download card generator.
 *
 * Bakes a tattoo-artist-ready reference card for every attested form in the
 * ink corpus:
 *   assets/ink/{id}.png  — 2000×1200, white ground, the form in black at
 *                          maximum size, with a caption bar (name, translit-
 *                          eration, script · period, punicodex.com/ink/) so
 *                          the file carries its own provenance to the artist.
 *   assets/ink/{id}.svg  — the bare form as scalable text, for editing.
 *
 * Rendering uses node-canvas with the host's historic fonts (Segoe UI
 * Historic covers runes, Egyptian hieroglyphs, cuneiform, Avestan; Nirmala
 * UI covers Devanagari). Because glyph bytes are platform-specific, existing
 * cards are SKIPPED by default — the same doctrine as the OG cards: re-bake
 * deliberately with --force or --only <id> and commit.
 *
 * Run: node scripts/generate-ink-downloads.js [--only <id>] [--force]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'ink');
const INDEX = require(path.join(ROOT, 'data', 'ink-index.json'));

const W = 2000;
const H = 1200;
const FONT_STACK = (px) =>
  `${px}px Georgia, "Segoe UI Historic", "Segoe UI Symbol", "Nirmala UI", "Noto Sans", serif`;

function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function captionFor(e) {
  const parts = [
    `${e.u} — ${e.script}`,
    e.trans && e.trans !== e.u ? `transliterated ${e.trans}` : null,
    [e.name, e.period].filter(Boolean).join(' · '),
    'punicodex.com/ink/',
  ].filter(Boolean);
  return parts.join('   ·   ');
}

function renderPng(e, outPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Fit the form to the card width.
  let px = 520;
  ctx.font = FONT_STACK(px);
  const measured = ctx.measureText(e.script).width;
  const maxW = W - 240;
  if (measured > maxW) px = Math.max(80, Math.floor((px * maxW) / measured));
  ctx.font = FONT_STACK(px);
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e.script, W / 2, H / 2 - 60);

  // Caption bar — same historic-font stack (the form appears here too), and
  // shrink-to-fit so long provenance lines never leave the card.
  const caption = captionFor(e);
  let cpx = 44;
  ctx.font = FONT_STACK(cpx);
  let cw = ctx.measureText(caption).width;
  while (cw > W - 240 && cpx > 26) {
    cpx -= 2;
    ctx.font = FONT_STACK(cpx);
    cw = ctx.measureText(caption).width;
  }
  ctx.fillStyle = '#555555';
  ctx.fillText(caption, W / 2, H - 110);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, H - 170);
  ctx.lineTo(W - 200, H - 170);
  ctx.stroke();

  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

function renderSvg(e, outPath) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="800" viewBox="0 0 2000 800">
  <text x="1000" y="440" text-anchor="middle" font-family="Georgia, 'Segoe UI Historic', 'Segoe UI Symbol', 'Nirmala UI', serif" font-size="420" fill="#111111">${escXml(e.script)}</text>
</svg>
`;
  fs.writeFileSync(outPath, svg);
}

function main() {
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
  const force = process.argv.includes('--force');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  for (const e of INDEX.entries) {
    if (only && e.id !== only) continue;
    const pngPath = path.join(OUT_DIR, `${e.id}.png`);
    const svgPath = path.join(OUT_DIR, `${e.id}.svg`);
    if (!force && !only && fs.existsSync(pngPath) && fs.existsSync(svgPath)) {
      skipped++;
      continue;
    }
    renderPng(e, pngPath);
    renderSvg(e, svgPath);
    written++;
    if (written % 100 === 0) console.log(`   ✓ ${written} cards...`);
  }
  console.log(`Ink downloads: ${written} written, ${skipped} skipped → assets/ink/`);
}

main();
