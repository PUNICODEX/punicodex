/**
 * PuniCodex — Feature Drift Monitor (Phase 14)
 *
 * Records per-feature distributions and compares them against a baseline using
 * KL divergence. Alerts when drift exceeds a configurable threshold.
 */

const DEFAULT_FEATURES = ['script_entropy', 'confusable_density', 'normalization_distance'];

const DEFAULT_DRIFT_THRESHOLD = 0.5;

function bucketFor(value, scale = 100) {
  return Math.max(0, Math.min(scale, Math.round(Number(value) * scale)));
}

async function recordFeatureSample(db, features, options = {}) {
  const modelVersion = options.modelVersion || options.model_version || 'unknown';
  const windowStart =
    options.windowStart || options.window_start || new Date().toISOString().split('T')[0];
  const tenantId = options.tenantId || options.tenant_id || null;

  const numericFeatures = {
    script_entropy: features.scriptEntropy,
    confusable_density: features.confusableDensity,
    normalization_distance: features.normalizationDistance,
  };

  for (const [name, value] of Object.entries(numericFeatures)) {
    if (!Number.isFinite(value)) continue;
    const bucket = bucketFor(value);

    await db.run(
      `INSERT INTO drift_samples
         (tenant_id, model_version, feature_name, bucket, count, window_start)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT(tenant_id, model_version, feature_name, bucket, window_start)
       DO UPDATE SET count = drift_samples.count + 1`,
      [tenantId, modelVersion, name, bucket, windowStart]
    );
  }

  return { recorded: true };
}

async function getFeatureDistribution(db, featureName, options = {}) {
  const tenantId = options.tenantId || options.tenant_id || null;
  const modelVersion = options.modelVersion || options.model_version || null;
  const from = options.from || '1970-01-01';
  const to = options.to || '9999-12-31';

  const rows = await db.all(
    `SELECT bucket, SUM(count) as count
     FROM drift_samples
     WHERE feature_name = $1
       AND ($2 IS NULL OR tenant_id = $2)
       AND ($3 IS NULL OR model_version = $3)
       AND window_start >= $4
       AND window_start <= $5
     GROUP BY bucket
     ORDER BY bucket`,
    [featureName, tenantId, tenantId, modelVersion, modelVersion, from, to]
  );

  return rows;
}

function klDivergence(baseline, current) {
  const totalBaseline = baseline.reduce((sum, row) => sum + row.count, 0);
  const totalCurrent = current.reduce((sum, row) => sum + row.count, 0);
  if (totalBaseline === 0 || totalCurrent === 0) return 0;

  const baselineMap = new Map(baseline.map((row) => [row.bucket, row.count / totalBaseline]));
  const currentMap = new Map(current.map((row) => [row.bucket, row.count / totalCurrent]));

  let divergence = 0;
  for (const [bucket, p] of currentMap) {
    const q = baselineMap.get(bucket) || 1e-9;
    divergence += p * Math.log(p / q);
  }
  return divergence;
}

async function computeDrift(db, baselineOptions, currentOptions, featureNames = DEFAULT_FEATURES) {
  const results = [];
  for (const feature of featureNames) {
    const baseline = await getFeatureDistribution(db, feature, baselineOptions);
    const current = await getFeatureDistribution(db, feature, currentOptions);
    const divergence = klDivergence(baseline, current);
    results.push({
      feature,
      divergence,
      threshold: DEFAULT_DRIFT_THRESHOLD,
      alert: divergence > DEFAULT_DRIFT_THRESHOLD,
      baselineTotal: baseline.reduce((sum, row) => sum + row.count, 0),
      currentTotal: current.reduce((sum, row) => sum + row.count, 0),
    });
  }
  return results;
}

async function getDriftReport(db, options = {}) {
  const baseline = options.baseline || {
    from: '1970-01-01',
    to: new Date().toISOString().split('T')[0],
  };
  const current = options.current || { from: baseline.to, to: '9999-12-31' };
  const featureNames = options.features || DEFAULT_FEATURES;

  const results = await computeDrift(db, baseline, current, featureNames);
  const alerting = results.filter((r) => r.alert);

  return {
    generatedAt: new Date().toISOString(),
    baseline,
    current,
    features: results,
    alerting,
    alertCount: alerting.length,
  };
}

module.exports = {
  DEFAULT_FEATURES,
  DEFAULT_DRIFT_THRESHOLD,
  bucketFor,
  recordFeatureSample,
  getFeatureDistribution,
  klDivergence,
  computeDrift,
  getDriftReport,
};
