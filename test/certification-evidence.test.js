/**
 * PÚNYCODEX — Certification & Standards Evidence Tests (Phase 18)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Certification Evidence Tests\n');
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
  console.log(`\nCertification Evidence: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

function fileMustExist(relativePath) {
  const full = path.join(ROOT, relativePath);
  assert.ok(fs.existsSync(full), `missing ${relativePath}`);
  return full;
}

test('IDN homograph mitigation memo exists', () => {
  const p = fileMustExist('docs/standards/idn-homograph-mitigation-memo.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('homograph'));
  assert.ok(content.includes('PUNYCODEX'));
});

test('Unicode ICU proposal exists', () => {
  const p = fileMustExist('docs/standards/unicode-icu-proposal.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('USpoofCheckResult') || content.includes('ICU'));
});

test('W3C WebAppSec proposal exists', () => {
  const p = fileMustExist('docs/standards/webappsec-proposal.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('WebAppSec') || content.includes('IDNDisplayPolicy'));
});

test('ICANN SSAC consultation response exists', () => {
  const p = fileMustExist('docs/standards/icann-ssac-response.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('ICANN') || content.includes('SSAC'));
});

test('SOC 2 control mapping exists and references evidence', () => {
  const p = fileMustExist('docs/standards/soc2-mapping.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('SOC 2'));
  assert.ok(content.includes('Evidence'));
  assert.ok(content.includes('platform/api/audit-log.js'));
});

test('ISO 27001 control mapping exists', () => {
  const p = fileMustExist('docs/standards/iso27001-mapping.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('ISO'));
  assert.ok(content.includes('27001'));
  assert.ok(content.includes('A.5'));
});

test('STIX export module exists and exports functions', () => {
  const stix = require('../platform/api/stix-export.js');
  assert.strictEqual(typeof stix.exportThreatFeed, 'function');
  assert.strictEqual(typeof stix.exportBlockedInputs, 'function');
  assert.strictEqual(typeof stix.exportRelationships, 'function');
  assert.strictEqual(typeof stix.exportAll, 'function');
});

test('Reproducible build script exists', () => {
  fileMustExist('scripts/reproducible-build.sh');
});

test('Evidence package checklist contains all required items', () => {
  const p = fileMustExist('docs/standards/soc2-mapping.md');
  const content = fs.readFileSync(p, 'utf8');
  const required = [
    'access review',
    'hash-chain',
    'Red-team',
    'Penetration',
    'STIX',
    'False-positive',
    'Runbook',
  ];
  for (const item of required) {
    assert.ok(
      content.toLowerCase().includes(item.toLowerCase()),
      `missing checklist item: ${item}`
    );
  }
});

runSuite();
