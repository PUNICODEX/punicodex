#!/usr/bin/env node
/**
 * Update all flagship canvas tags to match scripts/flagship-data.json effectMap.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { effectMap } = require(path.join(ROOT, 'scripts', 'flagship-data.json'));

const PALETTES = {
  typhon: { primary: '#8B0000', secondary: '#FF4500' },
  kali: { primary: '#FF4500', secondary: '#E0E0E0' },
  vishnu: { primary: '#191970', secondary: '#00BFFF' },
  horus: { primary: '#D4AF37', secondary: '#4169E1' },
  ganesha: { primary: '#FF9933', secondary: '#DC143C' },
  chaos: { primary: '#4B0082', secondary: '#C0C0C0' },
  tartaros: { primary: '#8B4513', secondary: '#FF4500' },
  enlil: { primary: '#C0C0C0', secondary: '#4682B4' },
  asherah: { primary: '#228B22', secondary: '#1E90FF' },
  apsu: { primary: '#00CED1', secondary: '#20B2AA' },
};

function updateFile(filePath, effect, palette) {
  if (!fs.existsSync(filePath)) return false;
  let html = fs.readFileSync(filePath, 'utf8');
  const newHtml = html.replace(
    /<canvas\s+id="([^"]+)"\s+data-effect="[^"]*"\s+data-primary="[^"]*"\s+data-secondary="[^"]*"\s*><\/canvas>/i,
    `<canvas id="$1" data-effect="${effect}" data-primary="${palette.primary}" data-secondary="${palette.secondary}"></canvas>`
  );
  if (newHtml === html) return false;
  fs.writeFileSync(filePath, newHtml);
  return true;
}

for (const [id, effect] of Object.entries(effectMap)) {
  const palette = PALETTES[effect] || { primary: '#D4AF37', secondary: '#4169E1' };
  const base = path.join(ROOT, 'sites', id);
  const files = ['index.html', 'lore/index.html', 'lore/extended/index.html', 'gallery/index.html'];
  for (const rel of files) {
    if (updateFile(path.join(base, rel), effect, palette)) {
      console.log(`updated ${id}/${rel} -> ${effect}`);
    }
  }
}
