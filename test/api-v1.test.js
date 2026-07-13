/**
 * PÚNYCODEX API v1 — Integration tests
 *
 * Tests every v1 endpoint against the real SQLite database using the same
 * Vercel handler functions that production uses.
 */

const assert = require('node:assert');
const http = require('node:http');
const { URL } = require('node:url');

// Set admin password so admin endpoints are testable
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

// Dynamic canonical data so counts stay in sync with the flywheel
const { LEXICON } = require('../type/js/lexicon.js');
const EXPECTED_PANTHEON_COUNT = new Set(LEXICON.map((e) => e.pantheon)).size;

// Reset rate limiters before each run so tests are deterministic
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
resetLimiters();

const { login: adminLogin } = require('../platform/api/admin.js');
let adminAuth;

// Helper to invoke a handler as if it were a Vercel serverless function
function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);
    req.params = options.params || {};

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    let responseBody = null;
    let ended = false;

    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.send = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };

    handler(req, res);
  });
}

function assertEnvelope(body) {
  assert.strictEqual(typeof body, 'object', 'Response body must be an object');
  assert.strictEqual(body.success, true, `Expected success=true, got ${body.success}`);
  assert.ok(body.data !== undefined, 'Response must contain data');
  assert.ok(body.meta, 'Response must contain meta');
  assert.strictEqual(body.meta.version, 'v1', 'API version must be v1');
  assert.ok(body.meta.requestId, 'Response must contain requestId');
  assert.ok(body.meta.timestamp, 'Response must contain timestamp');
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }
}

