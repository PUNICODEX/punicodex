#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { LEXICON } = require('../type/js/lexicon.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const COMMONS_DIR = path.join(ROOT, 'assets', 'ai-commons');
const PINTEREST_DIR = path.join(COMMONS_DIR, 'pinterest');
const MANIFEST_PATH = path.join(COMMONS_DIR, 'manifest.json');
const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');

function removeConnectedWhiteBackground(data, width, height, threshold = 235) {
  const pixels = new Uint8Array(data);
  const alpha = new Uint8Array(width * height).fill(255);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const isWhite = (index) => {
    const offset = index * 3;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    return red >= threshold && green >= threshold && blue >= threshold;
  };
  const enqueue = (index) => {
    if (visited[index] || !isWhite(index)) return;
    visited[index] = 1;
    alpha[index] = 0;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  return { data: pixels, alpha, width, height };
}

function whitenTattooCornerMarks(data, width, height, marginX = 0.22, marginY = 0.12, threshold = 252) {
  const pixels = new Uint8Array(data);
  const startY = Math.max(0, Math.floor(height * (1 - marginY)));
  const leftEnd = Math.max(0, Math.floor(width * marginX));
  const rightStart = Math.min(width, Math.ceil(width * (1 - marginX)));
  let changed = 0;
  const whiten = (x, y) => {
    const offset = (y * width + x) * 3;
    if (Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]) >= threshold) return;
    pixels[offset] = 255;
    pixels[offset + 1] = 255;
    pixels[offset + 2] = 255;
    changed++;
  };
  for (let y = startY; y < height; y++) {
    for (let x = 0; x < leftEnd; x++) whiten(x, y);
    for (let x = rightStart; x < width; x++) whiten(x, y);
  }
  return { data: pixels, changed };
}

