const fs = require('fs');
const path = require('path');

const BATCH = '7:eros,ganesha,heka,horus,kali,prajapati,rta,vishnu,apsu,okeanos,trengtreng';

const [numStr, idsStr] = BATCH.split(':');
const batchNumber = parseInt(numStr, 10);
const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);

const loreCatalog = JSON.parse(fs.readFileSync('scripts/lore-catalog.json', 'utf8'));
const lexCode = fs.readFileSync('type/js/lexicon.js', 'utf8');
const lexFn = new Function(lexCode + '; return LEXICON;');
const lex = lexFn();

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseSections(html) {
  const sections = [];
  const re = /<section\b[^>]*?id="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const content = m[2];
    const h2m = content.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const heading = h2m ? stripTags(h2m[1]) : '';
    sections.push({ id, heading });
  }
  return sections;
}

function detectMediaTypes(html) {
  const types = [];
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<img\b/i.test(html)) types.push('image');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<iframe[^>]*(?:maps?|google)\b[^>]*>/i.test(html)) types.push('map');
  return [...new Set(types)];
}

function wordCount(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const text = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html);
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

const SCRIPT_LIST = [
  'Greek','Latin','Cyrillic','Hebrew','Arabic','Sanskrit','Devanagari','Cuneiform',
  'Akkadian','Sumerian','Babylonian','Assyrian','Ugaritic','Phoenician','Egyptian',
  'Hieroglyphic','Hieroglyphs','Hittite','Luwian','Old Norse','Norse','Runic','Runes',
  'Celtic','Gaulish','Ogham','Japanese','Chinese','Korean','Avestan','Pahlavi',
  'Old Persian','Vedic','Prakrit','Pali','Tamil','Hindi','Bengali','Gurmukhi',
  'Gujarati','Odia','Tibetan','Mongolian','Georgian','Armenian','Syriac','Ethiopic',
  'Thai','Khmer','Lao','Burmese','Javanese','Balinese','Buginese','Tagalog','Baybayin',
  'Old Italic','Etruscan','Oscan','Umbrian','Gothic','Old Church Slavonic','Glagolitic',
  'Coptic','Meroitic','Old South Arabian','Sabaean','Nabataean','Palmyrene','Hatraean',
  'Mandaic','Parthian','Sogdian','Brahmi','Kharoshthi','Tocharian','Anatolian','Lycian',
  'Lydian','Carian','Sidetic','Pisidian','Lycaonian','Isaurian','Phrygian','Mysian',
  'Paeonian','Dacian','Illyrian','Messapic','Venetic','Lepontic','Rhaetic','Camunic',
  'Sicel','Elymian','Sicanian','Volscian','Marrucinian','Paelignian','Marsian','Vestinian',
  'Sabine','Aeolic','Doric','Attic','Ionic','Arcadian','Cypriot','Pamphylian','Cappadocian',
  'Pontic','Bithynian'
];

function detectScripts(text) {
  const found = [];
  for (const s of SCRIPT_LIST) {
    const re = new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(text)) found.push(s);
  }
  return [...new Set(found)].sort();
}

function detectSourceStyles(text) {
  const styles = [];
  if (/\bKTU\s+[\d.]+/i.test(text)) styles.push('KTU reference');
  const bible = /\b(?:Gen|Exod|Lev|Num|Deut|Josh|Judg|Ruth|1\s*Sam|2\s*Sam|1\s*Kgs|2\s*Kgs|1\s*Chr|2\s*Chr|Ezra|Neh|Esth|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|1\s*Cor|2\s*Cor|Gal|Eph|Phil|Col|1\s*Thess|2\s*Thess|1\s*Tim|2\s*Tim|Titus|Phlm|Heb|Jas|1\s*Pet|2\s*Pet|1\s*John|2\s*John|3\s*John|Jude|Rev)\s*\d+[:.]\d+/i;
  if (bible.test(text)) styles.push('Bible verse');
  if (/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*\(\d{4}\)/.test(text)) styles.push('Author-Year');
  if (/\b[A-Z]{2,6}\b/.test(text)) styles.push('Short name');
  return [...new Set(styles)];
}

function collectStrings(obj) {
  const parts = [];
  if (obj === null || obj === undefined) return parts;
  if (typeof obj === 'string') { parts.push(obj); return parts; }
  if (Array.isArray(obj)) { for (const v of obj) parts.push(...collectStrings(v)); return parts; }
  if (typeof obj === 'object') { for (const v of Object.values(obj)) parts.push(...collectStrings(v)); return parts; }
  return parts;
}

const entries = [];
const anomalies = [];
const allLoreSections = new Set();
const allHtmlSectionIds = new Set();
const perPantheonLoreFreq = {};
const perPantheonHtmlFreq = {};

