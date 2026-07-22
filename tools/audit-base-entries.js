#!/usr/bin/env node
/**
 * Base-entry dissection audit — flags the proven error classes across all
 * non-flagship lexicon entries for curated review. Report:
 * session-debug/base-entry-audit.json
 *
 * Classes (each learned from real mistakes this project shipped):
 *  1. dictionary artifacts in meaning (raw MW/dictionary dump tails)
 *  2. empty / placeholder / self-evident meanings
 *  3. cross-pantheon contamination candidates (meaning names an entry from a
 *     DIFFERENT tradition — homonym or wrong-entity risk)
 *  4. junk or missing sources (bare tokens not in the source catalog)
 *  5. tier mismatches vs the mechanical reclassification rule
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { SOURCE_CATALOG } = require(path.join(ROOT, 'type', 'js', 'source-catalog.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const flagshipIds = new Set(ARCHETYPES.map((a) => a.id));

const entries = Array.isArray(LEXICON) ? LEXICON : LEXICON.entries;
const baseEntries = entries.filter((e) => !flagshipIds.has(e.id));
const byId = new Map(entries.map((e) => [e.id, e]));
const catalogKeys = new Set(
  Object.keys(SOURCE_CATALOG.SOURCE_CATALOG || SOURCE_CATALOG.CATALOG || SOURCE_CATALOG)
);

const DICTIONARY_RE =
  /\bcf\.|\bib\.|\blit\.|q\.v\.|\s[ mfn]\.|see also|\(fr\.|comp\.|superl\.|\[?[A-Z][a-z]+\.\s*\d|Mb\.\s|Bh\.\s|W\.\s*;\s/;
const NAME_RE = /\b[A-Z][a-záéíóúāēīōū]{2,}\b/g;

const report = {
  generatedAt: new Date().toISOString(),
  totalBaseEntries: baseEntries.length,
  classes: {},
};

function flag(cls, id, detail) {
  (report.classes[cls] = report.classes[cls] || []).push({ id, detail });
}

// ── Class 1+2: meaning-field problems ──
for (const e of baseEntries) {
  const m = (e.meaning || '').trim();
  if (!m || m === '—' || m.length < 3) {
    flag('meaning-empty', e.id, JSON.stringify(m));
    continue;
  }
  if (m === e.domain) {
    flag('meaning-equals-domain', e.id, m);
  }
  if (m.length > 120 || DICTIONARY_RE.test(m)) {
    flag('meaning-dictionary-artifact', e.id, m.slice(0, 140));
  }
}

// ── Class 3: cross-pantheon contamination candidates ──
for (const e of baseEntries) {
  const m = e.meaning || '';
  const names = m.match(NAME_RE) || [];
  for (const name of names) {
    for (const [otherId, other] of byId) {
      if (otherId === e.id) continue;
      if (
        (other.ascii && other.ascii.toLowerCase() === name.toLowerCase()) ||
        other.unicode === name
      ) {
        if (other.pantheon !== e.pantheon) {
          flag(
            'cross-pantheon-name',
            e.id,
            `"${name}" in meaning references ${otherId} (${other.pantheon}) — entry is ${e.pantheon}`
          );
        }
        break;
      }
    }
  }
}

// ── Class 4: sources ──
const JUNK_SOURCE_RE = /wikipedia|world bank|google|fandom|wiki\b/i;
for (const e of baseEntries) {
  if (!Array.isArray(e.sources) || e.sources.length === 0) {
    flag('sources-empty', e.id, 'no sources');
    continue;
  }
  for (const s of e.sources) {
    if (JUNK_SOURCE_RE.test(s)) flag('sources-junk', e.id, s);
    else if (catalogKeys.size > 0 && !catalogKeys.has(s)) {
      // Bare token not in the catalog — candidate, not necessarily wrong.
      flag('sources-uncatalogued', e.id, s);
    }
  }
}

// ── Class 5: tier mismatches vs the mechanical rule ──
const STRESS_RE = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛāēīōūĀĒĪŌŪήώἦἇἤὦ]/;
const LENGTH_RE = /[āēīōūĀĒĪŌŪḗṓêôûâÊÔÛÂ]/;
const ATOMIC_RE = /[þðæœšḍṭḥṛꜣꜥǫṅṣẓṯẖ]/;
const KEEP_TIER1 = new Set(['asia', 'rhea', 'atlas']);
for (const e of baseEntries) {
  const u = e.unicode || '';
  const a = e.ascii || '';
  if (KEEP_TIER1.has(e.id)) continue;
  const isGreek = e.pantheon === 'greek' || e.pantheon === 'greek-location';
  let expected;
  if (isGreek) {
    const greek = e.greek || '';
    const hasStress = /[άέήίόύώἆἇῆἦὦἶ]/i.test(greek) || /[́͂]/.test(greek);
    const hasLength = /[ηωῃῳᾳ]/.test(greek) || /[ᾱῑῡ]/.test(greek);
    expected = hasStress && hasLength ? '1' : '2';
  } else {
    const distinctive =
      u !== a && (STRESS_RE.test(u) || LENGTH_RE.test(u) || ATOMIC_RE.test(u));
    expected = distinctive ? '1' : '2';
  }
  if (e.tier !== 'dual' && e.tier !== expected) {
    flag('tier-mismatch', e.id, `tier=${e.tier}, mechanical=${expected}, unicode=${u}`);
  }
}

// Summary + write
let total = 0;
for (const [cls, items] of Object.entries(report.classes)) {
  total += items.length;
  console.log(`${cls}: ${items.length}`);
}
console.log(`total candidates: ${total} across ${baseEntries.length} base entries`);

fs.mkdirSync(path.join(ROOT, 'session-debug'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'session-debug', 'base-entry-audit.json'),
  JSON.stringify(report, null, 2)
);
console.log('report: session-debug/base-entry-audit.json');
