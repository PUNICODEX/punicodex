/**
 * Wikidata importer for PuniCodex
 *
 * Uses Wikidata's public API (CC0 data) to:
 *   - link entries to Wikidata entities (Q IDs)
 *   - harvest English descriptions for meanings
 *   - collect native-script labels where available
 */

const path = require('node:path');

const ORIGINAL_SCRIPTS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'type',
  'js',
  'original-scripts.js'
);

const WD_API = 'https://www.wikidata.org/w/api.php';
const WD_ENTITY = 'https://www.wikidata.org/wiki/Special:EntityData';

const PANTHEON_KEYWORDS = {
  greek: ['greek', 'hellenic', 'mythology', 'deity', 'god', 'goddess', 'titan', 'nymph', 'hero'],
  'greek-location': ['greek', 'ancient greek', 'city', 'region', 'greece'],
  norse: ['norse', 'germanic', 'mythology', 'deity', 'god', 'goddess'],
  egyptian: ['egyptian', 'egypt', 'deity', 'god', 'goddess'],
  sanskrit: ['hindu', 'indian', 'sanskrit', 'deva', 'deity', 'god', 'goddess'],
  celtic: ['celtic', 'irish', 'welsh', 'mythology', 'deity', 'god', 'goddess'],
  mesopotamian: ['mesopotamian', 'sumerian', 'akkadian', 'deity', 'god', 'goddess'],
  polynesian: ['polynesian', 'hawaiian', 'maori', 'deity', 'god', 'goddess'],
  japanese: ['japanese', 'shinto', 'buddhist', 'deity', 'god', 'goddess'],
  nahuatl: ['aztec', 'nahuatl', 'deity', 'god', 'goddess'],
  yoruba: ['yoruba', 'orisha', 'deity', 'god', 'goddess'],
  slavic: ['slavic', 'mythology', 'deity', 'god', 'goddess'],
  zoroastrian: ['zoroastrian', 'persian', 'yazata', 'deity', 'god'],
  incan: ['inca', 'andean', 'deity', 'god', 'goddess'],
  chinese: ['chinese', 'taoist', 'buddhist', 'deity', 'god', 'goddess'],
  buddhist: ['buddhist', 'buddhism', 'bodhisattva', 'deity'],
  taoist: ['taoist', 'chinese', 'deity', 'immortal'],
  korean: ['korean', 'deity', 'god', 'goddess'],
  canaanite: ['canaanite', 'ugaritic', 'deity', 'god'],
  phoenician: ['phoenician', 'deity', 'god'],
  hittite: ['hittite', 'anatolian', 'deity', 'god'],
};

const PANTHEON_LANGS = {
  greek: ['el'],
  'greek-location': ['el'],
  sanskrit: ['sa', 'hi'],
  japanese: ['ja'],
  chinese: ['zh'],
  buddhist: ['sa', 'zh'],
  taoist: ['zh'],
  korean: ['ko'],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function loadOriginalScripts() {
  try {
    return require(ORIGINAL_SCRIPTS_PATH).ORIGINAL_SCRIPTS;
  } catch {
    return {};
  }
}

async function wikidataRequest(url, fetchFn, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchFn(url, {
      headers: {
        'User-Agent': 'PUNICODEX importer (github.com/PUNICODEX/punicodex)',
        Accept: 'application/json',
      },
    });
    if (res.status === 429) {
      const wait = 2000 * 2 ** attempt;
      console.log(`Wikidata rate limited; sleeping ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Wikidata HTTP ${res.status}: ${url}`);
    }
    return res.json();
  }
  throw new Error(`Wikidata rate limited after retries: ${url}`);
}

async function searchEntities(term, fetchFn) {
  const url =
    `${WD_API}?action=wbsearchentities&search=${encodeURIComponent(term)}` +
    `&language=en&format=json&limit=5`;
  const data = await wikidataRequest(url, fetchFn);
  return data.search || [];
}

async function fetchEntity(qid, fetchFn) {
  const url = `${WD_ENTITY}/${qid}.json`;
  const data = await wikidataRequest(url, fetchFn);
  return data.entities?.[qid];
}

const DEITY_PHRASES = [
  'deity',
  'god',
  'goddess',
  'mythology',
  'mythological',
  'legendary',
  'personification',
  'divine',
  'hero',
  'titan',
  'nymph',
  'giant',
  'monster',
  'spirit',
  'avatar',
  'incarnation',
  'bodhisattva',
  'orisha',
];

