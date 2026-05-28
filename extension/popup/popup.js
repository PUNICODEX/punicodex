/**
 * PÚNYCODEX Type — Extension Popup
 */

(function() {
    'use strict';

    const engine = PUNYCODEX_ENGINE;
    const trie = engine.buildTrie(LEXICON);

    // DOM refs
    const inputField = document.getElementById('type-input');
    const previewEl = document.getElementById('type-preview');
    const suggestionsEl = document.getElementById('popup-suggestions');
    const completionsEl = document.getElementById('popup-completions');
    const resultEl = document.getElementById('popup-result');
    const resultUnicode = document.getElementById('result-unicode');
    const resultGreek = document.getElementById('result-greek');
    const resultDomain = document.getElementById('result-domain');
    const resultMeaning = document.getElementById('result-meaning');
    const resultSources = document.getElementById('result-sources');
    const copyBtn = document.getElementById('copy-btn');
    const statusText = document.getElementById('status-text');
    const pantheonFilter = document.getElementById('pantheon-filter');

    // State
    let currentInput = '';
    let activePantheon = 'all';
    let activeCompletionIndex = -1;
    let debounceTimer = null;

    function nfc(str) { return engine.nfc(str); }
    function esc(text) { return engine.escapeHtml(text); }

    function getCompletions(prefix, limit) {
        return engine.getCompletions(trie, prefix, { limit, pantheonFilter: activePantheon });
    }

    function getValidNextChars(prefix) {
        return engine.getValidNextChars(trie, prefix, { pantheonFilter: activePantheon });
    }

    function findExactMatch(input) {
        return engine.findExactMatch(trie, input, { pantheonFilter: activePantheon });
    }

    // Renderers
    function renderPreview() {
        if (!currentInput) {
            previewEl.innerHTML = '';
            inputField.classList.remove('preview-active');
            return;
        }
        const entry = findExactMatch(currentInput);
        if (entry) {
            previewEl.innerHTML = `<span class="preview-convert">${esc(nfc(entry.unicode))}</span>`;
            inputField.classList.add('preview-active');
        } else {
            inputField.classList.remove('preview-active');
            const completions = getCompletions(currentInput, 1);
            if (completions.length > 0) {
                const first = completions[0];
                const remaining = first.ascii.slice(currentInput.length);
                previewEl.innerHTML = `<span class="preview-typed">${esc(currentInput)}</span><span class="preview-hint">${esc(remaining)}</span>`;
            } else {
                previewEl.innerHTML = '';
            }
        }
    }

    function renderSuggestions() {
        const chars = getValidNextChars(currentInput);
        if (chars.length === 0 || !currentInput) {
            suggestionsEl.innerHTML = '';
            return;
        }
        suggestionsEl.innerHTML = chars.map(c =>
            `<span class="suggestion-char">${c.toUpperCase()}</span>`
        ).join('');
    }

    function renderCompletions() {
        const completions = getCompletions(currentInput, engine.CONFIG.maxCompletions);
        activeCompletionIndex = -1;

        if (completions.length === 0 || !currentInput) {
            completionsEl.innerHTML = '';
            return;
        }

        completionsEl.innerHTML = completions.map((entry, i) => {
            const matchIndex = entry.ascii.toLowerCase().indexOf(currentInput.toLowerCase());
            const before = entry.ascii.slice(0, matchIndex + currentInput.length);
            const after = entry.ascii.slice(matchIndex + currentInput.length);
            const emoji = engine.getPantheonEmoji(entry.pantheon);
            return `
                <div class="completion-item" data-id="${entry.id}" id="completion-${i}">
                    <span class="completion-pantheon">${emoji}</span>
                    <span class="completion-name">
                        <span class="completion-typed">${esc(before)}</span><span class="completion-remaining">${esc(after)}</span>
                    </span>
                    <span class="completion-unicode">${esc(nfc(entry.unicode))}</span>
                </div>
            `;
        }).join('');

        completionsEl.querySelectorAll('.completion-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) {
                    currentInput = entry.ascii;
                    inputField.value = entry.ascii;
                    updateAll();
                }
            });
        });
    }

    function setActiveCompletion(index) {
        const items = completionsEl.querySelectorAll('.completion-item');
        items.forEach((item, i) => item.classList.toggle('active', i === index));
        activeCompletionIndex = index;
    }

    function renderResult() {
        const entry = findExactMatch(currentInput);
        if (!entry) {
            resultEl.classList.add('hidden');
            return;
        }
        resultUnicode.textContent = nfc(entry.unicode);
        if (entry.greek && entry.greek !== '—') {
            resultGreek.textContent = entry.greek;
            resultGreek.style.display = '';
        } else {
            resultGreek.style.display = 'none';
        }
        resultDomain.textContent = entry.domain;
        resultMeaning.textContent = entry.meaning;
        resultSources.innerHTML = entry.sources.map(src =>
            `<span class="source-badge">${esc(src)}</span>`
        ).join('');
        resultEl.classList.remove('hidden');
        resultEl.classList.remove('reveal');
        void resultEl.offsetWidth;
        resultEl.classList.add('reveal');
    }

    function renderStatus() {
        const entry = findExactMatch(currentInput);
        if (entry) {
            statusText.textContent = '✓ Press Enter to copy';
            statusText.style.color = 'var(--green)';
        } else if (currentInput) {
            const completions = getCompletions(currentInput);
            if (completions.length > 0) {
                statusText.textContent = `${completions.length} possible`;
                statusText.style.color = 'var(--text-dim)';
            } else {
                statusText.textContent = 'No valid transliteration';
                statusText.style.color = 'var(--ember)';
            }
        } else {
            statusText.textContent = 'Type a name to begin restoration...';
            statusText.style.color = 'var(--text-dim)';
        }
    }

    function updateAll() {
        renderPreview();
        renderSuggestions();
        renderCompletions();
        renderResult();
        renderStatus();
    }

    function scheduleUpdate() {
        if (debounceTimer) cancelAnimationFrame(debounceTimer);
        debounceTimer = requestAnimationFrame(() => {
            updateAll();
            debounceTimer = null;
        });
    }

    // Events
    inputField.addEventListener('input', (e) => {
        const val = e.target.value;
        const cleaned = val.replace(/[^a-zA-Z]/g, '');
        if (val !== cleaned) inputField.value = cleaned;
        currentInput = cleaned;
        scheduleUpdate();
    });

    inputField.addEventListener('keydown', (e) => {
        if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) {
            const items = completionsEl.querySelectorAll('.completion-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveCompletion((activeCompletionIndex + 1) % items.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveCompletion((activeCompletionIndex - 1 + items.length) % items.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const items = completionsEl.querySelectorAll('.completion-item');
                if (activeCompletionIndex >= 0 && items[activeCompletionIndex]) {
                    items[activeCompletionIndex].click();
                } else {
                    const entry = findExactMatch(currentInput);
                    if (entry) copyUnicode();
                }
                return;
            }
            if (e.key === 'Escape') {
                currentInput = '';
                inputField.value = '';
                scheduleUpdate();
                return;
            }
            return;
        }
        const char = e.key.toLowerCase();
        if (!/^[a-z]$/.test(char)) return;
        const prospective = currentInput + char;
        const comps = getCompletions(prospective, 1);
        if (comps.length === 0) {
            e.preventDefault();
            inputField.classList.add('reject-flash');
            setTimeout(() => inputField.classList.remove('reject-flash'), 250);
        }
    });

    async function copyUnicode() {
        const entry = findExactMatch(currentInput);
        if (!entry) return;
        try {
            await navigator.clipboard.writeText(nfc(entry.unicode));
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy Unicode', 1500);
        } catch (err) {
            // Fallback for extension context
            chrome.runtime.sendMessage({
                action: 'copyToClipboard',
                text: nfc(entry.unicode)
            }, (response) => {
                if (response && response.success) {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = 'Copy Unicode', 1500);
                }
            });
        }
    }

    copyBtn.addEventListener('click', copyUnicode);

    pantheonFilter.addEventListener('change', (e) => {
        activePantheon = e.target.value;
        scheduleUpdate();
    });

    // Init
    inputField.focus();
    updateAll();
})();
