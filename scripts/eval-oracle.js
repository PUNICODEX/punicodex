#!/usr/bin/env node
/**
 * PuniCodex — Oracle evaluation harness.
 *
 * Scores the RAG Oracle (platform/api/oracle.js) against the golden question
 * set in data/benchmarks/oracle-eval.json. For each case it calls
 * askOracle(q, [], { quick: true }) and checks four signals:
 *
 *   - primaryHit   result.primaryId === expectPrimary (null = must abstain)
 *   - citationsOk  citations.length >= expectCitationsMin
 *   - mentions     every mustMention string appears in the stripped answer
 *   - clean        no forbidden strings and no unresolved template markers
 *
 * Prints a per-intent-group and overall summary (hit@1, citation, mention,
 * clean rates) and exits 1 when the overall primary hit-rate drops below
 * 0.80 or the clean rate below 1.0.
 *
 * Run: node scripts/eval-oracle.js [--quick] [--full] [--json] [--limit N]
 *   --quick  skip the embedding model (default; CI-safe)
 *   --full   run the complete pipeline including semantic retrieval
 *   --json   write the per-case report to data/benchmarks/oracle-eval-report.json
 *   --limit  score only the first N cases (smoke runs)
 */

const fs = require('node:fs');
const path = require('node:path');
const { askOracle } = require('../platform/api/oracle.js');

const GOLDEN_PATH = path.join(__dirname, '..', 'data', 'benchmarks', 'oracle-eval.json');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'benchmarks', 'oracle-eval-report.json');

const THRESHOLDS = {
  hitRateMin: 0.8,
  citationRateMin: 0.9,
  cleanRateMin: 1.0,
};

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

/**
 * Unresolved-output markers: template placeholders and stringified JS values
 * that must never leak into a rendered answer.
 */
const MARKER_PATTERNS = [/\{\{/, /\}\}/, /\bundefined\b/i, /\bnull\b/i, /\[object Object\]/];

function loadGoldenSet(goldenPath = GOLDEN_PATH) {
  const parsed = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  if (!Array.isArray(parsed.cases) || !parsed.cases.length) {
    throw new Error(`Golden set at ${goldenPath} has no cases`);
  }
  return parsed;
}

/**
 * Strip HTML tags and decode the entities the oracle emits, so mention and
 * cleanliness checks run on the text a reader actually sees.
 */
