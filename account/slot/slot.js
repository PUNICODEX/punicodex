/**
 * Sponsor Sandbox — Placement detail (?id=<bookingId>).
 *
 * Primary source: GET /api/account/analytics/slot/?id= (booking summary +
 * event stats with per-placement bySlot split + host temple traffic). If the
 * slot endpoint is not available on an older deployment (404/405), falls
 * back to the original /analytics/space/ + /analytics/temple/:id/ calls so
 * the page still renders whatever the account can see.
 */
(function () {
  'use strict';

  var S = window.Sandbox;

  function kpi(value, label, gold) {
    return (
      '<div class="sb-kpi"><div class="sb-kpi-value' + (gold ? ' gold' : '') + '">' +
      S.esc(value) + '</div><div class="sb-kpi-label">' + S.esc(label) + '</div></div>'
    );
  }

  function seriesValues(daily, key) {
    return (daily || []).map(function (d) {
      return Number(d[key]) || 0;
    });
  }

  function chartCaption(daily) {
    if (!daily || !daily.length) return ['', ''];
    return [daily[0].day, daily[daily.length - 1].day];
  }

  function renderSummary(booking) {
    document.getElementById('slot-title').textContent = booking.slotName || 'Placement';
    document.getElementById('slot-sub').textContent =
      (booking.siteSlug || '') + (booking.isBundle ? ' · full-page takeover' : '');
    document.getElementById('slot-summary').innerHTML =
      '<h3>Booking</h3>' +
      '<div class="sb-table-wrap" style="border:none;background:transparent;"><table class="sb-table"><tbody>' +
      '<tr><td class="sb-cell-sub">Placement</td><td>' + S.esc(booking.slotName) + ' <span class="sb-mono">' + S.esc(booking.slotSlug || '') + '</span></td></tr>' +
      '<tr><td class="sb-cell-sub">Temple</td><td><a href="/sites/' + S.esc(booking.siteSlug) + '/">' + S.esc(booking.siteSlug) + '</a></td></tr>' +
      '<tr><td class="sb-cell-sub">Status</td><td>' + S.statusBadge(booking.status) + '</td></tr>' +
      '<tr><td class="sb-cell-sub">Sponsor</td><td>' + S.esc(booking.companyName || '—') + '</td></tr>' +
      '<tr><td class="sb-cell-sub">Period</td><td>' + S.esc(S.fmtDate(booking.startedAt)) + ' → ' + S.esc(S.fmtDate(booking.endsAt)) + '</td></tr>' +
      (booking.width && booking.height
        ? '<tr><td class="sb-cell-sub">Creative size</td><td>' + S.esc(booking.width) + ' × ' + S.esc(booking.height) + ' px</td></tr>'
        : '') +
      '</tbody></table></div>';
    document.getElementById('slot-creative').innerHTML =
      '<h3>Current Creative</h3>' +
      (booking.creativePath
        ? '<img class="sb-creative-preview" src="' + S.esc(booking.creativePath) + '" alt="Current creative">' +
          '<p class="sb-panel-sub">Change it on the <a href="/account/brand/">Brand page</a>.</p>'
        : '<p class="sb-panel-sub">No creative uploaded yet — upload one on the <a href="/account/brand/">Brand page</a>.</p>');
  }

  function renderKpis(data) {
    document.getElementById('slot-kpis').innerHTML =
      kpi(S.fmtNumber(data.impressions), 'Impressions') +
      kpi(S.fmtNumber(data.viewableImpressions), 'Viewable impressions') +
      kpi((data.viewabilityPct || '0.0') + '%', 'Viewability', true) +
      kpi(S.fmtNumber(data.clicks), 'Clicks') +
      kpi(data.ctr + '%', 'CTR', true);
  }

  function renderCharts(data) {
    S.drawBars(document.getElementById('chart-impressions'), seriesValues(data.daily, 'impressions'), '#d4af37');
    S.drawBars(document.getElementById('chart-clicks'), seriesValues(data.daily, 'clicks'), '#7ab8f5');
    var cap = chartCaption(data.daily);
    document.getElementById('caption-impressions').innerHTML =
      '<span>' + S.esc(cap[0]) + '</span><span>' + S.esc(cap[1]) + '</span>';
    document.getElementById('caption-clicks').innerHTML =
      '<span>' + S.esc(cap[0]) + '</span><span>' + S.esc(cap[1]) + '</span>';
  }

  /**
   * The bySlot split. For takeovers every member placement appears with its
   * own numbers; the null bucket (events without a placement slug, e.g.
   * recorded before per-placement tracking) is labelled as the slot itself.
   */
  function renderPlacements(booking, bySlot) {
    var note = document.getElementById('placements-note');
    var wrap = document.getElementById('slot-placements');
    if (!bySlot || !bySlot.length) {
      note.textContent = '';
      wrap.innerHTML =
        '<div class="sb-state">No placement events recorded yet. Numbers appear once the sponsorship is live and serving.</div>';
      return;
    }
    note.textContent = booking.isBundle
      ? 'Each member placement of this takeover reports separately'
      : 'Events are attributed to this placement';
    var rows = bySlot
      .map(function (s) {
        var label = s.slotSlug || booking.slotSlug || booking.slotName;
        var sub = s.slotSlug ? 'member placement' : 'whole placement';
        return (
          '<tr>' +
          '<td>' + S.esc(label) + '<span class="sb-cell-sub">' + sub + '</span></td>' +
          '<td class="num">' + S.esc(S.fmtNumber(s.impressions)) + '</td>' +
          '<td class="num">' + S.esc(S.fmtNumber(s.viewableImpressions)) + '</td>' +
          '<td class="num">' + S.esc(s.viewabilityPct) + '%</td>' +
          '<td class="num">' + S.esc(S.fmtNumber(s.clicks)) + '</td>' +
          '<td class="num">' + S.esc(s.ctr) + '%</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>Placement</th><th class="num">Impr.</th><th class="num">Viewable</th><th class="num">Viewability</th><th class="num">Clicks</th><th class="num">CTR</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function renderTemple(temple) {
    var wrap = document.getElementById('slot-temple');
    if (!temple) {
      wrap.innerHTML = '<div class="sb-state">Temple traffic is unavailable right now.</div>';
      return;
    }
    var t = temple.totals || {};
    var attention = temple.attention ? S.fmtMs(temple.attention.avgVisibleMs) : '—';

    var devicesHtml = '';
    if (temple.devices) {
      var devRows = Object.keys(temple.devices)
        .map(function (k) {
          return { device: k, views: Number(temple.devices[k]) || 0 };
        })
        .filter(function (r) {
          return r.views > 0;
        });
      devicesHtml = S.barRows(
        devRows,
        function (r) {
          return r.device;
        },
        function (r) {
          return r.views;
        }
      );
    }

    wrap.innerHTML =
      '<div class="sb-grid kpis" style="margin-bottom:1rem;">' +
      kpi(S.fmtNumber(t.humanViews), 'Page views') +
      kpi(S.fmtNumber(t.uniqueSessions), 'Unique sessions') +
      kpi(attention, 'Avg. attention', true) +
      '</div>' +
      '<div class="sb-grid two">' +
      '<div class="sb-panel"><h3>Top Countries</h3>' +
      (S.barRows(
        temple.countries,
        function (r) {
          return S.countryName(r.country);
        },
        function (r) {
          return r.views;
        }
      ) || '<p class="sb-panel-sub">No country data yet.</p>') +
      '</div>' +
      '<div class="sb-panel"><h3>Referrers</h3>' +
      (S.barRows(
        temple.referrers,
        function (r) {
          return r.referrer;
        },
        function (r) {
          return r.count;
        }
      ) || '<p class="sb-panel-sub">No referrer data yet.</p>') +
      '</div>' +
      '</div>' +
      (devicesHtml
        ? '<div class="sb-grid two" style="margin-top:1rem;"><div class="sb-panel"><h3>Devices</h3>' + devicesHtml + '</div></div>'
        : '');
  }

  /** Fallback for older deployments without the slot endpoint. */
  async function loadViaLegacyEndpoints(bookingId) {
    var space = await S.api('/api/account/analytics/space/');
    var slot = (space.slots || []).find(function (s) {
      return String(s.bookingId) === String(bookingId);
    });
    if (!slot) {
      var err = new Error('You do not own this booking');
      err.status = 403;
      throw err;
    }
    var temple = null;
    try {
      temple = await S.api('/api/account/analytics/temple/' + encodeURIComponent(slot.siteSlug) + '/');
    } catch (e) {
      temple = null;
    }
    return {
      booking: {
        id: slot.bookingId,
        slotName: slot.slotName,
        slotSlug: slot.slotSlug,
        siteSlug: slot.siteSlug,
        status: slot.status,
        creativePath: slot.creativePath,
        isBundle: Boolean(slot.isBundle),
      },
      impressions: slot.impressions,
      clicks: slot.clicks,
      ctr: slot.ctr,
      viewableImpressions: slot.viewableImpressions || 0,
      viewabilityPct: slot.viewabilityPct || '0.0',
      bySlot: slot.bySlot || [],
      daily: slot.daily || [],
      temple: temple,
    };
  }

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('overview', me.account.email);

    var bookingId = new URLSearchParams(window.location.search).get('id');
    if (!bookingId) {
      document.getElementById('slot-root').innerHTML =
        '<div class="sb-state error">No placement selected. Pick one from the <a href="/account/">overview</a>.</div>';
      return;
    }

    var data;
    try {
      data = await S.api('/api/account/analytics/slot/?id=' + encodeURIComponent(bookingId));
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        data = await loadViaLegacyEndpoints(bookingId);
      } else {
        throw err;
      }
    }

    document.getElementById('slot-root').hidden = true;
    document.getElementById('slot-content').hidden = false;
    renderSummary(data.booking);
    renderKpis(data);
    renderCharts(data);
    renderPlacements(data.booking, data.bySlot);
    renderTemple(data.temple);
  }

  init().catch(function (err) {
    var msg = err.status === 403 ? 'You do not own this booking.' : err.message;
    document.getElementById('slot-root').innerHTML = '<div class="sb-state error">' + S.esc(msg) + '</div>';
  });
})();
