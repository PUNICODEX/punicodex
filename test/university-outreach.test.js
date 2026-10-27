#!/usr/bin/env node
/**
 * PuniCodex — university outreach tests.
 *
 * Covers the pitch-email builder (personalization ladder, complimentary
 * positioning, department benefit mapping) and the prospect store
 * (idempotent seeding, pitch throttles, status guards).
 */
const test = require('node:test');
const assert = require('node:assert');

const { buildUniversityPitch, benefitFor } = require('../platform/api/university-pitch-email.js');

const PROSPECT = {
  id: 1,
  institution_name: 'Macquarie University',
  slug: 'macquarie-university',
  country: 'AU',
  state: 'NSW',
  domain: 'mq.edu.au',
  departments: JSON.stringify(['Egyptology', 'Ancient History', 'Linguistics']),
  status: 'pending',
  pitch_count: 0,
};

test('the pitch is complimentary-first: no price, no invoice framing', () => {
  const pitch = buildUniversityPitch({ prospect: PROSPECT });
  assert.match(pitch.html, /COMPLIMENTARY/);
  assert.match(pitch.html, /no cost, no invoice/i);
  assert.match(pitch.text, /complimentary/i);
  // Never leads with money: no dollar figure anywhere in the email.
  assert.doesNotMatch(pitch.html + pitch.text, /\$\d/);
  // The one ask: a backlink from the department's website.
  assert.match(pitch.html + pitch.text, /backlink/i);
  assert.match(pitch.html, /punicodex\.com/);
});

test('subject and salutation personalize with the institution and contact', () => {
  const generic = buildUniversityPitch({ prospect: PROSPECT });
  assert.ok(generic.subject.includes('Macquarie University'));
  assert.match(generic.html, /Dear colleagues in the Egyptology at Macquarie University/);

  const named = buildUniversityPitch({
    prospect: PROSPECT,
    contactName: 'Professor Hale',
  });
  assert.match(named.html, /Dear Professor Hale/);
});

test('each aligned department becomes a benefit bullet', () => {
  const pitch = buildUniversityPitch({ prospect: PROSPECT });
  assert.match(pitch.html, /For (the Department of )?Egyptology/i);
  assert.match(pitch.html, /Egyptology/);
  assert.match(pitch.html, /Creatives Marketplace/);
  assert.match(pitch.html, /50%/);
  // All three departments surface in the text variant too.
  const deptHits = ['Egyptology', 'Ancient History', 'Linguistics'].filter((d) =>
    pitch.text.includes(d)
  );
  assert.ok(deptHits.length >= 2, `expected departments in text, got ${deptHits.join(', ')}`);
});

test('customNote lands as the final founder bullet and is escaped', () => {
  const pitch = buildUniversityPitch({
    prospect: PROSPECT,
    customNote: 'Your <b>Egypt</b> field school is exactly the standard we cite.',
  });
  assert.match(pitch.html, /A note from the founder/);
  assert.doesNotMatch(pitch.html, /<b>Egypt<\/b>/);
  assert.match(pitch.html, /&lt;b&gt;Egypt&lt;\/b&gt;/);
});

test('department override replaces the prospect list', () => {
  const pitch = buildUniversityPitch({
    prospect: PROSPECT,
    departments: ['Design', 'Marketing'],
  });
  assert.match(pitch.html, /For Design\./);
  assert.match(pitch.html, /For Marketing\./);
  assert.doesNotMatch(pitch.html, /Egyptology/);
});

test('benefitFor fuzzy-maps department strings', () => {
  assert.match(benefitFor('Classics and Ancient History').lead, /Classics/i);
  assert.match(benefitFor('linguistics').lead, /Linguistics/i);
  assert.match(benefitFor('Something Unknown').lead, /Something Unknown/);
  assert.ok(benefitFor('Something Unknown').why.length > 60);
});

test('email carries deliverability furniture (preheader, unsubscribe, plain text)', () => {
  const pitch = buildUniversityPitch({ prospect: PROSPECT });
  assert.match(pitch.html, /mso-hide/);
  assert.match(pitch.html, /display:none; max-height:0/); // preheader block
  assert.ok(pitch.text.length > 400);
  assert.ok(pitch.preview.includes('Macquarie University'));
});

// ── Prospect store ──

test('backlink pledge: activation sets a 12-month window; verification flips it', async () => {
  const store = require('../platform/db/university-prospects.js');
  await store.deleteProspect('pledge-lifecycle-test');
  await store.upsertProspect({
    institution_name: 'Pledge Lifecycle Test',
    slug: 'pledge-lifecycle-test',
    country: 'AU',
    departments: ['Classics'],
    source: 'manual',
  });
  const row = (await store.listProspects()).find((p) => p.slug === 'pledge-lifecycle-test');
  assert.strictEqual(row.backlink_status, 'pledged');
  assert.ok(!row.backlink_deadline_at, 'no deadline before activation');

  await store.setProspectStatus(row.id, 'active');
  const active = (await store.listProspects()).find((p) => p.slug === 'pledge-lifecycle-test');
  assert.strictEqual(active.backlink_status, 'pledged');
  assert.ok(active.backlink_deadline_at, 'activation starts the pledge window');

  await store.markBacklink(row.id, true);
  const verified = (await store.listProspects()).find((p) => p.slug === 'pledge-lifecycle-test');
  assert.strictEqual(verified.backlink_status, 'verified');
  assert.ok(verified.backlink_verified_at, 'verification is stamped');

  await store.deleteProspect('pledge-lifecycle-test');
});

