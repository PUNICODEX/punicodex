/**
 * PuniCodex — Sponsor pitch render-contract tests.
 *
 * The 2026-11 audit of the Ubisoft pitch found: a literal "undefined" in the
 * offer line, a silent fallback to generic copy when the industry classifier
 * missed a brand name, and the same strategic claim repeated three times.
 * These tests pin the new contract:
 *   1. Fail-closed bespoke gate — no chosen.chosenBecause, no brain reasons,
 *      no custom note → buildPitchEmail THROWS (generic email never ships).
 *   2. Render guards — malformed code rows throw; no "undefined"/"NaN"/
 *      "[object Object]" anywhere in the output.
 *   3. Evidence-led opening — a lead with prospect evidence (Ubisoft) opens
 *      with the specific audit and cites its products.
 *   4. Structure — one "founds the story" argument, no duplicated
 *      foundation bullets, single-frame copy reads clean.
 *
 * Run standalone: node test/sponsor-pitch-render.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pe = require(path.join(root, 'platform', 'api', 'pitch-email.js'));
const brain = require(path.join(root, 'platform', 'api', 'sponsor-brain.js'));

const temple = pe.loadTemple('achilleus');
assert.ok(temple, 'achilleus must resolve');

const EVIDENCE = JSON.parse(
  fs.readFileSync(path.join(root, 'data', 'crawler', 'sponsors', 'prospect-evidence.json'), 'utf8')
);

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

function buildFor(businessName, domain, codeRow, slots) {
  const chosen = brain.explainChosen({ businessName, domain });
  const matchBrain = brain.explainMatch(
    { businessName, domain, industry: chosen.industry || undefined },
    'achilleus'
  );
  return pe.buildPitchEmail({
    codeRow,
    temple,
    businessName,
    recipientSite: domain,
    customNote: '',
    patterns: pe.buildResonanceBullets('achilleus', businessName, chosen.industry || undefined),
    slots,
    brain: matchBrain,
    chosen,
  });
}

const CODE = { code: 'SCOUT-ACHILLEUS-UBISOFT', kind: 'free_months', free_months: 2 };

test('evidence file covers the seeded lead set', () => {
  assert.ok(
    Object.keys(EVIDENCE).length >= 55,
    `expected 55+ evidence entries, got ${Object.keys(EVIDENCE).length}`
  );
  for (const [domain, e] of Object.entries(EVIDENCE)) {
    assert.ok(e.industry && e.chosen, `${domain}: evidence needs industry + chosen`);
    assert.ok(
      Array.isArray(e.evidence) && e.evidence.length >= 1,
      `${domain}: evidence array empty`
    );
  }
});

test('Ubisoft renders bespoke: evidence-led opening, products cited', () => {
  const out = buildFor('Ubisoft', 'ubisoft.com', CODE, [{ name: 'Feathered Box' }]);
  assert.ok(out.text.includes('Why you were chosen'), 'audit missing');
  assert.ok(
    out.text.indexOf('Why you were chosen') < out.text.indexOf('Unicode Pantheon'),
    'the audit must open the letter, not follow the intro'
  );
  assert.ok(/Assassin|Fenyx/.test(out.text), 'Ubisoft evidence (its actual games) not cited');
  assert.ok(/Assassin|Fenyx/.test(out.html), 'HTML body missing the evidence');
});

test('render guards: malformed code rows throw, never emit placeholder debris', () => {
  assert.throws(
    () => buildFor('Ubisoft', 'ubisoft.com', { code: 'X', kind: 'free_months' }, null),
    /free_months/,
    'missing free_months must throw'
  );
  const out = buildFor('Ubisoft', 'ubisoft.com', CODE, [{ name: 'Feathered Box' }]);
  for (const bad of ['undefined', 'NaN', '[object Object]']) {
    assert.ok(!out.text.includes(bad), `text contains "${bad}"`);
    assert.ok(!out.html.includes(bad), `html contains "${bad}"`);
  }
});

test('fail-closed bespoke gate: a generic lead throws without a note', () => {
  assert.throws(
    () =>
      pe.buildPitchEmail({
        codeRow: CODE,
        temple,
        businessName: 'Acme Corp',
        recipientSite: 'acme.example',
        customNote: '',
        patterns: [],
        slots: null,
        brain: { reasons: [] },
        chosen: brain.explainChosen({ businessName: 'Acme Corp', domain: 'acme.example' }),
      }),
    /no bespoke material/,
    'generic pitch must refuse to build'
  );
  // The custom-note escape hatch must satisfy the gate.
  const out = pe.buildPitchEmail({
    codeRow: CODE,
    temple,
    businessName: 'Acme Corp',
    recipientSite: 'acme.example',
    customNote: 'We noticed your spring collection leans on Achilles iconography.',
    patterns: [],
    slots: null,
    brain: { reasons: [] },
    chosen: brain.explainChosen({ businessName: 'Acme Corp', domain: 'acme.example' }),
  });
  assert.ok(out.text.includes('Acme Corp'), 'escape-hatch render failed');
});

test('structure: the foundation argument appears exactly once per surface', () => {
  const out = buildFor('Ubisoft', 'ubisoft.com', CODE, [{ name: 'Feathered Box' }]);
  const count = (s, re) => (s.match(re) || []).length;
  assert.strictEqual(
    count(out.text, /founds? the story|foundation/gi) <= 3,
    true,
    'text over-repeats the foundation argument'
  );
  assert.strictEqual(
    count(out.html, /campaigns are missing/gi),
    0,
    'duplicated foundation bullet resurrected'
  );
  assert.ok(/the Feathered Box frame/.test(out.text), 'single-frame copy broken');
});

test('the resonance bullet names the PROSPECT industry, never the temple top seat', () => {
  const out = buildFor('Ubisoft', 'ubisoft.com', CODE, [{ name: 'Feathered Box' }]);
  assert.ok(/Gaming, Fantasy/.test(out.html), 'Ubisoft (gaming) must see the gaming seat lead');
  assert.ok(
    !/names Defense, Military & Security among its aligned industries: [^<]*Ubisoft is not adjacent/.test(
      out.html
    ),
    'the "practises it" claim must never attach to the wrong industry'
  );
});

test('all evidence-covered leads resolve an industry and a chosenBecause', () => {
  for (const [domain, e] of Object.entries(EVIDENCE)) {
    const name = e.chosen.split(' ')[0];
    const c = brain.explainChosen({ businessName: name, domain });
    assert.ok(
      c.chosenBecause && c.chosenBecause.length > 60,
      `${domain}: chosenBecause unresolved`
    );
    assert.ok(c.evidenceLine, `${domain}: evidence line missing`);
  }
});

test('ALL evidence-covered leads render bespoke, debris-free, and industry-correct', () => {
  const scout = require(path.join(root, 'data', 'crawler', 'sponsors', 'scout-report.json'));
  const patterns = require(path.join(root, 'platform', 'api', 'industry-patterns.json'));
  const byDomain = {};
  for (const [t, arr] of Object.entries(scout.temples || {}))
    for (const l of arr || []) byDomain[l.domain] = t;

  const CODE_ROW = { code: 'SCOUT-AUDIT-CODE', kind: 'free_months', free_months: 2 };
  let audited = 0;
  for (const [domain, e] of Object.entries(EVIDENCE)) {
    // The temple comes from the evidence (namesake tracks) or the scout
    // report; exactly one must answer — a lead with no temple cannot be
    // pitched and must fail here.
    const slug = e.temple || byDomain[domain];
    assert.ok(slug, `${domain}: no temple (set evidence.temple or scout the lead)`);
    const temple = pe.loadTemple(slug);
    assert.ok(temple, `${domain}: temple ${slug} unresolved`);
    const name = e.chosen.split(' ')[0].replace(/[.,]/g, '');
    const chosen = brain.explainChosen({ businessName: name, domain });
    const out = pe.buildPitchEmail({
      codeRow: CODE_ROW,
      temple,
      businessName: name,
      recipientSite: domain,
      customNote: '',
      patterns: pe.buildResonanceBullets(slug, name, chosen.industry || undefined),
      slots: [{ name: 'Feathered Box' }],
      brain: brain.explainMatch(
        { businessName: name, domain, industry: chosen.industry || undefined },
        slug
      ),
      chosen,
    });
    assert.ok(
      chosen.chosenBecause && out.text.includes('Why you were chosen'),
      `${domain}: not bespoke`
    );
    assert.ok(out.text.includes('Proof, not praise'), `${domain}: evidence not cited`);
    for (const bad of ['undefined', 'NaN', '[object Object]']) {
      assert.ok(!out.text.includes(bad) && !out.html.includes(bad), `${domain}: debris "${bad}"`);
    }
    // When the "practises it" claim appears, it must attach to THEIR industry.
    const claim = out.html.match(
      /names ([^<]+?) among its aligned industries: [^<]*?[\w.'’ -]+? is not adjacent/
    );
    if (claim) {
      const group = patterns.industries.find((g) => g.industry === e.industry);
      const groupLead = group ? group.name.split(/[,&]/)[0].trim().split(' ')[0] : null;
      assert.ok(
        !groupLead || claim[1].includes(groupLead),
        `${domain}: "practises it" attaches to "${claim[1]}" but ${name} is ${e.industry}`
      );
    }
    audited++;
  }
  assert.ok(audited >= 55, `expected 55+ audited leads, got ${audited}`);
});

console.log(`\nSponsor Pitch Render: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
