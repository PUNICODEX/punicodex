const partners = require('../../platform/api/partners');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

function getBearer(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!(await checkPublicRateLimitByReq(req, res, 'partners'))) return;

  try {
    if (req.method === 'POST' && req.body?.action === 'register') {
      const { name, email, tier, scopes, rateLimit } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const result = partners.registerPartner({ name, email, tier, scopes, rateLimit });
      return res.status(201).json(result);
    }

    const key = getBearer(req);
    if (!key) return res.status(401).json({ error: 'Authorization: Bearer <key> required' });
    const partner = partners.validatePartnerKey(key);
    if (!partner) return res.status(401).json({ error: 'Invalid partner key' });

    if (req.method === 'GET') {
      const { q, limit, offset } = req.query;
      return res.json(
        partners.queryRecords({
          q,
          limit: limit ? parseInt(limit, 10) : 20,
          offset: offset ? parseInt(offset, 10) : 0,
        })
      );
    }

    if (req.method === 'POST') {
      const record = req.body;
      if (!record || typeof record !== 'object')
        return res.status(400).json({ error: 'record JSON required' });
      const result = partners.submitRecord(partner.id, record);
      return res.status(201).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
