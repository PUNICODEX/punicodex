/**
 * PuniCodex — Homepage JavaScript
 * Lightweight, declarative interactions only. No canvas animation loops.
 */

(function () {
  'use strict';

  // Kit placeholder art for unbuilt/failed portraits (brand integration §4.3) —
  // a card must never degrade to a bare gold ring.
  const EMPTY_PORTRAIT = '/assets/brand/03-ornaments/punicodex-empty-portrait.png';
  const EMPTY_PORTRAIT_WEBP = '/assets/brand/03-ornaments/punicodex-empty-portrait.webp';

  // ═══════════════════════════════════════════════════════════
  // PANTHEON GRID RENDERING
  // ═══════════════════════════════════════════════════════════

  function getArchetypeUrl(archetype) {
    if (archetype.hasAdSite) {
      return `/${archetype.id}/lore/`;
    }
    return archetype.built ? `/${archetype.id}/` : null;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // The homepage shows a curated slice of the pantheon; the full 196-card
  // collection lives behind the expander (and at /pantheon/). Keeps the
  // landing page cinematic instead of a 20-screen scroll.
  const INITIAL_COUNT = 24;
  let gridExpanded = false;

  function cardHtml(a, index) {
    const url = getArchetypeUrl(a);
    const tag = url ? 'a' : 'div';
    const hrefAttr = url ? `href="${url}"` : '';
    const unbuiltClass = !a.built ? 'unbuilt' : '';
    // Awe-first grid: built cards carry no classification badge (see
    // js/pantheon.js); only unbuilt cards state their status.
    const badgeText = !a.built ? 'Awaiting' : '';

    const scriptInfo =
      typeof ORIGINAL_SCRIPT_LOOKUP !== 'undefined'
        ? ORIGINAL_SCRIPT_LOOKUP[a.id]
        : null;
    const originalScript = scriptInfo
      ? scriptInfo.originalScript
      : a.greek || '';
    const scriptName = scriptInfo ? scriptInfo.scriptName : 'Greek';
    const scriptLabel =
      originalScript && originalScript !== '—'
        ? `<span class="card-script-name">${escapeHtml(scriptName)}</span>${escapeHtml(originalScript)}`
        : '<span class="card-script-name">Scholarly transliteration</span>';

    const portraitHtml = !a.built
      ? `<picture><source srcset="${EMPTY_PORTRAIT_WEBP}" type="image/webp"><img src="${EMPTY_PORTRAIT}" alt="" loading="lazy" /></picture>`
      : `<img src="/assets/images/mascots/thumbs/small/${a.id}_thumb.webp" alt="${escapeHtml(a.name)} — ${escapeHtml(a.domain)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${a.mascotPath}';this.onerror=function(){this.onerror=null;this.src='${EMPTY_PORTRAIT}';};" />`;

    return `
      <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" style="--stagger-index:${index % 6}">
        <div class="card-portrait">
          ${portraitHtml}
        </div>
        <p class="card-name">${escapeHtml(a.name)}</p>
        <p class="card-greek">${scriptLabel}</p>
        <p class="card-domain">${escapeHtml(a.domain)}</p>
        ${badgeText ? `<span class="card-badge">${badgeText}</span>` : ''}
      </${tag}>
    `;
  }

  function renderPantheonGrid() {
    const grid = document.getElementById('pantheon-grid');
    if (!grid || typeof ARCHETYPES === 'undefined') return;

    const sorted = [...ARCHETYPES].sort((a, b) => {
      if (a.built !== b.built) return b.built - a.built;
      return a.name.localeCompare(b.name);
    });

    const visible = gridExpanded ? sorted : sorted.slice(0, INITIAL_COUNT);
    grid.innerHTML = visible.map((a, index) => cardHtml(a, index)).join('');

    if (typeof revealObserver !== 'undefined') {
      grid.querySelectorAll('.reveal-up').forEach((el) => revealObserver.observe(el));
    }

    // Expander: reveal the full collection in place.
    let expandWrap = document.getElementById('pantheon-expand');
    if (!expandWrap) {
      expandWrap = document.createElement('div');
      expandWrap.id = 'pantheon-expand';
      grid.insertAdjacentElement('afterend', expandWrap);
    }
    if (!gridExpanded && sorted.length > INITIAL_COUNT) {
      expandWrap.innerHTML = `<button type="button" class="btn btn-outline pantheon-expand-btn" aria-expanded="false"><span>Reveal all ${sorted.length} archetypes</span></button>`;
      expandWrap.querySelector('button').addEventListener('click', () => {
        gridExpanded = true;
        renderPantheonGrid();
      });
    } else {
      expandWrap.innerHTML = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPantheonGrid);
  } else {
    renderPantheonGrid();
  }

  // ═══════════════════════════════════════════════════════════
  // STAT NUMBER ANIMATION
  // ═══════════════════════════════════════════════════════════

  function initStatAnimation() {
    // Two separate .origin-stats blocks exist on the page; querySelector
    // only ever matched the first, leaving the second block's counters
    // (Lexicon Entries, Pantheon Traditions) stuck at 0.
    const statsSections = document.querySelectorAll('.origin-stats');
    if (statsSections.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.stat-number').forEach((el) => {
              const target = parseInt(el.dataset.count, 10);
              if (target && !el.classList.contains('animated')) {
                el.classList.add('animated');
                if (prefersReducedMotion || !window.PX || !window.PX.animateNumber) {
                  el.textContent = target.toLocaleString();
                } else {
                  window.PX.animateNumber(el, target, 2500);
                }
              }
            });
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    statsSections.forEach((section) => statObserver.observe(section));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatAnimation);
  } else {
    initStatAnimation();
  }
})();

