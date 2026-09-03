#!/usr/bin/env node
/**
 * PuniCodex — Git hook installer (runs via `npm prepare` on every install).
 *
 * Installs .git/hooks/pre-push → scripts/prepush-gate.js so the affected-suite
 * gate runs before every push. Idempotent; never overwrites a hook the user
 * customized (backs it up first).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HOOKS = path.join(ROOT, '.git', 'hooks');
const HOOK = path.join(HOOKS, 'pre-push');
const MARKER = 'punicodex-prepush-gate';

const CONTENT = `#!/bin/sh
# ${MARKER} — installed by scripts/install-hooks.js; do not edit here.
# Runs the affected-suite gate before pushing. Bypass: git push --no-verify
exec node "$(git rev-parse --show-toplevel)/scripts/prepush-gate.js"
`;

function main() {
  if (!fs.existsSync(HOOKS)) return; // not a git checkout (e.g. npm pack)
  if (fs.existsSync(HOOK)) {
    const existing = fs.readFileSync(HOOK, 'utf8');
    if (existing.includes(MARKER)) {
      if (existing !== CONTENT) fs.writeFileSync(HOOK, CONTENT, { mode: 0o755 });
      return; // ours already — refreshed if stale
    }
    // Foreign hook: preserve it, chain ours alongside.
    const backup = `${HOOK}.user-backup`;
    if (!fs.existsSync(backup)) fs.copyFileSync(HOOK, backup);
    const chained = `#!/bin/sh\n# ${MARKER} — chained after user hook\n"${backup}" "$@" || exit $?\nexec node "$(git rev-parse --show-toplevel)/scripts/prepush-gate.js"\n`;
    fs.writeFileSync(HOOK, chained, { mode: 0o755 });
    console.log('pre-push: existing hook backed up to pre-push.user-backup, gate chained.');
    return;
  }
  fs.writeFileSync(HOOK, CONTENT, { mode: 0o755 });
  console.log('pre-push gate installed (scripts/prepush-gate.js).');
}

main();
