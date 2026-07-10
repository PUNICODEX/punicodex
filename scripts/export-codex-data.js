#!/usr/bin/env node
/**
 * Export canonical data into browser-ready JSON for the Codex atlas.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'codex', 'data');

function out(name) {
  return path.join(OUT_DIR, name);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withoutTimestamps(obj, paths) {
  const clone = JSON.parse(JSON.stringify(obj));
  for (const path of paths) {
    const parts = path.split('.');
    let node = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      if (node == null) break;
      node = node[parts[i]];
    }
    if (node != null) {
      delete node[parts[parts.length - 1]];
    }
  }
  return clone;
}

function writeJson(name, data, ignorePaths = ['meta.generatedAt']) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filePath = out(name);
  let existing = null;
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      existing = null;
    }
  }
  if (existing && deepEqual(withoutTimestamps(existing, ignorePaths), withoutTimestamps(data, ignorePaths))) {
    console.log(`✓ codex/data/${name} (unchanged)`);
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ codex/data/${name}`);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSourceCatalogRows(sources) {
  return sources
    .map(
      (source) => `
          <tr>
            <td data-label="Code"><code>${escapeHtml(source.key)}</code></td>
            <td data-label="Full Title">${escapeHtml(source.full)}</td>
            <td data-label="Scope">${escapeHtml(source.scope)}</td>
            <td data-label="Year">${escapeHtml(source.year || '—')}</td>
            <td data-label="Edition">${escapeHtml(source.edition || '—')}</td>
            <td data-label="Link">${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">Link</a>` : '—'}</td>
          </tr>`,
    )
    .join('');
}

function updateCodexSourceTable(sources) {
  const htmlPath = path.join(ROOT, 'codex', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.log('⚠ codex/index.html not found, skipping source table pre-render');
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');
  const markerStart = '<tbody id="source-codex-body">';
  const markerEnd = '</tbody>';
  const startIdx = html.indexOf(markerStart);
  if (startIdx === -1) {
    console.log('⚠ source-codex-body not found in codex/index.html');
    return;
  }
  const endIdx = html.indexOf(markerEnd, startIdx + markerStart.length);
  if (endIdx === -1) {
    console.log('⚠ source-codex-body closing tag not found in codex/index.html');
    return;
  }

  const rows = buildSourceCatalogRows(sources);
  const newBody = `${markerStart}\n                            <!-- Auto-generated from type/js/source-catalog.js -->${rows}\n                        ${markerEnd}`;
  const before = html.slice(0, startIdx);
  const after = html.slice(endIdx + markerEnd.length);
  const newHtml = before + newBody + after;

  if (newHtml === html) {
    console.log('✓ codex/index.html source table (unchanged)');
    return;
  }
  fs.writeFileSync(htmlPath, newHtml);
  console.log('✓ codex/index.html source table updated');
}

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const source = fs.readFileSync(lexiconPath, 'utf-8');
  const module = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', source);
  wrapper(module, module.exports, require);
  return module.exports.LEXICON || [];
}

function loadOriginalScripts() {
  const osPath = path.join(ROOT, 'type', 'js', 'original-scripts.js');
  const source = fs.readFileSync(osPath, 'utf-8');
  const module = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', '__dirname', source);
  wrapper(module, module.exports, require, path.dirname(osPath));
  return {
    scripts: module.exports.ORIGINAL_SCRIPTS || {},
    scriptNames: module.exports.SCRIPT_NAMES || {},
    scriptless: Array.from(module.exports.SCRIPTLESS_PANTHEONS || []),
  };
}

function loadSourceCatalog() {
  const scPath = path.join(ROOT, 'type', 'js', 'source-catalog.js');
  const source = fs.readFileSync(scPath, 'utf-8');
  const module = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', source);
  wrapper(module, module.exports, require);
  return module.exports.SOURCE_CATALOG || {};
}

function loadArchetypes() {
  const arcPath = path.join(ROOT, 'js', 'archetypes-v2.js');
  const source = fs.readFileSync(arcPath, 'utf-8');
  const module = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', source);
  wrapper(module, module.exports, require);
  return module.exports.ARCHETYPES || [];
}

function main() {
  const LEXICON = loadLexicon();
  const { scripts: ORIGINAL_SCRIPTS, scriptNames: SCRIPT_NAMES, scriptless: SCRIPTLESS } = loadOriginalScripts();
  const SOURCE_CATALOG = loadSourceCatalog();
  const ARCHETYPES = loadArchetypes();
  const ownedDomains = JSON.parse(fs.readFileSync(path.join(ROOT, 'platform', 'db', 'owned-domains.json'), 'utf-8'));
  const ownedSet = new Set(ownedDomains.map((d) => d.toLowerCase()));

  const flagshipIds = new Set(ARCHETYPES.map((a) => a.id));

  // Pantheon colors for the constellation
  const PANTHEON_COLORS = {
    greek: '#D4AF37',
    'greek-location': '#C9B037',
    norse: '#6B9E75',
    egyptian: '#9B7ED9',
    sanskrit: '#E8784A',
    celtic: '#4A9B8E',
    mesopotamian: '#B87333',
    polynesian: '#4A90A4',
    japanese: '#D46A6A',
    nahuatl: '#8F6B4E',
    yoruba: '#6B5B95',
    slavic: '#9B6B8F',
    zoroastrian: '#7D9B6B',
    incan: '#9B8B6B',
    chinese: '#D4A5A5',
    taoist: '#A5A5D4',
    buddhist: '#A5D4A5',
    korean: '#A5D4D4',
    canaanite: '#D4A5D4',
    phoenician: '#D4A5B5',
    hittite: '#B5A5D4',
  };

  // Slim lexicon for the atlas
  const entries = LEXICON.map((entry) => {
    const displayDomain = `${entry.unicode.toLowerCase()}.com`;
    const punyDomain = `${entry.punycode || entry.unicode.toLowerCase()}.com`;
    const isOwned = ownedSet.has(displayDomain) || ownedSet.has(punyDomain);
    return {
      id: entry.id,
      ascii: entry.ascii,
      unicode: entry.unicode,
      greek: entry.greek,
      pantheon: entry.pantheon,
      tier: entry.tier,
      tierLabel: entry.tierLabel,
      meaning: entry.meaning,
      domain: entry.domain,
      hasFlagship: flagshipIds.has(entry.id) ? 1 : 0,
      isOwned: isOwned ? 1 : 0,
      punycode: entry.punycode,
      variants: (entry.variants || []).map((v) => ({ unicode: v.unicode, type: v.type })),
      sources: entry.sources || [],
      protoLanguage: entry.etymology?.protoLanguage || null,
      protoForm: entry.etymology?.protoForm || null,
    };
  });

  // Group breakdowns by entry id
  const breakdownsById = {};
  for (const entry of LEXICON) {
    if (entry.breakdown && entry.breakdown.length) {
      breakdownsById[entry.id] = entry.breakdown.map((b) => ({
        char: b.char,
        to: b.to,
        type: b.type,
        note: b.note,
      }));
    }
  }

  // Script atlas entries: pick one representative per script family
  const scriptAtlas = [];
  const seenScripts = new Set();
  for (const entry of LEXICON) {
    const os = ORIGINAL_SCRIPTS[entry.id];
    if (!os || !os.originalScript) continue;
    const scriptName = os.scriptName || SCRIPT_NAMES[entry.pantheon] || entry.pantheon;
    if (seenScripts.has(scriptName)) continue;
    seenScripts.add(scriptName);
    scriptAtlas.push({
      id: entry.id,
      name: entry.unicode,
      scriptName,
      originalScript: os.originalScript,
      pantheon: entry.pantheon,
      note: os.provenance?.steps?.[0] || '',
    });
  }

  // Source catalog array
  const sources = Object.entries(SOURCE_CATALOG).map(([key, value]) => ({
    key,
    full: value.full,
    scope: value.scope,
    year: value.year,
    edition: value.edition,
    url: value.url || null,
  }));

  // Stats
  const pantheonSet = new Set(entries.map((e) => e.pantheon));
  const stats = {
    totalEntries: entries.length,
    pantheons: pantheonSet.size,
    owned: entries.filter((e) => e.isOwned).length,
    flagships: entries.filter((e) => e.hasFlagship).length,
    tierDual: entries.filter((e) => e.tier === 'dual').length,
    tier1: entries.filter((e) => e.tier === '1').length,
    tier2: entries.filter((e) => e.tier === '2').length,
  };

  writeJson('codex-lexicon.json', {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'type/js/lexicon.js',
    },
    stats,
    pantheonColors: PANTHEON_COLORS,
    entries,
    breakdowns: breakdownsById,
  });

  writeJson('original-scripts.json', {
    meta: { generatedAt: new Date().toISOString(), source: 'type/js/original-scripts.js' },
    scriptNames: SCRIPT_NAMES,
    scriptless: SCRIPTLESS,
    atlas: scriptAtlas,
  });

  writeJson('source-catalog.json', {
    meta: { generatedAt: new Date().toISOString(), source: 'type/js/source-catalog.js' },
    sources,
  });

  updateCodexSourceTable(sources);

  writeJson('owned-domains.json', {
    meta: { generatedAt: new Date().toISOString(), source: 'platform/db/owned-domains.json' },
    domains: ownedDomains,
    count: ownedDomains.length,
  });
}

main();
