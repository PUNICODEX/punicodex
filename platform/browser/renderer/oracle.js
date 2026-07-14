/**
 * PUNYCODEX — The Oracle
 * Consult the Canon of 891 names. Works even when the Oracle is silent.
 */

const _Oracle = (function () {
  const input = document.getElementById('oracleInput');
  const resultsEl = document.getElementById('oracleResults');
  const panel = document.getElementById('oraclePanel');

  let debounceTimer = null;
  let lastResults = [];

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      consult(input.value.trim());
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.blur();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // CONSULT THE CANON (offline first)
  // ═══════════════════════════════════════════════════════════

  function looksLikeQuestion(query) {
    return /^(who|what|where|when|why|how|which|is|are|was|were|tell me|explain|describe|what does|meaning of|etymology of|pronunciation of|mythology of)/i.test(
      query.trim()
    );
  }

  async function consult(query) {
    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }

    resultsEl.innerHTML =
      '<div class="sidebar-empty" style="padding:2rem 1rem;font-size:0.85rem;">Consulting the Oracle...</div>';

    // Question-shaped queries go to the /api/oracle RAG endpoint.
    if (looksLikeQuestion(query)) {
      try {
        const apiRes = await window.punycodex.apiGet(`/api/oracle/?q=${encodeURIComponent(query)}`);
        if (apiRes.ok && apiRes.data) {
          lastResults = [];
          renderOracleAnswer(apiRes.data);
          return;
        }
      } catch (_apiErr) {
        // Fall through to local name search if Oracle is unreachable.
      }
    }

    try {
      // Always search the local Canon first (works offline)
      const local = await window.punycodex.lexiconSearch(query);

      // Attempt to enrich with server data (availability, sites)
      let enriched = local;
      try {
        const apiRes = await window.punycodex.apiGet(
          `/api/search/?q=${encodeURIComponent(query)}&limit=20`
        );
        if (apiRes.ok && apiRes.data.entries) {
          // Merge server data into local results
          const serverMap = new Map(apiRes.data.entries.map((e) => [e.id, e]));
          enriched = local.map((e) => {
            const s = serverMap.get(e.id);
            return s ? { ...e, site: s.site, availability: s.availability } : e;
          });
        }
      } catch (_apiErr) {
        // Server silent — local data is still valid
      }

      lastResults = enriched;
      renderResults(enriched);
    } catch (_e) {
      resultsEl.innerHTML =
        '<div class="sidebar-empty" style="padding:2rem 1rem;font-size:0.85rem;">The Oracle cannot be reached.</div>';
    }
  }

  function renderResults(entries) {
    if (entries.length === 0) {
      resultsEl.innerHTML =
        '<div class="sidebar-empty" style="padding:2rem 1rem;font-size:0.85rem;">No names found in the Canon.</div>';
      return;
    }

    let html = '';
    let currentPantheon = '';

    entries.forEach((entry) => {
      if (entry.pantheon !== currentPantheon) {
        currentPantheon = entry.pantheon;
        html += `<div class="oracle-pantheon">${escapeHtml(capitalize(currentPantheon.replace(/-/g, ' ')))}</div>`;
      }

      const hasSite = !!entry.site;
      const isAvailable = !hasSite && !!entry.availability;
      const statusClass = hasSite ? 'live' : isAvailable ? 'available' : 'unclaimed';
      const statusText = hasSite ? 'Consecrated' : isAvailable ? 'Unclaimed' : 'Unknown';

      html += `
        <div class="oracle-row" data-id="${escapeHtml(entry.id)}">
          <div>
            <div class="or-name">${escapeHtml(entry.unicode)}</div>
            ${entry.greek && entry.greek !== '—' ? `<div class="or-greek">${escapeHtml(entry.greek)}</div>` : ''}
            <div class="or-meta">${escapeHtml(entry.meaning || '')}</div>
          </div>
          <div style="text-align:right;">
            <div class="or-status ${statusClass}">${statusText}</div>
            ${entry.tierLabel ? `<div style="font-size:0.6rem;color:var(--ink-faint);margin-top:0.2rem;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(entry.tierLabel)}</div>` : ''}
          </div>
        </div>
      `;
    });

    resultsEl.innerHTML = html;

    resultsEl.querySelectorAll('.oracle-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        const entry = lastResults.find((e) => e.id === id);
        if (entry) onOracleSelect(entry);
      });
    });
  }

  function renderOracleAnswer(data) {
    let html = '';

    if (data.answer) {
      html += `<div class="oracle-qa-answer">${linkifyAnswer(escapeHtml(data.answer))}</div>`;
    }

    if (data.citations?.length) {
      html += `<div class="oracle-qa-sources-title">Sources</div>`;
      html += `<div class="oracle-qa-sources">`;
      for (const c of data.citations) {
        const isExternal = c.url?.startsWith('http');
        html += `<a href="${escapeHtml(c.url)}" class="oracle-qa-source" ${isExternal ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(c.label)}</a>`;
      }
      html += `</div>`;
    }

    if (data.followUps?.length) {
      html += `<div class="oracle-qa-followups-title">Follow-ups</div>`;
      html += `<div class="oracle-qa-followups">`;
      for (const f of data.followUps) {
        html += `<button class="oracle-qa-followup" data-q="${escapeHtml(f)}">${escapeHtml(f)}</button>`;
      }
      html += `</div>`;
    }

    resultsEl.innerHTML =
      html ||
      '<div class="sidebar-empty" style="padding:2rem 1rem;font-size:0.85rem;">The Oracle has no answer for that yet.</div>';

    resultsEl.querySelectorAll('.oracle-qa-followup').forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.q;
        consult(btn.dataset.q);
      });
    });
  }

  function linkifyAnswer(text) {
    let out = text.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`);
    out = out.replace(
      /\[(.+?)\]\((.+?)\)/g,
      (_, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`
    );
    return out;
  }

  async function onOracleSelect(entry) {
    const hasSite = !!entry.site;

    if (hasSite && entry.site.punycode) {
      WebviewManager.navigate(`https://${entry.site.punycode}`);
      return;
    }

    // Try to load full entry from local Canon
    try {
      const localEntry = await window.punycodex.lexiconEntry(entry.id);
      if (localEntry) {
        Sidebar.load(localEntry);
        Sidebar.showPanel('record');
        return;
      }
    } catch (_e) {
      /* fall through */
    }

    // Fallback: use the search result entry directly
    Sidebar.load(entry);
    Sidebar.showPanel('record');
  }

  // ═══════════════════════════════════════════════════════════
  // PANEL CONTROL
  // ═══════════════════════════════════════════════════════════

  function show() {
    panel.classList.remove('hidden');
  }

  function hide() {
    panel.classList.add('hidden');
  }

  function clear() {
    input.value = '';
    resultsEl.innerHTML = '';
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

  function capitalize(str) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return { show, hide, clear, consult };
})();
