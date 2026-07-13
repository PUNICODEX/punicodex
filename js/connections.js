(function () {
  'use strict';

  const {
    buildBranches,
    findShortestPath,
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
    currentTransform: d3.zoomIdentity,
  };

  const els = {
    svg: d3.select('#graph-svg'),
    graphWrap: document.getElementById('graph-wrap'),
    loading: document.getElementById('graph-loading'),
    error: document.getElementById('graph-error'),
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
    centerCard: document.getElementById('mandala-center-card'),
    centerPantheon: document.getElementById('center-pantheon'),
    centerName: document.getElementById('center-name'),
    centerDomain: document.getElementById('center-domain'),
    centerTempleLink: document.getElementById('center-temple-link'),
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
      const data = await fetchJSON('/api/v1/connections/taxonomy');
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
      updateCenterCard();
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

    state.branches = buildBranches(state.centerId, state.graphData.edges, state.nodesById, state.taxonomy, {
      minStrength: state.minStrength,
      activeCategories: state.activeCategories,
    }).filter((branch) => {
      if (!state.activeDomains.has(branch.domain?.id)) return false;
      branch.items = branch.items.filter((item) => state.activePantheons.has(item.target.pantheon));
      return branch.items.length > 0;
    });

    renderGraph();
    renderMobileExplorer();
    renderSidebar();
    updateVisibility();
  }

  function updateCenterCard() {
    const center = state.nodesById.get(state.centerId);
    if (!center) return;
    els.centerPantheon.textContent = center.pantheonLabel || capitalize(center.pantheon);
    els.centerName.textContent = center.unicode;
    els.centerDomain.textContent = center.domain || '';
    els.centerTempleLink.href = `/sites/${center.id}/`;
  }

  function pantheonColor(p) {
    return PANTHEON_COLORS[p] || '#999';
  }

  function domainColor(d) {
    return d?.color || '#D4AF37';
  }

  function layoutMandala() {
    const cx = state.width / 2;
    const cy = state.height / 2;
    const minDim = Math.min(state.width, state.height);
    const rConcept = minDim * 0.36;
    const rMin = minDim * 0.14;
    const n = Math.max(1, state.branches.length);
    const startAngle = -Math.PI / 2;
    const step = (2 * Math.PI) / n;

    const nodes = [];
    const arms = [];

    const centerNode = {
      id: state.centerId,
      type: 'center',
      x: cx,
      y: cy,
      radius: 0,
      data: state.nodesById.get(state.centerId),
    };
    nodes.push(centerNode);

    state.branches.forEach((branch, i) => {
      const angle = startAngle + i * step;
      const conceptX = cx + Math.cos(angle) * rConcept;
      const conceptY = cy + Math.sin(angle) * rConcept;

      const concept = {
        id: branch.conceptId,
        type: 'concept',
        x: conceptX,
        y: conceptY,
        radius: 18,
        angle,
        color: domainColor(branch.domain),
        glow: branch.domain?.glow,
        label: branch.label,
        domain: branch.domain,
        data: branch,
      };
      nodes.push(concept);

      const arm = {
        id: `arm-${branch.conceptId}`,
        conceptId: branch.conceptId,
        angle,
        color: concept.color,
        glow: concept.glow,
        x1: cx,
        y1: cy,
        x2: conceptX,
        y2: conceptY,
      };
      arms.push(arm);

      const count = branch.items.length;
      const spread = Math.min(0.18, count * 0.02);
      branch.items.forEach((item, idx) => {
        const strength = item.strength || 1;
        const r = rMin + (rConcept - rMin - 30) * ((4 - strength) / 3);
        const offset = count === 1 ? 0 : (idx - (count - 1) / 2) * spread;
        const itemAngle = angle + offset;
        const deity = {
          id: item.targetId,
          type: 'deity',
          x: cx + Math.cos(itemAngle) * r,
          y: cy + Math.sin(itemAngle) * r,
          radius: 6 + strength * 2,
          color: pantheonColor(item.target.pantheon),
          angle: itemAngle,
          armAngle: angle,
          conceptId: branch.conceptId,
          strength,
          label: item.target.unicode,
          data: item.target,
        };
        nodes.push(deity);
      });
    });

    return { nodes, arms };
  }

  function renderGraph() {
    if (!state.branches.length) {
      els.svg.selectAll('*').remove();
      return;
    }

    measureGraph();
    els.svg.selectAll('*').remove();

    const { nodes, arms } = layoutMandala();

    const g = els.svg.append('g').attr('class', 'mandala-root');

    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        state.currentTransform = event.transform;
        g.attr('transform', event.transform);
      });

    els.svg.call(zoom).on('dblclick.zoom', null);

    // Background domain rings
    const ringGroup = g.append('g').attr('class', 'mandala-rings');
    const minDim = Math.min(state.width, state.height);
    [0.18, 0.36].forEach((f, i) => {
      ringGroup
        .append('circle')
        .attr('cx', state.width / 2)
        .attr('cy', state.height / 2)
        .attr('r', minDim * f)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(212,175,55,0.08)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', i === 0 ? '4 4' : '0');
    });

    // Arms
    const armGroup = g.append('g').attr('class', 'mandala-arms');
    armGroup
      .selectAll('path')
      .data(arms)
      .join('path')
      .attr('class', 'mandala-arm-glow')
      .attr('d', (d) => `M${d.x1},${d.y1} L${d.x2},${d.y2}`)
      .attr('stroke', (d) => d.color);

    armGroup
      .selectAll('path.arm-main')
      .data(arms)
      .join('path')
      .attr('class', 'mandala-arm')
      .attr('data-concept', (d) => d.conceptId)
      .attr('d', (d) => `M${d.x1},${d.y1} L${d.x2},${d.y2}`)
      .attr('stroke', (d) => d.color)
      .on('mouseenter', (_event, d) => highlightArm(d.conceptId))
      .on('mouseleave', clearHighlight)
      .on('click', (_event, d) => selectConcept(d.conceptId));

    // Concept labels at outer edge
    g.append('g')
      .attr('class', 'mandala-arm-labels')
      .selectAll('text')
      .data(arms)
      .join('text')
      .attr('class', 'mandala-arm-label')
      .attr('x', (d) => d.x2 + Math.cos(d.angle) * 26)
      .attr('y', (d) => d.y2 + Math.sin(d.angle) * 26)
      .attr('transform', (d) => {
        let deg = (d.angle * 180) / Math.PI;
        if (deg > 90 || deg < -90) deg += 180;
        return `rotate(${deg}, ${d.x2 + Math.cos(d.angle) * 26}, ${d.y2 + Math.sin(d.angle) * 26})`;
      })
      .text((d) => d.conceptId.split('-').slice(0, 2).map(capitalize).join(' / '));

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'mandala-nodes');
    const nodeSel = nodeGroup
      .selectAll('g')
      .data(nodes.filter((n) => n.type !== 'center'), (d) => d.id)
      .join('g')
      .attr('class', (d) => `mandala-group ${d.type === 'concept' ? 'mandala-concept' : 'mandala-deity'}`)
      .attr('data-id', (d) => d.id)
      .attr('data-concept', (d) => d.conceptId || d.id)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .on('mouseenter', (_event, d) => {
        if (d.type === 'concept') highlightArm(d.id);
        else highlightDeity(d.id);
      })
      .on('mouseleave', clearHighlight)
      .on('click', (_event, d) => {
        if (d.type === 'concept') selectConcept(d.id);
        else loadGraph(d.id);
      });

    nodeSel.each(function (d) {
      const sel = d3.select(this);
      if (d.type === 'concept') {
        const r = d.radius;
        const points = [
          `${0},${-r}`,
          `${r},${0}`,
          `${0},${r}`,
          `${-r},${0}`,
        ].join(' ');
        sel
          .append('polygon')
          .attr('class', 'mandala-concept-shape')
          .attr('points', points)
          .attr('stroke', d.color);
      } else {
        sel
          .append('circle')
          .attr('class', 'mandala-deity-shape')
          .attr('r', d.radius)
          .attr('fill', d.color);
      }
    });

    nodeSel
      .append('text')
      .attr('class', 'mandala-node-label')
      .attr('dy', (d) => d.radius + 13)
      .text((d) => d.label)
      .style('opacity', (d) => (d.type === 'concept' || d.strength >= 2 || state.branches.length <= 8 ? 1 : 0.55));

    renderLegend();

    // Initial zoom fit
    const bounds = g.node().getBBox();
    const fullWidth = state.width;
    const fullHeight = state.height;
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;
    const scale = Math.min(0.9, 0.9 * Math.min(fullWidth / bounds.width, fullHeight / bounds.height));
    const transform = d3.zoomIdentity
      .translate(fullWidth / 2, fullHeight / 2)
      .scale(scale)
      .translate(-midX, -midY);
    els.svg.call(zoom.transform, transform);
  }

  function renderLegend() {
    const pantheons = Array.from(
      new Set(state.graphData.nodes.map((n) => n.pantheon)),
    ).sort();

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

  function highlightArm(conceptId) {
    const root = els.svg.select('.mandala-root');
    if (root.empty()) return;
    root.classed('dimmed', true);
    root.selectAll(`[data-concept="${conceptId}"]`).classed('dimmed', false).classed('highlight', true);
    root.selectAll('.mandala-deity').filter((d) => d.conceptId === conceptId).classed('dimmed', false);
  }

  function highlightDeity(deityId) {
    const root = els.svg.select('.mandala-root');
    if (root.empty()) return;
    root.classed('dimmed', true);
    root.selectAll(`[data-id="${deityId}"]`).classed('dimmed', false).classed('highlight', true);
    const deity = root.selectAll('.mandala-deity').filter((d) => d.id === deityId).datum();
    if (deity) {
      root.selectAll(`[data-concept="${deity.conceptId}"]`).classed('dimmed', false).classed('highlight', true);
    }
  }

  function clearHighlight() {
    const root = els.svg.select('.mandala-root');
    if (root.empty()) return;
    root.classed('dimmed', false);
    root.selectAll('.highlight').classed('highlight', false);
  }

  function updateVisibility() {
    const root = els.svg.select('.mandala-root');
    if (root.empty()) return;
    const selectedId = state.selectedId;
    root.selectAll('.mandala-deity').classed('selected', (d) => d.id === selectedId);
    root.selectAll('.mandala-concept').classed('selected', (d) => d.id === selectedId);
  }

  function selectConcept(conceptId) {
    state.selectedId = conceptId;
    state.selectedType = 'concept';
    renderSidebar();
    updateVisibility();
    if (window.innerWidth < 900) {
      document.getElementById('connections-sidebar').scrollIntoView({ behavior: 'smooth' });
    }
  }

  function selectDeity(deityId) {
    state.selectedId = deityId;
    state.selectedType = 'deity';
    renderSidebar();
    updateVisibility();
    if (window.innerWidth < 900) {
      document.getElementById('connections-sidebar').scrollIntoView({ behavior: 'smooth' });
    }
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
    els.sidebarApiLink.href = `/api/v1/names/${deityId}`;

    const branchesForNode = state.branches.filter((b) => b.items.some((i) => i.targetId === deityId));
    let html = '';
    if (!branchesForNode.length) {
      html = '<li class="connection-empty">No visible connections for this filter set.</li>';
    } else {
      for (const branch of branchesForNode) {
        const item = branch.items.find((i) => i.targetId === deityId);
        html += `
          <li class="connection-item" data-target="${deityId}" data-concept="${branch.conceptId}">
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
    els.sidebarApiLink.href = '/api/v1/connections/taxonomy';
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
        if (conceptId) {
          selectConcept(conceptId);
        } else if (targetId) {
          loadGraph(targetId);
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
      chip.addEventListener('click', () => loadGraph(chip.dataset.id));
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
        const id = el.dataset.id;
        onSelect(id);
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
    document.getElementById('compare-search-results').classList.remove('is-open');
    document.getElementById('compare-search-results').innerHTML = '';
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

    const centerOnly = state.branches
      .filter((b) => !sharedIds.includes(b.conceptId))
      .map((b) => b.concept)
      .filter(Boolean)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const targetBranches = buildBranches(
      state.compareTarget,
      state.compareGraph.edges,
      new Map(state.compareGraph.nodes.map((n) => [n.id, n])),
      state.taxonomy,
      { minStrength: 1, activeCategories: state.activeCategories },
    );
    const targetOnly = targetBranches
      .filter((b) => !sharedIds.includes(b.conceptId))
      .map((b) => b.concept)
      .filter(Boolean)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

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
        closeCompare();
        selectConcept(cid);
      });
    });
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
    if (state.branches.length) renderGraph();
  });
  resizeObserver.observe(els.graphWrap);

  // ─── Init ───
  async function init() {
    await loadTaxonomy();
    await loadGraph(getInitialCenter());
  }

  init();

  // Expose for tests/debug.
  window.PX_CONNECTIONS = { state, loadGraph, selectConcept, selectDeity };
})();
