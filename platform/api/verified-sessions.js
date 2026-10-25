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
  // Atomic claim: DELETE ... RETURNING — a read-then-delete let two
  // concurrent consumers both spend the same token (TOCTOU double-spend,
  // caught by test/booking-battle.test.js A3).
  const consumed = await get(
    'DELETE FROM verified_sessions WHERE token = $1 AND email = $2 RETURNING expires_at',
    [token, email]
  );
  if (!consumed) return false;
  if (new Date(consumed.expires_at) < new Date()) return false;
  return true;
}

const VERIFY_SEND_COOLDOWN_MS = 60 * 1000;

// Accepts the timestamp shapes both backends produce: SQLite
// CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS'), ISO strings, and Date objects.
function parseDbTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value;
  return Date.parse(iso);
}

/**
 * Per-email cooldown for verification-code sends, shared by the Express
 * server and the Vercel serverless handler. Without it an IP-rotating
 * attacker can bomb a victim's inbox AND overwrite their in-flight code
 * (the sendVerification upsert replaces the code).
 *
 * Returns the remaining cooldown in ms (0 = send allowed).
 */
async function verifySendCooldownRemaining(email) {
  const existing = await get('SELECT created_at FROM email_verifications WHERE email = $1', [
    email,
  ]);
  if (!existing?.created_at) return 0;
  const elapsed = Date.now() - parseDbTimestamp(existing.created_at);
  return elapsed < VERIFY_SEND_COOLDOWN_MS ? VERIFY_SEND_COOLDOWN_MS - elapsed : 0;
}

/**
 * The booking-service upsert refreshes code/expires_at but not created_at —
 * stamp it so the cooldown measures the LAST send. Call after a successful
 * send.
 */
async function stampVerifySend(email) {
  await run('UPDATE email_verifications SET created_at = $2 WHERE email = $1', [
    email,
    new Date().toISOString(),
  ]);
}

module.exports = {
  createVerifiedSession,
  consumeVerifiedSession,
  verifySendCooldownRemaining,
  stampVerifySend,
  VERIFY_SEND_COOLDOWN_MS,
};
