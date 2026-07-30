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
  var STARTER_UNIQUE = 26;
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

  // The Edition Ladder renamed flagship printings: {id}-standard →
  // {id}-common, {id}-original-script → {id}-secret. Migrate saved
  // collections and decks on load so no player is ever bricked by the set.
  function migrateIds(map) {
    var migrated = {};
    Object.keys(map || {}).forEach(function (id) {
      var count = map[id];
      var next = id;
      if (!byId[id]) {
        var m = id.match(/^(.+)-standard$/);
        if (m && byId[m[1] + '-common']) next = m[1] + '-common';
        else {
          var f = id.match(/^(.+)-original-script$/);
          if (f && byId[f[1] + '-secret']) next = f[1] + '-secret';
        }
      }
      migrated[next] = Math.max(migrated[next] || 0, count);
    });
    return migrated;
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.collection || !data.stats) return null;
      data.ink = Math.max(0, Math.floor(Number(data.ink) || 0));
      data.collection = migrateIds(data.collection);
      if (!Array.isArray(data.deck)) data.deck = [];
      else data.deck = migrateIds(Object.fromEntries(data.deck.map(function (id) { return [id, 1]; })));
      data.deck = Object.keys(data.deck);
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

  // First visit: 1 holo chase + commons/uncommons up to STARTER_UNIQUE unique
  // cards (plus 2 bonus copies), always enough to complete a deck after one
  // Seeker Pack. Starter printings come from the flagship commons — every
  // starter card has a face and a temple.
  function starterGrant() {
    var rand = Engine.mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
    var grant = {};

    var holos = cards.filter(function (c) {
      return c.flagship && c.edition === 'holo';
    });
    if (holos.length > 0) {
      grant[holos[Math.floor(rand() * holos.length)].id] = 1;
    }
    var commons = cards.filter(function (c) {
      return c.flagship && c.edition === 'common';
    });
    var uncommons = cards.filter(function (c) {
      return c.flagship && c.edition === 'holo';
    });
    var guard = 0;
    while (Object.keys(grant).length < STARTER_UNIQUE && guard++ < 500) {
      var pool = rand() < 0.75 ? commons : uncommons; // weighted 75 / 25
      if (pool.length === 0) continue;
      var pick = pool[Math.floor(rand() * pool.length)];
      if (!grant[pick.id]) grant[pick.id] = 1;
    }
    // Two bonus copies: the starter archive always completes a deck after
    // one Seeker Pack (26 unique + 2 copies + 5 = 30+ physical cards).
    var commonIds = commons.map(function (c) {
      return c.id;
    });
    for (var bonus = 0; bonus < 2 && commonIds.length; bonus++) {
      var dup = commonIds[Math.floor(rand() * commonIds.length)];
      grant[dup] = (grant[dup] || 0) + 1;
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
    // Packs print flagship editions only — every pull has a face and a temple.
    var pool = cards.filter(function (c) {
      return c.flagship && (!pantheon || c.pantheon === pantheon);
    });
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

  var INK_BUNDLES = [
    { id: 'spark', name: 'Spark of Ink', ink: 500, price: '$4.99', desc: 'Five Seeker Packs in one spark.' },
    { id: 'flare', name: 'Flare of Ink', ink: 1200, price: '$9.99', desc: 'Twelve packs — or four Mythic Packs.' },
    { id: 'inferno', name: 'Inferno of Ink', ink: 3300, price: '$19.99', desc: 'The full pantheon at once — 10% bonus included.' },
  ];

  function renderInkShop() {
    var shop = $('ink-shop');
    if (!shop) return;
    shop.replaceChildren();
    INK_BUNDLES.forEach(function (b) {
      var option = el('div', 'pack-option ink-option');
      option.appendChild(el('div', 'pack-name', b.name));
      option.appendChild(el('div', 'pack-desc', b.desc));
      option.appendChild(el('div', 'pack-cost', b.ink.toLocaleString('en-US') + ' ✦ Ink · ' + b.price));
      var btn = el('button', 'btn primary', 'Buy for ' + b.price);
      btn.addEventListener('click', function () {
        buyInk(b, btn);
      });
      option.appendChild(btn);
      shop.appendChild(option);
    });
  }

  async function buyInk(bundle, btn) {
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    try {
      var res = await fetch('/api/game/ink/checkout/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle: bundle.id }),
      });
      var data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || 'Checkout failed');
    } catch (err) {
      showToast(err.message || 'Checkout failed — try again.');
      btn.disabled = false;
      btn.textContent = 'Buy for ' + bundle.price;
    }
  }

  // Returning from Stripe with ?ink_session=cs_...: verify once, credit ink.
  async function redeemInkSession() {
    var params = new URLSearchParams(window.location.search);
    var sessionId = params.get('ink_session');
    if (!sessionId) return;
    try {
      var res = await fetch('/api/game/ink/redeem/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId }),
      });
      var data = await res.json();
      if (data.ok && data.ink > 0) {
        save.ink += data.ink;
        persist();
        renderCurrencies();
        showToast(
          data.alreadyRedeemed
            ? 'This Ink was already credited — the Archive remembers.'
            : '+' + data.ink.toLocaleString('en-US') + ' ✦ Ink restored to your archive.'
        );
      } else {
        showToast(data.error || 'That checkout could not be verified.');
      }
    } catch (err) {
      showToast('Ink verification failed — your purchase is safe; try again shortly.');
    }
    // Clean the URL so a refresh never re-credits.
    params.delete('ink_session');
    var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState(null, '', clean);
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
    // Start is allowed with a full deck, or with a collection of 25+ physical
    // cards — the Archive completes any shortfall (see startBattle).
    $('start-battle').disabled =
      save.deck.length !== Engine.RULES.DECK_SIZE && physicalCards(save.collection) < 25;
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

  /* ── Battle FX (v2: hero panels + attack sequences) ───────────────────── */

  var fx = null; // Sequences instance, created with the battlefield
  var heroes = [null, null]; // { card, power } per side
  var fxCanvas = null;

  function heroCardFor(deck) {
    // The deck's champion: the highest-rarity lead, legendary first, then
    // highest power. Deterministic so replays and ghosts agree.
    var RANK = { legendary: 5, mythic: 6, epic: 4, rare: 3, uncommon: 2, common: 1 };
    var best = null;
    for (var i = 0; i < deck.length; i++) {
      var c = deck[i];
      if (!best) { best = c; continue; }
      var r = (RANK[c.rarity] || 1) - (RANK[best.rarity] || 1);
      if (r > 0 || (r === 0 && (c.power || 0) > (best.power || 0))) best = c;
    }
    return best;
  }

  function ensureFx() {
    if (fx) return;
    var wrap = $('battlefield-wrap');
    if (!wrap) return;
    fxCanvas = document.createElement('canvas');
    fxCanvas.id = 'battle-fx';
    fxCanvas.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(fxCanvas, wrap.firstChild);
    fx = Sequences.attach(fxCanvas);
  }

  function heroPanel(side, heroCard, power) {
    var panel = el('div', 'hero-panel side-' + side);
    panel.id = side === 1 ? 'enemy-hero-panel' : 'player-hero-panel';
    var art = el('div', 'hero-art');
    if (heroCard && heroCard.art && heroCard.art.mascot) {
      var img = document.createElement('img');
      img.src = heroCard.art.mascot;
      img.alt = heroCard.name;
      art.appendChild(img);
    } else {
      art.appendChild(el('span', 'hero-sigil', (heroCard && heroCard.categoryIcon) || '✦'));
    }
    panel.appendChild(art);
    var info = el('div', 'hero-info');
    info.appendChild(el('div', 'hero-name', heroCard ? heroCard.name : '—'));
    var hpWrap = el('div', 'hero-hpbar');
    var hpFill = el('div', 'hero-hpfill');
    hpWrap.appendChild(hpFill);
    info.appendChild(hpWrap);
    var hpText = el('div', 'hero-hptext', '30');
    info.appendChild(hpText);
    var meta = el('div', 'hero-meta');
    if (side === 1) {
      meta.appendChild(el('span', 'js-deck-count', 'Deck: 30'));
      meta.appendChild(el('span', 'js-hand-count', 'Hand: 4'));
      panel.setAttribute('role', 'button');
      panel.setAttribute('aria-label', 'Enemy champion — select one of your ready minions, then tap here to strike');
      panel.addEventListener('click', onEnemyHeroClick);
    } else {
      var pips = el('div', 'ink-pips');
      pips.id = 'ink-pips';
      pips.setAttribute('aria-label', 'Ink');
      meta.appendChild(pips);
      meta.appendChild(el('span', 'js-deck-count', 'Deck: 30'));
    }
    info.appendChild(meta);
    if (side === 0 && power) {
      var btn = el('button', 'hero-power', power.name + ' · 2✦');
      btn.type = 'button';
      btn.title = power.text;
      btn.addEventListener('click', onHeroPower);
      info.appendChild(btn);
    }
    panel.appendChild(info);
    return panel;
  }

  // Striking the enemy champion: the engine has always supported target
  // 'hero' — this is the UI path to it.
  function onEnemyHeroClick() {
    if (!battle || battle.winner || ui.aiThinking || battle.activePlayer !== 0) return;
    if (ui.selectedAttacker == null) {
      showToast('Select one of your ready minions first — then strike the champion.');
      return;
    }
    var attacker = battle.players[0].board[ui.selectedAttacker];
    var panel = heroEl(1);
    var res = withFx(attacker, panel ? function () { return centerOf(panel); } : null, function () {
      return Engine.attack(battle, ui.selectedAttacker, 'hero');
    });
    if (res && res.ok === false) showToast(res.error || 'That strike failed.');
    ui.selectedAttacker = null;
    afterPlayerAction();
  }

  function centerOf(node) {
    var r = node.getBoundingClientRect();
    var c = fxCanvas.getBoundingClientRect();
    return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
  }

  function fxSnapshot() {
    if (!battle) return null;
    return {
      hp: [battle.players[0].hero.hp, battle.players[1].hero.hp],
      boards: battle.players.map(function (p) {
        return p.board.map(function (m) { return { uid: m.uid, health: m.health, shield: m.shield, cardId: m.cardId, name: m.name }; });
      }),
    };
  }

  function heroEl(side) {
    var panels = document.querySelectorAll('.hero-panel.side-' + side);
    return panels[0];
  }

  function fxDiff(before) {
    if (!before || !battle) return;
    // Hero HP deltas → floaters + shake on the damaged side.
    for (var side = 0; side < 2; side++) {
      var delta = battle.players[side].hero.hp - before.hp[side];
      if (delta !== 0) {
        var panel = heroEl(side);
        if (panel) {
          var pos = centerOf(panel);
          fx.floatText({ x: pos.x, y: pos.y - 20, text: (delta > 0 ? '+' : '') + delta, kind: delta > 0 ? 'heal' : 'damage', size: 26 });
        }
        if (delta < 0) fx.shake(Math.min(10, 3 + Math.abs(delta)));
      }
    }
    // Minion deaths.
    for (var p = 0; p < 2; p++) {
      var after = {};
      battle.players[p].board.forEach(function (m) { after[m.uid] = true; });
      before.boards[p].forEach(function (m) {
        if (!after[m.uid]) {
          var node = fxCanvas.parentElement.querySelector('.minion[data-uid="' + m.uid + '"]');
          var pos = node ? centerOf(node) : centerOf(heroEl(p));
          fx.floatText({ x: pos.x, y: pos.y, text: '☠', kind: 'damage', size: 22 });
        }
      });
    }
    // Minion health deltas (non-fatal hits & heals) → small floaters.
    for (var q = 0; q < 2; q++) {
      var afterMap = {};
      battle.players[q].board.forEach(function (m) { afterMap[m.uid] = m.health + m.shield; });
      before.boards[q].forEach(function (m) {
        var afterVal = afterMap[m.uid];
        if (afterVal == null) return; // death handled above
        var beforeVal = m.health + m.shield;
        var d = afterVal - beforeVal;
        if (d !== 0) {
          var n = fxCanvas.parentElement.querySelector('.minion[data-uid="' + m.uid + '"]');
          if (n) {
            var pp = centerOf(n);
            fx.floatText({ x: pp.x, y: pp.y - 14, text: (d > 0 ? '+' : '') + d, kind: d > 0 ? 'heal' : 'damage', size: 18 });
          }
        }
      });
    }
  }

  // withFx(attackerCard, getTargetPos, action) — runs the action with a
  // before/after diff and plays the archetype sequence between them.
  function withFx(attackerCard, getTargetPos, action) {
    if (!fx) return action();
    var before = fxSnapshot();
    var targetPos = getTargetPos ? getTargetPos() : null;
    var fromPos = null;
    if (attackerCard && attackerCard.uid != null) {
      var node = fxCanvas.parentElement.querySelector('.minion[data-uid="' + attackerCard.uid + '"]');
      if (node) fromPos = centerOf(node);
    }
    if (!fromPos) fromPos = centerOf(heroEl(0)) || { x: 60, y: 60 };
    var result = action();
    if (targetPos) {
      fx.attack({
        archetype: Sequences.archetypeFor(attackerCard || {}),
        from: fromPos,
        to: targetPos,
        colors: (attackerCard && attackerCard.art && attackerCard.art.colors) || {},
        power: attackerCard ? attackerCard.power || 4 : 4,
        onImpact: function () { fxDiff(before); },
      });
      // Fallback if the sequence is reduced-motion: resolve diff immediately.
      fxDiff(before);
    } else {
      fxDiff(before);
    }
    return result;
  }

  function onHeroPower() {
    if (!battle || battle.winner || ui.aiThinking || battle.activePlayer !== 0) return;
    var power = heroes[0] && heroes[0].power;
    if (!power) return;
    var heroCard = heroes[0] && heroes[0].card;
    var targetPanel = heroEl(1);
    withFx(heroCard, targetPanel ? function () { return centerOf(targetPanel); } : null, function () {
      return Engine.useHeroPower(battle, power);
    });
    afterPlayerAction();
  }


  function physicalCards(collection) {
    var total = 0;
    Object.keys(collection || {}).forEach(function (id) {
      total += Math.min(collection[id], Engine.RULES.MAX_COPIES);
    });
    return total;
  }

  function startBattle() {
    var deckIds = save.deck.slice();
    // Backstop: a player who can't quite finish a deck never hits a wall —
    // auto-build from their collection, then let the Archive lend the rest.
    if (deckIds.length < Engine.RULES.DECK_SIZE) {
      var physical = [];
      Object.keys(save.collection).forEach(function (id) {
        if (!byId[id]) return;
        var copies = Math.min(save.collection[id], Engine.RULES.MAX_COPIES);
        for (var i = 0; i < copies; i++) physical.push(byId[id]);
      });
      if (physical.length >= 25) {
        var built = Engine.autoBuildDeck(physical, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
        deckIds = built.map(function (c) {
          return c.id;
        });
      }
      var flagshipCommons = cards.filter(function (c) {
        return c.flagship && c.edition === 'common' && deckIds.indexOf(c.id) === -1;
      });
      var fi = 0;
      while (deckIds.length < Engine.RULES.DECK_SIZE && fi < flagshipCommons.length) {
        deckIds.push(flagshipCommons[fi++].id);
      }
    }

    var playerDeck = deckIds
      .filter(function (id) {
        if (!byId[id]) {
          console.warn('[DUEL] dropping unknown card id from the battle deck:', id);
          return false;
        }
        return true;
      })
      .map(function (id) {
        return Engine.toBattleCard(byId[id]);
      });
    var seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    // The Archive fields printings a new player could actually own — flagship
    // commons and holos. Full-art and secret printings (+5/+5, upgraded
    // abilities) stay out of the AI pool so a starter archive always faces a
    // fair curve.
    var aiPool = cards.filter(function (c) {
      return c.flagship && (c.edition === 'common' || c.edition === 'holo');
    });
    var aiDeck = Engine.autoBuildDeck(aiPool, seed ^ 0x5bd1e995);
    battle = Engine.createGame({ playerDeck: playerDeck, aiDeck: aiDeck, seed: seed });
    ui.pendingPlay = null;
    ui.selectedAttacker = null;
    ui.aiThinking = false;

    // v2: champions, hero panels, and the spectacle layer.
    var myChampion = heroCardFor(playerDeck);
    var aiChampion = heroCardFor(aiDeck);
    heroes = [
      { card: myChampion, power: myChampion ? HeroPowers.forPantheon(myChampion.pantheon) : null },
      { card: aiChampion, power: aiChampion ? HeroPowers.forPantheon(aiChampion.pantheon) : null },
    ];
    $('deck-select').hidden = true;
    $('battlefield-wrap').hidden = false;
    $('reward-overlay').hidden = true;
    ensureFx();
    var wrap = $('battlefield-wrap');
    wrap.querySelectorAll('.hero-panel').forEach(function (n) { n.remove(); });
    var board = wrap.querySelector('.battlefield');
    wrap.insertBefore(heroPanel(1, heroes[1].card, heroes[1].power), board);
    board.after(heroPanel(0, heroes[0].card, heroes[0].power));
    if (fx) fx.banner('The duel begins', (heroes[0].card ? heroes[0].card.name : 'You') + ' vs ' + (heroes[1].card ? heroes[1].card.name : 'the Archive'));
    renderBattle();

    // First-battle coaching: the three ideas a new commander needs, once.
    if (!save.coachSeen) {
      save.coachSeen = true;
      persist();
      setTimeout(function () { showToast('Tap a glowing card in your hand to play it.'); }, 1400);
      setTimeout(function () { showToast('Tap your minion, then tap an enemy — minion or champion — to attack.'); }, 3900);
      setTimeout(function () { showToast('Freshly played minions recover for one turn before they can strike.'); }, 6800);
    }
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
    node.dataset.uid = String(m.uid);
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
        var playedCard = battle.players[0].hand[ui.pendingPlay.handIndex];
        withFx(playedCard, function () { return centerOf(node); }, function () {
          return Engine.playCard(battle, ui.pendingPlay.handIndex, target);
        });
        ui.pendingPlay = null;
        afterPlayerAction();
        return;
      }
    }

    // Resolving an attack on an enemy minion?
    if (ui.selectedAttacker != null && !isMine) {
      var attacker = battle.players[0].board[ui.selectedAttacker];
      var res = withFx(attacker, function () { return centerOf(node); }, function () {
        return Engine.attack(battle, ui.selectedAttacker, index);
      });
      if (res && res.ok === false) showToast(res.error || 'That strike failed.');
      ui.selectedAttacker = null;
      afterPlayerAction();
      return;
    }

    // Selecting one of my ready minions as an attacker.
    if (isMine && battle.activePlayer === 0) {
      var legal = Engine.getLegalActions(battle);
      var canFight = legal.attacks.some(function (a) {
        return a.attackerIndex === index;
      });
      if (!canFight) {
        // Never fail silently — say exactly why this minion cannot strike.
        var reason = m.sick
          ? m.name + ' is recovering — it can strike next turn.'
          : m.stunned > 0
            ? m.name + ' is stunned.'
            : m.attacksUsed
              ? m.name + ' has already struck this turn.'
              : m.name + ' cannot attack right now.';
        showToast(reason);
        return;
      }
      ui.pendingPlay = null;
      ui.selectedAttacker = ui.selectedAttacker === index ? null : index;
      if (ui.selectedAttacker != null) {
        showToast('Now tap an enemy minion — or their champion — to strike.');
      }
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
    withFx(card, function () {
      var played = battle.players[0].board[battle.players[0].board.length - 1];
      var n = played ? fxCanvas.parentElement.querySelector('.minion[data-uid="' + played.uid + '"]') : null;
      return n ? centerOf(n) : centerOf(heroEl(0));
    }, function () {
      return Engine.playCard(battle, index);
    });
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
    if (fx) fx.banner('Enemy turn', 'The Archive answers…');
    renderBattle();
    setTimeout(function () {
      var before = fxSnapshot();
      var logMark = battle.log.length;
      Engine.runAiTurn(battle);
      ui.aiThinking = false;
      var newEntries = battle.log.slice(logMark).filter(function (e) {
        return e.player === 1;
      });
      if (fx) {
        replayAiStrikes(newEntries, before);
        fx.banner('Your turn', 'Command your pantheon.');
      }
      renderBattle();
      if (battle.winner !== null) finishBattle();
    }, 600);
  }

  // The AI's turn resolves in one engine pass — replay its strikes as visible
  // sequences so the enemy turn never feels like the board teleported.
  function replayAiStrikes(entries, before) {
    var strikes = entries.filter(function (e) {
      return e.type === 'attack';
    });
    strikes.forEach(function (entry, i) {
      setTimeout(function () {
        if (!fxCanvas) return;
        var face = entry.text.indexOf('strikes the enemy hero') !== -1;
        var fromNode =
          fxCanvas.parentElement.querySelector('#enemy-board .minion') || heroEl(1);
        var toNode = face
          ? heroEl(0)
          : fxCanvas.parentElement.querySelector('#player-board .minion') || heroEl(0);
        if (!fromNode || !toNode) return;
        var card = null;
        for (var k = 0; k < cards.length; k++) {
          if (entry.text.indexOf(cards[k].name) === 0) {
            card = cards[k];
            break;
          }
        }
        fx.attack({
          archetype: Sequences.archetypeFor(card || {}),
          from: centerOf(fromNode),
          to: centerOf(toNode),
          colors: (card && card.art && card.art.colors) || {},
          power: card ? card.power || 4 : 4,
          onImpact: function () {},
        });
      }, 420 * i);
    });
    setTimeout(
      function () {
        fxDiff(before);
      },
      420 * strikes.length + 120
    );
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

    if (fx) {
      var titles2 = { win: 'VICTORY', loss: 'Defeat', draw: 'A Storied Draw' };
      fx.banner(
        titles2[outcome],
        outcome === 'win' ? 'The archive yields ' + reward + ' ✦ Ink' : 'The pantheon remembers.'
      );
    }

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

    // v2 hero panels: animated HP bars, deck/hand counts, hero-power state.
    for (var side = 0; side < 2; side++) {
      var panel = heroEl(side);
      if (panel) {
        var hero = battle.players[side].hero;
        var fill = panel.querySelector('.hero-hpfill');
        var text = panel.querySelector('.hero-hptext');
        if (fill) {
          var pct = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
          fill.style.width = (pct * 100).toFixed(1) + '%';
          fill.classList.toggle('low', pct <= 0.3);
        }
        if (text) text.textContent = hero.hp + ' / ' + hero.maxHp;
        var deckCount = panel.querySelector('.js-deck-count');
        if (deckCount) deckCount.textContent = 'Deck: ' + battle.players[side].deck.length;
        var handCount = panel.querySelector('.js-hand-count');
        if (handCount) handCount.textContent = 'Hand: ' + battle.players[side].hand.length;
        if (side === 1) {
          panel.classList.toggle('targetable', ui.selectedAttacker != null && !battle.winner);
        }
        if (side === 0) {
          var powerBtn = panel.querySelector('.hero-power');
          if (powerBtn) {
            var usable =
              !battle.winner &&
              battle.activePlayer === 0 &&
              !me.heroPowerUsed &&
              me.ink >= Engine.RULES.HERO_POWER_COST &&
              !ui.aiThinking;
            powerBtn.disabled = !usable;
            powerBtn.classList.toggle('usable', usable);
            powerBtn.classList.toggle('used', Boolean(me.heroPowerUsed));
          }
        }
      }
    }

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
      display.edition = raw.edition || 'common';
      display.baseCardId = raw.baseCardId || null;
      display.patternFoil = raw.patternFoil || null;
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
    renderInkShop();
    renderDeckEditor();
    redeemInkSession();
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
