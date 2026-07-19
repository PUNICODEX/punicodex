/**
 * Applies the enrich-a..d.js lore enrichments to scripts/lore-catalog.json.
 * Merge semantics per entry: pronunciationNote folds into pronunciation.note;
 * domains/symbols/mythology/sources replace the thin v1 values;
 * syncretism/culturalLegacy/archaeology/extendedMeditation replace;
 * originalScriptNote is set where provided. All other fields are preserved.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const CATALOG = path.join(ROOT, 'scripts', 'lore-catalog.json');
const batches = ['enrich-a.js', 'enrich-b.js', 'enrich-c.js', 'enrich-d.js'];

const lore = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
let applied = 0;
const missing = [];

for (const file of batches) {
  const data = require(path.join(__dirname, file));
  for (const [id, e] of Object.entries(data)) {
    if (!lore[id]) {
      missing.push(id);
      continue;
    }
    const cur = lore[id];
    if (e.pronunciationNote) {
      cur.pronunciation = { ...(cur.pronunciation || {}), note: e.pronunciationNote };
    }
    if (e.domains) cur.domains = e.domains;
    if (e.symbols) cur.symbols = e.symbols;
    if (e.mythology) cur.mythology = e.mythology;
    if (e.syncretism) cur.syncretism = e.syncretism;
    if (e.culturalLegacy) cur.culturalLegacy = e.culturalLegacy;
    if (e.archaeology) cur.archaeology = e.archaeology;
    if (e.extendedMeditation) cur.extendedMeditation = e.extendedMeditation;
    if (e.originalScriptNote) cur.originalScriptNote = e.originalScriptNote;
    if (e.sources) cur.sources = e.sources;
    applied++;
  }
}

if (missing.length) {
  console.error('MISSING in lore-catalog:', missing.join(', '));
  process.exit(1);
}

fs.writeFileSync(CATALOG, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log(`Enriched ${applied} entries in scripts/lore-catalog.json`);
