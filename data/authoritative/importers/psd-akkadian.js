/**
 * PSD Akkadian importer for PÚNYCODEX
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'PSD Akkadian',
  source: 'psd-akkadian',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('psd-akkadian importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
