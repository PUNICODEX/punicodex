const fs = require('fs');
const path = require('path');

const batchInput = '8:varuna,ka,asa,vac,anu,hen,om,ahuramazda,lakshmi,nikko,nirmata';
const [batchNumStr, idsStr] = batchInput.split(':');
const batchNumber = parseInt(batchNumStr, 10);
const ids = idsStr.split(',').map(s => s.trim());

const loreCatalog = require(path.resolve('scripts/lore-catalog.json'));
const lexiconModule = require(path.resolve('type/js/lexicon.js'));
const LEXICON = Array.isArray(lexiconModule) ? lexiconModule : (lexiconModule.LEXICON || []);

function extractSections(html) {
  const sections = [];
  const sectionRe = /<section\b([^>]*)>/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const start = m.index;
    const tagEnd = start + m[0].length;
    const attrs = m[1];
    const idMatch = /\bid=["']([^"']+)["']/.exec(attrs);
    const id = idMatch ? idMatch[1] : null;
    const nextSection = html.indexOf('<section', tagEnd);
    const sliceEnd = nextSection === -1 ? html.length : nextSection;
    const slice = html.slice(tagEnd, sliceEnd);
    const h2Match = /<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(slice);
    let heading = null;
    if (h2Match) {
      heading = h2Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    sections.push({ id, heading });
  }
  return sections;
}

function approximateWordCount(html) {
  const text = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(/\s+/).filter(w => /[a-zA-Z0-9\u0080-\uFFFF]/.test(w)).length;
}

function detectMediaTypes(html) {
  const types = [];
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<img\b/i.test(html)) types.push('image');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<iframe\b[^>]*(?:youtube|vimeo)/i.test(html)) types.push('video');
  if (/<iframe\b[^>]*(?:google\.com\/maps|openstreetmap|leaflet)/i.test(html) || /id=["']map["']/i.test(html) || /class=["'][^"']*map[^"']*["']/i.test(html)) types.push('map');
  return [...new Set(types)];
}

const scriptNames = [
  'Ugaritic','Phoenician','Hebrew','Arabic','Greek','Latin','Cuneiform','Sumerian',
  'Akkadian','Hittite','Egyptian','Hieroglyphic','Coptic','Sanskrit','Devanagari',
  'Old Norse','Runes','Runic','Cyrillic','Chinese','Japanese','Korean','Canaanite',
  'Mesopotamian','Persian','Old Persian','Aramaic','Syriac','Ethiopic','Geʿez',
  'Minoan','Linear B','Mycenaean','Etruscan','Oscan','Italic','Gothic','Old Church Slavonic',
  'Avestan','Zoroastrian','Vedic','Pali','Prakrit','Buddhist','Hindu','Shinto','Punic'
];

function detectScripts(text) {
  const found = [];
  for (const name of scriptNames) {
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(text)) found.push(name);
  }
  return [...new Set(found)].sort();
}

function collectStrings(obj) {
  const out = [];
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach(v => out.push(...collectStrings(v)));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => out.push(...collectStrings(v)));
  return out;
}

function detectSourceStyles(entry, html) {
  const styles = [];
  const corpus = [...collectStrings(entry), html].join(' ');
  if (/\bKTU\s+[\d\.]+/i.test(corpus)) styles.push('KTU reference');
  if (/\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1?\s*Samuel|2?\s*Samuel|1?\s*Kings|2?\s*Kings|1?\s*Chronicles|2?\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1?\s*Corinthians|2?\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1?\s*Thessalonians|2?\s*Thessalonians|1?\s*Timothy|2?\s*Timothy|Titus|Philemon|Hebrews|James|1?\s*Peter|2?\s*Peter|1?\s*John|2?\s*John|3?\s*John|Jude|Revelation)\s+\d+\s*:\s*\d+\b/i.test(corpus)) {
    styles.push('Bible verse');
  }
  if (/\b[A-Z][a-zA-Z\-]+(?:\s+(?:and|&)\s+[A-Z][a-zA-Z\-]+)?\s*\(\d{4}[a-z]?\)/.test(corpus)) styles.push('Author-Year');
  if (/\b[A-Z][a-zA-Z\-]+,\s*[A-Z][^,(]+\([^)]*\d{4}[a-z]?\)/.test(corpus)) styles.push('Author-Year');
  if (/\b(?:LSJ|Beekes|CAD|AHw|ETCSL|KTU|CIS|KAI|COS|Faulkner|Pape-Benseler|Pausanias|Hesiod|Apollodorus|Monier-Williams|Mayrhofer|Macdonell|EWAia|Śatapatha Brāhmaṇa|Ṛgveda|Avesta|Yasna|Gāθā|Vendidad|Vīdēvdād)\b/.test(corpus)) styles.push('Short name');
  if (/\b(?:RV|Ṛg[- ]?Veda|AV|YV|SV)\s+\d+[\.,]\d+/i.test(corpus)) styles.push('Vedic reference');
  if (/\b(?:Y\.\s*\d+\.\d+|Yasna|Vendidad|Vīdēvdād|Gāθā)\b/i.test(corpus)) styles.push('Avestan reference');
  return [...new Set(styles)].sort();
}

const entries = [];
const aggregate = {
  loreCatalogSectionKeys: new Set(),
  htmlSectionIds: new Set(),
  perPantheonSectionFrequency: {},
  anomalies: []
};

