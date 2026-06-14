/**
 * Domain Discovery via Certificate Transparency Logs
 * Queries crt.sh for recent certificates and extracts xn-- (punycode) domains.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const { URL } = require('node:url');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

// Prepared statements
const insertDiscovered = db.prepare(`
  INSERT INTO discovered_domains (domain, punycode, source, ct_log_id, cert_issuer)
  VALUES (?, ?, 'ct-log', ?, ?)
  ON CONFLICT(domain) DO UPDATE SET
    last_seen = datetime('now'),
    ct_log_id = excluded.ct_log_id,
    cert_issuer = excluded.cert_issuer
`);

const insertQueue = db.prepare(`
  INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
  VALUES (?, ?, 'ct-log', 'pending', ?)
`);

const isIndexed = db.prepare('SELECT 1 FROM indexed_sites WHERE punycode = ? LIMIT 1');
const isQueued = db.prepare('SELECT 1 FROM crawl_queue WHERE punycode = ? LIMIT 1');

async function discoverFromCtLogs(options = {}) {
  const { days = 1, concurrency: _concurrency = 5, maxDomains = 1000 } = options;

  console.log(`🔍 Discovering Unicode domains from CT logs (last ${days} days)...\n`);

  const discovered = [];
  const seen = new Set();

  // crt.sh query: search for certificates issued in last N days
  // We use a broad query and filter for xn-- domains
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);
  const _afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '');

  const urls = [
    `https://crt.sh/?q=%25.com&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.de&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.net&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.org&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.fr&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.jp&exclude=expired&deduplicate=Y&output=json`,
    `https://crt.sh/?q=%25.uk&exclude=expired&deduplicate=Y&output=json`,
  ];

  for (const url of urls) {
    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
      try {
        console.log(`  Fetching: ${url.split('?')[1]}... (retry ${4 - retries}/3)`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const resp = await fetch(url, {
          headers: { Accept: 'application/json', 'User-Agent': 'PUNYCODEX-Discovery/1.0' },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          if (resp.status === 502 || resp.status === 503 || resp.status === 429) {
            retries--;
            if (retries > 0) {
              const delay = (4 - retries) * 5000;
              console.log(`    ⚠️ HTTP ${resp.status}, retrying in ${delay / 1000}s...`);
              await sleep(delay);
              continue;
            }
          }
          console.log(`    ⚠️ HTTP ${resp.status}, skipping`);
          break;
        }

        const entries = await resp.json();
        console.log(`    📄 ${entries.length} certificate entries`);
        success = true;

        for (const entry of entries) {
          // Extract domain names from certificate
          const names = [];
          if (entry.name_value) {
            names.push(
              ...entry.name_value
                .split('\n')
                .map((n) => n.trim())
                .filter(Boolean)
            );
          }
          if (entry.common_name && !names.includes(entry.common_name)) {
            names.push(entry.common_name);
          }

          for (const name of names) {
            // Filter for Unicode/punycode domains
            const cleanName = name
              .toLowerCase()
              .replace(/^\*\./, '')
              .replace(/^www\./, '');

            // Skip if already seen
            if (seen.has(cleanName)) continue;
            seen.add(cleanName);

            // Check if it's a punycode domain
            let punycode = null;
            let unicode = null;

            if (cleanName.startsWith('xn--')) {
              punycode = cleanName;
              try {
                unicode = new URL(`http://${cleanName}`).hostname;
              } catch {
                unicode = cleanName;
              }
            } else {
              // Check if ASCII version is different (Unicode domain)
              try {
                const ascii = new URL(`http://${cleanName}`).hostname;
                if (ascii !== cleanName) {
                  punycode = ascii;
                  unicode = cleanName;
                }
              } catch {
                // Invalid URL, skip
                continue;
              }
            }

            if (!punycode?.startsWith('xn--')) continue;

            // Skip if already indexed or queued
            if (isIndexed.get(punycode)) continue;
            if (isQueued.get(punycode)) continue;

            // Skip subdomains (keep only apex)
            const apex = punycode.split('.').slice(-2).join('.');
            if (apex !== punycode) continue;

            discovered.push({
              domain: unicode || punycode,
              punycode,
              ctLogId: String(entry.id || ''),
              issuer: entry.issuer_name || '',
            });

            if (discovered.length >= maxDomains) break;
          }

          if (discovered.length >= maxDomains) break;
        }

        // Rate limit between requests
        await sleep(5000);
      } catch (e) {
        retries--;
        if (retries > 0) {
          const delay = (4 - retries) * 5000;
          console.log(`    ⚠️ Error: ${e.message}, retrying in ${delay / 1000}s...`);
          await sleep(delay);
        } else {
          console.log(`    ⚠️ Error: ${e.message}, skipping`);
        }
      }
    }
  }

  console.log(`\n✅ Discovered ${discovered.length} new Unicode domains`);

  // Store in database
  let addedDiscovered = 0;
  let addedQueue = 0;

  const txn = db.transaction((domains) => {
    for (const d of domains) {
      try {
        insertDiscovered.run(d.domain, d.punycode, d.ctLogId, d.issuer);
        addedDiscovered++;

        const result = insertQueue.run(d.domain, d.punycode, 0);
        if (result.changes > 0) addedQueue++;
      } catch (_e) {
        // Duplicate or error, skip
      }
    }
  });

  txn(discovered);

  console.log(`📥 Stored: ${addedDiscovered} discovered, ${addedQueue} queued for crawling`);
  console.log(
    `📊 Queue status: ${db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c} pending`
  );

  db.close();
  return { discovered: discovered.length, addedDiscovered, addedQueue };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Run if called directly
if (require.main === module) {
  const days = parseInt(process.argv[2], 10) || 1;
  const maxDomains = parseInt(process.argv[3], 10) || 1000;

  discoverFromCtLogs({ days, maxDomains })
    .then((_stats) => {
      console.log('\nDone.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Discovery failed:', err);
      process.exit(1);
    });
}

module.exports = { discoverFromCtLogs };
