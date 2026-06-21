const { processWebhook } = require('../../platform/api/webhook-handler');
const { handleError, setCors } = require('../_utils');

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const rawBody = await getRawBody(req);
    await processWebhook(rawBody, signature);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    handleError(res, err);
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
