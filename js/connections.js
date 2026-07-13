(function () {
  'use strict';

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
  };

  const CATEGORY_COLORS = {
    function: 'rgba(212, 175, 55, 0.45)',
    phenomenon: 'rgba(65, 105, 225, 0.45)',
    'narrative-role': 'rgba(50, 205, 50, 0.45)',
  };

  const DEFAULT_CENTER = 'zeus';

  const state = {
    centerId: null,
    graphData: { nodes: [], edges: [] },
    nodesById: new Map(),
    selectedId: null,
    minStrength: 1,
    activeCategories: new Set(['function', 'phenomenon', 'narrative-role']),
    activePantheons: new Set(),
    simulation: null,
    width: 0,
    height: 0,
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
    strengthSlider: document.getElementById('strength-slider'),
    categoryFilters: document.getElementById('category-filters'),
    pantheonFilters: document.getElementById('pantheon-filters'),
    sidebarEmpty: document.getElementById('sidebar-empty'),
    sidebarContent: document.getElementById('sidebar-content'),
    sidebarPantheon: document.getElementById('sidebar-pantheon'),
    sidebarTitle: document.getElementById('sidebar-title'),
    sidebarDomain: document.getElementById('sidebar-domain'),
    sidebarTempleLink: document.getElementById('sidebar-temple-link'),
    sidebarApiLink: document.getElementById('sidebar-api-link'),
    connectionList: document.getElementById('connection-list'),
    legend: document.getElementById('graph-legend'),
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
    if (hash) return hash;
    return DEFAULT_CENTER;
  }

  async function loadGraph(centerId) {
    clearError();
    els.loading.hidden = false;
    state.centerId = centerId;

    try {
      const data = await fetchJSON(
        `/api/v1/names/${encodeURIComponent(centerId)}/graph?limit=80&minStrength=1&depth=1`
      );
      const payload = data?.data || data;
      state.graphData.nodes = payload.nodes || [];
      state.graphData.edges = payload.edges || [];
      state.nodesById = new Map(state.graphData.nodes.map((n) => [n.id, n]));

      if (!state.nodesById.has(centerId)) {
        throw new Error(`Center node "${centerId}" was not returned by the graph API.`);
      }

      els.loading.hidden = true;
      updatePantheonFilters();
      renderGraph();
      selectNode(centerId, { scroll: false });
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError(`Could not load connections: ${err.message}`);
    }
  }

  function updatePantheonFilters() {
    const pantheons = Array.from(
      new Set(state.graphData.nodes.map((n) => n.pantheon).filter(Boolean))
    ).sort();

    // Preserve existing selections when possible; otherwise activate all.
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
            }><span style="color:${PANTHEON_COLORS[p] || '#ccc'}">${capitalize(p)}</span></label>`
        )
        .join('');

    els.pantheonFilters.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.activePantheons.add(input.value);
        else state.activePantheons.delete(input.value);
        input.parentElement.classList.toggle('active', input.checked);
        updateVisibility();
      });
    });
  }

  function capitalize(str) {
    return String(str).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function renderGraph() {
    if (state.simulation) {
      state.simulation.stop();
    }

    measureGraph();
    els.svg.selectAll('*').remove();

    const nodes = state.graphData.nodes.map((n) => ({ ...n }));
    const edges = state.graphData.edges.map((e) => ({ ...e }));

    const nodeDegree = new Map();
    for (const e of edges) {
      nodeDegree.set(e.source, (nodeDegree.get(e.source) || 0) + 1);
      nodeDegree.set(e.target, (nodeDegree.get(e.target) || 0) + 1);
    }
    for (const n of nodes) {
      n.degree = nodeDegree.get(n.id) || 0;
      n.radius = Math.min(18, Math.max(6, 5 + n.degree * 1.2));
    }

    const linkMap = new Map();
    for (const e of edges) {
      const key = [e.source, e.target].sort().join('|');
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    }

    const g = els.svg.append('g').attr('class', 'graph-root');

    const zoom = d3
      .zoom()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    els.svg.call(zoom).on('dblclick.zoom', null);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance((d) => 90 - (d.strength || 1) * 12)
      )
      .force('charge', d3.forceManyBody().strength(-360))
      .force('center', d3.forceCenter(state.width / 2, state.height / 2))
      .force('collide', d3.forceCollide().radius((d) => d.radius + 6).iterations(2));

    state.simulation = simulation;

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const link = linkGroup
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', (d) => CATEGORY_COLORS[d.category] || 'rgba(160,160,160,0.25)')
      .attr('stroke-width', (d) => d.strength || 1)
      .attr('stroke-opacity', 0.45)
      .attr('data-source', (d) => d.source)
      .attr('data-target', (d) => d.target);

    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'graph-node')
      .attr('data-id', (d) => d.id)
      .call(
        d3
          .drag()
          .clickDistance(5)
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => PANTHEON_COLORS[d.pantheon] || '#999')
      .attr('stroke', 'rgba(255,255,255,0.85)')
      .attr('stroke-width', 1.2);

    node
      .append('text')
      .attr('dy', (d) => d.radius + 12)
      .attr('text-anchor', 'middle')
      .text((d) => (d.degree >= 3 || d.id === state.centerId ? d.unicode : ''))
      .style('opacity', (d) => (d.degree >= 3 || d.id === state.centerId ? 1 : 0));

    node
      .on('mouseenter', (_event, d) => highlightNeighbors(d.id))
      .on('mouseleave', () => updateVisibility())
      .on('click', (_event, d) => {
        selectNode(d.id, { scroll: true });
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    renderLegend();
    updateVisibility();

    // Center the view on load.
    const centerNode = nodes.find((n) => n.id === state.centerId);
    if (centerNode) {
      window.setTimeout(() => {
        els.svg
          .transition()
          .duration(600)
          .call(
            zoom.transform,
            d3.zoomIdentity
              .translate(state.width / 2, state.height / 2)
              .scale(0.9)
              .translate(-centerNode.x, -centerNode.y)
          );
      }, 50);
    }
  }

  function renderLegend() {
    const pantheons = Array.from(
      new Set(state.graphData.nodes.map((n) => n.pantheon).filter(Boolean))
    ).sort();
    els.legend.innerHTML =
      '<span class="legend-title">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${
              PANTHEON_COLORS[p] || '#999'
            }"></span><span>${capitalize(p)}</span></div>`
        )
        .join('');
  }

  function updateVisibility() {
    const selectedId = state.selectedId;

    els.svg.selectAll('.graph-node').classed('dimmed', function (d) {
      if (selectedId && d.id === selectedId) return false;
      if (!state.activePantheons.has(d.pantheon)) return true;
      return false;
    });

    els.svg.selectAll('.graph-link').classed('dimmed', function (d) {
      if (!state.activeCategories.has(d.category)) return true;
      if ((d.strength || 1) < state.minStrength) return true;
      if (selectedId && (d.source.id === selectedId || d.target.id === selectedId)) return false;
      if (selectedId) return true;
      return false;
    });

    els.svg.selectAll('.graph-node').classed('selected', (d) => d.id === selectedId);
  }

  function highlightNeighbors(id) {
    els.svg
      .selectAll('.graph-node')
      .classed('dimmed', (d) => d.id !== id && !isNeighbor(state.graphData.edges, d.id, id));
    els.svg.selectAll('.graph-link').classed('dimmed', (d) => {
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      return sourceId !== id && targetId !== id;
    });
  }

  const { filterEdgesForNode, isNeighbor } =
    typeof PX_CONNECTIONS_HELPERS !== 'undefined'
      ? PX_CONNECTIONS_HELPERS
      : require('./connections-helpers.js');

  function selectNode(id, { scroll = true } = {}) {
    state.selectedId = id;
    const node = state.nodesById.get(id);
    if (!node) return;

    els.sidebarEmpty.hidden = true;
    els.sidebarContent.hidden = false;

    els.sidebarPantheon.textContent = node.pantheonLabel || capitalize(node.pantheon);
    els.sidebarTitle.textContent = node.unicode;
    els.sidebarDomain.textContent = node.domain || '';
    els.sidebarTempleLink.href = `/sites/${id}/`;
    els.sidebarApiLink.href = `/api/v1/names/${id}`;

    const edges = filterEdgesForNode(
      state.graphData.edges,
      id,
      state.nodesById,
      state.activeCategories,
      state.minStrength,
    );

    els.connectionList.innerHTML = edges
      .map(
        (e) => `
      <li class="connection-item" data-target="${e.targetId}">
        <span class="connection-strength s${e.strength || 1}">${e.strength || 1}</span>
        <div class="connection-body">
          <div class="connection-target">${e.target?.unicode || e.targetId}</div>
          <div class="connection-rel">${escapeHtml(e.relationship)} &middot; ${capitalize(
          e.category
        )}</div>
          ${e.note ? `<div class="connection-note">${escapeHtml(e.note)}</div>` : ''}
        </div>
      </li>
    `
      )
      .join('');

    els.connectionList.querySelectorAll('.connection-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.dataset.target;
        loadGraph(targetId);
        if (scroll) {
          document.querySelector('.connections-stage').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    updateVisibility();

    if (scroll && window.innerWidth < 900) {
      document.getElementById('connections-sidebar').scrollIntoView({ behavior: 'smooth' });
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      const data = await fetch(
        `/api/v1/autocomplete?q=${encodeURIComponent(q)}&limit=8`,
        { signal: searchAbort.signal }
      ).then((r) => r.json());
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
    `
      )
      .join('');
    els.searchResults.classList.add('is-open');

    els.searchResults.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        els.searchInput.value = '';
        closeSearch();
        loadGraph(id);
      });
    });
  }

  const debouncedSearch = debounce(performSearch, 180);

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
    updateVisibility();
    if (state.selectedId) selectNode(state.selectedId, { scroll: false });
  });

  els.categoryFilters.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) state.activeCategories.add(input.value);
      else state.activeCategories.delete(input.value);
      input.parentElement.classList.toggle('active', input.checked);
      updateVisibility();
      if (state.selectedId) selectNode(state.selectedId, { scroll: false });
    });
  });

  els.resetBtn.addEventListener('click', () => {
    state.minStrength = 1;
    els.strengthSlider.value = 1;
    state.activeCategories = new Set(['function', 'phenomenon', 'narrative-role']);
    els.categoryFilters.querySelectorAll('input').forEach((input) => {
      input.checked = true;
      input.parentElement.classList.add('active');
    });
    loadGraph(state.centerId || DEFAULT_CENTER);
  });

  els.randomBtn.addEventListener('click', () => {
    if (!state.graphData.nodes.length) return;
    const idx = Math.floor(Math.random() * state.graphData.nodes.length);
    loadGraph(state.graphData.nodes[idx].id);
  });

  // ─── Resize ───
  const resizeObserver = new ResizeObserver(() => {
    if (state.graphData.nodes.length) renderGraph();
  });
  resizeObserver.observe(els.graphWrap);

  // ─── Init ───
  loadGraph(getInitialCenter());

  // Expose for tests/debug.
  window.PX_CONNECTIONS = { state, loadGraph, selectNode };
})();
