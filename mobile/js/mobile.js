/**
 * PÚNYCODEX Type — Mobile PWA
 * Touch-optimized typing interface.
 */

(function() {
    'use strict';

    const engine = PUNYCODEX_ENGINE;
    const trie = engine.buildTrie(LEXICON);

    // DOM
    const input = document.getElementById('type-input');
    const clearBtn = document.getElementById('input-clear');
    const previewEl = document.getElementById('type-preview');
    const suggestionsRow = document.getElementById('suggestions-row');
    const resultCard = document.getElementById('result-card');
    const resultUnicode = document.getElementById('result-unicode');
    const resultGreek = document.getElementById('result-greek');
    const resultDomain = document.getElementById('result-domain');
    const resultMeaning = document.getElementById('result-meaning');
    const resultSources = document.getElementById('result-sources');
    const copyBtn = document.getElementById('copy-btn');
    const completionsList = document.getElementById('completions-list');
    const toast = document.getElementById('toast');
    const pills = document.querySelectorAll('.pill');
    const installBanner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');
    const installDismiss = document.getElementById('install-dismiss');

    // State
    let currentInput = '';
    let activePantheon = 'all';
    let activeCompletionIndex = -1;
    let toastTimer = null;

    function nfc(str) { return engine.nfc(str); }
    function esc(text) { return engine.escapeHtml(text); }

    function vibrate(ms = 10) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

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
            input.classList.remove('preview-active');
            return;
        }
        const entry = findExactMatch(currentInput);
        if (entry) {
            previewEl.innerHTML = `<span class="preview-convert">${esc(nfc(entry.unicode))}</span>`;
            input.classList.add('preview-active');
        } else {
            input.classList.remove('preview-active');
            const comps = getCompletions(currentInput, 1);
            if (comps.length > 0) {
                const remaining = comps[0].ascii.slice(currentInput.length);
                previewEl.innerHTML = `<span class="preview-typed">${esc(currentInput)}</span><span class="preview-hint">${esc(remaining)}</span>`;
            } else {
                previewEl.innerHTML = '';
            }
        }
    }

    function renderSuggestions() {
        const chars = getValidNextChars(currentInput);
        if (chars.length === 0 || !currentInput) {
            suggestionsRow.innerHTML = '';
            return;
        }
        suggestionsRow.innerHTML = chars.slice(0, 8).map(c =>
            `<span class="suggestion-chip">${c.toUpperCase()}</span>`
        ).join('');
    }

    function renderCompletions() {
        const completions = getCompletions(currentInput, 5);
        activeCompletionIndex = -1;

        if (completions.length === 0 || !currentInput) {
            completionsList.innerHTML = '';
            return;
        }

        completionsList.innerHTML = completions.map((entry, i) => {
            const matchIndex = entry.ascii.toLowerCase().indexOf(currentInput.toLowerCase());
            const before = entry.ascii.slice(0, matchIndex + currentInput.length);
            const after = entry.ascii.slice(matchIndex + currentInput.length);
            const emoji = engine.getPantheonEmoji(entry.pantheon);
            return `
                <div class="completion-item" data-id="${entry.id}" data-index="${i}">
                    <span class="completion-emoji">${emoji}</span>
                    <span class="completion-name">
                        <span class="completion-typed">${esc(before)}</span><span class="completion-remaining">${esc(after)}</span>
                    </span>
                    <span class="completion-unicode">${esc(nfc(entry.unicode))}</span>
                </div>
            `;
        }).join('');

        completionsList.querySelectorAll('.completion-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) {
                    currentInput = entry.ascii;
                    input.value = entry.ascii;
                    updateAll();
                    input.focus();
                }
            });
        });
    }

    function renderResult() {
        const entry = findExactMatch(currentInput);
        if (!entry) {
            resultCard.classList.add('hidden');
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
        resultCard.classList.remove('hidden');
    }

    function updateAll() {
        renderPreview();
        renderSuggestions();
        renderCompletions();
        renderResult();
    }

    // Input handling
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        const cleaned = val.replace(/[^a-zA-Z]/g, '');
        if (val !== cleaned) input.value = cleaned;
        currentInput = cleaned;
        updateAll();
    });

    // Keystroke blocking
    input.addEventListener('keydown', (e) => {
        if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const char = e.key.toLowerCase();
        if (!/^[a-z]$/.test(char)) return;
        const prospective = currentInput + char;
        const comps = getCompletions(prospective, 1);
        if (comps.length === 0) {
            e.preventDefault();
            vibrate(15);
            input.style.borderColor = 'var(--ember)';
            setTimeout(() => { input.style.borderColor = ''; }, 200);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        currentInput = '';
        input.value = '';
        updateAll();
        input.focus();
        vibrate(5);
    });

    // Pantheon pills
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activePantheon = pill.dataset.value;
            updateAll();
            vibrate(5);
        });
    });

    // Copy
    copyBtn.addEventListener('click', async () => {
        const entry = findExactMatch(currentInput);
        if (!entry) return;
        try {
            await navigator.clipboard.writeText(nfc(entry.unicode));
            vibrate(20);
            showToast(`Copied ${nfc(entry.unicode)}`);
            copyBtn.querySelector('.copy-label').textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.querySelector('.copy-label').textContent = 'Copy Unicode';
            }, 1500);
        } catch (err) {
            showToast('Copy failed');
        }
    });

    // Swipe to clear (touch)
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (dy > 120 && currentInput && e.changedTouches[0].clientX < window.innerWidth * 0.3) {
            // Swipe down on left side clears
            clearBtn.click();
        }
    }, { passive: true });

    // Install prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            installBanner.classList.remove('hidden');
        }
    });

    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt = null;
        }
        installBanner.classList.add('hidden');
    });

    installDismiss.addEventListener('click', () => {
        installBanner.classList.add('hidden');
    });

    // Focus on load
    input.focus();
    updateAll();
})();
