/**
 * PuniCodex — Unicode Fuzzer
 *
 * Generates random Unicode strings from configurable scripts, runs them through
 * the Name Authenticity Shield, and records any exceptions/crashes. Designed to
 * catch unhandled edge cases in confusable analysis, IDNA parsing, and URL
 * decomposition.
 *
 * Run: node scripts/fuzz-unicode.js [--samples 1000] [--maxLength 256] [--seed N]
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const REPORT_DIR = path.join(__dirname, '..', 'data', 'benchmarks', 'authenticity');

const SCRIPT_BLOCKS = {
  Latin: [0x0041, 0x007a],
  LatinExtended: [0x00c0, 0x024f],
  Greek: [0x0370, 0x03ff],
  Cyrillic: [0x0400, 0x04ff],
  Armenian: [0x0530, 0x058f],
  Georgian: [0x10a0, 0x10ff],
  Arabic: [0x0600, 0x06ff],
  Hebrew: [0x0590, 0x05ff],
  Devanagari: [0x0900, 0x097f],
  CJK: [0x4e00, 0x9fff],
  Hangul: [0xac00, 0xd7af],
  Emoji: [0x1f600, 0x1f64f],
  Symbols: [0x2000, 0x206f],
  Invisible: [0x200b, 0x206f],
};

const DEFAULT_SAMPLES = 1000;
const DEFAULT_MAX_LENGTH = 256;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    samples: DEFAULT_SAMPLES,
    maxLength: DEFAULT_MAX_LENGTH,
    seed: Date.now(),
    scripts: Object.keys(SCRIPT_BLOCKS),
    output: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--samples' && i + 1 < args.length) {
      options.samples = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--maxLength' && i + 1 < args.length) {
      options.maxLength = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--seed' && i + 1 < args.length) {
      options.seed = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--scripts' && i + 1 < args.length) {
      options.scripts = args[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      options.output = args[i + 1];
      i++;
    }
  }
  return options;
}

function seedableRng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomCodePoint(rng, blocks) {
  const block = blocks[Math.floor(rng() * blocks.length)];
  const [start, end] = block;
  return start + Math.floor(rng() * (end - start + 1));
}

function randomString(rng, blocks, maxLength) {
  const length = Math.floor(rng() * maxLength) + 1;
  let s = '';
  for (let i = 0; i < length; i++) {
    const cp = randomCodePoint(rng, blocks);
    s += String.fromCodePoint(cp);
  }
  return s;
}

function randomUrl(rng, hostname, maxLength) {
  const paths = ['login', 'signin', 'verify', 'account', 'checkout', 'password'];
  const queries = ['redirect', 'next', 'return_to', 'target'];
  const mode = Math.floor(rng() * 4);
  if (mode === 0) {
    return `https://${hostname}/${paths[Math.floor(rng() * paths.length)]}`;
  }
  if (mode === 1) {
    return `https://${hostname}/?${queries[Math.floor(rng() * queries.length)]}=https://example.com`;
  }
  if (mode === 2) {
    const extra = randomString(rng, [[0x0061, 0x007a]], 10);
    return `https://${hostname}/${paths[Math.floor(rng() * paths.length)]}/${extra}`;
  }
  return `https://user:pass@${hostname}/`;
}

function main() {
  const options = parseArgs();
  const rng = seedableRng(options.seed);

  const { prepareTestDb } = require(path.join(__dirname, '..', 'test', 'helpers', 'test-db.js'));
  prepareTestDb('fuzz-unicode.js');

  const service = require(path.join(__dirname, '..', 'platform', 'api', 'authenticity-service.js'));

  const blocks = options.scripts
    .map((name) => SCRIPT_BLOCKS[name])
    .filter(Boolean);
  if (blocks.length === 0) {
    console.error('No valid script blocks selected');
    process.exit(1);
  }

  const crashes = [];
  const samples = [];
  const start = performance.now();

  for (let i = 0; i < options.samples; i++) {
    const mode = Math.floor(rng() * 3);
    let input;
    let type;
    if (mode === 0) {
      type = 'term';
      input = randomString(rng, blocks, options.maxLength);
    } else if (mode === 1) {
      type = 'domain';
      const label = randomString(rng, blocks, 20);
      const tld = ['com', 'net', 'org', 'io', 'co.uk'][Math.floor(rng() * 5)];
      input = `${label}.${tld}`;
    } else {
      type = 'url';
      const host = randomString(rng, blocks, 20);
      input = randomUrl(rng, host, options.maxLength);
    }

    const t0 = performance.now();
    try {
      if (type === 'domain') service.classifyDomain(input);
      else if (type === 'url') service.classifyUrl(input);
      else service.classifyTerm(input);
    } catch (e) {
      crashes.push({
        index: i,
        input,
        type,
        error: e.message,
        stack: e.stack,
      });
    }
    samples.push({
      index: i,
      input,
      type,
      latencyMs: performance.now() - t0,
    });
  }

  const durationMs = performance.now() - start;
  const report = {
    generatedAt: new Date().toISOString(),
    options,
    summary: {
      samples: options.samples,
      crashes: crashes.length,
      crashRate: crashes.length / options.samples,
      meanLatencyMs: samples.reduce((a, b) => a + b.latencyMs, 0) / samples.length,
      maxLatencyMs: Math.max(...samples.map((s) => s.latencyMs)),
      durationMs,
    },
    crashes: crashes.slice(0, 500),
    samples: samples.slice(0, 100),
  };

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const reportPath = options.output || path.join(REPORT_DIR, `fuzz-report-${date}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PuniCodex — Unicode Fuzz Report                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Samples: ${options.samples}`);
  console.log(`  Crashes: ${crashes.length} (${(report.summary.crashRate * 100).toFixed(3)}%)`);
  console.log(`  Mean latency: ${report.summary.meanLatencyMs.toFixed(2)} ms`);
  console.log(`  Max latency: ${report.summary.maxLatencyMs.toFixed(2)} ms`);
  console.log(`  Duration: ${durationMs.toFixed(0)} ms`);
  console.log(`  Report: ${reportPath}`);

  if (crashes.length > 0) {
    console.log('\n  ✗ Crashes detected.');
    process.exit(1);
  }

  console.log('\n  ✓ No crashes detected.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
