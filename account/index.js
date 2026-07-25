/**
 * Sponsor Sandbox — Overview page.
 *
 * Three panels, all scoped to the authenticated tenant:
 *   1. My Temples    — one card per temple the account owns placements on
 *                      (traffic + attention + top countries from the guarded
 *                      temple enrichment).
 *   2. My Placements — one row per booking (impressions, viewability, clicks,
 *                      CTR, 30d sparkline); a row opens the placement detail.
 *   3. Patron Spots  — patron walls honestly report tracking: 'none'.
 * Legacy one-time setup links arrive at /account/?token=… and are forwarded
 * to the login page, which owns the set-password flow.
 */
(function () {
  'use strict';

  var S = window.Sandbox;

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
      wrap.innerHTML = '<div class="sb-state">No ad placements are linked to this account yet.</div>';
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

  function renderPatrons(patrons) {
    var wrap = document.getElementById('patrons-strip');
    if (!patrons.length) {
      wrap.innerHTML = '<div class="sb-state">No patron spots on this account.</div>';
      return;
    }
    wrap.innerHTML = patrons
      .map(function (p) {
        return (
          '<div class="sb-panel">' +
          '<h3>Patron — ' + S.esc(p.templeId) + '</h3>' +
          '<p class="sb-panel-sub">' + S.esc(p.displayName) + ' · ' + S.esc(String(p.status || '').replace(/_/g, ' ')) + '</p>' +
          '<p class="sb-honesty">Per-spot event tracking is not available for patron walls — see the temple card above for page traffic.</p>' +
          '</div>'
        );
      })
      .join('');
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
      templeWrap.innerHTML = '<div class="sb-state">No temples linked to this account yet.</div>';
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

    // Placements + patrons share the space analytics payload.
    try {
      var space = await S.api('/api/account/analytics/space/');
      renderPlacements(space.slots || []);
      renderPatrons(space.patrons || []);
    } catch (err) {
      document.getElementById('placements-list').innerHTML =
        '<div class="sb-state error">' + S.esc(err.message) + '</div>';
      document.getElementById('patrons-strip').innerHTML =
        '<div class="sb-state error">' + S.esc(err.message) + '</div>';
    }
  }

  init().catch(function (err) {
    document.getElementById('temple-cards').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
