/**
 * Sponsor Sandbox — Bookings roster.
 *
 * Full list of the account's ad-space bookings (status, lease period with a
 * live countdown to ends_at, advertiser dashboard link) and patron spots.
 * Dashboard URLs use the per-booking dashboard token returned to the
 * authenticated owner by /api/account/me/ — the same credential the
 * booking-recovery email delivers.
 */
(function () {
  'use strict';

  var S = window.Sandbox;

  function countdown(endsAt) {
    var days = S.daysUntil(endsAt);
    if (days === null) return '<span class="sb-cell-sub">—</span>';
    if (days < 0) return '<span class="sb-badge red">ended ' + Math.abs(days) + 'd ago</span>';
    if (days === 0) return '<span class="sb-badge amber">ends today</span>';
    if (days <= 14) return '<span class="sb-badge amber">' + days + 'd left</span>';
    return '<span class="sb-badge muted">' + days + 'd left</span>';
  }

  function renderBookings(bookings) {
    var wrap = document.getElementById('bookings-list');
    if (!bookings.length) {
      // No rows → the whole section disappears (never an empty table).
      document.getElementById('adspace-section').hidden = true;
      return;
    }
    var rows = bookings
      .map(function (b) {
        var dash = b.dashboardToken
          ? '<a class="sb-btn sb-btn-outline sb-btn-sm" href="/sites/' + S.esc(b.siteSlug) + '/dashboard/?token=' + encodeURIComponent(b.dashboardToken) + '">Dashboard</a>'
          : '<span class="sb-cell-sub">unavailable</span>';
        return (
          '<tr>' +
          '<td>' + S.esc(b.slotName) + '<span class="sb-cell-sub">' + S.esc(b.slotSlug || '') + (b.isBundle ? ' · takeover' : '') + '</span></td>' +
          '<td><a href="/sites/' + S.esc(b.siteSlug) + '/">' + S.esc(b.siteSlug) + '</a></td>' +
          '<td>' + S.statusBadge(b.status) + '</td>' +
          '<td>' + S.esc(S.fmtDate(b.startedAt)) + ' → ' + S.esc(S.fmtDate(b.endsAt)) + '</td>' +
          '<td>' + countdown(b.endsAt) + '</td>' +
          '<td>' + (b.creativePath ? '<a href="' + S.esc(b.creativePath) + '" target="_blank" rel="noopener">creative</a>' : '<span class="sb-cell-sub">none</span>') + '</td>' +
          '<td>' + dash + '</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>Placement</th><th>Temple</th><th>Status</th><th>Period</th><th>Countdown</th><th>Assets</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function patronActionCell(p) {
    if (p.status !== 'active') return '<span class="sb-cell-sub">—</span>';
    return (
      '<button type="button" class="sb-btn sb-btn-outline sb-btn-sm" data-cancel-patron="' +
      S.esc(p.id) +
      '">Cancel membership</button>'
    );
  }

  function renderPatrons(patrons) {
    var wrap = document.getElementById('patrons-list');
    if (!patrons.length) {
      // No patron spots → the whole section disappears (no empty table).
      document.getElementById('patrons-section').hidden = true;
      return;
    }
    var rows = patrons
      .map(function (p) {
        return (
          '<tr>' +
          '<td>' + S.esc(p.displayName) + '<span class="sb-cell-sub">' + S.esc(p.title || '') + '</span></td>' +
          '<td><a href="/sites/' + S.esc(p.templeId) + '/">' + S.esc(p.templeId) + '</a></td>' +
          '<td>' + S.statusBadge(p.status) + '</td>' +
          '<td>' + S.esc(S.fmtDate(p.startedAt)) + (p.endsAt ? ' → ' + S.esc(S.fmtDate(p.endsAt)) : '') + '</td>' +
          '<td>' + (p.endsAt ? countdown(p.endsAt) : '<span class="sb-cell-sub">renews monthly</span>') + '</td>' +
          '<td>' + (p.socialUrl ? '<a href="' + S.esc(p.socialUrl) + '" target="_blank" rel="noopener">' + S.esc(p.socialPlatform || 'link') + '</a>' : '<span class="sb-cell-sub">no links</span>') + '</td>' +
          '<td>' + patronActionCell(p) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>Name</th><th>Temple</th><th>Status</th><th>Period</th><th>Countdown</th><th>Links</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
    bindPatronCancelButtons(wrap);
  }

  function bindPatronCancelButtons(wrap) {
    var buttons = wrap.querySelectorAll('[data-cancel-patron]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.getAttribute('data-cancel-patron');
        var confirmed = window.confirm(
          'Cancel this patron membership? It takes effect immediately: your name comes off the patron wall and no further charges are made.'
        );
        if (!confirmed) return;
        btn.disabled = true;
        btn.textContent = 'Cancelling…';
        try {
          await S.api('/api/account/patrons/' + encodeURIComponent(id) + '/cancel', {
            method: 'POST',
            body: {},
          });
          await init();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Cancel membership';
          window.alert(err.message || 'Could not cancel the membership. Please try again.');
        }
      });
    });
  }

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('bookings', me.account.email);
    var bookings = me.resources.bookings || [];
    var patrons = me.resources.patrons || [];
    renderBookings(bookings);
    renderPatrons(patrons);
    // Both rosters empty → one shared elegant state instead of two empty tables.
    if (!bookings.length && !patrons.length) {
      var emptyWrap = document.getElementById('bookings-empty');
      emptyWrap.innerHTML = S.emptyHero();
      emptyWrap.hidden = false;
    }
  }

  init().catch(function (err) {
    document.getElementById('adspace-section').hidden = false;
    document.getElementById('bookings-list').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
