/**
 * POST /api/admin/authenticity/spoofs/:id/review
 * Review a discovered spoof (confirmed, false-positive, ignored).
 */

const { setCors, requireAdmin, handleError } = require('../../../../../../../api/_utils.js');
const { reviewSpoof } = require('../../../../../../api/authenticity-threat-feed.js');

const VALID_DECISIONS = new Set(['confirmed', 'false-positive', 'ignored']);

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const id = parseInt(req.query.id || req.params?.id, 10);
    const { decision } = req.body || {};

    if (!id || !VALID_DECISIONS.has(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Valid id and decision (confirmed, false-positive, ignored) are required.',
      });
    }

    const spoof = reviewSpoof(id, decision);
    if (!spoof) {
      return res.status(404).json({ success: false, error: 'Spoof not found' });
    }

    res.json({ success: true, spoof });
  } catch (err) {
    handleError(res, err);
  }
};
