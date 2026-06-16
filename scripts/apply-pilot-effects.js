#!/usr/bin/env node
/**
 * Apply bespoke canvas effect names and palettes to the pilot flagships.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const PILOT = {
  anat: { effect: 'canaaniteWar', primary: '#8B0000', secondary: '#D4AF37' },
  baal: { effect: 'stormOnZaphon', primary: '#D4AF37', secondary: '#1E3A5F' },
  dionysos: { effect: 'vineRevel', primary: '#228B22', secondary: '#800020' },
  ishtar: { effect: 'descentGate', primary: '#DC143C', secondary: '#D4AF37' },
  varuna: { effect: 'cosmicWaters', primary: '#191970', secondary: '#00BFFF' },
};

function updateFile(filePath, cfg) {
  if (!fs.existsSync(filePath)) return false;
  let html = fs.readFileSync(filePath, 'utf8');
  const newHtml = html.replace(
    /<canvas\s+id="([^"]+)"\s+data-effect="[^"]*"\s+data-primary="[^"]*"\s+data-secondary="[^"]*"\s*><\/canvas>/i,
    `<canvas id="$1" data-effect="${cfg.effect}" data-primary="${cfg.primary}" data-secondary="${cfg.secondary}"></canvas>`
  );
  if (newHtml === html) return false;
  fs.writeFileSync(filePath, newHtml);
  return true;
}

for (const [id, cfg] of Object.entries(PILOT)) {
  const base = path.join(ROOT, 'sites', id);
  const files = ['index.html', 'lore/index.html', 'lore/extended/index.html', 'gallery/index.html'];
  for (const rel of files) {
    if (updateFile(path.join(base, rel), cfg)) {
      console.log(`updated ${id}/${rel} -> ${cfg.effect}`);
    }
  }
}
