/**
 * PÚNYCODEX Type — Unicode Typing Engine
 * Predictive transliteration with scholarly constraint
 * SSS-grade: IME-aware, accessible, keyboard-navigable,
 * haptic-enabled, URL-synced, NFC-normalized.
 * Variant-aware: supports multiple Unicode restorations per ASCII root.
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // CONFIG
    // ═══════════════════════════════════════════════════════════

    const CONFIG = {
        maxCompletions: 6,
        maxSuggestions: 8,
        debounceMs: 16, // one rAF frame
        hapticMs: 10,
    };

    // ═══════════════════════════════════════════════════════════
    // ENGINE
    // ═══════════════════════════════════════════════════════════

    const trie = PUNYCODEX_ENGINE.buildTrie(LEXICON);

    // ═══════════════════════════════════════════════════════════
    // DOM REFERENCES
    // ═══════════════════════════════════════════════════════════

    const inputField = document.getElementById('type-input');
    const previewEl = document.getElementById('type-preview');
    const suggestionsEl = document.getElementById('type-suggestions');
    const breakdownEl = document.getElementById('type-breakdown');
    const statusEl = document.getElementById('type-status');
    const completionsEl = document.getElementById('type-completions');
    const resultEl = document.getElementById('type-result');
    const resultUnicode = document.getElementById('result-unicode');
    const resultGreek = document.getElementById('result-greek');
    const resultVariations = document.getElementById('result-variations');
    const resultDomain = document.getElementById('result-domain');
    const resultMeaning = document.getElementById('result-meaning');
    const resultTier = document.getElementById('result-tier');
    const resultSources = document.getElementById('result-sources');
    const resultEtymology = document.getElementById('result-etymology');
    const resultEtymologyRow = document.getElementById('result-etymology-row');
    const resultLore = document.getElementById('result-lore');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const pantheonFilter = document.getElementById('pantheon-filter');

    if (!inputField) return; // Guard for non-type pages

    // ── Create ARIA live region if absent ────────────────────
    let liveRegion = document.getElementById('type-live');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'type-live';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
        document.body.appendChild(liveRegion);
    }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    let currentInput = '';
    let selectedEntry = null;
    let activePantheon = 'all';
    let isComposing = false;
    let activeCompletionIndex = -1;
    let debounceTimer = null;
    let loreCatalog = null;
    let loreCatalogPromise = null;

    // ═══════════════════════════════════════════════════════════
    // URL STATE SYNC
    // ═══════════════════════════════════════════════════════════

    function readUrlState() {
        const hash = location.hash.slice(1);
        if (!hash) return;

        // First: try entry ID permalink
        const entry = LEXICON.find(e => e.id === hash);
        if (entry) {
            currentInput = entry.ascii;
            inputField.value = entry.ascii;
            selectedEntry = entry;
            return;
        }

        // Second: try pantheon filter
        const valid = Array.from(pantheonFilter.options).some(o => o.value === hash);
        if (valid) {
            activePantheon = hash;
            pantheonFilter.value = hash;
        }
    }

    function writeUrlState() {
        let newHash = '';
        const matches = findExactMatches(currentInput);
        const primary = matches[0];
        if (selectedEntry) {
            newHash = selectedEntry.id;
        } else if (primary) {
            newHash = primary.id;
        } else if (activePantheon !== 'all') {
            newHash = activePantheon;
        }
        if (location.hash.slice(1) !== newHash) {
            history.replaceState(null, '', newHash ? '#' + newHash : location.pathname + location.search);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CORE LOGIC (delegates to PUNYCODEX_ENGINE)
    // ═══════════════════════════════════════════════════════════

    function nfc(str) {
        return PUNYCODEX_ENGINE.nfc(str);
    }

    function loadLoreCatalog() {
        if (loreCatalog) return Promise.resolve(loreCatalog);
        if (loreCatalogPromise) return loreCatalogPromise;
        loreCatalogPromise = fetch('js/lore-catalog.json')
            .then(res => res.ok ? res.json() : {})
            .then(data => {
                loreCatalog = data || {};
                return loreCatalog;
            })
            .catch(() => {
                loreCatalog = {};
                return loreCatalog;
            });
        return loreCatalogPromise;
    }

    function getCompletions(prefix, limit = CONFIG.maxCompletions) {
        return PUNYCODEX_ENGINE.getCompletions(trie, prefix, { limit, pantheonFilter: activePantheon });
    }

    function getValidNextChars(prefix) {
        return PUNYCODEX_ENGINE.getValidNextChars(trie, prefix, { pantheonFilter: activePantheon });
    }

    function findExactMatches(input) {
        return PUNYCODEX_ENGINE.findExactMatches(trie, input, { pantheonFilter: activePantheon });
    }

    function findExactMatch(input) {
        return PUNYCODEX_ENGINE.findExactMatch(trie, input, { pantheonFilter: activePantheon });
    }

    // ═══════════════════════════════════════════════════════════
    // RENDERERS
    // ═══════════════════════════════════════════════════════════

    function renderPreview() {
        if (!currentInput) {
            previewEl.textContent = '';
            previewEl.className = 'type-preview';
            inputField.classList.remove('preview-active');
            return;
        }

        const entry = findExactMatch(currentInput);
        if (entry) {
            previewEl.innerHTML = `<span class="preview-convert">${escapeHtml(nfc(entry.unicode))}</span>`;
            previewEl.className = 'type-preview preview-locked';
            inputField.classList.add('preview-active');
        } else {
            inputField.classList.remove('preview-active');
            const completions = getCompletions(currentInput, 1);
            if (completions.length > 0) {
                const first = completions[0];
                const remaining = first.ascii.slice(currentInput.length);
                previewEl.innerHTML = `<span class="preview-typed">${escapeHtml(currentInput)}</span><span class="preview-hint">${escapeHtml(remaining)}</span>`;
                previewEl.className = 'type-preview';
            } else {
                previewEl.innerHTML = `<span class="preview-typed">${escapeHtml(currentInput)}</span><span class="preview-error"> — no valid transliteration</span>`;
                previewEl.className = 'type-preview preview-invalid';
            }
        }
    }

    function renderSuggestions() {
        const nextChars = getValidNextChars(currentInput);
        if (nextChars.length === 0 || !currentInput) {
            suggestionsEl.innerHTML = '';
            return;
        }

        const charsHtml = nextChars.slice(0, CONFIG.maxSuggestions).map(c =>
            `<span class="suggestion-char" data-char="${c}">${c.toUpperCase()}</span>`
        ).join('');

        suggestionsEl.innerHTML = `<span class="suggestion-label">Next valid:</span>${charsHtml}`;
    }

    function renderCompletions() {
        const completions = getCompletions(currentInput, CONFIG.maxCompletions);
        activeCompletionIndex = -1;
        inputField.setAttribute('aria-expanded', completions.length > 0 && currentInput ? 'true' : 'false');

        if (completions.length === 0 || !currentInput) {
            completionsEl.innerHTML = '';
            completionsEl.removeAttribute('role');
            inputField.removeAttribute('aria-activedescendant');
            return;
        }

        completionsEl.setAttribute('role', 'listbox');
        completionsEl.setAttribute('aria-label', 'Name completions');

        const html = completions.map((entry, i) => {
            const matchIndex = entry.ascii.toLowerCase().indexOf(currentInput.toLowerCase());
            const before = entry.ascii.slice(0, matchIndex + currentInput.length);
            const after = entry.ascii.slice(matchIndex + currentInput.length);
            const pantheonLabel = entry.pantheon === 'greek-location' ? '📍' :
                entry.pantheon === 'greek' ? '⚡' :
                entry.pantheon === 'norse' ? '❄️' :
                entry.pantheon === 'egyptian' ? '☀️' :
                entry.pantheon === 'sanskrit' ? '🕉️' :
                entry.pantheon === 'celtic' ? '🌿' :
                entry.pantheon === 'mesopotamian' ? '🏛️' :
                entry.pantheon === 'polynesian' ? '🌊' :
                entry.pantheon === 'japanese' ? '⛩️' :
                entry.pantheon === 'nahuatl' ? '🐍' :
                entry.pantheon === 'yoruba' ? '🥁' :
                entry.pantheon === 'slavic' ? '🔥' :
                entry.pantheon === 'zoroastrian' ? '☀️' :
                entry.pantheon === 'incan' ? '🦙' :
                entry.pantheon === 'chinese' ? '🐉' :
                entry.pantheon === 'buddhist' ? '☸️' :
                entry.pantheon === 'taoist' ? '☯️' :
                entry.pantheon === 'korean' ? '🇰🇷' :
                entry.pantheon === 'phoenician' ? '🌅' :
                entry.pantheon === 'hittite' ? '🦁' :
                entry.pantheon === 'canaanite' ? '🌴' : '✦';
            return `
                <div class="completion-item" data-id="${entry.id}" id="completion-${i}" role="option" aria-selected="false">
                    <span class="completion-pantheon" aria-hidden="true">${pantheonLabel}</span>
                    <span class="completion-name">
                        <span class="completion-typed">${escapeHtml(before)}</span><span class="completion-remaining">${escapeHtml(after)}</span>
                    </span>
                    <span class="completion-unicode">→ ${escapeHtml(nfc(entry.unicode))}</span>
                </div>
            `;
        }).join('');

        completionsEl.innerHTML = html;

        // Click to autocomplete
        completionsEl.querySelectorAll('.completion-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) {
                    currentInput = entry.ascii;
                    selectedEntry = entry;
                    updateAll();
                    inputField.focus();
                }
            });
        });
    }

    function setActiveCompletion(index) {
        const items = completionsEl.querySelectorAll('.completion-item');
        items.forEach((item, i) => {
            const isActive = i === index;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (index >= 0 && items[index]) {
            inputField.setAttribute('aria-activedescendant', items[index].id);
            items[index].scrollIntoView({ block: 'nearest' });
        } else {
            inputField.removeAttribute('aria-activedescendant');
        }

        activeCompletionIndex = index;
    }

    function renderStatus() {
        const matches = findExactMatches(currentInput);
        let msg = '';
        if (matches.length > 0) {
            if (matches.length > 1) {
                msg = `✓ Valid — ${matches.length} variants found. Press Enter to confirm primary`;
            } else {
                msg = `✓ Valid — press Enter to confirm`;
            }
            statusEl.innerHTML = `<span class="status-ok">${escapeHtml(msg)}</span>`;
        } else if (currentInput) {
            const completions = getCompletions(currentInput);
            if (completions.length > 0) {
                msg = `${completions.length} completion${completions.length > 1 ? 's' : ''} possible`;
                statusEl.innerHTML = `<span class="status-pending">${escapeHtml(msg)}</span>`;
            } else {
                msg = `No valid transliteration begins with "${currentInput}"`;
                statusEl.innerHTML = `<span class="status-error">${escapeHtml(msg)}</span>`;
            }
        } else {
            msg = `Type a name to begin restoration...`;
            statusEl.innerHTML = `<span class="status-hint">${escapeHtml(msg)}</span>`;
        }

        // Announce to screen readers
        if (liveRegion && msg) {
            liveRegion.textContent = msg;
        }
    }

    function renderBreakdown() {
        const entry = selectedEntry || findExactMatch(currentInput);
        if (!entry) {
            breakdownEl.innerHTML = '';
            return;
        }

        const rows = entry.breakdown.map((step, i) => {
            const typeClass = step.type === 'stress' ? 'type-stress' :
                step.type === 'length' ? 'type-length' :
                step.type === 'dual' ? 'type-dual' :
                step.type === 'special' ? 'type-special' :
                step.type === 'drop' ? 'type-drop' :
                step.type === 'merge' ? 'type-merge' : 'type-same';
            const typeLabel = step.type === 'stress' ? 'Stress' :
                step.type === 'length' ? 'Length' :
                step.type === 'dual' ? 'Stress + Length' :
                step.type === 'special' ? 'Special' :
                step.type === 'drop' ? 'Removed' :
                step.type === 'merge' ? 'Merged' : 'Same';
            return `
                <div class="breakdown-row">
                    <span class="breakdown-index">${i + 1}</span>
                    <span class="breakdown-from">${escapeHtml(step.char)}</span>
                    <span class="breakdown-arrow">→</span>
                    <span class="breakdown-to ${typeClass}">${escapeHtml(nfc(step.to)) || '—'}</span>
                    <span class="breakdown-type ${typeClass}">${typeLabel}</span>
                    <span class="breakdown-note">${escapeHtml(step.note)}</span>
                </div>
            `;
        }).join('');

        breakdownEl.innerHTML = `
            <div class="breakdown-header">
                <span class="breakdown-title">Restoration Breakdown</span>
                <span class="breakdown-tier tier-${entry.tier}">${entry.tierLabel}</span>
            </div>
            <div class="breakdown-body">${rows}</div>
        `;
    }

    function updateMeta(entry) {
        if (entry) {
            document.title = `PÚNYCODEX Type — ${nfc(entry.unicode)}`;
            const desc = `${nfc(entry.unicode)}${entry.greek !== '—' ? ' (' + entry.greek + ')' : ''} — ${entry.meaning}. ${entry.domain}.`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.content = desc;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.content = `${nfc(entry.unicode)} — PÚNYCODEX Type`;
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.content = desc;
            const ogUrl = document.querySelector('meta[property="og:url"]');
            if (ogUrl) ogUrl.content = `${location.origin}${location.pathname}#${entry.id}`;
        } else {
            document.title = 'PÚNYCODEX Type — Scholarly Transliteration Engine';
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.content = 'Type classical names and watch them restore to their correct Unicode orthography. A predictive typing system for scholarly transliteration.';
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.content = 'PÚNYCODEX Type — Scholarly Transliteration Engine';
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.content = 'Type classical names and watch them restore to their correct Unicode orthography.';
            const ogUrl = document.querySelector('meta[property="og:url"]');
            if (ogUrl) ogUrl.content = `${location.origin}${location.pathname}`;
        }
    }

    function renderLore(entry) {
        if (!resultLore || !loreCatalog) return;
        const lore = loreCatalog[entry.id];
        if (!lore) {
            resultLore.classList.add('hidden');
            return;
        }

        let html = '<div class="result-lore-header">Flagship Lore</div>';
        if (lore.summary) {
            html += `<div class="result-lore-section"><div class="result-lore-title">Overview</div><p>${escapeHtml(lore.summary)}</p></div>`;
        }
        if (lore.pronunciation && lore.pronunciation.guide) {
            html += `<div class="result-lore-section"><div class="result-lore-title">Pronunciation</div><p>${escapeHtml(lore.pronunciation.guide)}</p></div>`;
        }
        if (lore.mythology && lore.mythology.summary) {
            html += `<div class="result-lore-section"><div class="result-lore-title">Mythology</div><p>${escapeHtml(lore.mythology.summary)}</p><a href="/sites/${entry.id}/lore.html" target="_blank" rel="noopener" class="result-lore-link">Read full lore →</a></div>`;
        }
        resultLore.innerHTML = html;
        resultLore.classList.remove('hidden');
    }

    function renderResult() {
        const entry = selectedEntry || findExactMatch(currentInput);
        if (!entry) {
            resultEl.classList.add('hidden');
            updateMeta(null);
            return;
        }

        resultUnicode.textContent = nfc(entry.unicode);

        if (entry.greek && entry.greek !== '—') {
            resultGreek.textContent = entry.greek;
            resultGreek.style.display = '';
        } else {
            resultGreek.style.display = 'none';
        }

        if (resultVariations && (entry.variants || (typeof StackedDiacritics !== 'undefined' && StackedDiacritics.hasStackedDiacritics(entry.unicode)))) {
            const derivedTypes = ['owned', 'ideal', 'macron-only'];
            const scholarlyTypes = ['alt-stress', 'alt'];
            const derived = (entry.variants || []).filter(v => derivedTypes.includes(v.type));
            const scholarly = (entry.variants || []).filter(v => scholarlyTypes.includes(v.type) && Array.isArray(v.sources) && v.sources.length > 0);

            derived.sort((a, b) => derivedTypes.indexOf(a.type) - derivedTypes.indexOf(b.type));
            scholarly.sort((a, b) => scholarlyTypes.indexOf(a.type) - scholarlyTypes.indexOf(b.type));

            let html = '';
            if (derived.length > 0 || (typeof StackedDiacritics !== 'undefined' && StackedDiacritics.hasStackedDiacritics(entry.unicode))) {
                html += '<div class="result-variations-section">';
                html += '<span class="result-variations-label">Derived Forms</span>';
                html += '<div class="variations-list">';
                for (const v of derived) {
                    html += renderVariationItem(v, false);
                }
                if (typeof StackedDiacritics !== 'undefined' && StackedDiacritics.hasStackedDiacritics(entry.unicode)) {
                    html += `<button type="button" class="variation-chip variation-decomposed" data-unicode="${escapeHtml(StackedDiacritics.render(entry.unicode))}" title="Decomposed view of stacked diacritics">${StackedDiacritics.render(entry.unicode)}</button>`;
                }
                html += '</div>';
                html += '<p class="result-variations-hint">Forms derived from the primary restoration: owned domain, ideal stacked marks, and standard macron convention.</p>';
                html += '</div>';
            }
            if (scholarly.length > 0) {
                html += '<div class="result-variations-section">';
                html += '<span class="result-variations-label">Scholarly Variants</span>';
                html += '<div class="variations-list">';
                for (const v of scholarly) {
                    html += renderVariationItem(v, true);
                }
                html += '</div>';
                html += '<p class="result-variations-hint">Attested alternate spellings. Each chip is backed by the cited source(s).</p>';
                html += '</div>';
            }

            resultVariations.innerHTML = html;
            resultVariations.classList.toggle('hidden', html === '');

            resultVariations.querySelectorAll('.variation-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const text = btn.dataset.unicode;
                    const label = btn.querySelector('.variation-unicode')?.textContent || text;
                    copyText(text, label);
                });
            });
        } else if (resultVariations) {
            resultVariations.classList.add('hidden');
        }

        resultDomain.textContent = entry.domain;
        resultMeaning.textContent = entry.meaning;
        if (resultEtymology && resultEtymologyRow) {
            if (entry.etymology && entry.etymology.protoForm) {
                const protoLabel = {
                    'proto-indo-european': 'PIE',
                    'proto-afro-asiatic': 'Afro-Asiatic',
                    'proto-polynesian': 'Proto-Polynesian',
                    'proto-uto-aztecan': 'Proto-Uto-Aztecan',
                    'proto-sino-tibetan': 'Proto-Sino-Tibetan',
                    'proto-mayan': 'Proto-Mayan',
                    'isolate': 'Isolate',
                    'unknown': 'Unknown'
                }[entry.etymology.protoLanguage] || entry.etymology.protoLanguage;
                resultEtymology.innerHTML = `<span class="etymology-form">${escapeHtml(entry.etymology.protoForm)}</span> <span class="etymology-lang">${escapeHtml(protoLabel)}</span>`;
                resultEtymologyRow.classList.remove('hidden');
            } else {
                resultEtymologyRow.classList.add('hidden');
            }
        }
        resultTier.textContent = entry.tierLabel;
        resultTier.className = `result-tier tier-${entry.tier}`;

        if (resultSources) {
            resultSources.innerHTML = entry.sources.map(src =>
                `<span class="source-badge">${escapeHtml(src)}</span>`
            ).join('');
        }

        if (resultLore) {
            resultLore.classList.add('hidden');
            loadLoreCatalog().then(() => renderLore(entry));
        }

        resultEl.classList.remove('hidden');
        resultEl.classList.remove('reveal');
        void resultEl.offsetWidth; // force reflow for re-trigger
        resultEl.classList.add('reveal');

        copyBtn.textContent = 'Copy Unicode';
        updateMeta(entry);
    }

    function updateAll() {
        renderPreview();
        renderSuggestions();
        renderCompletions();
        renderStatus();
        renderBreakdown();
        renderResult();
        writeUrlState();
    }

    function scheduleUpdate() {
        if (debounceTimer) cancelAnimationFrame(debounceTimer);
        debounceTimer = requestAnimationFrame(() => {
            updateAll();
            debounceTimer = null;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════

    inputField.addEventListener('input', (e) => {
        if (isComposing) return;

        const val = e.target.value;
        const cleaned = val.replace(/[^a-zA-Z]/g, '');
        if (val !== cleaned) {
            inputField.value = cleaned;
        }
        currentInput = cleaned;
        selectedEntry = null;
        scheduleUpdate();
    });

    // IME composition events
    inputField.addEventListener('compositionstart', () => { isComposing = true; });
    inputField.addEventListener('compositionend', (e) => {
        isComposing = false;
        const val = e.target.value;
        const cleaned = val.replace(/[^a-zA-Z]/g, '');
        inputField.value = cleaned;
        currentInput = cleaned;
        selectedEntry = null;
        scheduleUpdate();
    });

    inputField.addEventListener('keydown', (e) => {
        if (isComposing) return;

        const items = completionsEl.querySelectorAll('.completion-item');

        // Arrow navigation through completions
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            const next = activeCompletionIndex + 1;
            setActiveCompletion(next >= items.length ? 0 : next);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            const prev = activeCompletionIndex - 1;
            setActiveCompletion(prev < 0 ? items.length - 1 : prev);
            return;
        }

        // Enter: select active completion or confirm exact match
        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeCompletionIndex >= 0 && items[activeCompletionIndex]) {
                const id = items[activeCompletionIndex].dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) {
                    currentInput = entry.ascii;
                    selectedEntry = entry;
                    updateAll();
                }
            } else {
                const entry = findExactMatch(currentInput);
                if (entry) {
                    selectedEntry = entry;
                    copyUnicode();
                    inputField.classList.add('success-flash');
                    setTimeout(() => inputField.classList.remove('success-flash'), 400);
                }
            }
            return;
        }

        if (e.key === 'Escape') {
            if (activeCompletionIndex >= 0) {
                setActiveCompletion(-1);
            } else {
                clearAll();
            }
            return;
        }

        // Block invalid keystrokes in real time
        if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;

        const char = e.key.toLowerCase();
        if (!/^[a-z]$/.test(char)) return;

        const start = inputField.selectionStart;
        const end = inputField.selectionEnd;
        const before = currentInput.slice(0, start);
        const after = currentInput.slice(end);
        const prospective = (before + char + after).toLowerCase();

        const completions = getCompletions(prospective, 1);
        if (completions.length === 0) {
            e.preventDefault();
            inputField.classList.add('reject-flash');
            setTimeout(() => inputField.classList.remove('reject-flash'), 250);

            // Haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate(CONFIG.hapticMs);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // CONTROLS
    // ═══════════════════════════════════════════════════════════

    function clearAll() {
        currentInput = '';
        selectedEntry = null;
        inputField.value = '';
        activeCompletionIndex = -1;
        inputField.focus();
        scheduleUpdate();
    }

    async function copyText(text, label = text) {
        if (window.PX && window.PX.copyToClipboard) {
            window.PX.copyToClipboard(text);
            if (window.PX.showToast) {
                window.PX.showToast(`Copied: ${label}`);
            }
            return true;
        }

        let copied = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch (err) {
                // Fall through to fallback
            }
        }

        if (!copied) {
            // Fallback: select and copy
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                copied = document.execCommand('copy');
            } catch (e) { /* ignore */ }
            document.body.removeChild(ta);
        }

        return copied;
    }

    async function copyUnicode() {
        const entry = selectedEntry || findExactMatch(currentInput);
        if (!entry) return;

        const text = nfc(entry.unicode);
        const copied = await copyText(text, text);

        if (copied) {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy Unicode', 1500);
            if (liveRegion) liveRegion.textContent = `Copied ${text} to clipboard`;
        } else {
            copyBtn.textContent = 'Copy Failed';
            setTimeout(() => copyBtn.textContent = 'Copy Unicode', 1500);
            if (liveRegion) liveRegion.textContent = `Copy failed`;
        }
    }

    clearBtn.addEventListener('click', clearAll);
    copyBtn.addEventListener('click', copyUnicode);

    if (pantheonFilter) {
        pantheonFilter.addEventListener('change', (e) => {
            activePantheon = e.target.value;
            writeUrlState();
            scheduleUpdate();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // UTILS
    // ═══════════════════════════════════════════════════════════

    function renderVariationItem(v, showSources) {
        const title = `${v.note}${v.sources && v.sources.length ? ' — Sources: ' + v.sources.join(', ') : ''}`;
        let html = `<div class="variation-item">`;
        html += `<button type="button" class="variation-chip variation-${v.type}" data-unicode="${escapeHtml(v.unicode)}" title="${escapeHtml(title)}">`;
        html += `<span class="variation-unicode">${escapeHtml(nfc(v.unicode))}</span>`;
        html += `<span class="variation-type">${escapeHtml(v.type)}</span>`;
        html += `</button>`;
        if (showSources && v.sources && v.sources.length) {
            html += `<span class="variation-sources">${v.sources.map(s => `<span class="variation-source">${escapeHtml(s)}</span>`).join('')}</span>`;
        }
        html += `</div>`;
        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════

    readUrlState();
    updateAll();
    inputField.focus();

})();
