/**
 * PuniCodex — Pattern Atlas page engine.
 * Powers Find Your Pattern (API-backed industry autocomplete over
 * /api/v1/industry-patterns/match/ with a fully client-side fallback against
 * the embedded alias index) and the expandable sector atlas, rendering temple
 * cards from window.PATTERN_GRAPH + window.PATTERN_TEMPLES. No dependencies.
 */
(function () {
  'use strict';
  var G = window.PATTERN_GRAPH || { meta: {}, sectors: [], industries: [], aliases: {} };
  var T = window.PATTERN_TEMPLES || {};
  var sectorById = {};
  G.sectors.forEach(function (s) { sectorById[s.id] = s; });
  var industryById = {};
  G.industries.forEach(function (g) { industryById[g.industry] = g; });
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function sectorColor(id) { var s = sectorById[id]; return s ? s.color : '#d4af37'; }
  function sectorName(id) { var s = sectorById[id]; return s ? s.name : id; }

  function cardHtml(m) {
    var t = T[m.id] || {};
    var mascot = t.mascot || ('/sites/' + m.id + '/assets/' + m.id + '_mascot.webp');
    var badge = m.weight === 2
      ? '<span class="pt-badge primary">Primary</span>'
      : '<span class="pt-badge resonant">Resonant</span>';
    return '<a class="pt-card" href="/sites/' + esc(m.id) + '/patterns/">'
      + '<img class="pt-mascot" src="' + esc(mascot) + '" alt="" loading="lazy" width="56" height="56">'
      + '<span class="pt-body"><span class="pt-line"><span class="pt-name">' + esc(m.unicode) + '</span>' + badge + '</span>'
      + '<span class="pt-pantheon">' + esc(m.pantheonLabel || m.pantheon || '') + (m.domain ? ' · ' + esc(m.domain) : '') + '</span>'
      + '<span class="pt-why">' + esc(m.why) + '</span></span></a>';
  }
  function cardsHtml(industryId) {
    var g = industryById[industryId];
    if (!g) return '';
    return g.members.map(cardHtml).join('');
  }

  // Local fallback matcher — mirrors the API ranking so the page works even
  // when the API is unreachable.
  function localMatch(q, limit) {
    q = String(q || '').toLowerCase().trim();
    if (!q) return [];
    var best = {};
    function consider(id, term, score) {
      if (!industryById[id]) return;
      if (best[id] && best[id].score >= score) return;
      best[id] = { id: id, matchedTerm: term, score: score };
    }
    Object.keys(G.aliases || {}).forEach(function (term) {
      var score = 0;
      if (term === q) score = 3;
      else if (term.indexOf(q) === 0 || (q.length > term.length && q.indexOf(term) === 0)) score = 2;
      else if (term.indexOf(q) !== -1 || (term.length >= 3 && q.indexOf(term) !== -1)) score = 1;
      if (!score) return;
      (G.aliases[term] || []).forEach(function (t) { consider(t.industry, term, score + t.weight); });
    });
    G.industries.forEach(function (g) {
      var words = g.name.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
        return w && w !== 'and' && w !== 'the' && w !== 'of';
      });
      if (words.indexOf(q) !== -1) consider(g.industry, q, 2);
    });
    return Object.keys(best).map(function (id) {
      var g = industryById[id];
      return {
        industry: id, name: g.name, sector: g.sector, sectorName: sectorName(g.sector),
        tagline: g.tagline, matchedTerm: best[id].matchedTerm, score: best[id].score,
        primaryCount: g.members.filter(function (m) { return m.weight === 2; }).length,
      };
    }).sort(function (a, b) {
      return b.score - a.score || b.primaryCount - a.primaryCount || (a.industry < b.industry ? -1 : 1);
    }).slice(0, limit || 8);
  }

  function apiMatch(q) {
    return fetch('/api/v1/industry-patterns/match/?q=' + encodeURIComponent(q) + '&limit=8', {
      headers: { Accept: 'application/json' },
    }).then(function (r) {
      if (!r.ok) throw new Error('api ' + r.status);
      return r.json();
    }).then(function (payload) {
      var matches = payload && payload.data && payload.data.matches;
      if (!matches) throw new Error('bad payload');
      return matches;
    });
  }
  function match(q) {
    return apiMatch(q).catch(function () { return localMatch(q, 8); });
  }

  var input = document.getElementById('pfp-input');
  var dropdown = document.getElementById('pfp-dropdown');
  var panel = document.getElementById('pfp-panel');
  var activeIndex = -1;
  var currentMatches = [];
  var debounceTimer = null;

  function hideDropdown() {
    activeIndex = -1;
    currentMatches = [];
    dropdown.classList.remove('visible');
    dropdown.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function setActive(i) {
    var opts = dropdown.querySelectorAll('.pfp-option');
    activeIndex = i;
    opts.forEach(function (o, idx) {
      o.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      o.classList.toggle('active', idx === i);
    });
    if (i >= 0 && opts[i]) {
      input.setAttribute('aria-activedescendant', opts[i].id);
      opts[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
  function showMatches(matches) {
    currentMatches = matches;
    if (!matches.length) {
      dropdown.innerHTML = '<div class="pfp-empty">No pattern answers to that name — try a nearby trade.</div>';
      dropdown.classList.add('visible');
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    dropdown.innerHTML = matches.map(function (m, i) {
      return '<div class="pfp-option" role="option" aria-selected="false" id="pfp-opt-' + i + '" data-industry="' + esc(m.industry) + '">'
        + '<span class="pfp-dot" style="background:' + esc(sectorColor(m.sector)) + '"></span>'
        + '<span class="pfp-opt-name">' + esc(m.name) + '</span>'
        + '<span class="pfp-opt-meta">' + esc(m.sectorName) + (m.matchedTerm ? ' · “' + esc(m.matchedTerm) + '”' : '') + '</span></div>';
    }).join('');
    dropdown.classList.add('visible');
    input.setAttribute('aria-expanded', 'true');
    var opts = dropdown.querySelectorAll('.pfp-option');
    opts.forEach(function (o, i) {
      o.addEventListener('mouseenter', function () { setActive(i); });
      o.addEventListener('click', function () { selectIndustry(o.getAttribute('data-industry')); });
    });
    setActive(-1);
  }
  function renderPanel(g) {
    var color = sectorColor(g.sector);
    var primaries = g.members.filter(function (m) { return m.weight === 2; }).length;
    panel.innerHTML = '<div class="pfp-result" style="--sector-color:' + esc(color) + '">'
      + '<div class="pfp-result-head">'
      + '<span class="pfp-sector-tag" style="background:' + esc(color) + '">' + esc(sectorName(g.sector)) + '</span>'
      + '<h3 class="pfp-result-name">' + esc(g.name) + '</h3>'
      + '<p class="pfp-result-tagline">' + esc(g.tagline) + '</p>'
      + '<p class="pfp-result-count">' + g.members.length + ' aligned temples · ' + primaries + ' primary</p>'
      + '</div>'
      + '<p class="pfp-result-note">' + esc(g.note) + '</p>'
      + '<div class="pfp-cards">' + cardsHtml(g.industry) + '</div>'
      + '<p class="pfp-result-method"><a href="/patterns/methodology/">How this match is made</a> · <a href="/api/v1/industry-patterns/">Open dataset</a></p>'
      + '</div>';
    panel.classList.add('visible');
  }
  function selectIndustry(id) {
    var g = industryById[id];
    if (!g) return;
    hideDropdown();
    renderPanel(g);
    panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (q.length < 2) { hideDropdown(); return; }
    debounceTimer = setTimeout(function () {
      match(q).then(showMatches);
    }, 150);
  });
  input.addEventListener('keydown', function (e) {
    var opts = dropdown.querySelectorAll('.pfp-option');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (opts.length) setActive(Math.min(activeIndex + 1, opts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (opts.length) setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && opts[activeIndex]) {
        e.preventDefault();
        selectIndustry(opts[activeIndex].getAttribute('data-industry'));
      } else if (currentMatches.length) {
        e.preventDefault();
        selectIndustry(currentMatches[0].industry);
      }
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  });
  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target) && e.target !== input) hideDropdown();
  });
  document.querySelectorAll('.pfp-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var q = chip.getAttribute('data-q');
      input.value = q;
      match(q).then(function (m) {
        if (m.length) selectIndustry(m[0].industry);
        else showMatches(m);
      });
    });
  });

  document.querySelectorAll('.pa-ind-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var region = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (open) { region.hidden = true; return; }
      if (!region.getAttribute('data-filled')) {
        region.innerHTML = '<div class="pa-ind-cards">' + cardsHtml(btn.getAttribute('data-industry')) + '</div>';
        region.setAttribute('data-filled', '1');
      }
      region.hidden = false;
    });
  });
})();
