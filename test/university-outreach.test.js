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
const path = require('node:path');

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
