/**
 * Compute Archetype Scores
 *
 * Walks active indexed_sites that map to lexicon entries and computes
 * archetype_score / archetype_signals based on site content vs. entry meaning.
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const { scoreArchetype } = require('../api/archetype-scorer');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const updateStmt = db.prepare(`
  UPDATE indexed_sites
  SET archetype_score = ?,
      archetype_signals = ?,
      archetype_version = ?
  WHERE id = ?
`);

async function main() {
  const sites = db
    .prepare(`
    SELECT s.*, e.id as entry_id, e.meaning, e.etymology, e.sources, e.pantheon, e.ascii
    FROM indexed_sites s
    JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE s.status = 'active'
  `)
    .all();

  let processed = 0;
  for (const site of sites) {
    const entry = {
      id: site.entry_id,
      meaning: site.meaning,
      etymology: site.etymology ? JSON.parse(site.etymology) : null,
      sources: site.sources ? JSON.parse(site.sources) : [],
      pantheon: site.pantheon,
      ascii: site.ascii,
    };

    try {
      const result = await scoreArchetype(site, entry);
      updateStmt.run(
        result.archetype_score,
        result.archetype_signals,
        result.archetype_version,
        site.id
      );
      processed++;
    } catch (err) {
      console.error(`Archetype scoring failed for ${site.domain}:`, err.message);
    }
  }

  console.log(`Computed archetype scores for ${processed}/${sites.length} sites.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
