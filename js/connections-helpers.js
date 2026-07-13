/**
 * PÚNYCODEX — Connections graph helpers
 * Pure functions for filtering edges and resolving neighbours.
 * Works in the browser (global) and Node (CommonJS).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PX_CONNECTIONS_HELPERS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
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

  return { filterEdgesForNode, isNeighbor };
});
