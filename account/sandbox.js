/**
 * Sponsor Sandbox — shared core for every /account/ page.
 *
 * Owns the tenant session (localStorage bearer token — same storage key the
 * original portal used, so existing sessions keep working), the fetch
 * wrapper, formatting/escaping helpers, SVG sparkline + canvas bar-chart
 * renderers (no chart libraries), and the top-bar shell with logout.
 * Exposed as window.Sandbox; page scripts stay small and declarative.
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'punicodex_tenant_token';

  var COUNTRIES = {
    US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
    AU: 'Australia', CA: 'Canada', NL: 'Netherlands', IN: 'India', JP: 'Japan',
    BR: 'Brazil', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
    IE: 'Ireland', ES: 'Spain', IT: 'Italy', PT: 'Portugal', GR: 'Greece',
    PL: 'Poland', CZ: 'Czechia', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium',
    CN: 'China', KR: 'South Korea', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
    AE: 'UAE', SA: 'Saudi Arabia', IL: 'Israel', TR: 'Türkiye', EG: 'Egypt',
    ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', MX: 'Mexico', AR: 'Argentina',
  };

  // ── Token ────────────────────────────────────────────────

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  function setToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      /* session-only */
    }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  // ── API ──────────────────────────────────────────────────

  async function api(path, options) {
    var opts = options || {};
    var headers = { Accept: 'application/json' };
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    var fetchOpts = { method: opts.method || 'GET', headers: headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(opts.body);
    }
    var res = await fetch(path, fetchOpts);
    var data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      var err = new Error((data && data.error) || 'Request failed (' + res.status + ')');
      err.status = res.status;
      err.code = data && data.code;
      throw err;
    }
    return data;
  }

  // ── Formatting ───────────────────────────────────────────

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtNumber(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString();
  }

  function fmtDate(value) {
    if (!value) return '—';
    var d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  }

  function fmtMs(ms) {
    if (!ms || ms <= 0) return '—';
    var sec = Math.round(ms / 1000);
    if (sec < 60) return sec + ' s';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }

  /** Days until a date (negative when past). null when unparseable. */
  function daysUntil(value) {
    if (!value) return null;
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }

  function countryName(code) {
    return COUNTRIES[code] || code;
  }

  function statusBadge(status) {
    var cls = 'sb-badge';
    if (status === 'approved' || status === 'active' || status === 'live') cls += ' green';
    else if (status === 'rejected' || status === 'cancelled' || status === 'expired') cls += ' red';
    else if (
      status === 'pending' ||
      status === 'pending_payment' ||
      status === 'pending_upload' ||
      status === 'pending_approval' ||
      status === 'pending_application'
    ) {
      cls += ' amber';
    }
    return '<span class="' + cls + '">' + esc(String(status || 'unknown').replace(/_/g, ' ')) + '</span>';
  }

  // ── Charts ───────────────────────────────────────────────

  /**
   * Inline SVG sparkline for a daily series ([{day, <key>: n}]). Empty
   * series render a flat baseline. No chart library.
   */
  function sparkline(daily, key, cssClass) {
    var points = (daily || []).map(function (d) {
      return Number(d[key]) || 0;
    });
    var w = 120;
    var h = 34;
    var pad = 2;
    if (!points.length) points = [0];
    var max = Math.max.apply(null, points.concat([1]));
    var step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
    var coords = points.map(function (v, i) {
      var x = pad + step * i;
      var y = h - pad - (v / max) * (h - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var line = coords.join(' ');
    var area =
      pad + ',' + (h - pad) + ' ' + line + ' ' + (pad + step * (points.length - 1)).toFixed(1) + ',' + (h - pad);
    return (
      '<svg class="sb-spark ' + (cssClass || '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon points="' + area + '"></polygon>' +
      '<polyline points="' + line + '"></polyline>' +
      '</svg>'
    );
  }

  /**
   * Canvas bar chart for a numeric series (trending-temple idiom, DPR-aware).
   * Empty values render a baseline only.
   */
  function drawBars(canvas, values, color) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    var pad = 8;
    var n = values.length;
    if (n) {
      var max = Math.max.apply(null, values.concat([1]));
      var barW = Math.max(2, (width - pad * 2) / n - 2);
      ctx.fillStyle = color;
      for (var i = 0; i < n; i++) {
        var v = Number(values[i]) || 0;
        var h = v > 0 ? Math.max(2, (v / max) * (height - 24)) : 0;
        var x = pad + i * ((width - pad * 2) / n);
        ctx.globalAlpha = v > 0 ? 0.9 : 0.15;
        ctx.fillRect(x, height - 18 - h, barW, h);
      }
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#8a8577';
    ctx.fillRect(pad, height - 16, width - pad * 2, 1);
    ctx.globalAlpha = 1;
  }

  /** Proportional bar list (countries, referrers, devices). */
  function barRows(rows, labelFn, valueFn) {
    if (!rows || !rows.length) return '';
    var max = Math.max.apply(
      null,
      rows.map(function (r) {
        return valueFn(r);
      }).concat([1])
    );
    return rows
      .map(function (r) {
        var pct = Math.round((valueFn(r) / max) * 100);
        return (
          '<div class="sb-bar-row">' +
          '<span class="sb-bar-label">' + esc(labelFn(r)) + '</span>' +
          '<span class="sb-bar-track"><span class="sb-bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="sb-bar-value">' + esc(fmtNumber(valueFn(r))) + '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  // ── Shell ────────────────────────────────────────────────

  function mountShell(active, email) {
    var bar = document.getElementById('sandbox-topbar');
    if (!bar) return;
    var links = [
      ['overview', '/account/', 'Overview'],
      ['bookings', '/account/bookings/', 'Bookings'],
      ['brand', '/account/brand/', 'Brand'],
    ];
    bar.innerHTML =
      '<a class="sb-brand" href="/account/">' +
      '<picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-camel-gold.webp" type="image/webp">' +
      '<img src="/assets/brand/01-logos/punicodex-wordmark-camel-gold.png" alt="PuniCodex" width="680" height="119"></picture>' +
      '<span class="sb-brand-tag">Sponsor Sandbox</span></a>' +
      '<nav class="sb-nav">' +
      links
        .map(function (l) {
          return '<a href="' + l[1] + '"' + (l[0] === active ? ' class="active" aria-current="page"' : '') + '>' + l[2] + '</a>';
        })
        .join('') +
      '</nav>' +
      '<div class="sb-topbar-right">' +
      (email ? '<span class="sb-account-email">' + esc(email) + '</span>' : '') +
      '<button type="button" class="sb-btn sb-btn-ghost sb-btn-sm" id="sb-logout">Sign Out</button>' +
      '</div>';
    document.getElementById('sb-logout').addEventListener('click', logout);
  }

  async function logout() {
    try {
      await api('/api/account/auth/logout/', { method: 'POST', body: {} });
    } catch (e) {
      /* sign out locally regardless */
    }
    clearToken();
    window.location.href = '/account/login/';
  }

  function loginUrl() {
    var next = window.location.pathname + window.location.search;
    return '/account/login/?next=' + encodeURIComponent(next);
  }

  /**
   * Auth guard for sandbox pages: redirects to the login page when there is
   * no session (or the session died), otherwise returns the /me payload.
   */
  async function requireAccount() {
    if (!getToken()) {
      window.location.replace(loginUrl());
      return null;
    }
    try {
      return await api('/api/account/me/');
    } catch (err) {
      if (err.status === 401) {
        clearToken();
        window.location.replace(loginUrl());
        return null;
      }
      throw err;
    }
  }

  window.Sandbox = {
    TOKEN_KEY: TOKEN_KEY,
    COUNTRIES: COUNTRIES,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    api: api,
    esc: esc,
    fmtNumber: fmtNumber,
    fmtDate: fmtDate,
    fmtMs: fmtMs,
    daysUntil: daysUntil,
    countryName: countryName,
    statusBadge: statusBadge,
    sparkline: sparkline,
    drawBars: drawBars,
    barRows: barRows,
    mountShell: mountShell,
    logout: logout,
    requireAccount: requireAccount,
  };
})();
