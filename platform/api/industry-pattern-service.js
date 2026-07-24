/**
 * PuniCodex — Industry-pattern service
 *
 * Loads the generated industry-pattern graph and exposes per-entry and
 * per-industry lookups for API v1 endpoints and corpus consumers, plus
 * free-text alias matching for the Find Your Pattern autocomplete.
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

// Flat alias list built once at load: [{ term, industry, weight }]. Sourced
// from the generated graph when present, else from the canonical vocabulary.
const aliasList = [];
if (patterns?.aliases) {
  for (const [term, targets] of Object.entries(patterns.aliases)) {
    for (const t of targets) aliasList.push({ term, industry: t.industry, weight: t.weight });
  }
} else {
  const { INDUSTRY_ALIASES } = require('../../type/js/industry-aliases.js');
  for (const [industry, list] of Object.entries(INDUSTRY_ALIASES)) {
    for (const a of list) aliasList.push({ term: a.term, industry, weight: a.weight });
  }
}

const NAME_STOPWORDS = new Set(['&', 'and', 'the', 'of']);

function nameWords(name) {
  return String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NAME_STOPWORDS.has(w));
}

/**
 * Rank industries for a free-text sponsor query against the alias vocabulary
 * and industry names. Exact alias hit scores 3 + alias weight, prefix 2 +
 * weight, substring 1 + weight; an industry-name word match scores 2.
 * Results are deduped by industry and sorted by score, then primary-member
 * count, then industry id for determinism.
 */
function matchIndustryAliases(query, limit = 8) {
  const q = String(query || '')
    .toLowerCase()
    .trim();
  const cap = Math.max(1, Math.min(20, Number.parseInt(limit, 10) || 8));
  if (!q || !patterns) return [];

  const best = new Map();
  const consider = (industryId, matchedTerm, score) => {
    const group = industriesById.get(industryId);
    if (!group) return;
    const prev = best.get(industryId);
    if (prev && prev.score >= score) return;
    best.set(industryId, { group, matchedTerm, score });
  };

  for (const alias of aliasList) {
    const term = alias.term;
    if (term === q) {
      consider(alias.industry, term, 3 + alias.weight);
    } else if (term.startsWith(q) || (q.length > term.length && q.startsWith(term))) {
      consider(alias.industry, term, 2 + alias.weight);
    } else if (term.includes(q) || (term.length >= 3 && q.includes(term))) {
      consider(alias.industry, term, 1 + alias.weight);
    }
  }

  for (const group of patterns.industries) {
    const words = nameWords(group.name);
    if (words.includes(q)) consider(group.industry, q, 2);
  }

  return [...best.values()]
    .map(({ group, matchedTerm, score }) => {
      const sector = sectorsById.get(group.sector);
      return {
        industry: group.industry,
        name: group.name,
        sector: group.sector,
        sectorName: sector ? sector.name : group.sector,
        tagline: group.tagline,
        matchedTerm,
        score,
        primaryCount: group.members.filter((m) => m.weight === 2).length,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.primaryCount - a.primaryCount || a.industry.localeCompare(b.industry)
    )
    .slice(0, cap)
    .map(({ primaryCount: _primaryCount, ...rest }) => rest);
}

module.exports = {
  getFullPatterns,
  getPatternsForEntry,
  listIndustries,
  getIndustry,
  matchIndustryAliases,
};
