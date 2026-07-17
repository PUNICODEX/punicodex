/**
 * Replace flagship mascot PNGs with their v3 counterparts from extended materials,
 * then regenerate the WebP fallbacks.
 * Usage: node scripts/replace-mascots-v3.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const srcRoot = path.join(ROOT, 'extended flagship materials', 'punicodex');
const sitesDir = path.join(ROOT, 'sites');

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with code ${result.status}`);
  }
}

const v3Files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (/^[^\\/]+_mascot_v3\.png$/i.test(entry)) {
      v3Files.push(fullPath);
    }
  }
}
walk(srcRoot);

for (const v3Path of v3Files) {
  const fileName = path.basename(v3Path);
  const id = fileName.replace(/_mascot_v3\.png$/i, '').toLowerCase();
  const assetsDir = path.join(sitesDir, id, 'assets');

  if (!fs.existsSync(assetsDir)) {
    console.warn(`Skipping ${id}: assets dir not found at ${assetsDir}`);
    continue;
  }

  const pngOut = path.join(assetsDir, `${id}_mascot.png`);
  const webpOut = path.join(assetsDir, `${id}_mascot.webp`);

  fs.copyFileSync(v3Path, pngOut);
  console.log(`replaced ${pngOut}`);

  if (fs.existsSync(webpOut)) {
    fs.unlinkSync(webpOut);
  }
  console.log(`converting ${id}_mascot.png -> webp`);
  run(['-y', '-i', pngOut, webpOut]);
}

console.log(`✓ Replaced ${v3Files.length} mascots with v3 versions`);
