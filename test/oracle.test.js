/**
 * PÚNYCODEX — Oracle tests
 */

const assert = require('node:assert');
const { askOracle, detectIntent } = require('../platform/api/oracle');

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

if (!process.exitCode) {
  console.log('\n✓ All Oracle tests passed');
} else {
  console.log('\n✗ Some Oracle tests failed');
  process.exit(1);
}
