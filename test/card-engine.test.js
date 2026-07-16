'use strict';

/**
 * Card Engine Tests — unit tests for every effect kind in game/engine.js,
 * core battle rules, determinism, and a 200-game AI-vs-AI balance simulation.
 *
 * Run: node --test test/card-engine.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const CE = require('../game/engine.js');
const cardSet = require('../game/cards.json');

/* ── Test helpers ─────────────────────────────────────────────────────── */

let nextCardId = 1;

// Battle-scale card def (the engine plays stats as given).
function mkCard(overrides = {}) {
  const id = overrides.id || `test-${nextCardId++}`;
  return {
    id,
    entryId: id,
    name: overrides.name || `Card ${id}`,
    cost: overrides.cost ?? 1,
    power: overrides.power ?? 2,
    health: overrides.health ?? 2,
    speed: overrides.speed ?? 5,
    domain: overrides.domain || '',
    rarity: overrides.rarity || 'common',
    ability: overrides.ability || null,
  };
}

function onPlay(effect) {
  return { id: 't', name: 'Test', description: '', trigger: 'on_play', effect };
}

function passive(effect) {
  return { id: 't', name: 'Test', description: '', trigger: 'passive', effect };
}

function onDeath(effect) {
  return { id: 't', name: 'Test', description: '', trigger: 'on_death', effect };
}

// Deterministic filler deck (ids derived from prefix so decks can be reused
// across games in determinism tests).
function fillerDeck(prefix = 'f', n = 30) {
  const deck = [];
  for (let i = 0; i < n; i++) {
    deck.push(mkCard({ id: `${prefix}-${i}`, cost: 1, power: 2, health: 2, speed: 5 }));
  }
  return deck;
}

function mkGame(seed = 42) {
  return CE.createGame({ playerDeck: fillerDeck('a'), aiDeck: fillerDeck('b'), seed });
}

// Spawn a minion directly on a board, mirroring the engine's minion shape.
function spawnMinion(state, playerIdx, overrides = {}) {
  const def = mkCard(overrides);
  const minion = {
    uid: state.uidCounter++,
    def,
    cardId: def.id,
    name: def.name,
    cost: def.cost,
    power: def.power,
    maxHealth: def.health,
    health: def.health,
    speed: def.speed,
    shield: 0,
    sick: overrides.sick ?? false,
    attacksUsed: false,
    stunned: 0,
    confused: 0,
    tempPowerDown: 0,
    ability: def.ability,
    domain: def.domain,
    rarity: def.rarity,
  };
  state.players[playerIdx].board.push(minion);
  return minion;
}

// Push a card into a player's hand and play it as that player (no turn dance).
function playFromHand(state, playerIdx, card, target) {
  const player = state.players[playerIdx];
  player.hand.push(card);
  player.ink = 10;
  state.activePlayer = playerIdx;
  return CE.playCard(state, player.hand.length - 1, target);
}

/* ── Setup & core rules ───────────────────────────────────────────────── */

test('setup: opening hands, ink, active player', () => {
  const state = mkGame();
  assert.equal(state.players[0].hand.length, 4); // 3 opening + 1 turn-1 draw
  assert.equal(state.players[0].ink, 1);
  assert.equal(state.players[0].maxInk, 1);
  assert.equal(state.players[1].hand.length, 4); // second player compensation
  assert.equal(state.players[1].ink, 0);
  assert.equal(state.players[1].maxInk, 0);
  assert.equal(state.activePlayer, 0);
  assert.equal(state.winner, null);
  assert.equal(state.halfTurns, 0);
});

test('playCard: deducts ink, removes from hand, summons sick', () => {
  const state = mkGame();
  state.players[0].ink = 10;
  state.players[0].hand.push(mkCard({ cost: 3, power: 4, health: 4 }));
  const res = CE.playCard(state, 4);
  assert.equal(res.ok, true);
  assert.equal(state.players[0].ink, 7);
  assert.equal(state.players[0].hand.length, 4);
  assert.equal(state.players[0].board.length, 1);
  assert.equal(state.players[0].board[0].sick, true);
  assert.equal(state.players[0].playedCount, 1);
});

