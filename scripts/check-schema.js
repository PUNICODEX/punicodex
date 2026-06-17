const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db');
const db = new Database(getDbPath());
const tables = [
  'admin_actions',
  'verified_sessions',
  'email_verifications',
  'analytics_events',
  'bookings',
  'slot_creatives',
  'claims',
  'api_request_log',
  'admin_sessions',
];
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  console.log(t, cols.map((c) => `${c.name}(pk=${c.pk})`).join(', '));
}
