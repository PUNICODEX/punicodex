#!/usr/bin/env node
/**
 * PÚNYCODEX — Original Script Provenance Validator
 *
 * Ensures the rich provenance overhaul is wired correctly:
 *  - create-flagship.js imports and delegates to buildRichProvenanceSection
 *  - css/temple-base.css contains the required provenance selectors
 *  - all 8 pilot flagships have canonical rich provenance
 *  - the HTML builder emits the expected structural markers
 *  - every flagship entry receives at least a placeholder section
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

let failures = 0;
let warnings = 0;
let checks = 0;

function fail(message) {
  failures += 1;
  console.log(`${C.red}✖${C.reset} ${message}`);
}

function warn(message) {
  warnings += 1;
  console.log(`${C.yellow}⚠${C.reset} ${message}`);
}

function pass(message) {
  checks += 1;
  console.log(`${C.green}✔${C.reset} ${message}`);
}

function info(message) {
  console.log(`${C.dim}→${C.reset} ${message}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadLexicon() {
  const code = read('type/js/lexicon.js').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

const PILOT_IDS = ['zeus', 'ra', 'thor', 'shiva', 'long', 'nikko', 'david', 'enlil'];

const REQUIRED_CSS_SELECTORS = [
  '.section-provenance',
  '.script-altar',
  '.script-specimen',
  '.sign-grid',
  '.sign-card',
  '.transmission-chain',
  '.transmission-node',
  '.provenance-columns',
  '.provenance-reading',
  '.provenance-scholarly',
  '.source-list',
  '.uncertainty-list',
];

const REQUIRED_HTML_MARKERS = [
  '<section class="section section-provenance" id="provenance">',
  '<div class="script-altar">',
  '<div class="script-specimen"',
  '<div class="sign-grid"',
  '<div class="transmission-chain"',
  '<div class="provenance-columns">',
  '<div class="provenance-reading">',
  '<div class="provenance-scholarly">',
];

function main() {
  console.log(`${C.bold}${C.cyan}PUNYCODEX Provenance Validator${C.reset}\n`);

  // 1. Wiring checks
  info('Checking generator wiring...');
  const createFlagship = read('scripts/create-flagship.js');
  if (!createFlagship.includes('build-provenance-section.js')) {
    fail('create-flagship.js does not import build-provenance-section.js');
  } else {
    pass('create-flagship.js imports build-provenance-section.js');
  }

  if (!createFlagship.includes('buildRichProvenanceSection')) {
    fail('create-flagship.js does not reference buildRichProvenanceSection');
  } else {
    pass('create-flagship.js references buildRichProvenanceSection');
  }

  if (!/const sectionOffset = 1;/.test(createFlagship)) {
    fail('create-flagship.js sectionOffset is not hard-coded to 1');
  } else {
    pass('create-flagship.js hard-codes sectionOffset = 1 (provenance always section 02)');
  }

  // 2. CSS checks
  info('Checking CSS coverage...');
  const css = read('css/temple-base.css');
  for (const selector of REQUIRED_CSS_SELECTORS) {
    if (!css.includes(selector)) {
      fail(`css/temple-base.css missing selector ${selector}`);
    } else {
      pass(`css/temple-base.css has ${selector}`);
    }
  }

  // 3. Builder output checks for pilots
  info('Checking pilot provenance data...');
  const {
    getRichProvenance,
    getOriginalScript,
    getOriginalScriptLabel,
  } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
  const { buildRichProvenanceSection } = require(path.join(ROOT, 'scripts', 'build-provenance-section.js'));

  const lexicon = loadLexicon();
  const byId = new Map(lexicon.map((e) => [e.id, e]));

  for (const id of PILOT_IDS) {
    const entry = byId.get(id);
    if (!entry) {
      fail(`Pilot ${id} not found in lexicon`);
      continue;
    }

    const prov = getRichProvenance(entry);
    if (!prov) {
      fail(`Pilot ${id} has no rich provenance`);
      continue;
    }

    if (prov.reviewStatus !== 'canonical') {
      fail(`Pilot ${id} reviewStatus is ${prov.reviewStatus}, expected canonical`);
    } else {
      pass(`Pilot ${id} reviewStatus is canonical`);
    }

    if (!Array.isArray(prov.signs) || prov.signs.length === 0) {
      fail(`Pilot ${id} has no signs array`);
    } else {
      pass(`Pilot ${id} has ${prov.signs.length} sign card(s)`);
    }

    if (!prov.etymology || prov.etymology.length < 20) {
      fail(`Pilot ${id} etymology is missing or too short`);
    } else {
      pass(`Pilot ${id} etymology is present`);
    }

    if (!Array.isArray(prov.sources) || prov.sources.length === 0) {
      fail(`Pilot ${id} has no sources`);
    } else {
      pass(`Pilot ${id} has ${prov.sources.length} source(s)`);
    }

    const html = buildRichProvenanceSection(entry);
    for (const marker of REQUIRED_HTML_MARKERS) {
      if (!html.includes(marker)) {
        fail(`Pilot ${id} provenance HTML missing marker: ${marker}`);
      }
    }
    if (html.includes('section-provenance')) {
      pass(`Pilot ${id} provenance HTML emitted`);
    }
  }

  // 4. Placeholder check for all flagships
  info('Checking placeholder coverage for all flagships...');
  const flagshipIds = lexicon.filter((e) => e.hasAdSite || e.isFlagship).map((e) => e.id);
  let placeholderCount = 0;
  for (const id of flagshipIds) {
    const entry = byId.get(id);
    const html = buildRichProvenanceSection(entry);
    if (!html.includes('section-provenance')) {
      fail(`Flagship ${id} is missing any provenance section`);
    }
    if (html.includes('section-provenance-placeholder')) {
      placeholderCount += 1;
    }
  }
  pass(`${flagshipIds.length} flagships have a provenance section (${placeholderCount} placeholders)`);

  // 5. Regenerate smoke check: run create-flagship.js --dry-run for a pilot
  info('Smoke-testing flagship generator...');
  try {
    execSync('node scripts/create-flagship.js zeus --dry-run', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    pass('create-flagship.js zeus --dry-run succeeds');
  } catch (err) {
    fail(`create-flagship.js zeus --dry-run failed: ${err.message}`);
  }

  // Report
  console.log('');
  if (failures === 0) {
    console.log(
      `${C.green}${C.bold}All provenance checks passed${C.reset} (${checks} checks, ${warnings} warnings)`
    );
    process.exit(0);
  } else {
    console.log(
      `${C.red}${C.bold}Provenance validation failed${C.reset}: ${failures} failure(s), ${warnings} warning(s), ${checks} check(s)`
    );
    process.exit(1);
  }
}

main();
