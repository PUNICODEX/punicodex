/**
 * PÚNYCODEX — Connections graph helpers
 * Pure functions for filtering edges, resolving neighbours, and deriving concept nodes.
 * Works in the browser (global) and Node (CommonJS).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PX_CONNECTIONS_HELPERS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const CONCEPT_PREFIX = '__concept__';

  function conceptId(relationship) {
    return `${CONCEPT_PREFIX}${relationship.replace(/\s+/g, '_').toLowerCase()}`;
  }

  function deriveConcepts(edges) {
    const concepts = new Map();
    for (const e of edges) {
      if (!e.relationship || !e.category) continue;
      const id = conceptId(e.relationship);
      if (!concepts.has(id)) {
        concepts.set(id, {
          id,
          type: 'concept',
          unicode: e.relationship,
          relationship: e.relationship,
          category: e.category,
          pantheon: 'concept',
          pantheonLabel: 'Concept',
          domain: `Shared ${e.category}`,
          strength: e.strength || 1,
        });
      } else {
        const c = concepts.get(id);
        c.strength = Math.max(c.strength, e.strength || 1);
      }
    }
    return Array.from(concepts.values());
  }

  function buildConceptEdges(edges) {
    const conceptEdges = [];
    for (const e of edges) {
      if (!e.relationship) continue;
      const cid = conceptId(e.relationship);
      conceptEdges.push({
        source: cid,
        target: e.source,
        relationship: e.relationship,
        category: e.category,
        strength: e.strength || 1,
        type: 'concept-deity',
      });
      conceptEdges.push({
        source: cid,
        target: e.target,
        relationship: e.relationship,
        category: e.category,
        strength: e.strength || 1,
        type: 'concept-deity',
      });
    }
    return conceptEdges;
  }

  function filterEdgesForNode(edges, nodeId, nodesById, activeCategories, minStrength) {
    return edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const targetId = e.source === nodeId ? e.target : e.source;
        const target = nodesById.get(targetId);
        return { ...e, targetId, target };
      })
      .filter((e) => activeCategories.has(e.category) && (e.strength || 1) >= minStrength)
      .sort((a, b) => (b.strength || 1) - (a.strength || 1));
  }

  function isNeighbor(edges, nodeId, centerId) {
    return edges.some(
      (e) =>
        (e.source === centerId && e.target === nodeId) ||
        (e.source === nodeId && e.target === centerId),
    );
  }

  function getRelatedConcepts(edges, nodeId) {
    const concepts = new Map();
    for (const e of edges) {
      if (e.type !== 'concept-deity') continue;
      if (e.target === nodeId) {
        concepts.set(e.source, {
          conceptId: e.source,
          relationship: e.relationship,
          category: e.category,
          strength: e.strength,
        });
      }
    }
    return Array.from(concepts.values());
  }

  return {
    CONCEPT_PREFIX,
    conceptId,
    deriveConcepts,
    buildConceptEdges,
    filterEdgesForNode,
    isNeighbor,
    getRelatedConcepts,
  };
});
