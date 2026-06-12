/**
 * Bulk Crawl Queue Processor
 * Processes domains from crawl_queue, runs the crawler, applies quality scoring.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { UnicodeCrawler } = require('../crawler');
const { scoreQuality } = require('./quality-scorer');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

async function processQueue(options = {}) {
  const {
    batchSize = 10,
    concurrency = 3,
    maxErrors = 5
  } = options;

  console.log(`🕷️ Bulk Crawl Queue Processor\n`);

  const pending = db.prepare(`
    SELECT * FROM crawl_queue 
    WHERE status = 'pending' 
    ORDER BY priority DESC, discovery_date ASC
    LIMIT ?
  `).all(batchSize);

  if (pending.length === 0) {
    console.log('Queue is empty. Nothing to crawl.');
    db.close();
    return { crawled: 0, errors: 0, spam: 0 };
  }

  console.log(`📋 Processing ${pending.length} domains from queue\n`);

  const crawler = new UnicodeCrawler(db);
  const updateQueue = db.prepare(`
    UPDATE crawl_queue 
    SET status = ?, crawl_date = datetime('now'), error_message = ?, spam_score = ?, quality_score = ?
    WHERE id = ?
  `);

  const updateSiteSpam = db.prepare(`
    UPDATE indexed_sites SET spam_score = ?, quality_score = ?,
      flesch_reading_ease = ?, flesch_kincaid_grade = ?,
      freshness_score = ?, readability_score = ?, simhash = ?
    WHERE punycode = ?
  `);

  let crawled = 0;
  let errors = 0;
  let spamCount = 0;
  let skipped = 0;

  const queue = [...pending];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      
      try {
        // Skip invalid entries
        if (!item.punycode) {
          console.log(`  ⚠️ Skipping invalid entry (no punycode): ${item.domain}`);
          updateQueue.run('error', 'invalid punycode', 0, 0, item.id);
          errors++;
          continue;
        }

        // Mark as crawling
        db.prepare("UPDATE crawl_queue SET status = 'crawling' WHERE id = ?").run(item.id);

        console.log(`  🔍 ${item.punycode}`);
        const result = await crawler.crawlDomain(item.punycode);

        if (result.status === 'error') {
          console.log(`    ❌ Error: ${result.error}`);
          updateQueue.run('error', result.error, 0, 0, item.id);
          errors++;
          continue;
        }

        if (result.status === 'unchanged') {
          console.log(`    ⏭️ Unchanged (cached)`);
          updateQueue.run('crawled', null, 0, 0, item.id);
          crawled++;
          continue;
        }

        // Quality scoring
        const site = db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(item.punycode);
        if (site) {
          const scores = scoreQuality(site);
          
          // Update site with scores
          const cq = scores.contentQuality;
          updateSiteSpam.run(
            scores.spamScore, scores.qualityScore,
            cq.flesch_reading_ease, cq.flesch_kincaid_grade,
            cq.freshness_score, cq.readability_score, cq.simhash,
            item.punycode
          );

          // Update queue
          updateQueue.run('crawled', null, scores.spamScore, scores.qualityScore, item.id);

          if (scores.spamScore >= 0.7) {
            console.log(`    🚫 Spam (${(scores.spamScore * 100).toFixed(0)}%) — ${scores.reasons.join(', ')}`);
            spamCount++;
            // Mark site as spam
            db.prepare("UPDATE indexed_sites SET status = 'spam' WHERE punycode = ?").run(item.punycode);
          } else if (scores.qualityScore < 0.2) {
            console.log(`    ⚠️ Low quality (${(scores.qualityScore * 100).toFixed(0)}%) — ${scores.reasons.join(', ')}`);
            skipped++;
          } else {
            console.log(`    ✅ Crawled — Quality: ${(scores.qualityScore * 100).toFixed(0)}%`);
            crawled++;
          }
        } else {
          updateQueue.run('crawled', null, 0, 0, item.id);
          crawled++;
        }

      } catch (e) {
        console.log(`    💥 Exception: ${e.message}`);
        updateQueue.run('error', e.message, 0, 0, item.id);
        errors++;
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n📊 Results:`);
  console.log(`   Crawled: ${crawled}`);
  console.log(`   Spam: ${spamCount}`);
  console.log(`   Low quality: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Queue remaining: ${db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c} pending`);
  console.log(`   Total indexed: ${db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get().c} active`);

  // Only close db when called directly (not from server)
  if (require.main === module) {
    db.close();
  }
  return { crawled, errors, spam: spamCount, skipped };
}

// Run if called directly
if (require.main === module) {
  const batchSize = parseInt(process.argv[2], 10) || 10;
  const concurrency = parseInt(process.argv[3], 10) || 3;

  processQueue({ batchSize, concurrency })
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Bulk crawl failed:', err);
      process.exit(1);
    });
}

module.exports = { processQueue };
