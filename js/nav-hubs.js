/* PuniCodex hub dropdown controller (desktop ≥1024px).
   Hover-intent driven: entering a .nav-hub opens its wing dropdown after
   a short intent delay; leaving starts a longer grace timer that any
   re-entry into the hub/menu/panel tree cancels — so the pointer can
   travel diagonally into a fan-out panel without the menu collapsing.
   Keyboard: focus opens, Escape closes, focus loss closes with grace. */

(function () {
  'use strict';

  var OPEN = 'data-open';
  var ENTER_MS = 220;
  var LEAVE_MS = 420;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;

    var hubs = Array.prototype.slice.call(document.querySelectorAll('.nav-hub'));
    if (!hubs.length) return;

    var openTimer = 0;
    var closeTimer = 0;
    var pendingHub = null;
    var current = null; // {hub, item, panel}

    function clearTimers() {
      if (openTimer) { clearTimeout(openTimer); openTimer = 0; }
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
      pendingHub = null;
    }

    function closeHub(hub) {
      hub.removeAttribute(OPEN);
      var link = hub.querySelector(':scope > .nav-link');
      if (link) link.setAttribute('aria-expanded', 'false');
      Array.prototype.forEach.call(hub.querySelectorAll('.nav-hub-panel[' + OPEN + ']'), function (p) {
        p.removeAttribute(OPEN);
      });
    }

    function closeAll() {
      clearTimers();
      hubs.forEach(closeHub);
      if (current) { current = null; }
    }

    function openHub(hub) {
      hubs.forEach(function (h) { if (h !== hub) closeHub(h); });
      hub.setAttribute(OPEN, '');
      var link = hub.querySelector(':scope > .nav-link');
      if (link) link.setAttribute('aria-expanded', 'true');
      positionPanels(hub);
      current = { hub: hub, item: null, panel: null };
    }

    /* Flip panels that would overflow the right edge. */
    function positionPanels(hub) {
      Array.prototype.forEach.call(hub.querySelectorAll('.nav-hub-item'), function (item) {
        var panel = item.querySelector(':scope > .nav-hub-panel');
        if (!panel) return;
        panel.removeAttribute('data-flip');
        item.addEventListener('mouseenter', function () {
          var r = panel.getBoundingClientRect();
          if (r.right > window.innerWidth - 12) panel.setAttribute('data-flip', '');
          else panel.removeAttribute('data-flip');
        }, { passive: true });
      });
    }

    function scheduleOpen(hub) {
      if (hub.hasAttribute(OPEN)) return;
      clearTimers();
      pendingHub = hub;
      openTimer = setTimeout(function () {
        openTimer = 0;
        if (pendingHub === hub) openHub(hub);
      }, ENTER_MS);
    }

    function scheduleClose() {
      clearTimers();
      closeTimer = setTimeout(function () {
        closeTimer = 0;
        closeAll();
      }, LEAVE_MS);
    }

    hubs.forEach(function (hub) {
      var link = hub.querySelector(':scope > .nav-link');
      if (link) link.setAttribute('aria-expanded', 'false');

      hub.addEventListener('mouseenter', function () { scheduleOpen(hub); });
      hub.addEventListener('mouseleave', scheduleClose);

      hub.addEventListener('focusin', function () { clearTimers(); openHub(hub); });
      hub.addEventListener('focusout', function (e) {
        if (!hub.contains(e.relatedTarget)) scheduleClose();
      });

      /* Fan-out items: hovering the item opens its panel (intent handled
         by the shared timers — re-entry cancels the close). */
      Array.prototype.forEach.call(hub.querySelectorAll('.nav-hub-item'), function (item) {
        var panel = item.querySelector(':scope > .nav-hub-panel');
        if (!panel) return;
        item.addEventListener('mouseenter', function () {
          clearTimers();
          Array.prototype.forEach.call(hub.querySelectorAll('.nav-hub-panel[' + OPEN + ']'), function (p) {
            if (p !== panel) p.removeAttribute(OPEN);
          });
          panel.setAttribute(OPEN, '');
        });
        item.addEventListener('mouseleave', scheduleClose);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
    document.addEventListener('pointerdown', function (e) {
      if (current && !current.hub.contains(e.target)) closeAll();
    });
    window.addEventListener('resize', function () {
      if (!window.matchMedia('(min-width: 1024px)').matches) closeAll();
    });
  });
})();