test('playCard: rejects when ink is short or board is full', () => {
  const state = mkGame();
  state.players[0].ink = 1;
  state.players[0].hand.push(mkCard({ cost: 5 }));
  const poor = CE.playCard(state, 4);
  assert.equal(poor.ok, false);
  assert.match(poor.error, /ink/i);

  for (let i = 0; i < 7; i++) spawnMinion(state, 0);
  state.players[0].ink = 10;
  const full = CE.playCard(state, 4);
  assert.equal(full.ok, false);
  assert.match(full.error, /full/i);
});

test('summoning sickness: cannot attack the turn it is played', () => {
  const state = mkGame();
  state.players[0].ink = 10;
  state.players[0].hand.push(mkCard({ cost: 1, power: 2 }));
  CE.playCard(state, 4);
  const early = CE.attack(state, 0, 'hero');
  assert.equal(early.ok, false);
  CE.endTurn(state); // P1 turn
  CE.endTurn(state); // back to P0 — minion readies
  const ready = CE.attack(state, 0, 'hero');
  assert.equal(ready.ok, true);
  assert.equal(state.players[1].hero.hp, 28);
});

test('combat: one attack per minion per turn', () => {
  const state = mkGame();
  spawnMinion(state, 0, { power: 3 });
  assert.equal(CE.attack(state, 0, 'hero').ok, true);
  assert.equal(CE.attack(state, 0, 'hero').ok, false);
  assert.equal(state.players[1].hero.hp, 27);
});

test('combat: faster attacker halves the counter-attack', () => {
  const state = mkGame();
  spawnMinion(state, 0, { power: 4, health: 10, speed: 6 });
  spawnMinion(state, 0, { power: 4, health: 10, speed: 3 });
  spawnMinion(state, 1, { power: 4, health: 10, speed: 3 });
  spawnMinion(state, 1, { power: 4, health: 10, speed: 3 });

  CE.attack(state, 0, 0); // speed 6 vs 3 → counter halved to 2
  assert.equal(state.players[1].board[0].health, 6);
  assert.equal(state.players[0].board[0].health, 8);

  CE.attack(state, 1, 1); // speed 3 vs 3 → full counter of 4
  assert.equal(state.players[1].board[1].health, 6);
  assert.equal(state.players[0].board[1].health, 6);
});

test('win: hero HP clamps at 0 and winner is set', () => {
  const state = mkGame();
  spawnMinion(state, 0, { power: 40 });
  CE.attack(state, 0, 'hero');
  assert.equal(state.players[1].hero.hp, 0);
  assert.equal(state.winner, 0);
});

test('turn cap: expiry ends the duel in a draw', () => {
  const state = mkGame();
  state.halfTurns = 99;
  CE.endTurn(state);
  assert.equal(state.winner, 'draw');
});

test('ink ramp: +1 max ink per round, hard cap at 10', () => {
  const state = mkGame();
  CE.endTurn(state);
  CE.endTurn(state);
  assert.equal(state.players[0].maxInk, 2);
  assert.equal(state.players[0].ink, 2);
  state.players[0].maxInk = 10;
  CE.endTurn(state);
  CE.endTurn(state);
  assert.equal(state.players[0].maxInk, 10);
});

test('hand limit: excess draws are burned', () => {
  const state = mkGame();
  while (state.players[1].hand.length < 10) state.players[1].hand.push(mkCard());
  const deckBefore = state.players[1].deck.length;
  CE.endTurn(state); // P1 startTurn draws 1 → burned
  assert.equal(state.players[1].hand.length, 10);
  assert.equal(state.players[1].deck.length, deckBefore - 1);
  assert.ok(state.log.some((e) => e.type === 'burn'));
});

