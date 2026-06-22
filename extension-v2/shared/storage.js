/**
 * PÚNYCODEX Authenticity Extension v2 — Storage wrapper
 */

const DEFAULTS = Object.freeze({
  enabled: true,
  warnings: true,
  apiEndpoint: 'https://punycodex.com/api/v2',
  apiKey: '',
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
});

async function get(key) {
  const data = await chrome.storage.sync.get(key);
  return data[key] ?? DEFAULTS[key];
}

async function set(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

async function getAll(keys) {
  const requested = keys ?? Object.keys(DEFAULTS);
  const data = await chrome.storage.sync.get(requested);
  const result = {};
  for (const key of requested) {
    result[key] = data[key] ?? DEFAULTS[key];
  }
  return result;
}

async function reset() {
  await chrome.storage.sync.set({
    enabled: DEFAULTS.enabled,
    warnings: DEFAULTS.warnings,
    apiEndpoint: DEFAULTS.apiEndpoint,
    apiKey: DEFAULTS.apiKey,
    defaultAction: DEFAULTS.defaultAction,
    severityActions: { ...DEFAULTS.severityActions },
    allowlist: [...DEFAULTS.allowlist],
    blocklist: [...DEFAULTS.blocklist],
  });
}

export { DEFAULTS, get, set, getAll, reset };
