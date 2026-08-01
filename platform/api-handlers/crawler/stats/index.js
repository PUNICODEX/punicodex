const { getCrawlerStats } = require('../../../api/crawler-db');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    res.json(getCrawlerStats());
  } catch (err) {
    handleError(res, err);
  }
};