test('getLegalActions: plays, targets, attacks, over flag', () => {
  const state = mkGame();
  state.players[0].hand = [
    mkCard({ cost: 1, ability: onPlay({ kind: 'damage', target: 'enemy-minion', amount: 1 }) }),
    mkCard({ cost: 9 }),
  ];
  state.players[0].ink = 3;
  spawnMinion(state, 0, { power: 2 });
  spawnMinion(state, 1, { power: 2 });

  const legal = CE.getLegalActions(state);
  assert.equal(legal.over, false);
  assert.equal(legal.activePlayer, 0);
  assert.equal(legal.canEndTurn, true);
  assert.equal(legal.plays.length, 1); // cost-9 card excluded
  assert.equal(legal.plays[0].handIndex, 0);
  assert.equal(legal.plays[0].needsTarget, true);
  assert.equal(legal.plays[0].targetSide, 'enemy');
  assert.deepEqual(legal.plays[0].targets, [0]);
  assert.equal(legal.attacks.length, 1);
  assert.deepEqual(legal.attacks[0].targets, ['hero', 0]);
  assert.equal(legal.attacks[0].confused, false);

  state.winner = 0;
  const done = CE.getLegalActions(state);
  assert.equal(done.over, true);
  assert.equal(done.plays.length, 0);
  assert.equal(done.attacks.length, 0);
  assert.equal(done.canEndTurn, false);
});

test('determinism: same seed + actions → identical state; different seed differs', () => {
  const deckA = fillerDeck('a');
  const deckB = fillerDeck('b');
  const play = (seed) => {
    const s = CE.createGame({ playerDeck: deckA, aiDeck: deckB, seed });
    CE.playCard(s, 0); // cost-1 filler, turn-1 ink is 1
    CE.endTurn(s);
    CE.runAiTurn(s);
    CE.playCard(s, 0);
    CE.attack(s, 0, 'hero');
    CE.endTurn(s);
    return JSON.stringify(CE.serialize(s));
  };
  assert.equal(play(7), play(7));
  assert.notEqual(play(1), play(2));
});

/* ── Effect kinds (all 25) ────────────────────────────────────────────── */

test('damage: hits an enemy minion; bonusVsDomains doubles', () => {
  const state = mkGame();
  spawnMinion(state, 1, { health: 5 });
  playFromHand(
    state,
    0,
    mkCard({ ability: onPlay({ kind: 'damage', target: 'enemy-minion', amount: 3 }) }),
    0
  );
  assert.equal(state.players[1].board[0].health, 2);

  spawnMinion(state, 1, { health: 5, domain: 'fire-realm' });
  playFromHand(
    state,
    0,
    mkCard({
      ability: onPlay({
        kind: 'damage',
        target: 'enemy-minion',
        amount: 3,
        bonusVsDomains: ['fire'],
      }),
    }),
    1
  );
  assert.equal(state.players[1].board.length, 1); // doubled 6 damage killed it
  assert.equal(state.players[1].board[0].health, 2);
});

test('draw: draws cards from the deck', () => {
  const state = mkGame();
  const deckBefore = state.players[0].deck.length;
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'draw', count: 2 }) }));
  assert.equal(state.players[0].deck.length, deckBefore - 2);
  assert.equal(state.players[0].hand.length, 4 + 1 - 1 + 2);
});

test('heal-hero: heals own hero, capped at max HP', () => {
  const state = mkGame();
  state.players[0].hero.hp = 10;
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'heal-hero', amount: 50 }) }));
  assert.equal(state.players[0].hero.hp, 30);
});

test('drain-hero: damages enemy hero and heals own; can win', () => {
  const state = mkGame();
  state.players[0].hero.hp = 20;
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'drain-hero', amount: 4 }) }));
  assert.equal(state.players[1].hero.hp, 26);
  assert.equal(state.players[0].hero.hp, 24);

  const lethal = mkGame();
  lethal.players[1].hero.hp = 3;
  playFromHand(lethal, 0, mkCard({ ability: onPlay({ kind: 'drain-hero', amount: 4 }) }));
  assert.equal(lethal.players[1].hero.hp, 0);
  assert.equal(lethal.winner, 0);
});

test('heal-allies: heals all friendly minions up to max health', () => {
  const state = mkGame();
  const hurt = spawnMinion(state, 0, { health: 5 });
  hurt.health = 2;
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'heal-allies', amount: 3 }) }));
  assert.equal(hurt.health, 5);
});

test('shield-allies: shields absorb damage before health', () => {
  const state = mkGame();
  const m = spawnMinion(state, 0, { power: 2, health: 5, speed: 5 });
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'shield-allies', amount: 2 }) }));
  assert.equal(m.shield, 2);

  spawnMinion(state, 1, { power: 4, health: 10, speed: 5 });
  state.activePlayer = 1;
  CE.attack(state, 0, 0); // enemy minion hits the shielded one
  assert.equal(m.shield, 0);
  assert.equal(m.health, 3); // 4 damage: 2 absorbed, 2 to health
});

