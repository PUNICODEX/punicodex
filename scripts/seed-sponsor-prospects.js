#!/usr/bin/env node
/**
 * PuniCodex — seed sponsorship scouting prospects.
 *
 * Curated dataset of real businesses mapped to flagship temples via the
 * canonical industry-pattern seats (platform/api/industry-patterns.json).
 * Idempotent — re-running only inserts missing (temple, domain) pairs
 * (upsert IGNORE). The scouting ecosystem
 * (scripts/scout-temple-sponsors.js) extends this dataset automatically
 * over time; this seed is its v1 ground truth.
 *
 * Usage:
 *   node scripts/seed-sponsor-prospects.js [--check]
 */
const path = require('node:path');

const SEED = require(path.join(__dirname, '..', 'store', 'sponsor-seed.json'));

async function main() {
  const prospects = require(path.join(__dirname, '..', 'platform', 'db', 'business-prospects.js'));
  const patterns = require(path.join(__dirname, '..', 'platform', 'api', 'industry-patterns.json'));

  for (const s of SEED) {
    const seat = (patterns.byEntry?.[s.temple] || []).find((x) => x.industry === s.seat);
    await prospects.upsertProspect({
      temple_id: s.temple,
      business_name: s.business,
      domain: s.domain || null,
      industry_seat: s.seat,
      industry_name: seat?.name || s.seat,
      source: 'seed',
      score: 40 + (seat?.weight || 0) * 20,
      signals: seat
        ? [
            `${seat.name} seat of the temple (pattern-map weight ${seat.weight}).`,
            seat.why || '',
          ].filter(Boolean)
        : ['Curated seed candidate.'],
      metadata: { seeded_by: 'scripts/seed-sponsor-prospects.js', v: 1 },
    });
  }

  const all = await prospects.listProspects();
  const byStatus = {};
  for (const p of all) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  console.log(
    `Sponsor prospects: ${all.length} total (${SEED.length} in seed) — status: ${JSON.stringify(byStatus)}`
  );
}

main().catch((err) => {
  console.error(`Sponsor seed stopped: ${err.message}`);
  process.exit(1);
});
