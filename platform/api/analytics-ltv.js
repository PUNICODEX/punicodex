/**
 * PuniCodex — Lifetime value (LTV) analytics.
 *
 * Computes revenue, ARPU/ARPPU, product-line splits, and cohort-based LTV
 * from the site_analytics_events_v2 stream.
 */

const { all } = require('../db/operational');

const REVENUE_EVENTS = [
  'sponsor_payment_complete',
  'patron_checkout_complete',
  'store_checkout_complete',
];

const PRODUCT_LINE_MAP = {
  sponsor_payment_complete: 'sponsor',
  patron_checkout_complete: 'patron',
  store_checkout_complete: 'store',
};

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    list.push(dayString(new Date(now - i * 24 * 60 * 60 * 1000)));
  }
  return list;
}

function parseProperties(properties) {
  if (!properties) return {};
  if (typeof properties === 'object' && !Array.isArray(properties)) return properties;
  if (typeof properties === 'string') {
    try {
      return JSON.parse(properties);
    } catch {
      return {};
    }
  }
  return {};
}

function extractAmount(properties) {
  const obj = parseProperties(properties);
  const amount = parseFloat(obj?.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function placeholders(count, startAt) {
  return Array.from({ length: count }, (_, i) => `$${startAt + i}`).join(', ');
}

async function fetchRevenueRows({ startDay, endDay, templeId }) {
  const params = [startDay, endDay, ...REVENUE_EVENTS];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = `AND temple_id = $${params.length}`;
  }

  const sql = `
    SELECT event_name, temple_id, session_hash, properties, created_at
      FROM site_analytics_events_v2
     WHERE date(created_at) >= $1
       AND date(created_at) <= $2
       AND event_name IN (${placeholders(REVENUE_EVENTS.length, 3)})
       AND is_bot = 0
       AND quality_score >= 0.3
       ${scopeClause}
     ORDER BY created_at
  `;

  return all(sql, params);
}

async function countUniqueSessions({ startDay, endDay, templeId }) {
  const params = [startDay, endDay];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = `AND temple_id = $${params.length}`;
  }

  const row = await all(
    `
      SELECT COUNT(DISTINCT session_hash) AS n
        FROM site_analytics_events_v2
       WHERE date(created_at) >= $1
         AND date(created_at) <= $2
         AND is_bot = 0
         AND quality_score >= 0.3
         ${scopeClause}
    `,
    params
  );

  return row?.[0]?.n || 0;
}

function emptyProductLine() {
  return { revenue: 0, transactions: 0 };
}

/**
 * Compute LTV summary over a rolling window.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function computeLtv({ days = 30, templeId = null }) {
  const dayList = lastNDays(days);
  const startDay = dayList[0];
  const endDay = dayList[dayList.length - 1];

  const rows = await fetchRevenueRows({ startDay, endDay, templeId });

  let totalRevenue = 0;
  let transactions = 0;
  const payingSessions = new Set();
  const byProductLine = {
    sponsor: emptyProductLine(),
    patron: emptyProductLine(),
    store: emptyProductLine(),
  };
  const byTemple = new Map();

  for (const row of rows) {
    const amount = extractAmount(row.properties);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const productLine = PRODUCT_LINE_MAP[row.event_name];
    const sid = row.session_hash || '';
    const tid = row.temple_id || null;

    totalRevenue += amount;
    transactions += 1;
    payingSessions.add(sid);

    if (productLine) {
      byProductLine[productLine].revenue += amount;
      byProductLine[productLine].transactions += 1;
    }

    if (!byTemple.has(tid)) {
      byTemple.set(tid, { templeId: tid, revenue: 0, transactions: 0 });
    }
    const templeRow = byTemple.get(tid);
    templeRow.revenue += amount;
    templeRow.transactions += 1;
  }

  const uniqueSessions = await countUniqueSessions({ startDay, endDay, templeId });
  const arpu = uniqueSessions > 0 ? totalRevenue / uniqueSessions : 0;
  const arppu = payingSessions.size > 0 ? totalRevenue / payingSessions.size : 0;

  return {
    days,
    templeId,
    totalRevenue: round2(totalRevenue),
    transactions,
    uniquePayingSessions: payingSessions.size,
    uniqueSessions,
    arpu: round2(arpu),
    arppu: round2(arppu),
    byProductLine: {
      sponsor: {
        revenue: round2(byProductLine.sponsor.revenue),
        transactions: byProductLine.sponsor.transactions,
      },
      patron: {
        revenue: round2(byProductLine.patron.revenue),
        transactions: byProductLine.patron.transactions,
      },
      store: {
        revenue: round2(byProductLine.store.revenue),
        transactions: byProductLine.store.transactions,
      },
    },
    byTemple: [...byTemple.values()]
      .map((t) => ({ ...t, revenue: round2(t.revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

async function fetchCohortRows({ startDay, endDay, templeId }) {
  const params = [startDay, endDay, ...REVENUE_EVENTS];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = `AND e.temple_id = $${params.length}`;
  }

  const sql = `
    SELECT
      date(s.first_seen_at) AS cohort_date,
      e.event_name,
      e.session_hash,
      e.properties,
      e.temple_id
    FROM site_analytics_events_v2 e
    JOIN site_analytics_sessions s ON s.session_hash = e.session_hash
    WHERE date(e.created_at) >= $1
      AND date(e.created_at) <= $2
      AND e.event_name IN (${placeholders(REVENUE_EVENTS.length, 3)})
      AND e.is_bot = 0
      AND e.quality_score >= 0.3
      ${scopeClause}
    ORDER BY cohort_date, e.created_at
  `;

  return all(sql, params);
}

async function countCohortSessions({ startDay, endDay, templeId }) {
  const params = [startDay, endDay];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = `AND e.temple_id = $${params.length}`;
  }

  return all(
    `
      SELECT
        date(s.first_seen_at) AS cohort_date,
        COUNT(DISTINCT e.session_hash) AS unique_sessions
      FROM site_analytics_events_v2 e
      JOIN site_analytics_sessions s ON s.session_hash = e.session_hash
      WHERE date(e.created_at) >= $1
        AND date(e.created_at) <= $2
        AND e.is_bot = 0
        AND e.quality_score >= 0.3
        ${scopeClause}
      GROUP BY date(s.first_seen_at)
    `,
    params
  );
}

/**
 * Compute LTV grouped by acquisition cohort (session first_seen_at date).
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Array<Object>>}
 */
