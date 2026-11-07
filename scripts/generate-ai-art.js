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
const MODEL = process.env.FAL_MODEL || 'fal-ai/flux/schnell';
const COST_PER_IMAGE = MODEL.includes('schnell') ? 0.003 : MODEL.includes('dev') ? 0.025 : 0.04;

const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
const args = process.argv.slice(2);
const variantsIdx = args.indexOf('--variants');
const VARIANTS = variantsIdx !== -1 ? Number(args[variantsIdx + 1]) : 2;
const familyIdx = args.indexOf('--family');
const FAMILY = familyIdx !== -1 ? args[familyIdx + 1] : 'classic-gold';
if (familyIdx !== -1 && (!lib.families || !lib.families[FAMILY])) {
  console.error(`unknown family "${FAMILY}" — registered: ${Object.keys(lib.families || {}).join(', ')}`);
  process.exit(1);
}
const batchIdx = args.indexOf('--batch');
let names = args.filter(
  (a, i) => !a.startsWith('--') && isNaN(Number(a)) && !['--family', '--variants', '--batch'].includes(args[i - 1])
);
const DEMAND = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ai-art', 'temple-demand.json'), 'utf8'));
  } catch {
    return {};
  }
})();
// Demand ordering: the sponsorship market's own valuation (throne tier from
// ad_slots) leads; curator win/loss score breaks ties within a tier.
const demandSort = (a, b) => {
  const da = DEMAND[a] ? DEMAND[a].tier : 99;
  const db = DEMAND[b] ? DEMAND[b].tier : 99;
  if (da !== db) return da - db;
  const sa = (lib.deities[a]?.wins || 0) - (lib.deities[a]?.losses || 0);
  const sb = (lib.deities[b]?.wins || 0) - (lib.deities[b]?.losses || 0);
  return sa - sb;
};
// A deity counts as produced when ANY of its generations exists in the
// inbox, keepers, or review (across families) — the same doctrine the
// per-file guard applies inside the loop.
const produced = (name) => {
  for (const d of [OUT_DIR, path.join(OUT_DIR, 'keepers'), path.join(OUT_DIR, 'review')]) {
    try {
      if (fs.readdirSync(d).some((f) => f.startsWith(name + '-') && f.endsWith('.jpg'))) return true;
    } catch {
      /* dir may not exist yet */
    }
  }
  return false;
};
if (batchIdx !== -1) {
  const n = Number(args[batchIdx + 1]);
  const unproduced = Object.keys(lib.deities).filter((x) => !produced(x));
  console.log(`batch: ${unproduced.length} unproduced deities in library (${Object.keys(lib.deities).length - unproduced.length} already have art — skipped)`);
  names = unproduced.sort(demandSort).slice(0, n);
}
if (!names.length) names = Object.keys(lib.deities).sort(demandSort);

function compilePrompt(spec, family) {
  const fam = (lib.families && lib.families[family]) || null;
  // classic-gold (the default) uses the tradition's DNA; other families
  // override the whole visual register while the deity's attributes stay.
  const styleDna =
    fam && fam.dna ? fam.dna : lib.traditions[spec.tradition].styleDna;
  const attr = spec.attributes.join(', ');
  const mutations = (spec.activeMutations || []).map((m) => lib.mutationOperators[m]).filter(Boolean);
  return [
    `${title(spec.name || '')}, ${attr},`,
    styleDna,
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
  if (j.images && j.images[0]) return { url: j.images[0].url, seed: j.seed ?? null };
  throw new Error('fal unexpected: ' + raw.slice(0, 200));
}

/* Auto quality gate: sample the four corners — the house style is gold on
 * VOID. Corners that aren't near-black mean a vase crop, stone slab, or
 * white page crept in (the recurring busy-background failure). Flags the
 * entry for the curator; never auto-rejects. */
async function cornerFlags(file) {
  try {
    const sharp = require('sharp');
    const img = sharp(file);
    const meta = await img.metadata();
    const s = 24;
    const pts = [
      { left: 0, top: 0 },
      { left: Math.max(0, meta.width - s), top: 0 },
      { left: 0, top: Math.max(0, meta.height - s) },
      { left: Math.max(0, meta.width - s), top: Math.max(0, meta.height - s) },
    ];
    const flags = [];
    for (let i = 0; i < pts.length; i++) {
      const { data } = await sharp(file).extract({ ...pts[i], width: s, height: s }).raw().toBuffer({ resolveWithObject: true });
      let sum = 0;
      for (let p = 0; p < data.length; p += 3) sum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      const mean = sum / (data.length / 3);
      if (mean > 60) flags.push(`corner-${i}-not-black(mean ${mean.toFixed(0)})`);
    }
    return flags;
  } catch {
    return [];
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let spent = 0;
  for (const name of names) {
    const spec = lib.deities[name];
    if (!spec) {
      console.log(`✗ unknown deity ${name} — add it to the library first`);
      continue;
    }
    const prompt = compilePrompt({ ...spec, name }, FAMILY);
    for (let v = 1; v <= VARIANTS; v++) {
      const famTag = FAMILY === 'classic-gold' ? '' : `${FAMILY}-`;
      const out = path.join(OUT_DIR, `${name}-${famTag}v${spec.promptVersion}.${v}.jpg`);
      // A generation that exists ANYWHERE (inbox, keepers, review) is already
      // produced — never regenerate it just because it left the inbox.
      const alreadyProduced =
        fs.existsSync(out) ||
        fs.existsSync(path.join(OUT_DIR, 'keepers', path.basename(out))) ||
        fs.existsSync(path.join(OUT_DIR, 'review', path.basename(out)));
      if (alreadyProduced) continue;
      const t0 = Date.now();
      try {
        const res = falGenerate(`${prompt}, variation ${v}`);
        execSync(`curl -s "${res.url}" -o "${out}"`);
        spent += COST_PER_IMAGE;
        const autoFlags = await cornerFlags(out);
        log({ ts: new Date().toISOString(), deity: name, model: MODEL, prompt: `${prompt}, variation ${v}`, seed: res.seed, file: path.relative(ROOT, out), cost: COST_PER_IMAGE, autoFlags, verdict: 'pending' });
        console.log(`✓ ${path.relative(ROOT, out)} (${((Date.now() - t0) / 1000).toFixed(1)}s)${autoFlags.length ? ' ⚑ ' + autoFlags.join(';') : ''}`);
      } catch (e) {
        log({ ts: new Date().toISOString(), deity: name, model: MODEL, prompt, error: e.message.slice(0, 120), verdict: 'error' });
        console.log(`✗ ${name} v${v}: ${e.message.slice(0, 100)}`);
      }
    }
  }
  console.log(`spent ≈ $${spent.toFixed(3)} this run`);
}

main().catch((e) => { console.error(e); process.exit(1); });
