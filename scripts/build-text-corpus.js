#!/usr/bin/env node
/**
 * PuniCodex — Sacred texts corpus builder.
 *
 * Parses the canonical TEI sources under platform/texts/{id}/ into the
 * canonical line corpus consumed by the /texts/ pages, the search corpus,
 * and the cross-link engine.
 *
 * Per text, writes platform/texts/{id}/{lang}.json:
 *   grc.json — { lang, lines: [{ n, text }] }            (one entry per line)
 *   eng.json — { lang, chunks: [{ from, to, text }] }    (anchored to grc lines)
 *
 * The English Evelyn-White TEI anchors each translation chunk to the Greek
 * line it begins at (<l n="N">); a chunk covers [n, nextAnchorNumerically - 1].
 * Chunks are kept in TEI DOCUMENT ORDER: Rzach's edition carries editorial
 * transpositions (426/427 swapped, 434 printed before 430–433) and
 * Evelyn-White translates in that printed order, so document order is the
 * intended reading order. Ranges are computed against the numerically sorted
 * anchor set, so they stay true line intervals even at transpositions.
 * Genuine anchor/content mismatches are corrected in ANCHOR_SWAPS below.
 *
 * Idempotent: output is byte-stable for unchanged inputs. Fails loudly on
 * numbering gaps — a corrupted TEI must never ship silently.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'platform', 'texts');
const registry = require(path.join(TEXTS_DIR, 'registry.json'));

// Documented anchor corrections, applied right after parsing, BEFORE range
// computation. Each pair swaps the `from` anchors of the two chunks that
// currently carry them. Content stays byte-identical to the TEI; only the
// mis-attached line numbers are exchanged.
const ANCHOR_SWAPS = {
  theogony: [
    // The TEI anchors "And again the goddess murky Night, though she lay
    // with none" at 214 and "bare Blame and painful Woe" at 213. The content
    // is the other way round: the Night clause translates Greek 213
    // (οὔ τινι κοιμηθεῖσα θεὰ τέκε Νὺξ ἐρεβεννή), Blame/Woe Greek 214
    // (δεύτερον αὖ Μῶμον καὶ Ὀιζὺν ἀλγινόεσσαν).
    [213, 214],
  ],
};

const stripTags = (s) =>
  s
    .replace(/<milestone[^/]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function parseGreek(xml, expectedLines) {
  const lines = [];
  const re = /<l n="(\d+)">([\s\S]*?)<\/l>/g;
  let m;
  while ((m = re.exec(xml))) {
    const text = stripTags(m[2]);
    if (text) lines.push({ n: Number(m[1]), text });
  }
  if (expectedLines && lines.length !== expectedLines) {
    throw new Error(`grc line count ${lines.length} !== registry lineCount ${expectedLines}`);
  }
  // Rzach's edition carries editorial transpositions (e.g. line 214 printed
  // before 213), so document order is not numeric order. The invariant that
  // matters: the line numbers form exactly the set 1..N with no duplicates.
  const seen = new Set(lines.map((l) => l.n));
  if (seen.size !== lines.length) throw new Error('grc duplicate line numbers');
  const max = Math.max(...seen);
  for (let i = 1; i <= max; i++) {
    if (!seen.has(i)) throw new Error(`grc line ${i} missing`);
  }
  lines.sort((a, b) => a.n - b.n);
  return lines;
}

function parseEnglish(xml, grcLines, textId) {
  const chunks = [];
  const re = /<l n="(\d+)">([\s\S]*?)<\/l>/g;
  let m;
  while ((m = re.exec(xml))) {
    const text = stripTags(m[2]);
    if (text) chunks.push({ from: Number(m[1]), text });
  }

  // Correct mis-attached anchors (documented in ANCHOR_SWAPS) before any
  // range math. Chunks stay in TEI document order throughout.
  for (const [a, b] of ANCHOR_SWAPS[textId] || []) {
    const ca = chunks.find((c) => c.from === a);
    const cb = chunks.find((c) => c.from === b);
    if (!ca || !cb) {
      throw new Error(`${textId}: ANCHOR_SWAPS pair [${a}, ${b}] not found in eng TEI`);
    }
    ca.from = b;
    cb.from = a;
  }

  // Ranges come from the NUMERICALLY sorted anchor set: each chunk covers
  // [from, nextAnchor - 1], so ranges are true line intervals even where the
  // document order transposes chunks (Rzach's editorial transpositions,
  // which Evelyn-White follows).
  const maxLine = grcLines[grcLines.length - 1].n;
  const sortedAnchors = chunks.map((c) => c.from).sort((a, b) => a - b);
  if (new Set(sortedAnchors).size !== sortedAnchors.length) {
    throw new Error(`${textId}: duplicate eng chunk anchors`);
  }
  for (const c of chunks) {
    const next = sortedAnchors.find((a) => a > c.from);
    c.to = next === undefined ? maxLine : next - 1;
    if (c.to < c.from) {
      throw new Error(`eng chunk anchored at ${c.from} has inverted range`);
    }
  }

  // Coverage check (set-based): every Greek line must fall inside exactly
  // one chunk — holds even with transposed document order.
  const coverCount = new Array(maxLine + 1).fill(0);
  for (const c of chunks) {
    for (let n = c.from; n <= c.to; n++) coverCount[n]++;
  }
  for (const line of grcLines) {
    if (coverCount[line.n] !== 1) {
      throw new Error(
        `eng translation covers grc line ${line.n} ${coverCount[line.n]} times (expected exactly 1)`
      );
    }
  }
  return chunks;
}

function writeIfChanged(file, data) {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

let written = 0;
for (const text of registry.texts) {
  const dir = path.join(TEXTS_DIR, text.id);
  const editions = Object.fromEntries(text.editions.map((e) => [e.lang, e]));
  if (!editions.grc || !editions.eng) {
    throw new Error(`${text.id}: both grc and eng editions are required`);
  }
  const grcXml = fs.readFileSync(path.join(dir, editions.grc.file), 'utf8');
  const engXml = fs.readFileSync(path.join(dir, editions.eng.file), 'utf8');

  const lines = parseGreek(grcXml, text.lineCount);
  const chunks = parseEnglish(engXml, lines, text.id);

  const grcOut = path.join(dir, 'grc.json');
  const engOut = path.join(dir, 'eng.json');
  if (writeIfChanged(grcOut, { lang: 'grc', lines })) written++;
  if (writeIfChanged(engOut, { lang: 'eng', chunks })) written++;
  console.log(`  ${text.id}: ${lines.length} grc lines, ${chunks.length} eng chunks — OK`);
}

console.log(`Texts corpus: ${written} file(s) written.`);
