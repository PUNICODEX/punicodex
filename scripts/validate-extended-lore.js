#!/usr/bin/env node
/**
 * Read-only validator for flagship extended-lore pages.
 *
 * Usage: node scripts/validate-extended-lore.js <templeId...>
 *
 * Performs NO writes — safe for concurrent use by swarm agents. Checks each
 * sites/{id}/lore/extended/index.html against docs/EXTENDED-LORE-RUBRIC.md:
 * chrome integrity (injected markers, nav, closing html), section count,
 * visible-prose volume, placeholder text, and /sites/ crosslink resolution.
 * Exits 1 on any hard failure; WARN lines are advisory.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const LEXICON_IDS = new Set(LEXICON.map((e) => e.id));

const PLACEHOLDER_RE = /awaiting contribution|TODO|TBD|FIXME|lorem ipsum|\{\{/i;
const CROSSLINK_RE = /href="\/sites\/([a-z0-9-]+)\//g;
const HARD_PROSE_FLOOR = 4000;
const WARN_PROSE_FLOOR = 6000;
const MIN_SECTIONS = 6;

let hardFailures = 0;
let warnCount = 0;
const failures = [];
const warnings = [];

for (const id of process.argv.slice(2)) {
  const file = path.join(ROOT, 'sites', id, 'lore', 'extended', 'index.html');
  if (!fs.existsSync(file)) {
    failures.push(`${id}: extended lore page missing`);
    hardFailures += 1;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  const checks = [
    ['<!-- PUNYCODEX-ANALYTICS-START -->', 'analytics start marker'],
    ['<!-- PUNYCODEX-ANALYTICS-END -->', 'analytics end marker'],
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

  const sectionCount = (html.match(/<section[\s>]/g) || []).length;
  if (sectionCount < MIN_SECTIONS) {
    failures.push(`${id}: only ${sectionCount} sections (< ${MIN_SECTIONS})`);
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

  if (PLACEHOLDER_RE.test(html)) {
    failures.push(`${id}: placeholder text`);
    hardFailures += 1;
  }

  for (const match of html.matchAll(CROSSLINK_RE)) {
    if (!LEXICON_IDS.has(match[1])) {
      failures.push(`${id}: crosslink to unknown temple /sites/${match[1]}/`);
      hardFailures += 1;
    }
  }

  if (!failures.some((f) => f.startsWith(`${id}:`))) {
    console.log(`✓ ${id} (${sectionCount} sections, ${prose.length} prose chars)`);
  } else {
    console.log(`✗ ${id}`);
  }
}

for (const warning of warnings) console.log(`  WARN ${warning}`);
for (const failure of failures) console.log(`  FAIL ${failure}`);
console.log(
  `\n${process.argv.length - 2} extended pages checked — ${hardFailures} hard failure(s), ${warnCount} warning(s)`
);
process.exit(hardFailures > 0 ? 1 : 0);
