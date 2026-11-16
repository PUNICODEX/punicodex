#!/usr/bin/env node
/**
 * Fill-only-short blog description enricher.
 * Canonical blog content (platform/blog/content/{id}.json) is hand-editable;
 * this script ONLY touches posts whose description is under MIN chars, and
 * appends a data-driven second sentence built from the lexicon (meaning,
 * domain, pantheon, original script) — never overwriting an editor's work.
 * Run: node scripts/enrich-blog-descriptions.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIN = 90;
const MAX = 158;

const { LEXICON } = require(path.join(ROOT, 'type/js/lexicon.js'));
const byId = new Map(LEXICON.map((e) => [e.id, e]));

const dir = path.join(ROOT, 'platform', 'blog', 'content');
const dryRun = process.argv.includes('--dry-run');
let touched = 0;
let skipped = 0;

function scriptName(e) {
  const g = e.greek;
  if (g && g !== '—') return 'Greek';
  const p = (e.pantheon || '').toLowerCase();
  const map = {
    egyptian: 'Egyptian hieroglyphs',
    hindu: 'Devanagari',
    'chinese+taoist': 'Chinese characters',
    norse: 'the runes',
    canaanite: 'Phoenician',
    mesopotamian: 'cuneiform',
  };
  return map[p] || null;
}

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const post = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const desc = post.description || '';
  if (desc.length >= MIN) { skipped++; continue; }
  const e = byId.get(post.entryId);
  if (!e) { skipped++; continue; }

  const capP = (e.pantheon || '').replace(/\b\w/g, (c) => c.toUpperCase());
  // Clean meaning: first clause only (stop at —, comma-paren, or sentence
  // end), hard-capped, so the quote always closes.
  let cleanM = null;
  if (e.meaning) {
    let m = e.meaning.split(/(?<=[.!?])\s/)[0].split(/\s[—–(]/)[0].replace(/\s+/g, ' ').trim();
    if (m.length > 48) m = m.slice(0, 48).replace(/\s+\S*$/, '');
    m = m.replace(/^[''"]+|[''"]+$/g, '').replace(/\.+$/, '').trim();
    if (m.length >= 3) cleanM = m;
  }
  const dFirst = e.domain ? e.domain.split(',')[0].trim().toLowerCase() : '';

  const candidates = [];
  if (cleanM) candidates.push(`The name means “${cleanM}”.`);
  if (dFirst && capP) candidates.push(`${e.unicode} stands for ${dFirst} in the ${capP} tradition.`);
  if (capP) candidates.push(`The ${capP} tradition behind the name, restored with evidence.`);
  const balanced = (s) =>
    (s.match(/“/g) || []).length === (s.match(/”/g) || []).length &&
    (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length &&
    !/\b(the|a|an|of|to|in|and|or|from|with|for)\s*[.)”"]?$/.test(s);

  let next = null;
  for (const c of candidates) {
    const cand = `${desc.replace(/\.$/, '')}. ${c}`;
    if (cand.length <= MAX && balanced(cand)) { next = cand; break; }
  }
  if (!next) { skipped++; continue; }

  if (dryRun) {
    console.log(`${post.entryId} (${desc.length}→${next.length}): ${next}`);
    touched++;
    continue;
  }
  post.description = next;
  fs.writeFileSync(path.join(dir, file), JSON.stringify(post, null, 2) + '\n');
  touched++;
}

console.log(`\n${dryRun ? '[dry-run] ' : ''}enriched: ${touched}, left alone: ${skipped}`);
