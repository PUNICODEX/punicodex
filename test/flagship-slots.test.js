'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'templates', 'flagship', 'flagship.js'),
  'utf8'
);

test('booking modal only opens for available slots', () => {
  // The click handler must gate on the resolved slot status, so a reserved
  // or live slot never re-opens the reservation modal.
  assert.match(SRC, /slot\.status !== 'available'\)\s*return;/);
});

test('bundle member frames fall back to the booking-level creative', () => {
  assert.match(SRC, /slot\.has_slot_creative \|\| !!slot\.creative_path/);
});

test('slots API failure disables booking instead of a dead-end modal', () => {
  assert.match(SRC, /slotsLoadFailed\s*=\s*true/);
  assert.match(SRC, /showSlotToast\(/);
});
