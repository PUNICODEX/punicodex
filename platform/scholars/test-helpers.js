/**
 * PuniCodex — Scholars API test helpers
 *
 * Shared setup, teardown, and HTTP utilities for tests that exercise the
 * Scholars Express router against a real SQLite database.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

let currentTmpDir = null;

function runScholarsMigrations(db) {
  const { migrate: migrateScholars } = require('../db/migrate-scholars.js');
  const { migrate: migrateQuality } = require('../db/migrate-scholars-quality.js');
  const { migrate: migrateCreatives } = require('../db/migrate-scholars-creatives.js');
  migrateScholars(db);
  migrateQuality(db);
  // The creatives schema has a foreign key to the bookings table. Create a
  // minimal stub so scholars-only tests can still exercise purchases.
  db.exec(`CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT)`);
  migrateCreatives(db);
}

/**
 * Create a fresh, empty SQLite database file for a Scholars test suite.
 *
 * Sets `process.env.PUNICODEX_TEST_DB_PATH`. Pass a short, filesystem-safe
 * suite name (e.g. `load` or `concurrency`).
 */
function setupTestDb(suiteName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `punicodex-scholars-${suiteName}-`));
  const dbPath = path.join(tmpDir, 'test.db');
  process.env.PUNICODEX_TEST_DB_PATH = dbPath;
  currentTmpDir = tmpDir;
  return { dbPath, tmpDir };
}

/**
 * Start an isolated Scholars API server.
 *
 * Assumes `process.env.PUNICODEX_TEST_DB_PATH` is already set. Returns an
 * object with HTTP helpers, the db layer, and a cleanup function.
 */
async function startScholarsServer() {
  const { getDb, closeDb } = require('../db/connection');
  const dbLayer = require('../db/scholars');
  const { hashPassword } = require('./auth');
  const express = require('express');
  const scholarsApi = require('./router');

  const db = getDb();
  runScholarsMigrations(db);

  const institution = dbLayer.createInstitution({
    name: 'Load Test Academy',
    slug: 'load-test-academy',
    domain: 'loadtest.academy',
    accreditation: 'test',
  });
  const institutionId = institution.lastInsertRowid;
  dbLayer.updateInstitutionSponsorship(institutionId, { sponsorshipStatus: 'active' });
  dbLayer.updateInstitutionAllowlist(institutionId, ['Classics', 'History']);

  const admin = dbLayer.createUserWithPassword({
    email: 'admin@loadtest.academy',
    institutionId,
    role: 'inst_admin',
    displayName: 'Admin User',
    department: 'Classics',
    passwordHash: hashPassword('AdminPass123!'),
    accountStatus: 'active',
  });
  const adminId = admin.lastInsertRowid;

  const reviewer = dbLayer.createUserWithPassword({
    email: 'reviewer@loadtest.academy',
    institutionId,
    role: 'reviewer',
    displayName: 'Reviewer User',
    department: 'Classics',
    passwordHash: hashPassword('ReviewerPass123!'),
    accountStatus: 'active',
  });
  const reviewerId = reviewer.lastInsertRowid;

  const secondReviewer = dbLayer.createUserWithPassword({
    email: 'reviewer2@loadtest.academy',
    institutionId,
    role: 'reviewer',
    displayName: 'Second Reviewer',
    department: 'History',
    passwordHash: hashPassword('ReviewerPass123!'),
    accountStatus: 'active',
  });
  const secondReviewerId = secondReviewer.lastInsertRowid;

  const temple = dbLayer.createTemple({
    entryId: 'zeus',
    name: 'Zeus',
    pantheon: 'olympian',
    tier: 'tier-1',
    manifestVersion: '0.1.0',
  });
  const templeId = temple.lastInsertRowid;

  const sectionKeys = ['mythology', 'original-script', 'sources', 'legacy'];
  const sections = {};
  for (const key of sectionKeys) {
    const section = dbLayer.createSection({
      templeId,
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      body: '',
      sources: [],
      status: 'empty',
    });
    sections[key] = section.lastInsertRowid;
  }

  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const adminSessionId = `admin-session-${Date.now()}`;
  const reviewerSessionId = `reviewer-session-${Date.now()}`;
  const secondReviewerSessionId = `reviewer2-session-${Date.now()}`;

  dbLayer.createSession({ id: adminSessionId, userId: adminId, expiresAt: farFuture });
  dbLayer.createSession({ id: reviewerSessionId, userId: reviewerId, expiresAt: farFuture });
  dbLayer.createSession({
    id: secondReviewerSessionId,
    userId: secondReviewerId,
    expiresAt: farFuture,
  });

  const app = express();
  app.use('/api/v1/scholars/', scholarsApi);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

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

  async function cleanup() {
    await new Promise((resolve) => server.close(() => resolve()));
    try {
      closeDb();
    } catch (_e) {
      // best effort
    }
    const dbPath = process.env.PUNICODEX_TEST_DB_PATH;
    if (dbPath) {
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch (_e) {
          // best effort
        }
      }
    }
    if (currentTmpDir) {
      try {
        fs.rmdirSync(currentTmpDir);
      } catch (_e) {
        // best effort
      }
      currentTmpDir = null;
    }
  }

  return {
    server,
    baseUrl,
    dbLayer,
    hashPassword,
    request,
    sessionHeader,
    cleanup,
    ctx: {
      institutionId,
      adminId,
      reviewerId,
      secondReviewerId,
      templeId,
      sections,
      adminSessionId,
      reviewerSessionId,
      secondReviewerSessionId,
    },
  };
}

/**
 * Create a batch of students quickly via the DB layer (bypasses HTTP for seeding).
 */
function createStudentBatch({ dbLayer, hashPassword, institutionId, count, prefix = 'student' }) {
  const students = [];
  const password = 'StudentPass123!';
  const passwordHash = hashPassword(password);
  for (let i = 0; i < count; i += 1) {
    const email = `${prefix}${i}@loadtest.academy`;
    const result = dbLayer.createUserWithPassword({
      email,
      institutionId,
      role: 'student',
      displayName: `Student ${i}`,
      department: 'Classics',
      passwordHash,
      accountStatus: 'active',
    });
    students.push({ id: result.lastInsertRowid, email, password });
  }
  return students;
}

/**
 * Create sessions for a list of users.
 */
function createSessions({ dbLayer, users }) {
  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessions = [];
  for (const user of users) {
    const sessionId = `session-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dbLayer.createSession({ id: sessionId, userId: user.id, expiresAt: farFuture });
    sessions.push({ userId: user.id, sessionId });
  }
  return sessions;
}

module.exports = {
  setupTestDb,
  startScholarsServer,
  createStudentBatch,
  createSessions,
};
