/**
 * PuniCodex — Generated card set tests
 *
 * Validates the canon-derived card set produced by scripts/generate-cards.js
 * against docs/card-game-spec.md:
 *   - one standard card per lexicon entry
 *   - every flagship has a complete legendary card (stats, ability, flavor, art)
 *   - mythic original-script foils exist exactly where a real original script exists
 *   - stat bands, rarity rules, ability DSL enums
 *   - art paths resolve to real files on disk
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
const STANDARD = CARDS.filter((c) => c.variant === 'standard');
const FOILS = CARDS.filter((c) => c.variant === 'original-script');

const VALID_RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
const VALID_TRIGGERS = new Set(['on_play', 'on_attack', 'on_death', 'passive']);
const VALID_EFFECT_KINDS = new Set([
  'aura-allies',
  'buff-allies',
  'buff-self-attacking',
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

function standardCard(entryId) {
  return STANDARD.find((c) => c.entryId === entryId);
}

test('card set has set metadata and one standard card per lexicon entry', () => {
  assert.ok(SET._meta, 'set has _meta header marking it generated');
  assert.ok(SET.set && SET.set.id, 'set has set metadata');
  assert.strictEqual(STANDARD.length, LEXICON.length);
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
    assert.ok(card.ability && card.ability.name, 'ability name');
    assert.ok(card.ability.description, 'ability description');
    assert.ok(VALID_TRIGGERS.has(card.ability.trigger), `trigger ${card.ability.trigger}`);
    assert.ok(
      card.ability.effect && VALID_EFFECT_KINDS.has(card.ability.effect.kind),
      `effect kind ${card.ability.effect && card.ability.effect.kind}`
    );
    assert.ok(card.setId === SET.set.id, 'card references its set');
  }
});

test('power follows the spec tier bands', () => {
  for (const card of STANDARD) {
    if (card.tier === 'dual') {
      assert.ok(card.power >= 90 && card.power <= 100, `${card.id} dual power ${card.power}`);
    } else if (card.tier === '1') {
      assert.ok(card.power >= 70 && card.power <= 85, `${card.id} tier-1 power ${card.power}`);
    } else {
      assert.ok(card.power >= 40 && card.power <= 65, `${card.id} tier-2 power ${card.power}`);
    }
  }
});

test('rarity follows the spec rules', () => {
  for (const card of STANDARD) {
    if (card.flagship) {
      assert.strictEqual(card.rarity, 'legendary', `${card.id} flagship is legendary`);
    } else if (card.tier === 'dual') {
      assert.strictEqual(card.rarity, 'epic', `${card.id} dual non-flagship is epic`);
    } else if (card.tier === '1') {
      assert.strictEqual(card.rarity, 'rare', `${card.id} tier-1 non-flagship is rare`);
    } else {
      assert.ok(
        card.rarity === 'common' || card.rarity === 'uncommon',
        `${card.id} tier-2 is common/uncommon`
      );
    }
  }
});

test('every flagship has a complete spec-valid legendary card', () => {
  assert.ok(ARCHETYPES.length >= 190, 'archetype registry loaded');
  for (const arch of ARCHETYPES) {
    const card = standardCard(arch.id);
    assert.ok(card, `${arch.id} has a standard card`);
    assert.strictEqual(card.rarity, 'legendary', `${arch.id} legendary`);
    assert.strictEqual(card.flagship, true, `${arch.id} flagged flagship`);
    assert.ok(card.flavor && card.flavor.length >= 20, `${arch.id} grounded flavor text`);
    assert.ok(card.ability && card.ability.name, `${arch.id} named ability`);
    assert.ok(card.ownedDomain, `${arch.id} owned domain shown`);
    assert.ok(card.art && card.art.mascot, `${arch.id} mascot art`);
    assert.ok(card.art && card.art.logomark, `${arch.id} logomark art`);
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
