/**
 * Skaldic Norse importer for PuniCodex
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'Skaldic Norse',
  source: 'skaldic-norse',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('skaldic-norse importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
