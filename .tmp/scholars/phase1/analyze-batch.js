const fs = require('fs');
const path = require('path');

const BATCH = "3:sparte,zeus,alfheimr,artemis,atlas,chaos,delphoi,dionysos,helheimr,jotunheimr,ker";

const [batchNumStr, idsStr] = BATCH.split(':');
const batchNumber = parseInt(batchNumStr, 10);
const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);

const ROOT = 'C:/projects/punycodex';

// Load canonical sources
const loreCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lore-catalog.json'), 'utf8'));

// Load lexicon.js in an isolated VM context so its LEXICON does not clash
const vm = require('vm');
let lexiconSource = fs.readFileSync(path.join(ROOT, 'type/js/lexicon.js'), 'utf8');
// Ensure the file exposes LEXICON on the context object
lexiconSource = lexiconSource.replace(/\bconst\s+LEXICON\s*=/, 'var LEXICON =');
const lexiconCtx = { console, module, exports: {} };
try {
  vm.createContext(lexiconCtx);
  vm.runInContext(lexiconSource, lexiconCtx);
} catch (e) {
  console.error('Failed to eval lexicon.js:', e.message);
}

function findLexEntry(id) {
  const arr = lexiconCtx.LEXICON || [];
  return arr.find(e => e.id === id) || null;
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
  // Remove script/style contents and tags, count remaining word-like tokens
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
  if (/<iframe\b/i.test(html)) types.push('map'); // likely map embeds
  return [...new Set(types)];
}

const KNOWN_SCRIPTS = [
  'Greek', 'Cyrillic', 'Latin', 'Arabic', 'Hebrew', 'Coptic', 'Sanskrit', 'Devanagari',
  'Runes', 'Runic', 'Elder Futhark', 'Younger Futhark', 'Old Norse', 'Norse',
  'Egyptian', 'Hieroglyphic', 'Hieroglyphs', 'Demotic',
  'Ugaritic', 'Phoenician', 'Cuneiform', 'Akkadian', 'Sumerian',
  'Celtic', 'Ogham', 'Gaulish', 'Old Irish', 'Middle Welsh',
  'Japanese', 'Hiragana', 'Katakana', 'Kanji', 'Chinese', 'Hanzi',
  'Korean', 'Hangul',
  'Thai', 'Tibetan', 'Georgian', 'Armenian', 'Persian', 'Old Persian',
  'Anatolian', 'Hittite', 'Luwian', 'Lycian', 'Lydian',
  'Mycenaean', 'Linear B',
  'Minoan', 'Linear A',
  'Ethiopic', 'Ge\'ez',
  'Gothic', 'Glagolitic', 'Old Church Slavonic',
  'Vedic', 'Pali', 'Prakrit',
  'Anglo-Saxon', 'Old English',
  'Proto-Indo-European', 'PIE'
];

function extractScripts(text) {
  const found = [];
  for (const script of KNOWN_SCRIPTS) {
    const regex = new RegExp('\\b' + script.replace(/[-\s]/g, '[-\\s]?') + '\\b', 'i');
    if (regex.test(text)) found.push(script);
  }
  return [...new Set(found)];
}

