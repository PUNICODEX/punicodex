/**
 * GET /api/protocol
 *
 * Returns the Unicode Web Index Protocol (UWIP) specification as JSON.
 */

const { getProtocolSpec } = require('../../../api/protocol-service.js');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    res.json({ success: true, data: getProtocolSpec() });
  } catch (err) {
    handleError(res, err);
  }
};
