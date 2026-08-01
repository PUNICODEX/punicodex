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

test('attack: minion trade resolves damage and halved counter for the faster striker', () => {
  const battle = makeBattle();
  const c = SET.cards[0];
  const mk = (uid, power, health, speed) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  });
  battle.players[0].board.push(mk(801, 4, 6, 8));
  battle.players[1].board.push(mk(901, 3, 5, 2));
  const res = Engine.attack(battle, 0, 0);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(battle.players[1].board[0].health, 1, 'defender takes full power: 5 - 4');
  assert.strictEqual(battle.players[0].board[0].health, 5, 'faster striker halves the counter: floor(3/2)');
  const again = Engine.attack(battle, 0, 0);
  assert.strictEqual(again.ok, false, 'second strike in a turn refused');
  battle.players[0].board[0].attacksUsed = false;
  const kill = Engine.attack(battle, 0, 0);
  assert.strictEqual(kill.ok, true);
  assert.strictEqual(battle.players[1].board.length, 0, 'lethal trade removes the defender');
});

test('attack: hero target and confused random targeting', () => {
  const battle = makeBattle();
  const c = SET.cards[0];
  const mk = (uid, power, health, speed) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  });
  battle.players[0].board.push(mk(802, 4, 6, 5));
  const face = Engine.attack(battle, 0, 'hero');
  assert.strictEqual(face.ok, true);
  assert.strictEqual(battle.players[1].hero.hp, 26, 'hero takes full power');
  battle.players[0].board[0].attacksUsed = false;
  battle.players[0].board[0].confused = 1;
  battle.players[1].board.push(mk(902, 2, 8, 3));
  const wild = Engine.attack(battle, 0, 0); // requested the minion; confusion may override
  assert.strictEqual(wild.ok, true);
  const heroHit = battle.players[1].hero.hp < 26;
  const minionHit = battle.players[1].board.length === 0 || battle.players[1].board[0].health < 8;
  assert.ok(heroHit || minionHit, 'confused strike landed somewhere legal');
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

test('every attack-sequence builder runs clean frames (no undefined vars)', () => {
  // A blade-builder ReferenceError killed the fx loop for every war-god
  // strike in production. Exercise all 14 builders through real frames
  // against a mock canvas — any undefined variable throws here, not live.
  const anyFn = new Proxy(function () {}, {
    get: () => anyFn,
    apply: () => anyFn,
  });
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : anyFn),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  const canvas = {
    width: 800,
    height: 600,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
  let rafCb = null;
  const oldRaf = global.requestAnimationFrame;
  global.requestAnimationFrame = (cb) => {
    rafCb = cb;
    return 1;
  };
  try {
    const fx = Sequences.attach(canvas);
    const archetypes = [
      'bolt', 'blade', 'flood', 'flame', 'shadow', 'bloom', 'storm',
      'decay', 'radiance', 'song', 'quake', 'gale', 'veil', 'warhorn',
    ];
    let t = 1000;
    for (const a of archetypes) {
      fx.attack({
        archetype: a,
        from: { x: 10, y: 10 },
        to: { x: 200, y: 200 },
        colors: { glow: '#ffe9b0' },
        power: 6,
        onImpact() {},
      });
      assert.ok(rafCb, `fx loop scheduled for ${a}`);
      for (let f = 0; f < 90 && rafCb; f++) {
        const cb = rafCb;
        rafCb = null;
        cb((t += 16.7));
      }
    }
  } finally {
    global.requestAnimationFrame = oldRaf;
  }
});

test('AI mercy: holdBack shelters a new commander for three rounds, then lifts', () => {
  const battle = makeBattle();
  const removal = SET.cards.find(
    (c) => c.ability && c.ability.effect && /destroy|damage|stun/.test(c.ability.effect.kind || '')
  );
  assert.ok(removal, 'a removal card exists in the set for this test');
  Engine.endTurn(battle); // AI becomes active; halfTurns small → mercy window
  const ai = battle.players[1];
  ai.hand = [Engine.toBattleCard(removal)];
  ai.ink = 10;
  const before = battle.players[0].board.length + battle.players[0].hero.hp;
  Engine.runAiTurn(battle, { holdBack: true });
  assert.strictEqual(ai.board.length, 0, 'removal card held back during the mercy window');
  assert.ok(before >= 0, 'battle state intact');

  // Late game: mercy lifts, the same card is playable again.
  const battle2 = makeBattle();
  Engine.endTurn(battle2);
  battle2.halfTurns = 12;
  const ai2 = battle2.players[1];
  ai2.hand = [Engine.toBattleCard(removal)];
  ai2.ink = 10;
  Engine.runAiTurn(battle2, { holdBack: true });
  assert.strictEqual(ai2.board.length, 1, 'removal card played once the mercy window closes');
});