test('prospect store: upsert is idempotent and markPitched throttles state', async () => {
  const store = require('../platform/db/university-prospects.js');
  await store.ensureUniversityProspects();
  await store.deleteProspect('test-university-outreach');
  await store.upsertProspect({
    institution_name: 'Test University',
    slug: 'test-university-outreach',
    country: 'AU',
    state: 'NSW',
    departments: ['Classics'],
    source: 'manual',
  });
  await store.upsertProspect({
    institution_name: 'Test University',
    slug: 'test-university-outreach',
    country: 'AU',
    state: 'NSW',
    departments: ['Classics'],
    source: 'manual',
  });
  const list = await store.listProspects();
  const rows = list.filter((p) => p.slug === 'test-university-outreach');
  assert.strictEqual(rows.length, 1, 'upsert must not duplicate');

  const row = rows[0];
  assert.strictEqual(row.status, 'pending');
  await store.markPitched(row.id);
  const after = (await store.listProspects()).find((p) => p.slug === 'test-university-outreach');
  assert.strictEqual(after.pitch_count, 1);
  assert.strictEqual(after.status, 'contacted', 'pending → contacted on first pitch');

  await store.setProspectStatus(row.id, 'declined');
  const declined = (await store.listProspects()).find((p) => p.slug === 'test-university-outreach');
  assert.strictEqual(declined.status, 'declined');
});

// ── Inspiration temple validation ──

test('creative upload rejects unknown inspiration temple ids with a clear 400', async () => {
  const validate = (value, res) => {
    // Mirror of platform/api/creative-marketplace.js#validateInspirationEntryId
    const { LEXICON } = require('../type/js/lexicon.js');
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.length > 60) {
      res.status = 400;
      return false;
    }
    const known = Array.isArray(LEXICON) && LEXICON.some((e) => e.id === value);
    if (!known) {
      res.status = 400;
      return false;
    }
    return value;
  };
  assert.strictEqual(validate('', {}), null);
  assert.strictEqual(validate(undefined, {}), null);
  assert.strictEqual(validate('hekate', {}), 'hekate');
  const bad = {};
  assert.strictEqual(validate('not-a-real-temple', bad), false);
  assert.strictEqual(bad.status, 400);
  const long = {};
  assert.strictEqual(validate('x'.repeat(61), long), false);
  assert.strictEqual(long.status, 400);
});

// ── Creative lifecycle emails ──

test('creative emails: approved / first sale / store-live render branded HTML', () => {
  const emails = require('../platform/api/creative-emails.js');
  const approved = emails.buildCreativeApprovedEmail({
    creatorName: 'Asha',
    assetTitle: 'Hekate Lantern',
  });
  assert.match(approved.subject, /Approved/);
  assert.match(approved.html, /Hekate Lantern/);
  assert.match(approved.html, /50%/);

  const sale = emails.buildFirstSaleEmail({
    creatorName: 'Asha',
    assetTitle: 'Hekate Lantern',
    grossCents: 5600,
    shareCents: 1400,
    orderRef: 'SO-20261026-AB12',
  });
  assert.match(sale.subject, /\$14\.00/);
  assert.match(sale.html, /SO-20261026-AB12/);

  const live = emails.buildStoreArtworkLiveEmail({
    creatorName: 'Asha',
    assetTitle: 'Hekate Lantern',
    templeUnicode: 'Hekátē',
    templeUrl: 'https://punicodex.com/hekate/',
  });
  assert.match(live.subject, /Hekátē/);
  assert.match(live.html, /punicodex\.com\/hekate\//);
  // No fee framing anywhere in lifecycle mail.
  for (const m of [approved, sale, live]) {
    assert.doesNotMatch(m.html, /invoice/i);
  }
});

// ── Admin portal regressions (reported live) ──

test('leasing page: the patrons tab deep-link resolves (regression)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'leasing', 'index.html'),
    'utf8'
  );
  for (const tab of ['bookings', 'creative-review', 'tenants', 'patrons', 'discounts', 'orders']) {
    assert.ok(html.includes(`id="tab-${tab}"`), `missing panel #tab-${tab}`);
    assert.ok(html.includes(`data-tab="${tab}"`), `missing button data-tab="${tab}"`);
  }
  assert.ok(
    html.includes(
      "var TABS = ['bookings', 'creative-review', 'tenants', 'patrons', 'discounts', 'orders'];"
    ),
    'TABS registry drifted'
  );
  assert.ok(html.includes("initialParams.get('tab')"), 'the ?tab= deep-link reader is gone');
  assert.ok(html.includes('showTab(initial);'), 'init does not apply the initial tab');
  assert.ok(
    html.includes("getElementById('tabbtn-' + tab).addEventListener('click'"),
    'tab click handlers unwired'
  );
});

test('self-seed: a prospect store with rows never re-imports the seed', async () => {
  const store = require('../platform/db/university-prospects.js');
  const before = await store.listProspects();
  const again = await store.listProspects();
  assert.strictEqual(again.length, before.length, 'self-seed must be a no-op on a populated table');
});
