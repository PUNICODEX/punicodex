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
 *   FAL_KEY=... node scripts/generate-ai-art.js --batch 12       — first N by demand
 *   FAL_KEY=... node scripts/generate-ai-art.js zeus --variants 4
 *
 * Env: FAL_KEY (required), FAL_MODEL (default fal-ai/flux/schnell),
 *      FAL_MAX_SPEND (optional estimated USD ceiling for this run).
 */
const fs = require('node:fs');
const path = require('node:path');
const { imageQualityFlags } = require('./lib/ai-art-qc.js');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');
const OUT_DIR = path.join(ROOT, 'ai-art');
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const MODEL = process.env.FAL_MODEL || 'fal-ai/flux/schnell';
const costPerImage = (model) =>
  model.includes('schnell') ? 0.003 : model.includes('dev') ? 0.025 : 0.04;

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
  (a, i) => !a.startsWith('--') && isNaN(Number(a)) && !['--family', '--variants', '--batch', '--max-spend'].includes(args[i - 1])
);
const maxSpendIdx = args.indexOf('--max-spend');
const configuredMaxSpend = maxSpendIdx !== -1 ? args[maxSpendIdx + 1] : process.env.FAL_MAX_SPEND;
const MAX_SPEND = configuredMaxSpend === undefined ? Infinity : Number(configuredMaxSpend);
if (!Number.isFinite(VARIANTS) || VARIANTS < 1 || !Number.isInteger(VARIANTS)) {
  console.error('--variants must be a positive integer');
  process.exit(1);
}
if (Number.isNaN(MAX_SPEND) || MAX_SPEND < 0) {
  console.error('--max-spend must be a non-negative number');
  process.exit(1);
}
const DEMAND = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ai-art', 'temple-demand.json'), 'utf8'));
  } catch {
    return {};
  }
})();

const demandSort = (a, b) => {
  const da = DEMAND[a] ? DEMAND[a].tier : 99;
  const db = DEMAND[b] ? DEMAND[b].tier : 99;
  if (da !== db) return da - db;
  const sa = (lib.deities[a]?.wins || 0) - (lib.deities[a]?.losses || 0);
  const sb = (lib.deities[b]?.wins || 0) - (lib.deities[b]?.losses || 0);
  return sa - sb;
};

const produced = (name, family, outDir = OUT_DIR) => {
  const familyTag = family === 'classic-gold' ? '' : `${family}-`;
  const promptVersion = lib.deities[name]?.promptVersion;
  const prefix = `${name}-${familyTag}v${promptVersion}.`;
  for (const d of [outDir, path.join(outDir, 'keepers'), path.join(outDir, 'review')]) {
    try {
      if (fs.readdirSync(d).some((f) => f.startsWith(prefix) && f.endsWith('.jpg'))) return true;
    } catch {}
  }
  return false;
};
if (batchIdx !== -1) {
  const n = Number(args[batchIdx + 1]);
  names = Object.keys(lib.deities).filter((x) => !produced(x, FAMILY)).sort(demandSort).slice(0, n);
}
if (!names.length) names = Object.keys(lib.deities).sort(demandSort);

function subjectGuidance(spec) {
  const attr = spec.attributes.join(', ');
  const primary = spec.attributes[0] || 'the canonical subject';
  switch (spec.subjectType) {
    case 'creature':
      return `SUBJECT FORM: non-anthropomorphic creature; ${attr}; the creature body itself is the entire subject; absolutely no human torso, human arms, deity face, crown, jewelry, regalia, worship posture or multi-armed humanoid form; use only the anatomy and attributes named here`;
    case 'hybrid':
      return `SUBJECT FORM: mythic human-animal hybrid; ${attr}; integrate the human and animal anatomy deliberately and anatomically; no unrelated deity regalia, extra arms, scripts or cultural symbols`;
    case 'location':
      return `SUBJECT FORM: sacred place, landscape or realm as the primary subject; ${attr}; no human portrait, deity figure or regalia unless the source tradition explicitly requires personification`;
    case 'emblem':
      return `SUBJECT FORM: symbolic emblem or sacred object as the primary subject; ${attr}; no deity portrait, human body, regalia or narrative scene unless explicitly named`;
    default:
      return null;
  }
}

