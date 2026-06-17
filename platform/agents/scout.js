/**
 * Crawler Scout Agent — discovers new xn-- domains from CT logs and outbound links.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function log(agent, action, target, result) {
  try {
    getDb()
      .prepare('INSERT INTO agent_activity_log (agent, action, target, result) VALUES (?, ?, ?, ?)')
      .run(agent, action, target || null, JSON.stringify(result || {}));
  } catch (_e) {
    // Logging failures are non-fatal
  }
}

/**
 * Score a candidate domain for queueing.
 */
function scoreCandidate(domain) {
  let score = 0;
  if (domain.startsWith('xn--')) score += 3;
  if (/^xn--[a-z0-9]+/.test(domain)) score += 1;
  if (domain.endsWith('.com')) score += 1;
  return score;
}

/**
 * Discover candidates from a list of domains (e.g. CT log dump or outbound links).
 */
function discoverCandidates(domains) {
  const db = getDb();
  const candidates = [];
  for (const domain of domains) {
    const d = domain.trim().toLowerCase();
    if (!d?.startsWith('xn--')) continue;
    const score = scoreCandidate(d);
    if (score < 3) continue;
    candidates.push({ domain: d, score });
  }

  const queued = [];
  for (const c of candidates) {
    try {
      db.prepare(
        'INSERT OR IGNORE INTO discovered_domains (domain, punycode, source) VALUES (?, ?, ?)'
      ).run(c.domain, c.domain, 'scout-agent');
      db.prepare(
        "INSERT OR IGNORE INTO crawl_queue (domain, status, priority) VALUES (?, 'pending', ?)"
      ).run(c.domain, c.score);
      queued.push(c.domain);
    } catch (_e) {
      // Continue on conflict
    }
  }

  log('scout', 'discover', null, { discovered: candidates.length, queued: queued.length });
  return { discovered: candidates.length, queued: queued.length, domains: queued };
}

module.exports = { discoverCandidates, scoreCandidate };
