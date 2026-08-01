const Database = require('better-sqlite3');
const { getDbPath } = require('../../../db/db');
const { extractAndSave } = require('../../../api/keyword-extractor');
const { handleError, setCors, requireAdmin } = require('../../../../api/_utils');

const db = new Database(getDbPath());

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireAdmin(req, res))) return;

  try {
    const sites = db
      .prepare(`
      SELECT * FROM indexed_sites
      WHERE status = 'active' AND tenant_front_url IS NOT NULL AND tenant_front_url != ''
      ORDER BY id
    `)
      .all();

    const results = [];
    let updated = 0;
    let failed = 0;

    for (const site of sites) {
      try {
        const keywords = await extractAndSave(site);
        results.push({
          domain: site.domain,
          tenant_front_url: site.tenant_front_url,
          count: keywords.length,
          status: 'ok',
        });
        updated++;
      } catch (err) {
        results.push({
          domain: site.domain,
          tenant_front_url: site.tenant_front_url,
          status: 'error',
          error: err.message,
        });
        failed++;
      }
    }

    res.json({ success: true, total: sites.length, updated, failed, results });
  } catch (err) {
    handleError(res, err);
  }
};
