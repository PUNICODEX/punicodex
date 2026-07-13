/**
 * Connections graph helpers tests
 * Guards against the source/target string-vs-object regression.
 */

const assert = require('node:assert');
const {
  filterEdgesForNode,
  isNeighbor,
  deriveConcepts,
  buildConceptEdges,
  getRelatedConcepts,
} = require('../js/connections-helpers.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n▸ Connections Helpers Tests\n');

const nodesById = new Map([
  ['zeus', { id: 'zeus', unicode: 'Zeús' }],
  ['thor', { id: 'thor', unicode: 'Þórr' }],
  ['indra', { id: 'indra', unicode: 'Indra' }],
]);

const edges = [
  { source: 'zeus', target: 'thor', relationship: 'Thunder', category: 'phenomenon', strength: 3 },
  {
    source: 'zeus',
    target: 'indra',
    relationship: 'Sky sovereign',
    category: 'function',
    strength: 2,
  },
  {
    source: 'thor',
    target: 'indra',
    relationship: 'Warrior storm',
    category: 'narrative-role',
    strength: 1,
  },
];

test('filterEdgesForNode finds edges by string source/target', () => {
  const result = filterEdgesForNode(
    edges,
    'zeus',
    nodesById,
    new Set(['function', 'phenomenon', 'narrative-role']),
    1
  );
  assert.strictEqual(result.length, 2, 'should return two edges for zeus');
  assert.ok(
    result.every((e) => e.targetId !== 'zeus'),
    'every result should point away from zeus'
  );
  assert.ok(
    result.every((e) => e.target),
    'every result should resolve its target node'
  );
});

test('filterEdgesForNode applies category filter', () => {
  const result = filterEdgesForNode(edges, 'zeus', nodesById, new Set(['function']), 1);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].category, 'function');
});

test('filterEdgesForNode applies strength filter', () => {
  const result = filterEdgesForNode(
    edges,
    'zeus',
    nodesById,
    new Set(['function', 'phenomenon', 'narrative-role']),
    3
  );
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].strength, 3);
});

test('filterEdgesForNode sorts by descending strength', () => {
  const result = filterEdgesForNode(
    edges,
    'zeus',
    nodesById,
    new Set(['function', 'phenomenon', 'narrative-role']),
    1
  );
  assert.ok(result[0].strength >= result[1].strength, 'should be sorted descending');
});

test('isNeighbor returns true for directly connected nodes', () => {
  assert.strictEqual(isNeighbor(edges, 'thor', 'zeus'), true);
  assert.strictEqual(isNeighbor(edges, 'indra', 'zeus'), true);
});

test('isNeighbor returns false for unconnected nodes', () => {
  assert.strictEqual(isNeighbor(edges, 'thor', 'unknown'), false);
});

test('isNeighbor works regardless of edge direction', () => {
  assert.strictEqual(isNeighbor(edges, 'thor', 'indra'), true);
  assert.strictEqual(isNeighbor(edges, 'indra', 'thor'), true);
});

test('deriveConcepts creates one concept per unique relationship', () => {
  const concepts = deriveConcepts(edges);
  assert.strictEqual(concepts.length, 3);
  assert.ok(concepts.every((c) => c.type === 'concept'));
  assert.ok(concepts.some((c) => c.relationship === 'Thunder'));
});

test('buildConceptEdges links concepts to both deities', () => {
  const concepts = deriveConcepts(edges);
  const conceptEdges = buildConceptEdges(edges);
  assert.strictEqual(conceptEdges.length, 6);
  assert.ok(conceptEdges.every((e) => e.type === 'concept-deity'));
  const thunder = concepts.find((c) => c.relationship === 'Thunder');
  assert.ok(conceptEdges.some((e) => e.source === thunder.id && e.target === 'zeus'));
  assert.ok(conceptEdges.some((e) => e.source === thunder.id && e.target === 'thor'));
});

test('getRelatedConcepts returns concepts for a deity', () => {
  const conceptEdges = buildConceptEdges(edges);
  const related = getRelatedConcepts(conceptEdges, 'zeus');
  assert.strictEqual(related.length, 2);
  assert.ok(related.some((r) => r.relationship === 'Thunder'));
  assert.ok(related.some((r) => r.relationship === 'Sky sovereign'));
});

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
