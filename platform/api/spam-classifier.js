/**
 * PUNYCODEX — Spam Classifier
 *
 * Explainable heuristic classifier for indexed sites. Computes a spam score
 * (0–1) and a list of signals, then writes them back to indexed_sites.
 *
 * A site is considered spam if spam_score >= SPAM_THRESHOLD (0.7). Search
 * results filter these by default.
 */

const Database = require('better-sqlite3');
const { scoreQuality } = require('../scripts/quality-scorer');
const { getDbPath } = require('../db/db');

const SPAM_THRESHOLD = 0.7;

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function parseJson(json, fallback = null) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Classify a site by its indexed_sites row id or punycode.
 * Returns { spamScore, qualityScore, signals, isSpam } and updates the DB.
 */
function classifySite(identifier) {
  const db = getDb();
  const row =
    typeof identifier === 'number'
      ? db.prepare('SELECT * FROM indexed_sites WHERE id = ?').get(identifier)
      : db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(identifier);

  if (!row) return null;

  const { spamScore, qualityScore, reasons } = scoreQuality(row);
  const signals = reasons.map((r) => ({ signal: r, weight: 0.1 }));
  const isSpam = spamScore >= SPAM_THRESHOLD;
  const status = isSpam ? 'spam' : row.status === 'spam' ? 'active' : row.status;

  db.prepare(
    `UPDATE indexed_sites SET spam_score = ?, quality_score = ?, spam_signals = ?, status = ? WHERE id = ?`
  ).run(spamScore, qualityScore, JSON.stringify(signals), status, row.id);

  return {
    id: row.id,
    domain: row.domain,
    punycode: row.punycode,
    spamScore,
    qualityScore,
    signals,
    isSpam,
    status,
  };
}

/**
 * List sites flagged as spam with optional review status.
 */
function listSpamSites({ limit = 50, offset = 0 } = {}) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT id, domain, punycode, title, spam_score, quality_score, spam_signals, status, last_crawled
      FROM indexed_sites
      WHERE status = 'spam' OR spam_score >= ?
      ORDER BY spam_score DESC, last_crawled DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(SPAM_THRESHOLD, limit, offset)
    .map(enrich);
}

/**
 * Mark a site as spam or ham (not spam).
 */
function setSiteSpam(punycode, isSpam, note = null) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(punycode);
  if (!row) return null;

  const status = isSpam ? 'spam' : 'active';
  const signals = parseJson(row.spam_signals, []);
  if (note) {
    signals.push({ signal: `manual:${isSpam ? 'spam' : 'ham'}`, weight: 1.0, note });
  }

  db.prepare(
    `UPDATE indexed_sites SET status = ?, spam_score = ?, spam_signals = ? WHERE id = ?`
  ).run(status, isSpam ? 1.0 : 0.0, JSON.stringify(signals), row.id);

  return { punycode, status, isSpam };
}

function enrich(row) {
  return {
    id: row.id,
    domain: row.domain,
    punycode: row.punycode,
    title: row.title,
    spamScore: row.spam_score,
    qualityScore: row.quality_score,
    signals: parseJson(row.spam_signals, []),
    status: row.status,
    lastCrawled: row.last_crawled,
  };
}

module.exports = {
  SPAM_THRESHOLD,
  classifySite,
  listSpamSites,
  setSiteSpam,
};
