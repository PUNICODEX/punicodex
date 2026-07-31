#!/usr/bin/env node
/**
 * PuniCodex — Mythic Duel card generator
 *
 * Builds the canonical card database from the same sources of truth that
 * drive every other surface of the site:
 *
 *   - type/js/lexicon.js          (canonical 895-entry lexicon)
 *   - js/archetypes-v2.js         (196 flagship archetypes: art, colors, domains)
 *   - scripts/lore-catalog.json   (mythology + cultural legacy for flavor text)
 *   - type/js/original-scripts.js (original-script forms for foil variants)
 *
 * Card identity, rarity, stats, abilities, and flavor are DERIVED — never
 * hand-maintained per entry (the only exceptions are the balance-tuned
 * ability overrides for the spec's named exemplars, ABILITY_OVERRIDES below,
 * which are themselves keyed to scholarly domain data).
 *
 * Rarity ladder (docs/card-game-spec.md §2):
 *   common    — tier-2 entries
 *   uncommon  — tier-2 entries with a notable domain
 *   rare      — tier-1 entries (non-flagship)
 *   epic      — dual-tier entries (non-flagship)
 *   legendary — flagship / owned-domain entries (standard variant)
 *   mythic    — original-script foil variants (chase cards)
 *
 * Outputs (byte-identical copies; consumed by the API and the web client):
 *   - platform/api/cards.json
 *   - game/cards.json
 *
 * The output is fully deterministic (no timestamps) so the CI divergence
 * gate can prove the committed artifacts match the canonical sources.
 *
 * Run via: npm run generate
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');
const { getOriginalScript, hasOriginalScript } = require('../type/js/original-scripts.js');

const ARCHETYPES_MODULE = require('../js/archetypes-v2.js');
const ARCHETYPES = ARCHETYPES_MODULE.ARCHETYPES || ARCHETYPES_MODULE.archetypes || ARCHETYPES_MODULE;
const ARCHETYPE_IDS = new Set(ARCHETYPES.filter((a) => a.built !== false).map((a) => a.id));
const LORE_CATALOG = require('../scripts/lore-catalog.json');

const root = path.join(__dirname, '..');

const SET = {
  id: 'first-restoration',
  name: 'First Restoration',
  code: 'FR1',
  description:
    'The founding set of Mythic Duel: every card a PuniCodex entry, every stat derived from scholarly data.',
};

// ── Deterministic hashing ───────────────────────────────────────────────────

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

function pickBand(seed, min, span) {
  return min + Math.floor(seededRandom(seed) * span);
}

// ── Category taxonomy ───────────────────────────────────────────────────────

function deriveCategory(entry) {
  const domain = (entry.domain || '').toLowerCase();
  const pantheon = entry.pantheon || '';

  if (
    pantheon === 'greek-location' ||
    /realm|place|island|underworld|afterlife|paradise|abyss|land/.test(domain)
  ) {
    return 'place';
  }
  if (/gem|stone|mineral|jewel|metal/.test(domain)) return 'mineral';
  if (/sun|moon|star|dawn|light|sky|celestial|heaven/.test(domain)) return 'celestial';
  if (/primordial|creation|void|cosmogony/.test(domain)) return 'primordial';
  if (
    /chaos|cosmos|order|reason|concept|word|soul|memory|peace|necessity|pride|root word|invincibility/.test(
      domain
    )
  ) {
    return 'concept';
  }
  return 'deity';
}

const CATEGORY_META = {
  deity: { label: 'Deity', icon: '✦' },
  concept: { label: 'Concept', icon: '◈' },
  place: { label: 'Realm', icon: '⌂' },
  celestial: { label: 'Celestial', icon: '☉' },
  mineral: { label: 'Mineral', icon: '◆' },
  primordial: { label: 'Primordial', icon: '∞' },
};

// ── Rarity (spec §2) ────────────────────────────────────────────────────────

const NOTABLE_DOMAIN_RE =
  /war|battle|wisdom|sea|ocean|sky|death|underworld|love|thunder|lightning|magic|victory|sun|moon|earth|time|fire|knowledge|fate|storm|justice/i;

function deriveRarity(entry, { flagship }) {
  if (flagship) return 'legendary';
  if (entry.tier === 'dual') return 'epic';
  if (entry.tier === '1') return 'rare';
  if (NOTABLE_DOMAIN_RE.test(entry.domain || '')) return 'uncommon';
  return 'common';
}

const RARITY_ORDER = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };

// ── Stats (spec §2) ─────────────────────────────────────────────────────────
// power: dual 90–100 · tier-1 70–85 · tier-2 40–65 (deterministic within band)

function basePower(tier, seed) {
  if (tier === 'dual') return pickBand(seed, 90, 11);
  if (tier === '1') return pickBand(seed, 70, 16);
  return pickBand(seed, 40, 26);
}

function domainHealth(domain, seed) {
  const d = (domain || '').toLowerCase();
  if (/sea|ocean|earth|underworld|abyss|mountain/.test(d)) return pickBand(seed + 1, 80, 21);
  if (/war|battle|king|thunder|storm/.test(d)) return pickBand(seed + 1, 70, 21);
  if (/love|beauty|messenger|concept|word/.test(d)) return pickBand(seed + 1, 50, 16);
  return pickBand(seed + 1, 55, 21);
}

// cost: rarity + power, 1–10 ink (spec §2)
function rarityCost(rarity, seed) {
  switch (rarity) {
    case 'legendary':
      return pickBand(seed + 2, 8, 3); // 8–10
    case 'epic':
      return 8;
    case 'rare':
      return pickBand(seed + 2, 6, 2); // 6–7
    case 'uncommon':
      return pickBand(seed + 2, 3, 3); // 3–5
    default:
      return pickBand(seed + 2, 1, 4); // 1–4
  }
}

// Cost follows the card's weight WITHIN its edition cohort: after all cards
// are built, each edition's cards are ranked by (power + health) and the
// cost ladder 1–8 is assigned by percentile. Every curve bucket is always
// stocked for every cohort, and rebalancing is automatic as the set grows.
function assignCosts(cards) {
  const byEdition = new Map();
  for (const card of cards) {
    if (!byEdition.has(card.edition)) byEdition.set(card.edition, []);
    byEdition.get(card.edition).push(card);
  }
  for (const cohort of byEdition.values()) {
    cohort.sort((a, b) => a.power + a.health - (b.power + b.health) || a.id.localeCompare(b.id));
    const n = cohort.length;
    cohort.forEach((card, i) => {
      card.cost = n <= 1 ? 1 : 1 + Math.floor((i / (n - 1)) * 8);
    });
  }
}

function pantheonSpeed(pantheon, seed) {
  if (pantheon === 'norse' || pantheon === 'greek') return pickBand(seed + 3, 6, 3);
  if (pantheon === 'egyptian' || pantheon === 'mesopotamian') return pickBand(seed + 3, 3, 3);
  return pickBand(seed + 3, 4, 4);
}

// ── Ability effect DSL ──────────────────────────────────────────────────────
// triggers: on_play | on_attack | on_death | passive (spec §6).
// effect kinds are consumed by game/engine.js and the balance simulator.

// Hand-tuned abilities for the spec's named exemplars and the most visible
// flagships. Each is keyed to the entry's scholarly domain data.
const ABILITY_OVERRIDES = {
  zeus: {
    name: 'Thunderstrike',
    description: 'Deal 12 damage to an enemy. Deals double damage to Sea or Sky domain foes.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'enemy-minion', amount: 12, bonusVsDomains: ['sea', 'sky'] },
  },
  athena: {
    name: 'Tactical Counsel',
    description: 'Draw a card and grant your allies +2 health.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'draw', count: 1 }, { kind: 'buff-allies', power: 0, health: 2 }] },
  },
  poseidon: {
    name: 'Tidal Wave',
    description: 'Deal 6 damage to all enemy cards.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'all-enemy-minions', amount: 6 },
  },
  hekate: {
    name: 'Crossroads',
    description: 'Choose one of three random effects: draw, damage, or heal.',
    trigger: 'on_play',
    effect: {
      kind: 'random-choice',
      options: [
        { kind: 'draw', count: 2 },
        { kind: 'damage', target: 'enemy-minion', amount: 8 },
        { kind: 'heal-hero', amount: 8 },
      ],
    },
  },
  anu: {
    name: 'Decree of Heaven',
    description: 'Stun an enemy card and grant your allies +3 power.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'stun', target: 'enemy-minion' }, { kind: 'buff-allies', power: 3, health: 0 }] },
  },
  apollo: {
    name: 'Hymn of the Sun',
    description: 'Restore 8 health to your hero and reduce an enemy’s power by 4.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'heal-hero', amount: 8 }, { kind: 'debuff-enemy', target: 'enemy-minion', power: 4 }] },
  },
  nike: {
    name: 'Crown of Victory',
    description: 'Inspire your allies: +3 power while this card is in play.',
    trigger: 'passive',
    effect: { kind: 'aura-allies', power: 3 },
  },
  hades: {
    name: 'Unseen Wealth',
    description: 'Drain 6 health from the enemy hero and restore it to yours.',
    trigger: 'on_play',
    effect: { kind: 'drain-hero', amount: 6 },
  },
  odin: {
    name: 'Gallows Bargain',
    description: 'Draw two cards; Odin takes 3 damage as the price of wisdom.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'draw', count: 2 }, { kind: 'self-damage', amount: 3 }] },
  },
  thor: {
    name: 'Mjölnir’s Return',
    description: 'Deal 10 damage to an enemy card, then 3 damage to all other enemy cards.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'damage', target: 'enemy-minion', amount: 10 }, { kind: 'damage', target: 'all-enemy-minions', amount: 3 }] },
  },
  ra: {
    name: 'Solar Barque',
    description: 'Restore 5 health to your hero at the start of each of your turns.',
    trigger: 'passive',
    effect: { kind: 'heal-hero-turn', amount: 5 },
  },
  ares: {
    name: 'Battle Fury',
    description: 'Gains +5 power when attacking.',
    trigger: 'passive',
    effect: { kind: 'buff-self-attacking', power: 5 },
  },
  aphrodite: {
    name: 'Irresistible Charm',
    description: 'An enemy card loses 10 power until end of turn.',
    trigger: 'on_play',
    effect: { kind: 'debuff-enemy', target: 'enemy-minion', power: 10, untilEndOfTurn: true },
  },
  hermes: {
    name: 'Wayfinder',
    description: 'Draw a card. Hermes may attack the turn he is played.',
    trigger: 'passive',
    effect: { kind: 'combo', effects: [{ kind: 'draw', count: 1 }, { kind: 'charge' }] },
  },
  demeter: {
    name: 'Harvest Blessing',
    description: 'Restore 4 health to all friendly cards and your hero.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'heal-allies', amount: 4 }, { kind: 'heal-hero', amount: 4 }] },
  },
  dionysos: {
    name: 'Ecstatic Madness',
    description: 'Confuse an enemy card: it attacks a random ally of its own next turn.',
    trigger: 'on_play',
    effect: { kind: 'confuse', target: 'enemy-minion' },
  },
  artemis: {
    name: 'Moonshot',
    description: 'Deal 7 damage to the strongest enemy card.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'strongest-enemy-minion', amount: 7 },
  },
  hephaistos: {
    name: 'Forge Mastery',
    description: 'Reduce all incoming damage to this card by 3.',
    trigger: 'passive',
    effect: { kind: 'damage-reduction', amount: 3 },
  },
  persephone: {
    name: 'Two Thrones',
    description: 'On death, return to your hand with +5 health.',
    trigger: 'on_death',
    effect: { kind: 'return-to-hand', healthBonus: 5 },
  },
  prometheus: {
    name: 'Stolen Flame',
    description: 'Copy the top card of your deck and put it into your hand.',
    trigger: 'on_play',
    effect: { kind: 'copy-top-card' },
  },
  medousa: {
    name: 'Petrifying Gaze',
    description: 'Stun all enemy cards with power 6 or less.',
    trigger: 'on_play',
    effect: { kind: 'stun-filter', maxPower: 6 },
  },
  khaos: {
    name: 'Yawning Void',
    description: 'Destroy all cards with cost 3 or less on both sides.',
    trigger: 'on_play',
    effect: { kind: 'destroy-filter', maxCost: 3, bothSides: true },
  },
  tiamat: {
    name: 'Primordial Flood',
    description: 'Deal 4 damage to all enemy cards and heal your hero for each destroyed.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'all-enemy-minions', amount: 4, healHeroPerKill: 3 },
  },
};

// Domain-derived abilities for entries without an override. Ordered: first
// match wins, so more specific domains come first.
const DOMAIN_ABILITIES = [
  [/thunder|lightning/, {
    name: 'Thunderstrike',
    description: 'Deal 10 damage to an enemy; double against Sea or Sky domains.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'enemy-minion', amount: 10, bonusVsDomains: ['sea', 'sky'] },
  }],
  [/war|battle|strife/, {
    name: 'Battle Fury',
    description: 'Gains +5 power when attacking.',
    trigger: 'passive',
    effect: { kind: 'buff-self-attacking', power: 5 },
  }],
  [/sea|ocean|tidal|flood/, {
    name: 'Tidal Wave',
    description: 'Deal 5 damage to all enemy cards when played.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'all-enemy-minions', amount: 5 },
  }],
  [/wisdom|tactical|knowledge|writing|scribal/, {
    name: 'Tactical Counsel',
    description: 'Draw a card when played.',
    trigger: 'on_play',
    effect: { kind: 'draw', count: 1 },
  }],
  [/magic|crossroads|mystery|witchcraft|sorcery/, {
    name: 'Crossroads',
    description: 'Choose one of three random effects on play.',
    trigger: 'on_play',
    effect: {
      kind: 'random-choice',
      options: [
        { kind: 'draw', count: 1 },
        { kind: 'damage', target: 'enemy-minion', amount: 6 },
        { kind: 'heal-hero', amount: 6 },
      ],
    },
  }],
  [/love|beauty|charm|desire/, {
    name: 'Charm',
    description: 'An enemy card loses 10 power until end of turn.',
    trigger: 'on_play',
    effect: { kind: 'debuff-enemy', target: 'enemy-minion', power: 10, untilEndOfTurn: true },
  }],
  [/death|underworld|shadow|grave/, {
    name: 'Grasp of Shadows',
    description: 'Drain 5 health from the enemy hero.',
    trigger: 'on_play',
    effect: { kind: 'drain-hero', amount: 5 },
  }],
  [/victory|triumph/, {
    name: 'Triumph',
    description: 'Inspire your allies for +3 power while in play.',
    trigger: 'passive',
    effect: { kind: 'aura-allies', power: 3 },
  }],
  [/sun|light|fire|flame|dawn/, {
    name: 'Radiance',
    description: 'Blind an enemy, halving its speed.',
    trigger: 'on_play',
    effect: { kind: 'slow-enemy', target: 'enemy-minion' },
  }],
  [/moon|night|dream/, {
    name: 'Lunar Veil',
    description: 'Shield an ally from the next 6 damage.',
    trigger: 'on_play',
    effect: { kind: 'shield-ally', target: 'ally-minion', amount: 6 },
  }],
  [/earth|grain|harvest|agriculture|fertility/, {
    name: 'Harvest Blessing',
    description: 'Restore 3 health to all friendly cards.',
    trigger: 'on_play',
    effect: { kind: 'heal-allies', amount: 3 },
  }],
  [/wine|ecstasy|madness|revelry/, {
    name: 'Ecstatic Madness',
    description: 'Confuse an enemy card for a turn.',
    trigger: 'on_play',
    effect: { kind: 'confuse', target: 'enemy-minion' },
  }],
  [/hunt|wild|wilderness|beast/, {
    name: 'Hunter’s Mark',
    description: 'Deal 7 damage to the strongest enemy card.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'strongest-enemy-minion', amount: 7 },
  }],
  [/forge|craft|smith|artisan|metalwork/, {
    name: 'Forge Mastery',
    description: 'Reduce incoming damage by 3.',
    trigger: 'passive',
    effect: { kind: 'damage-reduction', amount: 3 },
  }],
  [/heal|medicine|physician/, {
    name: 'Panacea',
    description: 'Restore 8 health to your hero.',
    trigger: 'on_play',
    effect: { kind: 'heal-hero', amount: 8 },
  }],
  [/music|poetry|song|lyre/, {
    name: 'Hymn',
    description: 'Restore 5 health to your hero and draw a card.',
    trigger: 'on_play',
    effect: { kind: 'combo', effects: [{ kind: 'heal-hero', amount: 5 }, { kind: 'draw', count: 1 }] },
  }],
  [/storm|wind|tempest|rain/, {
    name: 'Storm Call',
    description: 'Deal 4 damage to all enemy cards.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'all-enemy-minions', amount: 4 },
  }],
  [/river|water|spring|well/, {
    name: 'Flowing Renewal',
    description: 'Restore 4 health to your hero each turn while in play.',
    trigger: 'passive',
    effect: { kind: 'heal-hero-turn', amount: 4 },
  }],
  [/fate|destiny|oracle|prophecy/, {
    name: 'Foresight',
    description: 'Look ahead: draw two cards.',
    trigger: 'on_play',
    effect: { kind: 'draw', count: 2 },
  }],
  [/justice|law|order|judgment|judgement/, {
    name: 'Decree',
    description: 'Stun an enemy card.',
    trigger: 'on_play',
    effect: { kind: 'stun', target: 'enemy-minion' },
  }],
  [/king|ruler|sovereign|empire|authority/, {
    name: 'Royal Mandate',
    description: 'Grant your allies +2 power and +2 health.',
    trigger: 'on_play',
    effect: { kind: 'buff-allies', power: 2, health: 2 },
  }],
  [/queen|marriage|hearth|home/, {
    name: 'Hearth Guard',
    description: 'Shield all friendly cards from the next 3 damage.',
    trigger: 'on_play',
    effect: { kind: 'shield-allies', amount: 3 },
  }],
  [/sky|heaven|celestial|star/, {
    name: 'Celestial Cycle',
    description: 'Restore 5 health to your hero each turn while in play.',
    trigger: 'passive',
    effect: { kind: 'heal-hero-turn', amount: 5 },
  }],
  [/serpent|snake|dragon/, {
    name: 'Coiling Strike',
    description: 'Deal 8 damage to an enemy card.',
    trigger: 'on_play',
    effect: { kind: 'damage', target: 'enemy-minion', amount: 8 },
  }],
  [/chaos|void|abyss|primordial/, {
    name: 'Unmaking',
    description: 'Destroy the weakest enemy card.',
    trigger: 'on_play',
    effect: { kind: 'destroy-weakest-enemy' },
  }],
  [/creation|cosmos|cosmogony/, {
    name: 'Genesis',
    description: 'Copy the top card of your deck into your hand.',
    trigger: 'on_play',
    effect: { kind: 'copy-top-card' },
  }],
  [/trickster|messenger|thief|cunning/, {
    name: 'Sleight',
    description: 'Draw a card; this card may attack immediately.',
    trigger: 'passive',
    effect: { kind: 'combo', effects: [{ kind: 'draw', count: 1 }, { kind: 'charge' }] },
  }],
  [/time|eternity|age/, {
    name: 'Sands of Time',
    description: 'Reduce all enemy cards’ speed by half.',
    trigger: 'on_play',
    effect: { kind: 'slow-all-enemies' },
  }],
  [/protect|guardian|shield|defense|defence/, {
    name: 'Aegis',
    description: 'Reduce all incoming damage by 2.',
    trigger: 'passive',
    effect: { kind: 'damage-reduction', amount: 2 },
  }],
  [/death|fate|doom/, {
    name: 'Inevitable',
    description: 'On death, deal 6 damage to the enemy hero.',
    trigger: 'on_death',
    effect: { kind: 'damage', target: 'enemy-hero', amount: 6 },
  }],
];

const CATEGORY_ABILITIES = {
  concept: {
    name: 'Epiphany',
    description: 'Reveal and copy the top card of your deck.',
    trigger: 'on_play',
    effect: { kind: 'copy-top-card' },
  },
  place: {
    name: 'Domain Advantage',
    description: 'Gain +2 ink at the start of your turn while this card is in play.',
    trigger: 'passive',
    effect: { kind: 'ink-gen', amount: 2 },
  },
  mineral: {
    name: 'Adamantine',
    description: 'Reduce incoming damage by 3.',
    trigger: 'passive',
    effect: { kind: 'damage-reduction', amount: 3 },
  },
  celestial: {
    name: 'Celestial Cycle',
    description: 'Restore 5 health to your hero each turn while in play.',
    trigger: 'passive',
    effect: { kind: 'heal-hero-turn', amount: 5 },
  },
  primordial: {
    name: 'First Breath',
    description: 'On death, deal 5 damage to the enemy hero.',
    trigger: 'on_death',
    effect: { kind: 'damage', target: 'enemy-hero', amount: 5 },
  },
};

// ── The bespoke ability engine ──────────────────────────────────────────────
// Every flagship names its ability after its epithet in the lore catalog
// (271 unique names by construction); archives compose class + pantheon
// suffix names. Effects come from a fine-grained domain grammar with small
// deterministic value variation per entry — no two cards read alike.
const PANTHEON_SUFFIX = {
  greek: 'of Olympos', norse: 'of the Nine Realms', egyptian: 'of the Two Lands',
  mesopotamian: 'of the Great Above', sanskrit: 'of the Devas', japanese: 'of Takamagahara',
  chinese: 'of the Celestial Court', taoist: 'of the Tao', yoruba: 'of the Orisha',
  polynesian: 'of the Great Ocean', zoroastrian: 'of the Amesha Spenta', buddhist: 'of the Pure Land',
  roman: 'of the Capitoline', canaanite: 'of Zaphon', abrahamic: 'of the Host',
  slavic: 'of the Three Worlds', celtic: 'of the Otherworld', baltic: 'of the Groves',
  phoenician: 'of the Harbors', nahuatl: 'of the Fifth Sun',
};

// [regex, complement, trigger, makeEffect(seed) → effect, describe(effect)]
const ABILITY_GRAMMAR = [
  [/thunder|lightning|storm|sky wind|tempest/, 'Thunderclap', 'on_play', (s) => ({ kind: 'damage', target: 'enemy-minion', amount: 3 + (s % 2) }), (e) => `Deal ${e.amount} damage to an enemy card.`],
  [/sun|light|dawn|day\b/, 'Dawnlance', 'on_play', (s) => (s % 2 ? { kind: 'damage', target: 'enemy-minion', amount: 3 } : { kind: 'slow-enemy', target: 'enemy-minion' }), (e) => (e.kind === 'damage' ? `Deal ${e.amount} damage to an enemy card.` : 'Halve an enemy card’s speed.')],
  [/sea|ocean|water|river|flood|rain|wave|tide/, 'Undertow', 'on_play', () => ({ kind: 'damage', target: 'enemy-board', amount: 2 }), () => 'Deal 2 damage to all enemy cards.'],
  [/healing|medicine|health|physician|remedy/, 'Mending Hand', 'on_play', (s) => (s % 2 ? { kind: 'heal-hero', amount: 4 } : { kind: 'heal-allies', amount: 2 }), (e) => (e.kind === 'heal-hero' ? 'Restore 4 health to your hero.' : 'Restore 2 health to your allies.')],
  [/death|underworld|afterlife|grave/, 'The Toll', 'on_play', (s) => (s % 2 ? { kind: 'destroy-weakest-enemy' } : { kind: 'drain-hero', amount: 3 }), (e) => (e.kind === 'drain-hero' ? 'Drain 3 health from the enemy hero.' : 'Destroy the weakest enemy card.')],
  [/wisdom|knowledge|writing|scribe|magic|sorcery|lore|runes/, 'Deep Study', 'on_play', () => ({ kind: 'draw', count: 2 }), () => 'Draw 2 cards.'],
  [/war|battle|courage|valor|army|warfare/, 'War Cry', 'on_play', () => ({ kind: 'buff-allies', power: 1, health: 0 }), () => 'Your allies gain +1 power.'],
  [/victory|triumph|contest|glory/, 'Crown of Victory', 'on_play', () => ({ kind: 'buff-allies', power: 1, health: 1 }), () => 'Your allies gain +1/+1.'],
  [/love|beauty|desire|passion|fertility/, 'Irresistible Charm', 'on_play', () => ({ kind: 'stun', target: 'enemy-minion' }), () => 'Stun an enemy card.'],
  [/fire|flame|forge|ember|volcanic/, 'Brand', 'on_play', (s) => (s % 2 ? { kind: 'damage', target: 'enemy-minion', amount: 3 } : { kind: 'ink-gen', amount: 1 }), (e) => (e.kind === 'damage' ? 'Deal 3 damage to an enemy card.' : 'Gain +1 ink each turn while in play.')],
  [/earth|mountain|harvest|nature|forest|growth|spring|fertility of the soil/, 'Stonecradle', 'on_play', () => ({ kind: 'shield-allies', amount: 2 }), () => 'Your allies gain a 2 shield.'],
  [/moon|night|dream|sleep|darkness|shadow/, 'Nightveil', 'on_play', (s) => (s % 2 ? { kind: 'confuse', target: 'enemy-minion' } : { kind: 'shield-ally', amount: 3 }), (e) => (e.kind === 'confuse' ? 'Confuse an enemy card.' : 'An ally gains a 3 shield.')],
  [/hunt|wild|beast|animals|forest beasts/, "Hunter's Mark", 'on_play', () => ({ kind: 'damage', target: 'enemy-minion', amount: 4 }), () => 'Deal 4 damage to an enemy card.'],
  [/justice|law|order|judgment|truth|oath/, 'Edict', 'on_play', (s) => (s % 2 ? { kind: 'stun', target: 'enemy-minion' } : { kind: 'destroy-weakest-enemy' }), (e) => (e.kind === 'stun' ? 'Stun an enemy card.' : 'Destroy the weakest enemy card.')],
  [/messenger|travel|roads|thieves|trade|commerce|wealth|gold|mercy/, 'Free Passage', 'on_play', () => ({ kind: 'copy-top-card' }), () => 'Copy the top card of your deck into your hand.'],
  [/trick|chaos|lies|mischief|deception/, 'The Kind Lie', 'on_play', () => ({ kind: 'confuse', target: 'enemy-minion' }), () => 'Confuse an enemy card.'],
  [/time|fate|destiny|prophecy|oracle|foresight|stars of fate/, 'Foretelling', 'on_play', (s) => (s % 2 ? { kind: 'draw', count: 2 } : { kind: 'slow-all-enemies' }), (e) => (e.kind === 'draw' ? 'Draw 2 cards.' : 'Halve the speed of all enemy cards.')],
  [/king|queen|royal|command|kingship|rule|sovereign|throne/, 'Royal Mandate', 'on_play', () => ({ kind: 'buff-allies', power: 1, health: 0 }), () => 'Your allies gain +1 power.'],
  [/craft|smith|artisan|builder|making|invention/, 'Masterwork', 'on_play', (s) => (s % 2 ? { kind: 'shield-allies', amount: 2 } : { kind: 'shield-ally', amount: 4 }), (e) => (e.kind === 'shield-allies' ? 'Your allies gain a 2 shield.' : 'An ally gains a 4 shield.')],
  [/music|song|poetry|art|dance|lyre/, 'Refrain', 'on_play', (s) => (s % 2 ? { kind: 'heal-allies', amount: 2 } : { kind: 'draw', count: 1 }), (e) => (e.kind === 'heal-allies' ? 'Restore 2 health to your allies.' : 'Draw a card.')],
  [/serpent|dragon|monster|snake|hydra/, 'Coiling Strike', 'on_play', () => ({ kind: 'damage', target: 'enemy-minion', amount: 4 }), () => 'Deal 4 damage to an enemy card.'],
  [/disease|plague|rot|decay|famine/, 'Blight', 'on_play', () => ({ kind: 'debuff-enemy', power: 3 }), () => 'Weaken an enemy card by 3 until end of turn.'],
  [/void|abyss|primordial|nothing|unmaking/, 'Unmaking', 'on_play', () => ({ kind: 'destroy-weakest-enemy' }), () => 'Destroy the weakest enemy card.'],
  [/creation|cosmos|cosmogony|genesis|beginning/, 'Genesis', 'on_play', () => ({ kind: 'copy-top-card' }), () => 'Copy the top card of your deck into your hand.'],
  [/protect|guardian|shield|defense|defence|aegis/, 'Aegis', 'passive', () => ({ kind: 'damage-reduction', amount: 2 }), () => 'Reduce all incoming damage by 2.'],
  [/doom|inevitable|end of days/, 'Inevitable', 'on_death', () => ({ kind: 'damage', target: 'enemy-hero', amount: 5 }), () => 'On death, deal 5 damage to the enemy hero.'],
  [/hero|quest|journey|voyage|adventure/, 'The Long Road', 'on_play', (s) => (s % 2 ? { kind: 'draw', count: 1 } : { kind: 'copy-top-card' }), (e) => (e.kind === 'draw' ? 'Draw a card.' : 'Copy the top card of your deck into your hand.')],
  [/star|celestial|heaven|sky\b/, 'Celestial Cycle', 'passive', () => ({ kind: 'heal-hero-turn', amount: 3 }), () => 'Restore 3 health to your hero each turn while in play.'],
  [/crossroads|mystery|veil|secret|hidden|mist/, 'Old Presence', 'passive', () => ({ kind: 'aura-allies', power: 1 }), () => 'Your allies gain +1 power while this is in play.'],
];

function deriveAbility(entry, category) {
  const override = ABILITY_OVERRIDES[entry.id];
  if (override) return { id: `ability-${entry.id}`, entryId: entry.id, ...override };

  const seed = hashString(entry.id);
  const domain = (entry.domain || '').toLowerCase();
  const flagship = Boolean(ARCHETYPE_IDS.has(entry.id));
  const lore = LORE_CATALOG[entry.id];

  // Find the grammar class for this domain.
  let rule = null;
  for (const [re, complement, trigger, makeEffect] of ABILITY_GRAMMAR) {
    if (re.test(domain)) {
      rule = { complement, trigger, makeEffect };
      break;
    }
  }
  // Category fallbacks for unmatched domains.
  let composedDefault = null;
  if (!rule) {
    const catRules = {
      place: ['Free Passage', 'passive', () => ({ kind: 'ink-gen', amount: 2 })],
      mineral: ['Adamantine', 'passive', () => ({ kind: 'damage-reduction', amount: 3 })],
      celestial: ['Celestial Cycle', 'passive', () => ({ kind: 'heal-hero-turn', amount: 3 })],
      primordial: ['First Breath', 'on_death', () => ({ kind: 'damage', target: 'enemy-hero', amount: 5 })],
      concept: ['Epiphany', 'on_play', () => ({ kind: 'copy-top-card' })],
    };
    const cr = catRules[category];
    if (cr) {
      rule = { complement: cr[0], trigger: cr[1], makeEffect: cr[2] };
    } else {
      // Deities whose domain escapes the grammar: compose the name from the
      // entry's own domain words and deal the effect from a varied pool.
      const firstWord = ((entry.domain || 'Divine').match(/[A-Za-zÀ-ɏ]+/) || ['Divine'])[0];
      composedDefault = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      const pool = [
        ['passive', () => ({ kind: 'aura-allies', power: 1 })],
        ['on_play', () => ({ kind: 'draw', count: 1 })],
        ['on_play', () => ({ kind: 'shield-allies', amount: 2 })],
        ['on_play', () => ({ kind: 'heal-hero', amount: 3 })],
        ['on_play', () => ({ kind: 'buff-allies', power: 1, health: 0 })],
      ];
      const pr = pool[seed % pool.length];
      rule = { complement: composedDefault, trigger: pr[0], makeEffect: pr[1] };
    }
  }

  const effect = rule.makeEffect(seed);
  const grammar = ABILITY_GRAMMAR.find(([re]) => re.test(domain));
  const describe = grammar ? grammar[4] : null;

  // Name: the flagship's epithet from the lore catalog (unique per temple);
  // archives compose class + pantheon suffix.
  let name;
  if (flagship && lore?.domains?.title) {
    name = lore.domains.title;
  } else {
    const suffix = PANTHEON_SUFFIX[entry.pantheon] || 'of the Pantheon';
    name = `${rule.complement} ${suffix}`;
  }

  const description = describe
    ? describe(effect)
    : effect.kind === 'ink-gen'
      ? 'Gain +2 ink each turn while in play.'
      : effect.kind === 'damage-reduction'
        ? `Reduce incoming damage by ${effect.amount}.`
        : effect.kind === 'heal-hero-turn'
          ? `Restore ${effect.amount} health to your hero each turn while in play.`
          : effect.kind === 'copy-top-card'
            ? 'Copy the top card of your deck into your hand.'
            : effect.kind === 'damage'
              ? `On death, deal ${effect.amount} damage to the enemy hero.`
              : effect.kind === 'draw'
                ? 'Draw a card.'
                : effect.kind === 'shield-allies'
                  ? 'Your allies gain a 2 shield.'
                  : effect.kind === 'heal-hero'
                    ? 'Restore 3 health to your hero.'
                    : effect.kind === 'buff-allies'
                      ? 'Your allies gain +1 power.'
                      : 'Your allies gain +1 power while this is in play.';

  return { id: `ability-${entry.id}`, entryId: entry.id, name, description, trigger: rule.trigger, effect };
}

// ── Flavor text ─────────────────────────────────────────────────────────────

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(text) {
  const match = String(text).match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : String(text).slice(0, 160);
}

function deriveFlavor(entry, archetype, lore) {
  if (lore?.mythology?.lead) {
    const sentence = firstSentence(stripHtml(lore.mythology.lead));
    if (sentence.length >= 30) return sentence.slice(0, 220);
  }
  if (lore?.domains?.lead) {
    const sentence = firstSentence(stripHtml(lore.domains.lead));
    if (sentence.length >= 30) return sentence.slice(0, 220);
  }
  if (archetype?.tagline) {
    const tagline = stripHtml(archetype.tagline);
    if (tagline.length >= 20) return tagline.slice(0, 220);
  }
  return entry.meaning || '';
}

// ── Card assembly ───────────────────────────────────────────────────────────

const MASTERS_BASE = 'https://punycodex-masters.vercel.app';

// ── The Edition Ladder (rarity = printing, never ownership) ─────────────────
// Every flagship archetype is printed in four editions of escalating scarcity
// and spectacle: common, holo, full-art, and the original-script secret rare.
// A character's tier sets stat bands; the EDITION sets the rarity. Base
// lexicon entries enter as single Archive printings until they are promoted.
const EDITIONS = ['common', 'holo', 'full-art', 'secret'];
const EDITION_META = {
  common: { rarity: 'common', bump: { power: 0, health: 0 } },
  // +12 raw = a guaranteed +1 at the battle scale (STAT_SCALE 12): edition
  // strength must be felt in the duel, not just seen in the gallery.
  holo: { rarity: 'rare', bump: { power: 12, health: 12 } },
  'full-art': { rarity: 'legendary', bump: { power: 12, health: 12 } },
  secret: { rarity: 'mythic', bump: { power: 12, health: 12 } },
};

// Full-art upgrades the ability into the card's special attack: a numeric
// power effect gains +2; anything else gains a small combo flourish.
function upgradeAbility(ability, edition) {
  if (!ability) return ability;
  if (edition !== 'full-art' && edition !== 'secret') return ability;
  const effect = ability.effect;
  if (effect && typeof effect.power === 'number') {
    return {
      ...ability,
      name: ability.name,
      description: `${ability.description} +2 power (Full-Art).`,
      effect: { ...effect, power: effect.power + 2 },
    };
  }
  if (effect && effect.kind && effect.kind !== 'combo') {
    return {
      ...ability,
      description: `${ability.description} Its bearer also rallies the pantheon (Full-Art).`,
      effect: {
        kind: 'combo',
        effects: [effect, { kind: 'buff-allies', power: 1, health: 1 }],
      },
    };
  }
  return ability;
}

function buildCard(entry, { variant, rarity, archetype, lore, flagship, edition = null }) {
  const seed = hashString(entry.id);
  const category = deriveCategory(entry);
  const categoryMeta = CATEGORY_META[category] || { label: 'Mythic', icon: '◎' };
  const script = hasOriginalScript(entry) ? getOriginalScript(entry) : null;
  const ed = edition ? EDITION_META[edition] : null;
  const bump = ed ? ed.bump : { power: 0, health: 0 };
  const editionRarity = ed ? ed.rarity : rarity;

  const baseAbility = deriveAbility(entry, category);
  const ability = edition ? upgradeAbility(baseAbility, edition) : baseAbility;
  const finalPower = basePower(entry.tier, seed) + bump.power;
  const finalHealth = domainHealth(entry.domain, seed) + bump.health;

  const card = {
    id: edition ? `${entry.id}-${edition}` : `${entry.id}-${variant}`,
    entryId: entry.id,
    baseCardId: edition ? `${entry.id}-common` : `${entry.id}-${variant}`,
    edition: edition || 'archive',
    variant,
    setId: SET.id,
    name: entry.unicode || entry.ascii,
    ascii: entry.ascii,
    original: script || entry.greek || '—',
    pantheon: entry.pantheon,
    category,
    categoryLabel: categoryMeta.label,
    categoryIcon: categoryMeta.icon,
    tier: entry.tier,
    tierLabel: entry.tierLabel || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier-${entry.tier}`),
    domain: entry.domain || 'Mythic',
    rarity: editionRarity,
    rarityOrder: RARITY_ORDER[editionRarity],
    cost: 0, // assigned by assignCosts() once the whole cohort exists
    power: finalPower,
    health: finalHealth,
    speed: pantheonSpeed(entry.pantheon, seed),
    ability,
    flavor: deriveFlavor(entry, archetype, lore),
    flagship,
    ownedDomain: archetype?.domainUnicode || null,
    art: archetype
      ? {
          mascot: archetype.mascotPath || null,
          logomark: archetype.logomarkPath || null,
          fullArt:
            edition === 'full-art' || edition === 'secret'
              ? `${MASTERS_BASE}/${entry.id}_comp-canvas.png`
              : null,
          colors: archetype.colors || null,
          artist: null,
        }
      : { mascot: null, logomark: null, fullArt: null, colors: null, artist: null },
  };

  if (variant === 'original-script') {
    card.foil = true;
  }
  if (edition === 'holo') {
    card.patternFoil = true;
  }

  return card;
}

function generateCards() {
  const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));
  const cards = [];
  for (const entry of LEXICON) {
    const archetype = archetypeById.get(entry.id) || null;
    const lore = LORE_CATALOG[entry.id] || null;
    const flagship = Boolean(archetype);

    if (flagship) {
      // The Edition Ladder: common → holo → full-art, then the original-script
      // secret rare when a real script exists to display.
      for (const edition of ['common', 'holo', 'full-art']) {
        cards.push(
          buildCard(entry, {
            variant: 'standard',
            rarity: deriveRarity(entry, { flagship }),
            archetype,
            lore,
            flagship,
            edition,
          })
        );
      }
      if (hasOriginalScript(entry)) {
        cards.push(
          buildCard(entry, {
            variant: 'original-script',
            rarity: 'mythic',
            archetype,
            lore,
            flagship,
            edition: 'secret',
          })
        );
      }
    } else {
      // Archive printing (single, common) until the entry is promoted to a
      // flagship — the ladder opens to it the day its domain is acquired.
      cards.push(
        buildCard(entry, {
          variant: 'standard',
          rarity: deriveRarity(entry, { flagship }),
          archetype,
          lore,
          flagship,
          edition: null,
        })
      );
    }
  }

  assignCosts(cards);
  return cards;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const cards = generateCards();

  const counts = {
    total: cards.length,
    standard: cards.filter((c) => c.variant === 'standard').length,
    originalScript: cards.filter((c) => c.variant === 'original-script').length,
    flagship: cards.filter((c) => c.flagship && c.variant === 'standard').length,
    byEdition: {},
    byRarity: {},
  };
  for (const card of cards) {
    counts.byEdition[card.edition] = (counts.byEdition[card.edition] || 0) + 1;
    counts.byRarity[card.rarity] = (counts.byRarity[card.rarity] || 0) + 1;
  }

  const payload = {
    _meta: {
      generator: 'scripts/generate-cards.js',
      warning: 'GENERATED FILE — do not edit by hand. Edit canonical sources and run npm run generate.',
      canonicalSources: [
        'type/js/lexicon.js',
        'js/archetypes-v2.js',
        'scripts/lore-catalog.json',
        'type/js/original-scripts.js',
      ],
      spec: 'docs/card-game-spec.md',
      counts,
    },
    set: SET,
    cards,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;

  const targets = [
    path.join(root, 'platform', 'api', 'cards.json'),
    path.join(root, 'game', 'cards.json'),
  ];
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json);
    console.log(`✓ Wrote ${path.relative(root, target)}`);
  }

  console.log(
    `  ${counts.total} cards (${counts.standard} standard, ${counts.originalScript} original-script foils, ${counts.flagship} flagship)`
  );
  console.log(
    `  rarity: ${Object.entries(counts.byRarity)
      .map(([r, n]) => `${r}=${n}`)
      .join(' ')}`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  generateCards,
  deriveCategory,
  deriveRarity,
  deriveAbility,
  deriveFlavor,
  RARITY_ORDER,
  SET,
};
