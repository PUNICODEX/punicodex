#!/usr/bin/env node
/**
 * Extract bespoke hero canvas effects from the pre-overhaul baseline commit
 * into templates/flagship/effects/ so create-flagship.js can apply them
 * automatically during regeneration.
 *
 * Strategy:
 *   - Read each site's script.js from the baseline commit.
 *   - Find the first "BOOKING SYSTEM" divider (some old files have a custom
 *     prefix like "HERMÊS BOOKING SYSTEM").
 *   - Take everything before that divider as the bespoke effect, unless it is
 *     wrapped in a leading IIFE (in which case the IIFE itself is the effect).
 *   - Strip diagnostic console statements.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'flagship');
const EFFECTS_DIR = path.join(TEMPLATE_DIR, 'effects');

const BASE_COMMIT = '37b89279ec98198702a29433ea06ad5fac76e09b';
const CANVAS_ID_RE = /document\.getElementById\(['"]([^'"]*canvas)['"]\)/i;
const BOOKING_DIVIDER_RE = /^\/\/ ========== .*BOOKING SYSTEM ==========$/m;

function readOldFile(site, file) {
  try {
    return execSync(
      `git show ${BASE_COMMIT}:sites/${site}/${file}`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
}

function extractEffect(oldScript) {
  // Some effects are a leading IIFE that references the canvas.
  const iifeMatch = oldScript.match(/^[\s\S]*?\}\)\(\);/);
  if (iifeMatch && CANVAS_ID_RE.test(iifeMatch[0])) {
    CANVAS_ID_RE.lastIndex = 0;
    return iifeMatch[0].trimEnd();
  }
  CANVAS_ID_RE.lastIndex = 0;

  // Otherwise the effect is the top-level code before the booking system.
  const m = oldScript.match(BOOKING_DIVIDER_RE);
  if (!m) return null;
  const idx = m.index;
  if (idx <= 0) return null;
  const prefix = oldScript.slice(0, idx).trimEnd();
  if (!prefix || !CANVAS_ID_RE.test(prefix)) return null;
  CANVAS_ID_RE.lastIndex = 0;
  return prefix;
}

function findCanvasId(prefix) {
  const m = prefix.match(CANVAS_ID_RE);
  return m ? m[1] : null;
}

function sanitize(js) {
  return js.replace(/^\s*console\.(log|error|warn)\([^)]*\);?\s*\n/gm, '');
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
    const oldScript = readOldFile(site, 'script.js');
    if (!oldScript) continue;

    const prefix = extractEffect(oldScript);
    if (!prefix) continue;

    const canvasId = findCanvasId(prefix);
    if (!canvasId) continue;

    const outPath = path.join(EFFECTS_DIR, `${site}.js`);
    fs.writeFileSync(outPath, sanitize(prefix) + '\n', 'utf8');
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
