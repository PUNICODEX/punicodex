/**
 * PÚNYCODEX — Homepage JavaScript (Enterprise-Grade Optimized)
 * Zero canvas animation loops. CSS-driven hero. Declarative interactions only.
 */

(function() {
    'use strict';

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ═══════════════════════════════════════════════════════════
    // PANTHEON GRID RENDERING
    // ═══════════════════════════════════════════════════════════

    function getArchetypeUrl(archetype) {
        if (archetype.hasAdSite) {
            return `/sites/${archetype.id}/lore/`;
        }
        // Always link built temples to punycodex.com so visitors never hit a
        // raw Unicode/punycode domain and trigger browser safe-browsing warnings.
        return archetype.built ? `/sites/${archetype.id}/` : null;
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

    function renderPantheonGrid() {
        const grid = document.getElementById('pantheon-grid');
        if (!grid || typeof ARCHETYPES === 'undefined') return;

        const sorted = [...ARCHETYPES].sort((a, b) => {
            if (a.built !== b.built) return b.built - a.built;
            return a.name.localeCompare(b.name);
        });

        grid.innerHTML = sorted.map((a, index) => {
            const url = getArchetypeUrl(a);
            const tag = url ? 'a' : 'div';
            const hrefAttr = url ? `href="${url}"` : '';
            const unbuiltClass = !a.built ? 'unbuilt' : '';
            const tierClass = a.tier === 'dual-tier' ? 'dual-tier' : a.tier;
            const badgeText = !a.built ? 'Awaiting' : a.tier === 'tier-1' ? 'Tier 1' : a.tier === 'tier-2' ? 'Tier 2' : 'Dual-Tier';

            const scriptInfo = typeof ORIGINAL_SCRIPT_LOOKUP !== 'undefined' ? ORIGINAL_SCRIPT_LOOKUP[a.id] : null;
            const originalScript = scriptInfo ? scriptInfo.originalScript : (a.greek || '');
            const scriptName = scriptInfo ? scriptInfo.scriptName : 'Greek';
            const scriptLabel = originalScript && originalScript !== '—'
                ? `<span class="card-script-name">${escapeHtml(scriptName)}</span>${escapeHtml(originalScript)}`
                : '<span class="card-script-name">Scholarly transliteration</span>';

            return `
                <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" style="--stagger-index:${index % 6}">
                    <div class="card-portrait">
                        <img src="${a.mascotPath}" alt="${escapeHtml(a.name)} — ${escapeHtml(a.domain)}" loading="lazy" onerror="this.style.opacity='0'; this.parentElement.style.background='linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)'; this.parentElement.style.backgroundSize='200% 100%'; this.parentElement.style.animation='skeletonShimmer 1.5s infinite';">
                    </div>
                    <p class="card-name">${escapeHtml(a.name)}</p>
                    <p class="card-greek">${scriptLabel}</p>
                    <p class="card-domain">${escapeHtml(a.domain)}</p>
                    <span class="card-badge ${tierClass}">${badgeText}</span>
                </${tag}>
            `;
        }).join('');

        if (typeof revealObserver !== 'undefined') {
            grid.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));
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

        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statsSection.querySelectorAll('.stat-number').forEach(el => {
                        const target = parseInt(el.dataset.count, 10);
                        if (target && !el.classList.contains('animated')) {
                            el.classList.add('animated');
                            if (window.PX && window.PX.animateNumber) {
                                window.PX.animateNumber(el, target, 2500);
                            } else {
                                el.textContent = target;
                            }
                        }
                    });
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        statObserver.observe(statsSection);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStatAnimation);
    } else {
        initStatAnimation();
    }

    // ═══════════════════════════════════════════════════════════
    // HERO PARALLAX ON SCROLL (throttled via rAF)
    // ═══════════════════════════════════════════════════════════

    const heroContent = document.querySelector('.hero-content');
    const heroCanvas = document.getElementById('hero-canvas');

    if (heroContent && !prefersReducedMotion) {
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const heroHeight = window.innerHeight;
                    const progress = Math.min(scrollY / heroHeight, 1);
                    heroContent.style.opacity = 1 - progress * 1.5;
                    heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
                    if (heroCanvas) {
                        heroCanvas.style.transform = `translateY(${scrollY * 0.1}px)`;
                    }
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });
    }

})();
