/**
 * PuniCodex — Trending temple drill-down engine.
 * Reads ?id=<templeId>, joins /api/analytics/temple/ against the baked
 * registry, and renders the per-temple analytics dashboard. No dependencies.
 */
(function () {
  'use strict';

  var COUNTRIES = {
    US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
    AU: 'Australia', CA: 'Canada', NL: 'Netherlands', IN: 'India', JP: 'Japan',
    BR: 'Brazil', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
    IE: 'Ireland', ES: 'Spain', IT: 'Italy', PT: 'Portugal', GR: 'Greece',
    PL: 'Poland', CZ: 'Czechia', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium',
    CN: 'China', KR: 'South Korea', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
    AE: 'UAE', SA: 'Saudi Arabia', IL: 'Israel', TR: 'Türkiye', EG: 'Egypt',
    ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', MX: 'Mexico', AR: 'Argentina',
    CL: 'Chile', CO: 'Colombia', PE: 'Peru', NZ: 'New Zealand', PH: 'Philippines',
    ID: 'Indonesia', MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam', RU: 'Russia',
    UA: 'Ukraine', RO: 'Romania', HU: 'Hungary', BG: 'Bulgaria', LB: 'Lebanon',
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtMs(ms) {
    if (!ms || ms <= 0) return '—';
    var sec = Math.round(ms / 1000);
    if (sec < 60) return sec + ' s';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }

  function fmtInt(n) {
    return Number(n || 0).toLocaleString('en-US');
  }

  var params = new URLSearchParams(location.search);
  var templeId = params.get('id') || '';
  var registry = window.TRENDING_REGISTRY || {};
  var meta = registry[templeId];
  var days = 30;

  var head = document.getElementById('tt-head');
  if (!meta) {
    head.innerHTML =
      '<div><h1>Unknown temple</h1><p class="tt-sub">No analytics profile exists for “' +
      escapeHtml(templeId) + '”. <a href="/trending/">Back to the board</a></p></div>';
    return;
  }

  head.innerHTML =
    (meta.mascot
      ? '<img class="tt-mascot" src="' + escapeHtml(meta.mascot) + '" alt="" onerror="this.style.visibility=\'hidden\'">'
      : '') +
    '<div><h1>' + escapeHtml(meta.unicode) + '</h1>' +
    '<p class="tt-sub">' + escapeHtml(meta.pantheon) + ' · temple analytics · <a href="/sites/' +
    encodeURIComponent(templeId) + '/">enter the temple &rarr;</a></p></div>';

  var cards = document.getElementById('tt-cards');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.tt-btn'));

  function drawSeries(canvasId, values, color) {
    var canvas = document.getElementById(canvasId);
    var dpr = window.devicePixelRatio || 1;
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    if (!values.length) return;
    var max = Math.max.apply(null, values.concat([1]));
    var pad = 8;
    var barW = Math.max(2, (width - pad * 2) / values.length - 2);
    ctx.fillStyle = color;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      var h = v > 0 ? Math.max(2, (v / max) * (height - 24)) : 0;
      var x = pad + i * ((width - pad * 2) / values.length);
      ctx.globalAlpha = v > 0 ? 0.9 : 0.15;
      ctx.fillRect(x, height - 18 - h, barW, h);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#8a8577';
    ctx.fillRect(pad, height - 16, width - pad * 2, 1);
    // first/last day labels
    ctx.globalAlpha = 0.7;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#8a8577';
  }

  function table(el, rows, leftKey, rightKey, rightLabel) {
    if (!rows || !rows.length) {
      el.innerHTML = '<p class="tt-empty">No data yet for this period.</p>';
      return;
    }
    var max = Math.max.apply(
      null,
      rows.map(function (r) {
        return r[rightKey];
      })
    );
    el.innerHTML =
      '<table class="tt-table">' +
      rows
        .map(function (r) {
          var pct = max > 0 ? Math.round((r[rightKey] / max) * 100) : 0;
          return (
            '<tr><td>' +
            escapeHtml(leftKey(r)) +
            '<div class="tt-bar" style="width:' +
            pct +
            '%"></div></td>' +
            '<td class="num">' +
            fmtInt(r[rightKey]) +
            ' ' +
            (rightLabel || '') +
            '</td></tr>'
          );
        })
        .join('') +
      '</table>';
  }

  function render(data) {
    var t = data.totals || {};
    cards.innerHTML =
      '<div class="tt-card"><b>' + fmtInt(t.views) + '</b><span>views</span></div>' +
      '<div class="tt-card"><b>' + fmtInt(t.uniqueSessions) + '</b><span>unique sessions</span></div>' +
      '<div class="tt-card"><b>' + fmtMs(t.avgVisibleMs) + '</b><span>avg. attention</span></div>' +
      '<div class="tt-card"><b>' + fmtInt(t.engagementDays) + '</b><span>days with attention data</span></div>';

    var series = data.byDay || [];
    drawSeries(
      'tt-views-chart',
      series.map(function (r) {
        return r.views;
      }),
      '#d4af37'
    );
    drawSeries(
      'tt-attention-chart',
      series.map(function (r) {
        return r.avgVisibleMs;
      }),
      '#58a6ff'
    );
    document.getElementById('tt-attention-empty').hidden = (t.engagementDays || 0) > 0;

    table(
      document.getElementById('tt-countries'),
      data.countries,
      function (r) {
        return (COUNTRIES[r.country] || r.country) + ' · ' + r.country;
      },
      'views'
    );
    table(
      document.getElementById('tt-referrers'),
      data.referrers,
      function (r) {
        return r.referrer;
      },
      'count',
      'visits'
    );
    table(
      document.getElementById('tt-subpages'),
      data.subPages,
      function (r) {
        return r.path.replace('/sites/' + templeId + '/', '…/');
      },
      'views'
    );

    var dev = data.devices;
    var devEl = document.getElementById('tt-devices');
    if (!dev) {
      devEl.innerHTML = '<p class="tt-empty">No device data for this period.</p>';
    } else {
      var devMax = Math.max(dev.mobile || 0, dev.tablet || 0, dev.desktop || 0, 1);
      devEl.innerHTML = ['mobile', 'tablet', 'desktop']
        .map(function (name) {
          var v = dev[name] || 0;
          var h = Math.max(4, Math.round((v / devMax) * 100));
          return (
            '<div class="tt-devcol"><span class="tt-devval">' +
            fmtInt(v) +
            '</span><div class="tt-devbar" style="height:' +
            h +
            'px"></div><span class="tt-devlab">' +
            name +
            '</span></div>'
          );
        })
        .join('');
    }

    var also = data.alsoVisited;
    var alsoEl = document.getElementById('tt-also');
    if (!also || !also.length) {
      alsoEl.innerHTML = '<p class="tt-empty">No cross-temple journeys recorded yet.</p>';
    } else {
      alsoEl.innerHTML = also
        .map(function (row) {
          var m = registry[row.templeId] || { unicode: row.templeId };
          return (
            '<a class="tt-chip" href="/trending/temple/?id=' +
            encodeURIComponent(row.templeId) +
            '">' +
            escapeHtml(m.unicode) +
            '<span>' +
            fmtInt(row.sessions) +
            ' sessions</span></a>'
          );
        })
        .join('');
    }
  }

  function load() {
    fetch(
      '/api/analytics/temple/?temple=' + encodeURIComponent(templeId) + '&days=' + days,
      { credentials: 'omit' }
    )
      .then(function (res) {
        if (!res.ok) throw new Error('temple analytics ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json && json.success && json.data) render(json.data);
      })
      .catch(function () {
        cards.innerHTML =
          '<div class="tt-card"><b>—</b><span>analytics unreachable right now</span></div>';
      });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      days = parseInt(btn.getAttribute('data-days'), 10) || 30;
      load();
    });
  });

  load();
})();
