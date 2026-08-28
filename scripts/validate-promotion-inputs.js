#!/usr/bin/env node
/**
 * Pre-flight validator for newly promoted flagship sources.
 * Run this BEFORE `npm test` to catch the issues that currently surface
 * only after the 15-25 minute full battery.
 *
 * Usage:
 *   node scripts/validate-promotion-inputs.js [id1] [id2] ...
 *   node scripts/validate-promotion-inputs.js --all-built
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { INDUSTRY_GROUPS } = require(path.join(ROOT, 'type', 'js', 'industry-patterns.js'));
const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);

const TAXONOMY = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'docs', 'scholarly-edition', 'scholarly-section-taxonomy-v0.1.json'),
    'utf8'
  )
);

function collectAllowedScholarSections() {
  const keys = new Set();
  for (const bucket of ['universal', 'common', 'optional']) {
    for (const s of TAXONOMY.taxonomy[bucket]?.sections || []) keys.add(s.key);
  }
  for (const kit of Object.values(TAXONOMY.taxonomy.pantheonKits?.kits || {})) {
    for (const s of kit.sections || []) keys.add(s.key);
  }
  return keys;
}

const ALLOWED_SCHOLAR_SECTIONS = collectAllowedScholarSections();

const SECTION_THRESHOLDS = {
  pronunciation: 600,
  syncretism: 250,
  'cultural-legacy': 240,
};

const HTML_LIKE = /<[a-zA-Z][a-zA-Z0-9]*[^>]*/;