const BAD_PHRASES = [
  'given name',
  'surname',
  'family name',
  'disambiguation',
  'unisex',
  'rapper',
  'musician',
  'singer',
  'band',
  'actor',
  'actress',
  'politician',
  'footballer',
  'athlete',
  'writer',
  'author',
  'poet',
  'novelist',
  'journalist',
  'painter',
  'sculptor',
  'artist',
  'composer',
  'conductor',
  'philosopher',
  'scientist',
  'mathematician',
  'astronomer',
  'historian',
  'scholar',
  'academic',
  'researcher',
  'engineer',
  'inventor',
  'explorer',
  'king',
  'queen',
  'emperor',
  'empress',
  'prince',
  'princess',
  'president',
  'prime minister',
  'military officer',
  'general',
  'monarch',
  'ruler',
  'noble',
  'publication',
  'journal',
  'magazine',
  'newspaper',
  'periodical',
  'book',
  'novel',
  'poem',
  'epic',
  'play',
  'film',
  'movie',
  'tv series',
  'television series',
  'anime',
  'manga',
  'comic',
  'podcast',
  'album',
  'song',
  'single',
  'soundtrack',
  'video game',
  'software',
  'application',
  'website',
  'database',
  'encyclopedia',
  'wiki',
  'company',
  'corporation',
  'brand',
  'organization',
  'foundation',
  'association',
  'club',
  'football club',
  'sports team',
  'basketball team',
  'baseball team',
  'vehicle',
  'car',
  'automobile',
  'aircraft',
  'airport',
  'railway station',
  'train station',
  'metro station',
  'bus stop',
  'school',
  'university',
  'college',
  'hospital',
  'church',
  'temple',
  'mosque',
  'synagogue',
  'cathedral',
  'chapel',
  'monastery',
  'convent',
  'cemetery',
  'tomb',
  'mausoleum',
  'shrine',
  'pagoda',
  'museum',
  'library',
  'dam',
  'bridge',
  'building',
  'structure',
  'skyscraper',
  'stadium',
  'arena',
  'shopping mall',
  'hotel',
  'restaurant',
  'brewery',
  'winery',
  'vineyard',
  'farm',
  'estate',
  'castle',
  'palace',
  'fort',
  'fortress',
  'battle',
  'war',
  'siege',
  'treaty',
  'law',
  'act',
  'constitution',
  'currency',
  'coin',
  'banknote',
  'award',
  'prize',
  'medal',
  'festival',
  'holiday',
  'event',
  'conference',
  'election',
  'hurricane',
  'storm',
  'cyclone',
  'typhoon',
  'earthquake',
  'tsunami',
  'volcanic eruption',
  'disease',
  'virus',
  'species',
  'genus',
  'family',
  'organism',
  'animal',
  'plant',
  'tree',
  'flower',
  'bird',
  'fish',
  'insect',
  'mammal',
  'reptile',
  'amphibian',
  'crater',
  'impact crater',
  'satellite',
  'asteroid',
  'comet',
  'planet',
  'dwarf planet',
  'exoplanet',
  'constellation',
  'star',
  'galaxy',
  'nebula',
  'town',
  'village',
  'city',
  'municipality',
  'district',
  'subdistrict',
  'county',
  'province',
  'state',
  'country',
  'nation',
  'continent',
  'region',
  'area',
  'settlement',
  'hamlet',
  'neighborhood',
  'neighbourhood',
  'locality',
  'commune',
  'township',
  'borough',
  'river',
  'mountain',
  'lake',
  'island',
  'peninsula',
  'forest',
  'park',
  'desert',
  'valley',
  'glacier',
  'volcano',
  'cave',
  'waterfall',
  'beach',
  'bay',
  'strait',
  'ocean',
  'sea',
  'gulf',
  'wikimedia disambiguation page',
  'wikimedia category',
  'wikimedia list article',
  'wikimedia commons category',
  'wikimedia template',
  'wikinews article',
  'wikivoyage',
  'wikisource',
  'wikiquote',
  'painting',
  'painting by',
  'statue',
  'statue in',
  'sculpture',
  'ship',
  'vessel',
  'naval',
  'name',
  'common noun',
  'language',
  'dialect',
  'pilgrimage site',
  'site',
  'crater',
  'moon',
  'month',
  'day',
  'year',
  'era',
  'epoch',
  'constellation',
];

function scoreCandidate(entry, candidate) {
  const keywords = PANTHEON_KEYWORDS[entry.pantheon] || [];
  const desc = (candidate.description || '').toLowerCase();
  const label = (candidate.label || '').toLowerCase();
  const asciiNorm = normalize(entry.ascii);
  const unicodeNorm = normalize(entry.unicode);
  let score = 0;

  // Strong signal: the Wikidata label matches our name.
  if (label === entry.ascii.toLowerCase() || normalize(label) === asciiNorm) {
    score += 5;
  } else if (normalize(label) === unicodeNorm) {
    score += 3;
  }

  // Pantheon/context keywords in the description.
  let keywordHits = 0;
  for (const kw of keywords) {
    if (desc.includes(kw)) {
      score += 1;
      keywordHits += 1;
      if (keywordHits >= 3) break;
    }
  }

  // Deity/mythology signals.
  for (const dp of DEITY_PHRASES) {
    if (desc.includes(dp)) score += 2;
  }

  // Strong penalty for obviously wrong entity types.
  for (const bp of BAD_PHRASES) {
    if (desc.includes(bp)) score -= 10;
  }

  return score;
}

