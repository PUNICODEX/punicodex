/**
 * PÚNYCODEX — Pantheon Page JavaScript (Performance Optimized)
 * Filter, search, grid rendering, stats
 */

(function() {
    'use strict';

    const grid = document.getElementById('pantheon-grid-large');
    const emptyState = document.getElementById('empty-state');
    const filterPills = document.querySelectorAll('.filter-pill');
    const searchInput = document.getElementById('search-input');

    let currentFilter = 'all';
    let currentSearch = '';
    let allCards = [];

    function buildGrid() {
        if (!grid || typeof ARCHETYPES === 'undefined') return;

        const sorted = [...ARCHETYPES].sort((a, b) => {
            if (a.built !== b.built) return b.built - a.built;
            return a.name.localeCompare(b.name);
        });

        grid.innerHTML = sorted.map((a, index) => {
            const url = a.built && a.folder ? `/sites/${a.folder}/` : null;
            const tag = url ? 'a' : 'div';
            const hrefAttr = url ? `href="${url}"` : '';
            const unbuiltClass = !a.built ? 'unbuilt' : '';
            const tierClass = a.tier === 'dual-tier' ? 'dual-tier' : a.tier;
            const badgeText = !a.built ? 'Awaiting' : a.tier === 'tier-1' ? 'Tier 1' : a.tier === 'tier-2' ? 'Tier 2' : 'Dual-Tier';

            return `
                <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" data-id="${a.id}" data-tier="${a.tier}" data-pantheon="${a.pantheon}" data-built="${a.built}" data-name="${a.name.toLowerCase()}" data-greek="${a.greek.toLowerCase()}" data-domain="${a.domain.toLowerCase()}" style="--stagger-index:${index % 4}">
                    <div class="card-portrait">
                        <img src="${a.mascotPath}" alt="${a.name} — ${a.domain}" loading="lazy" onerror="this.style.opacity='0'; this.parentElement.style.background='linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)'; this.parentElement.style.backgroundSize='200% 100%'; this.parentElement.style.animation='skeletonShimmer 1.5s infinite';">
                    </div>
                    <p class="card-name">${a.name}</p>
                    <p class="card-greek">${a.greek}</p>
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
    }

    function applyFilter() {
        if (!allCards.length) return;

        const q = currentSearch.toLowerCase();
        let visibleCount = 0;
        let builtCount = 0;
        let tier1Count = 0;
        let tier2Count = 0;
        let dualCount = 0;

        allCards.forEach(card => {
            const id = card.dataset.id;
            const archetype = ARCHETYPES.find(a => a.id === id);
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
                    archetype.name.toLowerCase().includes(q) ||
                    archetype.greek.toLowerCase().includes(q) ||
                    archetype.domain.toLowerCase().includes(q) ||
                    archetype.id.toLowerCase().includes(q)
                );
            }

            const isVisible = filterMatch && searchMatch;
            card.classList.toggle('hidden', !isVisible);

            if (isVisible) {
                visibleCount++;
                if (archetype.built) builtCount++;
                if (archetype.tier === 'tier-1') tier1Count++;
                if (archetype.tier === 'tier-2') tier2Count++;
                if (archetype.tier === 'dual-tier') dualCount++;
            }
        });

        // Update stats
        document.getElementById('stat-total').textContent = visibleCount;
        document.getElementById('stat-built').textContent = builtCount;
        document.getElementById('stat-tier1').textContent = tier1Count;
        document.getElementById('stat-tier2').textContent = tier2Count;
        document.getElementById('stat-dual').textContent = dualCount;

        // Show/hide empty state
        if (visibleCount === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    // Filter pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            applyFilter();
        });
    });

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

    // Initial build
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildGrid);
    } else {
        buildGrid();
    }

})();
