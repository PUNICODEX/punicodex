/**
 * PUNICODEX — Event-driven Crawler Service
 *
 * Receives domain-change events (webhooks, CT logs, DNS changes) and enqueues
 * them for crawling. The processor consumes pending events, runs the existing
 * UnicodeCrawler, and records outcomes.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { UnicodeCrawler } = require('../crawler');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Enqueue a crawl event.
 */
function enqueueEvent({ source, domain, punycode, eventType = 'update', payload, priority = 5 }) {
  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO crawl_events (source, domain, punycode, event_type, payload, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      source,
      domain,
      punycode || null,
      eventType,
      payload ? JSON.stringify(payload) : null,
      priority
    );
  return result.lastInsertRowid;
}

/**
 * List pending events.
 */
function listPendingEvents({ limit = 50 } = {}) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT * FROM crawl_events
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT ?
    `
    )
    .all(limit);
}

/**
 * Mark an event as processing, done, or failed.
 */
function updateEventStatus(id, status, error = null) {
  const db = getDb();
  db.prepare(
    `
      UPDATE crawl_events
      SET status = ?, attempts = attempts + 1, error = ?, processed_at = datetime('now')
      WHERE id = ?
    `
  ).run(status, error || null, id);
}

/**
 * Process a single event by crawling its domain.
 */
async function processEvent(event) {
  const db = getDb();
  const crawler = new UnicodeCrawler(db);
  const domain = event.domain;

  updateEventStatus(event.id, 'processing');

  try {
    const result = await crawler.crawlDomain(domain);
    updateEventStatus(event.id, 'done');
    return { success: true, result };
  } catch (err) {
    const message = err.message || String(err);
    updateEventStatus(event.id, 'failed', message);
    return { success: false, error: message };
  }
}

/**
 * Process a batch of pending events.
 */
async function processPendingEvents({ limit = 10 } = {}) {
  const events = listPendingEvents({ limit });
  const results = [];
  for (const event of events) {
    results.push(await processEvent(event));
  }
  return results;
}

module.exports = {
  enqueueEvent,
  listPendingEvents,
  updateEventStatus,
  processEvent,
  processPendingEvents,
};
