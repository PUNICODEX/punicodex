/**
 * PÚNYCODEX — Industry-pattern service
 *
 * Loads the generated industry-pattern graph and exposes per-entry and
 * per-industry lookups for API v1 endpoints and corpus consumers.
 */

const { LEXICON } = require('../../type/js/lexicon.js');

const entriesById = new Map(LEXICON.map((entry) => [entry.id, entry]));

function loadPatterns() {
  try {
    return require('./industry-patterns.json');
  } catch (_e) {
    return null;
  }
}

const patterns = loadPatterns();

const industriesById = new Map();
const sectorsById = new Map();

if (patterns) {
  for (const group of patterns.industries) {
    industriesById.set(group.industry, group);
  }
  for (const sector of patterns.sectors) {
    sectorsById.set(sector.id, sector);
  }
}

function isValidId(id) {
  return typeof id === 'string' && entriesById.has(id);
}

function normalizeId(id) {
  return typeof id === 'string' ? id.toLowerCase().trim() : null;
}

/**
 * Full generated pattern map: sectors, industries with members, per-entry
 * profiles, and metadata.
 */
function getFullPatterns() {
  return patterns;
}

/**
 * Pattern profile for a single lexicon entry: its aligned industries with
 * weights and justifications, plus sibling members for cross-linking.
 */
function getPatternsForEntry(rawId) {
  const id = normalizeId(rawId);
  if (!patterns || !isValidId(id)) return null;

  const profile = patterns.byEntry[id] || [];
  const industries = profile.map((p) => {
    const group = industriesById.get(p.industry);
    const sector = sectorsById.get(p.sector);
    return {
      industry: p.industry,
      name: p.name,
      sector: p.sector,
      sectorName: sector ? sector.name : p.sector,
      tagline: p.tagline,
      weight: p.weight,
      why: p.why,
      alignedTemples: group
        ? group.members
            .filter((m) => m.id !== id)
            .map((m) => ({
              id: m.id,
              unicode: m.unicode,
              pantheon: m.pantheon,
              pantheonLabel: m.pantheonLabel,
              weight: m.weight,
            }))
        : [],
    };
  });

  return {
    id,
    count: industries.length,
    industries,
    links: {
      patternsPage: `/sites/${id}/patterns/`,
      temple: `/sites/${id}/`,
    },
  };
}

/**
 * Summary list of every industry with member counts — for directory views.
 */
function listIndustries() {
  if (!patterns) return [];
  return patterns.industries.map((group) => ({
    industry: group.industry,
    name: group.name,
    sector: group.sector,
    tagline: group.tagline,
    memberCount: group.members.length,
    primaryCount: group.members.filter((m) => m.weight === 2).length,
  }));
}

/**
 * Full membership of a single industry.
 */
function getIndustry(industryId) {
  if (!patterns) return null;
  return industriesById.get(industryId) || null;
}

module.exports = {
  getFullPatterns,
  getPatternsForEntry,
  listIndustries,
  getIndustry,
};
