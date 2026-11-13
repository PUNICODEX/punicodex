'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const {
  compilePrompt,
  downloadImage,
  edgeContactFlags,
  falGenerate,
  main,
  produced,
} = require('../scripts/generate-ai-art.js');
const {
  removeConnectedWhiteBackground,
  whitenTattooCornerMarks,
} = require('../scripts/promote-ai-art-commons.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');

const silentLogger = { log() {}, error() {} };

async function jpeg() {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: '#ffffff' },
  })
    .jpeg()
    .toBuffer();
}

function mockFetch(image, calls) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('https://fal.run/')) {
      return new Response(
        JSON.stringify({ images: [{ url: 'https://images.example/art.jpg' }], seed: 42 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return new Response(image, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
  };
}

const PRODUCTION_FAMILIES = {
  tattoo: [
    /blackwork tattoo illustration/,
    /head-to-toe depiction/,
    /generous white margin on every side/,
  ],
  'bw-engraving': [
    /copperplate engraving/,
    /warm ivory paper/,
    /full-length subject fully contained/,
  ],
  geometric: [/sacred-geometry art print/, /low-poly facets/, /generous margins/],
  realism: [
    /museum-grade cinematic realism/,
    /physically accurate anatomy/,
    /full subject fully contained/,
  ],
  masterpiece: [
    /collector-grade digital masterpiece/,
    /hyper-detailed cinematic fantasy realism/,
    /elegant negative space/,
  ],
};

test('every built flagship has compilable production prompts in every premium family', () => {
  const built = ARCHETYPES.filter((entry) => entry.built);
  const library = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  assert.equal(built.length, 597);
  for (const archetype of built) {
    const spec = library.deities[archetype.id];
    assert.ok(spec, `${archetype.id} has a prompt specification`);
    for (const [family, patterns] of Object.entries(PRODUCTION_FAMILIES)) {
      const prompt = compilePrompt({ ...spec, name: archetype.id }, family);
      assert.ok(library.families[family]?.dna, `${family} is registered`);
      assert.ok(
        library.families[family]?.mutationOperators?.['cropped-subject'],
        `${family} has structural curation`
      );
      for (const pattern of patterns) {
        assert.match(prompt, pattern, `${archetype.id} ${family} prompt`);
      }
      assert.doesNotMatch(
        prompt,
        /generous black space|pure black background|gold and black/i,
        `${archetype.id} ${family} prompt leaks classic-gold mutations`
      );
      assert.ok(
        library.traditions[spec.tradition]?.iconography,
        `${archetype.id} has tradition guidance`
      );
      assert.match(
        prompt,
        /FINAL CULTURAL BOUNDARY:/,
        `${archetype.id} ${family} cultural boundary`
      );
      assert.ok(
        !prompt.includes('undefined'),
        `${archetype.id} ${family} prompt has no missing fields`
      );
    }
  }
});

test('subject typing prevents human deity styling on creatures places and emblems', () => {
  const library = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  const cases = [
    ['hydra', 'creature', /no human torso, human arms, deity face, crown, jewelry, regalia/],
    ['medousa', 'hybrid', /mythic human-animal hybrid/],
    ['acheron', 'location', /sacred place, landscape or realm as the primary subject/],
    ['bifrost', 'emblem', /symbolic emblem or sacred object as the primary subject/],
  ];
  for (const [id, subjectType, pattern] of cases) {
    const spec = library.deities[id];
    assert.equal(spec.subjectType, subjectType, `${id} subject type`);
    const prompt = compilePrompt({ ...spec, name: id }, 'tattoo');
    assert.match(prompt, pattern, `${id} subject-form guidance`);
    assert.doesNotMatch(
      prompt,
      /classical Greek drapery, contrapposto|classical Roman contrapposto/i,
      `${id} received anthropomorphic tradition styling`
    );
  }
  const hydraPrompt = compilePrompt({ ...library.deities.hydra, name: 'hydra' }, 'tattoo');
  assert.match(hydraPrompt, /make nine-headed Lernaean Hydra unmistakable/);
  assert.doesNotMatch(hydraPrompt, /missed attribute/);
});

test('canonical attributes and cultural fences protect known deity identities', () => {
  const library = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  const cases = [
    [
      'nike',
      /loose laurel wreath encircling her hair/,
      /every garment, jewel, weapon, animal and symbol must be explicitly named/,
    ],
    ['freyja', /falcon-feather cloak/, /no Greek or Roman togas/],
    ['amaterasu', /sacred mirror/, /no Chinese characters or seals/],
    [
      'hades',
      /mature bearded Greek god of the dead/,
      /every garment, jewel, weapon, animal and symbol must be explicitly named/,
    ],
    [
      'kali',
      /four-armed dark Hindu goddess Kali/,
      /every limb, weapon, animal and ornament must be explicitly named/,
    ],
  ];
  for (const [id, attributePattern, boundaryPattern] of cases) {
    const prompt = compilePrompt({ ...library.deities[id], name: id }, 'tattoo');
    assert.match(prompt, attributePattern, `${id} canonical attribute`);
    assert.match(prompt, boundaryPattern, `${id} cultural fence`);
  }
});

test('tattoo edge contact is auto-flagged for curation', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-ai-art-edge-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'edge.jpg');
  await sharp({
    create: { width: 64, height: 64, channels: 3, background: '#ffffff' },
  })
    .composite([
      {
        input: Buffer.alloc(64 * 4 * 3, 0),
        raw: { width: 64, height: 4, channels: 3 },
        top: 60,
        left: 0,
      },
    ])
    .jpeg()
    .toFile(file);
  assert.deepEqual(await edgeContactFlags(file, 'tattoo'), [
    'tattoo-edge-contact(256 dark border pixels)',
  ]);
  assert.deepEqual(await edgeContactFlags(file, 'realism'), []);
});

test('fal credentials travel only in the authorization header', async () => {
  const calls = [];
  const result = await falGenerate('a museum-quality study', {
    key: 'test-secret',
    fetchImpl: mockFetch(await jpeg(), calls),
  });
  assert.equal(result.seed, 42);
  assert.equal(calls[0].options.headers.Authorization, 'Key test-secret');
  assert.ok(!calls[0].url.includes('test-secret'));
  assert.ok(!calls[0].options.body.includes('test-secret'));

  await assert.rejects(
    falGenerate('study', {
      key: 'test-secret',
      fetchImpl: async () => new Response('test-secret must not leak', { status: 401 }),
    }),
    (error) =>
      error.message === 'fal request failed (HTTP 401)' && !error.message.includes('test-secret')
  );
});

test('generation validates real images, enforces spend limits, and resumes without duplicates', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-ai-art-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const options = {
    key: 'test-secret',
    selectedNames: ['zeus'],
    family: 'tattoo',
    variants: 4,
    maxSpend: 0.006,
    outDir: directory,
    logPath: path.join(directory, 'generation-log.jsonl'),
    fetchImpl: mockFetch(await jpeg(), calls),
    logger: silentLogger,
  };
  const first = await main(options);
  assert.equal(first.generated, 2);
  assert.equal(first.spent, 0.006);
  assert.equal(first.budgetReached, true);
  assert.equal(calls.length, 4);
  assert.equal(JSON.parse(calls[0].options.body).image_size, 'portrait_4_3');
  assert.equal(fs.readdirSync(directory).filter((file) => file.endsWith('.jpg')).length, 2);

  const second = await main({ ...options, maxSpend: 1 });
  assert.equal(second.generated, 2);
  assert.equal(second.skipped, 2);
  assert.equal(calls.length, 8);
  const third = await main({ ...options, maxSpend: 1 });
  assert.equal(third.generated, 0);
  assert.equal(third.skipped, 4);
  assert.equal(calls.length, 8);
  const logs = fs.readFileSync(options.logPath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(logs.length, 4);
  assert.ok(logs.every((entry) => entry.family === 'tattoo' && entry.verdict === 'pending'));
});

test('invalid image payloads never become generation candidates', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-ai-art-invalid-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const result = await main({
    key: 'test-secret',
    selectedNames: ['zeus'],
    family: 'tattoo',
    variants: 2,
    maxSpend: 0.003,
    outDir: directory,
    logPath: path.join(directory, 'generation-log.jsonl'),
    fetchImpl: mockFetch(Buffer.from('not an image'), calls),
    logger: silentLogger,
  });
  assert.equal(result.generated, 0);
  assert.equal(result.spent, 0.003);
  assert.equal(result.budgetReached, true);
  assert.equal(calls.length, 2);
  assert.equal(fs.readdirSync(directory).filter((file) => file.endsWith('.jpg')).length, 0);
  const log = JSON.parse(fs.readFileSync(path.join(directory, 'generation-log.jsonl'), 'utf8'));
  assert.equal(log.verdict, 'error');
  assert.equal(log.cost, 0.003);
});

