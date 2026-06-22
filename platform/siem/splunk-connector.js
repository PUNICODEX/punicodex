/**
 * PUNYCODEX — Splunk HEC Connector Stub (Phase 19)
 *
 * Formats authenticity verdicts as Splunk HTTP Event Collector events.
 */

function formatEvent(verdict, options = {}) {
  const event = {
    time: verdict.generatedAt ? new Date(verdict.generatedAt).getTime() / 1000 : Date.now() / 1000,
    source: options.source || 'punycodex-authenticity',
    sourcetype: options.sourcetype || 'punycodex:authenticity:verdict',
    index: options.index || 'security',
    event: {
      verdict: verdict.verdict,
      severity: verdict.severity,
      input: verdict.input,
      inputType: verdict.inputType,
      confidence: verdict.confidence,
      modelVersion: verdict.modelVersion,
      evidenceSummary: verdict.evidence ? summarizeEvidence(verdict.evidence) : null,
      tenantId: verdict.tenantId || null,
    },
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

function sendBatch(events, hecUrl, hecToken) {
  const payload = events.map((e) => formatEvent(e)).join('\n');
  return {
    url: hecUrl,
    token: hecToken ? `${hecToken.slice(0, 4)}...` : null,
    bytes: Buffer.byteLength(payload, 'utf8'),
    eventCount: events.length,
    payload,
  };
}

module.exports = { formatEvent, sendBatch };
