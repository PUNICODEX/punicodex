/**
 * PUNYCODEX — Renderer Orchestrator
 * Coordinates the Inscription Field, the viewing pool, the Temple Record,
 * and the vessel's controls.
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // WINDOW CONTROLS
  // ═══════════════════════════════════════════════════════════

  document.getElementById('winMinimize').addEventListener('click', () => {
    window.punycodex.minimize();
  });

  document.getElementById('winMaximize').addEventListener('click', () => {
    window.punycodex.maximize();
  });

  document.getElementById('winClose').addEventListener('click', () => {
    window.punycodex.close();
  });

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════

  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+L → focus inscription field
    if (ctrl && e.key === 'l') {
      e.preventDefault();
      Omnibox.focus();
      return;
    }

    // Ctrl+T → new tablet
    if (ctrl && e.key === 't') {
      e.preventDefault();
      Tabs.createTab('http://localhost:3456/search.html', true);
      return;
    }

    // Ctrl+W → close tablet
    if (ctrl && e.key === 'w') {
      e.preventDefault();
      const active = Tabs.getActiveTab();
      if (active) Tabs.closeTab(active.id);
      return;
    }

    // Ctrl+Tab → next tablet
    if (ctrl && e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const all = Tabs.tabs;
      const active = Tabs.getActiveTab();
      if (!active || all.length <= 1) return;
      const idx = all.findIndex(t => t.id === active.id);
      const next = all[(idx + 1) % all.length];
      Tabs.switchTab(next.id);
      return;
    }

    // Ctrl+Shift+Tab → previous tablet
    if (ctrl && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const all = Tabs.tabs;
      const active = Tabs.getActiveTab();
      if (!active || all.length <= 1) return;
      const idx = all.findIndex(t => t.id === active.id);
      const prev = all[(idx - 1 + all.length) % all.length];
      Tabs.switchTab(prev.id);
      return;
    }

    // Ctrl+F → find in page (active tablet only)
    if (ctrl && e.key === 'f') {
      e.preventDefault();
      const wv = WebviewManager.getActiveWebview ? WebviewManager.getActiveWebview() : null;
      if (wv && wv.findInPage) {
        const term = prompt('Inscribe a word to find within the scroll:');
        if (term) wv.findInPage(term);
      }
      return;
    }

    // Escape → stop find in page
    if (e.key === 'Escape') {
      const wv = WebviewManager.getActiveWebview ? WebviewManager.getActiveWebview() : null;
      if (wv && wv.stopFindInPage) {
        wv.stopFindInPage('clearSelection');
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SERVER HEALTH — The Oracle's flame
  // ═══════════════════════════════════════════════════════════

  const serverOverlay = document.getElementById('serverOverlay');
  const btnRetry = document.getElementById('btnRetryServer');

  async function checkServer() {
    const res = await window.punycodex.apiHealth();
    if (res.ok) {
      serverOverlay.classList.add('hidden');
    } else {
      serverOverlay.classList.remove('hidden');
    }
  }

  btnRetry.addEventListener('click', async () => {
    btnRetry.textContent = 'Rekindling...';
    btnRetry.disabled = true;
    const restartRes = await window.punycodex.serverRestart();
    if (restartRes.ok) {
      setTimeout(checkServer, 2000);
    } else {
      btnRetry.textContent = 'Rekindle the Oracle';
      btnRetry.disabled = false;
    }
  });

  if (window.punycodex.onServerDied) {
    window.punycodex.onServerDied(() => {
      serverOverlay.classList.remove('hidden');
    });
  }

  checkServer();

  setInterval(() => {
    if (!serverOverlay.classList.contains('hidden')) {
      checkServer();
    }
  }, 30000);

  window.addEventListener('focus', () => {
    checkServer();
  });

  // ═══════════════════════════════════════════════════════════
  // INIT — Kindle the tablets from the Chronicle
  // ═══════════════════════════════════════════════════════════

  async function init() {
    try {
      const savedUrls = await window.punycodex.getSession();
      if (savedUrls.length > 0) {
        savedUrls.forEach((url, i) => {
          Tabs.createTab(url, i === savedUrls.length - 1);
        });
      } else {
        Tabs.createTab('http://localhost:3456/search.html', true);
      }
    } catch (e) {
      Tabs.createTab('http://localhost:3456/search.html', true);
    }
    console.log('PUNYCODEX vessel initialized');
  }

  init();

})();
