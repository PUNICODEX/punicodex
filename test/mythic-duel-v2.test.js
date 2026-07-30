/**
 * Mythic Duel v2 (Pantheon Protocol, Phase 1) tests
 *
 * Covers: the hero-power engine extension (cost, once-per-turn, reset at
 * startTurn, hero/board targets), the pantheon power map, the deterministic
 * archetype assignment, the sequence engine's builder registry, and the
 * page/game wiring.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const Engine = require('../game/engine.js');
const HeroPowers = require('../game/fx/hero-powers.js');
const Sequences = require('../game/fx/sequences.js');
const SET = require('../game/cards.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function makeBattle(seed = 7) {
  const deck = SET.cards.slice(0, 30).map(Engine.toBattleCard);
  const aiDeck = SET.cards.slice(30, 60).map(Engine.toBattleCard);
  return Engine.createGame({ playerDeck: deck, aiDeck, seed });
}

test('useHeroPower: hero-target damage, ink cost, once per turn', () => {
  const battle = makeBattle();
  battle.players[0].ink = 10;
  const bolt = HeroPowers.forPantheon('greek');
  const before = battle.players[1].hero.hp;
  const res = Engine.useHeroPower(battle, bolt);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(battle.players[1].hero.hp, before - 2, 'bolt deals 2 to the enemy hero');
  assert.strictEqual(battle.players[0].ink, 8, 'costs 2 ink');
  assert.strictEqual(battle.players[0].heroPowerUsed, true);
  const again = Engine.useHeroPower(battle, bolt);
  assert.strictEqual(again.ok, false, 'second use same turn refused');
});

test('useHeroPower: board-target damage hits every enemy minion; ink-poor refusal', () => {
  const battle = makeBattle();
  // Put two enemy minions on the board directly.
  const c = SET.cards[40];
  battle.players[1].board.push(
    { uid: 901, def: c, name: c.name, cost: c.cost, power: 3, maxHealth: 5, health: 5, speed: 3, shield: 0, sick: false, attacksUsed: false, stunned: 0, confused: 0, tempPowerDown: 0, ability: null, domain: c.domain || '', rarity: c.rarity },
    { uid: 902, def: c, name: c.name, cost: c.cost, power: 3, maxHealth: 5, health: 5, speed: 3, shield: 0, sick: false, attacksUsed: false, stunned: 0, confused: 0, tempPowerDown: 0, ability: null, domain: c.domain || '', rarity: c.rarity }
  );
  battle.players[0].ink = 1;
  const gale = HeroPowers.forPantheon('japanese');
  const poor = Engine.useHeroPower(battle, gale);
  assert.strictEqual(poor.ok, false, 'not enough ink refused');
  battle.players[0].ink = 5;
  const res = Engine.useHeroPower(battle, gale);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(battle.players[1].board[0].health, 4);
  assert.strictEqual(battle.players[1].board[1].health, 4);
});

test('heroPowerUsed resets at the start of the player\'s next turn', () => {
  const battle = makeBattle();
  battle.players[0].ink = 10;
  Engine.useHeroPower(battle, HeroPowers.forPantheon('greek'));
  assert.strictEqual(battle.players[0].heroPowerUsed, true);
  // Cycle: player 0 ends, AI plays, player 0 starts again.
  Engine.endTurn(battle);
  Engine.runAiTurn(battle);
  assert.strictEqual(battle.players[0].heroPowerUsed, false, 'flag reset by startTurn');
});

test('every pantheon in the card set has a hero power (or the default)', () => {
  const pantheons = new Set(SET.cards.map((c) => c.pantheon));
  const missing = [...pantheons].filter((p) => !HeroPowers.POWERS[p] && p !== undefined);
  // Default exists to cover anything unmapped; still, the main pantheons must map.
  for (const p of ['greek', 'norse', 'egyptian', 'sanskrit', 'japanese', 'mesopotamian']) {
    assert.ok(HeroPowers.POWERS[p], `main pantheon ${p} unmapped`);
  }
  for (const p of missing) {
    assert.ok(HeroPowers.forPantheon(p), `${p} resolves to nothing`);
  }
  // Every power uses only effect kinds the engine implements.
  const implemented = new Set([
    'damage', 'draw', 'heal-hero', 'drain-hero', 'heal-allies', 'shield-allies',
    'shield-ally', 'buff-allies', 'debuff-enemy', 'destroy-weakest-enemy',
    'destroy-filter', 'stun', 'stun-filter', 'confuse', 'slow-enemy',
    'slow-all-enemies', 'ink-gen', 'heal-hero-turn', 'aura-allies',
    'buff-self-attacking', 'damage-reduction', 'return-to-hand', 'copy-top-card',
    'combo', 'random-choice',
  ]);
  const checkEffect = (eff, where) => {
    if (!eff) return;
    if (eff.kind === 'combo') {
      for (const sub of eff.effects || []) checkEffect(sub, where);
      return;
    }
    assert.ok(implemented.has(eff.kind), `${where}: unimplemented effect kind ${eff.kind}`);
  };
  for (const [p, power] of Object.entries(HeroPowers.POWERS)) checkEffect(power.effect, p);
});

test('archetype assignment is deterministic and domain-first', () => {
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'greek', domain: 'Sky, Thunder' }), 'bolt');
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'greek', domain: 'Sea, Earthquakes' }), 'flood');
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'egyptian', domain: 'Death, Underworld' }), 'shadow');
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'norse', domain: 'Wisdom' }), 'song');
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'norse', domain: '' }), 'storm', 'pantheon fallback');
  assert.strictEqual(Sequences.archetypeFor({ pantheon: 'zzz-unknown', domain: '' }), 'warhorn', 'default fallback');
  // Every card in the set resolves to a real archetype.
  const seen = new Set();
  for (const c of SET.cards) seen.add(Sequences.archetypeFor(c));
  for (const a of seen) {
    assert.ok(
      ['bolt', 'blade', 'flood', 'flame', 'shadow', 'bloom', 'storm', 'decay', 'radiance', 'song', 'quake', 'gale', 'veil', 'warhorn'].includes(a),
      `unknown archetype ${a}`
    );
  }
});

test('page wiring: fx libraries load before game.js; hidden-attribute overlays exist', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const fxIdx = html.indexOf('/game/fx/sequences.js');
  const gameIdx = html.indexOf('/game/game.js');
  assert.ok(fxIdx !== -1 && gameIdx !== -1 && fxIdx < gameIdx, 'fx loads before game.js');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  assert.ok(css.includes('[hidden]'), 'hidden-attribute overlay guards present');
  assert.ok(css.includes('.hero-panel'), 'hero panel styles present');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  for (const needle of ['withFx', 'heroCardFor', 'onHeroPower', 'fxSnapshot', 'data-uid']) {
    assert.ok(js.includes(needle), `game.js missing ${needle}`);
  }
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} mythic duel v2 tests passed`);
})();
