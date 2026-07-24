#!/usr/bin/env node
/**
 * PuniCodex — Industry-pattern graph generator
 *
 * Reads the canonical industry-pattern map (type/js/industry-patterns.js)
 * and its alias vocabulary (type/js/industry-aliases.js), expands them into
 * per-entry pattern profiles, per-industry membership lists, and a term →
 * industry alias index, and writes the generated graph consumed by the
 * Patterns pages, the API, and the browser renderer.
 *
 * Outputs:
 *   - platform/api/industry-patterns.json
 *   - platform/browser/renderer/industry-patterns.json
 *
 * Run via: npm run generate
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');
const { INDUSTRY_SECTORS, INDUSTRY_GROUPS } = require('../type/js/industry-patterns.js');
const { INDUSTRY_ALIASES } = require('../type/js/industry-aliases.js');

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
      baltic: 'Baltic',
    }[pantheon] || pantheon
  );
}

function writeJsonIfChanged(filePath, data) {
  const next = JSON.stringify(data, null, 2);
  if (fs.existsSync(filePath)) {
    const prev = fs.readFileSync(filePath, 'utf8');
    if (prev === next) {
      console.log(`✓ ${path.relative(root, filePath)} (unchanged)`);
      return;
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next);
  console.log(`✓ ${path.relative(root, filePath)}`);
}

function main() {
  const entriesById = new Map(LEXICON.map((entry) => [entry.id, entry]));

  const sectors = INDUSTRY_SECTORS.map((s) => ({ ...s }));

  // Per-industry membership, sorted by weight then id for determinism.
  const industries = INDUSTRY_GROUPS.map((group) => {
    const members = group.entries
      .map((e) => {
        const lex = entriesById.get(e.id);
        if (!lex) throw new Error(`Missing lexicon entry for industry member "${e.id}"`);
        return {
          id: lex.id,
          ascii: lex.ascii,
          unicode: lex.unicode,
          pantheon: lex.pantheon,
          pantheonLabel: pantheonLabel(lex.pantheon),
          domain: lex.domain || null,
          weight: e.weight,
          why: e.why || group.note,
        };
      })
      .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    return {
      industry: group.industry,
      name: group.name,
      sector: group.sector,
      tagline: group.tagline,
      note: group.note,
      members,
    };
  }).sort((a, b) => a.industry.localeCompare(b.industry));

  // Per-entry pattern profile: which industries this entry maps to, strongest
  // first, with the specific justification.
  const byEntry = {};
  for (const group of industries) {
    for (const member of group.members) {
      if (!byEntry[member.id]) byEntry[member.id] = [];
      byEntry[member.id].push({
        industry: group.industry,
        name: group.name,
        sector: group.sector,
        tagline: group.tagline,
        weight: member.weight,
        why: member.why,
      });
    }
  }
  for (const id of Object.keys(byEntry)) {
    byEntry[id].sort((a, b) => b.weight - a.weight || a.industry.localeCompare(b.industry));
  }

  // Alias index: search term → industries it resolves to (one home per term,
  // enforced by the test suite), sorted by term for determinism.
  const aliases = {};
  for (const [industry, list] of Object.entries(INDUSTRY_ALIASES)) {
    for (const alias of list) {
      if (!aliases[alias.term]) aliases[alias.term] = [];
      aliases[alias.term].push({ industry, weight: alias.weight });
    }
  }
  const sortedAliases = {};
  for (const term of Object.keys(aliases).sort()) {
    sortedAliases[term] = aliases[term];
  }

  const output = {
    meta: {
      industryCount: industries.length,
      sectorCount: sectors.length,
      entryCount: Object.keys(byEntry).length,
      primaryCount: industries.reduce((n, g) => n + g.members.filter((m) => m.weight === 2).length, 0),
      resonantCount: industries.reduce((n, g) => n + g.members.filter((m) => m.weight === 1).length, 0),
      aliasCount: Object.keys(sortedAliases).length,
    },
    sectors,
    industries,
    byEntry,
    aliases: sortedAliases,
  };

  writeJsonIfChanged(path.join(root, 'platform', 'api', 'industry-patterns.json'), output);
  writeJsonIfChanged(path.join(root, 'platform', 'browser', 'renderer', 'industry-patterns.json'), output);

  console.log(
    `  industries: ${industries.length}, entries: ${Object.keys(byEntry).length}, ` +
      `primary: ${output.meta.primaryCount}, resonant: ${output.meta.resonantCount}, ` +
      `aliases: ${output.meta.aliasCount}`
  );
}

main();
