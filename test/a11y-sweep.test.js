/**
 * Accessibility structural sweep — zero-tolerance enforcement across every
 * public HTML page (15,000+ files, including all temples).
 *
 * Rules (WCAG-aligned, statically verifiable):
 *  1. <html lang> present
 *  2. non-empty <title>
 *  3. exactly one accessible <h1> (text, or img[alt]/svg/aria-label content)
 *  4. every <img> carries an alt attribute ("" permitted for decorative)
 *  5. every visible form control has a label, wrapping <label>, or aria name
 *  6. every <button> has an accessible name
 *  7. decorative <canvas> elements are aria-hidden (or carry role/aria-label)
 *
 * Source templates are excluded (they contain placeholders, not pages).
 * Also excluded by rule: corpus source archives under platform/texts/* /src/
 * (raw upstream captures — wayback snapshots and per-chapter source dumps
 * kept as provenance, never served as site pages) and Marketing/ (XHTML
 * email collateral, not a web page).
 * Calibrated clean 2026-07-22 after the fix-forward pass.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const cheerio = require('cheerio');

const files = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n')
  .filter(
    (f) =>
      f &&
      !f.includes('/.backup/') &&
      !f.startsWith('docs/') &&
      !f.startsWith('templates/') &&
      !/^platform\/texts\/[^/]+\/src\//.test(f) &&
      !f.startsWith('Marketing/')
  );

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').slice(0, 8).join('\n    ')}`);
  }
}

function run() {
  console.log(`\n▸ Accessibility Sweep (${files.length} pages)\n`);

  const missingLang = [];
  const emptyTitle = [];
  const badH1 = [];
  const altLessImage = [];
  const unlabeledControl = [];
  const unnamedButton = [];
  const unhandledCanvas = [];

  for (const file of files) {
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const $ = cheerio.load(html);

    if (missingLang.length < 6 && !$('html').attr('lang')) {
      missingLang.push(file);
    }

    if (emptyTitle.length < 6 && !$('title').first().text().trim()) {
      emptyTitle.push(file);
    }

    if (badH1.length < 6) {
      const h1s = $('h1').filter((_, el) => {
        const $el = $(el);
        if ($el.text().trim().length > 0) return true;
        return $el.find('img[alt], svg, [aria-label]').length > 0;
      });
      if (h1s.length !== 1) badH1.push(file);
    }

    if (altLessImage.length < 6) {
      let bad = false;
      $('img').each((_, el) => {
        if ($(el).attr('alt') === undefined) bad = true;
      });
      if (bad) altLessImage.push(file);
    }

    if (unlabeledControl.length < 6) {
      let bad = false;
      $('input, select, textarea').each((_, el) => {
        const $el = $(el);
        const type = ($el.attr('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button') return;
        if ($el.is('[aria-hidden="true"]')) return;
        const id = $el.attr('id');
        const hasLabel = id && $(`label[for="${id}"]`).length > 0;
        if (
          !hasLabel &&
          $el.closest('label').length === 0 &&
          !$el.attr('aria-label') &&
          !$el.attr('aria-labelledby')
        ) {
          bad = true;
        }
      });
      if (bad) unlabeledControl.push(file);
    }

    if (unnamedButton.length < 6) {
      let bad = false;
      $('button').each((_, el) => {
        const $el = $(el);
        if (
          !$el.text().trim() &&
          !$el.attr('aria-label') &&
          !$el.attr('aria-labelledby') &&
          !$el.attr('title')
        ) {
          bad = true;
        }
      });
      if (bad) unnamedButton.push(file);
    }

    if (unhandledCanvas.length < 6) {
      let bad = false;
      $('canvas').each((_, el) => {
        const $el = $(el);
        if ($el.attr('aria-hidden') !== 'true' && !$el.attr('aria-label') && !$el.attr('role')) {
          bad = true;
        }
      });
      if (bad) unhandledCanvas.push(file);
    }
  }

  test('every page declares <html lang>', () => {
    assert.deepStrictEqual(missingLang.slice(0, 5), [], `${missingLang.length} pages missing lang`);
  });

  test('every page has a non-empty <title>', () => {
    assert.deepStrictEqual(
      emptyTitle.slice(0, 5),
      [],
      `${emptyTitle.length} pages with empty title`
    );
  });

  test('every page has exactly one accessible <h1>', () => {
    assert.deepStrictEqual(badH1.slice(0, 5), [], `${badH1.length} pages with h1 count != 1`);
  });

  test('every <img> carries an alt attribute', () => {
    assert.deepStrictEqual(
      altLessImage.slice(0, 5),
      [],
      `${altLessImage.length} pages with alt-less images`
    );
  });

  test('every visible form control has an accessible name', () => {
    assert.deepStrictEqual(
      unlabeledControl.slice(0, 5),
      [],
      `${unlabeledControl.length} pages with unlabeled controls`
    );
  });

  test('every <button> has an accessible name', () => {
    assert.deepStrictEqual(
      unnamedButton.slice(0, 5),
      [],
      `${unnamedButton.length} pages with unnamed buttons`
    );
  });

  test('decorative <canvas> elements are aria-hidden (or labelled)', () => {
    assert.deepStrictEqual(
      unhandledCanvas.slice(0, 5),
      [],
      `${unhandledCanvas.length} pages with unhandled canvases`
    );
  });

  console.log(`\nAccessibility Sweep: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
