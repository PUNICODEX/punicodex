const Database = require('better-sqlite3');
const { getDbPath } = require('../../platform/db/db');
const { handleError, setCors } = require('../_utils');

const db = new Database(getDbPath());

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const row = db.prepare('SELECT COUNT(*) as total FROM entries').get();
    res.json({ status: 'ok', entries: row.total });
  } catch (err) {
    handleError(res, err);
  }
};
