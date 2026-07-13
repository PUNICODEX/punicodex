(function () {
  'use strict';

  const {
    buildSunburstTree,
    layoutSunburst,
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
    chinese: '#DC143C',
    buddhist: '#9932CC',
    taoist: '#4169E1',
    korean: '#FF69B4',
    canaanite: '#800080',
    phoenician: '#800000',
    hittite: '#A0522D',
    baltic: '#00CED1',
  };

  const DEFAULT_CENTER = 'zeus';

  const state = {
    centerId: null,
    graphData: { nodes: [], edges: [] },
    nodesById: new Map(),
    taxonomy: null,
    tree: null,
    layout: [],
    branches: [],
    selectedId: null,
    selectedType: null,
    minStrength: 1,
    activeCategories: new Set(['function', 'phenomenon', 'narrative-role']),
    activePantheons: new Set(),
    activeDomains: new Set(),
    compareTarget: null,
    compareGraph: null,
    width: 0,
    height: 0,
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
    sidebarEmpty: document.getElementById('sidebar-empty'),
    sidebarContent: document.getElementById('sidebar-content'),
    sidebarPantheon: document.getElementById('sidebar-pantheon'),
    sidebarTitle: document.getElementById('sidebar-title'),
    sidebarDomain: document.getElementById('sidebar-domain'),
    sidebarTempleLink: document.getElementById('sidebar-temple-link'),
    sidebarApiLink: document.getElementById('sidebar-api-link'),
    sidebarConceptSection: document.getElementById('sidebar-concept-section'),
    sidebarConceptDescription: document.getElementById('sidebar-concept-description'),
    connectionList: document.getElementById('connection-list'),
    legend: document.getElementById('graph-legend'),
    mobileExplorer: document.getElementById('mobile-explorer'),
    explorerEmpty: document.getElementById('explorer-empty'),
    explorerContent: document.getElementById('explorer-content'),
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
    state.width = Math.max(320, rect.width);
    state.height = Math.max(420, rect.height);
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

  async function loadGraph(centerId) {
    clearError();
    els.loading.hidden = false;
    state.centerId = centerId;
    state.selectedId = null;
    state.selectedType = null;
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

      if (state.activePantheons.size === 0) {
        const pantheons = Array.from(new Set(state.graphData.nodes.map((n) => n.pantheon))).sort();
        pantheons.forEach((p) => state.activePantheons.add(p));
      }

      els.loading.hidden = true;
      updatePantheonFilters();
      recomputeAndRender();
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError(`Could not load connections: ${err.message}`);
    }
  }

  function recomputeAndRender() {
    const center = state.nodesById.get(state.centerId);
    if (!center) return;

    state.tree = buildSunburstTree(state.centerId, state.graphData.edges, state.nodesById, state.taxonomy, {
      minStrength: state.minStrength,
      activeCategories: state.activeCategories,
    });

    if (!state.tree) return;

    // Filter domains and pantheons by mutating tree children.
    const centerNode = state.tree.children[0];
    centerNode.children = (centerNode.children || []).filter((branch) => {
      if (!state.activeDomains.has(branch.domain?.id)) return false;
      branch.children = (branch.children || []).filter((deity) => state.activePantheons.has(deity.pantheon));
      return branch.children.length > 0;
    });

    state.branches = centerNode.children.map((b) => b.data);
    state.layout = layoutSunburst(state.tree, Math.min(state.width, state.height) / 2 - 24);

    renderGraph();
    renderMobileExplorer();
    renderSidebar();
  }

  function pantheonColor(p) {
    return PANTHEON_COLORS[p] || '#999';
  }

  function domainColor(d) {
    return d?.color || '#D4AF37';
  }

  function arcFill(d) {
    if (d.type === 'root') return 'none';
    if (d.type === 'center') {
      return pantheonColor(d.pantheon);
    }
    if (d.type === 'concept') {
      return d.domain?.color || '#D4AF37';
    }
    return pantheonColor(d.pantheon);
  }

  function arcOpacity(d) {
    if (d.type === 'root') return 0;
    if (d.type === 'center') return 0.35;
    if (d.type === 'concept') return 0.75;
    return 0.9;
  }

  function renderGraph() {
    measureGraph();
    els.svg.selectAll('*').remove();

    if (!state.layout.length) {
      return;
    }

    const radius = Math.min(state.width, state.height) / 2 - 24;
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

    const nodes = state.layout;

    // Render arcs
    const arcs = g
      .selectAll('path.sunburst-arc')
      .data(nodes, (d) => d.id)
      .join('path')
      .attr('class', (d) => `sunburst-arc ${d.type}-arc`)
      .attr('d', arcGen)
      .attr('fill', arcFill)
      .attr('fill-opacity', arcOpacity)
      .attr('data-id', (d) => d.id)
      .attr('data-type', (d) => d.type)
      .on('mouseenter', (event, d) => {
        showTooltip(event, d);
        highlightSunburst(d);
      })
      .on('mousemove', (event, d) => moveTooltip(event))
      .on('mouseleave', () => {
        hideTooltip();
        clearHighlight();
      })
      .on('click', (_event, d) => handleArcClick(d));

    // Center label
    const centerNode = nodes.find((n) => n.type === 'center');
    if (centerNode) {
      g.append('text')
        .attr('class', 'sunburst-label center-label')
        .attr('x', 0)
        .attr('y', 0)
        .text(centerNode.name);
    }

    // Concept labels along arc centroid
    g.selectAll('text.concept-label')
      .data(nodes.filter((d) => d.type === 'concept' && d.x1 - d.x0 > 0.18), (d) => d.id)
      .join('text')
      .attr('class', 'sunburst-label concept-label')
      .attr('transform', (d) => {
        const centroid = arcGen.centroid(d);
        const angle = (d.x0 + d.x1) / 2;
        const deg = (angle * 180) / Math.PI - 90;
        return `translate(${centroid[0]},${centroid[1]}) rotate(${deg > 90 || deg < -90 ? deg + 180 : deg})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text((d) => d.name);

    // Deity labels for large arcs
    g.selectAll('text.deity-label')
      .data(nodes.filter((d) => d.type === 'deity' && d.x1 - d.x0 > 0.12), (d) => d.id)
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
      .style('font-size', '7px')
      .text((d) => d.name);

    renderLegend();
  }

  function handleArcClick(d) {
    if (d.type === 'deity') {
      loadGraph(d.id);
    } else if (d.type === 'concept') {
      selectConcept(d.id);
    } else if (d.type === 'center') {
      renderSidebarForCenter();
    }
  }

  function highlightSunburst(d) {
    const hovered = d;
    els.svg.selectAll('.sunburst-arc').classed('dimmed', function (node) {
      if (node.id === hovered.id) return false;
      if (node.ancestors.includes(hovered.id)) return false;
      if (hovered.ancestors.includes(node.id)) return false;
      return true;
    });
    els.svg.selectAll('.sunburst-arc').classed('highlight', function (node) {
      return node.id === hovered.id || node.ancestors.includes(hovered.id) || hovered.ancestors.includes(node.id);
    });
  }

  function clearHighlight() {
    els.svg.selectAll('.sunburst-arc').classed('dimmed', false).classed('highlight', false);
  }

  function showTooltip(event, d) {
    els.tooltip.hidden = false;
    els.tooltipTitle.textContent = d.name;
    if (d.type === 'center') {
      els.tooltipMeta.textContent = d.data?.pantheonLabel || capitalize(d.pantheon);
      els.tooltipRel.textContent = d.data?.domain || '';
    } else if (d.type === 'concept') {
      els.tooltipMeta.textContent = d.domain?.label || 'Concept';
      els.tooltipRel.textContent = `${d.children?.length || 0} echo${d.children?.length === 1 ? '' : 'es'}`;
    } else if (d.type === 'deity') {
      els.tooltipMeta.textContent = d.data?.pantheonLabel || capitalize(d.pantheon);
      els.tooltipRel.textContent = `${d.relationship || ''} · strength ${d.strength || 1}`;
    } else {
      els.tooltipMeta.textContent = '';
      els.tooltipRel.textContent = '';
    }
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const rect = els.graphWrap.getBoundingClientRect();
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top + 14;
    els.tooltip.style.left = `${x}px`;
    els.tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function renderLegend() {
    const pantheons = Array.from(new Set(state.graphData.nodes.map((n) => n.pantheon))).sort();
    const domains = state.taxonomy?.domains ? Object.values(state.taxonomy.domains).sort((a, b) => a.order - b.order) : [];

    els.legend.innerHTML =
      '<span class="legend-title">Domains</span>' +
      domains
        .map(
          (d) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${d.color}"></span><span>${escapeHtml(d.label)}</span></div>`,
        )
        .join('') +
      '<span class="legend-title" style="margin-top:10px">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${pantheonColor(p)}"></span><span>${capitalize(p)}</span></div>`,
        )
        .join('');
  }

  function selectConcept(conceptId) {
    state.selectedId = conceptId;
    state.selectedType = 'concept';
    renderSidebar();
  }

  function renderSidebarForCenter() {
    state.selectedId = state.centerId;
    state.selectedType = 'center';
    renderSidebar();
  }

  function renderSidebar() {
    if (!state.selectedId) {
      els.sidebarEmpty.hidden = false;
      els.sidebarContent.hidden = true;
      return;
    }

    if (state.selectedType === 'concept') {
      renderConceptSidebar(state.selectedId);
    } else {
      renderDeitySidebar(state.selectedId);
    }
  }

  function renderDeitySidebar(deityId) {
    const node = state.nodesById.get(deityId);
    if (!node) return;

    els.sidebarEmpty.hidden = true;
    els.sidebarContent.hidden = false;
    els.sidebarConceptSection.hidden = true;

    els.sidebarPantheon.textContent = node.pantheonLabel || capitalize(node.pantheon);
    els.sidebarPantheon.style.color = pantheonColor(node.pantheon);
    els.sidebarTitle.textContent = node.unicode;
    els.sidebarDomain.textContent = node.domain || '';
    els.sidebarTempleLink.href = `/sites/${deityId}/`;
    els.sidebarTempleLink.textContent = 'Enter Temple';
    els.sidebarApiLink.href = `/api/v1/names/${deityId}`;

    const branchesForNode = state.branches.filter((b) => b.items.some((i) => i.targetId === deityId));
    let html = '';
    if (!branchesForNode.length) {
      html = '<li class="connection-empty">No visible connections for this filter set.</li>';
    } else {
      for (const branch of branchesForNode) {
        const item = branch.items.find((i) => i.targetId === deityId);
        html += `
          <li class="connection-item" data-concept="${branch.conceptId}">
            <span class="connection-strength s${item.strength}">${item.strength}</span>
            <div class="connection-body">
              <div class="connection-target">${escapeHtml(branch.label)}</div>
              <div class="connection-rel">${escapeHtml(branch.domain?.label || branch.category)}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div>
            </div>
          </li>
        `;
      }
    }
    els.connectionList.innerHTML = html;
    wireSidebarClicks();
  }

  function renderConceptSidebar(conceptId) {
    const branch = state.branches.find((b) => b.conceptId === conceptId);
    if (!branch) return;

    els.sidebarEmpty.hidden = true;
    els.sidebarContent.hidden = false;
    els.sidebarConceptSection.hidden = false;

    els.sidebarPantheon.textContent = branch.domain?.label || 'Concept';
    els.sidebarPantheon.style.color = domainColor(branch.domain);
    els.sidebarTitle.textContent = branch.label;
    els.sidebarDomain.textContent = `${branch.items.length} echo${branch.items.length === 1 ? '' : 'es'} across traditions`;
    els.sidebarTempleLink.href = '/connections/';
    els.sidebarTempleLink.textContent = 'Browse all';
    els.sidebarApiLink.href = '/api/v1/connections/taxonomy/';
    els.sidebarConceptDescription.textContent = branch.concept?.description || '';

    const html =
      branch.items
        .map(
          (item) => `
        <li class="connection-item" data-target="${item.targetId}">
          <span class="connection-strength" style="background:${pantheonColor(item.target.pantheon)}"></span>
          <div class="connection-body">
            <div class="connection-target">${escapeHtml(item.target.unicode)}</div>
            <div class="connection-rel">${escapeHtml(item.target.pantheonLabel || capitalize(item.target.pantheon))}${item.target.domain ? ` · ${escapeHtml(item.target.domain)}` : ''}</div>
          </div>
        </li>
      `,
        )
        .join('') || '<li class="connection-empty">No deities match the current filters.</li>';
    els.connectionList.innerHTML = html;
    wireSidebarClicks();
  }

  function wireSidebarClicks() {
    els.connectionList.querySelectorAll('.connection-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.dataset.target;
        const conceptId = item.dataset.concept;
        if (targetId) {
          loadGraph(targetId);
        } else if (conceptId) {
          selectConcept(conceptId);
        }
      });
    });
  }

  function renderMobileExplorer() {
    if (!state.branches.length) {
      els.explorerEmpty.hidden = false;
      els.explorerContent.innerHTML = '';
      return;
    }
    els.explorerEmpty.hidden = true;

    els.explorerContent.innerHTML = state.branches
      .map((branch) => {
        const chips = branch.items
          .map(
            (item) => `
            <button class="branch-deity-chip" data-id="${item.targetId}" type="button">
              <span class="branch-deity-swatch" style="background:${pantheonColor(item.target.pantheon)}"></span>
              <span>${escapeHtml(item.target.unicode)}</span>
            </button>
          `,
          )
          .join('');
        return `
          <article class="branch-card" style="--domain-color: ${domainColor(branch.domain)}">
            <div class="branch-header">
              <h3 class="branch-title">${escapeHtml(branch.label)}</h3>
              <span class="branch-domain">${escapeHtml(branch.domain?.label || branch.category)}</span>
            </div>
            <p class="branch-description">${escapeHtml(branch.concept?.description || '')}</p>
            <div class="branch-deities">${chips}</div>
          </article>
        `;
      })
      .join('');

    els.explorerContent.querySelectorAll('.branch-deity-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        loadGraph(chip.dataset.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
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
    if (state.taxonomy?.domains) {
      Object.values(state.taxonomy.domains).forEach((d) => state.activeDomains.add(d.id));
    }
    renderDomainFilters();
    loadGraph(state.centerId || DEFAULT_CENTER);
  });

  els.randomBtn.addEventListener('click', () => {
    const deities = state.graphData.nodes.filter((n) => n.id !== state.centerId);
    if (!deities.length) return;
    const idx = Math.floor(Math.random() * deities.length);
    loadGraph(deities[idx].id);
  });

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
    const targetBranches = buildSunburstTree(
      state.compareTarget,
      state.compareGraph.edges,
      new Map(state.compareGraph.nodes.map((n) => [n.id, n])),
      state.taxonomy,
      { minStrength: 1, activeCategories: state.activeCategories },
    )?.children[0].children.map((b) => b.concept).filter(Boolean) || [];

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

    // Highlight shared concept arcs in the main sunburst.
    if (sharedIds.length) {
      els.svg.selectAll('.sunburst-arc').classed('dimmed', (d) => d.type === 'concept' && !sharedIds.includes(d.id));
      els.svg.selectAll('.sunburst-arc').classed('highlight', (d) => d.type === 'concept' && sharedIds.includes(d.id));
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

  // ─── Resize ───
  const resizeObserver = new ResizeObserver(() => {
    if (state.tree) recomputeAndRender();
  });
  resizeObserver.observe(els.graphWrap);

  // ─── Init ───
  async function init() {
    await loadTaxonomy();
    await loadGraph(getInitialCenter());
  }

  init();

  // Expose for tests/debug.
  window.PX_CONNECTIONS = { state, loadGraph, selectConcept };
})();
