/**
 * PuniCodex — Newsletter subscription endpoint.
 * POST /api/newsletter/subscribe { email, phone?, source?, _hp? }
 * Validates, honeypot-filters, rate-limits, stores, and sends a welcome
 * letter (Resend; mocked without a key). Phone is strictly optional.
 */

const crypto = require('node:crypto');
const { sendEmail } = require('../../../api/email.js');
const { getDb } = require('../../../db/connection.js');
const migrateNewsletter = require('../../../db/migrate-newsletter.js');

const RATE_LIMIT = 4; // subscriptions per IP per hour
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

// Shared connection (platform/db/connection.js copies the bundled DB to /tmp
// on Vercel); migration is idempotent and runs once per cold start. Guarded
// so a migration hiccup degrades the endpoint instead of breaking the require.
let migrated = false;
function ensureDb() {
  const db = getDb();
  if (!migrated) {
    try {
      migrateNewsletter(db);
      migrated = true;
    } catch (err) {
      console.error('[newsletter] migration failed:', err.message);
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

const WELCOME_SNIPPETS = [
  'Did you know? The acute on Apóllōn falls on the second syllable — Greek Ἀπόλλων never stresses the first alpha. An initial acute is structurally impossible in Greek.',
  'Did you know? Old Norse ð (eth) is the voiced dental fricative, as in English "this" — Hermóðr keeps it where English lost it.',
  'Did you know? IAST never writes ē — Sanskrit e and o are inherently long, which is why Kārttikeya, not Kārttikēya, is the correct form.',
  'Did you know? The circumflex does double duty: one mark recording both the pitch accent and the long vowel beneath it — Ἀθηνᾶ in a single sign.',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://punicodex.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many attempts — please wait a while and try again.' });
  }

  const { email, phone, source, _hp } = req.body || {};
  if (_hp) return res.status(200).json({ ok: true });

  // Normalize before validating so pasted emails with stray whitespace pass.
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (phone && (typeof phone !== 'string' || phone.replace(/[^\d+]/g, '').length < 7)) {
    return res.status(400).json({ error: 'That phone number looks incomplete — it is optional, so you can also leave it empty.' });
  }

  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);

  const database = ensureDb();
  const existing = database
    .prepare('SELECT id FROM newsletter_subscribers WHERE email = ?')
    .get(normalized);
  if (existing) {
    return res.status(200).json({ ok: true, alreadySubscribed: true });
  }

  database
    .prepare('INSERT INTO newsletter_subscribers (email, phone, source, confirmed, ip_hash) VALUES (?, ?, ?, 1, ?)')
    .run(normalized, phone ? phone.trim().slice(0, 32) : null, (source || 'site').slice(0, 40), ipHash);

  const snippet = WELCOME_SNIPPETS[crypto.randomInt(WELCOME_SNIPPETS.length)];
  // Best-effort: the subscription is the primary action; a welcome-email
  // failure must not fail the request (and the row is already inserted).
  try {
    await sendEmail({
      to: normalized,
      subject: 'Welcome to The Unicode Herald',
      html: `
      <div style="font-family:Georgia,serif;color:#1a1a1a;max-width:560px">
        <h2 style="color:#8a6d1f">The Unicode Herald</h2>
        <p>You are on the list. Expect the quarterly Herald — temple news, scholarly features, and sponsor showcases — and nothing more. No spam, ever.</p>
        <hr style="border-color:#d4af37">
        <p><em>${snippet}</em></p>
        <p>— The Unicode Pantheon, <a href="https://punicodex.com">punicodex.com</a></p>
        <p style="font-size:12px;color:#888">To unsubscribe, reply to this email with "unsubscribe" in the subject line.</p>
      </div>
    `,
      text: `You are on the list for The Unicode Herald (quarterly, no spam).\n\n${snippet}\n\n— punicodex.com\n\nTo unsubscribe, reply with "unsubscribe".`,
    });
  } catch (err) {
    console.error('[newsletter] welcome email failed:', err.message);
  }

  return res.status(200).json({ ok: true });
};
