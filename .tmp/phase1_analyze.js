const fs = require('fs');
const { LEXICON } = require('../type/js/lexicon.js');
const loreCatalog = JSON.parse(fs.readFileSync('../scripts/lore-catalog.json', 'utf8'));

const batchStr = '10:mot,aseratu,leviathan,njordr,ankh,isis,sekhmet,bastet,wadjet,nht,moses';
const [batchNumStr, idsStr] = batchStr.split(':');
const batchNumber = parseInt(batchNumStr, 10);
const ids = idsStr.split(',');

const lexMap = new Map(LEXICON.map((e) => [e.id, e]));

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function wordCount(html) {
  const text = stripTags(html);
  const m = text.match(/\S+/g);
  return m ? m.length : 0;
}
function decodeEntities(str) {
  return str
    .replace(/&\w+;/g, (m) => {
      switch (m) {
        case '&amp;':
          return '&';
        case '&lt;':
          return '<';
        case '&gt;':
          return '>';
        case '&quot;':
          return '"';
        case '&apos;':
          return "'";
        case '&nbsp;':
          return ' ';
        case '&mdash;':
          return '—';
        case '&ndash;':
          return '–';
        case '&hellip;':
          return '…';
        default:
          return m;
      }
    })
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}
function extractSections(html) {
  const sections = [];
  const sectionRe = /<section\b[^>]*?\bid="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const id = m[1];
    const start = m.index;
    const nextSection = html.indexOf('<section', start + 1);
    const slice = nextSection === -1 ? html.slice(start) : html.slice(start, nextSection);
    let heading = '';
    const h2Match = slice.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2Match) heading = decodeEntities(stripTags(h2Match[1]));
    else {
      const h1Match = slice.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match) heading = decodeEntities(stripTags(h1Match[1]));
    }
    sections.push({ id, heading });
  }
  return sections;
}
function detectMedia(html) {
  const types = [];
  if (/<img\b/i.test(html)) types.push('image');
  if (/<canvas\b/i.test(html)) types.push('canvas');
  if (/<audio\b/i.test(html)) types.push('audio');
  if (/<video\b/i.test(html)) types.push('video');
  if (/<iframe\b/i.test(html) || /class="[^"]*\bmap\b/i.test(html)) types.push('map');
  return types;
}
function classifySource(s) {
  const str = s.trim();
  if (/^KTU\s+\d/i.test(str) || /^KTU\s*\(/i.test(str)) return 'KTU reference';
  if (
    /Hebrew Bible|Exodus|Numbers|Deuteronomy|Genesis|Leviticus|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation/i.test(
      str
    )
  )
    return 'Bible verse';
  if (/\d+\s*:\s*\d+/.test(str)) return 'Bible verse';
  if (/s\.\s*v\./i.test(str)) return 'Dictionary entry';
  if (/^[A-Z][a-z]+,\s*[^,]+\(\d{4}\)/.test(str) || (/^[A-Z][a-z]+,\s*[A-Z]/.test(str) && /\d{4}/.test(str)))
    return 'Author-Year';
  if (/^[A-Z][a-z]+,\s*[A-Z]/.test(str) && !/\d/.test(str)) return 'Author-Year';
  if (/^[A-Z]{2,}$/.test(str.replace(/\s*\([^)]*\)/, ''))) return 'Short name';
  if (/^(HALOT|TDOT|CIS|KTU|LSJ|CIG|IG|CIL|OLD|CAD|AHw)/i.test(str)) return 'Short name';
  return 'Full title';
}

const scriptTerms = [
  ['ugaritic', 'Ugaritic'],
  ['phoenician', 'Phoenician'],
  ['hebrew', 'Hebrew'],
  ['masoretic', 'Hebrew'],
  ['aramaic', 'Aramaic'],
  ['syriac', 'Syriac'],
  ['akkadian', 'Akkadian'],
  ['sumerian', 'Sumerian'],
  ['cuneiform', 'Cuneiform'],
  ['hittite', 'Hittite'],
  ['egyptian', 'Egyptian hieroglyphs'],
  ['hieroglyph', 'Egyptian hieroglyphs'],
  ['demotic', 'Demotic'],
  ['coptic', 'Coptic'],
  ['greek', 'Greek'],
  ['latin', 'Latin'],
  ['old norse', 'Old Norse'],
  ['younger futhark', 'Younger Futhark'],
  ['futhark', 'Runic'],
  ['runic', 'Runic'],
  ['arabic', 'Arabic'],
  ['canaanite', 'Canaanite'],
  ['punic', 'Punic'],
  ['etruscan', 'Etruscan'],
];
function unicodeBlockName(cp) {
  if (cp >= 0x10380 && cp <= 0x1039f) return 'Ugaritic';
  if (cp >= 0x10900 && cp <= 0x1091f) return 'Phoenician';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'Hebrew';
  if (cp >= 0x13000 && cp <= 0x1342f) return 'Egyptian hieroglyphs';
  if (cp >= 0x2c80 && cp <= 0x2cff) return 'Coptic';
  if ((cp >= 0x0370 && cp <= 0x03ff) || (cp >= 0x1f00 && cp <= 0x1fff)) return 'Greek';
  if (cp >= 0x16a0 && cp <= 0x16ff) return 'Runic';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x12000 && cp <= 0x123ff) return 'Cuneiform';
  if (cp >= 0x12400 && cp <= 0x1247f) return 'Cuneiform';
  if (cp >= 0x0000 && cp <= 0x024f) return 'Latin';
  return null;
}
function detectScripts(text) {
  const set = new Set();
  const lower = text.toLowerCase();
  for (const [term, name] of scriptTerms) {
    if (lower.includes(term)) set.add(name);
  }
  for (const ch of text) {
    const block = unicodeBlockName(ch.codePointAt(0));
    if (block) set.add(block);
  }
  return Array.from(set).sort();
}

