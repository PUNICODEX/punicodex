const { listSpamSites, setSiteSpam } = require('../../../../api/spam-classifier');
const { handleError, setCors, requireAdmin } = require('../../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === 'GET') {
      const { limit, offset } = req.query;
      return res.json(
        listSpamSites({
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        })
      );
    }

    if (req.method === 'POST') {
      const { punycode, isSpam, note } = req.body || {};
      if (!punycode || typeof isSpam !== 'boolean') {
        return res.status(400).json({ error: 'punycode and isSpam are required' });
      }
      const result = setSiteSpam(punycode, isSpam, note);
      if (!result) return res.status(404).json({ error: 'Site not found' });
      return res.json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
