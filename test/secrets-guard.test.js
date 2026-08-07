/**
 * Secrets guard
 *
 * Regression guard for the 2026-08 incident where `vercel env pull` output
 * (`.env.vercel`, carrying live Stripe/Resend/admin secrets) was committed
 * and pushed. `.gitignore` covered `.env` and `.env.local` but not the
 * `.env.<name>` shape, so the pull file slipped in.
 *
 * Asserts:
 *   1. No env file other than the committed templates is tracked by git.
 *   2. `.gitignore` carries the `.env.*` blanket rule with the template
 *      exceptions, so future pulls can never be staged again.
 *
 * Run: node test/secrets-guard.test.js
 */

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ALLOWED = new Set(['.env.example', '.env.sample', '.env.template']);

function gitTracked() {
  return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function run() {
  // 1. No tracked env files beyond the templates — at any depth.
  const offenders = gitTracked().filter((f) => {
    const base = path.basename(f);
    return base.startsWith('.env') && !ALLOWED.has(base);
  });
  assert.deepStrictEqual(
    offenders,
    [],
    `env file(s) tracked by git (would leak secrets): ${offenders.join(', ')}`
  );

  // 2. .gitignore must blanket-ignore `.env.*` while keeping the templates.
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.ok(
    gitignore.split('\n').some((l) => l.trim() === '.env.*'),
    '.gitignore missing the blanket `.env.*` rule'
  );
  assert.ok(
    gitignore.split('\n').some((l) => l.trim() === '!.env.example'),
    '.gitignore must keep `!.env.example` so the template stays committed'
  );

  // 3. Sanity: the ignore rule actually works for the incident file shape.
  const check = execFileSync('git', ['check-ignore', '-v', '.env.vercel'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.ok(check.includes('.env.*'), `.env.vercel is not ignored as expected: ${check}`);

  console.log('Secrets guard: 3 passed, 0 failed');
}

run();
