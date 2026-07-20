/**
 * PuniCodex Type — Mobile PWA v2
 * Three modes: Type | Compose | History
 * Detail modal for rich entry exploration.
 * Robust clipboard with HTTP fallback.
 */

(function() {
    'use strict';

    const engine = PUNICODEX_ENGINE;
    const trie = engine.buildTrie(LEXICON);
    const API_BASE = '';

    // Pantheon accent colors
    const PANTHEON_COLORS = {
        greek: '#c9a96e', norse: '#87aee8', egyptian: '#e8c97e',
        sanskrit: '#c97ec9', celtic: '#7ec98a', mesopotamian: '#c9a07e',
        polynesian: '#7ec9c9', japanese: '#e87e7e', nahuatl: '#9ec97e',
        yoruba: '#c97e9e', slavic: '#c97e7e', zoroastrian: '#e8c07e',
        incan: '#c9c97e', chinese: '#e87e7e', buddhist: '#c9a0c9',
        taoist: '#7ec9a0', korean: '#c97e7e', phoenician: '#c9a07e',
        hittite: '#a0c9c9', 'greek-location': '#c9a96e', canaanite: '#8B4513'
    };

    // ═══════════════════════════════════════════════
    //  DOM
    // ═══════════════════════════════════════════════

    const navBtns = document.querySelectorAll('.nav-btn');
    const modePanels = document.querySelectorAll('.mode-panel');

    // Type
    const typeInput = document.getElementById('type-input');
    const typeClearBtn = document.getElementById('input-clear');
    const typePreview = document.getElementById('type-preview');
    const suggestionsRow = document.getElementById('suggestions-row');
    const resultCard = document.getElementById('result-card');
    const resultUnicode = document.getElementById('result-unicode');
    const resultGreek = document.getElementById('result-greek');
    const resultDomain = document.getElementById('result-domain');
    const resultMeaning = document.getElementById('result-meaning');
    const resultVariants = document.getElementById('result-variants');
    const resultSources = document.getElementById('result-sources');
    const resultDomainStatus = document.getElementById('result-domain-status');
    const resultLore = document.getElementById('result-lore');
    const copyBtn = document.getElementById('copy-btn');
    const starBtn = document.getElementById('star-btn');
    const shareTypeBtn = document.getElementById('share-type-btn');
    const completionsList = document.getElementById('completions-list');
    const pills = document.querySelectorAll('#pantheon-pills .pill');

    // Compose
    const composeTextarea = document.getElementById('compose-textarea');
    const composeClearBtn = document.getElementById('compose-clear');
    const suggestionRibbon = document.getElementById('suggestion-ribbon');
    const ribbonChips = document.getElementById('ribbon-chips');
    const composePreview = document.getElementById('compose-preview');
    const previewText = document.getElementById('preview-text');
    const previewCount = document.getElementById('preview-count');
    const composeCopyBtn = document.getElementById('compose-copy');
    const composeShareBtn = document.getElementById('compose-share');
    const composeLog = document.getElementById('compose-log');
    const logList = document.getElementById('log-list');

    // Directory
    const dirSearch = document.getElementById('dir-search');
    const dirSearchClear = document.getElementById('dir-search-clear');
    const dirPills = document.querySelectorAll('#dir-pills .pill');
    const dirGrid = document.getElementById('dir-grid');
    const dirCount = document.getElementById('dir-count');

    // Saved
    const statTotal = document.getElementById('stat-total');
    const statStreak = document.getElementById('stat-streak');
    const statFavorite = document.getElementById('stat-favorite');
    const statUnique = document.getElementById('stat-unique');
    const favoritesCount = document.getElementById('favorites-count');
    const favoritesList = document.getElementById('favorites-list');
    const recentList = document.getElementById('recent-list');
    const clearRecentBtn = document.getElementById('clear-recent');

    // Keyboard Panel
    const kbdStatusBanner = document.getElementById('keyboard-status-banner');
    const kbdStatusIcon = document.getElementById('kbd-status-icon');
    const kbdStatusText = document.getElementById('kbd-status-text');
    const kbdSettingsBtn = document.getElementById('kbd-settings-btn');
    const kbdSwitchBtn = document.getElementById('kbd-switch-btn');
    const nativeTotalEl = document.getElementById('native-total');
    const nativeFavoriteEl = document.getElementById('native-favorite');

    // Onboarding
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    const onboardingSlides = document.querySelectorAll('.onboarding-slide');
    const onboardingDots = document.querySelectorAll('.dot');
    const onboardingSkip = document.getElementById('onboarding-skip');
    const onboardingCta = document.getElementById('onboarding-cta');
    const headerHelp = document.getElementById('header-help');

    // Detail Modal
    const detailModal = document.getElementById('detail-modal');
    const detailModalBackdrop = document.getElementById('detail-modal-backdrop');
    const detailModalContent = document.getElementById('detail-modal-content');

    // Shared
    const toast = document.getElementById('toast');
    const installBanner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');
    const installDismiss = document.getElementById('install-dismiss');

    // ═══════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════

    let currentMode = 'type';
    let currentInput = '';
    let activePantheon = 'all';
    let toastTimer = null;
    let currentTypeEntry = null;
    let composeConversions = new Map();
    let composeSessionLog = [];
    let modalOpen = false;
    let activeDirCategory = 'all';
    let dirQuery = '';

    // Performance: debounce timers
    let typeDebounceTimer = null;
    let composeDebounceTimer = null;

    // Performance: domain status cache
    const domainCache = new Map();

    // Lore catalog
    let loreCatalog = null;
    let loreCatalogPromise = null;

    // Performance: directory virtualization
    let dirObserver = null;
    let dirVirtualItems = [];

    const STORAGE_KEYS = {
        recent: 'punicodex_recent',
        favorites: 'punicodex_favorites',
        stats: 'punicodex_stats'
    };

    // ═══════════════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════════════

    function nfc(str) { return engine.nfc(str); }
    function esc(text) { return engine.escapeHtml(text); }

    function vibrate(ms = 10) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    function loadLoreCatalog() {
        if (loreCatalog) return Promise.resolve(loreCatalog);
        if (loreCatalogPromise) return loreCatalogPromise;
        loreCatalogPromise = fetch('shared/lore-catalog.json')
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

    function showToast(msg, type = 'default') {
        const icons = { default: '✦', success: '✓', error: '✕', info: 'ℹ' };
        toast.className = 'toast' + (type !== 'default' ? ' toast-' + type : '');
        toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${esc(msg)}</span>`;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // ═══════════════════════════════════════════════
    //  AMBIENT BACKGROUND — Gold Particle Dust
    // ═══════════════════════════════════════════════

    function initAmbientCanvas() {
        const canvas = document.getElementById('ambient-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animId = null;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        const PARTICLE_COUNT = 40;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.5,
                dx: (Math.random() - 0.5) * 0.15,
                dy: (Math.random() - 0.5) * 0.15 - 0.05,
                alpha: Math.random() * 0.3 + 0.1,
                pulse: Math.random() * Math.PI * 2
            });
        }

        function frame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.pulse += 0.02;
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${a})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(frame);
        }
        frame();

        // Pause when tab hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) cancelAnimationFrame(animId);
            else frame();
        });
    }

    // Robust clipboard — works on HTTP (non-secure context)
    async function copyToClipboard(text) {
        // Try modern API first (only works on HTTPS/localhost)
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {}

        // Fallback: hidden textarea + execCommand
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        try {
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch {
            document.body.removeChild(ta);
            return false;
        }
    }

    async function shareText(text, title) {
        const shareData = { title: title || 'PuniCodex', text };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return true;
            }
        } catch { return false; }
        return false;
    }

    function getStorage(key, fallback) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
        catch { return fallback; }
    }
    function setStorage(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    function getRecent() { return getStorage(STORAGE_KEYS.recent, []); }
    function getFavorites() { return getStorage(STORAGE_KEYS.favorites, []); }
    function getStats() {
        return getStorage(STORAGE_KEYS.stats, { total: 0, byPantheon: {}, byDay: {}, unique: [] });
    }

    function addToHistory(entry) {
        const recent = getRecent();
        const item = {
            id: entry.id, ascii: entry.ascii, unicode: entry.unicode,
            pantheon: entry.pantheon, timestamp: Date.now()
        };
        const filtered = recent.filter(r => r.id !== entry.id);
        filtered.unshift(item);
        setStorage(STORAGE_KEYS.recent, filtered.slice(0, 50));

        const stats = getStats();
        stats.total = (stats.total || 0) + 1;
        stats.byPantheon[entry.pantheon] = (stats.byPantheon[entry.pantheon] || 0) + 1;
        const today = new Date().toISOString().slice(0, 10);
        stats.byDay[today] = (stats.byDay[today] || 0) + 1;
        if (!stats.unique.includes(entry.id)) stats.unique.push(entry.id);
        setStorage(STORAGE_KEYS.stats, stats);
    }

    function toggleFavorite(entry) {
        const favorites = getFavorites();
        const idx = favorites.findIndex(f => f.id === entry.id);
        if (idx >= 0) {
            favorites.splice(idx, 1);
            showToast(`Removed ${nfc(entry.unicode)}`);
            return false;
        }
        favorites.unshift({
            id: entry.id, ascii: entry.ascii, unicode: entry.unicode,
            pantheon: entry.pantheon, meaning: entry.meaning, addedAt: Date.now()
        });
        setStorage(STORAGE_KEYS.favorites, favorites.slice(0, 100));
        showToast(`⭐ Saved ${nfc(entry.unicode)}`);
        return true;
    }

    function isFavorite(entryId) {
        return getFavorites().some(f => f.id === entryId);
    }

    function computeStreak() {
        const stats = getStats();
        const days = Object.keys(stats.byDay || {}).sort().reverse();
        if (days.length === 0) return 0;
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (!days.includes(today) && !days.includes(yesterday)) return 0;
        let streak = 0;
        for (let i = 0; i < days.length; i++) {
            const d = new Date(days[i]);
            const expected = new Date(Date.now() - i * 86400000);
            if (d.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10)) streak++;
            else break;
        }
        return streak;
    }

    function getPantheonColor(pantheon) {
        return PANTHEON_COLORS[pantheon] || PANTHEON_COLORS.greek;
    }

    // ═══════════════════════════════════════════════
    //  DETAIL MODAL
    // ═══════════════════════════════════════════════

    async function openDetailModal(entry) {
        if (modalOpen) return;
        modalOpen = true;

        const color = getPantheonColor(entry.pantheon);
        const tierClass = entry.tier === 'dual' ? 'tier-dual' : entry.tier === '1' ? 'tier-1' : 'tier-2';
        const tierLabel = entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`;
        const favorited = isFavorite(entry.id);

        // Build modal content
        let html = `
            <button class="detail-close" id="detail-close" aria-label="Close">×</button>
            <div class="detail-hero">
                <div class="detail-unicode" style="color:${color}">${esc(nfc(entry.unicode))}</div>
                ${entry.greek && entry.greek !== '—' ? `<div class="detail-greek">${esc(entry.greek)}</div>` : ''}
                ${entry.meaning ? `<div class="detail-meaning">${esc(entry.meaning)}</div>` : ''}
            </div>
            <div class="detail-badges">
                <span class="detail-badge ${tierClass}">${tierLabel}</span>
                <span class="detail-badge pantheon">${engine.getPantheonEmoji(entry.pantheon)} ${esc(entry.pantheon)}</span>
            </div>
            <div class="detail-domain-card unknown" id="detail-domain-card">
                <div class="detail-domain-label">Domain Status</div>
                <div class="detail-domain-value" id="detail-domain-value">Checking...</div>
            </div>
        `;

        // Breakdown
        if (entry.breakdown && entry.breakdown.length) {
            html += `
                <div class="detail-section">
                    <div class="detail-section-title">Character Breakdown</div>
                    <div class="breakdown-chain">
                        ${entry.breakdown.map((step, i) => `
                            <div class="breakdown-step" style="animation-delay:${i * 0.06}s">
                                <span class="breakdown-step-from">${esc(step.char)}</span>
                                <span class="breakdown-step-arrow">→</span>
                                <span class="breakdown-step-to">${esc(nfc(step.to))}</span>
                                ${step.note ? `<span class="breakdown-step-note">${esc(step.note)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Variants
        const stackedForm =
            typeof PUNICODEX_ENGINE !== 'undefined' && PUNICODEX_ENGINE.deriveStackedForm
                ? PUNICODEX_ENGINE.deriveStackedForm(entry)
                : null;
        const displayVariants = [...(entry.variants || [])];
        if (stackedForm) {
            displayVariants.push({
                unicode: stackedForm,
                type: 'stacked',
                note: 'Canonical stacked form — macron and acute fused on one vowel, exactly where the Greek original marks both.',
            });
        }
        if (displayVariants.length) {
            const typeOrder = { stacked: 0, ideal: 1, 'alt-stress': 2, 'macron-only': 3, ascii: 4 };
            const sorted = [...displayVariants].sort((a, b) => {
                const oa = typeOrder[a.type] ?? 99;
                const ob = typeOrder[b.type] ?? 99;
                return oa - ob;
            });
            html += `
                <div class="detail-section">
                    <div class="detail-section-title">Name Variations</div>
                    <div class="detail-variants-grid">
                        ${sorted.map(v => {
                            const isIdeal = v.type === 'ideal';
                            const isStacked = v.type === 'stacked';
                            const badge = isStacked
                                ? '<span class="detail-variant-badge">★ Stacked</span>'
                                : isIdeal
                                  ? '<span class="detail-variant-badge">★ Ideal</span>'
                                  : '';
                            return `
                                <div class="detail-variant-card ${isIdeal || isStacked ? 'ideal' : ''}" data-variant="${esc(nfc(v.unicode))}">
                                    <span class="detail-variant-unicode">${esc(nfc(v.unicode))}</span>
                                    <span class="detail-variant-meta">
                                        ${badge}
                                        <span class="detail-variant-type">${esc(v.type || 'variant')}</span>
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Sources
        if (entry.sources && entry.sources.length) {
            html += `
                <div class="detail-section">
                    <div class="detail-section-title">Scholarly Sources</div>
                    <div class="result-sources">
                        ${entry.sources.map(src => `<span class="source-badge">${esc(src)}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        // Related entries
        const related = LEXICON.filter(e => e.pantheon === entry.pantheon && e.id !== entry.id).slice(0, 6);
        if (related.length) {
            html += `
                <div class="detail-section">
                    <div class="detail-section-title">Related in ${esc(entry.pantheon)}</div>
                    <div class="detail-related-grid">
                        ${related.map(r => `
                            <span class="detail-related-chip" data-id="${r.id}">${esc(nfc(r.unicode))}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Actions
        html += `
            <div class="detail-actions">
                <button class="action-btn primary" id="detail-copy">
                    <span class="action-icon">⎘</span>
                    <span class="action-label">Copy</span>
                </button>
                <button class="action-btn ${favorited ? 'starred' : ''}" id="detail-star">
                    <span class="action-icon">${favorited ? '★' : '☆'}</span>
                    <span class="action-label">${favorited ? 'Saved' : 'Save'}</span>
                </button>
                <button class="action-btn" id="detail-share">
                    <span class="action-icon">↗</span>
                    <span class="action-label">Share</span>
                </button>
            </div>
        `;

        detailModalContent.innerHTML = html;
        detailModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        vibrate(8);

        // Attach close handlers
        document.getElementById('detail-close').addEventListener('click', closeDetailModal);
        detailModalBackdrop.addEventListener('click', closeDetailModal);

        // Variant copy handlers
        detailModalContent.querySelectorAll('.detail-variant-card').forEach(card => {
            card.addEventListener('click', async () => {
                const text = card.dataset.variant;
                const ok = await copyToClipboard(text);
                if (ok) showToast(`Copied ${text}`);
                vibrate(10);
            });
        });

        // Related chip handlers
        detailModalContent.querySelectorAll('.detail-related-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;
                const relatedEntry = LEXICON.find(e => e.id === id);
                if (relatedEntry) {
                    closeDetailModal();
                    setTimeout(() => openDetailModal(relatedEntry), 300);
                }
            });
        });

        // Action handlers
        document.getElementById('detail-copy').addEventListener('click', async () => {
            const ok = await copyToClipboard(nfc(entry.unicode));
            if (ok) { showToast(`Copied ${nfc(entry.unicode)}`); vibrate(12); }
            else showToast('Copy failed — try selecting manually');
        });

        document.getElementById('detail-star').addEventListener('click', function() {
            const nowFav = toggleFavorite(entry);
            this.querySelector('.action-icon').textContent = nowFav ? '★' : '☆';
            this.querySelector('.action-label').textContent = nowFav ? 'Saved' : 'Save';
            this.classList.toggle('starred', nowFav);
            vibrate(10);
        });

        document.getElementById('detail-share').addEventListener('click', async () => {
            const text = nfc(entry.unicode);
            const ok = await shareText(`${text} — ${entry.meaning || entry.domain}`, text);
            if (!ok) {
                const copied = await copyToClipboard(text);
                showToast(copied ? 'Copied to clipboard' : 'Share not available');
            }
            addToHistory(entry);
        });

        // Fetch domain status (with cache)
        const domainCard = document.getElementById('detail-domain-card');
        const domainValue = document.getElementById('detail-domain-value');
        const cached = domainCache.get(entry.id);
        if (cached) {
            domainCard.classList.remove('unknown');
            domainCard.classList.add(cached.className);
            domainValue.textContent = cached.text;
        } else {
            try {
                const res = await fetch(`${API_BASE}/api/entry/${encodeURIComponent(entry.id)}`);
                const data = await res.json();
                const hasSite = data.sites && data.sites.length > 0;
                const isFlagship = hasSite && data.sites.some(s => s.is_flagship === 1 || s.isFlagship === true);
                const hasTenant = hasSite && data.sites.some(s => s.tenant_name || s.tenant);

                domainCard.classList.remove('unknown');
                let result = { className: '', text: '' };
                if (isFlagship) {
                    domainCard.classList.add('owned');
                    result = { className: 'owned', text: '🏛️ Owned & Operated' };
                } else if (hasTenant) {
                    domainCard.classList.add('owned');
                    result = { className: 'owned', text: '🔷 Leased Property' };
                } else {
                    domainCard.classList.add('available');
                    result = { className: 'available', text: '🔑 Available for Lease' };
                }
                domainValue.textContent = result.text;
                domainCache.set(entry.id, result);
            } catch {
                domainValue.textContent = 'No domain data';
            }
        }
    }

    function closeDetailModal() {
        if (!modalOpen) return;
        modalOpen = false;
        detailModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Swipe to close modal
    let modalTouchStartY = 0;
    detailModal.addEventListener('touchstart', (e) => {
        modalTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    detailModal.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - modalTouchStartY;
        if (dy > 80) closeDetailModal();
    }, { passive: true });

    // ═══════════════════════════════════════════════
    //  MODE SWITCHING
    // ═══════════════════════════════════════════════

    function setMode(mode) {
        currentMode = mode;
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        modePanels.forEach(p => p.classList.toggle('active', p.id === `panel-${mode}`));

        if (mode === 'type') setTimeout(() => typeInput.focus(), 50);
        else if (mode === 'compose') setTimeout(() => composeTextarea.focus(), 50);
        else if (mode === 'saved') renderSaved();
        else if (mode === 'directory') renderDirectory();
        else if (mode === 'keyboard') renderKeyboardPanel();
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => { vibrate(5); setMode(btn.dataset.mode); });
    });

    // ═══════════════════════════════════════════════
    //  TYPE MODE
    // ═══════════════════════════════════════════════

    function getCompletions(prefix, limit) {
        return engine.getCompletions(trie, prefix, { limit, pantheonFilter: activePantheon });
    }
    function getValidNextChars(prefix) {
        return engine.getValidNextChars(trie, prefix, { pantheonFilter: activePantheon });
    }
    function findExactMatch(input) {
        return engine.findExactMatch(trie, input, { pantheonFilter: activePantheon });
    }

    function renderTypePreview() {
        if (!currentInput) {
            typePreview.innerHTML = '';
            typeInput.classList.remove('preview-active');
            return;
        }
        const entry = findExactMatch(currentInput);
        if (entry) {
            typePreview.innerHTML = `<span class="preview-convert">${esc(nfc(entry.unicode))}</span>`;
            typeInput.classList.add('preview-active');
        } else {
            typeInput.classList.remove('preview-active');
            const comps = getCompletions(currentInput, 1);
            if (comps.length > 0) {
                const remaining = comps[0].ascii.slice(currentInput.length);
                typePreview.innerHTML = `<span class="preview-typed">${esc(currentInput)}</span><span class="preview-hint">${esc(remaining)}</span>`;
            } else {
                typePreview.innerHTML = '';
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
                <div class="completion-item" data-id="${entry.id}">
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
                if (entry) openDetailModal(entry);
            });
        });
    }

    function renderDomainBadge(status, entry) {
        if (!status) {
            resultDomainStatus.innerHTML = `<div class="domain-badge unknown">No domain data</div>`;
            return;
        }
        const hasSite = status.sites && status.sites.length > 0;
        const isFlagship = hasSite && status.sites.some(s => s.is_flagship === 1 || s.isFlagship === true);
        const hasTenant = hasSite && status.sites.some(s => s.tenant_name || s.tenant);

        if (isFlagship) {
            resultDomainStatus.innerHTML = `<div class="domain-badge owned">🏛️ Owned & Operated — ${esc(entry.domain || entry.unicode + '.com')}</div>`;
        } else if (hasTenant) {
            resultDomainStatus.innerHTML = `<div class="domain-badge owned">🔷 Leased — ${esc(entry.domain || entry.unicode + '.com')}</div>`;
        } else {
            resultDomainStatus.innerHTML = `<div class="domain-badge available">🔑 Available — ${esc(entry.domain || entry.unicode + '.com')}</div>`;
        }
    }

    function renderVariants(entry) {
        const stackedForm =
            typeof PUNICODEX_ENGINE !== 'undefined' && PUNICODEX_ENGINE.deriveStackedForm
                ? PUNICODEX_ENGINE.deriveStackedForm(entry)
                : null;
        const displayVariants = [...(entry.variants || [])];
        if (stackedForm) {
            displayVariants.push({
                unicode: stackedForm,
                type: 'stacked',
                note: 'Canonical stacked form — macron and acute fused on one vowel, exactly where the Greek original marks both.',
            });
        }
        if (displayVariants.length === 0) {
            resultVariants.innerHTML = '';
            return;
        }
        // Sort: stacked first, then ideal, alt-stress, macron-only, ascii, others
        const typeOrder = { stacked: 0, ideal: 1, 'alt-stress': 2, 'macron-only': 3, ascii: 4 };
        const sorted = [...displayVariants].sort((a, b) => {
            const oa = typeOrder[a.type] ?? 99;
            const ob = typeOrder[b.type] ?? 99;
            return oa - ob;
        });
        resultVariants.innerHTML = sorted.map(v => {
            const isIdeal = v.type === 'ideal';
            const isStacked = v.type === 'stacked';
            const badge = isStacked
                ? '<span class="variant-ideal-badge">★ Stacked</span>'
                : isIdeal
                  ? '<span class="variant-ideal-badge">★ Ideal</span>'
                  : '';
            return `
                <div class="variant-row ${isIdeal || isStacked ? 'ideal' : ''}" data-variant="${esc(nfc(v.unicode))}">
                    <span class="variant-unicode">${esc(nfc(v.unicode))}</span>
                    <span class="variant-meta">
                        ${badge}
                        <span class="variant-type">${esc(v.type || 'variant')}</span>
                    </span>
                </div>
            `;
        }).join('');

        // Copy on tap
        resultVariants.querySelectorAll('.variant-row').forEach(row => {
            row.addEventListener('click', async () => {
                const text = row.dataset.variant;
                const ok = await copyToClipboard(text);
                if (ok) showToast(`Copied ${text}`);
                vibrate(10);
            });
        });
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
            html += `<div class="result-lore-section"><div class="result-lore-title">Overview</div><p>${esc(lore.summary)}</p></div>`;
        }
        if (lore.pronunciation && lore.pronunciation.guide) {
            html += `<div class="result-lore-section"><div class="result-lore-title">Pronunciation</div><p>${esc(lore.pronunciation.guide)}</p></div>`;
        }
        if (lore.mythology && lore.mythology.summary) {
            html += `<div class="result-lore-section"><div class="result-lore-title">Mythology</div><p>${esc(lore.mythology.summary)}</p></div>`;
        }
        resultLore.innerHTML = html;
        resultLore.classList.remove('hidden');
    }

    async function renderResult() {
        const entry = findExactMatch(currentInput);
        currentTypeEntry = entry;
        if (!entry) { resultCard.classList.add('hidden'); return; }

        resultUnicode.textContent = nfc(entry.unicode);
        resultGreek.textContent = (entry.greek && entry.greek !== '—') ? entry.greek : '';
        resultGreek.style.display = (entry.greek && entry.greek !== '—') ? '' : 'none';
        resultDomain.textContent = entry.domain || entry.unicode + '.com';
        resultMeaning.textContent = entry.meaning || '';
        resultSources.innerHTML = entry.sources.map(src => `<span class="source-badge">${esc(src)}</span>`).join('');
        renderVariants(entry);
        if (resultLore) {
            resultLore.classList.add('hidden');
            loadLoreCatalog().then(() => renderLore(entry));
        }

        const favorited = isFavorite(entry.id);
        starBtn.querySelector('.action-icon').textContent = favorited ? '★' : '☆';
        starBtn.classList.toggle('starred', favorited);
        starBtn.querySelector('.action-label').textContent = favorited ? 'Saved' : 'Save';
        resultCard.classList.remove('hidden');

        const cached = domainCache.get(entry.id);
        if (cached) {
            resultDomainStatus.innerHTML = `<div class="domain-badge ${cached.className}">${cached.text}</div>`;
        } else {
            resultDomainStatus.innerHTML = `<div class="domain-badge unknown">Checking domain...</div>`;
            try {
                const res = await fetch(`${API_BASE}/api/entry/${encodeURIComponent(entry.id)}`);
                const data = await res.json();
                renderDomainBadge(data, entry);
                // Cache the rendered result
                const badgeEl = resultDomainStatus.querySelector('.domain-badge');
                if (badgeEl) {
                    domainCache.set(entry.id, {
                        className: badgeEl.classList.contains('owned') ? 'owned' : badgeEl.classList.contains('available') ? 'available' : 'unknown',
                        text: badgeEl.textContent
                    });
                }
            } catch {
                renderDomainBadge(null, entry);
            }
        }
    }

    function updateTypeAll() {
        renderTypePreview();
        renderSuggestions();
        renderCompletions();
        renderResult();
    }

    const debouncedUpdateTypeAll = debounce(updateTypeAll, 50);

    function renderQuickRecents() {
        const container = document.getElementById('quick-recents');
        if (!container) return;
        const recent = getRecent().slice(0, 4);
        if (recent.length === 0) { container.classList.add('hidden'); return; }
        container.classList.remove('hidden');
        container.innerHTML = '<span class="quick-recent-label">Recent</span>' +
            recent.map((r, i) => `
                <div class="quick-recent-chip" data-id="${r.id}" style="animation-delay:${i * 0.05}s">
                    <span class="qr-ascii">${esc(r.ascii)}</span>
                    <span>${esc(nfc(r.unicode))}</span>
                </div>
            `).join('');
        container.querySelectorAll('.quick-recent-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) openDetailModal(entry);
                vibrate(8);
            });
        });
    }

    typeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const cleaned = val.replace(/[^a-zA-Z]/g, '');
        if (val !== cleaned) typeInput.value = cleaned;
        currentInput = cleaned;
        debouncedUpdateTypeAll();
    });

    typeInput.addEventListener('keydown', (e) => {
        if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const char = e.key.toLowerCase();
        if (!/^[a-z]$/.test(char)) return;
        const prospective = currentInput + char;
        const comps = getCompletions(prospective, 1);
        if (comps.length === 0) {
            e.preventDefault();
            vibrate(15);
            typeInput.style.borderColor = 'var(--ember)';
            setTimeout(() => { typeInput.style.borderColor = ''; }, 200);
        }
    });

    typeClearBtn.addEventListener('click', () => {
        currentInput = ''; typeInput.value = ''; updateTypeAll(); typeInput.focus(); vibrate(5);
    });

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activePantheon = pill.dataset.value;
            updateTypeAll();
            vibrate(5);
        });
    });

    // Result card tap opens detail modal
    resultCard.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        if (currentTypeEntry) openDetailModal(currentTypeEntry);
    });

    copyBtn.addEventListener('click', async () => {
        const entry = currentTypeEntry;
        if (!entry) return;
        const ok = await copyToClipboard(nfc(entry.unicode));
        if (ok) { vibrate(20); showToast(`Copied ${nfc(entry.unicode)}`); addToHistory(entry); }
        else showToast('Copy failed — long-press to select');
        copyBtn.querySelector('.action-label').textContent = 'Copied!';
        setTimeout(() => { copyBtn.querySelector('.action-label').textContent = 'Copy'; }, 1500);
    });

    starBtn.addEventListener('click', () => {
        const entry = currentTypeEntry;
        if (!entry) return;
        const nowFav = toggleFavorite(entry);
        starBtn.querySelector('.action-icon').textContent = nowFav ? '★' : '☆';
        starBtn.classList.toggle('starred', nowFav);
        starBtn.querySelector('.action-label').textContent = nowFav ? 'Saved' : 'Save';
        vibrate(10);
    });

    shareTypeBtn.addEventListener('click', async () => {
        const entry = currentTypeEntry;
        if (!entry) return;
        const text = nfc(entry.unicode);
        const ok = await shareText(`${text} — ${entry.meaning || entry.domain}`, text);
        if (!ok) {
            const copied = await copyToClipboard(text);
            showToast(copied ? 'Copied to clipboard' : 'Share unavailable');
        }
        addToHistory(entry);
    });

    // Swipe to clear
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (dy > 120 && currentInput && e.changedTouches[0].clientX < window.innerWidth * 0.3) {
            typeClearBtn.click();
        }
    }, { passive: true });

    // ═══════════════════════════════════════════════
    //  COMPOSE MODE
    // ═══════════════════════════════════════════════

    function tokenizeWords(text) {
        return text.split(/([\s\n\r]+|[.,!?;:"()[\]{}<>@#$%^&*+=_|~`\\/\-]+)/);
    }

    function findWordsToConvert(text) {
        const tokens = tokenizeWords(text);
        const matches = [];
        const seen = new Set();

        // Lexicon matches (primary + ideal variant)
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!token || !/^[a-zA-Z]+$/.test(token)) continue;
            const lower = token.toLowerCase();
            if (seen.has(lower)) continue;
            const entry = engine.findExactMatch(trie, lower);
            if (entry && !composeConversions.has(lower)) {
                matches.push({ token, lower, entry, type: 'lexicon', index: i });
                // Also suggest ideal variant if available
                const ideal = entry.variants?.find(v => v.type === 'ideal');
                if (ideal && !seen.has('ideal:' + lower)) {
                    matches.push({ token, lower, entry, type: 'lexicon-ideal', index: i, idealUnicode: ideal.unicode });
                    seen.add('ideal:' + lower);
                }
                seen.add(lower);
            }
        }

        // Directory character matches (by keyword/name)
        if (typeof UNICODE_DIR !== 'undefined') {
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (!token || !/^[a-zA-Z]+$/.test(token)) continue;
                const lower = token.toLowerCase();
                if (seen.has('dir:' + lower)) continue;

                const dirMatch = UNICODE_DIR.find(c =>
                    !composeConversions.has('dir:' + c.char) &&
                    (c.keywords.toLowerCase().split(' ').includes(lower) ||
                     c.name.toLowerCase().split(' ').includes(lower) ||
                     c.category.toLowerCase() === lower)
                );

                if (dirMatch) {
                    matches.push({ token, lower, entry: dirMatch, type: 'directory', index: i });
                    seen.add('dir:' + lower);
                }
            }
        }

        return matches.slice(0, 5);
    }

    function renderSuggestionRibbon() {
        const text = composeTextarea.value;
        const matches = findWordsToConvert(text);
        if (matches.length === 0) { suggestionRibbon.classList.add('hidden'); return; }

        ribbonChips.innerHTML = matches.map(m => {
            const isDir = m.type === 'directory';
            const isIdeal = m.type === 'lexicon-ideal';
            const displayUnicode = isDir ? m.entry.char : isIdeal ? nfc(m.idealUnicode) : nfc(m.entry.unicode);
            const badge = isIdeal ? '<span class="ribbon-chip-badge">★ Ideal</span>' : '';
            return `
                <div class="ribbon-chip ${isIdeal ? 'ideal' : ''}" data-word="${esc(m.lower)}" data-type="${m.type}" data-char="${esc(isDir ? m.entry.char : '')}" data-ideal="${esc(isIdeal ? nfc(m.idealUnicode) : '')}">
                    <span class="ribbon-chip-ascii">${esc(m.token)}</span>
                    <span class="ribbon-chip-arrow">→</span>
                    <span class="ribbon-chip-unicode">${esc(displayUnicode)}</span>
                    ${badge}
                </div>
            `;
        }).join('');

        ribbonChips.querySelectorAll('.ribbon-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const word = chip.dataset.word;
                const type = chip.dataset.type;
                const char = chip.dataset.char;
                const idealUnicode = chip.dataset.ideal;

                if (type === 'directory') {
                    const entry = UNICODE_DIR.find(c => c.char === char);
                    if (!entry) return;
                    composeConversions.set(word, { unicode: entry.char, pantheon: 'directory', ascii: word, isDir: true });
                    composeSessionLog.push({ ascii: word, unicode: entry.char, pantheon: 'directory' });
                    renderComposePreview();
                    renderComposeLog();
                    renderSuggestionRibbon();
                    vibrate(12);
                    showToast(`Inserted ${entry.char}`);
                } else if (type === 'lexicon-ideal') {
                    const entry = LEXICON.find(e => e.ascii === word);
                    if (!entry) return;
                    composeConversions.set(word, { ...entry, unicode: idealUnicode });
                    composeSessionLog.push({ ascii: word, unicode: idealUnicode, pantheon: entry.pantheon });
                    renderComposePreview();
                    renderComposeLog();
                    renderSuggestionRibbon();
                    vibrate(12);
                    showToast(`Converted ${word} → ${nfc(idealUnicode)}`);
                    addToHistory(entry);
                } else {
                    const entry = LEXICON.find(e => e.ascii === word);
                    if (!entry) return;
                    composeConversions.set(word, entry);
                    composeSessionLog.push({ ascii: word, unicode: entry.unicode, pantheon: entry.pantheon });
                    renderComposePreview();
                    renderComposeLog();
                    renderSuggestionRibbon();
                    vibrate(12);
                    showToast(`Converted ${word} → ${nfc(entry.unicode)}`);
                    addToHistory(entry);
                }
            });
        });
        suggestionRibbon.classList.remove('hidden');
    }

    function renderComposePreview() {
        const text = composeTextarea.value;
        if (composeConversions.size === 0) { composePreview.classList.add('hidden'); return; }

        const tokens = tokenizeWords(text);
        let conversionCount = 0;
        const html = tokens.map(token => {
            const lower = token.toLowerCase();
            const entry = composeConversions.get(lower);
            if (entry) {
                conversionCount++;
                if (token === token.toUpperCase()) return `<span class="converted-word">${esc(nfc(entry.unicode).toUpperCase())}</span>`;
                if (token[0] === token[0].toUpperCase()) {
                    const uc = nfc(entry.unicode);
                    return `<span class="converted-word">${esc(uc[0].toUpperCase() + uc.slice(1))}</span>`;
                }
                return `<span class="converted-word">${esc(nfc(entry.unicode))}</span>`;
            }
            return esc(token);
        }).join('');

        previewText.innerHTML = html;
        previewCount.textContent = `${conversionCount} conversion${conversionCount !== 1 ? 's' : ''}`;
        composePreview.classList.remove('hidden');
    }

    function renderComposeLog() {
        if (composeSessionLog.length === 0) { composeLog.classList.add('hidden'); return; }
        logList.innerHTML = composeSessionLog.slice(-10).reverse().map(item => {
            const emoji = engine.getPantheonEmoji(item.pantheon);
            return `
                <div class="log-item">
                    <span class="log-item-ascii">${esc(item.ascii)}</span>
                    <span class="log-item-arrow">→</span>
                    <span class="log-item-unicode">${esc(nfc(item.unicode))}</span>
                    <span class="log-item-pantheon">${emoji} ${esc(item.pantheon)}</span>
                </div>
            `;
        }).join('');
        composeLog.classList.remove('hidden');
    }

    function getConvertedText() {
        const text = composeTextarea.value;
        const tokens = tokenizeWords(text);
        return tokens.map(token => {
            const lower = token.toLowerCase();
            const entry = composeConversions.get(lower);
            if (entry) {
                if (token === token.toUpperCase()) return nfc(entry.unicode).toUpperCase();
                if (token[0] === token[0].toUpperCase()) {
                    const uc = nfc(entry.unicode);
                    return uc[0].toUpperCase() + uc.slice(1);
                }
                return nfc(entry.unicode);
            }
            return token;
        }).join('');
    }

    const debouncedComposeUpdate = debounce(() => {
        renderSuggestionRibbon();
        renderComposePreview();
    }, 150);

    composeTextarea.addEventListener('input', () => {
        debouncedComposeUpdate();
        // Auto-expand textarea
        composeTextarea.style.height = 'auto';
        const newH = Math.min(Math.max(composeTextarea.scrollHeight, 100), 240);
        composeTextarea.style.height = newH + 'px';
    });

    composeClearBtn.addEventListener('click', () => {
        composeTextarea.value = '';
        composeTextarea.style.height = '100px';
        composeConversions.clear();
        composeSessionLog = [];
        renderSuggestionRibbon();
        renderComposePreview();
        composeLog.classList.add('hidden');
        composeTextarea.focus();
        vibrate(5);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape closes modal
        if (e.key === 'Escape' && modalOpen) {
            closeDetailModal();
            return;
        }
        // Ctrl+A in compose selects all converted text
        if (e.ctrlKey && e.key === 'a' && currentMode === 'compose' && document.activeElement === composeTextarea) {
            e.preventDefault();
            const text = getConvertedText();
            if (text.trim()) {
                copyToClipboard(text).then(ok => {
                    if (ok) showToast('Converted text copied', 'success');
                });
            }
            return;
        }
        // Ctrl+Z in compose undoes last conversion
        if (e.ctrlKey && e.key === 'z' && currentMode === 'compose') {
            e.preventDefault();
            if (composeSessionLog.length > 0) {
                const last = composeSessionLog.pop();
                composeConversions.delete(last.ascii);
                renderComposePreview();
                renderComposeLog();
                renderSuggestionRibbon();
                showToast(`Undid ${last.ascii}`, 'info');
            }
            return;
        }
    });

    composeCopyBtn.addEventListener('click', async () => {
        const text = getConvertedText();
        if (!text.trim()) { showToast('Nothing to copy'); return; }
        const ok = await copyToClipboard(text);
        if (ok) { vibrate(15); showToast('Copied converted text'); }
        else showToast('Copy failed — long-press to select');
    });

    composeShareBtn.addEventListener('click', async () => {
        const text = getConvertedText();
        if (!text.trim()) { showToast('Nothing to share'); return; }
        const ok = await shareText(text, 'PuniCodex');
        if (!ok) {
            const copied = await copyToClipboard(text);
            showToast(copied ? 'Copied to clipboard' : 'Share unavailable');
        }
    });

    // ═══════════════════════════════════════════════
    //  SAVED MODE
    // ═══════════════════════════════════════════════

    function renderSaved() {
        const stats = getStats();
        const favorites = getFavorites();
        const recent = getRecent();

        statTotal.textContent = stats.total || 0;
        statStreak.textContent = computeStreak();
        statUnique.textContent = (stats.unique || []).length;

        const pantheonCounts = stats.byPantheon || {};
        const topPantheon = Object.entries(pantheonCounts).sort((a, b) => b[1] - a[1])[0];
        statFavorite.textContent = topPantheon ? topPantheon[0] : '—';
        favoritesCount.textContent = favorites.length;

        if (favorites.length === 0) {
            favoritesList.innerHTML = '<div class="history-empty">Star names in Type mode to see them here</div>';
        } else {
            favoritesList.innerHTML = favorites.map(f => renderHistoryItem(f, true)).join('');
            attachHistoryListeners(favoritesList);
        }

        if (recent.length === 0) {
            recentList.innerHTML = '<div class="history-empty">Your conversions will appear here</div>';
        } else {
            recentList.innerHTML = recent.map(r => renderHistoryItem(r, false)).join('');
            attachHistoryListeners(recentList);
        }
    }

    function renderHistoryItem(item, isFav) {
        const emoji = engine.getPantheonEmoji(item.pantheon);
        const starred = isFavorite(item.id);
        return `
            <div class="history-item" data-id="${item.id}">
                <span class="history-item-emoji">${emoji}</span>
                <div class="history-item-name">
                    <span class="history-item-unicode">${esc(nfc(item.unicode))}</span>
                    <span class="history-item-meta">${esc(item.ascii)} · ${esc(item.pantheon)}</span>
                </div>
                <button class="history-item-star ${starred ? 'active' : ''}" data-id="${item.id}" aria-label="Toggle favorite">
                    ${starred ? '★' : '☆'}
                </button>
                <div class="history-swipe-actions">
                    <button class="history-swipe-btn copy" data-id="${item.id}" aria-label="Copy">⎘</button>
                    <button class="history-swipe-btn delete" data-id="${item.id}" aria-label="Delete">🗑</button>
                </div>
            </div>
        `;
    }

    function attachHistoryListeners(container) {
        container.querySelectorAll('.history-item').forEach(item => {
            // Tap to open
            item.addEventListener('click', (e) => {
                if (e.target.closest('.history-item-star') || e.target.closest('.history-swipe-btn')) return;
                if (item.classList.contains('swiped')) {
                    item.classList.remove('swiped');
                    return;
                }
                const id = item.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) openDetailModal(entry);
            });

            // Swipe handling
            let startX = 0, startY = 0, currentX = 0;
            item.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                item.classList.add('swiping');
            }, { passive: true });
            item.addEventListener('touchmove', (e) => {
                currentX = e.touches[0].clientX;
                const dx = startX - currentX;
                const dy = Math.abs(e.touches[0].clientY - startY);
                if (dx > 20 && dy < 40) {
                    e.preventDefault();
                    item.style.transform = `translateX(${-Math.min(dx, 100)}px)`;
                }
            }, { passive: false });
            item.addEventListener('touchend', () => {
                item.classList.remove('swiping');
                const dx = startX - currentX;
                if (dx > 60) {
                    item.classList.add('swiped');
                    item.style.transform = '';
                } else {
                    item.classList.remove('swiped');
                    item.style.transform = '';
                }
            });
        });

        container.querySelectorAll('.history-item-star').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (!entry) return;
                const nowFav = toggleFavorite(entry);
                btn.textContent = nowFav ? '★' : '☆';
                btn.classList.toggle('active', nowFav);
                vibrate(8);
                renderSaved();
            });
        });

        // Swipe action buttons
        container.querySelectorAll('.history-swipe-btn.copy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const entry = LEXICON.find(e => e.id === id);
                if (entry) {
                    const ok = await copyToClipboard(nfc(entry.unicode));
                    if (ok) showToast(`Copied ${nfc(entry.unicode)}`, 'success');
                }
                btn.closest('.history-item').classList.remove('swiped');
            });
        });
        container.querySelectorAll('.history-swipe-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const recent = getRecent().filter(r => r.id !== id);
                setStorage(STORAGE_KEYS.recent, recent);
                renderSaved();
                showToast('Removed from history', 'info');
            });
        });
    }

    clearRecentBtn.addEventListener('click', () => {
        setStorage(STORAGE_KEYS.recent, []);
        renderSaved();
        showToast('History cleared');
        vibrate(5);
    });

    // ═══════════════════════════════════════════════
    //  DIRECTORY MODE
    // ═══════════════════════════════════════════════

    function getDirectoryChars() {
        let chars = UNICODE_DIR;
        if (activeDirCategory !== 'all') {
            chars = chars.filter(c => c.category === activeDirCategory);
        }
        if (dirQuery.trim()) {
            const q = dirQuery.trim().toLowerCase();
            chars = chars.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.keywords.toLowerCase().includes(q) ||
                c.categoryLabel.toLowerCase().includes(q) ||
                c.char === q
            );
        }
        return chars;
    }

    function renderDirectory() {
        const chars = getDirectoryChars();
        dirCount.textContent = `${chars.length.toLocaleString()} character${chars.length !== 1 ? 's' : ''}`;

        if (chars.length === 0) {
            dirGrid.innerHTML = '<div class="history-empty" style="grid-column: 1 / -1;">No characters found</div>';
            return;
        }

        dirGrid.innerHTML = chars.map(c => `
            <div class="dir-cell" data-index="${c.id}" title="${esc(c.name)} (${esc(c.code)})">
                <span class="dir-cell-char">${esc(c.char)}</span>
                <span class="dir-cell-code">${esc(c.code)}</span>
            </div>
        `).join('');

        dirGrid.querySelectorAll('.dir-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const idx = parseInt(cell.dataset.index, 10);
                const char = UNICODE_DIR[idx];
                if (char) openCharDetailModal(char);
            });
        });
    }

    async function openCharDetailModal(char) {
        if (modalOpen) return;
        modalOpen = true;

        const html = `
            <button class="detail-close" id="detail-close" aria-label="Close">×</button>
            <div class="detail-char-hero">${esc(char.char)}</div>
            <div class="detail-char-meta">
                <div class="detail-char-name">${esc(char.name)}</div>
                <div class="detail-char-code">${esc(char.code)}</div>
                <div class="detail-char-category">${esc(char.categoryLabel)}</div>
            </div>
            <div class="detail-actions">
                <button class="action-btn primary" id="char-copy">
                    <span class="action-icon">⎘</span>
                    <span class="action-label">Copy</span>
                </button>
                <button class="action-btn" id="char-share">
                    <span class="action-icon">↗</span>
                    <span class="action-label">Share</span>
                </button>
            </div>
        `;

        detailModalContent.innerHTML = html;
        detailModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        vibrate(8);

        document.getElementById('detail-close').addEventListener('click', closeDetailModal);
        detailModalBackdrop.addEventListener('click', closeDetailModal);

        document.getElementById('char-copy').addEventListener('click', async () => {
            const ok = await copyToClipboard(char.char);
            if (ok) { showToast(`Copied ${char.char}`); vibrate(12); }
            else showToast('Copy failed — long-press to select');
        });

        document.getElementById('char-share').addEventListener('click', async () => {
            const ok = await shareText(`${char.char} — ${char.name} (${char.code})`, char.name);
            if (!ok) {
                const copied = await copyToClipboard(char.char);
                showToast(copied ? 'Copied to clipboard' : 'Share unavailable');
            }
        });
    }

    dirSearch.addEventListener('input', (e) => {
        dirQuery = e.target.value;
        dirSearchClear.classList.toggle('hidden', !dirQuery);
        renderDirectory();
    });

    dirSearchClear.addEventListener('click', () => {
        dirSearch.value = '';
        dirQuery = '';
        dirSearchClear.classList.add('hidden');
        renderDirectory();
        dirSearch.focus();
        vibrate(5);
    });

    dirPills.forEach(pill => {
        pill.addEventListener('click', () => {
            dirPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeDirCategory = pill.dataset.value;
            renderDirectory();
            vibrate(5);
        });
    });

    // ═══════════════════════════════════════════════
    //  INSTALL PROMPT
    // ═══════════════════════════════════════════════

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            installBanner.classList.remove('hidden');
        }
    });

    installBtn.addEventListener('click', () => {
        if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
        installBanner.classList.add('hidden');
    });

    installDismiss.addEventListener('click', () => {
        installBanner.classList.add('hidden');
    });

    // ═══════════════════════════════════════════════
    //  KEYBOARD PANEL
    // ═══════════════════════════════════════════════

    function renderKeyboardPanel() {
        const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

        if (!isNative) {
            if (kbdStatusBanner) {
                kbdStatusBanner.className = 'keyboard-status-banner disabled';
                kbdStatusIcon.textContent = '📱';
                kbdStatusText.textContent = 'Install the Android app for system keyboard';
            }
            if (kbdSettingsBtn) kbdSettingsBtn.style.display = 'none';
            if (kbdSwitchBtn) kbdSwitchBtn.style.display = 'none';
            document.querySelectorAll('.setup-step').forEach(s => s.classList.add('done'));
            return;
        }

        // Check status
        if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PunyKeyboard) {
            Capacitor.Plugins.PunyKeyboard.isKeyboardEnabled()
                .then(res => {
                    updateKeyboardStatus(res.enabled);
                })
                .catch(() => {
                    updateKeyboardStatus(false);
                });

            // Fetch stats
            Capacitor.Plugins.PunyKeyboard.getKeyboardStats()
                .then(res => {
                    if (nativeTotalEl) nativeTotalEl.textContent = res.totalCompletions || 0;
                    if (nativeFavoriteEl) nativeFavoriteEl.textContent = res.favoriteChar || '—';
                })
                .catch(() => {
                    if (nativeTotalEl) nativeTotalEl.textContent = '—';
                    if (nativeFavoriteEl) nativeFavoriteEl.textContent = '—';
                });
        }
    }

    function updateKeyboardStatus(enabled) {
        if (!kbdStatusBanner) return;
        kbdStatusBanner.className = 'keyboard-status-banner ' + (enabled ? 'enabled' : 'disabled');
        kbdStatusIcon.textContent = enabled ? '✓' : '◈';
        kbdStatusText.textContent = enabled ? 'PuniCodex keyboard is enabled' : 'PuniCodex keyboard is not enabled';

        // Update setup steps
        const step1 = document.getElementById('setup-step-1');
        const step2 = document.getElementById('setup-step-2');
        const step3 = document.getElementById('setup-step-3');

        if (step1) {
            step1.classList.toggle('done', true);
            step1.querySelector('.step-check').textContent = '✓';
        }
        if (step2) {
            step2.classList.toggle('done', enabled);
            step2.querySelector('.step-check').textContent = enabled ? '✓' : '○';
        }
        if (step3) {
            step3.classList.toggle('done', enabled);
            step3.querySelector('.step-check').textContent = enabled ? '✓' : '○';
        }
    }

    if (kbdSettingsBtn) {
        kbdSettingsBtn.addEventListener('click', async () => {
            if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PunyKeyboard) {
                try {
                    await Capacitor.Plugins.PunyKeyboard.openKeyboardSettings();
                } catch (err) {
                    showToast('Could not open keyboard settings');
                }
            } else {
                showToast('Keyboard settings only available in native app');
            }
            vibrate(12);
        });
    }

    if (kbdSwitchBtn) {
        kbdSwitchBtn.addEventListener('click', async () => {
            if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PunyKeyboard) {
                try {
                    await Capacitor.Plugins.PunyKeyboard.showInputMethodPicker();
                } catch (err) {
                    showToast('Could not open keyboard picker');
                }
            } else {
                showToast('Keyboard picker only available in native app');
            }
            vibrate(12);
        });
    }

    // ═══════════════════════════════════════════════
    //  ONBOARDING
    // ═══════════════════════════════════════════════

    let currentSlide = 0;
    const totalSlides = onboardingSlides.length;

    function initOnboarding() {
        const onboarded = localStorage.getItem('punicodex_onboarded');
        if (onboarded || !onboardingOverlay) return;

        // Show after a brief delay so the UI renders first
        setTimeout(() => {
            onboardingOverlay.classList.remove('hidden');
            vibrate(15);
        }, 600);
    }

    function showSlide(index) {
        if (index < 0 || index >= totalSlides) return;
        currentSlide = index;

        onboardingSlides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev');
            if (i === index) slide.classList.add('active');
            else if (i < index) slide.classList.add('prev');
        });

        onboardingDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    function closeOnboarding() {
        if (!onboardingOverlay) return;
        onboardingOverlay.classList.add('hidden');
        localStorage.setItem('punicodex_onboarded', '1');
    }

    if (onboardingSkip) {
        onboardingSkip.addEventListener('click', closeOnboarding);
    }

    if (onboardingCta) {
        onboardingCta.addEventListener('click', () => {
            vibrate(15);
            closeOnboarding();
        });
    }

    if (headerHelp) {
        headerHelp.addEventListener('click', () => {
            if (onboardingOverlay) {
                onboardingOverlay.classList.remove('hidden');
                showSlide(0);
                vibrate(8);
            }
        });
    }

    // Swipe handling for onboarding slides
    let onboardStartX = 0;
    if (onboardingOverlay) {
        onboardingOverlay.addEventListener('touchstart', (e) => {
            onboardStartX = e.touches[0].clientX;
        }, { passive: true });

        onboardingOverlay.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - onboardStartX;
            if (Math.abs(dx) > 60) {
                if (dx < 0 && currentSlide < totalSlides - 1) {
                    showSlide(currentSlide + 1);
                    vibrate(5);
                } else if (dx > 0 && currentSlide > 0) {
                    showSlide(currentSlide - 1);
                    vibrate(5);
                }
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════

    initAmbientCanvas();
    renderQuickRecents();
    setMode('type');
    updateTypeAll();
    initOnboarding();
})();
