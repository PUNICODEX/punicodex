(function () {
  'use strict';

  const {
    filterEdgesForNode,
    isNeighbor,
    deriveConcepts,
    buildConceptEdges,
    getRelatedConcepts,
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

  const CATEGORY_COLORS = {
    function: 'rgba(212, 175, 55, 0.55)',
    phenomenon: 'rgba(65, 105, 225, 0.55)',
    'narrative-role': 'rgba(50, 205, 50, 0.55)',
  };

  const CATEGORY_GLOW = {
    function: 'rgba(212, 175, 55, 0.35)',
    phenomenon: 'rgba(65, 105, 225, 0.35)',
    'narrative-role': 'rgba(50, 205, 50, 0.35)',
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
    showConcepts: true,
    simulation: null,
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
    toggleConcepts: document.getElementById('toggle-concepts'),
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
        `/api/v1/names/${encodeURIComponent(centerId)}/graph?limit=80&minStrength=1&depth=1`,
      );
      const payload = data?.data || data;
      const deityNodes = (payload.nodes || []).map((n) => ({ ...n, type: 'deity' }));
      const deityEdges = (payload.edges || []).map((e) => ({ ...e, type: 'deity-deity' }));

      const conceptNodes = deriveConcepts(deityEdges);
      const conceptEdges = buildConceptEdges(deityEdges);

      state.graphData.nodes = [...deityNodes, ...conceptNodes];
      state.graphData.edges = [...deityEdges, ...conceptEdges];
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
      new Set(state.graphData.nodes.filter((n) => n.type === 'deity').map((n) => n.pantheon)),
    ).sort();

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
            }><span style="color:${PANTHEON_COLORS[p] || '#ccc'}">${capitalize(p)}</span></label>`,
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

  function nodeRadius(d) {
    if (d.type === 'concept') return 22 + (d.strength || 1) * 3;
    return Math.min(18, Math.max(6, 5 + (d.degree || 0) * 1.2));
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
      n.radius = nodeRadius(n);
    }

    const g = els.svg.append('g').attr('class', 'graph-root');

    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        state.currentTransform = event.transform;
        g.attr('transform', event.transform);
      });

    els.svg.call(zoom).on('dblclick.zoom', null);

    // Cluster centers for concept nodes
    const categories = Array.from(new Set(nodes.filter((n) => n.type === 'concept').map((n) => n.category)));
    const clusterCenters = {};
    categories.forEach((cat, i) => {
      const angle = (i / Math.max(1, categories.length)) * Math.PI * 2 - Math.PI / 2;
      clusterCenters[cat] = {
        x: state.width / 2 + Math.cos(angle) * state.width * 0.22,
        y: state.height / 2 + Math.sin(angle) * state.height * 0.22,
      };
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance((d) => {
            if (d.type === 'concept-deity') return 70 - (d.strength || 1) * 8;
            return 110 - (d.strength || 1) * 12;
          }),
      )
      .force('charge', d3.forceManyBody().strength((d) => (d.type === 'concept' ? -500 : -300)))
      .force('center', d3.forceCenter(state.width / 2, state.height / 2))
      .force(
        'collide',
        d3
          .forceCollide()
          .radius((d) => d.radius + 8)
          .iterations(2),
      )
      .force(
        'cluster',
        d3
          .forceX((d) => (d.type === 'concept' ? clusterCenters[d.category]?.x || state.width / 2 : state.width / 2))
          .strength((d) => (d.type === 'concept' ? 0.25 : 0.03)),
      )
      .force(
        'clusterY',
        d3
          .forceY((d) => (d.type === 'concept' ? clusterCenters[d.category]?.y || state.height / 2 : state.height / 2))
          .strength((d) => (d.type === 'concept' ? 0.25 : 0.03)),
      );

    state.simulation = simulation;

    // Background nebula glow per cluster
    const nebulaGroup = g.append('g').attr('class', 'nebulae').lower();
    categories.forEach((cat) => {
      const center = clusterCenters[cat];
      nebulaGroup
        .append('circle')
        .attr('class', `nebula nebula-${cat}`)
        .attr('cx', center.x)
        .attr('cy', center.y)
        .attr('r', Math.min(state.width, state.height) * 0.28)
        .attr('fill', CATEGORY_GLOW[cat] || 'rgba(212,175,55,0.05)')
        .attr('opacity', 0.4)
        .style('pointer-events', 'none');
    });

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const link = linkGroup
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('class', (d) => `graph-link ${d.type || ''}`)
      .attr('stroke', (d) => {
        if (d.type === 'concept-deity') return CATEGORY_COLORS[d.category] || 'rgba(160,160,160,0.35)';
        return CATEGORY_COLORS[d.category] || 'rgba(160,160,160,0.25)';
      })
      .attr('stroke-width', (d) => (d.type === 'concept-deity' ? 1.2 : d.strength || 1))
      .attr('stroke-opacity', (d) => (d.type === 'concept-deity' ? 0.35 : 0.25))
      .attr('stroke-dasharray', (d) => (d.type === 'concept-deity' ? '4 4' : '0'));

    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', (d) => `graph-node ${d.type || ''}`)
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
          }),
      );

    // Glow ring
    node
      .append('circle')
      .attr('class', 'node-glow')
      .attr('r', (d) => d.radius + 6)
      .attr('fill', (d) => {
        if (d.type === 'concept') return CATEGORY_GLOW[d.category] || 'rgba(212,175,55,0.15)';
        return PANTHEON_COLORS[d.pantheon] || '#999';
      })
      .attr('opacity', 0.25);

    // Main shape
    node
      .append((d) => (d.type === 'concept' ? document.createElementNS('http://www.w3.org/2000/svg', 'polygon') : document.createElementNS('http://www.w3.org/2000/svg', 'circle')))
      .attr('class', 'node-shape')
      .each(function (d) {
        if (d.type === 'concept') {
          const r = d.radius;
          const points = [];
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            points.push(`${Math.cos(angle) * r},${Math.sin(angle) * r}`);
          }
          d3.select(this).attr('points', points.join(' '));
        } else {
          d3.select(this).attr('r', d.radius);
        }
      })
      .attr('fill', (d) => {
        if (d.type === 'concept') return 'rgba(10,10,12,0.95)';
        return PANTHEON_COLORS[d.pantheon] || '#999';
      })
      .attr('stroke', (d) => {
        if (d.type === 'concept') return CATEGORY_COLORS[d.category] || 'rgba(160,160,160,0.5)';
        return 'rgba(255,255,255,0.85)';
      })
      .attr('stroke-width', (d) => (d.type === 'concept' ? 2 : 1.2));

    // Labels
    node
      .append('text')
      .attr('dy', (d) => d.radius + 14)
      .attr('text-anchor', 'middle')
      .text((d) => {
        if (d.type === 'concept') return d.unicode;
        return d.degree >= 2 || d.id === state.centerId ? d.unicode : '';
      })
      .style('opacity', (d) => (d.type === 'concept' || d.degree >= 2 || d.id === state.centerId ? 1 : 0))
      .style('font-size', (d) => (d.type === 'concept' ? '9px' : '10px'))
      .style('fill', (d) => (d.type === 'concept' ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)'));

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

    const centerNode = nodes.find((n) => n.id === state.centerId);
    if (centerNode) {
      window.setTimeout(() => {
        els.svg
          .transition()
          .duration(600)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(state.width / 2, state.height / 2).scale(0.85).translate(-centerNode.x, -centerNode.y),
          );
      }, 50);
    }
  }

  function renderLegend() {
    const pantheons = Array.from(
      new Set(state.graphData.nodes.filter((n) => n.type === 'deity').map((n) => n.pantheon)),
    ).sort();
    const categories = Array.from(new Set(state.graphData.edges.map((e) => e.category).filter(Boolean))).sort();

    els.legend.innerHTML =
      '<span class="legend-title">Pantheons</span>' +
      pantheons
        .map(
          (p) =>
            `<div class="legend-item"><span class="legend-swatch" style="background:${
              PANTHEON_COLORS[p] || '#999'
            }"></span><span>${capitalize(p)}</span></div>`,
        )
        .join('') +
      '<span class="legend-title" style="margin-top:10px">Concepts</span>' +
      categories
        .map(
          (c) =>
            `<div class="legend-item"><span class="legend-swatch legend-swatch--hex" style="background:${
              CATEGORY_COLORS[c] || '#999'
            }"></span><span>${capitalize(c)}</span></div>`,
        )
        .join('');
  }

  function isNodeVisible(d) {
    if (d.type === 'concept') {
      return state.showConcepts && state.activeCategories.has(d.category);
    }
    return state.activePantheons.has(d.pantheon);
  }

  function isEdgeVisible(d) {
    if (!state.activeCategories.has(d.category)) return false;
    if ((d.strength || 1) < state.minStrength) return false;
    if (d.type === 'concept-deity' && !state.showConcepts) return false;
    return true;
  }

  function updateVisibility() {
    const selectedId = state.selectedId;

    els.svg.selectAll('.graph-node').style('display', (d) => (isNodeVisible(d) ? null : 'none'));
    els.svg.selectAll('.graph-link').style('display', (d) => (isEdgeVisible(d) ? null : 'none'));

    els.svg.selectAll('.graph-node').classed('dimmed', function (d) {
      if (!isNodeVisible(d)) return false;
      if (selectedId && d.id === selectedId) return false;
      return false;
    });

    els.svg.selectAll('.graph-link').classed('dimmed', function (d) {
      if (!isEdgeVisible(d)) return false;
      if (selectedId && (getNodeId(d.source) === selectedId || getNodeId(d.target) === selectedId)) return false;
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
      const sourceId = getNodeId(d.source);
      const targetId = getNodeId(d.target);
      return sourceId !== id && targetId !== id;
    });
  }

  function getNodeId(ref) {
    return typeof ref === 'object' ? ref.id : ref;
  }

  function selectNode(id, { scroll = true } = {}) {
    state.selectedId = id;
    const node = state.nodesById.get(id);
    if (!node) return;

    els.sidebarEmpty.hidden = true;
    els.sidebarContent.hidden = false;

    els.sidebarPantheon.textContent = node.pantheonLabel || capitalize(node.pantheon);
    els.sidebarTitle.textContent = node.unicode;
    els.sidebarDomain.textContent = node.domain || '';
    els.sidebarTempleLink.href = node.type === 'deity' ? `/sites/${id}/` : '/connections/';
    els.sidebarApiLink.href = node.type === 'deity' ? `/api/v1/names/${id}` : '/api/v1/similarities/relationships';

    if (node.type === 'concept') {
      renderConceptSidebar(node);
    } else {
      renderDeitySidebar(node);
    }

    updateVisibility();

    if (scroll && window.innerWidth < 900) {
      document.getElementById('connections-sidebar').scrollIntoView({ behavior: 'smooth' });
    }
  }

  function renderDeitySidebar(node) {
    const relatedConcepts = getRelatedConcepts(state.graphData.edges, node.id).filter((c) =>
      state.activeCategories.has(c.category),
    );

    const directEdges = filterEdgesForNode(
      state.graphData.edges.filter((e) => e.type === 'deity-deity'),
      node.id,
      state.nodesById,
      state.activeCategories,
      state.minStrength,
    );

    let html = '';

    if (relatedConcepts.length) {
      html += `<li class="connection-section">Concept clusters</li>`;
      html += relatedConcepts
        .map(
          (c) => `
        <li class="connection-item connection-item--concept" data-concept="${c.conceptId}">
          <span class="connection-strength s${c.strength || 1}">${c.strength || 1}</span>
          <div class="connection-body">
            <div class="connection-target">${escapeHtml(c.relationship)}</div>
            <div class="connection-rel">${capitalize(c.category)} cluster</div>
          </div>
        </li>
      `,
        )
        .join('');
    }

    if (directEdges.length) {
      html += `<li class="connection-section">Direct echoes</li>`;
      html += directEdges
        .map(
          (e) => `
        <li class="connection-item" data-target="${e.targetId}">
          <span class="connection-strength s${e.strength || 1}">${e.strength || 1}</span>
          <div class="connection-body">
            <div class="connection-target">${e.target?.unicode || e.targetId}</div>
            <div class="connection-rel">${escapeHtml(e.relationship)} &middot; ${capitalize(e.category)}</div>
            ${e.note ? `<div class="connection-note">${escapeHtml(e.note)}</div>` : ''}
          </div>
        </li>
      `,
        )
        .join('');
    }

    if (!html) {
      html = `<li class="connection-empty">Adjust filters to see connections.</li>`;
    }

    els.connectionList.innerHTML = html;
    wireConnectionClicks();
  }

  function renderConceptSidebar(node) {
    const memberEdges = state.graphData.edges.filter(
      (e) => e.type === 'concept-deity' && e.source === node.id && state.activeCategories.has(e.category),
    );

    const members = memberEdges
      .map((e) => state.nodesById.get(e.target))
      .filter(Boolean)
      .sort((a, b) => (b.degree || 0) - (a.degree || 0));

    const html =
      `<li class="connection-section">${members.length} deities share this pattern</li>` +
      members
        .map(
          (m) => `
        <li class="connection-item" data-target="${m.id}">
          <span class="connection-strength" style="background:${PANTHEON_COLORS[m.pantheon] || '#999'}"></span>
          <div class="connection-body">
            <div class="connection-target">${m.unicode}</div>
            <div class="connection-rel">${m.pantheonLabel || capitalize(m.pantheon)}${m.domain ? ` &middot; ${escapeHtml(m.domain)}` : ''}</div>
          </div>
        </li>
      `,
        )
        .join('');

    els.connectionList.innerHTML = html;
    wireConnectionClicks();
  }

  function wireConnectionClicks() {
    els.connectionList.querySelectorAll('.connection-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.dataset.target || item.dataset.concept;
        if (!targetId) return;
        if (item.dataset.concept) {
          selectNode(targetId, { scroll: true });
        } else {
          loadGraph(targetId);
        }
        if (window.innerWidth < 900) {
          document.querySelector('.connections-stage').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
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
      const data = await fetch(`/api/v1/autocomplete?q=${encodeURIComponent(q)}&limit=8`, {
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

  if (els.toggleConcepts) {
    els.toggleConcepts.addEventListener('change', () => {
      state.showConcepts = els.toggleConcepts.checked;
      els.toggleConcepts.parentElement.classList.toggle('active', state.showConcepts);
      updateVisibility();
      if (state.selectedId) selectNode(state.selectedId, { scroll: false });
    });
  }

  els.resetBtn.addEventListener('click', () => {
    state.minStrength = 1;
    els.strengthSlider.value = 1;
    state.activeCategories = new Set(['function', 'phenomenon', 'narrative-role']);
    state.activePantheons.clear();
    state.showConcepts = true;
    els.categoryFilters.querySelectorAll('input').forEach((input) => {
      input.checked = true;
      input.parentElement.classList.add('active');
    });
    loadGraph(state.centerId || DEFAULT_CENTER);
  });

  els.randomBtn.addEventListener('click', () => {
    const deities = state.graphData.nodes.filter((n) => n.type === 'deity');
    if (!deities.length) return;
    const idx = Math.floor(Math.random() * deities.length);
    loadGraph(deities[idx].id);
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
