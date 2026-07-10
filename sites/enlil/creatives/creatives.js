(function () {
  const API_BASE = '/api/v1/creatives';
  const templeId = window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || '';
  const grid = document.getElementById('temple-creatives-grid');
  const emptyEl = document.getElementById('temple-creatives-empty');
  const eyebrow = document.getElementById('creatives-eyebrow');
  const title = document.getElementById('creatives-title');
  const navLogo = document.getElementById('nav-logo');

  function formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadCreatives() {
    if (!templeId) return;

    try {
      const res = await fetch(`${API_BASE}?inspiration=${encodeURIComponent(templeId)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');

      const assets = json.data.assets || [];
      if (assets.length === 0) {
        grid.innerHTML = '';
        emptyEl.hidden = false;
        return;
      }

      emptyEl.hidden = true;
      grid.innerHTML = assets
        .map(
          (asset) => `
        <article class="temple-creative-card">
          <img src="${escapeHtml(asset.thumbnailPath || asset.previewPath)}" alt="${escapeHtml(asset.title)}" loading="lazy">
          <div class="temple-creative-card-body">
            <h3 class="temple-creative-card-title">${escapeHtml(asset.title)}</h3>
            <div class="temple-creative-card-meta">${escapeHtml(asset.creatorName || 'Student creator')}</div>
            <div class="temple-creative-card-price">${formatPrice(asset.priceCents)}</div>
            <a href="/creatives/" class="btn-primary">View in Marketplace</a>
          </div>
        </article>
      `
        )
        .join('');
    } catch (err) {
      grid.innerHTML = `<p class="temple-creatives-empty">${escapeHtml(err.message)}</p>`;
    }
  }

  function setLogo() {
    if (!templeId || !navLogo) return;
    navLogo.innerHTML = `
      <picture>
        <source srcset="../assets/${templeId}_logolockup.webp" type="image/webp">
        <img src="../assets/${templeId}_logolockup.png" alt="${templeId}" class="nav-logo-img">
      </picture>
    `;
  }

  if (templeId) {
    if (eyebrow) eyebrow.textContent = `PUNYCODEX — ${templeId}`;
    if (title) title.textContent = 'Student Work Inspired by This Archetype';
  }

  setLogo();
  loadCreatives();
})();
