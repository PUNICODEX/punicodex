/**
 * Sponsorship UI Source Contract Tests
 *
 * Source-level contracts for the sponsorship flow's UI layer (the repo's
 * service-worker.test.js idiom). Deliberately NOT re-asserted here (covered
 * by existing suites): the temple modal availability gate and slots-failure
 * toast (flagship-slots.test.js), the studio dropzone + publish/pause/meta
 * controls (creative-studio.test.js), the approve-live route registration
 * and Creative Review tab presence (admin-creative-review.test.js), the
 * dashboard queue keys and shell badge (admin-command-notifications.test.js).
 *
 * What this suite adds: the modal step-map coherence (every showStep target
 * exists — the blank-application-modal regression), the application-step
 * copy/error wiring, slots payload passthrough, account-page version-pin
 * coherence, friendly API error fallback, loading/empty states, and the
 * Creative Review card geometry/zoom contracts.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const flagshipJs = read('templates/flagship/flagship.js');
const flagshipHtml = read('templates/flagship/index.html');
const sandboxJs = read('account/sandbox.js');
const indexJs = read('account/index.js');
const brandJs = read('account/brand/brand.js');
const bookingsJs = read('account/bookings/bookings.js');
const leasingHtml = read('platform/public/admin-portal/leasing/index.html');
const portalJs = read('platform/public/admin-portal/portal.js');
const commandHtml = read('platform/public/admin-portal/index.html');
const bookingUpload = read('platform/api/booking-upload.js');
const bookingService = read('platform/api/booking-service.js');

const ACCOUNT_PAGES = [
  'account/index.html',
  'account/bookings/index.html',
  'account/brand/index.html',
  'account/slot/index.html',
  'account/login/index.html',
];

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── Temple booking modal ─────────────────────────────────────

test('every showStep target exists in the steps map AND the template', () => {
  // Regression: showStep('apply') ran with no steps.apply entry — the
  // takeover application modal went blank after email verification.
  // Scope to the booking modal: the patron modal has its own showStep.
  const patronIdx = flagshipJs.indexOf("document.getElementById('patron-modal')");
  const bookingSrc = patronIdx === -1 ? flagshipJs : flagshipJs.slice(0, patronIdx);
  const calls = new Set();
  for (const m of bookingSrc.matchAll(/showStep\('([^']+)'\)/g)) calls.add(m[1]);
  assert.ok(calls.size > 0, 'no showStep calls found — parser drifted');
  for (const name of calls) {
    assert.ok(
      new RegExp(`\\b${name}: document\\.getElementById\\('booking-step-`).test(flagshipJs),
      `steps map is missing '${name}'`
    );
    assert.ok(
      flagshipHtml.includes(`id="booking-step-${name}"`),
      `template is missing booking-step-${name}`
    );
  }
});

test('the application step reports errors in its own box, not the hidden step-1 box', () => {
  assert.match(flagshipHtml, /id="booking-apply-error"/);
  assert.match(flagshipJs, /function showApplyError\(/);
  assert.match(flagshipJs, /els\.applyError/);
  // The application submit handler must not use the step-1 error box.
  const submitBlock = flagshipJs.slice(
    flagshipJs.indexOf('els.submitApplication.addEventListener'),
    flagshipJs.indexOf('els.verifyBtn.addEventListener')
  );
  assert.ok(
    !submitBlock.includes('showBookingError('),
    'apply flow writes to the step-1 error box'
  );
  assert.match(submitBlock, /showApplyError\(/);
});

test('application success shows honest copy, not the creative-submission copy', () => {
  assert.match(flagshipJs, /Application Received/);
  assert.match(flagshipJs, /reviewed within 24–48 hours/);
  // Change Creative would dead-end: uploads reject pending_application.
  const submitBlock = flagshipJs.slice(
    flagshipJs.indexOf('els.submitApplication.addEventListener'),
    flagshipJs.indexOf('els.verifyBtn.addEventListener')
  );
  assert.match(submitBlock, /changeBtn\.style\.display = 'none'/);
});

test('the upload endpoint really does reject pending_application (the hidden button is honest)', () => {
  assert.match(bookingUpload, /\['pending_upload', 'approved', 'rejected'\]/);
});

test('openModal resets the shared status step (stale copy cannot leak across flows)', () => {
  assert.match(flagshipJs, /function resetStatusStep\(/);
  const openBlock = flagshipJs.slice(
    flagshipJs.indexOf('function openModal'),
    flagshipJs.indexOf('function discountBaseCents')
  );
  assert.match(openBlock, /resetStatusStep\(\)/);
  const resetBlock = flagshipJs.slice(
    flagshipJs.indexOf('function resetStatusStep'),
    flagshipJs.indexOf('function getCharLimits')
  );
  assert.match(resetBlock, /textContent = 'Under Review'/);
  assert.match(resetBlock, /changeBtn\.style\.display = ''/);
});

// ── Slots payload passthrough ────────────────────────────────

test('the temple slots endpoint serves getSlots verbatim (no field filtering)', () => {
  assert.match(bookingService, /slots: await getSlots\(/);
});

// ── Version-pin coherence ────────────────────────────────────

function versionsOf(file, asset) {
  const html = read(file);
  const re = new RegExp(`/account/${asset.replace('.', '\\.')}(?:\\?v=([0-9]+))?`, 'g');
  return [...html.matchAll(re)].map((m) => m[1] || null);
}

test('every account page pins the same sandbox.css version (currently v=3)', () => {
  for (const page of ACCOUNT_PAGES) {
    const versions = versionsOf(page, 'sandbox.css');
    assert.deepStrictEqual(versions, ['3'], `${page} sandbox.css pin drifted`);
  }
});

test('every account page pins the same sandbox.js version (currently v=4)', () => {
  for (const page of ACCOUNT_PAGES) {
    const versions = versionsOf(page, 'sandbox.js');
    assert.deepStrictEqual(versions, ['4'], `${page} sandbox.js pin drifted`);
  }
});

test('changed page scripts carry their bumped pins', () => {
  assert.match(read('account/index.html'), /\/account\/index\.js\?v=4/);
  assert.match(read('account/brand/index.html'), /\/account\/brand\/brand\.js\?v=5/);
});

// ── Friendly errors, loading & empty states ──────────────────

test('the API fallback error is sponsor-friendly, never a bare status code', () => {
  assert.ok(
    !sandboxJs.includes("'Request failed ('"),
    'bare "Request failed (N)" fallback is back'
  );
  assert.match(sandboxJs, /Something went wrong on our side/);
});

test('every account page ships a static loading state', () => {
  for (const page of [
    'account/index.html',
    'account/bookings/index.html',
    'account/brand/index.html',
    'account/slot/index.html',
  ]) {
    assert.match(read(page), /sb-state">Loading/, `${page} has no loading state`);
  }
});

test('empty accounts get the shared elegant state on Overview and Bookings', () => {
  assert.match(sandboxJs, /function emptyHero\(/);
  assert.match(indexJs, /S\.emptyHero\(\)/);
  assert.match(bookingsJs, /S\.emptyHero\(\)/);
  assert.match(brandJs, /No changeable resources right now/);
});

// ── Admin Creative Review tab ────────────────────────────────

test('both review card groups render images through the shared crImage builder', () => {
  const bookingCard = leasingHtml.slice(
    leasingHtml.indexOf('function crBookingCard'),
    leasingHtml.indexOf('function crRequestCard')
  );
  const requestCard = leasingHtml.slice(
    leasingHtml.indexOf('function crRequestCard'),
    leasingHtml.indexOf('function renderCreativeReview')
  );
  assert.match(bookingCard, /crImage\(/);
  // current + staged both go through crImage
  const requestCalls = requestCard.match(/crImage\(/g) || [];
  assert.ok(requestCalls.length >= 2, 'group 2 must render both sides through crImage');
});

test('creative images preserve aspect (max constraints, never a fixed height)', () => {
  const crImageBlock = leasingHtml.slice(
    leasingHtml.indexOf('function crImage'),
    leasingHtml.indexOf('function crBookingCard')
  );
  assert.match(crImageBlock, /max-width:100%/);
  assert.match(crImageBlock, /max-height:220px/);
  assert.ok(!/[^-]height:220px/.test(crImageBlock), 'fixed height would squash the creative');
});

test('the zoom overlay is Esc-dismissable (Portal.openModal binds Escape)', () => {
  assert.match(leasingHtml, /function showImagePreview\(/);
  const previewBlock = leasingHtml.slice(
    leasingHtml.indexOf('function showImagePreview'),
    leasingHtml.indexOf('function renderPendingCreativeChanges')
  );
  assert.match(previewBlock, /Portal\.openModal\(/);
  const modalBlock = portalJs.slice(
    portalJs.indexOf('function openModal'),
    portalJs.indexOf('function openModal') + 800
  );
  assert.match(modalBlock, /keydown/);
  assert.match(modalBlock, /e\.key === 'Escape'/);
  assert.match(modalBlock, /closeModal\(\)/);
});

test('the Command page creative-review queue row binds the count and links the tab', () => {
  assert.match(commandHtml, /count: d\.pendingCreativeApprovals/);
  assert.match(commandHtml, /href: 'leasing\/\?tab=creative-review'/);
});

async function run() {
  console.log('\n▸ Sponsorship UI Source Contract Tests\n');
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
  console.log(`\nSponsorship UI Contracts: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
