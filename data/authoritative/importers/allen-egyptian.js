/**
 * Allen Egyptian importer for PuniCodex
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'Allen Egyptian',
  source: 'allen-egyptian',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('allen-egyptian importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
