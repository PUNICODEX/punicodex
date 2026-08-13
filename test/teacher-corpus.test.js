#!/usr/bin/env node
/**
 * PuniCodex — Teacher-Distillation Corpus Tests
 *
 * Guards the teacher pipeline (platform/agents/teacher-client.js +
 * scripts/generate-teacher-corpus.js): client configuration detection,
 * retry/timeout behavior with a MOCKED fetch (no network), the
 * self-verification gate (hallucinated sources/forms/tiers/pantheons and
 * template leakage are rejected with reasons), defensive JSON parsing,
 * staging + resume semantics, dry-run purity, and the CLI's exit-2 contract
 * when the teacher is unconfigured.
 */

'use strict';

const assert = require('node:assert');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'generate-teacher-corpus.js');

const teacherClient = require('../platform/agents/teacher-client.js');
const pipeline = require('../scripts/generate-teacher-corpus.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const tmpDirs = [];
function makeStagingDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-teacher-test-'));
  tmpDirs.push(dir);
  return dir;
}

function stubFetch(handler) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  return calls;
}

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function setTeacherEnv(overrides) {
  const saved = {
    TEACHER_BASE_URL: process.env.TEACHER_BASE_URL,
    TEACHER_API_KEY: process.env.TEACHER_API_KEY,
    TEACHER_MODEL: process.env.TEACHER_MODEL,
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v == null) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

const silent = () => {};

// A teacher payload that always passes the verification gate for aphrodite
// (canonical sources: LSJ, Pape-Benseler, Beekes; unicode: Aphrodítē).
function validTeacherJson(output) {
  return JSON.stringify({
    records: [
      {
        instruction: 'What does the name Aphrodítē mean?',
        input: '',
        output:
          output ||
          'The name means "born of sea foam" (from ἀφρός), as recorded in LSJ. ' +
            'The restoration Aphrodítē preserves both the acute accent and the long ē.',
        citedSources: ['LSJ'],
      },
    ],
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Teacher client (mocked fetch — no network)
// ═════════════════════════════════════════════════════════════════════════════

test('isConfigured is false without TEACHER_API_KEY / TEACHER_MODEL', () => {
  const restore = setTeacherEnv({ TEACHER_API_KEY: null, TEACHER_MODEL: null });
  try {
    assert.strictEqual(teacherClient.isConfigured(), false);
  } finally {
    restore();
  }
});

test('isConfigured is true with key and model set', () => {
  const restore = setTeacherEnv({ TEACHER_API_KEY: 'sk-test', TEACHER_MODEL: 'gpt-test' });
  try {
    assert.strictEqual(teacherClient.isConfigured(), true);
  } finally {
    restore();
  }
});

test('chat returns null when unconfigured and never calls fetch', async () => {
  const restore = setTeacherEnv({ TEACHER_API_KEY: null, TEACHER_MODEL: null });
  const calls = stubFetch(() => {
    throw new Error('fetch must not be called');
  });
  try {
    const result = await teacherClient.chat([{ role: 'user', content: 'hi' }]);
    assert.strictEqual(result, null);
    assert.strictEqual(calls.length, 0);
  } finally {
    restore();
  }
});

test('chat posts to {base}/chat/completions and returns message content', async () => {
  const restore = setTeacherEnv({
    TEACHER_BASE_URL: 'https://teacher.example.com/v1/',
    TEACHER_API_KEY: 'sk-test',
    TEACHER_MODEL: 'gpt-test',
  });
  const calls = stubFetch(() =>
    jsonResponse(200, { choices: [{ message: { content: 'teacher says hi' } }] })
  );
  try {
    const content = await teacherClient.chat([{ role: 'user', content: 'hi' }], {
      temperature: 0.1,
      maxTokens: 42,
    });
    assert.strictEqual(content, 'teacher says hi');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, 'https://teacher.example.com/v1/chat/completions');
    assert.strictEqual(calls[0].init.method, 'POST');
    assert.strictEqual(calls[0].init.headers.authorization, 'Bearer sk-test');
    const body = JSON.parse(calls[0].init.body);
    assert.strictEqual(body.model, 'gpt-test');
    assert.strictEqual(body.temperature, 0.1);
    assert.strictEqual(body.max_tokens, 42);
  } finally {
    restore();
  }
});

test('chat retries exactly once on 429 and then succeeds', async () => {
  const restore = setTeacherEnv({ TEACHER_API_KEY: 'sk-test', TEACHER_MODEL: 'gpt-test' });
  const calls = stubFetch((_url, _init, n) =>
    n === 1
      ? jsonResponse(429, { error: 'rate limited' })
      : jsonResponse(200, { choices: [{ message: { content: 'after retry' } }] })
  );
  try {
    const content = await teacherClient.chat([{ role: 'user', content: 'hi' }], {
      retryDelayMs: 1,
    });
    assert.strictEqual(content, 'after retry');
    assert.strictEqual(calls.length, 2);
  } finally {
    restore();
  }
});

test('chat returns null on persistent 5xx and on network failure (never throws)', async () => {
  const restore = setTeacherEnv({ TEACHER_API_KEY: 'sk-test', TEACHER_MODEL: 'gpt-test' });
  let calls = stubFetch(() => jsonResponse(500, {}));
  try {
    const content = await teacherClient.chat([{ role: 'user', content: 'hi' }], {
      retryDelayMs: 1,
    });
    assert.strictEqual(content, null);
    assert.strictEqual(calls.length, 2, 'one retry on 5xx');

    calls = stubFetch(() => {
      throw new Error('socket hangup');
    });
    const onError = await teacherClient.chat([{ role: 'user', content: 'hi' }], {
      retryDelayMs: 1,
    });
    assert.strictEqual(onError, null);
    assert.strictEqual(calls.length, 1, 'no retry on network error');

    calls = stubFetch(() => jsonResponse(200, { unexpected: 'shape' }));
    const onBadShape = await teacherClient.chat([{ role: 'user', content: 'hi' }]);
    assert.strictEqual(onBadShape, null);
  } finally {
    restore();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Pipeline (injected chat — no network, no DB)
// ═════════════════════════════════════════════════════════════════════════════

test('dry-run prints prompts and writes nothing', async () => {
  const stagingDir = makeStagingDir();
  const lines = [];
  let chatCalled = false;
  const result = await pipeline.runPipeline({
    entry: 'aphrodite',
    tasks: ['qa'],
    dryRun: true,
    runId: 'test-dry-run',
    stagingDir,
    chatFn: async () => {
      chatCalled = true;
      return null;
    },
    getEntryContextFn: () => null, // force lexicon fallback — no DB
    log: (line) => lines.push(String(line)),
  });
  assert.strictEqual(chatCalled, false, 'teacher must not be called in dry-run');
  assert.strictEqual(result.prompted, 1);
  assert.strictEqual(result.path, null);
  assert.ok(
    !fs.existsSync(pipeline.stagingPath(stagingDir, 'test-dry-run')),
    'dry-run must not write the staging file'
  );
  const printed = lines.join('\n');
  assert.ok(printed.includes('DRY-RUN'), 'dry-run banner printed');
  assert.ok(printed.includes('[system]') && printed.includes('[user]'), 'prompt roles printed');
  assert.ok(printed.includes('"unicode": "Aphrodítē"'), 'prompt carries canonical context');
});

test('valid teacher JSON is staged with provenance, entryId, and task', async () => {
  const restore = setTeacherEnv({ TEACHER_MODEL: 'gpt-test-teacher' });
  const stagingDir = makeStagingDir();
  try {
    const result = await pipeline.runPipeline({
      entry: 'aphrodite',
      tasks: ['qa'],
      runId: 'test-accept',
      stagingDir,
      chatFn: async () => validTeacherJson(),
      getEntryContextFn: () => null,
      log: silent,
    });
    assert.strictEqual(result.accepted, 1);
    assert.strictEqual(result.rejected, 0);
    const staged = JSON.parse(
      fs.readFileSync(pipeline.stagingPath(stagingDir, 'test-accept'), 'utf8')
    );
    assert.strictEqual(staged.runId, 'test-accept');
    assert.ok(staged.generatedAt, 'staging carries generatedAt');
    assert.deepStrictEqual(staged.teacher, {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-test-teacher',
    });
    const rec = staged.accepted[0];
    assert.strictEqual(rec.entryId, 'aphrodite');
    assert.strictEqual(rec.task, 'qa');
    assert.ok(rec.instruction && rec.output, 'record carries instruction/output');
    assert.deepStrictEqual(rec.citedSources, ['LSJ']);
    assert.strictEqual(rec.provenance.source, 'teacher-distillation');
    assert.strictEqual(rec.provenance.license, 'CC-BY-4.0');
    assert.strictEqual(rec.provenance.teacher, 'gpt-test-teacher');
    assert.ok(rec.provenance.retrievedAt, 'provenance carries retrievedAt');
  } finally {
    restore();
  }
});

test('teacher output citing a hallucinated source is rejected with a reason', async () => {
  const stagingDir = makeStagingDir();
  const payload = JSON.stringify({
    records: [
      {
        instruction: 'Who attests this name?',
        input: '',
        output: 'According to Wikipedia, the name is Greek.',
        citedSources: ['Wikipedia'],
      },
    ],
  });
  const result = await pipeline.runPipeline({
    entry: 'aphrodite',
    tasks: ['qa'],
    runId: 'test-hallucinated-source',
    stagingDir,
    chatFn: async () => payload,
    getEntryContextFn: () => null,
    log: silent,
  });
  assert.strictEqual(result.accepted, 0);
  assert.strictEqual(result.rejected, 1);
  const staged = pipeline.loadStaging(stagingDir, 'test-hallucinated-source');
  assert.ok(
    staged.rejected[0].reasons.some((r) => r.startsWith('uncited-source:')),
    `expected uncited-source reason, got: ${staged.rejected[0].reasons.join(', ')}`
  );
});

test('records contradicting canonical fields are rejected with reasons', async () => {
  const stagingDir = makeStagingDir();
  const payload = JSON.stringify({
    records: [
      {
        instruction: 'What is the restored form?',
        input: '',
        output: 'The restored form is Aphrodîtē.', // hallucinated diacritics
        citedSources: [],
      },
      {
        instruction: 'What tier is this name?',
        input: '',
        output: 'This is a Tier 2 name.', // canonical tier is 1
        citedSources: [],
      },
      {
        instruction: 'Any parallels?',
        input: '',
        output: 'A Norse parallel is often drawn.', // canonical pantheon is greek
        citedSources: [],
      },
      {
        instruction: 'Show the template.',
        input: '',
        output: 'See {{entry}} for undefined details.', // template leakage
        citedSources: [],
      },
    ],
  });
  const result = await pipeline.runPipeline({
    entry: 'aphrodite',
    tasks: ['qa'],
    runId: 'test-contradictions',
    stagingDir,
    chatFn: async () => payload,
    getEntryContextFn: () => null,
    log: silent,
  });
  assert.strictEqual(result.accepted, 0);
  assert.strictEqual(result.rejected, 4);
  const staged = pipeline.loadStaging(stagingDir, 'test-contradictions');
  const allReasons = staged.rejected.flatMap((r) => r.reasons).join('\n');
  assert.ok(allReasons.includes('form-mismatch:'), 'hallucinated form rejected');
  assert.ok(allReasons.includes('tier-mismatch:'), 'wrong tier rejected');
  assert.ok(allReasons.includes('pantheon-mismatch:'), 'wrong pantheon rejected');
  assert.ok(allReasons.includes('template-marker:'), 'template leakage rejected');
});

test('malformed teacher replies are rejected cleanly without throwing', async () => {
  const stagingDir = makeStagingDir();
  const replies = [
    'Sure! Here are your records: [not json at all',
    '{"records": "not-an-array"}',
    null, // teacher unavailable
  ];
  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    const result = await pipeline.runPipeline({
      entry: 'aphrodite',
      tasks: ['qa'],
      runId: `test-malformed-${i}`,
      stagingDir,
      chatFn: async () => reply,
      getEntryContextFn: () => null,
      log: silent,
    });
    assert.strictEqual(result.accepted, 0);
    assert.strictEqual(result.rejected, 1);
    const staged = pipeline.loadStaging(stagingDir, `test-malformed-${i}`);
    const reason = staged.rejected[0].reasons[0];
    assert.ok(
      reason.startsWith(reply == null ? 'teacher-unavailable:' : 'unparseable-response:'),
      `unexpected reason: ${reason}`
    );
  }
});

test('resume with --run-id skips entry+task pairs already staged', async () => {
  const stagingDir = makeStagingDir();
  pipeline.writeStaging(stagingDir, {
    runId: 'test-resume',
    generatedAt: new Date().toISOString(),
    teacher: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-test-teacher' },
    accepted: [
      {
        entryId: 'aphrodite',
        task: 'qa',
        instruction: 'pre-existing',
        input: '',
        output: 'pre-existing answer',
        citedSources: [],
        provenance: {
          source: 'teacher-distillation',
          retrievedAt: new Date().toISOString(),
          license: 'CC-BY-4.0',
          teacher: 'gpt-test-teacher',
        },
      },
    ],
    rejected: [],
  });

  let chatCalls = 0;
  const result = await pipeline.runPipeline({
    entry: 'aphrodite',
    tasks: ['qa', 'etymology'],
    runId: 'test-resume',
    stagingDir,
    chatFn: async () => {
      chatCalls++;
      return validTeacherJson();
    },
    getEntryContextFn: () => null,
    log: silent,
  });
  assert.strictEqual(chatCalls, 1, 'only the unfinished pair calls the teacher');
  assert.strictEqual(result.skipped, 1);
  const staged = pipeline.loadStaging(stagingDir, 'test-resume');
  assert.strictEqual(staged.accepted.length, 2, 'existing record preserved, new one appended');
  assert.ok(
    staged.accepted.some((r) => r.instruction === 'pre-existing'),
    'pre-existing record untouched'
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// CLI contract
// ═════════════════════════════════════════════════════════════════════════════

test('CLI exits 2 with configuration help when the teacher is unconfigured', async () => {
  const env = { ...process.env };
  delete env.TEACHER_API_KEY;
  delete env.TEACHER_MODEL;
  delete env.TEACHER_BASE_URL;
  const { code, stdout } = await new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT_PATH], { env }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout: `${stdout || ''}${stderr || ''}` });
    });
  });
  assert.strictEqual(code, 2, `expected exit 2, got ${code}: ${stdout}`);
  assert.ok(stdout.includes('TEACHER_API_KEY'), 'help names TEACHER_API_KEY');
  assert.ok(stdout.includes('TEACHER_MODEL'), 'help names TEACHER_MODEL');
  assert.ok(stdout.includes('TEACHER_BASE_URL'), 'help names TEACHER_BASE_URL');
});

// ═════════════════════════════════════════════════════════════════════════════

async function runSuite() {
  const savedFetch = global.fetch;
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message.split('\n').join('\n    ')}`);
    }
  }
  global.fetch = savedFetch;
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_e) {
      // best-effort cleanup
    }
  }
  console.log(`\nTeacher Corpus Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
