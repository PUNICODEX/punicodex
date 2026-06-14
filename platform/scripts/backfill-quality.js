/**
 * Backfill quality scores on all active sites.
 * Re-runs the quality scorer on every active indexed site.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const { scoreQuality } = require('./quality-scorer');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const updateSite = db.prepare(`
  UPDATE indexed_sites
  SET spam_score = ?,
      quality_score = ?,
      flesch_reading_ease = ?,
      flesch_kincaid_grade = ?,
      freshness_score = ?,
      readability_score = ?,
      simhash = ?
  WHERE id = ?
`);

function backfill(batchSize = 50) {
  console.log('🔧 Backfilling quality scores on all active sites\n');

  const sites = db
    .prepare(`
    SELECT * FROM indexed_sites WHERE status = 'active' ORDER BY id
  `)
    .all();

  console.log(`  ${sites.length} active sites to process\n`);

  let spammed = 0;
  let lowQuality = 0;
  let good = 0;

  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    console.log(
      `  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sites.length / batchSize)} (${batch.length} sites)`
    );

    for (const site of batch) {
      try {
        const scores = scoreQuality(site);
        const cq = scores.contentQuality;

        updateSite.run(
          scores.spamScore,
          scores.qualityScore,
          cq.flesch_reading_ease,
          cq.flesch_kincaid_grade,
          cq.freshness_score,
          cq.readability_score,
          cq.simhash,
          site.id
        );

        if (scores.spamScore >= 0.7) spammed++;
        else if (scores.qualityScore < 0.4) lowQuality++;
        else good++;
      } catch (e) {
        console.log(`    ⚠️ Error scoring ${site.domain}: ${e.message}`);
      }
    }
  }

  console.log(`\n✅ Backfill complete:`);
  console.log(`   Good (quality ≥ 0.4, spam < 0.7): ${good}`);
  console.log(`   Low quality (quality < 0.4): ${lowQuality}`);
  console.log(`   Spam (score ≥ 0.7): ${spammed}`);

  db.close();
}

if (require.main === module) {
  backfill(50);
  console.log('\nDone.');
}

module.exports = { backfill };
