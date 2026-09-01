/**
 * Portal System Tests (B3 — Sanctum System/API Keys/Security/Legacy + careers/arbitrage queues)
 *
 * Static contract:
 * - system/, api-keys/, security/, legacy/ pages exist in the canonical source
 *   (platform/public/admin-portal/) and the synced copy (admin-portal/),
 *   byte-identical, noindex, and wired to the shared shell (portal.css +
 *   portal.js + data-page).
 * - Every /api/ literal referenced by those pages (and the evolved
 *   applications page) resolves to a real serverless handler under api/.
 * - The broken legacy pages retired by B3 are gone, and the surviving legacy
 *   pages carry no links to them.
 *
 * Live contract (isolated DB via prepareTestDb):
 * - /api/admin/portal/careers/ and /api/admin/portal/arbitrage/ (+ :id/status)
 *   reject unauthenticated calls with 401, reject non-leasing roles with 403,
 *   paginate/filter correctly, and drive the pending → contacted → closed
 *   triage flow with an admin_actions audit row per transition.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.ADMIN_PASSWORD = 'test-portal-system-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const Database = require('better-sqlite3');
const { invoke, adminHeader } = require('./helpers/http.js');

const ROOT = path.join(__dirname, '..');
const CANONICAL = path.join(ROOT, 'platform', 'public', 'admin-portal');
const SYNCED = path.join(ROOT, 'admin-portal');

const NEW_PAGES = [
  'system/index.html',
  'api-keys/index.html',
  'security/index.html',
  'legacy/index.html',
];
const LITERAL_PAGES = [...NEW_PAGES, 'applications/index.html'];

const RETIRED_PAGES = [
  'admin-curator.html',
  'admin-ai-review.html',
  'admin-tenants.html',
  'admin-disputes.html',
  'admin-authenticity-users.html',
  'admin-authenticity-audit.html',
  'admin-authenticity-compliance.html',
  'admin.html', // stale duplicate at platform/public/admin.html (root admin.html stays)
];

// Basenames the surviving legacy pages must no longer reference. The retired
// platform/public/admin.html shares its basename with the kept root
// admin.html, so it cannot be checked by basename and is covered by the
// file-existence assertion above instead.
const RETIRED_BASENAMES = RETIRED_PAGES.filter((p) => p !== 'admin.html');

const KEPT_LEGACY = [
  'platform/public/admin-bookings.html',
  'platform/public/admin-api-keys.html',
  'platform/public/admin-authenticity.html',
  'platform/public/admin-authenticity-policy.html',
  'platform/public/admin-analytics.html',
  'admin.html',
];

function readCanonical(rel) {
  return fs.readFileSync(path.join(CANONICAL, rel), 'utf8');
}

function extractApiLiterals(source) {
  const literals = new Set();
  for (const match of source.matchAll(/['"](\/api\/[^'"]*)['"]/g)) {
    literals.add(match[1]);
  }
  return [...literals];
}

// Resolve an /api/ path literal to a serverless handler file under api/.
// Literals are route prefixes at runtime (ids are concatenated by the pages),
// so the literal itself must map to an index.js (or direct .js) handler.
// Paths served by the consolidated catch-all routers resolve through their
// route tables (see test/helpers/api-routes.js).
const { resolveApiHandler } = require('./helpers/api-routes.js');

function resolveHandler(literalBase) {
  return resolveApiHandler(literalBase);
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

// ── Static contract ───────────────────────────────────────────

async function runStaticTests() {
  await test('canonical system/api-keys/security/legacy pages exist with synced byte-identical copies', async () => {
    for (const rel of NEW_PAGES) {
      assert.ok(
        fs.existsSync(path.join(CANONICAL, rel)),
        `missing canonical platform/public/admin-portal/${rel}`
      );
      const syncedPath = path.join(SYNCED, rel);
      assert.ok(
        fs.existsSync(syncedPath),
        `missing synced admin-portal/${rel} — run scripts/sync-admin-portal.js`
      );
      assert.strictEqual(
        fs.readFileSync(syncedPath, 'utf8'),
        readCanonical(rel),
        `admin-portal/${rel} diverged from canonical — rerun scripts/sync-admin-portal.js`
      );
    }
  });

  await test('new pages carry the shell contract (noindex, data-page, portal.css, portal.js)', async () => {
    const expectedPages = {
      system: 'system/index.html',
      'api-keys': 'api-keys/index.html',
      security: 'security/index.html',
      legacy: 'legacy/index.html',
    };
    for (const [pageId, rel] of Object.entries(expectedPages)) {
      const src = readCanonical(rel);
      assert.ok(
        src.includes('content="noindex,nofollow"'),
        `${rel}: expected <meta name="robots" content="noindex,nofollow">`
      );
      assert.ok(src.includes(`data-page="${pageId}"`), `${rel}: expected data-page="${pageId}"`);
      assert.ok(src.includes('data-depth="1"'), `${rel}: expected data-depth="1"`);
      assert.ok(
        /href="\.\.\/portal\.css(?:\?v=[^"]*)?"/.test(src),
        `${rel}: expected ../portal.css link`
      );
      assert.ok(
        /src="\.\.\/portal\.js(?:\?v=[^"]*)?"/.test(src),
        `${rel}: expected ../portal.js script`
      );
      assert.ok(src.includes('Portal.initShell('), `${rel}: expected Portal.initShell wiring`);
      // Shell building blocks the pages must render with. The legacy
      // directory is a static page — no loading states or stat cards there.
      assert.ok(src.includes('panel'), `${rel}: expected shell hook .panel`);
      if (pageId !== 'legacy') {
        for (const hook of ['stat-card', 'state-block']) {
          assert.ok(src.includes(hook), `${rel}: expected shell hook .${hook}`);
        }
      }
    }
  });

  await test('every /api/ literal on the new pages + applications resolves to a real handler', async () => {
    const found = [];
    for (const rel of LITERAL_PAGES) {
      for (const literal of extractApiLiterals(readCanonical(rel))) {
        found.push({ file: rel, literal });
      }
    }
    assert.ok(found.length >= 10, `expected at least 10 /api/ literals, found ${found.length}`);
    for (const { file, literal } of found) {
      const base = literal.split('?')[0];
      assert.ok(base.endsWith('/'), `${file}: ${literal} is missing the trailing slash`);
      assert.ok(
        resolveHandler(base),
        `${file}: ${literal} does not resolve to a handler under api/`
      );
    }
  });

  await test('system page references the crawler, observability, and spam endpoints', async () => {
    const src = readCanonical('system/index.html');
    for (const literal of [
      '/api/crawler/stats/',
      '/api/crawler/queue/',
      '/api/crawler/queue/process/',
      '/api/crawl/',
      '/api/crawl/recrawl/',
      '/api/crawler/discover/',
      '/api/crawler/tenant-keywords/',
      '/api/sites/',
      '/api/admin/observability/',
    ]) {
      assert.ok(src.includes(`'${literal}`), `system page: expected endpoint literal ${literal}`);
    }
    assert.ok(src.includes("'/spam/'"), 'system page: expected the spam-flag path fragment');
  });

  await test('retired legacy pages are gone', async () => {
    for (const rel of RETIRED_PAGES) {
      assert.ok(
        !fs.existsSync(path.join(ROOT, 'platform', 'public', rel)),
        `platform/public/${rel} should have been retired (git rm)`
      );
    }
  });

  await test('kept legacy pages contain no links to the retired pages', async () => {
    for (const rel of KEPT_LEGACY) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const basename of RETIRED_BASENAMES) {
        assert.ok(!src.includes(basename), `${rel} still references retired page ${basename}`);
      }
    }
  });

  await test('legacy directory links only to surviving tools and carries the deprecation banner', async () => {
    const src = readCanonical('legacy/index.html');
    assert.ok(
      src.includes('predate the Sanctum'),
      'legacy page: expected the deprecation banner copy'
    );
    for (const href of KEPT_LEGACY.map((p) => `/${p}`)) {
      assert.ok(src.includes(`href="${href}"`), `legacy page: expected link ${href}`);
    }
    for (const basename of RETIRED_BASENAMES) {
      assert.ok(!src.includes(basename), `legacy page links to retired page ${basename}`);
    }
  });
}

// ── Live endpoint contract ────────────────────────────────────

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');
const careersHandler = require('../platform/api-handlers/admin/portal/careers/index.js');
const careerStatusHandler = require('../platform/api-handlers/admin/portal/careers/[id]/status/index.js');
const arbitrageHandler = require('../platform/api-handlers/admin/portal/arbitrage/index.js');
const arbitrageStatusHandler = require('../platform/api-handlers/admin/portal/arbitrage/[id]/status/index.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

async function portalLogin(email, password, ip) {
  return invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': ip },
    body: { email, password },
  });
}

function seedQueues() {
  const d = db();
  // The service migrates lazily on first request; the seed writes first, so
  // create the tables here (both migrations are idempotent).
  require('../platform/db/migrate-careers.js').migrate(d);
  require('../platform/db/migrate-arbitrage.js').migrate(d);
  d.prepare(
    `INSERT INTO career_applications (role, name, email, links, message, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'social-media-marketer',
    'Ada Lovelace',
    'ada@example.com',
    'https://example.com/portfolio',
    'I grew three accounts past 100k.',
    'pending'
  );
  d.prepare(
    `INSERT INTO career_applications (role, name, email, links, message, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'video-generation-expert',
    'Grace Hopper',
    'grace@example.com',
    '',
    'Reels, shorts, reels.',
    'contacted'
  );
  d.prepare(
    `INSERT INTO arbitrage_requests (domain, name, email, budget, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    'xn--mxahbxey0c.com',
    'Alan Turing',
    'alan@example.com',
    '$5k',
    'Want this name.',
    'pending'
  );
  d.prepare(
    `INSERT INTO arbitrage_requests (domain, name, email, budget, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('xn--nxasmq6b.com', 'Edsger Dijkstra', 'edsger@example.com', '$1k', '', 'closed');
  d.close();
}

async function runEndpointTests() {
  let superToken;
  let viewerToken;

  await test('setup: bootstrap superadmin and a viewer account', async () => {
    const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD, '10.77.0.1');
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;

    const created = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'viewer@portal.test', password: 'viewer-password-123', role: 'viewer' },
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));

    const viewerLogin = await portalLogin('viewer@portal.test', 'viewer-password-123', '10.77.0.2');
    assert.strictEqual(viewerLogin.status, 200, JSON.stringify(viewerLogin.body));
    viewerToken = viewerLogin.body.token;

    seedQueues();
  });

  await test('careers/arbitrage endpoints return 401 without a token', async () => {
    const unauthenticated = [
      [careersHandler, 'GET', '/api/admin/portal/careers/', {}],
      [arbitrageHandler, 'GET', '/api/admin/portal/arbitrage/', {}],
      [
        careerStatusHandler,
        'POST',
        '/api/admin/portal/careers/1/status/',
        { params: { id: '1' }, body: { status: 'contacted' } },
      ],
      [
        arbitrageStatusHandler,
        'POST',
        '/api/admin/portal/arbitrage/1/status/',
        { params: { id: '1' }, body: { status: 'contacted' } },
      ],
    ];
    for (const [handler, method, url, opts] of unauthenticated) {
      const res = await invoke(handler, method, url, opts);
      assert.strictEqual(res.status, 401, `${method} ${url} expected 401, got ${res.status}`);
    }
  });

  await test('careers/arbitrage endpoints reject non-leasing roles with 403', async () => {
    const res = await invoke(careersHandler, 'GET', '/api/admin/portal/careers/', {
      headers: adminHeader(viewerToken),
    });
    assert.strictEqual(res.status, 403);
    const res2 = await invoke(
      arbitrageStatusHandler,
      'POST',
      '/api/admin/portal/arbitrage/1/status/',
      {
        headers: adminHeader(viewerToken),
        params: { id: '1' },
        body: { status: 'contacted' },
      }
    );
    assert.strictEqual(res2.status, 403);
  });

  await test('careers list returns the seeded queue with envelope and status filter', async () => {
    const all = await invoke(careersHandler, 'GET', '/api/admin/portal/careers/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(all.status, 200, JSON.stringify(all.body));
    assert.strictEqual(all.body.total, 2);
    assert.strictEqual(all.body.items.length, 2);
    assert.ok('limit' in all.body && 'offset' in all.body, 'expected limit/offset in the envelope');
    const roles = all.body.items.map((i) => i.role).sort();
    assert.deepStrictEqual(roles, ['social-media-marketer', 'video-generation-expert']);

    const pending = await invoke(
      careersHandler,
      'GET',
      '/api/admin/portal/careers/?status=pending',
      {
        headers: adminHeader(superToken),
      }
    );
    assert.strictEqual(pending.status, 200);
    assert.strictEqual(pending.body.total, 1);
    assert.strictEqual(pending.body.items[0].status, 'pending');
    assert.strictEqual(pending.body.items[0].email, 'ada@example.com');

    const invalid = await invoke(careersHandler, 'GET', '/api/admin/portal/careers/?status=bogus', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(invalid.status, 400);
  });

  await test('arbitrage list returns the seeded queue with envelope and status filter', async () => {
    const all = await invoke(arbitrageHandler, 'GET', '/api/admin/portal/arbitrage/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(all.status, 200, JSON.stringify(all.body));
    assert.strictEqual(all.body.total, 2);
    const domains = all.body.items.map((i) => i.domain).sort();
    assert.deepStrictEqual(domains, ['xn--mxahbxey0c.com', 'xn--nxasmq6b.com']);

    const closed = await invoke(
      arbitrageHandler,
      'GET',
      '/api/admin/portal/arbitrage/?status=closed',
      {
        headers: adminHeader(superToken),
      }
    );
    assert.strictEqual(closed.status, 200);
    assert.strictEqual(closed.body.total, 1);
    assert.strictEqual(closed.body.items[0].status, 'closed');
  });

  await test('careers status flow: pending → contacted → closed with audit rows', async () => {
    const id = db()
      .prepare("SELECT id FROM career_applications WHERE email = 'ada@example.com'")
      .get().id;

    const contacted = await invoke(
      careerStatusHandler,
      'POST',
      `/api/admin/portal/careers/${id}/status/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(id) },
        body: { status: 'contacted' },
      }
    );
    assert.strictEqual(contacted.status, 200, JSON.stringify(contacted.body));
    assert.strictEqual(contacted.body.status, 'contacted');
    assert.strictEqual(contacted.body.id, id);

    const closed = await invoke(
      careerStatusHandler,
      'POST',
      `/api/admin/portal/careers/${id}/status/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(id) },
        body: { status: 'closed' },
      }
    );
    assert.strictEqual(closed.status, 200);
    assert.strictEqual(closed.body.status, 'closed');

    const row = db().prepare('SELECT status FROM career_applications WHERE id = ?').get(id);
    assert.strictEqual(row.status, 'closed');

    const audit = db()
      .prepare(
        "SELECT action, target, meta FROM admin_actions WHERE action = 'portal.careers.status' ORDER BY id DESC LIMIT 2"
      )
      .all();
    assert.strictEqual(audit.length, 2, 'expected two audit rows for the transitions');
    assert.strictEqual(audit[0].target, `career_application:${id}`);
    const meta = JSON.parse(audit[0].meta);
    assert.strictEqual(meta.from, 'contacted');
    assert.strictEqual(meta.to, 'closed');
  });

  await test('arbitrage status flow: pending → contacted and reopen to pending', async () => {
    const id = db()
      .prepare("SELECT id FROM arbitrage_requests WHERE email = 'alan@example.com'")
      .get().id;

    const contacted = await invoke(
      arbitrageStatusHandler,
      'POST',
      `/api/admin/portal/arbitrage/${id}/status/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(id) },
        body: { status: 'contacted' },
      }
    );
    assert.strictEqual(contacted.status, 200, JSON.stringify(contacted.body));
    assert.strictEqual(contacted.body.status, 'contacted');

    const reopened = await invoke(
      arbitrageStatusHandler,
      'POST',
      `/api/admin/portal/arbitrage/${id}/status/`,
      { headers: adminHeader(superToken), params: { id: String(id) }, body: { status: 'pending' } }
    );
    assert.strictEqual(reopened.status, 200);
    assert.strictEqual(reopened.body.status, 'pending');

    const audit = db()
      .prepare("SELECT COUNT(*) as c FROM admin_actions WHERE action = 'portal.arbitrage.status'")
      .get();
    assert.strictEqual(audit.c, 2);
  });

  await test('status endpoints validate input: 400 bogus/missing status, 400 bad id, 404 unknown id, 405 wrong method', async () => {
    const bogus = await invoke(careerStatusHandler, 'POST', '/api/admin/portal/careers/1/status/', {
      headers: adminHeader(superToken),
      params: { id: '1' },
      body: { status: 'bogus' },
    });
    assert.strictEqual(bogus.status, 400);

    const missing = await invoke(
      careerStatusHandler,
      'POST',
      '/api/admin/portal/careers/1/status/',
      {
        headers: adminHeader(superToken),
        params: { id: '1' },
        body: {},
      }
    );
    assert.strictEqual(missing.status, 400);

    const badId = await invoke(
      careerStatusHandler,
      'POST',
      '/api/admin/portal/careers/abc/status/',
      {
        headers: adminHeader(superToken),
        params: { id: 'abc' },
        body: { status: 'contacted' },
      }
    );
    assert.strictEqual(badId.status, 400);

    const unknown = await invoke(
      arbitrageStatusHandler,
      'POST',
      '/api/admin/portal/arbitrage/999999/status/',
      { headers: adminHeader(superToken), params: { id: '999999' }, body: { status: 'contacted' } }
    );
    assert.strictEqual(unknown.status, 404);

    const wrongMethod = await invoke(
      careerStatusHandler,
      'GET',
      '/api/admin/portal/careers/1/status/',
      {
        headers: adminHeader(superToken),
        params: { id: '1' },
      }
    );
    assert.strictEqual(wrongMethod.status, 405);
  });
}

async function main() {
  console.log('\n▸ Portal System Tests\n');
  await runStaticTests();
  await runEndpointTests();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`\n✗ ${failed.length} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n✓ All ${results.length} portal system tests passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
