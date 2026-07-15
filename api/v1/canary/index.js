/**
 * GET /api/v1/canary
 *
 * Honeypot endpoint. Real users never see this URL. If this response appears
 * verbatim in a third-party dataset or service, it proves the data was scraped
 * from PÚNYCODEX without following the CC BY 4.0 attribution terms.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { createCanaryPayload } = require('../../../platform/api/license-headers.js');

module.exports = createApiHandler(
  async (req, res) => {
    const requestId = res.locals?.requestId || 'unknown';
    // Log the access for audit purposes. In production this should feed SIEM or
    // an alert channel (e.g. webhook, email). Here we write to stderr so it is
    // captured by Vercel logs.
    console.error(
      `[CANARY_ACCESS] ip=${req.headers['x-forwarded-for'] || req.socket?.remoteAddress} ua="${req.headers['user-agent']}" requestId=${requestId}`
    );
    res.status(200).json(createCanaryPayload(requestId));
  },
  { version: 'v1' }
);
