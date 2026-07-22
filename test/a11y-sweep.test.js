/**
 * Accessibility structural sweep — zero-tolerance enforcement across every
 * public HTML page (3,400+ files, including all temples).
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
      !f.startsWith('templates/')
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

function violationsFor(ruleFn) {
  const out = [];
  for (const file of files) {
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const $ = cheerio.load(html);
    if (ruleFn($)) out.push(file);
  }
  return out;
}

function run() {
  console.log(`\n▸ Accessibility Sweep (${files.length} pages)\n`);

  test('every page declares <html lang>', () => {
    const v = violationsFor(($) => !$('html').attr('lang'));
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages missing lang`);
  });

  test('every page has a non-empty <title>', () => {
    const v = violationsFor(($) => !$('title').first().text().trim());
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with empty title`);
  });

  test('every page has exactly one accessible <h1>', () => {
    const v = violationsFor(($) => {
      const h1s = $('h1').filter((_, el) => {
        const $el = $(el);
        if ($el.text().trim().length > 0) return true;
        return $el.find('img[alt], svg, [aria-label]').length > 0;
      });
      return h1s.length !== 1;
    });
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with h1 count != 1`);
  });

  test('every <img> carries an alt attribute', () => {
    const v = violationsFor(($) => {
      let bad = false;
      $('img').each((_, el) => {
        if ($(el).attr('alt') === undefined) bad = true;
      });
      return bad;
    });
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with alt-less images`);
  });

  test('every visible form control has an accessible name', () => {
    const v = violationsFor(($) => {
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
      return bad;
    });
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with unlabeled controls`);
  });

  test('every <button> has an accessible name', () => {
    const v = violationsFor(($) => {
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
      return bad;
    });
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with unnamed buttons`);
  });

  test('decorative <canvas> elements are aria-hidden (or labelled)', () => {
    const v = violationsFor(($) => {
      let bad = false;
      $('canvas').each((_, el) => {
        const $el = $(el);
        if ($el.attr('aria-hidden') !== 'true' && !$el.attr('aria-label') && !$el.attr('role')) {
          bad = true;
        }
      });
      return bad;
    });
    assert.deepStrictEqual(v.slice(0, 5), [], `${v.length} pages with unhandled canvases`);
  });

  console.log(`\nAccessibility Sweep: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
