/**
 * PÚNYCODEX — Card game data layer tests
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const lexiconPath = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const lexiconCode = require('node:fs')
  .readFileSync(lexiconPath, 'utf8')
  .replace('const LEXICON', 'var LEXICON');
const lexiconFn = new Function(`${lexiconCode}; return LEXICON;`);
global.LEXICON = lexiconFn();

const { CardGameData } = require(path.join(__dirname, '..', 'js', 'card-game-data.js'));

test('generateAllCards produces one card per lexicon entry', () => {
  const cards = CardGameData.generateAllCards();
  assert.strictEqual(cards.length, global.LEXICON.length);
});

test('every card has required fields', () => {
  const cards = CardGameData.generateAllCards();
  cards.forEach((card) => {
    assert.ok(card.id, 'card has id');
    assert.ok(card.entryId, 'card has entryId');
    assert.ok(card.name, 'card has name');
    assert.ok(card.ascii, 'card has ascii');
    assert.ok(card.pantheon, 'card has pantheon');
    assert.ok(card.category, 'card has category');
    assert.ok(card.rarity, 'card has rarity');
    assert.ok(typeof card.cost === 'number', 'card has numeric cost');
    assert.ok(typeof card.power === 'number', 'card has numeric power');
    assert.ok(typeof card.health === 'number', 'card has numeric health');
    assert.ok(typeof card.speed === 'number', 'card has numeric speed');
    assert.ok(card.ability, 'card has ability');
    assert.ok(card.ability.name, 'ability has name');
    assert.ok(card.ability.description, 'ability has description');
  });
});

test('categories are valid', () => {
  const validCategories = new Set([
    'deity',
    'concept',
    'place',
    'celestial',
    'mineral',
    'primordial',
  ]);
  const cards = CardGameData.generateAllCards();
  cards.forEach((card) => {
    assert.ok(validCategories.has(card.category), `${card.id} has valid category ${card.category}`);
  });
});

test('rarities are valid', () => {
  const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
  const cards = CardGameData.generateAllCards();
  cards.forEach((card) => {
    assert.ok(validRarities.has(card.rarity), `${card.id} has valid rarity ${card.rarity}`);
  });
});

test('card generation is deterministic', () => {
  const first = CardGameData.generateAllCards();
  const second = CardGameData.generateAllCards();
  first.forEach((card, i) => {
    const other = second[i];
    assert.strictEqual(card.power, other.power);
    assert.strictEqual(card.health, other.health);
    assert.strictEqual(card.cost, other.cost);
    assert.strictEqual(card.speed, other.speed);
  });
});

test('dual-tier and owned entries become legendary', () => {
  const cards = CardGameData.generateAllCards();
  const legendary = cards.filter((c) => c.rarity === 'legendary');
  assert.ok(legendary.length > 0, 'there are legendary cards');
  legendary.forEach((card) => {
    const entry = global.LEXICON.find((e) => e.id === card.entryId);
    assert.ok(entry, 'legendary card maps to a lexicon entry');
    assert.ok(entry.tier === 'dual' || entry.hasAdSite, 'legendary card is dual-tier or owned');
  });
});

test('tier-1 entries are epic or legendary', () => {
  const cards = CardGameData.generateAllCards();
  const tier1 = cards.filter((c) => c.tier === '1');
  tier1.forEach((card) => {
    assert.ok(
      ['epic', 'legendary'].includes(card.rarity),
      `${card.id} tier-1 is epic or legendary`
    );
  });
});

test('pack opening returns requested size', () => {
  const cards = CardGameData.generateAllCards();
  const pack = CardGameData.openPack(cards, { size: 5 });
  assert.strictEqual(pack.length, 5);
  pack.forEach((card) => {
    assert.ok(card.instanceId, 'pack card has instanceId');
  });
});

test('starter deck returns requested size', () => {
  const cards = CardGameData.generateAllCards();
  const deck = CardGameData.starterDeck(cards, 10);
  assert.strictEqual(deck.length, 10);
});

test('new expansion entries have cards', () => {
  const cards = CardGameData.generateAllCards();
  const expansionIds = ['hygieia', 'papatuanuku', 'tiandi', 'yam', 'adamas'];
  expansionIds.forEach((id) => {
    const card = cards.find((c) => c.entryId === id);
    assert.ok(card, `${id} has a generated card`);
  });
});

test('category detection for expansion entries', () => {
  const cards = CardGameData.generateAllCards();
  const adamas = cards.find((c) => c.entryId === 'adamas');
  assert.strictEqual(adamas.category, 'mineral');
  const khaos = cards.find((c) => c.entryId === 'khaos');
  assert.strictEqual(khaos.category, 'concept');
  const atlantis = cards.find((c) => c.entryId === 'atlantis');
  assert.strictEqual(atlantis.category, 'place');
});

test('attachArtworks maps marketplace art to cards', () => {
  const cards = CardGameData.generateAllCards();
  const zeus = cards.find((c) => c.entryId === 'zeus');
  const artworkMap = {
    zeus: { url: '/art/zeus.png', artist: 'MythicStudio' },
  };
  const attached = CardGameData.attachArtworks(cards, artworkMap);
  const zeusAttached = attached.find((c) => c.entryId === 'zeus');
  assert.strictEqual(zeusAttached.artworkUrl, '/art/zeus.png');
  assert.strictEqual(zeusAttached.artist, 'MythicStudio');
  assert.strictEqual(zeusAttached.id, zeus.id);
});
