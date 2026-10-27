/**
 * PuniCodex — sponsorship scouting prospects.
 *
 * Businesses discovered by the sponsor-scouting ecosystem
 * (scripts/scout-temple-sponsors.js + store/sponsor-seed.json) or added
 * manually, ready for the founding-frame pitch emails from the admin portal.
 * One row per (temple, business) pair; the lifecycle mirrors the university
 * outreach pipeline (pending → contacted → replied → active | declined).
 *
 * SQLite + Postgres compatible via platform/db/operational.js.
 */

const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');
const { isPostgres, query, run } = require(path.join(__dirname, 'operational.js'));

async function ensureBusinessProspects() {
  if (isPostgres()) {
    await query(`CREATE TABLE IF NOT EXISTS business_prospects (
      id SERIAL PRIMARY KEY,
      temple_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      domain TEXT,
      industry_seat TEXT,
      industry_name TEXT,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'replied', 'active', 'declined')),
      source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'crawl', 'manual')),
      score INTEGER NOT NULL DEFAULT 0,
      signals TEXT NOT NULL DEFAULT '[]',
      pitch_count INTEGER NOT NULL DEFAULT 0,
      last_pitched_at TIMESTAMPTZ,
      code_id INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (temple_id, domain)
    )`);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_business_prospects_status ON business_prospects(status)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_business_prospects_temple ON business_prospects(temple_id)`
    );
    await migrateProspectColumns();
    return;
  }

  const { getDb } = require('./connection.js');
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temple_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      domain TEXT,
      industry_seat TEXT,
      industry_name TEXT,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'replied', 'active', 'declined')),
      source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'crawl', 'manual')),
      score INTEGER NOT NULL DEFAULT 0,
      signals TEXT NOT NULL DEFAULT '[]',
      pitch_count INTEGER NOT NULL DEFAULT 0,
      last_pitched_at DATETIME,
      code_id INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (temple_id, domain)
    );
    CREATE INDEX IF NOT EXISTS idx_business_prospects_status ON business_prospects(status);
    CREATE INDEX IF NOT EXISTS idx_business_prospects_temple ON business_prospects(temple_id);
  `);
  await migrateProspectColumns();
}

/** Guarded column adds — existing DBs predate later lifecycle fields. */
async function migrateProspectColumns() {
  const columns = [['code_id', 'INTEGER', 'INTEGER']];
  if (isPostgres()) {
    for (const [name, pgType] of columns) {
      await query(`ALTER TABLE business_prospects ADD COLUMN IF NOT EXISTS ${name} ${pgType}`);
    }
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  const existing = new Set(
    db
      .prepare(`PRAGMA table_info(business_prospects)`)
      .all()
      .map((c) => c.name)
  );
  for (const [name, , sqliteType] of columns) {
    if (!existing.has(name)) {
      db.prepare(`ALTER TABLE business_prospects ADD COLUMN ${name} ${sqliteType}`).run();
    }
  }
}

/**
 * Insert a prospect if its (temple, domain) pair is not present (idempotent
 * seeding). `row.signals` is an array of human-readable match reasons.
 */
async function upsertProspect(row) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    await query(
      `INSERT INTO business_prospects
         (temple_id, business_name, domain, industry_seat, industry_name, contact_email,
          status, source, score, signals, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10)
       ON CONFLICT (temple_id, domain) DO NOTHING`,
      [
        row.temple_id,
        row.business_name,
        row.domain || null,
        row.industry_seat || null,
        row.industry_name || null,
        row.contact_email || null,
        row.source || 'seed',
        row.score || 0,
        JSON.stringify(row.signals || []),
        JSON.stringify(row.metadata || {}),
      ]
    );
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO business_prospects
       (temple_id, business_name, domain, industry_seat, industry_name, contact_email,
        status, source, score, signals, metadata)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    row.temple_id,
    row.business_name,
    row.domain || null,
    row.industry_seat || null,
    row.industry_name || null,
    row.contact_email || null,
    row.source || 'seed',
    row.score || 0,
    JSON.stringify(row.signals || []),
    JSON.stringify(row.metadata || {})
  );
}