test('shield-ally: shields a chosen friendly minion', () => {
  const state = mkGame();
  const m = spawnMinion(state, 0, { health: 5 });
  playFromHand(
    state,
    0,
    mkCard({ ability: onPlay({ kind: 'shield-ally', target: 'ally-minion', amount: 3 }) }),
    { side: 'ally', index: 0 }
  );
  assert.equal(m.shield, 3);
});

test('buff-allies: buffs other friendly minions, not the source', () => {
  const state = mkGame();
  const m = spawnMinion(state, 0, { power: 3, health: 3 });
  const res = playFromHand(
    state,
    0,
    mkCard({
      cost: 1,
      power: 1,
      health: 1,
      ability: onPlay({ kind: 'buff-allies', power: 2, health: 1 }),
    })
  );
  assert.equal(m.power, 5);
  assert.equal(m.maxHealth, 4);
  assert.equal(m.health, 4);
  assert.equal(res.minion.power, 1);
  assert.equal(res.minion.health, 1);
});

test('debuff-enemy: lowers power until end of turn, then restores', () => {
  const state = mkGame();
  const m = spawnMinion(state, 1, { power: 3 });
  playFromHand(
    state,
    0,
    mkCard({
      ability: onPlay({
        kind: 'debuff-enemy',
        target: 'enemy-minion',
        power: 4,
        untilEndOfTurn: true,
      }),
    }),
    0
  );
  assert.equal(CE.effectivePower(state, 1, m), 0);
  CE.endTurn(state);
  assert.equal(CE.effectivePower(state, 1, m), 3);
});

test('destroy-weakest-enemy: destroys the lowest-power enemy', () => {
  const state = mkGame();
  spawnMinion(state, 1, { power: 2, health: 5 });
  spawnMinion(state, 1, { power: 5, health: 1 });
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'destroy-weakest-enemy' }) }));
  assert.equal(state.players[1].board.length, 1);
  assert.equal(state.players[1].board[0].power, 5);
});

test('destroy-filter: destroys minions at or below maxCost, both sides', () => {
  const state = mkGame();
  spawnMinion(state, 0, { cost: 1 });
  spawnMinion(state, 1, { cost: 2 });
  spawnMinion(state, 1, { cost: 5 });
  playFromHand(
    state,
    0,
    mkCard({ cost: 4, ability: onPlay({ kind: 'destroy-filter', maxCost: 3, bothSides: true }) })
  );
  assert.equal(state.players[1].board.length, 1);
  assert.equal(state.players[1].board[0].cost, 5);
  assert.equal(state.players[0].board.length, 1); // only the cost-4 caster survives
  assert.equal(state.players[0].board[0].cost, 4);
});

test('damage-reduction: lowers incoming damage, floored at 0', () => {
  const state = mkGame();
  const m = spawnMinion(state, 0, {
    health: 5,
    speed: 5,
    ability: passive({ kind: 'damage-reduction', amount: 3 }),
  });
  spawnMinion(state, 1, { power: 5, health: 10, speed: 5 });
  state.activePlayer = 1;
  CE.attack(state, 0, 0);
  assert.equal(m.health, 3); // 5 − 3 reduction = 2 taken
});

test('stun: disabled minion misses exactly one of its turns', () => {
  const state = mkGame();
  spawnMinion(state, 1, { power: 2 });
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'stun', target: 'enemy-minion' }) }), 0);
  assert.equal(state.players[1].board[0].stunned, 1);

  state.activePlayer = 1;
  assert.equal(CE.attack(state, 0, 'hero').ok, false); // stunned: cannot attack
  CE.endTurn(state); // P1 ends → stun ticks down
  CE.endTurn(state); // P0 ends → P1 active again
  assert.equal(CE.attack(state, 0, 'hero').ok, true);
});

