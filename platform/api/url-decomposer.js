/**
 * PÚNYCODEX — URL Decomposer
 *
 * Parses a URL into a typed, evidence-rich tree. Each part carries a risk
 * rating and a set of obfuscation flags so downstream classifiers can reason
 * about the URL structurally rather than as a flat string.
 */

const { URL, domainToUnicode } = require('node:url');
const { parseDomain } = require('./domain-parser');
const { hasBidirectionalOverride } = require('./name-decomposer');

const SAFE_PORTS = new Set([80, 443, 8080, 8443]);

const SUSPICIOUS_PATH_SEGMENTS = new Set([
  'login',
  'signin',
  'account',
  'verify',
  'secure',
  'checkout',
  'billing',
  'password',
  'reset',
  'confirm',
  'update',
  'authenticate',
  'payment',
  'wallet',
]);

const REDIRECT_QUERY_KEYS = new Set([
  'redirect',
  'next',
  'return_to',
  'returnto',
  'return_url',
  'returnurl',
  'oauth_callback',
  'callback',
  'continue',
  'url',
  'target',
  'dest',
  'destination',
  'goto',
  'forward',
  'to',
]);

function hasPercentEncoding(str) {
  if (!str) return false;
  return /%[0-9a-fA-F]{2}/.test(str);
}

