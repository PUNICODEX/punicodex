/**
 * Type Tool All-Forms Tests — typing a name offers every applicable form.
 *
 * The result panel must present the complete attested form set, not a single
 * answer: the original script (hieroglyphs, cuneiform, runes, Greek, …) as a
 * copyable chip labelled per the Original Script doctrine, the derived forms,
 * sourced scholarly variants, and the plain-ASCII fallback. The lookup the
 * page consumes is generated from the canonical original-scripts module.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { hasOriginalScript, getOriginalScriptLabel } = require(
  path.join(ROOT, 'type', 'js', 'original-scripts.js')
);
const LOOKUP = require(path.join(ROOT, 'js', 'original-script-lookup.js'));

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('the lookup covers every scripted lexicon entry, with the doctrine label', () => {
  let scripted = 0;
  for (const e of LEXICON) {
    if (!hasOriginalScript(e)) continue;
    scripted++;
    const rec = LOOKUP[e.id];
    assert.ok(rec, `lookup missing ${e.id}`);
    assert.ok(rec.originalScript && rec.originalScript !== '—', `${e.id}: empty script`);
    assert.ok(rec.scriptName, `${e.id}: missing script name`);
    assert.strictEqual(
      rec.scriptLabel,
      getOriginalScriptLabel(e),
      `${e.id}: label must match the doctrine (Original Script vs Scholarly Transliteration)`
    );
  }
  assert.ok(scripted >= 600, `expected deep script coverage, got ${scripted}`);
});

test('the lookup carries the marquee scripts correctly', () => {
  assert.strictEqual(LOOKUP.ra.originalScript, '𓂋𓂝𓇳');
  assert.strictEqual(LOOKUP.ra.scriptName, 'Hieroglyphs');
  assert.strictEqual(LOOKUP.tiamat.originalScript, '𒀭𒋾𒊩𒆳');
  assert.strictEqual(LOOKUP.thor.originalScript, 'ᚦᚢᚱ');
  assert.strictEqual(LOOKUP.nike.scriptLabel, 'Original Script');
});

test('the type page loads the lookup before type.js, with versioned assets', () => {
  const html = read('type/index.html');
  const lookupIdx = html.indexOf('/js/original-script-lookup.js?v=');
  const typeIdx = html.indexOf('js/type.js?v=');
  assert.ok(lookupIdx !== -1, 'lookup script not loaded');
  assert.ok(typeIdx !== -1 && lookupIdx < typeIdx, 'lookup must load before type.js');
  assert.ok(html.includes('css/type.css?v='), 'type.css must carry a version');
});

test('type.js renders the full form set: original script, derived, scholarly, ascii', () => {
  const js = read('type/js/type.js');
  assert.ok(js.includes('ORIGINAL_SCRIPT_LOOKUP'), 'renderResult must read the lookup');
  assert.ok(js.includes("'original-script'"), 'original-script chip type');
  assert.ok(js.includes("type: 'ascii'"), 'ascii fallback chip');
  assert.ok(js.includes('scriptRec.scriptLabel'), 'doctrine label rendered');
  assert.ok(
    js.indexOf('scriptRec.scriptLabel') < js.indexOf('Derived Forms') === false ||
      js.includes('result-variations-label'),
    'sections render'
  );
  // The original-script section must come before Derived Forms in the output.
  const buildStart = js.indexOf("let html = '';", js.indexOf('renderResult'));
  const scriptSection = js.indexOf('result-variations-label', buildStart);
  const derivedSection = js.indexOf('Derived Forms', buildStart);
  assert.ok(scriptSection !== -1 && derivedSection !== -1);
  assert.ok(scriptSection < derivedSection, 'original script section precedes derived forms');
});

test('the new chip types are styled', () => {
  const css = read('type/css/type.css');
  assert.ok(css.includes('.variation-original-script'), 'original-script chip style');
  assert.ok(css.includes('.variation-ascii'), 'ascii chip style');
});

async function runSuite() {
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
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nType Tool Forms: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
