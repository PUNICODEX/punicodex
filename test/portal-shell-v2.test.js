/**
 * Portal Shell v2 Tests — The Sanctum (B1: shell + Command page)
 *
 * Guards the admin-portal v2 shell contract:
 * - portal.css carries the .pz- design system (sidebar, top bar, drawer,
 *   health dots, skeletons) and keeps the legacy hooks the first-generation
 *   pages were built against (.stat-card, .panel, .badge, .state-block,
 *   .modal-backdrop, .toast, table.data-table, .login-*).
 * - portal.js exposes the sectioned NAV model (all six sections and every
 *   item, including the not-yet-built system/, api-keys/, and legacy/
 *   targets) and gates Change Requests on the same 'ops' permission its
 *   endpoint enforces.
 * - The Command page no longer mislabels API request-log telemetry as a
 *   work queue ("API Calls", never the old queue-flavored label).
 * - getDashboard() returns the v2 additions (pendingCareers,
 *   pendingArbitrage, pendingChangeRequests, traffic.todayViews,
 *   traffic.slowEndpoints, trending.topTemples/topCountries) against a real
 *   test database, with one seeded row per new queue proving the counts.
 * - Every /api/ literal the Command page calls resolves to a deployed
 *   serverless function on disk.
 * - The synced copies at admin-portal/ are byte-identical to canonical
 *   (run scripts/sync-admin-portal.js before this suite; npm run generate
 *   and the divergence gate keep it true).
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const Database = require('better-sqlite3');
const { prepareTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);

const ROOT = path.join(__dirname, '..');
const CANONICAL = path.join(ROOT, 'platform', 'public', 'admin-portal');
const SYNCED = path.join(ROOT, 'admin-portal');

function readCanonical(rel) {
  return fs.readFileSync(path.join(CANONICAL, rel), 'utf8');
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

// Seed one pending row into each new dashboard queue table (migrations are
// idempotent) so the getDashboard counts below are proven real, not just
// zeros from the fallback path.
function seedNewQueues() {
  const db = new Database(testDbPath);
  require('../platform/db/migrate-careers.js').migrate(db);
  require('../platform/db/migrate-arbitrage.js').migrate(db);
  require('../platform/db/migrate-tenant-portal.js').migrate(db);
  db.prepare(
    `INSERT INTO career_applications (role, name, email, message, status)
     VALUES ('Curator', 'Shell Test', 'shell-v2@example.com', 'msg', 'pending')`
  ).run();
  db.prepare(
    `INSERT INTO arbitrage_requests (domain, name, email, status)
     VALUES ('xn--shell-v2-example.com', 'Shell Test', 'shell-v2@example.com', 'pending')`
  ).run();
  const account = db
    .prepare('INSERT INTO tenant_accounts (email) VALUES (?)')
    .run('shell-v2@example.com');
  db.prepare(
    `INSERT INTO tenant_change_requests (account_id, target_kind, target_id, type, payload, status)
     VALUES (?, 'booking', 1, 'image', '{}', 'pending')`
  ).run(account.lastInsertRowid);
  db.close();
}

async function runTests() {
  console.log('\n▸ Portal Shell v2 Tests\n');

  await test('portal.css has the .pz- shell (sidebar, topbar, drawer) and keeps the legacy hooks', () => {
    const css = readCanonical('portal.css');
    for (const hook of [
      '.pz-sidebar',
      '.pz-nav-label',
      '.pz-nav-item',
      '.pz-topbar',
      '.pz-drawer-toggle',
      '.pz-backdrop',
      'pz-drawer-open',
      '.pz-health-dot',
      '.pz-skeleton',
      '.pz-queue-row',
      '.pz-trend',
      '.pz-sparkline',
      'prefers-reduced-motion',
    ]) {
      assert.ok(css.includes(hook), `portal.css: expected shell hook ${hook}`);
    }
    // Legacy hooks the other pages rely on must keep working.
    for (const legacy of [
      '.stat-card',
      '.panel',
      '.badge',
      '.state-block',
      '.modal-backdrop',
      '.toast',
      'table.data-table',
      '.login-card',
      '.login-submit',
      '.quick-link',
      'table.portal-table',
      '.portal-modal-overlay',
    ]) {
      assert.ok(css.includes(legacy), `portal.css: expected legacy hook ${legacy}`);
    }
  });

  await test('portal.js NAV covers every section item, and Change Requests requires ops', () => {
    const shell = readCanonical('portal.js');
    assert.ok(shell.includes('NAV_SECTIONS'), 'expected NAV_SECTIONS model');
    assert.ok(shell.includes('NAV_ITEMS'), 'expected derived NAV_ITEMS');
    for (const label of ['Command', 'Work', 'Leasing', 'Content', 'People', 'System']) {
      assert.ok(shell.includes(`label: '${label}'`), `expected section label ${label}`);
    }
    for (const route of [
      'analytics/',
      'applications/',
      'requests/',
      'leasing/',
      'scholars/',
      'merch/',
      'newsletter/',
      'users/',
      'system/',
      'api-keys/',
      'legacy/',
    ]) {
      assert.ok(
        shell.includes(`href: \`\${PREFIX}${route}\``),
        `expected nav item targeting ${route}`
      );
    }
    // Patrons lives as a tab of the Leasing page — the nav item deep-links it.
    assert.ok(
      shell.includes("href: `${PREFIX}leasing/?tab=patrons`"),
      'expected the patrons nav item to deep-link the Leasing patrons tab'
    );
    assert.ok(
      /id: 'requests'[\s\S]{0,160}permission: 'ops'/.test(shell),
      'Change Requests nav item must require the ops permission (its endpoint 403s otherwise)'
    );
    assert.ok(
      /id: 'users'[\s\S]{0,160}permission: 'users'/.test(shell),
      'Users nav item must stay superadmin-only'
    );
    // Public API surface the pages depend on.
    for (const fn of [
      'initShell',
      'api',
      'can',
      'escapeHtml',
      'fmtNumber',
      'fmtDateTime',
      'toast',
      'openModal',
      'setSnapshotTime',
      'sparkline',
    ]) {
      assert.ok(shell.includes(fn), `expected Portal.${fn}`);
    }
  });

  await test('command page relabels request-log telemetry as API Calls, never a work queue', () => {
    const src = readCanonical('index.html');
    assert.ok(
      !src.includes('Requests · '),
      'command page still mislabels API telemetry as a queue'
    );
    assert.ok(src.includes('API Calls'), 'command page: expected the API Calls KPI label');
  });

  await test('command page renders the v2 dashboard payload and queue breakdown', () => {
    const src = readCanonical('index.html');
    for (const field of [
      'todayViews',
      'slowEndpoints',
      'pendingCareers',
      'pendingArbitrage',
      'pendingChangeRequests',
      'topTemples',
      'topCountries',
      'viewsToday',
    ]) {
      assert.ok(src.includes(field), `command page: expected payload field ${field}`);
    }
    assert.ok(
      src.includes('/trending/temple/?id='),
      'command page: trending temples must drill down to /trending/temple/'
    );
    assert.ok(
      src.includes('Needs Your Decision'),
      'command page: expected the decision-queue panel'
    );
  });

  await test('getDashboard returns the v2 additions and counts the seeded queues', async () => {
    seedNewQueues();
    const service = require('../platform/api/admin-portal-service.js');
    const d = await service.getDashboard();
    // Legacy shape intact.
    assert.strictEqual(typeof d.applications.businessPending, 'number');
    assert.strictEqual(typeof d.scholars.pendingEdits, 'number');
    assert.strictEqual(typeof d.traffic.requests, 'number');
    assert.strictEqual(typeof d.indexedSites, 'number');
    // v2 additions.
    assert.strictEqual(typeof d.pendingCareers, 'number');
    assert.strictEqual(typeof d.pendingArbitrage, 'number');
    assert.strictEqual(typeof d.pendingChangeRequests, 'number');
    assert.strictEqual(typeof d.traffic.todayViews, 'number');
    assert.ok(Array.isArray(d.traffic.slowEndpoints), 'traffic.slowEndpoints should be an array');
    assert.ok(Array.isArray(d.trending.topTemples), 'trending.topTemples should be an array');
    assert.ok(Array.isArray(d.trending.topCountries), 'trending.topCountries should be an array');
    // The seeded pending rows must be counted.
    assert.ok(
      d.pendingCareers >= 1,
      `pendingCareers should count the seed, got ${d.pendingCareers}`
    );
    assert.ok(
      d.pendingArbitrage >= 1,
      `pendingArbitrage should count the seed, got ${d.pendingArbitrage}`
    );
    assert.ok(
      d.pendingChangeRequests >= 1,
      `pendingChangeRequests should count the seed, got ${d.pendingChangeRequests}`
    );
  });

  await test('every /api/ literal on the command page resolves to a deployed function', () => {
    const src = readCanonical('index.html');
    const literals = new Set();
    for (const match of src.matchAll(/['"](\/api\/[^'"]*)['"]/g)) {
      literals.add(match[1]);
    }
    assert.ok(literals.size >= 4, `expected at least 4 /api/ literals, found ${literals.size}`);
    for (const literal of literals) {
      const base = literal.split('?')[0];
      assert.ok(base.endsWith('/'), `${literal} is missing the trailing slash (bare paths 308)`);
      const handler = path.join(ROOT, base, 'index.js');
      assert.ok(fs.existsSync(handler), `${literal} has no deployed handler at ${handler}`);
    }
  });

  await test('synced admin-portal/ copies of the shell and command page are byte-identical', () => {
    for (const rel of ['portal.css', 'portal.js', 'index.html']) {
      const syncedPath = path.join(SYNCED, rel);
      assert.ok(
        fs.existsSync(syncedPath),
        `missing synced file admin-portal/${rel} — run scripts/sync-admin-portal.js`
      );
      assert.strictEqual(
        fs.readFileSync(syncedPath, 'utf8'),
        readCanonical(rel),
        `admin-portal/${rel} diverged from canonical — rerun scripts/sync-admin-portal.js`
      );
    }
  });

  console.log('\n✓ All portal shell v2 tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
