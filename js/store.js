/* PuniCodex Reliquary — POD store renderer (store/products.json via Printful)
 * + category tabs + variant picker + Stripe checkout + order-status banner
 * + notify form (posts to the newsletter endpoint). */
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

  function toast(msg) {
    if (window.PX && PX.showToast) PX.showToast(msg);
  }

  function isPurchasable(p) {
    return Boolean(p.creator) || Boolean(p.printfulProductId);
  }

  function variantOptions(p) {
    if (p.printfulVariants) return Object.keys(p.printfulVariants);
    return ['One size'];
  }

  function card(p) {
    // Creator merch carries user-generated fields — every interpolation is escaped.
    const creatorBadge = p.creator
      ? `<p class="product-creator" style="font-size:11px;color:var(--gold);padding:0 var(--space-3);letter-spacing:0.04em;">Created by ${escapeHtml(p.creator.name)}${p.creator.university ? ` · ${escapeHtml(p.creator.university)}` : ''}</p>`
      : '';
    const linkLabel = p.creator ? 'Browse the marketplace →' : 'Visit the temple →';
    const templeLink = p.templeUrl
      ? `<a href="${escapeHtml(p.templeUrl)}" class="product-temple-link" style="display:block;font-size:12px;color:var(--gold);padding:0 var(--space-3) var(--space-3);text-decoration:none;">${linkLabel}</a>`
      : '';
    const imgTag = `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="300" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px 8px 0 0;">`;
    const imageTag = p.image_webp
      ? `<picture><source type="image/webp" srcset="${escapeHtml(p.image_webp)}">${imgTag}</picture>`
      : imgTag;

    let buyBlock = '';
    if (isPurchasable(p)) {
      const options = variantOptions(p);
      const select =
        options.length > 1
          ? `<select class="store-variant" data-variant-for="${escapeHtml(p.id)}" aria-label="Choose a variant" style="margin:0 var(--space-3) var(--space-2);padding:6px 10px;background:#111;color:var(--text);border:1px solid rgba(212,175,55,0.35);border-radius:6px;font-size:12px;width:calc(100% - 2 * var(--space-3));">${options
              .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
              .join('')}</select>`
          : '';
      buyBlock = `
        ${select}
        <button type="button" class="store-buy" data-buy="${escapeHtml(p.id)}" style="margin:0 var(--space-3) var(--space-3);padding:10px 0;width:calc(100% - 2 * var(--space-3));background:var(--gold,#d4af37);color:#0a0a0c;border:none;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;">Buy — printed for you</button>`;
    }

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
      ${buyBlock}
      ${templeLink}
    </div>`;
  }

  function applyFilter(filter) {
    const visible = products.filter((p) => filter === 'all' || p.category === filter);
    grid.innerHTML = visible.map(card).join('') ||
      '<p style="text-align:center;color:var(--text-dim);padding:2rem 1rem;grid-column:1/-1;">Nothing in this cabinet yet — the first pieces are being made.</p>';
  }

  // ── Buy flow ──
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    const productId = btn.getAttribute('data-buy');
    const select = grid.querySelector(`[data-variant-for="${CSS.escape(productId)}"]`);
    const variantLabel = select ? select.value : 'One size';
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantLabel, quantity: 1 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `checkout failed (${res.status})`);
      window.location.href = json.sessionUrl;
    } catch (err) {
      toast(err.message || 'Checkout is momentarily unavailable — try again soon.');
      btn.disabled = false;
      btn.textContent = 'Buy — printed for you';
    }
  });

  // ── Order-status banner (return from Stripe) ──
  async function renderOrderBanner() {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get('order');
    if (!orderRef) return;
    const banner = document.createElement('div');
    banner.setAttribute('role', 'status');
    banner.style.cssText =
      'max-width:720px;margin:1.5rem auto;padding:1rem 1.25rem;border:1px solid rgba(212,175,55,0.4);border-radius:10px;background:rgba(212,175,55,0.08);color:var(--text);text-align:center;font-size:0.95rem;';
    if (params.get('canceled')) {
      banner.textContent = `Order ${orderRef} was canceled — nothing was charged. The cabinet stays open whenever you are ready.`;
      grid.parentNode.insertBefore(banner, grid);
      return;
    }
    banner.textContent = `Confirming order ${orderRef}…`;
    grid.parentNode.insertBefore(banner, grid);
    try {
      const res = await fetch(
        `/api/store/orders/?ref=${encodeURIComponent(orderRef)}&session_id=${encodeURIComponent(params.get('session_id') || '')}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(res.status));
      const lines = {
        paid: 'Payment received — your piece is being prepared for the print house.',
        fulfillment_queued: 'Payment received — our studio is preparing this handcrafted piece.',
        sent_to_fulfillment: 'Confirmed and at the print house. We email you the moment it ships.',
        shipped: `Shipped${json.carrier ? ` via ${json.carrier}` : ''}${json.trackingUrl ? ` — <a href="${escapeHtml(json.trackingUrl)}" style="color:var(--gold);">track it here</a>` : ''}.`,
        delivered: 'Delivered — may it carry the temple’s presence into your home.',
      };
      banner.innerHTML = `<strong>${escapeHtml(json.productName)}</strong> (${escapeHtml(json.orderRef)})<br>${lines[json.status] || 'Order received — we will keep you posted.'}`;
    } catch (err) {
      banner.textContent = `Order ${orderRef} received — confirmation is on its way to your email.`;
    }
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
    applyFilter('all');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        applyFilter(tab.dataset.filter || 'all');
      });
    });
    renderOrderBanner();
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
        toast('You are on the list — the Reliquary will write to you first.');
        form.reset();
      } catch (err) {
        toast('Subscription is momentarily unavailable — try again soon.');
      }
    });
  }
})();