test('signature moves: registered for real flagships and frame-clean, supers included', () => {
  const Signatures = require('../game/fx/signatures.js');
  assert.ok(Signatures.count >= 20, 'at least 20 signatures registered');
  const flagshipIds = new Set(SET.cards.filter((c) => c.flagship).map((c) => c.entryId));
  for (const id of Signatures.ids) assert.ok(flagshipIds.has(id), `signature for unknown entry ${id}`);
  assert.ok(Sequences.signatureFor('zeus'), 'zeus signature resolvable');

  const anyFn = new Proxy(function () {}, { get: () => anyFn, apply: () => anyFn });
  const ctx = new Proxy(
    {},
    { get: (t, k) => (k in t ? t[k] : anyFn), set: (t, k, v) => ((t[k] = v), true) }
  );
  const canvas = {
    width: 800,
    height: 600,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
  let rafCb = null;
  const oldRaf = global.requestAnimationFrame;
  global.requestAnimationFrame = (cb) => {
    rafCb = cb;
    return 1;
  };
  try {
    const fx = Sequences.attach(canvas);
    let t = 5000;
    const run = (opts) => {
      fx.attack({ from: { x: 20, y: 20 }, to: { x: 300, y: 240 }, colors: { glow: '#ffd97a' }, power: 8, onImpact() {}, ...opts });
      assert.ok(rafCb, 'loop scheduled');
      for (let f = 0; f < 100 && rafCb; f++) {
        const cb = rafCb;
        rafCb = null;
        cb((t += 16.7));
      }
    };
    for (const id of Signatures.ids) run({ entryId: id, archetype: 'warhorn' });
    run({ entryId: 'athena', super: true }); // edition super wind-up
    run({ archetype: 'blade' }); // archetype fallback still clean
  } finally {
    global.requestAnimationFrame = oldRaf;
  }
});

test('sound: the synth engine is wired and persisted', () => {
  const Sound = require('../game/fx/sound.js');
  for (const name of ['select', 'cardPlay', 'attack', 'impact', 'heroHit', 'heal', 'turn', 'victory', 'defeat', 'pack', 'ink', 'banner']) {
    assert.ok(Sound.RECIPES[name], `missing recipe ${name}`);
  }
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const soundIdx = html.indexOf('/game/fx/sound.js');
  const gameIdx = html.indexOf('/game/game.js');
  const sigIdx = html.indexOf('/game/fx/signatures.js');
  assert.ok(soundIdx !== -1 && soundIdx < gameIdx, 'sound.js loads before game.js');
  assert.ok(sigIdx !== -1 && sigIdx < gameIdx, 'signatures.js loads before game.js');
  assert.ok(html.includes('sound-toggle'), 'sound toggle button missing');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  for (const needle of ["sfx('attack')", "sfx('cardPlay')", "sfx('heroHit')", "sfx(outcome === 'win'", 'soundMuted', 'renderSoundToggle']) {
    assert.ok(js.includes(needle), `game.js missing ${needle}`);
  }
});

test('combat previews: the exchange math renders on targets', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  assert.ok(js.includes('preview-chip'), 'preview chips missing');
  assert.ok(js.includes('armed.speed > m.speed'), 'counter preview ignores speed');
  assert.ok(css.includes('.preview-chip'), 'preview chip styles missing');
});

test('fair-fight mechanics: mulligan UI, rubber band wired, removal capped', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(html.includes('id="mulligan"'), 'mulligan button missing');
  assert.ok(js.includes('Engine.mulligan(battle)'), 'mulligan not wired');
  assert.ok(js.includes('rubberBand: true'), 'rubber band not passed to the Oracle');
  assert.ok(js.includes('REMOVAL_CAP'), 'deck builder removal cap missing');
});

test('opening hands never brick: curve smoothing guarantees a playable card', () => {
  // A deck of 29 top-end holos (cost 6-7) and a single 1-2 cost common:
  // over 20 seeds, every opening hand must still contain a <=2-cost card.
  const cheap = SET.cards.find((c) => c.flagship && c.edition === 'common' && c.cost <= 2);
  const dear = SET.cards.filter((c) => c.flagship && c.edition === 'holo' && c.cost >= 6).slice(0, 29);
  assert.ok(cheap && dear.length === 29, 'test fixtures exist');
  for (let seed = 1; seed <= 20; seed++) {
    const deck = [...dear.map(Engine.toBattleCard), Engine.toBattleCard(cheap)];
    const battle = Engine.createGame({ playerDeck: deck, aiDeck: deck, seed });
    for (const p of [0, 1]) {
      const min = Math.min(...battle.players[p].hand.map((c) => c.cost));
      assert.ok(min <= 2, `seed ${seed} player ${p}: opening hand bricked (min cost ${min})`);
    }
  }
});

