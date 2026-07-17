/**
 * PuniCodex — Unicode Web Index Protocol (Phase 10)
 *
 * A public, versioned specification for exchanging Unicode-domain metadata
 * between crawlers, browsers, registrars, and scholarly catalogs.
 */

const { getVersion } = require('./version-service.js');

function getProtocolSpec() {
  const dataset = getVersion();
  return {
    name: 'Unicode Web Index Protocol (UWIP)',
    version: '1.0.0',
    governedBy: 'PuniCodex',
    description:
      'A minimal, open protocol for describing Unicode domain names, their scholarly attestations, trust status, and availability.',
    dataset: {
      version: dataset.version,
      releasedAt: dataset.releasedAt,
      entries: dataset.counts?.entries || 0,
      pantheons: dataset.counts?.pantheons || 0,
      license: dataset.license || { spdx: 'TBD' },
    },
    resources: {
      name: {
        pattern: '/api/v2/names/{id}',
        methods: ['GET'],
        fields: ['id', 'ascii', 'unicode', 'punycode', 'pantheon', 'tier', 'originalScript'],
      },
      site: {
        pattern: '/api/v2/sites/{punycode}',
        methods: ['GET'],
        fields: ['domain', 'punycode', 'title', 'description', 'trustTier', 'lastCrawled'],
      },
      search: {
        pattern: '/api/v2/search/web?q={query}',
        methods: ['GET'],
        fields: ['results', 'total', 'queryTrust'],
      },
      partnerRecord: {
        pattern: '/api/partners',
        methods: ['POST'],
        auth: 'Bearer partner key',
      },
      ecosystem: {
        pattern: '/api/ecosystem',
        methods: ['GET'],
      },
    },
    trustTiers: [
      { id: 'canonical', label: 'Canonical', description: 'Owned or scholarly canonical form.' },
      { id: 'styled', label: 'Styled', description: 'ASCII styling of a canonical term.' },
      { id: 'safe', label: 'Safe', description: 'No known homograph risk.' },
      { id: 'suspicious', label: 'Suspicious', description: 'Possible homograph or spoof.' },
      { id: 'unsafe', label: 'Unsafe', description: 'Confirmed homograph attack.' },
    ],
    extensions: [
      {
        id: 'punybrowser',
        name: 'PÚNYBrowser Shell',
        url: '/',
        description: 'Browser-grade omnibox and workspace integration.',
      },
      {
        id: 'type-tool',
        name: 'PuniCodex Type Tool',
        url: '/type/',
        description: 'Interactive Unicode restoration keyboard.',
      },
    ],
    contact: 'https://punicodex.com/contact/',
  };
}

module.exports = { getProtocolSpec };
