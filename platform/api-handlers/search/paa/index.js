const { generatePeopleAlsoAsk } = require('../../../api/crawler-db');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit, 10) || 4;
    const questions = generatePeopleAlsoAsk(q, limit);
    res.json({ questions });
  } catch (err) {
    handleError(res, err);
  }
};
