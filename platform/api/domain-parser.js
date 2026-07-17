/**
 * PuniCodex — Domain Parser
 *
 * Splits a hostname into its public-suffix, registrable domain, and subdomain
 * parts using a local copy of the Mozilla Public Suffix List. It also decodes
 * Punycode labels and detects IPv4 literals.
 */

const { domainToUnicode } = require('node:url');
const PUBLIC_SUFFIX_LIST = require('../db/public-suffix-list.json');

// Build a lookup keyed by the number of labels so longer suffixes match first.
const SUFFIX_BY_LENGTH = new Map();
for (const entry of PUBLIC_SUFFIX_LIST) {
  const len = entry.labels.length;
  if (!SUFFIX_BY_LENGTH.has(len)) {
    SUFFIX_BY_LENGTH.set(len, []);
  }
  SUFFIX_BY_LENGTH.get(len).push(entry);
}
const SUFFIX_LENGTHS = Array.from(SUFFIX_BY_LENGTH.keys()).sort((a, b) => b - a);

const IPv4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isIPv4Literal(hostname) {
  const match = IPv4_RE.exec(hostname);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const n = Number(octet);
    return n >= 0 && n <= 255 && String(n) === octet;
  });
}

function stripInput(input) {
  let s = String(input).trim().toLowerCase();
  // Remove scheme.
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  // Remove authentication.
  s = s.replace(/^[^@]*@/, '');
  // Remove port before stripping path.
  s = s.replace(/:\d+(?=[/?#]|$)/, '');
  // Remove path and query.
  s = s.replace(/[/?#].*$/, '');
  // Remove trailing dot.
  s = s.replace(/\.$/, '');
  return s;
}

function decodePuny(label) {
  if (!label.startsWith('xn--')) return label;
  try {
    const decoded = domainToUnicode(label);
    return decoded || label;
  } catch {
    return label;
  }
}

function findPublicSuffix(labels) {
  for (const len of SUFFIX_LENGTHS) {
    if (labels.length < len) continue;
    const tail = labels.slice(-len);
    const candidates = SUFFIX_BY_LENGTH.get(len);
    for (const entry of candidates) {
      if (entry.labels.every((part, i) => part === tail[i])) {
        return entry;
      }
    }
  }
  return null;
}

function parseDomain(input) {
  const hostname = stripInput(input);

  if (isIPv4Literal(hostname)) {
    return {
      hostname,
      subdomain: null,
      domain: null,
      etld: null,
      isIp: true,
      isPunycode: false,
      labels: [hostname],
      decodedLabels: [hostname],
    };
  }

  const labels = hostname.split('.').filter((label) => label.length > 0);

  if (labels.length === 0) {
    return {
      hostname,
      subdomain: null,
      domain: null,
      etld: null,
      isIp: false,
      isPunycode: false,
      labels: [],
      decodedLabels: [],
    };
  }

  const decodedLabels = labels.map(decodePuny);
  const isPunycode = labels.some((label) => label.startsWith('xn--'));
  const suffixEntry = findPublicSuffix(labels);

  if (suffixEntry) {
    const suffixLen = suffixEntry.labels.length;
    if (labels.length > suffixLen) {
      const domainLen = suffixLen + 1;
      const domainLabels = labels.slice(-domainLen);
      const subdomainLabels = labels.slice(0, -domainLen);
      return {
        hostname,
        subdomain: subdomainLabels.length > 0 ? subdomainLabels.join('.') : null,
        domain: domainLabels.join('.'),
        etld: suffixEntry.suffix,
        isIp: false,
        isPunycode,
        labels,
        decodedLabels,
      };
    }
    // The entire hostname is the public suffix itself (e.g., "com").
    return {
      hostname,
      subdomain: null,
      domain: null,
      etld: suffixEntry.suffix,
      isIp: false,
      isPunycode,
      labels,
      decodedLabels,
    };
  }

  // Unknown TLD fallback: last two labels are treated as the registrable domain.
  if (labels.length >= 2) {
    return {
      hostname,
      subdomain: labels.length > 2 ? labels.slice(0, -2).join('.') : null,
      domain: labels.slice(-2).join('.'),
      etld: labels[labels.length - 1],
      isIp: false,
      isPunycode,
      labels,
      decodedLabels,
    };
  }

  return {
    hostname,
    subdomain: null,
    domain: labels.join('.'),
    etld: labels[labels.length - 1],
    isIp: false,
    isPunycode,
    labels,
    decodedLabels,
  };
}

module.exports = {
  parseDomain,
  decodePuny,
  isIPv4Literal,
};
