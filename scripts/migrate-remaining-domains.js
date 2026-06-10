// Migrate the remaining stale domains to punycodex-main
const { execSync } = require('child_process');

const remaining = [
  { domain: 'xn--gaa-wma.com', project: 'punycodex-gaia' },
  { domain: 'xn--dinysos-m0a.com', project: 'punycodex-dionysos' },
  { domain: 'xn--seln-dvab.com', project: 'punycodex-selene' },
  { domain: 'xn--dmtr-bvabb.com', project: 'punycodex-demeter' },
  { domain: 'xn--aphrodt-dza75a.com', project: 'punycodex-aphrodite' },
  { domain: 'xn--iva-bza.com', project: 'shiva' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function migrate() {
  for (const { domain, project } of remaining) {
    process.stdout.write(`\n[${domain}] `);
    try {
      process.stdout.write(`removing... `);
      execSync(`vercel domains rm "${domain}" --yes --no-color 2>&1`, {
        encoding: 'utf-8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe']
      });
      process.stdout.write(`done. `);
      await sleep(3000);

      process.stdout.write(`adding to main... `);
      execSync(`vercel domains add -- "${domain}" --no-color 2>&1`, {
        encoding: 'utf-8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe']
      });
      process.stdout.write(`OK\n`);
      await sleep(3000);
    } catch (err) {
      const msg = (err.message || '').substring(0, 150);
      process.stdout.write(`FAIL: ${msg}\n`);
      await sleep(3000);
    }
  }
  console.log('\nDone.');
}

migrate().catch(console.error);
