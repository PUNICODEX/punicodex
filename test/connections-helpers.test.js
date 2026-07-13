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
  buildSunburstTree,
  layoutSunburst,
  buildRadialHubLayout,
  getSharedConcepts,
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

const taxonomy = {
  domains: {
    celestial: { id: 'celestial', label: 'Celestial', color: '#D4AF37', order: 1 },
    society: { id: 'society', label: 'Society', color: '#4169E1', order: 2 },
  },
  concepts: {
    thunder: {
      id: 'thunder',
      label: 'Thunder',
      domain: 'celestial',
      order: 1,
      relationships: ['Thunder'],
    },
    'sky-sovereign': {
      id: 'sky-sovereign',
      label: 'Sky Sovereign',
      domain: 'society',
      order: 2,
      relationships: ['Sky sovereign'],
    },
    'warrior-storm': {
      id: 'warrior-storm',
      label: 'Warrior Storm',
      domain: 'society',
      order: 3,
      relationships: ['Warrior storm'],
    },
  },
};

const sunburstNodes = new Map([
  ['zeus', { id: 'zeus', unicode: 'Zeús', pantheon: 'greek' }],
  ['thor', { id: 'thor', unicode: 'Þórr', pantheon: 'norse' }],
  ['indra', { id: 'indra', unicode: 'Indra', pantheon: 'sanskrit' }],
]);

test('buildSunburstTree produces a root → center → concept → deity hierarchy', () => {
  const tree = buildSunburstTree('zeus', edges, sunburstNodes, taxonomy);
  assert.ok(tree, 'tree should exist');
  assert.strictEqual(tree.type, 'root');
  assert.strictEqual(tree.children[0].type, 'center');
  // Only edges touching zeus become branches.
  assert.strictEqual(tree.children[0].children.length, 2);
  assert.ok(tree.children[0].children.every((c) => c.type === 'concept'));
  const thunderBranch = tree.children[0].children.find((c) => c.id === 'thunder');
  assert.ok(thunderBranch);
  assert.strictEqual(thunderBranch.children.length, 1);
  assert.strictEqual(thunderBranch.children[0].type, 'deity');
});

test('layoutSunburst assigns deterministic angles and radii', () => {
  const tree = buildSunburstTree('zeus', edges, sunburstNodes, taxonomy);
  const layout = layoutSunburst(tree, 200);
  assert.ok(layout.length > 0);
  const center = layout.find((n) => n.type === 'center');
  assert.ok(center);
  assert.strictEqual(center.x0, 0);
  assert.ok(center.x1 > center.x0);
  const concepts = layout.filter((n) => n.type === 'concept');
  assert.strictEqual(concepts.length, 2);
  assert.ok(concepts.every((c) => c.x1 > c.x0 && c.y1 > c.y0));
});

test('layoutSunburst is deterministic', () => {
  const tree = buildSunburstTree('zeus', edges, sunburstNodes, taxonomy);
  const a = layoutSunburst(tree, 200)
    .map((n) => `${n.id}:${n.x0.toFixed(4)}:${n.y0.toFixed(4)}`)
    .join('|');
  const b = layoutSunburst(tree, 200)
    .map((n) => `${n.id}:${n.x0.toFixed(4)}:${n.y0.toFixed(4)}`)
    .join('|');
  assert.strictEqual(a, b);
});

test('buildRadialHubLayout places center and one spoke per concept', () => {
  const layout = buildRadialHubLayout('zeus', edges, sunburstNodes, taxonomy, { radius: 200 });
  assert.ok(layout, 'layout should exist');
  assert.strictEqual(layout.center.id, 'zeus');
  assert.strictEqual(layout.nodes.length, 3, 'center + 2 connected deities');
  assert.strictEqual(layout.links.length, 2);
  assert.strictEqual(layout.spokes.length, 2);
  assert.ok(layout.spokes.every((s) => s.concept.startAngle < s.concept.endAngle));
});

test('buildRadialHubLayout respects pantheon filter', () => {
  const activePantheons = new Set(['greek', 'norse']);
  const layout = buildRadialHubLayout('zeus', edges, sunburstNodes, taxonomy, {
    radius: 200,
    activePantheons,
  });
  assert.strictEqual(
    layout.nodes.some((n) => n.id === 'indra'),
    false
  );
  assert.strictEqual(layout.spokes.length, 1);
});

test('buildRadialHubLayout respects strength filter', () => {
  const layout = buildRadialHubLayout('zeus', edges, sunburstNodes, taxonomy, {
    radius: 200,
    minStrength: 3,
  });
  assert.strictEqual(
    layout.nodes.some((n) => n.id === 'indra'),
    false
  );
  assert.strictEqual(
    layout.nodes.some((n) => n.id === 'thor'),
    true
  );
});

test('buildRadialHubLayout is deterministic', () => {
  const a = buildRadialHubLayout('zeus', edges, sunburstNodes, taxonomy, { radius: 200 });
  const b = buildRadialHubLayout('zeus', edges, sunburstNodes, taxonomy, { radius: 200 });
  const coordsA = a.nodes.map((n) => `${n.id}:${n.x.toFixed(4)}:${n.y.toFixed(4)}`).join('|');
  const coordsB = b.nodes.map((n) => `${n.id}:${n.x.toFixed(4)}:${n.y.toFixed(4)}`).join('|');
  assert.strictEqual(coordsA, coordsB);
});

test('buildRadialHubLayout returns null for unknown center', () => {
  const layout = buildRadialHubLayout('unknown', edges, sunburstNodes, taxonomy, { radius: 200 });
  assert.strictEqual(layout, null);
});

test('getSharedConcepts finds common concepts between two nodes', () => {
  const conceptEdges = buildConceptEdges(edges, taxonomy);
  const shared = getSharedConcepts('zeus', 'thor', conceptEdges);
  assert.ok(shared.includes('thunder'));
  const notShared = getSharedConcepts('zeus', 'indra', conceptEdges);
  assert.ok(!notShared.includes('warrior-storm'));
});

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
