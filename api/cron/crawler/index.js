/**
 * PUNICODEX Crawler Cron
 *
 * Idempotent, small-batched cron endpoint for Vercel.
 * Finds stale indexed sites and adds them to the crawl_queue.
 * Heavy queue processing is handled separately by admin-triggered
 * `api/crawler/queue/process` or CLI `platform/scripts/bulk-crawl.js`.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../../../platform/db/db');
const { runCron } = require('../_utils');

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_STALE_DAYS = 7;

function openDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

module.exports = runCron('cron/crawler', { ttlMinutes: 30, nextRun: '6 hours' })(async (req) => {
  const db = openDb();
  try {
    const batchSize = Math.min(
      Number.isNaN(parseInt(req.query?.batchSize, 10))
        ? DEFAULT_BATCH_SIZE
        : parseInt(req.query?.batchSize, 10),
      100
    );
    const staleDays = Number.isNaN(parseInt(req.query?.staleDays, 10))
      ? DEFAULT_STALE_DAYS
      : parseInt(req.query?.staleDays, 10);

    // Select the stalest active sites first, including those never crawled.
    const staleSites = db
      .prepare(
        `
        SELECT domain, punycode FROM indexed_sites
        WHERE status = 'active'
          AND (
            last_crawled IS NULL
            OR next_crawl_after IS NULL
            OR next_crawl_after < datetime('now')
            OR last_crawled < datetime('now', ?)
          )
        ORDER BY COALESCE(last_crawled, '1970-01-01') ASC
        LIMIT ?
      `
      )
      .all(`-${staleDays} days`, batchSize);

    const queueStmt = db.prepare(
      `INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
       VALUES (?, ?, ?, 'pending', ?)`
    );

    let enqueued = 0;
    for (const site of staleSites) {
      const info = queueStmt.run(site.domain, site.punycode, 'cron-stale', 10);
      if (info.changes > 0) enqueued++;
    }

    return { scanned: staleSites.length, enqueued, staleDays, batchSize };
  } finally {
    try {
      db.close();
    } catch (_e) {
      // ignore
    }
  }
});
