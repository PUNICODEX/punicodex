#!/usr/bin/env node
/**
 * Replace old footer-col footers with canonical footer-column footers
 * on main marketing pages.
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

const FOOTER = `    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="/" class="footer-wordmark">P<span class="accent">U</span>NYCODEX</a>
                    <p class="footer-tagline">Restoring the original names of the gods to the digital realm.</p>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">Explore</h4>
                    <a href="/pantheon/">Pantheon</a>
                    <a href="/realms/">Realms</a>
                    <a href="/lexicon/">Lexicon</a>
                    <a href="/tiers/">Tier System</a>
                    <a href="/type/">Type</a>
                    <a href="/search.html">Search</a>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">Resources</h4>
                    <a href="/codex/">Codex</a>
                    <a href="/api/v1/docs/">API</a>
                    <a href="/appraise/">Appraise</a>
                    <a href="/authenticity/">Authenticity</a>
                    <a href="/oracle.html">Oracle</a>
                </div>
                <div class="footer-column">
                    <h4 class="footer-heading">Connect</h4>
                    <a href="/about/">About</a>
                    <a href="/contact/">Contact</a>
                    <a href="/privacy/">Privacy</a>
                    <a href="/terms/">Terms</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 PuniCodex. All rites reserved.</p>
            </div>
        </div>
    </footer>`;

function main() {
  for (const rel of FILES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      console.log(`✗ ${rel} not found`);
      continue;
    }
    let content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('footer-col')) {
      console.log(`- ${rel} already canonical`);
      continue;
    }
    const regex = /<footer[^>]*>[\s\S]*?<\/footer>/;
    if (!regex.test(content)) {
      console.log(`✗ ${rel} no footer tag found`);
      continue;
    }
    content = content.replace(regex, FOOTER);
    fs.writeFileSync(file, content);
    console.log(`✓ ${rel}`);
  }
}

main();
