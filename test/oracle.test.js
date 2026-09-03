/**
 * PuniCodex — Oracle tests
 */

const assert = require('node:assert');
const {
  askOracle,
  detectIntent,
  resolveLlmConfig,
  formatBreakdownForPrompt,
  formatPronunciationForPrompt,
  formatVariantsForPrompt,
} = require('../platform/api/oracle');

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

console.log('Oracle Tests');

test('detectIntent classifies "who" questions', async () => {
  assert.strictEqual(detectIntent('Who is Zeus?'), 'who');
});

test('detectIntent classifies etymology questions', async () => {
  assert.strictEqual(detectIntent('What is the etymology of Aphrodite?'), 'etymology');
});

test('askOracle returns an answer for a known deity', async () => {
  const result = await askOracle('Who is Zeus?');
  assert.ok(result.answer, 'answer should exist');
  assert.ok(result.answer.includes('Zeús'), 'answer should mention Zeús');
  assert.strictEqual(result.primaryId, 'zeus');
  assert.ok(
    Array.isArray(result.citations) && result.citations.length > 0,
    'should have citations'
  );
  assert.ok(
    Array.isArray(result.followUps) && result.followUps.length > 0,
    'should have follow-ups'
  );
});

test('askOracle decodes punycode-domain questions to their Unicode owner', async () => {
  const result = await askOracle('What is xn--zes-9na.com?');
  assert.strictEqual(result.primaryId, 'zeus', 'decodes xn--zes-9na.com to Zeús');
  assert.ok(result.answer.includes('xn--zes-9na.com'), 'answer shows the punycode form');
  assert.ok(result.answer.includes('zeús.com'), 'answer shows the Unicode form');
});

test('askOracle answers punycode-intent questions with the xn-- form', async () => {
  const result = await askOracle('What is the punycode for Apóllōn?');
  assert.strictEqual(result.primaryId, 'apollon');
  assert.ok(result.answer.includes('xn--aplln-1ta64d.com'), 'answer carries the punycode domain');
});

test('askOracle declines out-of-scope questions instead of fabricating', async () => {
  const result = await askOracle('What is the capital of France?');
  assert.strictEqual(result.primaryId, null, 'no fabricated primary');
  assert.ok(
    result.answer.includes('does not yet cover'),
    'declines honestly rather than bluffing an unrelated entry'
  );
});

test('askOracle handles empty query gracefully', async () => {
  const result = await askOracle('');
  assert.ok(result.answer);
  assert.strictEqual(result.primaryId, null);
});

test('askOracle handles follow-up anaphora', async () => {
  const first = await askOracle('Who is Zeus?');
  const followUp = await askOracle('What does he mean?', [
    { role: 'oracle', primaryId: first.primaryId },
  ]);
  assert.ok(followUp.answer);
  assert.strictEqual(followUp.primaryId, 'zeus');
});

test('askOracle uses lore when available', async () => {
  const result = await askOracle('Tell me about Zeus');
  assert.ok(result.answer);
  assert.ok(result.answer.toLowerCase().includes('zeus') || result.answer.includes('Zeús'));
});

test('askOracle returns availability for commercial intent', async () => {
  const result = await askOracle('Is Athena available?');
  assert.ok(result.answer);
  assert.strictEqual(result.primaryId, 'athena');
});

test('resolveLlmConfig: unset env returns null (graceful degradation)', () => {
  assert.strictEqual(resolveLlmConfig({}), null);
});

test('resolveLlmConfig: default provider reads ORACLE_LLM_* vars', () => {
  const config = resolveLlmConfig({ ORACLE_LLM_API_KEY: 'k', ORACLE_LLM_MODEL: 'm' });
  assert.deepStrictEqual(config, {
    apiKey: 'k',
    model: 'm',
    baseUrl: undefined,
    provider: 'openai',
  });
  const withBase = resolveLlmConfig({
    ORACLE_LLM_API_KEY: 'k',
    ORACLE_LLM_MODEL: 'm',
    ORACLE_LLM_BASE_URL: 'https://example.test/v1/',
  });
  assert.strictEqual(withBase.baseUrl, 'https://example.test/v1/');
});

