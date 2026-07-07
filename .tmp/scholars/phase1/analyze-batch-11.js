const fs = require('fs');
const path = require('path');

const BATCH = "11:david,solomon,noah,cain,abel,hemera,long,taichi,yinyang,wuji,bagua";

const [batchNumStr, idsStr] = BATCH.split(':');
const batchNumber = parseInt(batchNumStr, 10);
const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);

const ROOT = 'C:/projects/punycodex';

// Load canonical sources
const loreCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lore-catalog.json'), 'utf8'));

// Load lexicon.js via require (it exports { LEXICON })
const lexiconModule = require(path.join(ROOT, 'type/js/lexicon.js'));
const LEXICON = lexiconModule.LEXICON || [];

function findLexEntry(id) {
  return LEXICON.find(e => e.id === id) || null;
}

function findLoreEntry(id) {
  return loreCatalog[id] || null;
}

function parseSections(html) {
  const sections = [];
  const sectionRegex = /<section\b[^>]*?\bid="([^"]+)"[^>]*?>([\s\S]*?)<\/section>/gi;
  let m;
  while ((m = sectionRegex.exec(html)) !== null) {
    const id = m[1];
    const body = m[2];
    const h2Match = body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    let heading = '';
    if (h2Match) {
      heading = h2Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    sections.push({ id, heading });
  }
  return sections;
}

function approximateWordCount(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/&#[0-9]+;/g, ' ');
  const tokens = text.split(/\s+/).filter(t => /\w/.test(t));
  return tokens.length;
}

function detectMediaTypes(html) {
  const types = [];
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<img\b/i.test(html) || /<picture\b/i.test(html)) types.push('image');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<iframe\b/i.test(html)) types.push('map');
  return [...new Set(types)];
}

const KNOWN_SCRIPTS = [
  'Greek', 'Cyrillic', 'Latin', 'Arabic', 'Hebrew', 'Coptic', 'Sanskrit', 'Devanagari',
  'Runes', 'Runic', 'Elder Futhark', 'Younger Futhark', 'Old Norse', 'Norse',
  'Egyptian', 'Hieroglyphic', 'Hieroglyphs', 'Demotic',
  'Ugaritic', 'Phoenician', 'Cuneiform', 'Akkadian', 'Sumerian',
  'Celtic', 'Ogham', 'Gaulish', 'Old Irish', 'Middle Welsh',
  'Japanese', 'Hiragana', 'Katakana', 'Kanji', 'Chinese', 'Hanzi', 'Mandarin',
  'Korean', 'Hangul',
  'Thai', 'Tibetan', 'Georgian', 'Armenian', 'Persian', 'Old Persian',
  'Anatolian', 'Hittite', 'Luwian', 'Lycian', 'Lydian',
  'Mycenaean', 'Linear B',
  'Minoan', 'Linear A',
  'Ethiopic', "Ge'ez",
  'Gothic', 'Glagolitic', 'Old Church Slavonic',
  'Vedic', 'Pali', 'Prakrit',
  'Anglo-Saxon', 'Old English',
  'Proto-Indo-European', 'PIE',
  'Syriac', 'Aramaic'
];

function extractScripts(text) {
  const found = [];
  for (const script of KNOWN_SCRIPTS) {
    const regex = new RegExp('\\b' + script.replace(/[-\s]/g, '[-\\s]?') + '\\b', 'i');
    if (regex.test(text)) found.push(script);
  }
  return [...new Set(found)];
}

