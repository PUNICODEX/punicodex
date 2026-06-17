/**
 * PUNYCODEX Command Palette — fuzzy command search with keyboard navigation.
 */
(function (global) {
  'use strict';

  function createPalette({ commands = [], onSelect } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'pcd-palette-overlay';
    overlay.innerHTML = `
      <div class="pcd-palette">
        <input type="text" class="pcd-palette-input" placeholder="Type a command…" autocomplete="off">
        <div class="pcd-palette-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pcd-palette-input');
    const resultsEl = overlay.querySelector('.pcd-palette-results');

    function render(q) {
      const lower = q.toLowerCase();
      const filtered = commands.filter((c) => c.title.toLowerCase().includes(lower));
      resultsEl.innerHTML = filtered
        .map(
          (c, i) =>
            `<div class="pcd-palette-item ${i === 0 ? 'selected' : ''}" data-index="${i}"><span>${escapeHtml(c.title)}</span><span class="pcd-palette-cmd">↵</span></div>`
        )
        .join('') || '<div class="pcd-palette-item">No commands found</div>';
    }

    function open() {
      overlay.classList.add('open');
      input.value = '';
      input.focus();
      render('');
    }

    function close() {
      overlay.classList.remove('open');
    }

    function executeSelected() {
      const selected = resultsEl.querySelector('.pcd-palette-item.selected');
      if (!selected) return;
      const idx = parseInt(selected.dataset.index, 10);
      const filtered = commands.filter((c) => c.title.toLowerCase().includes(input.value.toLowerCase()));
      if (filtered[idx]) {
        close();
        if (onSelect) onSelect(filtered[idx]);
        if (filtered[idx].action) filtered[idx].action();
      }
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); executeSelected(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...resultsEl.querySelectorAll('.pcd-palette-item')];
        const current = items.findIndex((el) => el.classList.contains('selected'));
        let next = current + (e.key === 'ArrowDown' ? 1 : -1);
        next = Math.max(0, Math.min(items.length - 1, next));
        items.forEach((el, i) => el.classList.toggle('selected', i === next));
        e.preventDefault();
      }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    return { open, close, element: overlay };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  global.PunyCommandPalette = { createPalette };
})(typeof window !== 'undefined' ? window : globalThis);
