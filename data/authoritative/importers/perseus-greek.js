/**
 * Perseus Greek importer for PuniCodex
 *
 * Uses the Perseus Digital Library morphology service and LSJ text pages to:
 *   - verify the ancient Greek form stored in each Greek entry
 *   - extract a short LSJ definition where the text page exposes it
 */

const cheerio = require('cheerio');

const MORPH_API = 'https://services.perseids.org/bsp/morphologyservice/analysis/word';
const MORPH_HTML = 'https://www.perseus.tufts.edu/hopper/morph';
const LSJ_TEXT = 'https://www.perseus.tufts.edu/hopper/text';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeGreek(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCaseOnlyChange(current, suggested) {
  return normalizeGreek(current) === normalizeGreek(suggested);
}

function makeProvenance(url) {
  return {
    source: 'perseus-greek',
    recordId: url,
    retrievedAt: new Date().toISOString(),
    url,
    license: 'CC BY-SA 3.0',
  };
}

function parseMorphJson(json) {
  const body = json?.RDF?.Annotation?.Body?.rest?.entry;
  if (!body) return null;
  const hdwd = (body.dict?.hdwd?.$ || '').replace(/\|/g, '');
  const pofs = body.dict?.pofs?.$;
  const gend = body.dict?.gend?.$;
  return { hdwd, pofs, gend };
}

async function fetchMorphJson(greek, fetchFn) {
  const url = `${MORPH_API}?lang=grc&word=${encodeURIComponent(greek)}&engine=morpheusgrc`;
  const res = await fetchFn(url, {
    headers: {
      'User-Agent': 'PUNICODEX importer (github.com/PUNICODEX/punicodex)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchLsjDoc(greek, fetchFn) {
  const url = `${MORPH_HTML}?l=${encodeURIComponent(greek)}&la=greek`;
  const res = await fetchFn(url, {
    headers: {
      'User-Agent': 'PUNICODEX importer (github.com/PUNICODEX/punicodex)',
    },
  });
  if (!res.ok) return null;
  const html = res.text;
  const $ = cheerio.load(html);
  const link = $('a')
    .filter((_, el) => $(el).text().trim() === 'LSJ')
    .first();
  const onclick = link.attr('onclick') || '';
  const m = onclick.match(/doc':'(Perseus:text:1999\.04\.0057:entry=[^']+)'/);
  return m ? m[1] : null;
}

const FOOTER_MARKERS = [
  'Dictionary Entry Lookup',
  'Use this tool to search',
  'Browse Bar',
  'show Browse Bar',
  'hide Dictionary Entry',
  'How to enter text in Greek',
];

function stripFooter(text) {
  let shortest = text.length;
  for (const marker of FOOTER_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx >= 0 && idx < shortest) shortest = idx;
  }
  return text.slice(0, shortest);
}

const GRAMMAR_LABELS = new Set([
  'dor.',
  'att.',
  'att.-ion.',
  'ion.',
  'ep.',
  'adj.',
  'patron.',
  'adv.',
  'prep.',
  'conj.',
  'interj.',
  'phrases',
  'also',
  'constr.,',
  'in',
]);

function isGrammarOnlyDefinition(text) {
  const cleaned = text
    .replace(/^[—\s]+/, '')
    .replace(/^\d+\./, '')
    .trim()
    .toLowerCase();
  if (cleaned.length < 10) return true;
  const firstWord = cleaned.split(/[\s,;:]/)[0];
  if (GRAMMAR_LABELS.has(firstWord)) return true;
  // A definition that is only citations, e.g. "Il.2.696, al."
  if (/^[ivxlcdm]+\.|^\d+\.?\s*$/.test(cleaned)) return true;
  return false;
}

async function fetchLsjDefinition(doc, fetchFn) {
  const url = `${LSJ_TEXT}?doc=${encodeURIComponent(doc)}`;
  const res = await fetchFn(url, {
    headers: {
      'User-Agent': 'PUNICODEX importer (github.com/PUNICODEX/punicodex)',
    },
  });
  if (!res.ok) return null;
  const html = res.text;
  const $ = cheerio.load(html);
  // The clean entry text is inside div.text; fall back to body text only if needed.
  let text = $('div.text').text() || $('body').text();
  text = stripFooter(text);

  // LSJ entries separate the headword from the gloss with an em-dash.
  const colonDash = text.indexOf(':—');
  const dashIdx = colonDash >= 0 ? colonDash + 1 : text.indexOf('—');
  if (dashIdx < 0) return null;

  let snippet = text.slice(dashIdx + 1);

  // Cut before the first Greek letter, quotation, or parenthetical citation.
  const cut = snippet.search(/[\u0370-\u03FF\u1F00-\u1FFF“"([]/u);
  if (cut >= 0) snippet = snippet.slice(0, cut);

  const cleaned = snippet
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[—\s]+/, '')
    .replace(/[,;:\s]+$/, '');

  if (isGrammarOnlyDefinition(cleaned)) return null;
  return cleaned;
}

module.exports = {
  name: 'Perseus Greek',
  source: 'perseus-greek',
  defaultLicense: 'CC BY-SA 3.0',
  requiresOnline: true,

  async run({ lexicon, args, fetch: fetchFn }) {
    const sample = args.sample ? Number.parseInt(args.sample, 10) : null;
    const delay = args.delay ? Number.parseInt(args.delay, 10) : 2000;
    const entries = sample
      ? lexicon.slice(0, sample).filter((e) => e.pantheon === 'greek')
      : lexicon.filter((e) => e.pantheon === 'greek');

    const suggestions = [];
    const snapshot = { processed: 0, matched: 0, definitions: 0 };

    for (const entry of entries) {
      if (!entry.greek || entry.greek === '—') continue;
      snapshot.processed += 1;

      let morph;
      try {
        await sleep(delay);
        const json = await fetchMorphJson(entry.greek, fetchFn);
        morph = parseMorphJson(json);
      } catch (err) {
        console.error(`Perseus morph failed for ${entry.id}: ${err.message}`);
        continue;
      }

      if (!morph?.hdwd) continue;
      snapshot.matched += 1;

      if (morph.hdwd !== entry.greek && !isCaseOnlyChange(entry.greek, morph.hdwd)) {
        suggestions.push({
          id: entry.id,
          field: 'greek',
          value: morph.hdwd,
          confidence: 0.9,
          provenance: makeProvenance(
            `https://services.perseids.org/bsp/morphologyservice/analysis/word?lang=grc&word=${encodeURIComponent(
              entry.greek
            )}&engine=morpheusgrc`
          ),
          note: `Perseus lemma (${morph.pofs || 'word'}, ${morph.gend || 'gender unknown'}) differs from current greek field`,
        });
      }

      let doc;
      try {
        doc = await fetchLsjDoc(entry.greek, fetchFn);
      } catch (err) {
        console.error(`Perseus LSJ link failed for ${entry.id}: ${err.message}`);
      }
      if (!doc) continue;

      let definition;
      try {
        definition = await fetchLsjDefinition(doc, fetchFn);
      } catch (err) {
        console.error(`Perseus LSJ definition failed for ${entry.id}: ${err.message}`);
      }
      if (!definition || definition.length < 4) continue;
      snapshot.definitions += 1;

      suggestions.push({
        id: entry.id,
        field: 'meaning',
        value: definition,
        confidence: 0.85,
        provenance: makeProvenance(`${LSJ_TEXT}?doc=${encodeURIComponent(doc)}`),
        note: 'Short definition extracted from LSJ (Perseus)',
      });
    }

    return {
      suggestions,
      snapshot,
      url: 'https://www.perseus.tufts.edu/hopper/',
    };
  },
};
