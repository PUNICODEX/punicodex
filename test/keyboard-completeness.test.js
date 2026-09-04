/**
 * Keyboard Completeness Tests
 *
 * Verifies that every character needed to type the PUNICODEX lexicon is
 * reachable from the Android keyboard: either in the symbol palette or via a
 * long-press accent map.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { LEXICON } = require('../type/js/lexicon.js');
const palette = require('../android/app/src/main/assets/shared/keyboard-palette.json');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nKeyboard Completeness: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const paletteChars = new Set(palette.map((e) => e.char));
const javaSource = fs.readFileSync(
  path.join(
    __dirname,
    '../android/app/src/main/java/com/punicodex/keyboard/PunyKeyboardService.java'
  ),
  'utf8'
);

// Extract every character string from the ACCENT_MAP block.
const accentMapChars = new Set();
const accentBlock = javaSource.match(/ACCENT_MAP\.put\([^)]+\);/gs) || [];
for (const line of accentBlock) {
  const strings = line.match(/"([^"]+)"/g) || [];
  for (const s of strings) {
    const chars = s.slice(1, -1);
    for (const ch of chars) accentMapChars.add(ch);
  }
}

const reachableChars = new Set([...paletteChars, ...accentMapChars]);

function isTypableScript(ch) {
  const cp = ch.codePointAt(0);
  // We only expect the keyboard to cover Latin, Greek, Cyrillic, and closely
  // related scripts. CJK, hieroglyphs, cuneiform, etc. are entered via system
  // IMEs or original-script pickers, not the long-press Latin keyboard.
  if (cp >= 0x0370 && cp <= 0x03ff) return true; // Greek
  if (cp >= 0x0400 && cp <= 0x04ff) return true; // Cyrillic
  if (cp >= 0x1f00 && cp <= 0x1fff) return true; // Greek extended
  if (cp >= 0x0100 && cp <= 0x024f) return true; // Latin extended
  if (cp >= 0x1e00 && cp <= 0x1eff) return true; // Latin extended additional
  if (cp >= 0x2c60 && cp <= 0x2c7f) return true; // Latin-C
  if (cp >= 0xa720 && cp <= 0xa7ff) return true; // Latin-D
  if (cp >= 0x0080 && cp <= 0x00ff) return true; // Latin-1 supplement
  if (cp >= 0x0250 && cp <= 0x02af) return true; // IPA extensions
  if (cp >= 0x02b0 && cp <= 0x02ff) return true; // Spacing modifier letters
  if (cp === 0x00d7 || cp === 0x00f7) return false; // multiplication/division signs
  return false;
}

const usedChars = new Set();
for (const entry of LEXICON) {
  for (const ch of entry.unicode || '') {
    if (isTypableScript(ch)) usedChars.add(ch);
  }
  for (const v of entry.variants || []) {
    for (const ch of v.unicode || '') {
      if (isTypableScript(ch)) usedChars.add(ch);
    }
  }
}

test('every lexicon typable character is reachable on the keyboard', () => {
  const missing = [];
  for (const ch of usedChars) {
    if (!reachableChars.has(ch))
      missing.push(`${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()})`);
  }
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.length} characters: ${missing.slice(0, 20).join(', ')}`);
  }
});

test('long-press m includes anusvara (ṃ)', () => {
  assert.ok(accentMapChars.has('ṃ'), 'lowercase anusvara should be long-pressable from m');
});

test('long-press t includes thorn (þ)', () => {
  assert.ok(accentMapChars.has('þ'), 'lowercase thorn should be long-pressable from t');
});

test('long-press d includes eth (ð)', () => {
  assert.ok(accentMapChars.has('ð'), 'lowercase eth should be long-pressable from d');
});

test('keyboard palette includes Indic dot-below letters', () => {
  assert.ok(paletteChars.has('ṃ'), 'palette should include ṃ');
  assert.ok(paletteChars.has('ṇ'), 'palette should include ṇ');
  assert.ok(paletteChars.has('ṣ'), 'palette should include ṣ');
});

test('hieroglyph names use official Unicode catalog names, not invented labels', () => {
  const hieroglyphs = palette.filter((e) => e.category === 'hieroglyphs');
  const bad = [];
  for (const e of hieroglyphs) {
    if (!/^EGYPTIAN HIEROGLYPH /.test(e.name)) {
      bad.push(`${e.char} (${e.name})`);
    }
  }
  if (bad.length > 0) {
    throw new Error(
      `${bad.length} hieroglyph(s) have non-Unicode names: ${bad.slice(0, 10).join(', ')}`
    );
  }
});

test('hieroglyph palette includes the full Egyptian block (no invented animal swaps)', () => {
  // Spot-check the characters the user reported as mismatched.
  const checks = {
    𓃗: 'EGYPTIAN HIEROGLYPH E006', // was "Egyptian scarab"
    𓃚: 'EGYPTIAN HIEROGLYPH E008A', // was "Egyptian bee"
    𓃟: 'EGYPTIAN HIEROGLYPH E012', // was "Egyptian moth"
    𓃰: 'EGYPTIAN HIEROGLYPH E026', // was "Egyptian sparrow"
  };
  for (const [ch, expectedName] of Object.entries(checks)) {
    const entry = palette.find((e) => e.char === ch);
    if (!entry) {
      throw new Error(`Missing hieroglyph ${ch}`);
    }
    if (entry.name !== expectedName) {
      throw new Error(`Expected ${ch} to be "${expectedName}", got "${entry.name}"`);
    }
  }
});

// Roman-numeral long-press palette on the symbol keyboard.
function accentsForBase(base) {
  for (const line of accentBlock) {
    const strings = line.match(/"([^"]+)"/g) || [];
    if (strings.length > 0 && strings[0].slice(1, -1) === base) {
      return strings.slice(1).map((s) => s.slice(1, -1));
    }
  }
  return [];
}

test('long-press 1 includes Roman numeral one (Ⅰ)', () => {
  assert.ok(accentMapChars.has('Ⅰ'), 'Roman numeral one should be reachable');
  assert.ok(accentsForBase('1').includes('Ⅰ'));
});

test('long-press 5 includes Roman numeral five (Ⅴ)', () => {
  assert.ok(accentMapChars.has('Ⅴ'), 'Roman numeral five should be reachable');
  assert.ok(accentsForBase('5').includes('Ⅴ'));
});

test('long-press 0 includes Roman numeral building blocks (Ⅹ, Ⅿ)', () => {
  const zeroAccents = accentsForBase('0');
  assert.ok(zeroAccents.includes('Ⅹ'), '0 long-press should include 10 (Ⅹ)');
  assert.ok(zeroAccents.includes('Ⅿ'), '0 long-press should include 1000 (Ⅿ)');
});

run();
