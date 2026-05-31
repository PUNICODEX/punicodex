/**
 * PÚNYCODEX — Tier System Page JavaScript v2
 * Hero counters, tier explorer, Big Four, real punycode converter
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // HERO COUNTER ANIMATION
    // ═══════════════════════════════════════════════════════════
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number[data-count]');
        counters.forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            const duration = 1200;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }

    // Run immediately since hero is above the fold
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', animateCounters);
    } else {
        animateCounters();
    }

    // ═══════════════════════════════════════════════════════════
    // DATA HELPERS
    // ═══════════════════════════════════════════════════════════
    function getArchetypes() {
        return (typeof ARCHETYPES !== 'undefined') ? ARCHETYPES : [];
    }

    function getArchetypeUrl(a) {
        if (a.built && a.folder) return '/sites/' + a.folder + '/';
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // POPULATE TIER TAGS
    // ═══════════════════════════════════════════════════════════
    function populateTierTags() {
        const data = getArchetypes();
        if (!data.length) return;

        const containers = {
            'tier1-tags': data.filter(a => a.tier === 'tier-1').sort((a, b) => a.name.localeCompare(b.name)),
            'tier2-tags': data.filter(a => a.tier === 'tier-2').sort((a, b) => a.name.localeCompare(b.name)),
            'tier-dual-tags': data.filter(a => a.tier === 'dual-tier').sort((a, b) => a.name.localeCompare(b.name))
        };

        Object.entries(containers).forEach(([id, items]) => {
            const container = document.getElementById(id);
            if (!container) return;
            // Show first 12 as tags, then "+N more"
            const visible = items.slice(0, 12);
            const hidden = items.slice(12);
            let html = visible.map(a =>
                `<span class="tier-tag" title="${a.greek || ''}">${a.name}</span>`
            ).join('');
            if (hidden.length) {
                html += `<span class="tier-tag" style="opacity:0.5;cursor:default;">+${hidden.length} more</span>`;
            }
            container.innerHTML = html;
        });
    }

    populateTierTags();

    // ═══════════════════════════════════════════════════════════
    // LIVE EXPLORER
    // ═══════════════════════════════════════════════════════════
    const explorerGrid = document.getElementById('explorer-grid');
    const explorerStats = document.getElementById('explorer-stats');
    const showingCount = document.getElementById('showing-count');
    const explorerEmpty = document.getElementById('explorer-empty');
    const searchInput = document.getElementById('explorer-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const tierFilterBtns = document.querySelectorAll('.tier-filter-btn');

    let currentFilter = 'all';
    let currentSearch = '';

    function buildExplorerCard(a) {
        const url = getArchetypeUrl(a);
        const tierClass = a.tier === 'tier-1' ? 'tier-1' : a.tier === 'tier-2' ? 'tier-2' : 'dual-tier';
        const tierLabel = a.tier === 'tier-1' ? 'T1' : a.tier === 'tier-2' ? 'T2' : 'Dual';

        const inner = `
            <div class="ex-card-header">
                <span class="ex-card-name">${a.name}</span>
                <span class="ex-card-tier ${tierClass}">${tierLabel}</span>
            </div>
            <span class="ex-card-greek">${a.greek || '—'}</span>
            <span class="ex-card-domain">${a.domainUnicode || a.domain || ''}</span>
        `;

        if (url) {
            return `<a href="${url}" class="explorer-card">${inner}</a>`;
        }
        return `<div class="explorer-card unbuilt">${inner}</div>`;
    }

    function renderExplorer() {
        const data = getArchetypes();
        if (!data.length || !explorerGrid) return;

        let filtered = data;

        // Apply tier filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(a => a.tier === currentFilter);
        }

        // Apply search
        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            filtered = filtered.filter(a =>
                (a.name && a.name.toLowerCase().includes(q)) ||
                (a.greek && a.greek.toLowerCase().includes(q)) ||
                (a.id && a.id.toLowerCase().includes(q)) ||
                (a.domainUnicode && a.domainUnicode.toLowerCase().includes(q)) ||
                (a.pantheon && a.pantheon.toLowerCase().includes(q))
            );
        }

        // Sort: dual first, then tier-1, then tier-2, then alphabetically
        filtered.sort((a, b) => {
            const tierOrder = { 'dual-tier': 0, 'tier-1': 1, 'tier-2': 2 };
            const ta = tierOrder[a.tier] ?? 3;
            const tb = tierOrder[b.tier] ?? 3;
            if (ta !== tb) return ta - tb;
            return a.name.localeCompare(b.name);
        });

        if (filtered.length === 0) {
            explorerGrid.innerHTML = '';
            explorerGrid.classList.add('hidden');
            explorerEmpty.classList.remove('hidden');
        } else {
            explorerGrid.innerHTML = filtered.map(buildExplorerCard).join('');
            explorerGrid.classList.remove('hidden');
            explorerEmpty.classList.add('hidden');
        }

        if (showingCount) {
            showingCount.textContent = filtered.length;
        }
    }

    renderExplorer();

    // Filter pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter || 'all';
            renderExplorer();
        });
    });

    // Tier card "See all" buttons — scroll to explorer and apply filter
    tierFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (!filter) return;
            currentFilter = filter;
            filterPills.forEach(p => {
                p.classList.toggle('active', p.dataset.filter === filter);
            });
            renderExplorer();
            document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Search
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                currentSearch = e.target.value.trim();
                renderExplorer();
            }, 150);
        });
    }

    // Clear search
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            currentSearch = '';
            currentFilter = 'all';
            if (searchInput) searchInput.value = '';
            filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
            renderExplorer();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // BIG FOUR — dual-tier deep dive
    // ═══════════════════════════════════════════════════════════
    function buildBigFour() {
        const container = document.getElementById('big-four-grid');
        if (!container) return;
        const data = getArchetypes().filter(a => a.tier === 'dual-tier').sort((a, b) => a.name.localeCompare(b.name));
        if (!data.length) return;

        const notes = {
            apollon: 'The circumflex on -ôn represents both stress and length on the final syllable. The plain ASCII "apollon.com" is also a historically attested form.',
            hades: 'The smooth breathing (Ἅ-) and the long vowel η create multiple valid restorations: hádēs (acute), hādēs (macron-only), and hades (plain).',
            hekate: 'The acute on the first syllable (hekátē) is the standard Attic form. The plain "hekate.com" reflects the modern English spelling.',
            nike: 'The acute on the first syllable (níkē) preserves the pitch accent. The plain "nike.com" drops all marks but remains recognizable.'
        };

        container.innerHTML = data.map(a => {
            const url = getArchetypeUrl(a);
            const note = notes[a.id] || '';
            const alts = (a.domainAlt && a.domainAlt.length) ? a.domainAlt : [];
            const forms = [
                { label: 'Full', value: a.name, domain: a.domainUnicode },
                { label: 'ASCII', value: a.id.charAt(0).toUpperCase() + a.id.slice(1), domain: a.id + '.com' }
            ];
            alts.forEach(alt => {
                forms.push({ label: 'Variant', value: alt.replace('.com', ''), domain: alt });
            });

            const formsHtml = forms.map(f => `
                <div class="big-four-form">
                    <span class="form-label">${f.label}</span>
                    <span class="form-value">${f.value}</span>
                    <span class="form-domain">${f.domain}</span>
                </div>
            `).join('');

            return `
                <div class="big-four-card">
                    <div class="big-four-header">
                        <div>
                            <div class="big-four-name">${a.name}</div>
                            <div class="big-four-greek">${a.greek || ''}</div>
                        </div>
                        ${url ? `<a href="${url}" class="btn btn-outline btn-sm" style="padding:8px 16px;font-size:12px;"><span>Temple →</span></a>` : ''}
                    </div>
                    <div class="big-four-forms">${formsHtml}</div>
                    <p class="big-four-note">${note}</p>
                </div>
            `;
        }).join('');
    }

    buildBigFour();

    // ═══════════════════════════════════════════════════════════
    // REAL PUNYCODE CONVERTER (using browser URL API)
    // ═══════════════════════════════════════════════════════════
    const converterInput = document.getElementById('converter-input');
    const converterBtn = document.getElementById('converter-btn');
    const converterResult = document.getElementById('converter-result');
    const resultUnicode = document.getElementById('result-unicode');
    const resultPunycode = document.getElementById('result-punycode');
    const resultMatchBlock = document.getElementById('result-match-block');
    const resultMatch = document.getElementById('result-match');

    function toPunycode(input) {
        // Strip protocol if present
        let domain = input.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
        // Strip path
        domain = domain.split('/')[0];
        if (!domain) return null;
        try {
            const url = new URL('http://' + domain);
            return {
                unicode: domain,
                punycode: url.hostname
            };
        } catch (e) {
            return null;
        }
    }

    function doConvert() {
        const input = converterInput?.value?.trim();
        if (!input) return;

        const result = toPunycode(input);
        if (!result) {
            if (converterResult) converterResult.classList.add('hidden');
            return;
        }

        if (resultUnicode) resultUnicode.textContent = result.unicode;
        if (resultPunycode) resultPunycode.textContent = result.punycode;

        // Find matching archetype
        const data = getArchetypes();
        const match = data.find(a =>
            result.unicode.includes(a.domainUnicode) ||
            result.unicode.includes(a.id) ||
            result.punycode.includes(a.domainPunycode) ||
            (a.domainAlt && a.domainAlt.some(d => result.unicode.includes(d)))
        );

        if (match && resultMatchBlock && resultMatch) {
            resultMatchBlock.classList.remove('hidden');
            resultMatch.textContent = match.name + ' — ' + match.greek;
            const url = getArchetypeUrl(match);
            if (url) {
                resultMatch.href = url;
                resultMatch.style.pointerEvents = 'auto';
            } else {
                resultMatch.href = '#';
                resultMatch.style.pointerEvents = 'none';
            }
        } else if (resultMatchBlock) {
            resultMatchBlock.classList.add('hidden');
        }

        if (converterResult) converterResult.classList.remove('hidden');
    }

    if (converterBtn) {
        converterBtn.addEventListener('click', doConvert);
    }

    if (converterInput) {
        converterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doConvert();
        });
    }

})();
