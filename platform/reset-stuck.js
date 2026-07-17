const Database = require('better-sqlite3');
const db = new Database('db/punicodex.db');
const result = db
  .prepare("UPDATE crawl_queue SET status = 'pending' WHERE status = 'crawling'")
  .run();
console.log('Reset', result.changes, 'stuck items to pending');