for (const id of ids) {
  const lexEntry = lex.find(e => e.id === id);
  const loreEntry = loreCatalog[id];

  if (!lexEntry) anomalies.push({ id, type: 'missing lexicon entry' });
  if (!loreEntry) anomalies.push({ id, type: 'missing lore-catalog entry' });

  const loreCatalogSections = loreEntry ? Object.keys(loreEntry) : [];
  loreCatalogSections.forEach(k => allLoreSections.add(k));

  const lorePath = `sites/${id}/lore/index.html`;
  let loreHtml = null;
  let htmlLoreSections = [];
  let loreMedia = [];
  let loreWordCount = 0;
  let hasLoreFile = false;
  try {
    loreHtml = fs.readFileSync(lorePath, 'utf8');
    hasLoreFile = true;
    htmlLoreSections = parseSections(loreHtml);
    htmlLoreSections.forEach(s => allHtmlSectionIds.add(s.id));
    loreMedia = detectMediaTypes(loreHtml);
    loreWordCount = wordCount(loreHtml);
  } catch (e) {
    anomalies.push({ id, type: 'missing lore HTML', path: lorePath, error: e.message });
  }

  const extPath = `sites/${id}/lore/extended/index.html`;
  let extHtml = null;
  let htmlExtendedSections = null;
  let hasExtendedPage = false;
  try {
    extHtml = fs.readFileSync(extPath, 'utf8');
    hasExtendedPage = true;
    htmlExtendedSections = parseSections(extHtml);
  } catch (e) {
    // expected if absent
  }

  const catalogText = loreEntry ? collectStrings(loreEntry).join(' ') : '';
  const htmlText = loreHtml ? stripTags(loreHtml) : '';
  const extText = extHtml ? stripTags(extHtml) : '';
  const combinedText = [catalogText, htmlText, extText].join(' ');

  const originalScriptNotePresent = Boolean(
    (loreEntry && loreEntry.originalScriptNote) ||
    (loreHtml && /<section\b[^>]*?id="original-script-provenance"[^>]*>[\s\S]*?<h2/i.test(loreHtml))
  );

  const scriptsMentioned = detectScripts(combinedText);
  const sourceStyles = detectSourceStyles(combinedText);
  const mediaTypes = [...new Set([...loreMedia, ...(extHtml ? detectMediaTypes(extHtml) : [])])];

  const htmlSectionIds = htmlLoreSections.map(s => s.id);
  const htmlOnlySectionIds = htmlSectionIds.filter(sid => !loreCatalogSections.includes(sid));
  const loreOnlySectionKeys = loreCatalogSections.filter(k => !htmlSectionIds.includes(k));

  const entry = {
    id,
    name: lexEntry ? (lexEntry.unicode || lexEntry.ascii || id) : id,
    pantheon: lexEntry ? lexEntry.pantheon : null,
    tier: lexEntry ? lexEntry.tier : null,
    variantsCount: lexEntry && Array.isArray(lexEntry.variants) ? lexEntry.variants.length : 0,
    hasEtymology: lexEntry ? Boolean(lexEntry.etymology && Object.keys(lexEntry.etymology).length > 0) : false,
    hasSourceCatalog: lexEntry ? Boolean(lexEntry.sourceCatalog && Object.keys(lexEntry.sourceCatalog).length > 0) : false,
    originalScript: lexEntry ? (lexEntry.originalScript || null) : null,
    loreCatalogSections,
    htmlLoreSections,
    htmlOnlySectionIds,
    loreOnlySectionKeys,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage,
    approximateWordCount: loreWordCount
  };
  entries.push(entry);

  const pantheon = lexEntry ? lexEntry.pantheon : 'unknown';
  if (!perPantheonLoreFreq[pantheon]) perPantheonLoreFreq[pantheon] = {};
  if (!perPantheonHtmlFreq[pantheon]) perPantheonHtmlFreq[pantheon] = {};
  for (const k of loreCatalogSections) {
    perPantheonLoreFreq[pantheon][k] = (perPantheonLoreFreq[pantheon][k] || 0) + 1;
  }
  for (const s of htmlLoreSections) {
    perPantheonHtmlFreq[pantheon][s.id] = (perPantheonHtmlFreq[pantheon][s.id] || 0) + 1;
  }
}

const loreKeysArr = [...allLoreSections].sort();
const htmlIdsArr = [...allHtmlSectionIds].sort();
const htmlOnlySectionIdsUnion = htmlIdsArr.filter(id => !loreKeysArr.includes(id));
const loreOnlySectionKeysUnion = loreKeysArr.filter(k => !htmlIdsArr.includes(k));

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate: {
    totalAnalyzed: entries.length,
    loreCatalogSectionKeysUnion: loreKeysArr,
    htmlSectionIdsUnion: htmlIdsArr,
    htmlOnlySectionIdsUnion,
    loreOnlySectionKeysUnion,
    perPantheonLoreSectionFrequencies: perPantheonLoreFreq,
    perPantheonHtmlSectionFrequencies: perPantheonHtmlFreq,
    anomalies
  }
};

const outPath = `.tmp/scholars/phase1/batch-${batchNumber}.json`;
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
