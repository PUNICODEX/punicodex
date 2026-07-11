/**
 * PÚNYCODEX — Mythic Duel client
 *
 * Handles navigation, collection, deck building, pack opening, and battle.
 */

(function () {
  'use strict';

  const MAX_MANA = 10;
  const HERO_HEALTH = 30;
  const STARTING_HAND = 3;
  const DECK_SIZE = 30;

  // ── State ─────────────────────────────────────────────────────────────────
  let allCards = [];
  let collection = loadCollection();
  let deck = loadDeck();
  let playerCurrencies = loadCurrencies();
  let state = null;

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function el(id) {
    return document.getElementById(id);
  }

  function create(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function loadCollection() {
    try {
      const raw = localStorage.getItem('punycodex_collection');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveCollection() {
    localStorage.setItem('punycodex_collection', JSON.stringify(collection));
  }

  function loadDeck() {
    try {
      const raw = localStorage.getItem('punycodex_deck');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveDeck() {
    localStorage.setItem('punycodex_deck', JSON.stringify(deck));
  }

  function loadCurrencies() {
    try {
      const raw = localStorage.getItem('punycodex_currencies');
      return raw ? JSON.parse(raw) : { ink: 500, dust: 0, gold: 0 };
    } catch {
      return { ink: 500, dust: 0, gold: 0 };
    }
  }

  function saveCurrencies() {
    localStorage.setItem('punycodex_currencies', JSON.stringify(playerCurrencies));
  }

  function grantStartingCollection() {
    if (Object.keys(collection).length > 0) return;
    const starter = shuffle(allCards).slice(0, 15);
    starter.forEach((card) => {
      addCardToCollection(card);
    });
    saveCollection();
  }

  function addCardToCollection(card) {
    collection[card.id] = (collection[card.id] || 0) + 1;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function initNavigation() {
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const section = tab.dataset.section;
        document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.game-section').forEach((s) => s.classList.remove('active'));
        tab.classList.add('active');
        el(section).classList.add('active');
        onSectionShown(section);
      });
    });
  }

  function onSectionShown(section) {
    if (section === 'collection') renderCollection();
    if (section === 'deck') renderDeckBuilder();
    if (section === 'packs') resetPackView();
  }

  // ── Currency display ──────────────────────────────────────────────────────
  function updateCurrencies() {
    el('ink-count').textContent = playerCurrencies.ink;
    el('dust-count').textContent = playerCurrencies.dust;
    el('gold-count').textContent = playerCurrencies.gold;
  }

  // ── Card rendering ────────────────────────────────────────────────────────
  function renderCard(card, options = {}) {
    const node = create('div', `card ${card.rarity}`);
    node.dataset.cardId = card.id;
    node.dataset.entryId = card.entryId;

    const style = CardGameData.pantheonStyle(card.pantheon);
    node.style.setProperty('--pantheon-hue', style.hue);

    const glow = create('div', 'card-glow');
    node.appendChild(glow);

    const frame = create('div', 'card-frame');
    node.appendChild(frame);

    const topBar = create('div', 'card-top-bar');
    const cost = create('span', 'cost-badge', String(card.cost));
    const catIcon = create('span', 'category-icon', card.categoryIcon);
    topBar.appendChild(cost);
    topBar.appendChild(catIcon);
    node.appendChild(topBar);

    const rarityStamp = create('span', 'rarity-stamp', card.rarity);
    node.appendChild(rarityStamp);

    const art = create('div', 'card-art');
    const mascot = create('div', 'mascot-placeholder', card.categoryIcon);
    art.appendChild(mascot);
    node.appendChild(art);

    const info = create('div', 'card-info');
    const name = create('h4', 'card-name', card.name);
    const meta = create('div', 'card-meta');
    meta.appendChild(create('span', '', card.categoryLabel));
    meta.appendChild(create('span', '', card.pantheon));
    info.appendChild(name);
    info.appendChild(meta);
    if (card.artist) {
      const artist = create('div', '', `Art: ${card.artist}`);
      artist.style.fontSize = '0.6rem';
      artist.style.color = 'var(--accent)';
      artist.style.marginTop = '0.2rem';
      info.appendChild(artist);
    }
    node.appendChild(info);

    const stats = create('div', 'card-stats');
    stats.appendChild(createStat('power', 'PWR', card.power));
    stats.appendChild(createStat('health', 'HP', card.health));
    stats.appendChild(createStat('speed', 'SPD', card.speed));
    node.appendChild(stats);

    if (!options.noClick) {
      node.addEventListener('click', () => showCardModal(card));
    }

    return node;
  }

  function createStat(key, label, value) {
    const stat = create('div', `stat ${key}`);
    stat.appendChild(create('span', 'stat-value', String(value)));
    stat.appendChild(create('span', 'stat-label', label));
    return stat;
  }

  function renderCollection() {
    const grid = el('collection-grid');
    grid.innerHTML = '';

    const ownedCards = allCards.filter((c) => collection[c.id]);
    if (ownedCards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">✦</div>
          <h3>Your collection is empty</h3>
          <p>Open packs to discover your first cards.</p>
        </div>
      `;
      return;
    }

    const filtered = filterCards(ownedCards, {
      search: el('collection-search').value,
      categories: getActiveFilters('category-filters'),
      rarities: getActiveFilters('rarity-filters'),
    });

    filtered.forEach((card) => {
      const count = collection[card.id] || 1;
      const node = renderCard(card);
      if (count > 1) {
        const badge = create('span', 'cost-badge');
        badge.textContent = `×${count}`;
        badge.style.position = 'absolute';
        badge.style.top = '0.35rem';
        badge.style.left = '0.35rem';
        badge.style.zIndex = '6';
        node.appendChild(badge);
      }
      grid.appendChild(node);
    });
  }

  function filterCards(cards, filters) {
    return cards.filter((card) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          card.name.toLowerCase().includes(q) ||
          card.ascii.toLowerCase().includes(q) ||
          card.pantheon.toLowerCase().includes(q) ||
          card.domain.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(card.category)) return false;
      }
      if (filters.rarities && filters.rarities.length > 0) {
        if (!filters.rarities.includes(card.rarity)) return false;
      }
      return true;
    });
  }

  function getActiveFilters(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .filter-chip.active`)).map((c) => c.dataset.value);
  }

  function initCollectionFilters() {
    const categories = ['deity', 'concept', 'place', 'celestial', 'mineral', 'primordial'];
    const catContainer = el('category-filters');
    categories.forEach((cat) => {
      const chip = create('button', 'filter-chip', CardGameData.categoryLabel(cat));
      chip.dataset.value = cat;
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        renderCollection();
      });
      catContainer.appendChild(chip);
    });

    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const rarityContainer = el('rarity-filters');
    rarities.forEach((r) => {
      const chip = create('button', 'filter-chip', r);
      chip.dataset.value = r;
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        renderCollection();
      });
      rarityContainer.appendChild(chip);
    });

    el('collection-search').addEventListener('input', () => renderCollection());
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  function renderFeaturedCards() {
    const grid = el('featured-cards');
    grid.innerHTML = '';
    const featured = shuffle(allCards)
      .filter((c) => c.rarityOrder >= 4)
      .slice(0, 5);
    featured.forEach((card) => grid.appendChild(renderCard(card)));
  }

  // ── Deck builder ──────────────────────────────────────────────────────────
  function renderDeckBuilder() {
    const poolGrid = el('deck-pool-grid');
    poolGrid.innerHTML = '';

    const owned = allCards.filter((c) => collection[c.id]);
    const q = el('deck-search').value.toLowerCase();
    const filtered = owned.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ascii.toLowerCase().includes(q) ||
        c.pantheon.toLowerCase().includes(q)
      );
    });

    filtered.forEach((card) => {
      const node = renderCard(card);
      node.addEventListener('click', () => addToDeck(card));
      poolGrid.appendChild(node);
    });

    renderDeckSlots();
  }

  function renderDeckSlots() {
    const slots = el('deck-slots');
    slots.innerHTML = '';
    for (let i = 0; i < DECK_SIZE; i++) {
      const slot = create('div', deck[i] ? 'deck-slot filled' : 'deck-slot');
      if (deck[i]) {
        slot.textContent = deck[i].name;
        slot.title = deck[i].name;
        slot.addEventListener('click', () => removeFromDeck(i));
      } else {
        slot.textContent = '+';
      }
      slots.appendChild(slot);
    }
    el('deck-size').textContent = `${deck.length} / ${DECK_SIZE}`;
  }

  function addToDeck(card) {
    if (deck.length >= DECK_SIZE) {
      alert('Deck is full (30 cards).');
      return;
    }
    deck.push(card);
    saveDeck();
    renderDeckBuilder();
  }

  function removeFromDeck(index) {
    deck.splice(index, 1);
    saveDeck();
    renderDeckBuilder();
  }

  function initDeckBuilder() {
    el('deck-search').addEventListener('input', () => renderDeckBuilder());
    el('save-deck').addEventListener('click', () => {
      saveDeck();
      alert('Deck saved.');
    });
    el('clear-deck').addEventListener('click', () => {
      deck = [];
      saveDeck();
      renderDeckBuilder();
    });
  }

  // ── Card modal ────────────────────────────────────────────────────────────
  function showCardModal(card) {
    const modal = el('card-modal');
    const content = el('modal-content');
    content.innerHTML = '';

    const close = create('button', 'modal-close', '×');
    close.addEventListener('click', () => modal.classList.remove('active'));
    content.appendChild(close);

    const cardNode = renderCard(card, { noClick: true });
    cardNode.style.margin = '1rem auto';
    cardNode.style.maxWidth = '260px';
    content.appendChild(cardNode);

    const details = create('div', '', '');
    details.style.padding = '0 1.25rem 1.25rem';

    details.appendChild(create('h3', '', card.name));
    details.appendChild(create('p', '', `ASCII: ${card.ascii}`));
    details.appendChild(create('p', '', `Original: ${card.original}`));
    details.appendChild(create('p', '', `Domain: ${card.domain}`));
    details.appendChild(create('p', '', `Tier: ${card.tierLabel}`));

    const ability = create('div', '', '');
    ability.style.marginTop = '0.75rem';
    ability.style.padding = '0.75rem';
    ability.style.background = 'rgba(212, 175, 55, 0.08)';
    ability.style.borderRadius = '0.5rem';
    ability.appendChild(create('strong', '', card.ability.name));
    ability.appendChild(create('p', '', card.ability.description));
    details.appendChild(ability);

    const count = collection[card.id] || 0;
    details.appendChild(create('p', '', `Owned: ${count}`));

    content.appendChild(details);
    modal.classList.add('active');
  }

  el('card-modal').addEventListener('click', (e) => {
    if (e.target.id === 'card-modal') {
      el('card-modal').classList.remove('active');
    }
  });

  // ── Pack opening ──────────────────────────────────────────────────────────
  function resetPackView() {
    el('pack-stage').style.display = 'flex';
    el('pack-reveal').classList.remove('active');
    el('pack-reveal').innerHTML = '';
  }

  function openPack() {
    const cost = 100;
    if (playerCurrencies.ink < cost) {
      alert('Not enough Ink.');
      return;
    }

    playerCurrencies.ink -= cost;
    saveCurrencies();
    updateCurrencies();

    const pack = CardGameData.openPack(allCards, { size: 5 });
    pack.forEach((card) => addCardToCollection(card));
    saveCollection();

    el('pack-stage').style.display = 'none';
    const reveal = el('pack-reveal');
    reveal.innerHTML = '';
    reveal.classList.add('active');

    pack.forEach((card, i) => {
      const node = renderCard(card);
      node.style.animationDelay = `${i * 0.12}s`;
      reveal.appendChild(node);
    });

    const again = create('button', 'btn primary', 'Open Another (100 ✦)');
    again.style.marginTop = '1rem';
    again.style.width = '100%';
    again.addEventListener('click', () => {
      resetPackView();
      openPack();
    });
    reveal.appendChild(again);
  }

  function initPacks() {
    el('open-pack').addEventListener('click', openPack);
    el('pack-item').addEventListener('click', openPack);
  }

  // ── Battle ────────────────────────────────────────────────────────────────
  function createDeck() {
    const pool = deck.length >= 10 ? deck : CardGameData.starterDeck(allCards, 20);
    return shuffle(pool).map((card) => ({ ...card, instanceId: Math.random().toString(36).slice(2) }));
  }

  function drawCard(player, count = 1) {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        log(`${player.name} has no cards left to draw.`);
        return;
      }
      const card = player.deck.shift();
      player.hand.push(card);
    }
  }

  function log(message) {
    const logEl = el('game-log');
    const p = create('p', '', message);
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function initGame() {
    allCards = CardGameData.generateAllCards();
    const playerDeck = createDeck();
    const enemyDeck = createDeck();

    state = {
      turn: 1,
      playerTurn: true,
      selectedCard: null,
      player: {
        name: 'You',
        health: HERO_HEALTH,
        maxMana: 1,
        mana: 1,
        deck: playerDeck,
        hand: [],
        board: [],
      },
      enemy: {
        name: 'AI Oracle',
        health: HERO_HEALTH,
        maxMana: 1,
        mana: 1,
        deck: enemyDeck,
        hand: [],
        board: [],
      },
    };

    drawCard(state.player, STARTING_HAND);
    drawCard(state.enemy, STARTING_HAND);

    renderBattle();
    el('end-turn').disabled = false;
    log('The duel begins. Your turn.');
  }

  function renderBattle() {
    el('player-health').textContent = state.player.health;
    el('enemy-health').textContent = state.enemy.health;
    el('player-mana').textContent = state.player.mana;
    el('player-max-mana').textContent = state.player.maxMana;
    el('player-deck').textContent = state.player.deck.length;
    el('enemy-deck').textContent = state.enemy.deck.length;
    el('turn-banner').textContent = state.playerTurn ? 'Your Turn' : "Oracle's Turn";

    renderBoard('player-board', state.player.board);
    renderBoard('enemy-board', state.enemy.board);
    renderHand();
  }

  function renderBoard(containerId, board) {
    const container = el(containerId);
    container.innerHTML = '';
    board.forEach((card) => {
      const node = renderCard(card);
      node.style.width = '110px';
      if (state.playerTurn && state.player.board.includes(card)) {
        node.addEventListener('click', () => attack(card));
      }
      container.appendChild(node);
    });
  }

  function renderHand() {
    const hand = el('player-hand');
    hand.innerHTML = '';
    state.player.hand.forEach((card) => {
      const node = renderCard(card);
      node.style.width = '130px';
      if (state.playerTurn && card.cost <= state.player.mana) {
        node.style.cursor = 'pointer';
        node.addEventListener('click', () => playCard(card));
      } else {
        node.style.opacity = '0.55';
      }
      hand.appendChild(node);
    });
  }

  function playCard(card) {
    if (!state.playerTurn || card.cost > state.player.mana) return;
    state.player.mana -= card.cost;
    state.player.hand = state.player.hand.filter((c) => c.instanceId !== card.instanceId);
    state.player.board.push(card);
    log(`You played ${card.name}.`);
    renderBattle();
  }

  function attack(card) {
    if (!state.playerTurn || !state.player.board.includes(card)) return;
    const target = state.enemy.board.length ? state.enemy.board[0] : null;
    if (target) {
      target.health -= card.power;
      card.health -= target.power;
      log(`${card.name} attacks ${target.name}.`);
      if (target.health <= 0) {
        state.enemy.board = state.enemy.board.filter((c) => c.instanceId !== target.instanceId);
        log(`${target.name} is defeated.`);
      }
      if (card.health <= 0) {
        state.player.board = state.player.board.filter((c) => c.instanceId !== card.instanceId);
        log(`${card.name} is defeated.`);
      }
    } else {
      state.enemy.health -= card.power;
      log(`${card.name} attacks the Oracle for ${card.power}.`);
      if (state.enemy.health <= 0) {
        log('You win!');
        endGame();
      }
    }
    renderBattle();
  }

  function endTurn() {
    if (!state.playerTurn) return;
    state.playerTurn = false;
    renderBattle();

    setTimeout(() => {
      enemyTurn();
    }, 600);
  }

  function enemyTurn() {
    const enemy = state.enemy;
    if (enemy.maxMana < MAX_MANA) enemy.maxMana++;
    enemy.mana = enemy.maxMana;
    drawCard(enemy, 1);

    // Simple AI: play first affordable card, attack with first board card
    const playable = enemy.hand.find((c) => c.cost <= enemy.mana);
    if (playable) {
      enemy.mana -= playable.cost;
      enemy.hand = enemy.hand.filter((c) => c.instanceId !== playable.instanceId);
      enemy.board.push(playable);
      log(`Oracle played ${playable.name}.`);
    }

    const attacker = enemy.board[0];
    if (attacker) {
      const target = state.player.board.length ? state.player.board[0] : null;
      if (target) {
        target.health -= attacker.power;
        attacker.health -= target.power;
        log(`${attacker.name} attacks ${target.name}.`);
        if (target.health <= 0) {
          state.player.board = state.player.board.filter((c) => c.instanceId !== target.instanceId);
          log(`${target.name} is defeated.`);
        }
        if (attacker.health <= 0) {
          enemy.board = enemy.board.filter((c) => c.instanceId !== attacker.instanceId);
          log(`${attacker.name} is defeated.`);
        }
      } else {
        state.player.health -= attacker.power;
        log(`${attacker.name} attacks you for ${attacker.power}.`);
        if (state.player.health <= 0) {
          log('The Oracle wins.');
          endGame();
        }
      }
    } else {
      log('Oracle passes.');
    }

    state.turn++;
    state.playerTurn = true;
    if (state.player.maxMana < MAX_MANA) state.player.maxMana++;
    state.player.mana = state.player.maxMana;
    drawCard(state.player, 1);
    renderBattle();
  }

  function endGame() {
    el('end-turn').disabled = true;
  }

  function initBattle() {
    el('new-game').addEventListener('click', initGame);
    el('end-turn').addEventListener('click', endTurn);
  }

  // ── Initialization ────────────────────────────────────────────────────────
  function attachMarketplaceArt() {
    if (typeof ArtMarketplaceData === 'undefined') return;
    try {
      const gallery = ArtMarketplaceData.generateGallery(120);
      const artworkMap = {};
      gallery.forEach((art) => {
        if (!artworkMap[art.entryId]) {
          artworkMap[art.entryId] = art;
        }
      });
      allCards = CardGameData.attachArtworks(allCards, artworkMap);
    } catch (err) {
      console.warn('Failed to attach marketplace art:', err);
    }
  }

  function init() {
    if (typeof LEXICON === 'undefined' || typeof CardGameData === 'undefined') {
      document.body.innerHTML = '<p style="padding:2rem;color:#fff;">Failed to load game data.</p>';
      return;
    }

    allCards = CardGameData.generateAllCards();
    attachMarketplaceArt();
    grantStartingCollection();
    updateCurrencies();
    initNavigation();
    initCollectionFilters();
    initDeckBuilder();
    initPacks();
    initBattle();

    renderFeaturedCards();
  }

  init();
})();
