/**
 * PuniCodex — Forensics PDF Generator
 *
 * Generates a minimal, valid PDF evidence package suitable for UDRP, trademark,
 * or law-enforcement submission. The output is an ASCII-safe PDF buffer; Unicode
 * characters are transcribed as code-point escapes so the document renders in
 * any PDF reader without embedding full Unicode fonts.
 */

const crypto = require('node:crypto');

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 16;

function escapePdfString(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/[^\x20-\x7E]/g, (ch) => `\\u${ch.codePointAt(0).toString(16).padStart(4, '0')}`);
}

function buildContentStream(lines) {
  let y = PAGE_HEIGHT - MARGIN;
  const ops = [];
  ops.push('BT');
  ops.push('/F1 11 Tf');
  for (const line of lines) {
    ops.push(`${MARGIN} ${y} Td`);
    ops.push(`(${escapePdfString(line)}) Tj`);
    y -= LINE_HEIGHT;
  }
  ops.push('ET');
  return ops.join('\n');
}

function buildLines(input, result, evidence, reportId) {
  const lines = [];
  lines.push('PUNICODEX - Name Authenticity Forensics Report');
  lines.push(`Report ID: ${reportId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Model version: ${result.modelVersion || 'unknown'}`);
  lines.push('');
  lines.push(`Input: ${input}`);
  lines.push(`Verdict: ${result.verdict}`);
  lines.push(`Severity: ${result.severity}`);
  lines.push(
    `Confidence: ${typeof result.confidence === 'number' ? result.confidence.toFixed(4) : 'n/a'}`
  );
  lines.push(`Reason: ${result.reason || result.explanation || ''}`);
  lines.push('');

  lines.push('RECOMMENDATIONS');
  for (const rec of result.recommendations || []) {
    lines.push(`• ${rec}`);
  }
  if ((result.recommendations || []).length === 0) lines.push('None.');
  lines.push('');

  lines.push('IDENTITY MATCHES');
  const matches = evidence?.identityMatches || [];
  if (matches.length === 0) {
    lines.push('No protected identity matches.');
  } else {
    for (const m of matches.slice(0, 8)) {
      lines.push(`• ${m.id} (${m.type}) — ${m.matchType} score ${m.score}`);
    }
  }
  lines.push('');

  lines.push('CHARACTER ATTESTATION');
  const charMap = evidence?.characterMap || [];
  if (charMap.length === 0) {
    lines.push('Empty input.');
  } else {
    lines.push(`Pos  Char  Code Point  Script      Confusable  Deviation`);
    for (const c of charMap.slice(0, 200)) {
      const conf = c.confusableMapping ? `→ ${c.confusableMapping}` : '';
      lines.push(
        `${String(c.position).padStart(3)}  ${String(c.char).padEnd(4)}  ${c.codePoint.padEnd(10)}  ${String(c.script).padEnd(10)}  ${conf.padEnd(10)}  ${c.deviationScore}`
      );
    }
  }
  lines.push('');

  lines.push('CHAIN OF CUSTODY');
  const hash = crypto.createHash('sha256').update(input).update(reportId).digest('hex');
  lines.push(`SHA-256(input+reportId): ${hash}`);
  lines.push('This report was generated automatically by the PuniCodex Name Authenticity Shield.');
  lines.push('It may be reproduced for legal or operational review.');

  return lines;
}

function generateForensicsPdf(input, result, evidence) {
  const reportId = evidence?.generatedAt
    ? `R-${Buffer.from(evidence.generatedAt).toString('base64url').slice(0, 16)}`
    : `R-${Date.now()}`;

  const lines = buildLines(input, result, evidence, reportId);
  const content = buildContentStream(lines);
  const contentBytes = Buffer.from(content, 'ascii');

  const objects = [];

  function addObject(body) {
    const id = objects.length + 1;
    objects.push({ id, body });
    return id;
  }

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentId = addObject(
    `<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`
  );
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
  );

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return {
    buffer: Buffer.from(pdf, 'ascii'),
    reportId,
    contentType: 'application/pdf',
  };
}

module.exports = { generateForensicsPdf };
