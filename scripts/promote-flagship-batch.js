#!/usr/bin/env node
/**
 * PuniCodex — Batch flagship promotion for domain-less restorations.
 *
 * Hardened successor to the one-off batch-new-flagships.js (2026-07). Converts
 * N base temples into flagships in one auditable, idempotent pass:
 *
 *   1. Copies mascot / logolockup / logomark PNGs from the materials folder
 *      into sites/{id}/assets/ and bakes WebP companions (Pillow).
 *   2. Samples the temple palette (primary/secondary/glow) from the mascot PNG
 *      so archetype colors always match the shipped art.
 *   3. Appends archetype records to js/archetypes-v2.js with domainless:true
 *      and built:false ("awaiting") until content readiness passes.
 *   4. --activate flips built:true for every entry whose readiness checklist
 *      passes (lore-catalog, hero effect, gallery/_honestZero, industry seats)
 *      and fixes the archetype header counter.
 *
 * Everything downstream (temple pages, scholars content, blog posts, cards,
 * store products, galleries page, sitemap) is flywheel-generated from those
 * canonical records — never hand-edit generated output.
 *
 * Usage:
 *   node scripts/promote-flagship-batch.js                  # stage assets + archetypes (awaiting)
 *   node scripts/promote-flagship-batch.js --check          # readiness report per entry
 *   node scripts/promote-flagship-batch.js --activate <id…> # flip ready entries to built
 *   node scripts/promote-flagship-batch.js --activate-all   # flip every entry that passes --check
 *
 * Materials layout: <materials>/punycodex/{id}/{id}_{kind}.png for kind in
 * mascot|logomark|logolockup.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MATERIALS = path.join(
  ROOT,
  'extended flagship materials',
  'ascii-restoration-batch-2026-11',
  'Kimi_Agent_Srevol Domain Value Analysis (6)',
  'punycodex'
);
const ARC_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { getOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const lexById = new Map(LEXICON.map((e) => [e.id, e]));

// ─── The promotion queue (2026-11 plain-ASCII restorations) ────────────────
// tier:      sponsorship frame hierarchy (S > A > B) — prominence precedent.
// domain:    the deity's sphere label for cards/temples (NOT a web domain).
// folder:    materials folder name when it differs from the lexicon id.
const ENTRIES = [
  // Egyptian (18)
  { id: 'osiris', tier: 'S', domain: 'The Dead, Resurrection, the Nile\'s Return' },
  { id: 'sobek', tier: 'S', domain: 'The Nile, Fertility, Military Power' },
  { id: 'nut', tier: 'S', domain: 'The Sky, the Stars, the Vault of Night' },
  { id: 'geb', tier: 'A', domain: 'The Earth, its Riches and its Snakes' },
  { id: 'tefnut', tier: 'A', domain: 'Moisture, the Dew and the Rain' },
  { id: 'serket', tier: 'A', domain: 'Scorpions, Poison, Protection of the Vulnerable' },
  { id: 'serapis', tier: 'A', domain: 'The Composite God of the Ptolemaic Age' },
  { id: 'neith', tier: 'A', domain: 'Weaving, War, the Primeval Waters' },
  { id: 'min', tier: 'B', domain: 'Fertility, the Eastern Desert, Male Potency' },
  { id: 'montu', tier: 'B', domain: 'War, the Falcon of Thebes' },
  { id: 'nun', tier: 'B', domain: 'The Primeval Waters' },
  { id: 'sokar', tier: 'B', domain: 'The Memphis Necropolis, the Mound of Creation' },
  { id: 'kebechet', tier: 'B', domain: 'Purification, the Cool Water of Offerings' },
  { id: 'renenutet', tier: 'B', domain: 'The Harvest, the Nursing Cobra' },
  { id: 'onuris', tier: 'B', domain: 'He Who Brings Back the Distant One' },
  { id: 'karnak', tier: 'B', domain: 'The Fortified Village, Temple of Amun' },
  { id: 'luxor', tier: 'B', domain: 'The Palaces, the Southern Sanctuary' },
  { id: 'bes', tier: 'A', domain: 'The Protector of Hearth and Childbirth' },
  // Sanskrit (24)
  { id: 'indra', tier: 'S', domain: 'The Storm, the Vajra, King of the Gods' },
  { id: 'agni', tier: 'S', domain: 'Fire, the Sacrifice, the Messenger' },
  { id: 'yama', tier: 'S', domain: 'Death, the First Mortal, Judge of the Dead' },
  { id: 'kalki', tier: 'A', domain: 'The Tenth Avatāra, the End of the Kali Yuga' },
  { id: 'kubera', tier: 'A', domain: 'Riches, the Northern Quarter' },
  { id: 'skanda', tier: 'A', domain: 'War, the Divine Hosts' },
  { id: 'dharma', tier: 'A', domain: 'That Which Holds, Law and Righteousness' },
  { id: 'karma', tier: 'A', domain: 'Deed, Action, the Law of Consequence' },
  { id: 'yoga', tier: 'A', domain: 'Union, the Yoking of Self to Divine' },
  { id: 'aditi', tier: 'A', domain: 'Boundlessness, Mother of the Ādityas' },
  { id: 'bhakti', tier: 'B', domain: 'Devotion, Loving Attachment to the Divine' },
  { id: 'brahman', tier: 'A', domain: 'The Absolute, the World-Ground' },
  { id: 'chandra', tier: 'B', domain: 'The Glittering Moon' },
  { id: 'diti', tier: 'B', domain: 'Mother of the Daityas' },
  { id: 'duryodhana', tier: 'B', domain: 'Hard to Conquer in Battle' },
  { id: 'arjuna', tier: 'B', domain: 'The Third Pāṇḍava, the Great Archer' },
  { id: 'nakula', tier: 'B', domain: 'Twin of Sahadeva, Master of Horses' },
  { id: 'sahadeva', tier: 'B', domain: 'Twin of Nakula, Famed for Wisdom' },
  { id: 'mantra', tier: 'B', domain: 'The Sacred Formula' },
  { id: 'matsya', tier: 'B', domain: 'The Fish, First Avatāra of Viṣṇu' },
  { id: 'meru', tier: 'B', domain: 'The Axis Mountain, Olympus of the Hindus' },
  { id: 'tantra', tier: 'B', domain: 'The Loom of Esoteric Doctrine' },
  { id: 'tapas', tier: 'B', domain: 'Heat, the Generative Austerity' },
  { id: 'yoni', tier: 'B', domain: 'The Womb, the Feminine Principle' },
  // Norse (2 — surt skipped, surtr holds the Old Norse canonical form)
  { id: 'surtr', tier: 'A', domain: 'The Black One, the Fire at the End' },
  { id: 'njord', tier: 'A', domain: 'The Sea, Wealth, the Vanir Hostage' },
  // Celtic (2)
  { id: 'danu', tier: 'B', domain: 'Knowledge, Wisdom, Mother of the Tuatha Dé Danann' },
  { id: 'gronwpebr', tier: 'B', domain: 'Gronw the Strong', folder: 'gronwpebr' },
  // Chinese (1)
  { id: 'bodhidharma', tier: 'A', domain: 'The Dharma of Awakening, First Patriarch' },
  // Phoenician (1)
  { id: 'yammu', tier: 'A', domain: 'The Sea, Rival of Baʿal' },
  // Roman (1)
  { id: 'venus', tier: 'S', domain: 'Love, Beauty, the Morning and Evening Star' },
];

const KINDS = ['mascot', 'logomark', 'logolockup'];

// ─── Palette sampling ───────────────────────────────────────────────────────

const SAMPLER_PY = path.join(__dirname, '.palette-sampler.py');
fs.writeFileSync(
  SAMPLER_PY,
  [
    'from PIL import Image',
    'import colorsys, sys',
    'from collections import Counter',
    'img = Image.open(sys.argv[1]).convert("RGBA")',
    'img.thumbnail((120, 120))',
    'c = Counter()',
    'for r, g, b, a in img.getdata():',
    '    if a > 200:',
    '        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)',
    '        if s > 0.35 and v > 0.25:',
    '            c[(round(h*12), round(s*4), round(v*4))] += 1',
    'if not c:',
    '    print("#D4AF37 #228B22")',
    '    sys.exit()',
    '(h, s, v), n = c.most_common(1)[0]',
    'h, s, v = h/12, min(1, s/4 + 0.15), min(1, v/4 + 0.2)',
    'r, g, b = colorsys.hsv_to_rgb(h, s, v)',
    'h2 = (h + 0.42) % 1.0',
    'r2, g2, b2 = colorsys.hsv_to_rgb(h2, max(0.45, s*0.7), max(0.3, v*0.75))',
    'fmt = lambda x: "#%02X%02X%02X" % tuple(round(i*255) for i in x)',
    'print(fmt((r, g, b)), fmt((r2, g2, b2)))',
  ].join('\n')
);

function samplePalette(pngPath) {
  const out = execSync(`python "${SAMPLER_PY}" "${pngPath}"`, { encoding: 'utf8' })
    .trim()
    .split(/\s+/);
  return { primary: out[0], secondary: out[1] };
}

// ─── Asset staging ──────────────────────────────────────────────────────────

function stageAssets(entry) {
  const folder = entry.folder || entry.id;
  const srcDir = path.join(MATERIALS, folder);
  const destDir = path.join(ROOT, 'sites', entry.id, 'assets');
  fs.mkdirSync(destDir, { recursive: true });
  for (const kind of KINDS) {
    const src = path.join(srcDir, `${folder}_${kind}.png`);
    if (!fs.existsSync(src)) {
      console.log(`  ! ${entry.id}: missing ${folder}_${kind}.png — skipped`);
      continue;
    }
    const destPng = path.join(destDir, `${entry.id}_${kind}.png`);
    const destWebp = path.join(destDir, `${entry.id}_${kind}.webp`);
    fs.copyFileSync(src, destPng);
    execSync(
      `python -c "from PIL import Image; img=Image.open(r'${destPng}'); img.save(r'${destWebp}','WEBP')"`,
      { stdio: 'pipe' }
    );
  }
  return path.join(destDir, `${entry.id}_mascot.png`);
}

// ─── Archetype records ──────────────────────────────────────────────────────

function archetypeBlock(entry, colors, script) {
  const lex = lexById.get(entry.id);
  const name = lex.unicode;
  const meaning = (lex.meaning || '').split(/[.(:;]/)[0].trim();
  const tagline = meaning ? `${entry.domain} · ${meaning}` : entry.domain;
  const scriptLine = script ? `        greek: "${script}",\n` : '';
  return `    {
        id: "${entry.id}",
        rentalTier: "${entry.tier}",
        name: "${name}",
${scriptLine}        domain: "${entry.domain}",
        tagline: "${tagline.replace(/"/g, "'")}",
        pantheon: "${lex.pantheon}",
        folder: "${entry.id}",
        domainless: true,
        colors: { primary: "${colors.primary}", secondary: "${colors.secondary}", glow: "${hexToGlow(colors.primary)}" },
        mascotPath: "/sites/${entry.id}/assets/${entry.id}_mascot.webp",
        mascotFallback: "/sites/${entry.id}/assets/${entry.id}_mascot.webp",
        logomarkPath: "/sites/${entry.id}/assets/${entry.id}_logomark.webp",
        built: false,
        hasAdSite: true,
        darkPunchline: false
    },`;
}

function hexToGlow(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.3)`;
}

function currentArchetypes() {
  // Re-require fresh each call (file mutates on disk between phases).
  delete require.cache[require.resolve(path.join(ROOT, 'js', 'archetypes-v2.js'))];
  return require(path.join(ROOT, 'js', 'archetypes-v2.js')).ARCHETYPES;
}

function appendArchetypes() {
  let src = fs.readFileSync(ARC_PATH, 'utf8');
  const existing = new Set(currentArchetypes().map((a) => a.id));
  const blocks = [];
  for (const entry of ENTRIES) {
    if (existing.has(entry.id)) continue;
    const lex = lexById.get(entry.id);
    if (!lex) {
      console.log(`  ! ${entry.id}: not in lexicon — skipped`);
      continue;
    }
    const mascotPng = path.join(ROOT, 'sites', entry.id, 'assets', `${entry.id}_mascot.png`);
    const colors = samplePalette(mascotPng);
    const script = getOriginalScript(lex);
    blocks.push(archetypeBlock(entry, colors, script && script !== '—' ? script : null));
    console.log(`  + archetype ${entry.id} (${colors.primary}/${colors.secondary})`);
  }
  if (!blocks.length) {
    console.log('  (all archetypes already present)');
    return;
  }
  const marker = '\n];\n\nif (typeof module';
  if (!src.includes(marker)) throw new Error('archetypes-v2.js closing marker not found');
  src = src.replace(marker, '\n' + blocks.join('\n') + marker);
  src = fixHeader(src);
  fs.writeFileSync(ARC_PATH, src);
  console.log(`  ✓ appended ${blocks.length} archetype record(s), built:false (awaiting)`);
}

function fixHeader(src) {
  const all = currentArchetypes();
  // Count from the file we are ABOUT to write: parse blocks between markers.
  const built = (src.match(/built:\s*true/g) || []).length;
  const awaiting = (src.match(/built:\s*false/g) || []).length;
  const total = built + awaiting;
  return src.replace(
    /\d+ handcrafted archetypes \(\d+ built, \d+ awaiting\)/,
    `${total} handcrafted archetypes (${built} built, ${awaiting} awaiting)`
  );
}

// ─── Readiness gate ─────────────────────────────────────────────────────────

// Mirrors test/scholars-content.test.js substance floors — the scholars
// generator derives sections from lore, so lore alone can starve a section
// (e.g. pronunciation under 600 chars). Simulating the builders here catches
// that at authoring time instead of in CI.
const SCHOLAR_THRESHOLDS = {
  overview: 600,
  'the-name': 500,
  pronunciation: 600,
  'original-script': 250,
  domains: 400,
  symbols: 300,
  mythology: 800,
  syncretism: 250,
  'cultural-legacy': 240,
  archaeology: 250,
  'scholarly-sources': 300,
  meditation: 150,
};

function scholarsBreaches(id) {
  const archetype = currentArchetypes().find((a) => a.id === id);
  if (!archetype) return [];
  const generators = path.join(ROOT, 'scripts', 'generate-scholars-content.js');
  const { buildContext, SECTION_BUILDERS } = require(generators);
  const ctx = buildContext(archetype);
  const breaches = [];
  for (const [key, builder] of Object.entries(SECTION_BUILDERS)) {
    const threshold = SCHOLAR_THRESHOLDS[key];
    if (!threshold) continue;
    const len = (builder(ctx).body || '').length;
    if (len < threshold) breaches.push(`${key}(${len}/${threshold})`);
  }
  return breaches;
}

function readiness() {
  const lore = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'lore-catalog.json'), 'utf8'));
  const effects = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'templates', 'flagship', 'effects', 'effects.json'), 'utf8')
  );
  const gallery = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'gallery-data.json'), 'utf8'));
  const honestZero = new Set(gallery._honestZero || []);
  const patternsSrc = fs.readFileSync(path.join(ROOT, 'type', 'js', 'industry-patterns.js'), 'utf8');
  const report = [];
  for (const entry of ENTRIES) {
    const missing = [];
    if (!lore[entry.id] || !Object.keys(lore[entry.id]).length) missing.push('lore');
    if (!effects[entry.id]) missing.push('effect');
    const imgs = (gallery[entry.id] && gallery[entry.id].images) || [];
    if (imgs.length < 2 && !honestZero.has(entry.id)) missing.push('gallery');
    const seats = (patternsSrc.match(new RegExp(`['"]${entry.id}['"]`, 'g')) || []).length;
    if (seats < 3) missing.push(`seats(${seats}/3)`);
    if (!missing.includes('lore')) {
      const breaches = scholarsBreaches(entry.id);
      if (breaches.length) missing.push('scholars:' + breaches.join(' '));
    }
    report.push({ id: entry.id, ready: !missing.length, missing });
  }
  return report;
}

function activate(ids) {
  const report = readiness().filter((r) => !ids || ids.includes(r.id));
  const flip = report.filter((r) => r.ready);
  if (!flip.length) {
    console.log('Nothing ready to activate. Run with --check for the per-entry report.');
    return;
  }
  let src = fs.readFileSync(ARC_PATH, 'utf8');
  for (const r of flip) {
    const re = new RegExp(`(id: "${r.id}",[\\s\\S]*?built:) false`);
    if (!re.test(src)) {
      console.log(`  ! ${r.id}: archetype block not found or already built`);
      continue;
    }
    src = src.replace(re, '$1 true');
    console.log(`  ✓ ${r.id} → built:true`);
  }
  src = fixHeader(src);
  fs.writeFileSync(ARC_PATH, src);
  console.log('\nNext: npm run generate && npm test && npm run generate, then commit together.');
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--check')) {
  const report = readiness();
  const ready = report.filter((r) => r.ready);
  console.log(`Readiness: ${ready.length}/${report.length} ready to activate\n`);
  for (const r of report) {
    console.log(`  ${r.ready ? '✓' : '✗'} ${r.id}${r.missing.length ? ' — missing: ' + r.missing.join(', ') : ''}`);
  }
} else if (args.includes('--activate-all')) {
  activate(null);
} else if (args.includes('--activate')) {
  activate(args.slice(args.indexOf('--activate') + 1).filter((a) => !a.startsWith('--')));
} else {
  console.log(`Staging ${ENTRIES.length} entries from:\n  ${MATERIALS}\n`);
  for (const entry of ENTRIES) {
    const destDir = path.join(ROOT, 'sites', entry.id, 'assets');
    const have = KINDS.every((k) =>
      fs.existsSync(path.join(destDir, `${entry.id}_${k}.webp`))
    );
    if (have) {
      console.log(`  = ${entry.id}: assets already staged`);
      continue;
    }
    process.stdout.write(`  ${entry.id}: `);
    try {
      stageAssets(entry);
      console.log('assets staged (png + webp)');
    } catch (err) {
      console.log('FAILED — ' + err.message);
    }
  }
  appendArchetypes();
  console.log('\nStaged in "awaiting" state. Author lore/effects/gallery/seats, then:');
  console.log('  node scripts/promote-flagship-batch.js --check');
  console.log('  node scripts/promote-flagship-batch.js --activate-all');
}