test('stun-filter: stuns enemy minions at or below maxPower', () => {
  const state = mkGame();
  const weak = spawnMinion(state, 1, { power: 5 });
  const strong = spawnMinion(state, 1, { power: 8 });
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'stun-filter', maxPower: 6 }) }));
  assert.equal(weak.stunned, 1);
  assert.equal(strong.stunned, 0);
});

test('confuse: next attack strikes a random target, deterministically', () => {
  const scenario = () => {
    const state = mkGame(99);
    spawnMinion(state, 1, { id: 'confused-minion', power: 3 });
    playFromHand(
      state,
      0,
      mkCard({ id: 'confuse-card', ability: onPlay({ kind: 'confuse', target: 'enemy-minion' }) }),
      0
    );
    state.activePlayer = 1;
    const res = CE.attack(state, 0, 'hero'); // target overridden by confusion
    assert.equal(res.ok, true);
    return state;
  };
  const a = scenario();
  const b = scenario();
  assert.equal(a.players[1].board[0].confused, 1);
  assert.equal(JSON.stringify(CE.serialize(a)), JSON.stringify(CE.serialize(b)));
});

test('slow-enemy: halves speed (rounded up), permanent', () => {
  const state = mkGame();
  const fast = spawnMinion(state, 1, { speed: 8 });
  const odd = spawnMinion(state, 1, { speed: 3 });
  const slowCard = () =>
    mkCard({ ability: onPlay({ kind: 'slow-enemy', target: 'enemy-minion' }) });
  playFromHand(state, 0, slowCard(), 0);
  playFromHand(state, 0, slowCard(), 1);
  assert.equal(fast.speed, 4);
  assert.equal(odd.speed, 2);
});

test('slow-all-enemies: halves every enemy minion speed', () => {
  const state = mkGame();
  const a = spawnMinion(state, 1, { speed: 8 });
  const b = spawnMinion(state, 1, { speed: 5 });
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'slow-all-enemies' }) }));
  assert.equal(a.speed, 4);
  assert.equal(b.speed, 3);
});

test('buff-self-attacking: adds power when attacking', () => {
  const state = mkGame();
  spawnMinion(state, 0, { power: 3, ability: passive({ kind: 'buff-self-attacking', power: 5 }) });
  CE.attack(state, 0, 'hero');
  assert.equal(state.players[1].hero.hp, 22); // 3 + 5
});

test('aura-allies: buffs other allies continuously, ends on death', () => {
  const state = mkGame();
  spawnMinion(state, 0, {
    power: 1,
    health: 2,
    ability: passive({ kind: 'aura-allies', power: 3 }),
  });
  const other = spawnMinion(state, 0, { power: 4, health: 6 });
  assert.equal(CE.effectivePower(state, 0, other), 7);
  assert.equal(CE.effectivePower(state, 0, state.players[0].board[0]), 1); // no self-buff

  playFromHand(
    state,
    1,
    mkCard({ ability: onPlay({ kind: 'damage', target: 'enemy-minion', amount: 10 }) }),
    0
  );
  assert.equal(state.players[0].board.length, 1);
  assert.equal(CE.effectivePower(state, 0, other), 4); // aura gone
});

test('heal-hero-turn: heals own hero at the start of each own turn', () => {
  const state = mkGame();
  state.players[0].hero.hp = 20;
  spawnMinion(state, 0, { ability: passive({ kind: 'heal-hero-turn', amount: 2 }) });
  CE.endTurn(state);
  CE.endTurn(state);
  assert.equal(state.players[0].hero.hp, 22);
});

test('ink-gen: adds ink above max ink at turn start', () => {
  const state = mkGame();
  spawnMinion(state, 0, { ability: passive({ kind: 'ink-gen', amount: 2 }) });
  CE.endTurn(state);
  CE.endTurn(state);
  assert.equal(state.players[0].maxInk, 2);
  assert.equal(state.players[0].ink, 4); // 2 max + 2 generated
});

test('return-to-hand: on death a reinforced copy returns to hand', () => {
  const state = mkGame();
  const m = spawnMinion(state, 0, {
    power: 2,
    health: 3,
    ability: onDeath({ kind: 'return-to-hand', healthBonus: 5 }),
  });
  const handBefore = state.players[0].hand.length;
  playFromHand(
    state,
    1,
    mkCard({ ability: onPlay({ kind: 'damage', target: 'enemy-minion', amount: 10 }) }),
    0
  );
  assert.equal(state.players[0].board.length, 0);
  assert.equal(state.players[0].hand.length, handBefore + 1);
  const returned = state.players[0].hand[state.players[0].hand.length - 1];
  assert.equal(returned.id, m.cardId);
  assert.equal(returned.health, 8); // 3 + 5 bonus
});

