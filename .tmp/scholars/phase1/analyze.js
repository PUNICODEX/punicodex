const fs = require('fs');
const path = require('path');

const BATCH_SPEC = '5:shiva,shu,tartaros,thor,ab,akh,apollon,hades,hekate,nike,el';

const [batchNumberStr, idsStr] = BATCH_SPEC.split(':');
const batchNumber = parseInt(batchNumberStr, 10);
const ids = idsStr.split(',').map(s => s.trim());

const loreCatalogPath = path.join('scripts', 'lore-catalog.json');
const lexiconPath = path.join('type', 'js', 'lexicon.js');

const loreCatalog = JSON.parse(fs.readFileSync(loreCatalogPath, 'utf8'));

// Load canonical lexicon
const lexiconContent = fs.readFileSync(lexiconPath, 'utf8');
const LEXICON = eval(lexiconContent + '\n; LEXICON;');
const lexiconMap = new Map(LEXICON.map(e => [e.id, e]));

const knownScripts = [
  'Sanskrit', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Odia', 'Tamil',
  'Telugu', 'Kannada', 'Malayalam', 'Tibetan', 'Burmese', 'Thai', 'Khmer', 'Lao',
  'Greek', 'Latin', 'Coptic', 'Ugaritic', 'Hebrew', 'Phoenician', 'Paleo-Hebrew',
  'Arabic', 'Syriac', 'Egyptian', 'Egyptian hieroglyphs', 'Hieroglyphic', 'Cuneiform',
  'Akkadian', 'Sumerian', 'Hittite', 'Norse', 'Old Norse', 'Runes', 'Elder Futhark',
  'Runic', 'Persian', 'Old Persian', 'Cyrillic', 'Georgian', 'Armenian', 'Ethiopic',
  'Amharic', 'Meroitic', 'Linear B', 'Mycenaean Greek'
];

const CATALOG_SECTION_KEYS = [
  'pronunciation', 'domains', 'symbols', 'mythology', 'syncretism',
  'culturalLegacy', 'extendedMeditation', 'originalScriptNote', 'sources', 'archaeology'
];

function extractText(obj) {
  const out = [];
  function walk(v) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  }
  walk(obj);
  return out.join(' ');
}

