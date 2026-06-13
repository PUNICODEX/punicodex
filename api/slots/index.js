const { handleError, setCors } = require('../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Ad-slot booking backend is not active yet; return empty slots so the
    // flagship ad pages render their default placeholder frames without errors.
    res.json({ slots: [] });
  } catch (err) {
    handleError(res, err);
  }
};
