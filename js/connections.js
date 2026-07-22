(function () {
  'use strict';

  const { buildDomainPieTree, getDomainDeities, escapeHtml, capitalize } =
    typeof PX_CONNECTIONS_HELPERS !== 'undefined'
      ? PX_CONNECTIONS_HELPERS
      : require('./connections-helpers.js');

  // Canonical source: type/js/pantheon-meta.js (loaded as a browser global
  // before this script). Never re-declare the map here.
  const PANTHEON_COLORS = Object.fromEntries(
    Object.entries(PANTHEON_META).map(([id, meta]) => [id, meta.color])
  );

  const state = {
    taxonomy: null,
    similarities: { nodes: [], edges: [] },
    nodesById: new Map(),
    selectedDomain: null,
    selectedDeity: null,
    pieTree: null,
    pieLayout: [],
    width: 0,
    height: 0,
    radius: 0,
  };

  const els = {
    svg: d3.select('#graph-svg'),
    stage: document.getElementById('connections-stage'),
    graphWrap: document.getElementById('graph-wrap'),
    loading: document.getElementById('graph-loading'),
    error: document.getElementById('graph-error'),
    tooltip: document.getElementById('graph-tooltip'),
    tooltipTitle: document.getElementById('tooltip-title'),
    tooltipMeta: document.getElementById('tooltip-meta'),
    tooltipRel: document.getElementById('tooltip-rel'),
    searchInput: document.getElementById('node-search'),
    searchResults: document.getElementById('search-results'),
    searchWrap: document.querySelector('.search-wrap'),
    resetBtn: document.getElementById('reset-view'),
    randomBtn: document.getElementById('random-deity'),
    detailPanel: document.getElementById('detail-panel-inner'),
    legend: document.getElementById('graph-legend'),
    domainDrawer: document.getElementById('domain-drawer'),
    domainGrid: document.getElementById('domain-grid'),
    stageHeader: document.getElementById('stage-header'),
    stageBack: document.getElementById('stage-back'),
    stageDomain: document.getElementById('stage-domain'),
    downloadGraph: document.getElementById('download-graph'),
    graphMeta: document.getElementById('graph-meta'),
  };

  function setError(message) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = message;
  }

  function clearError() {
    els.error.hidden = true;
    els.loading.hidden = false;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${text ? ': ' + text : ''}`);
    }
    return res.json();
  }

  function measureGraph() {
    const rect = els.graphWrap.getBoundingClientRect();
    state.width = Math.max(300, rect.width);
    state.height = Math.max(320, rect.height);
    state.radius = Math.min(state.width, state.height) / 2 - 48;
    els.svg.attr('width', state.width).attr('height', state.height);
  }

  async function loadData() {
    clearError();
    els.loading.hidden = false;
    try {
      const [taxData, simData] = await Promise.all([
        fetchJSON('/api/v1/connections/taxonomy/'),
        fetchJSON('/api/v1/similarities/'),
      ]);
      state.taxonomy = taxData?.data || taxData;
      state.similarities = simData?.data || simData;
      state.nodesById = new Map(state.similarities.nodes.map((n) => [n.id, n]));
      els.loading.hidden = true;
      renderDomainDrawer();
      renderDataMeta();
      selectDomainFromHash();
    } catch (err) {
      console.error('Failed to load connection data:', err);
      setError(`Could not load the atlas: ${err.message}`);
    }
  }

  function pantheonColor(p) {
    return PANTHEON_COLORS[p] || '#999';
  }

  function renderDomainDrawer() {
    if (!state.taxonomy?.domains) return;
    const domains = Object.values(state.taxonomy.domains).sort((a, b) => a.order - b.order);

    els.domainGrid.innerHTML = domains
      .map((d) => {
        const count = getDomainDeityCount(d.id);
        return `
          <article class="domain-card" data-domain="${d.id}" style="--domain-color: ${d.color}">
            <h3 class="domain-card-title">${escapeHtml(d.label)}</h3>
            <p class="domain-card-count">${count} being${count === 1 ? '' : 's'}</p>
            <p class="domain-card-description">${escapeHtml(d.description || '')}</p>
          </article>
        `;
      })
      .join('');

    els.domainGrid.querySelectorAll('.domain-card').forEach((card) => {
      card.addEventListener('click', () => selectDomain(card.dataset.domain));
    });
  }

  function getDomainDeityCount(domainId) {
    const deities = getDomainDeities(domainId, state.similarities.edges, state.nodesById, state.taxonomy);
    return deities.length;
  }

  function showStage() {
    els.stage.classList.remove('is-hidden');
    els.domainDrawer.classList.add('is-hidden');
  }

  function showDrawer() {
    els.stage.classList.add('is-hidden');
    els.domainDrawer.classList.remove('is-hidden');
  }

  function selectDomain(domainId) {
    if (!domainId || !state.taxonomy?.domains?.[domainId]) return;
    state.selectedDomain = domainId;
    state.selectedDeity = null;
    state.pieTree = buildDomainPieTree(domainId, state.similarities.edges, state.nodesById, state.taxonomy);
    state.pieLayout = state.pieTree ? layoutPie(state.pieTree, state.radius) : [];

    const domain = state.taxonomy.domains[domainId];
    if (els.stageDomain) els.stageDomain.textContent = domain?.label || '';
    showStage();
    renderGraph();
    renderDetailPanel();
    updateURL();
  }

  function clearDomain() {
    state.selectedDomain = null;
    state.selectedDeity = null;
    state.pieTree = null;
    state.pieLayout = [];
    showDrawer();
    els.svg.selectAll('*').remove();
    renderDetailPanel();
    updateURL();
  }

  function selectDeity(deityId) {
    if (!state.nodesById.has(deityId)) return;
    state.selectedDeity = deityId;
    renderGraph();
    renderDetailPanel();
  }

  function updateURL() {
    if (state.selectedDeity) {
      history.replaceState(null, '', `#${state.selectedDomain}/${state.selectedDeity}`);
    } else if (state.selectedDomain) {
      history.replaceState(null, '', `#${state.selectedDomain}`);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  function selectDomainFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    if (!hash) return;
    const [domainId, deityId] = hash.split('/');
    if (domainId && state.taxonomy?.domains?.[domainId]) {
      selectDomain(domainId);
      if (deityId && state.nodesById.has(deityId)) {
        selectDeity(deityId);
      }
    }
  }

  function layoutPie(tree, radius) {
    if (!tree) return [];
    const nodes = [];
    const totalAngle = 2 * Math.PI;

    function addNode(node, depth, ancestors, x0, x1, y0, y1) {
      nodes.push({ ...node, depth, ancestors, x0, x1, y0, y1 });
    }

    addNode(tree, 0, [], 0, totalAngle, 0, 0);

    const domain = tree.children[0];
    addNode(domain, 1, [tree.id], 0, totalAngle, 0, radius * 0.22);

    const pantheons = domain.children || [];
    const pantheonCount = pantheons.length;
    const pantheonSector = totalAngle / pantheonCount;
    const pantheonInner = radius * 0.24;
    const pantheonOuter = radius * 0.48;

    pantheons.forEach((p, i) => {
      const start = i * pantheonSector + 0.01;
      const end = (i + 1) * pantheonSector - 0.01;
      addNode(p, 2, [tree.id, domain.id], start, end, pantheonInner, pantheonOuter);

      const deities = p.children || [];
      const deitySector = (end - start) / Math.max(1, deities.length);
      const deityInner = radius * 0.5;
      const deityOuter = radius * 0.9;

      deities.forEach((d, j) => {
        const dStart = start + j * deitySector + 0.005;
        const dEnd = start + (j + 1) * deitySector - 0.005;
        addNode(d, 3, [tree.id, domain.id, p.id], dStart, dEnd, deityInner, deityOuter);
      });
    });

    return nodes;
  }

  function renderGraph() {
    measureGraph();
    els.svg.selectAll('*').remove();

    if (!state.pieTree) return;

    // Re-layout with current radius.
    state.pieLayout = layoutPie(state.pieTree, state.radius);

    const cx = state.width / 2;
    const cy = state.height / 2;
    const g = els.svg.append('g').attr('transform', `translate(${cx},${cy})`);

    const arcGen = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .cornerRadius(2);

    const layout = state.pieLayout;

    // Arcs.
    g.selectAll('path.sunburst-arc')
      .data(layout.filter((d) => d.type !== 'root' && d.type !== 'domain'), (d) => d.id)
      .join('path')
      .attr('class', (d) => `sunburst-arc ${d.type}-arc`)
      .attr('d', arcGen)
      .attr('fill', (d) => (d.type === 'pantheon' ? pantheonColor(d.pantheon) : pantheonColor(d.pantheon)))
      .attr('fill-opacity', (d) => (d.type === 'pantheon' ? 0.45 : 0.85))
      .attr('data-id', (d) => d.id)
      .attr('data-type', (d) => d.type)
      .on('mouseenter', (event, d) => {
        showTooltip(event, d);
        highlightPie(d);
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', () => {
        hideTooltip();
        clearHighlight();
      })
      .on('click', (_event, d) => {
        if (d.type === 'deity') selectDeity(d.id);
      });

    // Labels for pantheon arcs.
    g.selectAll('text.pantheon-label')
      .data(layout.filter((d) => d.type === 'pantheon' && d.x1 - d.x0 > 0.15), (d) => d.id)
      .join('text')
      .attr('class', 'sunburst-label pantheon-label')
      .attr('transform', (d) => {
        const centroid = arcGen.centroid(d);
        return `translate(${centroid[0]},${centroid[1]})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text((d) => d.name);

    // Labels for deity arcs.
    g.selectAll('text.deity-label')
      .data(layout.filter((d) => d.type === 'deity' && d.x1 - d.x0 > 0.08), (d) => d.id)
      .join('text')
      .attr('class', 'sunburst-label deity-label')
      .attr('transform', (d) => {
        const centroid = arcGen.centroid(d);
        const angle = (d.x0 + d.x1) / 2;
        const deg = (angle * 180) / Math.PI - 90;
        return `translate(${centroid[0]},${centroid[1]}) rotate(${deg > 90 || deg < -90 ? deg + 180 : deg})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text((d) => d.name);

    // Center label.
    const domainNode = state.taxonomy.domains[state.selectedDomain];
    g.append('text').attr('class', 'pie-center-label').attr('x', 0).attr('y', -6).text(domainNode?.label || '');
    g.append('text')
      .attr('class', 'pie-center-sublabel')
      .attr('x', 0)
      .attr('y', 10)
      .text('select a being');

    // Highlight selected deity.
    if (state.selectedDeity) {
      els.svg
        .selectAll('.sunburst-arc')
        .classed('dimmed', (d) => d.type === 'deity' && d.id !== state.selectedDeity)
        .classed('highlight', (d) => d.type === 'deity' && d.id === state.selectedDeity);
    }

    renderLegend();
  }

  function highlightPie(d) {
    if (d.type === 'pantheon') {
      els.svg.selectAll('.sunburst-arc').classed('dimmed', (n) => n.pantheon !== d.pantheon);
      els.svg.selectAll('.sunburst-arc').classed('highlight', (n) => n.pantheon === d.pantheon);
    } else if (d.type === 'deity') {
      els.svg.selectAll('.sunburst-arc').classed('dimmed', (n) => n.id !== d.id);
      els.svg.selectAll('.sunburst-arc').classed('highlight', (n) => n.id === d.id);
    }
  }

  function clearHighlight() {
    if (state.selectedDeity) {
      els.svg
        .selectAll('.sunburst-arc')
        .classed('dimmed', (d) => d.type === 'deity' && d.id !== state.selectedDeity)
        .classed('highlight', (d) => d.type === 'deity' && d.id === state.selectedDeity);
    } else {
      els.svg.selectAll('.sunburst-arc').classed('dimmed', false).classed('highlight', false);
    }
  }

  function showTooltip(event, d) {
    els.tooltip.hidden = false;
    if (d.type === 'pantheon') {
      els.tooltipTitle.textContent = d.name;
      const count = d.children?.length || 0;
      els.tooltipMeta.textContent = `${count} being${count === 1 ? '' : 's'}`;
      els.tooltipRel.textContent = 'Click a being to view details';
    } else {
      els.tooltipTitle.textContent = d.name;
      els.tooltipMeta.textContent = d.data?.pantheonLabel || capitalize(d.pantheon);
      const concept = d.concept || state.taxonomy?.concepts?.[getConceptFromHelpers(d.data?.relationship)?.id];
      const conceptLabel = concept?.label || d.data?.relationship;
      els.tooltipRel.textContent = conceptLabel ? `Linked via ${conceptLabel}` : 'Click to view details';
    }
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const rect = els.graphWrap.getBoundingClientRect();
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top + 14;
    els.tooltip.style.left = `${Math.min(x, rect.width - 220)}px`;
    els.tooltip.style.top = `${Math.min(y, rect.height - 100)}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function renderLegend() {
    if (!state.pieTree) {
      els.legend.innerHTML = '<span class="legend-title">Pantheons</span>';
      return;
    }
    const pantheons = state.pieTree.children[0].children.map((p) => p.pantheon).sort();
    els.legend.innerHTML =
      '<span class="legend-title">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${pantheonColor(p)}"></span><span>${capitalize(p)}</span></div>`,
        )
        .join('');
  }

  function renderDataMeta() {
    if (!els.graphMeta) return;
    const meta = state.similarities?.meta || {};
    const nodeCount = state.similarities?.nodes?.length || meta.nodeCount || 0;
    const edgeCount = state.similarities?.edges?.length || meta.edgeCount || 0;
    const generated = meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString() : null;
    const parts = [
      `${nodeCount.toLocaleString()} nodes`,
      `${edgeCount.toLocaleString()} edges`,
      generated ? `last generated ${generated}` : null,
    ].filter(Boolean);
    els.graphMeta.textContent = parts.join(' · ');
  }

  async function downloadGraphJSON() {
    try {
      const data = await fetchJSON('/api/v1/similarities/');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'punicodex-similarities.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download graph:', err);
      alert('Could not download graph. Please try again.');
    }
  }

  async function renderDetailPanel() {
    if (!state.selectedDeity) {
      if (!state.selectedDomain) {
        els.detailPanel.innerHTML = `
          <div class="detail-empty">
            <div class="detail-empty-icon">&#x2964;</div>
            <p class="body-md">Select a domain to begin exploring cross-cultural connections.</p>
          </div>
        `;
      } else {
        const domain = state.taxonomy.domains[state.selectedDomain];
        const deities = getDomainDeities(state.selectedDomain, state.similarities.edges, state.nodesById, state.taxonomy);
        els.detailPanel.innerHTML = `
          <div class="detail-card">
            <button class="domain-back" id="domain-back" type="button">← Choose another domain</button>
            <div class="detail-header" style="border-bottom:none; padding-bottom:0; margin-bottom:0">
              <h2 class="detail-title" style="font-size:1.8rem">${escapeHtml(domain.label)}</h2>
              <p class="detail-domain">${escapeHtml(domain.description || '')}</p>
            </div>
          </div>
          <h3 class="detail-section-title">Beings in this domain</h3>
          <div class="deity-chips">
            ${deities
              .map(
                (d) => `
              <button class="deity-chip" data-deity-id="${d.id}" type="button">
                <span class="deity-chip-swatch" style="background:${pantheonColor(d.pantheon)}"></span>
                <span>${escapeHtml(d.unicode)}</span>
              </button>
            `,
              )
              .join('')}
          </div>
        `;
      }
      wireDetailClicks();
      return;
    }

    const node = state.nodesById.get(state.selectedDeity);
    if (!node) return;

    let entry = null;
    try {
      const res = await fetchJSON(`/api/v1/names/${encodeURIComponent(node.id)}`);
      entry = res?.data || res;
    } catch (err) {
      console.error('Failed to load entry detail:', err);
    }

    const script = entry?.originalScript || {};
    const variants = (entry?.variants || []).slice(0, 4);
    const relatedConcepts = getDeityConcepts(node.id);

    els.detailPanel.innerHTML = `
      <button class="domain-back" id="domain-back" type="button">← ${escapeHtml(state.taxonomy.domains[state.selectedDomain]?.label || 'Domain')}</button>
      <div class="detail-card">
        <div class="detail-header">
          <span class="detail-pantheon" style="color:${pantheonColor(node.pantheon)}">${escapeHtml(node.pantheonLabel || capitalize(node.pantheon))}</span>
          <h2 class="detail-title">${escapeHtml(node.unicode)}</h2>
          <p class="detail-domain">${escapeHtml(node.domain || entry?.domain || '')}</p>
        </div>
        <div class="detail-actions">
          <a href="/sites/${node.id}/" class="btn btn-primary btn-sm">Enter Temple</a>
          <a href="/type/#${node.id}" class="btn btn-outline btn-sm">Type Tool</a>
          <a href="/api/v1/names/${node.id}" class="btn btn-outline btn-sm">API Record</a>
        </div>
        <p class="detail-description">${escapeHtml(entry?.meaning || `Explore ${node.unicode} across traditions.`)}</p>

        <div class="detail-explore">
          <span class="detail-section-title">Explore</span>
          <div class="detail-explore-links">
            <a href="/oracle.html?q=${encodeURIComponent(node.unicode)}" class="detail-explore-link">
              <span class="detail-explore-icon">&#x25C8;</span>
              <span>Ask the Oracle</span>
            </a>
            <a href="/sites/${node.id}/scholars/" class="detail-explore-link">
              <span class="detail-explore-icon">&#x270E;</span>
              <span>Scholarly Edition</span>
            </a>
            <a href="/game/" class="detail-explore-link">
              <span class="detail-explore-icon">&#x2618;</span>
              <span>Card Game</span>
            </a>
          </div>
        </div>
      </div>

      <div class="detail-card">
        <h3 class="detail-section-title">Details</h3>
        <ul class="detail-meta-list">
          ${script.script ? `
            <li class="detail-meta-item">
              <span class="detail-meta-label">Original Script</span>
              <span class="detail-meta-value detail-script">${escapeHtml(script.script)}</span>
              ${script.label ? `<span class="detail-meta-value" style="font-size:0.8rem; color:var(--text-dim)">${escapeHtml(script.label)}</span>` : ''}
            </li>
          ` : ''}
          ${entry?.tier ? `
            <li class="detail-meta-item">
              <span class="detail-meta-label">Tier</span>
              <span class="detail-meta-value">${escapeHtml(String(entry.tier))}</span>
            </li>
          ` : ''}
          ${entry?.pantheon ? `
            <li class="detail-meta-item">
              <span class="detail-meta-label">Pantheon</span>
              <span class="detail-meta-value">${escapeHtml(entry.pantheonLabel || capitalize(entry.pantheon))}</span>
            </li>
          ` : ''}
          ${variants.length ? `
            <li class="detail-meta-item">
              <span class="detail-meta-label">Variants</span>
              <span class="detail-meta-value">${variants.map((v) => escapeHtml(v.unicode || v)).join(' · ')}</span>
            </li>
          ` : ''}
        </ul>
      </div>

      ${relatedConcepts.length ? `
        <div class="detail-card">
          <h3 class="detail-section-title">Related concepts in ${escapeHtml(state.taxonomy.domains[state.selectedDomain]?.label || 'this domain')}</h3>
          <div>
            ${relatedConcepts
              .map(
                (c) => `
              <span class="concept-chip" style="border-color:${state.taxonomy.domains[state.selectedDomain]?.color || 'var(--gold)'}">${escapeHtml(c.label)}</span>
            `,
              )
              .join('')}
          </div>
        </div>
      ` : ''}
    `;

    wireDetailClicks();
  }

  function getDeityConcepts(deityId) {
    if (!state.selectedDomain) return [];
    const conceptIds = new Set();
    const concepts = [];
    for (const e of state.similarities.edges) {
      if (e.source !== deityId && e.target !== deityId) continue;
      const concept = e.concept || getConceptFromHelpers(e.relationship);
      if (!concept || concept.domain !== state.selectedDomain) continue;
      if (conceptIds.has(concept.id)) continue;
      conceptIds.add(concept.id);
      concepts.push(concept);
    }
    return concepts.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getConceptFromHelpers(relationship) {
    if (!state.taxonomy) return null;
    for (const c of Object.values(state.taxonomy.concepts || {})) {
      if ((c.relationships || []).includes(relationship)) return c;
    }
    return null;
  }

  function wireDetailClicks() {
    els.detailPanel.querySelectorAll('[data-deity-id]').forEach((chip) => {
      chip.addEventListener('click', () => selectDeity(chip.dataset.deityId));
    });
    const backBtn = els.detailPanel.querySelector('#domain-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (state.selectedDeity) {
          state.selectedDeity = null;
          renderGraph();
          renderDetailPanel();
          updateURL();
        } else {
          clearDomain();
        }
      });
    }
  }

  // ─── Search ───
  let searchAbort = null;
  function closeSearch() {
    els.searchResults.classList.remove('is-open');
    els.searchResults.innerHTML = '';
  }

  async function performSearch(q) {
    if (!q || q.length < 2) {
      closeSearch();
      return;
    }
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try {
      const data = await fetch(`/api/v1/autocomplete/?q=${encodeURIComponent(q)}&limit=8`, {
        signal: searchAbort.signal,
      }).then((r) => r.json());
      const items = data?.data?.items || data?.items || [];
      renderSearchResults(items);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Search error:', err);
    }
  }

  function renderSearchResults(items) {
    if (!items.length) {
      closeSearch();
      return;
    }
    els.searchResults.innerHTML = items
      .map(
        (item) => `
      <div class="search-result-item" data-id="${item.id}" role="option">
        <span class="search-result-name">${escapeHtml(item.unicode)}</span>
        <span class="search-result-meta">${escapeHtml(item.pantheonLabel || item.pantheon || '')}</span>
      </div>
    `,
      )
      .join('');
    els.searchResults.classList.add('is-open');

    els.searchResults.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        els.searchInput.value = '';
        closeSearch();
        openDeityBySearch(id);
      });
    });
  }

  async function openDeityBySearch(id) {
    // Find which domain(s) this deity belongs to.
    const domains = new Set();
    for (const e of state.similarities.edges) {
      if (e.source !== id && e.target !== id) continue;
      const concept = e.concept || getConceptFromHelpers(e.relationship);
      if (concept) domains.add(concept.domain);
    }
    const domainId = domains.size ? Array.from(domains)[0] : state.selectedDomain;
    if (domainId && state.taxonomy?.domains?.[domainId]) {
      selectDomain(domainId);
    }
    selectDeity(id);
  }

  const debouncedSearch = debounce((q) => performSearch(q), 180);

  els.searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.search-wrap')) return;
    closeSearch();
  });

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ─── Toolbar actions ───
  els.resetBtn.addEventListener('click', clearDomain);
  if (els.stageBack) els.stageBack.addEventListener('click', clearDomain);
  if (els.downloadGraph) els.downloadGraph.addEventListener('click', downloadGraphJSON);

  // ─── Keyboard shortcuts ───
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (e.target.matches('input, textarea, select')) return;
    if (els.searchResults.classList.contains('is-open')) {
      closeSearch();
      return;
    }
    if (state.selectedDomain) {
      e.preventDefault();
      clearDomain();
    }
  });

  els.randomBtn.addEventListener('click', () => {
    const deities = state.similarities.nodes.filter((n) => n.id);
    if (!deities.length) return;
    const idx = Math.floor(Math.random() * deities.length);
    openDeityBySearch(deities[idx].id);
  });

  // ─── Resize ───
  const resizeObserver = new ResizeObserver(() => {
    if (state.pieTree) renderGraph();
  });
  resizeObserver.observe(els.graphWrap);

  // ─── Init ───
  loadData();

  // Expose for tests/debug.
  window.PX_CONNECTIONS = { state, selectDomain, selectDeity, clearDomain };
})();
