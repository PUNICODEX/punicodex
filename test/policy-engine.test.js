/**
 * PuniCodex — Policy Engine Tests
 */

const assert = require('node:assert');
const {
  evaluatePolicy,
  normalizePolicy,
  matchesList,
  DEFAULT_POLICY,
} = require('../platform/api/policy-engine.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nPolicy Engine: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('blocklist takes precedence over severity action', () => {
  const result = evaluatePolicy(
    { verdict: 'homograph-spoof', severity: 'low', input: 'evil.example.com' },
    {
      policy: {
        defaultAction: 'allow',
        severityActions: { low: 'allow' },
        blocklist: ['evil.example.com'],
      },
    }
  );
  assert.strictEqual(result.action, 'block');
  assert.strictEqual(result.reason, 'blocklist');
});

test('allowlist takes precedence over severity action', () => {
  const result = evaluatePolicy(
    { verdict: 'homograph-spoof', severity: 'high', input: 'safe.example.com' },
    {
      policy: {
        severityActions: { high: 'warn' },
        allowlist: ['safe.example.com'],
      },
    }
  );
  assert.strictEqual(result.action, 'allow');
  assert.strictEqual(result.reason, 'allowlist');
});

test('blocklist takes precedence over allowlist', () => {
  const result = evaluatePolicy(
    { verdict: 'unsafe', severity: 'critical', input: 'bad.example.com' },
    {
      policy: {
        allowlist: ['example.com'],
        blocklist: ['bad.example.com'],
      },
    }
  );
  assert.strictEqual(result.action, 'block');
  assert.strictEqual(result.reason, 'blocklist');
});

test('severity action is applied when no list matches', () => {
  const result = evaluatePolicy(
    { verdict: 'suspicious', severity: 'high', input: 'weird.example.com' },
    {
      policy: {
        defaultAction: 'allow',
        severityActions: { high: 'warn' },
      },
    }
  );
  assert.strictEqual(result.action, 'warn');
  assert.strictEqual(result.reason, 'severity');
});

test('default action is used when severity has no mapping', () => {
  const result = evaluatePolicy(
    { verdict: 'unknown', severity: 'medium', input: 'unknown.example.com' },
    {
      policy: {
        defaultAction: 'log',
        severityActions: { none: 'allow', low: 'allow' },
      },
    }
  );
  assert.strictEqual(result.action, 'log');
  assert.strictEqual(result.reason, 'default');
});

test('glob patterns match subdomains', () => {
  const result = evaluatePolicy(
    { verdict: 'lookalike-domain', severity: 'high', input: 'phish.example.com' },
    {
      policy: {
        defaultAction: 'allow',
        blocklist: [{ type: 'glob', value: '*.example.com' }],
      },
    }
  );
  assert.strictEqual(result.action, 'block');
  assert.strictEqual(result.reason, 'blocklist');
});

test('regex patterns match anywhere in input', () => {
  const result = evaluatePolicy(
    { verdict: 'unsafe', severity: 'critical', input: 'https://evil-paypal.example/login' },
    {
      policy: {
        blocklist: [{ type: 'regex', value: 'paypal' }],
      },
    }
  );
  assert.strictEqual(result.action, 'block');
  assert.strictEqual(result.reason, 'blocklist');
});

test('enterprise policy preserves tenantId and uiTheme', () => {
  const result = evaluatePolicy(
    { verdict: 'styled', severity: 'low', input: 'branded.example.com' },
    {
      policy: {
        tenantId: 'acme-corp',
        defaultAction: 'log',
        severityActions: { low: 'log' },
        uiTheme: 'interstitial',
        logRetentionDays: 365,
      },
    }
  );
  assert.strictEqual(result.action, 'log');
  assert.strictEqual(result.reason, 'severity');
  assert.strictEqual(result.uiTheme, 'interstitial');
  assert.strictEqual(result.policyId, 'acme-corp:policy');
});

test('siemPayload is included when siemWebhook is configured', () => {
  const result = evaluatePolicy(
    { verdict: 'deceptive', severity: 'critical', input: 'spoof.example.com', identityId: 'apple' },
    {
      policy: {
        defaultAction: 'warn',
        siemWebhook: 'https://siem.example/webhook',
      },
    }
  );
  assert.ok(result.siemPayload);
  assert.strictEqual(result.siemPayload.tenantId, 'default');
  assert.strictEqual(result.siemPayload.action, 'block');
  assert.strictEqual(result.siemPayload.identityId, 'apple');
});

test('matchesList supports both exact strings and pattern objects', () => {
  assert.strictEqual(matchesList('safe.com', ['safe.com']), true);
  assert.strictEqual(matchesList('safe.com', [{ type: 'exact', value: 'safe.com' }]), true);
  assert.strictEqual(matchesList('sub.evil.com', [{ type: 'glob', value: '*.evil.com' }]), true);
  assert.strictEqual(matchesList('https://bad.com', [{ type: 'exact', value: 'bad.com' }]), true);
  assert.strictEqual(matchesList('good.com', [{ type: 'regex', value: '^bad' }]), false);
});

test('normalizePolicy validates invalid actions and themes', () => {
  const policy = normalizePolicy({
    defaultAction: 'invalid',
    uiTheme: 'invalid',
    severityActions: { none: 'invalid', critical: 'block', unknown: 'block' },
  });
  assert.strictEqual(policy.defaultAction, DEFAULT_POLICY.defaultAction);
  assert.strictEqual(policy.uiTheme, DEFAULT_POLICY.uiTheme);
  assert.ok(!('none' in policy.severityActions));
  assert.strictEqual(policy.severityActions.critical, 'block');
  assert.ok(!('unknown' in policy.severityActions));
});

run();
