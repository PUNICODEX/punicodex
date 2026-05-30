/**
 * PUNYCODEX — Temple Record
 * The illuminated manuscript panel. Reveals philology from the Canon.
 */

const Sidebar = (function() {
  const sidebar = document.getElementById('domainSidebar');
  const content = document.getElementById('sidebarContent');
  const btnSidebar = document.getElementById('btnSidebar');
  const btnClose = document.getElementById('btnCloseSidebar');
  const oraclePanel = document.getElementById('oraclePanel');
  const recordPanel = document.getElementById('recordPanel');
  const sidebarTitle = document.getElementById('sidebarTitle');

  let isOpen = false;

  btnSidebar.addEventListener('click', toggle);
  btnClose.addEventListener('click', close);

  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    sidebar.classList.remove('collapsed');
    btnSidebar.classList.add('active');
    isOpen = true;
  }

  function close() {
    sidebar.classList.add('collapsed');
    btnSidebar.classList.remove('active');
    isOpen = false;
  }

  function showPanel(name) {
    if (name === 'oracle') {
      oraclePanel.classList.remove('hidden');
      recordPanel.classList.add('hidden');
      sidebarTitle.textContent = 'The Oracle';
      Oracle.show();
    } else {
      oraclePanel.classList.add('hidden');
      recordPanel.classList.remove('hidden');
      sidebarTitle.textContent = 'Temple Record';
      Oracle.hide();
    }
  }

  function clear() {
    content.innerHTML = '<div class="sidebar-empty">Navigate to a sanctified Unicode domain to reveal its record.</div>';
    showPanel('oracle');
    close();
  }

  // ═══════════════════════════════════════════════════════════
  // LOAD TEMPLE RECORD (offline first, server-enriched)
  // ═══════════════════════════════════════════════════════════

  async function load(entry) {
    // Ensure we have the full entry from the local Canon
    let fullEntry = entry;
    if (!entry.breakdown || entry.breakdown.length === 0) {
      try {
        const local = await window.punycodex.lexiconEntry(entry.id);
        if (local) fullEntry = { ...entry, ...local };
      } catch (e) { /* use passed entry */ }
    }

    // Try to enrich with server data (site info, availability)
    try {
      const apiRes = await window.punycodex.apiGet(`/api/entry/${encodeURIComponent(fullEntry.id)}`);
      if (apiRes.ok && apiRes.data) {
        fullEntry = { ...fullEntry, site: apiRes.data.site, availability: apiRes.data.availability };
      }
    } catch (e) { /* server silent — local data is enough */ }

    const tierClass = fullEntry.tier === 'dual' ? 'dual' : fullEntry.tier === '1' ? 'tier-1' : 'tier-2';
    const hasSite = !!fullEntry.site;
    const isAvailable = !hasSite && !!fullEntry.availability;

    let html = '';

    // Hero — monumental inscription
    html += `
      <div class="sb-hero">
        <div class="sb-hero-unicode">${escapeHtml(fullEntry.unicode)}</div>
        ${fullEntry.greek && fullEntry.greek !== '—' ? `<div class="sb-hero-greek">${escapeHtml(fullEntry.greek)}</div>` : ''}
        <div class="sb-hero-meta">
          <span class="sb-tier ${tierClass}">${escapeHtml(fullEntry.tierLabel || '')}</span>
          <span class="sb-pantheon">${escapeHtml(fullEntry.pantheon || '')}</span>
        </div>
      </div>
    `;

    // Etymology
    if (fullEntry.meaning) {
      html += `
        <div class="sb-section">
          <div class="sb-section-title">Etymology</div>
          <div class="sb-meaning">${escapeHtml(fullEntry.meaning)}</div>
        </div>
      `;
    }

    // SEO Metadata — if site exists
    if (hasSite && fullEntry.site) {
      const s = fullEntry.site;
      html += `
        <div class="sb-section">
          <div class="sb-section-title">Temple Inscription</div>
          <div class="sb-seo-block">
            ${s.title ? `<div class="sb-seo-title">${escapeHtml(s.title)}</div>` : ''}
            ${s.description ? `<div class="sb-seo-desc">${escapeHtml(s.description)}</div>` : ''}
            <div class="sb-seo-meta">
              ${s.last_crawled ? `Inscribed: ${formatDate(s.last_crawled)}` : ''}
              ${s.isFlagship ? ' · Flagship' : ''}
            </div>
          </div>
        </div>
      `;
    }

    // Character Breakdown
    if (fullEntry.breakdown && fullEntry.breakdown.length > 0) {
      html += `
        <div class="sb-section">
          <div class="sb-section-title">Character Inscription (${fullEntry.breakdown.length} glyphs)</div>
          <table class="sb-breakdown">
            <thead><tr><th>Source</th><th>Restored</th><th>Feature</th></tr></thead>
            <tbody>
              ${fullEntry.breakdown.map(b => `
                <tr>
                  <td class="sb-bd-from">${escapeHtml(b.char)}</td>
                  <td class="sb-bd-to">${escapeHtml(b.to || '—')}</td>
                  <td><span class="sb-bd-type ${escapeHtml(b.type)}">${escapeHtml(b.type)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Sources
    if (fullEntry.sources && fullEntry.sources.length > 0) {
      html += `
        <div class="sb-section">
          <div class="sb-section-title">Sources</div>
          <div class="sb-sources">
            ${fullEntry.sources.map(s => `<span class="sb-source">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Mortal Translation (punycode)
    if (fullEntry.punycode || fullEntry.ascii) {
      const domain = fullEntry.punycode || fullEntry.ascii + '.com';
      html += `
        <div class="sb-section">
          <div class="sb-section-title">Mortal Translation</div>
          <div class="sb-meaning" style="font-family:var(--font-data);font-size:0.82rem;color:var(--flame);letter-spacing:0.02em;">${escapeHtml(domain)}</div>
        </div>
      `;
    }

    // Availability / Registrar links
    if (isAvailable && fullEntry.availability) {
      const puny = fullEntry.punycode || fullEntry.ascii + '.com';
      const links = fullEntry.availability.registrar_links || {};

      html += `
        <div class="sb-section">
          <div class="sb-cta">
            <div class="sb-cta-label">Rite of Registration</div>
            <div class="sb-cta-text">This name is unclaimed. Inscribe it through a keeper of the register.</div>
            <div class="sb-cta-links">
              ${links.godaddy ? `<a href="${escapeHtml(links.godaddy)}" target="_blank" rel="noopener" class="sb-cta-link" onclick="window.punycodex.openExternal(this.href);return false;">GoDaddy</a>` : ''}
              ${links.namecheap ? `<a href="${escapeHtml(links.namecheap)}" target="_blank" rel="noopener" class="sb-cta-link" onclick="window.punycodex.openExternal(this.href);return false;">Namecheap</a>` : ''}
              ${links.porkbun ? `<a href="${escapeHtml(links.porkbun)}" target="_blank" rel="noopener" class="sb-cta-link" onclick="window.punycodex.openExternal(this.href);return false;">Porkbun</a>` : ''}
              ${links.dynadot ? `<a href="${escapeHtml(links.dynadot)}" target="_blank" rel="noopener" class="sb-cta-link" onclick="window.punycodex.openExternal(this.href);return false;">Dynadot</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
    showPanel('record');
    open();
  }

  // ═══════════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  return { load, clear, open, close, showPanel };
})();
