/**
 * Copy and convert extended-flagship materials into a flagship-ready assets folder.
 * Usage: node scripts/prepare-flagship-assets.js <id> <sourceFolderName>
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

const [id, sourceFolder] = process.argv.slice(2);
if (!id || !sourceFolder) {
  console.error('Usage: node scripts/prepare-flagship-assets.js <id> <sourceFolderName>');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const srcRoot = path.join(ROOT, 'extended flagship materials', 'punycodex', sourceFolder);
const outDir = path.join(ROOT, 'sites', id, 'assets');

if (!fs.existsSync(srcRoot)) {
  console.error(`Source folder not found: ${srcRoot}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

function run(args) {
  const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with code ${result.status}`);
  }
}

const files = fs.readdirSync(srcRoot);

// Copy static images (mascot, logomark, logolockup)
for (const base of ['_mascot', '_logomark', '_logolockup']) {
  const png = files.find((f) => f.toLowerCase() === `${id}${base}.png`);
  if (!png) {
    console.warn(`Missing PNG: ${id}${base}.png`);
    continue;
  }
  const srcPng = path.join(srcRoot, png);
  const outPng = path.join(outDir, `${id}${base}.png`);
  fs.copyFileSync(srcPng, outPng);
  console.log(`copied ${png}`);

  const outWebp = path.join(outDir, `${id}${base}.webp`);
  if (!fs.existsSync(outWebp)) {
    console.log(`converting ${png} -> webp`);
    run(['-y', '-i', outPng, outWebp]);
  }
}

// Convert hero video
const video = files.find((f) => f.toLowerCase() === `${id}_hero_video.mp4`);
if (video) {
  const input = path.join(srcRoot, video);
  const webm = path.join(outDir, `${id}_hero_video.webm`);
  const mp4 = path.join(outDir, `${id}_hero_video.mp4`);
  const poster = path.join(outDir, `${id}_hero_poster.jpg`);

  if (!fs.existsSync(webm)) {
    console.log(`converting ${video} -> webm`);
    run([
      '-y', '-i', input,
      '-c:v', 'libvpx-vp9',
      '-crf', '34', '-b:v', '0',
      '-vf', 'scale=720:-2',
      '-an', '-movflags', '+faststart',
      webm
    ]);
  }

  if (!fs.existsSync(mp4)) {
    console.log(`converting ${video} -> mp4`);
    run([
      '-y', '-i', input,
      '-c:v', 'libx264',
      '-crf', '26', '-preset', 'fast',
      '-vf', 'scale=720:-2',
      '-an', '-movflags', '+faststart',
      mp4
    ]);
  }

  if (!fs.existsSync(poster)) {
    console.log(`extracting poster from ${video}`);
    run([
      '-y', '-i', input,
      '-ss', '00:00:00.000',
      '-vframes', '1',
      '-q:v', '2',
      poster
    ]);
  }
} else {
  console.warn(`Missing hero video: ${id}_hero_video.mp4`);
}

console.log(`✓ ${id}: assets ready in ${outDir}`);
