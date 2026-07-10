#!/usr/bin/env node
/**
 * Export canonical data into browser-ready JSON for the Codex atlas.
 *
 * This is the flywheel endpoint for the Codex: every canonical source
 * (lexicon, original-scripts, source-catalog, lore-catalog, owned-domains,
 * domain-availability) is read, normalized, and written to codex/data/.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

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
  for (const p of paths) {
    const parts = p.split('.');
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

function loadModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const module = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', '__dirname', source);
  wrapper(module, module.exports, require, path.dirname(filePath));
  return module.exports;
}

function loadLexicon() {
  return loadModule(path.join(ROOT, 'type', 'js', 'lexicon.js')).LEXICON || [];
}

function loadOriginalScripts() {
  const ex = loadModule(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
  return {
    scripts: ex.ORIGINAL_SCRIPTS || {},
    scriptNames: ex.SCRIPT_NAMES || {},
    scriptless: Array.from(ex.SCRIPTLESS_PANTHEONS || []),
  };
}

function loadSourceCatalog() {
  return loadModule(path.join(ROOT, 'type', 'js', 'source-catalog.js')).SOURCE_CATALOG || {};
}

function loadArchetypes() {
  return loadModule(path.join(ROOT, 'js', 'archetypes-v2.js')).ARCHETYPES || [];
}

function loadLoreCatalog() {
  const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
  if (!fs.existsSync(lorePath)) return {};
  return JSON.parse(fs.readFileSync(lorePath, 'utf-8'));
}

function loadAvailability() {
  const availPath = path.join(ROOT, 'data', 'domain-availability.json');
  if (!fs.existsSync(availPath)) return { entries: {}, statuses: {} };
  return JSON.parse(fs.readFileSync(availPath, 'utf-8'));
}

function summarizeLore(lore) {
  if (!lore) return null;
  return {
    pronunciation: lore.pronunciation
      ? {
          ipa: lore.pronunciation.ipa || null,
          ipaLabel: lore.pronunciation.ipaLabel || null,
          approximation: lore.pronunciation.approximation || null,
          note: lore.pronunciation.note || null,
        }
      : null,
    domains: lore.domains
      ? {
          title: lore.domains.title || null,
          subtitle: lore.domains.subtitle || null,
          lead: lore.domains.lead || null,
          cards: (lore.domains.cards || []).slice(0, 4),
        }
      : null,
    symbols: (lore.symbols || []).slice(0, 6),
    mythology: lore.mythology
      ? {
          lead: lore.mythology.lead || null,
          myths: (lore.mythology.myths || []).slice(0, 2),
        }
      : null,
    culturalLegacy: lore.culturalLegacy || null,
    archaeology: lore.archaeology || null,
    syncretism: lore.syncretism || null,
    originalScriptNote: lore.originalScriptNote || null,
  };
}

function main() {
  const LEXICON = loadLexicon();
  const { scripts: ORIGINAL_SCRIPTS, scriptNames: SCRIPT_NAMES, scriptless: SCRIPTLESS } = loadOriginalScripts();
  const SOURCE_CATALOG = loadSourceCatalog();
  const ARCHETYPES = loadArchetypes();
  const LORE = loadLoreCatalog();
  const AVAILABILITY = loadAvailability();
  const ownedDomains = JSON.parse(fs.readFileSync(path.join(ROOT, 'platform', 'db', 'owned-domains.json'), 'utf-8'));
  const ownedSet = new Set(ownedDomains.map((d) => d.toLowerCase()));

  const flagshipIds = new Set(ARCHETYPES.map((a) => a.id));
  const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));

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

  const availabilityById = {};
  for (const [id, record] of Object.entries(AVAILABILITY.entries || {})) {
    availabilityById[id] = {
      domain: record.domain,
      status: record.status,
      details: record.details || null,
      httpStatus: record.httpStatus || null,
    };
  }

  // Slim lexicon for the atlas
  const entries = LEXICON.map((entry) => {
    const displayDomain = `${entry.unicode.toLowerCase()}.com`;
    const punyDomain = domainToASCII(displayDomain);
    const isOwned = ownedSet.has(displayDomain) || ownedSet.has(punyDomain);
    const archetype = archetypeById.get(entry.id);
    const availability = availabilityById[entry.id] || null;
    const os = ORIGINAL_SCRIPTS[entry.id] || null;

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
      domainUnicode: displayDomain,
      domainPunycode: punyDomain,
      hasFlagship: flagshipIds.has(entry.id) ? 1 : 0,
      isOwned: isOwned ? 1 : 0,
      punycode: punyDomain.startsWith('xn--') ? punyDomain.replace('.com', '') : entry.ascii,
      variants: (entry.variants || []).map((v) => ({
        unicode: v.unicode,
        type: v.type,
        note: v.note || null,
        sources: v.sources || [],
      })),
      sources: entry.sources || [],
      etymology: entry.etymology || null,
      originalScript: os
        ? {
            scriptName: os.scriptName || SCRIPT_NAMES[entry.pantheon] || entry.pantheon,
            originalScript: os.originalScript || null,
            transliteration: os.provenance?.transliteration || null,
            steps: os.provenance?.steps || [],
            provenanceSources: os.provenance?.sources || [],
          }
        : null,
      lore: LORE[entry.id] ? summarizeLore(LORE[entry.id]) : null,
      availability: availability
        ? {
            status: availability.status,
            domain: availability.domain,
            details: availability.details,
          }
        : null,
      mascotPath: archetype?.mascotPath || null,
      logomarkPath: archetype?.logomarkPath || null,
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

  // Script atlas: all entries with real original scripts + provenance
  const scriptAtlas = [];
  for (const entry of entries) {
    if (!entry.originalScript || !entry.originalScript.originalScript) continue;
    scriptAtlas.push({
      id: entry.id,
      name: entry.unicode,
      ascii: entry.ascii,
      pantheon: entry.pantheon,
      scriptName: entry.originalScript.scriptName,
      originalScript: entry.originalScript.originalScript,
      transliteration: entry.originalScript.transliteration,
      steps: entry.originalScript.steps,
      sources: entry.originalScript.provenanceSources,
      hasFlagship: entry.hasFlagship,
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

  // Pantheon documentation
  const pantheonEntries = {};
  for (const entry of entries) {
    if (!pantheonEntries[entry.pantheon]) {
      pantheonEntries[entry.pantheon] = {
        count: 0,
        flagships: 0,
        owned: 0,
        dual: 0,
        tier1: 0,
        tier2: 0,
        sources: new Set(),
      };
    }
    const p = pantheonEntries[entry.pantheon];
    p.count++;
    if (entry.hasFlagship) p.flagships++;
    if (entry.isOwned) p.owned++;
    if (entry.tier === 'dual') p.dual++;
    if (entry.tier === '1') p.tier1++;
    if (entry.tier === '2') p.tier2++;
    for (const src of entry.sources || []) p.sources.add(src);
  }

  const PANTHEON_DESCRIPTIONS = {
    greek: 'The Olympians, Titans, chthonic powers, and heroes of the Greek-speaking world.',
    'greek-location': 'Realms and cities of the Greek world restored to their ancient orthography.',
    norse: 'The Æsir, Vanir, giants, and cosmological beings of the Norse-Germanic traditions.',
    egyptian: 'The gods and goddesses of pharaonic Egypt in hieroglyphic and Egyptological form.',
    sanskrit: 'Deities of the Vedic and classical Hindu traditions in Devanagari and IAST.',
    celtic: 'The gods and heroes of the Insular Celtic traditions.',
    mesopotamian: 'Sumerian, Akkadian, and Babylonian deities in cuneiform and transliteration.',
    polynesian: 'The pan-Polynesian pantheon of oceanic myth.',
    japanese: 'Kami and figures from Shinto, Japanese Buddhism, and folklore.',
    nahuatl: 'Gods and sacred forces of the Nahua and Aztec worlds.',
    yoruba: 'The òrìṣà and sacred forces of the Yoruba tradition and its diaspora.',
    slavic: 'The gods and spirits of Slavic pagan reconstruction.',
    zoroastrian: 'The divine beings of the Avesta and Zoroastrian tradition.',
    incan: 'The gods and huacas of the Inca and Andean religious world.',
    chinese: 'Deities, sages, and immortals of the Chinese religious landscape.',
    taoist: 'Taoist perfected beings, immortals, and cosmological figures.',
    buddhist: 'Buddhas, bodhisattvas, and protective figures across Buddhist canons.',
    korean: 'Korean deities, mountain spirits, and Buddhist figures.',
    canaanite: 'The gods of Ugarit and the Levantine Bronze Age.',
    phoenician: 'Deities of Phoenician and Punic religion.',
    hittite: 'The gods and goddesses of Hatti and the Hittite empire.',
  };

  const pantheonDocs = {};
  for (const [pantheon, data] of Object.entries(pantheonEntries)) {
    pantheonDocs[pantheon] = {
      description: PANTHEON_DESCRIPTIONS[pantheon] || `Names from the ${pantheon} tradition.`,
      color: PANTHEON_COLORS[pantheon] || '#d4af37',
      count: data.count,
      flagships: data.flagships,
      owned: data.owned,
      dual: data.dual,
      tier1: data.tier1,
      tier2: data.tier2,
      sourceCount: data.sources.size,
    };
  }

  // Tier documentation
  const tierDocs = {
    dual: {
      label: 'Dual-Tier',
      summary: 'Both stress and length are preserved, and multiple historically valid Unicode spellings exist.',
      rules: [
        'Greek original contains both stress (acute/circumflex) and at least one long vowel.',
        'Multiple historically valid Unicode spellings are attested.',
        'ASCII fallback is also historically legitimate.',
        'Each variant corresponds to a real, attested alternate restoration.',
      ],
      examples: ['apollon', 'hekate', 'nike'],
    },
    1: {
      label: 'Tier 1',
      summary: 'Full scholarly orthography: stress + length, but only one historically valid restoration.',
      rules: [
        'Greek original contains both stress and at least one long vowel.',
        'Only one historically valid Unicode restoration exists.',
        'ASCII fallback is a modern English homograph, not ancient canonical.',
      ],
      examples: ['zeus', 'ares', 'aphrodite', 'athena', 'demeter', 'hera', 'hermes', 'hephaistos'],
    },
    2: {
      label: 'Tier 2',
      summary: 'Preserves a single scholarly feature (stress or length) or neither.',
      rules: [
        'Greek original contains only one feature (stress OR long vowel) or neither.',
        'Still historically defensible and registrable as an IDN.',
      ],
      subtypes: {
        'accent-preserving': 'Keeps the stress mark but not vowel length.',
        'macron-preserving': 'Keeps vowel length but not stress.',
        'plain': 'Neither stress nor length is preserved; still a culturally meaningful name.',
      },
      examples: ['artemis', 'atlas', 'dionysos', 'medousa'],
    },
  };

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
    available: entries.filter((e) => e.availability && e.availability.status === 'available').length,
    live: entries.filter((e) => e.availability && e.availability.status === 'live').length,
    registered: entries.filter((e) => e.availability && e.availability.status === 'registered').length,
    scripts: scriptAtlas.length,
  };

  writeJson('codex-lexicon.json', {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'type/js/lexicon.js',
    },
    stats,
    pantheonColors: PANTHEON_COLORS,
    pantheonDocs,
    tierDocs,
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

  writeJson('availability.json', {
    meta: { generatedAt: new Date().toISOString(), source: 'data/domain-availability.json' },
    statuses: AVAILABILITY.statuses || {},
    entries: availabilityById,
  });
}

main();
