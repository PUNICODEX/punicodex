/**
 * POST /api/security/csp-report/
 *
 * Public CSP violation-report collector. Browsers POST `{"csp-report": {...}}`
 * here (Content-Type application/csp-report, or application/json from newer
 * reporting code); the sanitized signature is upserted into csp_reports and
 * surfaced on the admin portal's Security tab. Always 204 on acceptance —
 * report senders are fire-and-forget.
 *
 * This endpoint ingests attacker-controlled input, so the contract is strict:
 * the raw body is capped at 8KB, only five fields are extracted, each is
 * sanitized to a fixed shape before it touches SQL (path only, directive
 * allowlist, host only, int-or-null line), and persistence is parameterized
 * via security-overview#recordCspReport. Everything else in the report is
 * discarded — raw report bodies are never stored.
 */

const { handleError } = require('../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../api/public-rate-limiter');
const { recordCspReport } = require('../../../../api/security-overview.js');

const MAX_BODY_BYTES = 8 * 1024;
const DIRECTIVE_RE = /^[a-z-]{1,64}$/;

// Vercel pre-parses application/json bodies into req.body (object); a string
// body covers application/csp-report passes and the test harness. Anything
// else means the stream still has to be drained — with the same hard cap.
function readRawBody(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (req.body && typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Report body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// document-uri → path only: strip query/hash, must start with '/', max 200
// chars. Absolute URLs are reduced to their pathname first.
function sanitizeDocumentPath(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, 2048);
  let path = '';
  if (trimmed.startsWith('/')) {
    path = trimmed.split(/[?#]/)[0];
  } else {
    try {
      path = new URL(trimmed).pathname || '';
    } catch {
      return '';
    }
  }
  if (!path.startsWith('/')) return '';
  return path.slice(0, 200);
}

// blocked-uri / source-file → hostname only, http(s) only. 'inline', 'eval',
// 'self', javascript: URIs, and unparseable values all reduce to ''.
function sanitizeHost(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value.trim().slice(0, 2048));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.hostname.slice(0, 200);
  } catch {
    return '';
  }
}

function sanitizeDirective(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return DIRECTIVE_RE.test(trimmed) ? trimmed : '';
}

function sanitizeLineNumber(value) {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(n) && n >= 0 && n <= 10000000 ? n : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
  if (
    !contentType.startsWith('application/csp-report') &&
    !contentType.startsWith('application/json')
  ) {
    return res.status(415).json({ error: 'Unsupported content type' });
  }

  if (!(await checkPublicRateLimitByReq(req, res, 'csp-report'))) {
    return;
  }

  try {
    const raw = await readRawBody(req);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Report body too large' });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: 'Invalid report body' });
    }
    const report = parsed?.['csp-report'];
    if (!report || typeof report !== 'object' || Array.isArray(report)) {
      return res.status(400).json({ error: 'Missing csp-report object' });
    }

    const fields = {
      documentPath: sanitizeDocumentPath(report['document-uri']),
      directive: sanitizeDirective(report['effective-directive'] || report['violated-directive']),
      blockedHost: sanitizeHost(report['blocked-uri']),
      sourceFileHost: sanitizeHost(report['source-file']),
      lineNumber: sanitizeLineNumber(report['line-number']),
    };

    // A report with neither a page nor a directive carries no signal — drop
    // it silently (still 204: the sender must not retry).
    if (fields.documentPath || fields.directive) {
      await recordCspReport(fields);
    }
    return res.status(204).end();
  } catch (err) {
    if (err.status === 413) return res.status(413).json({ error: err.message });
    handleError(res, err);
  }
};
