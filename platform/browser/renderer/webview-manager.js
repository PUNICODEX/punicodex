/**
 * PUNICODEX — WebView Lifecycle Manager
 * Each votive tablet has its own webview. Switching reveals. Never reloads.
 */

const _WebviewManager = (function () {
  const container = document.getElementById('webviewContainer');
  const btnBack = document.getElementById('btnBack');
  const btnForward = document.getElementById('btnForward');
  const btnReload = document.getElementById('btnReload');
  const errorOverlay = document.getElementById('errorOverlay');
  const errorMessage = document.getElementById('errorMessage');
  const btnErrorCatalog = document.getElementById('btnErrorCatalog');
  const btnErrorProceed = document.getElementById('btnErrorProceed');
  const progressBar = document.getElementById('progressBar');

  const webviews = new Map(); // tabId -> webview element
  const tabErrors = new Map(); // tabId -> { url, description }
  const tabSecurity = new Map(); // tabId -> 'secure' | 'insecure' | 'unknown'
  let activeTabId = null;

  // ═══════════════════════════════════════════════════════════
  // WEBVIEW LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  function createWebview(tabId, url) {
    const wv = document.createElement('webview');
    wv.className = 'page-webview';
    wv.setAttribute('nodeintegration', 'no');
    wv.setAttribute('allowpopups', 'no');
    wv.setAttribute('contextisolation', 'yes');
    wv.src = url || 'about:blank';

    // Bind all events to this specific tab
    wv.addEventListener('did-start-loading', () => onLoadingStart(tabId));
    wv.addEventListener('did-stop-loading', () => onLoadingStop(tabId));
    wv.addEventListener('did-navigate', (e) => onNavigate(tabId, e.url));
    wv.addEventListener('did-navigate-in-page', (e) => onNavigateInPage(tabId, e.url));
    wv.addEventListener('page-title-updated', (e) => onTitleUpdate(tabId, e.title));
    wv.addEventListener('did-fail-load', (e) => onFailLoad(tabId, e));
    wv.addEventListener('new-window', (e) => onNewWindow(e.url));

    container.appendChild(wv);
    webviews.set(tabId, wv);
    return wv;
  }

  function activateWebview(tabId) {
    // Dim the departing tablet
    if (activeTabId && webviews.has(activeTabId)) {
      webviews.get(activeTabId).classList.remove('active');
    }

    // Illuminate the chosen tablet
    activeTabId = tabId;
    if (webviews.has(tabId)) {
      webviews.get(tabId).classList.add('active');
    }

    updateNavState();

    // Show or conceal the error veil based on this tablet's history
    if (tabErrors.has(tabId)) {
      showErrorForTab(tabId);
    } else {
      hideError();
    }

    // Update security indicator for active tab
    const sec = tabSecurity.get(tabId);
    if (sec === 'secure') {
      Omnibox.setSealState('locked');
    } else if (sec === 'insecure') {
      Omnibox.setSealState('broken');
    } else {
      Omnibox.setSealState('none');
    }

    // Hide progress bar when switching to a loaded tab
    progressBar.classList.add('hidden');
  }

  function destroyWebview(tabId) {
    const wv = webviews.get(tabId);
    if (wv) {
      // Graceful unbinding
      wv.stop();
      wv.src = 'about:blank';
      // Remove from DOM after a brief delay to allow cleanup
      requestAnimationFrame(() => {
        if (wv.parentNode) wv.parentNode.removeChild(wv);
      });
    }
    webviews.delete(tabId);
    tabErrors.delete(tabId);
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION — Always operates on the active tablet
  // ═══════════════════════════════════════════════════════════

  function getActiveWebview() {
    return activeTabId ? webviews.get(activeTabId) : null;
  }

  function navigate(url) {
    const wv = getActiveWebview();
    if (!wv || !url) return;
    hideError();
    wv.src = url;
  }

  function goBack() {
    const wv = getActiveWebview();
    if (wv?.canGoBack()) wv.goBack();
  }

  function goForward() {
    const wv = getActiveWebview();
    if (wv?.canGoForward()) wv.goForward();
  }

  function reload() {
    const wv = getActiveWebview();
    if (!wv) return;
    hideError();
    wv.reload();
  }

  function getCurrentUrl() {
    const wv = getActiveWebview();
    if (!wv) return '';
    try {
      return wv.getURL();
    } catch (_e) {
      return wv.src || '';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PER-TAB EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  function onLoadingStart(tabId) {
    tabErrors.delete(tabId);
    if (tabId === activeTabId) {
      btnReload.textContent = '✕';
      btnReload.title = 'Halt';
      hideError();
      progressBar.classList.remove('hidden');
    }
    Tabs.updateTab(tabId, { loading: true });
  }

  function onLoadingStop(tabId) {
    if (tabId === activeTabId) {
      btnReload.textContent = '↻';
      btnReload.title = 'Rekindle';
      updateNavState();
      progressBar.classList.add('hidden');
    }
    const wv = webviews.get(tabId);
    if (wv) {
      Tabs.updateTab(tabId, {
        loading: false,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
      });
    }
  }

  function onNavigate(tabId, url) {
    Tabs.updateTab(tabId, { url });
    // Track security state
    if (url.startsWith('https://')) {
      tabSecurity.set(tabId, 'secure');
    } else if (url.startsWith('http://')) {
      tabSecurity.set(tabId, 'insecure');
    } else {
      tabSecurity.set(tabId, 'unknown');
    }
    if (tabId === activeTabId) {
      onActiveTabNavigate(url);
    }
  }

  function onNavigateInPage(tabId, url) {
    Tabs.updateTab(tabId, { url });
  }

  function onTitleUpdate(tabId, title) {
    Tabs.updateTab(tabId, { title });
    if (tabId === activeTabId) {
      document.title = title ? `${title} — PUNICODEX` : 'PUNICODEX';
    }
  }

  function onFailLoad(tabId, e) {
    if (e.errorCode === -3) return; // Aborted
    tabErrors.set(tabId, { url: e.validatedURL, description: e.errorDescription });
    Tabs.updateTab(tabId, { loading: false });
    if (tabId === activeTabId) {
      showErrorForTab(tabId);
    }
  }

  function onNewWindow(url) {
    Tabs.createTab(url, true);
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE TAB NAVIGATION INTELLIGENCE
  // ═══════════════════════════════════════════════════════════

  async function onActiveTabNavigate(url) {
    const domain = PunyUtil.extractDomain(url);
    if (!domain || domain === 'about:blank') {
      Omnibox.updateDisplay('', null, null);
      Sidebar.clear();
      VariantBanner.hide();
      return;
    }

    const isUnicode = PunyUtil.hasUnicode(domain) || domain.startsWith('xn--');
    Omnibox.updateDisplay(url, null, null);

    // Strategy 1: Exact punycode match via sites API
    try {
      const siteRes = await window.punicodex.apiGet(`/api/sites/${encodeURIComponent(domain)}`);
      if (siteRes.ok && siteRes.data) {
        const site = siteRes.data;
        if (site.lexicon_entry_id) {
          await loadEntry(site.lexicon_entry_id, url, site);
          return;
        }
      }
    } catch (_e) {
      /* continue */
    }

    // Strategy 2: Search by unicode domain name (strip TLD)
    try {
      const nameWithoutTld = domain.replace(/\.[^.]+$/, '');
      const searchRes = await window.punicodex.apiGet(
        `/api/search/?q=${encodeURIComponent(nameWithoutTld)}&limit=5`
      );
      if (searchRes.ok && searchRes.data.entries && searchRes.data.entries.length > 0) {
        const match = searchRes.data.entries.find((e) => {
          const entryDomain = (e.unicode || e.ascii).toLowerCase();
          return entryDomain === nameWithoutTld.toLowerCase();
        });
        if (match) {
          await loadEntry(match.id, url, null);
          return;
        }
      }
    } catch (_e) {
      /* continue */
    }

    // Strategy 3: ASCII core fallback
    if (!isUnicode) {
      try {
        const asciiCore = domain.replace(/\.[^.]+$/, '');
        const asciiRes = await window.punicodex.apiGet(
          `/api/search/?q=${encodeURIComponent(asciiCore)}&limit=1`
        );
        if (asciiRes.ok && asciiRes.data.entries && asciiRes.data.entries.length > 0) {
          const entry = asciiRes.data.entries[0];
          if (entry.ascii.toLowerCase() === asciiCore.toLowerCase()) {
            await loadEntry(entry.id, url, null);
            return;
          }
        }
      } catch (_e) {
        /* continue */
      }
    }

    // No Canon match
    Sidebar.clear();
    VariantBanner.hide();
    if (isUnicode) {
      Omnibox.setTrustState('unknown');
    } else {
      Omnibox.setTrustState('none');
    }
  }

  async function loadEntry(entryId, url, siteData) {
    // Load from local Canon first (always works)
    let entry = await window.punicodex.lexiconEntry(entryId);
    if (!entry) {
      // Fallback to API
      const res = await window.punicodex.apiGet(`/api/entry/${encodeURIComponent(entryId)}`);
      if (!res.ok) return;
      entry = res.data;
    }

    // Enrich with site data if passed
    if (siteData) {
      entry.site = {
        title: siteData.title,
        description: siteData.description,
        punycode: siteData.punycode,
        last_crawled: siteData.last_crawled,
        isFlagship: siteData.is_flagship,
        status: siteData.status,
      };
    }

    // Try to enrich with server data
    try {
      const apiRes = await window.punicodex.apiGet(`/api/entry/${encodeURIComponent(entryId)}`);
      if (apiRes.ok && apiRes.data) {
        entry.site = apiRes.data.site || entry.site;
        entry.availability = apiRes.data.availability || entry.availability;
      }
    } catch (_e) {
      /* server silent */
    }

    Omnibox.updateDisplay(url, entry, entry.site || null);
    Sidebar.load(entry);

    // Load variants from local Canon
    try {
      const variants = await window.punicodex.lexiconVariants(entryId);
      if (variants.length > 0) {
        VariantBanner.show(entry, variants);
      } else {
        VariantBanner.hide();
      }
    } catch (_e) {
      VariantBanner.hide();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ERROR OVERLAY — Per-tab, displayed for active tab only
  // ═══════════════════════════════════════════════════════════

  function showErrorForTab(tabId) {
    const err = tabErrors.get(tabId);
    if (!err) return;
    const domain = PunyUtil.extractDomain(err.url) || err.url;
    errorMessage.textContent = err.description
      ? `The temple at ${domain} could not be approached: ${err.description}`
      : `The temple at ${domain} could not be approached. It may not be inscribed in the Canon.`;
    errorOverlay.classList.remove('hidden');
  }

  function hideError() {
    errorOverlay.classList.add('hidden');
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION BUTTONS
  // ═══════════════════════════════════════════════════════════

  function updateNavState() {
    const wv = getActiveWebview();
    btnBack.disabled = !wv?.canGoBack();
    btnForward.disabled = !wv?.canGoForward();
  }

  btnBack.addEventListener('click', goBack);
  btnForward.addEventListener('click', goForward);
  btnReload.addEventListener('click', reload);

  // Error overlay buttons
  btnErrorCatalog.addEventListener('click', () => {
    const err = activeTabId ? tabErrors.get(activeTabId) : null;
    if (err) {
      const domain = PunyUtil.extractDomain(err.url);
      const name = domain.replace(/\.[^.]+$/, '');
      Sidebar.open();
      Sidebar.showPanel('oracle');
      Oracle.clear();
      document.getElementById('oracleInput').value = name;
      Oracle.consult(name);
    }
    hideError();
  });

  btnErrorProceed.addEventListener('click', () => {
    const err = activeTabId ? tabErrors.get(activeTabId) : null;
    if (err) {
      hideError();
      const wv = getActiveWebview();
      if (wv) wv.src = err.url;
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  return {
    createWebview,
    activateWebview,
    destroyWebview,
    navigate,
    goBack,
    goForward,
    reload,
    getCurrentUrl,
    getActiveWebview,
  };
})();
