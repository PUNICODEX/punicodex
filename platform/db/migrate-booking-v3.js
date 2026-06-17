const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

function tableExists(name) {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name) !==
    undefined
  );
}

function columnNames(table) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);
}

// ─── admin_actions audit log ───
if (!tableExists('admin_actions')) {
  db.exec(`
    CREATE TABLE admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_token TEXT,
      action TEXT NOT NULL,
      booking_id INTEGER,
      entry_id TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX idx_admin_actions_booking ON admin_actions(booking_id)`);
  db.exec(`CREATE INDEX idx_admin_actions_created ON admin_actions(created_at)`);
  console.log('Created admin_actions table');
}

// ─── verified_sessions for email verification tokens ───
if (!tableExists('verified_sessions')) {
  db.exec(`
    CREATE TABLE verified_sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX idx_verified_sessions_email ON verified_sessions(email)`);
  db.exec(`CREATE INDEX idx_verified_sessions_expires ON verified_sessions(expires_at)`);
  console.log('Created verified_sessions table');
}

// ─── admin_sessions: add expires_at ───
const adminCols = columnNames('admin_sessions');
if (!adminCols.includes('expires_at')) {
  db.exec(`ALTER TABLE admin_sessions ADD COLUMN expires_at DATETIME`);
  console.log('Added admin_sessions.expires_at');
}

// ─── bookings: add cancel flags and widen status CHECK ───
const existingCols = columnNames('bookings');
const desiredNewCols = {
  cancel_at_end: 'INTEGER DEFAULT 0',
  canceled_at: 'TEXT',
};

let needsRecreate = false;
for (const col of Object.keys(desiredNewCols)) {
  if (!existingCols.includes(col)) {
    needsRecreate = true;
  }
}

// We also want to allow 'pending_application' and 'cancelled' in the CHECK constraint.
// SQLite does not let us alter CHECK, so we recreate the table only when needed.
if (needsRecreate) {
  const allCols = [...existingCols];
  for (const [col] of Object.entries(desiredNewCols)) {
    if (!allCols.includes(col)) allCols.push(col);
  }

  const colDefs = allCols
    .map((c) => {
      if (c === 'id') return 'id INTEGER PRIMARY KEY AUTOINCREMENT';
      if (c === 'status') {
        return "status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','pending_application','pending_upload','pending_approval','approved','rejected','live','ended','cancelled'))";
      }
      if (desiredNewCols[c]) return `${c} ${desiredNewCols[c]}`;
      // Keep original type from PRAGMA
      const info = db
        .prepare(`PRAGMA table_info(bookings)`)
        .all()
        .find((x) => x.name === c);
      let type = info?.type || 'TEXT';
      if (info?.notnull) type += ' NOT NULL';
      if (info?.dflt_value !== null && info?.dflt_value !== undefined) {
        type += ` DEFAULT ${info.dflt_value}`;
      }
      return `${c} ${type}`;
    })
    .join(', ');

  const indexList = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='bookings'")
    .all();

  db.exec('BEGIN TRANSACTION');
  try {
    db.exec(`CREATE TABLE bookings_new (${colDefs})`);
    // Only copy columns that exist in the old table; new columns receive defaults.
    db.exec(
      `INSERT INTO bookings_new (${existingCols.join(', ')}) SELECT ${existingCols.join(', ')} FROM bookings`
    );
    db.exec('DROP TABLE bookings');
    db.exec('ALTER TABLE bookings_new RENAME TO bookings');

    // Re-create original indexes (except SQLite internal ones)
    for (const idx of indexList) {
      if (idx.sql && !idx.sql.includes('sqlite_autoindex')) {
        db.exec(idx.sql);
      }
    }
    db.exec('COMMIT');
    console.log('Recreated bookings table with new status CHECK and cancel columns');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
} else {
  console.log('Bookings table already has cancel columns');
}

// ─── analytics_events: add is_bot column for future bot-flagging (optional) ───
const analyticsCols = columnNames('analytics_events');
if (!analyticsCols.includes('is_bot')) {
  db.exec(`ALTER TABLE analytics_events ADD COLUMN is_bot INTEGER DEFAULT 0`);
  console.log('Added analytics_events.is_bot');
}

db.close();
console.log('Booking v3 migration complete');
