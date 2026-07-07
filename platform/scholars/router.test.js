/**
 * PÚNYCODEX — Scholars API tests
 *
 * Spins up a real Express server with the scholars router and exercises
 * endpoints using node:http requests against an isolated SQLite database.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'punycodex-scholars-api-'));
const dbPath = path.join(tmpDir, 'test.db');
const uploadDir = path.join(tmpDir, 'uploads');
process.env.PUNYCODEX_TEST_DB_PATH = dbPath;
process.env.PUNYCODEX_SCHOLARS_UPLOAD_DIR = uploadDir;

const { getDb, closeDb } = require('../db/connection');
const dbLayer = require('../db/scholars');
const express = require('express');
const scholarsApi = require('./router');

let passed = 0;
let failed = 0;
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
      console.error(`    ${err.message}`);
    }
  }
}

function runScholarsMigrations(db) {
  const migrationPath = path.join(__dirname, '..', 'db', 'migrate-scholars.js');
  const source = fs.readFileSync(migrationPath, 'utf8');
  const match =
    source.match(/const SCHOLARS_SCHEMA = `([\s\S]*?)`;/) ||
    source.match(/db\.exec\(`([\s\S]*?)`\);/);
  if (!match) {
    throw new Error('Could not extract scholars migration SQL from migrate-scholars.js');
  }
  db.exec(match[1]);

  const qualityMigrationPath = path.join(__dirname, '..', 'db', 'migrate-scholars-quality.js');
  const qualitySource = fs.readFileSync(qualityMigrationPath, 'utf8');
  const qualityMatch = qualitySource.match(/const MIGRATION_SQL = `([\s\S]*?)`;/);
  if (!qualityMatch) {
    throw new Error('Could not extract quality migration SQL from migrate-scholars-quality.js');
  }
  db.exec(qualityMatch[1]);
}

let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    const app = express();
    app.use('/api/v1/scholars', scholarsApi);
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
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

    if (body && typeof body === 'object') {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sessionHeader(sessionId) {
  return { 'x-scholars-session': sessionId };
}

function requestMultipart(method, urlPath, { fields = {}, file = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const bodyParts = [];

    for (const [key, value] of Object.entries(fields)) {
      bodyParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        )
      );
    }

    if (file) {
      bodyParts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname || 'file'}"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`
        )
      );
      bodyParts.push(file.buffer);
      bodyParts.push(Buffer.from('\r\n'));
    }

    bodyParts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(bodyParts);

    const url = new URL(urlPath, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': body.length,
        ...headers,
      },
    };

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
    req.write(body);
    req.end();
  });
}

async function setup() {
  const db = getDb();
  runScholarsMigrations(db);

  const institution = dbLayer.createInstitution({
    name: 'Test Academy',
    slug: 'test-academy',
    domain: 'academy.test',
    accreditation: 'test',
  });
  const institutionId = institution.lastInsertRowid;

  const student = dbLayer.createUser({
    email: 'student@academy.test',
    institutionId,
    role: 'student',
    displayName: 'Student User',
  });
  const studentId = student.lastInsertRowid;

  const reviewer = dbLayer.createUser({
    email: 'reviewer@academy.test',
    institutionId,
    role: 'reviewer',
    displayName: 'Reviewer User',
  });
  const reviewerId = reviewer.lastInsertRowid;

  const curator = dbLayer.createUser({
    email: 'curator@academy.test',
    institutionId,
    role: 'curator',
    displayName: 'Curator User',
  });
  const curatorId = curator.lastInsertRowid;

  const temple = dbLayer.createTemple({
    entryId: 'zeus',
    name: 'Zeus',
    pantheon: 'olympian',
    tier: 'tier-1',
    manifestVersion: '0.1.0',
  });
  const templeId = temple.lastInsertRowid;

  const section = dbLayer.createSection({
    templeId,
    key: 'mythology',
    label: 'Mythology',
    body: '',
    sources: [],
    status: 'empty',
  });
  const sectionId = section.lastInsertRowid;

  // Seed a published section so search tests have content to query.
  dbLayer.updateSection({
    id: sectionId,
    body: 'Zeus is king of the Olympian gods and ruler of the sky in Greek mythology.',
    sources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
    status: 'published',
    updatedBy: studentId,
  });

  const studentSessionId = `student-session-${Date.now()}`;
  const reviewerSessionId = `reviewer-session-${Date.now()}`;
  const curatorSessionId = `curator-session-${Date.now()}`;
  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  dbLayer.createSession({ id: studentSessionId, userId: studentId, expiresAt: farFuture });
  dbLayer.createSession({ id: reviewerSessionId, userId: reviewerId, expiresAt: farFuture });
  dbLayer.createSession({ id: curatorSessionId, userId: curatorId, expiresAt: farFuture });

  await startServer();

  return {
    institutionId,
    studentId,
    reviewerId,
    curatorId,
    templeId,
    sectionId,
    studentSessionId,
    reviewerSessionId,
    curatorSessionId,
  };
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

async function main() {
  console.log('Running Scholars API tests...');

  const ctx = await setup();

  test('health endpoint returns ok', async () => {
    const res = await request('GET', '/api/v1/scholars/health');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (res.body.data.status !== 'ok') throw new Error('expected status ok');
    if (res.body.data.service !== 'scholars') throw new Error('expected service scholars');
  });

  test('lists temples', async () => {
    const res = await request('GET', '/api/v1/scholars/temples');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('expected data array');
    if (res.body.data.length !== 1)
      throw new Error(`expected 1 temple, got ${res.body.data.length}`);
  });

  test('filters temples by pantheon', async () => {
    const res = await request('GET', '/api/v1/scholars/temples?pantheon=greek');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (res.body.data.length !== 0) throw new Error('expected 0 greek temples');
  });

  test('returns temple detail with sections', async () => {
    const res = await request('GET', '/api/v1/scholars/temples/zeus');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (res.body.data.entry_id !== 'zeus') throw new Error('unexpected entry_id');
    if (!Array.isArray(res.body.data.sections)) throw new Error('expected sections array');
    if (res.body.data.sections.length !== 1)
      throw new Error(`expected 1 section, got ${res.body.data.sections.length}`);
  });

  test('returns 404 for unknown temple', async () => {
    const res = await request('GET', '/api/v1/scholars/temples/unknown');
    if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`);
  });

  test('search rejects empty query', async () => {
    const res = await request('GET', '/api/v1/scholars/search?q=');
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    if (res.body.success !== false) throw new Error('expected success=false');
  });

  test('search returns empty results for missing term', async () => {
    const res = await request('GET', '/api/v1/scholars/search?q=xyznonexistent');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (res.body.data.total !== 0) throw new Error('expected 0 total results');
    if (!Array.isArray(res.body.data.results)) throw new Error('expected results array');
  });

  test('rejects edit submission without auth', async () => {
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: { proposedBody: 'No auth' },
    });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  test('student can submit an edit', async () => {
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: {
        proposedBody: 'Zeus is king of the Olympian gods and ruler of the sky in Greek mythology.',
        proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
        editorNotes: 'Initial draft',
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 201)
      throw new Error(`expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (!res.body.data.editId) throw new Error('missing editId');
    if (typeof res.body.data.score !== 'number') throw new Error('missing quality score');
    if (!Array.isArray(res.body.data.warnings)) throw new Error('missing warnings array');
    ctx.editId = res.body.data.editId;
  });

  test('rejects edit with empty body and no sources', async () => {
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: { proposedBody: '', proposedSources: [] },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 422) throw new Error(`expected 422, got ${res.status}`);
    if (res.body.success !== false) throw new Error('expected success=false');
    if (!res.body.error.includes('Body is required'))
      throw new Error('expected body required error');
  });

  test('rejects edit below minimum quality score', async () => {
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: {
        proposedBody: 'Short text with no real citation.',
        proposedSources: [{ citation: 'Some random blog' }],
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 422) throw new Error(`expected 422, got ${res.status}`);
    if (res.body.success !== false) throw new Error('expected success=false');
    if (!res.body.error.includes('below the minimum'))
      throw new Error('expected minimum score error');
  });

  test('reviewer can list pending edits', async () => {
    const res = await request('GET', '/api/v1/scholars/edits/pending', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('expected data array');
    if (res.body.data.length !== 1)
      throw new Error(`expected 1 pending edit, got ${res.body.data.length}`);
    const edit = res.body.data[0];
    if (edit.section_key !== 'mythology') throw new Error('unexpected section_key');
    if (edit.entry_id !== 'zeus') throw new Error('unexpected entry_id');
    if (!edit.email) throw new Error('expected author email');
  });

  test('non-reviewer cannot list pending edits', async () => {
    const res = await request('GET', '/api/v1/scholars/edits/pending', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('reviewer can approve an edit', async () => {
    const res = await request('POST', `/api/v1/scholars/edits/${ctx.editId}/approve`, {
      body: { comment: 'Approved for publication' },
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.data.approved) throw new Error('expected approved=true');
  });

  test('approval publishes the section and creates history', async () => {
    const res = await request('GET', `/api/v1/scholars/sections/${ctx.sectionId}`);
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (
      res.body.data.body !==
      'Zeus is king of the Olympian gods and ruler of the sky in Greek mythology.'
    ) {
      throw new Error('section body not published');
    }
    if (res.body.data.status !== 'published') throw new Error('section status not published');

    const historyRes = await request('GET', `/api/v1/scholars/sections/${ctx.sectionId}/history`);
    if (historyRes.status !== 200) throw new Error(`expected 200, got ${historyRes.status}`);
    if (!Array.isArray(historyRes.body.data)) throw new Error('expected history array');
    if (historyRes.body.data.length !== 1)
      throw new Error(`expected 1 history record, got ${historyRes.body.data.length}`);
  });

  test('search finds published section body and groups by temple', async () => {
    const res = await request('GET', '/api/v1/scholars/search?q=king+of+the+Olympian');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (res.body.data.total < 1) throw new Error('expected at least one match');
    const results = res.body.data.results;
    if (!Array.isArray(results)) throw new Error('expected results array');
    if (results.length !== 1) throw new Error(`expected 1 temple group, got ${results.length}`);
    if (results[0].temple.entryId !== 'zeus') throw new Error('expected zeus temple group');
    if (!Array.isArray(results[0].sections)) throw new Error('expected sections array');
    const mythSection = results[0].sections.find((s) => s.key === 'mythology');
    if (!mythSection) throw new Error('expected mythology section in results');
    if (!mythSection.snippet.includes('king of the Olympian')) {
      throw new Error('expected snippet to contain query');
    }
  });

  test('search filters by pantheon', async () => {
    const res = await request('GET', '/api/v1/scholars/search?q=Zeus&pantheon=olympian');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (res.body.data.total < 1) throw new Error('expected matching olympian result');
    const otherRes = await request('GET', '/api/v1/scholars/search?q=Zeus&pantheon=egyptian');
    if (otherRes.status !== 200) throw new Error(`expected 200, got ${otherRes.status}`);
    if (otherRes.body.data.total !== 0) throw new Error('expected 0 egyptian results');
  });

  test('reviewer can reject an edit', async () => {
    const submitRes = await request(
      'POST',
      '/api/v1/scholars/temples/zeus/sections/mythology/edits',
      {
        body: {
          proposedBody:
            'This proposed edit is rejected because the reviewer finds it insufficiently sourced.',
          proposedSources: [{ citation: 'Hesiod, Theogony' }],
        },
        headers: sessionHeader(ctx.studentSessionId),
      }
    );
    if (submitRes.status !== 201) throw new Error(`expected 201, got ${submitRes.status}`);
    const editId = submitRes.body.data.editId;

    const rejectRes = await request('POST', `/api/v1/scholars/edits/${editId}/reject`, {
      body: { comment: 'Needs more sources' },
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (rejectRes.status !== 200)
      throw new Error(`expected 200, got ${rejectRes.status}: ${JSON.stringify(rejectRes.body)}`);
    if (!rejectRes.body.data.rejected) throw new Error('expected rejected=true');
  });

  test('author cannot approve their own edit', async () => {
    const submitRes = await request(
      'POST',
      '/api/v1/scholars/temples/zeus/sections/mythology/edits',
      {
        body: {
          proposedBody: 'Self-approval is forbidden by the scholarly review policy.',
          proposedSources: [{ citation: 'Hesiod, Theogony' }],
        },
        headers: sessionHeader(ctx.studentSessionId),
      }
    );
    if (submitRes.status !== 201) throw new Error(`expected 201, got ${submitRes.status}`);
    const editId = submitRes.body.data.editId;

    const approveRes = await request('POST', `/api/v1/scholars/edits/${editId}/approve`, {
      body: { comment: 'Self' },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (approveRes.status !== 403) throw new Error(`expected 403, got ${approveRes.status}`);
  });

  test('frozen temple rejects edits', async () => {
    dbLayer.setTempleFrozen('zeus', true);
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: {
        proposedBody: 'This edit is submitted while the temple is frozen and should be rejected.',
        proposedSources: [{ citation: 'Hesiod, Theogony' }],
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    dbLayer.setTempleFrozen('zeus', false);
  });

  test('session endpoint returns current user', async () => {
    const res = await request('GET', '/api/v1/scholars/auth/session', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (res.body.data.user.email !== 'reviewer@academy.test') {
      throw new Error('session user mismatch');
    }
    if (res.body.data.user.role !== 'reviewer') throw new Error('session role mismatch');
  });

  test('reviewer can fetch institution dashboard', async () => {
    const res = await request('GET', '/api/v1/scholars/institution', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (res.body.data.institution.name !== 'Test Academy') {
      throw new Error('unexpected institution name');
    }
    const stats = res.body.data.stats;
    if (stats.memberCount !== 3) throw new Error(`expected 3 members, got ${stats.memberCount}`);
    if (stats.totalSubmitted < 1) throw new Error('expected at least 1 submitted edit');
    if (stats.attributedSections < 1) throw new Error('expected at least 1 attributed section');
    if (!Array.isArray(res.body.data.users)) throw new Error('expected users array');
  });

  test('student cannot fetch institution dashboard', async () => {
    const res = await request('GET', '/api/v1/scholars/institution', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('curator can fetch admin stats', async () => {
    const res = await request('GET', '/api/v1/scholars/stats', {
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    const stats = res.body.data;
    if (stats.totalTemples !== 1) throw new Error(`expected 1 temple, got ${stats.totalTemples}`);
    if (stats.totalSections !== 1)
      throw new Error(`expected 1 section, got ${stats.totalSections}`);
    if (stats.totalUsers !== 3) throw new Error(`expected 3 users, got ${stats.totalUsers}`);
    if (stats.totalInstitutions !== 1)
      throw new Error(`expected 1 institution, got ${stats.totalInstitutions}`);
  });

  test('non-curator cannot fetch admin stats', async () => {
    const res = await request('GET', '/api/v1/scholars/stats', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('curator can list all users', async () => {
    const res = await request('GET', '/api/v1/scholars/users', {
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('expected data array');
    if (res.body.data.length !== 3)
      throw new Error(`expected 3 users, got ${res.body.data.length}`);
    const emails = res.body.data.map((u) => u.email).sort();
    const expected = [
      'curator@academy.test',
      'reviewer@academy.test',
      'student@academy.test',
    ].sort();
    if (JSON.stringify(emails) !== JSON.stringify(expected))
      throw new Error('unexpected user emails');
  });

  test('non-curator cannot list users', async () => {
    const res = await request('GET', '/api/v1/scholars/users', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('curator can list all institutions', async () => {
    const res = await request('GET', '/api/v1/scholars/institutions', {
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('expected data array');
    if (res.body.data.length !== 1)
      throw new Error(`expected 1 institution, got ${res.body.data.length}`);
    if (res.body.data[0].name !== 'Test Academy') throw new Error('unexpected institution name');
  });

  test('curator can freeze and unfreeze a temple', async () => {
    const freezeRes = await request('POST', '/api/v1/scholars/temples/zeus/freeze', {
      body: { isFrozen: true },
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (freezeRes.status !== 200)
      throw new Error(`expected 200, got ${freezeRes.status}: ${JSON.stringify(freezeRes.body)}`);
    if (!freezeRes.body.data.frozen) throw new Error('expected frozen=true');

    const unfreezeRes = await request('POST', '/api/v1/scholars/temples/zeus/freeze', {
      body: { isFrozen: false },
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (unfreezeRes.status !== 200) throw new Error(`expected 200, got ${unfreezeRes.status}`);
    if (unfreezeRes.body.data.frozen) throw new Error('expected frozen=false');
  });

  test('analytics view endpoint records a temple view', async () => {
    const res = await request('POST', '/api/v1/scholars/analytics/view', {
      body: { templeId: 'zeus' },
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (!res.body.data.recorded) throw new Error('expected recorded=true');
  });

  test('analytics view endpoint rejects missing templeId', async () => {
    const res = await request('POST', '/api/v1/scholars/analytics/view', {
      body: {},
    });
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  });

  test('curator can fetch analytics', async () => {
    const res = await request('GET', '/api/v1/scholars/analytics?days=30', {
      headers: sessionHeader(ctx.curatorSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    const data = res.body.data;
    if (!Array.isArray(data.editsByDay)) throw new Error('expected editsByDay array');
    if (!Array.isArray(data.approvalsByDay)) throw new Error('expected approvalsByDay array');
    if (!Array.isArray(data.viewsByDay)) throw new Error('expected viewsByDay array');
    if (!Array.isArray(data.topInstitutions)) throw new Error('expected topInstitutions array');
    if (!Array.isArray(data.topTemples)) throw new Error('expected topTemples array');
    if (data.periodDays !== 30) throw new Error('expected periodDays=30');
  });

  test('non-curator cannot fetch analytics', async () => {
    const res = await request('GET', '/api/v1/scholars/analytics', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('unauthenticated cannot fetch analytics', async () => {
    const res = await request('GET', '/api/v1/scholars/analytics');
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  // ─── Media ───

  test('student can upload base64 media', async () => {
    const image = Buffer.from('fake-image-png-data');
    const base64 = `data:image/png;base64,${image.toString('base64')}`;
    const res = await request('POST', '/api/v1/scholars/media', {
      body: { data: base64, filename: 'artifact.png', caption: 'A test artifact' },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 201)
      throw new Error(`expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (!res.body.data.mediaId) throw new Error('missing mediaId');
    if (!res.body.data.url.startsWith('/uploads/scholars/')) throw new Error('unexpected url');
    if (res.body.data.status !== 'pending') throw new Error('expected pending status');
    ctx.mediaId = res.body.data.mediaId;

    const filePath = path.join(uploadDir, res.body.data.filename);
    if (!fs.existsSync(filePath)) throw new Error('uploaded file not written to disk');
  });

  test('rejects media upload without auth', async () => {
    const res = await request('POST', '/api/v1/scholars/media', {
      body: { data: 'data:image/png;base64,abc', filename: 'x.png' },
    });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  test('student can upload multipart media', async () => {
    const fileBuffer = Buffer.from('fake-webp-image-bytes');
    const res = await requestMultipart('POST', '/api/v1/scholars/media', {
      file: {
        fieldname: 'file',
        filename: 'artifact.webp',
        mimeType: 'image/webp',
        buffer: fileBuffer,
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 201)
      throw new Error(`expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (res.body.data.mimeType !== 'image/webp') throw new Error('unexpected mimeType');
    if (res.body.data.status !== 'pending') throw new Error('expected pending status');
  });

  test('rejects unsupported media type', async () => {
    const res = await request('POST', '/api/v1/scholars/media', {
      body: { data: 'data:image/gif;base64,abc', filename: 'x.gif' },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 415) throw new Error(`expected 415, got ${res.status}`);
  });

  test('reviewer can list pending media', async () => {
    const res = await request('GET', '/api/v1/scholars/media?status=pending', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (!Array.isArray(res.body.data.items)) throw new Error('expected items array');
    if (!res.body.data.items.some((m) => m.id === ctx.mediaId))
      throw new Error('expected uploaded media in list');
  });

  test('student cannot list pending media', async () => {
    const res = await request('GET', '/api/v1/scholars/media?status=pending', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  test('reviewer can approve media', async () => {
    const res = await request('POST', `/api/v1/scholars/media/${ctx.mediaId}/approve`, {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.data.approved) throw new Error('expected approved=true');
  });

  test('reviewer can reject media', async () => {
    const image = Buffer.from('another-fake-image');
    const uploadRes = await request('POST', '/api/v1/scholars/media', {
      body: {
        data: `data:image/jpeg;base64,${image.toString('base64')}`,
        filename: 'rejected.jpg',
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (uploadRes.status !== 201) throw new Error(`expected 201, got ${uploadRes.status}`);
    const id = uploadRes.body.data.mediaId;

    const rejectRes = await request('POST', `/api/v1/scholars/media/${id}/reject`, {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (rejectRes.status !== 200)
      throw new Error(`expected 200, got ${rejectRes.status}: ${JSON.stringify(rejectRes.body)}`);
    if (!rejectRes.body.data.rejected) throw new Error('expected rejected=true');
  });

  // ─── Notifications ───

  test('notifications list returns valid shape', async () => {
    const res = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (res.status !== 200)
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error('expected success=true');
    if (!Array.isArray(res.body.data.notifications))
      throw new Error('expected notifications array');
    if (typeof res.body.data.unreadCount !== 'number')
      throw new Error('expected unreadCount number');
  });

  test('submitting edit notifies reviewers', async () => {
    const beforeRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    const beforeCount = beforeRes.body.data.notifications.length;

    const submitRes = await request(
      'POST',
      '/api/v1/scholars/temples/zeus/sections/mythology/edits',
      {
        body: {
          proposedBody:
            'A substantial scholarly proposal with citations and sufficient length to pass the quality gate. It describes Zeus in detail.',
          proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
        },
        headers: sessionHeader(ctx.studentSessionId),
      }
    );
    if (submitRes.status !== 201) throw new Error(`expected 201, got ${submitRes.status}`);
    ctx.notificationEditId = submitRes.body.data.editId;

    const notifRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (notifRes.status !== 200) throw new Error(`expected 200, got ${notifRes.status}`);
    if (notifRes.body.data.notifications.length <= beforeCount)
      throw new Error('expected notification count to increase after edit submission');
    const n = notifRes.body.data.notifications.find(
      (x) => x.type === 'edit_submitted' && x.data && x.data.editId === ctx.notificationEditId
    );
    if (!n) throw new Error('expected edit_submitted notification with matching editId');
  });

  test('approving edit notifies author', async () => {
    const approveRes = await request(
      'POST',
      `/api/v1/scholars/edits/${ctx.notificationEditId}/approve`,
      {
        body: { comment: 'Looks good for notification test' },
        headers: sessionHeader(ctx.reviewerSessionId),
      }
    );
    if (approveRes.status !== 200) throw new Error(`expected 200, got ${approveRes.status}`);

    const notifRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (notifRes.status !== 200) throw new Error(`expected 200, got ${notifRes.status}`);
    const approval = notifRes.body.data.notifications.find((n) => n.type === 'edit_approved');
    if (!approval) throw new Error('expected edit_approved notification for author');
  });

  test('rejecting edit notifies author', async () => {
    const submitRes = await request(
      'POST',
      '/api/v1/scholars/temples/zeus/sections/mythology/edits',
      {
        body: {
          proposedBody:
            'Another substantial scholarly proposal with citations and sufficient length to pass the quality gate. It describes Zeus in detail.',
          proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
        },
        headers: sessionHeader(ctx.studentSessionId),
      }
    );
    if (submitRes.status !== 201) throw new Error(`expected 201, got ${submitRes.status}`);
    const editId = submitRes.body.data.editId;

    const rejectRes = await request('POST', `/api/v1/scholars/edits/${editId}/reject`, {
      body: { comment: 'Needs more work' },
      headers: sessionHeader(ctx.reviewerSessionId),
    });
    if (rejectRes.status !== 200) throw new Error(`expected 200, got ${rejectRes.status}`);

    const notifRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (notifRes.status !== 200) throw new Error(`expected 200, got ${notifRes.status}`);
    const rejection = notifRes.body.data.notifications.find((n) => n.type === 'edit_rejected');
    if (!rejection) throw new Error('expected edit_rejected notification for author');
  });

  test('user can mark notification as read', async () => {
    const listRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    const unread = listRes.body.data.notifications.find((n) => !n.is_read);
    if (!unread) throw new Error('expected an unread notification');

    const readRes = await request('POST', `/api/v1/scholars/notifications/${unread.id}/read`, {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (readRes.status !== 200)
      throw new Error(`expected 200, got ${readRes.status}: ${JSON.stringify(readRes.body)}`);
    if (!readRes.body.data.read) throw new Error('expected read=true');

    const refreshed = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    const updated = refreshed.body.data.notifications.find((n) => n.id === unread.id);
    if (updated?.is_read !== 1) throw new Error('notification was not marked read in database');
  });

  test('user can dismiss notification', async () => {
    const listRes = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    const toDismiss = listRes.body.data.notifications[0];
    if (!toDismiss) throw new Error('expected a notification to dismiss');

    const dismissRes = await request(
      'POST',
      `/api/v1/scholars/notifications/${toDismiss.id}/dismiss`,
      {
        headers: sessionHeader(ctx.studentSessionId),
      }
    );
    if (dismissRes.status !== 200)
      throw new Error(`expected 200, got ${dismissRes.status}: ${JSON.stringify(dismissRes.body)}`);
    if (!dismissRes.body.data.dismissed) throw new Error('expected dismissed=true');

    const refreshed = await request('GET', '/api/v1/scholars/notifications', {
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (refreshed.body.data.notifications.some((n) => n.id === toDismiss.id))
      throw new Error('dismissed notification still present');
  });

  test('unauthenticated cannot access notifications', async () => {
    const res = await request('GET', '/api/v1/scholars/notifications');
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  // ─── Security headers & rate limiting ───

  test('security headers are present on responses', async () => {
    const res = await request('GET', '/api/v1/scholars/health');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (res.headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('missing X-Content-Type-Options: nosniff');
    }
    if (res.headers['x-frame-options'] !== 'DENY') {
      throw new Error('missing X-Frame-Options: DENY');
    }
    if (!res.headers['referrer-policy']) throw new Error('missing Referrer-Policy header');
    if (!res.headers['content-security-policy'])
      throw new Error('missing Content-Security-Policy header');
  });

  test('rate limit headers are present', async () => {
    const res = await request('GET', '/api/v1/scholars/health');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.headers['x-ratelimit-limit']) throw new Error('missing X-RateLimit-Limit header');
    if (!res.headers['x-ratelimit-remaining'])
      throw new Error('missing X-RateLimit-Remaining header');
    if (!res.headers['x-ratelimit-reset']) throw new Error('missing X-RateLimit-Reset header');
  });

  test('input length validation rejects oversized body', async () => {
    const oversizedBody = 'a'.repeat(50001);
    const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
      body: {
        proposedBody: oversizedBody,
        proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
      },
      headers: sessionHeader(ctx.studentSessionId),
    });
    if (res.status !== 413) throw new Error(`expected 413, got ${res.status}`);
    if (!res.body.error?.includes('proposedBody')) {
      throw new Error('expected error mentioning proposedBody');
    }
  });

  test('audit log records magic link request', async () => {
    const before = dbLayer.listAuditLog({ action: 'auth_magic_link_sent' }).length;
    const res = await request('POST', '/api/v1/scholars/auth/magic-link', {
      body: { email: 'audit-test@academy.test' },
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    const after = dbLayer.listAuditLog({ action: 'auth_magic_link_sent' });
    if (after.length <= before) throw new Error('expected audit log entry for magic link request');
    const entry = after[0];
    if (entry.action !== 'auth_magic_link_sent') throw new Error('unexpected audit action');
    if (entry.details.email !== 'audit-test@academy.test')
      throw new Error('unexpected audit email');
  });

  await runAllTests();
  console.log(`\nScholars API tests complete. ${passed} passed, ${failed} failed.`);
  await cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

main();
