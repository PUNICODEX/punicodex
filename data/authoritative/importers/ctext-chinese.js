/**
 * CText Chinese importer for PÚNYCODEX
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'CText Chinese',
  source: 'ctext-chinese',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('ctext-chinese importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
