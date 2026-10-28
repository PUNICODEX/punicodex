/**
 * Sponsor Brain tests.
 *
 * The cross-pattern engine that matches modern businesses to temples along
 * namesake, industry-seat, and keyword+lore axes, and explains every match in
 * sendable words. These tests pin the famous namesake cases (Nike, Hermès,
 * Mars, GE), the archetype-over-coincidence tiebreak (a winery belongs to
 * Dionysos, not to a brewery that merely lists wine), and the dynamic
 * pantheon stats that keep pitch copy honest.
 */

const assert = require('node:assert');
const test = require('node:test');

const {
  matchTemplesForBusiness,
  explainMatch,
  normalize,
  nameTokens,
  domainSld,
  pantheonStats,
} = require('../platform/api/sponsor-brain.js');

test('normalize strips diacritics, case, and punctuation', () => {
  assert.strictEqual(normalize('Níkē, Inc.'), 'nike inc');
  assert.strictEqual(normalize('Hermès International'), 'hermes international');
  assert.strictEqual(normalize('Quetzalcōātl'), 'quetzalcoatl');
});

test('nameTokens drops corporate suffixes and stopwords', () => {
  assert.deepStrictEqual(nameTokens('Nike, Inc.'), ['nike']);
  assert.deepStrictEqual(nameTokens('Mars, Incorporated'), ['mars']);
  assert.deepStrictEqual(nameTokens('The General Electric Company'), ['general', 'electric']);
});

test('domainSld extracts the registrable label', () => {
  assert.strictEqual(domainSld('https://www.ge.com/about'), 'ge');
  assert.strictEqual(domainSld('nike.com'), 'nike');
  assert.strictEqual(domainSld(''), '');
});

test('Nike, Inc. matches the Temple of Níkē as a namesake', () => {
  const matches = matchTemplesForBusiness({
    businessName: 'Nike, Inc.',
    domain: 'nike.com',
    industry: 'Sports, Fitness & Competition',
  });
  assert.strictEqual(matches[0].slug, 'nike');
  assert.strictEqual(matches[0].namesake, true);
  assert.ok(matches[0].score >= 100);
  assert.ok(
    matches[0].reasons.some((r) => r.type === 'namesake'),
    'namesake reason present'
  );
  assert.ok(
    matches[0].reasons.some((r) => r.type === 'industry'),
    'industry-seat reason present too'
  );
});

test('Hermès International matches Hermês despite the accent', () => {
  const matches = matchTemplesForBusiness({
    businessName: 'Hermès International',
    domain: 'hermes.com',
  });
  assert.strictEqual(matches[0].slug, 'hermes');
  assert.strictEqual(matches[0].namesake, true);
});

test('Mars, Incorporated matches Mārs', () => {
  const matches = matchTemplesForBusiness({
    businessName: 'Mars, Incorporated',
    domain: 'mars.com',
    industry: 'Food & Hospitality',
  });
  assert.strictEqual(matches[0].slug, 'mars');
  assert.strictEqual(matches[0].namesake, true);
});

test('General Electric matches Gē via its domain, with the domain-specific copy', () => {
  const matches = matchTemplesForBusiness({
    businessName: 'General Electric',
    domain: 'ge.com',
    industry: 'Energy & Natural World',
  });
  assert.strictEqual(matches[0].slug, 'ge');
  assert.strictEqual(matches[0].namesake, true);
  assert.ok(/address/i.test(matches[0].reasons[0].lead), 'domain-match copy, not name-match copy');
});

test('a winery belongs to Dionysos — lore beats the industry coincidence', () => {
  const matches = matchTemplesForBusiness({
    businessName: 'Stellar Estates Winery',
    domain: 'stellarestates.com',
    industry: 'Wine, Brewing & Hospitality',
    keywords: ['wine', 'vineyard', 'celebration'],
  });
  assert.strictEqual(matches[0].slug, 'dionysos');
  const loreReason = matches[0].reasons.find((r) => r.type === 'keyword');
  assert.ok(/mythology/.test(loreReason.why), 'keyword reason carries the lore depth');
});

