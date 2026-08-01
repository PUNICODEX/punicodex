const { searchByGlyph, describeGlyph } = require('../../../api/glyph-search');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    const results = searchByGlyph(q, 10);
    res.json({ query: q, description: describeGlyph(q), results });
  } catch (err) {
    handleError(res, err);
  }
};
