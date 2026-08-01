/**
 * GET /api/admin/authenticity/spoofs
 * List unreviewed discovered spoofs for the threat review dashboard.
 */

const { setCors, requireAdmin, handleError } = require('../../../../../api/_utils.js');
const { listUnreviewedSpoofs } = require('../../../../api/authenticity-threat-feed.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
      const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
      const filters = {
        limit,
        offset,
        verdict: req.query.verdict || undefined,
        severity: req.query.severity || undefined,
        source: req.query.source || undefined,
      };
      const items = listUnreviewedSpoofs(filters);
      return res.json({ success: true, items, limit, offset });
    }

    if (req.method === 'POST') {
      const {
        input,
        inputType = 'name',
        verdict,
        severity,
        confidence = 0,
        source = 'manual',
      } = req.body || {};
      if (!input || !verdict || !severity) {
        return res
          .status(400)
          .json({ success: false, error: 'input, verdict, and severity are required' });
      }
      const { recordDiscoveredSpoof } = require('../../../../api/authenticity-threat-feed.js');
      const spoof = recordDiscoveredSpoof({
        input,
        inputType,
        verdict,
        severity,
        discoverySource: source,
        confidence,
      });
      return res.status(201).json({ success: true, spoof });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
