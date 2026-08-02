/**
 * PuniCodex — Search Page Feature Guards
 *
 * Locks in the 2026-07-19 search audit outcomes: the Similar button is backed
 * by the real similarity API (the dead /api/sites/duplicates route is gone),
 * search state is deep-linkable (?q/mode/pantheon/type/tier/sort), the
 * autocomplete is a proper ARIA combobox, and the error state is
 * user-friendly.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'search.html'), 'utf8');

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
    console.error(`    ${err.message}`);
  }
}

test('no reference to the retired /api/sites/duplicates endpoint remains', () => {
  assert.ok(!html.includes('/api/sites/duplicates'), 'dead endpoint reference found');
});

test('Similar button is wired to the lexicon similarity API with entry id', () => {
  assert.ok(
    html.includes('/api/v1/names/${encodeURIComponent(entryId)}/similarities/'),
    'showSimilar must call /api/v1/names/:id/similarities'
  );
  assert.ok(
    html.includes(
      "showSimilar('${escapeHtml(r.punycode)}','${escapeHtml(r.lexiconEntryId)}',this)"
    ),
    'Similar button must pass the lexicon entry id'
  );
  assert.ok(!html.includes('alert('), 'alert() UX must be gone');
});

test('search state is deep-linkable (read on load, synced on change)', () => {
  assert.ok(html.includes('function syncUrl()'), 'syncUrl missing');
  assert.ok(html.includes('function applyInitialState()'), 'applyInitialState missing');
  assert.ok(html.includes('history.replaceState'), 'syncUrl must use replaceState');
  assert.ok(
    html.includes('loadPantheons().then(() => applyInitialState())'),
    'initial state must apply after pantheons load'
  );
  for (const param of ['q', 'mode', 'pantheon', 'type', 'tier', 'sort']) {
    assert.ok(
      html.includes(`params.get('${param}')`) || html.includes(`params.set('${param}'`),
      `param ${param} not handled`
    );
  }
});

test('autocomplete is an ARIA combobox', () => {
  assert.ok(html.includes('role="combobox"'), 'input lacks combobox role');
  assert.ok(html.includes('aria-controls="autocompleteDropdown"'), 'input lacks aria-controls');
  assert.ok(html.includes('role="listbox"'), 'dropdown lacks listbox role');
  assert.ok(html.includes('role="option"'), 'items lack option role');
  assert.ok(html.includes('aria-activedescendant'), 'active descendant not tracked');
  assert.ok(html.includes("setAttribute('aria-expanded', 'true')"), 'expanded state not set');
});

test('search failure shows a friendly message, not a raw error', () => {
  assert.ok(html.includes('Search is temporarily unavailable'), 'friendly error title missing');
  assert.ok(!html.includes('${e.message}</div>'), 'raw error message still rendered');
});

console.log(`\nSearch Page Features: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
