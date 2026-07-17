/**
 * Purge low-quality, parked, and empty sites from the active index.
 * Marks them as 'error' (low quality) or 'spam' (parked/spam).
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function purge() {
  console.log('🧹 Purging junk from active index\n');

  // 1. Mark spam (already caught by backfill, but double-check)
  const spamResult = db
    .prepare(`
    UPDATE indexed_sites
    SET status = 'spam'
    WHERE status = 'active' AND spam_score >= 0.7
  `)
    .run();
  console.log(`  Spam marked: ${spamResult.changes}`);

  // 2. Mark parked domains
  const parkedPatterns = [
    '%for sale%',
    '%domain parking%',
    '%buy this domain%',
    '%sedo%',
    '%dan.com%',
    '%afternic%',
    '%parked free%',
    '%coming soon%',
    '%under construction%',
  ];

  let parkedCount = 0;
  for (const pattern of parkedPatterns) {
    const r = db
      .prepare(`
      UPDATE indexed_sites
      SET status = 'spam'
      WHERE status = 'active'
        AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(first_p) LIKE ?)
    `)
      .run(pattern, pattern, pattern);
    parkedCount += r.changes;
  }
  console.log(`  Parked domains marked: ${parkedCount}`);

  // 3. Mark empty content (very short)
  const emptyResult = db
    .prepare(`
    UPDATE indexed_sites
    SET status = 'error'
    WHERE status = 'active'
      AND (word_count < 50 OR word_count IS NULL)
      AND (quality_score < 0.3 OR quality_score IS NULL)
  `)
    .run();
  console.log(`  Empty content marked: ${emptyResult.changes}`);

  // 4. Mark low quality
  const lowQResult = db
    .prepare(`
    UPDATE indexed_sites
    SET status = 'error'
    WHERE status = 'active'
      AND quality_score < 0.4
  `)
    .run();
  console.log(`  Low quality marked: ${lowQResult.changes}`);

  // 5. Keep flagships regardless of quality
  const flagshipRestore = db
    .prepare(`
    UPDATE indexed_sites
    SET status = 'active'
    WHERE is_flagship = 1 AND status != 'active'
  `)
    .run();
  console.log(`  Flagships restored: ${flagshipRestore.changes}`);

  // Final stats
  const final = db
    .prepare(`
    SELECT
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
    FROM indexed_sites
  `)
    .get();

  console.log(`\n✅ Purge complete:`);
  console.log(`   Active: ${final.active}`);
  console.log(`   Spam: ${final.spam}`);
  console.log(`   Error: ${final.error}`);

  db.close();
}

if (require.main === module) {
  purge();
  console.log('\nDone.');
}

module.exports = { purge };
