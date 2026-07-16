#!/usr/bin/env node
/**
 * Generate platform/scholars/taxonomy-data.js from the canonical taxonomy
 * registry (docs/scholarly-edition/scholarly-section-taxonomy-v0.1.json).
 *
 * Why this exists: Vercel's function bundler does not include runtime
 * fs.readFileSync targets (nor JSON requires outside its traced set), so the
 * taxonomy JSON was absent from the API bundle and
 * /api/v1/scholars/temples/:id/manifest 500'd. A plain .js module is always
 * bundled with the function's require graph, making the taxonomy available
 * in every environment.
 *
 * GENERATED FILE — platform/scholars/taxonomy-data.js is a build artifact;
 * edit the canonical docs/scholarly-edition JSON instead.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs', 'scholarly-edition', 'scholarly-section-taxonomy-v0.1.json');
const TARGET = path.join(ROOT, 'platform', 'scholars', 'taxonomy-data.js');

function main() {
  const taxonomy = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const output = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Canonical source: docs/scholarly-edition/scholarly-section-taxonomy-v0.1.json
 * Regenerate with: node scripts/generate-scholars-taxonomy.js
 */
module.exports = ${JSON.stringify(taxonomy, null, 2)};
`;
  let existing = null;
  try {
    existing = fs.readFileSync(TARGET, 'utf8');
  } catch {
    existing = null;
  }
  if (existing === output) {
    console.log('Scholars taxonomy data already in sync.');
    return;
  }
  fs.writeFileSync(TARGET, output);
  console.log(`Generated ${path.relative(ROOT, TARGET)} from canonical taxonomy v${taxonomy.version}.`);
}

main();
