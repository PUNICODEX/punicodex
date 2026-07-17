/**
 * PUNICODEX — Master generator
 *
 * Orchestrates all source-to-output generation scripts so that a single
 * canonical change propagates to every consumer.
 *
 * Sources of truth:
 *   - type/js/lexicon.js
 *   - js/archetypes-v2.js
 *
 * Generated outputs:
 *   - extension/shared/lexicon.js
 *   - mobile/shared/lexicon.js
 *   - android/app/src/main/assets/shared/lexicon.json
 *   - android/app/src/main/assets/shared/keyboard-palette.json
 *   - platform/browser/renderer/lexicon.json
 *   - platform/api/cards.json + game/cards.json (card game set)
 *   - platform/api/similarities.json
 *   - platform/browser/renderer/similarities.json
 *   - js/owned-entries.js
 *   - middleware.js (DOMAIN_MAP)
 *   - sites/{id}/ base temples (skipped if they already exist)
 *   - sites/{id}/ flagship temples (regenerated if --regenerate-all)
 *
 * Usage: npm run generate
 */

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

const scripts = [
  'platform/generate-unicode-dir-v2.js',
  'scripts/sync-shared-lexicon.js',
  'scripts/sync-shared-engine.js',
  'scripts/build-android-assets.js',
  'scripts/export-platform-lexicon.js',
  'scripts/generate-similarities.js',
  'scripts/generate-industry-patterns.js',
  'scripts/generate-owned-entries.js',
  'scripts/export-codex-data.js',
  'scripts/build-original-script-lookup.js',
  'scripts/export-lore-catalog.js',
  'scripts/generate-cards.js',
  'scripts/sync-middleware-domains.js',
  'scripts/sync-public-copy.js',
  'scripts/generate-temples.js',
  'scripts/create-flagship.js --regenerate-all',
  // Must run AFTER create-flagship: flagship regeneration rewrites pages with
  // bare <img> markup, so the WebP/dimension enrichment only survives if applied last.
  'scripts/convert-images-to-webp.js',
  'scripts/generate-scholars-taxonomy.js',
  'scripts/generate-scholars-content.js',
  'scripts/generate-scholars-manifests.js',
  'scripts/generate-scholars.js',
  'scripts/generate-blog-content.js',
  'scripts/generate-blog-pages.js',
  'scripts/generate-blog-index.js',
  'scripts/sync-scholars-portal.js',
  'scripts/gen-sitemap.js',
  'scripts/inject-analytics.js',
  'scripts/inject-university-collaborators.js',
  'scripts/sync-admin-portal.js',
  'scripts/sync-mobile-menu.js',
  'scripts/update-data-version.js',
  'scripts/generate-synthetic-qa.js',
  'scripts/generate-safety-corpus.js',
  'scripts/generate-dialogue-corpus.js',
  'scripts/generate-tool-use-corpus.js',
  'scripts/generate-multimodal-corpus.js',
  'scripts/generate-preference-corpus.js',
  'scripts/generate-reasoning-corpus.js',
  'scripts/generate-benchmark-suite.js',
  'scripts/generate-mythology-synthesis-corpus.js',
  'scripts/generate-oracle-corpus.js',
  'scripts/generate-symbolic-corpus.js',
  'scripts/generate-scientific-analogies-corpus.js',
  'scripts/generate-pretrain-corpus.js',
  'scripts/generate-unified-corpus.js',
  'scripts/export-model-corpus.js',
  'scripts/generate-eval-benchmark.js',
  'scripts/generate-data-card.js',
];

function run(script) {
  const parts = script.split(/\s+/);
  const scriptPath = path.join(root, parts[0]);
  const args = parts.slice(1);
  console.log(`\n▸ ${script}`);
  const result = spawnSync(process.execPath, ['--max-old-space-size=8192', scriptPath, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${script} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  PuniCodex — Generating all derived artifacts          ║');
console.log('╚════════════════════════════════════════════════════════╝');

for (const script of scripts) {
  run(script);
}

console.log('\n✓ All generated artifacts are in sync with canonical sources.');
