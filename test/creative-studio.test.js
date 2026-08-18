'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const brandJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'brand', 'brand.js'), 'utf8');
const brandHtml = fs.readFileSync(path.join(__dirname, '..', 'account', 'brand', 'index.html'), 'utf8');
const sandboxCss = fs.readFileSync(path.join(__dirname, '..', 'account', 'sandbox.css'), 'utf8');

test('single unified upload zone per placement (no separate replace section)', () => {
  // The old dual-card split rendered "Upload creative — " and
  // "Replace creative — " as two different cards; the studio has one zone.
  assert.ok(!brandJs.includes("'Upload creative — '"), 'old upload card title still present');
  assert.match(brandJs, /sb-dropzone/);
});

test('studio edits ad copy through the account meta endpoint', () => {
  assert.match(brandJs, /\/api\/account\/bookings\//);
  assert.match(brandJs, /\/meta\//);
});

test('studio exposes publish and pause controls', () => {
  assert.match(brandJs, /\/publish\//);
  assert.match(brandJs, /\/pause\//);
});

test('staged upload previews inside the frame (what you see is what runs)', () => {
  assert.match(brandJs, /CreativeNormalize\.normalizeCreative/);
  assert.match(brandJs, /sb-frame-preview/);
});

test('studio styles exist and page versions bumped', () => {
  assert.match(sandboxCss, /\.sb-dropzone/);
  assert.match(sandboxCss, /\.sb-steps/);
  assert.match(brandHtml, /brand\.js\?v=4/);
  assert.match(brandHtml, /Creative Studio/);
});
