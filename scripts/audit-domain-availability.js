/**
 * PUNYCODEX — Bulk domain availability audit
 *
 * Checks the .com status for every lexicon entry and writes a JSON snapshot.
 * Uses punycode for non-ASCII Unicode names.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const { LEXICON } = require('../type/js/lexicon.js');
const { checkDomain } = require('../platform/api/availability-checker.js');

const OUT_PATH = process.argv[2] || path.join(__dirname, '..', 'data', 'domain-availability.json');
const CONCURRENCY = Number(process.argv[3]) || 5;
const DELAY_MS = Number(process.argv[4]) || 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPunycodeDomain(unicode) {
  const display = `${unicode.toLowerCase()}.com`;
  const ascii = domainToASCII(display);
  return ascii === display ? display : ascii;
}

async function main() {
  const domains = [];
  const byDomain = new Map();

  for (const entry of LEXICON) {
    const domain = getPunycodeDomain(entry.unicode);
    domains.push(domain);
    byDomain.set(domain, entry.id);
  }

  console.log(
    `Checking ${domains.length} .com domains with Verisign RDAP (concurrency ${CONCURRENCY}, delay ${DELAY_MS}ms)...`
  );

  const results = [];
  let completed = 0;

  async function processOne(domain) {
    const result = await checkDomain(domain, { whoisRdap: true });
    completed++;
    const id = byDomain.get(domain);
    console.log(`[${completed}/${domains.length}] ${id} → ${domain} :: ${result.status} (${result.details})`);
    return { domain, ...result };
  }

  for (let i = 0; i < domains.length; i += CONCURRENCY) {
    const batch = domains.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
    if (i + CONCURRENCY < domains.length) {
      await sleep(DELAY_MS);
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    count: results.length,
    statuses: {
      available: results.filter((r) => r.status === 'available').length,
      registered: results.filter((r) => r.status === 'registered').length,
      live: results.filter((r) => r.status === 'live').length,
      unknown: results.filter((r) => r.status === 'unknown').length,
    },
    entries: Object.fromEntries(
      results.map((r) => {
        const id = byDomain.get(r.domain);
        return [id, { ...r }];
      })
    ),
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\nWrote availability snapshot to ${OUT_PATH}`);
  console.log(snapshot.statuses);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
