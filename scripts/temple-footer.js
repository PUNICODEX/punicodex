#!/usr/bin/env node
/**
 * Canonical TEMPLE footer builder — the hub-mirror redesign.
 *
 * Temple pages carry a contextual identity block (seal, name, domain,
 * classification, original script) beside the six hub columns derived from
 * nav-tree.js — the same data that drives the site footer, so the surfaces
 * cannot drift apart. Consumed by scripts/sync-temple-footers.js (existing
 * pages), create-flagship.js and generate-temples.js (new pages).
 *
 * Never hand-edit the footer markup in a temple page — run
 * `node scripts/sync-temple-footers.js` instead.
 */
'use strict';

const { HUB_ORDER, HUBS } = require('./nav-tree.js');
const { featuredLinks } = require('./sync-footer.js');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hubColumn(hub) {
  const links = featuredLinks(hub)
    .map((l) => `<a class="tf-hub-link" href="${l.href}">${esc(l.label)}</a>`)
    .join('\n                            ');
  return `<div class="tf-hub">
                            <h2 class="tf-hub-heading"><a href="${hub.href}">${esc(hub.label)}</a></h2>
                            <p class="tf-hub-role">${esc(hub.role)}</p>
                            ${links}
                        </div>`;
}

/**
 * @param {object} o
 *   name:            temple display name (Unicode restoration)
 *   pantheon:        pantheon label, e.g. "greek"
 *   domainsLabel:    "Owned Domains" | "Domain Reference" | "Restoration"
 *   domainsValue:    the domain string (may contain inline HTML)
 *   classification:  tier line, e.g. "Preserves stress"
 *   script:          original script string
 *   scriptLabel:     "Original Script" | "Scholarly Transliteration" (doctrine:
 *                    never call a transliteration the original writing system)
 *   logomarkSrc:     temple logomark path (may be null)
 *   logomarkAlt:     alt text for the logomark
 */
function templeFooterHtml(o) {
  const hubs = HUB_ORDER.map((id) => hubColumn(HUBS[id])).join('\n                        ');
  const logomark = o.logomarkSrc
    ? `<img src="${esc(o.logomarkSrc)}" alt="${esc(o.logomarkAlt || `${o.name} logomark`)}" class="tf-seal" width="1024" height="1024" loading="lazy" decoding="async">`
    : '';
  const scriptLabel = o.scriptLabel || 'Original Script';
  return `<footer class="main-footer temple-footer">
        <div class="container">
            <div class="tf-grid">
                <div class="tf-identity">
                    ${logomark}
                    <a href="https://punicodex.com/" class="tf-wordmark">PUNICODEX</a>
                    <p class="tf-name">${esc(o.name)}</p>
                    <p class="tf-tag">A temple of the ${esc(o.pantheon)} pantheon, restored to its true orthography — one of 980 in the Unicode Pantheon.</p>
                    <dl class="tf-spec">
                        <div><dt>${esc(o.domainsLabel)}</dt><dd>${o.domainsValue}</dd></div>
                        <div><dt>Classification</dt><dd>${esc(o.classification)}</dd></div>
                        <div><dt>${esc(scriptLabel)}</dt><dd>${esc(o.script)}</dd></div>
                    </dl>
                </div>
                <nav class="tf-hubs" aria-label="The PuniCodex pantheon">
                        ${hubs}
                </nav>
            </div>
            <div class="footer-newsletter" data-newsletter="temple"></div>
            <div class="footer-bottom">
                <p class="footer-credit">The gods have returned · The internet is merely the first temple</p>
                <a href="https://hekaweb.com" target="_blank" rel="noopener" class="hekaweb-credit" aria-label="Proudly built and maintained by HEKAWEB">
                    <span class="hekaweb-by">Proudly built &amp; maintained by</span>
                    <span class="hekaweb-name">HEKAWEB</span>
                </a>
            </div>
        </div>
    </footer>`;
}

module.exports = { templeFooterHtml };
