#!/usr/bin/env node
/**
 * Transient file-write retry for Windows (AV/indexer locks surface as
 * EPERM/EBUSY/UNKNOWN on plain writeFileSync, intermittently, during full
 * generates). Same policy as the other generators: a few short backoffs,
 * then give up honestly.
 */

const fs = require('node:fs');

const TRANSIENT = new Set(['EPERM', 'EBUSY', 'EAGAIN', 'UNKNOWN']);

function writeFileWithRetry(filePath, data, encoding = 'utf8', retries = 5, delay = 50) {
  // Use temp-file + atomic rename to avoid Windows AV/indexer locks on the
  // target file. This is far more reliable than retrying a direct write.
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, data, encoding);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (err) {
      if (attempt === retries || !TRANSIENT.has(err.code)) {
        try { fs.unlinkSync(tmpPath); } catch {}
        throw err;
      }
      const ms = delay * attempt;
      console.warn(`  transient rename error for ${filePath} (${err.code}), retrying in ${ms}ms...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
  }
}

module.exports = { writeFileWithRetry };
