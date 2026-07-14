/**
 * PÚNYCODEX — Authenticity SDK V2
 *
 * Browser-grade JavaScript SDK for the Name Authenticity Shield.
 */

const { classifyTermOffline } = require('./offline-classifier.js');
const { evaluatePolicy, DEFAULT_POLICY } = require('../../../platform/api/policy-engine.js');

function mergePolicy(policy, base = DEFAULT_POLICY) {
  if (!policy || typeof policy !== 'object') {
    return { ...base };
  }

  return {
    tenantId: policy.tenantId || base.tenantId,
    defaultAction: policy.defaultAction || base.defaultAction,
    severityActions: { ...base.severityActions, ...(policy.severityActions || {}) },
    allowlist: Array.isArray(policy.allowlist) ? [...policy.allowlist] : [...base.allowlist],
    blocklist: Array.isArray(policy.blocklist) ? [...policy.blocklist] : [...base.blocklist],
    logRetentionDays: policy.logRetentionDays ?? base.logRetentionDays,
    uiTheme: policy.uiTheme || base.uiTheme,
    reportEndpoint: policy.reportEndpoint || base.reportEndpoint,
    siemWebhook: policy.siemWebhook || base.siemWebhook,
  };
}

class AuthenticitySDK {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'https://punycodex.com/api/v2/';
    this.apiKey = options.apiKey || null;
    this.offlineFirst = options.offlineFirst === true;
    this.policy = mergePolicy(options.policy);
  }

  configure(policy) {
    this.policy = mergePolicy(policy, this.policy);
    return this;
  }

  decideAction(verdict) {
    const evaluation = evaluatePolicy(verdict, { policy: this.policy });
    return {
      action: evaluation.action,
      reason: evaluation.reason,
      uiTheme: evaluation.uiTheme,
    };
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

  async evaluate(input, type = 'auto', extraPolicy = {}) {
    const url = new URL('/policy/evaluate', this.apiBaseUrl);
    const body = JSON.stringify({
      input: String(input),
      type,
      policy: mergePolicy(extraPolicy, this.policy),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body,
    });

    return this._handleResponse(response);
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

module.exports = { AuthenticitySDK, DEFAULT_POLICY, mergePolicy };
