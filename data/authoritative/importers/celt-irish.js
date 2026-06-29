/**
 * CELT Irish importer for PÚNYCODEX
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'CELT Irish',
  source: 'celt-irish',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('celt-irish importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
