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
const ARCHETYPES = vm.runInNewContext(
  `(function(){
${archetypeSrc}
return ARCHETYPES;
})()`
);
const FLAGSHIP_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();

function loadBookHtml() {
  return fs.readFileSync(path.join(ROOT, 'herald', edition.id, 'book', 'index.html'), 'utf8');
}

describe('Herald landing page', () => {
  const html = fs.readFileSync(path.join(ROOT, 'herald', 'index.html'), 'utf8');

  it('renders the publication masthead', () => {
    assert(html.includes('<title>The Unicode Herald | PuniCodex</title>'));
    assert(html.includes('>The Unicode Herald<'));
    assert(html.includes(`Vol. ${edition.volume}, No. ${edition.number}`));
    assert(html.includes(edition.quarter));
    assert(html.includes(edition.label));
  });

  it('links to the first edition book and declares 1,084+ pages', () => {
    assert(
      html.includes(`href="/herald/${edition.id}/book/"`),
      'missing link to complete first edition book'
    );
    assert(html.includes('1,084'), 'missing 1,084+ page mention on landing');
  });

  it('lists all chapters in the table of contents', () => {
    for (const chapter of edition.chapters) {
      const titleEscaped = chapter.title.replace(/&/g, '&amp;');
      assert(
        html.includes(chapter.title) || html.includes(titleEscaped),
        `missing chapter title: ${chapter.title}`
      );
      assert(
        html.includes(`href="/herald/${edition.id}/${chapter.slug}/"`),
        `missing chapter link: ${chapter.slug}`
      );
    }
  });

  it('carries the HEKAWEB footer credit', () => {
    assert(html.includes('https://hekaweb.com'));
    assert(html.includes('Proudly built'));
  });
});

describe('Herald book chapters', () => {
  edition.chapters.forEach((chapter, idx) => {
    const filePath = path.join(ROOT, 'herald', edition.id, chapter.slug, 'index.html');

    it(`${chapter.slug} page exists and is valid`, () => {
      assert(fs.existsSync(filePath), `missing chapter file: ${filePath}`);
      const html = fs.readFileSync(filePath, 'utf8');

      assert(html.includes(`<title>${chapter.title}`));
      assert(html.includes(`>${chapter.title}<`));
      assert(html.includes(chapter.subtitle));

      // Valid JSON-LD
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert(match, 'JSON-LD script not found');
      const json = JSON.parse(match[1]);
      assert.strictEqual(json['@type'], 'Article');
      assert.strictEqual(json.datePublished, edition.publishedAt);

      // Navigation
      if (idx > 0) {
        assert(html.includes(`href="../${edition.chapters[idx - 1].slug}/"`), 'missing prev link');
      }
      if (idx < edition.chapters.length - 1) {
        assert(html.includes(`href="../${edition.chapters[idx + 1].slug}/"`), 'missing next link');
      }
      assert(html.includes('href="/herald/"'), 'missing contents link');
    });
  });
});

describe('Herald complete first edition book', () => {
  const filePath = path.join(ROOT, 'herald', edition.id, 'book', 'index.html');

  it('generates the complete book page', () => {
    assert(fs.existsSync(filePath), `missing book file: ${filePath}`);
  });

  it('contains at least 542 flagship spreads', () => {
    const html = loadBookHtml();
    const spreadMatches = html.match(/class="herald-spread/g) || [];
    assert(
      spreadMatches.length >= 542,
      `expected at least 542 spreads, found ${spreadMatches.length}`
    );
  });

  it('declares 1,084+ pages in the cover stats', () => {
    const html = loadBookHtml();
    assert(/1[,\u202f]?084|1[,\u202f]?[0-9]{3}/.test(html), 'missing 1,084+ page count');
  });

  it('contains new front and back matter sections', () => {
    const html = loadBookHtml();
    assert(html.includes('id="timeline"'), 'missing timeline section');
    assert(html.includes('id="pantheon-atlas"'), 'missing pantheon atlas section');
    assert(html.includes('id="name-index"'), 'missing name index section');
  });

  it('contains every flagship temple id in spreads without duplicates', () => {
    const html = loadBookHtml();
    const idsInHtml = [...html.matchAll(/id="temple-([^"]+)"/g)]
      .map((m) => m[1])
      .filter((id) => FLAGSHIP_IDS.includes(id));
    assert.strictEqual(
      idsInHtml.length,
      FLAGSHIP_IDS.length,
      `spread count mismatch: ${idsInHtml.length} vs ${FLAGSHIP_IDS.length}`
    );
    const uniqueIds = new Set(idsInHtml);
    assert.strictEqual(uniqueIds.size, idsInHtml.length, 'duplicate temple ids found');
    for (const id of FLAGSHIP_IDS) {
      assert(uniqueIds.has(id), `missing spread for ${id}`);
    }
  });

  it('has valid JSON-LD as a Book', () => {
    const html = loadBookHtml();
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(match, 'JSON-LD script not found');
    const json = JSON.parse(match[1]);
    assert.strictEqual(json['@type'], 'Book');
    assert.strictEqual(json.datePublished, edition.publishedAt);
  });

  it('carries the HEKAWEB credit and canary disclosure', () => {
    const html = loadBookHtml();
    assert(html.includes('https://hekaweb.com'));
    assert(html.includes('canary'));
  });

  it('has every index link pointing to a real spread target', () => {
    const html = loadBookHtml();
    const anchorIds = [...html.matchAll(/href="#temple-([^"]+)"/g)].map((m) => m[1]);
    const targets = new Set(
      [...html.matchAll(/<section class="herald-spread[^"]*" id="temple-([^"]+)"/g)].map(
        (m) => m[1]
      )
    );
    for (const id of anchorIds) {
      // The gazetteer divider is an in-page anchor, not a flagship spread.
      if (id === 'gazetteer') continue;
      assert(targets.has(id), `index anchor #temple-${id} has no matching target`);
    }
  });

  it('renders complete markup for every flagship spread', () => {
    const html = loadBookHtml();

    function extractSpread(id) {
      const marker = `id="temple-${id}"`;
      const markerIdx = html.indexOf(marker);
      if (markerIdx === -1) return null;
      const sectionOpen = html.lastIndexOf('<section', markerIdx);
      if (sectionOpen === -1) return null;
      let depth = 0;
      for (let i = sectionOpen; i < html.length - 8; i++) {
        if (html.slice(i, i + 8) === '<section') {
          depth++;
        } else if (html.slice(i, i + 10) === '</section>') {
          depth--;
          if (depth === 0) {
            return html.slice(sectionOpen, i + 10);
          }
        }
      }
      return null;
    }

    for (const id of FLAGSHIP_IDS) {
      const spread = extractSpread(id);
      assert(spread, `missing spread for ${id}`);

      const required = [
        'spread-left',
        'spread-right',
        'spread-name',
        'spread-script',
        'spread-domain',
        'spread-badges',
        'spread-visual',
        'spread-gallery',
        'spread-motif',
        'spread-tagline',
        'spread-lore',
        'spread-pronunciation',
        'spread-patterns',
        'spread-meaning',
        'spread-related-temples',
        'spread-name-variations',
        'spread-modern-bridge',
      ];
      for (const cls of required) {
        assert(
          spread.includes(`class="${cls}"`) || spread.includes(` ${cls}`),
          `${id} spread missing ${cls}`
        );
      }
    }
  });
});
