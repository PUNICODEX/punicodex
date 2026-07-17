/**
 * PuniCodex — Connections graph helpers
 * Pure functions for filtering edges, resolving neighbours, building concept branches,
 * sunburst trees, and finding paths. Works in the browser (global) and Node (CommonJS).
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
      const cid = concept ? concept.id : conceptId(e.relationship);
      const label = concept ? concept.label : e.relationship;
      const domain = concept ? taxonomy.domains[concept.domain] : null;

      if (!branches.has(cid)) {
        branches.set(cid, {
          conceptId: cid,
          concept,
          label,
          domain,
          category: e.category,
          strength: e.strength || 1,
          items: [],
        });
      }
      const branch = branches.get(cid);
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

  function buildSunburstTree(centerId, edges, nodesById, taxonomy, options = {}) {
    const center = nodesById ? nodesById.get(centerId) : null;
    if (!center) return null;

    const branches = buildBranches(centerId, edges, nodesById, taxonomy, options);

    return {
      id: '__root__',
      name: 'Root',
      type: 'root',
      children: [
        {
          id: centerId,
          name: center.unicode,
          type: 'center',
          pantheon: center.pantheon,
          data: center,
          children: branches.map((branch) => ({
            id: branch.conceptId,
            name: branch.label,
            type: 'concept',
            domain: branch.domain,
            concept: branch.concept,
            data: branch,
            children: branch.items.map((item) => ({
              id: item.targetId,
              name: item.target.unicode,
              type: 'deity',
              pantheon: item.target.pantheon,
              strength: item.strength,
              relationship: item.relationship,
              note: item.note,
              data: item.target,
            })),
          })),
        },
      ],
    };
  }

  function layoutSunburst(tree, radius, options = {}) {
    if (!tree) return [];
    const { gap = 0.02, centerRing = 0.18, conceptRing = 0.22, deityRing = 0.38 } = options;

    const totalAngle = 2 * Math.PI;
    const nodes = [];

    function addNode(node, depth, ancestors, x0, x1, y0, y1) {
      const entry = {
        ...node,
        depth,
        ancestors,
        x0,
        x1,
        y0,
        y1,
      };
      nodes.push(entry);
      return entry;
    }

    function layoutChildren(children, ancestors, startAngle, endAngle, innerR, outerR) {
      if (!children || children.length === 0) return;
      const sector = endAngle - startAngle;
      const perChild = sector / children.length;
      children.forEach((child, i) => {
        const cStart = startAngle + i * perChild + gap / 2;
        const cEnd = startAngle + (i + 1) * perChild - gap / 2;
        addNode(child, ancestors.length + 1, ancestors, cStart, cEnd, innerR, outerR);
      });
    }

    // Root
    addNode(tree, 0, [], 0, totalAngle, 0, 0);

    const center = tree.children[0];
    // Center ring
    addNode(center, 1, [tree.id], 0, totalAngle, 0, radius * centerRing);

    const branches = center.children || [];
    const branchSector = totalAngle / Math.max(1, branches.length);

    branches.forEach((branch, i) => {
      const start = i * branchSector + gap / 2;
      const end = (i + 1) * branchSector - gap / 2;
      const conceptInner = radius * (centerRing + 0.02);
      const conceptOuter = radius * (centerRing + 0.02 + conceptRing);
      addNode(branch, 2, [tree.id, center.id], start, end, conceptInner, conceptOuter);

      const deities = branch.children || [];
      const deitySector = (end - start) / Math.max(1, deities.length);
      deities.forEach((deity, j) => {
        const dStart = start + j * deitySector + gap / 2;
        const dEnd = start + (j + 1) * deitySector - gap / 2;
        const strength = deity.strength || 1;
        const outer = radius * (centerRing + 0.02 + conceptRing + deityRing);
        const inner = radius * (centerRing + 0.02 + conceptRing + (deityRing * (4 - strength)) / 4);
        addNode(deity, 3, [tree.id, center.id, branch.id], dStart, dEnd, inner, outer);
      });
    });

    return nodes;
  }

  /**
   * Build a radial "constellation atlas" layout.
   *
   * Center deity sits at (0,0). Each concept becomes a radial spoke.
   * Connected deities are placed along their concept spoke at a distance
   * derived from connection strength. The result is deterministic and
   * easy to read: one angle per concept, one radius per deity strength.
   */
  function buildRadialHubLayout(centerId, edges, nodesById, taxonomy, options = {}) {
    const center = nodesById ? nodesById.get(centerId) : null;
    if (!center) return null;

    const branches = buildBranches(centerId, edges, nodesById, taxonomy, options);
    if (!branches.length) {
      return {
        center,
        spokes: [],
        nodes: [{ ...center, x: 0, y: 0 }],
        links: [],
        radius: options.radius || 300,
      };
    }

    const radius = options.radius || 300;
    const centerRadius = options.centerRadius || 44;
    const minConceptGap = (options.minConceptGap || 18) * (Math.PI / 180);
    const totalAngle = 2 * Math.PI;
    const availableAngle = totalAngle - branches.length * minConceptGap;
    const sector = availableAngle / branches.length;

    // Apply pantheon filter to branches so empty spokes do not consume space.
    const visibleBranches = branches
      .map((branch) => ({
        ...branch,
        items: branch.items.filter((item) => {
          const p = item.target?.pantheon;
          return !options.activePantheons || options.activePantheons.size === 0 || options.activePantheons.has(p);
        }),
      }))
      .filter((branch) => branch.items.length > 0);

    const spokeCount = visibleBranches.length;
    const adjustedSector = (totalAngle - spokeCount * minConceptGap) / Math.max(1, spokeCount);

    const spokes = [];
    const nodes = [{ ...center, x: 0, y: 0 }];
    const links = [];

    visibleBranches.forEach((branch, i) => {
      const startAngle = -Math.PI / 2 + i * (adjustedSector + minConceptGap) + minConceptGap / 2;
      const endAngle = startAngle + adjustedSector;
      const midAngle = (startAngle + endAngle) / 2;

      const concept = {
        ...branch.concept,
        id: branch.conceptId,
        label: branch.label,
        domain: branch.domain,
        category: branch.category,
        startAngle,
        endAngle,
        midAngle,
        count: branch.items.length,
      };

      spokes.push({
        concept,
        angle: midAngle,
        innerR: centerRadius + 10,
        outerR: radius,
      });

      branch.items.forEach((item, j) => {
        const strength = item.strength || 1;
        // Strength 3 → closest to outer edge; strength 1 → closer to center.
        const ratio = 0.35 + (strength / 3) * 0.55;
        // Slight jitter per item so overlapping same-strength deities are visible.
        const jitter = (j % 2 === 0 ? 1 : -1) * (Math.floor(j / 2) * 0.018);
        const distance = radius * Math.max(0.32, Math.min(0.96, ratio + jitter));

        const node = {
          ...item.target,
          branchId: branch.conceptId,
          concept,
          relationship: item.relationship,
          strength,
          note: item.note,
          angle: midAngle,
          distance,
          x: Math.cos(midAngle) * distance,
          y: Math.sin(midAngle) * distance,
        };
        nodes.push(node);
        links.push({
          source: center,
          target: node,
          concept,
          strength,
        });
      });
    });

    return {
      center,
      spokes,
      nodes,
      links,
      radius,
      centerRadius,
    };
  }

  /**
   * Build a two-ring sunburst tree for a selected domain:
   * root → domain → pantheon → deity.
   * Only edges whose relationship maps to a concept in the domain are included.
   */
  function buildDomainPieTree(domainId, edges, nodesById, taxonomy) {
    if (!taxonomy?.domains?.[domainId]) return null;

    const domain = taxonomy.domains[domainId];
    const conceptIds = new Set(
      Object.values(taxonomy.concepts || {})
        .filter((c) => c.domain === domainId)
        .map((c) => c.id),
    );

    const pantheons = new Map();

    for (const e of edges) {
      const concept = e.concept || getConceptForRelationship(e.relationship, taxonomy);
      if (!concept || !conceptIds.has(concept.id)) continue;

      for (const targetId of [e.source, e.target]) {
        const target = nodesById ? nodesById.get(targetId) : null;
        if (!target || target.type === 'concept') continue;
        if (!pantheons.has(target.pantheon)) {
          pantheons.set(target.pantheon, {
            id: target.pantheon,
            name: target.pantheonLabel || capitalize(target.pantheon),
            type: 'pantheon',
            pantheon: target.pantheon,
            children: new Map(),
          });
        }
        const p = pantheons.get(target.pantheon);
        if (!p.children.has(target.id)) {
          p.children.set(target.id, {
            id: target.id,
            name: target.unicode,
            type: 'deity',
            pantheon: target.pantheon,
            data: target,
            concept,
            strength: e.strength || 1,
          });
        } else {
          const d = p.children.get(target.id);
          d.strength = Math.max(d.strength, e.strength || 1);
        }
      }
    }

    const pantheonNodes = Array.from(pantheons.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        ...p,
        children: Array.from(p.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }));

    if (!pantheonNodes.length) return null;

    return {
      id: '__root__',
      name: domain.label,
      type: 'root',
      domain,
      children: [
        {
          id: domainId,
          name: domain.label,
          type: 'domain',
          domain,
          children: pantheonNodes,
        },
      ],
    };
  }

  function getDomainDeities(domainId, edges, nodesById, taxonomy) {
    const tree = buildDomainPieTree(domainId, edges, nodesById, taxonomy);
    if (!tree) return [];
    const deities = [];
    for (const pantheon of tree.children[0].children) {
      for (const deity of pantheon.children) {
        deities.push({ ...deity.data, concept: deity.concept, strength: deity.strength });
      }
    }
    return deities;
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
    buildSunburstTree,
    layoutSunburst,
    buildRadialHubLayout,
    buildDomainPieTree,
    getDomainDeities,
    getConceptMembers,
    getSharedConcepts,
    findShortestPath,
  };
});
