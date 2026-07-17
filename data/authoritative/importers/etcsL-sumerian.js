/**
 * ETCSL Sumerian importer for PuniCodex
 *
 * Stub: no online source configured yet.
 */

module.exports = {
  name: 'ETCSL Sumerian',
  source: 'etcsL-sumerian',
  defaultLicense: 'unknown',
  requiresOnline: false,

  async run() {
    console.log('etcsL-sumerian importer is a stub; no online source configured.');
    return { suggestions: [], snapshot: { processed: 0, matched: 0 } };
  },
};
