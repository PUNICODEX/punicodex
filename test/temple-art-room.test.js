/**
 * Temple Art Room contract (sites/{id}/art/).
 *
 * The temple tab strip restructured to HOME · LORE▾(Extended) · STORE▾(Merch·Art)
 * · PATTERNS · SCHOLARS · PATRONS · BLOG: Gallery and Creatives retired into
 * the temple's Art room — the /store/art/ architecture in a temple-scoped
 * instance. Every pill is URL-addressable (?view=) with its own canonical.
 * Old /gallery/ and /creatives/ pages redirect in (no broken URLs).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const built = ARCHETYPES.filter((a) => a.built);
const read = (rel) => {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('every built flagship has an Art room with the four pills', () => {
  for (const a of built) {
    const html = read(path.join('sites', a.id, 'art', 'index.html'));
    assert.ok(html, `${a.id}: art/index.html missing`);
    for (const cat of ['all', 'temple', 'creatives', 'commons']) {
      assert.ok(html.includes(`data-cat="${cat}"`), `${a.id}: art room missing the ${cat} pill`);
    }
  }
});

test('art rooms are URL-addressable per view with canonical swap', () => {
  for (const a of built.slice(0, 25)) {
    const html = read(path.join('sites', a.id, 'art', 'index.html'));
    assert.ok(html.includes('URLSearchParams'), `${a.id}: no ?view= deep-link handling`);
    assert.ok(html.includes(`view=temple`), `${a.id}: temple view not addressable`);
    assert.ok(html.includes('art-canonical'), `${a.id}: canonical link not swappable`);
    assert.ok(html.includes(`/store/merch/${a.id}/`), `${a.id}: Store▾Merch not linked`);
  }
});

test('the tab strip carries Lore▾ and Store▾ and no Gallery/Creatives tabs', () => {
  for (const a of built.slice(0, 25)) {
    const html = read(path.join('sites', a.id, 'index.html'));
    assert.ok(html, `${a.id}: temple index missing`);
    assert.ok(html.includes('nav-group'), `${a.id}: tab strip lacks submenu groups`);
    assert.ok(html.includes(`/store/merch/${a.id}/`), `${a.id}: Store▾Merch missing`);
    assert.ok(html.includes('art/index.html'), `${a.id}: Store▾Art missing`);
    assert.ok(html.includes('nav-sub-link'), `${a.id}: submenu links missing`);
    // retired tabs must not appear as top-level strip links
    assert.ok(
      !/class="nav-link[^"]*">Gallery</.test(html),
      `${a.id}: Gallery still a top-level tab`
    );
    assert.ok(
      !/class="nav-link[^"]*">Creatives</.test(html),
      `${a.id}: Creatives still a top-level tab`
    );
  }
});

test('gallery and creatives pages redirect into the art room', () => {
  for (const a of built.slice(0, 25)) {
    for (const [sub, view] of [
      ['gallery', 'temple'],
      ['creatives', 'creatives'],
    ]) {
      const html = read(path.join('sites', a.id, sub, 'index.html'));
      assert.ok(html, `${a.id}: ${sub}/index.html missing`);
      assert.ok(
        html.includes(`art/?view=${view}`),
        `${a.id}: ${sub} page does not redirect to the art room (${view})`
      );
    }
  }
});

test('art rooms carry the Muse Flame hero and the loupe toolset (no tradition filter)', () => {
  for (const a of built.slice(0, 25)) {
    const html = read(path.join('sites', a.id, 'art', 'index.html'));
    assert.ok(html.includes('pc-fx-muse'), `${a.id}: Muse Flame hero missing`);
    assert.ok(html.includes('id="art-q"'), `${a.id}: search missing`);
    assert.ok(html.includes('id="art-tag"'), `${a.id}: tag filter missing`);
    assert.ok(html.includes('id="art-sort"'), `${a.id}: sort missing`);
    assert.ok(
      !html.includes('art-tradition'),
      `${a.id}: tradition filter has no place in a single-temple room`
    );
  }
});

test('art rooms preserve canonical temple chrome, metadata, and a pinned real stylesheet', () => {
  for (const a of built.slice(0, 25)) {
    const html = read(path.join('sites', a.id, 'art', 'index.html'));
    assert.ok(html.includes('class="global-strip"'), `${a.id}: global hub strip missing`);
    assert.ok(html.includes('class="site-footer"'), `${a.id}: canonical site footer missing`);
    assert.ok(html.includes('/css/footer.css?v=8'), `${a.id}: current footer CSS pin missing`);
    assert.ok(!html.includes('../css/flagship.css'), `${a.id}: nonexistent stylesheet URL`);
    assert.ok(html.includes(`../styles.css?v=`), `${a.id}: temple stylesheet missing`);
    assert.ok(!html.includes('../styles.css?v=perf21'), `${a.id}: unbaked stylesheet pin`);
    assert.ok(html.includes('class="temple-breadcrumb"'), `${a.id}: visible breadcrumb missing`);
    assert.ok(html.includes('"@type":"BreadcrumbList"'), `${a.id}: BreadcrumbList missing`);
    assert.ok(
      html.includes(`https://punicodex.com/assets/og/${a.id}.jpg`),
      `${a.id}: OG image missing`
    );
  }
});

test('the main Art Directory has the Creatives pill and view addressing', () => {
  const html = read(path.join('store', 'art', 'index.html'));
  assert.ok(html, '/store/art/ missing');
  assert.ok(html.includes('data-cat="creatives"'), 'Creatives pill missing');
  assert.ok(
    !html.includes('data-cat="tattoo"'),
    'Tattoo bubble should be gone — the tag selector covers it'
  );
  assert.ok(html.includes('URLSearchParams'), '?view= addressing missing');
  assert.ok(
    html.includes('view=commons') && html.includes('view=galleries'),
    'views not addressable'
  );
  assert.ok(html.includes('view=commons&art='), 'Commons works do not deep-link into their viewer');
  assert.ok(html.includes('value="mascot"'), 'global mascot filter missing');
});

let failures = 0;
(async () => {
  console.log('\n▸ Temple Art Room contract\n');
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${t.name}\n    ${err.message}`);
    }
  }
  console.log(`\nTemple Art Room: ${tests.length - failures}/${tests.length} passed`);
  process.exit(failures ? 1 : 0);
})();
