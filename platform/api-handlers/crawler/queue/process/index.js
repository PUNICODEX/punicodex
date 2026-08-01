const { processQueue } = require('../../../../scripts/bulk-crawl');
const { handleError, setCors, requireAdmin } = require('../../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireAdmin(req, res))) return;

  try {
    const { batchSize, concurrency } = req.body || {};
    const result = await processQueue({ batchSize, concurrency });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
};
