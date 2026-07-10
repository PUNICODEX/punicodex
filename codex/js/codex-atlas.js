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

    // Source catalog references
    const sourceLinks = entry.sources && entry.sources.length
      ? entry.sources.map((key) => {
          const src = sourcesData.sources.find((s) => s.key === key);
          if (!src) return `<span class="restore-source-chip">${escapeHtml(key)}</span>`;
          return src.url
            ? `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener" class="restore-source-chip" title="${escapeHtml(src.full)}">${escapeHtml(key)}</a>`
            : `<span class="restore-source-chip" title="${escapeHtml(src.full)}">${escapeHtml(key)}</span>`;
        }).join('')
      : '<span class="restore-source-chip restore-source-chip-none">—</span>';

    // Original script lookup
    const scriptItem = scriptsData && scriptsData.atlas
      ? scriptsData.atlas.find((s) => s.id === entry.id)
      : null;
    const originalScript = scriptItem
      ? { label: scriptItem.scriptName, value: scriptItem.originalScript, note: scriptItem.note }
      : { label: 'Greek / Original', value: entry.greek || '—', note: null };

    // Related names (same pantheon, excluding self)
    const related = lexiconData.entries
      .filter((e) => e.pantheon === entry.pantheon && e.id !== entry.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
    const relatedHtml = related.length
      ? related.map((e) => `<a href="/sites/${e.id}/" class="restore-related-chip">${escapeHtml(e.unicode)}</a>`).join('')
      : '<span class="restore-related-chip restore-related-chip-none">—</span>';

    // Proto info
    const protoHtml = entry.protoLanguage
      ? `<div class="restore-script">
          <span class="restore-script-label">Proto-Language</span>
          <span class="restore-script-value">${escapeHtml(entry.protoLanguage)}</span>
        </div>
        <div class="restore-script">
          <span class="restore-script-label">Reconstructed Form</span>
          <span class="restore-script-value mono">${escapeHtml(entry.protoForm || '—')}</span>
        </div>`
      : '';

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
            ${entry.hasFlagship ? '<span class="flagship-badge">Flagship Temple</span>' : ''}
          </div>
        </div>
        <p class="restore-meaning">${escapeHtml(entry.meaning || entry.domain)}</p>

        <div class="restore-section-title">Writing & Encoding</div>
        <div class="restore-scripts">
          <div class="restore-script restore-script-wide">
            <span class="restore-script-label">${escapeHtml(originalScript.label)}</span>
            <span class="restore-script-value">${escapeHtml(originalScript.value)}</span>
            ${originalScript.note ? `<span class="restore-script-note">${escapeHtml(originalScript.note)}</span>` : ''}
          </div>
          <div class="restore-script">
            <span class="restore-script-label">Unicode Restoration</span>
            <span class="restore-script-value mono">${escapeHtml(entry.unicode)}</span>
          </div>
          <div class="restore-script">
            <span class="restore-script-label">Punycode</span>
            <span class="restore-script-value mono">${escapeHtml(entry.punycode)}</span>
          </div>
          ${entry.domainUnicode ? `
          <div class="restore-script">
            <span class="restore-script-label">Domain (Unicode)</span>
            <span class="restore-script-value mono">${escapeHtml(entry.domainUnicode)}</span>
          </div>
          <div class="restore-script">
            <span class="restore-script-label">Domain (Punycode)</span>
            <span class="restore-script-value mono">${escapeHtml(entry.domainPunycode || '—')}</span>
          </div>` : ''}
          ${protoHtml}
        </div>

        <div class="restore-section-title">ASCII → Unicode Breakdown</div>
        <div class="breakdown-grid">
          ${breakdown || '<p class="restore-hint">No character breakdown available.</p>'}
        </div>

        <div class="restore-section-title">Documented Variants</div>
        <div class="restore-variants">
          ${variants}
        </div>

        <div class="restore-section-title">Scholarly Sources</div>
        <div class="restore-sources">
          ${sourceLinks}
        </div>

        <div class="restore-section-title">Kindred Names in ${escapeHtml(entry.pantheon)}</div>
        <div class="restore-related">
          ${relatedHtml}
        </div>

        <div class="restore-actions">
          <a href="/sites/${entry.id}/" class="btn btn-primary btn-sm">Enter the Temple</a>
          <a href="/sites/${entry.id}/lore/extended/" class="btn btn-ghost btn-sm">Extended Lore</a>
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

    let width = container.clientWidth;
    let height = Math.min(640, window.innerHeight * 0.65);
    container.style.height = `${height}px`;

    const canvas = createEl('canvas', 'constellation-canvas');
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // View transform (zoom / pan)
    const view = { x: 0, y: 0, k: 1, minK: 0.4, maxK: 4 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let lastPan = { x: 0, y: 0 };
    let hoveredNode = null;
    let isSimulationRunning = true;

    // Build nodes
    const pantheonList = Object.keys(lexiconData.pantheonColors);
    const pantheonAngleStep = (Math.PI * 2) / pantheonList.length;
    const pantheonIndex = {};
    pantheonList.forEach((p, i) => (pantheonIndex[p] = i));

    const nodes = lexiconData.entries.map((entry, idx) => {
      const pIdx = pantheonIndex[entry.pantheon] || 0;
      const ringRadius = Math.min(width, height) * (0.28 + (pIdx % 3) * 0.05);
      const angle = pIdx * pantheonAngleStep + (idx % 17) * 0.15;
      return {
        id: entry.id,
        name: entry.unicode,
        pantheon: entry.pantheon,
        tier: entry.tier,
        isOwned: entry.isOwned,
        hasFlagship: entry.hasFlagship,
        radius: entry.tier === 'dual' ? 7 : entry.tier === '1' ? 5 : 3.5,
        x: width / 2 + Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 20,
        y: height / 2 + Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        visible: true,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Build edges
    const edges = [];
    const protoGroups = {};
    for (const entry of lexiconData.entries) {
      if (!entry.protoLanguage) continue;
      if (!protoGroups[entry.protoLanguage]) protoGroups[entry.protoLanguage] = [];
      protoGroups[entry.protoLanguage].push(entry.id);
    }
    for (const group of Object.values(protoGroups)) {
      if (group.length < 2) continue;
      group.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(group.length, 12); i++) {
        const next = (i + 1) % group.length;
        edges.push({ source: group[i], target: group[next], type: 'etymology' });
      }
    }

    const pantheonGroups = {};
    for (const entry of lexiconData.entries) {
      if (!pantheonGroups[entry.pantheon]) pantheonGroups[entry.pantheon] = [];
      pantheonGroups[entry.pantheon].push(entry.id);
    }
    for (const group of Object.values(pantheonGroups)) {
      if (group.length < 2) continue;
      group.sort(() => Math.random() - 0.5);
      const limit = Math.min(group.length, 30);
      for (let i = 0; i < limit; i++) {
        const next = (i + 1) % limit;
        edges.push({ source: group[i], target: group[next], type: 'pantheon' });
      }
    }

    for (const edge of edges) {
      edge.sourceNode = nodeMap.get(edge.source);
      edge.targetNode = nodeMap.get(edge.target);
    }
    const validEdges = edges.filter((e) => e.sourceNode && e.targetNode);

    const centerX = width / 2;
    const centerY = height / 2;
    const pantheonCenters = {};
    pantheonList.forEach((p, i) => {
      const angle = i * pantheonAngleStep - Math.PI / 2;
      const radius = Math.min(width, height) * 0.32;
      pantheonCenters[p] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    // Spatial grid for O(n) repulsion
    function updateGrid() {
      const cellSize = 40;
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;
      const grid = new Array(cols * rows).fill(null);
      for (const node of nodes) {
        if (!node.visible) continue;
        const cx = Math.floor(node.x / cellSize);
        const cy = Math.floor(node.y / cellSize);
        const idx = cy * cols + cx;
        node.gridNext = grid[idx];
        grid[idx] = node;
      }
      return { grid, cols, rows, cellSize };
    }

    let gridState = updateGrid();

    let iteration = 0;
    const maxIterations = 250;
    let energy = Infinity;

    function tick() {
      if (!isSimulationRunning) return;

      gridState = updateGrid();
      const { grid, cols, rows, cellSize } = gridState;
      let totalEnergy = 0;

      // Repulsion via spatial grid
      for (const node of nodes) {
        if (!node.visible) continue;
        const cx = Math.floor(node.x / cellSize);
        const cy = Math.floor(node.y / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            let other = grid[ny * cols + nx];
            while (other) {
              if (other !== node && other.visible) {
                let ox = node.x - other.x;
                let oy = node.y - other.y;
                let dist = Math.sqrt(ox * ox + oy * oy) || 1;
                const minDist = node.radius + other.radius + 3;
                if (dist < minDist) dist = minDist;
                const force = (120 * (node.radius + other.radius)) / (dist * dist);
                const fx = (ox / dist) * force;
                const fy = (oy / dist) * force;
                node.vx += fx;
                node.vy += fy;
                other.vx -= fx;
                other.vy -= fy;
              }
              other = other.gridNext;
            }
          }
        }
      }

      // Attraction along edges
      for (const edge of validEdges) {
        const a = edge.sourceNode;
        const b = edge.targetNode;
        if (!a.visible || !b.visible) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = edge.type === 'etymology' ? 55 : 75;
        const strength = edge.type === 'etymology' ? 0.012 : 0.004;
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
        if (!node.visible) continue;
        const center = pantheonCenters[node.pantheon] || { x: centerX, y: centerY };
        const dx = center.x - node.x;
        const dy = center.y - node.y;
        node.vx += dx * 0.001;
        node.vy += dy * 0.001;
      }

      // Center gravity
      for (const node of nodes) {
        if (!node.visible) continue;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.0003;
        node.vy += dy * 0.0003;
      }

      // Update positions
      for (const node of nodes) {
        if (!node.visible) continue;
        node.vx *= 0.92;
        node.vy *= 0.92;
        node.x += node.vx;
        node.y += node.vy;
        totalEnergy += node.vx * node.vx + node.vy * node.vy;

        const r = node.radius + 2;
        node.x = Math.max(r, Math.min(width - r, node.x));
        node.y = Math.max(r, Math.min(height - r, node.y));
      }

      energy = totalEnergy;
      iteration++;
      if (iteration < maxIterations && energy > 0.05) {
        requestAnimationFrame(tick);
      } else {
        isSimulationRunning = false;
      }
      render();
    }

    function worldToScreen(x, y) {
      return { x: x * view.k + view.x, y: y * view.k + view.y };
    }

    function screenToWorld(x, y) {
      return { x: (x - view.x) / view.k, y: (y - view.y) / view.k };
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Draw edges
      ctx.lineWidth = 0.5;
      for (const edge of validEdges) {
        const a = edge.sourceNode;
        const b = edge.targetNode;
        if (!a.visible || !b.visible) continue;
        const sa = worldToScreen(a.x, a.y);
        const sb = worldToScreen(b.x, b.y);
        ctx.strokeStyle = edge.type === 'etymology' ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.03)';
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        if (!node.visible) continue;
        const s = worldToScreen(node.x, node.y);
        const r = node.radius * view.k;
        if (s.x < -r || s.x > width + r || s.y < -r || s.y > height + r) continue;

        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        if (node.isOwned) {
          ctx.fillStyle = '#6b9e75';
        } else if (node.tier === 'dual') {
          ctx.fillStyle = lexiconData.pantheonColors[node.pantheon] || '#d4af37';
        } else if (node.tier === '1') {
          ctx.fillStyle = '#e8e4dc';
        } else {
          ctx.fillStyle = 'rgba(232,228,220,0.5)';
        }
        ctx.fill();

        if (hoveredNode === node || node.tier === 'dual') {
          ctx.strokeStyle = hoveredNode === node ? '#fff' : 'rgba(212,175,55,0.5)';
          ctx.lineWidth = hoveredNode === node ? 2 : 1;
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Tooltip
    const tooltip = createEl('div', 'constellation-tooltip');
    container.appendChild(tooltip);

    function updateTooltip(x, y, node) {
      if (!node) {
        tooltip.style.opacity = '0';
        return;
      }
      const entry = lexiconData.entryById[node.id];
      tooltip.innerHTML = `
        <strong>${escapeHtml(node.name)}</strong>
        <span>${escapeHtml(entry.pantheon)} · ${escapeHtml(entry.tierLabel)}${node.isOwned ? ' · Owned' : ''}</span>
      `;
      tooltip.style.opacity = '1';
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${x - rect.left + 12}px`;
      tooltip.style.top = `${y - rect.top + 12}px`;
    }

    function findNodeAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const pos = screenToWorld(clientX - rect.left, clientY - rect.top);
      let closest = null;
      let closestDist = Infinity;
      for (const node of nodes) {
        if (!node.visible) continue;
        const dx = node.x - pos.x;
        const dy = node.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < node.radius + 4 / view.k && dist < closestDist) {
          closestDist = dist;
          closest = node;
        }
      }
      return closest;
    }

    // Mouse / touch interaction
    canvas.addEventListener('mousemove', (e) => {
      const node = findNodeAt(e.clientX, e.clientY);
      if (node !== hoveredNode) {
        hoveredNode = node;
        canvas.style.cursor = node ? 'pointer' : isDragging ? 'grabbing' : 'grab';
        updateTooltip(e.clientX, e.clientY, node);
        render();
      } else if (node) {
        updateTooltip(e.clientX, e.clientY, node);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      hoveredNode = null;
      tooltip.style.opacity = '0';
      render();
    });

    canvas.addEventListener('click', (e) => {
      if (isDragging) return;
      const node = findNodeAt(e.clientX, e.clientY);
      if (node) {
        window.location.href = `/sites/${node.id}/`;
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      lastPan = { x: view.x, y: view.y };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      view.x = lastPan.x + dx;
      view.y = lastPan.y + dy;
      render();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = screenToWorld(mx, my);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      view.k = Math.max(view.minK, Math.min(view.maxK, view.k * delta));
      const after = worldToScreen(before.x, before.y);
      view.x += mx - after.x;
      view.y += my - after.y;
      render();
    }, { passive: false });

    // Touch support
    let touchStartDist = 0;
    let touchStartK = 1;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        isDragging = true;
        dragStart = { x: t.clientX, y: t.clientY };
        lastPan = { x: view.x, y: view.y };
        const node = findNodeAt(t.clientX, t.clientY);
        if (node) {
          hoveredNode = node;
          updateTooltip(t.clientX, t.clientY, node);
          render();
        }
      } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartK = view.k;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const t = e.touches[0];
        view.x = lastPan.x + (t.clientX - dragStart.x);
        view.y = lastPan.y + (t.clientY - dragStart.y);
        render();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const before = screenToWorld(cx, cy);
        view.k = Math.max(view.minK, Math.min(view.maxK, touchStartK * (dist / touchStartDist)));
        const after = worldToScreen(before.x, before.y);
        view.x += cx - after.x;
        view.y += cy - after.y;
        render();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        if (hoveredNode && !isDragging) {
          window.location.href = `/sites/${hoveredNode.id}/`;
        }
        isDragging = false;
        hoveredNode = null;
        tooltip.style.opacity = '0';
        render();
      }
    }, { passive: true });

    // Controls
    const controls = createEl('div', 'constellation-controls');
    controls.innerHTML = `
      <button class="constellation-control" data-action="zoom-in" aria-label="Zoom in">+</button>
      <button class="constellation-control" data-action="zoom-out" aria-label="Zoom out">−</button>
      <button class="constellation-control" data-action="reset" aria-label="Reset view">⌂</button>
    `;
    container.appendChild(controls);

    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'zoom-in') {
        view.k = Math.min(view.maxK, view.k * 1.25);
      } else if (action === 'zoom-out') {
        view.k = Math.max(view.minK, view.k * 0.8);
      } else if (action === 'reset') {
        view.x = 0;
        view.y = 0;
        view.k = 1;
      }
      render();
    });

    // Filter controls
    const filterContainer = $('#constellation-filters');
    if (filterContainer) {
      const pantheons = [...new Set(nodes.map((n) => n.pantheon))].sort();
      pantheons.forEach((p) => {
        const btn = createEl('button', 'constellation-filter active');
        btn.textContent = p;
        btn.style.setProperty('--filter-color', lexiconData.pantheonColors[p] || '#d4af37');
        btn.dataset.pantheon = p;
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          const active = btn.classList.contains('active');
          for (const node of nodes) {
            if (node.pantheon === p) {
              node.visible = active;
            }
          }
          render();
        });
        filterContainer.appendChild(btn);
      });
    }

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.clientWidth;
      const newHeight = Math.min(640, window.innerHeight * 0.65);
      if (newWidth !== width || newHeight !== height) {
        width = newWidth;
        height = newHeight;
        container.style.height = `${height}px`;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        render();
      }
    });
    resizeObserver.observe(container);

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
