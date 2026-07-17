/**
 * PUNICODEX Leaderboards — render anonymized leaderboards.
 */
(function (global) {
  'use strict';

  const API = '/api/gamification/?type=leaderboards';

  async function load() {
    const res = await fetch(API);
    if (!res.ok) throw new Error('Failed to load leaderboards');
    return res.json();
  }

  function renderTable(title, rows) {
    return `<div class="pcd-leaderboard">
      <h4>${title}</h4>
      <table>
        ${rows.map((r) => `<tr><td>#${r.rank}</td><td>${r.user}</td><td>${r.score.toLocaleString()}</td></tr>`).join('')}
      </table>
    </div>`;
  }

  function render(container, data) {
    container.innerHTML = `
      ${renderTable('Ink', data.ink)}
      ${renderTable('Temples Visited', data.temples)}
      ${renderTable('Pantheons Explored', data.pantheons)}
      ${renderTable('Challenge Streaks', data.streaks)}
    `;
  }

  global.PunyLeaderboards = { load, render };
})(typeof window !== 'undefined' ? window : globalThis);
