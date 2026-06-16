#!/usr/bin/env node
/**
 * Restore the original myth sections on flagship lore pages.
 *
 * The original-script accuracy overhaul and subsequent mass regeneration replaced
 * handcrafted "The Myths" sections with generic stub cards. This script recovers
 * the old section content from the commit just before that overhaul and swaps it
 * back into the current "Mythology" section, preserving the current wrapper
 * (class/id) so layout and navigation still work.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const BASE_COMMIT = '37b89279ec98198702a29433ea06ad5fac76e09b';

function readOldFile(site, file) {
  try {
    return execSync(
      `git show ${BASE_COMMIT}:sites/${site}/${file}`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
}

function findMythSection($) {
  // Old pages used #myths / .section-myths; newer ones use #mythology / .section-mythology.
  let section = $('#myths.section-myths, #mythology.section-mythology, #myths, #mythology').first();
  if (!section.length) {
    section = $('.section-myths, .section-mythology').first();
  }
  return section;
}

function isGenericStub(html) {
  const genericTitles = [
    'The Root Beneath the Name',
    'Worship and Invocation',
    'The Name in Text and Memory',
    'From Ancient Cult to Modern Imagination',
  ];
  return genericTitles.some((title) => html.includes(title));
}

function restoreSite(site) {
  const filePath = path.join(SITES_DIR, site, 'lore', 'index.html');
  if (!fs.existsSync(filePath)) return false;

  const oldHtml = readOldFile(site, 'lore/index.html');
  if (!oldHtml) return false;

  const currentHtml = fs.readFileSync(filePath, 'utf8');

  const $current = cheerio.load(currentHtml, { decodeEntities: false });
  const $old = cheerio.load(oldHtml, { decodeEntities: false });

  const currentSection = findMythSection($current);
  const oldSection = findMythSection($old);

  if (!currentSection.length || !oldSection.length) return false;

  const currentContainer = currentSection.find('.container').first();
  const oldContainer = oldSection.find('.container').first();

  if (!currentContainer.length || !oldContainer.length) return false;

  // Only overwrite if the current page has the generic stub cards and the old
  // page has something different.
  if (!isGenericStub(currentContainer.html())) return false;
  if (oldContainer.html() === currentContainer.html()) return false;

  currentContainer.html(oldContainer.html());

  // Preserve the current wrapper attributes so CSS/anchor links keep working.
  currentSection.attr('class', currentSection.attr('class'));
  currentSection.attr('id', currentSection.attr('id'));

  fs.writeFileSync(filePath, $current.html());
  return true;
}

function main() {
  const sites = fs
    .readdirSync(SITES_DIR)
    .filter((id) => fs.statSync(path.join(SITES_DIR, id)).isDirectory());

  let restored = 0;
  for (const site of sites) {
    if (restoreSite(site)) {
      console.log(`restored myths: ${site}`);
      restored++;
    }
  }
  console.log(`\nRestored myth sections for ${restored} flagships.`);
}

main();
