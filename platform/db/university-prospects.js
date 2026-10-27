/**
 * PuniCodex — university outreach prospects.
 *
 * Institutions discovered by the AU crawling ecosystem (scripts/seed-
 * australian-universities.js) or added manually, ready for the hybrid
 * template+personalization pitch emails from the admin portal.
 *
 * SQLite + Postgres compatible via platform/db/operational.js.
 */

const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');
const { isPostgres, query, run } = require(path.join(__dirname, 'operational.js'));

async function ensureUniversityProspects() {
  await migrateProspectColumns();
  if (isPostgres()) {
    await query(`CREATE TABLE IF NOT EXISTS university_prospects (
      id SERIAL PRIMARY KEY,
      institution_name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL DEFAULT 'AU',
      state TEXT,
      domain TEXT,
      departments TEXT NOT NULL DEFAULT '[]',
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'replied', 'active', 'declined')),
      source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'crawl', 'manual')),
      pitch_count INTEGER NOT NULL DEFAULT 0,
      last_pitched_at TIMESTAMPTZ,
      activated_at TIMESTAMPTZ,
      backlink_status TEXT NOT NULL DEFAULT 'pledged'
        CHECK (backlink_status IN ('pledged', 'verified', 'overdue')),
      backlink_deadline_at TIMESTAMPTZ,
      backlink_verified_at TIMESTAMPTZ,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_university_prospects_status ON university_prospects(status)`
    );
    return;
  }

  const { getDb } = require('./connection.js');
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS university_prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL DEFAULT 'AU',
      state TEXT,
      domain TEXT,
      departments TEXT NOT NULL DEFAULT '[]',
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'replied', 'active', 'declined')),
      source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'crawl', 'manual')),
      pitch_count INTEGER NOT NULL DEFAULT 0,
      last_pitched_at DATETIME,
      activated_at DATETIME,
      backlink_status TEXT NOT NULL DEFAULT 'pledged'
        CHECK (backlink_status IN ('pledged', 'verified', 'overdue')),
      backlink_deadline_at DATETIME,
      backlink_verified_at DATETIME,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_university_prospects_status ON university_prospects(status);
  `);
}

/** Guarded column adds — existing DBs predate the backlink pledge lifecycle. */
async function migrateProspectColumns() {
  const columns = [
    ['activated_at', 'TIMESTAMPTZ', 'DATETIME'],
    ['backlink_status', "TEXT NOT NULL DEFAULT 'pledged'", "TEXT NOT NULL DEFAULT 'pledged'"],
    ['backlink_deadline_at', 'TIMESTAMPTZ', 'DATETIME'],
    ['backlink_verified_at', 'TIMESTAMPTZ', 'DATETIME'],
  ];
  if (isPostgres()) {
    for (const [name, pgType] of columns) {
      await query(`ALTER TABLE university_prospects ADD COLUMN IF NOT EXISTS ${name} ${pgType}`);
    }
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  const existing = new Set(
    db
      .prepare(`PRAGMA table_info(university_prospects)`)
      .all()
      .map((c) => c.name)
  );
  for (const [name, , sqliteType] of columns) {
    if (!existing.has(name)) {
      db.prepare(`ALTER TABLE university_prospects ADD COLUMN ${name} ${sqliteType}`).run();
    }
  }
}

/** Insert a prospect if its slug is not present (idempotent seeding). */
async function upsertProspect(row) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    await query(
      `INSERT INTO university_prospects
         (institution_name, slug, country, state, domain, departments, contact_email, status, source, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9)
       ON CONFLICT (slug) DO NOTHING`,
      [
        row.institution_name,
        row.slug,
        row.country || 'AU',
        row.state || null,
        row.domain || null,
        JSON.stringify(row.departments || []),
        row.contact_email || null,
        row.source || 'seed',
        JSON.stringify(row.metadata || {}),
      ]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO university_prospects
       (institution_name, slug, country, state, domain, departments, contact_email, status, source, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    row.institution_name,
    row.slug,
    row.country || 'AU',
    row.state || null,
    row.domain || null,
    JSON.stringify(row.departments || []),
    row.contact_email || null,
    row.source || 'seed',
    JSON.stringify(row.metadata || {})
  );
}

/** First-use bootstrap: an empty table (fresh production Postgres) imports
 * the committed AU seed so the outreach section is never blank. Idempotent —
 * only fires when zero rows exist. */
async function selfSeedIfEmpty() {
  const rows = await listProspectsRaw();
  if (rows.length > 0) return;
  let seed = null;
  try {
    seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'university-seed.json'), 'utf8'));
  } catch {
    return; // seed file absent — nothing to import
  }
  for (const u of seed) {
    await upsertProspect({
      institution_name: u.name,
      slug: u.slug,
      country: 'AU',
      state: u.state,
      domain: u.domain,
      departments: u.departments,
      source: 'seed',
      metadata: { seeded_by: 'self-seed (empty table)' },
    });
  }
}

async function listProspectsRaw() {
  if (isPostgres()) {
    return query(`SELECT * FROM university_prospects ORDER BY institution_name`);
  }
  const { getDb } = require('./connection.js');
  return getDb().prepare(`SELECT * FROM university_prospects ORDER BY institution_name`).all();
}

async function listProspects({ status } = {}) {
  await ensureUniversityProspects();
  await selfSeedIfEmpty();
  if (isPostgres()) {
    const rows = status
      ? await query(
          `SELECT * FROM university_prospects WHERE status = $1 ORDER BY institution_name`,
          [status]
        )
      : await query(`SELECT * FROM university_prospects ORDER BY institution_name`);
    return rows;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  return status
    ? db
        .prepare(`SELECT * FROM university_prospects WHERE status = ? ORDER BY institution_name`)
        .all(status)
    : db.prepare(`SELECT * FROM university_prospects ORDER BY institution_name`).all();
}

async function getProspectById(id) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    const rows = await query(`SELECT * FROM university_prospects WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  return db.prepare(`SELECT * FROM university_prospects WHERE id = ?`).get(id);
}

