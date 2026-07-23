#!/usr/bin/env node
/**
 * PuniCodex — register the Printful order-event webhook (one-time ops).
 *
 * Generates (or reuses) PRINTFUL_WEBHOOK_TOKEN and points Printful's
 * package_shipped / order_failed / order_cancelled events at
 * https://punicodex.com/api/webhook/printful?token=…
 *
 * Usage:
 *   PRINTFUL_API_KEY=... PRINTFUL_WEBHOOK_TOKEN=... node scripts/register-printful-webhook.js
 * (omit PRINTFUL_WEBHOOK_TOKEN to generate one — then add it to Vercel env)
 */
const crypto = require('node:crypto');

const KEY = process.env.PRINTFUL_API_KEY;
const BASE = process.env.PUBLIC_BASE_URL || 'https://punicodex.com';

async function main() {
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }
  const token = process.env.PRINTFUL_WEBHOOK_TOKEN || crypto.randomBytes(24).toString('hex');
  if (!process.env.PRINTFUL_WEBHOOK_TOKEN) {
    console.log('Generated PRINTFUL_WEBHOOK_TOKEN — add it to the Vercel env:');
    console.log(token);
  }
  const url = `${BASE}/api/webhook/printful?token=${token}`;
  const res = await fetch('https://api.printful.com/webhooks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      types: ['package_shipped', 'order_failed', 'order_canceled'],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Registration failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    process.exit(1);
  }
  console.log('Webhook registered:', JSON.stringify(json.result || json, null, 2).slice(0, 400));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
