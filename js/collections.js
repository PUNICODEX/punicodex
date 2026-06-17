/**
 * PUNYCODEX Collections — predefined pantheon/theme completion tracking.
 */
(function (global) {
  'use strict';

  const COLLECTIONS = [
    { id: 'greek-gods', name: 'Greek Gods', pantheon: 'greek' },
    { id: 'norse-realms', name: 'Norse Realms', pantheon: 'norse' },
    { id: 'egyptian-powers', name: 'Egyptian Powers', pantheon: 'egyptian' },
  ];

  async function load(apiUrl, sessionToken) {
    const res = await fetch(apiUrl, { headers: { 'x-session-token': sessionToken } });
    const data = await res.json();
    return { collections: COLLECTIONS, readingList: data.readingList || [] };
  }

  function progress(collection, visitedIds) {
    // Placeholder: in a real implementation we'd count all entries in the pantheon.
    return { total: 20, collected: visitedIds.filter((id) => true).length };
  }

  function render(container, state, visitedIds) {
    container.innerHTML = state.collections.map((c) => {
      const p = progress(c, visitedIds);
      const pct = Math.round((p.collected / p.total) * 100);
      return `<div class="pcd-collection">
        <div class="pcd-collection-name">${c.name}</div>
        <div class="pcd-collection-bar"><span style="width:${pct}%"></span></div>
        <div class="pcd-collection-count">${p.collected}/${p.total}</div>
      </div>`;
    }).join('');
  }

  global.PunyCollections = { load, render, COLLECTIONS };
})(typeof window !== 'undefined' ? window : globalThis);
