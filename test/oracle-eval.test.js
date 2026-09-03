/**
 * PuniCodex — Oracle evaluation battery
 *
 * Runs the golden-set evaluation harness (scripts/eval-oracle.js) against the
 * live Oracle in quick mode and asserts the fleet-wide quality gates:
 * overall primary hit@1 >= 0.80, citation rate >= 0.90 among cases that
 * expect scholarly citations, and clean rate == 1.0 (no forbidden strings,
 * no unresolved template markers). Golden set:
 * data/benchmarks/oracle-eval.json (36 cases, 6 intent groups).
 *
 * Reads the golden DB at platform/db/punicodex.db (npm run db-init).
 */

const assert = require('node:assert');
const { LEXICON } = require('../type/js/lexicon.js');
const { loadGoldenSet, runEval, THRESHOLDS } = require('../scripts/eval-oracle.js');
const {
  BACKENDS,
  parseBackendFlag,
  runBackendScorecard,
  printScorecard,
} = require('../scripts/oracle-backend-scorecard.js');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('Oracle Eval Battery');

  // Optional A/B mode: --backend=<name> additionally scores the LLM polish
  // layer for that backend. No flag = the deterministic battery only, with
  // byte-for-byte unchanged output (CI runs it unflagged).
  const flag = parseBackendFlag(process.argv.slice(2));
  if (flag.error) {
    console.error(`✗ ${flag.error}`);
    process.exit(2);
  }

  const golden = loadGoldenSet();
  const report = await runEval({ quick: true });

  await test('golden set has 36 cases across 6 intent groups of 6', async () => {
    assert.strictEqual(golden.cases.length, 36);
    const groups = {};
    for (const c of golden.cases) groups[c.group] = (groups[c.group] || 0) + 1;
    assert.deepStrictEqual(groups, {
      'greek-headliners': 6,
      'non-greek-flagships': 6,
      'base-entries': 6,
      'intent-variety': 6,
      'vague-adversarial': 6,
      'out-of-scope': 6,
    });
  });

  await test('golden expectations reference real lexicon entries', async () => {
    const ids = new Set(LEXICON.map((e) => e.id));
    for (const c of golden.cases) {
      assert.ok(c.q && typeof c.q === 'string', 'case needs a question');
      assert.ok(Array.isArray(c.mustMention), `case "${c.q}" needs mustMention[]`);
      assert.ok(Array.isArray(c.forbidden), `case "${c.q}" needs forbidden[]`);
      if (c.expectPrimary !== null) {
        assert.ok(ids.has(c.expectPrimary), `unknown lexicon id: ${c.expectPrimary}`);
      }
    }
  });

  await test('evaluates all 36 cases', async () => {
    assert.strictEqual(report.cases.length, 36);
    assert.strictEqual(Object.keys(report.groups).length, 6);
    for (const c of report.cases) {
      assert.ok(c.excerpt.length > 0, `empty answer for "${c.q}"`);
    }
  });

  await test('overall primary hit@1 >= 0.80', async () => {
    assert.ok(
      report.overall.hitRate >= THRESHOLDS.hitRateMin,
      `hit@1 ${report.overall.hitRate.toFixed(3)} < ${THRESHOLDS.hitRateMin}`
    );
  });

  await test('citation rate >= 0.90 among citation-expecting cases', async () => {
    assert.ok(report.overall.citationCases > 0, 'no citation-expecting cases scored');
    assert.ok(
      report.overall.citationRate >= THRESHOLDS.citationRateMin,
      `citation rate ${report.overall.citationRate.toFixed(3)} < ${THRESHOLDS.citationRateMin}`
    );
  });

  await test('clean rate == 1.0 (no forbidden strings or template markers)', async () => {
    const unclean = report.cases.filter((c) => !c.cleanOk);
    assert.strictEqual(unclean.length, 0, `unclean answers: ${unclean.map((c) => c.q).join('; ')}`);
    assert.strictEqual(report.overall.cleanRate, 1);
  });

  await test('eval gates pass overall', async () => {
    assert.ok(report.pass, 'runEval reports pass=false');
  });

  console.log(
    `\n  hit@1 ${(report.overall.hitRate * 100).toFixed(1)}%  ` +
      `citations ${(report.overall.citationRate * 100).toFixed(1)}%  ` +
      `mentions ${(report.overall.mentionRate * 100).toFixed(1)}%  ` +
      `clean ${(report.overall.cleanRate * 100).toFixed(1)}%`
  );

  if (!process.exitCode) {
    console.log('\n✓ All Oracle Eval Battery tests passed');
  } else {
    console.log('\n✗ Some Oracle Eval Battery tests failed');
    process.exit(1);
  }

  // Backend A/B scorecard: opt-in via --backend=<name>. A missing key env var
  // is a skip, never a failure — CI has no keys.
  if (flag.backend) {
    const backend = BACKENDS[flag.backend];
    if (!backend.isConfigured(process.env)) {
      console.log(
        `\nOracle Backend Scorecard — ${flag.backend}: SKIPPED ` +
          `(set ${backend.keyHint} to enable; no key in the environment, exiting 0)`
      );
      return;
    }
    const scorecard = await runBackendScorecard(flag.backend, golden.cases, { quick: true });
    printScorecard(scorecard);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
