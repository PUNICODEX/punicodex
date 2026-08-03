/**
 * PuniCodex API v1 — Cards service layer
 *
 * Exposes the generated card set (platform/api/cards.json, produced by
 * scripts/generate-cards.js from the canonical lexicon, archetypes,
 * original scripts, and lore catalog) as a REST resource.
 *
 * The JSON is loaded once per process; Vercel serverless invocations reuse
 * the warm module cache.
 */

const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const VALID_VARIANTS = ['standard', 'original-script'];
const VALID_SORTS = new Set(['name', 'rarity', 'cost', 'power', 'pantheon']);

function loadSet() {
  try {
    return require('./cards.json');
  } catch (_e) {
    return null;
  }
}

const cardSet = loadSet();
const allCards = cardSet ? cardSet.cards : [];
const cardsByEntryId = new Map();
for (const card of allCards) {
  if (!cardsByEntryId.has(card.entryId)) cardsByEntryId.set(card.entryId, []);
  cardsByEntryId.get(card.entryId).push(card);
}

/**
 * Public card representation — strips nothing (the generated set is already
 * public data) but guarantees a stable field order for the API contract.
 */
function toApiCard(card) {
  return {
    id: card.id,
    entryId: card.entryId,
    variant: card.variant,
    edition: card.edition,
    baseCardId: card.baseCardId,
    setId: card.setId,
    name: card.name,
    ascii: card.ascii,
    original: card.original || null,
    pantheon: card.pantheon,
    category: card.category,
    categoryLabel: card.categoryLabel,
    tier: card.tier,
    tierLabel: card.tierLabel,
    domain: card.domain,
    rarity: card.rarity,
    cost: card.cost,
    power: card.power,
    health: card.health,
    speed: card.speed,
    ability: card.ability,
    flavor: card.flavor || null,
    flagship: card.flagship === true,
    ownedDomain: card.ownedDomain || null,
    art: card.art || null,
    links: {
      temple: `/sites/${card.entryId}/`,
      name: `/api/v1/names/${card.entryId}`,
    },
  };
}

/**
 * List cards with filtering, search, sorting, and pagination.
 *
 * @param {object} query
 * @param {string} [query.q] - free-text search over name, ascii, domain, pantheon
 * @param {string} [query.pantheon] - exact pantheon filter
 * @param {string} [query.rarity] - one of VALID_RARITIES
 * @param {string} [query.variant] - one of VALID_VARIANTS
 * @param {string} [query.flagship] - 'true' | 'false'
 * @param {string} [query.sort] - 'name' | 'rarity' | 'cost' | 'power' | 'pantheon'
 * @param {number|string} [query.limit] - page size (default 50, max 200)
 * @param {number|string} [query.offset] - page offset (default 0)
 */
function listCards(query = {}) {
  const errors = [];
  let items = allCards;

  if (query.variant !== undefined) {
    if (!VALID_VARIANTS.includes(query.variant)) {
      errors.push(`variant must be one of: ${VALID_VARIANTS.join(', ')}`);
    } else {
      items = items.filter((c) => c.variant === query.variant);
    }
  }

  if (query.rarity !== undefined) {
    if (!VALID_RARITIES.includes(query.rarity)) {
      errors.push(`rarity must be one of: ${VALID_RARITIES.join(', ')}`);
    } else {
      items = items.filter((c) => c.rarity === query.rarity);
    }
  }

  if (query.pantheon !== undefined) {
    items = items.filter((c) => c.pantheon === query.pantheon);
  }

  if (query.flagship !== undefined) {
    if (query.flagship !== 'true' && query.flagship !== 'false') {
      errors.push("flagship must be 'true' or 'false'");
    } else {
      const want = query.flagship === 'true';
      items = items.filter((c) => (c.flagship === true) === want);
    }
  }

  if (query.q !== undefined && query.q !== '') {
    const needle = String(query.q).toLowerCase();
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.ascii.toLowerCase().includes(needle) ||
        c.domain?.toLowerCase().includes(needle) ||
        c.pantheon.toLowerCase().includes(needle)
    );
  }

  const sort = query.sort || 'rarity';
  if (!VALID_SORTS.has(sort)) {
    errors.push(`sort must be one of: ${[...VALID_SORTS].join(', ')}`);
  } else {
    const byName = (a, b) => a.name.localeCompare(b.name);
    const comparators = {
      name: byName,
      rarity: (a, b) => b.rarityOrder - a.rarityOrder || byName(a, b),
      cost: (a, b) => a.cost - b.cost || byName(a, b),
      power: (a, b) => b.power - a.power || byName(a, b),
      pantheon: (a, b) => a.pantheon.localeCompare(b.pantheon) || byName(a, b),
    };
    items = [...items].sort(comparators[sort]);
  }

  let limit = 50;
  if (query.limit !== undefined) {
    limit = Number.parseInt(query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      errors.push('limit must be an integer between 1 and 200');
      limit = 50;
    }
  }

  let offset = 0;
  if (query.offset !== undefined) {
    offset = Number.parseInt(query.offset, 10);
    if (!Number.isInteger(offset) || offset < 0) {
      errors.push('offset must be a non-negative integer');
      offset = 0;
    }
  }

  if (errors.length > 0) return { errors };

  const total = items.length;
  return {
    items: items.slice(offset, offset + limit).map(toApiCard),
    total,
    limit,
    offset,
  };
}

/**
 * Get every card variant for a lexicon entry id.
 * Returns null when the entry has no cards.
 */
function getCardsForEntry(entryId) {
  const variants = cardsByEntryId.get(entryId);
  if (!variants) return null;
  return {
    entryId,
    variants: variants.map(toApiCard),
  };
}

/**
 * Set-level metadata: counts by rarity, variant, pantheon.
 */
function getSetInfo() {
  if (!cardSet) return null;
  const byRarity = {};
  const byVariant = {};
  const byPantheon = {};
  for (const card of allCards) {
    byRarity[card.rarity] = (byRarity[card.rarity] || 0) + 1;
    byVariant[card.variant] = (byVariant[card.variant] || 0) + 1;
    byPantheon[card.pantheon] = (byPantheon[card.pantheon] || 0) + 1;
  }
  return {
    set: cardSet.set,
    totalCards: allCards.length,
    flagshipCards: allCards.filter((c) => c.flagship === true).length,
    counts: { byRarity, byVariant, byPantheon },
  };
}

module.exports = {
  listCards,
  getCardsForEntry,
  getSetInfo,
  VALID_RARITIES,
  VALID_VARIANTS,
};