function detectSourceStyles(html, extendedHtml, loreEntry) {
  const text = (html + ' ' + (extendedHtml || '')).replace(/<[^>]+>/g, ' ');
  const styles = [];
  if (/\bKTU\s+\d/.test(text)) styles.push('KTU reference');
  if (/\b(Gen|Exod|Lev|Num|Deut|Judg|Sam|Kgs|Isa|Jer|Ezek|Ps|Prov|Job|Song|Ruth|Lam|Eccl|Esth|Dan|Ezra|Neh|Chr|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Titus|Phlm|Heb|Jas|Pet|Jude|Rev)\s*\d+/.test(text)) styles.push('Bible verse');
  // Full bibliographic citations with publisher + year
  if (/\b(Liddell|Beekes|Pape|Chantraine|Frisk|Burkert|Nilsson|West|Gantz|Griffin|Vermeule|Boardman|Hammond|Scullard)\b.*?\d{4}/.test(text)) styles.push('Full bibliography');
  // Author-Year (Name + 4-digit year)
  if (/\b[A-Z][a-zA-Z]+,?\s+(?:[A-Z]\.\s*)*\d{4}\b/.test(text)) styles.push('Author-Year');
  // Classical text references
  if (/\b(Homer|Hesiod|Aeschylus|Sophocles|Euripides|Aristophanes|Pindar|Plato|Aristotle|Herodotus|Thucydides|Vergil|Virgil|Ovid|Horace|Livy|Tacitus|Apollodorus|Hyginus|Snorri|Edda|Poetic Edda|Prose Edda|Völuspá|Grímnismál|Lokasenna|Hávamál)\b/.test(text)) styles.push('Classical text reference');
  // Short scholarly abbreviations
  if (/\b(LSJ|Beekes|OCD|LIV|OED|DAG|TLG|DGE|EDG|Chantraine|Frisk|Pokorny|Watkins|West|Kirk|Edwards|Griffin|Gantz|Burkert|Nilsson|Vermeule|Boardman|Hammond|Scullard|DRN|LIMC|RE|RAC|DACL|L&S|OLD|CIL|IG|SEG|PMG|FGH|FGrH|SkP|Skáldskaparmál|Gylfaginning)\b/.test(text)) styles.push('Short name');
  // Lore catalog sources
  if (loreEntry && loreEntry.sources && Array.isArray(loreEntry.sources)) {
    for (const s of loreEntry.sources) {
      if (typeof s === 'string') {
        if (/\d{4}/.test(s) && !styles.includes('Author-Year')) styles.push('Author-Year');
        if (/\b(Homer|Hesiod|Aeschylus|Sophocles|Euripides|Pindar|Plato|Snorri|Edda)\b/i.test(s) && !styles.includes('Classical text reference')) styles.push('Classical text reference');
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
  }

  if (hasExtended) {
    extHtml = fs.readFileSync(extendedPath, 'utf8');
    htmlExtendedSections = parseSections(extHtml);
  }
  sourceStyles = detectSourceStyles(loreHtml, extHtml, loreEntry);

  const loreCatalogSections = loreEntry ? Object.keys(loreEntry) : [];
  for (const k of loreCatalogSections) allLoreCatalogKeys.add(k);
  for (const s of htmlLoreSections) allHtmlSectionIds.add(s.id);
  if (htmlExtendedSections) {
    for (const s of htmlExtendedSections) allHtmlSectionIds.add(s.id);
  }

  const pantheon = lexEntry ? lexEntry.pantheon : (loreEntry ? (loreEntry.pantheon || '') : '');
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

  // Original script note
  const originalScriptNotePresent = !!(loreEntry && loreEntry.originalScriptNote);

  // Scripts mentioned
  let scriptsMentioned = [];
  const loreText = loreEntry ? JSON.stringify(loreEntry) : '';
  const htmlText = hasLore ? fs.readFileSync(lorePath, 'utf8') : '';
  const extText = hasExtended ? fs.readFileSync(extendedPath, 'utf8') : '';
  scriptsMentioned = extractScripts(loreText + ' ' + htmlText + ' ' + extText);

  // Lexicon details
  const lexName = lexEntry ? (lexEntry.unicode || lexEntry.ascii || id) : id;
  const tier = lexEntry ? lexEntry.tier : null;
  const tierLabel = lexEntry ? (lexEntry.tierLabel || tier) : null;
  const variantsCount = lexEntry && Array.isArray(lexEntry.variants) ? lexEntry.variants.length : 0;
  const hasEtymology = !!(lexEntry && lexEntry.etymology);
  const hasSourceCatalog = !!(lexEntry && lexEntry.sourceCatalog);
  const originalScriptInfo = lexEntry ? {
    greek: lexEntry.greek || null,
    originalScript: lexEntry.originalScript || null,
    scriptProvenance: lexEntry.scriptProvenance || null
  } : { greek: null, originalScript: null, scriptProvenance: null };

  const catalogSet = new Set(loreCatalogSections);
  const htmlLoreSectionsNotInCatalog = htmlLoreSections.filter(s => !catalogSet.has(s.id)).map(s => s.id);
  const htmlExtendedSectionsNotInCatalog = htmlExtendedSections ? htmlExtendedSections.filter(s => !catalogSet.has(s.id)).map(s => s.id) : null;

  entries.push({
    id,
    name: lexName,
    pantheon,
    tier,
    tierLabel,
    loreCatalogSections,
    htmlLoreSections,
    htmlLoreSectionsNotInCatalog,
    htmlExtendedSections,
    htmlExtendedSectionsNotInCatalog,
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
for (const e of entries) {
  if (!e.fileChecks.hasLoreCatalogEntry) anomalies.push({ id: e.id, type: 'missing-lore-catalog-entry' });
  if (!e.fileChecks.hasLexiconEntry) anomalies.push({ id: e.id, type: 'missing-lexicon-entry' });
  if (!e.fileChecks.hasLore) anomalies.push({ id: e.id, type: 'missing-lore-html' });
  if (e.loreCatalogSections.length === 0 && e.fileChecks.hasLoreCatalogEntry) {
    anomalies.push({ id: e.id, type: 'empty-lore-catalog-entry' });
  }
  // Sections in HTML not in lore catalog

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