async function transparentPng(input, output) {
  const image = sharp(input);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const cleaned = whitenTattooCornerMarks(data, info.width, info.height);
  const keyed = removeConnectedWhiteBackground(cleaned.data, info.width, info.height);
  await sharp(keyed.data, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .joinChannel(keyed.alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toFile(output);
}

async function pinterestCard(input, output, title, subtitle) {
  const artwork = await sharp(input)
    .resize(820, 820, { fit: 'contain', background: '#f4efe4' })
    .png()
    .toBuffer();
  const escape = (value) =>
    String(value).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
  const svg = `<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="1500" fill="#f4efe4"/>
    <rect x="48" y="48" width="904" height="1404" rx="24" fill="none" stroke="#b18b3c" stroke-width="2"/>
    <text x="500" y="155" text-anchor="middle" font-family="serif" font-size="58" fill="#19150f">${escape(title)}</text>
    <text x="500" y="215" text-anchor="middle" font-family="sans-serif" font-size="24" letter-spacing="5" fill="#6f5b32">BLACKWORK · THE COMMONS</text>
    <text x="500" y="1390" text-anchor="middle" font-family="serif" font-size="30" fill="#3d3324">${escape(subtitle)}</text>
    <text x="500" y="1435" text-anchor="middle" font-family="sans-serif" font-size="20" letter-spacing="3" fill="#6f5b32">PUNICODEX</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: artwork, top: 310, left: 90 }])
    .jpeg({ quality: 92 })
    .toFile(output);
}

async function promote(file) {
  const absolute = path.resolve(ROOT, file);
  if (!fs.existsSync(absolute)) throw new Error(`keeper image not found: ${file}`);
  const base = path.basename(absolute);
  const match = base.match(/^(.+)-tattoo-v(\d+)\.(\d+)\.(?:jpe?g|png)$/i);
  if (!match) throw new Error('only curated <deity>-tattoo-v<version>.<variant> keeper works are supported');
  const [, deity, promptVersion, variant] = match;
  const entry = LEXICON.find((candidate) => candidate.id === deity);
  if (!entry) throw new Error(`unknown temple: ${deity}`);
  const logs = fs.existsSync(LOG_PATH)
    ? fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const generation = logs.findLast((item) => item.file?.endsWith(base));
  if (!generation || generation.verdict !== 'keep') {
    throw new Error(`${base}: generation must be marked keep before Commons promotion`);
  }

  fs.mkdirSync(COMMONS_DIR, { recursive: true });
  fs.mkdirSync(PINTEREST_DIR, { recursive: true });
  const outputBase = `${deity}-tattoo-v${promptVersion}.${variant}.png`;
  const output = path.join(COMMONS_DIR, outputBase);
  await transparentPng(absolute, output);
  const pinterestBase = `${deity}-tattoo-v${promptVersion}.${variant}-pinterest.jpg`;
  await pinterestCard(
    output,
    path.join(PINTEREST_DIR, pinterestBase),
    entry.unicode,
    `${entry.pantheon} · tattoo study ${promptVersion}.${variant}`
  );

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const id = `commons-${deity}-tattoo-v${promptVersion}-${variant}`;
  const canonicalUrl = `https://punicodex.com/${deity}/art/?view=commons&art=${encodeURIComponent(id)}`;
  const title = `${entry.unicode} — blackwork tattoo study ${promptVersion}.${variant}`;
  const work = {
    id,
    kind: 'commons',
    templeId: deity,
    src: `/assets/ai-commons/${outputBase}`,
    pinterestSrc: `/assets/ai-commons/pinterest/${pinterestBase}`,
    title,
    family: 'tattoo',
    tags: ['commons', 'tattoo', 'blackwork', entry.pantheon],
    creator: 'PuniCodex Studio',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: `${title} by PuniCodex Studio, CC BY 4.0, via ${canonicalUrl}`,
    canonicalUrl,
    provenance: 'AI-assisted blackwork illustration, human-curated and background-keyed for the Commons.',
    aiAssisted: true,
    model: generation.model || 'Not recorded',
    seed: generation.seed ?? null,
    prompt: generation.prompt || '',
    generatedAt: generation.ts || null,
    recordedAt: new Date().toISOString(),
  };
  manifest.items = (manifest.items || []).filter((item) => {
    if (item.id === id) return false;
    // Supersede legacy white-background tattoo JPEGs for the same temple once
    // a cleaned transparent PNG has been curated. Keep other PNG studies.
    const legacyTattoo = item.templeId === deity && item.family === 'tattoo' && item.src?.endsWith('.jpg');
    return !legacyTattoo;
  });
  manifest.items.push(work);
  manifest.items.sort((a, b) => a.id.localeCompare(b.id));
  writeFileWithRetry(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Promoted ${id} with transparent Commons and Pinterest derivatives.`);
}

async function promoteOil(file) {
  const absolute = path.resolve(ROOT, file);
  if (!fs.existsSync(absolute)) throw new Error(`keeper image not found: ${file}`);
  const base = path.basename(absolute);
  const match = base.match(/^(.+)-oil-v(\d+)\.(\d+)\.(?:jpe?g|png)$/i);
  if (!match) throw new Error('only curated <deity>-oil-v<version>.<variant> keeper works are supported');
  const [, deity, promptVersion, variant] = match;
  const entry = LEXICON.find((candidate) => candidate.id === deity);
  if (!entry) throw new Error(`unknown temple: ${deity}`);
  const logs = fs.existsSync(LOG_PATH)
    ? fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const generation = logs.findLast((item) => item.file?.endsWith(base));
  if (!generation || generation.verdict !== 'keep') {
    throw new Error(`${base}: generation must be marked keep before Commons promotion`);
  }

  fs.mkdirSync(COMMONS_DIR, { recursive: true });
  const outputBase = `${deity}-oil-v${promptVersion}.${variant}.jpg`;
  const output = path.join(COMMONS_DIR, outputBase);
  fs.copyFileSync(absolute, output);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const id = `commons-${deity}-oil-v${promptVersion}-${variant}`;
  const canonicalUrl = `https://punicodex.com/${deity}/art/?view=commons&art=${encodeURIComponent(id)}`;
  const title = `${entry.unicode} — classical oil study ${promptVersion}.${variant}`;
  const work = {
    id,
    kind: 'study',
    templeId: deity,
    src: `/assets/ai-commons/${outputBase}`,
    title,
    family: 'oil',
    tags: ['commons', 'oil', entry.pantheon],
    creator: 'PuniCodex Studio',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: `${title} by PuniCodex Studio, CC BY 4.0, via ${canonicalUrl}`,
    canonicalUrl,
    provenance: 'AI-assisted classical oil study, human-curated for the Commons.',
    aiAssisted: true,
    model: generation.model || 'Not recorded',
    seed: generation.seed ?? null,
    prompt: generation.prompt || '',
    generatedAt: generation.ts || null,
    recordedAt: new Date().toISOString(),
  };
  manifest.items = (manifest.items || []).filter((item) => item.id !== id);
  manifest.items.push(work);
  manifest.items.sort((a, b) => a.id.localeCompare(b.id));
  writeFileWithRetry(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Promoted ${id} to the Commons.`);
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: node scripts/promote-ai-art-commons.js <keeper-image> [more-images…]');
    process.exit(1);
  }
  (async () => {
    for (const file of files) await promote(file);
  })().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  removeConnectedWhiteBackground,
  transparentPng,
  pinterestCard,
  promote,
  promoteOil,
  whitenTattooCornerMarks,
};
