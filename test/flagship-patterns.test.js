/**
 * PuniCodex — Flagship Patterns Tab Tests
 *
 * Guards the industry-pattern system end to end:
 *   1. Canonical dataset schema — valid sectors, ids, weights, justifications.
 *   2. Coverage — every built flagship has at least one primary (weight 2)
 *      industry, and every industry node has at least two members so the
 *      cross-link legend is never empty.
 *   3. Generated graph JSON — platform/api and renderer copies are identical
 *      and internally consistent with the canonical source.
 *   4. Generated Patterns pages — all 196 exist, embed a parseable
 *      window.TEMPLE_PATTERNS payload consistent with the graph, and ship
 *      the graph assets (patterns.css / patterns.js).
 *   5. Tab placement — Patterns sits after Extended and before Scholars in
 *      both desktop and mobile navs on every tabbed flagship page.
 *   6. Cross-links — every member referenced by a payload resolves to a real
 *      temple page (patterns page for flagships, base temple otherwise).
 *
 * Run standalone: node test/flagship-patterns.test.js
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const { INDUSTRY_SECTORS, INDUSTRY_GROUPS } = require(
  path.join(ROOT, 'type', 'js', 'industry-patterns.js')
);

const BUILT = ARCHETYPES.filter((a) => a.built);
const BUILT_IDS = BUILT.map((a) => a.id);
const BUILT_SET = new Set(BUILT_IDS);
const LEXICON_SET = new Set(LEXICON.map((e) => e.id));

const TABBED_PAGES = [
  'index.html',
  'lore/index.html',
  'gallery/index.html',
  'scholars/index.html',
  'creatives/index.html',
  'patron/index.html',
  'patterns/index.html',
];

let assertions = 0;
function ok(cond, msg) {
  assertions++;
  assert.ok(cond, msg);
}

/* ------------------------------------------------------------------ */
/* 1. Canonical dataset schema                                        */
/* ------------------------------------------------------------------ */

