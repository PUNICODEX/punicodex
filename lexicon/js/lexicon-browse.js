/**
 * PUNICODEX — Lexicon Browse Page
 * Filterable, searchable, sortable grid of all 873 entries.
 */

(function() {
    'use strict';

    if (typeof LEXICON === 'undefined') {
        console.error('LEXICON not loaded');
        return;
    }

    // ─── State ───
    let currentPantheon = 'all';
    let currentTier = 'all';
    let currentSearch = '';
    let currentSort = 'alpha';
    let showAll = false;

    // ─── Owned-entry lookup (populated by /js/owned-entries.js) ───
    const ownedEntryIds = (typeof OWNED_ENTRY_IDS !== 'undefined' && OWNED_ENTRY_IDS instanceof Set)
        ? OWNED_ENTRY_IDS
        : new Set(['helheimr', 'muspellheimr', 'trengtreng']);

    function isAsciiOnly(str) {
        return !/[^\x00-\x7F]/.test(String(str));
    }

    // ─── DOM refs ───
    const gridEl = document.getElementById('lexicon-grid');
    const countEl = document.getElementById('lexicon-count');
    const searchInput = document.getElementById('filter-search');
    const sortSelect = document.getElementById('filter-sort');


    // ─── Pantheon labels ───
    const PANTHEON_LABELS = {
        greek: 'Greek',
        'greek-location': 'Greek Locations',
        roman: 'Roman',
        norse: 'Norse',
        egyptian: 'Egyptian',
        sanskrit: 'Sanskrit',
        celtic: 'Celtic',
        mesopotamian: 'Mesopotamian',
        polynesian: 'Polynesian',
        japanese: 'Japanese',
        nahuatl: 'Nahuatl',
        yoruba: 'Yoruba',
        slavic: 'Slavic',
        zoroastrian: 'Zoroastrian',
        incan: 'Incan',
        canaanite: 'Canaanite',
        chinese: 'Chinese',
        buddhist: 'Buddhist',
        taoist: 'Taoist',
        korean: 'Korean',
        phoenician: 'Phoenician',
        hittite: 'Hittite',
        aboriginal: 'Aboriginal',
        mapuche: 'Mapuche',
        baltic: 'Baltic',
    };

    // ─── Tier subtype helper (mirrors generator logic) ───
    function getTierSubtype(entry) {
        const hasStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(entry.unicode);
        const hasLength = /[āēīōūĀĒĪŌŪ]/.test(entry.unicode);

        if (entry.tier === 'dual') return 'Dual-Tier';
        // Doctrine: Tier-1 has no subtypes; subtype labels exist only for Tier-2.
        if (entry.tier === '1') return 'Tier-1';
        if (entry.tier === '2') {
            if (hasStress) return 'Tier-2 Accent-Preserving';
            if (hasLength) return 'Tier-2 Macron-Preserving';
            return 'Tier-2';
        }
        return entry.tierLabel;
    }

    // ─── Filter logic ───
    function getFilteredEntries() {
        return LEXICON.filter(entry => {
            if (currentPantheon !== 'all' && entry.pantheon !== currentPantheon) return false;
            if (currentTier !== 'all' && entry.tier !== currentTier) return false;
            if (currentSearch) {
                const q = currentSearch.toLowerCase();
                const match = entry.ascii.toLowerCase().includes(q) ||
                              entry.unicode.toLowerCase().includes(q) ||
                              (entry.greek && entry.greek !== '—' && entry.greek.toLowerCase().includes(q)) ||
                              entry.domain.toLowerCase().includes(q);
                if (!match) return false;
            }
            // Default public view: show only entries with a visible Unicode
            // restoration or an owned domain. Plain-ASCII entries without an
            // owned domain are hidden unless the user toggles the full lexicon.
            if (!showAll && isAsciiOnly(entry.unicode) && !ownedEntryIds.has(entry.id)) {
                return false;
            }
            return true;
        });
    }

    // ─── Sort logic ───
    function sortEntries(entries) {
        const sorted = [...entries];
        switch (currentSort) {
            case 'alpha':
                sorted.sort((a, b) => a.unicode.localeCompare(b.unicode));
                break;
            case 'pantheon':
                sorted.sort((a, b) => {
                    const pa = PANTHEON_LABELS[a.pantheon] || a.pantheon;
                    const pb = PANTHEON_LABELS[b.pantheon] || b.pantheon;
                    if (pa !== pb) return pa.localeCompare(pb);
                    return a.unicode.localeCompare(b.unicode);
                });
                break;
            case 'tier':
                const tierOrder = { dual: 0, '1': 0, '2': 1 };
                sorted.sort((a, b) => {
                    const ta = tierOrder[a.tier] || 3;
                    const tb = tierOrder[b.tier] || 3;
                    if (ta !== tb) return ta - tb;
                    return a.unicode.localeCompare(b.unicode);
                });
                break;
        }
        return sorted;
    }

function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Card template ───
    function cardHtml(entry) {
        const subtype = getTierSubtype(entry);
        const hasOriginal = entry.greek && entry.greek !== '—';
        return `
            <a href="/sites/${entry.id}${entry.hasAdSite ? '/lore/' : '/'}" class="lexicon-card reveal-up">
                <span class="lexicon-card-unicode">${escapeHtml(entry.unicode)}</span>
                <span class="lexicon-card-greek">${hasOriginal ? escapeHtml(entry.greek) : '&nbsp;'}</span>
                <span class="lexicon-card-domain">${escapeHtml(entry.domain)}</span>
                <div class="lexicon-card-meta">
                    <span class="lexicon-card-tier">${escapeHtml(subtype)}</span>
                    <span class="lexicon-card-pantheon">${escapeHtml(PANTHEON_LABELS[entry.pantheon] || entry.pantheon)}</span>
                </div>
            </a>
        `;
    }

    // ─── Render ───
    const BATCH_SIZE = 60;
    let renderGeneration = 0;

    function render() {
        const filtered = getFilteredEntries();
        const sorted = sortEntries(filtered);

        const viewLabel = showAll ? 'full lexicon' : 'restored + owned';
        countEl.textContent = `${sorted.length.toLocaleString()} of ${LEXICON.length.toLocaleString()} shown · ${viewLabel}`;
        updateResetButton();

        // Cancel any in-progress batched render so rapid filter changes feel snappy.
        renderGeneration++;
        const gen = renderGeneration;

        gridEl.innerHTML = '';
        if (sorted.length === 0) {
            gridEl.innerHTML = `
                <div class="lexicon-empty">
                    <h3 class="lexicon-empty-title">No matches found</h3>
                    <p class="lexicon-empty-text">Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        let i = 0;
        function nextBatch() {
            if (gen !== renderGeneration) return;
            const batch = sorted.slice(i, i + BATCH_SIZE);
            if (batch.length === 0) {
                requestAnimationFrame(() => {
                    document.querySelectorAll('.lexicon-card.reveal-up').forEach(el => {
                        el.classList.add('revealed');
                    });
                });
                return;
            }
            const html = batch.map(cardHtml).join('');
            gridEl.insertAdjacentHTML('beforeend', html);
            i += BATCH_SIZE;
            requestAnimationFrame(nextBatch);
        }
        nextBatch();
    }

    // ─── Event handlers ───

    // Pantheon chips
    const pantheonChipsEl = document.getElementById('pantheon-chips');
    const renderPantheonChips = () => {
        if (!pantheonChipsEl) return;
        const allActive = currentPantheon === 'all' ? ' active' : '';
        const chips = Object.entries(PANTHEON_LABELS).map(([key, label]) => {
            const active = currentPantheon === key ? ' active' : '';
            return `<button type="button" class="filter-chip${active}" data-filter="pantheon" data-value="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
        }).join('');
        pantheonChipsEl.innerHTML = `<button type="button" class="filter-chip${allActive}" data-filter="pantheon" data-value="all">All</button>${chips}`;
    };
    if (pantheonChipsEl) {
        renderPantheonChips();
        pantheonChipsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-filter="pantheon"]');
            if (!btn) return;
            currentPantheon = btn.dataset.value;
            renderPantheonChips();
            render();
        });

        const pantheonExpand = document.getElementById('pantheon-expand');
        if (pantheonExpand) {
            pantheonExpand.addEventListener('click', () => {
                const expanded = pantheonChipsEl.classList.toggle('expanded');
                pantheonExpand.setAttribute('aria-expanded', String(expanded));
                pantheonExpand.querySelector('span').textContent = expanded ? 'Show fewer traditions' : 'Show all traditions';
                pantheonExpand.classList.toggle('expanded', expanded);
            });
        }
    }

    // Tier segment
    const tierSegment = document.getElementById('tier-segment');
    if (tierSegment) {
        tierSegment.querySelectorAll('[data-filter="tier"]').forEach(btn => {
            btn.addEventListener('click', () => {
                tierSegment.querySelectorAll('[data-filter="tier"]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTier = btn.dataset.value;
                render();
            });
        });
    }

    // Search (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            render();
        }, 200);
    });

    // Sort
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        render();
    });

    // Show-all toggle (reveals plain-ASCII entries without owned domains)
    const showAllToggle = document.getElementById('filter-show-all');
    function updateShowAllButton() {
        if (!showAllToggle) return;
        showAllToggle.classList.toggle('active', showAll);
        showAllToggle.setAttribute('aria-pressed', String(showAll));
    }
    if (showAllToggle) {
        showAllToggle.addEventListener('click', () => {
            showAll = !showAll;
            updateShowAllButton();
            render();
        });
    }

    // Reset filters
    const resetBtn = document.getElementById('filter-reset');
    function updateResetButton() {
        if (!resetBtn) return;
        const isDefault = currentPantheon === 'all' && currentTier === 'all' && currentSearch === '' && currentSort === 'alpha' && !showAll;
        resetBtn.hidden = isDefault;
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentPantheon = 'all';
            currentTier = 'all';
            currentSearch = '';
            currentSort = 'alpha';
            showAll = false;
            searchInput.value = '';
            sortSelect.value = 'alpha';
            renderPantheonChips();
            tierSegment.querySelectorAll('[data-filter="tier"]').forEach(b => b.classList.remove('active'));
            tierSegment.querySelector('[data-value="all"]').classList.add('active');
            updateShowAllButton();
            render();
        });
    }

    // ─── Init ───
    render();

})();
