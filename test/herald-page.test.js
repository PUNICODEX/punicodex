#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EDITIONS_PATH = path.join(ROOT, 'data', 'herald-editions.json');

const editions = JSON.parse(fs.readFileSync(EDITIONS_PATH, 'utf8')).editions;
const edition = editions
  .slice()
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];

describe('Herald landing page', () => {
  const html = fs.readFileSync(path.join(ROOT, 'herald', 'index.html'), 'utf8');

  it('renders the publication masthead', () => {
    assert(html.includes('<title>The Unicode Herald | PuniCodex</title>'));
    assert(html.includes('>The Unicode Herald<'));
    assert(html.includes(`Vol. ${edition.volume}, No. ${edition.number}`));
    assert(html.includes(edition.quarter));
    assert(html.includes(edition.label));
  });

  it('links to the first edition book', () => {
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
    const html = fs.readFileSync(filePath, 'utf8');
    const spreadMatches = html.match(/class="herald-spread/g) || [];
    assert(
      spreadMatches.length >= 542,
      `expected at least 542 spreads, found ${spreadMatches.length}`
    );
  });

  it('declares 1,084+ pages in the cover stats', () => {
    const html = fs.readFileSync(filePath, 'utf8');
    assert(/1[,\u202f]?084|1[,\u202f]?[0-9]{3}/.test(html), 'missing 1,084+ page count');
  });

  it('contains every flagship temple id in spreads', () => {
    const html = fs.readFileSync(filePath, 'utf8');
    const vm = require('node:vm');
    const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
    const ARCHETYPES = vm.runInNewContext(
      `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
    );
    const flagshipIds = ARCHETYPES.filter((a) => a.built).map((a) => a.id);
    for (const id of flagshipIds.slice(0, 50)) {
      assert(html.includes(`id="temple-${id}"`), `missing spread for ${id}`);
    }
    assert.strictEqual(
      flagshipIds.filter((id) => html.includes(`id="temple-${id}"`)).length,
      flagshipIds.length,
      'not all flagships have a spread'
    );
  });

  it('has valid JSON-LD as a Book', () => {
    const html = fs.readFileSync(filePath, 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(match, 'JSON-LD script not found');
    const json = JSON.parse(match[1]);
    assert.strictEqual(json['@type'], 'Book');
    assert.strictEqual(json.datePublished, edition.publishedAt);
  });

  it('carries the HEKAWEB credit and canary disclosure', () => {
    const html = fs.readFileSync(filePath, 'utf8');
    assert(html.includes('https://hekaweb.com'));
    assert(html.includes('canary'));
  });
});
