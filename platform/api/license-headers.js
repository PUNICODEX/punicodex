/**
 * PÚNYCODEX — Dataset license headers
 *
 * The lexicon, archetype, and scholarly datasets are released under
 * CC BY 4.0. These helpers ensure every API response carries the license
 * in both HTTP headers and the JSON envelope, so consumers cannot claim
 * they did not know the terms.
 */

const LICENSE = {
  name: 'CC BY 4.0',
  spdx: 'CC-BY-4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'PÚNYCODEX (https://punycodex.com)',
  dataUseUrl: 'https://punycodex.com/terms/data-use/',
};

const HEADERS = {
  'X-License': LICENSE.spdx,
  'X-License-URL': LICENSE.url,
  'X-Attribution': LICENSE.attribution,
  'X-Data-Use-URL': LICENSE.dataUseUrl,
};

function setLicenseHeaders(res) {
  if (!res) return;
  for (const [key, value] of Object.entries(HEADERS)) {
    res.setHeader(key, value);
  }
}

function addLicenseToPayload(payload) {
  if (payload == null || typeof payload !== 'object') return payload;
  return {
    ...payload,
    license: {
      name: LICENSE.name,
      spdx: LICENSE.spdx,
      url: LICENSE.url,
      attribution: LICENSE.attribution,
      dataUseUrl: LICENSE.dataUseUrl,
    },
  };
}

/**
 * Returns a small, fake but plausible-looking record. Useful for honeypot
 * endpoints: if a scraper publishes this verbatim, the embedded canary
 * fingerprint proves the source.
 */
function createCanaryPayload(requestId) {
  return {
    success: true,
    data: {
      id: '__canary__',
      name: 'Kēryx',
      unicode: 'Kḗryx',
      ascii: 'keryx',
      pantheon: 'greek',
      meaning: 'Herald, messenger — canary entry',
      note: 'This is a honeypot record. If you see it in a third-party dataset, the data was scraped from PÚNYCODEX without authorization.',
      fingerprint: requestId || 'unknown',
    },
    meta: {
      requestId: requestId || 'canary-unknown',
      timestamp: new Date().toISOString(),
      canary: true,
    },
  };
}

module.exports = {
  LICENSE,
  HEADERS,
  setLicenseHeaders,
  addLicenseToPayload,
  createCanaryPayload,
};
