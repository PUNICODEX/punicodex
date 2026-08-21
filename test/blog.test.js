'use strict';

/**
 * PuniCodex — Blog tab tests
 *
 * Validates that every built flagship has a generated blog page with the
 * required SEO, schema, content, and cross-link integrity.
 *
 * Run: node --test test/blog.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const lexiconIds = new Set(LEXICON.map((e) => e.id));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();

function readUtf8(...parts) {
  return fs.readFileSync(path.join(...parts), 'utf8');
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(html) {
  return stripTags(html)
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

for (const id of BUILT_IDS) {
  test(`blog page for ${id}`, () => {
    const htmlPath = path.join(SITES_DIR, id, 'blog', 'index.html');
    assert.ok(fs.existsSync(htmlPath), `expected ${htmlPath} to exist`);
    const html = readUtf8(htmlPath);

    const jsonPath = path.join(BLOG_DIR, `${id}.json`);
    assert.ok(fs.existsSync(jsonPath), `expected ${jsonPath} to exist`);
    const post = JSON.parse(readUtf8(jsonPath));

    // Basic page structure
    assert.match(html, /<title>.*<\/title>/, 'missing <title>');
    assert.match(html, /<meta name="description" content="[^"]+">/, 'missing meta description');
    assert.match(html, /<link rel="canonical"[^>]*>/, 'missing canonical link');
    assert.match(html, /<meta property="og:title"[^>]*>/, 'missing og:title');
    assert.match(html, /<meta property="og:description"[^>]*>/, 'missing og:description');
    assert.match(html, /<meta property="og:url"[^>]*>/, 'missing og:url');
    assert.match(html, /<meta property="og:type" content="article"/, 'missing og:type article');
    assert.match(html, /<meta property="og:site_name" content="PUNICODEX"/, 'missing og:site_name');
    assert.match(html, /<meta name="twitter:card"/, 'missing twitter:card');

    // Analytics markers and beacon
    assert.match(html, /<!-- PUNICODEX-ANALYTICS-START -->/, 'missing analytics start marker');
    assert.match(html, /<!-- PUNICODEX-ANALYTICS-END -->/, 'missing analytics end marker');
    assert.match(
      html,
      /<script src="\/js\/analytics-beacon\.js\?v=\d+" defer><\/script>/,
      'missing versioned beacon script'
    );

    // JSON-LD BlogPosting
    const ld = extractJsonLd(html);
    assert.ok(ld, 'JSON-LD is missing or invalid');
    assert.ok(ld['@type'], 'JSON-LD missing @type');
    const types = Array.isArray(ld['@type']) ? ld['@type'] : [ld['@type']];
    assert.ok(types.includes('BlogPosting'), 'JSON-LD @type should include BlogPosting');
    assert.equal(ld.headline, post.title, 'JSON-LD headline should match post title');
    assert.ok(ld.datePublished, 'JSON-LD missing datePublished');
    assert.ok(Array.isArray(ld.keywords), 'JSON-LD keywords should be an array');

    // No placeholder text (TODO/TBD/FIXME are checked uppercase-only so real
    // citations containing words like Spanish "todo" do not false-positive)
    assert.doesNotMatch(
      html,
      /awaiting contribution|lorem ipsum|\{\{/i,
      'page contains placeholder text'
    );
    assert.doesNotMatch(html, /\b(TODO|TBD|FIXME)\b/, 'page contains placeholder markers');

    // Body word count
    const bodyMatch = html.match(/<div class="blog-body reveal-up">([\s\S]*?)<\/div>/);
    assert.ok(bodyMatch, 'missing blog-body div');
    const wc = wordCount(bodyMatch[1]);
    assert.ok(wc >= 2400 && wc <= 4200, `body word count ${wc} not in 2400–4200 range`);

    // In-article table of contents with working anchors
    assert.match(html, /<nav class="blog-toc[^"]*"[^>]*>/, 'missing table of contents');
    const tocItems = html.match(/<li><a href="#[^"]+">[^<]+<\/a><\/li>/g) || [];
    assert.ok(tocItems.length >= 3, `expected at least 3 TOC entries, got ${tocItems.length}`);

    // H2 sections carry slugged ids and end with Related Names, then Sources
    const h2Texts = [...bodyMatch[1].matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
      stripTags(m[1])
    );
    assert.ok(h2Texts.length >= 8, `expected at least 8 H2 sections, got ${h2Texts.length}`);
    assert.deepEqual(
      h2Texts.slice(-2),
      ['Related Names', 'Sources'],
      'Related Names and Sources must be the final two sections'
    );

    // Internal temple links resolve to real lexicon ids. Clean /{id}/ is the
    // canonical form; /sites/{id}/ appears only until pages are regenerated.
    // Single-segment non-temple prefixes (asset dirs, hub pages) are skipped.
    const NON_TEMPLE_SEGMENTS = new Set([
      'about',
      'api',
      'appraise',
      'assets',
      'blog',
      'cards',
      'codex',
      'connections',
      'contact',
      'creatives',
      'css',
      'data',
      'everyday',
      'game',
      'ink',
      'js',
      'lexicon',
      'oracle',
      'pantheon',
      'patterns',
      'pronunciation',
      'realms',
      'scholars',
      'search',
      'sites',
      'store',
      'texts',
      'tiers',
      'trending',
      'type',
    ]);
    const linkRe = /href="\/(?:sites\/)?([a-z0-9-]+)\//g;
    let match;
    while ((match = linkRe.exec(html)) !== null) {
      const targetId = match[1];
      if (NON_TEMPLE_SEGMENTS.has(targetId)) continue;
      assert.ok(lexiconIds.has(targetId), `internal link target /${targetId}/ not in lexicon`);
    }

    // SEO lengths from canonical content
    assert.ok(post.title.length <= 70, `post title too long (${post.title.length} chars)`);
    assert.ok(
      post.description.length <= 160,
      `post description too long (${post.description.length} chars)`
    );
    assert.ok(
      Array.isArray(post.keywords) && post.keywords.length >= 5 && post.keywords.length <= 8,
      `expected 5–8 keywords, got ${post.keywords?.length}`
    );
    assert.ok(
      Array.isArray(post.tags) && post.tags.length >= 3 && post.tags.length <= 5,
      `expected 3–5 tags, got ${post.tags?.length}`
    );
    assert.equal(post.author, 'PuniCodex Team', 'unexpected author');
    assert.ok(post.readingTime, 'missing readingTime');
  });
}
