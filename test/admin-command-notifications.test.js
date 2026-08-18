'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const svc = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api', 'admin-portal-service.js'),
  'utf8'
);
const command = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'index.html'),
  'utf8'
);
const shell = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'portal.js'),
  'utf8'
);

test('dashboard counts every decision queue', () => {
  for (const key of ['pendingCreativeApprovals', 'pendingPatrons', 'failedStoreOrders']) {
    assert.ok(svc.includes(key), `dashboard payload missing ${key}`);
  }
  assert.match(svc, /bookings WHERE status = 'pending_approval'/);
});

test('command page renders the new queues and self-refreshes', () => {
  assert.match(command, /Creative reviews/);
  assert.match(command, /Store fulfillment failures/);
  assert.match(command, /setInterval/);
});

test('shell carries a pending-decisions badge with a 60s poller', () => {
  assert.match(shell, /pz-notif-badge/);
  assert.match(shell, /refreshNotifBadge/);
  assert.match(shell, /60 \* 1000/);
});
