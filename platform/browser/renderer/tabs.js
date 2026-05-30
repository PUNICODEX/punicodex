/**
 * PUNYCODEX — Votive Tablet Manager
 * Multi-tab support with per-tab webviews.
 * Each tablet is a sacred record. Switching reveals, never reloads.
 */

const Tabs = (function() {
  const container = document.getElementById('tabsContainer');
  const btnNewTab = document.getElementById('btnNewTab');

  let tabs = [];
  let activeTabId = null;
  let nextId = 1;

  const NEW_TAB_URL = 'http://localhost:3456/search.html';

  // ═══════════════════════════════════════════════════════════
  // CORE API
  // ═══════════════════════════════════════════════════════════

  function createTab(url = NEW_TAB_URL, activate = true) {
    const id = 'tab-' + nextId++;
    const tab = {
      id,
      url,
      title: url === NEW_TAB_URL ? 'The Index' : 'Empty Tablet',
      loading: false,
      canGoBack: false,
      canGoForward: false
    };
    tabs.push(tab);

    // Forge the webview for this tablet
    WebviewManager.createWebview(id, url);

    if (activate) switchTab(id);
    render();
    saveSession();
    return tab;
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const wasActive = tabs[idx].id === activeTabId;

    // Save the current active tab's URL before any destruction
    if (activeTabId) {
      const current = tabs.find(t => t.id === activeTabId);
      if (current) {
        current.url = WebviewManager.getCurrentUrl() || current.url;
      }
    }

    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      activeTabId = null;
      WebviewManager.destroyWebview(id);
      createTab(NEW_TAB_URL, true);
      return;
    }

    if (wasActive) {
      const newIdx = Math.max(0, idx - 1);
      activeTabId = tabs[newIdx].id;
      WebviewManager.activateWebview(activeTabId);
    }

    // Seal the tablet's webview after switching away
    WebviewManager.destroyWebview(id);
    render();
    saveSession();
  }

  function switchTab(id) {
    if (!tabs.find(t => t.id === id)) return;

    // Preserve the departing tablet's scroll position and state
    if (activeTabId) {
      const current = tabs.find(t => t.id === activeTabId);
      if (current) {
        current.url = WebviewManager.getCurrentUrl() || current.url;
      }
    }

    activeTabId = id;
    WebviewManager.activateWebview(id);
    render();
    saveSession();
  }

  function updateTab(id, props) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    Object.assign(tab, props);
    render();
  }

  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId) || null;
  }

  function getTabById(id) {
    return tabs.find(t => t.id === id) || null;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERING — Votive tablets
  // ═══════════════════════════════════════════════════════════

  function render() {
    container.innerHTML = '';

    tabs.forEach(tab => {
      const isActive = tab.id === activeTabId;
      const el = document.createElement('div');
      el.className = 'tab' + (isActive ? ' active' : '');
      el.dataset.id = tab.id;

      const favicon = document.createElement('span');
      favicon.className = 'tab-favicon';
      favicon.textContent = tab.loading ? '◌' : '◈';

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title || 'Summoning...';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '×';
      closeBtn.title = 'Seal tablet';

      el.appendChild(favicon);
      el.appendChild(title);
      el.appendChild(closeBtn);
      container.appendChild(el);

      el.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) return;
        switchTab(tab.id);
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // EVENT WIRING
  // ═══════════════════════════════════════════════════════════

  btnNewTab.addEventListener('click', () => {
    createTab(NEW_TAB_URL, true);
  });

  // ═══════════════════════════════════════════════════════════
  // SESSION — Sacred chronicle
  // ═══════════════════════════════════════════════════════════

  function saveSession() {
    const urls = tabs.map(t => t.url);
    if (window.punycodex && window.punycodex.saveSession) {
      window.punycodex.saveSession(urls).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  return {
    createTab,
    closeTab,
    switchTab,
    updateTab,
    getActiveTab,
    getTabById,
    get tabs() { return tabs.slice(); }
  };
})();
