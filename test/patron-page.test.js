/**
 * PÚNYCODEX — Flagship patron page smoke tests
 * Verifies that every generated flagship temple has a patron page with the
 * museum-plaque wall, honest availability, flat pricing, safe padding, and
 * working mobile navigation. These checks exist to prevent regressions in the
 * premium patron experience across all 156+ temples.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const assert = require('node:assert');

const SITES_DIR = path.join(__dirname, '..', 'sites');

function getFlagshipDirs() {
  return fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(SITES_DIR, name, 'patron', 'index.html')));
}

function loadPatronPage(id) {
  const filePath = path.join(SITES_DIR, id, 'patron', 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return cheerio.load(html);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

const ids = getFlagshipDirs();
assert.ok(ids.length >= 150, `expected at least 150 flagship patron pages, found ${ids.length}`);

console.log(`Patron Page Tests — ${ids.length} temples`);

test('every patron page has exactly one title mentioning Patrons', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    assert.strictEqual($('title').length, 1, `${id}: expected one <title>`);
    assert.ok($('title').text().includes('Patron'), `${id}: title should mention Patron`);
  }
});

test('every patron page links required stylesheets', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const styles = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr('href'))
      .get();
    assert.ok(
      styles.some((h) => h.includes('temple-base.css')),
      `${id}: expected temple-base.css`
    );
    assert.ok(
      styles.some((h) => h.includes('patron.css')),
      `${id}: expected patron.css`
    );
  }
});

test('every patron page has a global strip with required links', () => {
  const required = ['pantheon/', 'lexicon/', 'connections/', 'type/', 'search.html', 'about/'];
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const strip = $('.global-strip');
    assert.strictEqual(strip.length, 1, `${id}: expected global strip`);
    const links = strip
      .find('a')
      .map((_, el) => $(el).attr('href'))
      .get();
    for (const href of required) {
      assert.ok(
        links.some((l) => l.includes(href)),
        `${id}: expected global strip link containing ${href}`
      );
    }
  }
});

test('every patron page has tab navigation with Patrons link active', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const tabNav = $('.tab-nav, #tab-nav');
    assert.ok(tabNav.length >= 1, `${id}: expected tab nav`);
    const patronLink = tabNav.find('a[href="./"]');
    assert.strictEqual(patronLink.length, 1, `${id}: expected Patrons tab link`);
    assert.ok(patronLink.hasClass('active'), `${id}: expected Patrons tab to be active`);
  }
});

test('every patron page has a working mobile hamburger toggle', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const toggle = $('#nav-toggle');
    assert.strictEqual(toggle.length, 1, `${id}: expected #nav-toggle`);
    assert.strictEqual(
      toggle.attr('aria-label'),
      'Toggle navigation',
      `${id}: expected aria-label`
    );
    assert.strictEqual(toggle.find('span').length, 3, `${id}: expected three hamburger bars`);
  }
});

test('every patron page has the museum plaque wall container for 20 slots', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    assert.strictEqual($('#patron-wall').length, 1, `${id}: expected #patron-wall`);
    assert.strictEqual($('#active-patron-count').length, 1, `${id}: expected active patron count`);
    assert.strictEqual($('#spots-remaining').length, 1, `${id}: expected spots remaining`);
    const totalStat = $('#patron-hero-stats .patron-stat-value').filter(
      (_, el) => $(el).text().trim() === '20'
    );
    assert.strictEqual(totalStat.length, 1, `${id}: expected total plaques stat of 20`);
  }
});

test('patron JS renders exactly 20 plaques and supports social links', () => {
  const jsPath = path.join(__dirname, '..', 'templates', 'flagship', 'patron', 'patron.js');
  assert.ok(fs.existsSync(jsPath), 'expected source patron.js to exist');
  const js = fs.readFileSync(jsPath, 'utf8');
  assert.ok(js.includes('slot <= limit'), 'expected loop to render up to the configured limit');
  assert.ok(js.includes('renderPlaque'), 'expected renderPlaque helper');
  assert.ok(js.includes('SOCIAL_CONFIG'), 'expected social link configuration');
  assert.ok(/\bx:\s*\{/.test(js), 'expected X/Twitter platform support');
  assert.ok(/\binstagram:\s*\{/.test(js), 'expected Instagram platform support');
  assert.ok(/\blinkedin:\s*\{/.test(js), 'expected LinkedIn platform support');
  assert.ok(/\btiktok:\s*\{/.test(js), 'expected TikTok platform support');
  assert.ok(/\byoutube:\s*\{/.test(js), 'expected YouTube platform support');
  assert.ok(/\bgithub:\s*\{/.test(js), 'expected GitHub platform support');
  assert.ok(/\bwebsite:\s*\{/.test(js), 'expected Website platform support');
});

test('patron wall has resilient loading, error, and empty states', () => {
  const jsPath = path.join(__dirname, '..', 'templates', 'flagship', 'patron', 'patron.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  // Loading skeleton while fetching.
  assert.ok(js.includes('patron-plaque--skeleton'), 'expected skeleton plaque rendering');
  assert.ok(js.includes('aria-busy'), 'expected aria-busy on the wall while loading');
  // Inline error state with a retry that refetches (wall is never wiped to dead text).
  assert.ok(js.includes('showWallError'), 'expected a dedicated wall error state');
  assert.ok(js.includes('patron-wall-retry') || js.includes('wallRetry'), 'expected retry wiring');
  // Dead #patron-wall-empty element was removed along with its reference.
  assert.ok(!js.includes('patron-wall-empty'), 'expected no dead #patron-wall-empty reference');
  // Empty success state gets an inviting first-patron treatment, not an error.
  assert.ok(js.includes('patron-plaque--first'), 'expected first-patron plaque treatment');
  assert.ok(js.includes('wallInvite'), 'expected empty-wall invitation wiring');

  for (const id of ids) {
    const $ = loadPatronPage(id);
    const state = $('#patron-wall-state');
    assert.strictEqual(state.length, 1, `${id}: expected #patron-wall-state`);
    assert.ok(state.attr('hidden') !== undefined, `${id}: expected wall state hidden by default`);
    assert.strictEqual($('#patron-wall-retry').length, 1, `${id}: expected retry button`);
    assert.strictEqual($('#patron-wall-invite').length, 1, `${id}: expected empty-wall invite`);
    assert.ok(
      $('#patron-wall-invite').attr('hidden') !== undefined,
      `${id}: expected invite hidden by default`
    );
    assert.strictEqual(
      $('#patron-wall').attr('role'),
      'list',
      `${id}: expected wall to expose role=list`
    );
  }
});

test('patron social tabs expose pressed state for assistive tech', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const tabs = $('#patron-social-tabs button[data-platform]');
    assert.ok(tabs.length >= 7, `${id}: expected social tabs`);
    tabs.each((_, el) => {
      assert.ok(
        $(el).attr('aria-pressed') === 'true' || $(el).attr('aria-pressed') === 'false',
        `${id}: expected aria-pressed on ${$(el).attr('data-platform')} tab`
      );
    });
  }
});

test('every patron page advertises a flat $5/month price', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const pageText = $.text();
    assert.ok(pageText.includes('$5'), `${id}: expected price to include $5`);
    assert.ok(pageText.includes('/month'), `${id}: expected "/month" copy`);
    const otherAmounts = pageText.match(/\$[6-9]|\$1[0-9]/g) || [];
    assert.strictEqual(
      otherAmounts.length,
      0,
      `${id}: expected no other dollar amounts besides $5`
    );
  }
});

test('every patron page has social link tabs and a verified URL input', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const tabs = $('#patron-social-tabs');
    assert.strictEqual(tabs.length, 1, `${id}: expected social tabs container`);
    const buttons = tabs.find('button[data-platform]');
    assert.ok(buttons.length >= 7, `${id}: expected at least 7 social platform tabs`);
    const platforms = buttons.map((_, el) => $(el).attr('data-platform')).get();
    const expected = ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'github', 'website'];
    for (const platform of expected) {
      assert.ok(platforms.includes(platform), `${id}: expected social platform tab ${platform}`);
    }
    assert.strictEqual($('#patron-social-url').length, 1, `${id}: expected social URL input`);
  }
});

test('every patron page has a plaque preview panel', () => {
  for (const id of ids) {
    const $ = loadPatronPage(id);
    assert.strictEqual($('#patron-preview-card').length, 1, `${id}: expected preview card`);
    assert.strictEqual($('#preview-name').length, 1, `${id}: expected preview name`);
    assert.strictEqual($('#preview-amount').length, 1, `${id}: expected preview amount`);
  }
});

test('patron CSS exists, styles the plaque wall, and respects global strip height', () => {
  const cssPath = path.join(__dirname, '..', 'templates', 'flagship', 'patron', 'patron.css');
  assert.ok(fs.existsSync(cssPath), 'expected source patron.css to exist');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('patron-wall'), 'expected .patron-wall styles');
  assert.ok(css.includes('patron-plaque'), 'expected .patron-plaque styles');
  assert.ok(css.includes('patron-seal'), 'expected museum seal styles');
  assert.ok(
    css.includes('global-strip-height'),
    'expected CSS to reference global-strip-height for safe padding'
  );
});

test('patron pages reference the same source CSS/JS versions', () => {
  const cssVersions = new Set();
  const jsVersions = new Set();
  for (const id of ids) {
    const $ = loadPatronPage(id);
    const patronCss = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .find((h) => h.includes('patron.css'));
    const patronJs = $('script[src]')
      .map((_, el) => $(el).attr('src'))
      .get()
      .find((s) => s.includes('patron.js'));
    if (patronCss) cssVersions.add(patronCss.split('?')[1] || 'none');
    if (patronJs) jsVersions.add(patronJs.split('?')[1] || 'none');
  }
  assert.strictEqual(
    cssVersions.size,
    1,
    `expected a single patron.css version across temples, found ${[...cssVersions].join(', ')}`
  );
  assert.strictEqual(
    jsVersions.size,
    1,
    `expected a single patron.js version across temples, found ${[...jsVersions].join(', ')}`
  );
});

if (!process.exitCode) {
  console.log('\n✓ All patron page tests passed');
} else {
  console.log('\n✗ Some patron page tests failed');
  process.exit(1);
}
