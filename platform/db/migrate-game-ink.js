#!/usr/bin/env node
/**
 * PuniCodex — game ink purchases table.
 *
 * One row per Stripe checkout for game Ink. stripe_session_id is the
 * idempotency key: a session's ink can be redeemed exactly once, forever.
 * Idempotent; runs inside db-init and on serverless cold starts.
 */

const GAME_INK_SCHEMA = `
  CREATE TABLE IF NOT EXISTS game_ink_purchases (
    stripe_session_id TEXT PRIMARY KEY,
    bundle TEXT NOT NULL,
    email TEXT,
    ink_granted INTEGER NOT NULL DEFAULT 0,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    redeemed INTEGER NOT NULL DEFAULT 0,
    redeemed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

function migrate(db) {
  db.exec(GAME_INK_SCHEMA);
}

function runStandalone() {
  const Database = require('better-sqlite3');
  const path = require('node:path');
  const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  migrate(db);
  db.close();
  console.log('Game ink purchases table ready.');
}

if (require.main === module) runStandalone();

module.exports = { migrate };
