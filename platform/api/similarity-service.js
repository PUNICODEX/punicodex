/**
 * PÚNYCODEX — Cross-cultural similarity service
 *
 * Loads the generated similarity graph and exposes fast adjacency lookups
 * for API v1/v2 endpoints.
 */

const { LEXICON } = require('../../type/js/lexicon.js');

const entriesById = new Map(LEXICON.map((entry) => [entry.id, entry]));

function pantheonLabel(pantheon) {
  if (!pantheon) return null;
  return (
    {
      greek: 'Greek',
      'greek-location': 'Greek Location',
      norse: 'Norse',
      egyptian: 'Egyptian',
      sanskrit: 'Sanskrit',
      celtic: 'Celtic',
      mesopotamian: 'Mesopotamian',
      polynesian: 'Polynesian',
      japanese: 'Japanese',
      nahuatl: 'Nahuatl',
      yoruba: 'Yoruba',
      slavic: 'Slavic',
      zoroastrian: 'Zoroastrian',
      incan: 'Incan',
      chinese: 'Chinese',
      buddhist: 'Buddhist',
      taoist: 'Taoist',
      korean: 'Korean',
      canaanite: 'Canaanite',
      phoenician: 'Phoenician',
      hittite: 'Hittite',
    }[pantheon] || pantheon
  );
}

function loadGraph() {
  try {
    return require('./similarities.json');
  } catch (_e) {
    return null;
  }
}

function loadTaxonomy() {
  try {
    return require('./connection-taxonomy.json');
  } catch (_e) {
    return null;
  }
}

const graph = loadGraph();
const taxonomy = loadTaxonomy();
const relationshipToConcept = new Map();

function buildConceptIndex() {
  if (!taxonomy || !taxonomy.concepts) return;
  for (const concept of Object.values(taxonomy.concepts)) {
    for (const rel of concept.relationships || []) {
      relationshipToConcept.set(rel, concept);
    }
  }
}

buildConceptIndex();

function getConceptForRelationship(relationship) {
  if (!relationship) return null;
  return relationshipToConcept.get(relationship) || null;
}

function getTaxonomy() {
  return taxonomy;
}

// Adjacency map: id -> array of connected edge records (undirected).
const adjacency = new Map();
const nodesById = new Map();
const relationshipCounts = new Map();
const categoryCounts = new Map();

function buildIndex() {
  if (!graph) return;

  for (const node of graph.nodes) {
    nodesById.set(node.id, node);
  }

  for (const edge of graph.edges) {
    const a = edge.source;
    const b = edge.target;

    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push(edge);
    adjacency.get(b).push({ ...edge, source: b, target: a });

    // Count relationship types.
    const relKey = `${edge.relationship}|${edge.category}`;
    relationshipCounts.set(relKey, (relationshipCounts.get(relKey) || 0) + 1);
    categoryCounts.set(edge.category, (categoryCounts.get(edge.category) || 0) + 1);
  }
}

buildIndex();

function isValidId(id) {
  return typeof id === 'string' && entriesById.has(id);
}

function normalizeId(id) {
  return typeof id === 'string' ? id.toLowerCase().trim() : null;
}

function matchesFilters(edge, { relationship, category, minStrength }) {
  if (edge.strength < minStrength) return false;
  if (relationship && edge.relationship !== relationship) return false;
  if (category && edge.category !== category) return false;
  return true;
}

function nodeForId(id) {
  return (
    nodesById.get(id) || {
      id,
      ascii: entriesById.get(id)?.ascii || null,
      unicode: entriesById.get(id)?.unicode || null,
      pantheon: entriesById.get(id)?.pantheon || null,
      pantheonLabel: pantheonLabel(entriesById.get(id)?.pantheon),
      domain: entriesById.get(id)?.domain || null,
    }
  );
}

function getSimilarities(rawId, options = {}) {
  const id = normalizeId(rawId);
  if (!isValidId(id)) return null;

  const { limit = 50, relationship, category, minStrength = 1 } = options;

  const connected = adjacency.get(id) || [];
  const items = connected
    .filter((edge) => matchesFilters(edge, { relationship, category, minStrength }))
    .map((edge) => ({
      target: edge.target,
      relationship: edge.relationship,
      category: edge.category,
      strength: edge.strength,
      bidirectional: edge.bidirectional,
      note: edge.note,
      targetEntry: nodeForId(edge.target),
      concept: getConceptForRelationship(edge.relationship),
    }))
    .sort((a, b) => {
      if (b.strength !== a.strength) return b.strength - a.strength;
      return a.target.localeCompare(b.target);
    })
    .slice(0, limit);

  return {
    id,
    count: items.length,
    items,
  };
}