function loreText(lc) {
  const parts = [];
  for (const key of Object.keys(lc)) {
    const val = lc[key];
    if (typeof val === 'string') parts.push(val);
    else if (key === 'sources' && Array.isArray(val))
      parts.push(val.map((s) => (typeof s === 'string' ? s : s.name)).join(' '));
    else parts.push(JSON.stringify(val));
  }
  return parts.join(' ');
}

const entries = [];
const aggregate = {
  loreCatalogSectionsUnion: new Set(),
  htmlSectionIdsUnion: new Set(),
  perPantheonSectionFrequency: {},
  anomalies: [],
};

for (const id of ids) {
  const lex = lexMap.get(id) || null;
  const lc = loreCatalog[id] || null;
  const lorePath = `../sites/${id}/lore/index.html`;
  const extPath = `../sites/${id}/lore/extended/index.html`;
  const hasLoreHtml = fs.existsSync(lorePath);
  const hasExtendedHtml = fs.existsSync(extPath);
  const loreHtml = hasLoreHtml ? fs.readFileSync(lorePath, 'utf8') : '';
  const extHtml = hasExtendedHtml ? fs.readFileSync(extPath, 'utf8') : '';

  const loreCatalogSections = lc ? Object.keys(lc) : [];
  const htmlLoreSections = hasLoreHtml ? extractSections(loreHtml) : [];
  const htmlExtendedSections = hasExtendedHtml ? extractSections(extHtml) : null;

  const originalScriptNotePresent = !!(lc && lc.originalScriptNote);
  const textForScripts = lc ? loreText(lc) : '';
  const scriptsMentioned = detectScripts(textForScripts + ' ' + (loreHtml ? stripTags(loreHtml).slice(0, 20000) : ''));

  const sourceStyles = new Set();
  if (lc && Array.isArray(lc.sources)) {
    for (const s of lc.sources) {
      const str = typeof s === 'string' ? s : s.name || '';
      sourceStyles.add(classifySource(str));
    }
  }
  const provSourcesMatch = loreHtml.match(/provenance-sources[^>]*>([\s\S]*?)<\/ul>/i);
  if (provSourcesMatch) {
    const items = provSourcesMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of items) {
      const str = decodeEntities(stripTags(li));
      if (str) sourceStyles.add(classifySource(str));
    }
  }

  const mediaTypes = detectMedia(loreHtml);
  const wc = wordCount(loreHtml);

  for (const s of loreCatalogSections) aggregate.loreCatalogSectionsUnion.add(s);
  for (const sec of htmlLoreSections) aggregate.htmlSectionIdsUnion.add(sec.id);
  const pantheon = lex ? lex.pantheon : lc ? lc.pantheon : 'unknown';
  if (!aggregate.perPantheonSectionFrequency[pantheon]) aggregate.perPantheonSectionFrequency[pantheon] = {};
  const freq = aggregate.perPantheonSectionFrequency[pantheon];
  for (const sec of htmlLoreSections) {
    freq[sec.id] = (freq[sec.id] || 0) + 1;
  }

  if (!lc) aggregate.anomalies.push({ id, type: 'missing lore-catalog entry' });
  if (!hasLoreHtml) aggregate.anomalies.push({ id, type: 'missing lore/index.html' });
  if (lc) {
    const htmlIds = htmlLoreSections.map((s) => s.id);
    const missing = loreCatalogSections.filter((k) => !htmlIds.includes(k));
    const unexpected = htmlIds.filter((k) => !loreCatalogSections.includes(k));
    if (missing.length)
      aggregate.anomalies.push({ id, type: 'lore-catalog sections not rendered in HTML', sections: missing });
    if (unexpected.length)
      aggregate.anomalies.push({ id, type: 'HTML sections not in lore-catalog', sections: unexpected });
  }
  if (!hasExtendedHtml) aggregate.anomalies.push({ id, type: 'missing extended page' });

  entries.push({
    id,
    name: lex ? lex.name || lex.unicode : null,
    pantheon,
    tier: lex ? lex.tier : null,
    loreCatalogSections,
    htmlLoreSections,
    htmlExtendedSections,
    originalScriptNotePresent,
    scriptsMentioned,
    sourceStyles: Array.from(sourceStyles).sort(),
    mediaTypes,
    hasExtendedPage: hasExtendedHtml,
    approximateWordCount: wc,
    lexiconDetails: {
      unicode: lex ? lex.unicode : null,
      ascii: lex ? lex.ascii : null,
      variantsCount: lex ? (lex.variants ? lex.variants.length : 0) : null,
      hasEtymology: !!(lex && lex.etymology),
      hasSourceCatalog: !!(lex && lex.sourceCatalog),
      originalScriptInfo: !!(lex && lex.originalScript),
    },
  });
}

const output = {
  batchNumber,
  idsAnalyzed: ids,
  entries,
  aggregate: {
    loreCatalogSectionsUnion: Array.from(aggregate.loreCatalogSectionsUnion).sort(),
    htmlSectionIdsUnion: Array.from(aggregate.htmlSectionIdsUnion).sort(),
    perPantheonSectionFrequency: aggregate.perPantheonSectionFrequency,
    anomalies: aggregate.anomalies,
  },
};

fs.writeFileSync(`batch-${batchNumber}.json`, JSON.stringify(output, null, 2));
console.log('Wrote batch-' + batchNumber + '.json');
console.log(JSON.stringify(output.aggregate, null, 2));
