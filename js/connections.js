(function () {
  'use strict';

  const {
    buildRadialHubLayout,
    getSharedConcepts,
    escapeHtml,
    capitalize,
  } =
    typeof PX_CONNECTIONS_HELPERS !== 'undefined'
      ? PX_CONNECTIONS_HELPERS
      : require('./connections-helpers.js');

  const PANTHEON_COLORS = {
    greek: '#D4AF37',
    'greek-location': '#B8860B',
    norse: '#87CEEB',
    egyptian: '#228B22',
    sanskrit: '#FF7F50',
    celtic: '#32CD32',
    mesopotamian: '#8B4513',
    polynesian: '#20B2AA',
    japanese: '#DC143C',
    nahuatl: '#9ACD32',
    yoruba: '#FFD700',
    slavic: '#4682B4',
    zoroastrian: '#FF4500',
    incan: '#CD853F',
    chinese: '#F08080',
    buddhist: '#9932CC',
    taoist: '#4169E1',
    korean: '#FF69B4',
    canaanite: '#800080',
    phoenician: '#800000',
    hittite: '#A0522D',
    baltic: '#00CED1',
  };

  const DEFAULT_CENTER = 'zeus';
  const GUIDE_DISMISSED_KEY = 'px_connections_guide_dismissed';

  const state = {
    centerId: null,
    graphData: { nodes: [], edges: [] },
    nodesById: new Map(),
    taxonomy: null,
    hub: null,
    branches: [],
    selectedId: null,
    selectedType: 'center',
    minStrength: 1,
    activeCategories: new Set(['function', 'phenomenon', 'narrative-role']),
    activePantheons: new Set(),
    activeDomains: new Set(),
    compareTarget: null,
    compareGraph: null,
    history: [],
    width: 0,
    height: 0,
    radius: 0,
  };

  const els = {
    svg: d3.select('#graph-svg'),
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
    randomBtn: document.getElementById('random-node'),
    compareToggle: document.getElementById('compare-toggle'),
    comparePanel: document.getElementById('compare-panel'),
    compareClose: document.getElementById('compare-close'),
    compareSearch: document.getElementById('compare-search'),
    compareSearchResults: document.getElementById('compare-search-results'),
    compareResults: document.getElementById('compare-results'),
    strengthSlider: document.getElementById('strength-slider'),
    domainFilters: document.getElementById('domain-filters'),
    pantheonFilters: document.getElementById('pantheon-filters'),
    detailPanel: document.getElementById('detail-panel-inner'),
    legend: document.getElementById('graph-legend'),
    guide: document.getElementById('graph-guide'),
    guideClose: document.getElementById('guide-close'),
    stage: document.getElementById('connections-stage'),
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
    els.svg.attr('width', state.width).attr('height', state.height);
  }

  function getInitialCenter() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) return hash.split(':')[0];
    return DEFAULT_CENTER;
  }

  async function loadTaxonomy() {
    try {
      const data = await fetchJSON('/api/v1/connections/taxonomy/');
      state.taxonomy = data?.data || data;
      if (state.taxonomy?.domains) {
        Object.values(state.taxonomy.domains).forEach((d) => state.activeDomains.add(d.id));
      }
      renderDomainFilters();
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
      state.taxonomy = { domains: {}, concepts: {} };
    }
  }

  async function loadGraph(centerId, options = {}) {
    clearError();
    els.loading.hidden = false;
    state.centerId = centerId;
    state.selectedId = centerId;
    state.selectedType = 'center';
    state.compareTarget = null;
    state.compareGraph = null;

    try {
      const data = await fetchJSON(
        `/api/v1/names/${encodeURIComponent(centerId)}/graph?limit=120&minStrength=1&depth=1`,
      );
      const payload = data?.data || data;
      state.graphData.nodes = payload.nodes || [];
      state.graphData.edges = payload.edges || [];
      state.nodesById = new Map(state.graphData.nodes.map((n) => [n.id, n]));

      if (!state.nodesById.has(centerId)) {
        throw new Error(`Center node "${centerId}" was not returned by the graph API.`);
      }

      if (!options.skipHistory) {
        pushHistory(centerId);
      }

      if (state.activePantheons.size === 0) {
        const pantheons = Array.from(new Set(state.graphData.nodes.map((n) => n.pantheon))).sort();
        pantheons.forEach((p) => state.activePantheons.add(p));
      }

      els.loading.hidden = true;
      updatePantheonFilters();
      recomputeAndRender();
      updateURL();
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError(`Could not load connections: ${err.message}`);
    }
  }

  function pushHistory(id) {
    if (state.history[state.history.length - 1] === id) return;
    state.history.push(id);
    if (state.history.length > 12) state.history.shift();
  }

  function updateURL() {
    if (state.centerId && state.centerId !== DEFAULT_CENTER) {
      history.replaceState(null, '', `#${state.centerId}`);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  function recomputeAndRender() {
    const center = state.nodesById.get(state.centerId);
    if (!center) return;

    measureGraph();

    const isMobile = state.width < 760;
    state.radius = Math.min(state.width, state.height) / 2 - (isMobile ? 48 : 64);

    state.hub = buildRadialHubLayout(state.centerId, state.graphData.edges, state.nodesById, state.taxonomy, {
      minStrength: state.minStrength,
      activeCategories: state.activeCategories,
      activePantheons: state.activePantheons,
      radius: state.radius,
      centerRadius: isMobile ? 32 : 44,
    });

    if (!state.hub) return;

    state.branches = state.hub.spokes.map((s) => ({
      conceptId: s.concept.id,
      label: s.concept.label,
      domain: s.concept.domain,
      concept: s.concept,
      category: s.concept.category,
      items: state.hub.nodes
        .filter((n) => n.branchId === s.concept.id)
        .map((n) => ({
          targetId: n.id,
          target: n,
          strength: n.strength,
          relationship: n.relationship,
          note: n.note,
        }))
        .sort((a, b) => b.strength - a.strength),
    }));

    renderGraph();
    renderDetailPanel();
  }

  function pantheonColor(p) {
    return PANTHEON_COLORS[p] || '#999';
  }

  function domainColor(d) {
    return d?.color || '#D4AF37';
  }

  function renderGraph() {
    if (!state.hub) return;

    const { center, spokes, nodes, links, radius } = state.hub;
    const cx = state.width / 2;
    const cy = state.height / 2;

    els.svg.selectAll('*').remove();

    const g = els.svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Background concept arcs near outer edge.
    const arcGen = d3.arc().innerRadius(radius * 0.82).outerRadius(radius);
    g.selectAll('path.hub-concept-arc')
      .data(spokes)
      .join('path')
      .attr('class', 'hub-concept-arc')
      .attr('d', (d) => arcGen({ startAngle: d.concept.startAngle, endAngle: d.concept.endAngle }))
      .attr('stroke', (d) => domainColor(d.concept.domain))
      .on('click', (_event, d) => selectConcept(d.concept.id))
      .on('mouseenter', (event, d) => {
        highlightConcept(d.concept.id);
        showTooltip(event, { type: 'concept', ...d.concept, count: d.concept.count });
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', () => {
        clearHighlight();
        hideTooltip();
      });

    // Spoke dashed lines.
    g.selectAll('line.hub-spoke')
      .data(spokes)
      .join('line')
      .attr('class', 'hub-spoke')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d) => Math.cos(d.angle) * radius)
      .attr('y2', (d) => Math.sin(d.angle) * radius);

    // Links from center to each deity.
    g.selectAll('line.hub-link')
      .data(links)
      .join('line')
      .attr('class', 'hub-link')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .attr('stroke', (d) => domainColor(d.concept.domain))
      .attr('stroke-width', (d) => 0.8 + d.strength * 0.7);

    // Deity nodes.
    const nodeGroups = g
      .selectAll('g.hub-node')
      .data(nodes.filter((n) => n.id !== center.id), (d) => d.id)
      .join('g')
      .attr('class', 'hub-node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .on('click', (_event, d) => loadGraph(d.id))
      .on('mouseenter', (event, d) => {
        highlightNode(d);
        showTooltip(event, { type: 'deity', ...d });
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', () => {
        clearHighlight();
        hideTooltip();
      });

    nodeGroups
      .append('circle')
      .attr('class', 'hub-node-circle')
      .attr('r', (d) => 5 + d.strength * 2.5)
      .attr('fill', (d) => pantheonColor(d.pantheon));

    nodeGroups
      .append('text')
      .attr('class', 'hub-node-label')
      .attr('y', (d) => 14 + d.strength * 2)
      .text((d) => d.unicode);

    // Concept labels at outer edge.
    g.selectAll('text.hub-concept-label')
      .data(spokes)
      .join('text')
      .attr('class', 'hub-concept-label')
      .attr('x', (d) => Math.cos(d.angle) * (radius + 18))
      .attr('y', (d) => Math.sin(d.angle) * (radius + 18))
      .text((d) => d.concept.label);

    g.selectAll('text.hub-concept-count')
      .data(spokes)
      .join('text')
      .attr('class', 'hub-concept-count')
      .attr('x', (d) => Math.cos(d.angle) * (radius + 30))
      .attr('y', (d) => Math.sin(d.angle) * (radius + 30))
      .text((d) => `${d.concept.count}`);

    // Center node.
    const centerGroup = g
      .append('g')
      .attr('class', 'hub-center')
      .on('click', () => {
        state.selectedId = center.id;
        state.selectedType = 'center';
        renderDetailPanel();
      })
      .on('mouseenter', (event) => {
        showTooltip(event, { type: 'center', ...center });
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', hideTooltip);

    centerGroup.append('circle').attr('class', 'hub-center-circle').attr('r', state.hub.centerRadius);
    centerGroup
      .append('text')
      .attr('class', 'hub-center-label')
      .text(center.unicode);

    renderLegend();
  }

  function highlightNode(d) {
    els.svg.selectAll('.hub-node').classed('dimmed', (n) => n.id !== d.id);
    els.svg.selectAll('.hub-link').classed('dimmed', (l) => l.target.id !== d.id);
    els.svg.selectAll('.hub-node').classed('highlight', (n) => n.id === d.id);
    els.svg.selectAll('.hub-link').classed('highlight', (l) => l.target.id === d.id);
  }

  function highlightConcept(conceptId) {
    els.svg.selectAll('.hub-node').classed('dimmed', (n) => n.branchId !== conceptId);
    els.svg.selectAll('.hub-link').classed('dimmed', (l) => l.concept.id !== conceptId);
    els.svg.selectAll('.hub-node').classed('highlight', (n) => n.branchId === conceptId);
    els.svg.selectAll('.hub-link').classed('highlight', (l) => l.concept.id === conceptId);
  }

  function clearHighlight() {
    els.svg.selectAll('.hub-node, .hub-link').classed('dimmed', false).classed('highlight', false);
  }

  function showTooltip(event, d) {
    els.tooltip.hidden = false;
    els.tooltipTitle.textContent = d.unicode || d.label || d.name || d.id;
    if (d.type === 'center') {
      els.tooltipMeta.textContent = d.pantheonLabel || capitalize(d.pantheon);
      els.tooltipRel.textContent = 'Click to view details';
    } else if (d.type === 'concept') {
      els.tooltipMeta.textContent = d.domain?.label || 'Concept';
      els.tooltipRel.textContent = `${d.count || 0} echo${d.count === 1 ? '' : 'es'} · click to focus`;
    } else {
      els.tooltipMeta.textContent = d.pantheonLabel || capitalize(d.pantheon);
      els.tooltipRel.textContent = `${d.relationship || ''} · strength ${d.strength || 1}`;
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

  function selectConcept(conceptId) {
    state.selectedId = conceptId;
    state.selectedType = 'concept';
    renderDetailPanel();
  }

  function renderDetailPanel() {
    if (!state.hub) return;

    const center = state.nodesById.get(state.centerId);
    if (!center) return;

    let html = '';

    // Breadcrumbs.
    if (state.history.length > 1) {
      html += '<nav class="breadcrumb-trail" aria-label="Exploration history">';
      state.history.slice(-6).forEach((id, idx) => {
        const isLast = idx === Math.min(state.history.length, 6) - 1;
        const node = state.nodesById.get(id) || { unicode: capitalize(id) };
        if (isLast) {
          html += `<span class="breadcrumb-item">${escapeHtml(node.unicode)}</span>`;
        } else {
          html += `<span class="breadcrumb-item"><button type="button" data-history-id="${id}">${escapeHtml(node.unicode)}</button></span>`;
        }
      });
      html += '</nav>';
    }

    if (state.selectedType === 'concept') {
      html += renderConceptDetail(state.selectedId);
    } else {
      html += renderDeityDetail(center);
    }

    els.detailPanel.innerHTML = html;

    // Wire deity chips.
    els.detailPanel.querySelectorAll('[data-deity-id]').forEach((chip) => {
      chip.addEventListener('click', () => loadGraph(chip.dataset.deityId));
    });

    // Wire concept headers.
    els.detailPanel.querySelectorAll('[data-concept-id]').forEach((el) => {
      el.addEventListener('click', () => selectConcept(el.dataset.conceptId));
    });

    // Wire history breadcrumbs.
    els.detailPanel.querySelectorAll('[data-history-id]').forEach((btn) => {
      btn.addEventListener('click', () => loadGraph(btn.dataset.historyId, { skipHistory: true }));
    });
  }

  function renderDeityDetail(center) {
    const pantheonColorValue = pantheonColor(center.pantheon);

    let html = `
      <div class="detail-card">
        <div class="detail-header">
          <span class="detail-pantheon" style="color:${pantheonColorValue}">${escapeHtml(center.pantheonLabel || capitalize(center.pantheon))}</span>
          <h2 class="detail-title">${escapeHtml(center.unicode)}</h2>
          <p class="detail-domain">${escapeHtml(center.domain || '')}</p>
        </div>
        <div class="detail-actions">
          <a href="/sites/${center.id}/" class="btn btn-primary btn-sm">Enter Temple</a>
          <a href="/api/v1/names/${center.id}" class="btn btn-outline btn-sm">API Record</a>
          <button class="btn btn-outline btn-sm" id="detail-compare-btn" data-id="${center.id}" type="button">Compare</button>
        </div>
        <p class="detail-description">
          ${escapeHtml(center.meaning || `Explore the echoes of ${center.unicode} across pantheons and concepts.`)}
        </p>
      </div>
    `;

    if (!state.branches.length) {
      html += `<div class="detail-card"><p class="body-sm" style="color:var(--text-dim)">No connections match the current filters.</p></div>`;
      return html;
    }

    html += '<h3 class="detail-section-title">Echoes</h3>';

    for (const branch of state.branches) {
      const color = domainColor(branch.domain);
      html += `
        <article class="concept-group" style="--concept-color: ${color}">
          <div class="concept-group-header" data-concept-id="${branch.conceptId}" style="cursor:pointer">
            <h4 class="concept-group-title">${escapeHtml(branch.label)}</h4>
            <span class="concept-group-domain">${escapeHtml(branch.domain?.label || branch.category)}</span>
          </div>
          <p class="concept-group-description">${escapeHtml(branch.concept?.description || '')}</p>
          <div class="deity-chips">
            ${branch.items
              .map(
                (item) => `
              <button class="deity-chip" data-deity-id="${item.targetId}" type="button">
                <span class="deity-chip-swatch" style="background:${pantheonColor(item.target.pantheon)}"></span>
                <span>${escapeHtml(item.target.unicode)}</span>
                <span class="deity-chip-strength">${'·'.repeat(item.strength)}</span>
              </button>
            `,
              )
              .join('')}
          </div>
        </article>
      `;
    }

    return html;
  }

  function renderConceptDetail(conceptId) {
    const branch = state.branches.find((b) => b.conceptId === conceptId);
    if (!branch) return '';

    const center = state.nodesById.get(state.centerId);
    const color = domainColor(branch.domain);

    return `
      <div class="detail-card" style="border-left: 4px solid ${color}">
        <div class="detail-header">
          <span class="detail-pantheon" style="color:${color}">${escapeHtml(branch.domain?.label || branch.category)}</span>
          <h2 class="detail-title" style="font-size:1.6rem">${escapeHtml(branch.label)}</h2>
          <p class="detail-domain">${branch.items.length} echo${branch.items.length === 1 ? '' : 'es'} across traditions</p>
        </div>
        <p class="detail-description">${escapeHtml(branch.concept?.description || '')}</p>
        <button class="btn btn-outline btn-sm" id="concept-back-btn" type="button">← Back to ${escapeHtml(center.unicode)}</button>
      </div>
      <h3 class="detail-section-title">Connected to ${escapeHtml(center.unicode)}</h3>
      <div class="concept-group" style="--concept-color: ${color}">
        <div class="deity-chips">
          ${branch.items
            .map(
              (item) => `
            <button class="deity-chip" data-deity-id="${item.targetId}" type="button">
              <span class="deity-chip-swatch" style="background:${pantheonColor(item.target.pantheon)}"></span>
              <span>${escapeHtml(item.target.unicode)}</span>
              <span class="deity-chip-strength">${'·'.repeat(item.strength)}</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function renderLegend() {
    const pantheons = Array.from(new Set(state.graphData.nodes.map((n) => n.pantheon))).sort();
    els.legend.innerHTML =
      '<span class="legend-title">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${pantheonColor(p)}"></span><span>${capitalize(p)}</span></div>`,
        )
        .join('');
  }

  function renderDomainFilters() {
    if (!state.taxonomy?.domains) return;
    const domains = Object.values(state.taxonomy.domains).sort((a, b) => a.order - b.order);
    els.domainFilters.innerHTML =
      '<span class="filter-label">Domains</span>' +
      domains
        .map(
          (d) =>
            `<label class="filter-chip active" data-domain="${d.id}"><input type="checkbox" value="${d.id}" checked><span style="color:${d.color}">${escapeHtml(d.label)}</span></label>`,
        )
        .join('');

    els.domainFilters.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.activeDomains.add(input.value);
        else state.activeDomains.delete(input.value);
        input.parentElement.classList.toggle('active', input.checked);
        recomputeAndRender();
      });
    });
  }

  function updatePantheonFilters() {
    const pantheons = Array.from(new Set(state.graphData.nodes.map((n) => n.pantheon))).sort();
    if (state.activePantheons.size === 0) {
      pantheons.forEach((p) => state.activePantheons.add(p));
    }

    els.pantheonFilters.innerHTML =
      '<span class="filter-label">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<label class="filter-chip ${state.activePantheons.has(p) ? 'active' : ''}"><input type="checkbox" value="${p}" ${
              state.activePantheons.has(p) ? 'checked' : ''
            }><span style="color:${pantheonColor(p)}">${capitalize(p)}</span></label>`,
        )
        .join('');

    els.pantheonFilters.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.activePantheons.add(input.value);
        else state.activePantheons.delete(input.value);
        input.parentElement.classList.toggle('active', input.checked);
        recomputeAndRender();
      });
    });
  }

  // ─── Search ───
  let searchAbort = null;
  function closeSearch() {
    els.searchResults.classList.remove('is-open');
    els.searchResults.innerHTML = '';
  }

  async function performSearch(q, resultsEl, onSelect) {
    if (!q || q.length < 2) {
      resultsEl.classList.remove('is-open');
      resultsEl.innerHTML = '';
      return;
    }
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try {
      const data = await fetch(`/api/v1/autocomplete?q=${encodeURIComponent(q)}&limit=8`, {
        signal: searchAbort.signal,
      }).then((r) => r.json());
      const items = data?.data?.items || data?.items || [];
      renderSearchResults(items, resultsEl, onSelect);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Search error:', err);
    }
  }

  function renderSearchResults(items, resultsEl, onSelect) {
    if (!items.length) {
      resultsEl.classList.remove('is-open');
      resultsEl.innerHTML = '';
      return;
    }
    resultsEl.innerHTML = items
      .map(
        (item) => `
      <div class="search-result-item" data-id="${item.id}" role="option">
        <span class="search-result-name">${escapeHtml(item.unicode)}</span>
        <span class="search-result-meta">${escapeHtml(item.pantheonLabel || item.pantheon || '')}</span>
      </div>
    `,
      )
      .join('');
    resultsEl.classList.add('is-open');

    resultsEl.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', () => {
        onSelect(el.dataset.id);
      });
    });
  }

  const debouncedSearch = debounce((q) => performSearch(q, els.searchResults, (id) => {
    els.searchInput.value = '';
    closeSearch();
    loadGraph(id);
  }), 180);

  els.searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.search-wrap') || e.target.closest('.compare-search-wrap')) return;
    closeSearch();
    els.compareSearchResults.classList.remove('is-open');
    els.compareSearchResults.innerHTML = '';
  });

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ─── Filters ───
  els.strengthSlider.addEventListener('input', (e) => {
    state.minStrength = Number(e.target.value);
    recomputeAndRender();
  });

  els.resetBtn.addEventListener('click', () => {
    state.minStrength = 1;
    els.strengthSlider.value = 1;
    state.activeCategories = new Set(['function', 'phenomenon', 'narrative-role']);
    state.activePantheons.clear();
    state.activeDomains.clear();
    state.history = [];
    if (state.taxonomy?.domains) {
      Object.values(state.taxonomy.domains).forEach((d) => state.activeDomains.add(d.id));
    }
    renderDomainFilters();
    loadGraph(DEFAULT_CENTER);
  });

  els.randomBtn.addEventListener('click', () => {
    const deities = state.graphData.nodes.filter((n) => n.id !== state.centerId);
    if (!deities.length) return;
    const idx = Math.floor(Math.random() * deities.length);
    loadGraph(deities[idx].id);
  });

  // ─── Guide ───
  function initGuide() {
    if (localStorage.getItem(GUIDE_DISMISSED_KEY)) {
      els.guide.classList.add('is-dismissed');
    }
    els.guideClose.addEventListener('click', () => {
      els.guide.classList.add('is-dismissed');
      try {
        localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
      } catch {}
    });
  }

  // ─── Compare ───
  function openCompare() {
    els.comparePanel.hidden = false;
    els.compareResults.innerHTML = '<div class="compare-empty">Search for a second name to compare echoes.</div>';
  }

  function closeCompare() {
    els.comparePanel.hidden = true;
    state.compareTarget = null;
    state.compareGraph = null;
    els.compareSearch.value = '';
    els.compareSearchResults.classList.remove('is-open');
    els.compareSearchResults.innerHTML = '';
    clearHighlight();
  }

  async function setCompareTarget(id) {
    state.compareTarget = id;
    try {
      const data = await fetchJSON(
        `/api/v1/names/${encodeURIComponent(id)}/graph?limit=120&minStrength=1&depth=1`,
      );
      state.compareGraph = data?.data || data;
      renderCompareResults();
    } catch (err) {
      console.error('Failed to load compare graph:', err);
      els.compareResults.innerHTML = `<div class="compare-empty">Could not load ${escapeHtml(id)}: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderCompareResults() {
    if (!state.compareGraph) return;
    const targetNode = state.compareGraph.nodes.find((n) => n.id === state.compareTarget);
    const centerNode = state.nodesById.get(state.centerId);
    const allEdges = [...state.graphData.edges, ...(state.compareGraph.edges || [])];
    const sharedIds = getSharedConcepts(state.centerId, state.compareTarget, allEdges);
    const sharedConcepts = sharedIds
      .map((cid) => {
        const concept = Object.values(state.taxonomy?.concepts || {}).find((c) => c.id === cid);
        return concept || { id: cid, label: capitalize(cid.replace(/-/g, ' ')), domain: 'unknown' };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const centerBranches = state.branches.map((b) => b.concept).filter(Boolean);
    const targetBranches =
      buildRadialHubLayout(
        state.compareTarget,
        state.compareGraph.edges,
        new Map(state.compareGraph.nodes.map((n) => [n.id, n])),
        state.taxonomy,
        { minStrength: 1, activeCategories: state.activeCategories, activePantheons: state.activePantheons },
      )?.spokes.map((s) => s.concept) || [];

    const centerOnly = centerBranches.filter((c) => !sharedIds.includes(c.id)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const targetOnly = targetBranches.filter((c) => !sharedIds.includes(c.id)).sort((a, b) => (a.order || 0) - (b.order || 0));

    const section = (title, concepts) => {
      if (!concepts.length) return '';
      return `
        <div class="compare-section-title">${escapeHtml(title)}</div>
        <div class="compare-chips">
          ${concepts
            .map((c) => {
              const domain = state.taxonomy?.domains?.[c.domain];
              return `<button class="compare-chip" data-concept="${c.id}" type="button"><span class="compare-chip-swatch" style="background:${domain?.color || '#999'}"></span><span>${escapeHtml(c.label)}</span></button>`;
            })
            .join('')}
        </div>
      `;
    };

    els.compareResults.innerHTML = `
      <div class="compare-section-title">Comparing</div>
      <p class="body-sm"><strong>${escapeHtml(centerNode?.unicode || state.centerId)}</strong> ↔ <strong>${escapeHtml(targetNode?.unicode || state.compareTarget)}</strong></p>
      ${section('Shared echoes', sharedConcepts)}
      ${section(`Only ${escapeHtml(centerNode?.unicode || 'center')}`, centerOnly)}
      ${section(`Only ${escapeHtml(targetNode?.unicode || 'target')}`, targetOnly)}
    `;

    els.compareResults.querySelectorAll('.compare-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cid = chip.dataset.concept;
        if (state.branches.some((b) => b.conceptId === cid)) {
          closeCompare();
          selectConcept(cid);
        }
      });
    });

    // Highlight shared concept links in the main graph.
    if (sharedIds.length) {
      els.svg.selectAll('.hub-link').classed('dimmed', (l) => !sharedIds.includes(l.concept.id));
      els.svg.selectAll('.hub-node').classed('dimmed', (n) => {
        if (n.id === state.compareTarget) return false;
        return !state.graphData.edges.some(
          (e) =>
            (e.source === state.centerId || e.source === state.compareTarget) &&
            (e.target === n.id || e.source === n.id) &&
            sharedIds.includes(e.concept?.id || e.relationship),
        );
      });
      els.svg.selectAll('.hub-link').classed('highlight', (l) => sharedIds.includes(l.concept.id));
    }
  }

  els.compareToggle.addEventListener('click', openCompare);
  els.compareClose.addEventListener('click', closeCompare);

  const debouncedCompareSearch = debounce((q) => performSearch(q, els.compareSearchResults, (id) => {
    els.compareSearch.value = '';
    els.compareSearchResults.classList.remove('is-open');
    els.compareSearchResults.innerHTML = '';
    setCompareTarget(id);
  }), 180);

  els.compareSearch.addEventListener('input', (e) => debouncedCompareSearch(e.target.value.trim()));
  els.compareSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.compareSearchResults.classList.remove('is-open');
      els.compareSearchResults.innerHTML = '';
    }
  });

  // Delegate detail panel clicks.
  els.detailPanel.addEventListener('click', (e) => {
    const deityChip = e.target.closest('[data-deity-id]');
    if (deityChip) {
      loadGraph(deityChip.dataset.deityId);
      return;
    }
    const conceptHeader = e.target.closest('[data-concept-id]');
    if (conceptHeader) {
      selectConcept(conceptHeader.dataset.conceptId);
      return;
    }
    const backBtn = e.target.closest('#concept-back-btn');
    if (backBtn) {
      state.selectedId = state.centerId;
      state.selectedType = 'center';
      renderDetailPanel();
      return;
    }
    const compareBtn = e.target.closest('#detail-compare-btn');
    if (compareBtn) {
      openCompare();
      return;
    }
    const historyBtn = e.target.closest('[data-history-id]');
    if (historyBtn) {
      loadGraph(historyBtn.dataset.historyId, { skipHistory: true });
    }
  });

  // ─── Resize ───
  const resizeObserver = new ResizeObserver(() => {
    if (state.hub) recomputeAndRender();
  });
  resizeObserver.observe(els.graphWrap);

  // ─── Init ───
  async function init() {
    initGuide();
    await loadTaxonomy();
    await loadGraph(getInitialCenter());
  }

  init();

  // Expose for tests/debug.
  window.PX_CONNECTIONS = { state, loadGraph, selectConcept };
})();
