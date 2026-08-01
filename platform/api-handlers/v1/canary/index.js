/**
 * GET /api/v1/canary
 *
 * Honeypot endpoint. Real users never see this URL. If this response appears
 * verbatim in a third-party dataset or service, it proves the data was scraped
 * from PuniCodex without following the CC BY 4.0 attribution terms.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { error } = require('../../../api/api-response.js');
const { createCanaryPayload } = require('../../../api/license-headers.js');

module.exports = createApiHandler(
  async (req, res) => {
    if (req.method !== 'GET') {
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
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