async function runTests() {
  console.log('\n▸ API v1 Integration Tests\n');

  adminAuth = await adminLogin(process.env.ADMIN_PASSWORD);

  const namesList = require('../api/v1/names/index.js');
  const nameDetail = require('../api/v1/names/[id]/index.js');
  const nameVariants = require('../api/v1/names/[id]/variants.js');
  const nameBreakdown = require('../api/v1/names/[id]/breakdown.js');
  const nameOriginalScript = require('../api/v1/names/[id]/original-script.js');
  const pantheons = require('../api/v1/pantheons/index.js');
  const pantheon = require('../api/v1/pantheons/[name].js');
  const tiers = require('../api/v1/tiers/index.js');
  const autocomplete = require('../api/v1/autocomplete/index.js');
  const convert = require('../api/v1/convert/index.js');
  const convertBatch = require('../api/v1/convert/batch.js');
  const authenticityCheck = require('../api/v1/authenticity/check/index.js');
  const authenticityBatch = require('../api/v1/authenticity/check/batch/index.js');
  const authenticityReport = require('../api/v1/authenticity/report/index.js');
  const v1Policy = require('../api/v1/policy/index.js');
  const v1PolicyEvaluate = require('../api/v1/policy/evaluate/index.js');
  const v1Appraise = require('../api/v1/appraise/index.js');
  const v1AppraiseBatch = require('../api/v1/appraise/batch/index.js');
  const nameSimilarities = require('../api/v1/names/[id]/similarities.js');
  const nameGraph = require('../api/v1/names/[id]/graph.js');
  const similarities = require('../api/v1/similarities/index.js');
  const similaritiesRelationships = require('../api/v1/similarities/relationships.js');
  const openapi = require('../api/v1/openapi.json.js');
  const docs = require('../api/v1/docs/index.js');
  const version = require('../api/v1/version/index.js');
  const adminListKeys = require('../api/admin/api-keys/index.js');
  const adminCreateKey = adminListKeys;
  const adminRevokeKey = require('../api/admin/api-keys/[id]/revoke.js');

  let createdKey = null;

  await test('GET /api/v1/names returns paginated envelope', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?limit=5');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data), 'data must be an array');
    assert.strictEqual(body.data.length, 5);
    assert.ok(body.meta.pagination, 'must include pagination meta');
    assert.strictEqual(body.meta.pagination.limit, 5);
    assert.ok(body.data[0].unicode, 'first entry must have unicode');
    assert.ok(body.data[0].links.self, 'first entry must have self link');
  });

  await test('GET /api/v1/names supports pantheon filter', async () => {
    const { status, body } = await invoke(
      namesList,
      'GET',
      '/api/v1/names?pantheon=greek&limit=10'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(
      body.data.every((item) => item.pantheon === 'greek'),
      'all items must be greek'
    );
  });

  await test('GET /api/v1/names supports tier filter', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?tier=dual');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(
      body.data.every((item) => item.tier === 'dual'),
      'all items must be dual tier'
    );
    assert.ok(body.data.length >= 3, 'must have at least 3 dual-tier entries');
  });

  await test('GET /api/v1/names validates unknown tier', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?tier=invalid');
    assert.strictEqual(status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  });

  await test('GET /api/v1/names/:id returns full scholarly record', async () => {
    const { status, body } = await invoke(nameDetail, 'GET', '/api/v1/names/zeus', {
      params: { id: 'zeus' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.strictEqual(body.data.ascii, 'zeus');
    assert.strictEqual(body.data.unicode, 'Zeús');
    assert.ok(body.data.punycode, 'must have punycode');
    assert.ok(body.data.tierExplanation, 'must have tier explanation');
    assert.ok(Array.isArray(body.data.breakdown), 'must have breakdown array');
    assert.ok(body.data.originalScript, 'must have originalScript');
    assert.ok(Array.isArray(body.data.variants), 'variants must be an array');
  });

  await test('GET /api/v1/names/:id returns 404 for unknown id', async () => {
    const { status, body } = await invoke(nameDetail, 'GET', '/api/v1/names/notarealid', {
      params: { id: 'notarealid' },
    });
    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'NOT_FOUND');
  });

  await test('GET /api/v1/names/:id/variants returns variants', async () => {
    const { status, body } = await invoke(nameVariants, 'GET', '/api/v1/names/apollon/variants', {
      params: { id: 'apollon' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'apollon');
    assert.ok(Array.isArray(body.data.variants), 'variants must be an array');
  });

  await test('GET /api/v1/names/:id/breakdown returns steps', async () => {
    const { status, body } = await invoke(nameBreakdown, 'GET', '/api/v1/names/zeus/breakdown', {
      params: { id: 'zeus' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(body.data.steps.length > 0, 'must have breakdown steps');
    assert.ok(
      body.data.steps.every((s) => s.char !== undefined && s.to !== undefined && s.type),
      'steps must have char, to, and type'
    );
  });

  await test('GET /api/v1/names/:id/original-script returns script info', async () => {
    const { status, body } = await invoke(
      nameOriginalScript,
      'GET',
      '/api/v1/names/zeus/original-script',
      { params: { id: 'zeus' } }
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(body.data.script, 'must have script');
    assert.strictEqual(body.data.scriptName, 'Greek');
    assert.strictEqual(body.data.label, 'Original Script');
  });

  await test('GET /api/v1/pantheons lists all pantheons', async () => {
    const { status, body } = await invoke(pantheons, 'GET', '/api/v1/pantheons');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data.items), 'must have items array');
    assert.strictEqual(body.data.count, EXPECTED_PANTHEON_COUNT);
    assert.ok(
      body.data.items.some((p) => p.id === 'greek'),
      'must include greek'
    );
  });

  await test('GET /api/v1/pantheons/:name returns entries', async () => {
    const { status, body } = await invoke(pantheon, 'GET', '/api/v1/pantheons/norse', {
      params: { name: 'norse' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'norse');
    assert.ok(body.data.total > 0, 'must have entries');
    assert.ok(
      body.data.items.every((item) => item.pantheon === 'norse'),
      'all items must be norse'
    );
  });

  await test('GET /api/v1/tiers documents tier system', async () => {
    const { status, body } = await invoke(tiers, 'GET', '/api/v1/tiers');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data.items), 'must have tier items');
    assert.strictEqual(body.data.items.length, 3);
    assert.ok(
      body.data.items.some((t) => t.id === 'dual'),
      'must include dual tier'
    );
  });

  await test('GET /api/v1/autocomplete returns completions', async () => {
    const { status, body } = await invoke(autocomplete, 'GET', '/api/v1/autocomplete?q=ze&limit=5');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.query, 'ze');
    assert.ok(Array.isArray(body.data.items), 'must have items');
    assert.ok(body.data.items.length > 0, 'must have completions');
    assert.ok(
      body.data.items.every((item) => item.ascii.toLowerCase().startsWith('ze')),
      'completions must start with ze'
    );
  });

  await test('GET /api/v1/convert returns lexicon match', async () => {
    const { status, body } = await invoke(convert, 'GET', '/api/v1/convert?q=zeus');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.matches.length > 0, 'must find zeus');
    assert.strictEqual(body.data.matches[0].id, 'zeus');
    assert.ok(body.data.matches[0].punycode, 'match must have punycode');
  });

  await test('GET /api/v1/convert flags Cyrillic homograph as suspicious', async () => {
    const { status, body } = await invoke(convert, 'GET', '/api/v1/convert?q=%D0%B0res');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.queryTrust, 'must include queryTrust');
    assert.strictEqual(body.data.queryTrust.tier, 'suspicious');
    assert.strictEqual(body.data.queryTrust.canonicalMatch.id, 'ares');
  });

  await test('POST /api/v1/convert/batch handles multiple queries', async () => {
    const { status, body } = await invoke(convertBatch, 'POST', '/api/v1/convert/batch', {
      body: { queries: ['zeus', 'thor'] },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.count, 2);
    assert.ok(
      body.data.items.every((item) => item.matches.length > 0),
      'both queries must match'
    );
  });

  await test('GET /api/v1/openapi.json returns raw OpenAPI spec', async () => {
    const { status, body } = await invoke(openapi, 'GET', '/api/v1/openapi.json');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.openapi, '3.1.0');
    assert.ok(body.paths['/names'], 'spec must include /names');
  });

  await test('GET /api/v1/docs returns HTML', async () => {
    const { status, body } = await invoke(docs, 'GET', '/api/v1/docs');
    assert.strictEqual(status, 200);
    assert.ok(typeof body === 'string', 'docs must return HTML string');
    assert.ok(body.includes('swagger-ui'), 'must include swagger-ui');
  });

  await test('GET /api/v1/version returns dataset version', async () => {
    const { status, body } = await invoke(version, 'GET', '/api/v1/version');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.version, 'must include version');
    assert.ok(body.data.releasedAt, 'must include releasedAt');
    assert.ok(body.data.counts, 'must include counts');
    assert.ok(body.data.canonicalHashes, 'must include canonicalHashes');
  });

  await test('OPTIONS request returns CORS preflight', async () => {
    const { status, body } = await invoke(namesList, 'OPTIONS', '/api/v1/names');
    assert.strictEqual(status, 200);
    assert.ok(body === undefined || body === null, 'OPTIONS body must be empty');
  });

  await test('Invalid API key returns 401', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?limit=1', {
      headers: { authorization: 'Bearer invalid_key_12345' },
    });
    assert.strictEqual(status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  // Admin key management tests
  await test('Admin can create a new API key', async () => {
    const { status, body } = await invoke(adminCreateKey, 'POST', '/api/admin/api-keys', {
      headers: { 'x-admin-token': adminAuth.token },
      body: { name: 'Test Key', tier: 'hobby', scopes: ['names:read'] },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.key.plaintext.startsWith('pk_punycodex_'), 'key must have correct prefix');
    assert.strictEqual(body.key.tier, 'hobby');
    createdKey = body.key.plaintext;
  });

  await test('Created API key can access /api/v1/names', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?limit=1', {
      headers: { authorization: `Bearer ${createdKey}` },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
  });

  await test('Admin can revoke an API key', async () => {
    // Find the key id from the list
    const list = await invoke(adminListKeys, 'GET', '/api/admin/api-keys', {
      headers: { 'x-admin-token': adminAuth.token },
    });
    const keyRow = list.body.keys.find((k) => k.name === 'Test Key');
    assert.ok(keyRow, 'created key must appear in list');

    const { status, body } = await invoke(
      adminRevokeKey,
      'POST',
      `/api/admin/api-keys/${keyRow.id}/revoke`,
      {
        headers: { 'x-admin-token': adminAuth.token },
        params: { id: String(keyRow.id) },
      }
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.key.isRevoked, true);
  });

  await test('Revoked API key is rejected', async () => {
    const { status, body } = await invoke(namesList, 'GET', '/api/v1/names?limit=1', {
      headers: { authorization: `Bearer ${createdKey}` },
    });
    assert.strictEqual(status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  await test('Non-admin cannot access key management', async () => {
    const { status, body } = await invoke(adminListKeys, 'GET', '/api/admin/api-keys', {
      headers: { 'x-admin-token': 'not-a-real-admin-token' },
    });
    assert.strictEqual(status, 401);
    assert.ok(body.error, 'must return error');
  });

  await test('Admin can list API keys', async () => {
    const { status, body } = await invoke(adminListKeys, 'GET', '/api/admin/api-keys', {
      headers: { 'x-admin-token': adminAuth.token },
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.keys), 'must return keys array');
    assert.ok(body.stats, 'must return stats');
    assert.ok(
      body.keys.every((k) => !k.keyHash),
      'must never expose key hash'
    );
  });

  await test('GET /api/v1/authenticity/check classifies canonical term', async () => {
    const { status, body } = await invoke(
      authenticityCheck,
      'GET',
      '/api/v1/authenticity/check?input=Ze%C3%BAs&type=term'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.verdict, 'canonical');
  });

  await test('GET /api/v1/authenticity/check detects homograph spoof', async () => {
    const { status, body } = await invoke(
      authenticityCheck,
      'GET',
      '/api/v1/authenticity/check?input=%D0%B0res.com&type=domain'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(
      ['homograph-spoof', 'mixed-script-spoof', 'lookalike-domain'].includes(body.data.verdict)
    );
  });

  await test('GET /api/v1/authenticity/check handles URLs', async () => {
    const { status, body } = await invoke(
      authenticityCheck,
      'GET',
      '/api/v1/authenticity/check?input=https%3A%2F%2Fzeus.example.com%2Fpath&type=url'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.parts, 'URL classification must include parts');
  });

  await test('POST /api/v1/authenticity/check/batch classifies multiple inputs', async () => {
    const { status, body } = await invoke(
      authenticityBatch,
      'POST',
      '/api/v1/authenticity/check/batch',
      {
        body: { inputs: ['Zeus', 'ares.com', 'https://example.com'], type: 'auto' },
      }
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.length, 3);
  });

  await test('POST /api/v1/authenticity/report records a threat report', async () => {
    const { status, body } = await invoke(
      authenticityReport,
      'POST',
      '/api/v1/authenticity/report',
      {
        body: { input: 'suspicious-zeus.example.com', type: 'domain', comment: 'test report' },
      }
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.reported, true);
    assert.ok(body.data.spoof.id);
  });

  await test('GET /api/v1/policy returns default policy', async () => {
    const { status, body } = await invoke(v1Policy, 'GET', '/api/v1/policy');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.tenantId, 'default');
    assert.ok(body.data.defaultAction);
  });

  await test('POST /api/v1/policy/evaluate returns action and tier', async () => {
    const { status, body } = await invoke(v1PolicyEvaluate, 'POST', '/api/v1/policy/evaluate', {
      body: { input: 'аres.com', type: 'domain', policy: { defaultAction: 'warn' } },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(['block', 'warn'].includes(body.data.action));
    assert.ok(body.data.tier);
  });

  await test('GET /api/v1/appraise returns appraisal envelope', async () => {
    const { status, body } = await invoke(v1Appraise, 'GET', '/api/v1/appraise?q=apóllōn.com');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.appraisal.currency, 'USD');
    assert.ok(Number.isInteger(body.data.appraisal.unicodeValue));
    assert.ok(body.data.appraisal.unicodeValue >= 0);
    assert.strictEqual(body.data.lexiconMatch?.id, 'apollon');
  });

  await test('POST /api/v1/appraise/batch appraises multiple domains', async () => {
    const { status, body } = await invoke(v1AppraiseBatch, 'POST', '/api/v1/appraise/batch', {
      body: { domains: ['zeus.com', 'apóllōn.com', 'аррӏе.com'] },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.length, 3);
    const homograph = body.data.find((d) => d.safety.tier === 'suspicious');
    assert.ok(homograph, 'batch should flag a homograph');
  });

  await test('GET /api/v1/names/:id/similarities returns cross-cultural edges', async () => {
    const { status, body } = await invoke(
      nameSimilarities,
      'GET',
      '/api/v1/names/zeus/similarities',
      { params: { id: 'zeus' } }
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(body.data.count >= 0, 'count must be present');
    assert.ok(Array.isArray(body.data.items), 'items must be an array');
  });

  await test('GET /api/v1/names/:id/graph returns ego-network payload', async () => {
    const { status, body } = await invoke(nameGraph, 'GET', '/api/v1/names/zeus/graph', {
      params: { id: 'zeus' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(Array.isArray(body.data.nodes), 'nodes must be an array');
    assert.ok(Array.isArray(body.data.edges), 'edges must be an array');
    assert.ok(
      body.data.nodes.some((n) => n.id === 'zeus'),
      'graph must include center node'
    );
  });

  await test('GET /api/v1/similarities/relationships lists relationship types', async () => {
    const { status, body } = await invoke(
      similaritiesRelationships,
      'GET',
      '/api/v1/similarities/relationships'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Number.isInteger(body.data.count), 'must include count');
    assert.ok(Array.isArray(body.data.items), 'items must be an array');
    assert.ok(body.data.items.length > 0, 'must have at least one relationship type');
  });

  await test('GET /api/v1/similarities returns full similarity graph', async () => {
    const { status, body } = await invoke(similarities, 'GET', '/api/v1/similarities');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data.nodes), 'must have nodes array');
    assert.ok(Array.isArray(body.data.edges), 'must have edges array');
    assert.ok(body.data.meta, 'must have meta object');
    assert.ok(
      body.data.meta.relationships && body.data.meta.relationships.length > 0,
      'must list relationships'
    );
    assert.ok(
      body.data.nodes.some((n) => n.id === 'zeus'),
      'graph must include zeus node'
    );
  });

  await test('GET /api/v1/names/:id includes similaritiesCount', async () => {
    const { status, body } = await invoke(nameDetail, 'GET', '/api/v1/names/zeus', {
      params: { id: 'zeus' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(
      Number.isInteger(body.data.similaritiesCount),
      'must include integer similaritiesCount'
    );
    assert.ok(body.data.similaritiesCount >= 0, 'similaritiesCount must be non-negative');
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