/* Station V · Reliquary — colour swatches customise both the visible mockup
   and the product link. The fleet composite stays only for its baked colour;
   every other colour uses the real blank garment plus the temple's own print. */
(function () {
  var PRODUCTS = {
    '/store/merch/zeus/tee/': { kind: 'tee', art: '/sites/zeus/assets/zeus_mascot.webp', width: 20, top: 23, left: 50, composite: 'Black' },
    '/store/merch/poseidon/hoodie/': { kind: 'hoodie', art: '/sites/poseidon/assets/poseidon_mascot.webp', width: 21.3, top: 24, left: 50, composite: 'Black' },
    '/store/merch/hades/tumbler/': { kind: 'tumbler', art: '/sites/hades/assets/hades_mascot.webp', width: 20, top: 29, left: 45, composite: 'Black' },
    '/store/merch/sunwukong/hoodie/': { kind: 'hoodie', art: '/sites/sunwukong/assets/sunwukong_mascot.webp', width: 21.3, top: 24, left: 50, composite: 'Black' },
    '/store/merch/anubis/tee/': { kind: 'tee', art: '/sites/anubis/assets/anubis_mascot.webp', width: 20, top: 23, left: 50, composite: 'Black' },
  };

  function colorSlug(color) {
    return color.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  document.querySelectorAll('.fc-swatches').forEach(function (wrap) {
    var plinth = wrap.closest('.fc-plinth');
    if (!plinth) return;
    var go = plinth.querySelector('.fc-plinth-go');
    if (!go) return;
    var base = go.getAttribute('data-base') || go.getAttribute('href');
    var product = PRODUCTS[base];
    if (!product) return;
    var frame = plinth.querySelector('.fc-plinth-img');
    var picture = frame && frame.querySelector('picture');
    var image = picture && picture.querySelector('img');
    var source = picture && picture.querySelector('source');
    if (!frame || !picture || !image || !source) return;
    var original = {
      src: image.getAttribute('src'),
      srcset: source.getAttribute('srcset'),
      alt: image.getAttribute('alt') || '',
    };
    var print = null;

    function ensurePrint() {
      if (print) return print;
      print = document.createElement('img');
      print.className = 'fc-print';
      print.src = product.art;
      print.alt = '';
      print.setAttribute('aria-hidden', 'true');
      print.style.width = product.width + '%';
      print.style.top = product.top + '%';
      print.style.left = product.left + '%';
      frame.appendChild(print);
      return print;
    }

    wrap.querySelectorAll('.fc-sw').forEach(function (button) {
      var selected = button.getAttribute('data-c') === product.composite;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    wrap.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.fc-sw') : null;
      if (!btn) return;
      ev.preventDefault();
      var color = btn.getAttribute('data-c');
      wrap.querySelectorAll('.fc-sw').forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      go.setAttribute('href', color ? base + '?color=' + encodeURIComponent(color) : base);
      plinth.setAttribute('data-selected-color', color || '');
      image.alt = original.alt + (color ? ' — ' + color : '');
      if (color === product.composite) {
        source.setAttribute('srcset', original.srcset);
        image.setAttribute('src', original.src);
        if (print) print.style.display = 'none';
        return;
      }
      var slug = colorSlug(color);
      source.setAttribute('srcset', '/assets/store-base/' + product.kind + '--' + slug + '.webp');
      image.setAttribute('src', '/assets/store-base/' + product.kind + '--' + slug + '.jpg');
      ensurePrint().style.display = '';
    });
  });
})();

/* Station VII · The Pattern — bespoke living backgrounds, one per road.
   Storm: a field of charged rain and far lightning. Dawn: light breaking
   over the horizon. Flux: shapes trading places. All honour reduced motion
   and pause when offscreen. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvases = Array.prototype.slice.call(document.querySelectorAll('.fc-road-fx'));
  if (!canvases.length) return;

  function fit(cv) {
    var r = cv.parentElement.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    return { w: cv.width, h: cv.height, dpr: dpr };
  }

  function bolt(ctx, w, h) {
    var x = w * (0.15 + Math.random() * 0.7);
    var y = 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    var segs = 5 + Math.floor(Math.random() * 5);
    for (var i = 0; i < segs; i++) {
      x += (Math.random() - 0.5) * w * 0.16;
      y += h / segs;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255, 226, 140, 0.85)';
    ctx.lineWidth = Math.max(1, w / 320);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = Math.max(2, w / 110);
    ctx.stroke();
  }

  function drawFrame(cv, t, dt) {
    var ctx = cv.getContext('2d');
    var w = cv.width, h = cv.height;
    var kind = cv.getAttribute('data-fx');
    ctx.clearRect(0, 0, w, h);

    if (kind === 'storm') {
      cv._drops = cv._drops || Array.from({ length: 26 }, function () {
        return { x: Math.random() * w, y: Math.random() * h, s: h * (0.25 + Math.random() * 0.3) };
      });
      ctx.strokeStyle = 'rgba(140, 170, 220, 0.16)';
      ctx.lineWidth = Math.max(1, w / 500);
      cv._drops.forEach(function (d) {
        d.y += d.s * dt;
        if (d.y > h) { d.y = -h * 0.1; d.x = Math.random() * w; }
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - w * 0.006, d.y + h * 0.09);
        ctx.stroke();
      });
      cv._flash = Math.max(0, (cv._flash || 0) - dt * 2.4);
      if (Math.random() < dt * 0.55) cv._flash = 1;
      if (cv._flash > 0.02) {
        ctx.fillStyle = 'rgba(255, 236, 170, ' + (cv._flash * 0.10).toFixed(3) + ')';
        ctx.fillRect(0, 0, w, h);
      }
      if (cv._flash > 0.55 && !cv._bolted) { bolt(ctx, w, h); cv._bolted = true; }
      if (cv._flash <= 0.1) cv._bolted = false;
    } else if (kind === 'dawn') {
      var p = (Math.sin(t * 0.00022) + 1) / 2; // slow breath
      var horizon = h * 0.72;
      var gx = w * 0.5, gy = horizon;
      var rad = w * (0.55 + p * 0.12);
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, 'rgba(255, 190, 80, ' + (0.20 + p * 0.10).toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(212, 120, 40, ' + (0.08 + p * 0.05).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 214, 120, ' + (0.10 + p * 0.10).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, w / 400);
      for (var i = 0; i < 7; i++) {
        var a = Math.PI + (i / 6) * Math.PI + Math.sin(t * 0.0003 + i) * 0.03;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.cos(a) * rad * 0.9, gy + Math.sin(a) * rad * 0.9);
        ctx.stroke();
      }
    } else if (kind === 'flux') {
      cv._blobs = cv._blobs || Array.from({ length: 6 }, function (_, i) {
        return { a: (i / 6) * Math.PI * 2, r: 0.16 + Math.random() * 0.16, s: 0.14 + Math.random() * 0.2, ph: Math.random() * Math.PI * 2 };
      });
      cv._blobs.forEach(function (b, i) {
        b.a += dt * b.s;
        var x = w * 0.5 + Math.cos(b.a + b.ph + t * 0.0002) * w * 0.32;
        var y = h * 0.5 + Math.sin(b.a * 1.3 + t * 0.00016) * h * 0.30;
        var r = w * b.r * (0.8 + 0.2 * Math.sin(t * 0.001 + i));
        var g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        g2.addColorStop(0, 'rgba(212, 175, 55, 0.14)');
        g2.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 7);
        ctx.fill();
      });
    }
  }

  var running = new Set();
  var raf = null;
  var last = 0;

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    running.forEach(function (cv) { drawFrame(cv, t, dt); });
    raf = running.size ? requestAnimationFrame(loop) : null;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) running.add(e.target);
      else running.delete(e.target);
    });
    if (running.size && !raf && !reduce) raf = requestAnimationFrame(loop);
  }, { threshold: 0.05 });

  canvases.forEach(function (cv) {
    fit(cv);
    if (reduce) { drawFrame(cv, 0, 0.016); return; } // one static frame
    io.observe(cv);
  });

  window.addEventListener('resize', function () {
    canvases.forEach(function (cv) {
      fit(cv);
      if (reduce) drawFrame(cv, 0, 0.016);
    });
  });
})();
