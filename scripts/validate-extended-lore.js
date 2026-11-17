#!/usr/bin/env node
/**
 * Read-only validator for flagship extended-lore pages (post-rebuild rubric).
 *
 * Usage: node scripts/validate-extended-lore.js [templeId...]
 *
 * With no ids, validates every built flagship. Performs NO writes — safe for
 * concurrent use by swarm agents. Checks each sites/{id}/lore/extended/index.html
 * against docs/EXTENDED-LORE-RUBRIC.md:
 *   - chrome integrity (injected markers, nav, closing html)
 *   - section floor: ≥5 of the 7 CORE sections present (data-driven sections
 *     counted when present)
 *   - visible-prose volume (3,000 hard floor / 5,000 target)
 *   - placeholder text
 *   - /sites/ crosslink resolution
 *   - dead-end guard: ≥4 distinct onward links to other temple surfaces
 *   - duplication guard: no 12-word run shared with the temple's own
 *     lore/index.html (FAQ + At a Glance regions vs lore page, chrome stripped)
 * Exits 1 on any hard failure; WARN lines are advisory.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const LEXICON_IDS = new Set(LEXICON.map((e) => e.id));

// Uppercase editor tags are placeholders; the prose phrases (checked
// case-insensitively via PHRASE_RE) and unrendered template braces too.
const UPPER_TAG_RE = /\b(?:TODO|TBD|FIXME)\b/;
const PHRASE_RE = /awaiting contribution|lorem ipsum/i;
const CROSSLINK_RE = /href="\/sites\/([a-z0-9-]+)\//g;
const ONWARD_RE = /href="\/(?:sites\/)?([a-z0-9-]+)\/([a-z-]+\/)?/g;
const HARD_PROSE_FLOOR = 3000;
const WARN_PROSE_FLOOR = 5000;
const MIN_CORE_SECTIONS = 5;
const MIN_ONWARD_LINKS = 4;
const SHINGLE_WORDS = 12;
const MAX_RUN_EXAMPLES = 3;

// CORE sections (rubric §1a). Ids are matched loosely so both the pre-rebuild
// ids (unicode-breakdown) and the rebuilt ones (character-breakdown, at-a-glance)
// are recognized.
const CORE_SECTIONS = [
  { key: 'etymology', re: /(^|[^a-z])etymology([^a-z]|$)/ },
  { key: 'character-breakdown', re: /character-breakdown|unicode-breakdown/ },
  { key: 'cult', re: /(^|[^a-z])cult([^a-z]|$)/ },
  { key: 'iconography', re: /iconography/ },
  { key: 'reception', re: /reception/ },
  { key: 'meditation', re: /meditation/ },
  { key: 'sources', re: /(^|[^a-z])sources([^a-z]|$)/ },
];

// Data-driven sections — counted when present, never required.
const DATA_SECTIONS = [
  { key: 'parallels-equivalents', re: /parallel|equivalent|syncretism/ },
  { key: 'modern-world', re: /modern|legacy|cultural-significance/ },
  { key: 'places', re: /places|toponym|place-names/ },
  { key: 'original-script-note', re: /script-note|original-script/ },
];

function collectSectionIds(html) {
  const ids = [];
  for (const m of html.matchAll(/<section[^>]*?\sid="([^"]+)"/g)) ids.push(m[1]);
  return ids;
}

function matchSections(ids, table) {
  return table
    .filter((s) => ids.some((id) => s.re.test(id)))
    .map((s) => s.key);
}

// Duplication-guard text pipeline: strip script/style, nav, footer (incl. the
// tf-hub columns), and comments, then reduce to normalized word tokens.
function toWords(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/g, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/g, ' ')
    .replace(/<(cite|q|blockquote)[\s\S]*?<\/\1>/g, ' ')
    // Quoted primary-source lines and title citations are legitimate shared
    // material (scholarly convention) — exclude from duplication comparison.
    .replace(/[“"]([^“”"]{12,})[”"]/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function shingleSet(words, n) {
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

// Extract one <section> block by id regex (sections do not nest).
function extractSection(html, idRe) {
  const m = html.match(
    new RegExp(`<section[^>]*\\bid="${idRe.source}"[^>]*>[\\s\\S]*?<\\/section>`, 'i'),
  );
  return m ? m[0] : null;
}

// Maximal runs of consecutive matching shingles, as readable word strings.
function findDuplicatedRuns(words, against, n) {
  const runs = [];
  let start = -1;
  for (let i = 0; i + n <= words.length; i++) {
    const hit = against.has(words.slice(i, i + n).join(' '));
    if (hit && start === -1) start = i;
    if (!hit && start !== -1) {
      runs.push(words.slice(start, i + n - 1).join(' '));
      start = -1;
    }
  }
  if (start !== -1) runs.push(words.slice(start).join(' '));
  return runs;
}

let hardFailures = 0;
let warnCount = 0;
const failures = [];
const warnings = [];

const argvIds = process.argv.slice(2);
const ids = argvIds.length
  ? argvIds
  : ARCHETYPES.filter((a) => a.built).map((a) => a.id);

let dupRunTotal = 0;

for (const id of ids) {
  const file = path.join(ROOT, 'sites', id, 'lore', 'extended', 'index.html');
  if (!fs.existsSync(file)) {
    failures.push(`${id}: extended lore page missing`);
    hardFailures += 1;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const idFailuresBefore = failures.length;

  const checks = [
    ['<!-- PUNICODEX-ANALYTICS-START -->', 'analytics start marker'],
    ['<!-- PUNICODEX-ANALYTICS-END -->', 'analytics end marker'],
    ['analytics-beacon.js', 'beacon script'],
    ['</html>', 'closing html'],
    ['nav-link', 'nav links'],
  ];
  for (const [needle, label] of checks) {
    if (!html.includes(needle)) {
      failures.push(`${id}: missing ${label}`);
      hardFailures += 1;
    }
  }

  const sectionIds = collectSectionIds(html);
  const core = matchSections(sectionIds, CORE_SECTIONS);
  const data = matchSections(sectionIds, DATA_SECTIONS);
  if (core.length < MIN_CORE_SECTIONS) {
    failures.push(
      `${id}: only ${core.length}/${CORE_SECTIONS.length} core sections (${core.join(', ') || 'none'}) < ${MIN_CORE_SECTIONS}`,
    );
    hardFailures += 1;
  }

  const prose = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (prose.length < HARD_PROSE_FLOOR) {
    failures.push(`${id}: visible prose ${prose.length} chars < ${HARD_PROSE_FLOOR}`);
    hardFailures += 1;
  } else if (prose.length < WARN_PROSE_FLOOR) {
    warnings.push(`${id}: prose ${prose.length} chars (< ${WARN_PROSE_FLOOR})`);
    warnCount += 1;
  }

  if (UPPER_TAG_RE.test(html) || PHRASE_RE.test(html) || html.includes('{{')) {
    failures.push(`${id}: placeholder text`);
    hardFailures += 1;
  }

  for (const match of html.matchAll(CROSSLINK_RE)) {
    if (!LEXICON_IDS.has(match[1])) {
      failures.push(`${id}: crosslink to unknown temple /sites/${match[1]}/`);
      hardFailures += 1;
    }
  }

  // Dead-end guard: the extended page must link onward to ≥4 surfaces of its
  // OWN temple (the Explore strip exists for exactly this).
  const onward = new Set();
  for (const match of html.matchAll(ONWARD_RE)) {
    if (match[1] === id) onward.add(match[2] || 'home');
  }
  if (onward.size < MIN_ONWARD_LINKS) {
    failures.push(
      `${id}: dead end — only ${onward.size} onward surface(s) of its own temple (${[...onward].join(', ') || 'none'}) < ${MIN_ONWARD_LINKS}`,
    );
    hardFailures += 1;
  }

  // Duplication guard: FAQ + At a Glance regions must not share any 12-word
  // run with the temple's own lore page (chrome stripped on both sides).
  const loreFile = path.join(ROOT, 'sites', id, 'lore', 'index.html');
  if (!fs.existsSync(loreFile)) {
    warnings.push(`${id}: lore/index.html missing — duplication guard skipped`);
    warnCount += 1;
  } else {
    const loreWords = toWords(fs.readFileSync(loreFile, 'utf8'));
    const loreShingles = shingleSet(loreWords, SHINGLE_WORDS);
    const regions = [
      ['At a Glance', extractSection(html, /at-a-glance|quick-facts/)],
      ['FAQ', extractSection(html, /faq/)],
    ];
    const dupFailsBefore = failures.length;
    for (const [label, regionHtml] of regions) {
      if (!regionHtml) continue;
      const runs = findDuplicatedRuns(toWords(regionHtml), loreShingles, SHINGLE_WORDS);
      if (runs.length) {
        dupRunTotal += runs.length;
        const examples = runs
          .slice(0, MAX_RUN_EXAMPLES)
          .map((r) => `"${r.length > 140 ? r.slice(0, 137) + '…' : r}"`)
          .join('; ');
        failures.push(
          `${id}: ${label} region shares ${runs.length} run(s) ≥${SHINGLE_WORDS} words with lore page, e.g. ${examples}`,
        );
      }
    }
    hardFailures += failures.length - dupFailsBefore;
  }

  if (failures.length === idFailuresBefore) {
    console.log(
      `✓ ${id} (${core.length} core + ${data.length} data sections, ${prose.length} prose chars, ${onward.size} onward links)`,
    );
  } else {
    console.log(`✗ ${id}`);
  }
}

for (const warning of warnings) console.log(`  WARN ${warning}`);
for (const failure of failures) console.log(`  FAIL ${failure}`);
console.log(
  `\n${ids.length} extended pages checked — ${hardFailures} hard failure(s), ${warnCount} warning(s), ${dupRunTotal} duplicated lore run(s)`,
);
process.exit(hardFailures > 0 ? 1 : 0);
