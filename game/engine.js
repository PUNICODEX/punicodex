/* ═══════════════════════════════════════════════════════════════════════════
   PuniCodex Mythic Duel — Battle Engine (pure logic, no DOM / fetch / storage)

   UMD module: exposes `CardEngine` in the browser and module.exports in Node.

   ── Battle rules (Hearthstone-lite) ────────────────────────────────────────
   • Two heroes, 30 HP each. First to reduce the other to 0 HP wins.
     Lethal damage clamps hero HP at 0 (never negative); if both heroes would
     die on the same resolution the game is a draw.
   • Decks are 30 cards (deck building enforces max 2 copies of any card id).
   • Ink: each player has maxInk starting at 0. At the start of a player's turn
     maxInk rises by 1 (hard cap 10) and ink refills to maxInk plus any ink-gen
     bonus from friendly minions (ink-gen may push ink above the 10 cap).
   • Draw: each player draws 1 card at the start of their turn. The first
     player opens with 3 cards, the second with 4 (tempo compensation).
     Hand limit 10 — excess draws are burned. An empty deck simply draws
     nothing (no fatigue damage); stalling is settled by the turn cap.
   • Minions: power = attack, health = defense. Summoning sickness: a minion
     cannot attack the turn it is played (ready at the start of owner's next
     turn). One attack per minion per turn. Board limit 7.
   • Speed: combat tie-break. When a minion attacks another minion, if the
     attacker's speed is strictly greater than the defender's, the defender's
     counter-attack damage is halved (rounded down) — the attacker "outmaneuvers"
     it. Slow effects halve a minion's speed (rounded up) and are permanent.
   • Combat: attacker and defender deal damage simultaneously (counter-attack).
     Shields absorb damage before health. damage-reduction lowers all incoming
     damage (after halving), floored at 0.
   • Abilities: full effect-DSL implementation (all 25 kinds present in
     game/cards.json). Triggers: on_play (battlecry), on_death (deathrattle),
     passive (continuous while on board). `combo` effects fire only if another
     card was already played this turn. `random-choice` picks via the seeded
     RNG. Targeted on_play effects fizzle harmlessly if no legal target exists.
   • Turn cap: 100 half-turns (50 full rounds); on expiry the game is a draw.

   ── Stat normalization ─────────────────────────────────────────────────────
   cards.json stores scholarly stats on a 40–100 scale. `toBattleCard` maps a
   raw set card onto the battle scale (÷12, rounded, min 1) so a dual-tier
   flagship plays as roughly an 8/8 and a common as a 3–5 stat line, while
   effect amounts in the DSL are already tuned on the small scale and are used
   verbatim. The engine itself never re-scales: it plays whatever stats the
   card objects carry (tests can construct arbitrary cards).

   ── Determinism ────────────────────────────────────────────────────────────
   All randomness flows through a mulberry32 PRNG whose integer state lives in
   `state.rngState`; the whole game state is plain JSON-serializable data.
   Same seed + same action sequence ⇒ identical serialized state.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CardEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RULES = {
    HERO_HP: 30,
    HERO_POWER_COST: 2,
    SPECIAL_COST: 2,
    DECK_SIZE: 30,
    MAX_INK: 10,
    HAND_LIMIT: 10,
    BOARD_LIMIT: 7,
    START_HAND_FIRST: 3,
    START_HAND_SECOND: 4,
    TURN_CAP: 100,
    MAX_COPIES: 2,
    STAT_SCALE: 12,
    LOG_LIMIT: 250,
  };

  /* ── RNG ─────────────────────────────────────────────────────────────── */

  // Standalone stream for out-of-game use (deck building, pack openings).
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // In-game randomness: identical sequence to a persistent mulberry32 stream,
  // but the stream position is stored inside the (serializable) game state.
  function rngNext(state) {
    state.rngState = (state.rngState + 0x6d2b79f5) | 0;
    var t = state.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rngInt(state, n) {
    return Math.floor(rngNext(state) * n);
  }

  function shuffleInPlace(arr, randFn) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(randFn() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /* ── Small helpers ───────────────────────────────────────────────────── */

  function clampInt(v, lo, hi) {
    v = Math.round(Number(v) || 0);
    return v < lo ? lo : v > hi ? hi : v;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function log(state, playerIdx, type, text) {
    state.log.push({ turn: state.halfTurns + 1, player: playerIdx, type: type, text: String(text) });
    if (state.log.length > RULES.LOG_LIMIT) state.log.splice(0, state.log.length - RULES.LOG_LIMIT);
  }

  /* ── Card normalization (cards.json → battle scale) ──────────────────── */

  function scaleStat(v) {
    return Math.max(1, Math.round((Number(v) || 1) / RULES.STAT_SCALE));
  }

  function toBattleCard(card) {
    return {
      id: card.id,
      entryId: card.entryId,
      variant: card.variant,
      setId: card.setId,
      name: card.name,
      ascii: card.ascii,
      original: card.original,
      pantheon: card.pantheon,
      category: card.category,
      categoryLabel: card.categoryLabel,
      categoryIcon: card.categoryIcon,
      tier: card.tier,
      tierLabel: card.tierLabel,
      domain: card.domain,
      rarity: card.rarity,
      rarityOrder: card.rarityOrder,
      flavor: card.flavor,
      flagship: !!card.flagship,
      ownedDomain: card.ownedDomain || null,
      art: card.art || null,
      cost: clampInt(card.cost, 1, 10),
      power: scaleStat(card.power),
      health: scaleStat(card.health),
      speed: clampInt(card.speed, 1, 10),
      ability: card.ability
        ? {
            id: card.ability.id,
            entryId: card.ability.entryId,
            name: card.ability.name,
            description: card.ability.description,
            trigger: card.ability.trigger,
            effect: clone(card.ability.effect),
          }
        : null,
    };
  }

  /* ── Deck construction ───────────────────────────────────────────────── */

  // Auto-build a deck from a pool of card defs (each pool entry = one physical
  // card; duplicates allowed up to RULES.MAX_COPIES per card id). A soft cap of
  // 8 high-cost (7+) cards keeps the ink curve playable. Deterministic per seed.
  function autoBuildDeck(pool, seed, size) {
    var target = size || RULES.DECK_SIZE;
    var rand = mulberry32(seed >>> 0);
    var shuffled = shuffleInPlace(pool.slice(), rand);
    var counts = {};
    var deck = [];
    var highCost = 0;
    for (var i = 0; i < shuffled.length && deck.length < target; i++) {
      var card = shuffled[i];
      var n = counts[card.id] || 0;
      if (n >= RULES.MAX_COPIES) continue;
      if (card.cost >= 7 && highCost >= 8) continue;
      counts[card.id] = n + 1;
      if (card.cost >= 7) highCost++;
      deck.push(card);
    }
    // Second pass without the curve cap in case the pool was too top-heavy.
    for (var j = 0; j < shuffled.length && deck.length < target; j++) {
      var c = shuffled[j];
      var m = counts[c.id] || 0;
      if (m >= RULES.MAX_COPIES) continue;
      counts[c.id] = m + 1;
      deck.push(c);
    }
    return deck;
  }

  /* ── Game setup ──────────────────────────────────────────────────────── */

  function makePlayer(deck) {
    return {
      hero: { hp: RULES.HERO_HP, maxHp: RULES.HERO_HP },
      deck: deck,
      hand: [],
      board: [],
      maxInk: 0,
      ink: 0,
      playedCount: 0,
    };
  }

  // createGame({ playerDeck, aiDeck, seed }) — decks are arrays of battle card
  // defs (see toBattleCard). The engine clones them so callers may reuse pools.
  function createGame(opts) {
    opts = opts || {};
    var seed = (opts.seed == null ? 1 : opts.seed) >>> 0;
    var playerDeck = clone(opts.playerDeck || []);
    var aiDeck = clone(opts.aiDeck || []);

    var state = {
      rngState: seed,
      halfTurns: 0,
      activePlayer: 0,
      winner: null,
      uidCounter: 1,
      players: [makePlayer(playerDeck), makePlayer(aiDeck)],
      log: [],
    };

    var rand = function () {
      return rngNext(state);
    };
    shuffleInPlace(state.players[0].deck, rand);
    shuffleInPlace(state.players[1].deck, rand);

    drawCards(state, 0, RULES.START_HAND_FIRST);
    drawCards(state, 1, RULES.START_HAND_SECOND);

    // Nobody bricks turn one: if an opening hand's cheapest card costs more
    // than 2, trade the dearest card for the cheapest left in the deck.
    smoothOpening(state, 0);
    smoothOpening(state, 1);

    log(state, -1, 'start', 'The duel begins. Player 1 takes the first turn.');
    startTurn(state, 0);
    return state;
  }

  // smoothOpening(state, playerIdx) — see createGame. Deterministic via the
  // deck's shuffled order; used again after a mulligan redraw.
  function smoothOpening(state, playerIdx) {
    var pl = state.players[playerIdx];
    if (pl.hand.length === 0 || pl.deck.length === 0) return;
    var minCost = null;
    var dearIdx = 0;
    for (var h = 0; h < pl.hand.length; h++) {
      if (minCost === null || pl.hand[h].cost < minCost) minCost = pl.hand[h].cost;
      if (pl.hand[h].cost > pl.hand[dearIdx].cost) dearIdx = h;
    }
    if (minCost <= 2) return;
    var cheapIdx = -1;
    for (var d = 0; d < pl.deck.length; d++) {
      if (cheapIdx === -1 || pl.deck[d].cost < pl.deck[cheapIdx].cost) cheapIdx = d;
    }
    if (cheapIdx === -1 || pl.deck[cheapIdx].cost >= pl.hand[dearIdx].cost) return;
    var tmp = pl.hand[dearIdx];
    pl.hand[dearIdx] = pl.deck[cheapIdx];
    pl.deck[cheapIdx] = tmp;
    log(state, -1, 'start', 'The archive smooths an opening hand.');
  }

  // mulligan(state) — up to two opening redraws, usable across your first
  // two turns. Set the hand back, shuffle, draw the same number (smoothed).
  function mulligan(state) {
    if (state.halfTurns > 2 || state.activePlayer !== 0 || isOver(state)) {
      return { ok: false, error: 'The mulligan window has closed.' };
    }
    var player = state.players[0];
    player.mulligansUsed = player.mulligansUsed || 0;
    if (player.mulligansUsed >= 2) {
      return { ok: false, error: 'No mulligans remain — the archive has answered twice already.' };
    }
    var n = player.hand.length;
    for (var i = 0; i < n; i++) player.deck.push(player.hand[i]);
    player.hand = [];
    shuffleInPlace(player.deck, function () {
      return rngNext(state);
    });
    drawCards(state, 0, n);
    smoothOpening(state, 0);
    player.mulligansUsed++;
    log(state, 0, 'mulligan', 'You set your hand back into the archive and draw anew.');
    return { ok: true, remaining: 2 - player.mulligansUsed };
  }

  /* ── Core queries ────────────────────────────────────────────────────── */

  function isOver(state) {
    return state.winner !== null;
  }

  // Continuous aura-allies bonus granted to a minion by OTHER friendly minions.
  function auraBonus(state, playerIdx, minion) {
    var board = state.players[playerIdx].board;
    var bonus = 0;
    for (var i = 0; i < board.length; i++) {
      var m = board[i];
      if (m.uid === minion.uid) continue;
      if (m.ability && m.ability.trigger === 'passive' && m.ability.effect.kind === 'aura-allies') {
        bonus += Number(m.ability.effect.power) || 0;
      }
    }
    return bonus;
  }

  function effectivePower(state, playerIdx, minion) {
    var p = minion.power - (minion.tempPowerDown || 0) + auraBonus(state, playerIdx, minion);
    // Pantheon bond: the champion's kin fight harder beside it.
    if (state.players[playerIdx].bondPantheon && minion.def && minion.def.pantheon === state.players[playerIdx].bondPantheon) {
      p += 1;
    }
    return Math.max(0, p);
  }

  function passiveAmount(minion, kind, field) {
    if (minion.ability && minion.ability.trigger === 'passive' && minion.ability.effect.kind === kind) {
      return Number(minion.ability.effect[field || 'amount']) || 0;
    }
    return 0;
  }

  function findMinion(state, uid) {
    for (var p = 0; p < 2; p++) {
      var board = state.players[p].board;
      for (var i = 0; i < board.length; i++) {
        if (board[i].uid === uid) return { player: p, index: i, minion: board[i] };
      }
    }
    return null;
  }

  /* ── Draw / turn structure ───────────────────────────────────────────── */

  // Deck top = index 0. Burned when the hand is full. Empty deck: no fatigue.
  function drawCards(state, playerIdx, count) {
    var player = state.players[playerIdx];
    for (var i = 0; i < count; i++) {
      if (player.deck.length === 0) return;
      var card = player.deck.shift();
      if (player.hand.length >= RULES.HAND_LIMIT) {
        log(state, playerIdx, 'burn', card.name + ' is burned — hand is full.');
        continue;
      }
      player.hand.push(card);
    }
  }

  function startTurn(state, playerIdx) {
    var player = state.players[playerIdx];
    player.maxInk = Math.min(RULES.MAX_INK, player.maxInk + 1);

    var gen = 0;
    for (var i = 0; i < player.board.length; i++) {
      gen += passiveAmount(player.board[i], 'ink-gen');
    }
    player.ink = player.maxInk + gen; // ink-gen may exceed the hard cap

    player.playedCount = 0;
    player.heroPowerUsed = false;
    for (var j = 0; j < player.board.length; j++) {
      player.board[j].sick = false;
      player.board[j].attacksUsed = false;
      player.board[j].specialUsed = false;
    }

    // Start-of-turn passives.
    for (var k = 0; k < player.board.length; k++) {
      var heal = passiveAmount(player.board[k], 'heal-hero-turn');
      if (heal > 0) healHero(state, playerIdx, heal, player.board[k].name);
    }

    drawCards(state, playerIdx, 1);
    log(state, playerIdx, 'turn', 'Player ' + (playerIdx + 1) + ' begins their turn (ink ' + player.ink + '/' + player.maxInk + ').');
  }

  function healHero(state, playerIdx, amount, sourceName) {
    var hero = state.players[playerIdx].hero;
    var before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(0, Math.round(amount)));
    if (hero.hp > before && sourceName) {
      log(state, playerIdx, 'heal', sourceName + ' restores ' + (hero.hp - before) + ' HP to Player ' + (playerIdx + 1) + '.');
    }
  }

  function damageHero(state, playerIdx, amount) {
    var hero = state.players[playerIdx].hero;
    hero.hp = Math.max(0, hero.hp - Math.max(0, Math.round(amount)));
  }

  function endTurn(state) {
    if (isOver(state)) return state;
    var playerIdx = state.activePlayer;

    // "Until end of turn" debuffs wear off (both boards — they only ever apply
    // during the current turn).
    for (var p = 0; p < 2; p++) {
      for (var i = 0; i < state.players[p].board.length; i++) {
        state.players[p].board[i].tempPowerDown = 0;
      }
    }
    // Stun/confuse tick down at the end of the CONTROLLER's turn: a minion
    // disabled during the opponent's turn misses exactly one of its own turns.
    var board = state.players[playerIdx].board;
    for (var j = 0; j < board.length; j++) {
      if (board[j].stunned > 0) board[j].stunned -= 1;
      if (board[j].confused > 0) board[j].confused -= 1;
    }

    state.halfTurns += 1;
    if (state.halfTurns >= RULES.TURN_CAP) {
      state.winner = 'draw';
      log(state, -1, 'end', 'The turn cap is reached — the duel is a draw.');
      return state;
    }

    state.activePlayer = 1 - playerIdx;
    startTurn(state, state.activePlayer);
    return state;
  }

  /* ── Damage & death ──────────────────────────────────────────────────── */

  // Shields absorb first; damage-reduction (passive) then lowers the remainder,
  // floored at 0. Minion health clamps at 0; deaths are swept by checkDeaths.
  function applyDamage(state, minion, amount) {
    var dmg = Math.max(0, Math.round(amount));
    var reduction = passiveAmount(minion, 'damage-reduction');
    dmg = Math.max(0, dmg - reduction);
    if (minion.shield > 0 && dmg > 0) {
      var absorbed = Math.min(minion.shield, dmg);
      minion.shield -= absorbed;
      dmg -= absorbed;
    }
    minion.health = Math.max(0, minion.health - dmg);
    return dmg;
  }

  function destroyMinion(state, uid) {
    var found = findMinion(state, uid);
    if (found) found.minion.health = 0;
  }

  function checkDeaths(state) {
    for (var p = 0; p < 2; p++) {
      var player = state.players[p];
      var dead = [];
      var alive = [];
      for (var i = 0; i < player.board.length; i++) {
        if (player.board[i].health <= 0) dead.push(player.board[i]);
        else alive.push(player.board[i]);
      }
      if (dead.length === 0) continue;
      player.board = alive;
      for (var d = 0; d < dead.length; d++) {
        var m = dead[d];
        log(state, p, 'death', m.name + ' is destroyed.');
        if (m.ability && m.ability.trigger === 'on_death') {
          resolveEffect(state, p, m.ability.effect, {
            sourceUid: m.uid,
            fromDeath: true,
            deadMinion: m,
          });
        }
      }
    }
    checkWin(state);
  }

  function checkWin(state) {
    if (isOver(state)) return;
    var p0dead = state.players[0].hero.hp <= 0;
    var p1dead = state.players[1].hero.hp <= 0;
    if (p0dead && p1dead) {
      state.winner = 'draw';
      log(state, -1, 'end', 'Both heroes fall — the duel is a draw.');
    } else if (p1dead) {
      state.winner = 0;
      log(state, 0, 'end', 'Player 1 wins the duel.');
    } else if (p0dead) {
      state.winner = 1;
      log(state, 1, 'end', 'Player 2 wins the duel.');
    }
  }

  /* ── Effect DSL ──────────────────────────────────────────────────────── */

  // Targeted on_play kinds and which side they aim at.
  var TARGET_SIDE = {
    damage: 'enemy',
    'debuff-enemy': 'enemy',
    stun: 'enemy',
    confuse: 'enemy',
    'slow-enemy': 'enemy',
    'shield-ally': 'ally',
  };

  function effectTargetSide(effect) {
    if (!effect || effect.target == null) return null;
    return TARGET_SIDE[effect.kind] || null;
  }

  // target may be: undefined (auto-pick), a number (enemy board index), or
  // { side: 'enemy'|'ally', index }. Returns a live minion ref or null.
  function pickTarget(state, playerIdx, effect, target, sourceUid) {
    var side = effectTargetSide(effect);
    if (!side) return null;
    var enemyIdx = side === 'enemy' ? 1 - playerIdx : playerIdx;
    var board = state.players[enemyIdx].board;

    var index = null;
    if (typeof target === 'number') index = side === 'enemy' ? target : null;
    else if (target && typeof target === 'object') {
      if ((target.side === 'enemy') === (side === 'enemy')) index = target.index;
    }
    if (index != null && board[index]) return board[index];

    // Auto-pick: hit the strongest minion on the required side (offense), or
    // the strongest friendly minion (shield-ally). Deterministic tie-breaks.
    var best = null;
    for (var i = 0; i < board.length; i++) {
      var m = board[i];
      if (m.uid === sourceUid && side === 'ally' && board.length > 1) continue;
      if (!best) {
        best = m;
        continue;
      }
      var mp = effectivePower(state, enemyIdx, m);
      var bp = effectivePower(state, enemyIdx, best);
      if (mp > bp || (mp === bp && m.health > best.health)) best = m;
    }
    return best;
  }

  function domainMatches(domainStr, domains) {
    if (!domainStr || !domains) return false;
    var d = String(domainStr).toLowerCase();
    for (var i = 0; i < domains.length; i++) {
      if (d.indexOf(String(domains[i]).toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function resolveEffect(state, playerIdx, effect, ctx) {
    if (!effect || isOver(state)) return;
    ctx = ctx || {};
    var player = state.players[playerIdx];
    var enemyIdx = 1 - playerIdx;
    var enemy = state.players[enemyIdx];
    var i, m, t;

    switch (effect.kind) {
      case 'damage': {
        var dmgAmount = Number(effect.amount) || 0;
        // Hero power targets (Pantheon Protocol): the whole enemy board, or
        // the enemy hero directly. Domain doubling applies to minion targets.
        if (effect.target === 'enemy-hero') {
          if (domainMatches('', effect.bonusVsDomains)) dmgAmount *= 0;
          damageHero(state, enemyIdx, dmgAmount);
          log(state, playerIdx, 'effect', 'The enemy hero takes ' + dmgAmount + ' damage.');
          checkWin(state);
          break;
        }
        if (effect.target === 'enemy-board') {
          var foes = state.players[enemyIdx].board.slice();
          if (!foes.length) {
            log(state, playerIdx, 'fizzle', 'No enemy minions to strike.');
            break;
          }
          for (var fi = 0; fi < foes.length; fi++) {
            var fdealt = applyDamage(state, foes[fi], dmgAmount);
            log(state, playerIdx, 'effect', foes[fi].name + ' takes ' + fdealt + ' damage.');
          }
          checkDeaths(state);
          break;
        }
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to strike.');
          break;
        }
        if (domainMatches(t.domain, effect.bonusVsDomains)) dmgAmount *= 2;
        var dealt = applyDamage(state, t, dmgAmount);
        log(state, playerIdx, 'effect', t.name + ' takes ' + dealt + ' damage.');
        checkDeaths(state);
        break;
      }

      case 'draw': {
        drawCards(state, playerIdx, Number(effect.count) || 1);
        log(state, playerIdx, 'effect', 'Player ' + (playerIdx + 1) + ' draws ' + (Number(effect.count) || 1) + ' card(s).');
        break;
      }

      case 'heal-hero': {
        healHero(state, playerIdx, Number(effect.amount) || 0, 'The ability');
        break;
      }

      case 'drain-hero': {
        var drain = Math.max(0, Number(effect.amount) || 0);
        damageHero(state, enemyIdx, drain);
        healHero(state, playerIdx, drain, null);
        log(state, playerIdx, 'effect', 'Player ' + (playerIdx + 1) + ' drains ' + drain + ' HP from the enemy hero.');
        checkWin(state);
        break;
      }

      case 'heal-allies': {
        var healAmt = Math.max(0, Number(effect.amount) || 0);
        for (i = 0; i < player.board.length; i++) {
          m = player.board[i];
          m.health = Math.min(m.maxHealth, m.health + healAmt);
        }
        log(state, playerIdx, 'effect', 'Friendly minions recover ' + healAmt + ' health.');
        break;
      }

      case 'shield-allies': {
        var shieldAmt = Math.max(0, Number(effect.amount) || 0);
        for (i = 0; i < player.board.length; i++) {
          player.board[i].shield += shieldAmt;
        }
        log(state, playerIdx, 'effect', 'Friendly minions gain a ' + shieldAmt + ' shield.');
        break;
      }

      case 'shield-ally': {
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No ally to shield.');
          break;
        }
        t.shield += Math.max(0, Number(effect.amount) || 0);
        log(state, playerIdx, 'effect', t.name + ' gains a ' + (Number(effect.amount) || 0) + ' shield.');
        break;
      }

      case 'buff-allies': {
        var bp = Number(effect.power) || 0;
        var bh = Number(effect.health) || 0;
        for (i = 0; i < player.board.length; i++) {
          m = player.board[i];
          if (m.uid === ctx.sourceUid) continue;
          m.power += bp;
          m.maxHealth += bh;
          m.health += bh;
        }
        log(state, playerIdx, 'effect', 'Allies gain +' + bp + '/+' + bh + '.');
        break;
      }

      case 'debuff-enemy': {
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to weaken.');
          break;
        }
        t.tempPowerDown = (t.tempPowerDown || 0) + Math.max(0, Number(effect.power) || 0);
        log(state, playerIdx, 'effect', t.name + ' is weakened until end of turn.');
        break;
      }

      case 'destroy-weakest-enemy': {
        var boardE = enemy.board;
        if (boardE.length === 0) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to destroy.');
          break;
        }
        var weakest = boardE[0];
        for (i = 1; i < boardE.length; i++) {
          var c = boardE[i];
          var cp = effectivePower(state, enemyIdx, c);
          var wp = effectivePower(state, enemyIdx, weakest);
          if (cp < wp || (cp === wp && c.health < weakest.health)) weakest = c;
        }
        log(state, playerIdx, 'effect', weakest.name + ' is marked for destruction.');
        destroyMinion(state, weakest.uid);
        checkDeaths(state);
        break;
      }

      case 'destroy-filter': {
        var maxCost = Number(effect.maxCost);
        var both = !!effect.bothSides;
        var doomed = [];
        for (i = 0; i < enemy.board.length; i++) {
          if (enemy.board[i].cost <= maxCost) doomed.push(enemy.board[i].name), destroyMinion(state, enemy.board[i].uid);
        }
        if (both) {
          for (i = 0; i < player.board.length; i++) {
            if (player.board[i].cost <= maxCost) doomed.push(player.board[i].name), destroyMinion(state, player.board[i].uid);
          }
        }
        log(state, playerIdx, 'effect', doomed.length ? 'Destroyed: ' + doomed.join(', ') + '.' : 'Nothing matches the filter.');
        checkDeaths(state);
        break;
      }

      case 'stun': {
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to stun.');
          break;
        }
        t.stunned = 1;
        log(state, playerIdx, 'effect', t.name + ' is stunned.');
        break;
      }

      case 'stun-filter': {
        var maxP = Number(effect.maxPower);
        var stunnedNames = [];
        for (i = 0; i < enemy.board.length; i++) {
          m = enemy.board[i];
          if (effectivePower(state, enemyIdx, m) <= maxP) {
            m.stunned = 1;
            stunnedNames.push(m.name);
          }
        }
        log(state, playerIdx, 'effect', stunnedNames.length ? 'Stunned: ' + stunnedNames.join(', ') + '.' : 'No enemy is weak enough to stun.');
        break;
      }

      case 'confuse': {
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to confuse.');
          break;
        }
        t.confused = 1;
        log(state, playerIdx, 'effect', t.name + ' is confused — its next attack strikes at random.');
        break;
      }

      case 'slow-enemy': {
        t = pickTarget(state, playerIdx, effect, ctx.target, ctx.sourceUid);
        if (!t) {
          log(state, playerIdx, 'fizzle', 'No enemy minion to slow.');
          break;
        }
        t.speed = Math.max(1, Math.ceil(t.speed / 2));
        log(state, playerIdx, 'effect', t.name + ' is slowed (speed ' + t.speed + ').');
        break;
      }

      case 'slow-all-enemies': {
        for (i = 0; i < enemy.board.length; i++) {
          enemy.board[i].speed = Math.max(1, Math.ceil(enemy.board[i].speed / 2));
        }
        log(state, playerIdx, 'effect', 'All enemy minions are slowed.');
        break;
      }

      case 'ink-gen':
      case 'heal-hero-turn':
      case 'aura-allies':
      case 'buff-self-attacking':
      case 'damage-reduction': {
        // Passive kinds — continuous; nothing to resolve on play.
        break;
      }

      case 'return-to-hand': {
        // on_death: a reinforced copy returns to the owner's hand.
        var owner = state.players[playerIdx];
        if (owner.hand.length >= RULES.HAND_LIMIT) {
          log(state, playerIdx, 'fizzle', 'Hand is full — the spirit cannot return.');
          break;
        }
        var found = null;
        // The source def is carried on the dying minion.
        if (ctx.deadMinion) found = ctx.deadMinion;
        if (!found) break;
        var copy = clone(found.def);
        copy.health = (Number(copy.health) || 1) + (Number(effect.healthBonus) || 0);
        owner.hand.push(copy);
        log(state, playerIdx, 'effect', found.name + ' returns to Player ' + (playerIdx + 1) + "'s hand, renewed.");
        break;
      }

      case 'copy-top-card': {
        if (player.deck.length === 0) {
          log(state, playerIdx, 'fizzle', 'The deck is empty — nothing to copy.');
          break;
        }
        if (player.hand.length >= RULES.HAND_LIMIT) {
          log(state, playerIdx, 'fizzle', 'Hand is full — the copy is lost.');
          break;
        }
        var topCopy = clone(player.deck[0]);
        player.hand.push(topCopy);
        log(state, playerIdx, 'effect', 'Player ' + (playerIdx + 1) + ' copies the top card of their deck (' + topCopy.name + ').');
        break;
      }

      case 'combo': {
        if (!ctx.comboActive) {
          log(state, playerIdx, 'fizzle', 'Combo not active — no card played earlier this turn.');
          break;
        }
        var subs = Array.isArray(effect.effects) ? effect.effects : [];
        for (i = 0; i < subs.length; i++) {
          resolveEffect(state, playerIdx, subs[i], ctx);
        }
        break;
      }

      case 'random-choice': {
        var options = Array.isArray(effect.options) ? effect.options : [];
        if (options.length === 0) break;
        var pick = options[rngInt(state, options.length)];
        log(state, playerIdx, 'effect', 'Fate chooses: ' + (pick.kind || 'unknown') + '.');
        resolveEffect(state, playerIdx, pick, ctx);
        break;
      }

      default: {
        log(state, playerIdx, 'fizzle', 'Unknown effect kind: ' + effect.kind);
      }
    }
  }

  /* ── Playing cards ───────────────────────────────────────────────────── */

  function makeMinion(state, def) {
    return {
      uid: state.uidCounter++,
      def: def,
      cardId: def.id,
      name: def.name,
      cost: def.cost,
      power: def.power,
      maxHealth: def.health,
      health: def.health,
      speed: def.speed,
      shield: 0,
      sick: true,
      attacksUsed: false,
      specialUsed: false,
      stunned: 0,
      confused: 0,
      tempPowerDown: 0,
      ability: def.ability || null,
      domain: def.domain || '',
      rarity: def.rarity || 'common',
    };
  }

  // playCard(state, handIndex, target?) — target: enemy board index (number)
  // or { side: 'enemy'|'ally', index }. Missing targets are auto-picked.
  function playCard(state, handIndex, target) {
    if (isOver(state)) return { ok: false, error: 'The duel is over.' };
    var playerIdx = state.activePlayer;
    var player = state.players[playerIdx];
    var card = player.hand[handIndex];
    if (!card) return { ok: false, error: 'No card at hand index ' + handIndex + '.' };
    if (player.board.length >= RULES.BOARD_LIMIT) return { ok: false, error: 'The board is full.' };
    if (card.cost > player.ink) return { ok: false, error: 'Not enough ink.' };

    player.ink = Math.max(0, player.ink - card.cost);
    player.hand.splice(handIndex, 1);
    player.playedCount += 1;

    var minion = makeMinion(state, card);
    player.board.push(minion);
    log(state, playerIdx, 'play', 'Player ' + (playerIdx + 1) + ' plays ' + card.name + ' (' + card.cost + ' ink).');

    if (card.ability && card.ability.trigger === 'on_play') {
      var comboActive = player.playedCount > 1;
      resolveEffect(state, playerIdx, card.ability.effect, {
        sourceUid: minion.uid,
        target: target,
        comboActive: comboActive,
        deadMinion: minion,
      });
    }

    checkDeaths(state);
    return { ok: true, minion: minion };
  }

  /* ── Combat ──────────────────────────────────────────────────────────── */

  function canAttackWith(state, playerIdx, minion) {
    return (
      !isOver(state) &&
      state.activePlayer === playerIdx &&
      !minion.sick &&
      !minion.attacksUsed &&
      minion.stunned <= 0 &&
      effectivePower(state, playerIdx, minion) > 0
    );
  }

  // attack(state, attackerIndex, target) — target: 'hero' or enemy board index.
  // Confused attackers ignore the requested target and strike a random legal one.
  function attack(state, attackerIndex, target) {
    if (isOver(state)) return { ok: false, error: 'The duel is over.' };
    var playerIdx = state.activePlayer;
    var enemyIdx = 1 - playerIdx;
    var player = state.players[playerIdx];
    var enemy = state.players[enemyIdx];
    var attacker = player.board[attackerIndex];
    if (!attacker) return { ok: false, error: 'No minion at board index ' + attackerIndex + '.' };
    if (!canAttackWith(state, playerIdx, attacker)) {
      return { ok: false, error: attacker.name + ' cannot attack right now.' };
    }

    var legalTargets = ['hero'];
    for (var i = 0; i < enemy.board.length; i++) legalTargets.push(i);

    if (attacker.confused > 0) {
      target = legalTargets[rngInt(state, legalTargets.length)];
      log(state, playerIdx, 'effect', attacker.name + ' attacks wildly in its confusion.');
    } else if (target !== 'hero') {
      target = Number(target);
      if (!Number.isInteger(target) || !enemy.board[target]) {
        return { ok: false, error: 'Illegal attack target.' };
      }
    }

    var attackPower = effectivePower(state, playerIdx, attacker) + passiveAmount(attacker, 'buff-self-attacking', 'power');
    attacker.attacksUsed = true;

    if (target === 'hero') {
      damageHero(state, enemyIdx, attackPower);
      log(state, playerIdx, 'attack', attacker.name + ' strikes the enemy hero for ' + attackPower + '.');
      checkWin(state);
      return { ok: true };
    }

    var defender = enemy.board[target];
    log(state, playerIdx, 'attack', attacker.name + ' attacks ' + defender.name + '.');

    // Attacker hits defender (shield + reduction apply).
    var dealt = applyDamage(state, defender, attackPower);
    log(state, playerIdx, 'attack', defender.name + ' takes ' + dealt + ' damage.');

    // Counter-attack: outmaneuver halves the reply when the attacker is faster.
    if (defender.health > 0) {
      var counter = effectivePower(state, enemyIdx, defender);
      if (attacker.speed > defender.speed) counter = Math.floor(counter / 2);
      if (counter > 0) {
        var taken = applyDamage(state, attacker, counter);
        log(state, playerIdx, 'attack', attacker.name + ' takes ' + taken + ' counter damage.');
      }
    }

    checkDeaths(state);
    return { ok: true };
  }

  /* ── The kit: every character has a Strike AND a Special ───────────────── */

  // canSpecialWith(state, playerIdx, minion) — a minion's special is its
  // card ability as an activated move: ready (recovered, not stunned),
  // once per turn, SPECIAL_COST ink. Passives cannot be activated.
  function canSpecialWith(state, playerIdx, minion) {
    return (
      !isOver(state) &&
      state.activePlayer === playerIdx &&
      minion.ability &&
      minion.ability.effect &&
      minion.ability.trigger !== 'passive' &&
      !minion.sick &&
      minion.stunned <= 0 &&
      !minion.specialUsed &&
      state.players[playerIdx].ink >= RULES.SPECIAL_COST
    );
  }

  // useSpecial(state, boardIndex, target) — unleash the minion's special
  // move. Target rules mirror card plays: 'enemy' abilities take an enemy
  // board index, 'ally' abilities take { side: 'ally', index }.
  function useSpecial(state, boardIndex, target) {
    if (isOver(state)) return { ok: false, error: 'The duel is over.' };
    var playerIdx = state.activePlayer;
    var player = state.players[playerIdx];
    var minion = player.board[boardIndex];
    if (!minion) return { ok: false, error: 'No minion at board index ' + boardIndex + '.' };
    if (!minion.ability || !minion.ability.effect) {
      return { ok: false, error: minion.name + ' has no special move.' };
    }
    if (minion.ability.trigger === 'passive') {
      return { ok: false, error: minion.name + "'s gift is always active — it needs no command." };
    }
    if (minion.sick) return { ok: false, error: minion.name + ' is recovering — its special unlocks next turn.' };
    if (minion.stunned > 0) return { ok: false, error: minion.name + ' is stunned.' };
    if (minion.specialUsed) return { ok: false, error: minion.name + ' has already unleashed its special this turn.' };
    if (player.ink < RULES.SPECIAL_COST) {
      return { ok: false, error: 'Not enough ink — specials cost ' + RULES.SPECIAL_COST + '.' };
    }
    var side = effectTargetSide(minion.ability.effect);
    if (side === 'enemy') {
      if (typeof target !== 'number' || !state.players[1 - playerIdx].board[target]) {
        return { ok: false, error: 'Choose an enemy minion for that special.' };
      }
    } else if (side === 'ally') {
      if (!target || target.side !== 'ally' || !player.board[target.index]) {
        return { ok: false, error: 'Choose a friendly minion for that special.' };
      }
    }
    player.ink -= RULES.SPECIAL_COST;
    minion.specialUsed = true;
    log(state, playerIdx, 'special', minion.name + ' unleashes ' + minion.ability.name + '!');
    resolveEffect(state, playerIdx, minion.ability.effect, { target: target, sourceUid: minion.uid });
    checkDeaths(state);
    return { ok: true };
  }

  /* ── Legal actions (UI enablement) ───────────────────────────────────── */

  function getLegalActions(state) {
    var playerIdx = state.activePlayer;
    var player = state.players[playerIdx];
    var enemy = state.players[1 - playerIdx];
    var over = isOver(state);

    var plays = [];
    var attacks = [];
    var specials = [];
    if (!over) {
      for (var i = 0; i < player.hand.length; i++) {
        var card = player.hand[i];
        if (card.cost > player.ink || player.board.length >= RULES.BOARD_LIMIT) continue;
        var side = card.ability && card.ability.trigger === 'on_play' ? effectTargetSide(card.ability.effect) : null;
        var targets = [];
        if (side === 'enemy') {
          for (var e = 0; e < enemy.board.length; e++) targets.push(e);
        } else if (side === 'ally') {
          for (var a = 0; a < player.board.length; a++) targets.push(a);
        }
        plays.push({
          handIndex: i,
          cost: card.cost,
          needsTarget: side != null && targets.length > 0,
          targetSide: side,
          targets: targets,
        });
      }
      for (var b = 0; b < player.board.length; b++) {
        var minion = player.board[b];
        if (canAttackWith(state, playerIdx, minion)) {
          var t2 = ['hero'];
          for (var x = 0; x < enemy.board.length; x++) t2.push(x);
          attacks.push({ attackerIndex: b, targets: t2, confused: minion.confused > 0 });
        }
        if (canSpecialWith(state, playerIdx, minion)) {
          var sSide = effectTargetSide(minion.ability.effect);
          var sTargets = [];
          if (sSide === 'enemy') {
            for (var se = 0; se < enemy.board.length; se++) sTargets.push(se);
          } else if (sSide === 'ally') {
            for (var sa = 0; sa < player.board.length; sa++) sTargets.push(sa);
          }
          specials.push({
            boardIndex: b,
            cost: RULES.SPECIAL_COST,
            name: minion.ability.name,
            needsTarget: sSide != null && sTargets.length > 0,
            targetSide: sSide,
            targets: sTargets,
          });
        }
      }
    }

    return { over: over, activePlayer: playerIdx, plays: plays, attacks: attacks, specials: specials, canEndTurn: !over };
  }

  /* ── AI ──────────────────────────────────────────────────────────────── */

  function aiChooseTarget(state, playerIdx, card) {
    var side = effectTargetSide(card.ability.effect);
    if (!side) return undefined;
    var idx = side === 'enemy' ? 1 - playerIdx : playerIdx;
    var board = state.players[idx].board;
    if (board.length === 0) return undefined;
    var best = 0;
    for (var i = 1; i < board.length; i++) {
      var mp = effectivePower(state, idx, board[i]);
      var bp = effectivePower(state, idx, board[best]);
      if (mp > bp || (mp === bp && board[i].health > board[best].health)) best = i;
    }
    return side === 'enemy' ? best : { side: 'ally', index: best };
  }

  // runAiTurn(state, opts) — plays out the active player's turn with heuristics:
  // cast affordable cards (expensive first, targeted abilities aimed at the
  // biggest threat), then attack — lethal if available, otherwise take
  // favorable trades, else go face. Ends the turn. Deterministic via state RNG.
  // opts.holdBackRounds N: story-mode mercy — the Oracle keeps its removal
  // in hand for the first N rounds while a new commander learns the field
  // (opts.holdBack: true is shorthand for 2). Trades still happen: the duel
  // is real, just not cruel.
  function runAiTurn(state, opts) {
    if (isOver(state)) return state;
    var mercyRounds = opts && opts.holdBackRounds ? opts.holdBackRounds : opts && opts.holdBack ? 2 : 0;
    var holdBack = mercyRounds > 0 && state.halfTurns < mercyRounds * 2;
    var playerIdx = state.activePlayer;

    // The rubber band: an Oracle far enough ahead (bandThreshold, default 12)
    // stops spending removal on the player's board — a trailing commander
    // always has a window to come back through.
    var hpDiff = state.players[playerIdx].hero.hp - state.players[1 - playerIdx].hero.hp;
    var bandThreshold = (opts && opts.bandThreshold) || 12;
    var crueltyOff = holdBack || (opts && opts.rubberBand && hpDiff >= bandThreshold);

    // Play phase (bounded by hand size).
    for (var guard = 0; guard < RULES.HAND_LIMIT + 2; guard++) {
      var player = state.players[playerIdx];
      var playIdx = -1;
      for (var i = 0; i < player.hand.length; i++) {
        if (player.board.length >= RULES.BOARD_LIMIT) break;
        var card = player.hand[i];
        if (card.cost > player.ink) continue;
        if (crueltyOff && card.ability && card.ability.effect && /destroy|damage|stun|slow|debuff/.test(card.ability.effect.kind)) {
          continue; // mercy: the removal stays in hand for now
        }
        if (playIdx === -1 || card.cost > player.hand[playIdx].cost) playIdx = i;
      }
      if (playIdx === -1) break;
      var chosen = player.hand[playIdx];
      var target = chosen.ability && chosen.ability.trigger === 'on_play' ? aiChooseTarget(state, playerIdx, chosen) : undefined;
      playCard(state, playIdx, target);
      if (isOver(state)) return state;
    }

    // Special phase: spend spare ink on aggressive specials, biggest threat
    // first. Mercy windows shelter the board from this too, and lower
    // difficulties disable it outright (opts.noSpecials).
    if (!crueltyOff && !(opts && opts.noSpecials)) {
      for (var sGuard = 0; sGuard < RULES.BOARD_LIMIT + 2; sGuard++) {
        var sp = state.players[playerIdx];
        if (sp.ink < RULES.SPECIAL_COST) break;
        var specialUsed = false;
        for (var s = 0; s < sp.board.length; s++) {
          var sm = sp.board[s];
          if (!canSpecialWith(state, playerIdx, sm)) continue;
          var kind = sm.ability.effect.kind || '';
          if (!/damage|destroy|stun|debuff|slow/.test(kind)) continue; // aggressive specials only
          var sTarget = aiChooseTarget(state, playerIdx, sm);
          var sRes = useSpecial(state, s, sTarget);
          if (sRes.ok) {
            specialUsed = true;
            break;
          }
        }
        if (!specialUsed) break;
        if (isOver(state)) return state;
      }
    }

    // Hero power: only when the difficulty grants it (opts.heroPowerDef).
    if (opts && opts.heroPowerDef && !isOver(state)) {
      useHeroPower(state, opts.heroPowerDef);
    }

    // Attack phase.
    var enemyIdx = 1 - playerIdx;
    var lethal = 0;
    var board = state.players[playerIdx].board;
    for (var b = 0; b < board.length; b++) {
      if (canAttackWith(state, playerIdx, board[b])) {
        lethal += effectivePower(state, playerIdx, board[b]) + passiveAmount(board[b], 'buff-self-attacking', 'power');
      }
    }
    var goFace = lethal >= state.players[enemyIdx].hero.hp;

    for (var g2 = 0; g2 < RULES.BOARD_LIMIT + 2; g2++) {
      // Re-fetch each iteration: indices shift as minions die.
      var me = state.players[playerIdx];
      var attackerIndex = -1;
      for (var a = 0; a < me.board.length; a++) {
        if (canAttackWith(state, playerIdx, me.board[a])) {
          attackerIndex = a;
          break; // board order = play order; fine and deterministic
        }
      }
      if (attackerIndex === -1) break;

      var attacker = me.board[attackerIndex];
      var enemy = state.players[enemyIdx];
      var target = 'hero';

      if (!goFace && enemy.board.length > 0 && attacker.confused <= 0) {
        var atk = effectivePower(state, playerIdx, attacker) + passiveAmount(attacker, 'buff-self-attacking', 'power');
        var best = -1;
        for (var d = 0; d < enemy.board.length; d++) {
          var defender = enemy.board[d];
          var defPower = effectivePower(state, enemyIdx, defender);
          var effectiveHealth = defender.health + defender.shield + passiveAmount(defender, 'damage-reduction');
          if (effectiveHealth > atk) continue; // cannot kill it
          var counter = attacker.speed > defender.speed ? Math.floor(defPower / 2) : defPower;
          var survives = attacker.health + attacker.shield > counter || counter <= 0;
          var worthIt = survives || defPower >= effectivePower(state, playerIdx, attacker);
          if (!worthIt) continue;
          if (best === -1 || defPower > effectivePower(state, enemyIdx, enemy.board[best])) best = d;
        }
        if (best !== -1) target = best;
      }

      attack(state, attackerIndex, target);
      if (isOver(state)) return state;
    }

    endTurn(state);
    return state;
  }

  /* ── Serialization ───────────────────────────────────────────────────── */

  function serialize(state) {
    return clone(state);
  }

  // useHeroPower(state, power) — Pantheon Protocol hero powers. Costs
  // RULES.HERO_POWER_COST ink, once per turn (startTurn resets the flag).
  // `power` is a hero-power definition (game/fx/hero-powers.js): { name,
  // effect, target? } where effect uses the standard DSL.
  function useHeroPower(state, power) {
    if (isOver(state)) return { ok: false, error: 'The duel is over.' };
    if (!power || !power.effect) return { ok: false, error: 'No such hero power.' };
    var playerIdx = state.activePlayer;
    var player = state.players[playerIdx];
    if (player.ink < RULES.HERO_POWER_COST) return { ok: false, error: 'Not enough ink.' };
    if (player.heroPowerUsed) return { ok: false, error: 'Hero power already used this turn.' };
    player.ink = Math.max(0, player.ink - RULES.HERO_POWER_COST);
    player.heroPowerUsed = true;
    log(state, playerIdx, 'effect', 'Player ' + (playerIdx + 1) + ' channels ' + (power.name || 'their hero power') + '!');
    resolveEffect(state, playerIdx, power.effect, { sourceUid: null, target: power.target });
    checkDeaths(state);
    return { ok: true };
  }

  return {
    RULES: RULES,
    mulberry32: mulberry32,
    toBattleCard: toBattleCard,
    autoBuildDeck: autoBuildDeck,
    createGame: createGame,
    mulligan: mulligan,
    useSpecial: useSpecial,
    canSpecialWith: canSpecialWith,
    playCard: playCard,
    attack: attack,
    endTurn: endTurn,
    getLegalActions: getLegalActions,
    runAiTurn: runAiTurn,
    useHeroPower: useHeroPower,
    serialize: serialize,
    effectivePower: effectivePower,
  };
});
