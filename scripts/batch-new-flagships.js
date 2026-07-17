#!/usr/bin/env node
/**
 * PuniCodex — Batch promotion for the 2026-07-12 domain acquisition batch.
 *
 * This script:
 *   1. Copies mascot / logolockup / logomark PNGs from the materials folder.
 *   2. Converts every PNG to WebP with Pillow.
 *   3. Adds the new Šāpšu lexicon entry.
 *   4. Updates Yinyang and Thoth variant records.
 *   5. Switches Yinyang's archetype to the no-dash canonical domain.
 *   6. Appends the 30 new owned domains.
 *   7. Adds gallery entries sourced from Wikimedia Commons.
 *   8. Adds effect-map entries for the new flagships.
 *   9. Updates the About page investment stats.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { domainToUnicode } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MATERIALS = path.join(
  ROOT,
  'extended flagship materials',
  'newest domain batch 12-07-2026',
  'Kimi_Agent_Srevol Domain Value Analysis',
  'punicodex'
);

const ENTRIES = [
  { folder: 'Adamas', id: 'adamas', primary: 'adámas.com', search: 'diamond' },
  { folder: 'Amitabha', id: 'amitabha', primary: 'amitābha.com', search: 'Amitabha Buddha' },
  { folder: 'Amun', id: 'amun', primary: 'ꜣmun.com', search: 'Amun' },
  { folder: 'Andromede', id: 'andromeda', primary: 'andromedē.com', search: 'Andromeda mythology' },
  { folder: 'Apep', id: 'apep', primary: 'ꜥpp.com', search: 'Apep' },
  { folder: 'Arachne', id: 'arachne', primary: 'arachnē.com', search: 'Arachne' },
  { folder: 'Dagan', id: 'dagan', primary: 'dāgan.com', search: 'Dagan god' },
  { folder: 'Dazbog', id: 'dazhbog', primary: 'dažbog.com', search: 'Dažbog' },
  { folder: 'Djehuty', id: 'thoth', primary: 'ḏḥwty.com', search: 'Thoth' },
  { folder: 'Eggther', id: 'eggther', primary: 'eggþér.com', search: 'Eggthér' },
  { folder: 'Ge', id: 'ge', primary: 'gē.com', search: 'Gaia goddess' },
  { folder: 'Hydra', id: 'hydra', primary: 'hýdra.com', search: 'Lernaean Hydra' },
  { folder: 'Hygieia', id: 'hygieia', primary: 'hygíeia.com', search: 'Hygieia' },
  { folder: 'Hypnos', id: 'hypnos', primary: 'hýpnos.com', search: 'Hypnos' },
  { folder: 'Iris', id: 'iris', primary: 'íris.com', search: 'Iris goddess' },
  { folder: 'Jormungandr', id: 'jormungandr', primary: 'jǫrmungandr.com', search: 'Jormungandr' },
  { folder: 'Laozi', id: 'laozi', primary: 'lǎozǐ.com', search: 'Laozi' },
  { folder: 'Manannan', id: 'manannan', primary: 'manannán.com', search: 'Manannán' },
  { folder: 'Modi', id: 'modi', primary: 'móði.com', search: 'Móði Thor' },
  { folder: 'Papatuanuku', id: 'papatuanuku', primary: 'papatūānuku.com', search: 'Papatūānuku' },
  { folder: 'Phoenix', id: 'phoenix', primary: 'phoînix.com', search: 'Phoenix mythology' },
  { folder: 'Shapshu', id: 'shapash', primary: 'šāpšu.com', search: 'Shapshu' },
  { folder: 'Surya', id: 'surya', primary: 'sūrya.com', search: 'Surya' },
  { folder: 'Taishang', id: 'taishang', primary: 'tàishàng.com', search: 'Taishang Laojun' },
  { folder: 'Tane', id: 'tane', primary: 'tāne.com', search: 'Tāne' },
  { folder: 'Theia', id: 'theia', primary: 'theía.com', search: 'Theia Titaness' },
  { folder: 'Tiandi', id: 'tiandi', primary: 'tiāndì.com', search: 'Tian Di' },
  { folder: 'Yam', id: 'yam', primary: 'yām.com', search: 'Yam god Ugaritic' },
];

const EFFECT_MAP = {
  adamas: 'light',
  amitabha: 'light',
  amun: 'sun',
  andromeda: 'stars',
  apep: 'void',
  arachne: 'stars',
  dagan: 'tree',
  dazhbog: 'sun',
  thoth: 'light',
  eggther: 'stars',
  ge: 'mountain',
  hydra: 'water',
  hygieia: 'light',
  hypnos: 'void',
  iris: 'light',
  jormungandr: 'abyssal',
  laozi: 'light',
  manannan: 'water',
  modi: 'stars',
  papatuanuku: 'mountain',
  phoenix: 'flame',
  shapash: 'sun',
  surya: 'sun',
  taishang: 'light',
  tane: 'tree',
  theia: 'light',
  tiandi: 'mountain',
  yam: 'water',
};

function log(...args) {
  console.log('[batch]', ...args);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyAndConvertAssets() {
  log('Copying and converting brand assets...');
  for (const e of ENTRIES) {
    const srcDir = path.join(MATERIALS, e.folder);
    const destDir = path.join(ROOT, 'sites', e.id, 'assets');
    ensureDir(destDir);
    const base = e.folder.toLowerCase();
    for (const kind of ['mascot', 'logolockup', 'logomark']) {
      const src = path.join(srcDir, `${base}_${kind}.png`);
      const destPng = path.join(destDir, `${e.id}_${kind}.png`);
      const destWebp = path.join(destDir, `${e.id}_${kind}.webp`);
      if (!fs.existsSync(src)) {
        throw new Error(`Missing asset: ${src}`);
      }
      fs.copyFileSync(src, destPng);
      execSync(`python -c "from PIL import Image; img=Image.open(r'${destPng.replace(/'/g, "'\\''")}'); img.save(r'${destWebp.replace(/'/g, "'\\''")}','WEBP')"`, {
        stdio: 'inherit',
      });
      log(`  ${e.id}/${kind}: PNG + WebP ready`);
    }
  }
}

function addShapshuLexiconEntry() {
  log('Adding Šāpšu lexicon entry...');
  const lexPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  let src = fs.readFileSync(lexPath, 'utf8');
  if (src.includes('"id": "shapash"') || src.includes('"id": "shapshu"')) {
    log('  Šāpšu already present; skipping insert.');
    return;
  }

  const entry = {
    id: 'shapash',
    ascii: 'shapash',
    unicode: 'Šāpšu',
    greek: '—',
    originalScript: '𐎌𐎔𐎌',
    pantheon: 'canaanite',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Sun Goddess',
    meaning: 'Ugaritic solar deity, divine messenger and witness',
    sources: ['Ugaritic texts', 'KTU', 'Coogan', 'Smith', 'De Moor'],
    variants: [
      {
        unicode: 'Shapshu',
        type: 'ascii',
        note: 'Standard academic transliteration without diacritics',
      },
    ],
    etymology: {
      protoForm: '*šapš-',
      protoLanguage: 'proto-semitic',
      protoGloss: 'sun',
      derivation: 'From Common Semitic *šapš- "sun"; in Ugaritic cuneiform written 𐎌𐎔𐎌 (š-p-š).',
      certainty: 'attested',
      cognates: [
        { language: 'Hebrew', form: 'שֶׁמֶשׁ (šemeš)', relationship: 'cognate' },
        { language: 'Arabic', form: 'شَمْس (šams)', relationship: 'cognate' },
        { language: 'Akkadian', form: 'Šamaš', relationship: 'cognate' },
      ],
    },
    breakdown: [
      { char: 's', to: 'Š', type: 'special', note: 'Ugaritic/Canaanite shin (š) represented by Latin Š' },
      { char: 'h', to: '', type: 'drop', note: 'Part of the sh digraph that collapses to a single š sound' },
      { char: 'a', to: 'ā', type: 'length', note: 'Macron marks the long vowel of the first syllable' },
      { char: 'p', to: 'p', type: 'same', note: 'Same' },
      { char: 's', to: 'š', type: 'special', note: 'Ugaritic/Canaanite shin (š)' },
      { char: 'h', to: '', type: 'drop', note: 'Part of the sh digraph that collapses to a single š sound' },
      { char: 'u', to: 'ū', type: 'length', note: 'Macron marks the long vowel of the final syllable' },
    ],
    senses: [
      { type: 'primary', text: 'The Ugaritic sun goddess who sees and reveals all, invoked as divine witness.' },
      { type: 'encyclopedic', text: 'Šāpšu carries messages between gods and mortals and illuminates the underworld.' },
    ],
  };

  const json = JSON.stringify(entry, null, 2).replace(/^/gm, '  ');
  const insertion = `\n  },\n${json}`;
  const marker = /\n  \}\n\];/;
  if (!marker.test(src)) {
    throw new Error('Could not find lexicon array close marker');
  }
  src = src.replace(marker, insertion + '\n];');
  fs.writeFileSync(lexPath, src, 'utf8');
  log('  Šāpšu inserted into lexicon.js');
}

function updateYinyangVariants() {
  log('Updating Yīnyáng variant records...');
  const lexPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  let src = fs.readFileSync(lexPath, 'utf8');
  const oldBlock = `    "variants": [
      {
        "unicode": "Yīn-yáng",
        "type": "owned",
        "note": "Owned domain form with hyphen"
      }
    ]`;
  const newBlock = `    "variants": [
      {
        "unicode": "Yīnyáng",
        "type": "owned",
        "note": "Canonical owned form without hyphen"
      },
      {
        "unicode": "Yīn-yáng",
        "type": "owned",
        "note": "Hyphenated owned variant"
      }
    ]`;
  if (!src.includes(oldBlock)) {
    log('  Yīnyáng block not found as expected; skipping variant update.');
    return;
  }
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(lexPath, src, 'utf8');
  log('  Yīnyáng variants updated');
}

function updateThothVariants() {
  log('Updating Ḏḥwty variant records...');
  const lexPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  let src = fs.readFileSync(lexPath, 'utf8');
  const oldBlock = `    "variants": [
      {
        "unicode": "Thóth",
        "type": "alt-stress",
        "note": "Acute on omicron: alternate stress position",
        "sources": [
          "Faulkner"
        ]
      }
    ]`;
  const newBlock = `    "variants": [
      {
        "unicode": "Thóth",
        "type": "alt-stress",
        "note": "Acute on omicron: alternate stress position",
        "sources": [
          "Faulkner"
        ]
      },
      {
        "unicode": "Ḏḥwtj",
        "type": "alt",
        "note": "Alternative Egyptological spelling with final j",
        "sources": [
          "Faulkner",
          "Wb"
        ]
      }
    ]`;
  if (!src.includes(oldBlock)) {
    log('  Ḏḥwty block not found as expected; skipping variant update.');
    return;
  }
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(lexPath, src, 'utf8');
  log('  Ḏḥwty variants updated');
}

function updateYinyangArchetype() {
  log('Switching Yinyang archetype to no-dash canonical domain...');
  const arcPath = path.join(ROOT, 'js', 'archetypes-v2.js');
  let src = fs.readFileSync(arcPath, 'utf8');

  const blockRe = /\{\s*\r?\n\s*id:\s*"yinyang"[\s\S]*?\n\s*\},?/;
  const match = src.match(blockRe);
  if (!match) throw new Error('Yinyang archetype block not found');
  let block = match[0];

  block = block.replace(/domainUnicode:\s*"[^"]+"/, 'domainUnicode: "yīnyáng.com"');
  block = block.replace(/domainPunycode:\s*"[^"]+"/, 'domainPunycode: "xn--ynyng-zqa92c.com"');
  if (!/domainAlt:/.test(block)) {
    block = block.replace(
      /(domainPunycode:\s*"[^"]+",?\s*\r?\n)/,
      `$1        domainAlt: ["yīn-yáng.com"],\n`
    );
  } else {
    block = block.replace(/domainAlt:\s*\[[^\]]*\]/, 'domainAlt: ["yīn-yáng.com"]');
  }
  block = block.replace(/mascotPath:\s*"[^"]+"/, 'mascotPath: "/sites/yinyang/assets/yinyang_mascot.webp"');
  block = block.replace(/mascotFallback:\s*"[^"]+"/, 'mascotFallback: "/sites/yinyang/assets/yinyang_mascot.webp"');
  block = block.replace(/logomarkPath:\s*"[^"]+"/, 'logomarkPath: "/sites/yinyang/assets/yinyang_logomark.webp"');

  src = src.slice(0, match.index) + block + src.slice(match.index + match[0].length);
  fs.writeFileSync(arcPath, src, 'utf8');
  log('  Yinyang archetype updated');
}

function addOwnedDomains() {
  log('Appending new owned domains...');
  const ownedPath = path.join(ROOT, 'platform', 'db', 'owned-domains.json');
  const owned = require(ownedPath);
  const normalized = new Set(owned.map((d) => d.toLowerCase().normalize('NFC')));

  const newDomains = [
    'adámas.com',
    'amitābha.com',
    'ꜣmun.com',
    'andromedē.com',
    'ꜥpp.com',
    'arachnē.com',
    'dāgan.com',
    'dažbog.com',
    'ḏḥwty.com',
    'eggþér.com',
    'gē.com',
    'hýdra.com',
    'hygíeia.com',
    'hýpnos.com',
    'íris.com',
    'jǫrmungandr.com',
    'lǎozǐ.com',
    'manannán.com',
    'móði.com',
    'papatūānuku.com',
    'phoînix.com',
    'šāpšu.com',
    'sūrya.com',
    'tàishàng.com',
    'tāne.com',
    'theía.com',
    'tiāndì.com',
    'yām.com',
    'yīnyáng.com',
    'ḏḥwtj.com',
  ];

  for (const d of newDomains) {
    const norm = d.toLowerCase().normalize('NFC');
    if (!normalized.has(norm)) {
      owned.push(d);
      normalized.add(norm);
      log(`  added ${d}`);
    } else {
      log(`  skipped duplicate ${d}`);
    }
  }

  fs.writeFileSync(ownedPath, JSON.stringify(owned, null, 2) + '\n', 'utf8');
  log(`  owned-domains.json now has ${owned.length} entries`);
}

function addEffectMapEntries() {
  log('Adding flagship effect-map entries...');
  const dataPath = path.join(ROOT, 'scripts', 'flagship-data.json');
  const data = require(dataPath);
  data.effectMap = data.effectMap || {};
  for (const [id, effect] of Object.entries(EFFECT_MAP)) {
    data.effectMap[id] = effect;
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log('  effectMap updated');
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // Rate-limit or other non-JSON response.
        if (i < retries - 1) {
          const delay = 2000 * (i + 1);
          log(`    rate-limited, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error('Non-JSON response after retries');
      }
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('fetchJson failed');
}

async function fetchCommonsImages(query, limit = 6) {
  const searchUrl =
    'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&format=json&origin=*&srlimit=20&srsearch=' +
    encodeURIComponent(query);
  const searchJson = await fetchJson(searchUrl);
  const titles = (searchJson.query?.search || []).map((s) => s.title);
  if (!titles.length) return [];

  const infoUrl =
    'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=960&format=json&origin=*&titles=' +
    titles.map(encodeURIComponent).join('|');
  const infoJson = await fetchJson(infoUrl);
  const pages = Object.values(infoJson.query?.pages || {});

  const images = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || !info.thumburl) continue;
    const meta = info.extmetadata || {};
    const width = info.width || 0;
    if (width < 300) continue;

    const objectName = stripHtml(meta.ObjectName?.value || page.title?.replace(/^File:/, '').replace(/_/g, ' '));
    const desc = stripHtml(meta.ImageDescription?.value || '');
    const license = stripHtml(meta.LicenseShortName?.value || '');
    const artist = stripHtml(meta.Artist?.value || '');

    let caption = `<strong>${objectName}</strong>`;
    if (desc) caption += ` — ${desc}`;
    if (artist || license) {
      const metaParts = [artist, license].filter(Boolean).join(', ');
      caption += ` <em>(${metaParts})</em>`;
    }

    let src = info.thumburl;
    if (src.endsWith('.jpg')) src += '.webp';

    images.push({
      src,
      alt: objectName,
      caption,
    });
    if (images.length >= limit) break;
  }
  return images;
}

async function addGalleryEntries() {
  log('Fetching Wikimedia Commons gallery images...');
  const galleryPath = path.join(ROOT, 'scripts', 'gallery-data.json');
  delete require.cache[require.resolve(galleryPath)];
  const gallery = require(galleryPath);

  for (const e of ENTRIES) {
    if (gallery[e.id]) {
      log(`  ${e.id}: gallery already exists`);
      continue;
    }
    try {
      const images = await fetchCommonsImages(e.search, 6);
      if (images.length) {
        gallery[e.id] = { images };
        log(`  ${e.id}: ${images.length} image(s) from Wikimedia Commons`);
      } else {
        log(`  ${e.id}: no Commons results, will fall back to brand assets`);
      }
    } catch (err) {
      log(`  ${e.id}: error fetching gallery — ${err.message}`);
    }
    await sleep(2500);
  }

  fs.writeFileSync(galleryPath, JSON.stringify(gallery, null, 2) + '\n', 'utf8');
  log('  gallery-data.json updated');
}

function updateAboutPage() {
  log('Updating About page stats...');
  const aboutPath = path.join(ROOT, 'about', 'index.html');
  let html = fs.readFileSync(aboutPath, 'utf8');
  html = html.replace(/\$3,105/g, '$3,705');
  html = html.replace(/\$3,100\+/g, '$3,700+');
  html = html.replace(/>(\s*)\d+(\s*)<\/span><span class="stat-desc">Domains Registered<\/span>/, '>$1163$2</span><span class="stat-desc">Domains Registered</span>');
  html = html.replace(/>(\s*)\d+(\s*)<\/span><span class="stat-desc">World Archetypes<\/span>/, '>$1152$2</span><span class="stat-desc">World Archetypes</span>');
  html = html.replace(/>(\s*)\d+(\s*)<\/span><span class="stat-desc">Temples Built<\/span>/, '>$1890$2</span><span class="stat-desc">Temples Built</span>');
  html = html.replace(/\d+ temples built/g, '890 temples built');
  fs.writeFileSync(aboutPath, html, 'utf8');
  log('  About page updated');
}

async function main() {
  copyAndConvertAssets();
  addShapshuLexiconEntry();
  updateYinyangVariants();
  updateThothVariants();
  updateYinyangArchetype();
  addOwnedDomains();
  addEffectMapEntries();
  await addGalleryEntries();
  updateAboutPage();
  log('\nBatch preparation complete. Run: npm run generate');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
