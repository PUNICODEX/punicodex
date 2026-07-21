/**
 * PuniCodex — Pantheon Page JavaScript (Performance Optimized)
 * Filter, search, grid rendering, stats
 */

(function() {
    'use strict';

    // Kit placeholder art for unbuilt/failed portraits (brand integration §4.3) —
    // a card must never degrade to a bare gold ring.
    const EMPTY_PORTRAIT = '/assets/brand/03-ornaments/punicodex-empty-portrait.png';
    const EMPTY_PORTRAIT_WEBP = '/assets/brand/03-ornaments/punicodex-empty-portrait.webp';

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const grid = document.getElementById('pantheon-grid-large');
    const emptyState = document.getElementById('empty-state');
    const filterPills = document.querySelectorAll('.filter-pill');
    const searchInput = document.getElementById('search-input');

    let currentFilter = 'all';
    let currentSearch = '';
    let allCards = [];
    // Build O(1) lookup map to avoid ARCHETYPES.find() in hot loop
    const archetypeMap = new Map((typeof ARCHETYPES !== 'undefined' ? ARCHETYPES : []).map(a => [a.id, a]));

    function buildGrid() {
        if (!grid || typeof ARCHETYPES === 'undefined') return;

        const sorted = [...ARCHETYPES].sort((a, b) => {
            if (a.built !== b.built) return b.built - a.built;
            return a.name.localeCompare(b.name);
        });

        grid.innerHTML = sorted.map((a, index) => {
            const url = a.hasAdSite ? `/sites/${a.id}/lore/` : `/sites/${a.id}/`;
            const tag = 'a';
            const hrefAttr = `href="${url}"`;
            const unbuiltClass = !a.built ? 'unbuilt' : '';
            const tierClass = a.tier;
            const badgeText = !a.built ? 'Awaiting' : a.tier === 'tier-1' ? 'Tier 1' : 'Tier 2';

            const scriptInfo = typeof ORIGINAL_SCRIPT_LOOKUP !== 'undefined' ? ORIGINAL_SCRIPT_LOOKUP[a.id] : null;
            const originalScript = scriptInfo ? scriptInfo.originalScript : (a.greek || '');
            const scriptName = scriptInfo ? scriptInfo.scriptName : 'Greek';
            const scriptLabel = originalScript && originalScript !== '—'
                ? `<span class="card-script-name">${escapeHtml(scriptName)}</span>${escapeHtml(originalScript)}`
                : '<span class="card-script-name">Scholarly transliteration</span>';

            const thumbPath = `/assets/images/mascots/thumbs/small/${a.id}_thumb.webp?v=77`;
            const loadingAttr = index < 8 ? 'loading="eager"' : 'loading="lazy"';
            // Unbuilt temples have no mascot shoot yet — render the kit's empty
            // portrait directly instead of round-tripping a 404 thumb.
            const portraitHtml = !a.built
                ? `<picture><source srcset="${EMPTY_PORTRAIT_WEBP}" type="image/webp"><img src="${EMPTY_PORTRAIT}" alt="" width="120" height="120" ${loadingAttr} decoding="async" class="card-portrait-img"></picture>`
                : `<img src="${thumbPath}" alt="${a.name} — ${a.domain}" data-fallback="${a.mascotFallback || a.mascotPath}" width="120" height="120" ${loadingAttr} decoding="async" class="card-portrait-img">`;

            return `
                <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" data-id="${a.id}" data-tier="${a.tier}" data-pantheon="${a.pantheon}" data-built="${a.built}" data-name="${(a.name || "").toLowerCase()}" data-greek="${(a.greek || "").toLowerCase()}" data-domain="${(a.domain || "").toLowerCase()}" style="--stagger-index:${index % 4}">
                    <div class="card-portrait">
                        ${portraitHtml}
                    </div>
                    <p class="card-name">${a.name}</p>
                    <p class="card-greek">${scriptLabel}</p>
                    <p class="card-domain">${a.domain}</p>
                    <p class="card-punycode">${a.domainUnicode} &rarr; ${a.domainPunycode}</p>
                    <span class="card-badge ${tierClass}">${badgeText}</span>
                </${tag}>
            `;
        }).join('');

        allCards = Array.from(grid.querySelectorAll('.archetype-card'));

        if (typeof revealObserver !== 'undefined') {
            allCards.forEach(el => revealObserver.observe(el));
        }

        // Handle image loading: reveal on success, swap to fallback or skeleton on error.
        // NOTE: We do NOT eagerly check img.complete/naturalWidth here because lazy-loaded
        // images below the fold report complete=true and naturalWidth=0 before the browser
        // has even started fetching them. That caused us to hide valid images and leave
        // skeleton placeholders in their place.
        grid.querySelectorAll('.card-portrait img').forEach(img => {
            img.classList.add('is-loading');
            img.addEventListener('load', function() { this.classList.remove('is-loading'); this.classList.add('is-loaded'); });
            img.addEventListener('error', function() { handleImgError(this); });
        });
    }

    function handleImgError(img) {
        img.classList.remove('is-loading');
        const fallback = img.dataset.fallback;
        // If the current src is already the fallback, settle on the kit's empty
        // portrait so the card never renders as a bare ring.
        if (!fallback || img.src.endsWith(fallback)) {
            if (!img.src.endsWith(EMPTY_PORTRAIT)) {
                delete img.dataset.fallback;
                img.src = EMPTY_PORTRAIT;
                img.addEventListener('load', function() { this.classList.add('is-loaded'); }, { once: true });
            }
            return;
        }
        // Try the fallback once (e.g. .png if .webp fails).
        img.src = fallback;
    }

    function applyFilter() {
        if (!allCards.length) return;

        const q = currentSearch.toLowerCase();
        let visibleCount = 0;
        let builtCount = 0;
        let tier1Count = 0;
        let tier2Count = 0;

        allCards.forEach(card => {
            const archetype = archetypeMap.get(card.dataset.id);
            if (!archetype) return;

            // Filter match
            let filterMatch = true;
            if (currentFilter !== 'all') {
                if (currentFilter === 'built') filterMatch = archetype.built;
                else if (currentFilter === 'awaiting') filterMatch = !archetype.built;
                else if (currentFilter.startsWith('tier-')) filterMatch = archetype.tier === currentFilter;
                else filterMatch = archetype.pantheon === currentFilter;
            }

            // Search match
            let searchMatch = true;
            if (q) {
                searchMatch = (
                    (archetype.name || "").toLowerCase().includes(q) ||
                    (archetype.greek || "").toLowerCase().includes(q) ||
                    (archetype.domain || "").toLowerCase().includes(q) ||
                    (archetype.id || "").toLowerCase().includes(q)
                );
            }

            const isVisible = filterMatch && searchMatch;
            card.classList.toggle('hidden', !isVisible);

            if (isVisible) {
                visibleCount++;
                if (archetype.built) builtCount++;
                if (archetype.tier === 'tier-1') tier1Count++;
                if (archetype.tier === 'tier-2') tier2Count++;

            }
        });

        // Update stats (fallback to 0 if elements missing)
        const statTotal = document.getElementById('stat-total');
        const statBuilt = document.getElementById('stat-built');
        const statTier1 = document.getElementById('stat-tier1');
        const statTier2 = document.getElementById('stat-tier2');
        if (statTotal) statTotal.textContent = visibleCount;
        if (statBuilt) statBuilt.textContent = builtCount;
        if (statTier1) statTier1.textContent = tier1Count;
        if (statTier2) statTier2.textContent = tier2Count;


        // Show/hide empty state
        if (visibleCount === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    // Filter pills (the expander button is handled separately below)
    const filterMore = document.getElementById('filter-more');
    const pillsContainer = document.getElementById('filter-pills');
    filterPills.forEach(pill => {
        if (pill === filterMore) return;
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            applyFilter();
        });
    });

    // Expander: reveal the extra pills on demand (mobile-first).
    if (filterMore && pillsContainer) {
        filterMore.addEventListener('click', () => {
            const expanded = pillsContainer.classList.toggle('expanded');
            filterMore.setAttribute('aria-expanded', String(expanded));
            filterMore.textContent = expanded ? 'Fewer filters' : 'More filters';
        });
    }

    // Search
    if (searchInput) {
        const debounce = window.PX && window.PX.debounce ? window.PX.debounce : function(fn, d) {
            let t;
            return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); };
        };
        searchInput.addEventListener('input', debounce(() => {
            currentSearch = searchInput.value.trim();
            applyFilter();
        }, 350));
    }

    // Initial build + stats
    function init() {
        buildGrid();
        applyFilter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
