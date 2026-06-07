/**
 * Bulk DNS Discovery for Lexicon Entries across multiple TLDs
 * Checks which lexicon entry domains resolve via DNS across common TLDs,
 * queues the resolvable ones for crawling.
 */
const Database = require('better-sqlite3');
const path = require('path');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// NOTE: Unicode domains are primarily available in .com (and to a lesser extent .net/.org).
// Most other TLDs do not support IDN registration. We check .com/.net/.org for actual
// punycode domains, and the rest primarily yield ASCII matches.
const TLDS = ['.net', '.org'];

const insertQueue = db.prepare(`
  INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
  VALUES (?, ?, 'dns-tld-discovery', 'pending', ?)
`);

const insertDiscovered = db.prepare(`
  INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
  VALUES (?, ?, 'dns-tld-bulk')
`);

const isIndexed = db.prepare('SELECT 1 FROM indexed_sites WHERE punycode = ? LIMIT 1');
const isQueued = db.prepare('SELECT 1 FROM crawl_queue WHERE punycode = ? LIMIT 1');

async function discoverByDnsTlds(options = {}) {
  const { batchSize = 50, concurrency = 10, maxPerTld = 100 } = options;

  console.log('🔍 Bulk DNS Discovery across TLDs\n');

  const entries = db.prepare(`
    SELECT id, ascii, unicode, pantheon, tier
    FROM entries
    WHERE ascii IS NOT NULL AND unicode IS NOT NULL
    ORDER BY tier = 'dual' DESC, tier = '1' DESC, ascii ASC
  `).all();

  const candidates = [];
  for (const e of entries) {
    for (const tld of TLDS) {
      const domain = `${e.unicode}${tld}`;
      try {
        const punycode = require('url').domainToASCII(domain);
        if (!punycode) continue;
        if (isIndexed.get(punycode)) continue;
        if (isQueued.get(punycode)) continue;
        candidates.push({ domain, punycode, entryId: e.id, pantheon: e.pantheon, tier: e.tier, tld });
      } catch {
        // skip
      }
    }
  }

  console.log(`  ${candidates.length} candidates across ${TLDS.length} TLDs\n`);

  const resolved = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(candidates.length / batchSize);
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} domains)...`);

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
      }
    }

    await sleep(500);
  }

  console.log(`\n✅ TLD DNS Discovery Complete:`);
  console.log(`   Resolved: ${resolved.length}`);
  console.log(`   Queue pending: ${db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c}`);

  db.close();
  return { resolved: resolved.length, domains: resolved.map(r => r.punycode) };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

if (require.main === module) {
  discoverByDnsTlds()
    .then(() => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch(err => {
      console.error('TLD discovery failed:', err);
      process.exit(1);
    });
}

module.exports = { discoverByDnsTlds };
