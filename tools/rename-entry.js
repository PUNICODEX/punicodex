#!/usr/bin/env node
/**
 * Rename a lexicon entry's machine id across every canonical source, with a
 * legacy 301 redirect so the old clean URL keeps working.
 *
 * Usage: node tools/rename-entry.js <oldId> <newId>   (then: npm run generate && npm test)
 *
 * Covers: lexicon id, archetypes id/folder, lore-catalog key, gallery-data key,
 * effects registry key, scholars + blog content files, industry-pattern seats,
 * the sites/ directory (git mv), and LEGACY_REDIRECTS in sync-middleware-domains.js.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const [oldId, newId] = process.argv.slice(2);
if (!oldId || !newId) {
  console.error('Usage: node tools/rename-entry.js <oldId> <newId>');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..');
let touched = 0;

function replaceInFile(rel, from, to, { wordBoundary = true } = {}) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  if (wordBoundary) {
    s = s.split(`"${from}"`).join(`"${to}"`); // JSON/JS quoted id
    s = s.split(`'${from}'`).join(`'${to}'`);
    s = s.split(`/${from}/`).join(`/${newId}/`); // URL paths
  } else {
    s = s.split(from).join(to);
  }
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log(`  ✓ ${rel}`);
    touched++;
  }
}

console.log(`Renaming entry id: ${oldId} → ${newId}`);

// Canonical sources (quoted id occurrences + URL paths)
replaceInFile('type/js/lexicon.js', oldId, newId);
replaceInFile('type/js/glyph-atlas.js', oldId, newId);
replaceInFile('type/js/original-scripts.js', oldId, newId);
replaceInFile('type/js/original-scripts-extra.json', oldId, newId);
replaceInFile('type/js/similarity-groups.js', oldId, newId);
replaceInFile('type/js/everyday-words.js', oldId, newId);
replaceInFile('type/js/ink-myths.js', oldId, newId);
replaceInFile('type/js/industry-patterns.js', oldId, newId);
replaceInFile('js/archetypes-v2.js', oldId, newId);
replaceInFile('js/original-script-lookup.js', oldId, newId);
replaceInFile('scripts/lore-catalog.json', oldId, newId);
replaceInFile('scripts/gallery-data.json', oldId, newId);
replaceInFile('scripts/flagship-data.json', oldId, newId);
replaceInFile('templates/flagship/effects/effects.json', oldId, newId);
// Canonical per-text xref files (eng.json/xref.json under platform/texts/{id}/)
for (const t of fs.readdirSync(path.join(ROOT, 'platform', 'texts'), { withFileTypes: true })) {
  if (!t.isDirectory()) continue;
  for (const f of ['xref.json', 'eng.json']) {
    replaceInFile(path.join('platform', 'texts', t.name, f), oldId, newId);
  }
}

// Scholars + blog content files
for (const dir of ['platform/scholars/content', 'platform/blog/content']) {
  const oldFile = path.join(ROOT, dir, `${oldId}.json`);
  const newFile = path.join(ROOT, dir, `${newId}.json`);
  if (fs.existsSync(oldFile)) {
    execSync(`git mv "${oldFile}" "${newFile}"`);
    console.log(`  ✓ ${dir}/${oldId}.json → ${newId}.json`);
    touched++;
  }
}

// sites/ directory
const oldSite = path.join(ROOT, 'sites', oldId);
if (fs.existsSync(oldSite)) {
  execSync(`git mv "${oldSite}" "${path.join(ROOT, 'sites', newId)}"`);
  console.log(`  ✓ sites/${oldId}/ → sites/${newId}/`);
  touched++;
}

// Legacy redirect in the middleware sync script (hand-edited table)
const syncPath = path.join(ROOT, 'scripts', 'sync-middleware-domains.js');
let sync = fs.readFileSync(syncPath, 'utf8');
if (!sync.includes(`/${oldId}/`)) {
  // add a legacy redirect entry — find the LEGACY_REDIRECTS table and append
  const marker = /const LEGACY_REDIRECTS\s*=\s*\{/;
  if (marker.test(sync)) {
    sync = sync.replace(marker, (m) => `${m}\n  '/${oldId}': '/${newId}', // renamed entry id`);
    fs.writeFileSync(syncPath, sync);
    console.log('  ✓ sync-middleware-domains.js (legacy redirect added)');
    touched++;
  } else {
    console.warn('  ⚠ LEGACY_REDIRECTS table not found — add the redirect by hand');
  }
}

console.log(`\n${touched} locations updated. Now run: npm run generate && npm test`);
