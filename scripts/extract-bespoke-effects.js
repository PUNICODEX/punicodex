#!/usr/bin/env node
/**
 * Extract bespoke hero canvas effects from restored flagship temples
 * into templates/flagship/effects/ so create-flagship.js can apply them
 * automatically during regeneration.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const EFFECTS_DIR = path.join(ROOT, 'templates', 'flagship', 'effects');

const CANVAS_ID_RE = /document\.getElementById\(['"]([^'"]*canvas)['"]\)/i;
const BOOKING_MARKER = '// ========== BOOKING SYSTEM ==========';

function extractCanvasPrefix(script) {
  const iifeMatch = script.match(/^[\s\S]*?\}\)\(\);/);
  if (iifeMatch && CANVAS_ID_RE.test(iifeMatch[0])) {
    CANVAS_ID_RE.lastIndex = 0;
    return iifeMatch[0].trimEnd();
  }
  CANVAS_ID_RE.lastIndex = 0;

  const dividerMatch = script.match(/^[\s\S]*?(?=\n\/\/ ========== )/);
  if (dividerMatch && CANVAS_ID_RE.test(dividerMatch[0])) {
    CANVAS_ID_RE.lastIndex = 0;
    return dividerMatch[0].trimEnd();
  }
  CANVAS_ID_RE.lastIndex = 0;

  const idx = script.indexOf(BOOKING_MARKER);
  if (idx <= 0) return null;
  const prefix = script.slice(0, idx).trimEnd();
  if (!prefix || !CANVAS_ID_RE.test(prefix)) return null;
  CANVAS_ID_RE.lastIndex = 0;
  return prefix;
}

function findCanvasId(prefix) {
  const m = prefix.match(CANVAS_ID_RE);
  return m ? m[1] : null;
}

function main() {
  if (!fs.existsSync(EFFECTS_DIR)) {
    fs.mkdirSync(EFFECTS_DIR, { recursive: true });
  }

  const sites = fs
    .readdirSync(SITES_DIR)
    .filter((id) => fs.statSync(path.join(SITES_DIR, id)).isDirectory());

  const registry = {};
  let extractedCount = 0;

  for (const site of sites) {
    const scriptPath = path.join(SITES_DIR, site, 'script.js');
    if (!fs.existsSync(scriptPath)) continue;
    const script = fs.readFileSync(scriptPath, 'utf8');

    const prefix = extractCanvasPrefix(script);
    if (!prefix) continue;

    const canvasId = findCanvasId(prefix);
    if (!canvasId) continue;

    const outPath = path.join(EFFECTS_DIR, `${site}.js`);
    fs.writeFileSync(outPath, prefix + '\n', 'utf8');
    registry[site] = { canvasId };
    extractedCount++;
    console.log(`extracted ${site} -> ${canvasId}`);
  }

  fs.writeFileSync(
    path.join(EFFECTS_DIR, 'effects.json'),
    JSON.stringify(registry, null, 2) + '\n',
    'utf8'
  );

  const heroCanvasCssPath = path.join(EFFECTS_DIR, 'hero-canvas.css');
  const heroCanvasRule = `/* ─── Bespoke hero canvas positioning ─── */
.hero-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
}
`;
  fs.writeFileSync(heroCanvasCssPath, heroCanvasRule, 'utf8');

  console.log(`\nExtracted ${extractedCount} bespoke effects to ${EFFECTS_DIR}`);
}

main();