function findScripts(text) {
  const found = new Set();
  for (const script of knownScripts) {
    const re = new RegExp(`\\b${script.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(text)) found.add(script);
  }
  // Also catch non-boundary script names that contain punctuation by simple includes
  for (const script of knownScripts) {
    if (text.toLowerCase().includes(script.toLowerCase())) found.add(script);
  }
  return Array.from(found).sort();
}

function detectSourceStyles(entry) {
  const styles = new Set();
  const allText = extractText(entry);
  const sourceNames = Array.isArray(entry.sources) ? entry.sources.map(s => s.name || s).join('\n') : '';
  const combined = allText + '\n' + sourceNames;

  if (/\bKTU\s+\d/.test(combined)) styles.add('KTU reference');
  if (/\bRigveda\b|\bRV\s+\d/i.test(combined)) styles.add('Vedic reference');
  if (/\bHomer\b|\bIliad\b|\bOdyssey\b/i.test(combined)) styles.add('Classical text reference');
  if (/\b\d+\s*:\s*\d+\b/.test(combined) || /Bible/i.test(combined)) styles.add('Bible verse');

  for (const src of entry.sources || []) {
    const name = typeof src === 'string' ? src : src.name || '';
    if (/^[A-Z][a-z]+,\s/.test(name)) styles.add('Author-Year');
    else if (/^KTU\b/i.test(name)) styles.add('KTU reference');
    else if (/^(LSJ|CIS|CAD|CDLI|KTU|OED)$/i.test(name) || name.length < 35) styles.add('Short name');
  }
  return Array.from(styles).sort();
}

function parseHtmlSections(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, 'utf8');
  const sections = [];
  const sectionRe = /<section\b([^>]*)>/gi;
  let match;
  while ((match = sectionRe.exec(html)) !== null) {
    const tagStart = match.index;
    const attrs = match[1];
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : null;
    const nextSectionIdx = html.indexOf('<section', tagStart + 1);
    const sliceEnd = nextSectionIdx === -1 ? html.length : nextSectionIdx;
    const slice = html.slice(tagStart, sliceEnd);
    const h2Match = slice.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    let heading = null;
    if (h2Match) {
      heading = h2Match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    sections.push({ id, heading });
  }
  return sections;
}

function approximateWordCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Count only text inside <section> tags (the visible lore body)
  const sectionText = [];
  const sectionRe = /<section\b[^>]*>([\s\S]*?)(?=<section\b|$)/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    sectionText.push(m[1]);
  }
  const text = sectionText.join(' ').replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function detectMediaTypes(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const html = fs.readFileSync(filePath, 'utf8');
  const types = [];
  if (/<img\b|<picture\b/i.test(html)) types.push('image');
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<iframe[^>]*\b(?:map|google|openstreetmap)|class=["'][^"']*map/i.test(html)) types.push('map');
  return types;
}

const entries = [];
const allCatalogSections = new Set();
const allHtmlSectionIds = new Set();
const perPantheonSectionFreq = {};
const entryAnomalies = {};

for (const id of ids) {
  const lore = loreCatalog[id] || null;
  const lexEntry = lexiconMap.get(id) || null;
  const loreFile = path.join('sites', id, 'lore', 'index.html');
  const extendedFile = path.join('sites', id, 'lore', 'extended', 'index.html');

  const loreCatalogSections = lore ? Object.keys(lore) : [];
  loreCatalogSections.forEach(k => allCatalogSections.add(k));

  const htmlLoreSections = parseHtmlSections(loreFile);
  const htmlExtendedSections = parseHtmlSections(extendedFile);
  const hasExtendedPage = fs.existsSync(extendedFile);

  if (htmlLoreSections) {
    htmlLoreSections.forEach(s => { if (s.id) allHtmlSectionIds.add(s.id); });
  }

  // Scripts mentioned
  let scriptsMentioned = [];
  let originalScriptNotePresent = false;
  if (lore) {
    originalScriptNotePresent = !!lore.originalScriptNote;
    const textToScan = extractText(lore) + ' ' + (lore.originalScriptNote || '');
    scriptsMentioned = findScripts(textToScan);
  }

  // Source styles
  let sourceStyles = [];
  if (lore) sourceStyles = detectSourceStyles(lore);

  // Media types
  const mediaSet = new Set();
  detectMediaTypes(loreFile).forEach(t => mediaSet.add(t));
  detectMediaTypes(extendedFile).forEach(t => mediaSet.add(t));
  const mediaTypes = Array.from(mediaSet).sort();

  const wordCount = approximateWordCount(loreFile);

  const name = lexEntry ? (lexEntry.unicode || lexEntry.ascii || id) : id;
  const pantheon = lexEntry ? lexEntry.pantheon : null;
  const tier = lexEntry ? lexEntry.tier : null;

  // Per-pantheon section frequency
  if (pantheon) {
    if (!perPantheonSectionFreq[pantheon]) perPantheonSectionFreq[pantheon] = {};
    for (const sec of loreCatalogSections) {
      perPantheonSectionFreq[pantheon][sec] = (perPantheonSectionFreq[pantheon][sec] || 0) + 1;
    }
  }

  // Variants / etymology / sourceCatalog / originalScript
  const variantsCount = lexEntry && Array.isArray(lexEntry.variants) ? lexEntry.variants.length : 0;
  const hasEtymology = !!(lexEntry && lexEntry.etymology &&
    (typeof lexEntry.etymology === 'string' ? lexEntry.etymology.trim() : Object.keys(lexEntry.etymology).length > 0));
  const hasSourceCatalog = !!(lexEntry && lexEntry.sourceCatalog && Object.keys(lexEntry.sourceCatalog).length);
  const originalScriptInfo = lexEntry ? {
    greek: lexEntry.greek || null,
    originalScript: lexEntry.originalScript || null,
    originalScriptProvenance: lexEntry.originalScriptProvenance || null
  } : null;

  // Anomalies for this entry
  const anomalies = [];
  if (!lore) anomalies.push('missing lore-catalog entry');
  if (!fs.existsSync(loreFile)) anomalies.push('missing sites/{id}/lore/index.html');
  if (lore) {
    for (const sec of CATALOG_SECTION_KEYS) {
      if (!loreCatalogSections.includes(sec)) anomalies.push(`lore-catalog missing section: ${sec}`);
    }
  }
  if (htmlLoreSections) {
    const htmlIds = htmlLoreSections.map(s => s.id).filter(Boolean);
    const expectedHtml = ['hero', 'the-name', 'provenance', 'pronunciation'];
    for (const exp of expectedHtml) {
      if (!htmlIds.includes(exp)) anomalies.push(`HTML lore missing expected section id: ${exp}`);
    }
    // Sections in HTML not in lore-catalog (common expected ones)
    const catalogIds = new Set(loreCatalogSections);
    const knownExtra = new Set(['hero', 'the-name', 'provenance', 'related', 'extended-lore-cta', 'tier-classification', 'cultural-legacy', 'extended-meditation', 'sources', 'archaeology']);
    for (const sid of htmlIds) {
      if (!catalogIds.has(sid) && !knownExtra.has(sid)) {
        anomalies.push(`HTML section id not in lore-catalog and not known extra: ${sid}`);
      }
    }
  }

  if (anomalies.length) entryAnomalies[id] = anomalies;

  entries.push({
    id,
    name,
    pantheon,
    tier,
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage,
    approximateWordCount: wordCount
  });
}

const aggregate = {
  loreCatalogSectionUnion: Array.from(allCatalogSections).sort(),
  htmlSectionIdUnion: Array.from(allHtmlSectionIds).sort(),
  perPantheonSectionFrequency: perPantheonSectionFreq,
  anomalies: entryAnomalies
};

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate
};

const outPath = path.join('.tmp', 'scholars', 'phase1', `batch-${batchNumber}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Entries analyzed: ${entries.length}`);
console.log(`Anomalous entries: ${Object.keys(aggregate.anomalies).length}`);
