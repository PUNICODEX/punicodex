const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'platform', 'server.js');
let src = fs.readFileSync(file, 'utf8');

// 1. Add operational.run import after the bookings require block
if (!src.includes("require('./db/operational')")) {
  src = src.replace(
    "} = require('./api/bookings');",
    "} = require('./api/bookings');\nconst { run } = require('./db/operational');"
  );
}

// 2. Make requireAdmin async and await validateAdminToken
src = src.replace(
  `function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!validateAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}`,
  `async function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!(await validateAdminToken(token))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}`
);

// 3. Add async to route handler arrow functions that are not already async
// Matches route declarations ending with a non-async arrow handler on the same line.
src = src.replace(
  /^(app\.(get|post|put|patch|delete)\([^\n]*,\s*)(\([^)]*\))\s*=>\s*(?!async)/gm,
  '$1async $3 => '
);

// 4. Prefix async function calls with await (avoid methods and existing await)
const asyncFns = [
  'getSlots',
  'getSlotBySlug',
  'getSlotById',
  'createBooking',
  'getBookingByToken',
  'getBookingById',
  'getBookingByStripeSession',
  'updateBookingStripeSession',
  'markBookingPaid',
  'saveCreative',
  'setBookingStatus',
  'goLive',
  'endBooking',
  'getBookingsByEmail',
  'recordEvent',
  'getDashboardMetrics',
  'getBundleMembers',
  'getSlotCreatives',
  'saveSlotCreative',
  'updateSlotMeta',
  'isBundleSlot',
  'setCancelAtEnd',
  'adminLogin',
  'validateAdminToken',
  'revokeToken',
  'getAllBookings',
  'getBookingStats',
  'getRevenueStats',
  'listKeys',
  'createKey',
  'updateKey',
  'revokeKey',
  'unrevokeKey',
  'getKeyStats',
  'getKeyUsage',
  'logAction',
  'consumeVerifiedSession',
  'createVerifiedSession',
];

const fnPattern = new RegExp(
  `(?<!\\.\\s*)(?<!\\bawait\\s+)\\b(${asyncFns.join('|')})\\(`,
  'g'
);
src = src.replace(fnPattern, 'await $1(');

// 5. Replace direct SQLite email_verifications operations with operational.run
src = src.replace(
  `    db.prepare(\`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
    \`).run(email, code, expires);`,
  `    await run(\`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
    \`, [email, code, expires]);`
);

src = src.replace(
  `    const row = db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(email);`,
  `    const row = await get('SELECT * FROM email_verifications WHERE email = $1', [email]);`
);

src = src.replace(
  `    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);`,
  `    await run('DELETE FROM email_verifications WHERE email = $1', [email]);`
);

// 6. Replace direct SQLite bookings cleanup/update in server.js
src = src.replace(
  `      db.prepare('DELETE FROM bookings WHERE id = ?').run(id);`,
  `      await run('DELETE FROM bookings WHERE id = $1', [id]);`
);

src = src.replace(
  `    db.prepare(
      'UPDATE bookings SET custom_heading = ?, custom_subtitle = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(customHeading || null, customSubtitle || null, booking.id);`,
  `    await run(
      'UPDATE bookings SET custom_heading = $1, custom_subtitle = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [customHeading || null, customSubtitle || null, booking.id]
    );`
);

fs.writeFileSync(file, src);
console.log('Converted platform/server.js for async operational DB calls');
