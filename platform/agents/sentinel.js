/**
 * Availability Sentinel — re-checks availability rows via DNS and updates status.
 */
const dns = require('node:dns');
const { promisify } = require('node:util');
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const dnsLookup = promisify(dns.lookup);
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
  } catch (_e) {}
}

async function checkDomain(domain) {
  try {
    await dnsLookup(domain);
    return 'registered';
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return 'available';
    return 'unknown';
  }
}

async function verifyAvailability(batchSize = 50) {
  const db = getDb();
  const rows = db
    .prepare('SELECT entry_id, domain FROM availability ORDER BY last_checked ASC LIMIT ?')
    .all(batchSize);
  const results = [];
  for (const row of rows) {
    const status = await checkDomain(row.domain);
    db.prepare(
      "UPDATE availability SET status = ?, last_checked = datetime('now') WHERE entry_id = ?"
    ).run(status, row.entry_id);
    results.push({ entryId: row.entry_id, domain: row.domain, status });
  }
  log('sentinel', 'verify', null, { checked: results.length });
  return results;
}

module.exports = { verifyAvailability, checkDomain };
