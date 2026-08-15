#!/usr/bin/env node
/**
 * Transient file-write retry for Windows (AV/indexer locks surface as
 * EPERM/EBUSY/UNKNOWN on plain writeFileSync, intermittently, during full
 * generates). Same policy as the other generators: a few short backoffs,
 * then give up honestly.
 */

const fs = require('node:fs');

const TRANSIENT = new Set(['EPERM', 'EBUSY', 'EAGAIN', 'UNKNOWN']);

function writeFileWithRetry(filePath, data, encoding = 'utf8', retries = 15, delay = 150) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.writeFileSync(filePath, data, encoding);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !TRANSIENT.has(err.code)) throw err;
      // Linear backoff up to ~18s total: the Windows indexer/AV can hold a
      // freshly-written file for several seconds during a full generate.
      const ms = delay * attempt;
      console.warn(`  transient write error for ${filePath} (${err.code}), retrying in ${ms}ms...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
  }
  throw lastErr;
}

module.exports = { writeFileWithRetry };
