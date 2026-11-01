#!/usr/bin/env node
/**
 * PUNICODEX Evolution Orchestrator
 *
 * Runs the full canonical-source → generate → test → divergence cycle,
 * and optionally executes live operational tasks (crawls, availability checks,
 * curator runs). Intended for CI, nightly automation, and local maintainer use.
 *
 * Usage:
 *   node scripts/evolve.js
 *   node scripts/evolve.js --operational
 *   node scripts/evolve.js --skip-divergence
 */

const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const operational = args.includes('--operational');
const skipDivergence = args.includes('--skip-divergence');

function run(label, cmd, opts = {}) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
      ...opts,
    });
  } catch (err) {
    // Self-diagnosis: the GitHub job log for this cycle is a single opaque
    // step ("Run evolution cycle") — record WHICH sub-step died (plus the
    // exec error tail) to a file the workflow uploads as an artifact, so the
    // next cycle names its own failure.
    try {
      const fs = require('fs');
      fs.writeFileSync(
        path.join(root, 'evolve-failure.txt'),
        `FAILED STEP: ${label}\nCOMMAND: ${cmd}\n\n${err.message || err}\n`
      );
    } catch (e) {
      /* diagnosis is best-effort */
    }
    throw err;
  }
}

async function main() {
  const start = Date.now();
  console.log('🌐 PUNICODEX Evolution Orchestrator');
  console.log(`   Operational tasks: ${operational ? 'yes' : 'no'}`);
  console.log(`   Skip divergence gate: ${skipDivergence ? 'yes' : 'no'}`);

  // 1. Regenerate all derived artifacts from canonical sources.
  run('Regenerating derived artifacts', 'npm run generate');

  // 2. Full automated test matrix.
  run('Running full test matrix', 'npm test');

  // 3. Lint and format checks.
  run('Checking formatting', 'npm run format:check');
  run('Running linter', 'npm run lint');

  // 4. Divergence gate: generated files must match canonical sources.
  // The test matrix re-runs generator suites that rewrite pages; converge
  // again AFTER the battery so the diff sees only true canonical drift
  // (ci.yml runs its sync step after the battery for the same reason).
  if (!skipDivergence) {
    run('Converging post-test generator drift', 'npm run generate');
    run('Divergence gate: checking for uncommitted generated changes', 'git diff --exit-code');
  } else {
    console.log('\n⏭ Skipping divergence gate.');
  }

  // 5. Optional operational tasks. These hit external services and should only
  //    run in environments with the required secrets and quotas.
  if (operational) {
    console.log('\n🔁 Operational tasks enabled');

    // Verify availability of unleased entries.
    run('Checking domain availability', 'node platform/scripts/check-all-availability.js');

    // Recrawl stale sites.
    run('Recrawling stale sites', 'node platform/scripts/bulk-crawl.js 50');

    // Extract entity mentions from crawled content.
    run('Extracting entity mentions', 'node platform/scripts/entity-extractor.js');

    // AI curator: flag accuracy/content gaps.
    run('Running AI curator', 'node platform/scripts/ai-curator.js');

    // Trial and lease housekeeping.
    run('Sending trial reminders', 'node platform/scripts/trial-reminders.js');
    run('Processing lease expiry', 'node platform/scripts/lease-expiry.js');
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Evolution cycle complete in ${elapsed}s`);
}

main().catch((err) => {
  console.error('\n❌ Evolution cycle failed:', err.message || err);
  process.exit(1);
});
