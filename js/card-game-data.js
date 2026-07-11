/**
 * PÚNYCODEX — Mythic Duel card data layer
 *
 * Transforms the scholarly lexicon into a collectible, playable card system.
 * Every card is derived from a canonical lexicon entry, with stats, rarity,
 * category, and abilities computed from real philological metadata.
 */

(function (root) {
  'use strict';

  // ── Category taxonomy ─────────────────────────────────────────────────────
  // Categories expand PÚNYCODEX beyond mythological beings into concepts,
  // places, celestial bodies, minerals, and primordial forces.

  function deriveCategory(entry) {
    const domain = (entry.domain || '').toLowerCase();
    const pantheon = entry.pantheon || '';

    if (pantheon === 'greek-location' || /realm|place|island|underworld|afterlife|paradise|abyss|land/.test(domain)) {
      return 'place';
    }
    if (/gem|stone|mineral|jewel|metal/.test(domain)) {
      return 'mineral';
    }
    if (/sun|moon|star|dawn|light|sky|celestial|heaven/.test(domain)) {
      return 'celestial';
    }
    if (/chaos|cosmos|order|reason|concept|word|soul|memory|peace|necessity|pride|root word|invincibility/.test(domain)) {
      return 'concept';
    }
    if (/primordial|creation|void|cosmogony/.test(domain)) {
      return 'primordial';
    }
    return 'deity';
  }

  function categoryLabel(category) {
    return {
      deity: 'Deity',
      concept: 'Concept',
      place: 'Realm',
      celestial: 'Celestial',
      mineral: 'Mineral',
      primordial: 'Primordial',
    }[category] || 'Mythic';
  }

  function categoryIcon(category) {
    return {
      deity: '✦',
      concept: '◈',
      place: '⌂',
      celestial: '☉',
      mineral: '◆',
      primordial: '∞',
    }[category] || '◎';
  }

  // ── Rarity computation ────────────────────────────────────────────────────

  function deriveRarity(entry) {
    if (entry.hasAdSite || entry.tier === 'dual') {
      return 'legendary';
    }
    if (entry.tier === '1') {
      return 'epic';
    }
    const category = deriveCategory(entry);
    if (category === 'place' || category === 'celestial' || category === 'mineral') {
      return 'rare';
    }
    return 'common';
  }

  const RARITY_ORDER = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6,
  };

  // ── Stat generation ───────────────────────────────────────────────────────
  // Deterministic per entry so a given card always has the same base stats.

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function tierBasePower(tier, seed) {
    if (tier === 'dual') return 90 + Math.floor(seededRandom(seed) * 11);
    if (tier === '1') return 70 + Math.floor(seededRandom(seed) * 16);
    return 40 + Math.floor(seededRandom(seed) * 26);
  }

  function domainHealth(domain, seed) {
    const d = (domain || '').toLowerCase();
    if (d.includes('sea') || d.includes('earth') || d.includes('underworld') || d.includes('abyss')) {
      return 80 + Math.floor(seededRandom(seed + 1) * 21);
    }
    if (d.includes('war') || d.includes('battle') || d.includes('king') || d.includes('thunder')) {
      return 70 + Math.floor(seededRandom(seed + 1) * 21);
    }
    if (d.includes('love') || d.includes('beauty') || d.includes('messenger') || d.includes('concept')) {
      return 50 + Math.floor(seededRandom(seed + 1) * 16);
    }
    return 55 + Math.floor(seededRandom(seed + 1) * 21);
  }

  function tierCost(tier, seed) {
    if (tier === 'dual') return 8;
    if (tier === '1') return 6;
    return 1 + Math.floor(seededRandom(seed + 2) * 4);
  }

  function pantheonSpeed(pantheon, seed) {
    if (pantheon === 'norse' || pantheon === 'greek') return 6 + Math.floor(seededRandom(seed + 3) * 3);
    if (pantheon === 'egyptian' || pantheon === 'mesopotamian') return 3 + Math.floor(seededRandom(seed + 3) * 3);
    return 4 + Math.floor(seededRandom(seed + 3) * 4);
  }

  // ── Abilities ─────────────────────────────────────────────────────────────

  function deriveAbility(entry) {
    const domain = (entry.domain || '').toLowerCase();
    const category = deriveCategory(entry);
    const unicode = entry.unicode || entry.ascii;

    if (domain.includes('thunder') || domain.includes('lightning')) {
      return { name: 'Thunderstrike', description: 'Deal bonus damage to Sea or Sky foes.', type: 'active' };
    }
    if (domain.includes('war') || domain.includes('battle')) {
      return { name: 'Battle Fury', description: 'Gains +5 power when attacking.', type: 'passive' };
    }
    if (domain.includes('sea') || domain.includes('ocean') || domain.includes('tidal')) {
      return { name: 'Tidal Wave', description: 'Damages all enemy cards when played.', type: 'on-play' };
    }
    if (domain.includes('wisdom') || domain.includes('tactical') || domain.includes('knowledge')) {
      return { name: 'Tactical Counsel', description: 'Draw a card when played.', type: 'on-play' };
    }
    if (domain.includes('magic') || domain.includes('crossroads') || domain.includes('mystery')) {
      return { name: 'Crossroads', description: 'Random bonus effect on play.', type: 'on-play' };
    }
    if (domain.includes('love') || domain.includes('beauty') || domain.includes('charm')) {
      return { name: 'Charm', description: 'Enemy card loses 10 power this turn.', type: 'active' };
    }
    if (domain.includes('death') || domain.includes('underworld') || domain.includes('shadow')) {
      return { name: 'Grasp of Shadows', description: 'Drain health from the enemy hero.', type: 'active' };
    }
    if (domain.includes('victory') || domain.includes('triumph')) {
      return { name: 'Triumph', description: 'Inspire ally cards for +3 power.', type: 'passive' };
    }
    if (domain.includes('sun') || domain.includes('light') || domain.includes('fire')) {
      return { name: 'Radiance', description: 'Blind one enemy, reducing its speed.', type: 'active' };
    }
    if (domain.includes('moon') || domain.includes('night')) {
      return { name: 'Lunar Veil', description: 'Shield an ally from the next damage.', type: 'active' };
    }
    if (category === 'concept') {
      return { name: 'Epiphany', description: 'Reveal and copy the top card of your deck.', type: 'on-play' };
    }
    if (category === 'place') {
      return { name: 'Domain Advantage', description: 'Gain +2 ink while this card remains in play.', type: 'passive' };
    }
    if (category === 'mineral') {
      return { name: 'Adamantine', description: 'Reduce incoming damage by 3.', type: 'passive' };
    }
    if (category === 'celestial') {
      return { name: 'Celestial Cycle', description: 'Restore 5 health to your hero each turn.', type: 'passive' };
    }
    return { name: 'Divine Presence', description: 'Grant a small blessing to allies.', type: 'passive' };
  }

  // ── Card generation ───────────────────────────────────────────────────────

  function generateCard(entry) {
    const seed = hashString(entry.id);
    const category = deriveCategory(entry);
    const rarity = deriveRarity(entry);
    const power = tierBasePower(entry.tier, seed);
    const health = domainHealth(entry.domain, seed);
    const cost = tierCost(entry.tier, seed);
    const speed = pantheonSpeed(entry.pantheon, seed);
    const ability = deriveAbility(entry);

    return {
      id: `${entry.id}-standard`,
      entryId: entry.id,
      name: entry.unicode || entry.ascii,
      ascii: entry.ascii,
      original: entry.greek || entry.originalScript || '—',
      pantheon: entry.pantheon,
      category,
      categoryLabel: categoryLabel(category),
      categoryIcon: categoryIcon(category),
      tier: entry.tier,
      tierLabel: entry.tierLabel || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier-${entry.tier}`),
      domain: entry.domain || 'Mythic',
      meaning: entry.meaning || '',
      rarity,
      rarityOrder: RARITY_ORDER[rarity],
      cost,
      power,
      health,
      maxHealth: health,
      speed,
      ability,
      // Marketplace art hook
      variant: 'standard',
      artworkUrl: null,
      artist: null,
    };
  }

  function generateAllCards() {
    if (typeof LEXICON === 'undefined') {
      throw new Error('LEXICON is not loaded. Include type/js/lexicon.js before card-game-data.js.');
    }
    return LEXICON.map(generateCard);
  }

  // ── Deck / pack helpers ───────────────────────────────────────────────────

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function starterDeck(cards, size = 10) {
    const shuffled = shuffle(cards);
    return shuffled.slice(0, size).map((c) => ({ ...c, instanceId: Math.random().toString(36).slice(2) }));
  }

  function attachArtworks(cards, artworkMap) {
    return cards.map((card) => {
      const art = artworkMap && artworkMap[card.entryId];
      if (!art) return card;
      return {
        ...card,
        artworkUrl: art.url || art.previewUrl || null,
        artist: art.artist || art.creatorName || null,
      };
    });
  }

  function openPack(cards, options = {}) {
    const size = options.size || 5;
    const guaranteedRarity = options.guaranteedRarity || null;
    const pool = [...cards];
    const pack = [];

    if (guaranteedRarity) {
      const eligible = pool.filter((c) => c.rarity === guaranteedRarity);
      if (eligible.length) {
        pack.push({ ...shuffle(eligible)[0], instanceId: Math.random().toString(36).slice(2) });
      }
    }

    while (pack.length < size) {
      const card = { ...shuffle(pool)[0], instanceId: Math.random().toString(36).slice(2) };
      pack.push(card);
    }

    return shuffle(pack);
  }

  // ── Pantheon / category colors ────────────────────────────────────────────

  const PANTHEON_COLORS = {
    greek: { hue: 45, accent: '#d4af37' },
    'greek-location': { hue: 40, accent: '#c9a227' },
    norse: { hue: 210, accent: '#7ec8e3' },
    egyptian: { hue: 35, accent: '#e6a817' },
    sanskrit: { hue: 280, accent: '#b388ff' },
    celtic: { hue: 120, accent: '#81c784' },
    mesopotamian: { hue: 25, accent: '#bcaaa4' },
    polynesian: { hue: 170, accent: '#4db6ac' },
    japanese: { hue: 340, accent: '#f06292' },
    nahuatl: { hue: 15, accent: '#ff8a65' },
    yoruba: { hue: 55, accent: '#ffd54f' },
    slavic: { hue: 195, accent: '#64b5f6' },
    zoroastrian: { hue: 260, accent: '#9575cd' },
    incan: { hue: 30, accent: '#ffcc80' },
    chinese: { hue: 0, accent: '#e57373' },
    buddhist: { hue: 300, accent: '#ba68c8' },
    taoist: { hue: 160, accent: '#4dd0e1' },
    korean: { hue: 320, accent: '#f48fb1' },
    canaanite: { hue: 230, accent: '#7986cb' },
    phoenician: { hue: 220, accent: '#90a4ae' },
    hittite: { hue: 10, accent: '#a1887f' },
  };

  function pantheonStyle(pantheon) {
    return PANTHEON_COLORS[pantheon] || { hue: 200, accent: '#90a4ae' };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const CardGameData = {
    generateCard,
    generateAllCards,
    starterDeck,
    openPack,
    attachArtworks,
    deriveCategory,
    deriveRarity,
    deriveAbility,
    pantheonStyle,
    categoryLabel,
    categoryIcon,
    RARITY_ORDER,
  };

  root.CardGameData = CardGameData;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardGameData };
  }
})(typeof window !== 'undefined' ? window : globalThis);