test('mulligan: redraws the opening hand once, then the window closes', () => {
  const battle = makeBattle();
  const before = battle.players[0].hand.length;
  const res = Engine.mulligan(battle);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(battle.players[0].hand.length, before, 'same count redrawn');
  const min = Math.min(...battle.players[0].hand.map((c) => c.cost));
  assert.ok(min <= 2, 'mulligan hand is also smoothed');
  Engine.endTurn(battle);
  const late = Engine.mulligan(battle);
  assert.strictEqual(late.ok, false, 'window closed after the first turn');
});

test('rubber band: an Oracle far ahead holds removal but never throws', () => {
  const battle = makeBattle();
  Engine.endTurn(battle); // AI active
  const ai = battle.players[1];
  const me = battle.players[0];
  ai.hero.hp = 30;
  me.hero.hp = 18; // 12 ahead → the band engages
  const removal = SET.cards.find((c) => c.ability && c.ability.effect && /destroy|damage|stun/.test(c.ability.effect.kind || ''));
  ai.hand = [Engine.toBattleCard(removal)];
  ai.ink = 10;
  // A ready AI attacker and a killable player minion, face wide open.
  const c = SET.cards[0];
  const mk = (uid, power, health, speed) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  });
  ai.board.push(mk(901, 4, 6, 5));
  me.board.push(mk(801, 2, 3, 5));
  Engine.runAiTurn(battle, { rubberBand: true });
  assert.strictEqual(ai.board.filter((m) => m.uid !== 901).length, 0, 'removal stayed in hand while far ahead');
  // The band never throws: a clearly favorable trade still happens normally.
  assert.strictEqual(me.board.length, 0, 'favorable trades continue under the band');
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

test('battle UI contract: hero strikes are reachable, failures speak, AI pool is fair', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');

  // The legacy duplicated hero rows are gone; the panels are the single hero UI.
  for (const dead of ['enemy-hero-card', 'player-hero-card', 'player-health', 'enemy-health']) {
    assert.ok(!html.includes(dead), `index.html still carries legacy ${dead}`);
    assert.ok(!js.includes(dead), `game.js still references legacy ${dead}`);
  }

  // Striking the enemy champion is wired: click handler → Engine.attack(..., 'hero').
  assert.ok(js.includes('onEnemyHeroClick'), 'enemy hero click handler missing');
  assert.ok(js.includes("'hero'"), 'hero attack target path missing');
  assert.ok(js.includes('id = side === 1'), 'panel ids missing');
  assert.ok(css.includes('#enemy-hero-panel.targetable'), 'targetable hero styles missing');

  // Attack failures never die silently: readiness gate + engine error toasts.
  assert.ok(js.includes('is recovering'), 'summoning-sickness explanation missing');
  assert.ok(js.includes('has already struck'), 'attacks-used explanation missing');
  assert.ok(js.includes('res.ok === false'), 'engine error toast missing');

  // The AI fields printings a new player could own — no full-art/secret +5/+5.
  assert.ok(
    js.includes("c.edition === 'common' || c.edition === 'holo'"),
    'AI deck pool is not restricted to fair editions'
  );

  // First-battle coaching exists and the enemy turn replays visible strikes.
  assert.ok(js.includes('coachSeen'), 'coach marks missing');
  assert.ok(js.includes('replayStrikes'), 'strike replay missing');
});

test('the kit: useSpecial validates readiness, ink, and targets — then unleashes', () => {
  const battle = makeBattle();
  const c = SET.cards[0];
  const ability = { id: 'ab', entryId: 'x', name: 'Test Bolt', description: 'Deal 3.', trigger: 'on_play', effect: { kind: 'damage', amount: 3, target: 'enemy-minion' } };
  const mk = (uid, power, health, speed, ab) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, specialUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: ab || null, domain: '', rarity: 'common',
  });
  battle.players[0].board.push(mk(801, 4, 6, 5, ability));
  battle.players[1].board.push(mk(901, 2, 8, 3));

  // Ink too poor (turn 1 = 1 ink, special costs 2).
  let res = Engine.useSpecial(battle, 0, 0);
  assert.strictEqual(res.ok, false, 'ink-poor refused');
  battle.players[0].ink = 4;

  // Wrong target side refused.
  res = Engine.useSpecial(battle, 0, { side: 'ally', index: 0 });
  assert.strictEqual(res.ok, false, 'ally target on an enemy special refused');

  // The unleash: 3 damage to the chosen enemy minion.
  res = Engine.useSpecial(battle, 0, 0);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(battle.players[1].board[0].health, 5, 'special damage applied');
  assert.strictEqual(battle.players[0].ink, 2, 'ink spent');
  assert.strictEqual(battle.players[0].board[0].specialUsed, true);

  // Once per turn.
  res = Engine.useSpecial(battle, 0, 0);
  assert.strictEqual(res.ok, false, 'second unleash refused');

  // Sick minions cannot special.
  battle.players[0].board[0].specialUsed = false;
  battle.players[0].board[0].sick = true;
  res = Engine.useSpecial(battle, 0, 0);
  assert.strictEqual(res.ok, false, 'recovering refused');
  battle.players[0].board[0].sick = false;

  // Passives cannot be activated.
  battle.players[0].board[0].ability = { id: 'p', entryId: 'x', name: 'Aura', description: '', trigger: 'passive', effect: { kind: 'aura-allies', power: 1 } };
  res = Engine.useSpecial(battle, 0, 0);
  assert.strictEqual(res.ok, false, 'passive refused');

  // Reset at the owner's next turn.
  battle.players[0].board[0].specialUsed = true;
  battle.players[0].board[0].ability = ability;
  Engine.endTurn(battle);
  Engine.runAiTurn(battle);
  assert.strictEqual(battle.players[0].board[0].specialUsed, false, 'startTurn resets the special');
});

