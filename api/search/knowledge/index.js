const { getKnowledgePanelData } = require('../../../platform/api/crawler-db');
const { handleError, setCors } = require('../../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const q = req.query.q || '';
    const data = getKnowledgePanelData(q);
    res.json({ data });
  } catch (err) {
    handleError(res, err);
  }
};
