/**
 * PuniCodex — Security overview service
 *
 * Aggregates live attack/abuse telemetry for the admin portal's Security tab
 * (ops-only endpoint /api/admin/portal/security/):
 *
 *   - requests          — totals / 4xx / 401+403 / 429 from api_request_log,
 *                         24h and 7d windows.
 *   - topAttackPaths    — top 10 paths by error count (7d) with last seen.
 *   - topAttackSources  — top 10 hashed source IPs by error count (7d); the
 *                         hash is truncated to 12 chars for display.
 *   - authFailures      — portal/tenant login failure + lockout counts (24h /
 *                         7d) and the 10 most recent events, from the
 *                         admin_actions audit trail (emails are truncated
 *                         sha256 hashes at write time — never raw).
 *   - authenticity      — authenticity_log volume (7d, high/critical) and the
 *                         unreviewed discovered_spoofs count.
 *   - csp               — CSP violation reports (24h volume, top signatures).
 *   - posture           — booleans parsed from vercel.json at request time.
 *
 * Every source is failure-isolated (mirrors admin-portal-service
 * getDashboard): a failing sub-query yields zeros/empty lists and its label
 * lands in `degraded`, so one missing table never takes the tab down.
 */

const fs = require('node:fs');
const path = require('node:path');
const { get, all, run, isPostgres } = require('../db/operational');
const { runMigration: migrateCspReports } = require('../db/migrate-csp-reports');

const AUTH_ACTIONS = [
  'portal.login.failed',
  'portal.login.locked',
  'tenant.login.failed',
  'tenant.login.locked',
];

// api_request_log / admin_actions / authenticity_log store timestamps via
// CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS' on SQLite, TIMESTAMPTZ on
// Postgres). Cutoffs are bound parameters formatted per driver — an ISO 'T'
// separator would mis-sort lexicographically against SQLite values (same
// contract as observability-service.js#cutoffTimestamp).
function cutoffTimestamp(hours) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  if (isPostgres()) return cutoff.toISOString();
  return cutoff.toISOString().slice(0, 19).replace('T', ' ');
}

function nowTimestamp() {
  return cutoffTimestamp(0);
}

function toCount(value) {
  // Postgres returns COUNT/SUM as strings and SUM over zero rows as NULL;
  // SQLite returns numbers/NULL. Normalize both to a plain number.
  return Number(value) || 0;
}

// ─────────────────────────────────────────────────────────────
// CSP reports
// ─────────────────────────────────────────────────────────────

// Cold-start schema. SQLite: run the idempotent migration on the shared
// connection. Postgres deployments get csp_reports from
// init-operational-postgres.js out of band (same convention as the discount
// codes schema), so there is nothing to do here.
let cspSchemaReady = false;
async function ensureCspSchema() {
  if (cspSchemaReady) return;
  cspSchemaReady = true;
  if (!isPostgres()) migrateCspReports();
}

/**
 * Upsert one sanitized CSP report by its natural key. Every field arrives
 * pre-sanitized from the collector (path-only, directive allowlist, host-only)
 * and is bound as a parameter — report bodies never reach SQL.
 *
 * The upsert is a deliberate SELECT-then-write rather than ON CONFLICT: a
 * NULL line_number never satisfies the UNIQUE key (NULL ≠ NULL in both
 * drivers), so the conflict clause would silently duplicate rows.
 */
async function recordCspReport(fields) {
  await ensureCspSchema();
  const now = nowTimestamp();
  const documentPath = String(fields.documentPath || '');
  const directive = String(fields.directive || '');
  const blockedHost = String(fields.blockedHost || '');
  const sourceFileHost = String(fields.sourceFileHost || '');
  const lineNumber = Number.isInteger(fields.lineNumber) ? fields.lineNumber : null;

  const existing = await get(
    `SELECT id FROM csp_reports
      WHERE document_path = $1 AND directive = $2 AND blocked_host = $3 AND source_file_host = $4
        AND (line_number = $5 OR (line_number IS NULL AND $6 IS NULL))`,
    // The line value binds twice ($5/$6): the SQLite path converts each
    // placeholder occurrence to a positional ?, so repeated values must be
    // repeated in the params array (the Postgres path indexes by number).
    [documentPath, directive, blockedHost, sourceFileHost, lineNumber, lineNumber]
  );
  if (existing) {
    await run('UPDATE csp_reports SET count = count + 1, last_seen = $1 WHERE id = $2', [
      now,
      existing.id,
    ]);
    return { upserted: 'updated' };
  }
  await run(
    `INSERT INTO csp_reports
       (document_path, directive, blocked_host, source_file_host, line_number, count, first_seen, last_seen)
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7)`,
    [documentPath, directive, blockedHost, sourceFileHost, lineNumber, now, now]
  );
  return { upserted: 'inserted' };
}

