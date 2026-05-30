/**
 * PUNYCODEX Browser — Variant Banner
 * Shows accepted scholarly spelling variants for the current domain.
 */

const VariantBanner = (function() {
  const banner = document.getElementById('variantBanner');

  function show(entry, variants) {
    const all = [entry, ...variants];
    const pills = all.map(v => {
      const isCurrent = v.id === entry.id;
      const domain = (v.unicode || v.ascii).toLowerCase() + '.com';
      return `<button class="vb-pill" data-domain="${escapeHtml(domain)}" ${isCurrent ? 'style="border-color:var(--gold);color:var(--gold);"' : ''}>${escapeHtml(v.unicode)}</button>`;
    }).join(' · ');

    banner.innerHTML = `
      <span>This name has ${all.length} accepted scholarly spellings:</span>
      ${pills}
    `;
    banner.classList.remove('hidden');

    banner.querySelectorAll('.vb-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        WebviewManager.navigate('https://' + btn.dataset.domain);
      });
    });
  }

  function hide() {
    banner.classList.add('hidden');
    banner.innerHTML = '';
  }

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { show, hide };
})();
