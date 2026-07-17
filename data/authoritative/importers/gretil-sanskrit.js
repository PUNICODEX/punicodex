/**
 * GRETIL Sanskrit importer for PuniCodex
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'GRETIL Sanskrit',
  source: 'gretil-sanskrit',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('gretil-sanskrit importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
