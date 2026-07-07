#!/usr/bin/env node
/**
 * Replace mobile menus on main marketing pages with the canonical full menu.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'index.html',
  'about/index.html',
  'contact/index.html',
  'privacy/index.html',
  'codex/index.html',
  'store/index.html',
  'type/index.html',
  'pantheon/index.html',
  'tiers/index.html',
  'appraise/index.html',
  '404.html',
];

const ROOT = path.resolve(__dirname, '..');

const MENU = `    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
        <a href="/pantheon/">Pantheon</a>
        <a href="/realms/">Realms</a>
        <a href="/lexicon/">Lexicon</a>
        <a href="/tiers/">Tier System</a>
        <a href="/type/">Type</a>
        <a href="/search.html">Search</a>
        <a href="/codex/">Codex</a>
        <a href="/api/v1/docs/">API</a>
        <a href="/appraise/">Appraise</a>
        <a href="/store/">Store</a>
        <a href="/about/">About</a>
        <a href="/contact/">Contact</a>
    </div>`;

function main() {
  for (const rel of FILES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    const regex = /(?:<!-- Mobile Menu -->\s*)?<div class="mobile-menu" id="mobile-menu">[\s\S]*?<\/div>/;
    if (!regex.test(content)) {
      console.log(`- ${rel} no mobile menu found`);
      continue;
    }
    content = content.replace(regex, MENU);
    fs.writeFileSync(file, content);
    console.log(`✓ ${rel}`);
  }
}

main();
