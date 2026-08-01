const Database = require('better-sqlite3');
const { getEntry } = require('../../../platform/api/search');
const { getDbPath } = require('../../../platform/db/db');
const { handleError, setCors } = require('../../_utils');

const db = new Database(getDbPath());

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const id = req.query.id || req.params.id;
    const entry = getEntry(id);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    const sites = db
      .prepare(`
      SELECT id, domain, punycode, title, description, favicon_path, is_flagship, tenant_name, status
      FROM indexed_sites
      WHERE lexicon_entry_id = ? AND status = 'active'
      ORDER BY is_flagship DESC, tier = 'dual' DESC, tier = '1' DESC
      LIMIT 5
    `)
      .all(id);

    res.json({ ...entry, sites: sites || [] });
  } catch (err) {
    handleError(res, err);
  }
};
