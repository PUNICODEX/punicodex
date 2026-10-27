/**
 * PuniCodex — analytics journeys & attribution (the nervous-system queries).
 *
 * Reads the v5 event stream (site_analytics_events_v2 + sessions) that the
 * beacon pipeline already writes, and answers the questions the pantheon
 * actually asks:
 *
 *   - journeyFlows     — where humans go next from each page (path pairs),
 *                        plus the most common full journeys
 *   - entryPages       — which doors people enter by (no more "/" noise —
 *                        entry means FIRST page of a session, human only)
 *   - attribution      — which referrers / UTMs / entry surfaces (blog,
 *                        herald, temple) lead to store and temple depth
 *   - dwellByPath      — median visible-ms per path (from engagement events)
 *   - sessionSamples   — example full journeys for qualitative inspection
 *
 * Human-only is the contract: every query filters ua_class/bot signals —
 * sponsors and operators never see scanner noise. Bots are still countable
 * via the separate bot overview (they matter for security, not product).
 */

const { all, get, isPostgres } = require('../db/operational.js');

/** 'YYYY-MM-DD HH:MM:SS' — string-compares correctly against both storage
 *  formats (SQLite CURRENT_TIMESTAMP spaces and ISO-with-T) and casts to
 *  timestamptz on Postgres. */