/** Record a pitch send: bump count, stamp time, move pending → contacted. */
async function markPitched(id) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    await query(
      `UPDATE university_prospects
       SET pitch_count = pitch_count + 1, last_pitched_at = now(),
           status = CASE WHEN status = 'pending' THEN 'contacted' ELSE status END,
           updated_at = now()
       WHERE id = $1`,
      [id]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE university_prospects
     SET pitch_count = pitch_count + 1, last_pitched_at = CURRENT_TIMESTAMP,
         status = CASE WHEN status = 'pending' THEN 'contacted' ELSE status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(id);
}

const BACKLINK_PLEDGE_MONTHS = 12;

async function setProspectStatus(id, status) {
  await ensureUniversityProspects();
  // Becoming an active collaborator starts the backlink pledge window:
  // features are live immediately; the link itself has a generous runway.
  const activate =
    status === 'active'
      ? `, activated_at = COALESCE(activated_at, ${isPostgres() ? 'now()' : 'CURRENT_TIMESTAMP'}),
         backlink_deadline_at = COALESCE(backlink_deadline_at, ${
           isPostgres()
             ? `now() + interval '1 month' * ${BACKLINK_PLEDGE_MONTHS}`
             : "DATE('now', '+12 months')"
})`
      : '';
  if (isPostgres()) {
    await query(
      `UPDATE university_prospects SET status = $1, updated_at = now()${activate} WHERE id = $2`,
      [status, id]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE university_prospects SET status = ?, updated_at = CURRENT_TIMESTAMP${activate} WHERE id = ?`
  ).run(status, id);
}

/** Merge crawled departments into a prospect (human-curated entries are kept). */
async function updateDepartments(id, departments) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    await query(
      `UPDATE university_prospects SET departments = $1, updated_at = now() WHERE id = $2`,
      [JSON.stringify(departments), id]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  getDb()
    .prepare(
      `UPDATE university_prospects SET departments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(JSON.stringify(departments), id);
}

/** The crawler's verification result: mark the pledge verified (or flip back). */
async function markBacklink(id, verified) {
  await ensureUniversityProspects();
  const nowExpr = isPostgres() ? 'now()' : 'CURRENT_TIMESTAMP';
  if (isPostgres()) {
    await query(
      `UPDATE university_prospects
       SET backlink_status = $1,
           backlink_verified_at = CASE WHEN $1::text = 'verified' THEN ${nowExpr} ELSE backlink_verified_at END,
           updated_at = ${nowExpr}
       WHERE id = $2`,
      [verified ? 'verified' : 'pledged', id]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE university_prospects
     SET backlink_status = ?,
         backlink_verified_at = CASE WHEN ? = 'verified' THEN ${nowExpr} ELSE backlink_verified_at END,
         updated_at = ${nowExpr}
     WHERE id = ?`
  ).run(verified ? 'verified' : 'pledged', verified ? 'verified' : 'pledged', id);
}

/** Nightly sweep: pledges past deadline and still unverified become overdue. */
async function sweepOverdueBacklinks() {
  await ensureUniversityProspects();
  const nowExpr = isPostgres() ? "DATETIME('now')" : "DATETIME('now')";
  if (isPostgres()) {
    return query(
      `UPDATE university_prospects
       SET backlink_status = 'overdue', updated_at = now()
       WHERE backlink_status = 'pledged' AND backlink_deadline_at IS NOT NULL AND backlink_deadline_at < now()
       RETURNING id, institution_name`
    );
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE university_prospects
     SET backlink_status = 'overdue', updated_at = CURRENT_TIMESTAMP
     WHERE backlink_status = 'pledged' AND backlink_deadline_at IS NOT NULL AND backlink_deadline_at < ${nowExpr}`
  ).run();
  return db
    .prepare(
      `SELECT id, institution_name FROM university_prospects WHERE backlink_status = 'overdue'`
    )
    .all();
}

/** Test hygiene: remove a prospect row outright. */
async function deleteProspect(slug) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    await query(`DELETE FROM university_prospects WHERE slug = $1`, [slug]);
    return;
  }
  const { getDb } = require('./connection.js');
  getDb().prepare(`DELETE FROM university_prospects WHERE slug = ?`).run(slug);
}

module.exports = {
  ensureUniversityProspects,
  BACKLINK_PLEDGE_MONTHS,
  markBacklink,
  updateDepartments,
  sweepOverdueBacklinks,
  deleteProspect,
  upsertProspect,
  listProspects,
  getProspectById,
  markPitched,
  setProspectStatus,
};
