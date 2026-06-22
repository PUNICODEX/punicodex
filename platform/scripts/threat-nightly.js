/**
 * PUNYCODEX — Nightly Threat Intelligence Maintenance (Phase 8)
 *
 * Re-clusters unclustered events, re-scores all relationships, and
 * auto-promotes high-confidence clusters.
 *
 * Run via cron or manually:
 *   node platform/scripts/threat-nightly.js
 */

const { getDb } = require('../db/connection.js');
const { closeDb } = require('../db/connection.js');
const { reclusterOpen, autoPromoteClusters } = require('../api/clustering.js');
const { rescoreAll } = require('../api/reputation-model.js');

function runNightly() {
  const db = getDb();

  console.log('Threat nightly: re-clustering open events...');
  const reclustered = reclusterOpen(db);
  console.log(`  ${reclustered.length} relationships clustered`);

  console.log('Threat nightly: re-scoring relationships...');
  const rescored = rescoreAll(db);
  console.log(`  ${rescored.length} relationships rescored`);

  console.log('Threat nightly: auto-promoting clusters...');
  const promoted = autoPromoteClusters(db, 5);
  console.log(`  ${promoted.length} clusters promoted`);
  for (const p of promoted) {
    console.log(`    cluster ${p.clusterId}: ${p.from} -> ${p.to} (size ${p.size})`);
  }

  closeDb();
}

if (require.main === module) {
  runNightly();
}

module.exports = { runNightly };
