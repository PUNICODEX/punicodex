/**
 * PuniCodex — Oracle eval --backend flag parsing tests
 *
 * Unit tests for the A/B scorecard flag parsing and summary scoring helpers
 * in scripts/oracle-backend-scorecard.js. No DB, no network, no LLM keys.
 */

const assert = require('node:assert');
const {
  BACKENDS,
  SUMMARY_WORD_LIMIT,
  parseBackendFlag,
  extractLlmSummary,
  scoreBackendCase,
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
  console.log('Oracle Backend Flag Tests');

  await test('no flag → deterministic default (backend null)', async () => {
    assert.deepStrictEqual(parseBackendFlag([]), { backend: null });
    assert.deepStrictEqual(parseBackendFlag(['--full', '--json']), { backend: null });
  });

  await test('--backend=nemotron and --backend=openai parse', async () => {
    assert.deepStrictEqual(parseBackendFlag(['--backend=nemotron']), { backend: 'nemotron' });
    assert.deepStrictEqual(parseBackendFlag(['--backend=openai']), { backend: 'openai' });
  });

  await test('flag value is case-insensitive and trimmed', async () => {
    assert.deepStrictEqual(parseBackendFlag(['--backend= Nemotron ']), { backend: 'nemotron' });
  });

  await test('--backend <name> space form parses', async () => {
    assert.deepStrictEqual(parseBackendFlag(['--backend', 'openai']), { backend: 'openai' });
  });

  await test('missing value → error', async () => {
    assert.ok(parseBackendFlag(['--backend=']).error);
    assert.ok(parseBackendFlag(['--backend']).error);
  });

  await test('unknown backend → error naming the known backends', async () => {
    const { error } = parseBackendFlag(['--backend=claude']);
    assert.ok(error.includes('claude'));
    assert.ok(error.includes('nemotron'));
    assert.ok(error.includes('openai'));
  });

  await test('backend key detection comes from the environment only', async () => {
    assert.ok(!BACKENDS.nemotron.isConfigured({}));
    assert.ok(BACKENDS.nemotron.isConfigured({ NEMOTRON_API_KEY: 'k' }));
    assert.ok(BACKENDS.nemotron.isConfigured({ NVIDIA_API_KEY: 'k' }));
    assert.ok(!BACKENDS.openai.isConfigured({ ORACLE_LLM_API_KEY: 'k' }));
    assert.ok(BACKENDS.openai.isConfigured({ ORACLE_LLM_API_KEY: 'k', ORACLE_LLM_MODEL: 'm' }));
  });

  await test('backend apply sets the provider selector', async () => {
    const env = {};
    BACKENDS.nemotron.apply(env);
    assert.strictEqual(env.ORACLE_LLM_PROVIDER, 'nemotron');
    BACKENDS.openai.apply(env);
    assert.strictEqual(env.ORACLE_LLM_PROVIDER, 'openai');
  });

  await test('extractLlmSummary returns null when the polish layer did not fire', async () => {
    assert.strictEqual(extractLlmSummary('<div class="oracle-lead"><p>Apollōn…</p></div>'), null);
    assert.strictEqual(extractLlmSummary(''), null);
    assert.strictEqual(extractLlmSummary(null), null);
  });

  await test('extractLlmSummary strips the summary portion only', async () => {
    const answer =
      '<div class="oracle-llm-summary"><p><strong>Apóllōn</strong> is the god of light.</p></div>' +
      '<div class="oracle-lead"><p>structured body undefined</p></div>';
    assert.strictEqual(extractLlmSummary(answer), 'Apóllōn is the god of light.');
  });

  await test('scoreBackendCase: no summary → fired false, trivially clean', async () => {
    const r = scoreBackendCase({ q: 'q', forbidden: ['x'] }, '<p>deterministic</p>');
    assert.strictEqual(r.fired, false);
    assert.strictEqual(r.cleanOk, true);
    assert.strictEqual(r.words, 0);
  });

  await test('scoreBackendCase: counts words and enforces the length limit', async () => {
    const words = Array.from({ length: SUMMARY_WORD_LIMIT + 1 }, (_, i) => `w${i}`).join(' ');
    const answer = `<div class="oracle-llm-summary"><p>${words}</p></div>`;
    const r = scoreBackendCase({ q: 'q', forbidden: [] }, answer);
    assert.strictEqual(r.fired, true);
    assert.strictEqual(r.words, SUMMARY_WORD_LIMIT + 1);
    assert.strictEqual(r.withinLimit, false);
  });

  await test('scoreBackendCase: forbidden strings and markers in the summary fail clean', async () => {
    const dirty = scoreBackendCase(
      { q: 'q', forbidden: ['ascii is better'] },
      '<div class="oracle-llm-summary"><p>ASCII is better, undefined</p></div>'
    );
    assert.strictEqual(dirty.cleanOk, false);
    assert.deepStrictEqual(dirty.foundForbidden, ['ascii is better']);
    assert.ok(dirty.markersFound.length > 0);

    const clean = scoreBackendCase(
      { q: 'q', forbidden: ['ascii is better'] },
      '<div class="oracle-llm-summary"><p>The restored form is canonical.</p></div>'
    );
    assert.strictEqual(clean.cleanOk, true);
    assert.strictEqual(clean.withinLimit, true);
  });

  if (!process.exitCode) {
    console.log('\n✓ All Oracle Backend Flag tests passed');
  } else {
    console.log('\n✗ Some Oracle Backend Flag tests failed');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
