/**
 * PUNYCODEX — Unicode ↔ Punycode helpers
 * Mortal translations of divine names.
 */

const _PunyUtil = {
  isPunycode(str) {
    return str.startsWith('xn--');
  },

  toUnicode(punycodeDomain) {
    try {
      // URL API handles IDN conversion in modern browsers
      return new URL(`https://${punycodeDomain}`).hostname;
    } catch (_e) {
      return punycodeDomain;
    }
  },

  toPunycode(unicodeDomain) {
    try {
      return new URL(`https://${unicodeDomain}`).hostname;
    } catch (_e) {
      return unicodeDomain;
    }
  },

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (_e) {
      // Fallback: extract domain-like part
      const match = url.match(/^(?:https?:\/\/)?([^/]+)/);
      return match ? match[1] : url;
    }
  },

  hasUnicode(str) {
    return /[^\x00-\x7F]/.test(str);
  },
};
