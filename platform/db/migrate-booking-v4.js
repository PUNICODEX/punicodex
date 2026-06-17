const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

function columnNames(table) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);
}

const cols = columnNames('analytics_events');

// Add viewability columns if missing
if (!cols.includes('visible_seconds')) {
  db.exec(`ALTER TABLE analytics_events ADD COLUMN visible_seconds REAL`);
  console.log('Added analytics_events.visible_seconds');
}
if (!cols.includes('visible_percent')) {
  db.exec(`ALTER TABLE analytics_events ADD COLUMN visible_percent REAL`);
  console.log('Added analytics_events.visible_percent');
}

// Recreate analytics_events to allow 'viewable_impression' in the event_type CHECK.
const createSql = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='analytics_events'")
  .get().sql;
if (createSql && !createSql.includes('viewable_impression')) {
  const indexList = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='analytics_events'")
    .all();

  db.exec('BEGIN TRANSACTION');
  try {
    db.exec(`
      CREATE TABLE analytics_events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'viewable_impression')),
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        referrer TEXT,
        is_bot INTEGER DEFAULT 0,
        visible_seconds REAL,
        visible_percent REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      INSERT INTO analytics_events_new
        (id, booking_id, event_type, ip_hash, user_agent, referrer, is_bot, visible_seconds, visible_percent, created_at)
      SELECT id, booking_id, event_type, ip_hash, user_agent, referrer, is_bot, visible_seconds, visible_percent, created_at
      FROM analytics_events
    `);
    db.exec('DROP TABLE analytics_events');
    db.exec('ALTER TABLE analytics_events_new RENAME TO analytics_events');

    for (const idx of indexList) {
      if (idx.sql && !idx.sql.includes('sqlite_autoindex')) {
        db.exec(idx.sql);
      }
    }
    db.exec('COMMIT');
    console.log('Recreated analytics_events table with viewable_impression support');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
} else {
  console.log('analytics_events already supports viewable_impression');
}

db.close();
console.log('Booking v4 migration complete');
