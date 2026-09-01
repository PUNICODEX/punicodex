/**
 * PuniCodex — Analytics rollup materialization coordinator.
 *
 * Shared logic used by the daily cron job and the admin on-demand endpoint.
 * Orchestrates funnel, cohort, and LTV rollup generation and reports row counts.
 */

const { all, transaction } = require('../db/operational');
const { materializeFunnels } = require('./analytics-funnels');
const { materializeCohorts } = require('./analytics-cohorts');
const { computeLtv, computeLtvByCohort } = require('./analytics-ltv');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    list.push(dayString(new Date(now - i * MS_PER_DAY)));
  }
  return list;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

async function materializeLtvRollups({ days = 30 }) {
  const dayList = lastNDays(days);
  const [ltv, cohorts] = await Promise.all([computeLtv({ days }), computeLtvByCohort({ days })]);

  const cohortByDay = new Map();
  for (const cohort of cohorts) {
    cohortByDay.set(cohort.date, cohort);
  }

  const upsertSql = `
    INSERT INTO site_analytics_ltv_rollups
      (day, total_revenue, transactions, unique_paying_sessions, unique_sessions,
       arpu, arppu, by_product_line, by_cohort)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT(day)
    DO UPDATE SET
      total_revenue = excluded.total_revenue,
      transactions = excluded.transactions,
      unique_paying_sessions = excluded.unique_paying_sessions,
      unique_sessions = excluded.unique_sessions,
      arpu = excluded.arpu,
      arppu = excluded.arppu,
      by_product_line = excluded.by_product_line,
      by_cohort = excluded.by_cohort,
      updated_at = CURRENT_TIMESTAMP
  `;

  await transaction(async (t) => {
    for (const day of dayList) {
      const cohort = cohortByDay.get(day);
      const totalRevenue = cohort ? cohort.revenue : 0;
      const transactions = cohort ? cohort.transactions : 0;
      const uniquePayingSessions = cohort ? cohort.uniquePayingSessions : 0;
      const uniqueSessions = cohort ? cohort.uniqueSessions : 0;
      const arpu = cohort ? cohort.arpu : 0;
      const arppu = uniquePayingSessions > 0 ? round2(totalRevenue / uniquePayingSessions) : 0;

      await t.run(upsertSql, [
        day,
        totalRevenue,
        transactions,
        uniquePayingSessions,
        uniqueSessions,
        arpu,
        arppu,
        JSON.stringify(ltv.byProductLine),
        cohort ? JSON.stringify(cohort) : null,
      ]);
    }
  });

  return dayList.length;
}

async function countRowsInWindow(table, days, dateColumn = 'day') {
  const dayList = lastNDays(days);
  const result = await all(
    `SELECT COUNT(*) AS n FROM ${table} WHERE ${dateColumn} >= $1 AND ${dateColumn} <= $2`,
    [dayList[0], dayList[dayList.length - 1]]
  );
  return result?.[0]?.n || 0;
}

/**
 * Materialize funnel, cohort, and LTV rollups for a rolling window.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @returns {Promise<Object>} row counts per rollup type
 */
async function materializeAllRollups({ days = 30 } = {}) {
  await materializeFunnels({ days });
  await materializeCohorts({ days });
  const ltvRows = await materializeLtvRollups({ days });

  const [funnels, cohorts] = await Promise.all([
    countRowsInWindow('site_analytics_funnels', days, 'day'),
    countRowsInWindow('site_analytics_cohorts', days, 'cohort_date'),
  ]);

  return {
    funnels,
    cohorts,
    ltv: ltvRows,
  };
}

module.exports = {
  materializeLtvRollups,
  materializeAllRollups,
};
