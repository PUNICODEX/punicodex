#!/usr/bin/env node
/**
 * Inject /js/px-core.js before /js/main.js or /js/temple-base.js
 * in all HTML files, if not already present.
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');
const PX_CORE_TAG = '<script src="/js/px-core.js?v=perf8"></script>';

function findHtmlFiles() {
  return globSync('**/*.html', {
    cwd: ROOT,
    ignore: ['node_modules/**', 'platform/**', 'android/**', 'extension*/**'],
  }).map((p) => path.join(ROOT, p));
}

function needsInjection(content) {
  const hasMain = /src="\/js\/main\.js/.test(content);
  const hasTemple = /src="\/js\/temple-base\.js/.test(content);
  const hasCore = /src="\/js\/px-core\.js/.test(content);
  return (hasMain || hasTemple) && !hasCore;
}

function inject(content) {
  // Insert before the first main.js or temple-base.js script tag.
  const regex = /(<script[^>]*src="\/js\/(?:main|temple-base)\.js[^"]*"[^>]*><\/script>)/;
  return content.replace(regex, `${PX_CORE_TAG}\n    $1`);
}

function main() {
  const files = findHtmlFiles();
  let updated = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (!needsInjection(content)) continue;
    const newContent = inject(content);
    fs.writeFileSync(file, newContent);
    console.log('✓', path.relative(ROOT, file));
    updated++;
  }
  console.log(`\nInjected px-core.js into ${updated} HTML files.`);
}

main();
