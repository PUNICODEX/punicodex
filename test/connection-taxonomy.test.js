/**
 * Connection Taxonomy Tests
 *
 * Ensures every raw relationship in the generated similarity graph maps to a
 * canonical concept arm. Without this, the Connections mandala produces messy,
 * duplicate concept nodes.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  getConceptForRelationship,
  getTaxonomy,
} = require('../platform/api/similarity-service.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  console.log('\n▸ Connection Taxonomy Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nConnection Taxonomy: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');
const similaritiesPath = path.join(root, 'platform', 'api', 'similarities.json');
const taxonomyPath = path.join(root, 'platform', 'api', 'connection-taxonomy.json');

test('taxonomy file exists and is valid JSON', () => {
  assert.ok(fs.existsSync(taxonomyPath), 'connection-taxonomy.json should exist');
  const data = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
  assert.ok(data.domains, 'taxonomy should have domains');
  assert.ok(data.concepts, 'taxonomy should have concepts');
});

test('every domain has required fields', () => {
  const taxonomy = getTaxonomy();
  for (const [id, domain] of Object.entries(taxonomy.domains)) {
    assert.strictEqual(domain.id, id, 'domain id should match key');
    assert.ok(domain.label, `domain ${id} should have a label`);
    assert.ok(domain.color, `domain ${id} should have a color`);
    assert.ok(domain.glow, `domain ${id} should have a glow color`);
    assert.ok(typeof domain.order === 'number', `domain ${id} should have numeric order`);
  }
});

test('every concept has required fields and a valid domain', () => {
  const taxonomy = getTaxonomy();
  const domainIds = new Set(Object.keys(taxonomy.domains));
  for (const [id, concept] of Object.entries(taxonomy.concepts)) {
    assert.strictEqual(concept.id, id, 'concept id should match key');
    assert.ok(concept.label, `concept ${id} should have a label`);
    assert.ok(concept.description, `concept ${id} should have a description`);
    assert.ok(domainIds.has(concept.domain), `concept ${id} should reference a valid domain`);
    assert.ok(Array.isArray(concept.relationships), `concept ${id} should list relationships`);
    assert.ok(concept.relationships.length > 0, `concept ${id} should map at least one raw relationship`);
    assert.ok(typeof concept.order === 'number', `concept ${id} should have numeric order`);
  }
});

test('every relationship string in similarities.json maps to a canonical concept', () => {
  const data = JSON.parse(fs.readFileSync(similaritiesPath, 'utf8'));
  const unmapped = [];
  for (const edge of data.edges) {
    const concept = getConceptForRelationship(edge.relationship);
    if (!concept) unmapped.push(edge.relationship);
  }
  assert.strictEqual(unmapped.length, 0, `unmapped relationships: ${[...new Set(unmapped)].join(', ')}`);
});

test('getConceptForRelationship returns the right canonical labels for known relationships', () => {
  assert.strictEqual(getConceptForRelationship('Sun / light')?.label, 'Sun / Light');
  assert.strictEqual(getConceptForRelationship('Thunder / storm sovereignty')?.label, 'Thunder / Storm Sovereignty');
  assert.strictEqual(getConceptForRelationship('Sea / cosmic water')?.label, 'Sea / Water');
});

test('graph endpoint annotates edges with canonical concept data', () => {
  const { getGraph } = require('../platform/api/similarity-service.js');
  const result = getGraph('zeus');
  assert.ok(result, 'graph should load for zeus');
  assert.ok(result.meta.concepts.length > 0, 'graph meta should list canonical concepts');
  assert.ok(
    result.edges.some((e) => e.concept && e.concept.id),
    'edges should include canonical concept annotation'
  );
});

run();
