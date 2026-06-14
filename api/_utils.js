const { validateAdminToken } = require('../platform/api/admin');

function handleError(res, err) {
  console.error('API error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || !(await validateAdminToken(token))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = { handleError, setCors, requireAdmin };
