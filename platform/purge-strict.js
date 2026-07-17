const db = require('better-sqlite3')('db/punicodex.db');

const parked = db
  .prepare(`
  UPDATE indexed_sites SET status = 'spam'
  WHERE status = 'active'
    AND (LOWER(title) LIKE '%for sale%'
      OR LOWER(title) LIKE '%domain%'
      OR LOWER(title) LIKE '%premium%'
      OR LOWER(description) LIKE '%for sale%'
      OR LOWER(description) LIKE '%domain parking%'
      OR LOWER(description) LIKE '%buy this domain%')
`)
  .run();

const empty = db
  .prepare(`
  UPDATE indexed_sites SET status = 'error'
  WHERE status = 'active'
    AND word_count < 30
    AND quality_score < 0.5
`)
  .run();

// Restore flagships
const flagships = db
  .prepare(`
  UPDATE indexed_sites SET status = 'active'
  WHERE is_flagship = 1 AND status != 'active'
`)
  .run();

const active = db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get();
const puny = db
  .prepare(
    "SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active' AND punycode LIKE 'xn--%'"
  )
  .get();

console.log('Parked purged:', parked.changes);
console.log('Empty purged:', empty.changes);
console.log('Flagships restored:', flagships.changes);
console.log('Active now:', active.c);
console.log('Punycode active:', puny.c);
