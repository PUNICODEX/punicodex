#!/usr/bin/env node
/**
 * Patch existing flagship temples to add the Student Creative Marketplace tab.
 *
 * 1. Adds a "Creatives" link to the nav in sites/{id}/index.html.
 * 2. Copies templates/flagship/creatives/* into sites/{id}/creatives/.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'flagship');
const CREATIVES_SRC = path.join(TEMPLATE_DIR, 'creatives');

function getFlagshipIds() {
  return fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(SITES_DIR, e.name, 'lore', 'index.html')))
    .map((e) => e.name);
}

function addCreativesTab(html) {
  const $ = cheerio.load(html);
  const navLinks = $('.nav-links');
  if (navLinks.length === 0) return html;

  const existing = navLinks.find('a[href="creatives/index.html"]');
  if (existing.length > 0) return html;

  const scholarsLink = navLinks.find('a[href="scholars/index.html"]');
  if (scholarsLink.length > 0) {
    scholarsLink.after('\n                <a href="creatives/index.html" class="nav-link">Creatives</a>');
  } else {
    navLinks.append('\n                <a href="creatives/index.html" class="nav-link">Creatives</a>');
  }

  return $.html();
}

function copyCreativesTemplate(siteDir) {
  if (!fs.existsSync(CREATIVES_SRC)) return;
  const destDir = path.join(siteDir, 'creatives');
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(CREATIVES_SRC, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(CREATIVES_SRC, entry.name), path.join(destDir, entry.name));
  }
}

function main() {
  const ids = getFlagshipIds();
  let patched = 0;
  for (const id of ids) {
    const siteDir = path.join(SITES_DIR, id);
    const indexPath = path.join(siteDir, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const updated = addCreativesTab(html);
    if (updated !== html) {
      fs.writeFileSync(indexPath, updated, 'utf8');
    }
    copyCreativesTemplate(siteDir);
    patched++;
  }
  console.log(`Patched ${patched} flagship temples with Creatives tab and page.`);
}

main();
