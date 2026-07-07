const fs = require('fs');
const path = require('path');

const BATCH_STR = '4:medousa,midgardr,muspellheimr,maat,maa,odinn,olympos,pontos,ragnarok,ra,sia';
const [batchNumStr, idsStr] = BATCH_STR.split(':');
const batchNumber = Number(batchNumStr);
const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);

const loreCatalog = JSON.parse(fs.readFileSync('scripts/lore-catalog.json', 'utf8'));
const { LEXICON } = require(path.resolve('type/js/lexicon.js'));

const SCRIPT_NAMES = [
  'Egyptian','Hieroglyphic','Hieroglyphs','Coptic','Ugaritic','Cuneiform','Akkadian',
  'Phoenician','Hebrew','Arabic','Greek','Latin','Linear B','Cypriot','Old Norse',
  'Younger Futhark','Elder Futhark','Runic','Runes','Norse','Nordic','Devanagari',
  'Sanskrit','Persian','Demotic'
];

function stripTags(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/&#\d+;/g, ' ');
}

function countWords(html) {
  const text = stripTags(html);
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function extractSections(html) {
  const sections = [];
  const sectionRe = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const attr = m[1] || '';
    const body = m[2];
    const idMatch = attr.match(/id=["']([^"']+)["']/);
    const id = idMatch ? idMatch[1] : null;
    const h2Match = body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    let heading = '';
    if (h2Match) {
      heading = stripTags(h2Match[1]).replace(/\s+/g, ' ').trim();
    }
    sections.push({ id, heading });
  }
  return sections;
}

function detectMediaTypes(html) {
  const types = [];
  if (/<img\b/i.test(html)) types.push('image');
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<iframe\b/i.test(html)) types.push('map'); // used for maps in this project
  return types;
}

function detectScripts(text) {
  const found = new Set();
  for (const name of SCRIPT_NAMES) {
    const re = new RegExp('\\b' + name.replace(/\s+/g, '\\s+') + '\\b', 'i');
    if (re.test(text)) found.add(name);
  }
  return Array.from(found).sort();
}

function detectSourceStyles(text) {
  const styles = new Set();
  if (/\bKTU\s+\d/i.test(text)) styles.add('KTU reference');
  if (/\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s+of\s+Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s*Corinthians|2\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s*Thessalonians|2\s*Thessalonians|1\s*Timothy|2\s*Timothy|Titus|Philemon|Hebrews|James|1\s*Peter|2\s*Peter|1\s*John|2\s*John|3\s*John|Jude|Revelation)\s+\d+(:\d+)?\b/i.test(text)) {
    styles.add('Bible verse');
  }
  if (/\b[A-Z][a-zA-Z]+\s+\d{4}\b/.test(text)) styles.add('Author-Year');
  if (/\b(LSJ|Pape-Benseler|Beekes|Faulkner|ONP|Skaldic|Poetic\s+Edda|Prose\s+Edda|Hávamál|Völuspá|Gylfaginning|Snorri|CIG|IG|CID|CEG|SEG|IG\s+Bulg|CIL|RIG|Rundata)\b/i.test(text)) {
    styles.add('Short name');
  }
  return Array.from(styles).sort();
}

const entries = [];
const aggregate = {
  loreCatalogSectionKeysUnion: new Set(),
  htmlSectionIdsUnion: new Set(),
  perPantheonSectionFrequency: {},
  anomalies: []
};

