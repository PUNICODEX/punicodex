const Database = require('better-sqlite3');
const { getDbPath } = require('../../../platform/db/db');
const { handleError, setCors } = require('../../_utils');

const db = new Database(getDbPath());

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, siteId, position, dwellTimeMs } = req.body || {};
    if (!query || !siteId) {
      return res.status(400).json({ error: 'query and siteId required' });
    }

    const queryRow = db.prepare(`
      SELECT id FROM search_queries
      WHERE query = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(query.trim());

    const queryId = queryRow ? queryRow.id : null;

    db.prepare(`
      INSERT INTO search_clicks (query_id, site_id, position, dwell_time_ms)
      VALUES (?, ?, ?, ?)
    `).run(
      queryId,
      parseInt(siteId, 10),
      parseInt(position || 0, 10),
      parseInt(dwellTimeMs || 0, 10)
    );

    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
};
