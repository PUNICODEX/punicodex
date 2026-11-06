const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { HUBS, HUB_ORDER, childrenOf } = require(path.join(ROOT, 'scripts', 'nav-tree.js'));
const { footerHrefs } = require(path.join(ROOT, 'scripts', 'sync-footer.js'));

const menuLinks = new Map();
for (const id of HUB_ORDER) {
  const h = HUBS[id];
  menuLinks.set(h.href, h.label + ' (hub)');
  for (const item of h.items) {
    menuLinks.set(item.href, id + ' -> ' + item.label);
    for (const k of childrenOf(item)) menuLinks.set(k.href, id + ' -> ' + item.label + ' -> ' + k.label);
  }
}
const footerLinks = new Map(footerHrefs().map((h) => [h, 'footer']));

const skip = new Set([
  'node_modules', '.git', 'assets', 'css', 'js', 'data', 'docs', 'scripts', 'platform', 'api',
  'test', 'templates', 'extension', 'extension-v2', 'mobile', 'android', 'sdk', 'store', 'sites',
  '.github', '.vercel', '.masters', '.superpowers', 'extended flagship materials',
  'ascii pantheon 28-08-26', 'audit 21-07-26', 'branding', 'closed testing',
  'Kimi_Agent_Unicode Pantheon Animation Plan',
]);
const pages = new Set(['/']);
function walk(dir, depth) {
  if (depth > 2) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || skip.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (fs.existsSync(path.join(p, 'index.html'))) {
      pages.add('/' + path.relative('.', p).split(path.sep).join('/') + '/');
    }
    walk(p, depth + 1);
  }
}
process.chdir(ROOT);
walk(ROOT, 1);

const neither = [];
const footerOnly = [];
const menuOnly = [];
for (const p of [...pages].sort()) {
  const m = menuLinks.has(p);
  const f = footerLinks.has(p);
  if (!m && !f) neither.push(p);
  else if (!m && f) footerOnly.push(p);
  else if (m && !f) menuOnly.push(p + '   [menu: ' + menuLinks.get(p) + ']');
}
console.log('=== IN NEITHER menu NOR footer (' + neither.length + '):');
neither.forEach((p) => console.log('  ' + p));
console.log('=== FOOTER-ONLY (' + footerOnly.length + '):');
footerOnly.forEach((p) => console.log('  ' + p));
console.log('=== MENU-ONLY (' + menuOnly.length + '):');
menuOnly.forEach((p) => console.log('  ' + p));
