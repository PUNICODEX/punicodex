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
    // Premium owned IDN: low-to-mid four figures + tenant revenue.
    assert.ok(result.appraisal.unicodeValue >= 500 && result.appraisal.unicodeValue <= 10_000);
    assert.ok(result.appraisal.tenantRevenueValue > 0, 'should include tenant revenue');
    // Unicode appraisals carry no ASCII comparison at all.
    assert.strictEqual(result.appraisal.asciiControlValue, null);
    assert.strictEqual(result.appraisal.premiumMultiplier, null);
    assert.strictEqual(result.appraisal.discount, null);
  });

  await test('appraise penalizes non-IDN TLD for Unicode name', () => {
    const com = appraise('apóllōn.com');
    const de = appraise('apóllōn.de', { explain: true });
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

  await test('appraise values exact ASCII brand-named domains by the same formula as any name', () => {
    const result = appraise('nike.com', { explain: true });
    // No brand scarcity table, no brand inflation: nike.com is priced by the
    // identical mechanical formula as every other short dictionary .com.
    assert.ok(
      result.appraisal.unicodeValue >= 10_000 && result.appraisal.unicodeValue <= 500_000,
      `nike.com should sit in the standard premium-ASCII band (got ${result.appraisal.unicodeValue})`
    );
    assert.ok(!result.factors.brandScarcity, 'no brand scarcity factor may exist');
  });

  await test('appraise values the strongest Unicode restoration by meaning and demand, never brand', () => {
    const result = appraise('níkē.com', { explain: true });
    assert.strictEqual(result.lexiconMatch?.form, 'owned');
    // The strongest restoration (owned, dual-tier, flagship, industry-mapped)
    // is worth low-to-mid four figures for the bare domain, plus tenant
    // revenue — and NOT ONE CENT of it derives from a third-party brand.
    assert.ok(
      result.appraisal.unicodeValue >= 1_000 && result.appraisal.unicodeValue <= 10_000,
      `strongest IDN should hold defensible value (got ${result.appraisal.unicodeValue})`
    );
    assert.ok(
      result.appraisal.totalValue > result.appraisal.unicodeValue,
      'tenant revenue lifts total above bare domain value'
    );
    // Industry demand from the pattern graph must be present and named.
    const ind = result.factors.industryDemand;
    assert.ok(ind, 'industry demand factor present');
    assert.ok(ind.primary >= 1, 'at least one primary industry seat');
    assert.ok(ind.top.includes('Sports, Fitness & Competition'), 'sports seat named');
    // Brand-blindness proven structurally: no brand factor, no premium flag,
    // and no brand-derived field anywhere in the payload.
    assert.ok(!result.factors.trademark, 'no trademark factor for a lexicon restoration');
    const payload = JSON.stringify(result);
    for (const banned of ['brandScarcity', 'canonicalShare', 'brandCanonical', 'brandMultiplier']) {
      assert.ok(!payload.includes(banned), `payload must never reference ${banned}`);
    }
    assert.ok(!result.factors.unicode.some((f) => /brand/i.test(f.name || '')), 'no brand factor');
  });

  await test('appraise never benchmarks Unicode names against an ASCII twin', () => {
    const result = appraise('níkē.com');
    assert.strictEqual(result.appraisal.asciiControlValue, null, 'no ASCII twin value');
    assert.strictEqual(result.appraisal.premiumMultiplier, null, 'no share-of-control ratio');
    assert.strictEqual(result.appraisal.discount, null, 'no discount ratio');
    assert.ok(result.appraisal.unicodeValue > 0, 'stands on its own factors');
    // And for an ASCII domain the estimate is simply the appraisal itself.
    const ascii = appraise('zeus.com');
    assert.ok(ascii.appraisal.asciiControlValue > 0);
    assert.strictEqual(ascii.appraisal.premiumMultiplier, 1);
  });

  await test('the algorithm ships only under explain; the default payload is verdict-only', () => {
    const plain = appraise('apóllōn.com');
    assert.ok(!('factors' in plain), 'no factor breakdown by default');
    assert.strictEqual(plain.model.unicodeCeilingUsd, undefined, 'no model constants by default');
    assert.ok(plain.model.version, 'model version stays public');
    // Demand context remains public — it is market data, not formula.
    assert.ok(plain.industryAlignment.primary >= 1, 'industry alignment public');
    assert.ok(!('multiplier' in plain.industryAlignment), 'no multiplier leaked');
    const explained = appraise('apóllōn.com', { explain: true });
    assert.ok(Array.isArray(explained.factors.unicode), 'explain returns the factor stack');
    assert.ok(explained.factors.unicodeSummary.multiplierStack > 1, 'stack value present');
    assert.ok(explained.model.unicodeCeilingUsd > 0, 'explain returns model constants');
  });

  await test('appraise prices random unpronounceable names near registration fee', () => {
    const result = appraise('qxyjvkz.com', { explain: true });
    // A consonant pile has no end-user market: the old formula's $10k was
    // inflated; defensible value is registration-fee band.
    assert.ok(
      result.appraisal.asciiControlValue <= 500,
      `unpronounceable junk should be near registration fee (got ${result.appraisal.asciiControlValue})`
    );
    assert.ok(
      result.factors.ascii.some((f) => f.name === 'pronounceability' && f.impact <= 0.1) ||
        result.factors.unicode.some((f) => f.name === 'pronounceability' && f.impact <= 0.1),
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
    const qx = appraise('qx.com', { explain: true });
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
    const ra = appraise('ra.com', { explain: true });
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
