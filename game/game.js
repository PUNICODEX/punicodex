/* ═══════════════════════════════════════════════════════════════════════════
   PuniCodex Mythic Duel — game client

   Tabs: Lobby / Collection / Packs / Battle.
   All dynamic DOM is built with createElement + property assignment (never
   HTML string injection). No alert/confirm/prompt — toasts and modals only.
   Battle logic lives entirely in game/engine.js (window.CardEngine).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var Engine = window.CardEngine;

  /* ── Constants ───────────────────────────────────────────────────────── */

  var STORAGE_KEY = 'punicodex.cards.v1';
  var STARTER_INK = 150;
  var STARTER_UNIQUE = 24;
  var REWARDS = { win: 50, loss: 15, draw: 15 };
  var RARITY_LADDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  var RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  var STANDARD_WEIGHTS = { common: 68, uncommon: 22, rare: 7, epic: 2.4, legendary: 0.55, mythic: 0.05 };
  var FORCED_WEIGHTS = { rare: 70, epic: 22, legendary: 7, mythic: 1 };

  var PACK_DEFS = [
    {
      id: 'seeker',
      name: 'Seeker Pack',
      cost: 100,
      size: 5,
      desc: 'Five cards drawn from the full First Restoration set. The scholarly staple.',
    },
    {
      id: 'pantheon',
      name: 'Pantheon Pack',
      cost: 150,
      size: 5,
      desc: 'Five cards drawn from a single pantheon of your choice. Focus your collection.',
      pantheonChoice: true,
    },
    {
      id: 'mythic',
      name: 'Mythic Pack',
      cost: 300,
      size: 5,
      desc: 'Five cards with one slot guaranteed rare or better — and sharply elevated legendary and mythic odds.',
      forcedSlot: true,
    },
  ];

  /* ── State ───────────────────────────────────────────────────────────── */

  var cards = []; // display cards (battle-scale stats + foil flag)
  var byId = {};
  var pantheons = [];
  var save = null;
  var battle = null;
  var packResults = null;
  var packActions = null;

  var ui = {
    section: 'lobby',
    search: '',
    pantheon: 'all',
    tier: 'all',
    rarity: 'all',
    deckSearch: '',
    pendingPlay: null, // { handIndex, targetSide }
    selectedAttacker: null, // board index
    aiThinking: false,
  };

  /* ── Tiny DOM helpers ────────────────────────────────────────────────── */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function showToast(text) {
    var container = $('toast-container');
    var toast = el('div', 'toast', text);
    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  function openModal(buildContent) {
    var overlay = $('modal-overlay');
    var content = $('modal-content');
    content.replaceChildren();
    var close = el('button', 'modal-close', '×');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', closeModal);
    content.appendChild(close);
    buildContent(content);
    overlay.hidden = false;
  }

  function closeModal() {
    $('modal-overlay').hidden = true;
  }

  function prettyPantheon(p) {
    return String(p || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });
  }

  /* ── Persistence ─────────────────────────────────────────────────────── */

  function defaultSave() {
    return {
      v: 1,
      ink: STARTER_INK,
      collection: {},
      deck: [],
      stats: { packsOpened: 0, wins: 0, losses: 0, draws: 0 },
    };
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.collection || !data.stats) return null;
      data.ink = Math.max(0, Math.floor(Number(data.ink) || 0));
      if (!Array.isArray(data.deck)) data.deck = [];
      return data;
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (e) {
      // Storage unavailable (private mode) — play continues in memory.
    }
  }

  // First visit: 1 random rare + commons/uncommons up to 24 unique cards.
  function starterGrant() {
    var rand = Engine.mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
    var grant = {};

    var rares = cards.filter(function (c) {
      return c.rarity === 'rare';
    });
    if (rares.length > 0) {
      grant[rares[Math.floor(rand() * rares.length)].id] = 1;
    }
    var commons = poolByRarity(cards, 'common');
    var uncommons = poolByRarity(cards, 'uncommon');
    var guard = 0;
    while (Object.keys(grant).length < STARTER_UNIQUE && guard++ < 500) {
      var pool = rand() < 0.75 ? commons : uncommons; // weighted 75 / 25
      if (pool.length === 0) continue;
      var pick = pool[Math.floor(rand() * pool.length)];
      if (!grant[pick.id]) grant[pick.id] = 1;
    }
    save.collection = grant;
    persist();
    showToast('Welcome, scholar — a starter archive of ' + Object.keys(grant).length + ' cards and ' + STARTER_INK + ' ✦ Ink awaits you.');
  }

  /* ── Shared render helpers ───────────────────────────────────────────── */

  function renderCurrencies() {
    $('ink-count').textContent = String(save.ink);
  }

  function buildArt(card, className) {
    var wrap = el('div', className || 'card-art');
    if (card.art && card.art.mascot) {
      var img = document.createElement('img');
      img.src = card.art.mascot;
      img.alt = card.name;
      img.loading = 'lazy';
      wrap.appendChild(img);
    } else {
      wrap.classList.add('fallback');
      if (card.art && card.art.colors && card.art.colors.primary) {
        wrap.style.background =
          'linear-gradient(160deg, ' + card.art.colors.primary + '33, #0c1018)';
      }
      wrap.appendChild(el('span', 'fallback-icon', card.categoryIcon || '✦'));
    }
    return wrap;
  }

  function buildCardEl(card, opts) {
    opts = opts || {};
    var node = el('div', 'game-card rarity-' + card.rarity + (card.foil ? ' foil' : ''));
    node.setAttribute('tabindex', '0');
    node.appendChild(buildArt(card));

    var body = el('div', 'card-body');
    body.appendChild(el('div', 'card-name', card.name));
    body.appendChild(el('div', 'card-sub', prettyPantheon(card.pantheon) + ' · ' + card.tierLabel));

    var stats = el('div', 'card-stats');
    stats.appendChild(el('span', 'stat-cost', '✦ ' + card.cost));
    stats.appendChild(el('span', null, '⚔ ' + card.power));
    stats.appendChild(el('span', null, '♥ ' + card.health));
    stats.appendChild(el('span', null, '≫ ' + card.speed));
    body.appendChild(stats);

    body.appendChild(
      el('div', 'card-ability', card.ability ? card.ability.name + ' — ' + card.ability.description : 'No ability.')
    );
    node.appendChild(body);

    if (opts.count != null && opts.count > 1) {
      node.appendChild(el('div', 'card-count', '×' + opts.count));
    }

    function open() {
      openCardModal(card, opts.count);
    }
    node.addEventListener('click', open);
    node.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open();
      }
    });
    return node;
  }

  function openCardModal(card, count) {
    openModal(function (content) {
      content.appendChild(buildArt(card, 'modal-art'));
      content.appendChild(el('h2', 'modal-title', card.name));
      if (card.original && card.original !== '—' && card.original !== card.name) {
        content.appendChild(el('div', 'modal-original', card.original));
      }
      content.appendChild(
        el('div', 'modal-sub', prettyPantheon(card.pantheon) + ' · ' + card.categoryLabel + (count ? ' · Owned ×' + count : ''))
      );

      var tags = el('div', 'modal-tags');
      var rarityTag = el('span', 'tag rarity-tag', card.rarity);
      rarityTag.style.color = 'var(--rarity-' + card.rarity + ')';
      tags.appendChild(rarityTag);
      tags.appendChild(el('span', 'tag', card.tierLabel));
      if (card.foil) tags.appendChild(el('span', 'tag', 'Foil'));
      if (card.variant === 'original-script') tags.appendChild(el('span', 'tag', 'Original Script'));
      if (card.flagship) tags.appendChild(el('span', 'tag', 'Flagship'));
      content.appendChild(tags);

      var stats = el('div', 'modal-stats');
      [
        ['Cost', '✦ ' + card.cost],
        ['Power', '⚔ ' + card.power],
        ['Health', '♥ ' + card.health],
        ['Speed', '≫ ' + card.speed],
      ].forEach(function (pair) {
        var cell = el('div', 'mstat');
        cell.appendChild(el('span', 'mstat-value', pair[1]));
        cell.appendChild(el('span', 'mstat-label', pair[0]));
        stats.appendChild(cell);
      });
      content.appendChild(stats);

      if (card.ability) {
        var ability = el('div', 'modal-ability');
        ability.appendChild(el('strong', null, card.ability.name + ': '));
        ability.appendChild(document.createTextNode(card.ability.description));
        content.appendChild(ability);
      }

      if (card.flavor) {
        content.appendChild(el('p', 'modal-flavor', card.flavor));
      }

      if (card.domain) {
        content.appendChild(el('p', 'modal-sub', 'Domain: ' + card.domain));
      }

      var lore = document.createElement('a');
      lore.className = 'modal-lore';
      lore.href = '/sites/' + card.entryId + '/';
      lore.textContent = 'Visit the temple of ' + card.name + ' →';
      content.appendChild(lore);
    });
  }

  /* ── Lobby ───────────────────────────────────────────────────────────── */

  function renderLobby() {
    var total = Object.keys(save.collection).length;
    var copies = 0;
    Object.keys(save.collection).forEach(function (id) {
      copies += save.collection[id];
    });
    var stats = $('lobby-stats');
    stats.replaceChildren();
    [
      [total + ' / ' + cards.length, 'Unique cards'],
      [String(copies), 'Total cards'],
      [String(save.stats.packsOpened), 'Packs opened'],
      [save.stats.wins + 'W · ' + save.stats.losses + 'L', 'Battle record'],
      [save.ink + ' ✦', 'Ink'],
    ].forEach(function (pair) {
      var cell = el('div', 'stat-card');
      cell.appendChild(el('span', 'stat-value', pair[0]));
      cell.appendChild(el('span', 'stat-label', pair[1]));
      stats.appendChild(cell);
    });

    var featured = $('featured-cards');
    featured.replaceChildren();
    cards
      .filter(function (c) {
        return c.foil && c.art && c.art.mascot;
      })
      .slice(0, 6)
      .forEach(function (c) {
        featured.appendChild(buildCardEl(c, { count: save.collection[c.id] || 0 }));
      });
  }

  /* ── Collection ──────────────────────────────────────────────────────── */

  function renderPantheonSelect() {
    var select = $('collection-pantheon');
    select.replaceChildren();
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'All pantheons';
    select.appendChild(all);
    pantheons.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = prettyPantheon(p);
      select.appendChild(opt);
    });
    select.value = ui.pantheon;
  }

  function renderPillGroup(containerId, values, labels, current, onPick) {
    var container = $(containerId);
    container.replaceChildren();
    values.forEach(function (value, i) {
      var pill = el('button', 'filter-pill' + (current === value ? ' active' : ''), labels[i]);
      pill.addEventListener('click', function () {
        onPick(value);
      });
      container.appendChild(pill);
    });
  }

  function renderCollectionFilters() {
    renderPillGroup(
      'tier-filters',
      ['all', 'dual', '1', '2'],
      ['All tiers', 'Dual-Tier', 'Tier 1', 'Tier 2'],
      ui.tier,
      function (v) {
        ui.tier = v;
        renderCollection();
      }
    );
    renderPillGroup(
      'rarity-filters',
      ['all'].concat(RARITIES),
      ['All rarities'].concat(
        RARITIES.map(function (r) {
          return r;
        })
      ),
      ui.rarity,
      function (v) {
        ui.rarity = v;
        renderCollection();
      }
    );
  }

  function collectionMatches(card) {
    if (!save.collection[card.id]) return false;
    if (ui.tier !== 'all' && card.tier !== ui.tier) return false;
    if (ui.rarity !== 'all' && card.rarity !== ui.rarity) return false;
    if (ui.pantheon !== 'all' && card.pantheon !== ui.pantheon) return false;
    if (ui.search) {
      var hay = (card.name + ' ' + (card.ascii || '') + ' ' + (card.original || '') + ' ' + (card.domain || '')).toLowerCase();
      if (hay.indexOf(ui.search.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function renderCollection() {
    var owned = Object.keys(save.collection).length;
    $('collection-summary').textContent =
      owned + ' of ' + cards.length + ' unique cards collected. Click a card for its scholarly record.';

    renderCollectionFilters();
    var grid = $('collection-grid');
    grid.replaceChildren();
    var shown = cards.filter(collectionMatches);
    if (shown.length === 0) {
      grid.appendChild(el('p', 'deck-empty', 'No cards match — open packs to grow your archive.'));
      return;
    }
    shown.forEach(function (c) {
      grid.appendChild(buildCardEl(c, { count: save.collection[c.id] }));
    });
  }

  /* ── Packs ───────────────────────────────────────────────────────────── */

  function pickRarity(rand, weights, pool) {
    var total = 0;
    RARITY_LADDER.forEach(function (r) {
      total += weights[r] || 0;
    });
    var roll = rand() * total;
    var picked = 'common';
    for (var i = 0; i < RARITY_LADDER.length; i++) {
      var r = RARITY_LADDER[i];
      var w = weights[r] || 0;
      if (roll < w) {
        picked = r;
        break;
      }
      roll -= w;
    }
    // Rarities with no cards in the pool (e.g. epic in this set) step down
    // the ladder toward common until a non-empty rarity is found.
    var idx = RARITY_LADDER.indexOf(picked);
    while (idx < RARITY_LADDER.length - 1 && poolByRarity(pool, RARITY_LADDER[idx]).length === 0) {
      idx++;
    }
    return RARITY_LADDER[idx];
  }

  function poolByRarity(pool, rarity) {
    return pool.filter(function (c) {
      return c.rarity === rarity;
    });
  }

  function drawPackCards(def, pantheon) {
    var rand = Engine.mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    var pool = pantheon
      ? cards.filter(function (c) {
          return c.pantheon === pantheon;
        })
      : cards;
    var results = [];
    for (var slot = 0; slot < def.size; slot++) {
      var weights = def.forcedSlot && slot === def.size - 1 ? FORCED_WEIGHTS : STANDARD_WEIGHTS;
      var rarity = pickRarity(rand, weights, pool);
      var rarityPool = poolByRarity(pool, rarity);
      if (rarityPool.length === 0) rarityPool = pool; // tiny pantheon pools
      results.push(rarityPool[Math.floor(rand() * rarityPool.length)]);
    }
    return results;
  }

  function renderPackShop() {
    var shop = $('pack-shop');
    shop.replaceChildren();
    PACK_DEFS.forEach(function (def) {
      var option = el('div', 'pack-option');
      option.appendChild(el('div', 'pack-name', def.name));
      option.appendChild(el('div', 'pack-desc', def.desc));
      option.appendChild(el('div', 'pack-cost', def.size + ' cards · ' + def.cost + ' ✦ Ink'));
      var btn = el('button', 'btn primary', 'Open for ' + def.cost + ' ✦');
      btn.disabled = save.ink < def.cost;
      btn.addEventListener('click', function () {
        if (def.pantheonChoice) {
          openPantheonPicker(def);
        } else {
          openPack(def, null);
        }
      });
      option.appendChild(btn);
      shop.appendChild(option);
    });
  }

  function openPantheonPicker(def) {
    openModal(function (content) {
      content.appendChild(el('h2', 'modal-title', 'Choose a Pantheon'));
      content.appendChild(el('p', 'modal-sub', 'All five cards will be drawn from this tradition.'));

      var select = document.createElement('select');
      select.className = 'filter-select';
      select.style.width = '100%';
      pantheons.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = prettyPantheon(p);
        select.appendChild(opt);
      });
      content.appendChild(select);

      var actions = el('div', 'modal-actions');
      var confirm = el('button', 'btn primary', 'Open for ' + def.cost + ' ✦');
      confirm.addEventListener('click', function () {
        closeModal();
        openPack(def, select.value);
      });
      var cancel = el('button', 'btn secondary', 'Cancel');
      cancel.addEventListener('click', closeModal);
      actions.appendChild(confirm);
      actions.appendChild(cancel);
      content.appendChild(actions);
    });
  }

  function openPack(def, pantheon) {
    if (save.ink < def.cost) {
      showToast('Not enough Ink — win battles to earn more.');
      return;
    }
    save.ink -= def.cost;
    save.stats.packsOpened++;
    packResults = drawPackCards(def, pantheon);
    packResults.forEach(function (c) {
      save.collection[c.id] = (save.collection[c.id] || 0) + 1;
    });
    persist();
    renderCurrencies();
    renderPackShop();

    // Brief seal animation, then the reveal.
    var stage = $('pack-stage');
    var reveal = $('pack-reveal');
    reveal.replaceChildren();
    if (packActions) {
      packActions.remove();
      packActions = null;
    }
    stage.hidden = false;
    setTimeout(function () {
      stage.hidden = true;
      packResults.forEach(function (c, i) {
        var wrap = el('div', 'reveal-card');
        wrap.style.animationDelay = i * 0.15 + 's';
        wrap.appendChild(buildCardEl(c));
        reveal.appendChild(wrap);
      });
      var done = el('div', 'pack-reveal-actions');
      var btn = el('button', 'btn secondary', 'Collect');
      btn.addEventListener('click', function () {
        reveal.replaceChildren();
        done.remove();
        if (packActions === done) packActions = null;
        renderCollection();
      });
      done.appendChild(btn);
      reveal.parentNode.appendChild(done);
      packActions = done;
    }, 700);
  }

  /* ── Deck editor ─────────────────────────────────────────────────────── */

  function deckCount(id) {
    var n = 0;
    for (var i = 0; i < save.deck.length; i++) if (save.deck[i] === id) n++;
    return n;
  }

  function renderDeckEditor() {
    var pool = $('deck-pool-grid');
    pool.replaceChildren();
    var query = ui.deckSearch.toLowerCase();
    cards
      .filter(function (c) {
        if (!save.collection[c.id]) return false;
        if (query && c.name.toLowerCase().indexOf(query) === -1 && (c.ascii || '').indexOf(query) === -1) return false;
        return true;
      })
      .sort(function (a, b) {
        return a.cost - b.cost || a.name.localeCompare(b.name);
      })
      .forEach(function (c) {
        var inDeck = deckCount(c.id);
        var cap = Math.min(save.collection[c.id], Engine.RULES.MAX_COPIES);
        var maxed = inDeck >= cap || save.deck.length >= Engine.RULES.DECK_SIZE;
        var row = el('div', 'pool-row' + (maxed ? ' maxed' : ''));
        row.appendChild(el('span', 'pool-cost', String(c.cost)));
        row.appendChild(el('span', 'pool-name', c.name));
        row.appendChild(el('span', 'pool-meta', c.rarity + ' · ' + inDeck + '/' + cap));
        if (!maxed) {
          row.addEventListener('click', function () {
            save.deck.push(c.id);
            persist();
            renderDeckEditor();
          });
        }
        pool.appendChild(row);
      });

    var slots = $('deck-slots');
    slots.replaceChildren();
    if (save.deck.length === 0) {
      slots.appendChild(el('div', 'deck-empty', 'Your deck is empty — click cards on the left, or Auto-Build.'));
    } else {
      var grouped = {};
      save.deck.forEach(function (id) {
        grouped[id] = (grouped[id] || 0) + 1;
      });
      Object.keys(grouped)
        .map(function (id) {
          return byId[id];
        })
        .filter(Boolean)
        .sort(function (a, b) {
          return a.cost - b.cost || a.name.localeCompare(b.name);
        })
        .forEach(function (c) {
          var row = el('div', 'deck-slot');
          row.appendChild(el('span', 'slot-cost', String(c.cost)));
          row.appendChild(el('span', 'slot-name', c.name));
          row.appendChild(el('span', 'slot-count', '×' + grouped[c.id]));
          row.title = 'Click to remove one copy';
          row.addEventListener('click', function () {
            var idx = save.deck.indexOf(c.id);
            if (idx !== -1) save.deck.splice(idx, 1);
            persist();
            renderDeckEditor();
          });
          slots.appendChild(row);
        });
    }

    $('deck-size').textContent = save.deck.length + ' / ' + Engine.RULES.DECK_SIZE;
    $('start-battle').disabled = save.deck.length !== Engine.RULES.DECK_SIZE;
  }

  function autoBuild() {
    var physical = [];
    Object.keys(save.collection).forEach(function (id) {
      var copies = Math.min(save.collection[id], Engine.RULES.MAX_COPIES);
      for (var i = 0; i < copies; i++) {
        if (byId[id]) physical.push(byId[id]);
      }
    });
    if (physical.length < Engine.RULES.DECK_SIZE) {
      showToast('Not enough cards to auto-build — open more packs first.');
      return;
    }
    var built = Engine.autoBuildDeck(physical, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    save.deck = built.map(function (c) {
      return c.id;
    });
    persist();
    renderDeckEditor();
    showToast('The Oracle has assembled a 30-card deck for you.');
  }

  /* ── Battle ──────────────────────────────────────────────────────────── */

  function startBattle() {
    var playerDeck = save.deck.map(function (id) {
      return Engine.toBattleCard(byId[id]);
    });
    var seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    var aiDeck = Engine.autoBuildDeck(cards, seed ^ 0x5bd1e995);
    battle = Engine.createGame({ playerDeck: playerDeck, aiDeck: aiDeck, seed: seed });
    ui.pendingPlay = null;
    ui.selectedAttacker = null;
    ui.aiThinking = false;
    $('deck-select').hidden = true;
    $('battlefield-wrap').hidden = false;
    $('reward-overlay').hidden = true;
    renderBattle();
  }

  function exitToDeck() {
    battle = null;
    ui.pendingPlay = null;
    ui.selectedAttacker = null;
    $('battlefield-wrap').hidden = true;
    $('reward-overlay').hidden = true;
    $('deck-select').hidden = false;
    renderDeckEditor();
  }

  function buildMinionEl(cardLike) {
    // cardLike: battle card def or board minion — both carry name/art fields.
    var def = cardLike.def || cardLike;
    if (def.art && def.art.mascot) {
      var img = document.createElement('img');
      img.src = def.art.mascot;
      img.alt = def.name;
      img.loading = 'lazy';
      return img;
    }
    return el('span', null, def.categoryIcon || '✦');
  }

  function renderBoardMinion(m, playerIdx, legal) {
    var node = el('div', 'minion');
    var isMine = playerIdx === 0;
    var ready =
      isMine &&
      battle.activePlayer === 0 &&
      !battle.winner &&
      legal.attacks.some(function (a) {
        return a.attackerIndex === battle.players[0].board.indexOf(m);
      });

    if (m.sick) node.classList.add('sick');
    if (ready) node.classList.add('ready');
    if (ui.selectedAttacker != null && isMine && battle.players[0].board[ui.selectedAttacker] === m) {
      node.classList.add('selected');
    }
    if (ui.pendingPlay && ((ui.pendingPlay.targetSide === 'enemy') !== isMine)) {
      node.classList.add('targetable');
    }
    if (ui.selectedAttacker != null && !isMine) {
      node.classList.add('targetable');
    }

    var art = el('div', 'minion-art');
    art.appendChild(buildMinionEl(m));
    node.appendChild(art);
    node.appendChild(el('div', 'minion-name', m.name));

    var stats = el('div', 'minion-stats');
    stats.appendChild(el('span', 'atk', String(Engine.effectivePower(battle, playerIdx, m))));
    var hp = el('span', 'hp' + (m.health < m.maxHealth ? ' damaged' : ''), String(m.health + m.shield));
    if (m.shield > 0) hp.title = m.health + ' health + ' + m.shield + ' shield';
    stats.appendChild(hp);
    node.appendChild(stats);

    if (m.shield > 0 || m.stunned > 0 || m.confused > 0) {
      var status = el('div', 'minion-status');
      if (m.shield > 0) status.appendChild(el('span', 'badge', '⛨'));
      if (m.stunned > 0) status.appendChild(el('span', 'badge', '💫'));
      if (m.confused > 0) status.appendChild(el('span', 'badge', '❓'));
      node.appendChild(status);
    }

    node.addEventListener('click', function () {
      onMinionClick(m, playerIdx);
    });
    return node;
  }

  function onMinionClick(m, playerIdx) {
    if (!battle || battle.winner || ui.aiThinking) return;
    var isMine = playerIdx === 0;
    var board = battle.players[playerIdx].board;
    var index = board.indexOf(m);

    // Resolving a targeted card play?
    if (ui.pendingPlay) {
      var side = ui.pendingPlay.targetSide;
      if ((side === 'enemy') !== isMine) {
        var target = side === 'enemy' ? index : { side: 'ally', index: index };
        Engine.playCard(battle, ui.pendingPlay.handIndex, target);
        ui.pendingPlay = null;
        afterPlayerAction();
        return;
      }
    }

    // Resolving an attack on an enemy minion?
    if (ui.selectedAttacker != null && !isMine) {
      Engine.attack(battle, ui.selectedAttacker, index);
      ui.selectedAttacker = null;
      afterPlayerAction();
      return;
    }

    // Selecting one of my ready minions as an attacker.
    if (isMine && battle.activePlayer === 0) {
      ui.pendingPlay = null;
      ui.selectedAttacker = ui.selectedAttacker === index ? null : index;
      renderBattle();
    }
  }

  function onHandClick(index) {
    if (!battle || battle.winner || ui.aiThinking || battle.activePlayer !== 0) return;
    var player = battle.players[0];
    var card = player.hand[index];
    if (!card) return;

    if (ui.pendingPlay && ui.pendingPlay.handIndex === index) {
      ui.pendingPlay = null; // tap again to cancel
      renderBattle();
      return;
    }
    if (card.cost > player.ink || player.board.length >= Engine.RULES.BOARD_LIMIT) return;

    var legal = Engine.getLegalActions(battle);
    var play = null;
    for (var i = 0; i < legal.plays.length; i++) {
      if (legal.plays[i].handIndex === index) {
        play = legal.plays[i];
        break;
      }
    }
    if (!play) return;

    ui.selectedAttacker = null;
    if (play.needsTarget) {
      ui.pendingPlay = { handIndex: index, targetSide: play.targetSide };
      renderBattle();
      showToast(play.targetSide === 'enemy' ? 'Choose an enemy minion.' : 'Choose a friendly minion.');
      return;
    }
    Engine.playCard(battle, index);
    afterPlayerAction();
  }

  function afterPlayerAction() {
    renderBattle();
    if (battle.winner !== null) finishBattle();
  }

  function onEndTurn() {
    if (!battle || battle.winner || ui.aiThinking || battle.activePlayer !== 0) return;
    ui.pendingPlay = null;
    ui.selectedAttacker = null;
    ui.aiThinking = true;
    Engine.endTurn(battle);
    renderBattle();
    setTimeout(function () {
      Engine.runAiTurn(battle);
      ui.aiThinking = false;
      renderBattle();
      if (battle.winner !== null) finishBattle();
    }, 600);
  }

  function finishBattle() {
    var outcome = battle.winner === 'draw' ? 'draw' : battle.winner === 0 ? 'win' : 'loss';
    var reward = REWARDS[outcome];
    save.ink += reward;
    if (outcome === 'win') save.stats.wins++;
    else if (outcome === 'loss') save.stats.losses++;
    else save.stats.draws++;
    persist();
    renderCurrencies();

    var overlay = $('reward-overlay');
    var content = $('reward-content');
    content.replaceChildren();
    var titles = { win: 'Victory', loss: 'Defeat', draw: 'A Storied Draw' };
    content.appendChild(el('h2', 'reward-title ' + outcome, titles[outcome]));
    var amount = el('p', 'reward-amount');
    amount.appendChild(document.createTextNode('The archive pays you '));
    amount.appendChild(el('strong', null, '+' + reward + ' ✦ Ink'));
    content.appendChild(amount);
    content.appendChild(
      el('p', 'modal-sub', 'Record: ' + save.stats.wins + 'W · ' + save.stats.losses + 'L · ' + save.stats.draws + 'D')
    );
    var actions = el('div', 'reward-actions');
    var rematch = el('button', 'btn primary', 'Rematch');
    rematch.addEventListener('click', startBattle);
    var edit = el('button', 'btn secondary', 'Edit Deck');
    edit.addEventListener('click', exitToDeck);
    actions.appendChild(rematch);
    actions.appendChild(edit);
    content.appendChild(actions);
    overlay.hidden = false;
  }

  function renderBattle() {
    if (!battle) return;
    var me = battle.players[0];
    var foe = battle.players[1];
    var legal = Engine.getLegalActions(battle);

    $('player-health').textContent = String(me.hero.hp);
    $('enemy-health').textContent = String(foe.hero.hp);
    $('player-deck').textContent = String(me.deck.length);
    $('enemy-deck').textContent = String(foe.deck.length);
    $('enemy-hand').textContent = String(foe.hand.length);

    var pips = $('ink-pips');
    pips.replaceChildren();
    for (var i = 0; i < me.maxInk; i++) {
      pips.appendChild(el('span', 'pip' + (i < me.ink ? ' full' : '')));
    }
    pips.appendChild(el('span', 'ink-num', me.ink + '/' + me.maxInk));

    var banner = $('turn-banner');
    if (battle.winner === 0) banner.textContent = 'Victory';
    else if (battle.winner === 1) banner.textContent = 'Defeat';
    else if (battle.winner === 'draw') banner.textContent = 'Draw';
    else banner.textContent = battle.activePlayer === 0 ? 'Your Turn' : "Oracle's Turn";
    banner.classList.toggle('enemy-turn', battle.winner === null && battle.activePlayer !== 0);

    var enemyBoard = $('enemy-board');
    enemyBoard.replaceChildren();
    foe.board.forEach(function (m) {
      enemyBoard.appendChild(renderBoardMinion(m, 1, legal));
    });
    var playerBoard = $('player-board');
    playerBoard.replaceChildren();
    me.board.forEach(function (m) {
      playerBoard.appendChild(renderBoardMinion(m, 0, legal));
    });

    var enemyHero = $('enemy-hero-card');
    enemyHero.classList.toggle('targetable', ui.selectedAttacker != null && !battle.winner);

    var hand = $('player-hand');
    hand.replaceChildren();
    me.hand.forEach(function (card, index) {
      var playable =
        !battle.winner &&
        battle.activePlayer === 0 &&
        !ui.aiThinking &&
        card.cost <= me.ink &&
        me.board.length < Engine.RULES.BOARD_LIMIT;
      var node = el('div', 'hand-card ' + (playable ? 'playable' : 'unplayable'));
      if (ui.pendingPlay && ui.pendingPlay.handIndex === index) node.classList.add('selected');
      node.appendChild(el('span', 'hand-cost', String(card.cost)));
      var art = el('div', 'minion-art');
      art.appendChild(buildMinionEl(card));
      node.appendChild(art);
      node.appendChild(el('div', 'hand-name', card.name));
      node.appendChild(el('div', 'hand-stats', card.power + ' / ' + card.health + ' · ≫' + card.speed));
      node.addEventListener('click', function () {
        onHandClick(index);
      });
      hand.appendChild(node);
    });

    $('end-turn').disabled = battle.winner !== null || battle.activePlayer !== 0 || ui.aiThinking;

    var log = $('game-log');
    log.replaceChildren();
    battle.log.slice(-40).forEach(function (entry) {
      log.appendChild(el('div', 'log-entry log-' + entry.type, entry.text));
    });
    log.scrollTop = log.scrollHeight;
  }

  /* ── Navigation ──────────────────────────────────────────────────────── */

  function showSection(name) {
    ui.section = name;
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-section') === name);
    });
    document.querySelectorAll('.game-section').forEach(function (section) {
      section.classList.toggle('active', section.id === name);
    });
    if (name === 'lobby') renderLobby();
    if (name === 'collection') renderCollection();
    if (name === 'packs') renderPackShop();
    if (name === 'battle' && !battle) renderDeckEditor();
  }

  /* ── Init ────────────────────────────────────────────────────────────── */

  function wireEvents() {
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        showSection(tab.getAttribute('data-section'));
      });
    });
    $('lobby-battle-btn').addEventListener('click', function () {
      showSection('battle');
    });
    $('lobby-packs-btn').addEventListener('click', function () {
      showSection('packs');
    });

    var searchTimer = null;
    $('collection-search').addEventListener('input', function (ev) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        ui.search = ev.target.value.trim();
        renderCollection();
      }, 150);
    });
    $('collection-pantheon').addEventListener('change', function (ev) {
      ui.pantheon = ev.target.value;
      renderCollection();
    });

    $('deck-search').addEventListener('input', function (ev) {
      ui.deckSearch = ev.target.value.trim();
      renderDeckEditor();
    });
    $('auto-build').addEventListener('click', autoBuild);
    $('clear-deck').addEventListener('click', function () {
      save.deck = [];
      persist();
      renderDeckEditor();
    });
    $('start-battle').addEventListener('click', startBattle);
    $('end-turn').addEventListener('click', onEndTurn);
    $('concede').addEventListener('click', function () {
      if (!battle || battle.winner) return;
      openModal(function (content) {
        content.appendChild(el('h2', 'modal-title', 'Concede the duel?'));
        content.appendChild(el('p', 'modal-sub', 'The Oracle keeps the field. You still earn ' + REWARDS.loss + ' ✦.'));
        var actions = el('div', 'modal-actions');
        var yes = el('button', 'btn primary', 'Concede');
        yes.addEventListener('click', function () {
          closeModal();
          battle.winner = 1;
          renderBattle();
          finishBattle();
        });
        var no = el('button', 'btn secondary', 'Fight on');
        no.addEventListener('click', closeModal);
        actions.appendChild(yes);
        actions.appendChild(no);
        content.appendChild(actions);
      });
    });

    $('modal-overlay').addEventListener('click', function (ev) {
      if (ev.target === $('modal-overlay')) closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        closeModal();
        if (battle && (ui.pendingPlay || ui.selectedAttacker != null)) {
          ui.pendingPlay = null;
          ui.selectedAttacker = null;
          renderBattle();
        }
      }
    });
  }

  function init(data) {
    cards = data.cards.map(function (raw) {
      var display = Engine.toBattleCard(raw);
      display.foil = !!raw.foil;
      return display;
    });
    cards.forEach(function (c) {
      byId[c.id] = c;
    });
    var seen = {};
    cards.forEach(function (c) {
      if (c.pantheon && !seen[c.pantheon]) {
        seen[c.pantheon] = true;
        pantheons.push(c.pantheon);
      }
    });
    pantheons.sort();

    save = loadSave();
    var firstVisit = !save;
    if (firstVisit) save = defaultSave();
    // Drop deck entries the player no longer owns.
    save.deck = save.deck.filter(function (id) {
      return save.collection[id];
    });
    if (firstVisit) starterGrant();
    else persist();

    wireEvents();
    renderCurrencies();
    renderPantheonSelect();
    renderLobby();
    renderPackShop();
    renderDeckEditor();
  }

  fetch('/game/cards.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(init)
    .catch(function () {
      showToast('Failed to load the First Restoration card set.');
    });
})();
