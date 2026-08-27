/**
 * PuniCodex — Generated card set tests
 *
 * Validates the canon-derived card set produced by scripts/generate-cards.js
 * against docs/card-game-spec.md and the Edition Ladder (see AGENTS.md):
 *   - every flagship archetype is printed common → holo → full-art, plus a
 *     secret original-script foil when a verified script exists; rarity is a
 *     property of the PRINTING (common→common, holo→rare, full-art→legendary,
 *     secret→mythic), never of ownership
 *   - every non-flagship entry gets a single archive printing with
 *     tier-derived rarity (dual→epic, tier-1→rare, tier-2→common/uncommon)
 *   - stat bands, ability DSL enums, art paths resolving to real files
 *   - both published copies are byte-identical and generation is deterministic
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const GAME_CARDS = path.join(ROOT, 'game', 'cards.json');
const API_CARDS = path.join(ROOT, 'platform', 'api', 'cards.json');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { hasOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const ARCHETYPES_MODULE = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const ARCHETYPES = Array.isArray(ARCHETYPES_MODULE)
  ? ARCHETYPES_MODULE
  : ARCHETYPES_MODULE.ARCHETYPES || ARCHETYPES_MODULE.archetypes;

const SET = JSON.parse(fs.readFileSync(GAME_CARDS, 'utf8'));
const CARDS = SET.cards;
const _STANDARD = CARDS.filter((c) => c.variant === 'standard');
const FOILS = CARDS.filter((c) => c.variant === 'original-script');
// Single printings for non-flagship entries (tier-derived rarity).
const ARCHIVE = CARDS.filter((c) => c.edition === 'archive');

const VALID_RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
const VALID_TRIGGERS = new Set(['on_play', 'on_attack', 'on_death', 'passive']);
const VALID_EFFECT_KINDS = new Set([
  // `all` is the unconditional container (edition upgrades graft their rider
  // with it); `combo` is the conditional one, reserved for battlecry synergy.
  'all',
  'aura-allies',
  'buff-allies',
  'buff-self-attacking',
  'charge',
  'combo',
  'confuse',
  'copy-top-card',
  'damage',
  'damage-reduction',
  'debuff-enemy',
  'destroy-filter',
  'destroy-weakest-enemy',
  'drain-hero',
  'draw',
  'heal-allies',
  'heal-hero',
  'heal-hero-turn',
  'ink-gen',
  'random-choice',
  'return-to-hand',
  'shield-allies',
  'shield-ally',
  'slow-all-enemies',
  'slow-enemy',
  'stun',
  'stun-filter',
]);
const VALID_CATEGORIES = new Set([
  'deity',
  'concept',
  'place',
  'celestial',
  'mineral',
  'primordial',
]);

test('card set has set metadata and one archive printing per non-flagship entry', () => {
  assert.ok(SET._meta, 'set has _meta header marking it generated');
  assert.ok(SET.set?.id, 'set has set metadata');
  assert.strictEqual(ARCHIVE.length, LEXICON.length - ARCHETYPES.length);
});

test('every flagship is printed on the full edition ladder', () => {
  for (const arch of ARCHETYPES) {
    const printings = CARDS.filter((c) => c.entryId === arch.id);
    const editions = new Set(printings.map((c) => c.edition));
    for (const ed of ['common', 'holo', 'full-art']) {
      assert.ok(editions.has(ed), `${arch.id} has a ${ed} printing`);
    }
    assert.ok(
      printings.every((c) => c.baseCardId === `${arch.id}-common`),
      `${arch.id} printings point baseCardId at the common printing`
    );
  }
});

test('card ids are unique', () => {
  const ids = new Set(CARDS.map((c) => c.id));
  assert.strictEqual(ids.size, CARDS.length);
});

test('every card conforms to the spec schema', () => {
  for (const card of CARDS) {
    assert.ok(card.id, 'id');
    assert.ok(card.entryId, 'entryId');
    assert.ok(card.name, 'name');
    assert.ok(card.ascii, 'ascii');
    assert.ok(card.pantheon, 'pantheon');
    assert.ok(VALID_CATEGORIES.has(card.category), `category ${card.category}`);
    assert.ok(VALID_RARITIES.has(card.rarity), `rarity ${card.rarity}`);
    assert.ok(Number.isInteger(card.cost) && card.cost >= 1 && card.cost <= 10, 'cost 1-10');
    assert.ok(Number.isInteger(card.power) && card.power > 0, 'power positive int');
    assert.ok(Number.isInteger(card.health) && card.health > 0, 'health positive int');
    assert.ok(Number.isInteger(card.speed) && card.speed > 0, 'speed positive int');
    assert.ok(card.ability?.name, 'ability name');
    assert.ok(card.ability.description, 'ability description');
    assert.ok(VALID_TRIGGERS.has(card.ability.trigger), `trigger ${card.ability.trigger}`);
    assert.ok(
      card.ability.effect && VALID_EFFECT_KINDS.has(card.ability.effect.kind),
      `effect kind ${card.ability.effect?.kind}`
    );
    assert.ok(card.setId === SET.set.id, 'card references its set');
  }
});

test('power follows the spec tier bands (holo/full-art/secret bump +12)', () => {
  for (const card of CARDS) {
    const bump = card.edition === 'common' || card.edition === 'archive' ? 0 : 12;
    const [lo, hi] = card.tier === 'dual' ? [90, 100] : card.tier === '1' ? [70, 85] : [40, 65];
    assert.ok(
      card.power >= lo + bump && card.power <= hi + bump,
      `${card.id} ${card.tier} power ${card.power} outside band ${lo + bump}-${hi + bump}`
    );
  }
});

test('rarity mirrors the printing edition (archive keeps tier-derived rarity)', () => {
  const EDITION_RARITY = {
    common: 'common',
    holo: 'rare',
    'full-art': 'legendary',
    secret: 'mythic',
  };
  for (const card of CARDS) {
    if (card.edition !== 'archive') {
      assert.strictEqual(card.rarity, EDITION_RARITY[card.edition], `${card.id}`);
    } else if (card.tier === 'dual') {
      assert.strictEqual(card.rarity, 'epic', `${card.id} dual archive is epic`);
    } else if (card.tier === '1') {
      assert.strictEqual(card.rarity, 'rare', `${card.id} tier-1 archive is rare`);
    } else {
      assert.ok(
        card.rarity === 'common' || card.rarity === 'uncommon',
        `${card.id} tier-2 archive is common/uncommon`
      );
    }
  }
});

test('every flagship has a complete spec-valid legendary full-art printing', () => {
  assert.ok(ARCHETYPES.length >= 190, 'archetype registry loaded');
  for (const arch of ARCHETYPES) {
    const card = CARDS.find((c) => c.entryId === arch.id && c.edition === 'full-art');
    assert.ok(card, `${arch.id} has a full-art printing`);
    assert.strictEqual(card.rarity, 'legendary', `${arch.id} full-art is legendary`);
    assert.strictEqual(card.flagship, true, `${arch.id} flagged flagship`);
    assert.ok(card.flavor && card.flavor.length >= 20, `${arch.id} grounded flavor text`);
    assert.ok(card.ability?.name, `${arch.id} named ability`);
    if (arch.domainless) {
      assert.ok(!card.ownedDomain, `${arch.id} domain-less card shows no owned domain`);
    } else {
      assert.ok(card.ownedDomain, `${arch.id} owned domain shown`);
    }
    assert.ok(card.art?.mascot, `${arch.id} mascot art`);
    assert.ok(card.art?.logomark, `${arch.id} logomark art`);
    assert.ok(
      fs.existsSync(path.join(ROOT, card.art.mascot)),
      `${arch.id} mascot exists on disk: ${card.art.mascot}`
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, card.art.logomark)),
      `${arch.id} logomark exists on disk: ${card.art.logomark}`
    );
  }
});

test('mythic original-script foils exist exactly where a real original script exists', () => {
  const lexiconById = new Map(LEXICON.map((e) => [e.id, e]));
  const foilEntryIds = new Set(FOILS.map((c) => c.entryId));
  for (const arch of ARCHETYPES) {
    const entry = lexiconById.get(arch.id);
    assert.ok(entry, `${arch.id} in lexicon`);
    const expectFoil = hasOriginalScript(entry);
    assert.strictEqual(
      foilEntryIds.has(arch.id),
      expectFoil,
      `${arch.id} foil presence matches hasOriginalScript (${expectFoil})`
    );
  }
  for (const foil of FOILS) {
    assert.strictEqual(foil.rarity, 'mythic', `${foil.id} is mythic`);
    assert.ok(foil.original && foil.original.length > 0, `${foil.id} shows original script`);
  }
});

test('flavor text carries no raw HTML', () => {
  for (const card of CARDS) {
    if (card.flavor) {
      assert.ok(!/<[a-z][\s\S]*>/i.test(card.flavor), `${card.id} flavor has no HTML tags`);
    }
  }
});

test('published copies are byte-identical and generation is deterministic', () => {
  const before = fs.readFileSync(GAME_CARDS, 'utf8');
  assert.strictEqual(before, fs.readFileSync(API_CARDS, 'utf8'), 'game and api copies match');
  execSync('node scripts/generate-cards.js', { cwd: ROOT, stdio: 'pipe' });
  assert.strictEqual(fs.readFileSync(GAME_CARDS, 'utf8'), before, 'regeneration is byte-identical');
  assert.strictEqual(
    fs.readFileSync(API_CARDS, 'utf8'),
    before,
    'api copy regenerated byte-identical'
  );
});

console.log('Card set test module loaded.');
