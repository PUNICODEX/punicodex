const crypto = require('node:crypto');
const { get, run } = require('../db/operational');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function createVerifiedSession(email) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await run(`INSERT INTO verified_sessions (token, email, expires_at) VALUES ($1, $2, $3)`, [
    token,
    email,
    expiresAt,
  ]);
  return token;
}

async function consumeVerifiedSession(email, token) {
  const row = await get('SELECT * FROM verified_sessions WHERE token = $1 AND email = $2', [
    token,
    email,
  ]);
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    await run('DELETE FROM verified_sessions WHERE token = $1', [token]);
    return false;
  }
  await run('DELETE FROM verified_sessions WHERE token = $1', [token]);
  return true;
}

module.exports = { createVerifiedSession, consumeVerifiedSession };
