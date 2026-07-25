/**
 * PuniCodex — Trending page engine.
 * Joins live analytics aggregates (/api/analytics/trending/) against the
 * baked temple registry (window.TRENDING_REGISTRY) and renders the boards.
 * No dependencies; honors an honest empty state when data has not accrued.
 */
(function () {
  'use strict';

  var templeBoard = document.getElementById('temple-board');
  var pageBoard = document.getElementById('page-board');
  var updatedNote = document.getElementById('trend-updated');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.trend-btn'));
  var days = 7;
  var lastFetch = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function emptyState(title, body) {
    return (
      '<div class="trend-empty"><strong>' +
      escapeHtml(title) +
      '</strong><br>' +
      escapeHtml(body) +
      '</div>'
    );
  }

  function templeRow(rank, item) {
    var meta = window.TRENDING_REGISTRY[item.templeId] || {
      unicode: item.templeId,
      pantheon: '',
      mascot: '',
    };
    var mascot = meta.mascot
      ? '<img class="trend-mascot" src="' +
        escapeHtml(meta.mascot) +
        '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'
      : '<span class="trend-mascot" aria-hidden="true"></span>';
    var delta =
      item.viewsToday > 0
        ? '<span class="trend-sub" style="color:#d4af37">+' +
          Number(item.viewsToday).toLocaleString('en-US') +
          ' today</span>'
        : '';
    return (
      '<a class="trend-row" href="/trending/temple/?id=' +
      encodeURIComponent(item.templeId) +
      '">' +
      '<span class="trend-rank">' +
      rank +
      '</span>' +
      mascot +
      '<span><span class="trend-name">' +
      escapeHtml(meta.unicode) +
      '</span><span class="trend-sub">' +
      escapeHtml(meta.pantheon) +
      (meta.pantheon ? ' · ' : '') +
      'temple</span>' +
      delta +
      '</span>' +
      '<span class="trend-views"><b>' +
      Number(item.views).toLocaleString('en-US') +
      '</b><span>views</span></span>' +
      '</a>'
    );
  }

  function pageRow(rank, item) {
    return (
      '<a class="trend-row" href="' +
      escapeHtml(item.path) +
      '">' +
      '<span class="trend-rank">' +
      rank +
      '</span>' +
      '<span aria-hidden="true"></span>' +
      '<span><span class="trend-name">' +
      escapeHtml(item.path) +
      '</span></span>' +
      '<span class="trend-views"><b>' +
      Number(item.views).toLocaleString('en-US') +
      '</b><span>views</span></span>' +
      '</a>'
    );
  }

  function render(data) {
    if (data.temples.length) {
      templeBoard.innerHTML = data.temples
        .map(function (item, i) {
          return templeRow(i + 1, item);
        })
        .join('');
    } else {
      templeBoard.innerHTML = emptyState(
        'The ranking is still awakening.',
        'As the first visitors move through the pantheon, the most visited temples will rise here.'
      );
    }
    if (data.pages.length) {
      pageBoard.innerHTML = data.pages
        .map(function (item, i) {
          return pageRow(i + 1, item);
        })
        .join('');
    } else {
      pageBoard.innerHTML = emptyState(
        'No page rankings yet.',
        'Page-level views appear once traffic has accrued beyond the anonymity threshold.'
      );
    }
    var countryBoard = document.getElementById('country-board');
    if (countryBoard) {
      if (data.countries && data.countries.length) {
        var max = Math.max.apply(
          null,
          data.countries.map(function (c) {
            return c.views;
          })
        );
        countryBoard.innerHTML = data.countries
          .map(function (c, i) {
            var pct = max > 0 ? Math.round((c.views / max) * 100) : 0;
            return (
              '<div class="trend-row" style="cursor:default">' +
              '<span class="trend-rank">' +
              (i + 1) +
              '</span>' +
              '<span><span class="trend-name">' +
              escapeHtml(c.country) +
              '</span><div class="trend-bar" style="height:4px;border-radius:2px;background:#d4af37;opacity:.5;width:' +
              pct +
              '%"></div></span>' +
              '<span class="trend-views"><b>' +
              Number(c.views).toLocaleString('en-US') +
              '</b><span>views</span></span>' +
              '</div>'
            );
          })
          .join('');
      } else {
        countryBoard.innerHTML = emptyState(
          'Regions are still forming.',
          'Country-level views appear as the first visits arrive from around the world.'
        );
      }
    }
    if (data.generatedAt) {
      var ageSec = Math.max(0, Math.round((Date.now() - Date.parse(data.generatedAt)) / 1000));
      updatedNote.textContent =
        ageSec < 90 ? 'just now' : Math.round(ageSec / 60) + ' min ago';
    }
    lastFetch = Date.now();
  }

  function load() {
    fetch('/api/analytics/trending/?days=' + days + '&limit=20', { credentials: 'omit' })
      .then(function (res) {
        if (!res.ok) throw new Error('trending ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json && json.success && json.data) render(json.data);
      })
      .catch(function () {
        templeBoard.innerHTML = emptyState(
          'The ranking is unreachable right now.',
          'The analytics service did not answer; the board will retry on its own.'
        );
      });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      days = parseInt(btn.getAttribute('data-days'), 10) || 7;
      load();
    });
  });

  load();
  // A living board refreshes itself — gently, once a minute.
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - lastFetch > 55000) load();
  }, 60000);
})();
