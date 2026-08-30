#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const EDITIONS_PATH = path.join(ROOT, 'data', 'herald-editions.json');

const editions = JSON.parse(fs.readFileSync(EDITIONS_PATH, 'utf8')).editions;
const edition = editions
  .slice()
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const lexiconSrc = fs.readFileSync(path.join(ROOT, 'type', 'js', 'lexicon.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){
${archetypeSrc}
return ARCHETYPES;
})()`
);
const LEXICON = vm.runInNewContext(
  `(function(){
${lexiconSrc}
return LEXICON;
})()`
);

const FLAGSHIPS = ARCHETYPES.filter((a) => a.built).sort((a, b) => a.id.localeCompare(b.id));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));
const BUILT_IDS = new Set(FLAGSHIPS.map((a) => a.id));

let LORE_CATALOG = {};
try {
  LORE_CATALOG = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts', 'lore-catalog.json'), 'utf8')
  );
} catch {
  // optional
}

const bookHtml = fs.readFileSync(
  path.join(ROOT, 'herald', edition.id, 'book', 'index.html'),
  'utf8'
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractSpread(id) {
  const marker = `id="temple-${id}"`;
  const markerIdx = bookHtml.indexOf(marker);
  if (markerIdx === -1) return null;
  // find the opening <section> that contains this id
  const sectionOpen = bookHtml.lastIndexOf('<section', markerIdx);
  if (sectionOpen === -1) return null;
  let depth = 0;
  let i = sectionOpen;
  for (; i < bookHtml.length - 8; i++) {
    if (bookHtml.slice(i, i + 8) === '<section') {
      depth++;
    } else if (bookHtml.slice(i, i + 10) === '</section>') {
      depth--;
      if (depth === 0) {
        return bookHtml.slice(sectionOpen, i + 10);
      }
    }
  }
  return null;
}

function extractBlock(spread, className) {
  const open = spread.indexOf(`class="${className}"`);
  if (open === -1) return '';
  // walk back to the '<' that starts this element
  let elStart = open;
  while (elStart > 0 && spread[elStart] !== '<') {
    elStart--;
  }
  const voidTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);
  let depth = 0;
  let i = elStart;
  for (; i < spread.length; i++) {
    if (spread[i] !== '<') continue;
    if (spread.slice(i, i + 2) === '</') {
      depth--;
      if (depth === 0) {
        const tagEnd = spread.indexOf('>', i);
        return spread.slice(elStart, tagEnd + 1);
      }
    } else {
      const tagMatch = spread.slice(i + 1).match(/^[a-zA-Z0-9]+/);
      const tag = tagMatch ? tagMatch[0].toLowerCase() : '';
      if (!voidTags.has(tag)) {
        depth++;
      }
    }
  }
  return '';
}

function textContent(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertNoRawLt(html, ctx) {
  // Any unescaped '<' followed by a letter is suspicious inside text runs.
  // Permitted: HTML tags and entities/numeric references.
  const suspicious = html.match(/(^|>)[^<]*<(?![a-zA-Z/!]|\?)/g);
  assert(!suspicious, `possible raw '<' in ${ctx}: ${suspicious?.[0]}`);
}

describe('Herald flagship spreads', () => {
  for (const archetype of FLAGSHIPS) {
    const id = archetype.id;
    const entry = LEXICON_BY_ID.get(id);

    describe(`${id}`, () => {
      const spread = extractSpread(id);

      it('has a spread in the book', () => {
        assert(spread, `missing spread for ${id}`);
      });

      it('uses the correct pantheon class and page numbers', () => {
        assert(spread.includes(`spread-${entry?.pantheon || archetype.pantheon}`));
        assert(spread.includes('data-page-left="'));
        assert(spread.includes('data-page-right="'));
      });

      it('renders the Unicode name and a tier badge', () => {
        assert(spread.includes(`class="spread-name"`), 'missing spread-name');
        assert(
          spread.includes(`>${escapeHtml(entry?.unicode || archetype.name)}<`),
          'missing Unicode name'
        );
        assert(
          spread.includes('tier-dual') || spread.includes('tier-1') || spread.includes('tier-2'),
          'missing tier badge'
        );
      });

      it('renders a non-empty meaning', () => {
        const meaningBlock = extractBlock(spread, 'spread-meaning');
        assert(meaningBlock, 'missing meaning block');
        const text = textContent(meaningBlock);
        assert(text.length > 8, `meaning too short for ${id}: ${text}`);
      });

      it('includes a gallery with at least one image or fallback figure', () => {
        const galleryBlock = extractBlock(spread, 'spread-gallery');
        assert(galleryBlock, 'missing gallery block');
        const imgCount = (galleryBlock.match(/<img/g) || []).length;
        assert(imgCount >= 1, `gallery has no images for ${id}`);
        assert(
          galleryBlock.includes('<figure') || galleryBlock.includes('<figcaption'),
          `gallery missing figure/figcaption for ${id}`
        );
      });

      it('lists name variations including canonical and ASCII forms', () => {
        const varBlock = extractBlock(spread, 'spread-name-variations');
        assert(varBlock, 'missing name-variations block');
        const text = textContent(varBlock);
        assert(text.includes('Canonical'), `missing Canonical label for ${id}`);
        assert(text.includes('ASCII'), `missing ASCII label for ${id}`);
        assert(text.includes(entry?.unicode || archetype.name), `missing Unicode form for ${id}`);
        assert(text.includes(entry?.ascii || id), `missing ASCII form for ${id}`);
      });

      it('renders pronunciation with IPA when canonical data exists', () => {
        const entry = LEXICON_BY_ID.get(id);
        const lore = LORE_CATALOG[id];
        const hasPronunciation = entry?.pronunciation?.ipa || lore?.pronunciation?.ipa;
        const pronBlock = extractBlock(spread, 'spread-pronunciation');
        if (hasPronunciation) {
          assert(pronBlock, `${id}: missing pronunciation block`);
          assert(pronBlock.includes('pron-ipa'), `${id}: missing pron-ipa element`);
          assert(pronBlock.includes('pron-label'), `${id}: missing pron-label element`);
        }
        if (pronBlock) {
          assert(pronBlock.includes('pron-ipa'), `${id}: pronunciation block missing pron-ipa`);
        }
      });

      it('links to a real temple directory', () => {
        const linkMatch = spread.match(/href="\/([^"]+)\/"/);
        assert(linkMatch, `missing temple link for ${id}`);
        const linkedId = linkMatch[1];
        assert(BUILT_IDS.has(linkedId), `link /${linkedId}/ is not a built flagship`);
        const templeDir = path.join(ROOT, 'sites', linkedId);
        assert(fs.existsSync(templeDir), `temple directory missing: ${templeDir}`);
      });

      it('uses only valid related temple ids', () => {
        const relatedBlock = extractBlock(spread, 'spread-related-temples');
        assert(relatedBlock, 'missing related-temples block');
        const relatedIds = [...relatedBlock.matchAll(/href="#temple-([^"]+)"/g)].map((m) => m[1]);
        for (const rid of relatedIds) {
          assert(BUILT_IDS.has(rid), `invalid related temple id: ${rid} in ${id}`);
        }
      });

      it('has no raw unescaped angle brackets in escaped text fields', () => {
        assertNoRawLt(spread, `spread ${id}`);
      });

      it('resolves local spread image src attributes', () => {
        const srcs = [...spread.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
        assert(srcs.length >= 4, `expected at least 4 images in ${id} spread`);
        for (const src of srcs) {
          if (/^https?:\/\//.test(src)) {
            assert(src.startsWith('https://'), `external image not HTTPS: ${src}`);
            continue;
          }
          const localPath = path.join(ROOT, src.replace(/^\//, ''));
          assert(
            fs.existsSync(localPath),
            `missing local image ${src} for ${id} (looked at ${localPath})`
          );
        }
      });
    });
  }
});

describe('Herald spread image integrity', () => {
  const gallerySrcs = [...bookHtml.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);

  it('uses HTTPS for all external gallery images', () => {
    const external = gallerySrcs.filter((s) => /^https?:\/\//.test(s));
    for (const src of external) {
      assert(src.startsWith('https://'), `gallery image not HTTPS: ${src}`);
    }
  });
});
