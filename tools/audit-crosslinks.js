/**
 * Crosslink omission audit: for each content source, count mentions of OTHER
 * lexicon entries (Unicode form, or safe ASCII form) that appear in prose
 * WITHOUT a wikilink marker [[id|...]] or markdown link around them.
 * Sample-based estimate of the unlinked-mention rate per source.
 */
const fs = require('node:fs');
const { LEXICON } = require('../type/js/lexicon.js');

const entries = Array.isArray(LEXICON) ? LEXICON : LEXICON.entries;
const byId = new Map(entries.map((e) => [e.id, e]));

// ASCII names that collide with common English words — excluded from counting
// (they would false-positive constantly).
const AMBIGUOUS = new Set([
  'asia', 'nike', 'atlas', 'rhea', 'hera', 'io', 'ma', 'ba', 'ge', 'ea', 'ab',
  'anu', 'su', 'ki', 'utu', 'ai', 'meme', 'maat', 'kore', 'ra', 'sol', 'shango',
  'mot', 'day', 'ker', 'achilles', 'cain', 'abel', 'noah', 'moses', 'david',
  'solomon', 'delos', 'kobe', 'osaka', 'kyoto', 'long', 'bagua', 'wuji', 'ge',
]);

function buildMatchers(selfId) {
  const list = [];
  for (const e of entries) {
    if (e.id === selfId) continue;
    if (e.unicode && e.unicode !== e.ascii && e.unicode.length >= 2) {
      list.push({ id: e.id, form: e.unicode, kind: 'unicode' });
    }
    if (
      e.ascii &&
      e.ascii.length >= 5 &&
      !AMBIGUOUS.has(e.ascii) &&
      /^[a-z][a-z-]+$/.test(e.ascii)
    ) {
      list.push({ id: e.id, form: e.ascii, kind: 'ascii' });
    }
  }
  return list;
}

function stripLinkedRegions(text) {
  // Remove wikilink markers, markdown links, and raw URLs — mentions inside
  // those are already linked.
  return text
    .replace(/\[\[[a-z0-9-]+\|[^\]]+\]\]/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
}

function countUnlinked(text, matchers) {
  const plain = stripLinkedRegions(text);
  let hits = 0;
  const byEntry = new Set();
  for (const { id, form, kind } of matchers) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re =
      kind === 'ascii'
        ? new RegExp(`\\b${escaped}\\b`, 'g') // ASCII: case-sensitive whole word
        : new RegExp(escaped, 'g'); // unicode forms are diacritic-marked, safe
    const m = plain.match(re);
    if (m) {
      hits += m.length;
      byEntry.add(id);
    }
  }
  return { hits, entries: byEntry.size };
}

function auditDir(dir, label, sampleEvery = 1) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .filter((_, i) => i % sampleEvery === 0);
  let totalHits = 0;
  let filesWith =0;
  const perEntry = new Map();
  for (const f of files) {
    const id = f.replace('.json', '');
    const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
    const text = JSON.stringify(j);
    const { hits, entries: n } = countUnlinked(text, buildMatchers(id));
    if (hits > 0) filesWith++;
    totalHits += hits;
    perEntry.set(id, n);
  }
  const avg = (totalHits / files.length).toFixed(1);
  console.log(
    `${label}: ${files.length} files — ~${totalHits} unlinked mentions (avg ${avg}/file)`
  );
  const top = [...perEntry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(
    `  pages with most distinct unlinked deities: ${top.map(([k, v]) => `${k}(${v})`).join(', ')}`
  );
}

auditDir('platform/blog/content', 'blog posts', 1);
auditDir('platform/scholars/content', 'scholars content', 4); // quarter sample
