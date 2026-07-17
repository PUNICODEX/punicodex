/**
 * Deep Crawl — Follow internal links and extract sub-pages + outbound Unicode domains.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const { UnicodeCrawler } = require('../crawler');

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

async function deepCrawlAll(options = {}) {
  const { maxPages = 8, concurrency = 3 } = options;

  console.log('🔍 Deep Crawl — Following internal links + discovering outbound Unicode domains\n');

  // Get high-quality survivor sites
  const sites = db
    .prepare(`
    SELECT id, domain, punycode, title
    FROM indexed_sites
    WHERE status = 'active'
      AND (quality_score >= 0.5 OR is_flagship = 1)
      AND (word_count >= 100 OR is_flagship = 1)
    ORDER BY is_flagship DESC, quality_score DESC
  `)
    .all();

  console.log(`  ${sites.length} high-quality sites to deep crawl\n`);

  const crawler = new UnicodeCrawler(db);
  const insertQueue = db.prepare(`
    INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
    VALUES (?, ?, 'outbound-discovery', 'pending', 5)
  `);
  const insertDiscovered = db.prepare(`
    INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
    VALUES (?, ?, 'outbound-discovery')
  `);

  let totalPages = 0;
  let totalOutbound = 0;
  let totalDiscovered = 0;

  const queue = [...sites];

  const worker = async () => {
    while (queue.length > 0) {
      const site = queue.shift();
      try {
        console.log(`  🔍 ${site.punycode}`);
        const result = await crawler.deepCrawlDomain(site.punycode, maxPages);

        if (result.status === 'error') {
          console.log(`    ❌ ${result.error}`);
          continue;
        }

        console.log(
          `    ✅ ${result.pagesCrawled} sub-pages, ${result.outboundLinks} outbound links`
        );

        if (result.discovered && result.discovered.length > 0) {
          console.log(`    🌐 Discovered ${result.discovered.length} new Unicode domains:`);
          for (const d of result.discovered) {
            console.log(`       → ${d.punycode}`);
            insertQueue.run(d.domain, d.punycode);
            insertDiscovered.run(d.domain, d.punycode);
          }
        }

        totalPages += result.pagesCrawled || 0;
        totalOutbound += result.outboundLinks || 0;
        totalDiscovered += result.discoveredDomains || 0;
      } catch (e) {
        console.log(`    💥 Exception: ${e.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n✅ Deep Crawl Complete:`);
  console.log(`   Sites processed: ${sites.length}`);
  console.log(`   Sub-pages crawled: ${totalPages}`);
  console.log(`   Outbound links scanned: ${totalOutbound}`);
  console.log(`   New Unicode domains discovered: ${totalDiscovered}`);
  console.log(
    `   Queue pending: ${db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c}`
  );

  db.close();
  return { sitesProcessed: sites.length, totalPages, totalOutbound, totalDiscovered };
}

if (require.main === module) {
  deepCrawlAll({ maxPages: 8, concurrency: 3 })
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Deep crawl failed:', err);
      process.exit(1);
    });
}

module.exports = { deepCrawlAll };
