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
  let availabilityData = null;

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
    const [lexRes, scriptsRes, sourcesRes, availRes] = await Promise.all([
      fetch(`${BASE_PATH}codex-lexicon.json`),
      fetch(`${BASE_PATH}original-scripts.json`),
      fetch(`${BASE_PATH}source-catalog.json`),
      fetch(`${BASE_PATH}availability.json`),
    ]);

    lexiconData = await lexRes.json();
    scriptsData = await scriptsRes.json();
    sourcesData = await sourcesRes.json();
    availabilityData = await availRes.json();

    // Build lookup maps
    lexiconData.entryById = {};
    lexiconData.entryByAscii = {};
    for (const entry of lexiconData.entries) {
      lexiconData.entryById[entry.id] = entry;
      lexiconData.entryByAscii[entry.ascii.toLowerCase()] = entry;
    }

    return { lexicon: lexiconData, scripts: scriptsData, sources: sourcesData, availability: availabilityData };
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

  function getSourceChip(key) {
    const src = sourcesData.sources.find((s) => s.key === key);
    if (!src) return `<span class="restore-source-chip">${escapeHtml(key)}</span>`;
    return src.url
      ? `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener" class="restore-source-chip" title="${escapeHtml(src.full)}">${escapeHtml(key)}</a>`
      : `<span class="restore-source-chip" title="${escapeHtml(src.full)}">${escapeHtml(key)}</span>`;
  }

  function getAvailabilityBadge(entry) {
    if (!entry.availability) return '';
    const status = entry.availability.status;
    const label = status === 'live' ? 'Live Site' : status === 'registered' ? 'Registered' : 'Available';
    return `<span class="availability-badge availability-${status}" title="${escapeHtml(entry.availability.domain || '')}">${label}</span>`;
  }

  function getTierTooltip(entry) {
    const docs = lexiconData.tierDocs[entry.tier];
    if (!docs) return '';
    return docs.summary;
  }

  function renderOriginalScript(entry) {
    if (!entry.originalScript || !entry.originalScript.originalScript) {
      return `
        <div class="restore-script restore-script-wide">
          <span class="restore-script-label">Greek / Original</span>
          <span class="restore-script-value">${escapeHtml(entry.greek || '—')}</span>
        </div>`;
    }

    const os = entry.originalScript;
    const stepsHtml = os.steps && os.steps.length
      ? `<ol class="provenance-steps">${os.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
      : '';
    const provSources = os.provenanceSources && os.provenanceSources.length
      ? `<div class="provenance-sources">${os.provenanceSources.map(getSourceChip).join('')}</div>`
      : '';

    return `
      <div class="restore-script restore-script-wide restore-script-provenance">
        <span class="restore-script-label">${escapeHtml(os.scriptName)}</span>
        <span class="restore-script-value script-original">${escapeHtml(os.originalScript)}</span>
        ${os.transliteration ? `<span class="restore-script-note mono">${escapeHtml(os.transliteration)}</span>` : ''}
        <details class="provenance-details">
          <summary>Original script provenance</summary>
          ${stepsHtml}
          ${provSources}
        </details>
      </div>`;
  }

  function renderEtymology(entry) {
    const et = entry.etymology;
    if (!et) return '';

    const cognates = et.cognates && et.cognates.length
      ? `<div class="etymology-cognates">
          <span class="etymology-subtitle">Cognates & Kin</span>
          ${et.cognates.map((c) => `
            <span class="etymology-cognate" title="${escapeHtml(c.note || '')}">
              ${escapeHtml(c.language)}: <strong>${escapeHtml(c.form)}</strong> <em>(${escapeHtml(c.relationship || 'cognate')})</em>
            </span>
          `).join('')}
        </div>`
      : '';

    return `
      <div class="restore-section-title">Etymology</div>
      <div class="etymology-card">
        <div class="etymology-row">
          <span class="etymology-label">Proto-Language</span>
          <span class="etymology-value">${escapeHtml(et.protoLanguage || '—')}</span>
        </div>
        <div class="etymology-row">
          <span class="etymology-label">Reconstructed Form</span>
          <span class="etymology-value mono">${escapeHtml(et.protoForm || '—')}</span>
        </div>
        <div class="etymology-row">
          <span class="etymology-label">Gloss</span>
          <span class="etymology-value">${escapeHtml(et.protoGloss || '—')}</span>
        </div>
        <div class="etymology-row">
          <span class="etymology-label">Certainty</span>
          <span class="etymology-value etymology-certainty-${escapeHtml(et.certainty || 'unknown')}">${escapeHtml(et.certainty || 'unknown')}</span>
        </div>
        ${et.derivation ? `<p class="etymology-derivation">${escapeHtml(et.derivation)}</p>` : ''}
        ${cognates}
      </div>`;
  }

  function renderVariants(entry) {
    if (!entry.variants || !entry.variants.length) {
      return '<span class="restore-variant restore-variant-none">—</span>';
    }

    const groups = {};
    for (const v of entry.variants) {
      if (!groups[v.type]) groups[v.type] = [];
      groups[v.type].push(v);
    }

    const order = ['ideal', 'macron-only', 'alt-stress', 'alt', 'ascii', 'other'];
    const labels = {
      ideal: 'Ideal (fully marked)',
      'macron-only': 'Macron-only (LSJ convention)',
      'alt-stress': 'Alternate stress',
      alt: 'Alternate form',
      ascii: 'ASCII fallback',
      other: 'Other',
    };

    return order
      .filter((type) => groups[type])
      .map((type) => {
        const chips = groups[type]
          .map((v) => {
            const sources = v.sources && v.sources.length
              ? `<span class="variant-sources">${v.sources.map(getSourceChip).join('')}</span>`
              : '';
            return `
              <span class="restore-variant" title="${escapeHtml(v.note || labels[type] || type)}">
                ${escapeHtml(v.unicode)}
                ${sources}
              </span>`;
          })
          .join('');
        return `
          <div class="variant-group">
            <span class="variant-group-label">${labels[type] || type}</span>
            <div class="variant-group-chips">${chips}</div>
          </div>`;
      })
      .join('');
  }

  function renderLore(entry) {
    if (!entry.lore) return '';
    const lore = entry.lore;

    const pronunciation = lore.pronunciation
      ? `<div class="lore-pronunciation">
          <span class="lore-ipa">${escapeHtml(lore.pronunciation.ipa || '')}</span>
          <span class="lore-ipa-label">${escapeHtml(lore.pronunciation.ipaLabel || '')}</span>
          ${lore.pronunciation.approximation ? `<p class="lore-approximation">${escapeHtml(lore.pronunciation.approximation)}</p>` : ''}
        </div>`
      : '';

    const symbols = lore.symbols && lore.symbols.length
      ? `<ul class="lore-symbols">
          ${lore.symbols.map((s) => `<li><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.meaning)}</li>`).join('')}
        </ul>`
      : '';

    const myths = lore.mythology && lore.mythology.myths && lore.mythology.myths.length
      ? `<div class="lore-myths">
          ${lore.mythology.myths
            .map(
              (m) => `
            <div class="lore-myth">
              <span class="lore-myth-tag">${escapeHtml(m.tag || '')}</span>
              <h4 class="lore-myth-title">${escapeHtml(m.title || '')}</h4>
              <div class="lore-myth-text">${m.text || ''}</div>
            </div>`,
            )
            .join('')}
        </div>`
      : '';

    return `
      <div class="restore-section-title">Temple Lore</div>
      <div class="lore-card">
        ${pronunciation}
        ${symbols ? `<div class="lore-subsection"><h4>Symbols</h4>${symbols}</div>` : ''}
        ${lore.mythology && lore.mythology.lead ? `<div class="lore-lead">${lore.mythology.lead}</div>` : ''}
        ${myths}
        ${lore.culturalLegacy ? `<div class="lore-legacy"><h4>Cultural Legacy</h4><div class="lore-legacy-text">${lore.culturalLegacy}</div></div>` : ''}
      </div>`;
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

    const sourceLinks = entry.sources && entry.sources.length
      ? entry.sources.map(getSourceChip).join('')
      : '<span class="restore-source-chip restore-source-chip-none">—</span>';

    const related = lexiconData.entries
      .filter((e) => e.pantheon === entry.pantheon && e.id !== entry.id)
      .sort((a, b) => a.unicode.localeCompare(b.unicode))
      .slice(0, 10);
    const relatedHtml = related.length
      ? related.map((e) => `<a href="/sites/${e.id}/" class="restore-related-chip">${escapeHtml(e.unicode)}</a>`).join('')
      : '<span class="restore-related-chip restore-related-chip-none">—</span>';

    const tierClass = `tier-badge tier-${entry.tier}`;
    const availabilityBadge = getAvailabilityBadge(entry);
    const tierTooltip = getTierTooltip(entry);

    return `
      <div class="restore-result">
        <div class="restore-header">
          <div class="restore-name">
            <span class="restore-unicode">${escapeHtml(entry.unicode)}</span>
            <span class="restore-ascii">${escapeHtml(entry.ascii)}</span>
          </div>
          <div class="restore-meta">
            <span class="${tierClass}" title="${escapeHtml(tierTooltip)}">${escapeHtml(entry.tierLabel)}</span>
            <span class="pantheon-badge pantheon-${entry.pantheon}">${escapeHtml(entry.pantheon)}</span>
            ${availabilityBadge}
            ${entry.isOwned ? '<span class="owned-badge">PUNYCODEX Domain</span>' : ''}
            ${entry.hasFlagship ? '<span class="flagship-badge">Flagship Temple</span>' : ''}
          </div>
        </div>
        <p class="restore-meaning">${escapeHtml(entry.meaning || entry.domain)}</p>

        <div class="restore-section-title">Writing & Encoding</div>
        <div class="restore-scripts">
          ${renderOriginalScript(entry)}
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
        </div>

        ${renderEtymology(entry)}

        <div class="restore-section-title">ASCII → Unicode Breakdown</div>
        <div class="breakdown-grid">
          ${breakdown || '<p class="restore-hint">No character breakdown available.</p>'}
        </div>

        <div class="restore-section-title">Documented Variants</div>
        <div class="restore-variants">
          ${renderVariants(entry)}
        </div>

        ${renderLore(entry)}

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

  function initRestorationEngine() {
    const input = $('#codex-restore-input');
    const output = $('#codex-restore-output');
    if (!input || !output) return;

    function render() {
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
      if (window.location.hash !== `#${entry.id}`) {
        history.replaceState(null, '', `#${entry.id}`);
      }
    }

    const debouncedRender = debounce(render, 150);
    input.addEventListener('input', debouncedRender);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render();
    });

    // Seed from URL hash, then rotating featured flagship, then fallback list
    const fallbackSeeds = ['apollon', 'zeus', 'nike', 'thor', 'anubis', 'freyja', 'ra', 'shiva'];
    let seed = fallbackSeeds[Math.floor(Math.random() * fallbackSeeds.length)];
    const featured = lexiconData.entries.filter((e) => e.hasFlagship);
    if (featured.length) {
      seed = featured[Math.floor(Math.random() * featured.length)].ascii.toLowerCase();
    }

    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    input.value = hash || seed;
    render();
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
    let selectedNode = null;
    let isSimulationRunning = false;
    let hasStarted = false;
    let colorMode = 'pantheon';

    // Build nodes
    const pantheonList = Object.keys(lexiconData.pantheonColors);
    const pantheonAngleStep = (Math.PI * 2) / pantheonList.length;
    const pantheonIndex = {};
    pantheonList.forEach((p, i) => (pantheonIndex[p] = i));

    const nodes = lexiconData.entries.map((entry, idx) => {
      const pIdx = pantheonIndex[entry.pantheon] || 0;
      const ringRadius = Math.min(width, height) * (0.28 + (pIdx % 3) * 0.05);
      // deterministic angle so the layout is stable across reloads
      const angle = pIdx * pantheonAngleStep + ((idx * 0.6180339887) % (Math.PI / 3));
      // deterministic micro-jitter based on id so nodes never overlap at birth
      const hash = entry.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
      const jitter = (Math.abs(hash) % 20) - 10;
      return {
        id: entry.id,
        name: entry.unicode,
        pantheon: entry.pantheon,
        tier: entry.tier,
        isOwned: entry.isOwned,
        hasFlagship: entry.hasFlagship,
        availability: entry.availability ? entry.availability.status : null,
        entry,
        radius: entry.tier === 'dual' ? 7 : entry.tier === '1' ? 5 : 3.5,
        x: width / 2 + Math.cos(angle) * ringRadius + jitter,
        y: height / 2 + Math.sin(angle) * ringRadius + jitter,
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
      group.sort((a, b) => a.localeCompare(b));
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
      group.sort((a, b) => a.localeCompare(b));
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

    function physicsStep() {
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
                const force = Math.min((120 * (node.radius + other.radius)) / (dist * dist), 0.5);
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
      return energy;
    }

    function tick() {
      if (!isSimulationRunning) return;
      physicsStep();
      render();
      if (iteration < maxIterations && energy > 0.05) {
        requestAnimationFrame(tick);
      } else {
        isSimulationRunning = false;
      }
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
        ctx.fillStyle = nodeColor(node);
        ctx.fill();

        if (hoveredNode === node || selectedNode === node || node.tier === 'dual') {
          ctx.strokeStyle = selectedNode === node ? '#d4af37' : hoveredNode === node ? '#fff' : 'rgba(212,175,55,0.5)';
          ctx.lineWidth = hoveredNode === node || selectedNode === node ? 2 : 1;
          ctx.stroke();
        }
      }

      // Pantheon center labels (when zoomed out enough)
      if (colorMode === 'pantheon' && view.k > 0.5) {
        ctx.font = `${Math.max(10, 11 * view.k)}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [pantheon, center] of Object.entries(pantheonCenters)) {
          const s = worldToScreen(center.x, center.y);
          if (s.x < 0 || s.x > width || s.y < 0 || s.y > height) continue;
          ctx.fillStyle = 'rgba(212,175,55,0.25)';
          ctx.fillText(pantheon, s.x, s.y);
        }
      }

      ctx.restore();
    }

    function nodeColor(node) {
      if (colorMode === 'pantheon') {
        return lexiconData.pantheonColors[node.pantheon] || '#d4af37';
      }
      if (colorMode === 'tier') {
        if (node.tier === 'dual') return '#d4af37';
        if (node.tier === '1') return '#e8e4dc';
        return 'rgba(232,228,220,0.45)';
      }
      if (colorMode === 'ownership') {
        return node.isOwned ? '#6b9e75' : node.hasFlagship ? '#4a90a4' : 'rgba(232,228,220,0.35)';
      }
      if (colorMode === 'availability') {
        const status = node.availability;
        if (status === 'live') return '#6b9e75';
        if (status === 'registered') return '#d46a6a';
        if (status === 'available') return '#4a90a4';
        return 'rgba(232,228,220,0.35)';
      }
      return lexiconData.pantheonColors[node.pantheon] || '#d4af37';
    }

    // Tooltip
    const tooltip = createEl('div', 'constellation-tooltip');
    container.appendChild(tooltip);

    // Detail card overlay
    const detailCard = createEl('div', 'constellation-detail hidden');
    container.appendChild(detailCard);

    function hideDetailCard() {
      detailCard.classList.add('hidden');
      selectedNode = null;
      render();
    }

    function showDetailCard(node) {
      selectedNode = node;
      const entry = node.entry;
      const os = entry.originalScript;
      detailCard.innerHTML = `
        <button class="constellation-detail-close" aria-label="Close">×</button>
        <h4>${escapeHtml(entry.unicode)}</h4>
        <p class="constellation-detail-sub">${escapeHtml(entry.ascii)} · ${escapeHtml(entry.pantheon)} · ${escapeHtml(entry.tierLabel)}</p>
        <p class="constellation-detail-meaning">${escapeHtml(entry.meaning || entry.domain)}</p>
        ${os ? `<p class="constellation-detail-script" title="${escapeHtml(os.scriptName)}">${escapeHtml(os.originalScript)}</p>` : ''}
        <div class="constellation-detail-meta">
          ${entry.availability ? `<span class="availability-badge availability-${entry.availability.status}">${escapeHtml(entry.availability.status)}</span>` : ''}
          ${entry.isOwned ? '<span class="owned-badge">Owned</span>' : ''}
          ${entry.hasFlagship ? '<span class="flagship-badge">Flagship</span>' : ''}
        </div>
        <div class="constellation-detail-actions">
          <a href="/sites/${entry.id}/" class="btn btn-primary btn-sm">Temple</a>
          <a href="/type/#${entry.id}" class="btn btn-ghost btn-sm">Type Tool</a>
        </div>
      `;
      detailCard.classList.remove('hidden');
      detailCard.querySelector('.constellation-detail-close').addEventListener('click', hideDetailCard);
      render();
    }

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
        showDetailCard(node);
      } else if (selectedNode) {
        hideDetailCard();
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
          showDetailCard(hoveredNode);
        } else if (selectedNode && !hoveredNode) {
          hideDetailCard();
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

    // Color mode toolbar
    const modeBar = createEl('div', 'constellation-modes');
    modeBar.innerHTML = `
      <button class="constellation-mode active" data-mode="pantheon">Pantheon</button>
      <button class="constellation-mode" data-mode="tier">Tier</button>
      <button class="constellation-mode" data-mode="ownership">Ownership</button>
      <button class="constellation-mode" data-mode="availability">Availability</button>
    `;
    container.appendChild(modeBar);
    modeBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (!btn) return;
      modeBar.querySelectorAll('.constellation-mode').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      colorMode = btn.dataset.mode;
      render();
    });

    // Search
    const searchWrap = createEl('div', 'constellation-search');
    searchWrap.innerHTML = `<input type="text" placeholder="Find a name…" aria-label="Find a name">`;
    container.appendChild(searchWrap);
    const searchInput = searchWrap.querySelector('input');
    searchInput.addEventListener(
      'input',
      debounce(() => {
        const term = searchInput.value.trim().toLowerCase();
        if (!term) {
          nodes.forEach((n) => (n.visible = true));
          render();
          return;
        }
        let matched = null;
        for (const node of nodes) {
          const entry = node.entry;
          const match =
            entry.ascii.toLowerCase().includes(term) ||
            entry.unicode.toLowerCase().includes(term) ||
            entry.id.toLowerCase().includes(term);
          node.visible = match;
          if (match && !matched) matched = node;
        }
        if (matched) {
          selectedNode = matched;
          view.x = width / 2 - matched.x * view.k;
          view.y = height / 2 - matched.y * view.k;
          showDetailCard(matched);
        }
        render();
      }, 250),
    );

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

    // Initial static render so the canvas is not blank while off-screen.
    render();

    // Defer the physics simulation until the constellation scrolls into view;
    // pre-warm ~50 ticks deterministically so it lands in a calm state.
    const startObserver = new IntersectionObserver(
      (entries) => {
        if (hasStarted) return;
        if (entries[0] && entries[0].isIntersecting) {
          hasStarted = true;
          isSimulationRunning = true;
          for (let i = 0; i < 50 && isSimulationRunning; i++) {
            physicsStep();
          }
          tick();
          startObserver.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    startObserver.observe(container);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Script Atlas
  // ═══════════════════════════════════════════════════════════════════════════

  function initScriptAtlas() {
    const container = $('#script-atlas');
    if (!container) return;

    const items = scriptsData.atlas || [];
    const scriptFamilies = [...new Set(items.map((i) => i.scriptName))].sort();
    const pantheons = [...new Set(items.map((i) => i.pantheon))].sort();

    // Header with counts and filters
    const header = createEl('div', 'script-atlas-header');
    header.innerHTML = `
      <div class="script-atlas-counts">
        <span><strong>${items.length}</strong> attested scripts</span>
        <span><strong>${scriptFamilies.length}</strong> families</span>
        <span><strong>${pantheons.length}</strong> pantheons</span>
      </div>
      <div class="script-atlas-filters">
        <input type="text" class="script-atlas-search" placeholder="Search scripts or names…">
        <select class="script-atlas-filter" data-filter="family">
          <option value="">All families</option>
          ${scriptFamilies.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('')}
        </select>
        <select class="script-atlas-filter" data-filter="pantheon">
          <option value="">All pantheons</option>
          ${pantheons.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
        </select>
      </div>
    `;
    container.appendChild(header);

    const grid = createEl('div', 'script-atlas-grid');
    container.appendChild(grid);

    function renderCard(item) {
      const steps = item.steps && item.steps.length
        ? `<ol class="script-atlas-steps">${item.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
        : '';
      const sources = item.sources && item.sources.length
        ? `<div class="script-atlas-sources">${item.sources.map(getSourceChip).join('')}</div>`
        : '';
      const card = createEl('div', 'script-atlas-card');
      card.dataset.family = item.scriptName;
      card.dataset.pantheon = item.pantheon;
      card.dataset.search = `${item.name} ${item.ascii} ${item.scriptName} ${item.pantheon}`.toLowerCase();
      card.innerHTML = `
        <div class="script-atlas-script" title="${escapeHtml(item.scriptName)}">${escapeHtml(item.originalScript)}</div>
        <div class="script-atlas-meta">
          <span class="script-atlas-name">${escapeHtml(item.name)}</span>
          <span class="script-atlas-family">${escapeHtml(item.scriptName)} · ${escapeHtml(item.pantheon)}</span>
        </div>
        ${item.transliteration ? `<p class="script-atlas-transliteration mono">${escapeHtml(item.transliteration)}</p>` : ''}
        <details class="script-atlas-provenance">
          <summary>Provenance</summary>
          ${steps}
          ${sources}
        </details>
        <a href="/sites/${item.id}/" class="script-atlas-link">View temple →</a>
      `;
      return card;
    }

    function render() {
      const term = (header.querySelector('.script-atlas-search').value || '').trim().toLowerCase();
      const family = header.querySelector('[data-filter="family"]').value;
      const pantheon = header.querySelector('[data-filter="pantheon"]').value;

      grid.innerHTML = '';
      let count = 0;
      for (const item of items) {
        if (term && !`${item.name} ${item.ascii} ${item.scriptName} ${item.pantheon}`.toLowerCase().includes(term)) continue;
        if (family && item.scriptName !== family) continue;
        if (pantheon && item.pantheon !== pantheon) continue;
        count++;
        grid.appendChild(renderCard(item));
      }

      const countEl = header.querySelector('.script-atlas-counts strong');
      if (countEl) countEl.textContent = count;
    }

    header.querySelector('.script-atlas-search').addEventListener('input', debounce(render, 200));
    header.querySelector('[data-filter="family"]').addEventListener('change', render);
    header.querySelector('[data-filter="pantheon"]').addEventListener('change', render);

    render();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tier System Panel
  // ═══════════════════════════════════════════════════════════════════════════

  function initTierSystem() {
    const container = $('#tier-system-panel');
    if (!container) return;

    const docs = lexiconData.tierDocs;
    const order = ['dual', '1', '2'];
    const titles = { dual: 'Dual-Tier', 1: 'Tier 1', 2: 'Tier 2' };

    container.innerHTML = order
      .map((key) => {
        const doc = docs[key];
        const examples = doc.examples
          .map((id) => {
            const entry = lexiconData.entryById[id] || lexiconData.entryByAscii[id];
            if (!entry) return '';
            return `<a href="/sites/${entry.id}/" class="tier-example">${escapeHtml(entry.unicode)}</a>`;
          })
          .join('');
        const rules = doc.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
        const subtypes = doc.subtypes
          ? Object.entries(doc.subtypes)
              .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}</li>`)
              .join('')
          : '';
        return `
          <div class="tier-doc tier-doc-${key}">
            <h4 class="tier-doc-title">${escapeHtml(titles[key])}</h4>
            <p class="tier-doc-summary">${escapeHtml(doc.summary)}</p>
            <ul class="tier-doc-rules">${rules}</ul>
            ${subtypes ? `<ul class="tier-doc-subtypes">${subtypes}</ul>` : ''}
            <div class="tier-doc-examples">${examples}</div>
          </div>`;
      })
      .join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Availability Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  function initAvailabilityDashboard() {
    const container = $('#availability-dashboard');
    if (!container) return;

    const entries = lexiconData.entries.filter((e) => e.availability);
    const stats = {
      available: entries.filter((e) => e.availability.status === 'available').length,
      live: entries.filter((e) => e.availability.status === 'live').length,
      registered: entries.filter((e) => e.availability.status === 'registered').length,
    };

    const header = createEl('div', 'availability-header');
    header.innerHTML = `
      <div class="availability-stats">
        <span class="availability-stat available"><strong>${stats.available}</strong> Available</span>
        <span class="availability-stat live"><strong>${stats.live}</strong> Live</span>
        <span class="availability-stat registered"><strong>${stats.registered}</strong> Registered</span>
      </div>
      <div class="availability-filters">
        <input type="text" class="availability-search" placeholder="Search domains…">
        <select class="availability-filter-status">
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="live">Live</option>
          <option value="registered">Registered</option>
        </select>
      </div>
    `;
    container.appendChild(header);

    const list = createEl('div', 'availability-list');
    container.appendChild(list);

    function render() {
      const term = (header.querySelector('.availability-search').value || '').trim().toLowerCase();
      const status = header.querySelector('.availability-filter-status').value;
      list.innerHTML = '';

      for (const entry of entries) {
        if (status && entry.availability.status !== status) continue;
        if (term && !`${entry.ascii} ${entry.unicode} ${entry.pantheon}`.toLowerCase().includes(term)) continue;

        const row = createEl('a', `availability-row availability-${entry.availability.status}`);
        row.href = `/sites/${entry.id}/`;
        row.innerHTML = `
          <span class="availability-row-name">${escapeHtml(entry.unicode)}</span>
          <span class="availability-row-domain mono">${escapeHtml(entry.availability.domain)}</span>
          <span class="availability-row-status">${escapeHtml(entry.availability.status)}</span>
          <span class="availability-row-pantheon">${escapeHtml(entry.pantheon)}</span>
        `;
        list.appendChild(row);
      }
    }

    header.querySelector('.availability-search').addEventListener('input', debounce(render, 200));
    header.querySelector('.availability-filter-status').addEventListener('change', render);

    render();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Owned Domains Gallery
  // ═══════════════════════════════════════════════════════════════════════════

  function initOwnedDomains() {
    const container = $('#owned-domains-gallery');
    if (!container) return;

    const owned = lexiconData.entries.filter((e) => e.isOwned);
    container.innerHTML = `
      <div class="owned-count">${owned.length} PÚNYCODEX-owned domains</div>
      <div class="owned-grid">
        ${owned
          .map(
            (e) => `
          <a href="/sites/${e.id}/" class="owned-card">
            <span class="owned-name">${escapeHtml(e.unicode)}</span>
            <span class="owned-domain mono">${escapeHtml(e.domainUnicode)}</span>
            <span class="owned-pantheon">${escapeHtml(e.pantheon)}</span>
          </a>`,
          )
          .join('')}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Global Codex Search
  // ═══════════════════════════════════════════════════════════════════════════

  function initGlobalSearch() {
    const input = $('#codex-global-search');
    const output = $('#codex-global-results');
    if (!input || !output) return;

    input.addEventListener(
      'input',
      debounce(() => {
        const term = input.value.trim().toLowerCase();
        if (!term) {
          output.innerHTML = '';
          return;
        }

        const matches = lexiconData.entries
          .filter((e) => {
            return (
              e.ascii.toLowerCase().includes(term) ||
              e.unicode.toLowerCase().includes(term) ||
              e.id.toLowerCase().includes(term) ||
              (e.greek && e.greek.toLowerCase().includes(term)) ||
              (e.meaning && e.meaning.toLowerCase().includes(term)) ||
              e.pantheon.toLowerCase().includes(term) ||
              e.sources.some((s) => s.toLowerCase().includes(term))
            );
          })
          .slice(0, 12);

        if (!matches.length) {
          output.innerHTML = '<p class="global-search-empty">No matches found.</p>';
          return;
        }

        output.innerHTML = matches
          .map(
            (e) => `
          <a href="/sites/${e.id}/" class="global-search-result">
            <span class="global-search-name">${escapeHtml(e.unicode)}</span>
            <span class="global-search-meta">${escapeHtml(e.ascii)} · ${escapeHtml(e.pantheon)} · ${escapeHtml(e.tierLabel)}</span>
          </a>`,
          )
          .join('');
      }, 250),
    );
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
      initTierSystem();
      initAvailabilityDashboard();
      initOwnedDomains();
      initGlobalSearch();
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
