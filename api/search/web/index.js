const crypto = require('crypto');
const Database = require('better-sqlite3');
const { searchWeb } = require('../../../platform/api/crawler-db');
const { getDbPath } = require('../../../platform/db/db');
const { handleError, setCors } = require('../../_utils');

const db = new Database(getDbPath());

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { q, limit, mode } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'q parameter required' });

    const results = await searchWeb(q, limit ? parseInt(limit, 10) : 20, mode || 'all');

    try {
      const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
      const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16) : null;
      const ua = req.headers['user-agent'] || '';
      const uaHash = ua ? crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16) : null;
      db.prepare(`
        INSERT INTO search_queries (query, result_count, mode, user_agent_hash, ip_hash)
        VALUES (?, ?, ?, ?, ?)
      `).run(q.trim(), results.total, mode || 'web', uaHash, ipHash);
    } catch (e) {
      // Logging failures shouldn't break search
    }

    res.json(results);
  } catch (err) {
    handleError(res, err);
  }
};
