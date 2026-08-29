#!/usr/bin/env node
/**
 * Replace global-strip with canonical main nav + mobile menu
 * and ensure canonical footer in flagship templates.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = [
  'templates/flagship/index.html',
  'templates/flagship/lore/index.html',
  'templates/flagship/lore/extended/index.html',
  'templates/flagship/gallery/index.html',
];

const ROOT = path.resolve(__dirname, '..');

const NAV_REPLACEMENT = `    <!-- Global Nav -->
    <nav class="main-nav" id="main-nav">
        <div class="nav-inner">
            <a href="https://punicodex.com/" class="nav-wordmark"><img src="/assets/brand/01-logos/punicodex-lockup-horizontal-gold.png" alt="PuniCodex — The Unicode Pantheon" width="240" height="52"></a>
            <div class="nav-links">
                <a href="https://punicodex.com/pantheon/" class="nav-link">Pantheon</a>
                <a href="https://punicodex.com/realms/" class="nav-link">Realms</a>
                <a href="https://punicodex.com/lexicon/" class="nav-link">Lexicon</a>
                <a href="https://punicodex.com/tiers/" class="nav-link">Tier System</a>
                <a href="https://punicodex.com/type/" class="nav-link">Type</a>
                <a href="https://punicodex.com/search.html" class="nav-link">Search</a>
                <a href="https://punicodex.com/codex/" class="nav-link">Codex</a>
                <a href="https://punicodex.com/api/v1/docs/" class="nav-link">API</a>
                <a href="https://punicodex.com/appraise/" class="nav-link">Appraise</a>
                <a href="https://punicodex.com/store/" class="nav-link">Store</a>
                <a href="https://punicodex.com/about/" class="nav-link">About</a>
                <a href="https://punicodex.com/contact/" class="nav-link">Contact</a>
            </div>
            <a href="https://punicodex.com/pantheon/" class="nav-cta"><span>Enter</span></a>
            <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
        <a href="https://punicodex.com/pantheon/">Pantheon</a>
        <a href="https://punicodex.com/realms/">Realms</a>
        <a href="https://punicodex.com/lexicon/">Lexicon</a>
        <a href="https://punicodex.com/tiers/">Tier System</a>
        <a href="https://punicodex.com/type/">Type</a>
        <a href="https://punicodex.com/search.html">Search</a>
        <a href="https://punicodex.com/codex/">Codex</a>
        <a href="https://punicodex.com/api/v1/docs/">API</a>
        <a href="https://punicodex.com/appraise/">Appraise</a>
        <a href="https://punicodex.com/store/">Store</a>
        <a href="https://punicodex.com/about/">About</a>
        <a href="https://punicodex.com/contact/">Contact</a>
    </div>
`;

const FOOTER_REPLACEMENT = `    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="https://punicodex.com/" class="footer-wordmark"><img src="/assets/brand/01-logos/punicodex-lockup-stacked-gold.png" alt="PuniCodex — The Unicode Pantheon" width="300" height="187"></a>
                    <p class="footer-tagline">Restoring the original names of the gods to the digital realm.</p>
                </div>
                <div class="footer-column">
                    <h2 class="footer-heading">Explore</h2>
                    <a href="https://punicodex.com/pantheon/">Pantheon</a>
                    <a href="https://punicodex.com/realms/">Realms</a>
                    <a href="https://punicodex.com/lexicon/">Lexicon</a>
                    <a href="https://punicodex.com/tiers/">Tier System</a>
                    <a href="https://punicodex.com/type/">Type</a>
                    <a href="https://punicodex.com/search.html">Search</a>
                </div>
                <div class="footer-column">
                    <h2 class="footer-heading">Resources</h2>
                    <a href="https://punicodex.com/codex/">Codex</a>
                    <a href="https://punicodex.com/api/v1/docs/">API</a>
                    <a href="https://punicodex.com/appraise/">Appraise</a>
                    <a href="https://punicodex.com/authenticity/">Authenticity</a>
                    <a href="https://punicodex.com/oracle.html">Oracle</a>
                </div>
                <div class="footer-column">
                    <h2 class="footer-heading">Connect</h2>
                    <a href="https://punicodex.com/about/">About</a>
                    <a href="https://punicodex.com/contact/">Contact</a>
                    <a href="https://punicodex.com/privacy/">Privacy</a>
                    <a href="https://punicodex.com/terms/">Terms</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 PuniCodex. All rites reserved.</p>
                <a href="https://hekaweb.com" target="_blank" rel="noopener" class="hekaweb-credit" aria-label="Proudly built and maintained by HEKAWEB">
                    <span class="hekaweb-by">Proudly built &amp; maintained by</span>
                    <span class="hekaweb-name">HEKAWEB</span>
                </a>
            </div>
        </div>
    </footer>
`;

function replaceGlobalStrip(content) {
  const regex = /<!-- Global Nav -->[\s\S]*?<!-- Ambient Canvas -->/;
  return content.replace(regex, NAV_REPLACEMENT + '    <!-- Ambient Canvas -->');
}

function replaceFooter(content) {
  // Replace {{FOOTER}} placeholder or any existing <footer>...</footer> with canonical footer.
  if (content.includes('{{FOOTER}}')) {
    return content.replace(/\{\{FOOTER\}\}/g, FOOTER_REPLACEMENT.trim());
  }
  const regex = /<footer[\s\S]*?<\/footer>/;
  if (!regex.test(content)) return content;
  return content.replace(regex, FOOTER_REPLACEMENT.trim());
}

function main() {
  for (const rel of TEMPLATES) {
    const file = path.join(ROOT, rel);
    let content = fs.readFileSync(file, 'utf-8');
    const before = content.length;
    content = replaceGlobalStrip(content);
    content = replaceFooter(content);
    fs.writeFileSync(file, content);
    console.log(`✓ ${rel} (${before} → ${content.length} chars)`);
  }
}

main();
