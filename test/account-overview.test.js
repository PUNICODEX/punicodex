'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.html'), 'utf8');
const sandboxJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'sandbox.js'), 'utf8');

test('overview banner consults staged change requests and hasCreative', () => {
  assert.match(indexJs, /b\.pendingImageRequest/);
  assert.match(indexJs, /b\.hasCreative/);
});

test('approved + creative placements get a publish call-to-action', () => {
  assert.match(indexJs, /sb-publish-all/);
  assert.match(indexJs, /\/api\/account\/bookings\/' \+ publishable\[i\]\.id \+ '\/publish\//);
});

test('no raw mailto: bug-report links (dead without a mail client)', () => {
  assert.ok(!indexHtml.includes('mailto:'), 'account/index.html still has a mailto link');
  assert.ok(!sandboxJs.includes('mailto:'), 'account/sandbox.js still has a mailto link');
});
