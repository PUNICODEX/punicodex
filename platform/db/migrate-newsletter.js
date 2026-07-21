/**
 * PuniCodex — Newsletter migration: newsletter_subscribers table.
 * Idempotent; runs inside db-init and on serverless cold starts.
 */

module.exports = function migrateNewsletter(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT,
      source TEXT DEFAULT 'site',
      confirmed INTEGER DEFAULT 0,
      ip_hash TEXT,
      subscribed_at TEXT DEFAULT (datetime('now')),
      confirmed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscribers(subscribed_at);
  `);
  console.log('Newsletter subscribers table ready.');
};
