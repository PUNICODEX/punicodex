#!/usr/bin/env node
/**
 * PuniCodex — seed Australian university outreach prospects.
 *
 * Curated dataset of Australian universities whose teaching/research
 * profiles align with PuniCodex (classics, ancient history, archaeology,
 * linguistics, religious studies, digital humanities, design, marketing,
 * Indigenous studies). Departments are matched against the benefit map in
 * platform/api/university-pitch-email.js.
 *
 * Idempotent — re-running only inserts missing slugs (upsert IGNORE).
 * The crawling ecosystem (docs/scholarly-transformation-plan.md) extends
 * this dataset automatically over time; this seed is its v1 ground truth.
 *
 * Usage:
 *   node scripts/seed-australian-universities.js [--check]
 */
const path = require('node:path');

const UNIVERSITIES = require(path.join(__dirname, '..', 'store', 'university-seed.json'));

async function main() {
  const { upsertProspect, listProspects } = require(path.join(
    __dirname,
    '..',
    'platform',
    'db',
    'university-prospects.js'
  ));

  for (const u of UNIVERSITIES) {
    await upsertProspect({
      institution_name: u.name,
      slug: u.slug,
      country: 'AU',
      state: u.state,
      domain: u.domain,
      departments: u.departments,
      source: 'seed',
      metadata: { seeded_by: 'scripts/seed-australian-universities.js', v: 1 },
    });
  }

  const all = await listProspects();
  const byStatus = {};
  for (const p of all) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  console.log(
    `University prospects: ${all.length} total (${UNIVERSITIES.length} in seed) — status: ${JSON.stringify(byStatus)}`
  );
}

main().catch((err) => {
  console.error(`University seed stopped: ${err.message}`);
  process.exit(1);
});
