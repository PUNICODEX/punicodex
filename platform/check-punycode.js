const Database = require('better-sqlite3');
const db = new Database('db/punycodex.db');

const punycode = db
  .prepare(
    "SELECT COUNT(*) as c FROM indexed_sites WHERE punycode LIKE 'xn--%' AND status='active'"
  )
  .get();
const total = db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active'").get();
const byTld = db
  .prepare(`
  SELECT 
    CASE 
      WHEN punycode LIKE '%.com' THEN '.com'
      WHEN punycode LIKE '%.net' THEN '.net'
      WHEN punycode LIKE '%.org' THEN '.org'
      WHEN punycode LIKE '%.io' THEN '.io'
      WHEN punycode LIKE '%.de' THEN '.de'
      WHEN punycode LIKE '%.fr' THEN '.fr'
      WHEN punycode LIKE '%.jp' THEN '.jp'
      WHEN punycode LIKE '%.eu' THEN '.eu'
      WHEN punycode LIKE '%.info' THEN '.info'
      WHEN punycode LIKE '%.uk' THEN '.uk'
      WHEN punycode LIKE '%.pl' THEN '.pl'
      ELSE 'other'
    END as tld,
    COUNT(*) as c
  FROM indexed_sites
  WHERE status = 'active' AND punycode LIKE 'xn--%'
  GROUP BY tld
  ORDER BY c DESC
`)
  .all();

console.log('Actual punycode (xn--) sites:', punycode.c, 'of', total.c, 'active');
console.log('Percentage:', `${((punycode.c / total.c) * 100).toFixed(1)}%`);
console.log('\nBy TLD (punycode only):');
byTld.forEach((r) => console.log(' ', r.tld, r.c));
