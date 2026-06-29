/**
 * Cologne Sanskrit importer for PÚNYCODEX
 *
 * Reads the local Monier-Williams XML corpus (Cologne Digital Sanskrit
 * Dictionaries) and suggests English glosses plus Devanagari original-script
 * forms for Sanskrit/Hindu/Buddhist lexicon entries.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const cheerio = require('cheerio');

const CORPUS_DIR = path.join(__dirname, '..', 'corpus', 'cologne-mw');
const XML_PATH = path.join(CORPUS_DIR, 'xml', 'mw.xml');
const ZIP_URL = 'https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/downloads/mwxml.zip';

const TARGET_PANTHEONS = new Set(['sanskrit', 'hindu', 'buddhist']);

// IAST → SLP1 mapping. Longest sequences are listed first so the tokenizer
// prefers aspirates and diphthongs over single letters.
const IAST_TO_SLP1 = [
  ['kh', 'K'],
  ['Kh', 'K'],
  ['gh', 'G'],
  ['Gh', 'G'],
  ['ch', 'C'],
  ['Ch', 'C'],
  ['jh', 'J'],
  ['Jh', 'J'],
  ['ṭh', 'W'],
  ['Ṭh', 'W'],
  ['ḍh', 'Q'],
  ['Ḍh', 'Q'],
  ['th', 'T'],
  ['Th', 'T'],
  ['dh', 'D'],
  ['Dh', 'D'],
  ['ph', 'P'],
  ['Ph', 'P'],
  ['bh', 'B'],
  ['Bh', 'B'],
  ['au', 'O'],
  ['Au', 'O'],
  ['ai', 'E'],
  ['Ai', 'E'],
  ['ā', 'A'],
  ['Ā', 'A'],
  ['ī', 'I'],
  ['Ī', 'I'],
  ['ū', 'U'],
  ['Ū', 'U'],
  ['ṝ', 'F'],
  ['Ṝ', 'F'],
  ['ṛ', 'f'],
  ['Ṛ', 'f'],
  ['ḹ', 'X'],
  ['Ḹ', 'X'],
  ['ḷ', 'x'],
  ['Ḷ', 'x'],
  ['ṃ', 'M'],
  ['ṁ', 'M'],
  ['Ṁ', 'M'],
  ['ḥ', 'H'],
  ['Ḥ', 'H'],
  ['ṅ', 'N'],
  ['Ṅ', 'N'],
  ['ñ', 'Y'],
  ['Ñ', 'Y'],
  ['ṇ', 'R'],
  ['Ṇ', 'R'],
  ['ś', 'S'],
  ['Ś', 'S'],
  ['ṣ', 'z'],
  ['Ṣ', 'z'],
  ['a', 'a'],
  ['A', 'a'],
  ['i', 'i'],
  ['I', 'i'],
  ['u', 'u'],
  ['U', 'u'],
  ['e', 'e'],
  ['E', 'e'],
  ['o', 'o'],
  ['O', 'o'],
  ['k', 'k'],
  ['K', 'k'],
  ['g', 'g'],
  ['G', 'g'],
  ['c', 'c'],
  ['C', 'c'],
  ['j', 'j'],
  ['J', 'j'],
  ['ṭ', 'w'],
  ['Ṭ', 'w'],
  ['ḍ', 'q'],
  ['Ḍ', 'q'],
  ['t', 't'],
  ['T', 't'],
  ['d', 'd'],
  ['D', 'd'],
  ['p', 'p'],
  ['P', 'p'],
  ['b', 'b'],
  ['B', 'b'],
  ['m', 'm'],
  ['M', 'M'],
  ['y', 'y'],
  ['Y', 'y'],
  ['r', 'r'],
  ['R', 'r'],
  ['l', 'l'],
  ['L', 'l'],
  ['v', 'v'],
  ['V', 'v'],
  ['s', 's'],
  ['S', 'S'],
  ['z', 'z'],
  ['Z', 'z'],
  ['h', 'h'],
  ['H', 'H'],
];

const SLP1_VOWELS = new Set(['a', 'A', 'i', 'I', 'u', 'U', 'f', 'F', 'x', 'X', 'e', 'E', 'o', 'O']);
const SLP1_DIPHTHONGS = new Set(['E', 'O']);

const SLP1_CONSONANTS = {
  k: 'क',
  K: 'ख',
  g: 'ग',
  G: 'घ',
  N: 'ङ',
  c: 'च',
  C: 'छ',
  j: 'ज',
  J: 'झ',
  Y: 'ञ',
  w: 'ट',
  W: 'ठ',
  q: 'ड',
  Q: 'ढ',
  R: 'ण',
  t: 'त',
  T: 'थ',
  d: 'द',
  D: 'ध',
  n: 'न',
  p: 'प',
  P: 'फ',
  b: 'ब',
  B: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  S: 'श',
  z: 'ष',
  s: 'स',
  h: 'ह',
};

const DEVANAGARI_INDEPENDENT_VOWELS = {
  a: 'अ',
  A: 'आ',
  i: 'इ',
  I: 'ई',
  u: 'उ',
  U: 'ऊ',
  f: 'ऋ',
  F: 'ॄ',
  x: 'ऌ',
  X: 'ॡ',
  e: 'ए',
  E: 'ऐ',
  o: 'ओ',
  O: 'औ',
};

const DEVANAGARI_VOWEL_SIGNS = {
  a: '',
  A: 'ा',
  i: 'ि',
  I: 'ी',
  u: 'ु',
  U: 'ू',
  f: 'ृ',
  F: 'ॄ',
  x: 'ॢ',
  X: 'ॣ',
  e: 'े',
  E: 'ै',
  o: 'ो',
  O: 'ौ',
};

function stripStressMarks(s) {
  // Remove acute/grave/circumflex/caron only; preserve macrons and dot marks.
  return s
    .normalize('NFD')
    .replace(/[\u0300\u0301\u0302\u030c]/g, '')
    .normalize('NFC');
}

function iastToSlp1(iast) {
  // Lexicon Unicode values are capitalised proper names. Lowercase a plain-ASCII
  // initial capital so that e.g. Sūrya -> sUrya, not SUrya (which would be ś).
  let input = iast;
  if (input.length > 0 && input.charCodeAt(0) < 128 && /[A-Z]/.test(input[0])) {
    input = input[0].toLowerCase() + input.slice(1);
  }
  input = stripStressMarks(input);
  let out = '';
  let i = 0;
  while (i < input.length) {
    let matched = false;
    for (const [pattern, replacement] of IAST_TO_SLP1) {
      if (input.slice(i, i + pattern.length) === pattern) {
        out += replacement;
        i += pattern.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += input[i];
      i += 1;
    }
  }
  return out;
}

function stripCologneAccents(slp1) {
  return slp1.replace(/[/\\^-]/g, '');
}

function normalizeCologneSlp1(slp1) {
  // Strip Cologne accent marks and compound-boundary dashes so that e.g.
  // "sam-anta—Badra" and "nA/rada" can be compared to the lexicon SLP1 key.
  return stripCologneAccents(slp1).replace(/[-—–]/g, '');
}

function slp1ToDevanagari(slp1) {
  let result = '';
  let i = 0;
  let nextVowelIsIndependent = true;

  while (i < slp1.length) {
    const two = slp1.slice(i, i + 2);
    if (SLP1_DIPHTHONGS.has(two)) {
      if (nextVowelIsIndependent) {
        result += DEVANAGARI_INDEPENDENT_VOWELS[two];
      } else {
        result += DEVANAGARI_VOWEL_SIGNS[two];
      }
      i += 2;
      nextVowelIsIndependent = false;
      continue;
    }

    const ch = slp1[i];

    if (SLP1_VOWELS.has(ch)) {
      if (nextVowelIsIndependent) {
        result += DEVANAGARI_INDEPENDENT_VOWELS[ch];
      } else {
        result += DEVANAGARI_VOWEL_SIGNS[ch];
      }
      i += 1;
      nextVowelIsIndependent = false;
      continue;
    }

    if (SLP1_CONSONANTS[ch]) {
      const nextTwo = slp1.slice(i + 1, i + 3);
      const nextVowel = SLP1_DIPHTHONGS.has(nextTwo)
        ? nextTwo
        : SLP1_VOWELS.has(slp1[i + 1])
          ? slp1[i + 1]
          : null;
      if (nextVowel) {
        result += SLP1_CONSONANTS[ch];
        if (nextVowel !== 'a') {
          result += DEVANAGARI_VOWEL_SIGNS[nextVowel];
        }
        i += 1 + nextVowel.length;
        nextVowelIsIndependent = false;
      } else {
        result += `${SLP1_CONSONANTS[ch]}्`;
        i += 1;
        nextVowelIsIndependent = false;
      }
      continue;
    }

    if (ch === 'M') {
      result += 'ं';
      i += 1;
      continue;
    }
    if (ch === 'H') {
      result += 'ः';
      i += 1;
      continue;
    }
    if (ch === '-') {
      // Cologne uses hyphens to mark compound boundaries; skip them.
      i += 1;
      continue;
    }

    i += 1;
  }

  return result;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function skipBalancedParentheses(text) {
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      if (depth > 0) depth -= 1;
      if (depth === 0) {
        const rest = text.slice(i + 1).trim();
        return rest.startsWith(',') ? rest.slice(1).trim() : rest;
      }
    } else if (depth === 0 && ch !== ' ' && ch !== '\t') {
      break;
    }
    i += 1;
  }
  return text;
}

// Common Cologne/philological abbreviations whose trailing period should not
// be treated as a sentence boundary.
const COLOGNE_ABBREVIATIONS = new Set([
  'n',
  'm',
  'f',
  'ind',
  'adv',
  'prep',
  'conj',
  'interj',
  'ab',
  'abl',
  'acc',
  'cf',
  'q',
  'qv',
  'qvv',
  'fr',
  'prob',
  'esp',
  'exc',
  'gen',
  'instr',
  'lit',
  'loc',
  'nom',
  'orig',
  'part',
  'pass',
  'philos',
  'pl',
  'sing',
  'vl',
  'wr',
  't',
  'l',
  'w',
  'rv',
  'av',
  'vs',
  'ts',
  'ms',
  'sbr',
  'chup',
  'brhar',
  'mbh',
  'r',
  'hariv',
  'kav',
  'ragh',
  'kum',
  'markp',
  'vp',
  'bhp',
  'padmap',
  'skandap',
  'vop',
  'pan',
  'un',
  'vas',
  'yajn',
  'mn',
  'susr',
  'car',
  'varbrs',
  'hcat',
  'rt',
  'rtl',
  'ls',
  'etc',
  'c',
]);

function isAbbreviationPeriod(text, idx) {
  // idx points at the period. Walk back to collect the preceding word.
  let start = idx - 1;
  while (start >= 0 && /[a-z]/i.test(text[start])) {
    start -= 1;
  }
  const word = text.slice(start + 1, idx).toLowerCase();
  if (COLOGNE_ABBREVIATIONS.has(word)) return true;
  // Handle the ligature "&c." (et cetera) which is common in Cologne.
  return word === 'c' && start >= 0 && text[start] === '&';
}

function findSentenceEnd(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (
      depth === 0 &&
      (ch === '.' || ch === '!' || ch === '?') &&
      i + 1 < text.length &&
      text[i + 1] === ' ' &&
      !isAbbreviationPeriod(text, i)
    ) {
      return i + 1;
    }
  }
  return -1;
}

function isCrossReferenceGloss(gloss) {
  const clean = gloss.toLowerCase();
  return /^(see below|see\s|&c\.|cf\.)/.test(clean);
}

function extractGloss(bodyText, headwordSlp1) {
  let text = bodyText
    .replace(/[/\\^-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  // Strip optional leading homonym number (e.g. "1. ").
  text = text.replace(/^\d+\.\s*/, '');

  const headPattern = new RegExp(`^${escapeRegExp(headwordSlp1)}\\s*`, 'i');
  text = text.replace(headPattern, '');

  // Drop common Cologne grammar abbreviations that precede the English gloss.
  const grammarRe = new RegExp(
    '^(mf?\\([^)]*\\)\\s*)?' +
      '(m\\.\\s+f\\.\\s+n\\.|m\\.\\s+f\\.|mf\\([^)]*\\)\\s*n\\.|m\\.|f\\.|n\\.|mf\\.|' +
      'ind\\.|adv\\.|prep\\.|conj\\.|interj\\.)\\s*',
    'i'
  );
  text = text.replace(grammarRe, '');

  // Skip leading parenthetical etymology notes.
  text = skipBalancedParentheses(text);

  const sentenceEnd = findSentenceEnd(text);
  let gloss = sentenceEnd >= 0 ? text.slice(0, sentenceEnd) : text;

  if (gloss.length > 180) {
    let cut = gloss.lastIndexOf(',', 180);
    if (cut < 150) cut = gloss.lastIndexOf(' ', 180);
    if (cut < 150) cut = 180;
    gloss = gloss.slice(0, cut);
  }

  gloss = gloss.replace(/[,;:\s]+$/, '').trim();
  if (gloss.length < 3 || isCrossReferenceGloss(gloss)) return null;
  return gloss;
}

