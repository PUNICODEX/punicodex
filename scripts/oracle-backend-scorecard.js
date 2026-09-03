/**
 * PuniCodex — Oracle LLM backend A/B scorecard.
 *
 * Companion to scripts/eval-oracle.js: given a named LLM backend (see
 * resolveLlmConfig in platform/api/oracle.js), re-runs the golden set and
 * measures the OPTIONAL LLM polish layer only — the deterministic gates stay
 * in the main battery. Per case it records whether the LLM summary fired
 * (`oracle-llm-summary` in the answer), its word count against the system
 * prompt's 250-word budget, and whether the summary portion stays clean (no
 * case-forbidden strings, no unresolved template markers).
 *
 * API keys always come from the operator's environment — never hardcoded.
 * When the required key env var is absent the caller prints a skip notice and
 * exits 0 so CI never fails on a missing key.
 */

const { stripAnswer, MARKER_PATTERNS } = require('./eval-oracle.js');

const SUMMARY_WORD_LIMIT = 250;
const SUMMARY_RE = /<div class="oracle-llm-summary">([\s\S]*?)<\/div>/;

/**
 * Known backends. `apply(env)` sets the selector env vars for the run;
 * `isConfigured(env)` reports whether the operator supplied the credentials
 * resolveLlmConfig needs for that backend.
 */
const BACKENDS = {
  openai: {
    keyHint: 'ORACLE_LLM_API_KEY and ORACLE_LLM_MODEL',
    isConfigured: (env) => Boolean(env.ORACLE_LLM_API_KEY && env.ORACLE_LLM_MODEL),
    apply: (env) => {
      env.ORACLE_LLM_PROVIDER = 'openai';
    },
  },
  nemotron: {
    keyHint: 'NEMOTRON_API_KEY (or NVIDIA_API_KEY)',
    isConfigured: (env) => Boolean(env.NEMOTRON_API_KEY || env.NVIDIA_API_KEY),
    apply: (env) => {
      env.ORACLE_LLM_PROVIDER = 'nemotron';
    },
  },
};

/**
 * Parse `--backend=<name>` from a process.argv-style array.
 * Returns { backend: null } when the flag is absent (default deterministic
 * run), { backend: '<name>' } when valid, or { error: '<msg>' } for a
 * malformed value or an unknown backend name.
 */
function parseBackendFlag(argv) {
  const raw = (argv || []).find((a) => a === '--backend' || a.startsWith('--backend='));
  if (!raw) return { backend: null };
  const name = raw.includes('=')
    ? raw.split('=')[1].trim().toLowerCase()
    : (argv[argv.indexOf(raw) + 1] || '').trim().toLowerCase();
  if (!name) return { error: 'Missing value for --backend (use --backend=<name>)' };
  if (!BACKENDS[name]) {
    return { error: `Unknown backend "${name}" (known: ${Object.keys(BACKENDS).join(', ')})` };
  }
  return { backend: name };
}

/**
 * Extract the stripped text of the LLM summary block, or null when the polish
 * layer did not fire for this answer. The sanitizer only allows inline tags
 * (p/strong/em/lists/headings), never nested divs, so a non-greedy match to
 * the first </div> captures exactly the summary portion.
 */
function extractLlmSummary(answer) {
  const match = String(answer || '').match(SUMMARY_RE);
  if (!match) return null;
  return stripAnswer(match[1]);
}

/**
 * Score the LLM-polish behavior of one oracle answer against a golden case.
 */
function scoreBackendCase(testCase, answer) {
  const summary = extractLlmSummary(answer);
  if (summary === null) {
    return {
      q: testCase.q,
      group: testCase.group,
      fired: false,
      words: 0,
      withinLimit: true,
      cleanOk: true,
      foundForbidden: [],
      markersFound: [],
    };
  }
  const lower = summary.toLowerCase();
  const words = summary ? summary.split(/\s+/).filter(Boolean).length : 0;
  const foundForbidden = (testCase.forbidden || []).filter((f) => lower.includes(f.toLowerCase()));
  const markersFound = MARKER_PATTERNS.filter((p) => p.test(summary)).map((p) => p.source);
  return {
    q: testCase.q,
    group: testCase.group,
    fired: true,
    words,
    withinLimit: words <= SUMMARY_WORD_LIMIT,
    cleanOk: foundForbidden.length === 0 && markersFound.length === 0,
    foundForbidden,
    markersFound,
  };
}

/**
 * Run the golden set with the named backend's env applied and score the LLM
 * polish per case. Mutates process.env (selector vars only — the key itself
 * comes from the operator). Callers check BACKENDS[name].isConfigured first.
 */
async function runBackendScorecard(name, goldenCases, { quick = true } = {}) {
  const backend = BACKENDS[name];
  if (!backend) throw new Error(`Unknown backend: ${name}`);
  backend.apply(process.env);

  // Required lazily so the backend env is in place before the oracle module
  // (and its LLM config resolution) is first touched.
  const { askOracle, resolveLlmConfig } = require('../platform/api/oracle.js');
  const config = resolveLlmConfig();

  const cases = [];
  for (const testCase of goldenCases) {
    const result = await askOracle(testCase.q, [], { quick });
    cases.push(scoreBackendCase(testCase, result.answer));
  }

  const fired = cases.filter((c) => c.fired);
  const unclean = fired.filter((c) => !c.cleanOk);
  const overLimit = fired.filter((c) => !c.withinLimit);
  return {
    backend: name,
    model: config?.model || null,
    baseUrl: config?.baseUrl || null,
    cases,
    coverage: { fired: fired.length, total: cases.length },
    meanWords: fired.length ? fired.reduce((sum, c) => sum + c.words, 0) / fired.length : 0,
    overLimit,
    unclean,
    cleanRate: fired.length ? (fired.length - unclean.length) / fired.length : 1,
  };
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function printScorecard(scorecard) {
  const { coverage } = scorecard;
  console.log(`\nOracle Backend Scorecard — ${scorecard.backend}`);
  console.log('='.repeat(64));
  if (scorecard.model) console.log(`Model:          ${scorecard.model}`);
  if (scorecard.baseUrl) console.log(`Base URL:       ${scorecard.baseUrl}`);
  console.log(
    `Summary fired:  ${coverage.fired}/${coverage.total} (${pct(coverage.fired / coverage.total)})`
  );
  console.log(
    `Mean words:     ${scorecard.meanWords.toFixed(1)} (limit ${SUMMARY_WORD_LIMIT}; ` +
      `${scorecard.overLimit.length} over)`
  );
  console.log(
    `Clean rate:     ${pct(scorecard.cleanRate)} (${coverage.fired - scorecard.unclean.length}/` +
      `${coverage.fired} fired summaries clean)`
  );
  if (scorecard.unclean.length) {
    console.log('Forbidden strings / markers introduced by the LLM summary:');
    for (const c of scorecard.unclean) {
      const what = [...c.foundForbidden.map((f) => `forbidden "${f}"`), ...c.markersFound].join(
        ', '
      );
      console.log(`  ✗ ${c.q} — ${what}`);
    }
  } else {
    console.log('Forbidden strings / markers introduced by the LLM summary: none');
  }
}

module.exports = {
  BACKENDS,
  SUMMARY_WORD_LIMIT,
  parseBackendFlag,
  extractLlmSummary,
  scoreBackendCase,
  runBackendScorecard,
  printScorecard,
};
