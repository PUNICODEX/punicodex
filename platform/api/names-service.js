/**
 * PuniCodex API v1 — Names service layer
 *
 * Exposes the canonical lexicon as an enterprise-grade REST resource.
 * All data is read from the existing validated sources:
 *   - type/js/lexicon.js
 *   - type/js/original-scripts.js
 *   - type/js/source-catalog.js
 *   - type/js/engine.js
 *   - platform/api/search.js
 *   - platform/api/crawler-db.js
 *   - platform/api/bookings.js
 */

const { domainToASCII } = require('node:url');
const { LEXICON } = require('../../type/js/lexicon.js');
const {
  getOriginalScript,
  getScriptName,
  getOriginalScriptLabel,
  getProvenance,
  getNoScriptNote,
} = require('../../type/js/original-scripts.js');
const { SOURCE_CATALOG } = require('../../type/js/source-catalog.js');
const PUNICODEX_ENGINE = require('../../type/js/engine.js');
const searchApi = require('./search.js');
const crawlerDb = require('./crawler-db.js');
const bookings = require('./bookings.js');
const { classifyTerm, classifyDomain } = require('./homograph-service.js');
const { getSimilarityCount } = require('./similarity-service.js');

// Load clean flagship lore catalog (generated from scripts/lore-catalog.json)
let LORE_CATALOG = {};
try {
  LORE_CATALOG = require('../../platform/browser/renderer/lore-catalog.json');
} catch (_e) {
  // Catalog may be absent during initial setup; fall back to empty object.
}

// Build trie once per process
const trie = PUNICODEX_ENGINE.buildTrie(LEXICON);
const entriesById = new Map(LEXICON.map((e) => [e.id, e]));

function computePunycode(unicode) {
  if (!unicode) return null;
  try {
    const ascii = domainToASCII(unicode.toLowerCase());
    return ascii !== unicode.toLowerCase() ? ascii : null;
  } catch (_e) {
    return null;
  }
}

function resolveSources(sourceKeys) {
  if (!Array.isArray(sourceKeys)) return [];
  return sourceKeys.map((key) => {
    const catalog = SOURCE_CATALOG[key];
    return {
      key,
      full: catalog?.full || key,
      scope: catalog?.scope || null,
      year: catalog?.year || null,
      edition: catalog?.edition || null,
      url: catalog?.url || null,
    };
  });
}

function computeTierExplanation(entry, breakdown) {
  if (!entry || !breakdown) return null;
  const counts = breakdown.reduce(
    (acc, step) => {
      if (step.type === 'stress' || step.type === 'dual') acc.stress++;
      if (step.type === 'length' || step.type === 'dual') acc.length++;
      return acc;
    },
    { stress: 0, length: 0 }
  );

  const hasStress = counts.stress > 0;
  const hasLength = counts.length > 0;

  return {
    tier: entry.tier,
    label: entry.tierLabel,
    hasStress,
    hasLength,
    stressCount: counts.stress,
    lengthCount: counts.length,
    summary:
      hasStress && hasLength
        ? 'The Greek original preserves both stress and vowel length, making this the full scholarly orthography.'
        : hasStress
          ? 'This form preserves stress (acute/circumflex) but not vowel length.'
          : hasLength
            ? 'This form preserves vowel length (macron/omega) but not stress.'
            : 'This form uses the standard ASCII root without stress or length marks.',
  };
}

function buildOriginalScriptBlock(entry) {
  const script = getOriginalScript(entry);
  const label = getOriginalScriptLabel(entry);
  const provenance = getProvenance(entry);

  return {
    script,
    scriptName: getScriptName(entry),
    label,
    provenance,
    note: script ? null : getNoScriptNote(entry),
  };
}

function buildLinks(entryId) {
  return {
    self: `/api/v1/names/${entryId}`,
    temple: `/sites/${entryId}/`,
    type: `/type/#${entryId}`,
  };
}

