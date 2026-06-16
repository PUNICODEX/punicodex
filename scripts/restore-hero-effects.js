#!/usr/bin/env node
/**
 * Restore bespoke hero canvas effects that were overwritten by the generic
 * flagship template during the original-script accuracy overhaul.
 *
 * Strategy:
 *   - For every site, read the script.js from the commit just before the
 *     overhaul (0d0bbdd4^). If it contains a canvas-driven interactive layer
 *     before the booking-system marker, extract that prefix.
 *   - Insert the prefix at the top of the current script.js.
 *   - Update every flagship HTML page to use the custom canvas id instead of
 *     the generic data-effect canvas.
 *   - Add a `.hero-canvas` CSS rule so the restored canvases are positioned
 *     correctly even without a `data-effect` attribute.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const BASE_COMMIT = '37b89279ec98198702a29433ea06ad5fac76e09b';

const BOOKING_MARKER = '// ========== BOOKING SYSTEM ==========';
const CANVAS_ID_RE = /document\.getElementById\(['"]([^'"]*canvas)['"]\)/i;
const GENERIC_CANVAS_RE = /<canvas\s+id="[^"]*"\s+data-effect="[^"]*"(\s+data-primary="[^"]*")?(\s+data-secondary="[^"]*")?\s*><\/canvas>/gi;

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

function extractCanvasPrefix(oldScript) {
  // Most bespoke hero effects live in a leading IIFE. Extract the first IIFE
  // block only if it references a canvas element.
  const iifeMatch = oldScript.match(/^[\s\S]*?\}\)\(\);/);
  if (iifeMatch && CANVAS_ID_RE.test(iifeMatch[0])) {
    CANVAS_ID_RE.lastIndex = 0;
    return iifeMatch[0].trimEnd();
  }
  CANVAS_ID_RE.lastIndex = 0;

  // Some canvases are not wrapped in an IIFE. Take everything up to the first
  // section divider (e.g. "// ========== UI INTERACTIONS ==========").
  const dividerMatch = oldScript.match(/^[\s\S]*?(?=\n\/\/ ========== )/);
  if (dividerMatch && CANVAS_ID_RE.test(dividerMatch[0])) {
    CANVAS_ID_RE.lastIndex = 0;
    return dividerMatch[0].trimEnd();
  }
  CANVAS_ID_RE.lastIndex = 0;

  // Fallback: take everything before the generic booking-system marker.
  const idx = oldScript.indexOf(BOOKING_MARKER);
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

function updateHtml(filePath, canvasId) {
  if (!fs.existsSync(filePath)) return false;
  const html = fs.readFileSync(filePath, 'utf8');
  const hasGeneric = GENERIC_CANVAS_RE.test(html);
  GENERIC_CANVAS_RE.lastIndex = 0;
  if (!hasGeneric) return false;

  const updated = html.replace(
    GENERIC_CANVAS_RE,
    (match, primaryAttr, secondaryAttr) => {
      const p = primaryAttr || '';
      const s = secondaryAttr || '';
      return `<canvas id="${canvasId}" class="hero-canvas"${p}${s}></canvas>`;
    }
  );
  if (updated === html) return false;
  fs.writeFileSync(filePath, updated);
  return true;
}

function addHeroCanvasRule(cssPath) {
  if (!fs.existsSync(cssPath)) return false;
  const css = fs.readFileSync(cssPath, 'utf8');
  if (css.includes('.hero-canvas {')) return false;
  const rule = `
/* ─── Restored bespoke hero canvas ─── */
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
  fs.writeFileSync(cssPath, css + rule);
  return true;
}

function main() {
  const sites = fs
    .readdirSync(SITES_DIR)
    .filter((id) => fs.statSync(path.join(SITES_DIR, id)).isDirectory());

  let restoredCount = 0;

  for (const site of sites) {
    const oldScript = readOldFile(site, 'script.js');
    if (!oldScript) continue;

    const prefix = extractCanvasPrefix(oldScript);
    if (!prefix) continue;

    const canvasId = findCanvasId(prefix);
    if (!canvasId) continue;

    const scriptPath = path.join(SITES_DIR, site, 'script.js');
    const currentScript = fs.readFileSync(scriptPath, 'utf8');

    // Avoid double-restoration.
    if (currentScript.includes(canvasId) || currentScript.includes(prefix.slice(0, 120))) {
      console.log(`skip ${site} (already restored)`);
      continue;
    }

    const markerIdx = currentScript.indexOf(BOOKING_MARKER);
    if (markerIdx === -1) {
      console.log(`skip ${site} (no booking marker in current script)`);
      continue;
    }

    const newScript = prefix + '\n\n' + currentScript.slice(markerIdx);
    fs.writeFileSync(scriptPath, newScript);
    console.log(`restored ${site} -> #${canvasId}`);

    const htmlFiles = [
      'index.html',
      'lore/index.html',
      'lore/extended/index.html',
      'gallery/index.html',
    ];
    for (const rel of htmlFiles) {
      if (updateHtml(path.join(SITES_DIR, site, rel), canvasId)) {
        console.log(`  updated ${rel}`);
      }
    }

    if (addHeroCanvasRule(path.join(SITES_DIR, site, 'styles.css'))) {
      console.log(`  added .hero-canvas rule`);
    }

    restoredCount++;
  }

  console.log(`\nRestored bespoke hero effects for ${restoredCount} flagships.`);
}

main();
