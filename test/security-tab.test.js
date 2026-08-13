/**
 * Security Tab Tests
 *
 * Covers the admin portal Security tab and its data pipeline:
 *
 * - Auth matrix: /api/admin/portal/security/ returns 401 without a portal
 *   token, 403 for viewer (ops permission required), 200 for ops and
 *   superadmin with the full envelope (requests, topAttackPaths,
 *   topAttackSources, authFailures, authenticity, csp, posture, degraded).
 * - Request-log rollups: seeded 404/429 rows surface in topAttackPaths /
 *   topAttackSources (ip_hash truncated to 12 chars) and the 24h totals.
 * - CSP collector: /api/security/csp-report/ accepts a valid report (204,
 *   row upserted), a repeat increments count, hostile fields are sanitized
 *   (javascript: URIs, overlong paths, bad directive chars), an oversized
 *   body is a 413, GET is a 405, and a wrong content type is a 415.
 * - Login-failure audit: a failed admin login writes portal.login.failed
 *   with a 16-char sha256 emailHash and never the raw email; unknown
 *   accounts, lockout triggers (portal.login.locked), locked-account
 *   attempts, and tenant login failures land in the same trail.
 * - Degradation: dropping csp_reports leaves the overview alive with the
 *   source listed in `degraded`.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.ADMIN_PASSWORD = 'test-security-tab-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const Database = require('better-sqlite3');
const { invoke, adminHeader } = require('./helpers/http.js');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');
const securityHandler = require('../platform/api-handlers/admin/portal/security/index.js');
const cspReportHandler = require('../platform/api-handlers/root/security/csp-report/index.js');
const tenantPortal = require('../platform/api/tenant-portal.js');

let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.88.0.${ipCounter}`;
}

function db() {
  return new Database(getTestDbPath(__filename));
}

async function portalLogin(email, password) {
  return invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': nextIp() },
    body: { email, password },
  });
}

function getOverview(token) {
  return invoke(securityHandler, 'GET', '/api/admin/portal/security/', {
    headers: adminHeader(token),
  });
}

function postCspReport(rawBody, { contentType = 'application/csp-report' } = {}) {
  return invoke(cspReportHandler, 'POST', '/api/security/csp-report/', {
    headers: { 'content-type': contentType, 'x-forwarded-for': nextIp() },
    body: rawBody,
  });
}

// SQLite CURRENT_TIMESTAMP format ('YYYY-MM-DD HH:MM:SS', UTC) — the request
// log's native storage shape; the overview compares cutoffs lexicographically.
function sqliteTimestamp(msAgo = 0) {
  return new Date(Date.now() - msAgo).toISOString().slice(0, 19).replace('T', ' ');
}

function emailHash(email) {
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  }
}

let superToken = null;
let opsToken = null;
let viewerToken = null;

const PROBE_PATH = '/api/v1/names/__security_probe__';
const PROBE_IP_HASH = 'deadbeefcafe'.repeat(6).slice(0, 64);

async function runTests() {
  console.log('\n▸ Security Tab Tests\n');

  // ── Setup: bootstrap + one account per role ────────────────
  await test('setup: bootstrap superadmin and create ops + viewer accounts', async () => {
    const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;

    for (const [email, role] of [
      ['ops@security.test', 'ops'],
      ['viewer@security.test', 'viewer'],
    ]) {
      const created = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
        headers: adminHeader(superToken),
        body: { email, password: `${role}-password-123`, displayName: `${role} user`, role },
      });
      assert.strictEqual(created.status, 201, JSON.stringify(created.body));
      const login = await portalLogin(email, `${role}-password-123`);
      assert.strictEqual(login.status, 200, JSON.stringify(login.body));
      if (role === 'ops') opsToken = login.body.token;
      else viewerToken = login.body.token;
    }
  });

  // ── (a) Auth matrix + envelope ──────────────────────────────
  await test('security endpoint: 401 unauthenticated, 403 viewer, 200 ops/superadmin', async () => {
    const unauthenticated = await invoke(securityHandler, 'GET', '/api/admin/portal/security/');
    assert.strictEqual(unauthenticated.status, 401);

    const viewer = await getOverview(viewerToken);
    assert.strictEqual(viewer.status, 403);
    assert.strictEqual(viewer.body.required, 'ops');

    for (const [label, token] of [
      ['ops', opsToken],
      ['superadmin', superToken],
    ]) {
      const res = await getOverview(token);
      assert.strictEqual(res.status, 200, `${label}: ${JSON.stringify(res.body)}`);
      for (const key of [
        'generatedAt',
        'requests',
        'topAttackPaths',
        'topAttackSources',
        'authFailures',
        'authenticity',
        'csp',
        'posture',
        'degraded',
      ]) {
        assert.ok(key in res.body, `${label}: missing envelope key ${key}`);
      }
      for (const window of ['last24h', 'last7d']) {
        for (const field of ['total', 'clientErrors', 'authErrors', 'rateLimited']) {
          assert.ok(
            field in res.body.requests[window],
            `${label}: missing requests.${window}.${field}`
          );
        }
      }
      assert.ok(Array.isArray(res.body.degraded), `${label}: degraded must be an array`);
    }

    const wrongMethod = await invoke(securityHandler, 'POST', '/api/admin/portal/security/', {
      headers: adminHeader(superToken),
      body: {},
    });
    assert.strictEqual(wrongMethod.status, 405);
  });

  await test('posture chips derive from the committed vercel.json headers', async () => {
    const res = await getOverview(opsToken);
    assert.strictEqual(res.status, 200);
    const posture = res.body.posture;
    assert.ok(posture && typeof posture === 'object', 'expected a posture object');
    for (const key of [
      'cspEnforced',
      'hsts',
      'frameAncestorsNone',
      'contentTypeNosniff',
      'referrerPolicy',
    ]) {
      assert.strictEqual(typeof posture[key], 'boolean', `posture.${key} must be boolean`);
    }
    // The committed vercel.json enforces all five — a regression here is the
    // exact signal the tab exists to surface.
    assert.deepStrictEqual(posture, {
      cspEnforced: true,
      hsts: true,
      frameAncestorsNone: true,
      contentTypeNosniff: true,
      referrerPolicy: true,
    });
  });

  // ── (b) Request-log rollups ─────────────────────────────────
  await test('seeded 404/429 rows surface in totals, top paths, and top sources', async () => {
    const baseline = await getOverview(opsToken);
    assert.strictEqual(baseline.status, 200);

    const d = db();
    const insert = d.prepare(
      `INSERT INTO api_request_log (key_id, request_id, method, path, status_code, duration_ms, ip_hash, created_at)
       VALUES (NULL, ?, 'GET', ?, ?, 12, ?, ?)`
    );
    let n = 0;
    const stamp = () => sqliteTimestamp(60 * 60 * 1000); // 1h ago — inside 24h
    for (let i = 0; i < 50; i++) {
      insert.run(`req-probe-${n++}`, PROBE_PATH, 404, PROBE_IP_HASH, stamp());
    }
    for (let i = 0; i < 2; i++) {
      insert.run(`req-probe-${n++}`, '/api/v1/convert', 429, PROBE_IP_HASH, stamp());
    }
    for (let i = 0; i < 3; i++) {
      insert.run(`req-probe-${n++}`, '/api/search', 200, 'c0ffee'.repeat(11).slice(0, 64), stamp());
    }
    d.close();

    const res = await getOverview(opsToken);
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.requests.last24h.total, baseline.body.requests.last24h.total + 55);
    assert.strictEqual(
      res.body.requests.last24h.clientErrors,
      baseline.body.requests.last24h.clientErrors + 52
    );
    assert.strictEqual(
      res.body.requests.last24h.rateLimited,
      baseline.body.requests.last24h.rateLimited + 2
    );

    const probe = res.body.topAttackPaths.find((p) => p.path === PROBE_PATH);
    assert.ok(probe, 'expected the probe path in topAttackPaths');
    assert.strictEqual(probe.errors, 50);
    assert.ok(probe.lastSeen, 'probe path must carry lastSeen');

    const source = res.body.topAttackSources.find((s) => s.ipHash === PROBE_IP_HASH.slice(0, 12));
    assert.ok(source, 'expected the probe source in topAttackSources');
    assert.strictEqual(source.errors, 52);
    assert.strictEqual(source.total, 52);
    assert.strictEqual(source.ipHash.length, 12, 'ip_hash must be truncated to 12 chars');
  });

  // ── (c) CSP report collector ────────────────────────────────
  await test('csp collector: valid report → 204 → row upserted; repeat increments count', async () => {
    const report = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://punicodex.com/lexicon/?q=apollo#top',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://evil.example/x.js?token=secret',
        'source-file': 'https://punicodex.com/app.js',
        'line-number': 42,
      },
    });
    const first = await postCspReport(report);
    assert.strictEqual(first.status, 204, JSON.stringify(first.body));

    const row = db().prepare('SELECT * FROM csp_reports WHERE directive = ?').get('script-src');
    assert.ok(row, 'expected a csp_reports row');
    assert.strictEqual(row.document_path, '/lexicon/', 'query/hash must be stripped');
    assert.strictEqual(row.blocked_host, 'evil.example', 'blocked-uri must reduce to host only');
    assert.strictEqual(row.source_file_host, 'punicodex.com');
    assert.strictEqual(row.line_number, 42);
    assert.strictEqual(row.count, 1);

    const second = await postCspReport(report);
    assert.strictEqual(second.status, 204);
    const after = db().prepare('SELECT count FROM csp_reports WHERE id = ?').get(row.id);
    assert.strictEqual(after.count, 2, 'identical report must increment the natural-key row');
  });

  await test('csp collector: hostile fields are sanitized before storage', async () => {
    const malicious = JSON.stringify({
      'csp-report': {
        'document-uri': 'javascript:alert(document.cookie)',
        'effective-directive': "script-src'; DROP TABLE csp_reports;--",
        'blocked-uri': 'javascript:alert(1)',
        'source-file': 'not a url {{{',
        'line-number': 'NaN-attack',
      },
    });
    const res = await postCspReport(malicious);
    assert.strictEqual(res.status, 204, 'sanitized-to-empty reports are dropped, not errored');
    const junk = db()
      .prepare("SELECT COUNT(*) AS c FROM csp_reports WHERE document_path = '' AND directive = ''")
      .get();
    assert.strictEqual(junk.c, 0, 'fully-sanitized report must not be stored');

    const hugePath = JSON.stringify({
      'csp-report': {
        'document-uri': `https://punicodex.com/${'x'.repeat(5000)}?q=1`,
        'violated-directive': 'img-src',
        'blocked-uri': 'data:image/png;base64,AAAA',
      },
    });
    const huge = await postCspReport(hugePath);
    assert.strictEqual(huge.status, 204);
    const row = db().prepare("SELECT * FROM csp_reports WHERE directive = 'img-src'").get();
    assert.ok(row, 'expected the img-src row');
    assert.strictEqual(row.document_path.length, 200, 'document path must cap at 200 chars');
    assert.strictEqual(row.blocked_host, '', 'data: URIs reduce to an empty host');
  });

  await test('csp collector: oversized body → 413, GET → 405, wrong content type → 415', async () => {
    const oversized = await postCspReport(`{"csp-report":${' '.repeat(9000)}}`);
    assert.strictEqual(oversized.status, 413);

    const get = await invoke(cspReportHandler, 'GET', '/api/security/csp-report/');
    assert.strictEqual(get.status, 405);

    const wrongType = await postCspReport('{"csp-report":{}}', { contentType: 'text/plain' });
    assert.strictEqual(wrongType.status, 415);
  });

  // ── (d) Login-failure audit trail ───────────────────────────
  await test('failed admin login writes portal.login.failed with a hashed email only', async () => {
    const bad = await portalLogin('admin@punicodex.com', 'definitely-wrong-password');
    assert.strictEqual(bad.status, 401);
    assert.strictEqual(bad.body.code, 'invalid_credentials');

    const row = db()
      .prepare(
        "SELECT meta FROM admin_actions WHERE action = 'portal.login.failed' ORDER BY id DESC LIMIT 1"
      )
      .get();
    assert.ok(row, 'expected a portal.login.failed audit row');
    const meta = JSON.parse(row.meta);
    assert.strictEqual(meta.emailHash, emailHash('admin@punicodex.com'));
    assert.strictEqual(meta.emailHash.length, 16);
    assert.strictEqual(meta.reason, 'bad_credentials');
    assert.ok(!row.meta.includes('admin@punicodex.com'), 'raw email must never be logged');
    assert.ok(!row.meta.includes('definitely-wrong'), 'the password must never be logged');
  });

  await test('unknown account, lockout trigger, and locked attempt are all audited', async () => {
    const ghost = await portalLogin('ghost@security.test', 'whatever-password-1');
    assert.strictEqual(ghost.status, 401);
    const unknownRow = db()
      .prepare(
        "SELECT meta FROM admin_actions WHERE action = 'portal.login.failed' ORDER BY id DESC LIMIT 1"
      )
      .get();
    assert.strictEqual(JSON.parse(unknownRow.meta).reason, 'unknown_account');
    assert.strictEqual(JSON.parse(unknownRow.meta).emailHash, emailHash('ghost@security.test'));

    // One failure already happened above for admin@punicodex.com; four more
    // reach MAX_LOGIN_ATTEMPTS (5) and trigger the lockout audit row.
    for (let i = 0; i < 4; i++) {
      const res = await portalLogin('admin@punicodex.com', 'definitely-wrong-password');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'invalid_credentials');
    }
    const lockedRow = db()
      .prepare(
        "SELECT meta FROM admin_actions WHERE action = 'portal.login.locked' ORDER BY id DESC LIMIT 1"
      )
      .get();
    assert.ok(lockedRow, 'expected a portal.login.locked audit row');
    assert.strictEqual(JSON.parse(lockedRow.meta).emailHash, emailHash('admin@punicodex.com'));

    const whileLocked = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(whileLocked.status, 401);
    assert.strictEqual(whileLocked.body.code, 'account_locked');
    const lockedAttempt = db()
      .prepare(
        "SELECT meta FROM admin_actions WHERE action = 'portal.login.failed' ORDER BY id DESC LIMIT 1"
      )
      .get();
    assert.strictEqual(JSON.parse(lockedAttempt.meta).reason, 'locked');
  });

  await test('failed tenant login writes tenant.login.failed with a hashed email only', async () => {
    await assert.rejects(
      tenantPortal.login({ email: 'ghost@tenant.test', password: 'whatever-password-1' }),
      (err) => err.status === 401
    );
    const row = db()
      .prepare(
        "SELECT meta FROM admin_actions WHERE action = 'tenant.login.failed' ORDER BY id DESC LIMIT 1"
      )
      .get();
    assert.ok(row, 'expected a tenant.login.failed audit row');
    const meta = JSON.parse(row.meta);
    assert.strictEqual(meta.emailHash, emailHash('ghost@tenant.test'));
    assert.strictEqual(meta.reason, 'unknown_account');
    assert.ok(!row.meta.includes('ghost@tenant.test'), 'raw email must never be logged');
  });

  await test('overview authFailures aggregates the audit trail', async () => {
    const res = await getOverview(opsToken);
    assert.strictEqual(res.status, 200);
    const auth = res.body.authFailures;
    assert.ok(auth.last24h.total >= 7, `expected ≥7 auth events, got ${auth.last24h.total}`);
    assert.ok(auth.last24h.byKind['portal.login.failed'] >= 5);
    assert.ok(auth.last24h.byKind['portal.login.locked'] >= 1);
    assert.ok(auth.last24h.byKind['tenant.login.failed'] >= 1);
    assert.ok(Array.isArray(auth.recent) && auth.recent.length > 0);
    const kinds = auth.recent.map((e) => e.kind);
    assert.ok(kinds.includes('portal.login.locked'), 'recent must include the lockout');
    for (const event of auth.recent) {
      assert.ok(event.emailHash === null || event.emailHash.length === 16);
    }
  });

  // ── (e) Graceful degradation (LAST — drops a table) ─────────
  await test('dropping csp_reports degrades the overview instead of failing it', async () => {
    const d = db();
    d.exec('DROP TABLE csp_reports');
    d.close();

    const res = await getOverview(opsToken);
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.degraded));
    assert.ok(res.body.degraded.includes('csp'), 'csp source must be reported degraded');
    assert.deepStrictEqual(res.body.csp, { last24h: 0, top: [] });
    // Other sources keep working.
    assert.ok(res.body.requests.last24h.total > 0);
  });
}

async function main() {
  await runTests();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`\n✗ ${failed.length} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n✓ All ${results.length} security tab tests passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
