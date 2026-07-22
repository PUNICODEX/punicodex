/**
 * Production smoke checks — synthetic monitoring for punicodex.com.
 *
 * Hits the live site and asserts HTTP statuses plus a few content markers that
 * prove each subsystem deployed correctly (not just "a page loads"). Run after
 * every production deploy:
 *
 *   node scripts/smoke-production.js [baseUrl]
 *
 * Defaults to https://punicodex.com. Exits non-zero on any failure. Not part
 * of npm test (requires network); intended for deploy verification and cron.
 */

const BASE = (process.argv[2] || 'https://punicodex.com').replace(/\/$/, '');

const CHECKS = [
  // Core pages
  { path: '/', status: 200, markers: ['927', 'PUNICODEX'] },
  { path: '/pantheon/', status: 200, markers: ['266'] },
  { path: '/lexicon/', status: 200, markers: ['927'] },
  { path: '/blog/', status: 200, markers: ['pantheon', 'scholarly'] },
  { path: '/herald/', status: 200, markers: ['Unicode Herald'] },
  { path: '/store/', status: 200, markers: ['product'] },
  { path: '/search.html', status: 200, markers: ['search'] },
  { path: '/authenticity/', status: 200, markers: ['Authenticity'] },
  { path: '/appraise/', status: 200, markers: [] },
  { path: '/type/', status: 200, markers: [] },
  { path: '/contact/', status: 200, markers: ['contact'] },
  // Subsystems shipped 2026-07
  { path: '/account/', status: 200, markers: ['Account Portal', 'Set Your Password'] },
  { path: '/admin-portal/', status: 200, markers: [] },
  { path: '/admin-portal/requests/', status: 200, markers: [] },
  { path: '/admin-portal/newsletter/', status: 200, markers: [] },
  { path: '/admin-portal/merch/', status: 200, markers: [] },
  { path: '/scholars/', status: 200, markers: [] },
  { path: '/creatives/', status: 200, markers: ['Creative'] },
  // Temple spot checks (content accuracy + taxonomy correctness)
  { path: '/sites/zeus/', status: 200, markers: ['Zeús'] },
  { path: '/sites/zeus/script.js', status: 200, markers: ['creative_webp_path'] },
  { path: '/sites/baiame/', status: 200, markers: ['Aboriginal'] },
  { path: '/sites/hanuman/blog/', status: 200, markers: ['Chiranjivi'] },
  { path: '/sites/athena/', status: 200, markers: ['Athēnâ'] },
  { path: '/sites/sekhmet/lore/', status: 200, markers: ['Extended Lore'] },
  // API surface
  { path: '/api/stats/', status: 200, markers: ['"total":927', '"flagships":266'], json: true },
  { path: '/api/slots/', status: 200, markers: ['"slots"'], json: true },
  { path: '/api/v1/pantheons/', status: 200, markers: ['"count":25'], json: true },
  { path: '/api/store/products/', status: 200, markers: ['"success":true'], json: true },
  { path: '/api/v1/version/', status: 200, markers: ['"version"'], json: true },
  { path: '/api/newsletter/subscribe/', status: 405, markers: [] }, // GET refused
  { path: '/api/contact/', status: 405, markers: [] }, // GET refused
];

let failed = 0;

async function check({ path, status, markers }) {
  const url = `${BASE}${path}`;
  let code = 0;
  let body = '';
  try {
    const res = await fetch(url, { redirect: 'follow' });
    code = res.status;
    body = await res.text();
  } catch (err) {
    console.error(`  ✗ ${path} — fetch failed: ${err.message}`);
    failed++;
    return;
  }
  const problems = [];
  if (code !== status) problems.push(`status ${code} !== ${status}`);
  for (const marker of markers) {
    if (!body.includes(marker)) problems.push(`missing marker ${JSON.stringify(marker)}`);
  }
  if (problems.length) {
    failed++;
    console.error(`  ✗ ${path} — ${problems.join('; ')}`);
  } else {
    console.log(`  ✓ ${path}`);
  }
}

(async () => {
  console.log(`\n▸ Production smoke: ${BASE}\n`);
  for (const c of CHECKS) {
    // Sequential: gentle on the CDN and easy to read.
    await check(c);
  }
  console.log(
    failed === 0
      ? `\n✓ All ${CHECKS.length} production checks passed`
      : `\n✗ ${failed}/${CHECKS.length} checks FAILED`
  );
  process.exit(failed > 0 ? 1 : 0);
})();