function transformEntry(row) {
  return {
    id: row.id,
    ascii: row.ascii,
    unicode: row.unicode,
    punycode: computePunycode(row.unicode),
    pantheon: row.pantheon,
    pantheonLabel: pantheonLabel(row.pantheon),
    pantheonEmoji: PUNICODEX_ENGINE.getPantheonEmoji(row.pantheon),
    tier: row.tier,
    tierLabel: row.tier_label,
    domain: row.domain || null,
    meaning: row.meaning || null,
    sources: resolveSources(row.sources || []),
    hasFlagship: Boolean(row.has_flagship),
    links: buildLinks(row.id),
  };
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function transformEntryDetail(row) {
  const entry = entriesById.get(row.id);
  const originalScript = buildOriginalScriptBlock(entry || row);
  const breakdown = (row.breakdown || []).map((step) => ({
    char: step.char,
    to: step.to_char ?? step.to ?? step.char,
    type: step.type,
    note: step.note,
  }));

  const site = row.site
    ? {
        domain: row.site.domain || null,
        punycode: row.site.punycode || null,
        title: row.site.title || null,
        description: row.site.description || null,
        isFlagship: Boolean(row.site.is_flagship),
        status: row.site.status || 'active',
      }
    : null;

  const availability = row.availability
    ? {
        status: row.availability.status,
        registrarLinks: row.availability.registrar_links || {},
        lastChecked: row.availability.last_checked || null,
      }
    : null;

  return {
    id: row.id,
    ascii: row.ascii,
    unicode: row.unicode,
    punycode: computePunycode(row.unicode),
    pantheon: row.pantheon,
    pantheonLabel: pantheonLabel(row.pantheon),
    pantheonEmoji: PUNICODEX_ENGINE.getPantheonEmoji(row.pantheon),
    tier: row.tier,
    tierLabel: row.tier_label,
    tierExplanation: computeTierExplanation(row, row.breakdown),
    domain: row.domain || null,
    meaning: row.meaning || null,
    sources: resolveSources(row.sources || []),
    originalScript,
    variants: parseJson(row.variants) || entry?.variants || [],
    breakdown,
    etymology: parseJson(row.etymology) || entry?.etymology || null,
    site,
    availability,
    hasFlagship: Boolean(row.has_flagship),
    links: buildLinks(row.id),
    lore: LORE_CATALOG[row.id] || null,
    similaritiesCount: getSimilarityCount(row.id),
  };
}

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

function listNames(params) {
  const result = searchApi.search({
    q: params.q,
    pantheon: params.pantheon,
    tier: params.tier,
    hasSite: params.hasSite,
    sort: params.sort,
    limit: params.limit,
    offset: params.offset,
  });

  return {
    items: result.entries.map(transformEntry),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  };
}

function getName(id) {
  const row = searchApi.getEntry(id);
  if (!row) return null;
  return transformEntryDetail(row);
}

function getNamesByIds(ids) {
  const found = [];
  const missing = [];
  for (const id of ids) {
    const row = searchApi.getEntry(id);
    if (row) {
      found.push(transformEntryDetail(row));
    } else {
      missing.push(id);
    }
  }
  return { found, missing, count: found.length };
}

function getVariants(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;

  // Internal variant forms stored on the lexicon entry (alt-stress, macron-only, ASCII, etc.)
  const internalVariants = entry.variants || [];
  const variants = internalVariants.map((v) => ({
    id: v.id || null,
    ascii: entry.ascii,
    unicode: v.unicode,
    punycode: computePunycode(v.unicode),
    type: v.type,
    note: v.note,
    sources: v.sources || null,
    links: v.id ? buildLinks(v.id) : null,
  }));

  return {
    id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    count: variants.length,
    variants,
  };
}

function getBreakdown(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const row = searchApi.getEntry(id);
  return {
    id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    steps: (row?.breakdown || entry.breakdown || []).map((step) => ({
      char: step.char,
      to: step.to_char ?? step.to ?? step.char,
      type: step.type,
      note: step.note,
    })),
  };
}

function getOriginalScriptForName(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  return {
    id,
    ...buildOriginalScriptBlock(entry),
    links: buildLinks(id),
  };
}

function getEtymology(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  return {
    id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    etymology: entry.etymology || null,
    links: buildLinks(id),
  };
}

function getAvailability(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const avail = crawlerDb.getAvailability(id);
  return {
    id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    punycode: computePunycode(entry.unicode),
    status: avail?.status || 'unknown',
    registrarLinks: avail?.registrar_links || {},
    lastChecked: avail?.last_checked || null,
    links: buildLinks(id),
  };
}

function getSite(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const site = crawlerDb
    .getSites({ entryId: id, status: 'active', limit: 1, offset: 0 })
    .sites.find((s) => s.lexicon_entry_id === id);

  if (!site) return { id, site: null, links: buildLinks(id) };

  return {
    id,
    site: {
      domain: site.domain,
      punycode: site.punycode,
      title: site.title,
      description: site.description,
      url: `https://${site.punycode || site.domain}`,
      isFlagship: Boolean(site.is_flagship),
      status: site.status,
      lastCrawled: site.last_crawled || null,
    },
    links: buildLinks(id),
  };
}

async function getSlots(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const slots = await bookings.getSlots(id);
  return {
    id,
    siteSlug: id,
    slots: slots.map((slot) => ({
      id: slot.id,
      slug: slot.slug,
      name: slot.name,
      width: slot.width,
      height: slot.height,
      priceCents: slot.price_cents,
      status: slot.status,
      sortOrder: slot.sort_order,
      isBundle: Boolean(slot.is_bundle),
      bookedBy: slot.company_name || null,
      creativePath: slot.creative_path || null,
      customHeading: slot.custom_heading || null,
      customSubtitle: slot.custom_subtitle || null,
      websiteUrl: slot.website_url || null,
    })),
    links: buildLinks(id),
  };
}

function listPantheons() {
  const rawPantheons = searchApi.getPantheons();
  const counts = {};
  for (const id of rawPantheons) {
    const pantheonRows = searchApi.getByPantheon(id);
    counts[id] = {
      total: pantheonRows.length,
      flagships: pantheonRows.filter((r) => r.has_flagship).length,
    };
  }

  return {
    total: LEXICON.length,
    count: rawPantheons.length,
    items: rawPantheons.map((id) => ({
      id,
      label: pantheonLabel(id),
      emoji: PUNICODEX_ENGINE.getPantheonEmoji(id),
      entryCount: counts[id]?.total || 0,
      flagshipCount: counts[id]?.flagships || 0,
      links: {
        self: `/api/v1/pantheons/${id}`,
      },
    })),
  };
}

function getPantheon(name) {
  const rows = searchApi.getByPantheon(name);
  return {
    id: name,
    label: pantheonLabel(name),
    emoji: PUNICODEX_ENGINE.getPantheonEmoji(name),
    total: rows.length,
    items: rows.map(transformEntry),
  };
}

function listTiers() {
  const stats = searchApi.getStats();
  return {
    total: stats.total,
    items: [
      {
        id: 'dual',
        label: 'Dual-Tier',
        count: stats.tiers.find((t) => t.tier === 'dual')?.count || 0,
        description:
          'Greek original has both stress and length, with multiple historically valid Unicode spellings and ancient-canonical ASCII fallbacks.',
        examples: ['apollon', 'hekate', 'nike'],
      },
      {
        id: '1',
        label: 'Tier 1',
        count: stats.tiers.find((t) => t.tier === '1')?.count || 0,
        description:
          'Greek original has both stress and length, but only one historically valid Unicode restoration.',
        examples: ['zeus', 'aphrodite', 'athena'],
      },
      {
        id: '2',
        label: 'Tier 2',
        count: stats.tiers.find((t) => t.tier === '2')?.count || 0,
        description:
          'Preserves only one feature (stress OR length) or neither; includes all non-Greek traditions.',
        examples: ['artemis', 'thor', 'amun'],
      },
    ],
  };
}

function autocompleteNames(params) {
  const completions = PUNICODEX_ENGINE.getCompletions(trie, params.q, {
    limit: params.limit,
    pantheonFilter: params.pantheon,
  });

  return {
    query: params.q,
    count: completions.length,
    items: completions.map((entry) => ({
      id: entry.id,
      ascii: entry.ascii,
      unicode: entry.unicode,
      punycode: computePunycode(entry.unicode),
      pantheon: entry.pantheon,
      pantheonLabel: pantheonLabel(entry.pantheon),
      tier: entry.tier,
      tierLabel: entry.tierLabel,
      links: buildLinks(entry.id),
    })),
  };
}

function convert(query) {
  const raw = String(query?.q || '').trim();
  const normalized = raw.toLowerCase();
  const queryTrust = classifyTerm(raw);

  if (!raw) {
    return {
      query: raw,
      queryTrust: {
        tier: queryTrust.tier,
        reason: queryTrust.reason,
        visualDeviation: queryTrust.visualDeviation,
        canonicalMatch: queryTrust.canonicalMatch,
      },
      matches: [],
      generated: {
        input: raw,
        punycode: null,
        note: 'No query provided.',
      },
    };
  }

  // 1. Try exact ASCII match
  const matches = PUNICODEX_ENGINE.findExactMatches(trie, normalized);
  if (matches.length > 0) {
    return {
      query: raw,
      queryTrust: {
        tier: queryTrust.tier,
        reason: queryTrust.reason,
        visualDeviation: queryTrust.visualDeviation,
        canonicalMatch: queryTrust.canonicalMatch,
      },
      matches: matches.map((entry) => ({
        id: entry.id,
        ascii: entry.ascii,
        unicode: entry.unicode,
        punycode: computePunycode(entry.unicode),
        pantheon: entry.pantheon,
        tier: entry.tier,
        confidence: 'exact',
        links: buildLinks(entry.id),
      })),
    };
  }

  // 2. Try Unicode/punycode lookup
  for (const entry of LEXICON) {
    const entryPunycode = computePunycode(entry.unicode);
    if (
      entry.unicode.toLowerCase() === normalized ||
      entry.ascii.toLowerCase() === normalized ||
      entryPunycode?.toLowerCase() === normalized
    ) {
      return {
        query: raw,
        queryTrust: {
          tier: queryTrust.tier,
          reason: queryTrust.reason,
          visualDeviation: queryTrust.visualDeviation,
          canonicalMatch: queryTrust.canonicalMatch,
        },
        matches: [
          {
            id: entry.id,
            ascii: entry.ascii,
            unicode: entry.unicode,
            punycode: entryPunycode,
            pantheon: entry.pantheon,
            tier: entry.tier,
            confidence: 'exact',
            links: buildLinks(entry.id),
          },
        ],
      };
    }
  }

  // 3. Fallback: generate punycode for arbitrary input
  const generatedPunycode = computePunycode(raw);
  const fallbackTrust = queryTrust.tier === 'unknown' ? classifyDomain(raw) : queryTrust;
  return {
    query: raw,
    queryTrust: {
      tier: fallbackTrust.tier,
      reason: fallbackTrust.reason,
      visualDeviation: fallbackTrust.visualDeviation,
      canonicalMatch: fallbackTrust.canonicalMatch,
    },
    matches: [],
    generated: {
      input: raw,
      punycode: generatedPunycode,
      note: generatedPunycode
        ? 'Input is not in the PUNICODEX lexicon; punycode generated mechanically.'
        : 'Input could not be converted to punycode.',
    },
  };
}

function convertBatch(params) {
  return {
    count: params.queries.length,
    items: params.queries.map((q) => convert({ q })),
  };
}

function getLore(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const lore = LORE_CATALOG[id] || null;
  return {
    id,
    hasLore: Boolean(lore),
    lore,
    links: buildLinks(id),
  };
}

function getPronunciation(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const lore = LORE_CATALOG[id];
  return {
    id,
    hasPronunciation: Boolean(lore?.pronunciation),
    pronunciation: lore?.pronunciation || null,
    links: buildLinks(id),
  };
}

function getMythology(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const lore = LORE_CATALOG[id];
  return {
    id,
    hasMythology: Boolean(lore?.mythology),
    mythology: lore?.mythology || null,
    links: buildLinks(id),
  };
}

function getArchaeology(id) {
  const entry = entriesById.get(id);
  if (!entry) return null;
  const lore = LORE_CATALOG[id];
  return {
    id,
    hasArchaeology: Boolean(lore?.archaeology),
    archaeology: lore?.archaeology || null,
    links: buildLinks(id),
  };
}

module.exports = {
  listNames,
  getName,
  getNamesByIds,
  getVariants,
  getBreakdown,
  getOriginalScriptForName,
  getEtymology,
  getAvailability,
  getSite,
  getSlots,
  getLore,
  getPronunciation,
  getMythology,
  getArchaeology,
  listPantheons,
  getPantheon,
  listTiers,
  autocompleteNames,
  convert,
  convertBatch,
  computePunycode,
};
