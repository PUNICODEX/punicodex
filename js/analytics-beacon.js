/**
 * PuniCodex — first-party analytics beacon.
 * Sends one anonymous page-view ping per page load to /api/analytics/collect/.
 * Honors Do Not Track, never throws, no dependencies.
 */
(function () {
  'use strict';

  try {
    if (navigator.doNotTrack === '1') return;

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

    var payload = JSON.stringify({
      p: location.pathname,
      r: document.referrer || '',
      s: sid,
    });

    var send = function () {
      try {
        if (navigator.sendBeacon) {
          var sent = navigator.sendBeacon(
            '/api/analytics/collect/',
            new Blob([payload], { type: 'application/json' })
          );
          if (sent) return;
        }
        fetch('/api/analytics/collect/', {
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', send);
    } else {
      send();
    }
  } catch (e) {
    // Never break the page over analytics.
  }
})();
