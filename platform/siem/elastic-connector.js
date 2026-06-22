/**
 * PUNYCODEX — Elastic (ECS) Connector Stub (Phase 19)
 *
 * Formats authenticity verdicts as Elastic Common Schema documents.
 */

function formatEvent(verdict, options = {}) {
  const event = {
    '@timestamp': verdict.generatedAt || new Date().toISOString(),
    event: {
      kind: 'alert',
      category: ['deception', 'network'],
      type: ['info'],
      severity: mapSeverity(verdict.severity),
      outcome: verdict.verdict,
      reason: `PUNYCODEX classified ${verdict.input} as ${verdict.verdict}`,
    },
    source: {
      name: verdict.input,
    },
    punycodex: {
      verdict: verdict.verdict,
      severity: verdict.severity,
      input: verdict.input,
      inputType: verdict.inputType,
      confidence: verdict.confidence,
      modelVersion: verdict.modelVersion,
      evidenceSummary: verdict.evidence ? summarizeEvidence(verdict.evidence) : null,
      tenantId: verdict.tenantId || null,
    },
    tags: options.tags || ['punycodex', 'authenticity'],
  };
  return JSON.stringify(event);
}

function mapSeverity(severity) {
  const map = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    none: 0,
  };
  return map[severity] ?? 0;
}

function summarizeEvidence(evidence) {
  return {
    identityMatches: (evidence.identityMatches || []).map((m) => m.identityId || m.name),
    confusableCount: (evidence.characterMap || []).filter((c) => c.isHomoglyph).length,
    invisibleChars: (evidence.characterMap || []).filter((c) => c.isInvisible).length,
  };
}

function sendBatch(events, indexUrl, apiKey) {
  const lines = [];
  for (const e of events) {
    lines.push(JSON.stringify({ index: { _index: 'punycodex-authenticity' } }));
    lines.push(formatEvent(e));
  }
  const payload = `${lines.join('\n')}\n`;
  return {
    url: indexUrl,
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 4)}...` : null,
    bytes: Buffer.byteLength(payload, 'utf8'),
    eventCount: events.length,
    payload,
  };
}

module.exports = { formatEvent, sendBatch };
