/**
 * PÚNYCODEX Authenticity Extension v2 — Lightweight policy evaluator
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

  if (type === 'exact') {
    return { type, value, test: (input) => input.toLowerCase() === value.toLowerCase() };
  }

  if (type === 'glob') {
    const regex = globToRegex(value);
    return { type, value, test: (input) => regex.test(input) };
  }

  const regex = new RegExp(value, 'iu');
  return { type, value, test: (input) => regex.test(input) };
}

function matchesList(input, list) {
  const normalized = String(input || '').toLowerCase();
  if (!normalized) return false;

  for (const item of list || []) {
    const pattern = compilePattern(item);
    if (pattern.test(normalized)) return true;

    if (normalized.includes('://')) {
      const withoutScheme = normalized.replace(/^[^/:]+:\/\//, '');
      if (pattern.test(withoutScheme)) return true;
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

  if (matchesList(input, blocklist)) {
    return { action: 'block', reason: 'blocklist', severity, uiTheme: policy.uiTheme };
  }

  if (matchesList(input, allowlist)) {
    return { action: 'allow', reason: 'allowlist', severity, uiTheme: policy.uiTheme };
  }

  if (policy.severityActions[severity]) {
    return {
      action: policy.severityActions[severity],
      reason: 'severity',
      severity,
      uiTheme: policy.uiTheme,
    };
  }

  return {
    action: policy.defaultAction,
    reason: 'default',
    severity,
    uiTheme: policy.uiTheme,
  };
}

export { DEFAULT_POLICY, normalizePolicy, evaluatePolicy, matchesList };
