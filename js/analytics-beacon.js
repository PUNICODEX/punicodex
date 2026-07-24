/**
 * PuniCodex — first-party analytics beacon (v2).
 *
 * Events, all anonymous:
 *   pv  — one page-view ping per load (path, referrer, tab-session id)
 *   eng — one engagement ping per page visit, sent on hide/unload
 *         (visible milliseconds + max scroll depth)
 *
 * Privacy contract:
 *   - Honors Do Not Track.
 *   - Reads the consent record (localStorage `punicodex.cookie-consent`,
 *     written by js/cookie-consent.js):
 *       declined          → send nothing, ever.
 *       accepted          → pv + eng.
 *       no choice yet     → pv only (anonymous page counting is the
 *                           strictly-necessary tier); eng stays off until
 *                           the visitor opts in.
 *   - Never fires on admin/auth surfaces (path prefix blocklist).
 *   - No visitor id, no fingerprinting, no cross-tab identity: the session
 *     id lives in sessionStorage and dies with the tab.
 *   - Never throws; never breaks the page over analytics.
 */
(function () {
  'use strict';

  try {
    if (navigator.doNotTrack === '1') return;

    var path = location.pathname || '/';
    var BLOCKED = [
      '/admin',
      '/account',
      '/advertiser-panel',
      '/scholars/login',
      '/scholars/dashboard',
      '/scholars/review',
      '/scholars/admin',
      '/scholars/dept-admin',
      '/scholars/institution',
    ];
    for (var b = 0; b < BLOCKED.length; b++) {
      if (path.indexOf(BLOCKED[b]) === 0) return;
    }

    var consent = 'unset';
    try {
      var raw = localStorage.getItem('punicodex.cookie-consent');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.choice) consent = parsed.choice;
      }
    } catch (e) {
      consent = 'unset';
    }
    if (consent === 'declined') return;
    var allowEngagement = consent === 'accepted';

    var sid = '';
    try {
      sid = sessionStorage.getItem('px_sid');
      if (!sid) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        sid = '';
        for (var i = 0; i < bytes.length; i++) {
          sid += chars.charAt(bytes[i] % chars.length);
        }
        sessionStorage.setItem('px_sid', sid);
      }
    } catch (e) {
      sid = '';
    }

    var ENDPOINT = '/api/analytics/collect/';
    var post = function (payload) {
      try {
        if (navigator.sendBeacon) {
          var sent = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
          if (sent) return;
        }
        fetch(ENDPOINT, {
          method: 'POST',
          body: payload,
          keepalive: true,
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        // Never break the page over analytics.
      }
    };

    var sendPageView = function () {
      post(JSON.stringify({ p: path, r: document.referrer || '', s: sid }));
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sendPageView);
    } else {
      sendPageView();
    }

    if (!allowEngagement) return;

    // ---- engagement: visible time + max scroll depth, one ping on leave ----
    var visibleMs = 0;
    var visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
    var maxScroll = 0;
    var flushed = false;

    var measureScroll = function () {
      try {
        var doc = document.documentElement;
        var total = doc.scrollHeight - window.innerHeight;
        var pct = total > 0 ? Math.round((window.scrollY / total) * 100) : 100;
        if (pct > maxScroll) maxScroll = Math.min(pct, 100);
      } catch (e) {
        // ignore
      }
    };

    var onVisibility = function () {
      if (document.visibilityState === 'visible') {
        if (!visibleSince) visibleSince = Date.now();
      } else if (visibleSince) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = 0;
      }
    };

    var flush = function () {
      if (flushed) return;
      flushed = true;
      onVisibility();
      var ms = Math.min(Math.max(visibleMs, 0), 1800000); // cap 30 min
      if (ms < 500) return; // ignore bounces shorter than half a second
      post(JSON.stringify({ t: 'eng', p: path, s: sid, ms: ms, sc: maxScroll }));
    };

    document.addEventListener('visibilitychange', function () {
      onVisibility();
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('scroll', measureScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    measureScroll();
  } catch (e) {
    // Never break the page over analytics.
  }
})();
