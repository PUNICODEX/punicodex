/**
 * PuniCodex — Brand Identity Import Script
 *
 * Reads platform/db/seeds/brand-identities.json and upserts every brand/trademark
 * identity into the canonical identity kernel via registerIdentity().
 *
 * Idempotent: safe to run multiple times; existing identities are skipped.
 */

const fs = require('node:fs');
const path = require('node:path');
const { migrateIdentities } = require('../platform/db/migrate-identities');
const { registerIdentity, resetCache, loadIdentities } = require('../platform/api/identity-kernel');

const SEED_PATH = path.join(__dirname, '..', 'platform', 'db', 'seeds', 'brand-identities.json');

function main() {
  if (!fs.existsSync(SEED_PATH)) {
    console.error(`Brand identity seed not found: ${SEED_PATH}`);
    process.exit(1);
  }

  // Ensure tables exist before registering identities.
  migrateIdentities();

  const seeds = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const existingIds = new Set(loadIdentities().map((i) => i.id));
  let imported = 0;
  let skipped = 0;

  for (const identity of seeds) {
    if (existingIds.has(identity.id)) {
      skipped++;
      continue;
    }
    registerIdentity(identity);
    existingIds.add(identity.id);
    imported++;
  }

  resetCache();
  console.log(`Brand identity import complete: ${imported} imported, ${skipped} skipped.`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