function wordCount(md) {
  return md
    .replace(/[#*_[\](){}|`\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function fail(id, msg) {
  console.error(`  ✗ ${id}: ${msg}`);
}

function ok(id, msg) {
  console.log(`  ✓ ${id}: ${msg}`);
}

function validateScholars(id, logOk = false) {
  const file = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  if (!fs.existsSync(file)) return fail(id, `missing scholars content ${file}`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fail(id, `scholars JSON invalid: ${e.message}`);
  }

  const sections = data.sections || {};
  const sectionKeys = Object.keys(sections);

  const badKeys = sectionKeys.filter((k) => !ALLOWED_SCHOLAR_SECTIONS.has(k));
  if (badKeys.length) fail(id, `scholars unexpected sections: ${badKeys.join(', ')}`);

  for (const [key, sec] of Object.entries(sections)) {
    if (!sec.body) {
      fail(id, `scholars section ${key} missing body`);
      continue;
    }
    if (HTML_LIKE.test(sec.body)) {
      fail(id, `scholars section ${key} contains raw HTML`);
    }
    const min = SECTION_THRESHOLDS[key];
    if (min && sec.body.length < min) {
      fail(id, `scholars section ${key} body ${sec.body.length} < ${min}`);
    }
    const sources = sec.sources || [];
    const maxMarker = (sec.body.match(/\[\^(\d+)\]/g) || [])
      .map((m) => parseInt(m.match(/\d+/)[0], 10))
      .reduce((a, b) => Math.max(a, b), 0);
    if (maxMarker > sources.length) {
      fail(id, `scholars section ${key} citation [^${maxMarker}] out of range (${sources.length} sources)`);
    }
  }

  if (logOk) ok(id, 'scholars content valid');
  return badKeys.length === 0;
}

function validateBlog(id, logOk = false) {
  const file = path.join(ROOT, 'platform', 'blog', 'content', `${id}.json`);
  if (!fs.existsSync(file)) return fail(id, `missing blog content ${file}`);

  let post;
  try {
    post = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fail(id, `blog JSON invalid: ${e.message}`);
  }

  const wc = wordCount(post.body);
  if (wc < 2400 || wc > 4200) fail(id, `blog word count ${wc} not in 2400–4200`);

  const kw = post.keywords || [];
  if (kw.length < 5 || kw.length > 8) fail(id, `blog keywords ${kw.length} not in 5–8`);

  const tags = post.tags || [];
  if (tags.length < 3 || tags.length > 5) fail(id, `blog tags ${tags.length} not in 3–5`);

  const h2s = (post.body.match(/^## .+/gm) || []).map((s) => s.slice(3).trim());
  const lastTwo = h2s.slice(-2);
  if (lastTwo[0] !== 'Related Names' || lastTwo[1] !== 'Sources') {
    fail(id, `blog final H2s are "${lastTwo.join('", "')}" (expected Related Names, Sources)`);
  }

  if (logOk) ok(id, 'blog content valid');
  return true;
}

function validateIndustries(id, logOk = false) {
  const assigned = [];
  let weight2 = 0;
  for (const g of INDUSTRY_GROUPS) {
    const e = g.entries.find((x) => x.id === id);
    if (e) {
      assigned.push(g.industry);
      if (e.weight === 2) weight2++;
    }
  }
  if (assigned.length < 3) fail(id, `only ${assigned.length} industries (need ≥3)`);
  if (weight2 === 0) fail(id, 'no weight-2 primary industry');
  if (weight2 > 3) fail(id, `${weight2} weight-2 industries (max 3)`);
  if (logOk) ok(id, `industries valid (${assigned.length}, ${weight2} primary)`);
  return assigned.length >= 3 && weight2 > 0 && weight2 <= 3;
}

function validateAssets(id, logOk = false) {
  const dir = path.join(ROOT, 'sites', id, 'assets');
  const required = ['mascot.webp', 'logomark.webp', 'logolockup.webp'];
  const missing = required.filter((f) => {
    const prefixed = path.join(dir, `${id}_${f}`);
    const bare = path.join(dir, f);
    return !fs.existsSync(prefixed) && !fs.existsSync(bare);
  });
  if (missing.length) fail(id, `missing assets: ${missing.join(', ')}`);
  else if (logOk) ok(id, 'assets present');
  return missing.length === 0;
}

function validateLoreAndEffects(id, logOk = false) {
  const loreFile = path.join(ROOT, 'scripts', 'lore-catalog.json');
  const lore = JSON.parse(fs.readFileSync(loreFile, 'utf8'));
  if (!lore[id]) fail(id, 'missing lore-catalog entry');

  const effectsFile = path.join(ROOT, 'templates', 'flagship', 'effects', 'effects.json');
  const effects = JSON.parse(fs.readFileSync(effectsFile, 'utf8'));
  if (!effects[id]) fail(id, 'missing hero effect entry');

  const effectJs = path.join(ROOT, 'templates', 'flagship', 'effects', `${id}.js`);
  if (!fs.existsSync(effectJs)) fail(id, 'missing hero effect JS');

  if (logOk && lore[id] && effects[id] && fs.existsSync(effectJs)) ok(id, 'lore + effect present');
  return !!(lore[id] && effects[id] && fs.existsSync(effectJs));
}

function main() {
  const args = process.argv.slice(2);
  let ids;
  if (args.includes('--all-built')) {
    ids = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
  } else if (args.length) {
    ids = args;
  } else {
    ids = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
  }

  console.log(`Validating ${ids.length} flagship source set(s)...\n`);
  let errors = 0;
  for (const id of ids) {
    if (!LEXICON.find((e) => e.id === id)) {
      fail(id, 'not in lexicon');
      errors++;
      continue;
    }
    const ok1 = validateScholars(id, false);
    const ok2 = validateBlog(id, false);
    const ok3 = validateIndustries(id, false);
    const ok4 = validateAssets(id, false);
    const ok5 = validateLoreAndEffects(id, false);
    if (ok1 && ok2 && ok3 && ok4 && ok5) {
      console.log(`  ✓ ${id}: all source checks pass`);
    } else {
      errors++;
    }
  }

  console.log(`\n${errors === 0 ? '✅ All source checks pass' : `❌ ${errors} flagship(s) failed`}`);
  process.exit(errors ? 1 : 0);
}

main();
