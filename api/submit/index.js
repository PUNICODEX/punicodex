const { submitDomain } = require('../../platform/api/crawler-db');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'submit'))) return;

  try {
    const { domain, email } = req.body || {};
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const result = submitDomain(domain, email ? `webmaster:${email}` : 'webmaster');
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
