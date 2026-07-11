/**
 * Tests for the Scholarly Edition taxonomy engine.
 */

const assert = require('node:assert');
const taxonomy = require('./taxonomy');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Running taxonomy engine tests...');

test('loads taxonomy with expected version', () => {
  assert.strictEqual(taxonomy.getTaxonomyVersion(), '0.1.0');
});

test('returns 13 universal sections', () => {
  const sections = taxonomy.getUniversalSections();
  assert.strictEqual(sections.length, 13);
  assert(sections.some((s) => s.key === 'overview'));
  assert(sections.some((s) => s.key === 'original-script'));
  assert(sections.some((s) => s.key === 'attribution'));
});

test('validates known section keys', () => {
  assert.strictEqual(taxonomy.validateSectionKey('overview'), true);
  assert.strictEqual(taxonomy.validateSectionKey('mythology'), true);
  assert.strictEqual(taxonomy.validateSectionKey('poetic-edda'), true);
});

test('rejects unknown and deprecated keys', () => {
  assert.strictEqual(taxonomy.validateSectionKey('fake-section'), false);
  assert.strictEqual(taxonomy.isDeprecatedSection('extended-lore-cta'), true);
});

test('returns pantheon-specific kits', () => {
  const greek = taxonomy.getPantheonKit('greek');
  assert(greek.length > 0);
  assert(greek.some((s) => s.key === 'homeric-hymns'));

  const norse = taxonomy.getPantheonKit('norse');
  assert(norse.some((s) => s.key === 'poetic-edda'));
});

test('resolves archetype from id and generates manifest', () => {
  const manifest = taxonomy.generateBlankManifest('nike');
  assert.strictEqual(manifest.entryId, 'nike');
  assert.strictEqual(manifest.pantheon, 'olympian');
  assert.strictEqual(manifest.sections.length, 13);
  assert(manifest.sections.some((s) => s.key === 'overview'));
  assert(manifest.sections.every((s) => s.status === 'empty'));
});

test('resolves archetype from object and generates manifest', () => {
  const archetype = { id: 'thor', name: 'Þórr', pantheon: 'norse', tier: 'tier-2' };
  const manifest = taxonomy.generateBlankManifest(archetype);
  assert.strictEqual(manifest.entryId, 'thor');
  assert(manifest.sections.some((s) => s.key === 'poetic-edda'));
});

test('blank section has correct schema defaults', () => {
  const section = taxonomy.generateBlankSection('mythology');
  assert.strictEqual(section.key, 'mythology');
  assert.strictEqual(section.body, '');
  assert.deepStrictEqual(section.sources, []);
  assert.deepStrictEqual(section.media, []);
  assert.strictEqual(section.status, 'empty');
});

test('validates a correct manifest', () => {
  const manifest = taxonomy.generateBlankManifest('nike');
  const errors = taxonomy.validateManifest(manifest);
  assert.deepStrictEqual(errors, []);
});

test('detects invalid manifest', () => {
  const manifest = taxonomy.generateBlankManifest('nike');
  manifest.sections.push({ key: 'extended-lore-cta', body: 'bad' });
  const errors = taxonomy.validateManifest(manifest);
  assert(errors.length > 0);
  assert(errors.some((e) => e.includes('Deprecated')));
});

test('every flagship id resolves and produces a manifest', () => {
  const { ARCHETYPES } = require('../../js/archetypes-v2.js');
  const built = ARCHETYPES.filter((a) => a.built);
  assert.strictEqual(built.length, 151);
  for (const archetype of built) {
    const manifest = taxonomy.generateBlankManifest(archetype.id);
    assert.strictEqual(manifest.entryId, archetype.id);
    assert(manifest.sections.length >= 13, `${archetype.id} has too few sections`);
    const errors = taxonomy.validateManifest(manifest);
    assert.deepStrictEqual(errors, [], `${archetype.id}: ${errors.join(', ')}`);
  }
});

console.log('Taxonomy engine tests complete.');
