/**
 * PÚNYCODEX — Link Checker
 * Scans all HTML files for broken internal links.
 * Run: node test/links.js
 */

const fs = require('fs');
const path = require('path');

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
            if (['node_modules','.git','.kimi','assets','branding','website','android','.backup','.vercel'].includes(entry.name)) continue;
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
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) {
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

    const exists = fs.existsSync(target);
    return { internal: true, exists, target };
}

HTML_FILES.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(ROOT, file);

    const hrefMatches = content.matchAll(/href="([^"]+)"/g);
    for (const match of hrefMatches) {
        const href = match[1];
        if (href.startsWith('about:')) continue; // Browser-internal URLs
        if (href.includes('${')) continue; // JS template literal placeholders
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
    issues.forEach(issue => {
        console.log(`  ${C.red}✗${C.reset} ${C.dim}${issue.file}${C.reset} → ${issue.href}`);
        console.log(`    ${C.dim}Expected:${C.reset} ${path.relative(ROOT, issue.target)}`);
    });
    process.exit(1);
} else {
    console.log(`  ${C.green}✓ All ${checked} links valid${C.reset}`);
    process.exit(0);
}
