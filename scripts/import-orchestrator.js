#!/usr/bin/env node
/**
 * PuniCodex — Multi-source authoritative import orchestrator
 *
 * Runs the best available importers for each pantheon, merges their
 * suggestions by authority tier, flags conflicts, and emits a single
 * human-reviewed batch.
 *
 * Usage:
 *   node scripts/import-orchestrator.js
 *   node scripts/import-orchestrator.js --pantheon greek
 *   node scripts/import-orchestrator.js --run-id 2026-06-26-multi
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TIERS_PATH = path.join(ROOT, 'data', 'authoritative', 'source-tiers.json');
const SUGGESTIONS_DIR = path.join(ROOT, 'data', 'authoritative', 'staging', 'suggestions');
const MERGED_DIR = path.join(ROOT, 'data', 'authoritative', 'staging', 'merged');

// ═════════════════════════════════════════════════════════════════════════════
// CLI helpers
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[i + 1];
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function sanitizeRunId(id) {
  return String(id).replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// ═════════════════════════════════════════════════════════════════════════════
// Tier loading
// ═════════════════════════════════════════════════════════════════════════════

function loadTiers() {
  return JSON.parse(fs.readFileSync(TIERS_PATH, 'utf8'));
}

function buildSourceTierMap(tiers) {
  const map = {};
  for (const tier of tiers.tiers) {
    for (const source of tier.sources) {
      map[source] = { rank: tier.rank, name: tier.name };
    }
  }
  return map;
}

// ═════════════════════════════════════════════════════════════════════════════
// Importer execution
// ═════════════════════════════════════════════════════════════════════════════

function runImporter(source, runId) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(ROOT, 'scripts', 'import-runner.js'), source, '--run-id', runId],
      {
        cwd: ROOT,
        stdio: 'pipe',
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    child.on('close', (code) => {
      resolve({ source, code, stdout, stderr });
    });
  });
}

function loadBatch(source, runId) {
  const filePath = path.join(SUGGESTIONS_DIR, source, `${runId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ═════════════════════════════════════════════════════════════════════════════
// Merge logic
// ═════════════════════════════════════════════════════════════════════════════

function valuesEqual(a, b) {
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function pickWinningValue(group) {
  // Sort by authority tier (ascending), then confidence (descending)
  const sorted = [...group].sort((a, b) => {
    if (a.tier.rank !== b.tier.rank) return a.tier.rank - b.tier.rank;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  const topTierRank = sorted[0].tier.rank;
  const topTier = sorted.filter((s) => s.tier.rank === topTierRank);

  // Check for same-tier conflict
  const distinctValues = [];
  for (const s of topTier) {
    if (!distinctValues.some((v) => valuesEqual(v.value, s.value))) {
      distinctValues.push(s.value);
    }
  }

  if (distinctValues.length > 1) {
    return { conflict: true, winners: topTier };
  }

  const winner = topTier[0];
  const supporting = sorted.filter(
    (s) => s.source !== winner.source && valuesEqual(s.value, winner.value)
  );
  const overridden = sorted.filter(
    (s) => s.source !== winner.source && !valuesEqual(s.value, winner.value)
  );

  const notes = [];
  if (supporting.length > 0) {
    notes.push(`Agreed by ${[winner.source, ...supporting.map((s) => s.source)].join(', ')}`);
  }
  if (overridden.length > 0) {
    notes.push(
      `Overrode ${overridden.map((s) => `${s.source} (${JSON.stringify(s.value)})`).join('; ')}`
    );
  }

  return {
    conflict: false,
    suggestion: {
      id: winner.id,
      field: winner.field,
      value: winner.value,
      confidence: Math.min(1, (winner.confidence || 0.7) + supporting.length * 0.05),
      authorityTier: winner.tier.rank,
      provenance: winner.provenance,
      note: notes.join('. ') || winner.note,
    },
  };
}

function mergeBatches(batches, sourceTierMap) {
  const grouped = {};
  const sourceStats = {};

  for (const batch of batches) {
    if (!batch) continue;
    const tier = sourceTierMap[batch.source] || { rank: 99, name: 'unknown' };
    sourceStats[batch.source] = {
      tier: tier.rank,
      suggestions: batch.suggestions?.length || 0,
    };
    for (const s of batch.suggestions || []) {
      const key = `${s.id}:${s.field}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        ...s,
        source: batch.source,
        tier,
      });
    }
  }

  const merged = [];
  const conflicts = [];

  for (const key of Object.keys(grouped)) {
    const result = pickWinningValue(grouped[key]);
    if (result.conflict) {
      const sample = grouped[key][0];
      conflicts.push({
        id: sample.id,
        field: sample.field,
        sources: result.winners.map((s) => ({
          source: s.source,
          tier: s.tier.rank,
          value: s.value,
          confidence: s.confidence,
        })),
      });
    } else {
      merged.push(result.suggestion);
    }
  }

  return { merged, conflicts, sourceStats };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const runId = sanitizeRunId(flags['run-id'] || new Date().toISOString());
  const pantheonFilter = flags.pantheon || null;

  const tiers = loadTiers();
  const sourceTierMap = buildSourceTierMap(tiers);
  const allSources = tiers.tiers.flatMap((t) => t.sources);

  console.log(`PuniCodex multi-source orchestrator (runId: ${runId})`);
  if (pantheonFilter) {
    console.log(`  pantheon filter: ${pantheonFilter}`);
  }
  console.log(`  sources: ${allSources.join(', ')}\n`);

  const results = [];
  for (const source of allSources) {
    process.stdout.write(`▸ running ${source} ... `);
    const result = await runImporter(source, runId);
    const ok = result.code === 0;
    results.push({ source, ok, ...result });
    console.log(ok ? 'ok' : `failed (exit ${result.code})`);
    if (!ok && result.stderr) {
      console.log(`   ${result.stderr.split('\n')[0]}`);
    }
  }

  const batches = allSources.map((source) => loadBatch(source, runId));
  const { merged, conflicts, sourceStats } = mergeBatches(batches, sourceTierMap);

  ensureDir(MERGED_DIR);

  const mergedBatch = {
    source: 'multi-source-orchestrator',
    runId,
    retrievedAt: new Date().toISOString(),
    license: 'mixed; see per-suggestion provenance',
    sources: allSources,
    suggestions: merged,
  };

  const mergedPath = path.join(MERGED_DIR, `${runId}.json`);
  fs.writeFileSync(mergedPath, `${JSON.stringify(mergedBatch, null, 2)}\n`, 'utf8');

  const conflictsPath = path.join(MERGED_DIR, `${runId}-conflicts.json`);
  fs.writeFileSync(
    conflictsPath,
    `${JSON.stringify(
      {
        runId,
        generatedAt: new Date().toISOString(),
        conflicts,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    sourceStats,
    summary: {
      merged: merged.length,
      conflicts: conflicts.length,
      byField: merged.reduce((acc, s) => {
        acc[s.field] = (acc[s.field] || 0) + 1;
        return acc;
      }, {}),
    },
  };
  const reportPath = path.join(MERGED_DIR, `${runId}-report.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n─────────────────────────────────────────');
  console.log(`Merged suggestions: ${merged.length}`);
  console.log(`Conflicts:          ${conflicts.length}`);
  console.log(`Merged batch:       ${path.relative(ROOT, mergedPath)}`);
  console.log(`Conflicts:          ${path.relative(ROOT, conflictsPath)}`);
  console.log(`Report:             ${path.relative(ROOT, reportPath)}`);

  if (conflicts.length > 0) {
    console.log('\nReview conflicts before applying:');
    for (const c of conflicts.slice(0, 10)) {
      console.log(`  ${c.id}.${c.field}: ${c.sources.map((s) => s.source).join(' vs ')}`);
    }
    if (conflicts.length > 10) console.log(`  ... and ${conflicts.length - 10} more`);
  }
}

main().catch((err) => {
  console.error('Orchestrator failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
