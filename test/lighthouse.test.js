/**
 * PÚNYCODEX — Lighthouse threshold test.
 *
 * Reads the most recent summary JSON in docs/lighthouse/ and asserts every
 * sample page meets the minimum thresholds:
 *   performance >= 90, accessibility >= 90, best-practices >= 90, seo >= 90.
 *
 * Run: node --test test/lighthouse.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const REPORT_DIR = path.resolve(__dirname, '..', 'docs', 'lighthouse');
const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 90,
};

function findLatestSummary() {
  if (!fs.existsSync(REPORT_DIR)) return null;
  const files = fs
    .readdirSync(REPORT_DIR)
    .filter((f) => /^summary-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  return files.length > 0 ? path.join(REPORT_DIR, files[files.length - 1]) : null;
}

describe('Lighthouse sample thresholds', () => {
  it('meets the 90/90/90/90 targets on all sample pages', () => {
    const summaryPath = findLatestSummary();
    assert.ok(
      summaryPath,
      `No summary JSON found in ${REPORT_DIR}. Run scripts/run-lighthouse.js first.`
    );

    const results = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    assert.ok(Array.isArray(results) && results.length > 0, 'Summary JSON is empty or malformed.');

    const failures = [];
    for (const page of results) {
      for (const [category, min] of Object.entries(THRESHOLDS)) {
        const score = page[category];
        if (typeof score !== 'number' || score < min) {
          failures.push(`${page.slug}: ${category} = ${score} (need >= ${min})`);
        }
      }
    }

    if (failures.length > 0) {
      console.log('\nLighthouse threshold failures:');
      for (const f of failures) console.log(`  ✗ ${f}`);
      assert.fail(
        `${failures.length} sample page(s) missed the 90/90/90/90 thresholds. See docs/lighthouse/README.md for documented blockers.`
      );
    }
  });
});