// ─────────────────────────────────────────────────────────────
// Posture (vercel.json security headers, read at request time)
// ─────────────────────────────────────────────────────────────

function readPosture() {
  // __dirname-relative covers local dev; process.cwd() covers the Vercel
  // function bundle layout. Unreadable in either place → null (the page
  // shows the chips as unknown rather than guessing).
  const candidates = [
    path.join(__dirname, '..', '..', 'vercel.json'),
    path.join(process.cwd(), 'vercel.json'),
  ];
  let config = null;
  for (const candidate of candidates) {
    try {
      config = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      break;
    } catch {
      // try the next candidate
    }
  }
  if (!config) return null;

  const headers = new Map();
  for (const rule of Array.isArray(config.headers) ? config.headers : []) {
    for (const header of Array.isArray(rule.headers) ? rule.headers : []) {
      if (header && typeof header.key === 'string') {
        headers.set(header.key.toLowerCase(), String(header.value ?? ''));
      }
    }
  }
  const csp = headers.get('content-security-policy') || '';
  return {
    cspEnforced: csp.length > 0,
    hsts: headers.has('strict-transport-security'),
    frameAncestorsNone: /frame-ancestors\s+'none'/.test(csp),
    contentTypeNosniff: (headers.get('x-content-type-options') || '').toLowerCase() === 'nosniff',
    referrerPolicy: headers.has('referrer-policy'),
  };
}

// ─────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────

function requestBucket(row) {
  return {
    total: toCount(row?.total),
    clientErrors: toCount(row?.client_errors),
    authErrors: toCount(row?.auth_errors),
    rateLimited: toCount(row?.rate_limited),
  };
}

const REQUEST_TOTALS_SQL = `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) AS client_errors,
       SUM(CASE WHEN status_code IN (401, 403) THEN 1 ELSE 0 END) AS auth_errors,
       SUM(CASE WHEN status_code = 429 THEN 1 ELSE 0 END) AS rate_limited
     FROM api_request_log
     WHERE created_at >= $1`;

function byKind(rows) {
  const kinds = Object.fromEntries(AUTH_ACTIONS.map((action) => [action, 0]));
  for (const row of rows || []) {
    if (kinds[row.action] !== undefined) kinds[row.action] = toCount(row.c);
  }
  return kinds;
}

