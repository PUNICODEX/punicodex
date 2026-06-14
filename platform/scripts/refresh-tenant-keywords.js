/**
 * Refresh extracted keywords for all tenants.
 *
 * Loops through active indexed_sites that have a tenant_front_url,
 * re-fetches the tenant's real website, and updates the site_keywords
 * index. This should run weekly via cron or admin trigger.
 *
 * Run:
 *   node platform/scripts/refresh-tenant-keywords.js
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { extractAndSave } = require('../api/keyword-extractor');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

async function main() {
  const sites = db
    .prepare(`
    SELECT * FROM indexed_sites
    WHERE status = 'active' AND tenant_front_url IS NOT NULL AND tenant_front_url != ''
    ORDER BY id
  `)
    .all();

  console.log(`Refreshing keywords for ${sites.length} tenant sites...\n`);

  let updated = 0;
  let failed = 0;

  for (const site of sites) {
    try {
      const keywords = await extractAndSave(site);
      console.log(`✓ ${site.domain} (${site.tenant_front_url}) → ${keywords.length} keywords`);
      updated++;
    } catch (err) {
      console.error(`✗ ${site.domain} (${site.tenant_front_url}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
