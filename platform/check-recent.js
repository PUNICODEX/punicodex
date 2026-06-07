const db = require('better-sqlite3')('db/punycodex.db');
const rows = db.prepare(`
  SELECT domain, punycode, title, quality_score, spam_score, word_count, status
  FROM indexed_sites
  WHERE status = 'active'
  ORDER BY last_crawled DESC
  LIMIT 20
`).all();
console.log(JSON.stringify(rows, null, 2));
