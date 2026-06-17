/**
 * PUNYCODEX Availability Verification Cron
 *
 * Idempotent cron endpoint for Vercel.
 * Re-checks a batch of availability rows against live DNS.
 */
const { verifyAvailability } = require('../../../platform/scripts/verify-availability');
const { setCors, handleError } = require('../../_utils');

const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_LIMIT = 500;

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const maxAgeHours = Math.min(
      parseInt(req.query?.maxAgeHours, 10) || DEFAULT_MAX_AGE_HOURS,
      168
    );
    const limit = Math.min(parseInt(req.query?.limit, 10) || DEFAULT_LIMIT, 1000);

    const result = await verifyAvailability({ maxAgeHours, limit });

    res.json({
      success: true,
      ...result,
      nextRun: '24 hours',
    });
  } catch (err) {
    handleError(res, err);
  }
};
