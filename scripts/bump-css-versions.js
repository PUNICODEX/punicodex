#!/usr/bin/env node
/**
 * One-off cache-bust bump for CSS files changed in this cycle.
 * Replaces every ?v= pin for the listed assets across all tracked HTML files.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

const BUMPS = [
  { asset: '/css/main.css', from: '?v=perf23', to: '?v=perf24' },
  { asset: '/css/temple-base.css', from: '?v=perf17', to: '?v=perf22' },
  { asset: '/css/temple-base.css', from: '?v=perf20', to: '?v=perf22' },
  { asset: '/css/temple-base.css', from: '?v=perf21', to: '?v=perf22' },
  { asset: '/css/footer.css', from: '?v=1', to: '?v=2' },
];

function main() {
  const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

  let total = 0;
  for (const file of files) {
    const abs = path.join(ROOT, file);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    let out = text;
    for (const { asset, from, to } of BUMPS) {
      const pattern = `${asset}${from}`;
      out = out.split(pattern).join(`${asset}${to}`);
    }
    if (out !== text) {
      fs.writeFileSync(abs, out, 'utf8');
      total++;
    }
  }
  console.log(`CSS version bumps: ${total} file(s) updated.`);
}

main();
