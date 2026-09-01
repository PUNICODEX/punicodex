/**
 * PuniCodex — first-party analytics beacon (v3, event_v2 pipeline).
 *
 * Privacy contract:
 *   - Honors Do Not Track.
 *   - Reads localStorage `punicodex.cookie-consent`:
 *       declined  → send nothing.
 *       accepted  → page_view + engagement + tracked events.
 *       unset     → page_view only.
 *   - Skips admin/auth surfaces.
 *   - Session id lives in sessionStorage and dies with the tab.
 *   - Never throws.
 *
 * Events are normalized objects flushed as a JSON array to
 * /api/analytics/collect/. window.px.track(name, props) is exposed.
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
    var queue = [];
    var flushTimer = null;
    var MAX_QUEUE = 10;
    var FLUSH_INTERVAL = 5000;
    var TOP_KEYS = {
      event_version: 1,
      path: 1,
      page_type: 1,
      temple_id: 1,
      session_hash: 1,
      device: 1,
      referrer: 1,
      referrer_domain: 1,
      utm_source: 1,
      utm_medium: 1,
      utm_campaign: 1,
      country: 1,
      properties: 1,
      created_at: 1,
    };

    function getParam(name) {
      try {
        return new URLSearchParams(location.search).get(name) || '';
      } catch (e) {
        return '';
      }
    }

    function device() {
      var ua = navigator.userAgent || '';
      if (/Mobile|Android.*Mobile|iPhone/.test(ua)) return 'mobile';
      if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) return 'tablet';
      return 'desktop';
    }

    function templeId(p) {
      var m = p.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
      if (m) return m[1];
      m = p.match(/^\/([a-z0-9-]{1,64})(\/|$)/);
      return m ? m[1] : '';
    }

    function pageType(p) {
      var sm = p.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
      var cm = p.match(/^\/([a-z0-9-]{1,64})(\/|$)/);
      var rest = sm ? p.slice(('/sites/' + sm[1]).length) : cm ? p.slice(('/' + cm[1]).length) : '';
      if (rest.indexOf('/blog') === 0) return 'blog';
      if (rest.indexOf('/patterns') === 0) return 'patterns';
      if (rest.indexOf('/lore') === 0) return 'lore';
      if (rest.indexOf('/scholars') === 0) return 'scholars';
      if (rest.indexOf('/store') === 0) return 'store';
      if (sm || cm) return 'temple';
      if (p.indexOf('/search') === 0) return 'search';
      if (p.indexOf('/account') === 0) return 'account';
      if (p.indexOf('/admin') === 0) return 'admin';
      if (p.indexOf('/store') === 0) return 'store';
      return 'static';
    }

    function flush() {
      if (!queue.length) return;
      var batch = queue.splice(0, queue.length);
      try {
        var payload = JSON.stringify(batch);
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
        // ignore
      }
    }

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(function () {
        flushTimer = null;
        flush();
      }, FLUSH_INTERVAL);
    }

    function track(name, props) {
      props = props || {};
      var now = new Date().toISOString();
      var evPath = props.path || path;
      var ev = {
        event_name: name,
        event_version: props.event_version || 1,
        path: evPath,
        page_type: props.page_type || pageType(evPath),
        temple_id: props.temple_id !== undefined ? props.temple_id : templeId(evPath),
        session_hash: props.session_hash || sid,
        referrer: props.referrer !== undefined ? props.referrer : document.referrer || '',
        device: props.device || device(),
        country: props.country || '',
        properties: '',
        created_at: props.created_at || now,
      };
      for (var key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key) && TOP_KEYS[key]) {
          ev[key] = props[key];
        }
      }
      var properties = props.properties || {};
      if (name === 'engagement') {
        properties = {
          visible_ms: props.visible_ms || props.ms || 0,
          scroll_pct: props.scroll_pct || props.sc || 0,
        };
      }
      try {
        ev.properties = JSON.stringify(properties);
      } catch (e) {
        ev.properties = '{}';
      }
      queue.push(ev);
      if (queue.length >= MAX_QUEUE) flush();
      else scheduleFlush();
    }

    window.px = window.px || {};
    window.px.track = track;

    track('page_view', {
      path: path,
      referrer: document.referrer || '',
      utm_source: getParam('utm_source'),
      utm_medium: getParam('utm_medium'),
      utm_campaign: getParam('utm_campaign'),
      device: device(),
    });

    function flushOnLeave() {
      flush();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushOnLeave();
    });
    window.addEventListener('pagehide', flushOnLeave);
    window.addEventListener('beforeunload', flushOnLeave);

    if (!allowEngagement) return;

    var visibleMs = 0;
    var visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
    var maxScroll = 0;
    var flushed = false;

    function measureScroll() {
      try {
        var doc = document.documentElement;
        var total = doc.scrollHeight - window.innerHeight;
        var pct = total > 0 ? Math.round((window.scrollY / total) * 100) : 100;
        if (pct > maxScroll) maxScroll = Math.min(pct, 100);
      } catch (e) {
        // ignore
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        if (!visibleSince) visibleSince = Date.now();
      } else if (visibleSince) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = 0;
      }
    }

    function flushEngagement() {
      if (flushed) return;
      flushed = true;
      onVisibility();
      var ms = Math.min(Math.max(visibleMs, 0), 1800000);
      if (ms < 500) return;
      track('engagement', { visible_ms: ms, scroll_pct: maxScroll });
      flush();
    }

    document.addEventListener('visibilitychange', function () {
      onVisibility();
      if (document.visibilityState === 'hidden') flushEngagement();
    });
    window.addEventListener('scroll', measureScroll, { passive: true });
    window.addEventListener('pagehide', flushEngagement);
    window.addEventListener('beforeunload', flushEngagement);
    measureScroll();
  } catch (e) {
    // Never break the page over analytics.
  }
})();
