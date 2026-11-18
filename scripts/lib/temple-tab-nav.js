'use strict';

const esc = (value) =>
  String(value == null ? '' : value).replace(
    /[&<>"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]
  );

function templeTabNavHtml(id, name, active = '') {
  const templeUrl = `/${id}/`;
  const storeUrl = `/store/${id}/`;
  const merchUrl = `/store/merch/${id}/`;
  const artUrl = `${templeUrl}art/`;
  const storeActive = active === 'store' || active === 'merch' || active === 'art';
  const act = (key) => (active === key ? ' active' : '');
  const group = (label, url, children) => `
        <span class="nav-group">
          <a href="${url}" class="nav-link${storeActive && label === 'Store' ? ' active' : ''}">${label}</a>
          <span class="nav-sub">${children}</span>
        </span>`;
  const lore = group(
    'Lore',
    `${templeUrl}lore/`,
    `<a href="${templeUrl}lore/extended/" class="nav-sub-link">Extended</a>`
  );
  const store = group(
    'Store',
    storeUrl,
    `<a href="${merchUrl}" class="nav-sub-link${active === 'merch' ? ' active' : ''}">Merch</a>
     <a href="${artUrl}" class="nav-sub-link${active === 'art' ? ' active' : ''}">Art</a>`
  );
  const tabs = `
        <a href="${templeUrl}" class="nav-link${act('home')}">Home</a>${lore}${store}
        <a href="${templeUrl}patterns/" class="nav-link${act('patterns')}">Patterns</a>
        <a href="${templeUrl}scholars/" class="nav-link${act('scholars')}">Scholars</a>
        <a href="${templeUrl}patron/" class="nav-link${act('patron')}">Patrons</a>
        <a href="${templeUrl}blog/" class="nav-link${act('blog')}">Blog</a>`;
  return `
    <div class="global-strip">
      <div class="global-strip-inner">
        <a href="/" class="global-brand"><picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-gold-solid.webp" type="image/webp"><img src="/assets/brand/01-logos/punicodex-wordmark-gold-solid.png" alt="PuniCodex" width="560" height="58"></picture></a>
        <div class="global-links">
          <a href="/world/">World</a><a href="/culture/">Culture</a><a href="/instruments/">Tools</a><a href="/library/">Library</a><a href="/relics/">Relics</a><a href="/about/">About</a>
        </div>
      </div>
    </div>
    <nav class="main-nav tab-nav" id="tab-nav">
      <div class="nav-inner">
        <a href="${templeUrl}" class="nav-logo"><picture><source srcset="/${id}/assets/${id}_logolockup.webp" type="image/webp"><img src="/${id}/assets/${id}_logolockup.png" alt="${esc(name)}" class="nav-logo-img" width="1536" height="1024"></picture></a>
        <div class="nav-links tab-nav-links">${tabs}</div>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-controls="temple-mobile-menu"><span></span><span></span><span></span></button>
      </div>
    </nav>
    <div class="mobile-menu temple-mobile-menu" id="temple-mobile-menu" aria-hidden="true" inert>${tabs}</div>`;
}

module.exports = { templeTabNavHtml };

/**
 * Base-temple chrome (generate-temples.js) for the page families that exist
 * on base temples — etymology, pronunciation, original-script. Base temples
 * have no lore/patterns/scholars/patron tabs and no temple assets, so the
 * flagship tab nav's links and logolockup would 404. Mirrors the base
 * temple's own nav exactly: text wordmark + Pantheon/Lexicon/Connections/Type.
 */
function baseTempleNavHtml(id, name) {
  return `
    <div class="global-strip">
      <div class="global-strip-inner">
        <a href="https://punicodex.com/" class="global-brand"><img src="/assets/brand/01-logos/punicodex-wordmark-gold-solid.png" alt="PuniCodex" width="560" height="58"></a>
        <div class="global-links">
          <a href="https://punicodex.com/world/">World</a><a href="https://punicodex.com/culture/">Culture</a><a href="https://punicodex.com/instruments/">Tools</a><a href="https://punicodex.com/library/">Library</a><a href="https://punicodex.com/relics/">Relics</a><a href="https://punicodex.com/about/">About</a>
        </div>
      </div>
    </div>
    <nav class="main-nav base-nav" id="main-nav">
      <div class="nav-inner">
        <a href="https://punicodex.com/" class="nav-logo base-nav-logo" aria-label="PUNICODEX — ${esc(name)}">
          <span class="nav-logo-text">${esc(name)}</span>
        </a>
        <div class="nav-links base-nav-links">
          <a href="https://punicodex.com/pantheon/" class="nav-link">Pantheon</a>
          <a href="https://punicodex.com/lexicon/" class="nav-link">Lexicon</a>
          <a href="https://punicodex.com/connections/" class="nav-link">Connections</a>
          <a href="https://punicodex.com/type/#${esc(id)}" class="nav-link">Type</a>
        </div>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-controls="mobile-menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div class="mobile-menu" id="mobile-menu" aria-hidden="true" inert>
      <div class="mobile-menu-section">
        <span class="mobile-menu-title">Explore</span>
        <div class="mobile-menu-group">
          <a href="https://punicodex.com/pantheon/">Pantheon</a>
          <a href="https://punicodex.com/lexicon/">Lexicon</a>
          <a href="https://punicodex.com/connections/">Connections</a>
        </div>
      </div>
      <div class="mobile-menu-section">
        <span class="mobile-menu-title">Tools</span>
        <div class="mobile-menu-group">
          <a href="https://punicodex.com/type/#${esc(id)}">Type</a>
          <a href="https://punicodex.com/search/">Search</a>
          <a href="https://punicodex.com/rulebook/">The Rules</a>
          <a href="https://punicodex.com/oracle/">Oracle</a>
        </div>
      </div>
      <div class="mobile-menu-section">
        <span class="mobile-menu-title">Resources</span>
        <div class="mobile-menu-group">
          <a href="https://punicodex.com/codex/">Codex</a>
          <a href="https://punicodex.com/api/v1/docs/">API</a>
        </div>
      </div>
      <div class="mobile-menu-section">
        <span class="mobile-menu-title">About</span>
        <div class="mobile-menu-group">
          <a href="https://punicodex.com/about/">About</a>
          <a href="https://punicodex.com/contact/">Contact</a>
        </div>
      </div>
    </div>`;
}

const path = require('node:path');
const { ARCHETYPES } = require(path.join(__dirname, '..', '..', 'js', 'archetypes-v2.js'));
const FLAGSHIP_IDS = new Set(ARCHETYPES.map((a) => a.id));

/**
 * Dispatch on temple class: flagships get the full tab nav; base temples
 * (and any entry without a built flagship) get the base chrome that matches
 * their own main page. Page families on base temples (etymology,
 * pronunciation, original-script) must never emit flagship-only tabs —
 * lore/patterns/scholars/patron/art don't exist there and the temple
 * logolockup asset would 404.
 */
function templeNavHtml(id, name, active = '') {
  return FLAGSHIP_IDS.has(id)
    ? templeTabNavHtml(id, name, active)
    : baseTempleNavHtml(id, name);
}

module.exports = { templeTabNavHtml, baseTempleNavHtml, templeNavHtml };
