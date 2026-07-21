/**
 * Account Portal — /account/
 * Tenant self-service for sponsors (ad slots) and patrons: auth (login /
 * one-time set-password token / reset), ownership-scoped analytics, and
 * change requests (creative swap, social links) that go through admin
 * approval. All API URLs carry a trailing slash (Vercel 308 guard).
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'punicodex_tenant_token';
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;

  // ── Helpers ──────────────────────────────────────────────

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

  function show(viewId) {
    ['view-login', 'view-set-password', 'view-dashboard'].forEach(function (id) {
      document.getElementById(id).hidden = id !== viewId;
    });
    window.scrollTo(0, 0);
  }

  function statusBadge(status) {
    var cls = 'badge';
    if (status === 'approved' || status === 'active' || status === 'live') cls += ' green';
    else if (status === 'rejected' || status === 'cancelled') cls += ' red';
    else if (status === 'pending' || status === 'pending_payment' || status === 'pending_upload' || status === 'pending_approval') cls += ' amber';
    else cls += ' gold';
    return '<span class="' + cls + '">' + esc(String(status || 'unknown').replace(/_/g, ' ')) + '</span>';
  }

  /**
   * Render a daily series ([{day, <key>: n}]) as a lightweight inline SVG
   * sparkline — no chart library. Empty series render a flat baseline.
   */
  function sparkline(daily, key) {
    var points = (daily || []).map(function (d) {
      return Number(d[key]) || 0;
    });
    var w = 280;
    var h = 56;
    var pad = 4;
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
      '<svg class="sparkline" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon class="spark-fill" points="' + area + '"></polygon>' +
      '<polyline points="' + line + '"></polyline>' +
      '</svg>'
    );
  }

  function metric(value, label) {
    return (
      '<div class="metric"><div class="metric-value">' + esc(fmtNumber(value)) + '</div>' +
      '<div class="metric-label">' + esc(label) + '</div></div>'
    );
  }

  // ── Auth views ───────────────────────────────────────────

  function initLoginView() {
    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('login-message');
      msg.classList.remove('success');
      msg.textContent = '';
      var btn = document.getElementById('login-submit');
      btn.disabled = true;
      try {
        var data = await api('/api/account/auth/login/', {
          method: 'POST',
          body: {
            email: document.getElementById('login-email').value.trim(),
            password: document.getElementById('login-password').value,
          },
        });
        setToken(data.token);
        loadDashboard();
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('forgot-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('forgot-message');
      msg.classList.remove('success');
      msg.textContent = '';
      var btn = document.getElementById('forgot-submit');
      btn.disabled = true;
      try {
        var data = await api('/api/account/auth/forgot/', {
          method: 'POST',
          body: { email: document.getElementById('forgot-email').value.trim() },
        });
        msg.classList.add('success');
        msg.textContent = data.message || 'If an account exists for this email, a reset link has been sent.';
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initSetPasswordView(token) {
    document.getElementById('set-password-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('set-password-message');
      msg.textContent = '';
      var password = document.getElementById('new-password').value;
      var confirm = document.getElementById('confirm-password').value;
      if (password.length < 8) {
        msg.textContent = 'Password must be at least 8 characters.';
        return;
      }
      if (password !== confirm) {
        msg.textContent = 'Passwords do not match.';
        return;
      }
      var btn = document.getElementById('set-password-submit');
      btn.disabled = true;
      try {
        var data = await api('/api/account/auth/set-password/', {
          method: 'POST',
          body: { token: token, password: password },
        });
        setToken(data.token);
        // Drop the one-time token from the URL before entering the dashboard.
        window.history.replaceState({}, document.title, '/account/');
        loadDashboard();
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ── Dashboard ────────────────────────────────────────────

  function renderSpace(data) {
    var wrap = document.getElementById('space-panels');
    var cards = [];
    (data.slots || []).forEach(function (s) {
      cards.push(
        '<div class="panel-card">' +
          '<h3>' + esc(s.slotName) + '</h3>' +
          '<p class="panel-sub">' + esc(s.siteSlug) + ' · ' + esc(String(s.status || '').replace(/_/g, ' ')) + '</p>' +
          '<div class="metric-row">' +
          metric(s.impressions, 'Impressions') +
          metric(s.clicks, 'Clicks') +
          metric(s.ctr + '%', 'CTR') +
          '</div>' +
          sparkline(s.daily, 'impressions') +
          '</div>'
      );
    });
    (data.patrons || []).forEach(function (p) {
      cards.push(
        '<div class="panel-card">' +
          '<h3>Patron — ' + esc(p.templeId) + '</h3>' +
          '<p class="panel-sub">' + esc(p.displayName) + ' · ' + esc(String(p.status || '').replace(/_/g, ' ')) + '</p>' +
          '<div class="metric-row">' +
          metric(p.impressions, 'Impressions') +
          metric(p.clicks, 'Clicks') +
          '</div>' +
          '<p class="cell-sub">Per-spot event tracking is not available for patron walls; see the temple panel for page traffic.</p>' +
          '</div>'
      );
    });
    wrap.innerHTML = cards.length
      ? cards.join('')
      : '<div class="state-block">No ad space or patron spots are linked to this account yet.</div>';
  }

  function renderTemple(templeId, data) {
    return (
      '<div class="panel-card">' +
      '<h3>' + esc(templeId) + '</h3>' +
      '<p class="panel-sub">Last ' + esc(data.periodDays) + ' days · all visitors</p>' +
      '<div class="metric-row">' +
      metric(data.totals.humanViews, 'Page views') +
      metric(data.totals.uniqueSessions, 'Unique sessions') +
      '</div>' +
      sparkline(
        (data.byDay || []).map(function (d) {
          return { day: d.day, views: d.human };
        }),
        'views'
      ) +
      '</div>'
    );
  }

  function renderSite(data) {
    var wrap = document.getElementById('site-panels');
    wrap.innerHTML =
      '<div class="panel-card">' +
      '<h3>Traffic (all of PuniCodex)</h3>' +
      '<p class="panel-sub">Last ' + esc(data.periodDays) + ' days</p>' +
      '<div class="metric-row">' +
      metric(data.totals.humanViews, 'Page views') +
      metric(data.totals.uniqueSessions, 'Unique sessions') +
      '</div>' +
      sparkline(
        (data.byDay || []).map(function (d) {
          return { day: d.day, views: d.human };
        }),
        'views'
      ) +
      '</div>' +
      '<div class="panel-card">' +
      '<h3>The Lexicon</h3>' +
      '<p class="panel-sub">Canonical dataset</p>' +
      '<div class="metric-row">' +
      metric(data.content.entries, 'Entries') +
      metric(data.content.flagships, 'Flagships') +
      metric(data.content.pantheons, 'Pantheons') +
      '</div>' +
      '</div>';
  }

  function renderResources(me) {
    var wrap = document.getElementById('resources-list');
    var rows = [];
    (me.resources.bookings || []).forEach(function (b) {
      rows.push(
        '<tr>' +
          '<td><span class="badge gold">ad space</span></td>' +
          '<td>' + esc(b.slotName) + '<span class="cell-sub">' + esc(b.siteSlug) + '</span></td>' +
          '<td>' + statusBadge(b.status) + '</td>' +
          '<td>' + esc(fmtDate(b.startedAt)) + ' → ' + esc(fmtDate(b.endsAt)) + '</td>' +
          '<td>' + (b.creativePath ? '<a href="' + esc(b.creativePath) + '" target="_blank" rel="noopener">current creative</a>' : '<span class="cell-sub">none uploaded</span>') + '</td>' +
          '</tr>'
      );
    });
    (me.resources.patrons || []).forEach(function (p) {
      rows.push(
        '<tr>' +
          '<td><span class="badge gold">patron</span></td>' +
          '<td>' + esc(p.displayName) + '<span class="cell-sub">' + esc(p.templeId) + '</span></td>' +
          '<td>' + statusBadge(p.status) + '</td>' +
          '<td>' + esc(fmtDate(p.startedAt)) + '</td>' +
          '<td>' + (p.socialUrl ? '<a href="' + esc(p.socialUrl) + '" target="_blank" rel="noopener">' + esc(p.socialPlatform || 'link') + '</a>' : '<span class="cell-sub">no links</span>') + '</td>' +
          '</tr>'
      );
    });
    wrap.innerHTML = rows.length
      ? '<div class="resource-table-wrap"><table class="resource-table">' +
        '<thead><tr><th>Kind</th><th>Resource</th><th>Status</th><th>Period</th><th>Assets</th></tr></thead>' +
        '<tbody>' + rows.join('') + '</tbody></table></div>'
      : '<div class="state-block">Nothing linked to this account yet. Resources appear here once a booking or patron subscription is activated for your email.</div>';
  }

  function renderRequestForms(me) {
    var wrap = document.getElementById('request-forms');
    var cards = [];

    (me.resources.bookings || []).forEach(function (b) {
      if (['pending_upload', 'rejected', 'approved', 'live'].indexOf(b.status) === -1) return;
      cards.push(
        '<div class="panel-card request-form-card">' +
          '<h3>Replace creative — ' + esc(b.slotName) + '</h3>' +
          '<p class="panel-sub">' + esc(b.siteSlug) + ' · PNG/JPEG/WebP, under 2MB, matching the slot dimensions</p>' +
          (b.creativePath ? '<img class="current-creative" src="' + esc(b.creativePath) + '" alt="Current creative">' : '') +
          '<form data-booking-id="' + esc(b.id) + '" class="image-request-form">' +
          '<div class="field"><label>New image</label>' +
          '<input type="file" accept="image/png,image/jpeg,image/webp" required></div>' +
          '<button type="submit" class="btn btn-primary btn-sm">Submit for Review</button>' +
          '<p class="form-message" role="alert"></p>' +
          '</form>' +
          '</div>'
      );
    });

    (me.resources.patrons || []).forEach(function (p) {
      if (p.status !== 'active') return;
      cards.push(
        '<div class="panel-card request-form-card">' +
          '<h3>Change social links — ' + esc(p.templeId) + '</h3>' +
          '<p class="panel-sub">Currently: ' + (p.socialUrl ? esc(p.socialPlatform + ' — ' + p.socialUrl) : 'no links') + '</p>' +
          '<form data-patron-id="' + esc(p.id) + '" class="links-request-form">' +
          '<div class="field"><label for="links-platform-' + esc(p.id) + '">Platform</label>' +
          '<select id="links-platform-' + esc(p.id) + '">' +
          ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'github', 'website']
            .map(function (pl) {
              return '<option value="' + pl + '"' + (p.socialPlatform === pl ? ' selected' : '') + '>' + pl + '</option>';
            })
            .join('') +
          '</select></div>' +
          '<div class="field"><label for="links-url-' + esc(p.id) + '">Profile URL (https://…)</label>' +
          '<input type="url" id="links-url-' + esc(p.id) + '" placeholder="https://" value="' + esc(p.socialUrl || '') + '"></div>' +
          '<button type="submit" class="btn btn-primary btn-sm">Submit for Review</button>' +
          '<button type="button" class="btn btn-ghost btn-sm clear-links" data-patron-id="' + esc(p.id) + '">Request link removal</button>' +
          '<p class="form-message" role="alert"></p>' +
          '</form>' +
          '</div>'
      );
    });

    wrap.innerHTML = cards.length
      ? cards.join('')
      : '<div class="state-block">No changeable resources right now.</div>';

    bindRequestForms();
  }

  function readFileAsDataUri(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error('Could not read the file'));
      };
      reader.readAsDataURL(file);
    });
  }

  function bindRequestForms() {
    Array.prototype.forEach.call(document.querySelectorAll('.image-request-form'), function (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var msg = form.querySelector('.form-message');
        msg.classList.remove('success');
        msg.textContent = '';
        var file = form.querySelector('input[type="file"]').files[0];
        if (!file) {
          msg.textContent = 'Choose an image first.';
          return;
        }
        if (['image/png', 'image/jpeg', 'image/webp'].indexOf(file.type) === -1) {
          msg.textContent = 'Image must be PNG, JPEG, or WebP.';
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          msg.textContent = 'Image must be under 2MB.';
          return;
        }
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          var dataUri = await readFileAsDataUri(file);
          await api('/api/account/requests/', {
            method: 'POST',
            body: {
              type: 'image',
              target: Number(form.getAttribute('data-booking-id')),
              payload: { image: dataUri, filename: file.name },
            },
          });
          msg.classList.add('success');
          msg.textContent = 'Submitted. It goes live once the team approves it.';
          form.reset();
          loadRequests();
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          btn.disabled = false;
        }
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.links-request-form'), function (form) {
      var patronId = Number(form.getAttribute('data-patron-id'));
      var msg = form.querySelector('.form-message');

      async function submitLinks(platform, url) {
        msg.classList.remove('success');
        msg.textContent = '';
        try {
          await api('/api/account/requests/', {
            method: 'POST',
            body: {
              type: 'social_links',
              target: patronId,
              payload: { socialPlatform: platform, socialUrl: url },
            },
          });
          msg.classList.add('success');
          msg.textContent = 'Submitted. Links update once the team approves the change.';
          loadRequests();
        } catch (err) {
          msg.textContent = err.message;
        }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitLinks(
          form.querySelector('select').value,
          form.querySelector('input[type="url"]').value.trim()
        );
      });
      form.querySelector('.clear-links').addEventListener('click', function () {
        submitLinks('', '');
      });
    });
  }

  function renderRequests(items) {
    var wrap = document.getElementById('request-history');
    if (!items.length) {
      wrap.innerHTML = '<div class="state-block">No change requests yet.</div>';
      return;
    }
    var rows = items
      .map(function (r) {
        var change =
          r.type === 'image'
            ? 'new creative (' + esc((r.payload && r.payload.originalName) || 'image') + ')'
            : r.payload && r.payload.socialPlatform === null
              ? 'remove social links'
              : esc((r.payload && r.payload.socialPlatform) + ' — ' + ((r.payload && r.payload.socialUrl) || ''));
        return (
          '<tr>' +
          '<td>#' + esc(r.id) + '</td>' +
          '<td>' + esc(String(r.type).replace(/_/g, ' ')) + '</td>' +
          '<td>' + change + '</td>' +
          '<td>' + statusBadge(r.status) + (r.reviewerNote ? '<span class="cell-sub">' + esc(r.reviewerNote) + '</span>' : '') + '</td>' +
          '<td>' + esc(fmtDate(r.createdAt)) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="resource-table-wrap"><table class="resource-table">' +
      '<thead><tr><th>ID</th><th>Type</th><th>Change</th><th>Status</th><th>Requested</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  async function loadRequests() {
    try {
      var data = await api('/api/account/requests/');
      renderRequests(data.items || []);
    } catch (err) {
      document.getElementById('request-history').innerHTML =
        '<div class="state-block error">' + esc(err.message) + '</div>';
    }
  }

  async function loadDashboard() {
    show('view-dashboard');
    var me;
    try {
      me = await api('/api/account/me/');
    } catch (err) {
      if (err.status === 401) {
        clearToken();
        show('view-login');
        return;
      }
      throw err;
    }

    var kinds = [];
    if (me.account.isSponsor) kinds.push('Sponsor');
    if (me.account.isPatron) kinds.push('Patron');
    document.getElementById('dashboard-subtitle').textContent =
      me.account.email + (kinds.length ? ' · ' + kinds.join(' & ') : '');

    renderResources(me);
    renderRequestForms(me);
    loadRequests();

    // Analytics panels load independently so one failure never blanks the page.
    api('/api/account/analytics/space/')
      .then(renderSpace)
      .catch(function (err) {
        document.getElementById('space-panels').innerHTML =
          '<div class="state-block error">' + esc(err.message) + '</div>';
      });

    var templeIds = [];
    (me.resources.bookings || []).forEach(function (b) {
      if (b.siteSlug && templeIds.indexOf(b.siteSlug) === -1) templeIds.push(b.siteSlug);
    });
    (me.resources.patrons || []).forEach(function (p) {
      if (p.templeId && templeIds.indexOf(p.templeId) === -1) templeIds.push(p.templeId);
    });
    if (!templeIds.length) {
      document.getElementById('temple-panels').innerHTML =
        '<div class="state-block">No temples linked to this account yet.</div>';
    } else {
      Promise.all(
        templeIds.map(function (id) {
          return api('/api/account/analytics/temple/' + encodeURIComponent(id) + '/').then(function (data) {
            return { id: id, data: data };
          });
        })
      )
        .then(function (results) {
          document.getElementById('temple-panels').innerHTML = results
            .map(function (r) {
              return renderTemple(r.id, r.data);
            })
            .join('');
        })
        .catch(function (err) {
          document.getElementById('temple-panels').innerHTML =
            '<div class="state-block error">' + esc(err.message) + '</div>';
        });
    }

    api('/api/account/analytics/site/')
      .then(renderSite)
      .catch(function (err) {
        document.getElementById('site-panels').innerHTML =
          '<div class="state-block error">' + esc(err.message) + '</div>';
      });
  }

  function initLogout() {
    document.getElementById('logout-btn').addEventListener('click', async function () {
      try {
        await api('/api/account/auth/logout/', { method: 'POST', body: {} });
      } catch (e) {
        /* sign out locally regardless */
      }
      clearToken();
      show('view-login');
    });
  }

  // ── Boot ─────────────────────────────────────────────────

  function init() {
    initLoginView();
    initLogout();

    var params = new URLSearchParams(window.location.search);
    var setupToken = params.get('token');
    if (setupToken) {
      initSetPasswordView(setupToken);
      show('view-set-password');
      return;
    }

    if (getToken()) {
      loadDashboard().catch(function () {
        show('view-login');
      });
      return;
    }

    show('view-login');
  }

  init();
})();
