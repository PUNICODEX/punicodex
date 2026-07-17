/**
 * PUNICODEX Badges — display and notification helper.
 */
(function (global) {
  'use strict';

  function notify(badge) {
    const el = document.createElement('div');
    el.className = 'pcd-badge-toast';
    el.innerHTML = `<span class="pcd-badge-icon">${badge.icon}</span><div><strong>${badge.title}</strong><div>${badge.description}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 50);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4000);
  }

  function renderGrid(container, badges, definitions) {
    container.innerHTML = definitions.map((def) => {
      const owned = badges.some((b) => b.id === def.id);
      return `<div class="pcd-badge-card ${owned ? 'owned' : 'locked'}">
        <div class="pcd-badge-icon">${def.icon}</div>
        <div class="pcd-badge-title">${def.title}</div>
        <div class="pcd-badge-desc">${def.description}</div>
      </div>`;
    }).join('');
  }

  global.PunyBadges = { notify, renderGrid };
})(typeof window !== 'undefined' ? window : globalThis);