function stripAnswer(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a single oracle result against a golden case.
 */
function scoreCase(testCase, result) {
  const text = stripAnswer(result.answer);
  const lower = text.toLowerCase();

  const expected = testCase.expectPrimary ?? null;
  const actual = result.primaryId ?? null;
  const primaryHit = actual === expected;

  const citations = Array.isArray(result.citations) ? result.citations.length : 0;
  const citationsOk = citations >= (testCase.expectCitationsMin ?? 0);

  const mustMention = testCase.mustMention || [];
  const missingMentions = mustMention.filter((m) => !lower.includes(m.toLowerCase()));
  const mentionsOk = missingMentions.length === 0;

  const forbidden = testCase.forbidden || [];
  const foundForbidden = forbidden.filter((f) => lower.includes(f.toLowerCase()));
  const markersFound = MARKER_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
  const cleanOk = foundForbidden.length === 0 && markersFound.length === 0;

  return {
    q: testCase.q,
    group: testCase.group,
    expectPrimary: expected,
    expectCitationsMin: testCase.expectCitationsMin ?? 0,
    mustMentionCount: mustMention.length,
    actualPrimary: actual,
    citations,
    primaryHit,
    citationsOk,
    mentionsOk,
    cleanOk,
    missingMentions,
    foundForbidden,
    markersFound,
    pass: primaryHit && citationsOk && mentionsOk && cleanOk,
    note: testCase.note,
    excerpt: text.slice(0, 240),
  };
}

function rate(num, den) {
  return den === 0 ? 1 : num / den;
}

/**
 * Aggregate scored cases into the four headline rates.
 */
function summarize(scored) {
  const cited = scored.filter((c) => c.expectCitationsMin >= 1);
  const mention = scored.filter((c) => c.mustMentionCount > 0);
  return {
    cases: scored.length,
    hits: scored.filter((c) => c.primaryHit).length,
    hitRate: rate(scored.filter((c) => c.primaryHit).length, scored.length),
    citationCases: cited.length,
    citationRate: rate(cited.filter((c) => c.citationsOk).length, cited.length),
    mentionCases: mention.length,
    mentionRate: rate(mention.filter((c) => c.mentionsOk).length, mention.length),
    cleanRate: rate(scored.filter((c) => c.cleanOk).length, scored.length),
  };
}

/**
 * Run the full evaluation. Returns the report object; nothing is written
 * unless the CLI passes --json.
 */
async function runEval({ quick = true, limit = null, goldenPath = GOLDEN_PATH } = {}) {
  const golden = loadGoldenSet(goldenPath);
  const allCases = golden.cases;
  const cases = limit ? allCases.slice(0, limit) : allCases;

  const scored = [];
  for (const testCase of cases) {
    const result = await askOracle(testCase.q, [], { quick });
    scored.push(scoreCase(testCase, result));
  }

  const groups = {};
  for (const c of scored) {
    const key = c.group || 'ungrouped';
    (groups[key] = groups[key] || []).push(c);
  }
  const groupSummaries = {};
  for (const [name, groupCases] of Object.entries(groups)) {
    groupSummaries[name] = summarize(groupCases);
  }

  const overall = summarize(scored);
  const pass =
    overall.hitRate >= THRESHOLDS.hitRateMin && overall.cleanRate >= THRESHOLDS.cleanRateMin;

  return {
    generatedAt: new Date().toISOString(),
    mode: quick ? 'quick' : 'full',
    goldenCases: allCases.length,
    thresholds: THRESHOLDS,
    overall,
    groups: groupSummaries,
    cases: scored.map(({ mustMentionCount, ...rest }) => rest),
    pass,
  };
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function printReport(report) {
  console.log(
    `\n${C.bold}Oracle Evaluation${C.reset} (${report.mode} mode, ${report.overall.cases} cases)`
  );
  console.log('='.repeat(64));

  for (const [name, s] of Object.entries(report.groups)) {
    const hitColor = s.hitRate >= THRESHOLDS.hitRateMin ? C.green : C.red;
    console.log(
      `${C.cyan}${name.padEnd(22)}${C.reset} ` +
        `hit@1 ${hitColor}${pct(s.hitRate)}${C.reset} (${s.hits}/${s.cases})  ` +
        `citations ${pct(s.citationRate)}  mentions ${pct(s.mentionRate)}  ` +
        `clean ${pct(s.cleanRate)}`
    );
    for (const c of report.cases.filter((x) => (x.group || 'ungrouped') === name && !x.pass)) {
      const why = [];
      if (!c.primaryHit)
        why.push(`primary=${c.actualPrimary ?? 'null'} (want ${c.expectPrimary ?? 'null'})`);
      if (!c.citationsOk) why.push(`citations=${c.citations}`);
      if (!c.mentionsOk) why.push(`missing: ${c.missingMentions.join(', ')}`);
      if (!c.cleanOk) why.push('unclean output');
      console.log(`  ${C.yellow}✗ ${c.q}${C.reset} ${C.dim}— ${why.join('; ')}${C.reset}`);
    }
  }

  const o = report.overall;
  console.log('='.repeat(64));
  console.log(
    `${C.bold}OVERALL${C.reset}              ` +
      `hit@1 ${pct(o.hitRate)} (${o.hits}/${o.cases})  ` +
      `citations ${pct(o.citationRate)}  mentions ${pct(o.mentionRate)}  clean ${pct(o.cleanRate)}`
  );
  console.log(
    `Thresholds: hit@1 >= ${pct(THRESHOLDS.hitRateMin)}, clean == ${pct(THRESHOLDS.cleanRateMin)} ` +
      `(citation reference >= ${pct(THRESHOLDS.citationRateMin)})`
  );
  if (report.pass) {
    console.log(`${C.green}✓ Oracle evaluation PASSED${C.reset}`);
  } else {
    console.log(`${C.red}✗ Oracle evaluation FAILED${C.reset}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const quick = !args.includes('--full'); // --quick is the default; --full opts into embeddings
  const json = args.includes('--json');
  let limit = null;
  const limitIdx = args.findIndex((a) => a === '--limit' || a.startsWith('--limit='));
  if (limitIdx !== -1) {
    const raw = args[limitIdx].includes('=') ? args[limitIdx].split('=')[1] : args[limitIdx + 1];
    limit = Number.parseInt(raw, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      console.error(`Invalid --limit value: ${raw}`);
      process.exit(2);
    }
  }

  const report = await runEval({ quick, limit });
  printReport(report);

  if (json) {
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nReport written to ${path.relative(process.cwd(), REPORT_PATH)}`);
  }

  process.exit(report.pass ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = {
  loadGoldenSet,
  stripAnswer,
  MARKER_PATTERNS,
  scoreCase,
  summarize,
  runEval,
  THRESHOLDS,
  GOLDEN_PATH,
  REPORT_PATH,
};
