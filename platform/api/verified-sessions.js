const crypto = require('node:crypto');
const { getDb } = require('../db/connection');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createVerifiedSession(email) {
  const db = getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO verified_sessions (token, email, expires_at) VALUES (?, ?, ?)`).run(
    token,
    email,
    expiresAt
  );
  return token;
}

function consumeVerifiedSession(email, token) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM verified_sessions WHERE token = ? AND email = ?')
    .get(token, email);
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM verified_sessions WHERE token = ?').run(token);
    return false;
  }
  db.prepare('DELETE FROM verified_sessions WHERE token = ?').run(token);
  return true;
}

module.exports = { createVerifiedSession, consumeVerifiedSession };
