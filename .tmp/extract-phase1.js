#!/usr/bin/env node
/**
 * Phase 1 archaeology extraction for one batch of flagship temples.
 */

const fs = require('fs');
const path = require('path');

const BATCH_SPEC = '9:parvati,ptah,rama,tiamat,tyr,valholl,ma,erebus,ashur,shamash,quetzalcoatl';

function parseBatch(spec) {
  const [numPart, idsPart] = spec.split(':');
  return {
    batchNumber: parseInt(numPart, 10),
    ids: idsPart.split(',').map(s => s.trim()).filter(Boolean),
  };
}

const LORE_CATALOG = require(path.resolve(__dirname, '..', 'scripts', 'lore-catalog.json'));
const { LEXICON } = require(path.resolve(__dirname, '..', 'type', 'js', 'lexicon.js'));

const ID_TO_LEXICON = new Map(LEXICON.map(e => [e.id, e]));

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/&#?\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLoreCatalogSections(entry) {
  if (!entry || typeof entry !== 'object') return [];
  return Object.keys(entry);
}

function extractHtmlSections(html) {
  if (!html) return [];
  const sections = [];
  const sectionRegex = /<section\b[^>]*?\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/section>/gi;
  let m;
  while ((m = sectionRegex.exec(html)) !== null) {
    const id = m[1];
    const body = m[2];
    const h2Match = body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    let heading = null;
    if (h2Match) {
      heading = stripTags(h2Match[1]);
    }
    sections.push({ id, heading });
  }
  return sections;
}

