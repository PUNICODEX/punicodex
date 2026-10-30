/* Canonical cache-bust pins for hand-versioned assets (nav-more.css,
   mobile-menu.css). Generators AND the nav syncers must both read from
   here — when one side hardcodes a pin and the other bumps, CI's
   divergence gate fails on the delta. */

module.exports = {
  NAV_MORE_CSS: '/css/nav-more.css?v=7',
  MOBILE_MENU_CSS: '/css/mobile-menu.css?v=7',
  NAV_HUBS_CSS: '/css/nav-hubs.css?v=1',
  NAV_HUBS_JS: '/js/nav-hubs.js?v=1',
};
