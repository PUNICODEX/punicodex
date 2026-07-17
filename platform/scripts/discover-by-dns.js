/**
 * Bulk DNS Discovery for Lexicon Entries
 * Checks which lexicon entry .com domains resolve via DNS,
 * queues the resolvable ones for crawling.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const dns = require('node:dns');
const { promisify } = require('node:util');

const dnsLookup = promisify(dns.lookup);

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const insertQueue = db.prepare(`
  INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
  VALUES (?, ?, 'dns-discovery', 'pending', ?)
`);

const insertDiscovered = db.prepare(`
  INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
  VALUES (?, ?, 'dns-bulk')
`);

const isIndexed = db.prepare('SELECT 1 FROM indexed_sites WHERE punycode = ? LIMIT 1');
const isQueued = db.prepare('SELECT 1 FROM crawl_queue WHERE punycode = ? LIMIT 1');

async function discoverByDns(options = {}) {
  const { batchSize = 50, concurrency: _concurrency = 10 } = options;

  console.log('🔍 Bulk DNS Discovery for Lexicon Entries\n');

  // Get all entries with their Unicode .com domain
  const entries = db
    .prepare(`
    SELECT id, ascii, unicode, pantheon, tier
    FROM entries
    WHERE ascii IS NOT NULL AND unicode IS NOT NULL
    ORDER BY tier = 'dual' DESC, tier = '1' DESC, ascii ASC
  `)
    .all();

  console.log(`  Checking ${entries.length} entries...`);

  const candidates = [];
  for (const e of entries) {
    const domain = `${e.unicode}.com`;
    try {
      const punycode = require('node:url').domainToASCII(domain);
      if (!punycode) continue;
      if (isIndexed.get(punycode)) continue;
      if (isQueued.get(punycode)) continue;
      candidates.push({ domain, punycode, entryId: e.id, pantheon: e.pantheon, tier: e.tier });
    } catch {
      // skip invalid
    }
  }

  console.log(`  ${candidates.length} candidates not yet indexed/queued\n`);

  const resolved = [];
  const errors = [];

  // Process in batches
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    console.log(
      `  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)} (${batch.length} domains)...`
    );

    const batchPromises = batch.map(async (c) => {
      try {
        await dnsLookup(c.punycode, { family: 4, timeout: 5000 });
        return { ...c, status: 'resolved' };
      } catch {
        try {
          await dnsLookup(c.punycode, { family: 6, timeout: 5000 });
          return { ...c, status: 'resolved' };
        } catch {
          return { ...c, status: 'unresolved' };
        }
      }
    });

    const results = await Promise.all(batchPromises);

    for (const r of results) {
      if (r.status === 'resolved') {
        resolved.push(r);
        const priority = r.tier === 'dual' ? 10 : r.tier === '1' ? 5 : r.tier === '2' ? 3 : 1;
        insertQueue.run(r.domain, r.punycode, priority);
        insertDiscovered.run(r.domain, r.punycode);
      } else {
        errors.push(r);
      }
    }

    // Small delay between batches to be polite to DNS
    await sleep(500);
  }

  console.log(`\n✅ DNS Discovery Complete:`);
  console.log(`   Resolved: ${resolved.length}`);
  console.log(`   Unresolved: ${errors.length}`);
  console.log(
    `   Queue pending: ${db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c}`
  );
  console.log(
    `   Total discovered: ${db.prepare('SELECT COUNT(*) as c FROM discovered_domains').get().c}`
  );

  db.close();
  return {
    resolved: resolved.length,
    unresolved: errors.length,
    domains: resolved.map((r) => r.punycode),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (require.main === module) {
  discoverByDns()
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('DNS discovery failed:', err);
      process.exit(1);
    });
}

module.exports = { discoverByDns };