test('explainMatch NEVER returns zero reasons for a real business — it composes the archetypal case', () => {
  const nike = explainMatch(
    { businessName: 'Nike, Inc.', domain: 'nike.com', industry: 'Sports, Fitness & Competition' },
    'nike'
  );
  assert.strictEqual(nike.namesake, true);
  assert.ok(nike.reasons.length >= 1);
  assert.strictEqual(nike.strength, 'namesake');
  assert.strictEqual(nike.bestMatch.slug, 'nike');

  // A business with no direct signal still gets an honest, composed reason.
  const unrelated = explainMatch({ businessName: 'Acme Corp', domain: 'acme.com' }, 'nike');
  assert.ok(unrelated.reasons.length >= 1, 'the brain always finds the thread');
  assert.strictEqual(unrelated.namesake, false);
  assert.strictEqual(unrelated.strength, 'archetypal');
  assert.ok(/Níkē/.test(unrelated.reasons[0].why), 'composed reason names the temple');
  assert.ok(
    /tagline|Winged/i.test(unrelated.reasons[0].why),
    'composed reason carries the temple voice'
  );

  // Only a literally empty business gets nothing.
  const empty = explainMatch({}, 'nike');
  assert.strictEqual(empty.reasons.length, 0);
  assert.strictEqual(empty.strength, 'none');
});

test('never-zero property: arbitrary businesses against arbitrary temples always explain', () => {
  const cases = [
    [{ businessName: 'Blue River Logistics', industry: 'Shipping & Logistics' }, 'tethys'],
    [{ businessName: 'Ironhold Security', keywords: ['protection', 'strength'] }, 'tyche'],
    [{ businessName: 'Lumen Skincare', keywords: ['beauty', 'radiance'] }, 'hephaistos'],
    [{ businessName: 'Verdant Farms', industry: 'Agriculture' }, 'prometheus'],
  ];
  for (const [business, slug] of cases) {
    const result = explainMatch(business, slug);
    assert.ok(result.reasons.length >= 1, `${JSON.stringify(business)} → ${slug} explained itself`);
    assert.ok(result.reasons[0].why.length >= 80, 'substantive copy, not a stub');
    assert.match(result.strength, /^(namesake|direct|archetypal)$/);
  }
});

test('values layer: a keyword that IS the temple meaning scores and explains', () => {
  const matches = matchTemplesForBusiness(
    { businessName: 'WinCo Athletica', keywords: ['victory'] },
    3
  );
  assert.strictEqual(matches[0].slug, 'nike');
  assert.ok(matches[0].axes.values, 'values axis fired');
  assert.ok(matches[0].reasons.some((r) => r.type === 'values'));
});

test('name-fuzzy layer: a derived brand name finds its root temple', () => {
  // "Nikea" genuinely contains "nike" — linguistically derived names point home.
  const matches = matchTemplesForBusiness({ businessName: 'Nikea Athletics' }, 3);
  assert.strictEqual(matches[0].slug, 'nike');
  assert.ok(matches[0].axes.nameFuzzy, 'fuzzy name axis fired');
});

test('pantheon stats are live from the canonical sources', () => {
  const stats = pantheonStats();
  assert.ok(stats.temples > 500, `expected 500+ temples, got ${stats.temples}`);
  assert.ok(stats.flagships > 500, `expected 500+ flagships, got ${stats.flagships}`);
  assert.ok(stats.pantheons >= 20, `expected 20+ pantheons, got ${stats.pantheons}`);
  // The old pitch copy claimed 271 — never let the count go stale again.
  assert.ok(stats.flagships > 271, 'flagship count must exceed the stale 271 figure');
});

test('every returned reason is sendable copy: short lead, substantive why', () => {
  const matches = matchTemplesForBusiness(
    { businessName: 'Nike, Inc.', domain: 'nike.com', industry: 'Sports, Fitness & Competition' },
    3
  );
  for (const m of matches) {
    for (const r of m.reasons) {
      assert.ok(r.lead.length <= 60, `lead too long: ${r.lead}`);
      assert.ok(r.why.length >= 80, `why too thin: ${r.why.slice(0, 40)}…`);
      assert.ok(r.why.length <= 600, `why too long (${r.why.length})`);
      assert.ok(!/<[a-z][^>]*>/i.test(r.lead + r.why), 'no HTML in reasons');
    }
  }
});