function compilePrompt(spec, family) {
  const fam = (lib.families && lib.families[family]) || null;
  const name = title(spec.name || '');
  const styleDna = fam && fam.dna ? fam.dna : lib.traditions[spec.tradition].styleDna;
  const attr = spec.attributes.join(', ');
  const primary = spec.attributes[0] || 'the canonical attribute';
  const baseTraditionGuidance = family === 'classic-gold' ? null : lib.traditions[spec.tradition]?.iconography;
  const traditionGuidance = subjectGuidance(spec) || baseTraditionGuidance;
  const culturalBoundary = lib.traditions[spec.tradition]?.culturalBoundary;
  const operators = fam?.mutationOperators || {};
  const mutations = (spec.activeMutations || [])
    .map((m) => (operators[m] || lib.mutationOperators[m])?.replaceAll('{attribute}', primary))
    .filter(Boolean);
  const identity = `CANONICAL IDENTITY: ${name} is ${attr}; make ${primary} unmistakable and central; use only the attributes named here; do not substitute unrelated weapons, animals, clothing, symbols or secondary figures; absolutely no text, letters, pseudo-script, seals, signatures, numbers, dates, watermarks, borders or frames`;
  const boundary = culturalBoundary ? `FINAL CULTURAL BOUNDARY: ${culturalBoundary}` : null;
  return [identity, styleDna, traditionGuidance, boundary, ...mutations].filter(Boolean).join(', ');
}

function title(id) {
  const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  const e = LEXICON.find((x) => x.id === id);
  return e ? e.unicode : id;
}

function appendGeneration(logPath, entry) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
}

async function falGenerate(prompt, { key, model = MODEL, fetchImpl = fetch, imageSize = 'square' }) {
  if (!key) throw new Error('FAL_KEY env required');
  const response = await fetchImpl(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: imageSize }),
    signal: AbortSignal.timeout(120000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`fal request failed (HTTP ${response.status})`);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('fal returned invalid JSON');
  }
  if (payload.images && payload.images[0]?.url) {
    return { url: payload.images[0].url, seed: payload.seed ?? null };
  }
  throw new Error('fal response contained no image');
}