function parseEntryBlock(block) {
  const $ = cheerio.load(block, { xmlMode: true });
  const key1 = $('key1').first().text().trim();
  const bodyText = $('body').first().text();
  const firstS = $('s').first().text().trim();
  const s1Texts = $('s1')
    .map((_, el) => $(el).text().trim())
    .get();
  return { key1, bodyText, firstS, s1Texts };
}

function isDeityBlock(bodyText) {
  const t = bodyText.toLowerCase();
  return (
    /\bN\.\s*of\b/.test(bodyText) ||
    /\b(wife of|husband of|son of|daughter of|monkey-chief)\b/i.test(bodyText) ||
    /\b(goddess|god|gods|deity)\b/i.test(t)
  );
}

function scoreBlock(block) {
  // Prefer full entries with grammar tags and real definitions over
  // cross-reference stubs such as "See below." or "&c."
  // Require an actual <lex>...</lex> tag, not <info lex="..."/>.
  const hasLex = /<lex\b[^>]*>[\s\S]*?<\/lex>/i.test(block);
  const hasHuiB = /<info[^>]*\bhui\s*=\s*["']b["']/i.test(block);
  const cleanText = block
    .replace(/<[^>]+>/g, ' ')
    .replace(/[/\\^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const isCrossRef = /^(see below|see\s|&c\.)/i.test(cleanText);
  let score = 0;
  if (hasLex) score += 10;
  if (hasHuiB) score += 5;
  if (!isCrossRef) score += 3;
  score += Math.min(5, cleanText.length / 100);
  return score;
}

function buildXmlIndex(xml) {
  const index = new Map();
  const hStartRe = /<H\d+[A-Z]?\b[^>]*>/g;
  const hEndRe = /<\/H\d+[A-Z]?>/g;
  const key1Re = /<key1>([^<]*)<\/key1>/;

  let startMatch;
  while ((startMatch = hStartRe.exec(xml)) !== null) {
    const start = startMatch.index;
    hEndRe.lastIndex = start;
    const endMatch = hEndRe.exec(xml);
    if (!endMatch) break;
    const end = endMatch.index + endMatch[0].length;
    const block = xml.slice(start, end);
    const keyMatch = block.match(key1Re);
    if (keyMatch) {
      const key = keyMatch[1].trim();
      const list = index.get(key) || [];
      list.push({ start, end, block });
      index.set(key, list);
    }
    hStartRe.lastIndex = end;
  }

  return index;
}

function candidateKeys(entry) {
  const keys = [];
  if (entry.unicode) keys.push(iastToSlp1(entry.unicode));
  if (entry.ascii && entry.ascii !== entry.unicode) {
    keys.push(iastToSlp1(entry.ascii));
  }
  // Known stem mismatches between lexicon nominative forms and MW headwords.
  const STEM_FALLBACKS = {
    brahma: ['brahman'],
  };
  for (const k of STEM_FALLBACKS[entry.id] || []) {
    if (!keys.includes(k)) keys.push(k);
  }
  return [...new Set(keys)];
}

function collectCandidates(entry, index) {
  const keys = candidateKeys(entry);
  const slp1Key = iastToSlp1(entry.unicode || entry.ascii);
  const candidates = [];
  for (const key of keys) {
    const list = index.get(key);
    if (!list) continue;
    for (const item of list) {
      const parsed = parseEntryBlock(item.block);
      const score = scoreBlock(item.block);
      const exactKey = normalizeCologneSlp1(parsed.key1) === slp1Key;
      const exactS = normalizeCologneSlp1(parsed.firstS) === slp1Key;
      const s1Match = parsed.s1Texts.some(
        (s) => stripStressMarks(s).toLowerCase() === (entry.unicode || '').toLowerCase()
      );
      candidates.push({
        ...item,
        ...parsed,
        lookupKey: key,
        score,
        exactKey,
        exactS,
        s1Match,
        deity: isDeityBlock(parsed.bodyText),
      });
    }
  }
  return candidates.sort((a, b) => {
    if (a.exactKey !== b.exactKey) return (b.exactKey ? 1 : 0) - (a.exactKey ? 1 : 0);
    if (a.exactS !== b.exactS) return (b.exactS ? 1 : 0) - (a.exactS ? 1 : 0);
    if (a.s1Match !== b.s1Match) return (b.s1Match ? 1 : 0) - (a.s1Match ? 1 : 0);
    if (a.deity !== b.deity) return (b.deity ? 1 : 0) - (a.deity ? 1 : 0);
    return b.score - a.score;
  });
}

function pickBestScriptCandidate(candidates, entry) {
  const slp1Key = iastToSlp1(entry.unicode || entry.ascii);
  const iast = stripStressMarks(entry.unicode || entry.ascii).toLowerCase();

  // 1. Exact SLP1 match on the headword <s>.
  for (const c of candidates) {
    if (c.firstS && normalizeCologneSlp1(c.firstS) === slp1Key) return c;
  }

  // 2. Any <s1> tag matches the Unicode form (handles Brahmā, etc.).
  for (const c of candidates) {
    if (c.s1Texts.some((s) => stripStressMarks(s).toLowerCase() === iast)) return c;
  }

  // 3. Fall back to the highest-priority candidate that has any <s> headword.
  return candidates.find((c) => c.firstS) || null;
}

function scoreGloss(gloss, candidate) {
  let score = 0;
  const lower = gloss.toLowerCase();
  if (candidate.deity) score += 20;
  if (candidate.s1Match) score += 15;
  if (/\bN\.\s*of\b/.test(gloss)) score += 15;
  if (/\b(deity|god|gods|goddess)\b/i.test(gloss)) score += 12;
  if (/\b(wife of|husband of|son of|daughter of|monkey-chief)\b/i.test(gloss)) score += 8;
  if (/\b(sun|moon|fire|wind|sky|earth|ocean)\b/i.test(gloss)) score += 4;
  score += Math.min(10, gloss.length / 10);
  // Deprioritise trivial or off-target first senses for deity names.
  if (/(jackal|plant|deer|crow|bird|in detail|diameter|breadth|sewing|stitcher)/.test(lower))
    score -= 20;
  return score;
}

function pickBestGlossCandidate(candidates) {
  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const headword = stripCologneAccents(c.firstS || c.key1);
    const gloss = extractGloss(c.bodyText, headword);
    if (!gloss) continue;
    const q = scoreGloss(gloss, c);
    if (q > bestScore) {
      bestScore = q;
      best = { candidate: c, gloss };
    }
  }
  return best;
}

function makeProvenance(recordId, url) {
  return {
    source: 'cologne-sanskrit',
    recordId,
    retrievedAt: new Date().toISOString(),
    url,
    license: 'CC BY-SA 3.0',
  };
}

async function extractZip(zipPath, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  const isWindows = process.platform === 'win32';
  const args = isWindows
    ? [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force`,
      ]
    : ['-o', zipPath, '-d', targetDir];
  const cmd = isWindows ? 'powershell.exe' : 'unzip';

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to extract ${zipPath}: ${stderr}`));
    });
  });
}

