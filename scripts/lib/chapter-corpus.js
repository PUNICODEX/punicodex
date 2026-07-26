#!/usr/bin/env node
'use strict';
/**
 * PuniCodex — chapter-corpus contract (sacred texts, prose/chaptered works).
 *
 * Dual to scripts/build-text-corpus.js (which handles line-poems like the
 * Theogony). A chaptered text carries:
 *
 *   platform/texts/{id}/eng.json   — the reading corpus
 *   platform/texts/{id}/xref.json  — temple cross-link forms for THIS text
 *
 * eng.json shape:
 *   {
 *     "lang": "eng",
 *     "sections": [
 *       { "id": "voluspa", "title": "Völuspá", "text": "Para 1.\n\nPara 2." },
 *       …
 *     ]
 *   }
 *   - id: url-safe slug, unique across the text (deep-link anchor)
 *   - title: display heading, unique across the text
 *   - text: prose, paragraphs separated by a blank line; no HTML, no
 *     Project-Gutenberg boilerplate, no editorial bracket soup
 *
 * xref.json shape:
 *   {
 *     "version": 1,
 *     "links": [ { "temple": "odinn", "forms": ["Othin", "Odin"] }, … ]
 *   }
 *   Every form must appear in the corpus as a CAPITALIZED WHOLE WORD (the
 *   theogony rule: capitalized = entity, lowercase = common noun, never
 *   linked). Inflection endings are matched by the renderer's stem rule,
 *   so list dictionary forms, not every inflection.
 *
 * This module is the single validation authority — the page generator and
 * the test suite both consume it. validateChapterCorpus throws with a
 * precise message on the first violation; nothing invalid may ship.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TEXTS_DIR = path.join(ROOT, 'platform', 'texts');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg) {
  throw new Error(`chapter-corpus: ${msg}`);
}

function validateChapterCorpus(corpus, { minSections = 1, id = 'unknown' } = {}) {
  if (!corpus || typeof corpus !== 'object') fail(`${id}: corpus is not an object`);
  if (corpus.lang !== 'eng') fail(`${id}: lang must be "eng"`);
  if (!Array.isArray(corpus.sections) || corpus.sections.length < minSections) {
    fail(`${id}: needs at least ${minSections} section(s)`);
  }
  const ids = new Set();
  const titles = new Set();
  for (const [i, s] of corpus.sections.entries()) {
    if (!s || typeof s !== 'object') fail(`${id}: section ${i} is not an object`);
    if (!SLUG_RE.test(s.id || '')) fail(`${id}: section ${i} id "${s.id}" is not a slug`);
    if (ids.has(s.id)) fail(`${id}: duplicate section id "${s.id}"`);
    ids.add(s.id);
    if (typeof s.title !== 'string' || s.title.trim().length < 2) {
      fail(`${id}: section "${s.id}" has no title`);
    }
    const t = s.title.trim();
    if (titles.has(t)) fail(`${id}: duplicate section title "${t}"`);
    titles.add(t);
    if (typeof s.text !== 'string' || s.text.trim().length < 40) {
      fail(`${id}: section "${s.id}" text under 40 chars`);
    }
    if (/<[a-z][\s\S]*>/i.test(s.text)) fail(`${id}: section "${s.id}" contains HTML`);
    if (/Project Gutenberg/i.test(s.text)) {
      fail(`${id}: section "${s.id}" still carries Gutenberg boilerplate`);
    }
  }
  return true;
}

function validateXref(xref, corpus, { id = 'unknown' } = {}) {
  if (!xref || xref.version !== 1 || !Array.isArray(xref.links)) {
    fail(`${id}: xref must be { version: 1, links: [...] }`);
  }
  const claimed = new Map();
  const corpusText = corpus.sections.map((s) => s.text).join('\n');
  for (const link of xref.links) {
    if (!link || typeof link.temple !== 'string' || !SLUG_RE.test(link.temple)) {
      fail(`${id}: bad temple id in xref: ${JSON.stringify(link && link.temple)}`);
    }
    if (!Array.isArray(link.forms) || !link.forms.length) {
      fail(`${id}: temple "${link.temple}" has no forms`);
    }
    for (const form of link.forms) {
      if (typeof form !== 'string' || form.length < 2) {
        fail(`${id}: temple "${link.temple}" has an empty form`);
      }
      const key = form.toLowerCase();
      if (claimed.has(key) && claimed.get(key) !== link.temple) {
        fail(`${id}: form "${form}" claimed by both ${claimed.get(key)} and ${link.temple}`);
      }
      claimed.set(key, link.temple);
      // Capitalized whole-word attestation (word chars on both sides only).
      const re = new RegExp(`(?<![\\p{L}\\p{M}])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'u');
      if (!re.test(corpusText)) {
        fail(`${id}: form "${form}" (${link.temple}) is not attested as a whole word in the corpus`);
      }
      if (!/^\p{Lu}/u.test(form)) {
        fail(`${id}: form "${form}" (${link.temple}) is not capitalized`);
      }
    }
  }
  return true;
}

function loadChapterCorpus(textId) {
  const engPath = path.join(TEXTS_DIR, textId, 'eng.json');
  const xrefPath = path.join(TEXTS_DIR, textId, 'xref.json');
  if (!fs.existsSync(engPath)) return null;
  const corpus = JSON.parse(fs.readFileSync(engPath, 'utf8'));
  const xref = fs.existsSync(xrefPath) ? JSON.parse(fs.readFileSync(xrefPath, 'utf8')) : { version: 1, links: [] };
  return { corpus, xref };
}

function writeByteStable(file, data) {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

module.exports = {
  TEXTS_DIR,
  SLUG_RE,
  validateChapterCorpus,
  validateXref,
  loadChapterCorpus,
  writeByteStable,
};