test('the kit: the AI unleashes aggressive specials (but not under mercy)', () => {
  const battle = makeBattle();
  Engine.endTurn(battle); // AI active
  const c = SET.cards[0];
  const ability = { id: 'ab', entryId: 'x', name: 'Smite', description: 'Deal 3.', trigger: 'on_play', effect: { kind: 'damage', amount: 3, target: 'enemy-minion' } };
  const mk = (uid, power, health, speed, ab) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, specialUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: ab || null, domain: '', rarity: 'common',
  });
  battle.players[1].board.push(mk(901, 4, 6, 5, ability));
  battle.players[0].board.push(mk(801, 2, 8, 3));
  battle.players[1].hand = [];
  battle.players[1].ink = 6;
  Engine.runAiTurn(battle);
  assert.strictEqual(battle.players[0].board[0].health, 5, 'AI special dealt its damage');

  const battle2 = makeBattle();
  Engine.endTurn(battle2);
  battle2.players[1].board.push(mk(902, 4, 6, 5, ability));
  battle2.players[0].board.push(mk(802, 2, 8, 3));
  battle2.players[1].hand = [];
  battle2.players[1].ink = 6;
  Engine.runAiTurn(battle2, { holdBack: true });
  assert.strictEqual(battle2.players[0].board[0].health, 8, 'mercy shelters the board from specials');
});

test('the kit UI: action bar, pips, targeting, sound', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  const sound = require('../game/fx/sound.js');
  assert.ok(sound.RECIPES.special, 'special recipe missing');
  assert.ok(html.includes('action-bar'), 'action bar element missing');
  assert.ok(js.includes('renderActionBar'), 'action bar renderer missing');
  assert.ok(js.includes('Engine.useSpecial(battle'), 'useSpecial not wired');
  assert.ok(js.includes('pendingSpecial'), 'special targeting state missing');
  assert.ok(js.includes('special-pip'), 'special-ready pip missing');
  assert.ok(js.includes("sfx('special')"), 'special sound not wired');
  assert.ok(css.includes('.action-bar'), 'action bar styles missing');
  assert.ok(js.includes('canSpecialWith'), 'special legality not surfaced');
});

test('difficulty hooks: band threshold, noSpecials, and AI hero power', () => {
  const c = SET.cards[0];
  const mk = (uid, power, health, speed) => ({
    uid, def: c, name: 'T' + uid, cost: 1, power, maxHealth: health, health, speed,
    shield: 0, sick: false, attacksUsed: false, specialUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  });
  // Band threshold: at 6 the band engages at 8+; at 999 it never does.
  for (const [threshold, expectHeld] of [[6, true], [999, false]]) {
    const battle = makeBattle();
    Engine.endTurn(battle);
    const ai = battle.players[1];
    battle.players[0].hero.hp = 20; // AI leads by 10: band active at 6, not at 999
    ai.hero.hp = 30;
    const removal = SET.cards.find((x) => x.ability && x.ability.effect && /destroy|damage|stun/.test(x.ability.effect.kind || ''));
    ai.hand = [Engine.toBattleCard(removal)];
    ai.ink = 10;
    Engine.runAiTurn(battle, { rubberBand: true, bandThreshold: threshold });
    const played = ai.board.length > 0;
    assert.strictEqual(played, !expectHeld, `threshold ${threshold}: removal ${expectHeld ? 'held' : 'played'}`);
  }
  // noSpecials: the special phase never fires.
  const battle2 = makeBattle();
  Engine.endTurn(battle2);
  const ability = { id: 'ab', entryId: 'x', name: 'Smite', description: 'Deal 3.', trigger: 'on_play', effect: { kind: 'damage', amount: 3, target: 'enemy-minion' } };
  const smiter = mk(901, 4, 6, 5);
  smiter.ability = ability;
  battle2.players[1].board.push(smiter);
  battle2.players[0].board.push(mk(801, 2, 8, 3));
  battle2.players[1].hand = [];
  battle2.players[1].ink = 6;
  Engine.runAiTurn(battle2, { noSpecials: true });
  assert.strictEqual(battle2.players[0].board[0].health, 8, 'noSpecials disables the AI special phase');
  // heroPowerDef: the AI wields its power when the difficulty grants it.
  const battle3 = makeBattle();
  Engine.endTurn(battle3);
  battle3.players[1].ink = 6;
  battle3.players[1].hand = [];
  const hpBefore = battle3.players[0].hero.hp;
  Engine.runAiTurn(battle3, { heroPowerDef: HeroPowers.forPantheon('greek') });
  assert.strictEqual(battle3.players[0].hero.hp, hpBefore - 2, 'AI hero power fired for 2');
});

