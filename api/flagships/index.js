const { getFlagships } = require('../../platform/api/search');
const { handleError, setCors } = require('../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    res.json(getFlagships());
  } catch (err) {
    handleError(res, err);
  }
};
