/**
 * Rundata Norse importer for PuniCodex
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'Rundata Norse',
  source: 'rundata-norse',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('rundata-norse importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
