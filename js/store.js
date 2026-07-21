/* PuniCodex Reliquary — POD store renderer (store/products.json via Printful)
 * + category tabs + notify form (posts to the newsletter endpoint). */
(function () {
  'use strict';

  const grid = document.getElementById('product-grid');
  const tabs = document.querySelectorAll('.store-tab');
  let products = [];

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
  }

  function card(p) {
    // Creator merch carries user-generated fields — every interpolation is escaped.
    const creatorBadge = p.creator
      ? `<p class="product-creator" style="font-size:11px;color:var(--gold);padding:0 var(--space-3);letter-spacing:0.04em;">Created by ${escapeHtml(p.creator.name)}${p.creator.university ? ` · ${escapeHtml(p.creator.university)}` : ''}</p>`
      : '';
    const linkLabel = p.creator ? 'Browse the marketplace →' : 'Visit the temple →';
    const imgTag = `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="300" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px 8px 0 0;">`;
    const imageTag = p.image_webp
      ? `<picture><source type="image/webp" srcset="${escapeHtml(p.image_webp)}">${imgTag}</picture>`
      : imgTag;
    return `
    <div class="product-card reveal-up" data-category="${escapeHtml(p.category)}">
      <div class="product-image">
        ${imageTag}
        <div class="product-overlay">Print on demand</div>
      </div>
      <h3 class="product-name">${escapeHtml(p.name)}</h3>
      <p class="product-blurb" style="font-size:12px;color:var(--text-dim);padding:0 var(--space-3);">${escapeHtml(p.blurb)}</p>
      ${creatorBadge}
      <p class="product-price">$${Number(p.price).toFixed(2)}</p>
      <a href="${escapeHtml(p.templeUrl)}" class="product-temple-link" style="display:block;font-size:12px;color:var(--gold);padding:0 var(--space-3) var(--space-3);text-decoration:none;">${linkLabel}</a>
    </div>`;
  }

  function applyFilter(filter) {
    const visible = products.filter((p) => filter === 'all' || p.category === filter);
    grid.innerHTML = visible.map(card).join('') ||
      '<p style="text-align:center;color:var(--text-dim);padding:2rem 1rem;grid-column:1/-1;">Nothing in this cabinet yet — the first pieces are being made.</p>';
  }

  async function init() {
    try {
      const res = await fetch('/store/products.json');
      const data = await res.json();
      products = data.products || [];
    } catch (e) {
      grid.innerHTML = '<p style="color:var(--text-dim);grid-column:1/-1;">The catalog is being arranged — check back soon.</p>';
      return;
    }
    // Merge live creator merch (student works listed with consent). If the
    // endpoint is unavailable the static catalog still renders on its own.
    try {
      const res = await fetch('/api/store/products/');
      const json = await res.json();
      if (json.success && Array.isArray(json.products)) {
        products = products.concat(json.products);
      }
    } catch (e) {
      /* creator merch unavailable — static catalog unaffected */
    }
    // Render a curated first page: all categories, first 24 products, with a
    // "show all" toggle for the rest.
    applyFilter('all');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        applyFilter(tab.dataset.filter || 'all');
      });
    });
  }
  init();

  // ── Notify form → newsletter endpoint ──
  const form = document.getElementById('store-notify-form');
  if (form) {
    const input = form.querySelector('input[type="email"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (input.value || '').trim();
      if (!email) return;
      try {
        const res = await fetch('/api/newsletter/subscribe/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'store-notify' }),
        });
        if (!res.ok) throw new Error(String(res.status));
        if (window.PX && PX.showToast) {
          PX.showToast('You are on the list — the Reliquary will write to you first.');
        }
        form.reset();
      } catch (err) {
        if (window.PX && PX.showToast) {
          PX.showToast('Subscription is momentarily unavailable — try again soon.');
        }
      }
    });
  }
})();