function sinceString(days) {
  const d = new Date(Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Portable JSON-string property extraction. */
function jsonProp(column, key) {
  return isPostgres()
    ? `(properties::jsonb ->> '${key}')::double precision`
    : `CAST(json_extract(properties, '$.${key}') AS REAL)`;
}

/** Portable ordered group-concat of paths. */
function groupConcatPaths(subqueryAlias, orderCols) {
  return isPostgres()
    ? `(SELECT STRING_AGG(e.path, ' → ' ORDER BY ${orderCols}) FROM ${subqueryAlias})`
    : `(SELECT GROUP_CONCAT(e.path, ' → ') FROM ${subqueryAlias})`;
}

/** Top path→path transitions among human sessions, windowed over events. */
async function journeyFlows({ days = 7, limit = 20 } = {}) {
  const since = sinceString(days);
  // LAG over each session's event stream gives (from_path → to_path).
  // created_at has second granularity — id breaks ties within a second.
  return all(
    `WITH ordered AS (
       SELECT session_hash, path,
              LAG(path) OVER (PARTITION BY session_hash ORDER BY created_at, id) AS prev_path
       FROM site_analytics_events_v2
       WHERE event_name = 'page_view' AND is_bot = 0 AND created_at >= ?
     )
     SELECT prev_path AS from_path, path AS to_path, COUNT(*) AS transitions
     FROM ordered
     WHERE prev_path IS NOT NULL AND prev_path != path
     GROUP BY prev_path, to_path
     ORDER BY transitions DESC
     LIMIT ?`,
    [since, limit]
  );
}

/** Most common full journeys (session path sequences), human only. */
async function topJourneys({ days = 7, limit = 15, maxPages = 6 } = {}) {
  const since = sinceString(days);
  const journeyExpr = isPostgres()
    ? `(SELECT STRING_AGG(e.path, ' → ' ORDER BY e.created_at, e.id)
          FROM (SELECT path, created_at, id FROM site_analytics_events_v2
                 WHERE session_hash = s.session_hash
                   AND event_name = 'page_view' AND is_bot = 0
                 ORDER BY created_at, id LIMIT $1) e)`
    : `(SELECT GROUP_CONCAT(e.path, ' → ')
          FROM (SELECT path FROM site_analytics_events_v2
                 WHERE session_hash = s.session_hash
                   AND event_name = 'page_view' AND is_bot = 0
                 ORDER BY created_at, id LIMIT ?) e)`;
  const rows = await all(
    `SELECT s.session_hash, ${journeyExpr} AS journey, COUNT(*) AS pages
     FROM site_analytics_sessions s
     JOIN site_analytics_events_v2 v
       ON v.session_hash = s.session_hash AND v.event_name = 'page_view'
     WHERE s.is_bot = 0 AND s.first_seen_at >= ${isPostgres() ? '$2' : '?'}
     GROUP BY s.session_hash
     HAVING COUNT(*) >= 2
     ORDER BY pages DESC
     LIMIT ${isPostgres() ? '$3' : '?'}`,
    [maxPages, since, limit * 4]
  );
  // Fold identical journeys into counts.
  const byJourney = new Map();
  for (const r of rows) {
    if (!r.journey) continue;
    const key = r.journey;
    byJourney.set(key, (byJourney.get(key) || 0) + 1);
  }
  return [...byJourney.entries()]
    .map(([journey, sessions]) => ({ journey, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

/** Entry pages across human sessions — the true front doors. */
async function entryPages({ days = 7, limit = 20 } = {}) {
  const since = sinceString(days);
  return all(
    `SELECT entry_path AS path,
            COUNT(*) AS sessions,
            ROUND(AVG(event_count), 1) AS avg_events,
            SUM(CASE WHEN entry_temple_id != '' THEN 1 ELSE 0 END) AS temple_entries
     FROM site_analytics_sessions
     WHERE is_bot = 0 AND first_seen_at >= ?
     GROUP BY entry_path
     ORDER BY sessions DESC
     LIMIT ?`,
    [since, limit]
  );
}

/** Referrer/UTM attribution with store/temple conversion signals. */
async function attribution({ days = 7, limit = 20 } = {}) {
  const since = sinceString(days);
  return all(
    `SELECT s.referrer_domain,
            s.utm_source,
            COUNT(*) AS sessions,
            SUM(CASE WHEN EXISTS (
              SELECT 1 FROM site_analytics_events_v2 e
              WHERE e.session_hash = s.session_hash
                AND e.event_name = 'page_view'
                AND e.path LIKE '/store%'
            ) THEN 1 ELSE 0 END) AS reached_store,
            SUM(CASE WHEN EXISTS (
              SELECT 1 FROM site_analytics_events_v2 e
              WHERE e.session_hash = s.session_hash
                AND e.event_name = 'page_view'
                AND e.temple_id != '' AND e.temple_id IS NOT NULL
            ) THEN 1 ELSE 0 END) AS reached_temple
     FROM site_analytics_sessions s
     WHERE s.is_bot = 0 AND s.first_seen_at >= ?
     GROUP BY s.referrer_domain, s.utm_source
     ORDER BY sessions DESC
     LIMIT ?`,
    [since, limit]
  );
}

/** Which entry surfaces (blog, herald, external) convert to temple depth. */
async function surfaceAttribution({ days = 7 } = {}) {
  const since = sinceString(days);
  const rows = await all(
    `SELECT entry_path,
            COUNT(*) AS sessions,
            SUM(CASE WHEN event_count >= 3 THEN 1 ELSE 0 END) AS engaged
     FROM site_analytics_sessions
     WHERE is_bot = 0 AND first_seen_at >= ?
     GROUP BY entry_path`,
    [since]
  );
  const bucket = (path) => {
    const p = String(path || '/');
    if (p === '/' || p === '') return 'home';
    if (p.startsWith('/blog')) return 'blog';
    if (p.startsWith('/herald')) return 'herald';
    if (p.startsWith('/store')) return 'store';
    if (p.startsWith('/sites/')) return 'temple (direct)';
    if (/^\/[a-z0-9-]+\/$/.test(p)) return 'temple (clean url)';
    if (p.startsWith('/search')) return 'search';
    if (p.startsWith('/type') || p.startsWith('/oracle') || p.startsWith('/ink')) return 'tools';
    if (p.startsWith('/lexicon') || p.startsWith('/pantheon') || p.startsWith('/realms'))
      return 'indexes';
    return 'other pages';
  };
  const out = new Map();
  for (const r of rows) {
    const b = bucket(r.entry_path);
    const cur = out.get(b) || { sessions: 0, engaged: 0 };
    cur.sessions += r.sessions;
    cur.engaged += r.engaged;
    out.set(b, cur);
  }
  return [...out.entries()]
    .map(([surface, v]) => ({
      surface,
      sessions: v.sessions,
      engaged: v.engaged,
      engagementRate: v.sessions ? Math.round((v.engaged / v.sessions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

/** Median visible-ms per path from engagement events (human only). */
async function dwellByPath({ days = 7, limit = 20 } = {}) {
  const since = sinceString(days);
  return all(
    `SELECT path,
            COUNT(*) AS samples,
            ROUND(AVG(${jsonProp('properties', 'visible_ms')})) AS avg_visible_ms,
            ROUND(AVG(${jsonProp('properties', 'scroll_pct')})) AS avg_scroll_pct
     FROM site_analytics_events_v2
     WHERE event_name = 'engagement' AND is_bot = 0 AND created_at >= ${isPostgres() ? '$1' : '?'} AND properties IS NOT NULL
     GROUP BY path
     ORDER BY samples DESC
     LIMIT ${isPostgres() ? '$2' : '?'}`,
    [since, limit]
  );
}

/** Example full journeys for qualitative inspection. */
async function sessionSamples({ days = 1, limit = 10 } = {}) {
  const since = sinceString(days);
  const sessions = await all(
    `SELECT session_hash FROM site_analytics_sessions
     WHERE is_bot = 0 AND first_seen_at >= ? AND event_count >= 3
     ORDER BY event_count DESC LIMIT ?`,
    [since, limit]
  );
  const out = [];
  for (const s of sessions) {
    const pages = await all(
      `SELECT path, created_at FROM site_analytics_events_v2
       WHERE session_hash = ? AND event_name = 'page_view' AND is_bot = 0
       ORDER BY created_at, id LIMIT 12`,
      [s.session_hash]
    );
    if (pages.length >= 2) out.push({ session: s.session_hash, pages: pages.map((p) => p.path) });
  }
  return out;
}

/** Bot overview — scanners matter for security, never for product metrics. */
async function botOverview({ days = 7 } = {}) {
  const since = sinceString(days);
  const row = await get(
    `SELECT COUNT(*) AS bot_sessions FROM site_analytics_sessions
     WHERE is_bot = 1 AND first_seen_at >= ?`,
    [since]
  );
  const classes = await all(
    `SELECT ua_class, COUNT(*) AS events FROM site_analytics_events_v2
     WHERE is_bot = 1 AND created_at >= ? GROUP BY ua_class ORDER BY events DESC LIMIT 8`,
    [since]
  );
  return { botSessions: row?.bot_sessions || 0, classes };
}

module.exports = {
  journeyFlows,
  topJourneys,
  entryPages,
  attribution,
  surfaceAttribution,
  dwellByPath,
  sessionSamples,
  botOverview,
};
