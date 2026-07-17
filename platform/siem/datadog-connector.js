/**
 * PUNICODEX — Datadog Logs Connector Stub (Phase 19)
 *
 * Formats authenticity verdicts as Datadog log entries.
 */

function formatEvent(verdict, options = {}) {
  const event = {
    ddsource: options.source || 'punicodex-authenticity',
    ddtags: options.tags || 'service:punicodex,env:production',
    hostname: options.hostname || 'punicodex-api',
    service: 'punicodex-authenticity',
    message: `PUNICODEX verdict: ${verdict.verdict}`,
    verdict: verdict.verdict,
    severity: verdict.severity,
    input: verdict.input,
    inputType: verdict.inputType,
    confidence: verdict.confidence,
    modelVersion: verdict.modelVersion,
    evidenceSummary: verdict.evidence ? summarizeEvidence(verdict.evidence) : null,
    tenantId: verdict.tenantId || null,
    timestamp: verdict.generatedAt || new Date().toISOString(),
  };
  return JSON.stringify(event);
}

function summarizeEvidence(evidence) {
  return {
    identityMatches: (evidence.identityMatches || []).map((m) => m.identityId || m.name),
    confusableCount: (evidence.characterMap || []).filter((c) => c.isHomoglyph).length,
    invisibleChars: (evidence.characterMap || []).filter((c) => c.isInvisible).length,
  };
}

function sendBatch(events, intakeUrl, apiKey) {
  const payload = events.map((e) => formatEvent(e)).join('\n');
  return {
    url: intakeUrl,
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 4)}...` : null,
    bytes: Buffer.byteLength(payload, 'utf8'),
    eventCount: events.length,
    payload,
  };
}

module.exports = { formatEvent, sendBatch };
