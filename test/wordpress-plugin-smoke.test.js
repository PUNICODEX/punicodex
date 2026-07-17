/**
 * PuniCodex — WordPress Plugin Smoke Tests (Phase 19)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PLUGIN_DIR = path.join(ROOT, 'sdk', 'wordpress');
const MAIN_FILE = path.join(PLUGIN_DIR, 'punicodex-authenticity.php');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ WordPress Plugin Smoke Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nWordPress Plugin Smoke: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('plugin main file exists', () => {
  assert.ok(fs.existsSync(MAIN_FILE), 'main plugin file missing');
});

test('plugin header contains required metadata', () => {
  const content = fs.readFileSync(MAIN_FILE, 'utf8');
  assert.ok(content.includes('Plugin Name: PUNICODEX Authenticity Shield'));
  assert.ok(content.includes('Version: 1.0.0'));
  assert.ok(content.includes('License: ISC'));
  assert.ok(content.includes('Text Domain: punicodex-authenticity'));
});

test('plugin defines version constant', () => {
  const content = fs.readFileSync(MAIN_FILE, 'utf8');
  assert.ok(content.includes("define('PUNICODEX_AUTH_VERSION'"));
  assert.ok(content.includes("define('PUNICODEX_AUTH_API_URL'"));
});

test('plugin registers hooks', () => {
  const content = fs.readFileSync(MAIN_FILE, 'utf8');
  assert.ok(content.includes("add_action('enqueue_block_editor_assets'"));
  assert.ok(content.includes("add_action('transition_post_status'"));
  assert.ok(content.includes("add_action('admin_menu'"));
});

test('readme files exist', () => {
  assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'readme.txt')), 'readme.txt missing');
  assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'readme.md')), 'readme.md missing');
});

test('readme.txt contains WordPress.org headers', () => {
  const content = fs.readFileSync(path.join(PLUGIN_DIR, 'readme.txt'), 'utf8');
  assert.ok(content.includes('=== PUNICODEX Authenticity Shield ==='));
  assert.ok(content.includes('Stable tag:'));
  assert.ok(content.includes('Requires PHP:'));
});

runSuite();
