/**
 * Regression test: internal API URLs referenced in fetch/href/data attributes
 * must use a trailing slash. Vercel's trailingSlash:true emits a 308 redirect
 * for bare /api/v1/foo paths, which breaks CORS preflight and fetch clients that
 * do not follow redirects.
 */
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.backup', '.vercel', 'api', 'test', '__tests__'].includes(entry.name)) {
        continue;
      }
      walk(full, files);
    } else if (['.js', '.html', '.ts'].includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const EXCLUDED_FILES = new Set([
  path.join(ROOT, 'platform', 'server.js'),
]);

// Match a /api/ URL that does NOT end with a slash and is followed by
// a query string, quote, comma, closing paren, or end of line.
const BARE_API_URL = /(\/api\/[a-zA-Z0-9_\-./]+[^\s?"'`',)>/])(\?|["'`'`,)>]|$)/;

// Match require()/import() paths so we don't confuse them with API calls.
const REQUIRE_OR_IMPORT = /(require|import)\s*\(\s*['"]/;

test('frontend API references use trailing slash', () => {
  const files = walk(ROOT).filter((fp) => {
    if (EXCLUDED_FILES.has(fp)) return false;
    if (fp.startsWith(path.join(ROOT, 'api') + path.sep)) return false;
    return true;
  });

  const bad = [];
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('/api/')) continue;
      // Only care about runtime URLs in fetch, href, window.open, or data attributes.
      if (!line.includes('fetch(') && !line.includes('href=') && !line.includes('window.open(') && !line.includes('data-api-endpoint')) {
        continue;
      }
      if (BARE_API_URL.test(line)) {
        bad.push(`${rel}:${i + 1}: ${line.trim()}`);
      }
    }
  }

  assert.strictEqual(bad.length, 0, `Found API references without trailing slash:\n${bad.join('\n')}`);
});