function detectSourceStyles(html, loreEntry) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const styles = [];
  if (/\bKTU\s+\d/.test(text)) styles.push('KTU reference');
  if (/\b(Gen|Exod|Lev|Num|Deut|Judg|Sam|Kgs|Isa|Jer|Ezek|Ps|Prov|Job|Song|Ruth|Lam|Eccl|Esth|Dan|Ezra|Neh|Chr|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Titus|Phlm|Heb|Jas|Pet|Jude|Rev)\s*\.?\s*\d+/.test(text)) styles.push('Bible verse');
  if (/\b[A-Z][a-z]+\s+\d{4}\b/.test(text)) styles.push('Author-Year');
  if (/\b(LSJ|Beekes|OCD|LIV|OED|DAG|TLG|DGE|Chantraine|Frisk|Pokorny|Watkins|West|Kirk|Edwards|Griffin|Gantz|Burkert|Nilsson|Vermeule|Boardman|Hammond|Scullard|DRN|LIMC|RE|RAC|DACL|L&S|OLD|CIL|IG|SEG|PMG|FGH|FGrH)\b/.test(text)) styles.push('Short name');
  if (/DAO|Daodejing|I Ching|Yijing|周易|易经|Tao Te Ching|Taijitu|Wuji|Bagua|yin-yang|陰陽|太極|八卦|無極|Lao Tzu|Laozi|Zhuangzi|Confucius|Analects/i.test(text)) styles.push('Chinese classic');
  if (/\bLXX\b|Septuagint/i.test(text)) styles.push('Septuagint');
  if (/Qumran|Dead Sea Scrolls|Masoretic|\bMT\b/i.test(text)) styles.push('Textual tradition');
  if (loreEntry && loreEntry.sources && Array.isArray(loreEntry.sources)) {
    for (const s of loreEntry.sources) {
      if (typeof s === 'string' && /^[A-Z][a-z]+\s+\d/.test(s)) {
        if (!styles.includes('Author-Year')) styles.push('Author-Year');
      }
    }
  }
  return [...new Set(styles)];
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

const entries = [];
const allLoreCatalogKeys = new Set();
const allHtmlSectionIds = new Set();
const pantheonSectionFreq = {};

for (const id of ids) {
  const loreEntry = findLoreEntry(id);
  const lexEntry = findLexEntry(id);

  const lorePath = path.join(ROOT, `sites/${id}/lore/index.html`);
  const extendedPath = path.join(ROOT, `sites/${id}/lore/extended/index.html`);

  const hasLore = fileExists(lorePath);
  const hasExtended = fileExists(extendedPath);

  let htmlLoreSections = [];
  let htmlExtendedSections = null;
  let wordCount = 0;
  let mediaTypes = [];
  let sourceStyles = [];
  let loreHtml = '';
  let extHtml = '';

  if (hasLore) {
    loreHtml = fs.readFileSync(lorePath, 'utf8');
    htmlLoreSections = parseSections(loreHtml);
    wordCount = approximateWordCount(loreHtml);
    mediaTypes = detectMediaTypes(loreHtml);
    sourceStyles = detectSourceStyles(loreHtml, loreEntry);
  }

  if (hasExtended) {
    extHtml = fs.readFileSync(extendedPath, 'utf8');
    htmlExtendedSections = parseSections(extHtml);
    wordCount += approximateWordCount(extHtml);
    // merge media types and source styles from extended
    const extMedia = detectMediaTypes(extHtml);
    const extStyles = detectSourceStyles(extHtml, loreEntry);
    mediaTypes = [...new Set([...mediaTypes, ...extMedia])];
    sourceStyles = [...new Set([...sourceStyles, ...extStyles])];
  }

  const loreCatalogSections = loreEntry ? Object.keys(loreEntry) : [];
  for (const k of loreCatalogSections) allLoreCatalogKeys.add(k);
  for (const s of htmlLoreSections) allHtmlSectionIds.add(s.id);
  if (htmlExtendedSections) {
    for (const s of htmlExtendedSections) allHtmlSectionIds.add(s.id);
  }

  const pantheon = lexEntry ? (lexEntry.pantheon || '') : (loreEntry ? (loreEntry.pantheon || '') : '');
  const tier = lexEntry ? (lexEntry.tier || '') : null;
  const tierLabel = lexEntry ? (lexEntry.tierLabel || tier) : null;

  if (pantheon) {
    if (!pantheonSectionFreq[pantheon]) pantheonSectionFreq[pantheon] = {};
    for (const s of htmlLoreSections) {
      pantheonSectionFreq[pantheon][s.id] = (pantheonSectionFreq[pantheon][s.id] || 0) + 1;
    }
    if (htmlExtendedSections) {
      for (const s of htmlExtendedSections) {
        pantheonSectionFreq[pantheon][s.id] = (pantheonSectionFreq[pantheon][s.id] || 0) + 1;
      }
    }
  }

  const originalScriptNotePresent = !!(loreEntry && loreEntry.originalScriptNote);

  const loreText = loreEntry ? JSON.stringify(loreEntry) : '';
  const scriptsMentioned = extractScripts(loreText + ' ' + loreHtml + ' ' + extHtml);

  const lexName = lexEntry ? (lexEntry.unicode || lexEntry.ascii || id) : id;
  const variantsCount = lexEntry && Array.isArray(lexEntry.variants) ? lexEntry.variants.length : 0;
  const hasEtymology = !!(lexEntry && lexEntry.etymology);
  const hasSourceCatalog = !!(lexEntry && lexEntry.sourceCatalog);
  const originalScriptInfo = lexEntry ? {
    greek: lexEntry.greek || null,
    originalScript: lexEntry.originalScript || null,
    scriptProvenance: lexEntry.scriptProvenance || null
  } : { greek: null, originalScript: null, scriptProvenance: null };

  entries.push({
    id,
    name: lexName,
    pantheon,
    tier,
    tierLabel,
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage: hasExtended,
    approximateWordCount: wordCount,
    lexiconDetails: {
      variantsCount,
      hasEtymology,
      hasSourceCatalog,
      originalScriptInfo
    },
    fileChecks: {
      hasLore,
      hasExtended,
      hasLoreCatalogEntry: !!loreEntry,
      hasLexiconEntry: !!lexEntry
    }
  });
}

