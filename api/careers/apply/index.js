/**
 * PuniCodex — Careers application endpoint.
 * POST /api/careers/apply { role, name, email, links?, message, company?, _hp? }
 * Validates the role against the open-roles list, honeypot-filters, rate-
 * limits, persists the application (SQLite, hashed IP only), and emails it to
 * the founder via notifyCareersApplication (Resend; mocked without a key).
 */

const crypto = require('node:crypto');
const { notifyCareersApplication } = require('../../../platform/api/email.js');
const { getDb } = require('../../../platform/db/connection.js');
const { migrate } = require('../../../platform/db/migrate-careers.js');

const RATE_LIMIT = 5; // applications per IP per hour
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // in-memory fallback (ephemeral on serverless)

const ROLES = new Set([
  'social-media-marketer',
  'sponsorship-fulfilment',
  'video-generation-expert',
  'university-partnership-liaison',
]);

// Shared connection (platform/db/connection.js copies the bundled DB to /tmp
// on Vercel); migration is idempotent and runs once per cold start. Guarded
// so a migration hiccup degrades the endpoint instead of breaking the require.
let migrated = false;
function ensureDb() {
  const db = getDb();
  if (!migrated) {
    try {
      migrate(db);
      migrated = true;
    } catch (err) {
      console.error('[careers] migration failed:', err.message);
    }
  }
  return db;
}

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - (now % WINDOW_MS);
  const key = `${ip}:${windowStart}`;
  const count = (hits.get(key) || 0) + 1;
  hits.set(key, count);
  if (hits.size > 10000) hits.clear();
  return count > RATE_LIMIT;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://punicodex.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (rateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({ error: 'Too many applications — please wait a while and try again.' });
  }

  const { role, name, email, links, message, company, _hp } = req.body || {};
  // Honeypot: a filled hidden field means a bot. Pretend success.
  if (_hp || company) return res.status(200).json({ ok: true });

  if (!ROLES.has(role)) {
    return res.status(400).json({ error: 'Please choose one of the open roles.' });
  }

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    !name.trim() ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    message.trim().length < 20
  ) {
    return res.status(400).json({
      error:
        'Please complete all fields with a valid email and a message of at least 20 characters.',
    });
  }

  const trimmedName = name.trim().slice(0, 120);
  const trimmedEmail = email.trim().slice(0, 200);
  const trimmedLinks =
    typeof links === 'string' && links.trim() ? links.trim().slice(0, 500) : null;
  const trimmedMessage = message.trim().slice(0, 5000);
  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);

  const database = ensureDb();
  database
    .prepare(
      'INSERT INTO career_applications (role, name, email, links, message, ip_hash) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(role, trimmedName, trimmedEmail, trimmedLinks, trimmedMessage, ipHash);

  // Best-effort: the application row is the primary record; an email failure
  // must not fail the request.
  try {
    await notifyCareersApplication({
      role,
      name: trimmedName,
      email: trimmedEmail,
      links: trimmedLinks,
      message: trimmedMessage,
    });
  } catch (err) {
    console.error('[careers] application email failed:', err.message);
  }

  return res.status(200).json({ ok: true });
};