test('mulligan ×2: two redraws granted, the third refused, the window closes', () => {
  const battle = makeBattle();
  const first = Engine.mulligan(battle);
  assert.strictEqual(first.ok, true);
  assert.strictEqual(first.remaining, 1);
  const second = Engine.mulligan(battle);
  assert.strictEqual(second.ok, true);
  assert.strictEqual(second.remaining, 0);
  const third = Engine.mulligan(battle);
  assert.strictEqual(third.ok, false, 'third mulligan refused');
  battle.halfTurns = 4;
  const battle2 = makeBattle();
  battle2.halfTurns = 4;
  assert.strictEqual(Engine.mulligan(battle2).ok, false, 'window closed after turn two');
});

test('pantheon bond: kin of the champion fight at +1 power', () => {
  const battle = makeBattle();
  const c = SET.cards[0];
  battle.players[0].bondPantheon = 'greek';
  const kin = {
    uid: 801, def: { ...c, pantheon: 'greek' }, name: 'Kin', cost: 1, power: 4, maxHealth: 5, health: 5, speed: 3,
    shield: 0, sick: false, attacksUsed: false, specialUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  };
  const other = { ...kin, uid: 802, name: 'Other', def: { ...c, pantheon: 'norse' } };
  battle.players[0].board.push(kin, other);
  assert.strictEqual(Engine.effectivePower(battle, 0, kin), 5, 'bonded minion gains +1');
  assert.strictEqual(Engine.effectivePower(battle, 0, other), 4, 'unbonded minion unchanged');
});

test('bespoke abilities: the set names hundreds of moves, flagships wear epithets', () => {
  const names = new Set();
  for (const card of SET.cards) if (card.ability) names.add(card.ability.name);
  assert.ok(names.size >= 400, `only ${names.size} distinct ability names`);
  // Flagship abilities come from the lore catalog's epithets (per-entry
  // overrides excepted — they are bespoke by definition).
  const genSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-cards.js'), 'utf8');
  const overrideKeys = new Set([...genSrc.matchAll(/^\s{2}([a-z0-9-]+):/gm)].map((m) => m[1]));
  const LORE = require('../scripts/lore-catalog.json');
  let checked = 0;
  for (const card of SET.cards) {
    if (!card.flagship || card.edition !== 'common' || overrideKeys.has(card.entryId)) continue;
    const lore = LORE[card.entryId];
    if (lore && lore.domains && lore.domains.title) {
      assert.strictEqual(card.ability.name, lore.domains.title, `${card.entryId} should wear its epithet`);
      checked++;
      if (checked >= 40) break;
    }
  }
  assert.ok(checked >= 40, 'epithet coverage check ran on too few flagships');
});

test('archetype sound bank: every strike has its own register and is wired', () => {
  const Sound = require('../game/fx/sound.js');
  const archetypes = ['bolt', 'blade', 'flood', 'flame', 'shadow', 'bloom', 'storm', 'decay', 'radiance', 'song', 'quake', 'gale', 'veil', 'warhorn'];
  for (const a of archetypes) {
    assert.ok(Sound.RECIPES['atk_' + a], `missing atk_${a} recipe`);
  }
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(js.includes("sfx('atk_' + archetype)"), 'archetype sound not wired into withFx');
});

test('card levels: stacked copies forge stats; the Oracle mirrors the average', () => {
  // Engine: level bonus applies at battle scale.
  const battle = makeBattle();
  const c = SET.cards[0];
  const leveled = Engine.toBattleCard(c);
  leveled.level = 3;
  battle.players[0].hand = [leveled];
  battle.players[0].ink = 10;
  const base = Engine.toBattleCard(c);
  Engine.playCard(battle, 0);
  const m = battle.players[0].board[0];
  assert.strictEqual(m.power, base.power + 2, 'Level III grants +2 power');
  assert.strictEqual(m.maxHealth, base.health + 2, 'Level III grants +2 health');
  assert.strictEqual(m.health, base.health + 2);
  // Game-side contracts: thresholds, mirroring, display.
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  assert.ok(js.includes("copies >= 4 ? 3 : copies >= 2 ? 2 : 1"), 'level thresholds missing');
  assert.ok(js.includes('applyLevels(playerDeck, cardLevel)'), 'player levels not applied');
  assert.ok(js.includes('playerAvgLevel'), 'AI level mirror missing');
  assert.ok(js.includes('card-level'), 'level pips missing');
  assert.ok(css.includes('.card-level.lvl-3'), 'level styles missing');
});

