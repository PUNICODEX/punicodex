/**
 * PuniCodex — URL Classifier
 *
 * Classifies every part of a URL (hostname labels, path segments, query
 * keys/values) using the canonical name authenticity engine. It escalates
 * severity when sensitive path words or redirect parameters appear on
 * suspicious domains.
 */

const { decomposeUrl } = require('./url-decomposer');
const { VERDICTS, SEVERITIES, SEVERITY_RANK } = require('./authenticity-verdicts');
const { isIdentityAllowedForDomain } = require('./identity-domain-helpers');

const DECEPTIVE_VERDICTS = new Set([
  VERDICTS.HOMOGRAPH_SPOOF,
  VERDICTS.MIXED_SCRIPT_SPOOF,
  VERDICTS.UNSAFE,
]);

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

const URL_LIKE_RE = /^(https?:)?\/\/|^[^/]+\./i;

function defaultClassifier(str) {
  // Avoid a hard dependency on authenticity-service so this module can be
  // required by authenticity-service without creating a circular require.
  const service = require('./authenticity-service');
  return service.classifyTerm(str);
}

function isDomainSuspicious(decomposition) {
  return decomposition.hostname.risk === 'medium' || decomposition.hostname.risk === 'high';
}

function looksLikeUrl(value) {
  if (!value) return false;
  return URL_LIKE_RE.test(value);
}

function classifyUrlParts(urlString, options = {}) {
  const classifyTerm = options.classifyTerm || defaultClassifier;
  const decomposition = decomposeUrl(urlString);

  if (!decomposition.valid) {
    return makeInvalidResult(decomposition);
  }

  const parts = [];
  const risks = [];

  // Protocol
  if (decomposition.protocol.risk === 'insecure') {
    parts.push({
      part: 'protocol',
      raw: decomposition.protocol.value,
      verdict: VERDICTS.LOOKALIKE_DOMAIN,
      severity: SEVERITIES.MEDIUM,
      canonicalMatch: null,
    });
    risks.push(`insecure protocol: ${decomposition.protocol.value}`);
  }

  // Userinfo
  if (decomposition.userinfo.risk === 'warning') {
    parts.push({
      part: 'userinfo',
      raw: decomposition.userinfo.value,
      verdict: VERDICTS.UNSAFE,
      severity: SEVERITIES.CRITICAL,
      canonicalMatch: null,
    });
    risks.push('credential in URL userinfo');
  }

  const registrableDomain = decomposition.hostname.registrableDomain;

  // Hostname labels
  for (let i = 0; i < decomposition.hostname.labels.length; i++) {
    const raw = decomposition.hostname.labels[i];
    const decoded = decomposition.hostname.decodedLabels[i];
    const result = classifyTerm(decoded);
    let { verdict, severity } = result;

    // A protected identity in a hostname label whose registrable domain is not
    // allowed is a lookalike (e.g., perun.app when punicodex does not own it).
    // Do not override an already-deceptive verdict such as a homograph spoof.
    if (
      result.canonicalMatch &&
      !DECEPTIVE_VERDICTS.has(verdict) &&
      !isIdentityAllowedForDomain(result.canonicalMatch, registrableDomain)
    ) {
      // Punycode labels that decode to a protected identity on an unrelated
      // domain are homograph spoofs, not merely lookalikes.
      if (raw.startsWith('xn--')) {
        verdict = VERDICTS.HOMOGRAPH_SPOOF;
        severity = escalate(severity, SEVERITIES.CRITICAL);
        risks.push(
          `punycode hostname label impersonates ${result.canonicalMatch.name || result.canonicalMatch.id}`
        );
      } else {
        severity = escalate(severity, SEVERITIES.HIGH);
        verdict = VERDICTS.LOOKALIKE_DOMAIN;
        risks.push(
          `hostname label impersonates ${result.canonicalMatch.name || result.canonicalMatch.id} on unrelated domain`
        );
      }
    }

    parts.push({
      part: 'hostname-label',
      raw,
      verdict,
      severity,
      canonicalMatch: result.canonicalMatch,
    });
  }

  // Port
  if (decomposition.port.risk === 'warning') {
    parts.push({
      part: 'port',
      raw: String(decomposition.port.value),
      verdict: VERDICTS.LOOKALIKE_DOMAIN,
      severity: SEVERITIES.MEDIUM,
      canonicalMatch: null,
    });
    risks.push(`unusual port: ${decomposition.port.value}`);
  }

  const domainSuspicious = isDomainSuspicious(decomposition);

  // Path segments
  for (const segment of decomposition.path.segments) {
    const decoded = safeDecode(segment);
    const result = classifyTerm(decoded);
    let { verdict, severity } = result;

    if (domainSuspicious && SUSPICIOUS_PATH_SEGMENTS.has(decoded.toLowerCase())) {
      severity = escalate(severity, SEVERITIES.HIGH);
      verdict = VERDICTS.HOMOGRAPH_SPOOF;
      risks.push(`suspicious path segment on deceptive domain: ${decoded}`);
    }

    // A protected identity in the path of an unrelated domain is a lookalike.
    // Public lexicon names in paths/queries are not treated as impersonation.
    if (
      result.canonicalMatch &&
      result.canonicalMatch.type !== 'lexicon' &&
      !DECEPTIVE_VERDICTS.has(verdict) &&
      !isIdentityAllowedForDomain(result.canonicalMatch, registrableDomain)
    ) {
      severity = escalate(severity, SEVERITIES.HIGH);
      verdict = VERDICTS.LOOKALIKE_DOMAIN;
      risks.push(
        `path segment impersonates ${result.canonicalMatch.name || result.canonicalMatch.id} on unrelated domain`
      );
    }

    parts.push({
      part: 'path-segment',
      raw: segment,
      verdict,
      severity,
      canonicalMatch: result.canonicalMatch,
    });
  }

  // Query parameters
  for (const { key, value } of decomposition.query.params) {
    const keyResult = classifyTerm(key);
    parts.push({
      part: 'query-key',
      raw: key,
      verdict: keyResult.verdict,
      severity: keyResult.severity,
      canonicalMatch: keyResult.canonicalMatch,
    });

    if (!value) continue;

    const valueResult = classifyTerm(value);
    let { verdict, severity } = valueResult;

    if (REDIRECT_QUERY_KEYS.has(key.toLowerCase()) && looksLikeUrl(value)) {
      // Recursively classify the redirect target if it parses as a URL.
      let targetSuspicious = false;
      try {
        const target = new URL(value);
        const targetClass = classifyUrlParts(target.href, {
          classifyTerm,
          depth: (options.depth || 0) + 1,
        });
        if (
          targetClass.overallSeverity !== SEVERITIES.NONE &&
          targetClass.overallSeverity !== SEVERITIES.LOW
        ) {
          targetSuspicious = true;
        }
      } catch {
        // Not parseable; still treat URL-like values with caution.
        targetSuspicious = true;
      }

      if (targetSuspicious) {
        severity = escalate(severity, SEVERITIES.HIGH);
        verdict = VERDICTS.HOMOGRAPH_SPOOF;
        risks.push(`redirect parameter ${key} targets suspicious URL`);
      }
    }

    // A protected identity in a query value of an unrelated domain is a lookalike.
    // Public lexicon names in query values are not treated as impersonation.
    if (
      valueResult.canonicalMatch &&
      valueResult.canonicalMatch.type !== 'lexicon' &&
      !DECEPTIVE_VERDICTS.has(verdict) &&
      !isIdentityAllowedForDomain(valueResult.canonicalMatch, registrableDomain)
    ) {
      severity = escalate(severity, SEVERITIES.HIGH);
      verdict = VERDICTS.LOOKALIKE_DOMAIN;
      risks.push(
        `query value impersonates ${valueResult.canonicalMatch.name || valueResult.canonicalMatch.id} on unrelated domain`
      );
    }

    parts.push({
      part: 'query-value',
      raw: value,
      verdict,
      severity,
      canonicalMatch: valueResult.canonicalMatch,
    });
  }

  // Fragment
  if (decomposition.fragment.value) {
    const fragmentResult = classifyTerm(decomposition.fragment.value);
    parts.push({
      part: 'fragment',
      raw: decomposition.fragment.value,
      verdict: fragmentResult.verdict,
      severity: fragmentResult.severity,
      canonicalMatch: fragmentResult.canonicalMatch,
    });
  }

  // Structural risks from the decomposition.
  if (decomposition.hostname.risk === 'high') {
    risks.push('high-risk hostname (punycode homograph, RTL override, or IP literal)');
  } else if (decomposition.hostname.risk === 'medium') {
    risks.push('medium-risk hostname (punycode or percent-encoding)');
  }

  return summarize(parts, risks, decomposition);
}

