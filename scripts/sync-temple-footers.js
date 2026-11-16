#!/usr/bin/env node
/**
 * Sync the redesigned hub-mirror footer into every temple main page
 * (sites/{id}/index.html). Idempotent: pages already carrying the
 * `temple-footer` marker are skipped.
 *
 * Per-page values (domains, classification, original script, logomark) are
 * harvested from the existing footer so nothing editorial is lost. The
 * markup comes from scripts/temple-footer.js — the same builder
 * create-flagship.js and generate-temples.js use for new pages.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { templeFooterHtml } = require('./temple-footer.js');

const entryById = new Map(LEXICON.map((e) => [e.id, e]));

function harvest(html, id) {
  const entry = entryById.get(id) || {};
  // Capture every footer-block label/value pair in document order so the
  // script row keeps its true label (Original Script vs Scholarly
  // Transliteration — a documented display doctrine).
  const pairs = [];
  const blockRe = /<span class="footer-label">([\s\S]*?)<\/span>\s*<span class="footer-value">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = blockRe.exec(html))) pairs.push([m[1].trim(), m[2].trim()]);
  const byLabel = (label) => {
    const p = pairs.find(([l]) => l === label);
    return p ? p[1] : null;
  };
  const domainsLabel = byLabel('Owned Domains')
    ? 'Owned Domains'
    : byLabel('Domain Reference')
      ? 'Domain Reference'
      : 'Restoration';
  const domainsRaw =
    byLabel('Owned Domains') ||
    byLabel('Domain Reference') ||
    byLabel('Restoration') ||
    (entry.domain ? `${entry.domain}` : '—');
  const classification = byLabel('Classification') || entry.tier || '—';
  const scriptPair = pairs.find(([l]) => /script|transliteration/i.test(l));
  const scriptLabel = scriptPair ? scriptPair[0] : 'Original Script';
  const script = scriptPair ? scriptPair[1] : '—';
  const lm = html.match(/<img src="([^"]*logomark[^"]*)"[^>]*class="footer-logomark"/) ||
    html.match(/class="footer-logomark"[^>]*>/);
  let logomarkSrc = null;
  if (lm) {
    const srcMatch = (lm[0] + (lm[1] || '')).match(/src="([^"]+)"/);
    const srcsetMatch = (lm[0] + (lm[1] || '')).match(/srcset="([^"]+)"/);
    logomarkSrc = srcMatch
      ? srcMatch[1]
      : srcsetMatch
        ? srcsetMatch[1].split(',')[0].trim().split(' ')[0]
        : null;
  }
  if (!logomarkSrc) logomarkSrc = `assets/${id}_logomark.webp`;
  return {
    name: entry.unicode || entry.name || id,
    pantheon: entry.pantheon || '—',
    domainsLabel,
    domainsValue: domainsRaw,
    classification,
    scriptLabel,
    script,
    logomarkSrc,
    logomarkAlt: `${entry.unicode || id} logomark`,
  };
}

function findBalancedFooter(html) {
  const start = html.indexOf('<footer class="main-footer"');
  if (start === -1) return null;
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<footer', i);
    const close = html.indexOf('</footer>', i);
    if (close === -1) return null;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 8;
    } else {
      depth--;
      i = close + 9;
      if (depth === 0) return { start, end: i };
    }
  }
  return null;
}

function syncFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('temple-footer')) return 'already';
  const span = findBalancedFooter(html);
  if (!span) return 'no-footer';
  const id = path.basename(path.dirname(filePath));
  const next =
    html.slice(0, span.start) + templeFooterHtml(harvest(html, id)) + html.slice(span.end);
  writeFileWithRetry(filePath, next);
  return 'synced';
}

// Tab pages that carry the same legacy footer shape as the temple main page.
const TAB_PAGES = ['index.html', 'blog/index.html', 'lore/index.html', 'patterns/index.html'];

function main() {
  const sitesDir = path.join(ROOT, 'sites');
  const counts = {};
  for (const id of fs.readdirSync(sitesDir).sort()) {
    const dir = path.join(sitesDir, id);
    if (!fs.existsSync(path.join(dir, 'index.html'))) continue;
    for (const rel of TAB_PAGES) {
      const file = path.join(dir, rel);
      if (!fs.existsSync(file)) continue;
      try {
        const r = syncFile(file);
        counts[r] = (counts[r] || 0) + 1;
      } catch (err) {
        counts.error = (counts.error || 0) + 1;
        console.error(`  ERROR ${id}/${rel}: ${err.message}`);
      }
    }
  }
  console.log(`Temple footer sync: ${JSON.stringify(counts)}`);
  if (counts.error) process.exit(1);
}

if (require.main === module) main();
module.exports = { syncFile, harvest };
