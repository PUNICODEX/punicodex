/**
 * PUNICODEX — Bulk Availability Check
 * Corrects punycodes and checks actual domain status for all entries.
 * Run: node platform/scripts/check-all-availability.js
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const { domainToASCII } = require('node:url');
const { checkBulk } = require('../api/availability-checker');

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    punycode TEXT NOT NULL,
    status TEXT DEFAULT 'unknown' CHECK (status IN ('available', 'registered', 'live', 'unknown')),
    registrar_links TEXT,
    last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );
`);

function generateRegistrarLinks(punycode) {
  const clean = punycode.replace(/^www\./, '');
  return JSON.stringify({
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(clean)}`,
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(clean)}`,
    porkbun: `https://porkbun.com/checkout/search?q=${encodeURIComponent(clean)}`,
    dynadot: `https://www.dynadot.com/domain/search.html?domain=${encodeURIComponent(clean)}`,
    spaceship: `https://spaceship.com/domains/?query=${encodeURIComponent(clean)}`,
  });
}

async function main() {
  console.log('═══ PUNICODEX Domain Availability Audit ═══\n');

  const entries = db.prepare('SELECT id, ascii, unicode FROM entries').all();
  console.log(`Checking ${entries.length} domains...\n`);

  const checks = entries.map((e) => {
    const unicodeDomain = `${e.unicode}.com`;
    const punycode = domainToASCII(unicodeDomain);
    return {
      entryId: e.id,
      domain: unicodeDomain,
      punycode,
    };
  });

  const domains = checks.map((c) => c.punycode);
  const results = await checkBulk(domains, 10, (done, total, domain, result) => {
    process.stdout.write(
      `\r  Checked ${done}/${total} — ${result.status.toUpperCase().padEnd(12)} ${domain}`
    );
  });

  console.log('\n\n');

  const updateStmt = db.prepare(`
    INSERT OR REPLACE INTO availability
    (entry_id, domain, punycode, status, registrar_links, last_checked)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const stats = { live: 0, registered: 0, available: 0, unknown: 0 };

  db.transaction(() => {
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      const result = results[i];
      stats[result.status]++;

      updateStmt.run(
        check.entryId,
        check.domain,
        check.punycode,
        result.status,
        generateRegistrarLinks(check.punycode)
      );
    }
  })();

  console.log('═══ Results ═══');
  console.log(`  Live sites:      ${stats.live}`);
  console.log(`  Registered:      ${stats.registered}`);
  console.log(`  Available:       ${stats.available}`);
  console.log(`  Unknown:         ${stats.unknown}`);
  console.log(`  ─────────────────`);
  console.log(`  Total:           ${entries.length}`);
  console.log('\nDatabase updated.');

  db.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
