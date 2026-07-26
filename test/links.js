/**
 * PuniCodex — Link Checker
 * Scans all HTML files for broken internal links.
 * Run: node test/links.js
 */

const fs = require('node:fs');
const path = require('node:path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = [];

function collectHtml(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        [
          'node_modules',
          '.git',
          '.kimi',
          'assets',
          'branding',
          'website',
          'android',
          '.backup',
          '.vercel',
          'templates',
          // External brand-kit source material (untracked, read-only, never
          // shipped) — its kit-internal snippet links are not site links.
          'Kimi_Agent_punicodex扩展',
        ].includes(entry.name)
      )
        continue;
      // Sacred-texts source audit trails (platform/texts/{id}/src/) hold raw
      // third-party downloads, not site pages — their relative links point at
      // the source site, not this repo.
      if (entry.name === 'src' && dir.includes(`platform${path.sep}texts`)) continue;
      collectHtml(fullPath);
    } else if (entry.name.endsWith('.html')) {
      HTML_FILES.push(fullPath);
    }
  }
}

collectHtml(ROOT);

let checked = 0;
let broken = 0;
const issues = [];

function resolveLink(fromFile, href) {
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('data:')
  ) {
    return { external: true };
  }
  if (href.startsWith('#')) {
    return { internal: true, exists: true };
  }

  // Strip query strings and hashes for file existence check
  const cleanHref = href.split('?')[0].split('#')[0];

  const fromDir = path.dirname(fromFile);
  let resolved;
  if (cleanHref.startsWith('/')) {
    resolved = path.join(ROOT, cleanHref.slice(1));
  } else {
    resolved = path.resolve(fromDir, cleanHref);
  }

  let target = resolved;
  if (!path.extname(target) || target.endsWith('/')) {
    target = path.join(target, 'index.html');
  }

  // API routes are serverless functions, not static HTML files
  const isApiRoute = cleanHref.startsWith('/api/') && isKnownApiRoute(cleanHref);

  // Public routes are served from platform/public/ (Vercel public directory).
  const publicTarget = path.join(ROOT, 'platform', 'public', cleanHref.slice(1));
  let publicFileTarget = publicTarget;
  if (!path.extname(publicFileTarget) || publicFileTarget.endsWith('/')) {
    publicFileTarget = path.join(publicFileTarget, 'index.html');
  }
  const isPublicRoute = cleanHref.startsWith('/') && fs.existsSync(publicFileTarget);

  const exists = isApiRoute || isPublicRoute || fs.existsSync(target);
  return { internal: true, exists, target };
}

function isKnownApiRoute(cleanHref) {
  const routePath = path.join(ROOT, cleanHref.slice(1));
  const exactJs = `${routePath}.js`;
  const indexJs = path.join(routePath, 'index.js');
  return fs.existsSync(exactJs) || fs.existsSync(indexJs);
}

HTML_FILES.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(ROOT, file);

  const hrefMatches = content.matchAll(/href="([^"]+)"/g);
  for (const match of hrefMatches) {
    const href = match[1];
    if (href.startsWith('about:')) continue; // Browser-internal URLs
    if (href.includes('${')) continue; // JS template literal placeholders
    if (/\+\s*['"]|["']\s*\+/.test(href)) continue; // JS string concatenation fragments
    checked++;
    const result = resolveLink(file, href);
    if (result.internal && !result.exists) {
      broken++;
      issues.push({ file: relativeFile, href, target: result.target });
    }
  }

  const srcMatches = content.matchAll(/src="([^"]+)"/g);
  for (const match of srcMatches) {
    const src = match[1];
    if (src.startsWith('data:')) continue;
    if (src.startsWith('about:')) continue;
    if (src.includes('${')) continue;
    if (/\+\s*['"]|["']\s*\+/.test(src)) continue; // JS string concatenation fragments
    checked++;
    const result = resolveLink(file, src);
    if (result.internal && !result.exists) {
      broken++;
      issues.push({ file: relativeFile, href: src, target: result.target });
    }
  }
});

console.log(`${C.cyan}▸ Link Check${C.reset}`);
console.log(`  ${C.dim}Files scanned:${C.reset} ${HTML_FILES.length}`);
console.log(`  ${C.dim}Links checked:${C.reset} ${checked}`);

if (broken > 0) {
  console.log(`  ${C.red}Broken links: ${broken}${C.reset}\n`);
  issues.forEach((issue) => {
    console.log(`  ${C.red}✗${C.reset} ${C.dim}${issue.file}${C.reset} → ${issue.href}`);
    console.log(`    ${C.dim}Expected:${C.reset} ${path.relative(ROOT, issue.target)}`);
  });
  process.exit(1);
} else {
  console.log(`  ${C.green}✓ All ${checked} links valid${C.reset}`);
  process.exit(0);
}
