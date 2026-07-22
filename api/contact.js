/**
 * PuniCodex — Public contact endpoint.
 * POST /api/contact { name, email, subject, message }
 * Sends the message to the site inbox via Resend (mocked when no key),
 * with honeypot spam filtering and per-IP fixed-window rate limiting.
 */

const { sendEmail } = require('../platform/api/email.js');

const CONTACT_TO = process.env.CONTACT_EMAIL || 'punicodex@gmail.com';
const RATE_LIMIT = 5; // messages per IP per hour
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // in-memory fallback (ephemeral on serverless)

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://punicodex.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many messages — please wait a while and try again.' });
  }

  const { name, email, subject, message, company, _hp } = req.body || {};
  // Honeypot: a filled hidden field means a bot. Pretend success.
  if (_hp || company) return res.status(200).json({ ok: true });

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    !name.trim() ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    message.trim().length < 10
  ) {
    return res.status(400).json({ error: 'Please complete all fields with a valid email and a message of at least 10 characters.' });
  }

  const safeName = escapeHtml(name).slice(0, 120);
  const safeEmail = escapeHtml(email).slice(0, 200);
  const safeSubject = escapeHtml(subject || 'General Inquiry').slice(0, 120);
  const safeMessage = escapeHtml(message).slice(0, 5000);

  await sendEmail({
    to: CONTACT_TO,
    subject: `[PuniCodex Contact] ${safeSubject} — ${safeName}`,
    html: `
      <h2>New contact from punicodex.com</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <hr>
      <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      <hr>
      <p style="color:#888;font-size:12px">Sent from the contact form at punicodex.com/contact/</p>
    `,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
  });

  return res.status(200).json({ ok: true });
};
