#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.resolve(
  process.argv.includes('--source')
    ? process.argv[process.argv.indexOf('--source') + 1]
    : path.join(ROOT, 'punicodex mascott consistency replacements', 'punycodex')
);
const COMMONS = path.join(ROOT, 'assets', 'ai-commons');
const MANIFEST = path.join(COMMONS, 'manifest.json');
const FAMILIES = ['classic-gold', 'anime', 'tattoo', 'bw-engraving', 'realism', 'masterpiece', 'oil', 'geometric'];
const BUILT = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const NAMES = new Map(LEXICON.map((entry) => [entry.id, entry.unicode]));

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function copyIfDifferent(source, destination) {
  if (fs.existsSync(destination) && hash(source) === hash(destination)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

async function webpIfDifferent(source, destination) {
  if (fs.existsSync(destination) && fs.statSync(destination).mtimeMs >= fs.statSync(source).mtimeMs) {
    return false;
  }
  await sharp(source).webp({ quality: 90 }).toFile(destination);
  return true;
}

function logEntries() {
  const file = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');
  const entries = new Map();
  if (!fs.existsSync(file)) return entries;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const entry = JSON.parse(line);
    if (entry.file) entries.set(path.basename(entry.file), entry);
  }
  return entries;
}

function parseFile(file) {
  const match = file.match(/^(.+?)-v(\d+\.\d+)\.jpg$/) || file.match(/^([a-z]+)\.jpg$/);
  if (match) {
    let templeId = match[1];
    const family = FAMILIES.find((name) => templeId.endsWith(`-${name}`)) || 'classic-gold';
    if (family !== 'classic-gold') templeId = templeId.slice(0, -(family.length + 1));
    return { templeId, family, study: match[2] || 'studio', kind: 'study' };
  }
  const archived = file.match(/^([a-z0-9-]+)-anime-mascot-v1\.png$/);
  if (archived) {
    return { templeId: archived[1], family: 'anime', study: '1', kind: 'mascot' };
  }
  return null;
}

function buildManifest() {
  const logs = logEntries();
  const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { items: [] };
  const previousBySrc = new Map((previous.items || []).map((item) => [item.src, item]));
  const items = [];
  for (const file of fs.readdirSync(COMMONS).filter((name) => /\.(jpg|png)$/.test(name)).sort()) {
    const parsed = parseFile(file);
    if (!parsed || !NAMES.has(parsed.templeId)) continue;
    const src = `/assets/ai-commons/${file}`;
    const log = logs.get(file) || {};
    const old = previousBySrc.get(src) || {};
    const name = NAMES.get(parsed.templeId);
    const title = parsed.kind === 'mascot' ? `${name} — anime mascot` : `${name} — study v${parsed.study}`;
    const canonicalUrl = `https://punicodex.com/${parsed.templeId}/art/?view=commons`;
    items.push({
      id: `commons-${parsed.templeId}-${file.replace(/\.(jpg|png)$/, '')}`,
      templeId: parsed.templeId,
      title,
      src,
      kind: parsed.kind,
      family: parsed.family,
      tags: ['commons', parsed.family, ...(parsed.kind === 'mascot' ? ['mascot'] : [])],
      creator: 'PuniCodex Studio',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: `“${title}” by PuniCodex Studio, CC BY 4.0, via ${canonicalUrl}`,
      canonicalUrl,
      generatedAt: log.ts || old.generatedAt || null,
      recordedAt: old.recordedAt || new Date().toISOString(),
      aiAssisted: true,
      model: log.model || old.model || 'Not recorded',
      seed: log.seed ?? old.seed ?? null,
      prompt: log.prompt || old.prompt || null,
      provenance:
        parsed.kind === 'mascot'
          ? 'Original flagship mascot preserved in Commons after the consistency replacement.'
          : 'Curated PuniCodex studio work promoted into Commons.',
    });
  }
  return { version: 1, generatedAt: new Date().toISOString(), items };
}

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Replacement source not found: ${SOURCE}`);
  fs.mkdirSync(COMMONS, { recursive: true });
  const replacements = [];
  const skipped = [];
  for (const id of fs.readdirSync(SOURCE)) {
    const replacement = path.join(SOURCE, id, `${id}_mascot.png`);
    if (!fs.existsSync(replacement)) continue;
    const siteDir = path.join(ROOT, 'sites', id, 'assets');
    const current = path.join(siteDir, `${id}_mascot.png`);
    if (!BUILT.has(id) || !fs.existsSync(current)) {
      skipped.push(id);
      continue;
    }
    if (hash(replacement) === hash(current)) continue;
    const archived = path.join(COMMONS, `${id}-anime-mascot-v1.png`);
    const alternate = path.join(siteDir, `${id}_mascot_anime.png`);
    copyIfDifferent(current, archived);
    copyIfDifferent(current, alternate);
    await webpIfDifferent(alternate, path.join(siteDir, `${id}_mascot_anime.webp`));
    copyIfDifferent(replacement, current);
    await webpIfDifferent(current, path.join(siteDir, `${id}_mascot.webp`));
    replacements.push(id);
  }
  const manifest = buildManifest();
  writeFileWithRetry(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Mascot consistency: ${replacements.length} replaced; ${skipped.length} skipped (${skipped.join(', ') || 'none'}).`);
  console.log(`Commons manifest: ${manifest.items.length} works with licensing and provenance metadata.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
