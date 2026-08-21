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
    const tierClass = a.tier === 'dual-tier' ? 'dual-tier' : a.tier;
    const badgeText = !a.built
      ? 'Awaiting'
      : a.tier === 'tier-1'
        ? 'Tier 1'
        : a.tier === 'tier-2'
          ? 'Tier 2'
          : 'Dual-Tier';

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
        <span class="card-badge ${tierClass}">${badgeText}</span>
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
    const statsSection = document.querySelector('.origin-stats');
    if (!statsSection) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statsSection.querySelectorAll('.stat-number').forEach((el) => {
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

    statObserver.observe(statsSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatAnimation);
  } else {
    initStatAnimation();
  }
})();
