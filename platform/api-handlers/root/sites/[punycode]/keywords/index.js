const Database = require('better-sqlite3');
const { getDbPath } = require('../../../../../db/db');
const { extractAndSave, getKeywords } = require('../../../../../api/keyword-extractor');
const { handleError, setCors, requireAdmin } = require('../../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../../api/public-rate-limiter');

const db = new Database(getDbPath());

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // The POST branch re-extracts keywords, which is outbound work billed to
    // us. It was reachable by anyone, unauthenticated and unthrottled — the
    // same shape the sibling spam handler already guards with requireAdmin.
    if (req.method === 'POST' && !(await requireAdmin(req, res))) return;
    if (req.method === 'GET' && !(await checkPublicRateLimitByReq(req, res, 'site-keywords'))) {
      return;
    }

    const punycode = req.query.punycode || req.params?.punycode;
    const site = db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(punycode);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    if (req.method === 'POST') {
      const keywords = await extractAndSave(site);
      return res.json({ success: true, count: keywords.length, keywords: keywords.slice(0, 50) });
    }

    const keywords = getKeywords(site.id, 100);
    res.json({ punycode, domain: site.domain, keywords });
  } catch (err) {
    handleError(res, err);
  }
};
