/**
 * PuniCodex — k6 load test for the Authenticity Shield.
 *
 * Run with:
 *   k6 run test/load/k6-authenticity.js
 *
 * Targets:
 *   - p50 latency < 1 ms
 *   - p99 latency < 5 ms
 *   - error rate < 0.1%
 *   - throughput 1000 RPS sustained
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://punicodex.com';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<1', 'p(99)<5'],
    http_req_failed: ['rate<0.001'],
  },
};

const inputs = [
  'zeus',
  'ареs.com',
  'Apollōn',
  'páypal.com',
  'https://example.com/path',
  'nike.com',
  'n1ke.com',
];

export default function () {
  const input = inputs[Math.floor(Math.random() * inputs.length)];
  const type = input.startsWith('http') ? 'url' : input.includes('.') ? 'domain' : 'term';
  const res = http.get(
    `${BASE_URL}/api/v2/authenticity/check?input=${encodeURIComponent(input)}&type=${type}`
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has verdict': (r) => JSON.parse(r.body).data?.verdict !== undefined,
  });
}
