/**
 * Mythic Cards — The First Restoration Set · collector gallery
 * Renders the canonical card set (/game/cards.json) as TCG frames with
 * pantheon/rarity/variant filters, search, lazy paging, and a detail modal
 * with a foil toggle and the temple cross-link.
 */
(function () {
  'use strict';

  var PAGE = 96;
  var SET_CODE = 'FR1';

  var RARITY = {
    legendary: { gem: '◆', cls: 'legendary', label: 'Legendary' },
    mythic: { gem: '✦', cls: 'mythic', label: 'Secret Rare' },
    rare: { gem: '◇', cls: 'rare', label: 'Rare' },
    uncommon: { gem: '◈', cls: 'uncommon', label: 'Uncommon' },
    common: { gem: '·', cls: 'common', label: 'Common' },
  };
  var RARITY_ORDER = ['legendary', 'mythic', 'rare', 'uncommon', 'common'];
  var EDITIONS = [
    ['all', 'All printings'],
    ['common', 'Common'],
    ['holo', '✦ Holo'],
    ['full-art', '◆ Full-Art'],
    ['secret', '✧ Secret Rare'],
    ['archive', 'Archive'],
  ];

  var state = {
    cards: [],
    filtered: [],
    shown: 0,
    q: '',
    pantheon: 'all',
    rarity: 'all',
    edition: 'all',
    byEntry: new Map(),
  };

  var grid = document.getElementById('cards-grid');
  var countEl = document.getElementById('cards-count');
  var qInput = document.getElementById('cards-q');
  var modal = document.getElementById('card-modal');
  var modalBody = document.getElementById('card-modal-body');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Pantheon frame colors for cards without their own brand materials —
  // mirrors the canonical flagship schemes (scripts/create-flagship.js).
  var PANTHEON_FRAME_COLORS = {
    greek: ['#D4AF37', '#4169E1'],
    'greek-location': ['#D4AF37', '#4169E1'],
    norse: ['#C0C0C0', '#5C9BD1'],
    egyptian: ['#D4AF37', '#1E3A5F'],
    sanskrit: ['#FF9933', '#8B0000'],
    celtic: ['#228B22', '#B8D4E3'],
    mesopotamian: ['#CD7F32', '#C2B280'],
    polynesian: ['#1E90FF', '#FF7F50'],
    japanese: ['#DC143C', '#FFB6C1'],
    chinese: ['#D4AF37', '#8B0000'],
    yoruba: ['#FF6B35', '#2E86AB'],
    nahuatl: ['#7A9E7E', '#D4AF37'],
    zoroastrian: ['#D4AF37', '#3B3B98'],
    buddhist: ['#D4AF37', '#6B4FA0'],
    abrahamic: ['#B8B8D0', '#4A4E8C'],
    taoist: ['#D4AF37', '#2F4F4F'],
    roman: ['#D4AF37', '#7A1F1F'],
    canaanite: ['#8FB5A5', '#4A5568'],
    phoenician: ['#B08050', '#3D5A80'],
  };

  function colors(card) {
    var c = (card.art && card.art.colors) || {};
    var fallback = PANTHEON_FRAME_COLORS[card.pantheon] || ['#1a1a24', '#2a2a38'];
    return {
      primary: c.primary || fallback[0],
      secondary: c.secondary || fallback[1],
      glow: c.glow || 'rgba(212,175,55,.2)',
    };
  }

  function artUrl(card) {
    return (card.art && card.art.mascot) || '';
  }

  function gemFor(card) {
    return RARITY[card.rarity] || RARITY.common;
  }

  function cardNumber(card) {
    return state.cards.indexOf(card) + 1;
  }

  function frameHtml(card) {
    var r = gemFor(card);
    var col = colors(card);
    var edition = card.edition || 'archive';
    var foil = card.variant === 'original-script' || edition === 'secret';
    var fullArt = edition === 'full-art' || edition === 'secret';
    var art = fullArt && card.art && card.art.fullArt ? card.art.fullArt : artUrl(card);
    var ability = card.ability || {};
    return (
      '<article class="mcard' + (foil ? ' mcard--foil' : '') + (edition === 'holo' ? ' mcard--pattern' : '') + (fullArt ? ' mcard--fullart' : '') + '" data-card-id="' + esc(card.id) + '" tabindex="0" role="button" aria-label="' + esc(card.name) + ' card — open details" style="--mc1:' + esc(col.primary) + ';--mc2:' + esc(col.secondary) + '">' +
        '<div class="mcard-inner">' +
          '<div class="mcard-banner"><span class="mcard-name">' + esc(card.name) + '</span><span class="mcard-sigil" title="' + esc(card.pantheon) + '">' + esc(card.categoryIcon || '✦') + '</span></div>' +
          '<div class="mcard-art">' +
            '<span class="mcard-tier">' + esc(card.tierLabel || '') + '</span>' +
            '<span class="mcard-cat" title="' + esc(card.categoryLabel || '') + '">' + esc(card.categoryIcon || '') + '</span>' +
            (art
              ? '<img src="' + esc(art) + '" alt="' + esc(card.name) + (fullArt ? ' full-art' : ' mascot') + '" loading="lazy"' + (fullArt ? ' class="mcard-art--full"' : '') + '>'
              : '<span class="mcard-sigil-fallback" aria-hidden="true" style="font-size:3rem;color:var(--gold,#D4AF37);text-shadow:0 0 22px rgba(212,175,55,.35)">' + esc(card.categoryIcon || '✦') + '</span>') +
          '</div>' +
          '<div class="mcard-ability">' +
            '<div class="mcard-ability-name">' + esc(ability.name || card.domain || '') + '</div>' +
            '<div class="mcard-ability-text">' + esc(ability.description || card.flavor || '') + '</div>' +
          '</div>' +
          '<div class="mcard-stats">' +
            '<div class="mcard-stat"><b>' + (card.cost ?? '—') + '</b><span>Ink</span></div>' +
            '<div class="mcard-stat"><b>' + (card.power ?? '—') + '</b><span>Power</span></div>' +
            '<div class="mcard-stat"><b>' + (card.health ?? '—') + '</b><span>Health</span></div>' +
            '<div class="mcard-stat"><b>' + (card.speed ?? '—') + '</b><span>Speed</span></div>' +
          '</div>' +
          '<div class="mcard-foot"><span class="mcard-set">' + SET_CODE + ' · ' + cardNumber(card) + '/' + state.cards.length + '</span><span class="mgem mgem--' + r.cls + '" title="' + r.label + '">' + r.gem + '</span></div>' +
        '</div>' +
      '</article>'
    );
  }

  function applyFilters() {
    var q = state.q.toLowerCase();
    state.filtered = state.cards.filter(function (c) {
      if (state.pantheon !== 'all' && c.pantheon !== state.pantheon) return false;
      if (state.rarity !== 'all' && c.rarity !== state.rarity) return false;
      if (state.edition !== 'all' && c.edition !== state.edition) return false;
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.ascii || '').toLowerCase().includes(q) ||
        String(c.original || '').toLowerCase().includes(q) ||
        String(c.domain || '').toLowerCase().includes(q) ||
        String(c.ability && c.ability.name || '').toLowerCase().includes(q) ||
        String(c.flavor || '').toLowerCase().includes(q)
      );
    });
    state.filtered.sort(function (a, b) {
      var ra = RARITY_ORDER.indexOf(a.rarity), rb = RARITY_ORDER.indexOf(b.rarity);
      if (ra !== rb) return ra - rb;
      return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' });
    });
    state.shown = 0;
    render(true);
  }

  function render(reset) {
    if (reset) grid.innerHTML = '';
    var slice = state.filtered.slice(state.shown, state.shown + PAGE);
    var html = slice.map(frameHtml).join('');
    grid.insertAdjacentHTML('beforeend', html);
    state.shown += slice.length;
    grid.setAttribute('aria-busy', 'false');
    countEl.textContent =
      state.filtered.length.toLocaleString('en-US') +
      ' of ' + state.cards.length.toLocaleString('en-US') + ' cards' +
      (state.filtered.length > state.shown ? ' — showing ' + state.shown : '');
    var more = document.getElementById('cards-more');
    if (state.filtered.length > state.shown) {
      if (!more) {
        more = document.createElement('button');
        more.id = 'cards-more';
        more.className = 'cards-more';
        more.type = 'button';
        more.textContent = 'Show more';
        more.addEventListener('click', function () { render(false); });
        grid.after(more);
      }
      more.textContent = 'Show more (' + (state.filtered.length - state.shown) + ' left)';
    } else if (more) {
      more.remove();
    }
  }

  function buildPills() {
    var pantheons = [...new Set(state.cards.map(function (c) { return c.pantheon; }))].filter(Boolean).sort();
    var pantheonWrap = document.getElementById('pantheon-pills');
    var rarityWrap = document.getElementById('rarity-pills');
    function pill(label, value, group) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cards-pill' + (value === 'all' ? ' active' : '');
      b.dataset[group] = value;
      b.textContent = label;
      b.addEventListener('click', function () {
        state[group] = value;
        var siblings = b.parentElement.querySelectorAll('.cards-pill');
        siblings.forEach(function (s) { s.classList.remove('active'); });
        b.classList.add('active');
        applyFilters();
      });
      return b;
    }
    pantheonWrap.appendChild(pill('All pantheons', 'all', 'pantheon'));
    pantheons.forEach(function (p) {
      pantheonWrap.appendChild(pill(p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '), p, 'pantheon'));
    });
    rarityWrap.appendChild(pill('All rarities', 'all', 'rarity'));
    RARITY_ORDER.forEach(function (r) {
      rarityWrap.appendChild(pill(RARITY[r].label, r, 'rarity'));
    });
    document.querySelectorAll('[data-edition]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.edition = b.dataset.edition;
        b.parentElement.querySelectorAll('.cards-pill').forEach(function (s) { s.classList.remove('active'); });
        b.classList.add('active');
        applyFilters();
      });
    });
  }

  // ── Modal ──
  function variantsFor(entryId) {
    return state.byEntry.get(entryId) || [];
  }

  function editionLabel(card) {
    return { common: 'Common', holo: '✦ Holo', 'full-art': '◆ Full-Art', secret: '✧ Secret Rare', archive: 'Archive' }[card.edition || 'archive'] || 'Common';
  }

  function openModal(card) {
    var variants = variantsFor(card.entryId);
    var r = gemFor(card);
    var rows = [
      ['Set', SET_CODE + ' · First Restoration · ' + cardNumber(card) + '/' + state.cards.length],
      ['Printing', editionLabel(card)],
      ['Rarity', r.label],
      ['Tier', card.tierLabel || '—'],
      ['Pantheon', (card.pantheon || '').replace(/-/g, ' ')],
      ['Domain', card.domain || '—'],
      ['Ink cost', String(card.cost ?? '—') + ' · Power ' + String(card.power ?? '—') + ' · Health ' + String(card.health ?? '—') + ' · Speed ' + String(card.speed ?? '—')],
    ];
    if (card.ownedDomain) rows.push(['Owned domain', card.ownedDomain]);
    modalBody.innerHTML =
      '<div class="card-modal-frame">' + frameHtml(card) + '</div>' +
      '<div class="card-modal-info">' +
        '<h2>' + esc(card.name) + '</h2>' +
        '<div class="card-modal-original">' + esc(card.original || '') + '</div>' +
        '<div class="card-modal-domain">' + esc(card.categoryLabel || '') + ' · ' + esc((card.pantheon || '').replace(/-/g, ' ')) + '</div>' +
        (card.flavor ? '<div class="card-modal-flavor">' + esc(card.flavor) + '</div>' : '') +
        rows.map(function (row) { return '<div class="card-modal-row"><b>' + esc(row[0]) + '</b><span>' + esc(row[1]) + '</span></div>'; }).join('') +
        (variants.length > 1
          ? '<div class="card-variant-toggle">' +
            variants.map(function (v, i) {
              return '<button type="button" data-variant-idx="' + i + '"' + (v.id === card.id ? ' class="active"' : '') + '>' + esc(editionLabel(v)) + '</button>';
            }).join('') +
            '</div>'
          : '') +
        '<div class="card-modal-links">' +
          '<a class="card-modal-link" href="/sites/' + esc(card.entryId) + '/">Enter the ' + esc(card.name) + ' temple →</a>' +
          '<a class="card-modal-link card-modal-link--ghost" href="/game/">Battle in Mythic Duel</a>' +
        '</div>' +
      '</div>';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var firstFrame = modalBody.querySelector('.mcard');
    if (firstFrame) firstFrame.removeAttribute('tabindex');
    modalBody.querySelectorAll('[data-variant-idx]').forEach(function (b) {
      b.addEventListener('click', function () {
        openModal(variants[Number(b.dataset.variantIdx)]);
      });
    });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  grid.addEventListener('click', function (e) {
    var el = e.target.closest('.mcard');
    if (!el) return;
    var card = state.cards.find(function (c) { return c.id === el.dataset.cardId; });
    if (card) openModal(card);
  });
  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest('.mcard');
    if (!el) return;
    e.preventDefault();
    var card = state.cards.find(function (c) { return c.id === el.dataset.cardId; });
    if (card) openModal(card);
  });
  document.getElementById('card-modal-close').addEventListener('click', closeModal);
  document.getElementById('card-modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  var debounce;
  qInput.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.q = qInput.value.trim();
      applyFilters();
    }, 250);
  });

  function init(data) {
    state.cards = (data || []).slice();
    state.cards.forEach(function (c) {
      if (!state.byEntry.has(c.entryId)) state.byEntry.set(c.entryId, []);
      state.byEntry.get(c.entryId).push(c);
    });
    state.byEntry.forEach(function (v) {
      v.sort(function (a, b) { return (a.variant === 'standard' ? -1 : 1) - (b.variant === 'standard' ? -1 : 1); });
    });
    buildPills();
    applyFilters();
  }

  // The gallery is server-rendered: the payload is baked into the page, and
  // the static frames are already in the grid for crawlers. The interactive
  // layer re-renders from the same data on first filter — no fetch needed.
  if (window.__CARDS_PAYLOAD && window.__CARDS_PAYLOAD.length) {
    init(window.__CARDS_PAYLOAD);
  } else {
    fetch('/game/cards.json')
      .then(function (res) {
        if (!res.ok) throw new Error('cards.json ' + res.status);
        return res.json();
      })
      .then(function (data) {
        init(data.cards || []);
      })
      .catch(function (err) {
        grid.innerHTML = '<div class="cards-loading">The set could not be restored (' + esc(err.message) + '). Try again shortly.</div>';
      });
  }
})();
