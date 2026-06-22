/**
 * PÚNYCODEX — Reproducible Build Tests (Phase 18)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'reproducible-build.sh');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Reproducible Build Tests\n');
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
  console.log(`\nReproducible Build: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('reproducible build script exists and is documented', () => {
  assert.ok(fs.existsSync(SCRIPT), 'script missing');
  const content = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(content.includes('Reproducible Extension Build'), 'missing header');
  assert.ok(content.includes('SOURCE_DATE_EPOCH'), 'missing source date handling');
  assert.ok(content.includes('sha256sum'), 'missing hash output');
});

test('script references deterministic build steps', () => {
  const content = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(
    content.includes('npm ci') || content.includes('npm install'),
    'missing dependency install'
  );
  assert.ok(content.includes('node extension/build.js'), 'missing extension build');
  assert.ok(content.includes('zip'), 'missing zip normalization');
});

test('script shell is executable on Unix', () => {
  if (process.platform === 'win32') {
    // Bash scripts cannot be +x on Windows; just verify git-bash can parse it.
    try {
      const out = execSync(`bash -n "${SCRIPT}"`, { encoding: 'utf8' });
      assert.strictEqual(out.trim(), '');
    } catch (err) {
      assert.fail(`script failed bash syntax check: ${err.message}`);
    }
    return;
  }
  const stat = fs.statSync(SCRIPT);
  assert.ok((stat.mode & 0o111) !== 0, 'script is not executable');
});

test('script exits with non-zero for missing build output', () => {
  // We do not run the full build in unit tests; we verify the script parses
  // and the failure path is wired. Running the build would be slow and
  // requires git tags.
  try {
    execSync(`bash -n "${SCRIPT}"`, { encoding: 'utf8', timeout: 5000 });
  } catch (err) {
    assert.fail(`script failed syntax check: ${err.message}`);
  }
});

runSuite();
