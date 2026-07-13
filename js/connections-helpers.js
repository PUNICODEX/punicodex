/**
 * PÚNYCODEX — Connections graph helpers
 * Pure functions for filtering edges, resolving neighbours, building concept branches,
 * and finding paths. Works in the browser (global) and Node (CommonJS).
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
    return `${CONCEPT_PREFIX}${String(relationship).replace(/\s+/g, '_').toLowerCase()}`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capitalize(str) {
    return String(str).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getConceptForRelationship(relationship, taxonomy) {
    if (!taxonomy || !relationship) return null;
    for (const concept of Object.values(taxonomy.concepts || {})) {
      if ((concept.relationships || []).includes(relationship)) return concept;
    }
    return null;
  }

  function deriveConcepts(edges, taxonomy) {
    const concepts = new Map();
    for (const e of edges) {
      if (!e.relationship) continue;
      const concept = taxonomy ? getConceptForRelationship(e.relationship, taxonomy) : null;
      const id = concept ? concept.id : conceptId(e.relationship);
      if (!concepts.has(id)) {
        concepts.set(id, {
          id,
          type: 'concept',
          unicode: concept ? concept.label : e.relationship,
          relationship: e.relationship,
          category: e.category,
          concept,
          pantheon: 'concept',
          pantheonLabel: 'Concept',
          domain: concept ? `Shared ${concept.domain}` : `Shared ${e.category}`,
          strength: e.strength || 1,
        });
      } else {
        const c = concepts.get(id);
        c.strength = Math.max(c.strength, e.strength || 1);
      }
    }
    return Array.from(concepts.values());
  }

  function buildConceptEdges(edges, taxonomy) {
    const conceptEdges = [];
    for (const e of edges) {
      if (!e.relationship) continue;
      const concept = taxonomy ? getConceptForRelationship(e.relationship, taxonomy) : null;
      const cid = concept ? concept.id : conceptId(e.relationship);
      conceptEdges.push({
        source: cid,
        target: e.source,
        relationship: e.relationship,
        category: e.category,
        strength: e.strength || 1,
        type: 'concept-deity',
        concept,
      });
      conceptEdges.push({
        source: cid,
        target: e.target,
        relationship: e.relationship,
        category: e.category,
        strength: e.strength || 1,
        type: 'concept-deity',
        concept,
      });
    }
    return conceptEdges;
  }

  function filterEdgesForNode(edges, nodeId, nodesById, activeCategories, minStrength) {
    return edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const targetId = e.source === nodeId ? e.target : e.source;
        const target = nodesById ? nodesById.get(targetId) : null;
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
          concept: e.concept,
        });
      }
    }
    return Array.from(concepts.values());
  }

  function buildBranches(centerId, edges, nodesById, taxonomy, options = {}) {
    const { minStrength = 1, activeCategories = new Set(['function', 'phenomenon', 'narrative-role']) } = options;
    const branches = new Map();

    for (const e of edges) {
      if ((e.strength || 1) < minStrength) continue;
      if (!activeCategories.has(e.category)) continue;
      if (e.source !== centerId && e.target !== centerId) continue;

      const targetId = e.source === centerId ? e.target : e.source;
      const target = nodesById ? nodesById.get(targetId) : null;
      if (!target) continue;

      const concept = e.concept || getConceptForRelationship(e.relationship, taxonomy);
      const conceptId = concept ? concept.id : conceptId(e.relationship);
      const conceptLabel = concept ? concept.label : e.relationship;
      const domain = concept ? taxonomy.domains[concept.domain] : null;

      if (!branches.has(conceptId)) {
        branches.set(conceptId, {
          conceptId,
          concept,
          label: conceptLabel,
          domain,
          category: e.category,
          strength: e.strength || 1,
          items: [],
        });
      }
      const branch = branches.get(conceptId);
      branch.items.push({
        targetId,
        target,
        strength: e.strength || 1,
        relationship: e.relationship,
        note: e.note,
      });
      branch.items.sort((a, b) => b.strength - a.strength);
    }

    return Array.from(branches.values()).sort((a, b) => {
      if (a.concept && b.concept) return (a.concept.order || 0) - (b.concept.order || 0);
      if (a.domain && b.domain) return (a.domain.order || 0) - (b.domain.order || 0);
      return a.label.localeCompare(b.label);
    });
  }

  function getConceptMembers(conceptId, edges, nodesById) {
    const seen = new Set();
    const members = [];
    for (const e of edges) {
      const concept = e.concept;
      const cid = concept ? concept.id : conceptId(e.relationship);
      if (cid !== conceptId) continue;
      for (const targetId of [e.source, e.target]) {
        if (seen.has(targetId)) continue;
        seen.add(targetId);
        const target = nodesById ? nodesById.get(targetId) : null;
        if (target && target.type !== 'concept') members.push({ targetId, target, strength: e.strength || 1 });
      }
    }
    return members.sort((a, b) => b.strength - a.strength);
  }

  function getSharedConcepts(aId, bId, edges) {
    const aConcepts = new Set();
    const shared = new Set();
    for (const e of edges) {
      const concept = e.concept || { id: conceptId(e.relationship), label: e.relationship };
      if (e.source === aId || e.target === aId) aConcepts.add(concept.id);
    }
    for (const e of edges) {
      const concept = e.concept || { id: conceptId(e.relationship), label: e.relationship };
      if ((e.source === bId || e.target === bId) && aConcepts.has(concept.id)) {
        shared.add(concept.id);
      }
    }
    return [...shared];
  }

  function findShortestPath(startId, endId, edges) {
    if (startId === endId) return [startId];
    const adj = new Map();
    for (const e of edges) {
      if (e.source === e.target) continue;
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source).push(e.target);
      adj.get(e.target).push(e.source);
    }
    const queue = [startId];
    const prev = new Map([[startId, null]]);
    while (queue.length) {
      const current = queue.shift();
      if (current === endId) break;
      for (const neighbor of adj.get(current) || []) {
        if (!prev.has(neighbor)) {
          prev.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }
    if (!prev.has(endId)) return null;
    const path = [];
    let cur = endId;
    while (cur !== null) {
      path.unshift(cur);
      cur = prev.get(cur);
    }
    return path;
  }

  return {
    CONCEPT_PREFIX,
    conceptId,
    escapeHtml,
    capitalize,
    getConceptForRelationship,
    deriveConcepts,
    buildConceptEdges,
    filterEdgesForNode,
    isNeighbor,
    getRelatedConcepts,
    buildBranches,
    getConceptMembers,
    getSharedConcepts,
    findShortestPath,
  };
});
