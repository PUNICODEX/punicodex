/**
 * GET /api/ecosystem — Public partner directory
 * POST /api/ecosystem/usage — Report partner endpoint usage (Bearer partner key)
 */

const { getEcosystemDirectory, recordUsage } = require('../../../api/ecosystem-service.js');
const { handleError, setCors } = require('../../../../api/_utils');

function getBearer(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      return res.json({ success: true, data: getEcosystemDirectory() });
    }

    if (req.method === 'POST') {
      const key = getBearer(req);
      if (!key) return res.status(401).json({ error: 'Authorization: Bearer <key> required' });
      const endpoint = req.body?.endpoint || 'unknown';
      const result = recordUsage({ partnerKey: key, endpoint });
      if (!result) return res.status(401).json({ error: 'Invalid partner key' });
      return res.status(201).json({ success: true, data: result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
