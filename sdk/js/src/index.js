/**
 * PÚNYCODEX — Authenticity SDK V2
 *
 * Browser-grade JavaScript SDK for the Name Authenticity Shield.
 */

const { classifyTermOffline } = require('./offline-classifier.js');

const DEFAULT_POLICY = Object.freeze({
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

class AuthenticitySDK {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'https://punycodex.com/api/v2';
    this.apiKey = options.apiKey || null;
    this.offlineFirst = options.offlineFirst === true;
    this.policy = mergePolicy(options.policy);
  }

  configure(policy) {
    this.policy = mergePolicy(policy, this.policy);
    return this;
  }

  decideAction(verdict, severity) {
    const input = verdict && (verdict.input ?? verdict.query);
    const inputLower = String(input || '').toLowerCase();

    if (this.policy.allowlist.some((entry) => entry.toLowerCase() === inputLower)) {
      return 'allow';
    }

    if (this.policy.blocklist.some((entry) => entry.toLowerCase() === inputLower)) {
      return 'block';
    }

    const sev = severity || verdict?.severity || 'none';
    const action = this.policy.severityActions[sev] ?? this.policy.defaultAction ?? 'warn';

    if (verdict && verdict.verdict === 'unsafe' && action === 'allow') {
      return 'block';
    }

    return action;
  }

  async check(input, type = 'term') {
    if (this.offlineFirst && type === 'term') {
      return classifyTermOffline(input);
    }

    const url = new URL('/authenticity/check', this.apiBaseUrl);
    url.searchParams.set('input', String(input));
    url.searchParams.set('type', type);

    const response = await fetch(url, {
      method: 'GET',
      headers: this._headers(),
    });

    return this._handleResponse(response);
  }

  async checkUrl(url) {
    return this.check(url, 'url');
  }

  async report(input, type, comment) {
    const url = new URL('/authenticity/report', this.apiBaseUrl);
    const body = JSON.stringify({
      input: String(input),
      type,
      comment: comment || '',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body,
    });

    return this._handleResponse(response);
  }

  _headers(extra = {}) {
    const headers = { ...extra };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async _handleResponse(response) {
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      const message = payload && (payload.error || payload.message);
      throw new Error(`Authenticity API error ${response.status}: ${message || text}`);
    }

    return payload.data !== undefined ? payload.data : payload;
  }
}

function mergePolicy(policy, base = DEFAULT_POLICY) {
  if (!policy || typeof policy !== 'object') {
    return { ...base };
  }

  return {
    defaultAction: policy.defaultAction || base.defaultAction,
    severityActions: { ...base.severityActions, ...(policy.severityActions || {}) },
    allowlist: Array.isArray(policy.allowlist) ? [...policy.allowlist] : [...base.allowlist],
    blocklist: Array.isArray(policy.blocklist) ? [...policy.blocklist] : [...base.blocklist],
  };
}

module.exports = { AuthenticitySDK, DEFAULT_POLICY };
