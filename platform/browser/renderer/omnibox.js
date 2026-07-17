/**
 * PUNICODEX — The Inscription Field
 * The crown of the vessel. Where mortals inscribe the names of temples.
 * Only the Index is consulted. No foreign oracles.
 */

const _Omnibox = (function () {
  const input = document.getElementById('omnibox');
  const dropdown = document.getElementById('omniboxDropdown');
  const trustIcon = document.getElementById('trustIcon');
  const urlDisplay = document.getElementById('urlDisplay');
  const sitePopup = document.getElementById('sitePopup');
  const sitePopupContent = document.getElementById('sitePopupContent');

  let activeIndex = -1;
  let results = [];
  let isDropdownOpen = false;
  let debounceTimer = null;
  let currentEntry = null;
  let currentSite = null;

  // ═══════════════════════════════════════════════════════════
  // EVENT WIRING
  // ═══════════════════════════════════════════════════════════

  input.addEventListener('focus', () => {
    if (input.value.trim()) showDropdown();
  });

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      search(input.value.trim());
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (!isDropdownOpen) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter(input.value.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
      renderDropdown();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      renderDropdown();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        navigateResult(results[activeIndex]);
      } else {
        onEnter(input.value.trim());
      }
      return;
    }
    if (e.key === 'Escape') {
      hideDropdown();
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.omnibox-container')) {
      hideDropdown();
    }
    if (!e.target.closest('.trust-icon') && !e.target.closest('.site-popup')) {
      hideSitePopup();
    }
  });

  trustIcon.addEventListener('click', () => {
    if (currentSite || currentEntry) {
      toggleSitePopup();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // CORE LOGIC
  // ═══════════════════════════════════════════════════════════

  async function search(query) {
    if (!query) {
      hideDropdown();
      return;
    }

    activeIndex = -1;
    results = [];

    // Check if it's a direct URL/punycode/unicode-domain
    const normalized = await window.punicodex.normalizeUrl(query);
    if (
      normalized.type === 'url' ||
      normalized.type === 'punycode' ||
      normalized.type === 'unicode-domain'
    ) {
      results.push({
        type: 'navigate',
        label: normalized.unicode || normalized.domain || normalized.url,
        url: normalized.url,
        punycode: normalized.punycode,
        isDirect: true,
      });
    }

    // Query the sacred Index (indexed sites only)
    try {
      const apiRes = await window.punicodex.apiGet(
        `/api/sites/search/?q=${encodeURIComponent(query)}&limit=6`
      );
      if (apiRes.ok && Array.isArray(apiRes.data)) {
        apiRes.data.forEach((site) => {
          results.push({ type: 'site', site });
        });
      }
    } catch (e) {
      console.error('[Inscription] Index consultation failed:', e);
    }

    renderDropdown();
  }

  async function onEnter(value) {
    if (!value) return;
    hideDropdown();

    const normalized = await window.punicodex.normalizeUrl(value);
    if (
      normalized.type === 'url' ||
      normalized.type === 'punycode' ||
      normalized.type === 'unicode-domain'
    ) {
      WebviewManager.navigate(normalized.url);
      return;
    }

    // For search queries: if there are results, navigate to the top one
    if (results.length > 0 && results[0].type === 'site') {
      const topSite = results[0].site;
      const url = `https://${topSite.punycode || topSite.domain}`;
      WebviewManager.navigate(url);
      return;
    }

    // No results — show empty state in dropdown briefly
    results = [
      {
        type: 'none',
        message: 'No temples inscribed under this name.',
      },
    ];
    renderDropdown();
    setTimeout(hideDropdown, 2000);
  }

  function navigateResult(result) {
    hideDropdown();
    if (result.type === 'navigate' || result.type === 'site') {
      const url =
        result.url ||
        (result.site ? `https://${result.site.punycode || result.site.domain}` : null);
      if (url) WebviewManager.navigate(url);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERING — Revealed tablets
  // ═══════════════════════════════════════════════════════════

  function renderDropdown() {
    if (results.length === 0) {
      hideDropdown();
      return;
    }

    let html = '';

    // Direct navigation / URL section
    const navResults = results.filter((r) => r.type === 'navigate');
    if (navResults.length > 0) {
      html += `<div class="dropdown-section"><div class="dropdown-section-title">Direct Inscription</div>`;
      navResults.forEach((r, i) => {
        const isActive = i === activeIndex;
        const puny = r.punycode ? `<div class="di-url">${escapeHtml(r.punycode)}</div>` : '';
        html += `
          <div class="dropdown-item ${isActive ? 'active' : ''}" data-index="${i}">
            <span class="di-unicode">${escapeHtml(r.label)}</span>
            <span class="di-meta">
              <div class="di-greek">Navigate to this temple</div>
              ${puny}
            </span>
          </div>
        `;
      });
      html += `</div>`;
    }

    // The Index — ranked site results
    const siteResults = results.filter((r) => r.type === 'site');
    if (siteResults.length > 0) {
      html += `<div class="dropdown-section"><div class="dropdown-section-title">The Index</div>`;
      siteResults.forEach((r, _i) => {
        const globalIdx = results.indexOf(r);
        const isActive = globalIdx === activeIndex;
        const s = r.site;
        const tierClass = s.tier === 'dual' ? 'dual' : s.tier === '1' ? 'tier-1' : 'tier-2';
        const tierLabel = s.tier === 'dual' ? 'Dual' : `T${s.tier}`;
        const domain = s.entry_unicode || s.domain;
        const puny = s.punycode;
        const isFlagship = s.is_flagship;
        const title = s.title || domain;
        const snippet = s.description || s.content_snippet || s.entry_meaning || '';
        const inscribed = s.last_crawled ? formatDate(s.last_crawled) : '—';

        let badges = `<span class="di-badge ${tierClass}">${tierLabel}</span>`;
        if (isFlagship) badges += ` <span class="di-badge flagship">Flagship</span>`;

        html += `
          <div class="dropdown-item ${isActive ? 'active' : ''}" data-index="${globalIdx}">
            <span class="di-unicode">${escapeHtml(domain)}</span>
            <span class="di-meta">
              <div class="di-greek">${escapeHtml(title)}</div>
              ${snippet ? `<div class="di-snippet">${escapeHtml(snippet)}</div>` : ''}
              <div class="di-seo-meta">
                ${escapeHtml(puny)} · Inscribed ${inscribed}
              </div>
            </span>
            ${badges}
          </div>
        `;
      });
      html += `</div>`;
    }

    // No results
    const noneResults = results.filter((r) => r.type === 'none');
    if (noneResults.length > 0) {
      html += `
        <div class="dropdown-section">
          <div class="dropdown-item" style="cursor:default;">
            <span class="di-meta">
              <div class="di-greek" style="font-style:italic;color:var(--ink-faint);">${escapeHtml(noneResults[0].message)}</div>
            </span>
          </div>
        </div>
      `;
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
    isDropdownOpen = true;

    dropdown.querySelectorAll('.dropdown-item[data-index]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        if (results[idx]) navigateResult(results[idx]);
      });
    });
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    isDropdownOpen = false;
    activeIndex = -1;
  }

  function showDropdown() {
    if (results.length > 0) {
      dropdown.classList.remove('hidden');
      isDropdownOpen = true;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TRUST INDICATOR — The seal
  // ═══════════════════════════════════════════════════════════

  function setTrustState(state) {
    trustIcon.className = 'trust-icon';
    if (state === 'verified') {
      trustIcon.classList.add('verified');
      trustIcon.title = 'Sanctified by the Canon — scholarly Unicode transliteration';
    } else if (state === 'unknown') {
      trustIcon.classList.add('unknown');
      trustIcon.title = 'Unknown sigil — not inscribed in the Canon';
    } else if (state === 'broken') {
      trustIcon.classList.add('broken');
      trustIcon.title = 'Broken seal — this temple cannot be reached';
    } else if (state === 'sealed') {
      trustIcon.classList.add('sealed');
      trustIcon.title = 'Seal intact — protected inscription';
    } else {
      trustIcon.title = 'Mortal domain — standard ASCII';
    }
  }

  function setSealState(state) {
    // HTTPS seal state: 'locked', 'broken', 'none'
    // This works alongside the trust state (Canon verification)
    // For now, we just update the title; visual differentiation can be added later
    if (state === 'locked') {
      trustIcon.title = trustIcon.title.replace(/Seal.*/, 'Seal intact — protected inscription');
    } else if (state === 'broken') {
      trustIcon.title = 'Broken seal — unprotected inscription';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DISPLAY UPDATE — After navigation
  // ═══════════════════════════════════════════════════════════

  function updateDisplay(url, entry, site) {
    currentEntry = entry;
    currentSite = site;
    hideSitePopup();

    let displayValue = '';
    let punycodeValue = '';

    if (entry) {
      displayValue = `${entry.unicode}.com`;
      punycodeValue = entry.punycode || '';
      setTrustState('verified');
    } else if (site?.entry_unicode) {
      displayValue = `${site.entry_unicode}.com`;
      punycodeValue = site.punycode || '';
      setTrustState('verified');
    } else {
      const domain = PunyUtil.extractDomain(url);
      if (PunyUtil.hasUnicode(domain) || domain.startsWith('xn--')) {
        const display = domain.startsWith('xn--') ? PunyUtil.toUnicode(domain) : domain;
        displayValue = display;
        setTrustState('unknown');
      } else {
        displayValue = domain;
        setTrustState('none');
      }
    }

    input.value = displayValue;
    renderUrlDisplay(url, displayValue, punycodeValue);
  }

  function renderUrlDisplay(url, displayDomain, punycode) {
    if (!url?.startsWith('http')) {
      urlDisplay.innerHTML = '';
      return;
    }

    try {
      const u = new URL(url);
      const protocol = `${u.protocol}//`;
      const path = u.pathname + u.search + u.hash;

      let html = '';
      html += `<span class="url-protocol">${escapeHtml(protocol)}</span>`;
      html += `<span class="url-domain">${escapeHtml(displayDomain || u.hostname)}</span>`;
      if (path && path !== '/') {
        html += `<span class="url-path">${escapeHtml(path)}</span>`;
      }
      if (punycode && punycode !== displayDomain) {
        html += `<span class="url-puny">${escapeHtml(punycode)}</span>`;
      }

      urlDisplay.innerHTML = html;
    } catch (_e) {
      urlDisplay.innerHTML = '';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SITE POPUP — Temple seal info
  // ═══════════════════════════════════════════════════════════

  function toggleSitePopup() {
    if (sitePopup.classList.contains('hidden')) {
      showSitePopup();
    } else {
      hideSitePopup();
    }
  }

  function showSitePopup() {
    let html = '';
    const data = currentSite || currentEntry;
    if (!data) return;

    const unicode = data.unicode || data.entry_unicode || '';
    const puny = data.punycode || '';
    const _tier = data.tier || '';
    const tierLabel = data.tier_label || '';
    const pantheon = data.pantheon || '';
    const title = data.title || '';
    const desc = data.description || data.meaning || '';
    const inscribed = data.last_crawled ? formatDate(data.last_crawled) : '—';
    const isFlagship = data.is_flagship || data.hasFlagship;

    html += `<div class="sp-title">${escapeHtml(unicode)}</div>`;
    if (puny) html += `<div class="sp-domain">${escapeHtml(puny)}</div>`;
    if (title)
      html += `<div style="margin:0.5rem 0;color:var(--ink-dim);font-size:0.82rem;">${escapeHtml(title)}</div>`;

    html += `<div style="margin-top:0.75rem;">`;
    if (tierLabel) html += renderPopupRow('Tier', tierLabel);
    if (pantheon) html += renderPopupRow('Pantheon', pantheon);
    if (isFlagship) html += renderPopupRow('Status', 'Flagship');
    html += renderPopupRow('Inscribed', inscribed);
    html += `</div>`;

    if (desc) {
      html += `<div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--groove);font-size:0.8rem;color:var(--ink-dim);line-height:1.5;">${escapeHtml(desc)}</div>`;
    }

    sitePopupContent.innerHTML = html;
    sitePopup.classList.remove('hidden');
  }

  function renderPopupRow(label, value) {
    return `
      <div class="sp-row">
        <span class="sp-label">${escapeHtml(label)}</span>
        <span class="sp-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function hideSitePopup() {
    sitePopup.classList.add('hidden');
  }

  // ═══════════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  // Public API
  return {
    updateDisplay,
    setTrustState,
    setSealState,
    focus() {
      input.focus();
    },
    get value() {
      return input.value;
    },
    set value(v) {
      input.value = v;
    },
  };
})();
