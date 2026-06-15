#!/usr/bin/env node
/**
 * Regenerate only flagship lore pages that currently contain generated stubs.
 * Legacy Greek flagships are skipped by default so their hand-crafted content
 * is never overwritten.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const sitesDir = path.join(root, 'sites');

function loadLexicon() {
  const src = fs.readFileSync(path.join(root, 'type', 'js', 'lexicon.js'), 'utf8');
  const LEXICON = new Function(`${src}\nreturn LEXICON;`)();
  const map = new Map();
  for (const entry of LEXICON) {
    map.set(entry.id, entry);
  }
  return map;
}

function isStubContent(content) {
  if (!content?.trim()) return true;
  const lower = content.toLowerCase();
  const stubPhrases = [
    'coming soon',
    'explore the myths and stories',
    'reconstructed pronunciation guide',
    'reflect time, destruction, empowerment',
    'reflect love, fertility, war',
    'reflect the domains of',
    'reflect the symbols of',
    'continues to shape language, art, and imagination today',
    'is time, destruction, empowerment',
    'is love, fertility, war',
    'is the sky, thunder, king of gods',
    'these attributes appear across seals, coins, vase paintings, and temple reliefs',
    'the myths surrounding this figure established its authority in ritual, art, and literature',
    'etymologically, it derives from',
    'a root that shaped cult titles, hymns, and ritual addresses across centuries',
    'belongs to the greek tradition as',
    'belongs to the norse tradition as',
    'belongs to the egyptian tradition as',
    'belongs to the sanskrit tradition as',
    'belongs to the mesopotamian tradition as',
    'belongs to the zoroastrian tradition as',
    'belongs to the japanese tradition as',
    'the iconography of',
    'gathers around',
    'visual theology',
    'the name reaches back to',
    'that root shaped cult titles',
    'shrines, festivals, and votive offerings',
    'the name in text and memory',
    'from ancient cult to modern imagination',
    'after the temples fell silent',
    'in unicode is not nostalgia',
  ];
  return stubPhrases.some((p) => lower.includes(p));
}

function main() {
  const lexicon = loadLexicon();
  const ids = fs
    .readdirSync(sitesDir)
    .filter((id) => fs.statSync(path.join(sitesDir, id)).isDirectory())
    .filter((id) => fs.existsSync(path.join(sitesDir, id, 'lore.json')))
    .sort();

  let regenerated = 0;
  let skipped = 0;

  for (const id of ids) {
    const entry = lexicon.get(id);
    if (!entry) {
      console.log(`[skip] ${id}: not in lexicon`);
      skipped += 1;
      continue;
    }

    // Never touch legacy Greek content unless explicitly requested.
    if (entry.pantheon === 'greek' || entry.pantheon === 'greek-location') {
      console.log(`[skip] ${id}: legacy ${entry.pantheon}`);
      skipped += 1;
      continue;
    }

    const lorePath = path.join(sitesDir, id, 'lore', 'index.html');
    if (!fs.existsSync(lorePath)) {
      console.log(`[skip] ${id}: no lore/index.html`);
      skipped += 1;
      continue;
    }

    const html = fs.readFileSync(lorePath, 'utf8');
    if (!isStubContent(html)) {
      console.log(`[skip] ${id}: content looks custom`);
      skipped += 1;
      continue;
    }

    console.log(`[regenerate] ${id}`);
    execSync(`node "${path.join(__dirname, 'create-flagship.js')}" ${id}`, {
      cwd: root,
      stdio: 'inherit',
    });
    regenerated += 1;
  }

  console.log(`\nDone. Regenerated ${regenerated} flagships, skipped ${skipped}.`);
}

main();
