/**
 * PUNYCODEX Reading List / Queue — save temples and sites for later.
 */
(function (global) {
  'use strict';

  const API = '/api/workspace/';

  async function add(item, sessionToken) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'reading-list', ...item }),
    });
    if (!res.ok) throw new Error('Failed to add to reading list');
    return res.json();
  }

  async function list(sessionToken) {
    const res = await fetch(API, { headers: { 'x-session-token': sessionToken } });
    if (!res.ok) throw new Error('Failed to load reading list');
    const data = await res.json();
    return data.readingList || [];
  }

  async function update(id, updates, sessionToken) {
    const res = await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ id, updates }),
    });
    if (!res.ok) throw new Error('Failed to update reading item');
    return res.json();
  }

  async function remove(id, sessionToken) {
    const res = await fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to remove reading item');
    return res.json();
  }

  function createButton(targetUrl, title, sessionToken) {
    const btn = document.createElement('button');
    btn.className = 'pcd-reading-list-btn';
    btn.textContent = '➕ Add to Queue';
    btn.addEventListener('click', async () => {
      try {
        await add({ url: targetUrl, title }, sessionToken);
        btn.textContent = '✓ Saved';
        btn.disabled = true;
      } catch (e) {
        console.error(e);
        btn.textContent = '⚠ Error';
      }
    });
    return btn;
  }

  global.PunyReadingList = { add, list, update, remove, createButton };
})(typeof window !== 'undefined' ? window : globalThis);