function makeInvalidResult(decomposition) {
  return {
    overallVerdict: VERDICTS.UNKNOWN,
    overallSeverity: SEVERITIES.NONE,
    worstPart: 'url',
    parts: [],
    risks: decomposition.obfuscation.rtlOverride
      ? ['invalid URL with bidirectional override']
      : ['invalid URL'],
    decomposition,
  };
}

function summarize(parts, risks, decomposition) {
  const worst = parts.reduce(
    (acc, part) => (SEVERITY_RANK[part.severity] > SEVERITY_RANK[acc.severity] ? part : acc),
    { severity: SEVERITIES.NONE, part: 'url' }
  );

  const worstPartInfo = parts.find(
    (p) => p.part === worst.part && p.severity === worst.severity
  ) || {
    part: worst.part,
    raw: '',
  };

  const overallSeverity = worst.severity;
  const overallVerdict = inferVerdictFromSeverity(overallSeverity, parts) || VERDICTS.UNKNOWN;

  return {
    overallVerdict,
    overallSeverity,
    worstPart: worstPartInfo.part,
    parts,
    risks,
    decomposition,
  };
}

function inferVerdictFromSeverity(_severity, parts) {
  // Prefer the actual verdict of the worst part, but map structural
  // medium/high risks to LOOKALIKE_DOMAIN when no canonical spoof is present.
  const worst = parts.reduce(
    (acc, part) => (SEVERITY_RANK[part.severity] > SEVERITY_RANK[acc.severity] ? part : acc),
    { severity: SEVERITIES.NONE }
  );

  if (worst.severity === SEVERITIES.NONE) return VERDICTS.UNKNOWN;
  if (worst.severity === SEVERITIES.LOW) return worst.verdict;
  if (worst.severity === SEVERITIES.MEDIUM) {
    return worst.verdict === VERDICTS.UNKNOWN ? VERDICTS.LOOKALIKE_DOMAIN : worst.verdict;
  }
  if (worst.severity === SEVERITIES.HIGH || worst.severity === SEVERITIES.CRITICAL) {
    return worst.verdict;
  }
  return VERDICTS.UNKNOWN;
}

function escalate(currentSeverity, floorSeverity) {
  return SEVERITY_RANK[currentSeverity] >= SEVERITY_RANK[floorSeverity]
    ? currentSeverity
    : floorSeverity;
}

function safeDecode(str) {
  if (!str) return str;
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

module.exports = {
  classifyUrlParts,
  SUSPICIOUS_PATH_SEGMENTS,
  REDIRECT_QUERY_KEYS,
};
