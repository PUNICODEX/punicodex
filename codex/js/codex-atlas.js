/**
 * PÚNYCODEX — Codex Atlas
 * Interactive scholarly explorer driven by canonical lexicon data.
 */
(function () {
  'use strict';

  const PX = window.PX || {};
  const BASE_PATH = '/codex/data/';

  let lexiconData = null;
  let scriptsData = null;
  let sourcesData = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNumber(n) {
    return Number(n).toLocaleString();
  }

  function createEl(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html != null) el.innerHTML = html;
    return el;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════════════════════════════════════════════

  async function loadData() {
    const [lexRes, scriptsRes, sourcesRes] = await Promise.all([
      fetch(`${BASE_PATH}codex-lexicon.json`),
      fetch(`${BASE_PATH}original-scripts.json`),
      fetch(`${BASE_PATH}source-catalog.json`),
    ]);

    lexiconData = await lexRes.json();
    scriptsData = await scriptsRes.json();
    sourcesData = await sourcesRes.json();

    // Build lookup maps
    lexiconData.entryById = {};
    lexiconData.entryByAscii = {};
    for (const entry of lexiconData.entries) {
      lexiconData.entryById[entry.id] = entry;
      lexiconData.entryByAscii[entry.ascii.toLowerCase()] = entry;
    }

    return { lexicon: lexiconData, scripts: scriptsData, sources: sourcesData };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Live Stats
  // ═══════════════════════════════════════════════════════════════════════════

  function initStats() {
    const stats = lexiconData.stats;
    const map = {
      'stat-entries': stats.totalEntries,
      'stat-pantheons': stats.pantheons,
      'stat-owned': stats.owned,
      'stat-flagships': stats.flagships,
    };

    for (const [id, value] of Object.entries(map)) {
      const el = $(`#${id}`);
      if (!el) continue;
      animateNumber(el, value, 1200);
    }
  }

  function animateNumber(el, target, duration) {
    const start = performance.now();
    const startVal = 0;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Restoration Engine
  // ═══════════════════════════════════════════════════════════════════════════

  function initRestorationEngine() {
    const input = $('#codex-restore-input');
    const output = $('#codex-restore-output');
    if (!input || !output) return;

    const render = debounce(() => {
      const raw = input.value.trim().toLowerCase();
      if (!raw) {
        output.innerHTML = '<p class="restore-hint">Type an ASCII name above to see its Unicode restoration.</p>';
        return;
      }

      const entry = lexiconData.entryByAscii[raw] || lexiconData.entryById[raw];
      if (!entry) {
        output.innerHTML = `
          <div class="restore-empty">
            <p class="restore-empty-title">“${escapeHtml(input.value)}” is not in the lexicon yet.</p>
            <p class="restore-empty-body">Try names like <strong>zeus</strong>, <strong>apollon</strong>, <strong>nike</strong>, <strong>thor</strong>, or <strong>anubis</strong>.</p>
            <a href="/type/#${escapeHtml(raw)}" class="btn btn-ghost btn-sm">Open the Type Tool</a>
          </div>
        `;
        return;
      }

      output.innerHTML = buildRestorationResult(entry);
    }, 150);

    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render();
    });

    // Seed with a rotating featured name
    const seeds = ['apollon', 'zeus', 'nike', 'thor', 'anubis', 'freyja', 'ra', 'shiva'];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    input.value = seed;
    render();
  }

  function buildRestorationResult(entry) {
    const breakdown = (lexiconData.breakdowns[entry.id] || [])
      .map((b) => {
        const typeClass = `breakdown-type-${b.type}`;
        return `
          <div class="breakdown-row">
            <span class="breakdown-char">${escapeHtml(b.char)}</span>
            <span class="breakdown-arrow">→</span>
            <span class="breakdown-char breakdown-char-to">${escapeHtml(b.to)}</span>
            <span class="breakdown-type ${typeClass}">${escapeHtml(b.type)}</span>
            <span class="breakdown-note">${escapeHtml(b.note)}</span>
          </div>
        `;
      })
      .join('');

    const variants = entry.variants && entry.variants.length
      ? entry.variants
          .map((v) => `<span class="restore-variant" title="${escapeHtml(v.type)}">${escapeHtml(v.unicode)}</span>`)
          .join('')
      : '<span class="restore-variant restore-variant-none">—</span>';

    const tierClass = `tier-badge tier-${entry.tier}`;

    return `
      <div class="restore-result">
        <div class="restore-header">
          <div class="restore-name">
            <span class="restore-unicode">${escapeHtml(entry.unicode)}</span>
            <span class="restore-ascii">${escapeHtml(entry.ascii)}</span>
          </div>
          <div class="restore-meta">
            <span class="${tierClass}">${escapeHtml(entry.tierLabel)}</span>
            <span class="pantheon-badge pantheon-${entry.pantheon}">${escapeHtml(entry.pantheon)}</span>
            ${entry.isOwned ? '<span class="owned-badge">PUNYCODEX Domain</span>' : ''}
          </div>
        </div>
        <p class="restore-meaning">${escapeHtml(entry.meaning || entry.domain)}</p>
        <div class="restore-scripts">
          <div class="restore-script">
            <span class="restore-script-label">Greek / Original</span>
            <span class="restore-script-value">${escapeHtml(entry.greek || '—')}</span>
          </div>
          <div class="restore-script">
            <span class="restore-script-label">Punycode</span>
            <span class="restore-script-value mono">${escapeHtml(entry.punycode)}</span>
          </div>
        </div>
        <div class="restore-section-title">ASCII → Unicode Breakdown</div>
        <div class="breakdown-grid">
          ${breakdown || '<p class="restore-hint">No character breakdown available.</p>'}
        </div>
        <div class="restore-section-title">Documented Variants</div>
        <div class="restore-variants">
          ${variants}
        </div>
        <div class="restore-actions">
          <a href="/sites/${entry.id}/" class="btn btn-primary btn-sm">Enter the Temple</a>
          <a href="/type/#${entry.id}" class="btn btn-ghost btn-sm">Open in Type Tool</a>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pantheon Constellation
  // ═══════════════════════════════════════════════════════════════════════════

  function initConstellation() {
    const container = $('#constellation-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.min(640, window.innerHeight * 0.65);
    container.style.height = `${height}px`;

    const svg = createEl('svg', 'constellation-svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    container.appendChild(svg);

    // Build nodes and edges
    const nodes = lexiconData.entries.map((entry) => ({
      id: entry.id,
      name: entry.unicode,
      pantheon: entry.pantheon,
      tier: entry.tier,
      isOwned: entry.isOwned,
      hasFlagship: entry.hasFlagship,
      radius: entry.tier === 'dual' ? 7 : entry.tier === '1' ? 5 : 3.5,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edges = [];

    // Edges: same pantheon + shared proto-language + variants
    const protoGroups = {};
    for (const entry of lexiconData.entries) {
      if (!entry.protoLanguage) continue;
      if (!protoGroups[entry.protoLanguage]) protoGroups[entry.protoLanguage] = [];
      protoGroups[entry.protoLanguage].push(entry.id);
    }

    for (const group of Object.values(protoGroups)) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          edges.push({ source: group[i], target: group[j], type: 'etymology' });
        }
      }
    }

    // Add pantheon cluster edges (sample, not all pairs)
    const pantheonGroups = {};
    for (const entry of lexiconData.entries) {
      if (!pantheonGroups[entry.pantheon]) pantheonGroups[entry.pantheon] = [];
      pantheonGroups[entry.pantheon].push(entry.id);
    }
    for (const group of Object.values(pantheonGroups)) {
      if (group.length < 2) continue;
      // Connect each node to a few neighbors to create clusters
      group.sort(() => Math.random() - 0.5);
      for (let i = 0; i < group.length; i++) {
        const next = (i + 1) % group.length;
        edges.push({ source: group[i], target: group[next], type: 'pantheon' });
        if (i + 2 < group.length) {
          edges.push({ source: group[i], target: group[i + 2], type: 'pantheon' });
        }
      }
    }

    // Resolve edge endpoints to node objects
    for (const edge of edges) {
      edge.sourceNode = nodeMap.get(edge.source);
      edge.targetNode = nodeMap.get(edge.target);
    }
    const validEdges = edges.filter((e) => e.sourceNode && e.targetNode);

    // Force simulation (custom, lightweight)
    const centerX = width / 2;
    const centerY = height / 2;
    const pantheonCenters = computePantheonCenters(width, height);

    function computePantheonCenters(w, h) {
      const pantheons = Object.keys(lexiconData.pantheonColors);
      const count = pantheons.length;
      const centers = {};
      const radius = Math.min(w, h) * 0.38;
      pantheons.forEach((p, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        centers[p] = { x: w / 2 + Math.cos(angle) * radius, y: h / 2 + Math.sin(angle) * radius };
      });
      return centers;
    }

    let iteration = 0;
    const maxIterations = 300;
    const alpha = 0.05;

    function tick() {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 4;
          if (dist < minDist) dist = minDist;
          const force = (200 * (a.radius + b.radius)) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Attraction along edges
      for (const edge of validEdges) {
        const a = edge.sourceNode;
        const b = edge.targetNode;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = edge.type === 'etymology' ? 60 : 80;
        const strength = edge.type === 'etymology' ? 0.008 : 0.003;
        const force = (dist - target) * strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Pantheon gravity
      for (const node of nodes) {
        const center = pantheonCenters[node.pantheon] || { x: centerX, y: centerY };
        const dx = center.x - node.x;
        const dy = center.y - node.y;
        node.vx += dx * 0.0008;
        node.vy += dy * 0.0008;
      }

      // Center gravity
      for (const node of nodes) {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.0002;
        node.vy += dy * 0.0002;
      }

      // Update positions with damping
      for (const node of nodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Boundaries
        const r = node.radius + 2;
        node.x = Math.max(r, Math.min(width - r, node.x));
        node.y = Math.max(r, Math.min(height - r, node.y));
      }

      iteration++;
      if (iteration < maxIterations) {
        requestAnimationFrame(tick);
      }
      renderConstellation();
    }

    // Tooltip
    const tooltip = createEl('div', 'constellation-tooltip');
    container.appendChild(tooltip);

    function renderConstellation() {
      // Edges
      let edgeEls = svg.querySelectorAll('.constellation-edge');
      if (edgeEls.length !== validEdges.length) {
        svg.innerHTML = '';
        for (const edge of validEdges) {
          const line = createEl('line', 'constellation-edge');
          line.setAttribute('data-type', edge.type);
          svg.appendChild(line);
        }
        for (const node of nodes) {
          const circle = createEl('circle', 'constellation-node');
          circle.setAttribute('data-id', node.id);
          circle.setAttribute('data-pantheon', node.pantheon);
          circle.setAttribute('data-tier', node.tier);
          circle.setAttribute('data-owned', node.isOwned ? '1' : '0');
          circle.setAttribute('r', node.radius);
          circle.addEventListener('mouseenter', (e) => showTooltip(e, node));
          circle.addEventListener('mouseleave', hideTooltip);
          circle.addEventListener('click', () => {
            window.location.href = `/sites/${node.id}/`;
          });
          svg.appendChild(circle);
        }
        edgeEls = svg.querySelectorAll('.constellation-edge');
      }

      const nodeEls = svg.querySelectorAll('.constellation-node');
      for (let i = 0; i < validEdges.length; i++) {
        const edge = validEdges[i];
        const line = edgeEls[i];
        line.setAttribute('x1', edge.sourceNode.x);
        line.setAttribute('y1', edge.sourceNode.y);
        line.setAttribute('x2', edge.targetNode.x);
        line.setAttribute('y2', edge.targetNode.y);
      }
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const circle = nodeEls[i];
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
      }
    }

    function showTooltip(e, node) {
      const entry = lexiconData.entryById[node.id];
      tooltip.innerHTML = `
        <strong>${escapeHtml(node.name)}</strong>
        <span>${escapeHtml(entry.pantheon)} · ${escapeHtml(entry.tierLabel)}${node.isOwned ? ' · Owned' : ''}</span>
      `;
      tooltip.style.opacity = '1';
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left + 12}px`;
      tooltip.style.top = `${e.clientY - rect.top + 12}px`;
    }

    function hideTooltip() {
      tooltip.style.opacity = '0';
    }

    // Filter controls
    const filterContainer = $('#constellation-filters');
    if (filterContainer) {
      const pantheons = [...new Set(nodes.map((n) => n.pantheon))].sort();
      pantheons.forEach((p) => {
        const btn = createEl('button', 'constellation-filter active');
        btn.textContent = p;
        btn.style.setProperty('--filter-color', lexiconData.pantheonColors[p] || '#d4af37');
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          const active = btn.classList.contains('active');
          for (const node of nodes) {
            if (node.pantheon === p) {
              const el = svg.querySelector(`.constellation-node[data-id="${node.id}"]`);
              if (el) el.style.display = active ? '' : 'none';
            }
          }
        });
        filterContainer.appendChild(btn);
      });
    }

    tick();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Script Atlas
  // ═══════════════════════════════════════════════════════════════════════════

  function initScriptAtlas() {
    const container = $('#script-atlas');
    if (!container) return;

    for (const item of scriptsData.atlas) {
      const card = createEl('div', 'script-atlas-card');
      card.innerHTML = `
        <div class="script-atlas-script" title="${escapeHtml(item.scriptName)}">${escapeHtml(item.originalScript)}</div>
        <div class="script-atlas-meta">
          <span class="script-atlas-name">${escapeHtml(item.name)}</span>
          <span class="script-atlas-family">${escapeHtml(item.scriptName)}</span>
        </div>
        <p class="script-atlas-note">${escapeHtml(item.note)}</p>
        <a href="/sites/${item.id}/" class="script-atlas-link">View temple →</a>
      `;
      container.appendChild(card);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Source Codex
  // ═══════════════════════════════════════════════════════════════════════════

  function initSourceCodex() {
    const tbody = $('#source-codex-body');
    const search = $('#source-codex-search');
    if (!tbody) return;

    const sources = sourcesData.sources;

    function render(filter = '') {
      const term = filter.toLowerCase();
      tbody.innerHTML = '';
      let count = 0;
      for (const source of sources) {
        if (
          term &&
          !source.key.toLowerCase().includes(term) &&
          !source.full.toLowerCase().includes(term) &&
          !source.scope.toLowerCase().includes(term)
        ) {
          continue;
        }
        count++;
        const tr = createEl('tr');
        tr.innerHTML = `
          <td data-label="Code"><code>${escapeHtml(source.key)}</code></td>
          <td data-label="Full Title">${escapeHtml(source.full)}</td>
          <td data-label="Scope">${escapeHtml(source.scope)}</td>
          <td data-label="Year">${escapeHtml(source.year || '—')}</td>
          <td data-label="Edition">${escapeHtml(source.edition || '—')}</td>
          <td data-label="Link">${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">Link</a>` : '—'}</td>
        `;
        tbody.appendChild(tr);
      }
      const countEl = $('#source-codex-count');
      if (countEl) countEl.textContent = `${count} source${count === 1 ? '' : 's'}`;
    }

    render();
    if (search) {
      search.addEventListener('input', debounce(() => render(search.value), 200));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Boot
  // ═══════════════════════════════════════════════════════════════════════════

  async function boot() {
    try {
      await loadData();
      initStats();
      initRestorationEngine();
      initConstellation();
      initScriptAtlas();
      initSourceCodex();
    } catch (err) {
      console.error('Codex Atlas failed to load:', err);
      const main = $('main');
      if (main) {
        main.innerHTML = '<p class="text-center" style="padding:4rem 1rem;color:var(--text-dim)">The Codex atlas could not be loaded. Please try again later.</p>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
