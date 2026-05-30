/**
 * PUNYCODEX — Lexicon Exporter
 * Exports the sacred Canon from SQLite to a portable JSON relic.
 * Run: node build-lexicon.js
 */

const fs = require('fs');
const path = require('path');

// Use the root project's better-sqlite3
const rootNodeModules = path.join(__dirname, '..', '..', 'node_modules');
const Database = require(path.join(rootNodeModules, 'better-sqlite3'));

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const OUTPUT_PATH = path.join(__dirname, 'renderer', 'lexicon.json');

function parseSources(sources) {
  if (!sources) return [];
  if (Array.isArray(sources)) return sources;
  try { return JSON.parse(sources); } catch { return []; }
}

function computePunycode(unicode) {
  if (!unicode) return null;
  try {
    const { domainToASCII } = require('url');
    const ascii = domainToASCII(unicode.toLowerCase());
    return ascii !== unicode.toLowerCase() ? ascii : null;
  } catch (e) {
    return null;
  }
}

console.log('Opening the Canon...');
const db = new Database(DB_PATH);

const entries = db.prepare('SELECT * FROM entries').all();
const breakdowns = db.prepare('SELECT * FROM breakdowns').all();

const enrichedEntries = entries.map(e => ({
  id: e.id,
  ascii: e.ascii,
  unicode: e.unicode,
  greek: e.greek,
  pantheon: e.pantheon,
  tier: e.tier,
  tierLabel: e.tier_label,
  meaning: e.meaning,
  sources: parseSources(e.sources),
  domain: e.domain,
  hasFlagship: e.has_flagship,
  punycode: computePunycode(e.unicode)
}));

const data = {
  exportedAt: new Date().toISOString(),
  totalEntries: enrichedEntries.length,
  totalBreakdowns: breakdowns.length,
  pantheons: [...new Set(enrichedEntries.map(e => e.pantheon))].sort(),
  entries: enrichedEntries,
  breakdowns: breakdowns.map(b => ({
    entryId: b.entry_id,
    char: b.char,
    to: b.to,
    type: b.type
  }))
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

console.log(`Canon inscribed: ${OUTPUT_PATH}`);
console.log(`  ${data.totalEntries} entries`);
console.log(`  ${data.totalBreakdowns} breakdowns`);
console.log(`  ${data.pantheons.length} pantheons`);

db.close();