async function ensureCorpus(fetchFn) {
  if (fs.existsSync(XML_PATH)) return;

  console.log('Cologne Monier-Williams XML not found; downloading ...');
  const res = await fetchFn(ZIP_URL);
  const zipPath = path.join(CORPUS_DIR, 'mwxml.zip');
  fs.mkdirSync(CORPUS_DIR, { recursive: true });
  fs.writeFileSync(zipPath, res.buffer);
  console.log(`Downloaded ${zipPath}; extracting ...`);
  await extractZip(zipPath, CORPUS_DIR);

  if (!fs.existsSync(XML_PATH)) {
    throw new Error(`Extraction did not produce expected file: ${XML_PATH}`);
  }
}

module.exports = {
  name: 'Cologne Sanskrit (Monier-Williams)',
  source: 'cologne-sanskrit',
  defaultLicense: 'CC BY-SA 3.0',
  requiresOnline: false,

  async run({ lexicon, args, fetch: fetchFn }) {
    await ensureCorpus(fetchFn);

    const sample = args.sample ? Number.parseInt(args.sample, 10) : null;
    const targetEntries = lexicon.filter((e) => TARGET_PANTHEONS.has(e.pantheon));
    const entries = sample ? targetEntries.slice(0, sample) : targetEntries;

    console.log(`Loading Monier-Williams XML ...`);
    const xml = fs.readFileSync(XML_PATH, 'utf8');
    const index = buildXmlIndex(xml);
    console.log(`Indexed ${index.size} unique <key1> entries.`);

    const suggestions = [];
    const snapshot = { processed: 0, matched: 0, meaning: 0, originalScript: 0 };

    for (const entry of entries) {
      snapshot.processed += 1;
      const candidates = collectCandidates(entry, index);
      if (candidates.length === 0) continue;

      snapshot.matched += 1;
      const slp1Key = iastToSlp1(entry.unicode || entry.ascii);
      const scriptCand = pickBestScriptCandidate(candidates, entry);
      const glossPick = pickBestGlossCandidate(candidates);
      const key1 = scriptCand?.key1 || glossPick?.candidate.key1 || candidates[0].key1;
      const firstS = scriptCand?.firstS || candidates[0].firstS;
      // When the only match is a <s1> deity form (e.g. Brahmā under the stem
      // brahman), preserve the lexicon's nominative SLP1 instead of using the
      // stem headword, which would lose the final long ā. For the sacred
      // syllable Oṃ, Cologne's headword is "o/m" (m consonant), so force the
      // lexicon's anusvara form "oM".
      const headwordSlp1 =
        (scriptCand?.s1Match && normalizeCologneSlp1(firstS || key1) !== slp1Key) ||
        entry.id === 'om'
          ? slp1Key
          : normalizeCologneSlp1(firstS || key1);
      const devanagari = slp1ToDevanagari(headwordSlp1);
      const recordId = `${slp1Key}:${key1}`;
      const entryUrl =
        `https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/` +
        `indexcaller.php?input=SLP1&output=IAST&key=${encodeURIComponent(slp1Key)}`;
      const provenance = makeProvenance(recordId, entryUrl);

      if (glossPick) {
        snapshot.meaning += 1;
        suggestions.push({
          id: entry.id,
          field: 'meaning',
          value: glossPick.gloss,
          confidence: 0.85,
          provenance,
          note: `Monier-Williams concise gloss for ${entry.unicode}`,
        });
      }

      if (devanagari) {
        snapshot.originalScript += 1;
        suggestions.push({
          id: entry.id,
          field: 'originalScript',
          value: {
            originalScript: devanagari,
            scriptName: 'Devanagari',
            provenance: {
              original: devanagari,
              transliteration: entry.unicode || entry.ascii,
              steps: [
                `IAST unicode ${entry.unicode} converted to SLP1 ${slp1Key}`,
                `Matched <key1>${key1}</key1> in Monier-Williams XML`,
                scriptCand?.s1Match && normalizeCologneSlp1(firstS || key1) !== slp1Key
                  ? `Matched <s1>${entry.unicode}</s1> deity form; used nominative SLP1 ${slp1Key}`
                  : entry.id === 'om'
                    ? `Used lexicon SLP1 ${slp1Key} for the sacred syllable ${entry.unicode}`
                    : `Extracted <s>${firstS}</s>, stripped Cologne accents and compound dashes, converted to Devanagari`,
              ],
              sources: ['Monier-Williams'],
            },
          },
          confidence: 0.8,
          provenance,
          note: `Devanagari headword from Monier-Williams for ${entry.unicode}`,
        });
      }
    }

    suggestions.push({
      id: 'COLOGNE_SANSKRIT_CATALOG',
      field: 'sourceCatalog',
      key: 'Monier-Williams',
      value: {
        full: 'A Sanskrit-English Dictionary: Etymologically and Philologically Arranged',
        scope: 'Sanskrit lemmata, English glosses, and Devanagari headwords',
        year: '1899',
        edition: 'Cologne Digital Sanskrit Dictionaries (2020)',
        url: 'https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/index.php',
      },
      confidence: 1,
      provenance: makeProvenance(
        'Monier-Williams',
        'https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/index.php'
      ),
      note: 'Register Monier-Williams as a source catalog entry',
    });

    return {
      suggestions,
      snapshot,
      url: 'https://www.sanskrit-lexicon.uni-koeln.de/',
    };
  },
};
