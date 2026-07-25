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
      wrap.innerHTML = '<div class="sb-state">No ad-space bookings on this account yet.</div>';
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

  function renderPatrons(patrons) {
    var wrap = document.getElementById('patrons-list');
    if (!patrons.length) {
      wrap.innerHTML = '<div class="sb-state">No patron spots on this account.</div>';
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
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>Name</th><th>Temple</th><th>Status</th><th>Period</th><th>Countdown</th><th>Links</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('bookings', me.account.email);
    renderBookings(me.resources.bookings || []);
    renderPatrons(me.resources.patrons || []);
  }

  init().catch(function (err) {
    document.getElementById('bookings-list').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
