const { domainToASCII } = require('node:url');
const Database = require('better-sqlite3');
const { getDbPath } = require('../../../platform/db/db');
const { handleError, setCors, requireAdmin } = require('../../_utils');

const db = new Database(getDbPath());

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireAdmin(req, res))) return;

  try {
    const { domains, source } = req.body || {};
    if (!domains) return res.status(400).json({ error: 'domains array required' });
    const list = Array.isArray(domains) ? domains : [domains];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
      VALUES (?, ?, ?)
    `);
    const queueStmt = db.prepare(`
      INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
      VALUES (?, ?, ?, 'pending', 0)
    `);

    let added = 0;
    let skipped = 0;
    for (const domain of list) {
      const punycode = domainToASCII(domain);
      if (!punycode) {
        skipped++;
        continue;
      }
      const info = stmt.run(domain, punycode, source || 'ct-log');
      if (info.changes > 0) {
        added++;
        queueStmt.run(domain, punycode, source || 'ct-log');
      }
    }

    const total = db.prepare('SELECT COUNT(*) as c FROM discovered_domains').get().c;
    res.json({ success: true, added, skipped, total_discovered: total });
  } catch (err) {
    handleError(res, err);
  }
};
