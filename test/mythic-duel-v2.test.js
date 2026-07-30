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
  assert.ok(js.includes('replayAiStrikes'), 'AI strike replay missing');
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
