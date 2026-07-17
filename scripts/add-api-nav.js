/**
 * Add the API docs link to global navigation on existing pages.
 *
 * Targets:
 * - Top-level pages (root *.html and directory index.html) with the standard global nav
 * - Base temple pages (sites/{id}/index.html)
 *
 * Skips pages that already contain an API link.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function hasApiLink(html, href) {
  return html.includes(`href="${href}"`);
}

function updateTopLevelPage(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const apiHref = '/api/v1/docs/';
  if (hasApiLink(html, apiHref)) return false;

  let changed = false;

  // Desktop nav: insert API before Store
  html = html.replace(
    /(<div class="nav-links">[\s\S]*?<a href="\/codex\/" class="nav-link">Codex<\/a>)[\s\S]*?(<a href="\/store\/" class="nav-link">Store<\/a>)/,
    (match, before, after) => {
      changed = true;
      return `${before}\n                <a href="${apiHref}" class="nav-link">API</a>\n                ${after}`;
    }
  );

  // Mobile menu: insert API before Store
  html = html.replace(
    /(<div class="mobile-menu" id="mobile-menu">[\s\S]*?<a href="\/codex\/">Codex<\/a>)[\s\S]*?(<a href="\/store\/">Store<\/a>)/,
    (match, before, after) => {
      changed = true;
      return `${before}\n    <a href="${apiHref}">API</a>\n        ${after}`;
    }
  );

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  return changed;
}

function updateBaseTemple(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const apiHref = 'https://punicodex.com/api/v1/docs/';
  if (hasApiLink(html, apiHref)) return false;

  // Base temple nav ends with Tiers link
  const pattern = /(<div class="nav-links">[\s\S]*?<a href="https:\/\/punicodex\.com\/tiers\/" class="nav-link">Tiers<\/a>)(\s*<\/div>)/;
  if (!pattern.test(html)) return false;

  html = html.replace(pattern, (match, before, closing) => {
    return `${before}\n                <a href="${apiHref}" class="nav-link">API</a>${closing}`;
  });

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

function walk(dir, pattern, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, pattern, callback);
    } else if (entry.isFile() && entry.name.endsWith('.html') && pattern.test(fullPath.split(path.sep).join('/'))) {
      callback(fullPath);
    }
  }
}

function main() {
  let topLevelChanged = 0;
  let baseTempleChanged = 0;

  // Top-level pages at root and one level deep (excluding sites/ and node_modules)
  const topLevelDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !['.git', '.venv_hieropy', '.vercel', 'node_modules', 'sites', 'extension', 'mobile', 'platform', 'scripts', 'templates', 'test', 'type', 'android', 'branding', 'extended flagship materials'].includes(e.name))
    .map((e) => path.join(ROOT, e.name));

  const topLevelFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => path.join(ROOT, e.name));

  const topLevelTargets = [...topLevelFiles, ...topLevelDirs.flatMap((dir) => {
    const indexPath = path.join(dir, 'index.html');
    return fs.existsSync(indexPath) ? [indexPath] : [];
  })];

  for (const filePath of topLevelTargets) {
    if (updateTopLevelPage(filePath)) {
      topLevelChanged++;
      console.log(`Updated top-level page: ${path.relative(ROOT, filePath)}`);
    }
  }

  // Base temples
  const sitesDir = path.join(ROOT, 'sites');
  if (fs.existsSync(sitesDir)) {
    walk(sitesDir, /sites\/[^/]+\/index\.html$/, (filePath) => {
      if (updateBaseTemple(filePath)) {
        baseTempleChanged++;
        console.log(`Updated base temple: ${path.relative(ROOT, filePath)}`);
      }
    });
  }

  console.log(`\nDone. Updated ${topLevelChanged} top-level page(s) and ${baseTempleChanged} base temple(s).`);
}

main();
