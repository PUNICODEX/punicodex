/**
 * Seed founding discount codes — the hand-issued codes sent with founding
 * sponsorship pitches. The local developer DB carries them naturally, but CI
 * prebuilt deployments rebuild the DB from scratch (npm run db-init) and
 * ephemeral Vercel instances re-migrate on cold start, so durable codes must
 * live in a seed, not in any one database file.
 *
 * Idempotent: insert-or-ignore by code (NOCASE unique). Safe to run anywhere.
 *
 * Usage:
 *   node platform/db/seed-founding-codes.js        (from db-init)
 *   require('./seed-founding-codes.js').seed(db)   (from discount-service ensure)
 */

const FOUNDING_CODES = [
  {
    code: 'FATHERFEATHER',
    kind: 'percent_off',
    percent: 100,
    applies_to: 'quetzalcoatl',
    max_uses: 1,
    note: 'Feather Exchange founding pitch (featherexchange.com)',
  },
];

function seed(db) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO discount_codes
       (code, kind, percent, applies_to, max_uses, note, active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'founder')`
  );
  let added = 0;
  for (const row of FOUNDING_CODES) {
    const res = insert.run(row.code, row.kind, row.percent, row.applies_to, row.max_uses, row.note);
    added += res.changes;
  }
  return { added, total: FOUNDING_CODES.length };
}

module.exports = { seed, FOUNDING_CODES };

if (require.main === module) {
  const { getDb, closeDb } = require('./connection');
  const { migrate } = require('./migrate-discount-codes');
  const db = getDb();
  migrate(db);
  const result = seed(db);
  closeDb();
  console.log(`Founding codes: ${result.added} added, ${result.total} registered`);
}