test('downloads reject non-image responses without touching an existing file', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-ai-art-download-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'existing.jpg');
  fs.writeFileSync(output, 'original');
  await assert.rejects(
    downloadImage(
      'https://images.example/error',
      output,
      async () => new Response('error', { status: 200, headers: { 'Content-Type': 'text/html' } })
    ),
    /non-image/
  );
  assert.equal(fs.readFileSync(output, 'utf8'), 'original');
  assert.deepEqual(fs.readdirSync(directory), ['existing.jpg']);
});

test('missing credentials cannot trigger a network request', async () => {
  let called = false;
  const result = await main({
    key: '',
    selectedNames: ['zeus'],
    fetchImpl: async () => {
      called = true;
      throw new Error('network should not be called');
    },
    logger: silentLogger,
  });
  assert.equal(result.missingCredential, true);
  assert.equal(called, false);
});

test('prompt-version rejects do not block the next evolved generation', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-ai-art-version-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const review = path.join(directory, 'review');
  fs.mkdirSync(review, { recursive: true });
  const library = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  const currentVersion = library.deities.nike.promptVersion;
  fs.writeFileSync(path.join(review, 'nike-tattoo-v1.1.jpg'), 'old review');
  assert.equal(produced('nike', 'tattoo', directory), false);
  fs.writeFileSync(path.join(review, `nike-tattoo-v${currentVersion}.1.jpg`), 'current review');
  assert.equal(produced('nike', 'tattoo', directory), true);
});

test('tattoo promotion cleans isolated bottom-corner marks without touching the subject', () => {
  const pixels = new Uint8Array(10 * 10 * 3).fill(255);
  const mark = (x, y) => {
    const offset = (y * 10 + x) * 3;
    pixels[offset] = 0;
    pixels[offset + 1] = 0;
    pixels[offset + 2] = 0;
  };
  mark(8, 9);
  mark(9, 9);
  mark(5, 9);
  const cleaned = whitenTattooCornerMarks(pixels, 10, 10, 0.2, 0.1, 245);
  assert.equal(cleaned.changed, 2);
  assert.deepEqual(
    [...cleaned.data.slice((9 * 10 + 8) * 3, (9 * 10 + 10) * 3)],
    [255, 255, 255, 255, 255, 255]
  );
  assert.deepEqual([...cleaned.data.slice((9 * 10 + 5) * 3, (9 * 10 + 6) * 3)], [0, 0, 0]);
});

test('Commons background keying removes only border-connected white pixels', () => {
  const pixels = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 20, 20, 20, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255,
  ]);
  const keyed = removeConnectedWhiteBackground(pixels, 3, 3);
  assert.deepEqual([...keyed.alpha], [0, 0, 0, 0, 255, 0, 0, 0, 0]);
});
