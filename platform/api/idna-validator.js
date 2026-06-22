/**
 * PÚNYCODEX — IDNA2008 / UTS #46 / Punycode Validator
 *
 * Validates domain labels against the core IDNA rules used by browsers:
 * punycode decoding, length limits, hyphen placement, empty labels, and
 * mixed-script / Turkish-i warnings.
 */

const { domainToUnicode, domainToASCII } = require('node:url');
const { getScript } = require('./name-decomposer');
const IDN_POLICIES = require('../db/idn-registry-policies.json');

const LABEL_MAX_OCTETS = 63;
const DOMAIN_MAX_OCTETS = 253;

function getScripts(label) {
  const scripts = new Set();
  for (const ch of label) {
    const script = getScript(ch);
    if (script && script !== 'Common' && script !== 'Inherited') {
      scripts.add(script);
    }
  }
  return scripts;
}

function hasTurkishIIssue(label) {
  const hasLatinI = label.includes('i') || label.includes('I');
  const hasTurkishI = label.includes('ı') || label.includes('İ');
  return hasLatinI && hasTurkishI;
}

function checkPolicy(label, etld) {
  const scripts = getScripts(label);
  if (scripts.size === 0 || !etld) return [];
  const allowed = IDN_POLICIES[etld];
  if (!allowed) return [];
  const violations = [];
  for (const script of scripts) {
    if (!allowed.includes(script)) {
      violations.push(`script-not-allowed-by-registry:${script}`);
    }
  }
  return violations;
}

function validateLabel(raw, etld, options = {}) {
  const opts = {
    checkHyphens: options.checkHyphens !== false,
    allowMixedScript: options.allowMixedScript !== false,
    checkPolicy: options.checkPolicy !== false,
    ...options,
  };
  const errors = [];

  if (raw.length === 0) {
    errors.push('empty-label');
    return { raw, decoded: raw, valid: false, errors };
  }

  if (Buffer.byteLength(raw, 'ascii') > LABEL_MAX_OCTETS) {
    errors.push('label-too-long');
  }

  if (opts.checkHyphens) {
    if (raw.startsWith('-')) errors.push('leading-hyphen');
    if (raw.endsWith('-')) errors.push('trailing-hyphen');
  }

  let decoded = raw;
  let isPuny = false;

  if (raw.startsWith('xn--')) {
    isPuny = true;
    if (raw.length <= 4) {
      errors.push('empty-punycode-label');
    }
    try {
      const unicode = domainToUnicode(raw);
      if (!unicode || unicode === raw) {
        errors.push('invalid-punycode');
      } else {
        decoded = unicode;
      }
    } catch {
      errors.push('invalid-punycode');
    }
  }

  // Apply UTS #46 / IDNA2008 normalization for non-ASCII labels.
  if (!isPuny && decoded.split('').some((ch) => ch.codePointAt(0) > 127)) {
    try {
      const normalized = decoded.normalize('NFKC');
      const asciiForm = domainToASCII(normalized, { beStrict: false, useSTD3ASCIIRules: false });
      if (!asciiForm || asciiForm === '.') {
        errors.push('idna-normalization-failed');
      }
      decoded = normalized;
    } catch {
      errors.push('idna-normalization-failed');
    }
  }

  // Check decoded label length in octets.
  const decodedBytes = Buffer.byteLength(decoded, 'utf8');
  if (decodedBytes > LABEL_MAX_OCTETS) {
    errors.push('decoded-label-too-long');
  }

  const scripts = getScripts(decoded);
  if (scripts.size > 1) {
    const msg = 'mixed-script-label';
    if (opts.allowMixedScript) {
      errors.push(`warning:${msg}`);
    } else {
      errors.push(msg);
    }
  }

  if (hasTurkishIIssue(decoded)) {
    errors.push('warning:turkish-i-conflict');
  }

  if (opts.checkPolicy) {
    errors.push(...checkPolicy(decoded, etld));
  }

  return { raw, decoded, valid: errors.every((e) => e.startsWith('warning:')), errors };
}

function validateIdna(domain, options = {}) {
  const raw = String(domain).trim().toLowerCase();
  const errors = [];

  if (raw.length === 0) {
    errors.push('empty-domain');
    return { valid: false, errors, labels: [] };
  }

  if (Buffer.byteLength(raw, 'ascii') > DOMAIN_MAX_OCTETS) {
    errors.push('domain-too-long');
  }

  const hostname = raw
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^[^@]*@/, '')
    .replace(/:\d+$/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '');

  const labels = hostname.split('.');
  const etld = options.etld || null;

  if (labels.some((label) => label.length === 0)) {
    errors.push('empty-label');
  }

  const labelResults = labels.map((label) => validateLabel(label, etld, options));

  for (const lr of labelResults) {
    errors.push(...lr.errors);
  }

  const hardErrors = errors.filter((e) => !e.startsWith('warning:'));

  return {
    valid: hardErrors.length === 0,
    errors,
    labels: labelResults,
  };
}

module.exports = {
  validateIdna,
  validateLabel,
  LABEL_MAX_OCTETS,
  DOMAIN_MAX_OCTETS,
};