function pickBestCandidate(entry, candidates) {
  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = scoreCandidate(entry, c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 6 ? { candidate: best, score: bestScore } : null;
}

function existingOriginalScript(entryId, originalScripts) {
  const data = originalScripts[entryId];
  if (!data) return null;
  return data.originalScript || null;
}

function makeProvenance(qid, url) {
  return {
    source: 'wikidata',
    recordId: qid,
    retrievedAt: new Date().toISOString(),
    url,
    license: 'CC0',
  };
}

module.exports = {
  name: 'Wikidata',
  source: 'wikidata',
  defaultLicense: 'CC0',
  requiresOnline: true,

  async run({ lexicon, args, fetch: fetchFn }) {
    const sample = args.sample ? Number.parseInt(args.sample, 10) : null;
    const delay = args.delay ? Number.parseInt(args.delay, 10) : 200;
    const entries = sample ? lexicon.slice(0, sample) : lexicon;
    const originalScripts = loadOriginalScripts();

    const suggestions = [];
    const snapshot = { processed: 0, matched: 0, entities: {} };

    for (const entry of entries) {
      await sleep(delay);

      let candidates = [];
      try {
        candidates = await searchEntities(entry.ascii, fetchFn);
      } catch (err) {
        console.error(`Wikidata search failed for ${entry.id}: ${err.message}`);
        continue;
      }

      if (entry.unicode !== entry.ascii) {
        try {
          const unicodeCandidates = await searchEntities(entry.unicode, fetchFn);
          // Merge, preferring ascii order but removing duplicates by QID
          const seen = new Set(candidates.map((c) => c.id));
          for (const c of unicodeCandidates) {
            if (!seen.has(c.id)) candidates.push(c);
          }
        } catch (err) {
          console.error(`Wikidata search failed for ${entry.id}: ${err.message}`);
        }
      }

      const picked = pickBestCandidate(entry, candidates);
      snapshot.processed += 1;
      if (!picked) continue;
      snapshot.matched += 1;

      const qid = picked.candidate.id;
      let entity;
      try {
        entity = await fetchEntity(qid, fetchFn);
      } catch (err) {
        console.error(`Wikidata entity fetch failed for ${entry.id}: ${err.message}`);
        continue;
      }

      snapshot.entities[entry.id] = {
        qid,
        label: entity.labels?.en?.value,
        description: entity.descriptions?.en?.value,
      };

      const enDesc = entity.descriptions?.en?.value;
      if (enDesc && enDesc.length > 3) {
        suggestions.push({
          id: entry.id,
          field: 'meaning',
          value: enDesc,
          confidence: Math.min(0.95, 0.6 + picked.score * 0.05),
          provenance: makeProvenance(qid, `https://www.wikidata.org/wiki/${qid}`),
          note: `Wikidata English description (score ${picked.score})`,
        });
      }

      const langs = PANTHEON_LANGS[entry.pantheon];
      if (langs) {
        for (const lang of langs) {
          const label = entity.labels?.[lang]?.value;
          if (!label || label === '—') continue;

          if (entry.pantheon === 'greek' || entry.pantheon === 'greek-location') {
            // Wikidata's el label is modern Greek; let Perseus handle ancient forms.
            // We only suggest if the current greek field is empty or a dash.
            if (!entry.greek || entry.greek === '—') {
              suggestions.push({
                id: entry.id,
                field: 'greek',
                value: label,
                confidence: 0.5,
                provenance: makeProvenance(qid, `https://www.wikidata.org/wiki/${qid}`),
                note: `Wikidata ${lang} label (modern Greek fallback)`,
              });
            }
            continue;
          }

          const current = existingOriginalScript(entry.id, originalScripts);
          if (!current || current !== label) {
            suggestions.push({
              id: entry.id,
              field: 'originalScript',
              value: {
                originalScript: label,
                scriptName: scriptNameFor(entry.pantheon),
                provenance: {
                  original: label,
                  transliteration: entry.unicode || entry.ascii,
                  steps: [`Wikidata ${lang} label for ${entry.id}`],
                  sources: ['Wikidata'],
                },
              },
              confidence: 0.6,
              provenance: makeProvenance(qid, `https://www.wikidata.org/wiki/${qid}`),
              note: `Wikidata ${lang} original-script label`,
            });
          }
          // Only use the first available native label
          break;
        }
      }
    }

    suggestions.push({
      id: 'WIKIDATA_CATALOG',
      field: 'sourceCatalog',
      key: 'Wikidata',
      value: {
        full: 'Wikidata — collaborative structured knowledge base',
        scope: 'Cross-domain entity graph and multilingual labels',
        year: '2012',
        edition: 'Wikimedia Foundation',
        url: 'https://www.wikidata.org/',
      },
      confidence: 1,
      provenance: {
        source: 'wikidata',
        recordId: 'Q2013',
        retrievedAt: new Date().toISOString(),
        url: 'https://www.wikidata.org/',
        license: 'CC0',
      },
      note: 'Register Wikidata as a source catalog entry',
    });

    return {
      suggestions,
      snapshot,
      url: 'https://www.wikidata.org/',
    };
  },
};

function scriptNameFor(pantheon) {
  const map = {
    sanskrit: 'Devanagari',
    japanese: 'Japanese',
    chinese: 'Chinese characters',
    buddhist: 'Source-language script',
    taoist: 'Chinese characters',
    korean: 'Korean script',
  };
  return map[pantheon] || 'Original script';
}