async function downloadImage(url, output, fetchImpl = fetch) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`image download failed (HTTP ${response.status})`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('image download returned a non-image response');
  const declaredBytes = Number(response.headers.get('content-length') || 0);
  if (declaredBytes > MAX_IMAGE_BYTES) throw new Error('image exceeds the 25 MB safety limit');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > MAX_IMAGE_BYTES) throw new Error('image exceeds the 25 MB safety limit');
    chunks.push(Buffer.from(chunk));
  }
  if (!bytes) throw new Error('image download was empty');
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, Buffer.concat(chunks));
    fs.renameSync(temporary, output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

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

async function edgeContactFlags(file, family) {
  if (family !== 'tattoo') return [];
  try {
    const sharp = require('sharp');
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const band = 4;
    const darkThreshold = 235;
    let edgePixels = 0;
    const visit = (x, y) => {
      const i = (y * info.width + x) * 3;
      if (Math.max(data[i], data[i + 1], data[i + 2]) <= darkThreshold) edgePixels++;
    };
    for (let x = 0; x < info.width; x++) {
      for (let y = 0; y < Math.min(band, info.height); y++) visit(x, y);
      for (let y = Math.max(0, info.height - band); y < info.height; y++) visit(x, y);
    }
    for (let y = Math.min(band, info.height); y < Math.max(0, info.height - band); y++) {
      for (let x = 0; x < Math.min(band, info.width); x++) visit(x, y);
      for (let x = Math.max(0, info.width - band); x < info.width; x++) visit(x, y);
    }
    return edgePixels > 20 ? [`tattoo-edge-contact(${edgePixels} dark border pixels)`] : [];
  } catch {
    return [];
  }
}

async function main({
  fetchImpl = fetch,
  key = process.env.FAL_KEY,
  selectedNames = names,
  outDir = OUT_DIR,
  logPath = LOG_PATH,
  family = FAMILY,
  variants = VARIANTS,
  model = MODEL,
  imageSize =
    process.env.FAL_IMAGE_SIZE ||
    (['tattoo', 'bw-engraving', 'realism', 'oil', 'masterpiece'].includes(family)
      ? 'portrait_4_3'
      : 'square'),
  maxSpend = MAX_SPEND,
  logger = console,
} = {}) {
  if (!key) {
    logger.error('FAL_KEY env required');
    return { spent: 0, generated: 0, skipped: 0, missingCredential: true };
  }
  if (batchIdx !== -1) {
    logger.log(
      `batch: ${selectedNames.length} planned deities (${Object.keys(lib.deities).length - selectedNames.length} already have art — skipped)`
    );
  }
  fs.mkdirSync(outDir, { recursive: true });
  const unitCost = costPerImage(model);
  let spent = 0;
  let generated = 0;
  let skipped = 0;
  let budgetReached = false;
  for (const name of selectedNames) {
    const spec = lib.deities[name];
    if (!spec) {
      logger.log(`✗ unknown deity ${name} — add it to the library first`);
      continue;
    }
    const prompt = compilePrompt({ ...spec, name }, family);
    for (let v = 1; v <= variants; v++) {
      if (spent + unitCost > maxSpend + Number.EPSILON) {
        budgetReached = true;
        break;
      }
      const famTag = family === 'classic-gold' ? '' : `${family}-`;
      const out = path.join(outDir, `${name}-${famTag}v${spec.promptVersion}.${v}.jpg`);
      const alreadyProduced =
        fs.existsSync(out) ||
        fs.existsSync(path.join(outDir, 'keepers', path.basename(out))) ||
        fs.existsSync(path.join(outDir, 'review', path.basename(out)));
      if (alreadyProduced) {
        skipped++;
        continue;
      }
      const t0 = Date.now();
      let charged = false;
      try {
        const res = await falGenerate(`${prompt}, variation ${v}`, { key, model, fetchImpl, imageSize });
        // FAL is billed once a successful generation exists, even if the
        // downstream download or image validation fails afterward. Account
        // for that charge before deciding whether the spend ceiling allows
        // another attempt.
        spent += unitCost;
        charged = true;
        await downloadImage(res.url, out, fetchImpl);
        const sharp = require('sharp');
        const metadata = await sharp(out).metadata();
        if (!metadata.width || !metadata.height) throw new Error('downloaded image has invalid dimensions');
        generated++;
        const autoFlags =
          family === 'classic-gold' ? await cornerFlags(out) : await imageQualityFlags(out, family);
        appendGeneration(logPath, {
          ts: new Date().toISOString(),
          deity: name,
          family,
          model,
          imageSize,
          prompt: `${prompt}, variation ${v}`,
          seed: res.seed,
          file: path.relative(ROOT, out),
          cost: unitCost,
          autoFlags,
          verdict: 'pending',
        });
        logger.log(`✓ ${path.relative(ROOT, out)} (${((Date.now() - t0) / 1000).toFixed(1)}s)${autoFlags.length ? ` ⚑ ${autoFlags.join(';')}` : ''}`);
      } catch (error) {
        if (fs.existsSync(out)) fs.unlinkSync(out);
        appendGeneration(logPath, {
          ts: new Date().toISOString(),
          deity: name,
          family,
          model,
          imageSize,
          prompt: `${prompt}, variation ${v}`,
          cost: charged ? unitCost : 0,
          error: error.message.slice(0, 200),
          verdict: 'error',
        });
        logger.log(`✗ ${name} v${v}: ${error.message.slice(0, 120)}`);
      }
    }
    if (budgetReached) break;
  }
  logger.log(`spent ≈ $${spent.toFixed(3)} this run`);
  if (budgetReached) logger.log(`estimated spend ceiling reached ($${maxSpend.toFixed(2)})`);
  return { spent, generated, skipped, budgetReached };
}

if (require.main === module) {
  main().then((result) => {
    if (result.missingCredential) process.exitCode = 1;
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  compilePrompt,
  cornerFlags,
  costPerImage,
  downloadImage,
  edgeContactFlags,
  falGenerate,
  main,
  produced,
};
