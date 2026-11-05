/* Canonical cache-bust pins for hand-versioned assets (nav-more.css,
   mobile-menu.css). Generators AND the nav syncers must both read from
   here — when one side hardcodes a pin and the other bumps, CI's
   divergence gate fails on the delta. */

module.exports = {
  NAV_MORE_CSS: '/css/nav-more.css?v=8',
  MOBILE_MENU_CSS: '/css/mobile-menu.css?v=10',
  NAV_HUBS_CSS: '/css/nav-hubs.css?v=4',
  NAV_HUBS_JS: '/js/nav-hubs.js?v=7',
  MAIN_CSS: '/css/main.css?v=perf35',
};