function getSimilarityCount(rawId) {
  const id = normalizeId(rawId);
  if (!isValidId(id)) return null;
  const connected = adjacency.get(id) || [];
  return connected.length;
}

function collectNeighbors(centerId, options = {}) {
  const { minStrength = 1, relationship, category } = options;
  const connected = adjacency.get(centerId) || [];
  return connected
    .filter((edge) => matchesFilters(edge, { relationship, category, minStrength }))
    .sort((a, b) => {
      if (b.strength !== a.strength) return b.strength - a.strength;
      return a.target.localeCompare(b.target);
    });
}

function getGraph(rawId, options = {}) {
  const id = normalizeId(rawId);
  if (!isValidId(id)) return null;

  const { depth = 1, limit = 80, minStrength = 1, relationship, category } = options;

  const maxDepth = Math.max(1, Math.min(2, Number(depth) || 1));
  const maxNodes = Math.max(1, Math.min(200, Number(limit) || 80));

  const depth1 = collectNeighbors(id, { minStrength, relationship, category });
  const includedIds = new Set([id]);
  const depth1Ids = [];

  for (const edge of depth1) {
    if (includedIds.size >= maxNodes) break;
    if (!includedIds.has(edge.target)) {
      includedIds.add(edge.target);
      depth1Ids.push(edge.target);
    }
  }

  if (maxDepth >= 2) {
    for (const neighborId of depth1Ids) {
      if (includedIds.size >= maxNodes) break;
      const depth2 = collectNeighbors(neighborId, { minStrength, relationship, category });
      for (const edge of depth2) {
        if (includedIds.size >= maxNodes) break;
        if (edge.target !== id && !includedIds.has(edge.target)) {
          includedIds.add(edge.target);
        }
      }
    }
  }

  const returnedIds = [...includedIds];
  const returnedIdSet = new Set(returnedIds);
  const nodes = returnedIds.map((nodeId) => nodeForId(nodeId));

  const edges = (graph?.edges || [])
    .filter((edge) => returnedIdSet.has(edge.source) && returnedIdSet.has(edge.target))
    .map((edge) => ({
      ...edge,
      concept: getConceptForRelationship(edge.relationship),
    }));

  const conceptsInGraph = new Map();
  for (const edge of edges) {
    if (edge.concept) {
      conceptsInGraph.set(edge.concept.id, edge.concept);
    }
  }

  return {
    id,
    meta: {
      depth: maxDepth,
      nodeLimit: maxNodes,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      concepts: Array.from(conceptsInGraph.values()).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      ),
    },
    nodes,
    edges,
  };
}

function listRelationshipTypes() {
  if (!graph) return [];
  const types = [];
  for (const [key, count] of relationshipCounts.entries()) {
    const [relationship, category] = key.split('|');
    types.push({ relationship, category, count });
  }
  return types.sort((a, b) => a.relationship.localeCompare(b.relationship));
}

function getRelationshipStats() {
  const byRelationship = {};
  const byCategory = {};

  for (const [key, count] of relationshipCounts.entries()) {
    const [relationship, category] = key.split('|');
    byRelationship[relationship] = { relationship, category, count };
    byCategory[category] = byCategory[category] || { category, count: 0 };
    byCategory[category].count += count;
  }

  return {
    totalEdges: graph?.edges?.length || 0,
    totalNodes: graph?.nodes?.length || 0,
    byRelationship: Object.values(byRelationship).sort((a, b) =>
      a.relationship.localeCompare(b.relationship)
    ),
    byCategory: Object.values(byCategory).sort((a, b) => a.category.localeCompare(b.category)),
  };
}

function getFullGraph() {
  return graph;
}

module.exports = {
  getSimilarities,
  getGraph,
  listRelationshipTypes,
  getRelationshipStats,
  getSimilarityCount,
  getTaxonomy,
  getConceptForRelationship,
  getFullGraph,
};
