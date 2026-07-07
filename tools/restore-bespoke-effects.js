#!/usr/bin/env node
/**
 * Reconnect bespoke hero canvas effects.
 *
 * create-flagship.js's regex only matches the raw template canvas tag and
 * cannot replace tags that gained extra attributes (e.g. aria-hidden) after
 * regeneration. This script finds every generic <canvas data-effect> in the
 * four flagship pages for each site listed in effects.json and swaps it for
 * the bespoke canvas id. It also prepends the effect JS to script.js if missing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EFFECTS_JSON = path.join(ROOT, 'templates', 'flagship', 'effects', 'effects.json');
const EFFECTS_DIR = path.join(ROOT, 'templates', 'flagship', 'effects');

const effects = JSON.parse(fs.readFileSync(EFFECTS_JSON, 'utf8'));

const PAGES = ['index.html', 'lore/index.html', 'gallery/index.html', 'lore/extended/index.html'];

function getBespokeJs(id) {
  const file = path.join(EFFECTS_DIR, `${id}.js`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function replaceCanvas(html, canvasId) {
  // Match a self-closing canvas tag that has data-effect (the generic one).
  // Capture id, data-effect, data-primary, data-secondary and any extra attrs.
  return html.replace(
    /<canvas\b([^>]*?)\bid="([^"]*-canvas)"([^>]*?)\bdata-effect="([^"]*)"([^>]*?)\bdata-primary="([^"]*)"([^>]*?)\bdata-secondary="([^"]*)"([^>]*?)><\/canvas>/g,
    (match, beforeId, oldId, betweenEffect, effect, betweenPrimary, primary, betweenSecondary, secondary, after) => {
      return `<canvas id="${canvasId}" class="hero-canvas" data-primary="${primary}" data-secondary="${secondary}"></canvas>`;
    }
  );
}

function extractPrimarySecondary(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const m = html.match(/data-primary="([^"]*)"[^>]*data-secondary="([^"]*)"/);
  return m ? { primary: m[1], secondary: m[2] } : null;
}

for (const id of Object.keys(effects)) {
  const { canvasId } = effects[id];
  const siteDir = path.join(ROOT, 'sites', id);
  if (!fs.existsSync(siteDir)) {
    console.warn(`Site directory missing: ${id}`);
    continue;
  }

  const bespokeJs = getBespokeJs(id);
  if (!bespokeJs) {
    console.warn(`Bespoke JS missing: ${id}`);
    continue;
  }

  let changedFiles = 0;
  for (const page of PAGES) {
    const filePath = path.join(siteDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    const newHtml = replaceCanvas(html, canvasId);
    if (newHtml !== html) {
      fs.writeFileSync(filePath, newHtml);
      changedFiles++;
    }
  }

  // Ensure script.js contains the bespoke effect JS.
  const scriptPath = path.join(siteDir, 'script.js');
  if (fs.existsSync(scriptPath)) {
    let script = fs.readFileSync(scriptPath, 'utf8');
    const marker = bespokeJs.trim().slice(0, 80);
    if (!script.includes(marker)) {
      script = `${bespokeJs.trimEnd()}\n\n${script}`;
      fs.writeFileSync(scriptPath, script);
      changedFiles++;
    }
  }

  if (changedFiles > 0) {
    console.log(`${id}: restored ${canvasId} (${changedFiles} file(s) touched)`);
  }
}

console.log('Done');