test('copy-top-card: clones the top deck card into hand', () => {
  const state = mkGame();
  const top = state.players[0].deck[0];
  const deckBefore = state.players[0].deck.length;
  playFromHand(state, 0, mkCard({ ability: onPlay({ kind: 'copy-top-card' }) }));
  assert.equal(state.players[0].deck.length, deckBefore); // deck untouched
  assert.equal(state.players[0].deck[0].id, top.id);
  const copy = state.players[0].hand[state.players[0].hand.length - 1];
  assert.equal(copy.id, top.id);
  assert.notEqual(copy, top); // a clone, not a reference
});

test('random-choice: picks an option via the seeded RNG', () => {
  const scenario = () => {
    const state = mkGame(77);
    state.players[0].hero.hp = 20;
    playFromHand(
      state,
      0,
      mkCard({
        id: 'fate-card',
        ability: onPlay({
          kind: 'random-choice',
          options: [
            { kind: 'draw', count: 1 },
            { kind: 'heal-hero', amount: 2 },
          ],
        }),
      })
    );
    assert.ok(state.log.some((e) => e.text.includes('Fate chooses')));
    return state;
  };
  const a = scenario();
  const b = scenario();
  assert.equal(JSON.stringify(CE.serialize(a)), JSON.stringify(CE.serialize(b)));
});

test('combo: fizzles without a prior play, fires with one', () => {
  const comboCard = () =>
    mkCard({ ability: onPlay({ kind: 'combo', effects: [{ kind: 'draw', count: 1 }] }) });

  const cold = mkGame();
  const coldDeck = cold.players[0].deck.length;
  playFromHand(cold, 0, comboCard());
  assert.equal(cold.players[0].deck.length, coldDeck); // fizzled: no draw

  const hot = mkGame();
  playFromHand(hot, 0, mkCard({ cost: 1 }));
  const hotDeck = hot.players[0].deck.length;
  playFromHand(hot, 0, comboCard());
  assert.equal(hot.players[0].deck.length, hotDeck - 1); // combo drew 1
});

/* ── Balance simulation ───────────────────────────────────────────────── */

test('balance: 200 AI-vs-AI games stay sane and competitive', () => {
  const pool = cardSet.cards.map((c) => CE.toBattleCard(c));
  assert.ok(pool.length >= 1000);

  let p0Wins = 0;
  let draws = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const deckA = CE.autoBuildDeck(pool, seed * 2);
    const deckB = CE.autoBuildDeck(pool, seed * 2 + 1);
    assert.equal(deckA.length, 30);
    assert.equal(deckB.length, 30);

    const state = CE.createGame({ playerDeck: deckA, aiDeck: deckB, seed });
    let guard = 0;
    while (state.winner === null && guard < 300) {
      CE.runAiTurn(state);
      guard++;
    }
    assert.notEqual(state.winner, null, `game ${seed} did not terminate`);
    assert.ok(state.halfTurns <= CE.RULES.TURN_CAP, `game ${seed} exceeded the turn cap`);
    for (const p of state.players) {
      assert.ok(
        Number.isFinite(p.hero.hp) && p.hero.hp >= 0 && p.hero.hp <= 30,
        `game ${seed} hero HP out of range`
      );
      assert.ok(Number.isFinite(p.ink) && p.ink >= 0, `game ${seed} ink out of range`);
      for (const m of p.board) {
        assert.ok(
          Number.isFinite(m.health) && Number.isFinite(m.power),
          `game ${seed} produced NaN stats`
        );
      }
    }
    if (state.winner === 0) p0Wins++;
    else if (state.winner === 'draw') draws++;
  }

  // First player should win roughly half; loose bounds catch gross imbalance.
  assert.ok(p0Wins >= 40 && p0Wins <= 160, `P0 won ${p0Wins}/200 games (draws: ${draws})`);
});
