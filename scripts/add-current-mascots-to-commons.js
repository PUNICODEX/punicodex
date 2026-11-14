#!/usr/bin/env node
/**
 * PuniCodex — preserve every flagship's CURRENT mascot in the Commons.
 *
 * The anime mascots (the originals) were preserved during the consistency
 * replacement; this does the same for the current realistic mascots so the
 * Commons holds the full mascot lineage for every temple. WebP copies keep
 * the repo footprint sane (full PNGs are ~3 MB each).
 *
 * Idempotent: re-runs replace same-id entries and skip existing files.
 *
 * Usage: node scripts/add-current-mascots-to-commons.js [--dry-run]
 */
const fs = require('node:fs');
const path = require('node:path');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const COMMONS_DIR = path.join(ROOT, 'assets', 'ai-commons');
const MANIFEST_PATH = path.join(COMMONS_DIR, 'manifest.json');
const DRY_RUN = process.argv.includes('--dry-run');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
let added = 0;
let skipped = 0;

for (const archetype of ARCHETYPES) {
  const id = archetype.id;
  const entry = LEXICON.find((e) => e.id === id);
  const unicode = entry ? entry.unicode : archetype.name || id;
  const srcName = `${id}-mascot-current.webp`;
  const src = path.join(COMMONS_DIR, srcName);
  const mascotWebp = path.join(ROOT, 'sites', id, 'assets', `${id}_mascot.webp`);
  if (!fs.existsSync(mascotWebp)) {
    console.warn(`missing mascot for ${id} — skipped`);
    skipped++;
    continue;
  }
  const itemId = `commons-${id}-mascot-current`;
  const canonicalUrl = `https://punicodex.com/${id}/art/?view=commons&art=${encodeURIComponent(itemId)}`;
  const title = `${unicode} — current mascot`;
  const work = {
    id: itemId,
    templeId: id,
    title,
    src: `/assets/ai-commons/${srcName}`,
    kind: 'mascot',
    family: 'current',
    tags: ['commons', 'mascot', 'current'],
    creator: 'PuniCodex Studio',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: `“${title}” by PuniCodex Studio, CC BY 4.0, via ${canonicalUrl}`,
    canonicalUrl,
    generatedAt: null,
    recordedAt: new Date().toISOString(),
    aiAssisted: true,
    model: 'Not recorded',
    seed: null,
    prompt: null,
    provenance:
      'Current flagship mascot preserved in Commons alongside the original anime mascot — the full lineage stays available.',
  };
  const existing = manifest.items.findIndex((i) => i.id === itemId);
  if (existing !== -1) manifest.items[existing] = work;
  else manifest.items.push(work);
  if (!fs.existsSync(src)) {
    if (!DRY_RUN) fs.copyFileSync(mascotWebp, src);
    added++;
  }
}

manifest.items.sort((a, b) => a.id.localeCompare(b.id));
if (!DRY_RUN) {
  writeFileWithRetry(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`${DRY_RUN ? '[dry-run] ' : ''}current mascots: ${added} copied, ${skipped} skipped; manifest ${manifest.items.length} items`);
