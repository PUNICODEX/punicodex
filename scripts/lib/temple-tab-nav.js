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
        <a href="${templeUrl}" class="nav-link">Home</a>${lore}${store}
        <a href="${templeUrl}patterns/" class="nav-link">Patterns</a>
        <a href="${templeUrl}scholars/" class="nav-link">Scholars</a>
        <a href="${templeUrl}patron/" class="nav-link">Patrons</a>
        <a href="${templeUrl}blog/" class="nav-link">Blog</a>`;
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
        <a href="${templeUrl}" class="nav-logo"><picture><source srcset="/sites/${id}/assets/${id}_logolockup.webp" type="image/webp"><img src="/sites/${id}/assets/${id}_logolockup.png" alt="${esc(name)}" class="nav-logo-img" width="1536" height="1024"></picture></a>
        <div class="nav-links tab-nav-links">${tabs}</div>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-controls="temple-mobile-menu"><span></span><span></span><span></span></button>
      </div>
    </nav>
    <div class="mobile-menu temple-mobile-menu" id="temple-mobile-menu" aria-hidden="true" inert>${tabs}</div>`;
}

module.exports = { templeTabNavHtml };
