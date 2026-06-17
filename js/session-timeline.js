/**
 * PUNYCODEX Session Timeline — record and display recent activity.
 */
(function (global) {
  'use strict';

  const API = '/api/workspace';

  async function record(sessionToken, eventType, payload) {
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ action: 'timeline', eventType, eventPayload: payload }),
      });
    } catch (e) {
      console.error('timeline record failed', e);
    }
  }

  async function load(sessionToken) {
    const res = await fetch(API, { headers: { 'x-session-token': sessionToken } });
    if (!res.ok) throw new Error('Failed to load timeline');
    const data = await res.json();
    return data.timeline || [];
  }

  function render(container, events) {
    container.innerHTML = '';
    if (!events.length) {
      container.innerHTML = '<div style="opacity:0.6;font-size:0.8rem">No recent activity.</div>';
      return;
    }
    events.forEach((ev) => {
      const row = document.createElement('div');
      row.className = 'pcd-timeline-row';
      const payload = ev.payload || {};
      const label = payload.url || payload.query || ev.eventType;
      row.innerHTML = `<span>${escapeHtml(label)}</span><time>${new Date(ev.createdAt).toLocaleString()}</time>`;
      container.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  global.PunyTimeline = { record, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
