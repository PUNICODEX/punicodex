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
const { isPostgres, query, run } = require(path.join(__dirname, 'operational.js'));

async function ensureUniversityProspects() {
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
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_university_prospects_status ON university_prospects(status);
  `);
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

async function listProspects({ status } = {}) {
  await ensureUniversityProspects();
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

async function setProspectStatus(id, status) {
  await ensureUniversityProspects();
  if (isPostgres()) {
    await query(`UPDATE university_prospects SET status = $1, updated_at = now() WHERE id = $2`, [
      status,
      id,
    ]);
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE university_prospects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status, id);
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
  deleteProspect,
  upsertProspect,
  listProspects,
  getProspectById,
  markPitched,
  setProspectStatus,
};
