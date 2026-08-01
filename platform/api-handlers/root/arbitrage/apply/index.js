/**
 * PuniCodex — Domain arbitrage application endpoint.
 * POST /api/arbitrage/apply { domain, name, email, budget?, notes?, _hp?, company? }
 * Persists each application to arbitrage_requests and emails it to the
 * arbitrage inbox via Resend (mocked when no key), with dual honeypot spam
 * filtering and per-IP fixed-window rate limiting. Hardening mirrors
 * api/contact.js; persistence mirrors api/newsletter/subscribe.js.
 */

const crypto = require('node:crypto');
const { sendEmail } = require('../../../platform/api/email.js');
const { getDb } = require('../../../platform/db/connection.js');
const { runMigration } = require('../../../platform/db/migrate-arbitrage.js');

const ARBITRAGE_TO = process.env.ARBITRAGE_EMAIL || 'punicodex@gmail.com';
const RATE_LIMIT = 5; // applications per IP per hour
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // in-memory fallback (ephemeral on serverless)

// Unicode-aware domain: dot-joined labels of letters/marks/digits with
// interior hyphens only, at least one dot, 253 chars total. Accepts both
// Unicode (athēnā.com) and punycode (xn--athn-9wa.com) forms.
const DOMAIN_RE =
  /^(?=.{1,253}$)[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}-]{0,61}[\p{L}\p{M}\p{N}])?(?:\.[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}-]{0,61}[\p{L}\p{M}\p{N}])?)+$/u;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// Shared connection (platform/db/connection.js copies the bundled DB to /tmp
// on Vercel); migration is idempotent and runs once per cold start. Guarded
// so a migration hiccup degrades the endpoint instead of breaking the require.
let migrated = false;
function ensureDb() {
  const db = getDb();
  if (!migrated) {
    try {
      runMigration();
      migrated = true;
    } catch (err) {
      console.error('[arbitrage] migration failed:', err.message);
    }
  }
  return db;
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

  const { domain, name, email, budget, notes, _hp, company } = req.body || {};
  // Honeypots: a filled hidden field means a bot. Pretend success.
  if (_hp || company) return res.status(200).json({ ok: true });

  if (
    typeof domain !== 'string' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    !DOMAIN_RE.test(domain.trim()) ||
    !name.trim() ||
    name.trim().length > 120 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    email.length > 254 ||
    (budget !== undefined &&
      budget !== null &&
      (typeof budget !== 'string' || budget.length > 60)) ||
    (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 2000))
  ) {
    return res.status(400).json({
      error: 'Please complete all required fields with a valid domain, name, and email.',
    });
  }

  const domainValue = domain.trim();
  const nameValue = name.trim();
  const emailValue = email.trim();
  const budgetValue = typeof budget === 'string' ? budget.trim() : '';
  const notesValue = typeof notes === 'string' ? notes.trim() : '';

  // Persist first — the application record is the primary artifact. Only a
  // truncated SHA-256 of the client IP is stored, never the raw address.
  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);
  const database = ensureDb();
  database
    .prepare(
      'INSERT INTO arbitrage_requests (domain, name, email, budget, notes, ip_hash) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(domainValue, nameValue, emailValue, budgetValue || null, notesValue || null, ipHash);

  const safeDomain = escapeHtml(domainValue).slice(0, 253);
  const safeName = escapeHtml(nameValue).slice(0, 120);
  const safeEmail = escapeHtml(emailValue).slice(0, 254);
  const safeBudget = escapeHtml(budgetValue || '—').slice(0, 60);
  const safeNotes = escapeHtml(notesValue).slice(0, 2000);

  await sendEmail({
    to: ARBITRAGE_TO,
    subject: `[PuniCodex Arbitrage] ${safeDomain} — ${safeName}`,
    html: `
      <h2>New domain arbitrage application</h2>
      <p><strong>Domain:</strong> ${safeDomain}</p>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Budget:</strong> ${safeBudget}</p>
      <hr>
      <p>${safeNotes ? safeNotes.replace(/\n/g, '<br>') : '<em>No notes.</em>'}</p>
      <hr>
      <p style="color:#888;font-size:12px">Sent from the arbitrage application form at punicodex.com/arbitrage/</p>
    `,
    text: `Domain: ${domainValue}\nName: ${nameValue}\nEmail: ${emailValue}\nBudget: ${budgetValue || '—'}\n\n${notesValue || '(no notes)'}`,
  });

  return res.status(200).json({ ok: true });
};
