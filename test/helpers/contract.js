/**
 * Shared contract assertions for API responses.
 */

const assert = require('node:assert');

function assertEnvelope(body, expectedVersion) {
  assert.strictEqual(typeof body, 'object', 'Response body must be an object');
  assert.strictEqual(body.success, true, `Expected success=true, got ${body.success}`);
  assert.ok(body.data !== undefined, 'Response must contain data');
  assert.ok(body.meta, 'Response must contain meta');
  assert.strictEqual(body.meta.version, expectedVersion, `API version must be ${expectedVersion}`);
  assert.ok(body.meta.requestId, 'Response must contain requestId');
  assert.ok(body.meta.timestamp, 'Response must contain timestamp');
}

function assertV1Envelope(body) {
  assertEnvelope(body, 'v1');
}

function assertV2Envelope(body) {
  assertEnvelope(body, 'v2');
}

function assertPagination(body) {
  assertV2Envelope(body);
  assert.ok(body.meta.pagination, 'Pagination meta must be present');
  assert.ok(typeof body.meta.pagination.total === 'number');
  assert.ok(typeof body.meta.pagination.limit === 'number');
  assert.ok(typeof body.meta.pagination.offset === 'number');
  assert.ok(body.links, 'Pagination links must be present');
  assert.ok(body.links.self, 'Pagination self link must be present');
}

function assertError(body, expectedCode, expectedStatus) {
  assert.strictEqual(typeof body, 'object', 'Error body must be an object');
  assert.strictEqual(body.success, false);
  assert.ok(body.error, 'Error object must be present');
  assert.strictEqual(body.error.code, expectedCode);
  assert.ok(body.meta, 'Error must contain meta');
  assert.ok(body.meta.requestId);
  if (expectedStatus !== undefined) {
    assert.strictEqual(body.status, expectedStatus);
  }
}

module.exports = {
  assertEnvelope,
  assertV1Envelope,
  assertV2Envelope,
  assertPagination,
  assertError,
};
