#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { legacyRootIds } = require('./masters-legacy-root.json');

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const counts = { copied: 0, updated: 0, skipped: 0 };
for (const id of legacyRootIds) {
  for (const kind of ['mascot', 'logomark']) {
    const name = `${id}_${kind}.png`;
    const source = path.join(ROOT, 'sites', id, 'assets', name);
    const target = path.join(ROOT, '.masters', name);
    if (!fs.existsSync(source)) throw new Error(`Legacy masters source missing: ${source}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) {
      fs.copyFileSync(source, target);
      counts.copied++;
    } else if (hash(source) !== hash(target)) {
      fs.copyFileSync(source, target);
      counts.updated++;
    } else {
      counts.skipped++;
    }
    if (hash(source) !== hash(target)) throw new Error(`Legacy masters copy failed: ${name}`);
  }
}

console.log(`Legacy root assets: ${legacyRootIds.length * 2} verified`, counts);
