const { login: adminLogin } = require('../../../platform/api/admin');
const { handleError, setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'admin-login'))) {
    return;
  }

  try {
    const { password } = req.body || {};
    const result = await adminLogin(password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
