const assert = require('node:assert/strict');
const { after, test } = require('node:test');

const redisPath = require.resolve('../platform/api/redis-client.js');
const analyticsPath = require.resolve('../platform/api/site-analytics.js');
const temples = ['zeus', 'hekate', 'nike', 'hermes'];
let pipelineCalls = 0;
let scanCalls = 0;

function resultFor(operation) {
  const { key, name } = operation;
  if (key.includes(':views:')) return [null, { human: '3', bot: '1' }];
  if (key.includes(':devices:')) return [null, { mobile: '2', tablet: '0', desktop: '1' }];
  if (key.includes(':bots:')) return [null, { scraper: '1' }];
  if (key.includes(':refs:')) return [null, { 'example.com': '2' }];
  if (key.includes(':pathviews:')) return [null, { '/zeus/': '3' }];
  if (key.includes(':eng:')) {
    return [null, { engagements: '2', totalMs: '1000', totalScroll: '120' }];
  }
  if (name === 'scard') {
    const parts = key.split(':');
    return [null, /^\d{4}-\d{2}-\d{2}$/.test(parts.at(-1)) ? 4 : 2];
  }
  throw new Error(`Unexpected Redis operation: ${name} ${key}`);
}

const client = {
  async scan(_cursor, _match, pattern) {
    scanCalls++;
    const kind = pattern.includes(':eng:') ? 'eng' : 'views';
    return ['0', temples.map((id) => `punicodex:analytics:${kind}:2026-01-01:${id}`)];
  },
  async hgetall() {
    throw new Error('serial hgetall must not be used for rolling analytics');
  },
  async scard() {
    throw new Error('serial scard must not be used for rolling analytics');
  },
  pipeline() {
    const operations = [];
    const pipeline = {
      hgetall(key) {
        operations.push({ name: 'hgetall', key });
        return pipeline;
      },
      scard(key) {
        operations.push({ name: 'scard', key });
        return pipeline;
      },
      async exec() {
        pipelineCalls++;
        return operations.map(resultFor);
      },
    };
    return pipeline;
  },
};

require.cache[redisPath] = {
  id: redisPath,
  filename: redisPath,
  loaded: true,
  exports: {
    getRedisClient: () => client,
    isRedisEnabled: () => true,
    disableRedis: () => {
      throw new Error('the mock Redis reader must not fall back to SQL');
    },
  },
};
delete require.cache[analyticsPath];
const analytics = require(analyticsPath);

after(() => {
  delete require.cache[redisPath];
  delete require.cache[analyticsPath];
});

test('120-day rolling analytics pipelines every day and preserves aggregate results', async () => {
  const [overview, engagement] = await Promise.all([
    analytics.getOverview({ days: 120 }),
    analytics.getEngagementStats({ days: 120 }),
  ]);

  assert.strictEqual(scanCalls, 240);
  assert.strictEqual(pipelineCalls, 240);
  assert.strictEqual(overview.periodDays, 120);
  assert.strictEqual(overview.byDay.length, 120);
  assert.deepStrictEqual(overview.totals, {
    humanViews: 1440,
    botViews: 480,
    uniqueSessions: 480,
    botPct: 25,
  });
  assert.strictEqual(overview.topTemples.length, 4);
  for (const temple of overview.topTemples) {
    assert.strictEqual(temple.human, 360);
    assert.strictEqual(temple.bot, 120);
    assert.strictEqual(temple.uniques, 240);
  }
  assert.deepStrictEqual(overview.devices, { mobile: 960, tablet: 0, desktop: 480 });
  assert.deepStrictEqual(overview.topReferrers, [{ referrer: 'example.com', count: 960 }]);
  assert.deepStrictEqual(overview.topPaths, [{ path: '/zeus/', views: 360 }]);

  assert.strictEqual(engagement.engagements, 960);
  assert.strictEqual(engagement.avgVisibleMs, 500);
  assert.strictEqual(engagement.avgScrollPct, 60);
  assert.strictEqual(engagement.topEngaged.length, 4);
  for (const temple of engagement.topEngaged) {
    assert.strictEqual(temple.engagements, 240);
    assert.strictEqual(temple.avgVisibleMs, 500);
  }
});
