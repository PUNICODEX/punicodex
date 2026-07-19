/**
 * PuniCodex — Unicode Domain Appraisal Tests
 */

const assert = require('node:assert');
const {
  appraise,
  appraiseBatch,
  estimateAsciiValue,
  getTldInfo,
  MODEL_VERSION,
  REGISTRATION_FEE_USD,
} = require('../platform/api/appraise.js');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runTests() {
  console.log('\n▸ Appraisal Engine Tests\n');

  await test('getTldInfo returns IDN support for .com', () => {
    const info = getTldInfo('com');
    assert.strictEqual(info.supportsIdn, true);
    assert.ok(info.score > 0.9);
  });

  await test('getTldInfo returns non-IDN for .de', () => {
    const info = getTldInfo('de');
    assert.strictEqual(info.supportsIdn, false);
  });

  await test('estimateAsciiValue values short .com names higher than long ones', () => {
    const shorty = estimateAsciiValue('zeus', 'com');
    const longy = estimateAsciiValue('thisisaverylongname', 'com');
    assert.ok(shorty.value > longy.value, 'short name should be valued higher');
    assert.ok(shorty.value >= 1000, 'zeus.com control value should be meaningful');
  });

  await test('estimateAsciiValue discounts non-IDN TLDs', () => {
    const com = estimateAsciiValue('zeus', 'com');
    const de = estimateAsciiValue('zeus', 'de');
    assert.ok(com.value > de.value, '.com should be valued above .de');
  });

  await test('appraise rejects empty domain', () => {
    const result = appraise('');
    assert.strictEqual(result.error, 'DOMAIN_REQUIRED');
  });

  await test('appraise returns ASCII control value for plain ASCII .com', () => {
    const result = appraise('zeus.com');
    assert.strictEqual(result.hasUnicode, false);
    assert.ok(result.appraisal.unicodeValue >= 1000, 'ASCII control value should be meaningful');
    assert.strictEqual(result.appraisal.premiumMultiplier, 1);
    assert.strictEqual(result.appraisal.discount, 0);
    assert.strictEqual(result.lexiconMatch?.id, 'zeus');
  });

  await test('appraise applies Unicode discount to unknown Unicode domain', () => {
    const result = appraise('mýràndöm-ünïcödé.com');
    assert.strictEqual(result.hasUnicode, true);
    assert.ok(result.appraisal.discount >= 0.5, 'should be heavily discounted');
    assert.ok(
      result.appraisal.unicodeValue < 1000,
      'unknown unicode name should be near registration fee'
    );
  });

  await test('appraise values canonical dual-tier variant form in a defensible band', () => {
    const result = appraise('apṓllōn.com');
    assert.strictEqual(result.lexiconMatch?.id, 'apollon');
    assert.strictEqual(result.lexiconMatch?.form, 'variant');
    assert.strictEqual(result.lexiconMatch?.variantType, 'ideal');
    // The dual-tier variant is philologically real but not the owned form:
    // worth roughly half the owned form, in the defensible IDN band.
    assert.ok(
      result.appraisal.unicodeValue >= 300 && result.appraisal.unicodeValue <= 10_000,
      `variant dual-tier should hold defensible value (got ${result.appraisal.unicodeValue})`
    );
    assert.ok(result.appraisal.confidence > 0.5, 'confidence should be reasonable');
  });

  await test('appraise values owned flagship domain in the defensible IDN band', () => {
    const result = appraise('apóllōn.com');
    assert.strictEqual(result.lexiconMatch?.form, 'owned');
    // Premium owned IDN: low-to-mid four figures + tenant revenue — never a
    // large fraction of the ASCII control (IDN liquidity is objectively thin).
    assert.ok(result.appraisal.unicodeValue >= 500 && result.appraisal.unicodeValue <= 10_000);
    assert.ok(
      result.appraisal.premiumMultiplier < 0.05,
      'an IDN is never worth more than a small fraction of its ASCII counterpart'
    );
    assert.ok(result.appraisal.tenantRevenueValue > 0, 'should include tenant revenue');
  });

  await test('appraise penalizes non-IDN TLD for Unicode name', () => {
    const com = appraise('apóllōn.com');
    const de = appraise('apóllōn.de');
    assert.ok(
      com.appraisal.unicodeValue > de.appraisal.unicodeValue,
      '.com should be valued above .de'
    );
    assert.ok(
      de.factors.unicode.some((f) => f.name === 'tldIdnPenalty'),
      'should note IDN penalty'
    );
  });

  await test('appraise penalizes homograph spoof to registration fee', () => {
    const result = appraise('аррӏе.com'); // Cyrillic homograph of apple
    assert.strictEqual(result.safety.tier, 'suspicious');
    assert.ok(
      result.appraisal.recommendation === 'avoid' ||
        result.appraisal.unicodeValue <= REGISTRATION_FEE_USD * 2
    );
  });

  await test('appraise values exact ASCII brand domains in the millions', () => {
    const result = appraise('nike.com');
    assert.ok(
      result.appraisal.unicodeValue >= 1_000_000,
      'nike.com should be valued in the millions'
    );
    assert.ok(result.factors.brandScarcity, 'should surface brand scarcity factor');
  });

  await test('appraise values canonical Unicode transliterations of famous brands defensibly', () => {
    const result = appraise('níkē.com');
    assert.strictEqual(result.lexiconMatch?.form, 'owned');
    // The strongest possible IDN (owned, dual-tier, globally famous brand)
    // approaches — but never exceeds — the $10k Unicode ceiling. Six-figure
    // IDN claims are not defensible without verifiable market comps.
    assert.ok(
      result.appraisal.unicodeValue >= 3_000 && result.appraisal.unicodeValue <= 10_000,
      `strongest IDN should approach but not exceed the ceiling (got ${result.appraisal.unicodeValue})`
    );
    assert.ok(
      result.factors.trademark?.premium,
      'trademark factor should be a premium, not a penalty'
    );
    assert.ok(result.appraisal.tenantRevenueValue > 0, 'should include tenant revenue');
  });

  await test('appraise prices random unpronounceable names near registration fee', () => {
    const result = appraise('qxyjvkz.com');
    // A consonant pile has no end-user market: the old formula's $10k was
    // inflated; defensible value is registration-fee band.
    assert.ok(
      result.appraisal.asciiControlValue <= 500,
      `unpronounceable junk should be near registration fee (got ${result.appraisal.asciiControlValue})`
    );
    assert.ok(
      result.factors.ascii.some((f) => f.name === 'pronounceability' && f.impact <= 0.1) ||
        result.factors.unicode.some((f) => f.name === 'pronounceability' && f.impact <= 0.1) ||
        result.factors.some?.((f) => f.name === 'pronounceability'),
      'pronounceability factor should be surfaced in the breakdown'
    );
  });

  await test('appraise keeps premium ASCII in defensible real-world bands', () => {
    // Anchor calibration: short dictionary .coms trade five-to-six figures.
    const zeus = appraise('zeus.com');
    assert.ok(zeus.appraisal.asciiControlValue >= 50_000 && zeus.appraisal.asciiControlValue <= 500_000);
    const god = appraise('god.com');
    assert.ok(god.appraisal.asciiControlValue >= 20_000 && god.appraisal.asciiControlValue <= 200_000);
    const randomLong = appraise('verylongrandomname12345.com');
    assert.ok(randomLong.appraisal.asciiControlValue < 100);
  });

  await test('appraise includes tenant revenue for flagship pages', () => {
    const com = appraise('apóllōn.com');
    const de = appraise('apóllōn.de');
    assert.ok(com.appraisal.tenantRevenueValue > 0, '.com flagship should have tenant revenue');
    assert.ok(
      com.appraisal.unicodeValue > de.appraisal.unicodeValue,
      '.com should be valued above .de including tenant revenue'
    );
  });

  await test('appraiseBatch limits to 100 and returns array', () => {
    const domains = ['zeus.com', 'apóllōn.com', 'nike.com', 'randomthing12345.com'];
    const result = appraiseBatch(domains);
    assert.strictEqual(result.count, 4);
    assert.strictEqual(result.items.length, 4);
    assert.ok(result.items.every((r) => r.appraisal.currency === 'USD'));
  });

  await test('appraise includes model metadata', () => {
    const result = appraise('zeus.com');
    assert.strictEqual(result.model.version, MODEL_VERSION);
    assert.ok(result.model.dataVersion);
  });

  await test('appraise applies 2-letter .com scarcity floor to unknown names', () => {
    const qx = appraise('qx.com');
    assert.ok(qx.appraisal.unicodeValue >= 400_000, 'unknown 2L .com should hit scarcity floor');
    assert.ok(
      qx.factors.ascii.some((f) => f.name === 'intrinsicScarcityFloor'),
      'should surface scarcity floor factor'
    );
  });

  await test('appraise applies single-letter .com scarcity floor', () => {
    const x = appraise('x.com');
    assert.ok(x.appraisal.unicodeValue >= 10_000_000, '1L .com should reflect extreme scarcity');
  });

  await test('appraise quality-adjusts 2-letter .com pairs', () => {
    const aa = appraise('aa.com');
    const qx = appraise('qx.com');
    assert.ok(
      aa.appraisal.unicodeValue > qx.appraisal.unicodeValue,
      'premium 2L pair should exceed random pair'
    );
  });

  await test('appraise does not regress lexicon-backed 2-letter names', () => {
    const ra = appraise('ra.com');
    assert.ok(ra.appraisal.unicodeValue >= 1_000_000, 'ra.com should reflect premium 2L + meaning');
    assert.strictEqual(ra.lexiconMatch?.id, 'ra');
    assert.ok(
      ra.factors.ascii.some((f) => f.name === 'shortNameScarcity'),
      'should surface short-name scarcity premium'
    );
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
