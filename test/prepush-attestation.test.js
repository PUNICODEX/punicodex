const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  canReuseAttestation,
  readAttestation,
  suiteCommandsHash,
  writeAttestation,
} = require('../scripts/prepush-gate.js');

function fixture() {
  const record = {
    head: 'a'.repeat(40),
    tree: 'b'.repeat(40),
    commandsHash: 'c'.repeat(64),
    selected: ['Biome Lint', 'Format Check', 'Example Tests', '__DIVERGENCE__'],
    canonical: true,
  };
  const input = {
    head: record.head,
    tree: record.tree,
    commandsHash: record.commandsHash,
    selected: ['Biome Lint', 'Format Check'],
    canonical: false,
    dirty: false,
  };
  return { record, input };
}

test('a valid exact-tree attestation covers an identical or smaller gate', () => {
  const { record, input } = fixture();
  assert.equal(canReuseAttestation(record, input), true);
  assert.equal(canReuseAttestation(record, { ...input, canonical: true }), true);
});

test('missing attestations and dirty working trees never bypass verification', () => {
  const { record, input } = fixture();
  assert.equal(canReuseAttestation(null, input), false);
  assert.equal(canReuseAttestation(record, { ...input, dirty: true }), false);
});

test('commit, tree, and suite-definition changes invalidate the attestation', () => {
  const { record, input } = fixture();
  assert.equal(canReuseAttestation(record, { ...input, head: 'd'.repeat(40) }), false);
  assert.equal(canReuseAttestation(record, { ...input, tree: 'e'.repeat(40) }), false);
  assert.equal(canReuseAttestation(record, { ...input, commandsHash: 'f'.repeat(64) }), false);
});

test('new suites or uncovered divergence always force full verification', () => {
  const { record, input } = fixture();
  assert.equal(
    canReuseAttestation(record, { ...input, selected: [...input.selected, 'New Tests'] }),
    false
  );
  assert.equal(
    canReuseAttestation({ ...record, canonical: false }, { ...input, canonical: true }),
    false
  );
  assert.equal(canReuseAttestation({ ...record, selected: [] }, input), false);
});

test('attestations round-trip atomically with their exact verification inputs', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-attestation-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'gate.json');
  process.env.PREPUSH_ATTESTATION_FILE = file;
  t.after(() => delete process.env.PREPUSH_ATTESTATION_FILE);
  const { input } = fixture();
  const written = writeAttestation(input);
  assert.equal(readAttestation().head, input.head);
  assert.equal(readAttestation().tree, input.tree);
  assert.equal(readAttestation().commandsHash, input.commandsHash);
  assert.deepEqual(readAttestation().selected, [...input.selected].sort());
  assert.equal(written.version, 1);
  assert.equal(fs.existsSync(`${file}.tmp.${process.pid}`), false);
});

test('suite command hashes are deterministic and sensitive to command edits', () => {
  const first = new Map([
    ['A Tests', 'node a.js'],
    ['B Tests', 'node b.js'],
  ]);
  const reversed = new Map([...first.entries()].reverse());
  assert.equal(suiteCommandsHash(first), suiteCommandsHash(reversed));
  const changed = new Map(first);
  changed.set('A Tests', 'node a.js --changed');
  assert.notEqual(suiteCommandsHash(first), suiteCommandsHash(changed));
});
