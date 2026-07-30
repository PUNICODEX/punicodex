/**
 * Mythic Duel v2 — hero powers (Pantheon Protocol)
 *
 * One hero power per pantheon, defined in the engine's effect DSL so the
 * rules engine stays the single authority. Costs RULES.HERO_POWER_COST ink,
 * once per turn (reset by the engine in startTurn).
 *
 * Mapping is by the hero card's pantheon; each power is flavored to the
 * tradition and uses only existing effect kinds.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  root.HeroPowers = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var POWERS = {
    greek: {
      id: 'olympian-bolt',
      name: 'Olympian Bolt',
      text: 'Deal 2 damage to the enemy hero.',
      effect: { kind: 'damage', amount: 2, target: 'enemy-hero' },
      archetype: 'bolt',
    },
    'greek-location': {
      id: 'olympian-bolt',
      name: 'Olympian Bolt',
      text: 'Deal 2 damage to the enemy hero.',
      effect: { kind: 'damage', amount: 2, target: 'enemy-hero' },
      archetype: 'bolt',
    },
    norse: {
      id: 'seidr-veil',
      name: 'Seiðr Veil',
      text: 'An enemy minion loses 2 power until end of turn.',
      effect: { kind: 'debuff-enemy', target: 'enemy-minion', power: 2, untilEndOfTurn: true },
      archetype: 'veil',
    },
    egyptian: {
      id: 'nile-ward',
      name: 'Ward of the Nile',
      text: 'Restore 3 health to your hero.',
      effect: { kind: 'heal-hero', amount: 3 },
      archetype: 'radiance',
    },
    mesopotamian: {
      id: 'tablet-decree',
      name: 'Decree of the Tablets',
      text: 'Draw a card.',
      effect: { kind: 'draw', count: 1 },
      archetype: 'radiance',
    },
    sanskrit: {
      id: 'mantra-surge',
      name: 'Mantra Surge',
      text: 'Your minions gain +1 health.',
      effect: { kind: 'buff-allies', power: 0, health: 1 },
      archetype: 'song',
    },
    japanese: {
      id: 'kami-gale',
      name: 'Kami Gale',
      text: 'Deal 1 damage to all enemy minions.',
      effect: { kind: 'damage', amount: 1, target: 'enemy-board' },
      archetype: 'gale',
    },
    chinese: {
      id: 'tian-harmony',
      name: 'Harmony of Tian',
      text: 'Restore 2 health to your hero and your minions.',
      effect: { kind: 'heal-allies', amount: 2 },
      archetype: 'bloom',
    },
    taoist: {
      id: 'tian-harmony',
      name: 'Harmony of Tian',
      text: 'Restore 2 health to your hero and your minions.',
      effect: { kind: 'heal-allies', amount: 2 },
      archetype: 'bloom',
    },
    yoruba: {
      id: 'ase-command',
      name: 'Aṣẹ Command',
      text: 'Your minions gain +1 power.',
      effect: { kind: 'buff-allies', power: 1, health: 0 },
      archetype: 'storm',
    },
    nahuatl: {
      id: 'sacred-fire',
      name: 'Sacred Fire',
      text: 'Deal 1 damage to the enemy hero; your minions gain +1 power.',
      effect: { kind: 'combo', effects: [
        { kind: 'damage', amount: 1, target: 'enemy-hero' },
        { kind: 'buff-allies', power: 1, health: 0 },
      ] },
      archetype: 'flame',
    },
    roman: {
      id: 'imperium-march',
      name: 'Imperial March',
      text: 'Your minions gain +1 power.',
      effect: { kind: 'buff-allies', power: 1, health: 0 },
      archetype: 'warhorn',
    },
    buddhist: {
      id: 'still-water',
      name: 'Still Water',
      text: 'Restore 2 health to your hero and draw a card.',
      effect: { kind: 'combo', effects: [
        { kind: 'heal-hero', amount: 2 },
        { kind: 'draw', count: 1 },
      ] },
      archetype: 'song',
    },
    zoroastrian: {
      id: 'asha-light',
      name: 'Light of Aša',
      text: 'Deal 2 damage to the strongest enemy minion.',
      effect: { kind: 'damage', amount: 2, target: 'enemy-strongest' },
      archetype: 'radiance',
    },
    abrahamic: {
      id: 'covenant',
      name: 'Covenant',
      text: 'Give your minions 1 shield.',
      effect: { kind: 'shield-allies', amount: 1 },
      archetype: 'veil',
    },
    polynesian: {
      id: 'mana-tide',
      name: 'Mana Tide',
      text: 'Restore 3 health to your hero.',
      effect: { kind: 'heal-hero', amount: 3 },
      archetype: 'flood',
    },
    celtic: {
      id: 'sidhe-mist',
      name: 'Sídhe Mist',
      text: 'An enemy minion loses 2 power until end of turn.',
      effect: { kind: 'debuff-enemy', target: 'enemy-minion', power: 2, untilEndOfTurn: true },
      archetype: 'veil',
    },
    slavic: {
      id: 'perun-strike',
      name: 'Perun’s Strike',
      text: 'Deal 2 damage to the enemy hero.',
      effect: { kind: 'damage', amount: 2, target: 'enemy-hero' },
      archetype: 'bolt',
    },
    baltic: {
      id: 'perun-strike',
      name: 'Perkūnas’s Strike',
      text: 'Deal 2 damage to the enemy hero.',
      effect: { kind: 'damage', amount: 2, target: 'enemy-hero' },
      archetype: 'bolt',
    },
    canaanite: {
      id: 'storm-baal',
      name: 'Storm of Baal',
      text: 'Deal 1 damage to all enemy minions.',
      effect: { kind: 'damage', amount: 1, target: 'enemy-board' },
      archetype: 'storm',
    },
    phoenician: {
      id: 'harbor-gale',
      name: 'Harbor Gale',
      text: 'Deal 1 damage to all enemy minions.',
      effect: { kind: 'damage', amount: 1, target: 'enemy-board' },
      archetype: 'gale',
    },
  };

  var DEFAULT = {
    id: 'pantheon-surge',
    name: 'Pantheon Surge',
    text: 'Your minions gain +1 power.',
    effect: { kind: 'buff-allies', power: 1, health: 0 },
    archetype: 'warhorn',
  };

  function forPantheon(pantheon) {
    return POWERS[pantheon] || DEFAULT;
  }

  return { POWERS: POWERS, DEFAULT: DEFAULT, forPantheon: forPantheon };
});
