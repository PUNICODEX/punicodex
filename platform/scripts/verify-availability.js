/**
 * Availability Verification
 *
 * Re-checks availability rows against live DNS.
 * Updates status to 'registered', 'available', or 'unknown'.
 */
const Database = require('better-sqlite3');
const dns = require('node:dns');
const { promisify } = require('node:util');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const dnsLookup = promisify(dns.lookup);

const CONCURRENCY = 10;

async function verifyAvailability(options = {}) {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const maxAgeHours = options.maxAgeHours || 24;
  const limit = options.limit || 1000;

  const rows = db
    .prepare(
      `
      SELECT entry_id, domain, punycode, status
      FROM availability
      WHERE status = 'available'
        AND (last_checked IS NULL OR last_checked < datetime('now', ?))
      ORDER BY last_checked ASC NULLS FIRST
      LIMIT ?
    `
    )
    .all(`-${maxAgeHours} hours`, limit);

  console.log(`🔍 Verifying ${rows.length} availability rows...`);

  const updateStmt = db.prepare(
    `UPDATE availability SET status = ?, last_checked = datetime('now') WHERE entry_id = ?`
  );

  let available = 0;
  let registered = 0;
  let unknown = 0;

  const queue = [...rows];

  const worker = async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      let status = 'unknown';
      try {
        await dnsLookup(row.punycode);
        status = 'registered';
      } catch (err) {
        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
          status = 'available';
        } else {
          status = 'unknown';
        }
      }

      updateStmt.run(status, row.entry_id);

      if (status === 'available') available++;
      else if (status === 'registered') registered++;
      else unknown++;
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`✅ Verification complete:`);
  console.log(`   Available: ${available}`);
  console.log(`   Registered: ${registered}`);
  console.log(`   Unknown: ${unknown}`);

  db.close();
  return { checked: rows.length, available, registered, unknown };
}

if (require.main === module) {
  const maxAgeHours = parseInt(process.argv[2], 10) || 24;
  const limit = parseInt(process.argv[3], 10) || 1000;

  verifyAvailability({ maxAgeHours, limit })
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}

module.exports = { verifyAvailability };
