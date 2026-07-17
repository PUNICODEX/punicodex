/**
 * PuniCodex — Spatial Workspace tests
 */

const assert = require('node:assert');
const {
  createWorkspace,
  updateWorkspace,
  getWorkspace,
  listWorkspaces,
  deleteWorkspace,
  addToReadingList,
  getReadingList,
  updateReadingItem,
  removeFromReadingList,
  recordTimelineEvent,
  getTimeline,
} = require('../platform/api/workspaces');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Workspace Tests');

test('create and retrieve workspace', () => {
  const ws = createWorkspace('session-a', 'greek-study', { tabs: [{ url: '/sites/zeus/' }] });
  assert.ok(ws.publicId);
  const loaded = getWorkspace(ws.publicId);
  assert.strictEqual(loaded.name, 'greek-study');
  assert.strictEqual(loaded.payload.tabs[0].url, '/sites/zeus/');
});

test('list and delete workspaces', () => {
  createWorkspace('session-b', 'temp-ws', { tabs: [] });
  const before = listWorkspaces('session-b');
  assert.ok(before.length > 0);
  const ok = deleteWorkspace(before[0].publicId, 'session-b');
  assert.ok(ok);
  const after = listWorkspaces('session-b');
  assert.ok(after.length < before.length);
});

test('update workspace', () => {
  const ws = createWorkspace('session-c', 'old-name', { tabs: [] });
  const updated = updateWorkspace(ws.publicId, 'session-c', 'new-name', { tabs: [{ url: '/' }] });
  assert.strictEqual(updated.name, 'new-name');
  const loaded = getWorkspace(ws.publicId);
  assert.strictEqual(loaded.payload.tabs.length, 1);
});

test('reading list CRUD', () => {
  const item = addToReadingList('session-d', { url: '/sites/athena/', title: 'Athena' });
  assert.ok(item.id);
  let list = getReadingList('session-d');
  assert.ok(list.some((i) => i.url === '/sites/athena/'));
  updateReadingItem(item.id, 'session-d', {
    status: 'visited',
    visited_at: new Date().toISOString(),
  });
  list = getReadingList('session-d');
  const updated = list.find((i) => i.id === item.id);
  assert.strictEqual(updated.status, 'visited');
  removeFromReadingList(item.id, 'session-d');
  list = getReadingList('session-d');
  assert.ok(!list.some((i) => i.id === item.id));
});

test('session timeline records events', () => {
  recordTimelineEvent('session-e', 'search', { query: 'zeus' });
  recordTimelineEvent('session-e', 'visit', { url: '/sites/zeus/' });
  const timeline = getTimeline('session-e');
  assert.ok(timeline.length >= 2);
  assert.ok(timeline.some((e) => e.eventType === 'search'));
});

if (!process.exitCode) {
  console.log('\n✓ All Workspace tests passed');
} else {
  console.log('\n✗ Some Workspace tests failed');
  process.exit(1);
}
