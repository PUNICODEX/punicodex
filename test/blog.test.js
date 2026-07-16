'use strict';

/**
 * PÚNYCODEX — Blog tab tests
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
    assert.match(html, /<meta property="og:site_name" content="PUNYCODEX"/, 'missing og:site_name');
    assert.match(html, /<meta name="twitter:card"/, 'missing twitter:card');

    // Analytics markers and beacon
    assert.match(html, /<!-- PUNYCODEX-ANALYTICS-START -->/, 'missing analytics start marker');
    assert.match(html, /<!-- PUNYCODEX-ANALYTICS-END -->/, 'missing analytics end marker');
    assert.match(
      html,
      /<script src="\/js\/analytics-beacon\.js" defer><\/script>/,
      'missing beacon script'
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

    // No placeholder text
    assert.doesNotMatch(
      html,
      /awaiting contribution|TODO|TBD|FIXME|lorem ipsum|\{\{/i,
      'page contains placeholder text'
    );

    // Body word count
    const bodyMatch = html.match(/<div class="blog-body reveal-up">([\s\S]*?)<\/div>/);
    assert.ok(bodyMatch, 'missing blog-body div');
    const wc = wordCount(bodyMatch[1]);
    assert.ok(wc >= 700 && wc <= 950, `body word count ${wc} not in 700–950 range`);

    // Internal links resolve to real lexicon ids
    const linkRe = /href="\/sites\/([^/]+)\//g;
    let match;
    while ((match = linkRe.exec(html)) !== null) {
      const targetId = match[1];
      assert.ok(
        lexiconIds.has(targetId),
        `internal link target /sites/${targetId}/ not in lexicon`
      );
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
    assert.equal(post.author, 'PÚNYCODEX Team', 'unexpected author');
    assert.ok(post.readingTime, 'missing readingTime');
  });
}
