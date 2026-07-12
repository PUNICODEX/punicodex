/**
 * PÚNYCODEX — Similarity graph generator
 *
 * Reads the canonical lexicon and similarity groups, expands function groups
 * into undirected edges, merges high-confidence curated pairs, and writes the
 * generated graph consumed by the API and browser renderer.
 *
 * Outputs:
 *   - platform/api/similarities.json
 *   - platform/browser/renderer/similarities.json
 *
 * Run via: npm run generate
 */

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');
const { FUNCTION_GROUPS, CURATED_PAIRS } = require('../type/js/similarity-groups.js');

const root = path.join(__dirname, '..');

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

function makeEdgeKey(source, target) {
  // Undirected edge key: sorted source/target.
  return source < target ? `${source}|${target}` : `${target}|${source}`;
}

function expandGroups(groups) {
  const edges = new Map();
  for (const group of groups) {
    const ids = group.ids;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const source = ids[i];
        const target = ids[j];
        const key = makeEdgeKey(source, target);
        edges.set(key, {
          source,
          target,
          relationship: group.relationship,
          category: group.category,
          strength: group.strength,
          bidirectional: true,
          note: group.note,
        });
      }
    }
  }
  return edges;
}

function mergeCuratedPairs(edges, pairs) {
  for (const pair of pairs) {
    const source = pair.sourceId;
    const target = pair.targetId;
    // Skip self-loops from the main graph; they are reserved for integrity checks.
    if (source === target) continue;
    const key = makeEdgeKey(source, target);
    // Curated pairs override group-derived edges.
    edges.set(key, {
      source,
      target,
      relationship: pair.relationship,
      category: pair.category,
      strength: pair.strength,
      bidirectional: pair.bidirectional !== false,
      note: pair.note,
    });
  }
  return edges;
}

function buildNodes(edgeList, entriesById) {
  const involved = new Set();
  for (const edge of edgeList) {
    involved.add(edge.source);
    involved.add(edge.target);
  }
  return [...involved]
    .sort()
    .map((id) => {
      const entry = entriesById.get(id);
      if (!entry) {
        throw new Error(`Missing lexicon entry for similarity node "${id}"`);
      }
      return {
        id: entry.id,
        ascii: entry.ascii,
        unicode: entry.unicode,
        pantheon: entry.pantheon,
        pantheonLabel: pantheonLabel(entry.pantheon),
        domain: entry.domain || null,
      };
    });
}

function main() {
  const entriesById = new Map(LEXICON.map((entry) => [entry.id, entry]));

  // Validate every referenced id exists in the lexicon.
  const allReferenced = new Set();
  for (const group of FUNCTION_GROUPS) {
    for (const id of group.ids) allReferenced.add(id);
  }
  for (const pair of CURATED_PAIRS) {
    allReferenced.add(pair.sourceId);
    allReferenced.add(pair.targetId);
  }
  for (const id of allReferenced) {
    if (!entriesById.has(id)) {
      throw new Error(`Unknown lexicon id referenced in similarities: "${id}"`);
    }
  }

  const edges = expandGroups(FUNCTION_GROUPS);
  mergeCuratedPairs(edges, CURATED_PAIRS);
  const edgeList = [...edges.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return 0;
  });

  const nodes = buildNodes(edgeList, entriesById);
  const relationships = [...new Set(edgeList.map((e) => e.relationship))].sort();
  const categories = [...new Set(edgeList.map((e) => e.category))].sort();

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edgeList.length,
      relationships,
      categories,
    },
    nodes,
    edges: edgeList,
  };

  const apiPath = path.join(root, 'platform', 'api', 'similarities.json');
  const rendererPath = path.join(root, 'platform', 'browser', 'renderer', 'similarities.json');

  fs.mkdirSync(path.dirname(apiPath), { recursive: true });
  fs.mkdirSync(path.dirname(rendererPath), { recursive: true });
  fs.writeFileSync(apiPath, JSON.stringify(output, null, 2));
  fs.writeFileSync(rendererPath, JSON.stringify(output, null, 2));

  console.log(`✓ Generated similarities.json`);
  console.log(`  nodes: ${nodes.length}`);
  console.log(`  edges: ${edgeList.length}`);
  console.log(`  relationships: ${relationships.length} (${relationships.join(', ')})`);
  console.log(`  categories: ${categories.length} (${categories.join(', ')})`);
}

main();
