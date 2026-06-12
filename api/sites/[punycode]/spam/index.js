const { markSiteSpam } = require('../../../../platform/api/crawler-db');
const { handleError, setCors } = require('../../../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const punycode = req.query.punycode || req.params.punycode;
    markSiteSpam(punycode);
    res.json({ success: true, punycode, status: 'spam' });
  } catch (err) {
    handleError(res, err);
  }
};