function decodePercent(str) {
  if (!str) return str;
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function hasMixedPunycode(labels, etld) {
  // Exclude the public suffix from "mixed" detection; mixing punycode with
  // the TLD (e.g., xn--pple-43d.com) is normal, while mixing it with other
  // ASCII labels inside the registrable domain (e.g., xn--pple-43d.example.com)
  // is the suspicious pattern.
  const etldLabels = etld ? etld.split('.').length : 1;
  const registrableLabels = labels.slice(0, labels.length - etldLabels);
  if (registrableLabels.length < 2) return false;
  const hasPuny = registrableLabels.some((label) => label.startsWith('xn--'));
  const hasPlain = registrableLabels.some((label) => !label.startsWith('xn--') && label.length > 0);
  return hasPuny && hasPlain;
}

function detectCredentialInUserinfo(_username, password) {
  return Boolean(password && password.length > 0);
}

function riskForHostname({ isIp, labels, decodedLabels, obfuscation }) {
  if (isIp) return 'medium';
  if (obfuscation.rtlOverride) return 'high';
  if (obfuscation.mixedPunycode) return 'high';
  if (obfuscation.percentEncoded) return 'medium';
  for (const label of labels) {
    if (label.startsWith('xn--')) return 'medium';
  }
  for (const label of decodedLabels) {
    if (hasBidirectionalOverride(label)) return 'high';
  }
  return 'none';
}

function riskForPath({ segments, obfuscation }) {
  if (obfuscation.percentEncoded) return 'medium';
  for (const segment of segments) {
    const decoded = decodePercent(segment);
    if (hasBidirectionalOverride(decoded)) return 'high';
    if (SUSPICIOUS_PATH_SEGMENTS.has(decoded.toLowerCase())) return 'high';
  }
  return 'none';
}

function riskForQuery({ params, obfuscation }) {
  if (obfuscation.percentEncoded) return 'medium';
  for (const { key, value } of params) {
    if (hasBidirectionalOverride(key) || hasBidirectionalOverride(value)) return 'high';
    if (REDIRECT_QUERY_KEYS.has(key.toLowerCase())) {
      if (value && value.length > 0) {
        // A redirect parameter pointing anywhere warrants at least medium;
        // if the value looks URL-ish, escalate to high so it gets rechecked.
        return /^(https?:)?\/\//i.test(value) || value.includes('.') ? 'high' : 'medium';
      }
    }
  }
  return 'none';
}

function riskForFragment({ value, obfuscation }) {
  if (!value) return 'none';
  if (obfuscation.percentEncoded) return 'medium';
  if (hasBidirectionalOverride(decodePercent(value))) return 'high';
  return 'none';
}

function decomposeUrl(urlString) {
  const raw = String(urlString).trim();

  let parsed;
  let valid = true;
  try {
    parsed = new URL(raw);
  } catch {
    valid = false;
    // Build a best-effort decomposition for invalid URLs.
    return decomposeInvalidUrl(raw);
  }

  const protocolValue = parsed.protocol.replace(/:$/, '');
  const protocol = {
    value: protocolValue,
    secure: protocolValue === 'https',
    risk: protocolValue === 'https' ? 'none' : 'insecure',
  };

  const userinfoValue =
    parsed.username || parsed.password ? `${parsed.username}:${parsed.password}` : null;
  const userinfo = {
    value: userinfoValue,
    risk: detectCredentialInUserinfo(parsed.username, parsed.password) ? 'warning' : 'none',
  };

  const hostname = parsed.hostname;
  const domainInfo = parseDomain(hostname);
  const labels = domainInfo.labels;
  const decodedLabels = domainInfo.decodedLabels;

  const obfuscation = {
    percentEncoded: hasPercentEncoding(raw),
    mixedPunycode: hasMixedPunycode(labels, domainInfo.etld),
    rtlOverride: hasBidirectionalOverride(raw),
    credentialInUserinfo: detectCredentialInUserinfo(parsed.username, parsed.password),
  };

  const hostnameRisk = riskForHostname({
    isIp: domainInfo.isIp,
    labels,
    decodedLabels,
    obfuscation,
  });

  const portValue = parsed.port ? Number(parsed.port) : null;
  const portDeclared = Boolean(parsed.port);
  const port = {
    value: portValue,
    declared: portDeclared,
    risk: portDeclared && portValue !== null && !SAFE_PORTS.has(portValue) ? 'warning' : 'none',
  };

  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const pathObfuscation = { percentEncoded: hasPercentEncoding(parsed.pathname) };
  const path = {
    segments: pathSegments,
    risk: riskForPath({ segments: pathSegments, obfuscation: pathObfuscation }),
  };

  const queryParams = [];
  parsed.searchParams.forEach((value, key) => {
    queryParams.push({ key, value });
  });
  const queryObfuscation = { percentEncoded: hasPercentEncoding(parsed.search) };
  const query = {
    params: queryParams,
    risk: riskForQuery({ params: queryParams, obfuscation: queryObfuscation }),
  };

  const fragmentObfuscation = { percentEncoded: hasPercentEncoding(parsed.hash) };
  const fragment = {
    value: parsed.hash ? parsed.hash.slice(1) : null,
    risk: riskForFragment({ value: parsed.hash, obfuscation: fragmentObfuscation }),
  };

  return {
    raw,
    valid,
    protocol,
    userinfo,
    hostname: {
      value: hostname,
      labels,
      decodedLabels,
      registrableDomain: domainInfo.domain,
      etld: domainInfo.etld,
      risk: hostnameRisk,
    },
    port,
    pathname: parsed.pathname,
    search: parsed.search,
    path,
    query,
    fragment,
    isIp: domainInfo.isIp,
    obfuscation,
  };
}

function decomposeInvalidUrl(raw) {
  const obfuscation = {
    percentEncoded: hasPercentEncoding(raw),
    mixedPunycode: false,
    rtlOverride: hasBidirectionalOverride(raw),
    credentialInUserinfo: /^[^/]*:[^/]*@/.test(raw),
  };

  return {
    raw,
    valid: false,
    protocol: { value: null, secure: false, risk: 'insecure' },
    userinfo: { value: null, risk: obfuscation.credentialInUserinfo ? 'warning' : 'none' },
    hostname: {
      value: null,
      labels: [],
      decodedLabels: [],
      registrableDomain: null,
      etld: null,
      risk: obfuscation.rtlOverride ? 'high' : 'none',
    },
    port: { value: null, declared: false, risk: 'none' },
    pathname: null,
    search: null,
    path: { segments: [], risk: 'none' },
    query: { params: [], risk: 'none' },
    fragment: { value: null, risk: 'none' },
    isIp: false,
    obfuscation,
  };
}

function decodePunycodeLabel(label) {
  if (!label.startsWith('xn--')) return label;
  try {
    return domainToUnicode(label);
  } catch {
    return label;
  }
}

module.exports = {
  decomposeUrl,
  decodePunycodeLabel,
  SAFE_PORTS,
  SUSPICIOUS_PATH_SEGMENTS,
  REDIRECT_QUERY_KEYS,
};
