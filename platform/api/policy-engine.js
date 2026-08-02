/**
 * PuniCodex — Name Authenticity Shield V2 Policy Engine
 *
 * Evaluates an authenticity verdict against an enterprise policy.
 */

const DEFAULT_POLICY = Object.freeze({
  tenantId: 'default',
  defaultAction: 'warn',
  severityActions: Object.freeze({
    none: 'allow',
    low: 'allow',
    medium: 'log',
    high: 'warn',
    critical: 'block',
  }),
  allowlist: [],
  blocklist: [],
  logRetentionDays: 90,
  uiTheme: 'inline',
});

const VALID_ACTIONS = new Set(['allow', 'log', 'warn', 'block']);
const VALID_THEMES = new Set(['inline', 'modal', 'interstitial']);
const VALID_PATTERN_TYPES = new Set(['exact', 'glob', 'regex']);
const VALID_SEVERITIES = new Set(['none', 'low', 'medium', 'high', 'critical']);

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern) {
  const escaped = pattern
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((sub) => sub.split('?').map(escapeRegex).join('.'))
        .join('[^/]*')
    )
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function compilePattern(pattern) {
  if (typeof pattern === 'string') {
    return {
      type: 'exact',
      value: pattern,
      test: (value) => value.toLowerCase() === pattern.toLowerCase(),
    };
  }

  const type = pattern?.type || 'exact';
  const value = String(pattern?.value || '');

  if (!VALID_PATTERN_TYPES.has(type)) {
    throw new Error(`Invalid pattern type: ${type}`);
  }

  if (type === 'exact') {
    return { type, value, test: (input) => input.toLowerCase() === value.toLowerCase() };
  }

  if (type === 'glob') {
    const regex = globToRegex(value);
    return { type, value, test: (input) => regex.test(input) };
  }

  // regex
  const regex = new RegExp(value, 'iu');
  return { type, value, test: (input) => regex.test(input) };
}

/**
 * The forms a policy entry may legitimately match.
 *
 * Tenants write bare domains ("evil.com") into their allow/blocklists, but the
 * inputs reaching this engine are frequently full URLs. Testing only the whole
 * string and the scheme-stripped string meant "evil.com" matched
 * "https://evil.com" yet missed "https://evil.com/path" and
 * "https://www.evil.com/" — so a tenant's blocklist quietly failed on almost
 * every real URL.
 *
 * Matching is anchored to the host, never to a substring of the URL, so an
 * allowlist entry cannot be widened by an attacker-chosen path or query.
 */
function matchCandidates(input) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase();
  if (!normalized) return [];

  const candidates = [normalized];
  if (normalized.includes('://')) {
    candidates.push(normalized.replace(/^[^/:]+:\/\//, ''));
  }

  let host = null;
  try {
    host = new URL(normalized.includes('://') ? normalized : `https://${normalized}`).hostname;
  } catch {
    host = null;
  }
  if (host) {
    candidates.push(host);
    if (host.startsWith('www.')) candidates.push(host.slice(4));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function matchesList(input, list) {
  const candidates = matchCandidates(input);
  if (!candidates.length) return false;

  for (const item of list || []) {
    const pattern = compilePattern(item);
    for (const candidate of candidates) {
      if (pattern.test(candidate)) return true;
    }
  }
  return false;
}

function normalizePolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    return { ...DEFAULT_POLICY };
  }

  const defaultAction = VALID_ACTIONS.has(policy.defaultAction)
    ? policy.defaultAction
    : DEFAULT_POLICY.defaultAction;

  let severityActions;
  if (policy.severityActions && typeof policy.severityActions === 'object') {
    severityActions = {};
    for (const [key, value] of Object.entries(policy.severityActions)) {
      if (VALID_SEVERITIES.has(key) && VALID_ACTIONS.has(value)) {
        severityActions[key] = value;
      }
    }
  } else {
    severityActions = { ...DEFAULT_POLICY.severityActions };
  }

  const uiTheme = VALID_THEMES.has(policy.uiTheme) ? policy.uiTheme : DEFAULT_POLICY.uiTheme;

  return {
    tenantId: String(policy.tenantId || DEFAULT_POLICY.tenantId),
    defaultAction,
    severityActions,
    allowlist: Array.isArray(policy.allowlist) ? policy.allowlist : [...DEFAULT_POLICY.allowlist],
    blocklist: Array.isArray(policy.blocklist) ? policy.blocklist : [...DEFAULT_POLICY.blocklist],
    logRetentionDays: Number.isFinite(policy.logRetentionDays)
      ? policy.logRetentionDays
      : DEFAULT_POLICY.logRetentionDays,
    uiTheme,
    reportEndpoint: policy.reportEndpoint || undefined,
    siemWebhook: policy.siemWebhook || undefined,
  };
}

function buildSiemPayload(verdict, result, policy) {
  return {
    tenantId: policy.tenantId,
    timestamp: new Date().toISOString(),
    input: normalizeInput(verdict?.input) || null,
    identityId: verdict?.identityId ?? null,
    verdict: verdict?.verdict ?? null,
    severity: result.severity,
    action: result.action,
    reason: result.reason,
    policyId: result.policyId,
  };
}

function normalizeInput(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    return input.raw || input.normalized || input.displayDomain || input.hostname || String(input);
  }
  return String(input ?? '');
}

function evaluatePolicy(verdict, options = {}) {
  const policy = normalizePolicy(options.policy);
  const allowlist = options.allowlist || policy.allowlist;
  const blocklist = options.blocklist || policy.blocklist;

  const severity = VALID_SEVERITIES.has(verdict?.severity) ? verdict.severity : 'none';
  const input = normalizeInput(verdict?.input);

  // 1. blocklist
  if (matchesList(input, blocklist)) {
    const result = {
      action: 'block',
      reason: 'blocklist',
      severity,
      uiTheme: policy.uiTheme,
      policyId: `${policy.tenantId}:policy`,
    };
    if (policy.siemWebhook) {
      result.siemPayload = buildSiemPayload(verdict, result, policy);
    }
    return result;
  }

  // 2. allowlist
  if (matchesList(input, allowlist)) {
    const result = {
      action: 'allow',
      reason: 'allowlist',
      severity,
      uiTheme: policy.uiTheme,
      policyId: `${policy.tenantId}:policy`,
    };
    if (policy.siemWebhook) {
      result.siemPayload = buildSiemPayload(verdict, result, policy);
    }
    return result;
  }

  // 3. severityActions
  if (policy.severityActions[severity]) {
    const result = {
      action: policy.severityActions[severity],
      reason: 'severity',
      severity,
      uiTheme: policy.uiTheme,
      policyId: `${policy.tenantId}:policy`,
    };
    if (policy.siemWebhook) {
      result.siemPayload = buildSiemPayload(verdict, result, policy);
    }
    return result;
  }

  // 4. defaultAction
  const result = {
    action: policy.defaultAction,
    reason: 'default',
    severity,
    uiTheme: policy.uiTheme,
    policyId: `${policy.tenantId}:policy`,
  };
  if (policy.siemWebhook) {
    result.siemPayload = buildSiemPayload(verdict, result, policy);
  }
  return result;
}

module.exports = {
  DEFAULT_POLICY,
  evaluatePolicy,
  normalizePolicy,
  matchesList,
  compilePattern,
};
