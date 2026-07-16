#!/usr/bin/env node
/**
 * Read-only validator for Scholarly Edition content files.
 *
 * Usage: node scripts/validate-scholars-sections.js <templeId...>
 *
 * Performs NO writes — safe for concurrent use by swarm agents. Checks each
 * temple's platform/scholars/content/{id}.json against the CONTENT-RUBRIC
 * floors: section presence, body length, citation well-formedness, [^n]
 * marker integrity, crosslink resolution, and placeholder text. Exits 1 on
 * any hard failure; prints WARN lines for thin sections (advisory).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { generateBlankManifest } = require(path.join(ROOT, 'platform', 'scholars', 'taxonomy.js'));

const META_KEYS = new Set(['edit-history', 'attribution']);
const PLACEHOLDER_RE = /awaiting contribution|TODO|TBD|FIXME|lorem ipsum|\{\{/i;
const CITATION_RE = /\[\^(\d+)\]/g;
const CROSSLINK_RE = /\]\(\/sites\/([a-z0-9-]+)\//g;
const HARD_FLOOR = 250;
const THIN_FLOOR = 600;

const LEXICON_IDS = new Set(LEXICON.map((e) => e.id));

let hardFailures = 0;
let thinWarnings = 0;
const failures = [];
const warnings = [];

for (const id of process.argv.slice(2)) {
  const file = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  if (!fs.existsSync(file)) {
    failures.push(`${id}: content file missing`);
    hardFailures += 1;
    continue;
  }
  let content;
  try {
    content = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${id}: invalid JSON — ${err.message}`);
    hardFailures += 1;
    continue;
  }
  if (!content.sections || typeof content.sections !== 'object') {
    failures.push(`${id}: missing sections object`);
    hardFailures += 1;
    continue;
  }

  const manifest = generateBlankManifest(id);
  const expectedKeys = manifest.sections.map((s) => s.key).filter((k) => !META_KEYS.has(k));
  let thin = 0;

  for (const key of expectedKeys) {
    const section = content.sections[key];
    if (!section || typeof section.body !== 'string' || section.body.trim() === '') {
      failures.push(`${id}:${key}: section missing or empty`);
      hardFailures += 1;
      continue;
    }
    const body = section.body;
    if (body.length < HARD_FLOOR) {
      failures.push(`${id}:${key}: body ${body.length} chars < hard floor ${HARD_FLOOR}`);
      hardFailures += 1;
    } else if (body.length < THIN_FLOOR) {
      warnings.push(`${id}:${key}: thin — ${body.length} chars (< ${THIN_FLOOR})`);
      thin += 1;
      thinWarnings += 1;
    }
    if (PLACEHOLDER_RE.test(body)) {
      failures.push(`${id}:${key}: placeholder text`);
      hardFailures += 1;
    }

    const sources = Array.isArray(section.sources) ? section.sources : [];
    if (sources.length === 0) {
      failures.push(`${id}:${key}: no sources`);
      hardFailures += 1;
    }
    sources.forEach((source, index) => {
      const citation = source && source.citation;
      if (
        typeof citation !== 'string' ||
        citation.length < 5 ||
        !/\p{L}/u.test(citation) ||
        citation.includes('[object Object]')
      ) {
        failures.push(`${id}:${key}: source ${index} malformed (${JSON.stringify(citation)})`);
        hardFailures += 1;
      }
      if (source && source.url !== undefined && typeof source.url !== 'string') {
        failures.push(`${id}:${key}: source ${index} url not a string`);
        hardFailures += 1;
      }
    });

    for (const match of body.matchAll(CITATION_RE)) {
      const n = Number(match[1]);
      if (n < 1 || n > sources.length) {
        failures.push(`${id}:${key}: marker [^${n}] out of range (sources: ${sources.length})`);
        hardFailures += 1;
      }
    }
    for (const match of body.matchAll(CROSSLINK_RE)) {
      if (!LEXICON_IDS.has(match[1])) {
        failures.push(`${id}:${key}: crosslink to unknown temple /sites/${match[1]}/`);
        hardFailures += 1;
      }
    }
  }

  const total = expectedKeys.length;
  if (!failures.some((f) => f.startsWith(`${id}:`))) {
    console.log(`✓ ${id} (${total} sections${thin ? `, ${thin} thin` : ''})`);
  } else {
    console.log(`✗ ${id} (${total} sections)`);
  }
}

for (const warning of warnings) console.log(`  WARN ${warning}`);
for (const failure of failures) console.log(`  FAIL ${failure}`);
console.log(
  `\n${process.argv.length - 2} temples checked — ${hardFailures} hard failure(s), ${thinWarnings} thin warning(s)`
);
process.exit(hardFailures > 0 ? 1 : 0);
