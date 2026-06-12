const Database = require('better-sqlite3');
const { UnicodeCrawler } = require('../../platform/crawler');
const { getDbPath } = require('../../platform/db/db');
const { handleError, setCors } = require('../_utils');

const db = new Database(getDbPath());
const crawler = new UnicodeCrawler(db);

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { domain } = req.body || {};
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const result = await crawler.crawlDomain(domain);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
