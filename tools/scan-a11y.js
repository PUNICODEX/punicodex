/**
 * Accessibility calibration scan (not a test): counts structural a11y
 * violations across all tracked public HTML files, grouped by rule.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const cheerio = require('cheerio');

const files = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.includes('/.backup/') && !f.startsWith('docs/'));

const rules = {
  'missing html[lang]': 0,
  'title missing/empty': 0,
  'h1 count != 1': 0,
  'img without alt': 0,
  'input without label/aria': 0,
  'button without accessible name': 0,
  'canvas without aria handling': 0,
};
const examples = {};

function note(rule, file) {
  rules[rule] += 1;
  if (!examples[rule]) examples[rule] = [];
  if (examples[rule].length < 6) examples[rule].push(file);
}

for (const file of files) {
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const $ = cheerio.load(html);

  if (!$('html').attr('lang')) note('missing html[lang]', file);
  if (!$('title').first().text().trim()) note('title missing/empty', file);

  const h1s = $('h1').filter((_, el) => {
    const $el = $(el);
    if ($el.text().trim().length > 0) return true;
    return $el.find('img[alt], svg, [aria-label]').length > 0;
  });
  if (h1s.length !== 1) note('h1 count != 1', file);

  $('img').each((_, el) => {
    if ($(el).attr('alt') === undefined) note('img without alt', file);
  });

  $('input, select, textarea').each((_, el) => {
    const $el = $(el);
    const type = ($el.attr('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button') return;
    if ($el.is('[aria-hidden="true"]')) return;
    const id = $el.attr('id');
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const wrapped = $el.closest('label').length > 0;
    if (!hasLabel && !wrapped && !$el.attr('aria-label') && !$el.attr('aria-labelledby')) {
      note('input without label/aria', file);
    }
  });

  $('button').each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && !$el.attr('aria-label') && !$el.attr('aria-labelledby') && !$el.attr('title')) {
      note('button without accessible name', file);
    }
  });

  $('canvas').each((_, el) => {
    const $el = $(el);
    if (
      $el.attr('aria-hidden') !== 'true' &&
      !$el.attr('aria-label') &&
      !$el.attr('role')
    ) {
      note('canvas without aria handling', file);
    }
  });
}

console.log('files scanned:', files.length);
for (const [rule, count] of Object.entries(rules)) {
  console.log(String(count).padStart(6), rule, count ? `e.g. ${(examples[rule] || []).slice(0, 3).join(', ')}` : '');
}