async function computeLtvByCohort({ days = 30, templeId = null }) {
  const dayList = lastNDays(days);
  const startDay = dayList[0];
  const endDay = dayList[dayList.length - 1];

  const [revenueRows, sessionRows] = await Promise.all([
    fetchCohortRows({ startDay, endDay, templeId }),
    countCohortSessions({ startDay, endDay, templeId }),
  ]);

  const cohorts = new Map();
  const payingSessionsByCohort = new Map();

  for (const row of revenueRows) {
    const amount = extractAmount(row.properties);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const date = row.cohort_date;
    if (!cohorts.has(date)) {
      cohorts.set(date, {
        date,
        revenue: 0,
        transactions: 0,
        uniquePayingSessions: 0,
        uniqueSessions: 0,
        arpu: 0,
      });
      payingSessionsByCohort.set(date, new Set());
    }

    const cohort = cohorts.get(date);
    cohort.revenue += amount;
    cohort.transactions += 1;
    payingSessionsByCohort.get(date).add(row.session_hash || '');
  }

  for (const row of sessionRows) {
    if (!cohorts.has(row.cohort_date)) {
      cohorts.set(row.cohort_date, {
        date: row.cohort_date,
        revenue: 0,
        transactions: 0,
        uniquePayingSessions: 0,
        uniqueSessions: 0,
        arpu: 0,
      });
      payingSessionsByCohort.set(row.cohort_date, new Set());
    }
    cohorts.get(row.cohort_date).uniqueSessions = row.unique_sessions || 0;
  }

  for (const [date, cohort] of cohorts) {
    const paying = payingSessionsByCohort.get(date);
    cohort.uniquePayingSessions = paying ? paying.size : 0;
    cohort.arpu = cohort.uniqueSessions > 0 ? cohort.revenue / cohort.uniqueSessions : 0;
    cohort.revenue = round2(cohort.revenue);
    cohort.arpu = round2(cohort.arpu);
  }

  return [...cohorts.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get LTV summary with a 90-day projection.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function getLtv({ days = 30, templeId = null }) {
  const data = await computeLtv({ days, templeId });
  const projected90Day = days > 0 ? round2((data.totalRevenue / days) * 90) : 0;
  return {
    ...data,
    projected90Day,
  };
}

/**
 * Get LTV by cohort with a 90-day projection.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function getLtvByCohort({ days = 30, templeId = null }) {
  const cohorts = await computeLtvByCohort({ days, templeId });
  const totalRevenue = cohorts.reduce((sum, c) => sum + c.revenue, 0);
  const projected90Day = days > 0 ? round2((totalRevenue / days) * 90) : 0;

  return {
    days,
    templeId,
    cohorts,
    projected90Day,
  };
}

module.exports = {
  computeLtv,
  computeLtvByCohort,
  getLtv,
  getLtvByCohort,
};