test('strategic auto-build uses the curated builder on the player collection', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(js.includes('buildCuratedDeck(home, STARTER_CURVE, rand, owned)'), 'auto-build is not curated');
  assert.ok(js.includes('poolOverride'), 'builder is not parameterizable');
});

test('arena mascots load from the CORS-open PNG masters (the invisible-mascot fix)', () => {
  const arena = fs.readFileSync(path.join(ROOT, 'game/fx/arena3d.js'), 'utf8');
  assert.ok(arena.includes('punycodex-masters.vercel.app'), 'masters host missing');
  assert.ok(arena.includes('_mascot.png'), 'PNG mascot pattern missing');
  assert.ok(!arena.includes('loadTexture(gl, c.art.mascot)'), 'webp path still in use');
  assert.ok(arena.includes('UNPACK_FLIP_Y_WEBGL'), 'flip handling missing');
  assert.ok(arena.includes("crossOrigin = 'anonymous'"), 'CORS mode missing');
});

test('pantheon ascendant: three kin lift each other; two do not', () => {
  const battle = makeBattle();
  const c = SET.cards[0];
  const mk = (uid, pantheon) => ({
    uid, def: { ...c, pantheon }, name: 'T' + uid, cost: 1, power: 3, maxHealth: 4, health: 4, speed: 3,
    shield: 0, sick: false, attacksUsed: false, specialUsed: false, stunned: 0, confused: 0, tempPowerDown: 0,
    ability: null, domain: '', rarity: 'common',
  });
  battle.players[0].board.push(mk(801, 'norse'), mk(802, 'norse'));
  assert.strictEqual(Engine.effectivePower(battle, 0, battle.players[0].board[0]), 3, 'two kin: no ascendance');
  battle.players[0].board.push(mk(803, 'norse'));
  assert.strictEqual(Engine.effectivePower(battle, 0, battle.players[0].board[0]), 4, 'three kin: ascendant +1');
  assert.strictEqual(Engine.isAscendant(battle, 0, battle.players[0].board[0]), true);
  // And it stacks with the champion's bond.
  battle.players[0].bondPantheon = 'norse';
  assert.strictEqual(Engine.effectivePower(battle, 0, battle.players[0].board[0]), 5, 'bond + ascendant stack');
});

test('the P-series contracts: tutorial, drag, chips, deck-lab, oracle path, sound pass', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  const sound = require('../game/fx/sound.js');
  // Tutorial.
  assert.ok(html.includes('tutorial-bubble'), 'tutorial bubble missing');
  assert.ok(js.includes('startTutorial'), 'tutorial start missing');
  assert.ok(js.includes('completeTutorial'), 'tutorial completion missing');
  assert.ok(js.includes('tutorialDone'), 'tutorial persistence missing');
  assert.ok(css.includes('.tutorial-hl'), 'tutorial highlight styles missing');
  // Drag-to-attack.
  assert.ok(js.includes('initDragAttack'), 'drag attack init missing');
  assert.ok(js.includes('lastDragEnd'), 'drag/click dedup missing');
  assert.ok(css.includes('.drag-arrow'), 'drag arrow styles missing');
  // Projected chips.
  assert.ok(html.includes('arena-chips'), 'chip layer missing');
  assert.ok(js.includes('syncArenaChips'), 'chip sync missing');
  assert.ok(js.includes('arenaChipsLoop'), 'chip loop missing');
  assert.ok(css.includes('.arena-chip'), 'chip styles missing');
  // Deck lab.
  assert.ok(js.includes('ARCHETYPES_DECK'), 'archetype table missing');
  assert.ok(js.includes('deckLabCounsel'), 'deck counsel missing');
  assert.ok(js.includes('renderDeckLab'), 'deck lab render missing');
  assert.ok(css.includes('.deck-lab'), 'deck lab styles missing');
  // Oracle Path.
  assert.ok(html.includes('oracle-path'), 'oracle path section missing');
  assert.ok(js.includes('renderOraclePath'), 'oracle path render missing');
  assert.ok(js.includes('oraclePath.cleared'), 'gate clearing missing');
  assert.ok(js.includes('tribute'), 'tribute rewards missing');
  assert.ok(css.includes('.oracle-gate'), 'gate styles missing');
  // Sound pass.
  for (const name of ['imp_bolt', 'imp_flood', 'imp_blade', 'tick', 'page', 'sting']) {
    assert.ok(sound.RECIPES[name], `missing ${name} recipe`);
  }
  assert.ok(js.includes("sfx('imp_' + archetype)"), 'impact variants not wired');
  assert.ok(js.includes("sfx('page')"), 'section foley not wired');
  assert.ok(js.includes('navigator.vibrate'), 'haptics missing');
  // Ascendant.
  assert.ok(js.includes('isAscendant'), 'ascendant not surfaced');
  assert.ok(css.includes('.minion.ascendant'), 'ascendant styles missing');
});

