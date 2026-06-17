/**
 * PUNYCODEX Ink XP — frontend helper for awarding and displaying XP.
 */
(function (global) {
  'use strict';

  const API = '/api/gamification';

  async function award(sessionToken, eventType, payload) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'xp', eventType, payload }),
    });
    if (!res.ok) throw new Error('XP award failed');
    return res.json();
  }

  async function summary(sessionToken) {
    const res = await fetch(API, { headers: { 'x-session-token': sessionToken } });
    if (!res.ok) throw new Error('XP summary failed');
    return res.json();
  }

  function renderWidget(container, data) {
    container.innerHTML = `
      <div class="pcd-ink-widget">
        <div class="pcd-ink-total">${data.summary.total.toLocaleString()} Ink</div>
        <div class="pcd-ink-recent">${data.summary.recent.slice(0, 3).map((r) => `+${r.amount} ${r.event_type}`).join(' · ')}</div>
      </div>
    `;
  }

  global.PunyInk = { award, summary, renderWidget };
})(typeof window !== 'undefined' ? window : globalThis);
