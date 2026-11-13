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
  falGenerate,
  main,
} = require('../scripts/generate-ai-art.js');
const { removeConnectedWhiteBackground } = require('../scripts/promote-ai-art-commons.js');
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

test('every built flagship has a compilable tattoo prompt with tradition safeguards', () => {
  const built = ARCHETYPES.filter((entry) => entry.built);
  const library = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'ai-art', 'prompt-library.json'), 'utf8')
  );
  assert.equal(built.length, 597);
  for (const archetype of built) {
    const spec = library.deities[archetype.id];
    assert.ok(spec, `${archetype.id} has a prompt specification`);
    const prompt = compilePrompt({ ...spec, name: archetype.id }, 'tattoo');
    assert.match(prompt, /blackwork tattoo illustration/);
    assert.ok(
      library.traditions[spec.tradition]?.iconography,
      `${archetype.id} has tradition guidance`
    );
    assert.ok(!prompt.includes('undefined'), `${archetype.id} prompt has no missing fields`);
  }
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
  const result = await main({
    key: 'test-secret',
    selectedNames: ['zeus'],
    family: 'tattoo',
    variants: 1,
    outDir: directory,
    logPath: path.join(directory, 'generation-log.jsonl'),
    fetchImpl: mockFetch(Buffer.from('not an image'), []),
    logger: silentLogger,
  });
  assert.equal(result.generated, 0);
  assert.equal(fs.readdirSync(directory).filter((file) => file.endsWith('.jpg')).length, 0);
  const log = JSON.parse(fs.readFileSync(path.join(directory, 'generation-log.jsonl'), 'utf8'));
  assert.equal(log.verdict, 'error');
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

test('Commons background keying removes only border-connected white pixels', () => {
  const pixels = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 20, 20, 20, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255,
  ]);
  const keyed = removeConnectedWhiteBackground(pixels, 3, 3);
  assert.deepEqual([...keyed.alpha], [0, 0, 0, 0, 255, 0, 0, 0, 0]);
});
