#!/usr/bin/env node
/**
 * Regenerate all handcrafted flagships listed in js/archetypes-v2.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = new Function(code + '; return ARCHETYPES;')();
const ids = ARCHETYPES.filter((a) => a.built).map((a) => a.id);

let failed = 0;
for (const id of ids) {
  try {
    execSync('node "' + path.join(__dirname, 'create-flagship.js') + '" ' + id, {
      cwd: root,
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('FAILED:', id);
    failed += 1;
  }
}
console.log('Done. Regenerated', ids.length - failed, 'flagships. Failed:', failed);
