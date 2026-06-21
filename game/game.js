(function () {
  const MAX_MANA = 10;
  const HERO_HEALTH = 30;
  const STARTING_HAND = 3;

  let allCards = [];
  let state = null;

  function el(id) {
    return document.getElementById(id);
  }

  function log(message) {
    const logEl = el('game-log');
    const p = document.createElement('p');
    p.textContent = message;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function createDeck() {
    const pool = allCards.length ? allCards : CardGameData.generateAllCards();
    if (!allCards.length) allCards = pool;
    return shuffle(pool).slice(0, 20).map((card) => ({ ...card, instanceId: Math.random().toString(36).slice(2) }));
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

    state.player.board = [];
    state.enemy.board = [];

    log('A new duel begins!');
    updateUI();
    el('end-turn').disabled = false;
  }

  function updateHeroUI() {
    el('player-health').textContent = state.player.health;
    el('enemy-health').textContent = state.enemy.health;
    el('player-mana').textContent = state.player.mana;
    el('player-max-mana').textContent = state.player.maxMana;
    el('player-deck').textContent = state.player.deck.length;
    el('enemy-deck').textContent = state.enemy.deck.length;
    el('turn-banner').textContent = state.playerTurn ? 'Your Turn' : "AI Oracle's Turn";
  }

  function renderCard(card, options = {}) {
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.instanceId = card.instanceId;
    if (options.selected) div.classList.add('selected');
    if (options.exhausted) div.classList.add('exhausted');
    if (options.unplayable) div.classList.add('unplayable');

    div.innerHTML = `
      <div class="card-rarity ${card.rarity}"></div>
      <div class="card-cost">${card.cost}</div>
      <div class="card-name">${escapeHtml(card.name)}</div>
      <div class="card-original">${escapeHtml(card.original)}</div>
      <div class="card-domain">${escapeHtml(card.pantheon)} · ${escapeHtml(card.domain)}</div>
      <div class="card-ability"><strong>${escapeHtml(card.ability.name)}</strong>: ${escapeHtml(card.ability.description)}</div>
      <div class="card-stats">
        <span class="power">⚔ ${card.power}</span>
        <span class="health">❤ ${card.health}</span>
      </div>
    `;
    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateBoards() {
    const playerBoard = el('player-board');
    const enemyBoard = el('enemy-board');
    playerBoard.innerHTML = '';
    enemyBoard.innerHTML = '';

    state.player.board.forEach((card) => {
      playerBoard.appendChild(renderCard(card, { exhausted: card.exhausted }));
    });
    state.enemy.board.forEach((card) => {
      enemyBoard.appendChild(renderCard(card, { exhausted: card.exhausted }));
    });

    if (state.player.board.length === 0) playerBoard.innerHTML = '<span class="empty-board">No cards</span>';
    if (state.enemy.board.length === 0) enemyBoard.innerHTML = '<span class="empty-board">No cards</span>';
  }

  function updateHand() {
    const handEl = el('player-hand');
    handEl.innerHTML = '';
    state.player.hand.forEach((card) => {
      const unplayable = state.playerTurn && card.cost > state.player.mana;
      const selected = state.selectedCard && state.selectedCard.instanceId === card.instanceId;
      const elCard = renderCard(card, { unplayable, selected });
      elCard.addEventListener('click', () => onHandCardClick(card));
      handEl.appendChild(elCard);
    });
  }

  function updateUI() {
    updateHeroUI();
    updateBoards();
    updateHand();
  }

  function onHandCardClick(card) {
    if (!state.playerTurn) return;
    if (card.cost > state.player.mana) {
      log('Not enough Ink to play that card.');
      return;
    }
    if (state.selectedCard && state.selectedCard.instanceId === card.instanceId) {
      playCard(card);
      state.selectedCard = null;
    } else {
      state.selectedCard = card;
    }
    updateUI();
  }

  function playCard(card) {
    const idx = state.player.hand.findIndex((c) => c.instanceId === card.instanceId);
    if (idx === -1) return;
    state.player.hand.splice(idx, 1);
    state.player.mana -= card.cost;
    card.exhausted = true;
    card.health = card.maxHealth;
    state.player.board.push(card);
    log(`You played ${card.name}.`);

    // Simple on-play effects for prototype
    if (card.ability.name === 'Tidal Wave' && state.enemy.board.length > 0) {
      state.enemy.board.forEach((enemyCard) => {
        enemyCard.health -= 10;
      });
      log(`${card.name} crashes over the enemy board for 10 damage each.`);
      cleanupDead(state.enemy.board);
    }
    if (card.ability.name === 'Triumph') {
      state.player.board.forEach((ally) => {
        if (ally.instanceId !== card.instanceId) ally.power += 3;
      });
      log(`${card.name} inspires your allies.`);
    }
  }

  function cleanupDead(board) {
    for (let i = board.length - 1; i >= 0; i--) {
      if (board[i].health <= 0) {
        log(`${board[i].name} falls.`);
        board.splice(i, 1);
      }
    }
  }

  function playerAttack(card) {
    if (card.exhausted) return;
    if (state.enemy.board.length === 0) {
      state.enemy.health = Math.max(0, state.enemy.health - card.power);
      log(`${card.name} strikes the AI Oracle for ${card.power}.`);
    } else {
      const target = state.enemy.board[Math.floor(Math.random() * state.enemy.board.length)];
      target.health -= card.power;
      log(`${card.name} attacks ${target.name} for ${card.power}.`);
      card.health -= target.power;
      cleanupDead(state.enemy.board);
      cleanupDead(state.player.board);
    }
    card.exhausted = true;
    checkWin();
    updateUI();
  }

  function checkWin() {
    if (state.enemy.health <= 0) {
      log('You win! The myths remember your victory.');
      el('end-turn').disabled = true;
      state.playerTurn = false;
    } else if (state.player.health <= 0) {
      log('The AI Oracle prevails. Try again.');
      el('end-turn').disabled = true;
      state.playerTurn = false;
    }
  }

  function endPlayerTurn() {
    if (!state.playerTurn) return;
    state.playerTurn = false;
    state.selectedCard = null;
    updateUI();
    setTimeout(aiTurn, 800);
  }

  function aiTurn() {
    const ai = state.enemy;
    ai.maxMana = Math.min(MAX_MANA, state.turn);
    ai.mana = ai.maxMana;
    drawCard(ai, 1);

    // Play a card if affordable
    const playable = ai.hand.filter((c) => c.cost <= ai.mana).sort((a, b) => b.cost - a.cost);
    if (playable.length > 0) {
      const card = playable[0];
      const idx = ai.hand.findIndex((c) => c.instanceId === card.instanceId);
      ai.hand.splice(idx, 1);
      ai.mana -= card.cost;
      card.exhausted = true;
      card.health = card.maxHealth;
      ai.board.push(card);
      log(`AI Oracle plays ${card.name}.`);
    }

    // Attack with all ready cards
    ai.board.forEach((card) => {
      if (card.exhausted || state.player.health <= 0) return;
      if (state.player.board.length === 0) {
        state.player.health = Math.max(0, state.player.health - card.power);
        log(`${card.name} strikes you for ${card.power}.`);
      } else {
        const target = state.player.board[Math.floor(Math.random() * state.player.board.length)];
        target.health -= card.power;
        log(`${card.name} attacks ${target.name} for ${card.power}.`);
        card.health -= target.power;
        cleanupDead(state.player.board);
        cleanupDead(state.enemy.board);
      }
      card.exhausted = true;
    });

    checkWin();
    if (state.player.health <= 0 || state.enemy.health <= 0) {
      updateUI();
      return;
    }

    // Start player turn
    state.turn++;
    state.playerTurn = true;
    state.player.maxMana = Math.min(MAX_MANA, state.turn);
    state.player.mana = state.player.maxMana;
    state.player.board.forEach((c) => (c.exhausted = false));
    state.enemy.board.forEach((c) => (c.exhausted = false));
    drawCard(state.player, 1);
    log(`Turn ${state.turn}: your move.`);
    updateUI();
  }

  // Board click for attacks
  el('player-board').addEventListener('click', (e) => {
    if (!state || !state.playerTurn) return;
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    const instanceId = cardEl.dataset.instanceId;
    const card = state.player.board.find((c) => c.instanceId === instanceId);
    if (card) playerAttack(card);
  });

  el('end-turn').addEventListener('click', endPlayerTurn);
  el('new-game').addEventListener('click', initGame);

  // Start on load
  initGame();
})();
