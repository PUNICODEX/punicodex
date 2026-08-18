'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// The Neon initializer's COLUMN_DRIFT backfill must cover every column that
// operational analytics queries reference but only SQLite migrations add.
// Regression guard for the "My placements: Internal server error" incident.
test('COLUMN_DRIFT covers analytics_events columns used by tenant analytics', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'platform', 'db', 'init-operational-postgres.js'),
    'utf8'
  );
  const required = [
    ['analytics_events', 'slot_slug'],
    ['analytics_events', 'visible_seconds'],
    ['analytics_events', 'visible_percent'],
  ];
  for (const [table, column] of required) {
    const needle = `table: '${table}', column: '${column}'`;
    assert.ok(
      src.includes(needle),
      `init-operational-postgres.js COLUMN_DRIFT is missing { ${needle} }`
    );
  }
});
