/**
 * Similarity Service Tests
 *
 * Validates the generated cross-cultural similarity graph and the service
 * layer that exposes it to API v1/v2.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  getSimilarities,
  getGraph,
  listRelationshipTypes,
  getRelationshipStats,
  getSimilarityCount,
} = require('../platform/api/similarity-service.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  console.log('\n▸ Similarity Service Tests\n');
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
  console.log(`\nSimilarity Service: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const apiJsonPath = path.join(__dirname, '..', 'platform', 'api', 'similarities.json');
const rendererJsonPath = path.join(
  __dirname,
  '..',
  'platform',
  'browser',
  'renderer',
  'similarities.json'
);

test('generated similarities JSON exists in platform/api', () => {
  assert.ok(fs.existsSync(apiJsonPath), 'platform/api/similarities.json should exist');
});

test('generated similarities JSON exists in platform/browser/renderer', () => {
  assert.ok(
    fs.existsSync(rendererJsonPath),
    'platform/browser/renderer/similarities.json should exist'
  );
});

test('generated JSON has nodes, edges, and meta', () => {
  const data = JSON.parse(fs.readFileSync(apiJsonPath, 'utf8'));
  assert.ok(data.meta, 'meta object should exist');
  assert.ok(Number.isInteger(data.meta.nodeCount), 'meta.nodeCount should be an integer');
  assert.ok(Number.isInteger(data.meta.edgeCount), 'meta.edgeCount should be an integer');
  assert.ok(Array.isArray(data.nodes), 'nodes should be an array');
  assert.ok(Array.isArray(data.edges), 'edges should be an array');
  assert.strictEqual(data.nodes.length, data.meta.nodeCount);
  assert.strictEqual(data.edges.length, data.meta.edgeCount);
});

test('every edge source and target exists in nodes', () => {
  const data = JSON.parse(fs.readFileSync(apiJsonPath, 'utf8'));
  const nodeIds = new Set(data.nodes.map((n) => n.id));
  for (const edge of data.edges) {
    assert.ok(nodeIds.has(edge.source), `source ${edge.source} should be in nodes`);
    assert.ok(nodeIds.has(edge.target), `target ${edge.target} should be in nodes`);
  }
});

test('every node has required fields', () => {
  const data = JSON.parse(fs.readFileSync(apiJsonPath, 'utf8'));
  for (const node of data.nodes) {
    assert.ok(node.id, 'node should have id');
    assert.ok(node.ascii, 'node should have ascii');
    assert.ok(node.unicode, 'node should have unicode');
    assert.ok(node.pantheon, 'node should have pantheon');
    assert.ok(node.pantheonLabel, 'node should have pantheonLabel');
  }
});

test('getSimilarities returns edges for zeus including thor and indra', () => {
  const result = getSimilarities('zeus');
  assert.ok(result, 'result should not be null');
  assert.strictEqual(result.id, 'zeus');
  assert.ok(result.count > 0, 'zeus should have similarities');
  const targets = result.items.map((item) => item.target);
  assert.ok(targets.includes('thor'), 'zeus should be similar to thor');
  assert.ok(targets.includes('indra'), 'zeus should be similar to indra');
});

test('getSimilarities supports filters', () => {
  const result = getSimilarities('zeus', { category: 'phenomenon', minStrength: 3 });
  assert.ok(result, 'result should not be null');
  assert.ok(result.count > 0, 'zeus should have filtered similarities');
  for (const item of result.items) {
    assert.strictEqual(item.category, 'phenomenon');
    assert.ok(item.strength >= 3, 'strength should be at least 3');
  }
});

test('getSimilarities respects limit', () => {
  const result = getSimilarities('zeus', { limit: 3 });
  assert.ok(result, 'result should not be null');
  assert.strictEqual(result.items.length, 3);
  assert.strictEqual(result.count, 3);
});

test('getGraph returns center node, neighbors, and edges', () => {
  const result = getGraph('zeus');
  assert.ok(result, 'result should not be null');
  assert.strictEqual(result.id, 'zeus');
  assert.ok(result.nodes.length > 1, 'graph should contain neighbors');
  assert.ok(result.edges.length > 0, 'graph should contain edges');
  assert.ok(
    result.nodes.some((n) => n.id === 'zeus'),
    'graph should include center node'
  );
  assert.ok(
    result.nodes.some((n) => n.id === 'thor'),
    'graph should include thor'
  );
});

test('getGraph depth=2 expands to neighbors-of-neighbors', () => {
  const result = getGraph('zeus', { depth: 2, limit: 80 });
  assert.ok(result, 'result should not be null');
  assert.ok(result.nodes.length >= result.meta.nodeCount);
  assert.ok(result.meta.depth, 2);
  assert.ok(
    result.edges.every(
      (e) =>
        result.nodes.some((n) => n.id === e.source) && result.nodes.some((n) => n.id === e.target)
    )
  );
});

test('listRelationshipTypes returns non-empty array', () => {
  const result = listRelationshipTypes();
  assert.ok(Array.isArray(result), 'result should be an array');
  assert.ok(result.length > 0, 'relationship types should not be empty');
  for (const item of result) {
    assert.ok(item.relationship, 'item should have relationship');
    assert.ok(item.category, 'item should have category');
    assert.ok(Number.isInteger(item.count), 'item should have integer count');
  }
});

test('getRelationshipStats returns aggregated counts', () => {
  const result = getRelationshipStats();
  assert.ok(result, 'result should not be null');
  assert.ok(Number.isInteger(result.totalEdges), 'totalEdges should be an integer');
  assert.ok(Number.isInteger(result.totalNodes), 'totalNodes should be an integer');
  assert.ok(result.totalEdges > 0, 'totalEdges should be positive');
  assert.ok(Array.isArray(result.byRelationship), 'byRelationship should be an array');
  assert.ok(Array.isArray(result.byCategory), 'byCategory should be an array');
});

test('getSimilarityCount returns positive number for zeus', () => {
  const count = getSimilarityCount('zeus');
  assert.ok(Number.isInteger(count), 'count should be an integer');
  assert.ok(count > 0, 'zeus should have a positive similarity count');
});

test('getSimilarityCount matches number of getSimilarities items', () => {
  const count = getSimilarityCount('zeus');
  const result = getSimilarities('zeus', { limit: 1000 });
  assert.strictEqual(count, result.items.length);
});

test('invalid id returns null safely', () => {
  assert.strictEqual(getSimilarities('not-a-real-id-xyz'), null);
  assert.strictEqual(getGraph('not-a-real-id-xyz'), null);
  assert.strictEqual(getSimilarityCount('not-a-real-id-xyz'), null);
});

test('empty string id returns null safely', () => {
  assert.strictEqual(getSimilarities(''), null);
  assert.strictEqual(getGraph(''), null);
  assert.strictEqual(getSimilarityCount(''), null);
});

run();