function auditSchema() {
  const sectorIds = new Set(INDUSTRY_SECTORS.map((s) => s.id));
  ok(INDUSTRY_SECTORS.length >= 5, 'expected at least 5 industry sectors');
  for (const s of INDUSTRY_SECTORS) {
    ok(s.id && s.name && /^#[0-9a-fA-F]{6}$/.test(s.color), `sector ${s.id} has id/name/hex color`);
  }

  const industryIds = new Set();
  for (const g of INDUSTRY_GROUPS) {
    ok(!industryIds.has(g.industry), `duplicate industry id "${g.industry}"`);
    industryIds.add(g.industry);
    ok(sectorIds.has(g.sector), `industry "${g.industry}" references unknown sector "${g.sector}"`);
    ok(typeof g.name === 'string' && g.name.length > 3, `industry "${g.industry}" has a name`);
    ok(
      typeof g.tagline === 'string' && g.tagline.length > 10,
      `industry "${g.industry}" has a tagline`
    );
    ok(
      typeof g.note === 'string' && g.note.length > 30,
      `industry "${g.industry}" has a justification note`
    );
    ok(
      Array.isArray(g.entries) && g.entries.length >= 2,
      `industry "${g.industry}" has >= 2 members (cross-links required)`
    );
    ok(
      g.entries.some((e) => e.weight === 2),
      `industry "${g.industry}" has at least one primary member`
    );
    const seen = new Set();
    for (const e of g.entries) {
      ok(LEXICON_SET.has(e.id), `industry "${g.industry}" member "${e.id}" exists in the lexicon`);
      ok(
        e.weight === 1 || e.weight === 2,
        `industry "${g.industry}" member "${e.id}" weight is 1 or 2`
      );
      ok(!seen.has(e.id), `industry "${g.industry}" lists "${e.id}" twice`);
      seen.add(e.id);
      if (e.why !== undefined) {
        ok(
          typeof e.why === 'string' && e.why.length > 15,
          `industry "${g.industry}" member "${e.id}" why is substantive`
        );
      }
    }
  }
  for (const s of INDUSTRY_SECTORS) {
    ok(
      INDUSTRY_GROUPS.some((g) => g.sector === s.id),
      `sector "${s.id}" is used by at least one industry`
    );
  }
}

/* ------------------------------------------------------------------ */
/* 2. Flagship coverage                                               */
/* ------------------------------------------------------------------ */

function auditCoverage() {
  const weightsByEntry = new Map();
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      if (!weightsByEntry.has(e.id)) weightsByEntry.set(e.id, []);
      weightsByEntry.get(e.id).push(e.weight);
    }
  }
  for (const id of BUILT_IDS) {
    ok(weightsByEntry.has(id), `flagship "${id}" is covered by the industry-pattern map`);
    ok(
      weightsByEntry.get(id).includes(2),
      `flagship "${id}" has at least one primary (weight 2) industry`
    );
  }
  // Members that are not flagships must still have a base temple page.
  for (const [id] of weightsByEntry) {
    if (!BUILT_SET.has(id)) {
      ok(
        fs.existsSync(path.join(ROOT, 'sites', id, 'index.html')),
        `non-flagship member "${id}" has a base temple page to cross-link to`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* 3. Generated graph JSON consistency                                */
/* ------------------------------------------------------------------ */

function loadGenerated() {
  const apiPath = path.join(ROOT, 'platform', 'api', 'industry-patterns.json');
  const rendererPath = path.join(ROOT, 'platform', 'browser', 'renderer', 'industry-patterns.json');
  ok(fs.existsSync(apiPath), 'platform/api/industry-patterns.json exists (run npm run generate)');
  ok(
    fs.existsSync(rendererPath),
    'platform/browser/renderer/industry-patterns.json exists (run npm run generate)'
  );
  return {
    api: JSON.parse(fs.readFileSync(apiPath, 'utf8')),
    renderer: JSON.parse(fs.readFileSync(rendererPath, 'utf8')),
  };
}

function auditGenerated() {
  const { api, renderer } = loadGenerated();
  assert.deepStrictEqual(renderer, api, 'renderer and API industry-pattern graphs are identical');
  assertions++;

  const { meta, sectors, industries, byEntry } = renderer;
  ok(meta.industryCount === industries.length, 'meta.industryCount matches industries length');
  ok(meta.sectorCount === sectors.length, 'meta.sectorCount matches sectors length');
  ok(meta.entryCount === Object.keys(byEntry).length, 'meta.entryCount matches byEntry keys');

  // Canonical ↔ generated agreement.
  const canonicalIndustries = new Set(INDUSTRY_GROUPS.map((g) => g.industry));
  ok(
    industries.length === canonicalIndustries.size &&
      industries.every((g) => canonicalIndustries.has(g.industry)),
    'generated industries match the canonical set'
  );
  for (const g of industries) {
    const canonical = INDUSTRY_GROUPS.find((c) => c.industry === g.industry);
    ok(canonical, `generated industry "${g.industry}" has a canonical group`);
    ok(
      g.members.length === canonical.entries.length,
      `generated "${g.industry}" member count matches canonical`
    );
    for (const m of g.members) {
      const src = canonical.entries.find((e) => e.id === m.id);
      ok(
        src && src.weight === m.weight,
        `generated "${g.industry}" member "${m.id}" weight matches canonical`
      );
      ok(
        m.unicode && m.pantheonLabel && m.why,
        `generated "${g.industry}" member "${m.id}" carries display fields`
      );
    }
    // Sorted by weight desc then id — the donut depends on deterministic order.
    const sorted = [...g.members].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    assert.deepStrictEqual(
      g.members.map((m) => m.id),
      sorted.map((m) => m.id),
      `generated "${g.industry}" members are deterministically sorted`
    );
    assertions++;
  }
  for (const id of BUILT_IDS) {
    ok(
      Array.isArray(byEntry[id]) && byEntry[id].length > 0,
      `generated byEntry covers flagship "${id}"`
    );
  }
}

/* ------------------------------------------------------------------ */
/* 4. Generated Patterns pages                                        */
/* ------------------------------------------------------------------ */

function extractPayload(html, _id) {
  const marker = 'window.TEMPLE_PATTERNS = ';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const end = html.indexOf('</script>', jsonStart);
  if (end === -1) return null;
  const raw = html.slice(jsonStart, end).trim().replace(/;$/, '');
  // The generator escapes "</" as "<\/" for safe embedding.
  return JSON.parse(raw.replace(/<\\\//g, '</'));
}

function auditPages(renderer) {
  for (const id of BUILT_IDS) {
    const pagePath = path.join(ROOT, 'sites', id, 'patterns', 'index.html');
    ok(fs.existsSync(pagePath), `sites/${id}/patterns/index.html exists`);
    const html = fs.readFileSync(pagePath, 'utf8');

    ok(
      /<title>[^<]*Patterns[^<]*<\/title>/i.test(html),
      `sites/${id}/patterns has a Patterns title`
    );
    ok(html.includes('rel="canonical"'), `sites/${id}/patterns declares a canonical link`);
    ok(html.includes('patterns.css'), `sites/${id}/patterns references patterns.css`);
    ok(html.includes('patterns.js'), `sites/${id}/patterns references patterns.js`);

    const payload = extractPayload(html, id);
    ok(payload, `sites/${id}/patterns embeds a parseable TEMPLE_PATTERNS payload`);
    ok(payload.id === id, `sites/${id}/patterns payload id matches`);
    ok(payload.unicode && payload.pantheon, `sites/${id}/patterns payload carries identity fields`);
    ok(
      Array.isArray(payload.sectors) && payload.sectors.length > 0,
      `sites/${id}/patterns payload has sectors`
    );
    ok(
      Array.isArray(payload.industries) && payload.industries.length > 0,
      `sites/${id}/patterns payload has industries`
    );

    // Payload industries must mirror the generated graph for this entry.
    const expected = renderer.byEntry[id];
    const payloadIds = payload.industries.map((i) => i.industry).sort();
    const expectedIds = expected.map((i) => i.industry).sort();
    assert.deepStrictEqual(
      payloadIds,
      expectedIds,
      `sites/${id}/patterns payload industries match the generated graph`
    );
    assertions++;

    for (const ind of payload.industries) {
      ok(
        ind.weight === 1 || ind.weight === 2,
        `sites/${id}/patterns industry "${ind.industry}" has a weight`
      );
      ok(
        payload.sectors.some((s) => s.id === ind.sector),
        `sites/${id}/patterns industry "${ind.industry}" sector is present in payload sectors`
      );
      ok(
        Array.isArray(ind.members) && ind.members.length >= 2,
        `sites/${id}/patterns industry "${ind.industry}" has cross-linked members`
      );
      for (const m of ind.members) {
        ok(
          m.id && m.unicode && typeof m.hasFlagship === 'boolean',
          `sites/${id}/patterns member "${m.id}" has display fields`
        );
      }
    }

    for (const asset of ['patterns.css', 'patterns.js']) {
      const assetPath = path.join(ROOT, 'sites', id, 'patterns', asset);
      ok(
        fs.existsSync(assetPath) && fs.statSync(assetPath).size > 1024,
        `sites/${id}/patterns/${asset} exists and is non-trivial`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Tab placement across every tabbed flagship page                 */
/* ------------------------------------------------------------------ */

function navLabels(html) {
  const labels = [];
  const re = /class="nav-link[^"]*">([^<]+)</g;
  let m;
  while ((m = re.exec(html)) !== null) labels.push(m[1].trim());
  return labels;
}

function auditTabPlacement() {
  for (const id of BUILT_IDS) {
    for (const sub of TABBED_PAGES) {
      const pagePath = path.join(ROOT, 'sites', id, sub);
      ok(fs.existsSync(pagePath), `sites/${id}/${sub} exists`);
      const html = fs.readFileSync(pagePath, 'utf8');
      const labels = navLabels(html);
      // Desktop and mobile navs each repeat the tab list.
      const extendedIdxs = labels.reduce((acc, l, i) => (l === 'Extended' ? [...acc, i] : acc), []);
      const patternsIdxs = labels.reduce((acc, l, i) => (l === 'Patterns' ? [...acc, i] : acc), []);
      const scholarsIdxs = labels.reduce((acc, l, i) => (l === 'Scholars' ? [...acc, i] : acc), []);
      ok(
        extendedIdxs.length >= 2,
        `sites/${id}/${sub} shows the Extended tab in desktop and mobile navs`
      );
      ok(
        patternsIdxs.length >= 2,
        `sites/${id}/${sub} shows the Patterns tab in desktop and mobile navs`
      );
      ok(
        scholarsIdxs.length >= 2,
        `sites/${id}/${sub} shows the Scholars tab in desktop and mobile navs`
      );
      for (
        let k = 0;
        k < Math.min(extendedIdxs.length, patternsIdxs.length, scholarsIdxs.length);
        k++
      ) {
        ok(
          extendedIdxs[k] < patternsIdxs[k] && patternsIdxs[k] < scholarsIdxs[k],
          `sites/${id}/${sub} nav order is Extended < Patterns < Scholars (instance ${k + 1})`
        );
      }
      // The active tab on each page is exactly itself.
      if (sub === 'patterns/index.html') {
        ok(
          html.includes('nav-link active">Patterns<'),
          `sites/${id}/patterns marks Patterns as the active tab`
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 6. Cross-link resolution                                           */
/* ------------------------------------------------------------------ */

function auditCrossLinks(renderer) {
  const checked = new Set();
  for (const g of renderer.industries) {
    for (const m of g.members) {
      const key = `${m.id}:${BUILT_SET.has(m.id)}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (BUILT_SET.has(m.id)) {
        ok(
          fs.existsSync(path.join(ROOT, 'sites', m.id, 'patterns', 'index.html')),
          `cross-link target flagship "${m.id}" has a patterns page (referenced by "${g.industry}")`
        );
      } else {
        ok(
          fs.existsSync(path.join(ROOT, 'sites', m.id, 'index.html')),
          `cross-link target "${m.id}" has a base temple page (referenced by "${g.industry}")`
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ */

function main() {
  console.log('Flagship Patterns Tests');
  auditSchema();
  console.log('  ✓ canonical dataset schema');
  auditCoverage();
  console.log('  ✓ flagship coverage (all built flagships have a primary industry)');
  const { renderer } = loadGenerated();
  auditGenerated();
  console.log('  ✓ generated graph JSON consistent with canonical source');
  auditPages(renderer);
  console.log('  ✓ all 196 patterns pages embed valid graph payloads');
  auditTabPlacement();
  console.log('  ✓ Patterns tab placed after Extended, before Scholars (desktop + mobile)');
  auditCrossLinks(renderer);
  console.log('  ✓ every industry member cross-link resolves to a real temple');
  console.log(`\n${assertions} assertions passed`);
}

main();