/** First-use bootstrap: an empty table (fresh production Postgres) imports
 * the committed sponsor seed so the outreach section is never blank. */
async function selfSeedIfEmpty() {
  const rows = await listProspectsRaw();
  if (rows.length > 0) return;
  let seed = null;
  try {
    seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'sponsor-seed.json'), 'utf8'));
  } catch {
    return; // seed file absent — nothing to import
  }
  for (const s of seed) {
    await upsertProspect({
      temple_id: s.temple,
      business_name: s.business,
      domain: s.domain || null,
      industry_seat: s.seat || null,
      industry_name: s.seatName || null,
      contact_email: s.contactEmail || null,
      source: 'seed',
      score: s.score || 0,
      signals: s.signals || [],
      metadata: { seeded_by: 'self-seed (empty table)' },
    });
  }
}

async function listProspectsRaw() {
  if (isPostgres()) {
    return query(`SELECT * FROM business_prospects ORDER BY temple_id, score DESC, business_name`);
  }
  const { getDb } = require('./connection.js');
  return getDb()
    .prepare(`SELECT * FROM business_prospects ORDER BY temple_id, score DESC, business_name`)
    .all();
}

async function listProspects({ status, templeId } = {}) {
  await ensureBusinessProspects();
  await selfSeedIfEmpty();
  const clauses = [];
  const params = [];
  if (status) {
    clauses.push(isPostgres() ? `status = $1` : `status = ?`);
    params.push(status);
  }
  if (templeId) {
    clauses.push(isPostgres() ? `temple_id = $${params.length + 1}` : `temple_id = ?`);
    params.push(templeId);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM business_prospects${where} ORDER BY temple_id, score DESC, business_name`;
  if (isPostgres()) return query(sql, params);
  const { getDb } = require('./connection.js');
  return getDb()
    .prepare(sql)
    .all(...params);
}

async function getProspectById(id) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    const rows = await query(`SELECT * FROM business_prospects WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  return db.prepare(`SELECT * FROM business_prospects WHERE id = ?`).get(id);
}

/** Record a pitch send: bump count, stamp time, move pending → contacted. */
async function markPitched(id) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    await query(
      `UPDATE business_prospects
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
    `UPDATE business_prospects
     SET pitch_count = pitch_count + 1, last_pitched_at = CURRENT_TIMESTAMP,
         status = CASE WHEN status = 'pending' THEN 'contacted' ELSE status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(id);
}

async function setProspectStatus(id, status) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    await query(`UPDATE business_prospects SET status = $1, updated_at = now() WHERE id = $2`, [
      status,
      id,
    ]);
    return;
  }
  const { getDb } = require('./connection.js');
  const db = getDb();
  db.prepare(
    `UPDATE business_prospects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status, id);
}

/** Bind the provisioned founding code so re-pitches reuse it (idempotent). */
async function linkCode(id, codeId) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    await query(`UPDATE business_prospects SET code_id = $1, updated_at = now() WHERE id = $2`, [
      codeId,
      id,
    ]);
    return;
  }
  const { getDb } = require('./connection.js');
  getDb()
    .prepare(
      `UPDATE business_prospects SET code_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(codeId, id);
}

/** Test hygiene: remove a prospect row outright. */
async function deleteProspect(templeId, domain) {
  await ensureBusinessProspects();
  if (isPostgres()) {
    await query(`DELETE FROM business_prospects WHERE temple_id = $1 AND domain = $2`, [
      templeId,
      domain,
    ]);
    return;
  }
  const { getDb } = require('./connection.js');
  getDb()
    .prepare(`DELETE FROM business_prospects WHERE temple_id = ? AND domain = ?`)
    .run(templeId, domain);
}

module.exports = {
  ensureBusinessProspects,
  deleteProspect,
  upsertProspect,
  listProspects,
  getProspectById,
  markPitched,
  setProspectStatus,
  linkCode,
};
