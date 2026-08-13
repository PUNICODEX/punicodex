/**
 * Sponsor Sandbox — Overview page.
 *
 * Scoped to the authenticated tenant:
 *   0. Action banner — a booking in a creative-changeable status with no
 *      creative yet is the sponsor's #1 job; a pending_approval booking with
 *      a creative is calmly reported as under review.
 *   1. My Temples    — one card per temple the account owns placements on
 *                      (traffic + attention + top countries from the guarded
 *                      temple enrichment). Hidden entirely when there are none.
 *   2. My Placements — one row per booking (impressions, viewability, clicks,
 *                      CTR, 30d sparkline); a row opens the placement detail.
 *                      Hidden entirely when there are none.
 *   An account with nothing at all gets ONE elegant empty state instead of a
 *   wall of empty boxes. Patron spots are managed on the Bookings page.
 * Legacy one-time setup links arrive at /account/?token=… and are forwarded
 * to the login page, which owns the set-password flow.
 */
(function () {
  'use strict';

  var S = window.Sandbox;
  var IMAGE_CHANGEABLE_STATUSES = ['pending_upload', 'rejected', 'approved', 'live', 'pending_approval'];

  function slotList(bookings) {
    return bookings
      .map(function (b) {
        return '<strong>' + S.esc(b.slotName) + '</strong>';
      })
      .join(', ');
  }

  /**
   * The top-of-page action area: gold banner when a creative is missing
   * (the sponsor's next move), calm info note while a creative is in review.
   */
  function renderActions(bookings) {
    var wrap = document.getElementById('overview-actions');
    var awaiting = bookings.filter(function (b) {
      return IMAGE_CHANGEABLE_STATUSES.indexOf(b.status) !== -1 && !b.creativePath;
    });
    var inReview = bookings.filter(function (b) {
      return b.status === 'pending_approval' && b.creativePath;
    });
    var html = '';
    if (awaiting.length) {
      html +=
        '<div class="sb-action-banner" role="alert">' +
        '<span class="sb-action-glyph" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 16V4"></path><path d="m6 10 6-6 6 6"></path><path d="M4 20h16"></path>' +
        '</svg></span>' +
        '<div class="sb-action-body">' +
        '<h2>Action needed — upload your creative</h2>' +
        '<p>' + slotList(awaiting) + (awaiting.length === 1 ? ' is' : ' are') +
        ' approved but ha' + (awaiting.length === 1 ? 's' : 've') +
        ' no creative yet — the placement can’t go live until you upload one.</p>' +
        '</div>' +
        '<a class="sb-btn sb-btn-primary" href="/account/brand/">Upload creative</a>' +
        '</div>';
    }
    if (inReview.length) {
      html +=
        '<div class="sb-action-banner info" role="status">' +
        '<span class="sb-action-glyph" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>' +
        '</svg></span>' +
        '<div class="sb-action-body">' +
        '<h2>Creative under review by the PuniCodex team</h2>' +
        '<p>' + slotList(inReview) + ' — it goes live once approved. No action needed from you.</p>' +
        '</div>' +
        '</div>';
    }
    wrap.innerHTML = html;
  }

  function sumLastDays(byDay, key, days) {
    var series = (byDay || []).slice(-days);
    return series.reduce(function (sum, d) {
      return sum + (Number(d[key]) || 0);
    }, 0);
  }

  function renderTempleCard(templeId, placements, data) {
    var views7 = sumLastDays(data.byDay, 'human', 7);
    var attention = data.attention ? S.fmtMs(data.attention.avgVisibleMs) : '—';
    var countries = (data.countries || []).slice(0, 3);
    return (
      '<div class="sb-panel sb-temple-card">' +
      '<img class="sb-temple-mascot" src="/sites/' + S.esc(templeId) + '/assets/' + S.esc(templeId) + '_mascot.webp" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<div class="sb-temple-body">' +
      '<h3 class="sb-temple-name">' + S.esc(templeId) + '</h3>' +
      '<p class="sb-temple-meta">' + placements + ' placement' + (placements === 1 ? '' : 's') +
      ' · <a href="/sites/' + S.esc(templeId) + '/">view temple &rarr;</a></p>' +
      '<div class="sb-metric-row">' +
      '<div><div class="sb-metric-value">' + S.esc(S.fmtNumber(views7)) + '</div><div class="sb-metric-label">Page views · 7d</div></div>' +
      '<div><div class="sb-metric-value">' + S.esc(attention) + '</div><div class="sb-metric-label">Avg. attention</div></div>' +
      '</div>' +
      (countries.length
        ? '<div class="sb-chip-row">' +
          countries
            .map(function (c) {
              return '<span class="sb-chip">' + S.esc(S.countryName(c.country)) + ' · ' + S.esc(S.fmtNumber(c.views)) + '</span>';
            })
            .join('') +
          '</div>'
        : '') +
      '</div></div>'
    );
  }

  function renderPlacements(slots) {
    var wrap = document.getElementById('placements-list');
    if (!slots.length) {
      // No rows → the whole section disappears (never an empty box).
      document.getElementById('placements-section').hidden = true;
      return;
    }
    var rows = slots
      .map(function (s) {
        return (
          '<tr class="clickable" data-booking-id="' + S.esc(s.bookingId) + '" tabindex="0" role="link" aria-label="Open placement detail for ' + S.esc(s.slotName) + '">' +
          '<td>' + S.esc(s.slotName) + '<span class="sb-cell-sub">' + S.esc(s.slotSlug || '') + (s.isBundle ? ' · takeover' : '') + '</span></td>' +
          '<td>' + S.esc(s.siteSlug) + '</td>' +
          '<td>' + S.statusBadge(s.status) + '</td>' +
          '<td class="num">' + S.esc(S.fmtNumber(s.impressions)) + '</td>' +
          '<td class="num">' + S.esc(s.viewabilityPct || '0.0') + '%</td>' +
          '<td class="num">' + S.esc(S.fmtNumber(s.clicks)) + '</td>' +
          '<td class="num">' + S.esc(s.ctr) + '%</td>' +
          '<td>' + S.sparkline(s.daily, 'impressions') + '</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>Placement</th><th>Temple</th><th>Status</th><th class="num">Impr.</th><th class="num">Viewable</th><th class="num">Clicks</th><th class="num">CTR</th><th>30d</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';

    Array.prototype.forEach.call(wrap.querySelectorAll('tr.clickable'), function (row) {
      var open = function () {
        window.location.href = '/account/slot/?id=' + encodeURIComponent(row.getAttribute('data-booking-id'));
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  async function init() {
    // Forward one-time setup/reset links to the login page, which owns that
    // flow (activation emails point at /account/?token=…).
    var params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      window.location.replace('/account/login/?token=' + encodeURIComponent(params.get('token')));
      return;
    }

    var me = await S.requireAccount();
    if (!me) return; // redirected to login

    S.mountShell('overview', me.account.email);
    var kinds = [];
    if (me.account.isSponsor) kinds.push('Sponsor');
    if (me.account.isPatron) kinds.push('Patron');
    document.getElementById('overview-sub').textContent =
      me.account.email + (kinds.length ? ' · ' + kinds.join(' & ') : '');

    // The sponsor's next move comes first: missing creatives, then review state.
    renderActions(me.resources.bookings || []);

    // Temple cards: per owned temple, with per-card failure isolation.
    var templeIds = [];
    var placementCounts = {};
    (me.resources.bookings || []).forEach(function (b) {
      if (!b.siteSlug) return;
      placementCounts[b.siteSlug] = (placementCounts[b.siteSlug] || 0) + 1;
      if (templeIds.indexOf(b.siteSlug) === -1) templeIds.push(b.siteSlug);
    });
    (me.resources.patrons || []).forEach(function (p) {
      if (p.templeId && templeIds.indexOf(p.templeId) === -1) templeIds.push(p.templeId);
    });

    var templeWrap = document.getElementById('temple-cards');
    if (!templeIds.length) {
      // No rows → the whole section disappears (never an empty box).
      document.getElementById('temples-section').hidden = true;
    } else {
      var cards = await Promise.all(
        templeIds.map(async function (id) {
          try {
            var data = await S.api('/api/account/analytics/temple/' + encodeURIComponent(id) + '/');
            return renderTempleCard(id, placementCounts[id] || 0, data);
          } catch (err) {
            return (
              '<div class="sb-panel sb-temple-card"><div class="sb-temple-body">' +
              '<h3 class="sb-temple-name">' + S.esc(id) + '</h3>' +
              '<p class="sb-temple-meta">Traffic unavailable: ' + S.esc(err.message) + '</p>' +
              '</div></div>'
            );
          }
        })
      );
      templeWrap.innerHTML = cards.join('');
    }

    // Placements come from the shared space analytics payload.
    try {
      var space = await S.api('/api/account/analytics/space/');
      renderPlacements(space.slots || []);
    } catch (err) {
      document.getElementById('placements-list').innerHTML =
        '<div class="sb-state error">' + S.esc(err.message) + '</div>';
    }

    // Nothing at all → one elegant empty state instead of empty sections.
    var hasNothing = !(me.resources.bookings || []).length && !(me.resources.patrons || []).length;
    if (hasNothing) {
      var emptyWrap = document.getElementById('overview-empty');
      emptyWrap.innerHTML = S.emptyHero();
      emptyWrap.hidden = false;
    }
  }

  init().catch(function (err) {
    document.getElementById('temple-cards').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
