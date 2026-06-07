/**
 * PUNYCODEX — Lexicon Browse Page
 * Filterable, searchable, sortable grid of all 255 entries.
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
    let currentProto = 'all';
    let currentSearch = '';
    let currentSort = 'alpha';

    // ─── DOM refs ───
    const gridEl = document.getElementById('lexicon-grid');
    const countEl = document.getElementById('lexicon-count');
    const searchInput = document.getElementById('filter-search');
    const sortSelect = document.getElementById('filter-sort');

    // ─── Proto-language derivation (fallback when etymology absent) ───
    const PROTO_MAP = {
        greek: 'proto-indo-european',
        'greek-location': 'proto-indo-european',
        norse: 'proto-indo-european',
        sanskrit: 'proto-indo-european',
        celtic: 'proto-indo-european',
        slavic: 'proto-indo-european',
        zoroastrian: 'proto-indo-european',
        egyptian: 'proto-afro-asiatic',
        phoenician: 'proto-afro-asiatic',
        polynesian: 'proto-polynesian',
        nahuatl: 'proto-uto-aztecan',
        chinese: 'proto-sino-tibetan',
        japanese: 'proto-sino-tibetan',
        buddhist: 'proto-sino-tibetan',
        taoist: 'proto-sino-tibetan',
        korean: 'proto-sino-tibetan',
        mesopotamian: 'isolate',
        yoruba: 'isolate',
        incan: 'isolate',
        hittite: 'isolate'
    };

    function deriveProtoLanguage(entry) {
        if (entry.etymology && entry.etymology.protoLanguage) {
            return entry.etymology.protoLanguage;
        }
        return PROTO_MAP[entry.pantheon] || 'unknown';
    }

    // ─── Pantheon labels ───
    const PANTHEON_LABELS = {
        greek: 'Greek',
        'greek-location': 'Greek Location',
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
    };

    // ─── Tier subtype helper (mirrors generator logic) ───
    function getTierSubtype(entry) {
        const hasStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(entry.unicode);
        const hasLength = /[āēīōūĀĒĪŌŪ]/.test(entry.unicode);

        if (entry.tier === 'dual') return 'Dual-Tier';
        if (entry.tier === '1') {
            if (hasStress && hasLength) return 'Tier-1 Full';
            if (hasStress) return 'Tier-1 Accent-Preserving';
            if (hasLength) return 'Tier-1 Macron-Preserving';
            return 'Tier-1';
        }
        if (entry.tier === '2') {
            if (hasStress) return 'Tier-2 Accent-Preserving';
            if (hasLength) return 'Tier-2 Macron-Preserving';
            return 'Tier-2 Basic';
        }
        return entry.tierLabel;
    }

    // ─── Filter logic ───
    function getFilteredEntries() {
        return LEXICON.filter(entry => {
            if (currentPantheon !== 'all' && entry.pantheon !== currentPantheon) return false;
            if (currentTier !== 'all' && entry.tier !== currentTier) return false;
            if (currentProto !== 'all' && deriveProtoLanguage(entry) !== currentProto) return false;
            if (currentSearch) {
                const q = currentSearch.toLowerCase();
                const match = entry.ascii.toLowerCase().includes(q) ||
                              entry.unicode.toLowerCase().includes(q) ||
                              (entry.greek && entry.greek !== '—' && entry.greek.toLowerCase().includes(q)) ||
                              entry.domain.toLowerCase().includes(q);
                if (!match) return false;
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

    // ─── Render ───
    function render() {
        const filtered = getFilteredEntries();
        const sorted = sortEntries(filtered);

        countEl.textContent = `Showing ${sorted.length} of ${LEXICON.length}`;

        if (sorted.length === 0) {
            gridEl.innerHTML = `
                <div class="lexicon-empty">
                    <h3 class="lexicon-empty-title">No matches found</h3>
                    <p class="lexicon-empty-text">Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        gridEl.innerHTML = sorted.map(entry => {
            const subtype = getTierSubtype(entry);
            const hasOriginal = entry.greek && entry.greek !== '—';
            return `
                <a href="/sites/${entry.id}/lore/" class="lexicon-card reveal-up">
                    <span class="lexicon-card-unicode">${escapeHtml(entry.unicode)}</span>
                    <span class="lexicon-card-greek">${hasOriginal ? escapeHtml(entry.greek) : '&nbsp;'}</span>
                    <span class="lexicon-card-domain">${escapeHtml(entry.domain)}</span>
                    <div class="lexicon-card-meta">
                        <span class="lexicon-card-tier">${escapeHtml(subtype)}</span>
                        <span class="lexicon-card-pantheon">${escapeHtml(PANTHEON_LABELS[entry.pantheon] || entry.pantheon)}</span>
                    </div>
                </a>
            `;
        }).join('');

        // Trigger reveal animation for new elements
        requestAnimationFrame(() => {
            document.querySelectorAll('.lexicon-card.reveal-up').forEach(el => {
                el.classList.add('revealed');
            });
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Event handlers ───

    // Pantheon pills
    document.querySelectorAll('[data-filter="pantheon"]').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('[data-filter="pantheon"]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentPantheon = pill.dataset.value;
            render();
        });
    });

    // Tier pills
    document.querySelectorAll('[data-filter="tier"]').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('[data-filter="tier"]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentTier = pill.dataset.value;
            render();
        });
    });

    // Proto-language pills
    document.querySelectorAll('[data-filter="proto"]').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('[data-filter="proto"]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentProto = pill.dataset.value;
            render();
        });
    });

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

    // ─── Init ───
    render();

})();
