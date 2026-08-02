const { markSiteSpam } = require('../../../../../api/crawler-db');
const { handleError, setCors, requireAdmin } = require('../../../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await requireAdmin(req, res))) return;

  try {
    // req.params is undefined on Vercel — see the sibling keywords handler.
    const punycode = req.query.punycode || req.params?.punycode;
    markSiteSpam(punycode);
    res.json({ success: true, punycode, status: 'spam' });
  } catch (err) {
    handleError(res, err);
  }
};