for (const id of ids) {
  const lore = loreCatalog[id] || null;
  const lexEntry = LEXICON.find(e => e.id === id) || null;
  const lorePath = `sites/${id}/lore/index.html`;
  const extendedPath = `sites/${id}/lore/extended/index.html`;

  const loreExists = fs.existsSync(lorePath);
  const extendedExists = fs.existsSync(extendedPath);

  let htmlLoreSections = null;
  let htmlExtendedSections = null;
  let mediaTypes = [];
  let wordCount = 0;
  let provenanceText = '';

  let loreHtml = '';
  let extendedHtml = '';

  if (loreExists) {
    loreHtml = fs.readFileSync(lorePath, 'utf8');
    htmlLoreSections = extractSections(loreHtml);
    htmlLoreSections.forEach(s => { if (s.id) aggregate.htmlSectionIds.add(s.id); });
    mediaTypes = detectMediaTypes(loreHtml);
    wordCount = approximateWordCount(loreHtml);
    const provStart = loreHtml.indexOf('id="provenance"');
    if (provStart !== -1) {
      const start = loreHtml.lastIndexOf('<section', provStart);
      const end = loreHtml.indexOf('</section>', provStart);
      if (start !== -1 && end !== -1) {
        provenanceText = loreHtml.slice(start, end + 10).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  } else {
    aggregate.anomalies.push({ id, type: 'missing lore HTML', path: lorePath });
  }

  if (extendedExists) {
    extendedHtml = fs.readFileSync(extendedPath, 'utf8');
    htmlExtendedSections = extractSections(extendedHtml);
    htmlExtendedSections.forEach(s => { if (s.id) aggregate.htmlSectionIds.add(s.id); });
    mediaTypes = [...new Set([...mediaTypes, ...detectMediaTypes(extendedHtml)])];
  }

  const loreCatalogSections = lore ? Object.keys(lore) : [];
  loreCatalogSections.forEach(k => aggregate.loreCatalogSectionKeys.add(k));

  const originalScriptNotePresent = lore ? !!lore.originalScriptNote : false;

  let scriptsMentioned = [];
  if (lore && lore.originalScriptNote) {
    scriptsMentioned = detectScripts(JSON.stringify(lore.originalScriptNote));
  }
  if (provenanceText) {
    scriptsMentioned = [...new Set([...scriptsMentioned, ...detectScripts(provenanceText)])];
  }
  if (lore) {
    scriptsMentioned = [...new Set([...scriptsMentioned, ...detectScripts(collectStrings(lore).join(' '))])];
  }
  scriptsMentioned.sort();

  const sourceStyles = lore && loreExists ? detectSourceStyles(lore, fs.readFileSync(lorePath, 'utf8')) : [];

  if (lore && htmlLoreSections) {
    const htmlIds = new Set(htmlLoreSections.map(s => s.id).filter(Boolean));
    const expectedMap = {
      pronunciation: 'pronunciation',
      domains: null,
      symbols: 'symbols',
      mythology: 'mythology',
      syncretism: null,
      culturalLegacy: null,
      extendedMeditation: null,
      originalScriptNote: 'provenance',
      sources: null,
      archaeology: null
    };
    for (const key of loreCatalogSections) {
      if (expectedMap[key] && !htmlIds.has(expectedMap[key])) {
        aggregate.anomalies.push({ id, type: 'lore-catalog section not rendered', section: key, expectedId: expectedMap[key] });
      }
    }
  }

  if (htmlLoreSections && htmlLoreSections.some(s => s.id === 'provenance') && !originalScriptNotePresent) {
    aggregate.anomalies.push({ id, type: 'HTML provenance section without lore-catalog originalScriptNote' });
  }

  if (!lore) {
    aggregate.anomalies.push({ id, type: 'missing lore-catalog entry' });
  }

  const pantheon = lexEntry ? lexEntry.pantheon : 'unknown';
  if (!aggregate.perPantheonSectionFrequency[pantheon]) aggregate.perPantheonSectionFrequency[pantheon] = {};
  const freq = aggregate.perPantheonSectionFrequency[pantheon];
  if (htmlLoreSections) {
    for (const s of htmlLoreSections) {
      if (!s.id) continue;
      freq[s.id] = (freq[s.id] || 0) + 1;
    }
  }
  if (htmlExtendedSections) {
    for (const s of htmlExtendedSections) {
      if (!s.id) continue;
      freq[s.id] = (freq[s.id] || 0) + 1;
    }
  }

  const entry = {
    id,
    name: lexEntry ? lexEntry.unicode : null,
    pantheon,
    tier: lexEntry ? (lexEntry.tierLabel || lexEntry.tier) : null,
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage: extendedExists,
    approximateWordCount: wordCount,
    lexicon: {
      variantsCount: lexEntry ? (lexEntry.variants || []).length : null,
      hasEtymology: lexEntry ? !!lexEntry.etymology : null,
      hasSourceCatalog: lexEntry ? !!(lexEntry.sourceCatalog && lexEntry.sourceCatalog.length > 0) : null,
      originalScript: lexEntry ? lexEntry.originalScript || null : null
    }
  };
  entries.push(entry);
}

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate: {
    loreCatalogSectionKeys: [...aggregate.loreCatalogSectionKeys].sort(),
    htmlSectionIds: [...aggregate.htmlSectionIds].sort(),
    perPantheonSectionFrequency: aggregate.perPantheonSectionFrequency,
    anomalies: aggregate.anomalies
  }
};

const outDir = '.tmp/scholars/phase1';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `batch-${batchNumber}.json`), JSON.stringify(output, null, 2));
console.log('Wrote', path.join(outDir, `batch-${batchNumber}.json`));
