/**
 * Spam classifier migration.
 *
 * Adds a spam_signals JSON column to indexed_sites for explainable spam
 * classification. Idempotent.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

try {
  db.exec(`ALTER TABLE indexed_sites ADD COLUMN spam_signals TEXT`);
  console.log('Added spam_signals column');
} catch (_e) {
  // Column already exists
}

console.log('Spam classifier migration complete');
