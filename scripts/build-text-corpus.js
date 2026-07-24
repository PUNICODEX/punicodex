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
 * line it begins at (<l n="N">); a chunk covers [n, nextChunkN - 1].
 *
 * Idempotent: output is byte-stable for unchanged inputs. Fails loudly on
 * numbering gaps — a corrupted TEI must never ship silently.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'platform', 'texts');
const registry = require(path.join(TEXTS_DIR, 'registry.json'));

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

function parseEnglish(xml, grcLines) {
  const chunks = [];
  const re = /<l n="(\d+)">([\s\S]*?)<\/l>/g;
  let m;
  while ((m = re.exec(xml))) {
    const text = stripTags(m[2]);
    if (text) chunks.push({ from: Number(m[1]), text });
  }
  chunks.sort((a, b) => a.from - b.from);
  const maxLine = grcLines[grcLines.length - 1].n;
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].to = i + 1 < chunks.length ? chunks[i + 1].from - 1 : maxLine;
    if (chunks[i].to < chunks[i].from) {
      throw new Error(`eng chunk anchored at ${chunks[i].from} has inverted range`);
    }
  }
  // Coverage check: every Greek line must fall inside exactly one chunk.
  let cursor = 0;
  for (const line of grcLines) {
    while (cursor < chunks.length && line.n > chunks[cursor].to) cursor++;
    if (cursor >= chunks.length || line.n < chunks[cursor].from) {
      throw new Error(`eng translation does not cover grc line ${line.n}`);
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
  const chunks = parseEnglish(engXml, lines);

  const grcOut = path.join(dir, 'grc.json');
  const engOut = path.join(dir, 'eng.json');
  if (writeIfChanged(grcOut, { lang: 'grc', lines })) written++;
  if (writeIfChanged(engOut, { lang: 'eng', chunks })) written++;
  console.log(`  ${text.id}: ${lines.length} grc lines, ${chunks.length} eng chunks — OK`);
}

console.log(`Texts corpus: ${written} file(s) written.`);
