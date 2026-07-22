/**
 * Calibration scan for the API security-contracts suite: lists write-handling
 * api files with no visible protection token (auth / api-handler / rate limit /
 * signature / cron secret).
 */
const fs = require('node:fs');
const path = require('node:path');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const WRITE_RE =
  /req\.method\s*!==?\s*'(POST|PUT|DELETE|PATCH)'|method\s*===?\s*'(POST|PUT|DELETE|PATCH)'|router\.(post|put|delete|patch)/;

const PROTECTION = {
  auth: ['requireAuth', 'requireAdmin', 'requirePortal', 'x-admin-token'],
  apiHandler: ['createApiHandler'],
  rate: [
    'checkPublicRateLimit',
    'rateLimit',
    'RATE_LIMIT',
    'rateLimited',
    'hits = new Map',
    'api-rate-limiter',
  ],
  sig: ['constructEvent', 'CRON_SECRET', 'cron-secret', 'x-cron-secret'],
  cronUtil: ['_utils'],
};

const files = walk('api');
let writeCount = 0;
const unprotected = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (!WRITE_RE.test(t)) continue;
  writeCount += 1;
  const found = Object.entries(PROTECTION)
    .filter(([, toks]) => toks.some((tok) => t.includes(tok)))
    .map(([k]) => k);
  if (found.length === 0) unprotected.push(f.replace(/\\/g, '/'));
}
console.log('write-handling api files:', writeCount);
console.log('UNPROTECTED:', unprotected.length);
unprotected.forEach((f) => console.log(' ', f));

// Cron auth calibration.
console.log('\n--- api/cron files without CRON_SECRET/_utils token ---');
for (const f of walk('api/cron')) {
  const t = fs.readFileSync(f, 'utf8');
  if (!t.includes('CRON_SECRET') && !t.includes('_utils') && !t.includes('cron-secret')) {
    console.log(' ', f.replace(/\\/g, '/'));
  }
}

// CORS wildcard calibration.
console.log('\n--- Access-Control-Allow-Origin wildcard in api/ ---');
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (/Access-Control-Allow-Origin['"],\s*'\*'/.test(t)) console.log(' ', f.replace(/\\/g, '/'));
}
