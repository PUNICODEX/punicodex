/**
 * PUNYCODEX Browser Shell — Tab/omnibox/sidebar primitives.
 * Used by platform/public/browser.html and can be wired into any page.
 */
(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    history: 'punycodex_browser_history',
    saved: 'punycodex_browser_saved',
    workspaces: 'punycodex_workspaces',
  };

  function resolveInput(input) {
    const trimmed = input.trim();
    if (!trimmed) return 'about:newtab';
    if (trimmed === 'about:newtab') return trimmed;
    if (/^(https?:\/\/|xn--)/i.test(trimmed)) return trimmed;
    if (/^[a-z0-9][\w\-\.]*\.[a-z]{2,}$/i.test(trimmed)) return `https://${trimmed}`;
    if (trimmed.startsWith('/')) return trimmed;
    return `/search-v2.html?q=${encodeURIComponent(trimmed)}`;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]'); } catch { return []; }
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 50)));
  }

  function recordHistory(url) {
    const list = [url, ...loadHistory().filter((h) => h !== url)];
    saveHistory(list);
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || '[]'); } catch { return []; }
  }

  function saveSaved(items) {
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(items));
  }

  function addSaved(title, url) {
    const items = loadSaved().filter((i) => i.url !== url);
    items.unshift({ title, url, createdAt: Date.now() });
    saveSaved(items);
  }

  function removeSaved(url) {
    const items = loadSaved().filter((i) => i.url !== url);
    saveSaved(items);
  }

  function loadWorkspaces() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.workspaces) || '[]'); } catch { return []; }
  }

  function saveWorkspaces(list) {
    localStorage.setItem(STORAGE_KEYS.workspaces, JSON.stringify(list));
  }

  global.PunyBrowser = {
    resolveInput,
    recordHistory,
    loadHistory,
    clearHistory: () => { localStorage.removeItem(STORAGE_KEYS.history); },
    loadSaved,
    addSaved,
    removeSaved,
    loadWorkspaces,
    saveWorkspaces,
    STORAGE_KEYS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
