/**
 * PUNYCODEX Workspaces — save/restore/share named tab groups.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'punycodex_workspaces';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function create(name, tabs) {
    const list = load().filter((w) => w.name !== name);
    list.unshift({ name, tabs, createdAt: Date.now() });
    save(list);
    return list;
  }

  function remove(name) {
    const list = load().filter((w) => w.name !== name);
    save(list);
    return list;
  }

  function get(name) {
    return load().find((w) => w.name === name);
  }

  function shareUrl(name) {
    const url = new URL(location.href);
    url.searchParams.set('workspace', name);
    return url.toString();
  }

  global.PunyWorkspaces = { load, save, create, remove, get, shareUrl };
})(typeof window !== 'undefined' ? window : globalThis);