test('loot-box compliance: published odds and a deterministic exchange path', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  assert.ok(html.includes('Published Odds'), 'odds block missing');
  for (const pct of ['68%', '22%', '7%', '2.4%', '0.55%', '0.05%', '70%', '1%']) {
    assert.ok(html.includes(pct), `odds ${pct} missing`);
  }
  assert.ok(html.includes('Archive Exchange'), 'exchange section missing');
  assert.ok(html.includes('exchange-search'), 'exchange search missing');
  assert.ok(js.includes('EXCHANGE_PRICES'), 'exchange prices missing');
  assert.ok(js.includes('EXCHANGE_CAP = 4'), 'exchange forge cap missing');
  assert.ok(js.includes('renderExchange'), 'exchange renderer missing');
  assert.ok(css.includes('.exchange-row'), 'exchange styles missing');
});

test('the vocabulary is ours: Invocation, Katabasis, Epithet, Syzygy, Ink Tide', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const engine = fs.readFileSync(path.join(ROOT, 'game/engine.js'), 'utf8');
  const powers = fs.readFileSync(path.join(ROOT, 'game/fx/hero-powers.js'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(html.includes('Invocations fire when played'), 'invocation vocabulary missing');
  assert.ok(html.includes('katabases when destroyed'), 'katabasis vocabulary missing');
  assert.ok(html.includes('epithets while on board'), 'epithet vocabulary missing');
  assert.ok(!html.includes('Battlecries'), 'battlecry survived in the lobby');
  assert.ok(engine.includes('Syzygy not aligned'), 'syzygy log missing');
  assert.ok(powers.includes('ink-tide'), 'ink tide rename missing');
  assert.ok(js.includes('wisdom-syzygy'), 'wisdom syzygy archetype missing');
  assert.ok(!html.includes('deathrattles'), 'deathrattle survived in the lobby');
});

test('phantom duels: encode/decode roundtrip, community ghosts, entry points', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  // Entry points.
  assert.ok(html.includes('lobby-phantom-btn'), 'lobby phantom button missing');
  assert.ok(html.includes('phantom-gate'), 'deck phantom button missing');
  assert.ok(js.includes('openPhantomGate'), 'phantom gate missing');
  // Codec.
  assert.ok(js.includes("PHANTOM_PREFIX = 'PX1.'"), 'phantom prefix missing');
  assert.ok(js.includes('encodePhantom'), 'phantom encoder missing');
  assert.ok(js.includes('decodePhantom'), 'phantom decoder missing');
  assert.ok(js.includes('startPhantomBattle'), 'phantom battle start missing');
  assert.ok(js.includes('COMMUNITY_GHOSTS'), 'community ghosts missing');
  assert.ok(css.includes('.phantom-row'), 'phantom styles missing');
  // The phantom fights at its owner's level, and the deck must be full + resolvable.
  assert.ok(js.includes('DIFFICULTY[phantom.level]'), 'phantom level not honored');
  assert.ok(js.includes('battle.phantomName'), 'phantom name not recorded');
  // History + daily tribute + champion strike.
  assert.ok(js.includes('recordHistory'), 'match history missing');
  assert.ok(js.includes('recent-duels') || html.includes('recent-duels'), 'recent duels UI missing');
  assert.ok(js.includes('lastDaily'), 'daily tribute missing');
  assert.ok(js.includes("'throne-0'"), 'champion strike not wired');
  const arena = fs.readFileSync(path.join(ROOT, 'game/fx/arena3d.js'), 'utf8');
  assert.ok(arena.includes("opts.fromUid === 'throne-0'"), 'arena throne choreo missing');
});

