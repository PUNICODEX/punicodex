/**
 * Backfill Links — Extract link graph from already-crawled sites.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const { UnicodeCrawler } = require('../crawler');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');

async function backfillLinks(options = {}) {
  const { concurrency = 5 } = options;
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const crawler = new UnicodeCrawler(db);

  const sites = db
    .prepare(
      "SELECT id, domain, punycode FROM indexed_sites WHERE status = 'active' ORDER BY is_flagship DESC, quality_score DESC"
    )
    .all();
  console.log(`🔗 Backfilling links for ${sites.length} active sites\n`);

  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO links (from_site_id, to_site_id, from_url, to_url, anchor_text, nofollow)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const queue = [...sites];
  let processed = 0;
  let totalLinks = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const site = queue.shift();
      try {
        const homeFetch = await crawler.fetchPage(`https://${site.punycode}`, 6000);
        if (!homeFetch) {
          console.log(`  ❌ ${site.punycode} — fetch failed`);
          continue;
        }

        // Clear old links for this site
        db.prepare('DELETE FROM links WHERE from_site_id = ?').run(site.id);

        const base = new URL(homeFetch.url);
        const links = crawler.extractLinks(homeFetch.html, base);

        const seenTargets = new Set();
        let stored = 0;

        for (const link of links.linkObjects || []) {
          if (!link.isExternal) continue;
          if (link.nofollow) continue;
          if (seenTargets.has(link.hostname)) continue;
          seenTargets.add(link.hostname);

          const target = db
            .prepare('SELECT id FROM indexed_sites WHERE punycode = ? OR domain = ?')
            .get(link.hostname, link.hostname);
          if (!target) continue;

          insertLink.run(site.id, target.id, homeFetch.url, link.url, link.text || '', 0);
          stored++;
        }

        totalLinks += stored;
        processed++;
        if (processed % 50 === 0) {
          console.log(`  ... ${processed}/${sites.length} sites, ${totalLinks} links stored`);
        }
      } catch (e) {
        console.log(`  💥 ${site.punycode} — ${e.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  // Update incoming_links counts
  db.prepare(`
    UPDATE indexed_sites SET incoming_links = (
      SELECT COUNT(*) FROM links WHERE to_site_id = indexed_sites.id AND nofollow = 0
    )
  `).run();

  console.log(`\n✅ Backfill complete:`);
  console.log(`   Sites processed: ${processed}`);
  console.log(`   Links stored: ${totalLinks}`);

  db.close();
}

if (require.main === module) {
  backfillLinks({ concurrency: 5 })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}

module.exports = { backfillLinks };
