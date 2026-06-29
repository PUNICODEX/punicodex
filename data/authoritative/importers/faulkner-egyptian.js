/**
 * Faulkner Egyptian importer for PÚNYCODEX
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'Faulkner Egyptian',
  source: 'faulkner-egyptian',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('faulkner-egyptian importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
