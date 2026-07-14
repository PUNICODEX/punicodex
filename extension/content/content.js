/**
 * PÚNYCODEX Type — Content Script
 * Injects inline autocomplete into standard input fields across the web.
 */

(function() {
    'use strict';

    const engine = PUNYCODEX_ENGINE;
    const trie = engine.buildTrie(LEXICON);

    // Settings
    let settings = { enabled: true, pantheonFilter: 'all', inlineMode: true, showPreview: true, siteMode: 'all', siteList: [] };
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response) settings = { ...settings, ...response };
    });

    // Domain matching
    function getCurrentDomain() {
        return window.location.hostname.toLowerCase();
    }

    function domainMatches(pattern, domain) {
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(2);
            return domain === suffix || domain.endsWith('.' + suffix);
        }
        return domain === pattern;
    }

    function isAllowedOnDomain() {
        if (settings.siteMode === 'all') return true;
        const domain = getCurrentDomain();
        const list = settings.siteList || [];
        const matches = list.some(pattern => domainMatches(pattern, domain));
        if (settings.siteMode === 'allowlist') return matches;
        if (settings.siteMode === 'blocklist') return !matches;
        return true;
    }

    // State
    let activeInput = null;
    let dropdown = null;
    let currentWord = '';
    let activeIndex = -1;
    let isDropdownVisible = false;

    // Create dropdown element
    function createDropdown() {
        const el = document.createElement('div');
        el.id = 'punycodex-dropdown';
        el.className = 'punycodex-dropdown';
        el.setAttribute('role', 'listbox');
        el.style.display = 'none';
        document.body.appendChild(el);
        return el;
    }

    dropdown = createDropdown();

    function getCompletions(prefix) {
        return engine.getCompletions(trie, prefix, {
            limit: 5,
            pantheonFilter: settings.pantheonFilter
        });
    }

    function findExactMatch(input) {
        return engine.findExactMatch(trie, input, { pantheonFilter: settings.pantheonFilter });
    }

    function getWordBeforeCursor(input) {
        const val = input.value || '';
        const selStart = input.selectionStart || 0;
        const beforeCursor = val.slice(0, selStart);
        // Find the word being typed (last contiguous a-z sequence)
        const match = beforeCursor.match(/[a-zA-Z]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    function replaceWordAtCursor(input, newText) {
        const val = input.value || '';
        const selStart = input.selectionStart || 0;
        const beforeCursor = val.slice(0, selStart);
        const afterCursor = val.slice(selStart);
        const match = beforeCursor.match(/[a-zA-Z]+$/);
        if (!match) return;
        const wordStart = selStart - match[0].length;
        input.value = val.slice(0, wordStart) + newText + afterCursor;
        const newCursor = wordStart + newText.length;
        input.setSelectionRange(newCursor, newCursor);
    }

    function positionDropdown(input) {
        const rect = input.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;
        dropdown.style.top = (rect.bottom + scrollY + 4) + 'px';
        dropdown.style.left = (rect.left + scrollX) + 'px';
        dropdown.style.minWidth = Math.max(rect.width, 200) + 'px';
    }

    function showDropdown(completions) {
        if (completions.length === 0 || !settings.showPreview) {
            hideDropdown();
            return;
        }
        dropdown.innerHTML = completions.map((entry, i) => {
            const emoji = engine.getPantheonEmoji(entry.pantheon);
            return `
                <div class="punycodex-item" data-index="${i}" data-id="${entry.id}" role="option" aria-selected="false">
                    <span class="punycodex-emoji">${emoji}</span>
                    <span class="punycodex-name">${engine.escapeHtml(entry.ascii)}</span>
                    <span class="punycodex-arrow">→</span>
                    <span class="punycodex-unicode">${engine.escapeHtml(engine.nfc(entry.unicode))}</span>
                </div>
            `;
        }).join('');

        dropdown.querySelectorAll('.punycodex-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry && activeInput) {
                    replaceWordAtCursor(activeInput, engine.nfc(entry.unicode));
                    hideDropdown();
                    activeInput.focus();
                }
            });
        });

        if (activeInput) positionDropdown(activeInput);
        dropdown.style.display = 'block';
        isDropdownVisible = true;
        activeIndex = -1;
    }

    function hideDropdown() {
        dropdown.style.display = 'none';
        isDropdownVisible = false;
        activeIndex = -1;
    }

    function setActiveItem(index) {
        const items = dropdown.querySelectorAll('.punycodex-item');
        items.forEach((item, i) => {
            const isActive = i === index;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        activeIndex = index;
    }

    function handleInput(e) {
        if (!settings.enabled || !settings.inlineMode || !isAllowedOnDomain()) return;
        const input = e.target;
        if (!isTextInput(input)) return;

        activeInput = input;
        currentWord = getWordBeforeCursor(input);

        if (currentWord.length < 2) {
            hideDropdown();
            return;
        }

        const completions = getCompletions(currentWord);
        showDropdown(completions);
    }

    function handleKeydown(e) {
        if (!isDropdownVisible) return;
        const items = dropdown.querySelectorAll('.punycodex-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setActiveItem((activeIndex + 1) % items.length);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setActiveItem((activeIndex - 1 + items.length) % items.length);
            return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
            if (activeIndex >= 0 && items[activeIndex]) {
                e.preventDefault();
                e.stopPropagation();
                items[activeIndex].click();
                return;
            }
            // If only one exact match and word is complete, auto-transform
            const entry = findExactMatch(currentWord);
            if (entry && activeInput) {
                e.preventDefault();
                e.stopPropagation();
                replaceWordAtCursor(activeInput, engine.nfc(entry.unicode));
                hideDropdown();
            }
            return;
        }
        if (e.key === 'Escape') {
            hideDropdown();
            return;
        }
    }

    function isTextInput(el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input') {
            const type = el.type || 'text';
            // Never observe password fields or other sensitive input types.
            if (type === 'password') return false;
            return ['text', 'search', 'url', 'email'].includes(type);
        }
        if (tag === 'textarea') return true;
        return false;
    }

    // Attach listeners
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('focusin', (e) => {
        if (isTextInput(e.target)) {
            activeInput = e.target;
        }
    }, true);
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    // Hide on scroll
    window.addEventListener('scroll', hideDropdown, { passive: true });
    window.addEventListener('resize', hideDropdown);

    // Authenticity warning banner for suspicious current-page domains
    async function checkPageAuthenticity() {
        try {
            if (settings.authenticityWarnings === false) return;
            const apiUrl = `https://punycodex.com/api/v2/authenticity/check/?input=${encodeURIComponent(window.location.href)}&type=url`;
            const res = await fetch(apiUrl, { cache: 'no-store' });
            if (!res.ok) return;
            const payload = await res.json();
            const data = payload && payload.data ? payload.data : payload;
            if (!data || !data.severity) return;
            if (data.severity !== 'high' && data.severity !== 'critical') return;

            const banner = document.createElement('div');
            banner.id = 'punycodex-authenticity-warning';
            banner.textContent = `PÚNYCODEX warning: ${data.label || data.verdict} — ${data.reason || ''}`;
            document.body.appendChild(banner);
        } catch (_e) {
            // Network or CORS issues are expected on some pages; fail silently.
        }
    }

    checkPageAuthenticity();

    console.log('PÚNYCODEX Type content script loaded.');
})();