test('resolveLlmConfig: nemotron needs a key, defaults model + NIM endpoint', () => {
  assert.strictEqual(resolveLlmConfig({ ORACLE_LLM_PROVIDER: 'nemotron' }), null);
  const config = resolveLlmConfig({
    ORACLE_LLM_PROVIDER: 'Nemotron',
    NEMOTRON_API_KEY: 'nvapi-k',
  });
  assert.strictEqual(config.provider, 'nemotron');
  assert.strictEqual(config.apiKey, 'nvapi-k');
  assert.ok(config.model.startsWith('nvidia/'), 'defaults to a hosted Nemotron model');
  assert.strictEqual(config.baseUrl, 'https://integrate.api.nvidia.com/v1');
});

test('resolveLlmConfig: nemotron honors NVIDIA_API_KEY alias and overrides', () => {
  const config = resolveLlmConfig({
    ORACLE_LLM_PROVIDER: 'nemotron',
    NVIDIA_API_KEY: 'alias-k',
    NEMOTRON_MODEL: 'nvidia/custom-nemotron',
    NEMOTRON_BASE_URL: 'http://127.0.0.1:8000/v1',
  });
  assert.deepStrictEqual(config, {
    apiKey: 'alias-k',
    model: 'nvidia/custom-nemotron',
    baseUrl: 'http://127.0.0.1:8000/v1',
    provider: 'nemotron',
  });
});

test('formatBreakdownForPrompt renders ASCII→restored mappings with notes', () => {
  const out = formatBreakdownForPrompt([
    { char: 'a', to_char: 'á', type: 'accent', note: 'Acute on alpha' },
    { char: 'p', to_char: 'p', type: 'same', note: 'Pi' },
  ]);
  assert.ok(out.includes('a → á — Acute on alpha'));
  assert.ok(out.includes('p — Pi'));
  assert.strictEqual(formatBreakdownForPrompt([]), null);
  assert.strictEqual(formatBreakdownForPrompt(null), null);
});

test('formatPronunciationForPrompt returns rules-derived IPA without slash wrapping', () => {
  const out = formatPronunciationForPrompt({
    pantheon: 'greek',
    unicode: 'Zeús',
    ascii: 'Zeus',
    id: 'zeus',
  });
  assert.ok(out.includes('IPA: /ˈzdeu̯s/'), `expected engine IPA, got: ${out}`);
  assert.ok(!out.includes('//'), 'no double slash wrapping');
  assert.ok(out.includes('ZDEWS'));
  assert.ok(out.includes('morae'));
});

test('formatPronunciationForPrompt labels Egyptian readings as conventional', () => {
  const out = formatPronunciationForPrompt({
    pantheon: 'egyptian',
    unicode: 'Ḏḥwtj',
    ascii: 'Thoth',
    id: 'thoth',
  });
  if (out) assert.ok(out.includes('CONVENTIONAL'), `expected conventional label: ${out}`);
});

test('formatVariantsForPrompt renders forms with notes and sources', () => {
  const out = formatVariantsForPrompt([
    { unicode: 'Hekatē', note: 'LSJ convention' },
    'plain-variant',
    { form: 'Sourced', sources: ['LSJ'] },
  ]);
  assert.ok(out.includes('Hekatē (LSJ convention)'));
  assert.ok(out.includes('plain-variant'));
  assert.ok(out.includes('Sourced (sources: LSJ)'));
  assert.strictEqual(formatVariantsForPrompt([]), null);
});

if (!process.exitCode) {
  console.log('\n✓ All Oracle tests passed');
} else {
  console.log('\n✗ Some Oracle tests failed');
  process.exit(1);
}
