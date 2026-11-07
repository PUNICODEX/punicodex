#!/usr/bin/env node
/**
 * PuniCodex — AI art generation engine (fal.ai FLUX).
 *
 * Flywheel-native: prompts are COMPILED from data/ai-art/prompt-library.json
 * (style DNA per tradition + iconographic attributes per deity), never
 * hand-typed per run. Every generation is appended to
 * data/ai-art/generation-log.jsonl with its full prompt, model, and cost;
 * curate-ai-art.js records verdicts and MUTATES the library (rejection
 * reasons map to mutation operators), so prompts continuously evolve and
 * the keep-rate climbs batch over batch.
 *
 * Usage:
 *   FAL_KEY=... node scripts/generate-ai-art.js zeus athena     — named deities
 *   FAL_KEY=... node scripts/generate-ai-art.js --batch 12       — first N by wins
 *   FAL_KEY=... node scripts/generate-ai-art.js zeus --variants 4
 *
 * Env: FAL_KEY (required), FAL_MODEL (default fal-ai/flux/v1.1-pro).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');
const OUT_DIR = path.join(ROOT, 'ai-art');

const KEY = process.env.FAL_KEY;
if (!KEY) {
  console.error('FAL_KEY env required');
  process.exit(1);
}
const MODEL = process.env.FAL_MODEL || 'fal-ai/flux/v1.1-pro';
const COST_PER_IMAGE = MODEL.includes('schnell') ? 0.003 : MODEL.includes('dev') ? 0.025 : 0.04;

const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
const args = process.argv.slice(2);
const variantsIdx = args.indexOf('--variants');
const VARIANTS = variantsIdx !== -1 ? Number(args[variantsIdx + 1]) : 2;
const batchIdx = args.indexOf('--batch');
let names = args.filter((a) => !a.startsWith('--') && isNaN(Number(a)));
if (batchIdx !== -1) {
  const n = Number(args[batchIdx + 1]);
  names = Object.keys(lib.deities)
    .sort((a, b) => (lib.deities[a].wins - lib.deities[a].losses) - (lib.deities[b].wins - lib.deities[b].losses))
    .slice(0, n);
}
if (!names.length) names = Object.keys(lib.deities);

function compilePrompt(spec) {
  const tradition = lib.traditions[spec.tradition];
  const attr = spec.attributes.join(', ');
  const mutations = (spec.activeMutations || []).map((m) => lib.mutationOperators[m]).filter(Boolean);
  return [
    `${title(spec.name || '')}, ${attr},`,
    tradition.styleDna,
    ...mutations,
  ].join(', ');
}

function title(id) {
  const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  const e = LEXICON.find((x) => x.id === id);
  return e ? e.unicode : id;
}

function log(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

function falGenerate(prompt) {
  // Sync endpoint (fal.run): blocks until the image is ready and returns
  // the payload inline. The JSON body goes via a temp file — inline -d
  // quoting through Git Bash + execSync layers mangles it ("error parsing
  // the body"), the file form is bulletproof.
  const bodyFile = path.join(require('os').tmpdir(), `fal-body-${process.pid}.json`);
  fs.writeFileSync(bodyFile, JSON.stringify({ prompt, image_size: 'square' }));
  const raw = execSync(
    `curl -s -m 120 -X POST "https://fal.run/${MODEL}" -H "Authorization: Key ${KEY}" -H "Content-Type: application/json" -d @"${bodyFile}"`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  const j = JSON.parse(raw);
  if (j.images && j.images[0]) return j.images[0].url;
  throw new Error('fal unexpected: ' + raw.slice(0, 200));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let spent = 0;
for (const name of names) {
  const spec = lib.deities[name];
  if (!spec) {
    console.log(`✗ unknown deity ${name} — add it to the library first`);
    continue;
  }
  const prompt = compilePrompt({ ...spec, name });
  for (let v = 1; v <= VARIANTS; v++) {
    const out = path.join(OUT_DIR, `${name}-v${spec.promptVersion}.${v}.jpg`);
    if (fs.existsSync(out)) continue;
    const t0 = Date.now();
    try {
      const url = falGenerate(`${prompt}, variation ${v}`);
      execSync(`curl -s "${url}" -o "${out}"`);
      spent += COST_PER_IMAGE;
      log({ ts: new Date().toISOString(), deity: name, model: MODEL, prompt: `${prompt}, variation ${v}`, file: path.relative(ROOT, out), cost: COST_PER_IMAGE, verdict: 'pending' });
      console.log(`✓ ${path.relative(ROOT, out)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) {
      log({ ts: new Date().toISOString(), deity: name, model: MODEL, prompt, error: e.message.slice(0, 120), verdict: 'error' });
      console.log(`✗ ${name} v${v}: ${e.message.slice(0, 100)}`);
    }
  }
}
console.log(`spent ≈ $${spent.toFixed(3)} this run`);