function approximateWordCount(html) {
  if (!html) return 0;
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/&#?\d+;/g, ' ');
  const words = body.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

function extractSectionHtml(html, sectionId) {
  if (!html) return '';
  const re = new RegExp(`<section\\b[^>]*?\\bid=["']${sectionId}["'][^>]*>([\\s\\S]*?)<\\/section>`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

const SCRIPT_KEYWORDS = [
  'Sanskrit', 'Devanagari', 'Hieroglyphic', 'Egyptian hieroglyphs', 'Cuneiform',
  'Akkadian cuneiform', 'Sumerian cuneiform', 'Old Norse', 'Younger Futhark',
  'Elder Futhark', 'Runes', 'Runic', 'Hebrew', 'Arabic', 'Persian', 'Elamite',
  'Hurrian', 'Sumerian', 'Avestan', 'Pahlavi', 'Middle Persian', 'Greek',
  'Linear B', 'Mycenaean Greek', 'Cypriot syllabary', 'Anatolian hieroglyphs',
  'Luwian', 'Hittite', 'Lycian', 'Lydian', 'Carian', 'Phoenician', 'Ugaritic',
  'Aramaic', 'Syriac', 'Geʽez', 'Ethiopic', 'Cyrillic', 'Glagolitic', 'Georgian',
  'Armenian', 'Ogham', 'Latin', 'Oscan', 'Umbrian', 'Etruscan', 'Gothic',
  'Old Italic', 'Old Persian cuneiform', 'Maya glyphs', 'Mayan', 'Nahuatl',
  'Classical Nahuatl', 'Aztec', 'Mixtec', 'Zapotec', 'Olmec', 'Egyptian',
  'Demotic', 'Coptic', 'Meroitic', 'Old Church Slavonic', 'Sogdian', 'Bactrian',
  'Kharoṣṭhī', 'Brahmi', 'Gupta', 'Tibetan', 'Bengali', 'Tamil', 'Telugu',
  'Kannada', 'Malayalam', 'Sinhala', 'Gurmukhi', 'Gujarati', 'Odia', 'Assamese',
  'Burmese', 'Khmer', 'Thai', 'Lao', 'Balinese', 'Javanese', 'Buginese',
  'Tagalog', 'Hanunoo', 'Buhid', 'Tagbanwa', 'Chinese', 'Hanzi', 'Japanese',
  'Kanji', 'Kana', 'Hiragana', 'Katakana', 'Korean', 'Hangul', 'Mongolian',
  'Manchu', 'Old Turkic', 'Old Hungarian', 'Rongorongo', 'Indus',
  'Proto-Sinaitic', 'South Arabian', 'North Arabian', 'Thamudic', 'Safaitic',
  'Dadanitic', 'Taymanitic', 'Nabataean', 'Palmyrene', 'Hatran', 'Mardanic',
  'Mandaic', 'Manichaean', 'Parthian', 'Chorasmian', 'Elymaic', 'Pahlavi',
  'Inscriptional Pahlavi', 'Psalter Pahlavi', 'Book Pahlavi',
];

const SCRIPT_BLOCK_PATTERNS = [
  ['Devanagari', /[\u0900-\u097F]/],
  ['Egyptian hieroglyphs', /[\u13000-\u1342F]/],
  ['Cuneiform', /[\u12000-\u123FF]/],
  ['Runes', /[\u16A0-\u16FF]/],
  ['Greek', /[\u0370-\u03FF]/],
  ['Hebrew', /[\u0590-\u05FF]/],
  ['Arabic', /[\u0600-\u06FF]/],
  ['Coptic', /[\u2C80-\u2CFF]/],
  ['Phoenician', /[\u10900-\u1091F]/],
  ['Ugaritic', /[\u10380-\u1039F]/],
  ['Old Persian cuneiform', /[\u103A0-\u103DF]/],
  ['Linear B', /[\u10000-\u1007F]/],
];

function findScriptsMentioned(texts) {
  const found = new Set();
  const joined = texts.filter(Boolean).join(' ');
  for (const kw of SCRIPT_KEYWORDS) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(joined)) found.add(kw);
  }
  for (const [name, re] of SCRIPT_BLOCK_PATTERNS) {
    if (re.test(joined)) found.add(name);
  }
  return Array.from(found).sort();
}

function detectSourceStyles(texts) {
  const styles = new Set();
  const joined = texts.filter(Boolean).join(' ');
  if (/\bKTU\s+\d+\.\d+/.test(joined)) styles.add('KTU reference');
  if (/\b(?:Gen|Exod|Lev|Num|Deut|Josh|Judg|Ruth|1\s*Sam|2\s*Sam|1\s*Kgs|2\s*Kgs|1\s*Chr|2\s*Chr|Ezra|Neh|Esth|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|1\s*Cor|2\s*Cor|Gal|Eph|Phil|Col|1\s*Thess|2\s*Thess|1\s*Tim|2\s*Tim|Titus|Phlm|Heb|Jas|1\s*Pet|2\s*Pet|1\s*Jn|2\s*Jn|3\s*Jn|Jude|Rev)\s*\d+[:.]\d+/i.test(joined)) {
    styles.add('Bible verse');
  }
  if (/\([A-Z][a-zA-Z]+(?:\s+(?:and|&)\s+[A-Z][a-zA-Z]+)?\s+\d{4}[a-z]?\)/.test(joined)) {
    styles.add('Author-Year');
  }
  if (/\b(?:LSJ|Beekes|Faulkner|Budge|Gardiner|OED|CDLI|Rundata|Perseus|Pape-Benseler|Liddell|Scott|Jones|CHANTRAINE|DELG|GEW|EDG|AHw|CAD|MW|KEWA|Zoëga|Cleasby-Vigfusson|Karttunen|Allen|Black-Green|Enuma Elish|Hesiod)\b/i.test(joined)) {
    styles.add('Short name');
  }
  if (/\b(?:CTA|CAT|RS\s+|Ug\.|A\.B\.|VAT|BM|K\.\d+|EA\s+\d+)/.test(joined)) styles.add('Corpus siglum');
  if (/\b(?:RV|ṚV|AV|ŚB|MBh|Rām|Up\.|TĀr|Kāv)\s*\d*[.,]?\d*/i.test(joined)) styles.add('Indic text reference');
  return Array.from(styles).sort();
}

function detectMediaTypes(html) {
  const types = new Set();
  if (!html) return [];
  if (/<canvas\b/i.test(html)) types.add('canvas');
  if (/<img\b/i.test(html) || /<picture\b/i.test(html)) types.add('image');
  if (/<video\b/i.test(html)) types.add('video');
  if (/<audio\b/i.test(html)) types.add('audio');
  if (/<iframe[^>]*(?:map|google\.com\/maps|openstreetmap)/i.test(html)) types.add('map');
  if (/<img[^>]*\bmap\b/i.test(html)) types.add('map');
  return Array.from(types).sort();
}

function extractAllTextFromLoreCatalog(entry) {
  const parts = [];
  function walk(obj) {
    if (typeof obj === 'string') parts.push(obj);
    else if (Array.isArray(obj)) obj.forEach(walk);
    else if (obj && typeof obj === 'object') Object.values(obj).forEach(walk);
  }
  walk(entry);
  return parts.join(' ');
}

function getLexiconOriginalScriptInfo(entry) {
  if (!entry) return null;
  return {
    hasOriginalScriptField: 'originalScript' in entry,
    originalScript: entry.originalScript || null,
    hasSourceCatalog: 'sourceCatalog' in entry,
    sourceCatalog: entry.sourceCatalog || null,
    variantsCount: Array.isArray(entry.variants) ? entry.variants.length : 0,
    hasEtymology: !!entry.etymology || (Array.isArray(entry.senses) && entry.senses.some(s => s && s.type === 'etymology')),
    sources: entry.sources || [],
  };
}

function analyzeFlagship(id) {
  const lexEntry = ID_TO_LEXICON.get(id);
  const loreEntry = LORE_CATALOG[id];

  const loreHtmlPath = path.resolve(__dirname, '..', 'sites', id, 'lore', 'index.html');
  const extendedHtmlPath = path.resolve(__dirname, '..', 'sites', id, 'lore', 'extended', 'index.html');

  const loreHtml = readText(loreHtmlPath);
  const extendedHtml = fileExists(extendedHtmlPath) ? readText(extendedHtmlPath) : null;

  const loreCatalogSections = extractLoreCatalogSections(loreEntry);
  const htmlLoreSections = extractHtmlSections(loreHtml);
  const htmlExtendedSections = extendedHtml ? extractHtmlSections(extendedHtml) : null;

  const originalScriptNotePresent = loreCatalogSections.includes('originalScriptNote');

  const loreCatalogText = loreEntry ? extractAllTextFromLoreCatalog(loreEntry) : '';
  const provenanceHtml = extractSectionHtml(loreHtml, 'provenance');
  const originalScriptHtml = extractSectionHtml(loreHtml, 'original-script-provenance');
  const combinedText = [loreCatalogText, provenanceHtml, originalScriptHtml].filter(Boolean);

  const scriptsMentioned = findScriptsMentioned(combinedText);
  const sourceStyles = detectSourceStyles(combinedText);
  const mediaTypes = detectMediaTypes(loreHtml);

  const hasExtendedPage = fileExists(extendedHtmlPath);
  const wordCount = approximateWordCount(loreHtml || '');

  return {
    id,
    name: lexEntry ? (lexEntry.unicode || lexEntry.ascii) : id,
    pantheon: lexEntry ? lexEntry.pantheon : null,
    tier: lexEntry ? lexEntry.tier : null,
    lexicon: getLexiconOriginalScriptInfo(lexEntry),
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles,
    mediaTypes,
    hasExtendedPage,
    approximateWordCount: wordCount,
    _meta: {
      loreHtmlExists: !!loreHtml,
      extendedHtmlExists: !!extendedHtml,
      lexiconEntryExists: !!lexEntry,
    },
  };
}

function main() {
  const { batchNumber, ids } = parseBatch(BATCH_SPEC);
  const entries = ids.map(analyzeFlagship);

  const loreCatalogSectionUnion = new Set();
  const htmlSectionIdUnion = new Set();
  const perPantheonSectionFreq = {};
  const anomalies = [];

  const structuralSectionIds = new Set(['hero', 'the-name', 'provenance', 'original-script-provenance', 'tier-classification', 'name-variations', 'related', 'extended-lore-cta', 'footer', 'gallery-footer']);

  for (const e of entries) {
    for (const s of e.loreCatalogSections) loreCatalogSectionUnion.add(s);
    for (const s of e.htmlLoreSections) {
      htmlSectionIdUnion.add(s.id);
      if (!perPantheonSectionFreq[e.pantheon]) perPantheonSectionFreq[e.pantheon] = {};
      perPantheonSectionFreq[e.pantheon][s.id] = (perPantheonSectionFreq[e.pantheon][s.id] || 0) + 1;
    }
    if (e.htmlExtendedSections) {
      for (const s of e.htmlExtendedSections) htmlSectionIdUnion.add(s.id);
    }

    if (!e._meta.lexiconEntryExists) {
      anomalies.push({ id: e.id, type: 'missing lexicon entry' });
    }
    if (!e._meta.loreHtmlExists) {
      anomalies.push({ id: e.id, type: 'missing lore HTML' });
    }

    if (e.loreCatalogSections.length === 0) {
      anomalies.push({ id: e.id, type: 'missing lore-catalog entry' });
    }

    // Lore-catalog sections not rendered in either lore or extended HTML
    const htmlIds = new Set(e.htmlLoreSections.map(s => s.id));
    const extendedIds = new Set((e.htmlExtendedSections || []).map(s => s.id));
    const allHtmlIds = new Set([...htmlIds, ...extendedIds]);
    const sectionMapping = {
      domains: 'symbols',
      culturalLegacy: 'cultural-significance',
      extendedMeditation: 'extended-lore-cta',
      archaeology: 'unicode-breakdown',
      sources: 'sources',
      originalScriptNote: ['provenance', 'original-script-provenance'],
    };
    const missingFromHtml = e.loreCatalogSections.filter(k => {
      const mapped = sectionMapping[k];
      if (allHtmlIds.has(k)) return false;
      if (Array.isArray(mapped)) return !mapped.some(id => allHtmlIds.has(id));
      if (mapped) return !allHtmlIds.has(mapped);
      return true;
    });
    if (missingFromHtml.length) {
      anomalies.push({ id: e.id, type: 'lore-catalog sections not rendered in any HTML', sections: missingFromHtml });
    }

    // Content sections in HTML not in lore-catalog (excluding structural)
    const htmlOnly = e.htmlLoreSections
      .filter(s => !e.loreCatalogSections.includes(s.id) && !structuralSectionIds.has(s.id))
      .map(s => s.id);
    if (htmlOnly.length) {
      anomalies.push({ id: e.id, type: 'HTML content sections not in lore-catalog', sections: htmlOnly });
    }

    // Missing provenance despite originalScriptNote
    if (e.originalScriptNotePresent && !htmlIds.has('provenance') && !htmlIds.has('original-script-provenance')) {
      anomalies.push({ id: e.id, type: 'originalScriptNote in catalog but no provenance section in HTML' });
    }
  }

  const output = {
    batchNumber,
    idsAnalyzed: ids,
    entries,
    aggregate: {
      loreCatalogSectionUnion: Array.from(loreCatalogSectionUnion).sort(),
      htmlSectionIdUnion: Array.from(htmlSectionIdUnion).sort(),
      perPantheonSectionFreq,
      anomalies,
    },
  };

  const outPath = path.resolve(__dirname, 'scholars', 'phase1', `batch-${batchNumber}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Wrote ${outPath}`);
}

main();
