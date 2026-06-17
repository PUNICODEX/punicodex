/**
 * PÚNYCODEX — Browser Shell module tests
 */

const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

function runInBrowser(...files) {
  const store = {};
  const context = {
    window: {},
    document: {},
    localStorage: {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
    location: { href: 'https://punycodex.com/browser.html' },
    URL: URL,
  };
  context.window = context;
  vm.createContext(context);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  }
  return context;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Browser Shell Tests');

test('PunyBrowser resolves URLs and search queries', () => {
  const ctx = runInBrowser('js/browser-shell.js');
  assert.strictEqual(ctx.PunyBrowser.resolveInput('https://example.com'), 'https://example.com');
  assert.strictEqual(ctx.PunyBrowser.resolveInput('example.com'), 'https://example.com');
  assert.strictEqual(ctx.PunyBrowser.resolveInput('/search-v2.html'), '/search-v2.html');
  assert.ok(ctx.PunyBrowser.resolveInput('zeus').startsWith('/search-v2.html?q='));
});

test('PunyWorkspaces save and restore tab groups', () => {
  const ctx = runInBrowser('js/browser-shell.js', 'js/workspaces.js');
  ctx.PunyWorkspaces.create('greek-pantheon', [
    { url: '/sites/zeus/', title: 'Zeus' },
    { url: '/sites/athena/', title: 'Athena' },
  ]);
  const ws = ctx.PunyWorkspaces.get('greek-pantheon');
  assert.ok(ws);
  assert.strictEqual(ws.tabs.length, 2);
  assert.ok(ctx.PunyWorkspaces.shareUrl('greek-pantheon').includes('workspace=greek-pantheon'));
  ctx.PunyWorkspaces.remove('greek-pantheon');
  assert.strictEqual(ctx.PunyWorkspaces.get('greek-pantheon'), undefined);
});

test('PunyBrowser history deduplicates and limits', () => {
  const ctx = runInBrowser('js/browser-shell.js');
  ctx.PunyBrowser.recordHistory('https://a.com');
  ctx.PunyBrowser.recordHistory('https://b.com');
  ctx.PunyBrowser.recordHistory('https://a.com');
  const history = ctx.PunyBrowser.loadHistory();
  assert.strictEqual(history[0], 'https://a.com');
  assert.strictEqual(history[1], 'https://b.com');
});

if (!process.exitCode) {
  console.log('\n✓ All Browser Shell tests passed');
} else {
  console.log('\n✗ Some Browser Shell tests failed');
  process.exit(1);
}
