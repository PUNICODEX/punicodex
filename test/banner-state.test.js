/**
 * Banner State Decision Tests (Sponsor Sandbox Overview)
 *
 * account/index.js renderActions decides ONE of four banner states per
 * booking from (status × hasCreative × pendingImageRequest):
 *
 *   'upload'  — gold action banner (creative genuinely missing)
 *   'review'  — calm "under review" note (staged in the review queue)
 *   'publish' — publish call-to-action (approved, creative ready)
 *   'none'    — no banner
 *
 * The decision is dual-exported as decideBannerState (js/ink.js pattern), so
 * this suite drives the exact function the UI runs — renderActions only
 * buckets bookings through it. Every relevant combination is covered: the
 * five creative-changeable statuses × creative × pending request (20 rows),
 * the four statuses the banner ignores × creative (8 rows), plus the
 * creativePath fallback and the exactly-one-state invariant.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { decideBannerState } = require('../account/index.js');

const STATES = ['upload', 'review', 'publish', 'none'];

function b(status, { creative = false, request = false } = {}) {
  return {
    status,
    hasCreative: creative,
    creativePath: creative ? '/uploads/test/banner.png' : null,
    pendingImageRequest: request,
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── pending_upload ──
test('pending_upload + no creative → upload', () => {
  assert.strictEqual(decideBannerState(b('pending_upload')), 'upload');
});
test('pending_upload + no creative + pending request → review', () => {
  assert.strictEqual(decideBannerState(b('pending_upload', { request: true })), 'review');
});
test('pending_upload + creative → none (creative staged, awaiting flip)', () => {
  assert.strictEqual(decideBannerState(b('pending_upload', { creative: true })), 'none');
});
test('pending_upload + creative + pending request → review', () => {
  assert.strictEqual(
    decideBannerState(b('pending_upload', { creative: true, request: true })),
    'review'
  );
});

// ── pending_approval ──
test('pending_approval + creative → review', () => {
  assert.strictEqual(decideBannerState(b('pending_approval', { creative: true })), 'review');
});
test('pending_approval + no creative → upload', () => {
  assert.strictEqual(decideBannerState(b('pending_approval')), 'upload');
});
test('pending_approval + pending request → review (request always wins)', () => {
  assert.strictEqual(decideBannerState(b('pending_approval', { request: true })), 'review');
  assert.strictEqual(
    decideBannerState(b('pending_approval', { creative: true, request: true })),
    'review'
  );
});

// ── approved ──
test('approved + creative → publish', () => {
  assert.strictEqual(decideBannerState(b('approved', { creative: true })), 'publish');
});
test('approved + creative + pending request → review, never publish', () => {
  assert.strictEqual(decideBannerState(b('approved', { creative: true, request: true })), 'review');
});
test('approved + no creative → upload', () => {
  assert.strictEqual(decideBannerState(b('approved')), 'upload');
});
test('approved + no creative + pending request → review', () => {
  assert.strictEqual(decideBannerState(b('approved', { request: true })), 'review');
});

// ── live ──
test('live + creative → none (quiet while serving)', () => {
  assert.strictEqual(decideBannerState(b('live', { creative: true })), 'none');
});
test('live + creative + pending request → review (replacement staged)', () => {
  assert.strictEqual(decideBannerState(b('live', { creative: true, request: true })), 'review');
});
test('live + no creative → upload (creative missing on a live frame is the #1 job)', () => {
  assert.strictEqual(decideBannerState(b('live')), 'upload');
});
test('live + no creative + pending request → review', () => {
  assert.strictEqual(decideBannerState(b('live', { request: true })), 'review');
});

// ── rejected ──
test('rejected + no creative → upload', () => {
  assert.strictEqual(decideBannerState(b('rejected')), 'upload');
});
test('rejected + creative → none (the rejected creative exists; studio/email carry the CTA)', () => {
  assert.strictEqual(decideBannerState(b('rejected', { creative: true })), 'none');
});
test('rejected + pending request → review', () => {
  assert.strictEqual(decideBannerState(b('rejected', { request: true })), 'review');
  assert.strictEqual(decideBannerState(b('rejected', { creative: true, request: true })), 'review');
});

// ── statuses the banner ignores ──
test('pending_application / pending_payment / ended / cancelled → none, creative or not', () => {
  for (const status of ['pending_application', 'pending_payment', 'ended', 'cancelled']) {
    assert.strictEqual(decideBannerState(b(status)), 'none', `${status} without creative`);
    assert.strictEqual(
      decideBannerState(b(status, { creative: true })),
      'none',
      `${status} with creative`
    );
  }
});

// ── enrichment fallback & invariant ──
test('creativePath alone counts as a creative (hasCreative flag absent)', () => {
  assert.strictEqual(
    decideBannerState({ status: 'approved', creativePath: '/uploads/test/x.png' }),
    'publish'
  );
  assert.strictEqual(decideBannerState({ status: 'approved', creativePath: null }), 'upload');
});

test('every combination maps to exactly one of the four states', () => {
  const statuses = [
    'pending_upload',
    'pending_approval',
    'approved',
    'live',
    'rejected',
    'pending_application',
    'pending_payment',
    'ended',
    'cancelled',
  ];
  let combos = 0;
  for (const status of statuses) {
    for (const creative of [false, true]) {
      for (const request of [false, true]) {
        const state = decideBannerState(b(status, { creative, request }));
        assert.ok(STATES.includes(state), `${status}/${creative}/${request} → unknown ${state}`);
        combos += 1;
      }
    }
  }
  assert.strictEqual(combos, 36, 'the full matrix ran');
});

// ── wiring contracts: the UI runs the tested function ──
const indexJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.html'), 'utf8');

test('renderActions buckets every state through decideBannerState', () => {
  assert.match(indexJs, /decideBannerState\(b\) === 'upload'/);
  assert.match(indexJs, /decideBannerState\(b\) === 'review'/);
  assert.match(indexJs, /decideBannerState\(b\) === 'publish'/);
});

test('decideBannerState is dual-exported for this suite', () => {
  assert.match(indexJs, /module\.exports = \{ decideBannerState: decideBannerState \}/);
  assert.strictEqual(typeof decideBannerState, 'function');
});

test('account/index.js stays ES5 (no arrow functions, no template literals)', () => {
  assert.ok(!indexJs.includes('=>'), 'arrow function found in account/index.js');
  assert.ok(!indexJs.includes('`'), 'template literal found in account/index.js');
});

test('the gold banner copy never claims a rejected/pending booking is "approved"', () => {
  assert.ok(!indexJs.includes('approved but ha'), 'stale "approved but has no creative" copy');
  assert.match(indexJs, /no creative yet — the placement can’t go live until you upload one/);
});

test('overview page pins the bumped index.js version', () => {
  assert.match(indexHtml, /\/account\/index\.js\?v=4/);
});

async function run() {
  console.log('\n▸ Banner State Decision Tests\n');
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
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nBanner State: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
