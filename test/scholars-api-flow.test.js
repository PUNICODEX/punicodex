/**
 * PÚNYCODEX — Scholarly Edition API flow regression suite
 *
 * End-to-end proof that the Scholarly Edition backend can never silently
 * break. Boots a real Express server + isolated SQLite database (mirroring
 * platform/scholars/router.test.js), seeds from the generated manifests,
 * and walks the complete lifecycle:
 *
 *   1. seed publishes the full corpus; a second run is a strict no-op
 *   2. manifest + temple endpoints serve the seeded content (404 for unknown)
 *   3. unauthenticated edits are rejected (401)
 *   4. student edit → reviewer approval → published body → history credit
 *      (student userId AND institution id in the attribution)
 *   5. re-seeding never clobbers scholar-approved content
 *   6. hostile markdown (<script>, <img onerror>) is stored raw but ALWAYS
 *      rendered escaped — both by markdown.js and by the baked page
 *   7. the "PÚNYCODEX Admin" identity exists but can never authenticate
 *   8. first-run history attribution names PÚNYCODEX Admin + admin userId
 *
 * Run: node test/scholars-api-flow.test.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'punycodex-scholars-flow-'));
const dbPath = path.join(tmpDir, 'test.db');
const uploadDir = path.join(tmpDir, 'uploads');
process.env.PUNYCODEX_TEST_DB_PATH = dbPath;
process.env.PUNYCODEX_SCHOLARS_UPLOAD_DIR = uploadDir;

const ROOT = path.join(__dirname, '..');
const { getDb, closeDb } = require(path.join(ROOT, 'platform', 'db', 'connection'));
const dbLayer = require(path.join(ROOT, 'platform', 'db', 'scholars'));
const { migrate: migrateScholars } = require(
  path.join(ROOT, 'platform', 'db', 'migrate-scholars.js')
);
const { migrate: migrateQuality } = require(
  path.join(ROOT, 'platform', 'db', 'migrate-scholars-quality.js')
);
const { migrate: migrateCreatives } = require(
  path.join(ROOT, 'platform', 'db', 'migrate-scholars-creatives.js')
);
const { verifyPassword } = require(path.join(ROOT, 'platform', 'scholars', 'auth'));
const { seedScholarsFromManifests } = require(
  path.join(ROOT, 'platform', 'db', 'scholars', 'seed')
);
const { renderMarkdown } = require(path.join(ROOT, 'platform', 'scholars', 'markdown.js'));
const { generateScholarsPage } = require(path.join(ROOT, 'scripts', 'generate-scholars.js'));
const express = require('express');
const scholarsApi = require(path.join(ROOT, 'platform', 'scholars', 'router'));

const SILENT_LOGGER = { log() {}, warn() {}, error() {} };

// A ≥500-char markdown body (quality gate: length 40 + two sources 25 +
// authoritative keyword 4 = 69 ≥ MIN_SCORE 30) with bold, a [^1] marker.
const STUDENT_BODY = [
  '### Revised Mythology',
  '',
  '**Zeus** rules the Olympian order as storm-god and guarantor of oaths. ' +
    'Hesiod frames his rise as the final act of the succession myth: Kronos ' +
    'devours his children, Rhea hides the infant on Crete, and the grown god ' +
    'forces the disgorging of his siblings before the Titanomachy settles ' +
    'divine rule for good.[^1]',
  '',
  'The Iliad then treats his will as the engine of the war narrative, ' +
    'weighing fates and bowing to a balance even he hesitates to overturn.[^2]',
].join('\n');

const STUDENT_SOURCES = [
  { citation: 'Hesiod, Theogony, Oxford Classical Text.', url: 'https://example.org/theogony' },
  { citation: 'Homer, Iliad, translated by A. T. Murray, Loeb.', url: 'https://example.org/iliad' },
];

const HOSTILE_BODY = [
  '### Security Probe',
  '',
  'This paragraph keeps the edit above the quality threshold while carrying ' +
    'hostile markup that must never reach a rendered page. The scholarly ' +
    'point stands: raw HTML is data, not layout, and every renderer in the ' +
    'pipeline is required to escape it before emitting trusted tags.[^1] ' +
    'Padding prose keeps the body comfortably above five hundred characters ' +
    'so the quality gate cannot reject it for brevity alone.',
  '',
  '<script>alert(1)</script>',
  '',
  '<img src=x onerror=alert(1)>',
].join('\n');

const HOSTILE_SOURCES = [
  { citation: 'Hesiod, Theogony, Oxford Classical Text.', url: 'https://example.org/theogony' },
];

let passed = 0;
let failed = 0;
let assertions = 0;
const testQueue = [];

function test(name, fn) {
  testQueue.push({ name, fn });
}

async function runAllTests() {
  for (const { name, fn } of testQueue) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(
        err.message
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n')
      );
    }
  }
}

function assert(cond, message) {
  assertions += 1;
  if (!cond) throw new Error(message);
}

let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    const app = express();
    app.use('/api/v1/scholars/', scholarsApi);
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

function request(method, urlPath, { body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    };
    if (body && typeof body === 'object') {
      const json = JSON.stringify(body);
      options.headers['content-type'] = 'application/json';
      options.headers['content-length'] = Buffer.byteLength(json);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          if (data && res.headers['content-type']?.includes('application/json')) {
            parsed = JSON.parse(data);
          }
        } catch (_e) {
          // leave as string
        }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body && typeof body === 'object') req.write(JSON.stringify(body));
    req.end();
  });
}

function sessionHeader(sessionId) {
  return { 'x-scholars-session': sessionId };
}

const ctx = {};

async function setup() {
  const db = getDb();
  migrateScholars(db);
  migrateQuality(db);
  // Creatives schema has a foreign key to bookings; stub it (same pattern as
  // platform/scholars/test-helpers.js).
  db.exec('CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT)');
  migrateCreatives(db);

  // First seed: publishes the whole corpus.
  ctx.seed1 = seedScholarsFromManifests({ logger: SILENT_LOGGER });

  // Sponsored institution + student + reviewer (mirrors router.test.js).
  const institution = dbLayer.createInstitution({
    name: 'Flow University',
    slug: 'flow-university',
    domain: 'flow.edu',
    accreditation: 'test',
  });
  ctx.institutionId = institution.lastInsertRowid;
  dbLayer.updateInstitutionSponsorship(ctx.institutionId, { sponsorshipStatus: 'active' });

  const { hashPassword } = require(path.join(ROOT, 'platform', 'scholars', 'auth'));
  const student = dbLayer.createUserWithPassword({
    email: 'student@flow.edu',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Flow Student',
    department: 'Classics',
    passwordHash: hashPassword('StudentPass123!'),
    accountStatus: 'active',
  });
  ctx.studentId = student.lastInsertRowid;

  const reviewer = dbLayer.createUserWithPassword({
    email: 'reviewer@flow.edu',
    institutionId: ctx.institutionId,
    role: 'reviewer',
    displayName: 'Flow Reviewer',
    department: 'Classics',
    passwordHash: hashPassword('ReviewerPass123!'),
    accountStatus: 'active',
  });
  ctx.reviewerId = reviewer.lastInsertRowid;

  await startServer();

  // Log in over HTTP to obtain real sessions.
  const studentLogin = await request('POST', '/api/v1/scholars/auth/login/', {
    body: { email: 'student@flow.edu', password: 'StudentPass123!' },
  });
  if (studentLogin.status !== 200) {
    throw new Error(
      `student login failed: ${studentLogin.status} ${JSON.stringify(studentLogin.body)}`
    );
  }
  ctx.studentSession = studentLogin.body.data.token;

  const reviewerLogin = await request('POST', '/api/v1/scholars/auth/login/', {
    body: { email: 'reviewer@flow.edu', password: 'ReviewerPass123!' },
  });
  if (reviewerLogin.status !== 200) {
    throw new Error(
      `reviewer login failed: ${reviewerLogin.status} ${JSON.stringify(reviewerLogin.body)}`
    );
  }
  ctx.reviewerSession = reviewerLogin.body.data.token;
}

function cleanup() {
  return new Promise((resolve) => {
    stopServer().then(() => {
      try {
        closeDb();
      } catch (_e) {
        // best effort
      }
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch (_e) {
          // best effort
        }
      }
      try {
        fs.rmdirSync(tmpDir);
      } catch (_e) {
        // best effort
      }
      resolve();
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 1–2. Seed + idempotency
// ─────────────────────────────────────────────────────────────

test('seed publishes the full scholarly corpus from manifests', () => {
  const all = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'platform', 'scholars', 'manifests', 'all.json'), 'utf8')
  );
  const expectedTemples = Object.keys(all.manifests).length;
  assert(
    ctx.seed1.templesCreated === expectedTemples,
    `expected ${expectedTemples} temples created, got ${ctx.seed1.templesCreated}`
  );
  assert(
    ctx.seed1.sectionsPublished >= 3000,
    `expected ≥3000 published sections, got ${ctx.seed1.sectionsPublished}`
  );
});

test('second seed run is a strict no-op (idempotent)', () => {
  const stats = seedScholarsFromManifests({ logger: SILENT_LOGGER });
  assert(stats.templesCreated === 0, `reseed created ${stats.templesCreated} temples`);
  assert(stats.sectionsCreated === 0, `reseed created ${stats.sectionsCreated} sections`);
  assert(stats.sectionsPublished === 0, `reseed published ${stats.sectionsPublished} sections`);
});

// ─────────────────────────────────────────────────────────────
// 3. Read endpoints serve seeded content
// ─────────────────────────────────────────────────────────────

test('GET /temples/zeus/manifest serves published seeded content', async () => {
  const res = await request('GET', '/api/v1/scholars/temples/zeus/manifest');
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const sections = res.body.data.sections;
  assert(Array.isArray(sections), 'manifest sections should be an array');

  const mythology = sections.find((s) => s.key === 'mythology');
  assert(mythology, 'mythology section missing from manifest');
  assert(mythology.status === 'published', `mythology status is ${mythology.status}`);
  assert(
    mythology.body.length > 800,
    `mythology body length ${mythology.body.length} should exceed 800`
  );
  assert(mythology.lastModifiedBy, 'mythology lastModifiedBy should be truthy');

  const editHistory = sections.find((s) => s.key === 'edit-history');
  assert(editHistory, 'edit-history section missing from manifest');
  assert(editHistory.status === 'empty', `edit-history status is ${editHistory.status}`);
});

test('GET /temples/not-a-temple/manifest returns 404', async () => {
  const res = await request('GET', '/api/v1/scholars/temples/not-a-temple/manifest');
  assert(res.status === 404, `expected 404, got ${res.status}`);
});

test('GET /temples/zeus returns populated sections', async () => {
  const res = await request('GET', '/api/v1/scholars/temples/zeus/');
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const sections = res.body.data.sections;
  assert(Array.isArray(sections) && sections.length >= 16, 'expected ≥16 sections');
  const mythology = sections.find((s) => s.key === 'mythology');
  assert(mythology, 'mythology section missing');
  assert(mythology.status === 'published', `mythology status is ${mythology.status}`);
  assert(
    typeof mythology.body === 'string' && mythology.body.length > 800,
    'published mythology body should be present'
  );
  ctx.mythologySectionId = mythology.id;
});

// ─────────────────────────────────────────────────────────────
// 4. Auth enforcement
// ─────────────────────────────────────────────────────────────

test('POST edit without a session is rejected with 401', async () => {
  const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits/', {
    body: { proposedBody: 'No session attached to this request.' },
  });
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

// ─────────────────────────────────────────────────────────────
// 5. Edit → review → approve → credit
// ─────────────────────────────────────────────────────────────

test('student submits a markdown edit with citations', async () => {
  const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits/', {
    body: {
      proposedBody: STUDENT_BODY,
      proposedSources: STUDENT_SOURCES,
      editorNotes: 'Regression-flow edit',
    },
    headers: sessionHeader(ctx.studentSession),
  });
  assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert(res.body.data.editId, 'missing editId');
  ctx.editId = res.body.data.editId;
});

test('reviewer approves the student edit', async () => {
  const res = await request('POST', `/api/v1/scholars/edits/${ctx.editId}/approve`, {
    body: { comment: 'Approved in regression flow' },
    headers: sessionHeader(ctx.reviewerSession),
  });
  assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert(res.body.data.approved === true, 'expected approved=true');
});

test('section endpoint now serves the student body', async () => {
  const res = await request('GET', '/api/v1/scholars/temples/zeus/sections/mythology');
  assert(res.status === 200, `expected 200, got ${res.status}`);
  assert(res.body.data.body === STUDENT_BODY, 'section body was not replaced by the approved edit');
  assert(res.body.data.status === 'published', `section status is ${res.body.data.status}`);
});

test('history credits the student AND the institution', async () => {
  const res = await request('GET', `/api/v1/scholars/sections/${ctx.mythologySectionId}/history`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const record = res.body.data.find((r) => r.edit_id === ctx.editId);
  assert(record, `no history record found for edit ${ctx.editId}`);
  assert(
    record.attribution.userId === ctx.studentId,
    `attribution.userId ${record.attribution.userId} !== student ${ctx.studentId}`
  );
  assert(
    record.attribution.institutionId === ctx.institutionId,
    `attribution.institutionId ${record.attribution.institutionId} !== institution ${ctx.institutionId}`
  );
  assert(
    record.attribution.reviewerId === ctx.reviewerId,
    `attribution.reviewerId ${record.attribution.reviewerId} !== reviewer ${ctx.reviewerId}`
  );
});

// ─────────────────────────────────────────────────────────────
// 6. Re-seed never clobbers scholar content
// ─────────────────────────────────────────────────────────────

test('re-seeding after an approved edit leaves the scholar body untouched', async () => {
  const stats = seedScholarsFromManifests({ logger: SILENT_LOGGER });
  assert(stats.sectionsPublished === 0, `reseed published ${stats.sectionsPublished} sections`);
  // Read straight from the DB layer: HTTP responses may be cached, which
  // could mask a clobber.
  const temple = dbLayer.getTempleByEntryId('zeus');
  const section = dbLayer.getSectionByTempleAndKey(temple.id, 'mythology');
  assert(
    section.body === STUDENT_BODY,
    'seed overwrote scholar-approved content (body changed after reseed)'
  );
});

// ─────────────────────────────────────────────────────────────
// 7. Hostile markdown is stored raw but always rendered escaped
// ─────────────────────────────────────────────────────────────

test('hostile markup is escaped by markdown.js and the baked page', async () => {
  const submit = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits/', {
    body: { proposedBody: HOSTILE_BODY, proposedSources: HOSTILE_SOURCES },
    headers: sessionHeader(ctx.studentSession),
  });
  assert(
    submit.status === 201,
    `expected 201, got ${submit.status}: ${JSON.stringify(submit.body)}`
  );
  const hostileEditId = submit.body.data.editId;

  const approve = await request('POST', `/api/v1/scholars/edits/${hostileEditId}/approve`, {
    body: { comment: 'Approved hostile fixture for sanitization test' },
    headers: sessionHeader(ctx.reviewerSession),
  });
  assert(approve.status === 200, `expected 200, got ${approve.status}`);

  // DB stores raw markdown…
  const stored = await request('GET', '/api/v1/scholars/temples/zeus/sections/mythology');
  assert(stored.status === 200, `expected 200, got ${stored.status}`);
  assert(stored.body.data.body === HOSTILE_BODY, 'stored body should be the raw hostile markdown');

  // …but rendering must always escape.
  const rendered = renderMarkdown(stored.body.data.body, { sectionKey: 'mythology' });
  assert(rendered.includes('&lt;script&gt;'), `markdown.js did not escape <script>: ${rendered}`);
  assert(!rendered.includes('<script>'), `markdown.js leaked a raw <script> tag: ${rendered}`);
  assert(!rendered.includes('<img'), `markdown.js leaked a raw <img> tag: ${rendered}`);

  // Bake the page with the hostile body via manifestOverride (no writes).
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'platform', 'scholars', 'manifests', 'zeus.json'), 'utf8')
  );
  manifest.sections = manifest.sections.map((s) =>
    s.key === 'mythology'
      ? { ...s, body: stored.body.data.body, sources: HOSTILE_SOURCES, status: 'published' }
      : s
  );
  const html = generateScholarsPage('zeus', manifest);
  assert(
    html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),
    'baked page did not escape the hostile script payload'
  );
  assert(
    !html.includes('<script>alert(1)</script>'),
    'baked page contains the raw hostile <script> payload'
  );
  assert(
    !html.includes('<img src=x onerror=alert(1)>'),
    'baked page contains the raw hostile <img>'
  );

  // Restore the section so later attribution/history assertions see a clean body.
  dbLayer.updateSection({
    id: ctx.mythologySectionId,
    body: STUDENT_BODY,
    sources: STUDENT_SOURCES,
    status: 'published',
    updatedBy: ctx.studentId,
  });
});

// ─────────────────────────────────────────────────────────────
// 8. Admin identity exists but can never authenticate
// ─────────────────────────────────────────────────────────────

test('seeded admin institution exists and admin login always fails', async () => {
  const institution = dbLayer.getInstitutionBySlug('punycodex-admin');
  assert(institution, 'punycodex-admin institution missing after seed');
  assert(
    institution.name === 'PÚNYCODEX Admin',
    `unexpected admin institution name: ${institution.name}`
  );

  const admin = dbLayer.getUserByEmail('admin@punycodex.com');
  assert(admin, 'admin@punycodex.com user missing after seed');
  ctx.adminUserId = admin.id;
  assert(
    verifyPassword('any-guess-password', admin.password_hash) === false,
    'verifyPassword should fail for an arbitrary password'
  );
  assert(
    verifyPassword('', admin.password_hash) === false,
    'verifyPassword should fail for an empty password'
  );

  const login = await request('POST', '/api/v1/scholars/auth/login/', {
    body: { email: 'admin@punycodex.com', password: 'any-guess-password' },
  });
  assert(login.status === 401, `expected 401 for admin login attempt, got ${login.status}`);
});

// ─────────────────────────────────────────────────────────────
// 9. First-run attribution
// ─────────────────────────────────────────────────────────────

test('earliest zeus mythology history record is attributed to PÚNYCODEX Admin', async () => {
  const res = await request('GET', `/api/v1/scholars/sections/${ctx.mythologySectionId}/history`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const records = res.body.data;
  assert(records.length >= 2, `expected ≥2 history records, got ${records.length}`);
  const earliest = [...records].sort((a, b) => {
    if (a.applied_at !== b.applied_at) return a.applied_at < b.applied_at ? -1 : 1;
    return a.id - b.id;
  })[0];
  assert(
    typeof earliest.attribution.note === 'string' &&
      earliest.attribution.note.includes('PÚNYCODEX Admin'),
    `earliest attribution note missing 'PÚNYCODEX Admin': ${JSON.stringify(earliest.attribution)}`
  );
  assert(
    earliest.attribution.userId === ctx.adminUserId,
    `earliest attribution.userId ${earliest.attribution.userId} !== admin user ${ctx.adminUserId}`
  );
});

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('Running Scholarly Edition API flow regression tests...');
  await setup();
  try {
    await runAllTests();
  } finally {
    await cleanup();
  }
  console.log(`\n${assertions} assertions passed, ${passed} checks green, ${failed} failed`);
  if (failed > 0) {
    console.error('✗ Scholarly Edition API flow regression tests FAILED');
    process.exit(1);
  }
  console.log('✓ All Scholarly Edition API flow regression tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