for (const id of ids) {
  const loreEntry = loreCatalog[id];
  const lexEntry = LEXICON.find(e => e.id === id);
  const loreHtmlPath = `sites/${id}/lore/index.html`;
  const extendedHtmlPath = `sites/${id}/lore/extended/index.html`;

  const loreHtmlExists = fs.existsSync(loreHtmlPath);
  const extendedHtmlExists = fs.existsSync(extendedHtmlPath);

  const loreHtml = loreHtmlExists ? fs.readFileSync(loreHtmlPath, 'utf8') : '';
  const extendedHtml = extendedHtmlExists ? fs.readFileSync(extendedHtmlPath, 'utf8') : '';

  const loreCatalogSections = loreEntry ? Object.keys(loreEntry) : [];
  const htmlLoreSections = extractSections(loreHtml);
  const htmlExtendedSections = extendedHtmlExists ? extractSections(extendedHtml) : null;

  const scanText = [
    loreEntry ? JSON.stringify(loreEntry) : '',
    loreHtml,
    extendedHtml,
    lexEntry ? JSON.stringify({ etymology: lexEntry.etymology, meaning: lexEntry.meaning, variants: lexEntry.variants }) : ''
  ].join('\n');

  const scriptsMentioned = detectScripts(scanText);
  const sourceStyles = detectSourceStyles(scanText);
  const mediaTypes = detectMediaTypes(loreHtml);
  if (extendedHtmlExists) {
    detectMediaTypes(extendedHtml).forEach(t => { if (!mediaTypes.includes(t)) mediaTypes.push(t); });
  }
  mediaTypes.sort();

  const approximateWordCount = countWords(loreHtml) + (extendedHtmlExists ? countWords(extendedHtml) : 0);

  const originalScriptNotePresent = loreCatalogSections.includes('originalScriptNote') ||
    htmlLoreSections.some(s => s.id === 'original-script-provenance');

  const entryAnomalies = [];
  if (!loreEntry) entryAnomalies.push(`Missing lore-catalog.json entry for ${id}`);
  if (!loreHtmlExists) entryAnomalies.push(`Missing sites/${id}/lore/index.html`);
  if (!extendedHtmlExists) entryAnomalies.push(`Missing extended lore page for ${id}`);

  const catalogSectionsNotInHtml = loreCatalogSections.filter(k => {
    if (k === 'originalScriptNote') return false; // handled separately
    return !htmlLoreSections.some(s => s.id && s.id.toLowerCase().includes(k.toLowerCase()));
  });
  if (catalogSectionsNotInHtml.length) {
    entryAnomalies.push(`Catalog sections not rendered in HTML: ${catalogSectionsNotInHtml.join(', ')}`);
  }

  const expectedFrameworkIds = new Set(['hero','the-name','original-script-provenance','related','extended-lore-cta']);
  const htmlSectionsNotInCatalog = htmlLoreSections
    .filter(s => s.id && !loreCatalogSections.includes(s.id) && !expectedFrameworkIds.has(s.id))
    .map(s => s.id);
  if (htmlSectionsNotInCatalog.length) {
    entryAnomalies.push(`HTML sections not in lore catalog: ${htmlSectionsNotInCatalog.join(', ')}`);
  }

  const osp = htmlLoreSections.find(s => s.id === 'original-script-provenance');
  if (osp && (!osp.heading || osp.heading.trim() === '')) {
    entryAnomalies.push('Empty original-script-provenance section in HTML');
  }

  if (entryAnomalies.length) {
    aggregate.anomalies.push({ id, issues: entryAnomalies });
  }

  // Aggregate union sets
  loreCatalogSections.forEach(k => aggregate.loreCatalogSectionKeysUnion.add(k));
  htmlLoreSections.forEach(s => { if (s.id) aggregate.htmlSectionIdsUnion.add(s.id); });

  const pantheon = lexEntry ? lexEntry.pantheon : (loreEntry ? loreEntry.pantheon : 'unknown');
  if (!aggregate.perPantheonSectionFrequency[pantheon]) aggregate.perPantheonSectionFrequency[pantheon] = {};
  const freq = aggregate.perPantheonSectionFrequency[pantheon];
  htmlLoreSections.forEach(s => {
    if (!s.id) return;
    freq[s.id] = (freq[s.id] || 0) + 1;
  });

  entries.push({
    id,
    name: lexEntry ? lexEntry.unicode : (loreEntry ? loreEntry.name : id),
    pantheon,
    tier: lexEntry ? lexEntry.tier : null,
    tierLabel: lexEntry ? lexEntry.tierLabel : null,
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage: extendedHtmlExists,
    approximateWordCount,
    lexicon: {
      variantsCount: lexEntry && Array.isArray(lexEntry.variants) ? lexEntry.variants.length : 0,
      etymologyPresent: !!(lexEntry && lexEntry.etymology),
      sourceCatalogPresent: !!(lexEntry && lexEntry.sourceCatalog),
      originalScriptInfo: lexEntry && lexEntry.originalScript ? lexEntry.originalScript : null
    }
  });
}

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate: {
    loreCatalogSectionKeysUnion: Array.from(aggregate.loreCatalogSectionKeysUnion).sort(),
    htmlSectionIdsUnion: Array.from(aggregate.htmlSectionIdsUnion).sort(),
    perPantheonSectionFrequency: aggregate.perPantheonSectionFrequency,
    anomalies: aggregate.anomalies
  }
};

const outDir = '.tmp/scholars/phase1';
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `batch-${batchNumber}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Entries: ${entries.length}`);
console.log(`Anomalies: ${aggregate.anomalies.length}`);
