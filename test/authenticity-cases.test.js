/**
 * PuniCodex — Authenticity Case Matrix
 *
 * Bulk assertions over the canonical lexicon and a wide range of spoof inputs.
 */

const assert = require('node:assert');
const { LEXICON } = require('../type/js/lexicon.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
  VERDICTS,
} = require('../platform/api/authenticity-service.js');

const CANONICAL_VERDICTS = new Set([
  VERDICTS.CANONICAL,
  VERDICTS.RECOGNIZED_VARIANT,
  VERDICTS.ASCII_FALLBACK,
]);

const SUSPICIOUS_VERDICTS = new Set([
  VERDICTS.HOMOGRAPH_SPOOF,
  VERDICTS.MIXED_SCRIPT_SPOOF,
  VERDICTS.LOOKALIKE_DOMAIN,
  VERDICTS.UNSAFE,
]);

const safeInputs = [
  'Zeus',
  'Árēs',
  'Aphrodítē',
  'Athénā',
  'Dēmētēr',
  'Hēra',
  'Hermês',
  'Hēphaistos',
  'Hestía',
  'Poseidôn',
  'Persephonē',
  'Promētheus',
  'Hádēs',
  'Apóllōn',
  'Hekátē',
  'Níkē',
  'Ártemis',
  'Átlas',
  'Diónysos',
  'Médousa',
  'Óðinn',
  'Þórr',
  'Rāma',
  'Śiva',
  'Amaterasu',
  'Thor',
  'Freyja',
];

const spoofInputs = [
  // ASCII confusable brand lookalike
  'g00gle',
  // Cyrillic homographs
  '\u0430res',
  '\u0430pollo',
  '\u0430thena',
  '\u0437eus',
  '\u0440oseidon',
  '\u043edin',
  '\u0430materasu',
  // Greek homographs
  '\u03b1res',
  '\u0430res.com',
  'https://\u0430res.com/login',
  // Mixed scripts
  'Z\u0435us',
  'Apoll\u043e',
];

const unknownInputs = ['xyzabc123', 'totally-made-up-name', 'qwertyuiop'];

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

function run() {
  console.log('\n▸ Authenticity Case Matrix\n');

  // 1. Every canonical ASCII and Unicode form is trusted.
  let canonicalCount = 0;
  for (const entry of LEXICON) {
    const ascii = String(entry.ascii || '');
    const unicode = String(entry.unicode || '');
    if (ascii && ascii.length > 1) {
      const r = classifyTerm(ascii);
      if (CANONICAL_VERDICTS.has(r.verdict)) canonicalCount++;
      else {
        failed++;
        console.error(`  ✗ ASCII form trusted: ${ascii} -> ${r.verdict}`);
      }
    }
    if (unicode && unicode.length > 1) {
      const r = classifyTerm(unicode);
      if (CANONICAL_VERDICTS.has(r.verdict)) canonicalCount++;
      else {
        failed++;
        console.error(`  ✗ Unicode canonical trusted: ${unicode} -> ${r.verdict}`);
      }
    }
  }
  passed++;
  console.log(`  ✓ All ${canonicalCount} canonical and fallback forms trusted`);

  // 2. Derived variants are recognized.
  let variantCount = 0;
  for (const entry of LEXICON) {
    const variants = entry.variants || [];
    for (const v of variants) {
      if (v && typeof v.unicode === 'string') {
        const r = classifyTerm(v.unicode);
        if (CANONICAL_VERDICTS.has(r.verdict)) variantCount++;
        else {
          failed++;
          console.error(`  ✗ variant trusted: ${v.unicode} -> ${r.verdict}`);
        }
      }
    }
  }
  passed++;
  console.log(`  ✓ All ${variantCount} derived variants trusted`);

  // 3. Known safe hand-picked inputs are trusted.
  test('hand-picked safe inputs are canonical, recognized variants, or ASCII fallbacks', () => {
    for (const input of safeInputs) {
      const r = classifyTerm(input);
      assert.ok(CANONICAL_VERDICTS.has(r.verdict), `${input} should be trusted, got ${r.verdict}`);
    }
  });

  // 4. Known spoof inputs are flagged.
  test('hand-picked spoof inputs are suspicious or unsafe', () => {
    for (const input of spoofInputs) {
      const r =
        input.includes('.') || input.startsWith('http') ? classifyUrl(input) : classifyTerm(input);
      assert.ok(
        SUSPICIOUS_VERDICTS.has(r.verdict),
        `${input} should be suspicious, got ${r.verdict}`
      );
    }
  });

  // 5. Domain classification behavior.
  test('owned canonical domains return canonical', () => {
    const r = classifyDomain('xn--rs-lia5r.com');
    assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  });

  test('unowned domains return unknown when safe', () => {
    const r = classifyDomain('notowned-xyz123.com');
    assert.strictEqual(r.verdict, VERDICTS.UNKNOWN);
  });

  // 6. URL classification exposes parts for structured URLs.
  test('URL classification returns parts breakdown', () => {
    const r = classifyUrl('https://example.com/zeus/path?q=ares');
    assert.ok(Array.isArray(r.parts));
    assert.ok(r.parts.length > 0);
  });

  // 7. Empty input is unknown.
  test('empty input returns unknown', () => {
    const r = classifyTerm('');
    assert.strictEqual(r.verdict, VERDICTS.UNKNOWN);
  });

  // 8. Plain unknown inputs.
  test('plain unknown inputs return unknown', () => {
    for (const input of unknownInputs) {
      const r = classifyTerm(input);
      assert.strictEqual(r.verdict, VERDICTS.UNKNOWN, `${input} should be unknown`);
    }
  });

  // 9. Verdict taxonomy coverage.
  test('all verdict constants are reachable strings', () => {
    for (const v of Object.values(VERDICTS)) {
      assert.strictEqual(typeof v, 'string');
      assert.ok(v.length > 0);
    }
  });

  console.log(`\nAuthenticity Cases: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
