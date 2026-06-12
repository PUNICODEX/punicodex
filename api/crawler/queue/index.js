const { domainToASCII } = require('url');
const { getQueue, addToQueue } = require('../../../platform/api/crawler-db');
const { handleError, setCors } = require('../../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { status, limit, offset } = req.query;
      res.json(getQueue({
        status,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      }));
      return;
    }

    if (req.method === 'POST') {
      const { domains, source, priority } = req.body || {};
      if (!domains) return res.status(400).json({ error: 'domains required (string or array)' });
      const list = Array.isArray(domains) ? domains : [domains];
      let added = 0;
      let skipped = 0;
      for (const domain of list) {
        const punycode = domainToASCII(domain);
        if (!punycode) { skipped++; continue; }
        addToQueue(domain, punycode, source || 'manual', priority || 0);
        added++;
      }
      res.json({ success: true, added, skipped });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
