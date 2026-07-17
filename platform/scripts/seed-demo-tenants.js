/**
 * Seed Demo Tenants
 *
 * Assigns fictional but archetype-aligned tenants to a curated set of
 * flagship domains so the search engine has real tenant cards to rank and
 * display before paid tenants arrive.
 *
 * This is idempotent: running it again updates the same tenant records.
 * Use --remove to clear demo tenants.
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const { scoreArchetype } = require('../api/archetype-scorer');

const DB_PATH = path.join(__dirname, '..', 'db', 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const DEMO_TENANTS = [
  {
    entryId: 'hermes',
    companyName: 'Mercury Logistics',
    category: 'logistics',
    frontUrl: 'https://mercury-logistics.example',
  },
  {
    entryId: 'athena',
    companyName: 'Strategos AI',
    category: 'technology',
    frontUrl: 'https://strategos-ai.example',
  },
  {
    entryId: 'poseidon',
    companyName: 'Neptune Marine',
    category: 'maritime',
    frontUrl: 'https://neptune-marine.example',
  },
  {
    entryId: 'hekate',
    companyName: 'Hecate Security',
    category: 'security',
    frontUrl: 'https://hecate-security.example',
  },
  {
    entryId: 'apollo',
    companyName: 'Phoebus Analytics',
    category: 'technology',
    frontUrl: 'https://phoebus-analytics.example',
  },
  {
    entryId: 'aphrodite',
    companyName: 'Aphrodite Beauty',
    category: 'beauty',
    frontUrl: 'https://aphrodite-beauty.example',
  },
  {
    entryId: 'ares',
    companyName: 'Ares Defense Systems',
    category: 'security',
    frontUrl: 'https://ares-defense.example',
  },
  {
    entryId: 'demeter',
    companyName: 'Demeter AgriTech',
    category: 'agriculture',
    frontUrl: 'https://demeter-agritech.example',
  },
  {
    entryId: 'dionysos',
    companyName: 'Dionysos Cellars',
    category: 'hospitality',
    frontUrl: 'https://dionysos-cellars.example',
  },
  {
    entryId: 'typhon',
    companyName: 'Typhon Energy',
    category: 'energy',
    frontUrl: 'https://typhon-energy.example',
  },
  {
    entryId: 'saraswati',
    companyName: 'Saraswati Learning',
    category: 'education',
    frontUrl: 'https://saraswati-learning.example',
  },
  {
    entryId: 'ganesha',
    companyName: 'Ganesha Ventures',
    category: 'finance',
    frontUrl: 'https://ganesha-ventures.example',
  },
];

const removeMode = process.argv.includes('--remove');

async function main() {
  if (removeMode) {
    const stmt = db.prepare(`
      UPDATE indexed_sites
      SET tenant_name = NULL,
          tenant_category = NULL,
          tenant_front_url = NULL,
          lease_status = CASE WHEN is_flagship = 1 THEN 'flagship' ELSE 'available' END,
          archetype_score = 0.0,
          archetype_signals = NULL
      WHERE tenant_name LIKE '% (demo)' OR tenant_name IN (${DEMO_TENANTS.map(() => '?').join(',')})
    `);
    const names = DEMO_TENANTS.map((t) => t.companyName);
    const info = stmt.run(...names);
    console.log(`Removed ${info.changes} demo tenant records.`);
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE indexed_sites
    SET tenant_name = ?,
        tenant_category = ?,
        tenant_front_url = ?,
        lease_status = 'leased'
    WHERE lexicon_entry_id = ? AND status = 'active'
  `);

  let seeded = 0;
  for (const tenant of DEMO_TENANTS) {
    const site = db
      .prepare("SELECT * FROM indexed_sites WHERE lexicon_entry_id = ? AND status = 'active'")
      .get(tenant.entryId);
    if (!site) {
      console.log(`⚠ No active site for ${tenant.entryId}; skipping.`);
      continue;
    }

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(tenant.entryId);
    if (!entry) {
      console.log(`⚠ No lexicon entry for ${tenant.entryId}; skipping.`);
      continue;
    }

    // Tag demo tenants so they can be removed later.
    const demoName = `${tenant.companyName} (demo)`;
    updateStmt.run(demoName, tenant.category, tenant.frontUrl, tenant.entryId);

    // Recompute archetype score with the tenant metadata applied.
    const updatedSite = {
      ...site,
      tenant_name: demoName,
      tenant_category: tenant.category,
      tenant_front_url: tenant.frontUrl,
    };
    try {
      const result = await scoreArchetype(updatedSite, entry);
      db.prepare(
        'UPDATE indexed_sites SET archetype_score = ?, archetype_signals = ?, archetype_version = ? WHERE id = ?'
      ).run(result.archetype_score, result.archetype_signals, result.archetype_version, site.id);
    } catch (err) {
      console.error(`Archetype scoring failed for ${tenant.entryId}:`, err.message);
    }

    seeded++;
    console.log(`✓ Seeded ${tenant.entryId} → ${demoName}`);
  }

  console.log(`\nSeeded ${seeded}/${DEMO_TENANTS.length} demo tenants.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