async function getSecurityOverview() {
  const cut24 = cutoffTimestamp(24);
  const cut7d = cutoffTimestamp(24 * 7);

  // Every aggregate is best-effort: a single failing source (a table that
  // exists in only one driver, a transient upstream error) must not take the
  // Security tab down — the affected widget shows zeros and its label is
  // reported in `degraded`. Accepts a promise or a thunk.
  const degraded = [];
  const orFallback = (label, promiseOrThunk, fallback) => {
    const thunk = typeof promiseOrThunk === 'function' ? promiseOrThunk : () => promiseOrThunk;
    return Promise.resolve()
      .then(thunk)
      .catch((err) => {
        console.warn(`[security] overview source "${label}" degraded: ${err.message}`);
        degraded.push(label);
        return fallback;
      });
  };

  const authPlaceholders = AUTH_ACTIONS.map((_, i) => `$${i + 2}`).join(', ');

  const [
    requests24,
    requests7d,
    topAttackPaths,
    topAttackSources,
    authFailures,
    authenticity,
    csp,
    posture,
  ] = await Promise.all([
    orFallback('requests.24h', get(REQUEST_TOTALS_SQL, [cut24]), null),
    orFallback('requests.7d', get(REQUEST_TOTALS_SQL, [cut7d]), null),
    orFallback(
      'topAttackPaths',
      all(
        `SELECT path, COUNT(*) AS errors, MAX(created_at) AS last_seen
             FROM api_request_log
            WHERE created_at >= $1 AND status_code >= 400 AND status_code < 500
            GROUP BY path
            ORDER BY errors DESC
            LIMIT 10`,
        [cut7d]
      ).then((rows) =>
        rows.map((row) => ({
          path: row.path,
          errors: toCount(row.errors),
          lastSeen: row.last_seen,
        }))
      ),
      []
    ),
    orFallback(
      'topAttackSources',
      all(
        `SELECT ip_hash,
                  COUNT(*) AS total,
                  SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) AS errors
             FROM api_request_log
            WHERE created_at >= $1 AND ip_hash IS NOT NULL AND ip_hash != ''
            GROUP BY ip_hash
            ORDER BY errors DESC
            LIMIT 10`,
        [cut7d]
      ).then((rows) =>
        rows.map((row) => ({
          // Stored hashes are long; the tab displays a 12-char prefix only.
          ipHash: String(row.ip_hash).slice(0, 12),
          total: toCount(row.total),
          errors: toCount(row.errors),
        }))
      ),
      []
    ),
    orFallback(
      'authFailures',
      (async () => {
        const [rows24, rows7d, recentRows] = await Promise.all([
          all(
            `SELECT action, COUNT(*) AS c FROM admin_actions
                WHERE created_at >= $1 AND action IN (${authPlaceholders})
                GROUP BY action`,
            [cut24, ...AUTH_ACTIONS]
          ),
          all(
            `SELECT action, COUNT(*) AS c FROM admin_actions
                WHERE created_at >= $1 AND action IN (${authPlaceholders})
                GROUP BY action`,
            [cut7d, ...AUTH_ACTIONS]
          ),
          all(
            `SELECT action, meta, created_at FROM admin_actions
                WHERE created_at >= $1 AND action IN (${authPlaceholders})
                ORDER BY created_at DESC, id DESC
                LIMIT 10`,
            [cut7d, ...AUTH_ACTIONS]
          ),
        ]);
        const recent = recentRows.map((row) => {
          let meta = {};
          try {
            meta = row.meta ? JSON.parse(row.meta) : {};
          } catch {
            // unparseable meta — show the event without the detail fields
          }
          return {
            kind: row.action,
            at: row.created_at,
            emailHash: typeof meta.emailHash === 'string' ? meta.emailHash : null,
            reason: typeof meta.reason === 'string' ? meta.reason : null,
          };
        });
        const by24 = byKind(rows24);
        const by7d = byKind(rows7d);
        return {
          last24h: { total: Object.values(by24).reduce((a, b) => a + b, 0), byKind: by24 },
          last7d: { total: Object.values(by7d).reduce((a, b) => a + b, 0), byKind: by7d },
          recent,
        };
      })(),
      {
        last24h: { total: 0, byKind: byKind([]) },
        last7d: { total: 0, byKind: byKind([]) },
        recent: [],
      }
    ),
    orFallback(
      'authenticity',
      (async () => {
        const [logRow, spoofRow] = await Promise.all([
          get(
            `SELECT COUNT(*) AS total,
                      SUM(CASE WHEN severity IN ('high', 'critical') THEN 1 ELSE 0 END) AS high_critical
                 FROM authenticity_log
                WHERE created_at >= $1`,
            [cut7d]
          ),
          get('SELECT COUNT(*) AS c FROM discovered_spoofs WHERE reviewed_at IS NULL'),
        ]);
        return {
          last7d: toCount(logRow?.total),
          highCritical7d: toCount(logRow?.high_critical),
          activeSpoofs: toCount(spoofRow?.c),
        };
      })(),
      { last7d: 0, highCritical7d: 0, activeSpoofs: 0 }
    ),
    orFallback(
      'csp',
      (async () => {
        await ensureCspSchema();
        const [dayRow, topRows] = await Promise.all([
          get('SELECT SUM(count) AS reports FROM csp_reports WHERE last_seen >= $1', [cut24]),
          all(
            `SELECT directive, document_path, blocked_host, count, last_seen
                 FROM csp_reports
                ORDER BY count DESC, last_seen DESC
                LIMIT 10`
          ),
        ]);
        return {
          last24h: toCount(dayRow?.reports),
          top: topRows.map((row) => ({
            directive: row.directive,
            documentPath: row.document_path,
            blockedHost: row.blocked_host,
            count: toCount(row.count),
            lastSeen: row.last_seen,
          })),
        };
      })(),
      { last24h: 0, top: [] }
    ),
    orFallback('posture', () => readPosture(), null),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    requests: {
      last24h: requestBucket(requests24),
      last7d: requestBucket(requests7d),
    },
    topAttackPaths,
    topAttackSources,
    authFailures,
    authenticity,
    csp,
    posture,
    degraded,
  };
}

module.exports = { getSecurityOverview, recordCspReport };
