/**
 * Crosslink tests — engine units plus baked-page invariants.
 *
 * Engine: wikilink markers, first-mention-only, self-skip, ambiguity blocklist,
 * anchor/code/heading/head skips, fragment vs document modes.
 *
 * Baked pages: no self-links, no raw [[ ]] markers, no nested anchors, no
 * links in <title>, and coverage spot checks on prose-heavy temples.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const { transformWikilinks, autoLink, BY_ID } = require('../scripts/lib/crosslink.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function run() {
  console.log('\n▸ Crosslink Tests\n');

  // ─── Engine units ───
  test('wikilink markers convert; unknown ids degrade to label', () => {
    const out = transformWikilinks('see [[demeter|Dēmḗtēr]] and [[nope|Nobody]]');
    assert.ok(out.includes('href="/sites/demeter/"'));
    assert.ok(out.includes('>Dēmḗtēr</a>'));
    assert.ok(out.includes('Nobody'));
    assert.ok(!out.includes('[['));
  });

  test('first mention only: repeats stay plain', () => {
    const out = autoLink('<p>Fenrir wakes. Fenrir hunts.</p>', { selfId: null });
    assert.strictEqual((out.match(/data-crosslink="fenrir"/g) || []).length, 1);
  });

  test('self-link is never emitted for the page entry', () => {
    const out = autoLink('<p>Ragnarǫk looms; Fenrir waits.</p>', { selfId: 'ragnarok' });
    assert.ok(!out.includes('data-crosslink="ragnarok"'));
    assert.ok(out.includes('data-crosslink="fenrir"'));
  });

  test('ambiguity: common-word ASCII names do not link; diacritic forms do', () => {
    const out = autoLink('<p>Atlas held asia, but Átlas is a name.</p>', { selfId: null });
    assert.ok(!out.includes('>Atlas</a>'));
    assert.ok(out.includes('data-crosslink="atlas">Átlas</a>'));
  });

  test('never links inside anchors, code, headings, or <head>', () => {
    const out = autoLink('<p><a href="/x">Óðinn</a> <code>Óðinn</code></p><h2>Óðinn</h2>', {
      selfId: null,
    });
    assert.strictEqual((out.match(/data-crosslink/g) || []).length, 0);
    const doc = autoLink(
      '<!DOCTYPE html><html><head><title>Óðinn</title></head><body><p>Óðinn</p></body></html>',
      { selfId: null }
    );
    assert.ok(doc.includes('<title>Óðinn</title>'));
    assert.ok(doc.includes('<p><a href="/sites/odinn/"'));
  });

  test('never links inside <script> (JSON-LD) or <style> blocks', () => {
    const out = autoLink(
      '<!DOCTYPE html><html><body><script type="application/ld+json">{"d":"saving Zeus made"}</script><p>Zeus walks.</p><style>.zeus{color:red}</style></body></html>',
      { selfId: 'rhea' }
    );
    assert.ok(out.includes('"saving Zeus made"'), 'JSON-LD text must stay untouched');
    assert.ok(out.includes('.zeus{color:red}'), 'CSS must stay untouched');
    assert.ok(out.includes('<p><a href="/sites/zeus/"'), 'prose still links');
  });

  test('fragments are not wrapped in html/head/body', () => {
    const out = autoLink('<p>Þórr</p>', { selfId: null });
    assert.ok(!out.includes('<html'));
    assert.ok(!out.includes('<body'));
  });

  // ─── Baked-page invariants ───
  const siteDirs = fs
    .readdirSync(path.join(ROOT, 'sites'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);

  test('no temple page self-links with the crosslink class', () => {
    const bad = [];
    for (const id of siteDirs) {
      for (const sub of ['index.html', 'lore/index.html', 'lore/extended/index.html']) {
        const f = path.join(ROOT, 'sites', id, sub);
        if (!fs.existsSync(f)) continue;
        const html = fs.readFileSync(f, 'utf8');
        if (html.includes(`href="/sites/${id}/" class="crosslink"`)) bad.push(`${id}/${sub}`);
      }
    }
    assert.deepStrictEqual(bad.slice(0, 8), [], `${bad.length} self-links`);
  });

  test('no raw wikilink markers remain in baked pages', () => {
    const bad = [];
    for (const id of siteDirs) {
      const f = path.join(ROOT, 'sites', id, 'blog', 'index.html');
      if (!fs.existsSync(f)) continue;
      const html = fs.readFileSync(f, 'utf8');
      if (/\[\[[a-z0-9-]+\|/.test(html)) bad.push(id);
    }
    assert.deepStrictEqual(bad, [], 'raw [[ markers left');
  });

  test('no nested anchors and no anchors inside <title>', () => {
    const bad = [];
    for (const id of siteDirs.slice(0, 200)) {
      for (const sub of ['index.html', 'blog/index.html', 'lore/index.html']) {
        const f = path.join(ROOT, 'sites', id, sub);
        if (!fs.existsSync(f)) continue;
        const html = fs.readFileSync(f, 'utf8');
        if (/<a [^>]*>(?:(?!<\/a>)*?)<a /.test(html)) bad.push(`${id}/${sub} nested`);
        const title = html.match(/<title>([\s\S]*?)<\/title>/i);
        if (title && title[1].includes('<a ')) bad.push(`${id}/${sub} title-link`);
      }
    }
    assert.deepStrictEqual(bad.slice(0, 8), [], `${bad.length} structural violations`);
  });

  test('coverage: ragnarok blog crosslinks the gods it names', () => {
    const html = fs.readFileSync(
      path.join(ROOT, 'sites', 'ragnarok', 'blog', 'index.html'),
      'utf8'
    );
    for (const id of ['fenrir', 'odinn', 'thor', 'surtr', 'baldr']) {
      assert.ok(html.includes(`data-crosslink="${id}"`), `missing crosslink: ${id}`);
    }
    // First-mention discipline: each linked at most once on the page.
    for (const id of ['fenrir', 'odinn', 'thor']) {
      const count = (html.match(new RegExp(`data-crosslink="${id}"`, 'g')) || []).length;
      assert.ok(count <= 1, `${id} linked ${count} times on one page`);
    }
  });

  test('coverage: zeus lore crosslinks at least three other deities', () => {
    const html = fs.readFileSync(path.join(ROOT, 'sites', 'zeus', 'lore', 'index.html'), 'utf8');
    const ids = new Set([...html.matchAll(/data-crosslink="([^"]+)"/g)].map((m) => m[1]));
    ids.delete('zeus');
    assert.ok(ids.size >= 3, `only ${ids.size} crosslinks on zeus lore`);
  });

  console.log(`\nCrosslink Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