// Aggregate anomalies
const anomalies = [];
const structuralHtmlSections = new Set(['hero', 'the-name', 'provenance', 'related', 'extended-lore-cta', 'quick-facts', 'unicode-breakdown', 'faq', 'back-to-lore']);

for (const e of entries) {
  if (!e.fileChecks.hasLoreCatalogEntry) anomalies.push({ id: e.id, type: 'missing-lore-catalog-entry' });
  if (!e.fileChecks.hasLexiconEntry) anomalies.push({ id: e.id, type: 'missing-lexicon-entry' });
  if (!e.fileChecks.hasLore) anomalies.push({ id: e.id, type: 'missing-lore-html' });
  if (e.loreCatalogSections.length === 0 && e.fileChecks.hasLoreCatalogEntry) {
    anomalies.push({ id: e.id, type: 'empty-lore-catalog-entry' });
  }

  const allHtmlIds = new Set([
    ...e.htmlLoreSections.map(s => s.id),
    ...(e.htmlExtendedSections || []).map(s => s.id)
  ]);

  // Catalog sections that should appear in HTML somewhere
  for (const catKey of e.loreCatalogSections) {
    if (catKey === 'extendedMeditation') {
      // typically rendered in extended page as cultural-significance or faq; don't flag
      continue;
    }
    if (catKey === 'sources') {
      if (!allHtmlIds.has('sources')) {
        anomalies.push({ id: e.id, type: 'catalog-sources-missing-from-html', detail: catKey });
      }
      continue;
    }
    if (catKey === 'originalScriptNote') {
      if (!allHtmlIds.has('provenance') && !allHtmlIds.has('original-script-provenance')) {
        anomalies.push({ id: e.id, type: 'catalog-originalScriptNote-missing-from-html', detail: catKey });
      }
      continue;
    }
    if (catKey === 'syncretism' || catKey === 'culturalLegacy' || catKey === 'archaeology') {
      // may be folded into mythology/extended; only flag if not present at all
      if (!allHtmlIds.has(catKey) && !allHtmlIds.has('cultural-significance') && !allHtmlIds.has('mythology')) {
        anomalies.push({ id: e.id, type: 'catalog-section-not-rendered', detail: catKey });
      }
      continue;
    }
    if (!allHtmlIds.has(catKey) && !structuralHtmlSections.has(catKey)) {
      anomalies.push({ id: e.id, type: 'catalog-section-not-rendered', detail: catKey });
    }
  }
}

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate: {
    loreCatalogSectionKeysUnion: [...allLoreCatalogKeys].sort(),
    htmlSectionIdsUnion: [...allHtmlSectionIds].sort(),
    perPantheonSectionFrequency: pantheonSectionFreq,
    anomalies
  }
};

const outPath = path.join(ROOT, `.tmp/scholars/phase1/batch-${batchNumber}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Analyzed ${ids.length} entries`);
console.log(`Anomalies: ${anomalies.length}`);
