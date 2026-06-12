const { askOracle } = require('../../platform/api/oracle');
const { handleError, setCors } = require('../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const q = req.query.q || '';
    const result = askOracle(q);
    res.json({
      query: q,
      answer: result.answer,
      citations: result.citations,
      intent: result.context.intent,
      sources: {
        entries: result.context.entries?.map(e => ({ id: e.id, unicode: e.unicode, ascii: e.ascii, meaning: e.meaning })) || [],
        sites: result.context.sites?.map(s => ({ id: s.id, domain: s.domain, punycode: s.punycode, title: s.title, tenant_name: s.tenant_name })) || [],
        related: result.context.related?.map(r => ({ id: r.id, unicode: r.unicode, ascii: r.ascii, meaning: r.meaning })) || []
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};
