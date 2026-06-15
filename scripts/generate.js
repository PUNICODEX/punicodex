/**
 * PUNYCODEX — Master generator
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
 *   - middleware.js (DOMAIN_MAP)
 *   - sites/{id}/ base temples (skipped if they already exist)
 *
 * Usage: npm run generate
 */

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

const scripts = [
  'scripts/sync-shared-lexicon.js',
  'scripts/build-android-assets.js',
  'scripts/export-platform-lexicon.js',
  'scripts/sync-middleware-domains.js',
  'scripts/generate-temples.js',
];

function run(script) {
  const scriptPath = path.join(root, script);
  console.log(`\n▸ ${script}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${script} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  PÚNYCODEX — Generating all derived artifacts          ║');
console.log('╚════════════════════════════════════════════════════════╝');

for (const script of scripts) {
  run(script);
}

console.log('\n✓ All generated artifacts are in sync with canonical sources.');