test('the Arena 3D: renderer, integration, presentation toggle, fallback', () => {
  const arena = fs.readFileSync(path.join(ROOT, 'game/fx/arena3d.js'), 'utf8');
  for (const needle of ['setChampions', 'syncBoard', 'attackChoreo', 'project', 'heroHit', 'FLOOR_FS', 'BILL_FS']) {
    assert.ok(arena.includes(needle), `arena3d.js missing ${needle}`);
  }
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const arenaIdx = html.indexOf('/game/fx/arena3d.js');
  const gameIdx = html.indexOf('/game/game.js');
  assert.ok(arenaIdx !== -1 && arenaIdx < gameIdx, 'arena3d.js must load before game.js');
  assert.ok(html.includes('arena-3d'), 'arena canvas missing');
  assert.ok(html.includes('presentation-toggle'), 'presentation toggle missing');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  for (const needle of ['mountArena', 'unmountArena', 'arena3d.syncBoard', 'arena3d.attackChoreo', 'arena3d.heroHit', 'save.presentation', 'cloneNode(false)']) {
    assert.ok(js.includes(needle), `game.js missing ${needle}`);
  }
  // Remount after a lost GL context starts from a fresh canvas (the toggle
  // round-trip that broke before).
  assert.ok(js.includes('Arena3D.mount(fresh)'), 'fresh-canvas remount missing');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  assert.ok(css.includes('#battlefield-wrap.cinematic'), 'cinematic styles missing');
  assert.ok(css.includes('prefers-reduced-motion'), 'reduced-motion fallback missing');
});

test('enterprise UI contracts: difficulty badge, deckhand, bond frame', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  // Difficulty manager + badge.
  assert.ok(js.includes('DIFFICULTY'), 'difficulty table missing');
  assert.ok(js.includes('recordBattleOutcome'), 'outcome tracker missing');
  assert.ok(js.includes('aiTurnOpts'), 'difficulty opts not unified');
  assert.ok(js.includes('oracle-tier'), 'difficulty badge missing');
  assert.ok(js.includes('heroPowerDef'), 'AI hero power path missing');
  // Deckhand.
  assert.ok(html.includes('deck-pantheon'), 'pantheon filter missing');
  assert.ok(html.includes('deck-analysis'), 'analysis panel missing');
  assert.ok(js.includes('pool-mini'), 'pool mini-cards missing');
  assert.ok(js.includes('curve-hist'), 'curve histogram missing');
  assert.ok(css.includes('.curve-bar'), 'histogram styles missing');
  // Bond.
  assert.ok(js.includes('bonded'), 'bond frame missing');
  assert.ok(css.includes('.minion.bonded'), 'bond styles missing');
  assert.ok(js.includes('Pantheon Bond'), 'grimoire bond row missing');
});

test('regression: the battle deck is never double-scaled', () => {
  // The 1-health bug: startBattle re-ran toBattleCard on already-scaled
  // display cards, flooring every player minion to 1/1. Guard the assembly.
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(!js.includes('toBattleCard(byId'), 'startBattle double-scales the player deck again');
  assert.ok(js.includes('return byId[id];'), 'deck assembly must use the already-scaled display cards');
  // And at the data layer: a tier-1 common must hold real battle stats after
  // exactly one transform.
  const t1 = SET.cards.find((c) => c.flagship && c.edition === 'common' && c.tier === '1');
  const once = Engine.toBattleCard(t1);
  assert.ok(once.power >= 4 && once.health >= 4, 'single transform keeps battle stats');
  const twice = Engine.toBattleCard(once);
  assert.ok(twice.power < once.power, 'double transform provably destroys stats — guard above must hold');
});

test('autopilot: toggle, loop, and spectate wiring exist', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(html.includes('autopilot-toggle'), 'autopilot button missing');
  assert.ok(js.includes('setAutopilot'), 'autopilot toggle handler missing');
  assert.ok(js.includes('autopilotLoop'), 'autopilot loop missing');
  assert.ok(js.includes("banner.textContent = 'Autopilot'"), 'autopilot banner missing');
  assert.ok(js.includes('ui.autopilot) autopilotLoop()'), 'loop does not resume across battles');
});

test('battle UI contract: minion attacks resolve, moves are visible, help exists', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');

  // The ReferenceError that killed every minion attack: target positions come
  // from uid lookups, never a free `node` variable inside the click handler.
  assert.ok(js.includes('minionNode('), 'uid-based minion node lookup missing');
  const clickBody = js.slice(js.indexOf('function onMinionClick'));
  const clickFn = clickBody.slice(0, clickBody.indexOf('\n  function '));
  assert.ok(!clickFn.includes('centerOf(node)'), 'free `node` reference is back in onMinionClick — minion attacks will throw');

  // The moves are printed: hand cards carry full ability text, board minions
  // carry the ability name, enemy minions open their record on tap.
  assert.ok(js.includes('hand-ability'), 'hand ability text missing');
  assert.ok(js.includes('minion-ability'), 'board ability line missing');
  assert.ok(js.includes('openCardModal(m.def || m)'), 'enemy minion inspection missing');
  assert.ok(css.includes('.hand-ability'), 'hand ability styles missing');

  // The Grimoire explains every keyword, and the arena takes the champion's aura.
  assert.ok(js.includes('openBattleHelp'), 'grimoire modal missing');
  assert.ok(html.includes('battle-help'), 'help button missing');
  assert.ok(js.includes('--arena-glow'), 'arena champion tint missing');
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
