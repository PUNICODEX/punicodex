'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const { createPlan, runQc } = require('../scripts/ai-art-pipeline.js');
const { inspectArtifacts, scanArtwork, writeContactSheet } = require('../scripts/lib/ai-art-qc.js');

function makeRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-art-pipeline-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'data', 'ai-art'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ai-art', 'keepers'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ai-art', 'review'), { recursive: true });
  return root;
}

function writeLibrary(root) {
  const library = {
    families: {
      tattoo: {
        dna: 'blackwork tattoo illustration',
        mutationOperators: { 'cropped-subject': 'fix crop' },
      },
    },
    traditions: { greek: { iconography: 'Greek guidance', culturalBoundary: 'Greek boundary' } },
    deities: {
      zeus: { tradition: 'greek', promptVersion: 2, wins: 4, losses: 1, demandTier: 1 },
      nike: { tradition: 'greek', promptVersion: 3, wins: 6, losses: 3, demandTier: 1 },
      pandora: { tradition: 'greek', promptVersion: 1, wins: 0, losses: 2, demandTier: 2 },
    },
  };
  fs.writeFileSync(
    path.join(root, 'data', 'ai-art', 'prompt-library.json'),
    `${JSON.stringify(library, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(root, 'data', 'ai-art', 'temple-demand.json'),
    `${JSON.stringify({ zeus: { tier: 1 }, nike: { tier: 1 }, pandora: { tier: 2 } }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(root, 'data', 'ai-art', 'generation-log.jsonl'), '');
}

async function writeJpeg(file, { border = false } = {}) {
  const detail = Buffer.alloc(200 * 300 * 3);
  for (let i = 0; i < detail.length; i++) detail[i] = (i * 37) % 256;
  const composites = [
    {
      input: detail,
      raw: { width: 200, height: 300, channels: 3 },
      top: 500,
      left: 350,
    },
  ];
  if (border) {
    composites.push({
      input: Buffer.alloc(768 * 4 * 3, 0),
      raw: { width: 768, height: 4, channels: 3 },
      top: 1020,
      left: 0,
    });
  }
  await sharp({ create: { width: 768, height: 1024, channels: 3, background: '#ffffff' } })
    .composite(composites)
    .jpeg()
    .toFile(file);
}

test('pipeline plan is demand-ordered, idempotent, and capped by spend', async (t) => {
  const root = makeRoot(t);
  writeLibrary(root);
  await writeJpeg(path.join(root, 'ai-art', 'zeus-tattoo-v2.1.jpg'));
  await writeJpeg(path.join(root, 'ai-art', 'review', 'nike-tattoo-v1.1.jpg'));

  const plan = createPlan({
    root,
    family: 'tattoo',
    batch: 10,
    variants: 1,
    maxSpend: 0.006,
    model: 'fal-ai/flux/schnell',
  });
  assert.equal(plan.unproducedCount, 2);
  assert.equal(plan.plannedCount, 2);
  assert.equal(plan.estimatedCost, 0.006);
  assert.deepEqual(plan.plannedNames, ['nike', 'pandora']);
  assert.ok(fs.existsSync(path.join(root, 'data', 'ai-art', 'pipeline-plan.json')));

  const second = createPlan({
    root,
    family: 'tattoo',
    batch: 10,
    variants: 1,
    maxSpend: 0.003,
    model: 'fal-ai/flux/schnell',
  });
  assert.equal(second.plannedCount, 1);
  assert.deepEqual(second.plannedNames, ['nike']);
});

test('QC prioritizes pending and structurally flagged artwork and paginates review sheets', async (t) => {
  const root = makeRoot(t);
  writeLibrary(root);
  await writeJpeg(path.join(root, 'ai-art', 'zeus-tattoo-v2.1.jpg'), { border: true });
  await writeJpeg(path.join(root, 'ai-art', 'nike-tattoo-v3.1.jpg'));
  await writeJpeg(path.join(root, 'ai-art', 'review', 'pandora-tattoo-v1.1.jpg'));
  fs.appendFileSync(
    path.join(root, 'data', 'ai-art', 'generation-log.jsonl'),
    [
      JSON.stringify({ file: 'ai-art\\zeus-tattoo-v2.1.jpg', verdict: 'pending', autoFlags: [] }),
      JSON.stringify({ file: 'ai-art\\nike-tattoo-v3.1.jpg', verdict: 'pending', autoFlags: [] }),
      JSON.stringify({
        file: 'pandora-tattoo-v1.1.jpg',
        verdict: 'reject',
        reason: 'wrong-attributes',
        autoFlags: [],
      }),
    ].join('\n') + '\n'
  );

  const scanned = scanArtwork({
    root,
    family: 'tattoo',
    libraryPath: path.join(root, 'data', 'ai-art', 'prompt-library.json'),
    logPath: path.join(root, 'data', 'ai-art', 'generation-log.jsonl'),
  });
  assert.equal(scanned.length, 3);
  const inspected = await inspectArtifacts(root, 'tattoo', scanned);
  const zeus = inspected.find((item) => item.deity === 'zeus');
  assert.match(zeus.qualityFlags.join(' '), /tattoo-edge-contact/);
  assert.equal(inspected[0].state, 'pending');

  const pages = await writeContactSheet({
    items: inspected,
    output: path.join(root, 'ai-art', 'index.html'),
    title: 'TEST REVIEW',
    root,
    perPage: 2,
  });
  assert.equal(pages.length, 2);
  assert.ok(fs.existsSync(path.join(root, 'ai-art', 'index.html')));
  assert.ok(fs.existsSync(path.join(root, 'ai-art', 'page-2.html')));
  const html = fs.readFileSync(path.join(root, 'ai-art', 'index.html'), 'utf8');
  assert.match(html, /TEST REVIEW/);
  assert.match(html, /keep\|reject/);
});

test('QC auto-rejects structural failures and evolves the next prompt version', async (t) => {
  const root = makeRoot(t);
  writeLibrary(root);
  await sharp({ create: { width: 768, height: 1024, channels: 3, background: '#000000' } })
    .jpeg()
    .toFile(path.join(root, 'ai-art', 'zeus-tattoo-v2.1.jpg'));
  await writeJpeg(path.join(root, 'ai-art', 'nike-tattoo-v3.1.jpg'));

  const report = await runQc({ root, family: 'tattoo' });
  const familyReport = report.families.tattoo;
  assert.equal(familyReport.total, 2);
  assert.equal(familyReport.pending, 1);
  assert.equal(familyReport.review, 1);
  assert.equal(familyReport.autoRejected, 1);
  assert.ok(!fs.existsSync(path.join(root, 'ai-art', 'zeus-tattoo-v2.1.jpg')));
  assert.ok(fs.existsSync(path.join(root, 'ai-art', 'review', 'zeus-tattoo-v2.1.jpg')));

  const library = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  assert.equal(library.deities.zeus.promptVersion, 3);
  assert.ok(library.deities.zeus.activeMutations.includes('quality-gate'));
  const log = fs
    .readFileSync(path.join(root, 'data', 'ai-art', 'generation-log.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.equal(log.at(-1).verdict, 'auto-reject');
  assert.equal(log.at(-1).reason, 'quality-gate');
  assert.match(log.at(-1).autoFlags.join(' '), /low-detail/);
});
