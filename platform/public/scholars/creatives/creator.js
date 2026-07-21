(function () {
  const apiBase = '/api/v1/';
  const container = document.getElementById('app');
  const params = new URLSearchParams(window.location.search);
  const creatorId = params.get('id');

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  function formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDepartment(value) {
    return value ? value.replace(/_/g, ' ') : '—';
  }

  function showError(message) {
    container.innerHTML = `
      <div class="cre-empty">
        <p>${escapeHtml(message)}</p>
        <a href="/creatives/index.html" class="cre-btn" style="margin-top:1rem;">Back to Marketplace</a>
      </div>
    `;
  }

  function renderProfile(profile) {
    const assets = profile.assets || [];
    const cards = assets
      .map((a) => {
        const thumb = a.thumbnailPath || a.previewPath;
        const thumbWebp = a.thumbnailWebpPath || a.previewWebpPath;
        const thumbImg = thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="cre-asset-thumb" loading="lazy">` : '';
        return `
        <a href="/creatives/index.html?asset=${a.id}" class="cre-asset-card">
          ${thumb ? (thumbWebp ? `<picture><source type="image/webp" srcset="${escapeHtml(thumbWebp)}">${thumbImg}</picture>` : thumbImg) : '<div class="cre-asset-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--cre-white-dim);">—</div>'}
          <div class="cre-asset-body">
            <div class="cre-asset-title">${escapeHtml(a.title)}</div>
            <div class="cre-asset-meta">${formatPrice(a.priceCents)}</div>
          </div>
        </a>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="cre-hero" style="padding: 3rem 0 2rem;">
        <div class="cre-eyebrow">Student Creator</div>
        <h1 class="cre-title">${escapeHtml(profile.display_name || 'Student Creator')}</h1>
        <p class="cre-subtitle">
          ${escapeHtml(profile.institution_name || '')}
          ${profile.department ? `· ${escapeHtml(formatDepartment(profile.department))}` : ''}
        </p>
      </div>

      <h2 class="cre-section-title">Approved Assets</h2>
      ${assets.length ? `<div class="cre-asset-grid">${cards}</div>` : '<div class="cre-empty">No approved assets yet.</div>'}

      <div style="margin-top:2rem;">
        <a href="/creatives/index.html" class="cre-btn">Browse Marketplace</a>
      </div>
    `;
  }

  function bindGlobalNav() {
    const toggle = document.getElementById('global-toggle');
    const links = document.getElementById('global-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });
    }
  }

  async function loadProfile() {
    if (!creatorId) {
      showError('No creator specified.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/creatives/creators/${encodeURIComponent(creatorId)}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load profile');
      }
      renderProfile(json.data);
    } catch (err) {
      showError(err.message);
    }
  }

  bindGlobalNav();
  loadProfile();
})();
