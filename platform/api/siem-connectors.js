/**
 * PUNICODEX — SIEM Connector Dispatch (Phase 19)
 *
 * Unified formatter/dispatcher for Splunk, Datadog, and Elastic SIEMs.
 * Backed by per-platform stubs in platform/siem/.
 */

const crypto = require('node:crypto');

function listConnectors() {
  return ['splunk', 'datadog', 'elastic'];
}

function splunkEvent(alert, options = {}) {
  const hecToken = options.hecToken || 'no-token';
  return {
    method: 'POST',
    url: options.url || 'https://splunk.example/services/collector/event',
    headers: {
      Authorization: `Splunk ${hecToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      time: alert.timestamp ? new Date(alert.timestamp).getTime() / 1000 : Date.now() / 1000,
      source: 'punicodex-authenticity-shield',
      sourcetype: 'punicodex:authenticity',
      event: {
        input: alert.input,
        punycode: alert.punycode,
        verdict: alert.verdict,
        severity: alert.severity,
        confidence: alert.confidence,
      },
    },
  };
}

function datadogEvent(alert, options = {}) {
  const apiKey = options.apiKey || 'no-key';
  const title = `[${alert.severity}] PUNICODEX ${alert.verdict}: ${alert.input}`;
  return {
    method: 'POST',
    url: options.url || 'https://api.datadoghq.com/api/v1/events',
    headers: {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: {
      title,
      text: `PUNICODEX detected ${alert.verdict} for ${alert.input} (${alert.punycode || 'n/a'}).`,
      alert_type: alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warning',
      tags: [
        'source:punicodex-authenticity-shield',
        'target:punicodex-authenticity-shield',
        `verdict:${alert.verdict}`,
        `severity:${alert.severity}`,
      ],
      date_happened: alert.timestamp
        ? new Date(alert.timestamp).getTime() / 1000
        : Date.now() / 1000,
    },
  };
}

function elasticDoc(alert, options = {}) {
  const apiKey = options.apiKey || 'no-key';
  const index = options.index || 'punicodex-authenticity';
  const id = crypto.randomUUID();
  return {
    method: 'PUT',
    url: `${options.url || 'https://elastic.example'}/${index}/_doc/${id}`,
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      '@timestamp': alert.timestamp || new Date().toISOString(),
      input: alert.input,
      punycode: alert.punycode,
      verdict: alert.verdict,
      severity: alert.severity,
      confidence: alert.confidence,
    },
  };
}

function sendToSiem(platform, alert, options = {}) {
  switch (platform) {
    case 'splunk':
      return splunkEvent(alert, options);
    case 'datadog':
      return datadogEvent(alert, options);
    case 'elastic':
      return elasticDoc(alert, options);
    default:
      throw new Error(`Unsupported SIEM platform: ${platform}`);
  }
}

module.exports = {
  listConnectors,
  splunkEvent,
  datadogEvent,
  elasticDoc,
  sendToSiem,
};
