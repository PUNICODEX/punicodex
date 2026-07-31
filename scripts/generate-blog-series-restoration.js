#!/usr/bin/env node
/**
 * PuniCodex — The Restoration Files (series generator)
 *
 * Writes platform/blog/series/restoration/{id}.json for every built flagship:
 * a second, editorial-series post per temple — the story of the name's
 * restoration, the temple it lives in, the archetype's real-world resonance,
 * and its seat in the sacred texts. Content is synthesized from the canonical
 * sources (lexicon, lore-catalog, industry patterns, original scripts, texts
 * registry), so every post carries the same scholarship as the temple itself.
 *
 * Usage:
 *   node scripts/generate-blog-series-restoration.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'restoration');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { getOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const LORE = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const PATTERNS = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));
const TEXTS = require(path.join(ROOT, 'platform', 'texts', 'registry.json'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

// ── Deterministic per-entry variation ───────────────────────────────────────

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(id, salt, arr) {
  return arr[(hashId(id) + salt * 2654435761) % arr.length];
}

// ── Pantheon → sacred texts (the primary-source family of the tradition) ────

const TEXT_BY_PANTHEON = {
  greek: ['theogony', 'homeric-hymns', 'works-and-days'],
  roman: ['metamorphoses'],
  norse: ['poetic-edda', 'prose-edda'],
  egyptian: ['book-of-the-dead'],
  mesopotamian: ['enuma-elish', 'gilgamesh'],
  canaanite: ['enuma-elish'],
  zoroastrian: ['avesta'],
  sanskrit: ['rig-veda', 'ramayana'],
  hindu: ['rig-veda', 'ramayana'],
  buddhist: ['lotus-sutra', 'sukhavativyuha'],
  japanese: ['kojiki', 'nihon-shoki'],
  polynesian: ['kumulipo', 'polynesian-mythology'],
  taoist: ['tao-te-ching'],
  chinese: ['tao-te-ching'],
  yoruba: ['nigerian-studies'],
  abrahamic: ['bible-kjv'],
};
const TEXT_TITLE = new Map(TEXTS.texts.map((t) => [t.id, t.title]));

function displayPantheon(p) {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
}

function stripHtml(h) {
  return String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentences(text, n) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return parts.slice(0, n).join(' ').trim();
}

// The hook's narrative: the lore-catalog lead plus the opening of the first
// recorded myth — real prose from the temple's own record.
function loreProse(lore) {
  if (!lore || !lore.mythology) return '';
  const lead = stripHtml(lore.mythology.lead);
  const myths = lore.mythology.myths || [];
  if (myths.length === 0) return lead;
  const tale = firstSentences(stripHtml(myths[0].text), 2);
  if (!tale) return lead;
  return `${lead} ${tale}`.trim();
}

function wordCount(md) {
  return md.split(/\s+/).filter(Boolean).length;
}

// ── Title formulas (structure varies by entry, never one mold) ──────────────

function makeTitle(id, entry, lore) {
  const u = entry.unicode;
  const domain = (entry.domain || '').toLowerCase();
  const formulas = [
    () => `Inside the ${u} restoration: what the marks recover`,
    () => `${u}, spelled the way the sources wrote it`,
    () => `The ${u} file: from ${entry.ascii} to the temple it became`,
    () => `Why ${u} is spelled that way — and what it costs to get it right`,
    () => `${u}: the restoration, the temple, and the world it opens`,
    () => `Reading ${u} the way it was meant to be written`,
  ];
  // Domain-flavored specials for the big forces.
  if (/thunder|storm|lightning/.test(domain)) {
    formulas.push(() => `${u}: the storm, spelled correctly at last`);
  }
  if (/sea|ocean|water/.test(domain)) {
    formulas.push(() => `${u}: every wave of the name, restored`);
  }
  if (/wisdom|knowledge|writing|poetry/.test(domain)) {
    formulas.push(() => `${u} and the archive of the exact word`);
  }
  if (/death|underworld/.test(domain)) {
    formulas.push(() => `${u}: what the underworld keeps spelled right`);
  }
  return pick(id, 11, formulas)();
}

function makeDescription(entry) {
  const u = entry.unicode;
  const domain = (entry.domain || 'mythic domains').toLowerCase();
  const templates = [
    `The Restoration Files: ${u} — the philology of the name, the temple it lives in, and the ${domain} it carries into the modern web.`,
    `${u}, restored: the evidence behind the spelling, the temple behind the domain, and why ${domain} still matters.`,
    `How ${u} was restored mark by mark — and the temple, texts, and industries the name now commands.`,
  ];
  return pick(entry.id, 23, templates);
}

// ── Body sections ───────────────────────────────────────────────────────────

function sectionHook(entry, lore) {
  const u = entry.unicode;
  const myth = loreProse(lore);
  const openers = [
    `Every name in this series was once flattened to fit a keyboard. **${u}** is what the evidence put back.`,
    `Some restorations are cosmetic. **${u}** is not — the marks in this name are the difference between reading the sources and guessing at them.`,
    `The domain you're reading about exists because someone refused to let **${u}** stay *${entry.ascii}*.`,
    `There is a version of this name the early internet had to settle for: *${entry.ascii}*. This is the file on how **${u}** replaced it.`,
  ];
  const opener = pick(entry.id, 31, openers);
  return `${opener}\n\n${myth ? `${myth}\n\n` : ''}That is the figure this file is about — and the temple now standing at its restored name.`;
}

function sectionAtAGlance(entry, archetype, script) {
  const rows = [
    `- **Restored name:** ${entry.unicode}`,
    `- **ASCII form:** ${entry.ascii}`,
    `- **Meaning:** "${entry.meaning || 'See the temple record'}"`,
    `- **Domain of influence:** ${entry.domain || 'Mythic'}`,
    `- **Pantheon:** ${displayPantheon(entry.pantheon)}`,
    `- **Classification:** ${entry.tierLabel || `Tier ${entry.tier || '2'}`}`,
    `- **Original script:** ${script}`,
    `- **Series:** The Restoration Files, No. ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length}`,
  ];
  return `## At a Glance\n\n${rows.join('\n')}`;
}

function sectionPhilology(entry, script) {
  const u = entry.unicode;
  const marks = (entry.breakdown || []).filter((b) => b.type === 'stress' || b.type === 'length');
  const lines = [];
  lines.push('## The Name Before the Marks');
  lines.push('');
  if (entry.greek && entry.greek !== '—') {
    lines.push(`The name is attested as **${entry.greek}**. ${entry.meaning ? `On the evidence, it means "${entry.meaning}".` : ''}`);
    lines.push('');
  }
  if (marks.length > 0) {
    lines.push(
      `Strip **${u}** to *${entry.ascii}* and ${marks.length === 1 ? 'one piece of evidence vanishes' : `${marks.length} pieces of evidence vanish`}:`
    );
    lines.push('');
    for (const m of marks) {
      const what = m.type === 'stress' ? 'the stress position' : 'the vowel length';
      lines.push(`- **${m.char} → ${m.to}** — ${m.note}: ${what} the ASCII form cannot show.`);
    }
    lines.push('');
    const closers = [
      `None of these marks is decoration. Each one is a fact about how the name was spoken, and each one is checkable against the scholarly record the temple cites.`,
      `A reader who knows the marks hears the name correctly on the first try. A reader who never sees them never gets the chance.`,
      `These are the small, provable things a restoration is made of: not taste, not branding — attestation.`,
    ];
    lines.push(pick(entry.id, 41, closers));
  } else {
    lines.push(
      `**${u}** preserves its form without added diacritics: the restoration here is the exactness of the spelling itself, the form the tradition's own sources record. *${entry.ascii}* and **${u}** may look interchangeable to a search box; they are not interchangeable to a philologist.`
    );
  }
  return lines.join('\n');
}

function sectionTemple(entry, archetype) {
  const u = entry.unicode;
  const id = entry.id;
  const tier = entry.tier;
  const tierText =
    tier === 'dual'
      ? 'The name carries both stress and vowel length, and more than one historically valid spelling survives — so the temple presents the pair as a dual-tier restoration, the rarest class in the lexicon.'
      : tier === '1'
        ? 'The restoration preserves more than the ASCII form can say — stress, length, or a letter the Latin keyboard lost — which places it in Tier-1: mechanically verifiable, information-rich.'
        : 'The restoration preserves one decisive feature the ASCII form drops — a single, honest mark — which places it in Tier-2: exact, and exactly labeled.';
  return `## The Temple That Stands Now

The restored name is not a plaque; it is an address. The temple of **${u}** lives at [/sites/${id}/](/sites/${id}/), with its mythology in the [lore halls](/sites/${id}/lore/), its peer-reviewed record in the [Scholarly Edition](/sites/${id}/scholars/), and its place in the pattern atlas on the [patterns floor](/sites/${id}/patterns/).

${tierText}

Every flagship temple is hand-built to the same standard: the original script displayed with its provenance, the pronunciation reconstructed phoneme by phoneme, the sources named — because a restoration you cannot audit is just a spelling with confidence.`;
}

function sectionIndustries(entry) {
  const seats = (PATTERNS.byEntry[entry.id] || []).slice().sort((a, b) => b.weight - a.weight).slice(0, 3);
  if (seats.length === 0) {
    return `## The Archetype at Work

Not every restoration has been mapped to the modern economy yet. When this one is, it will appear — with its reasoning open to challenge — in the [pattern atlas](/patterns/).`;
  }
  const lines = [];
  lines.push('## The Archetype at Work');
  lines.push('');
  lines.push(
    `A temple is also a reading of what this figure *means* — and meanings have addresses in the modern world. The [pattern atlas](/patterns/) maps **${entry.unicode}** to the industries its archetype genuinely resonates with, each match argued, weighted, and open to challenge:`
  );
  lines.push('');
  for (const s of seats) {
    lines.push(`- **${s.name}** — ${s.why}`);
  }
  lines.push('');
  lines.push(
    pick(entry.id, 53, [
      `This is the part of the file that surprises people: a four-thousand-year-old name, mapping cleanly onto twenty-first-century trades. The patterns are not marketing — they are the same myths, read forward.`,
      `The mapping is conservative on purpose: only resonances that can be argued aloud. The rest of the atlas follows the same rule, industry by industry.`,
      `If a match here reads wrong, the atlas says how to challenge it. The patterns are falsifiable — that is what makes them worth publishing.`,
    ])
  );
  return lines.join('\n');
}

function sectionTexts(entry) {
  const ids = TEXT_BY_PANTHEON[entry.pantheon] || [];
  const links = ids
    .filter((id) => TEXT_TITLE.has(id))
    .map((id) => `[${TEXT_TITLE.get(id)}](/texts/${id}/)`);
  if (links.length === 0) return '';
  const joined = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')}${links.length > 2 ? ',' : ''} and ${links[links.length - 1]}`;
  return `## In the Sacred Texts

The ${displayPantheon(entry.pantheon)} tradition is not a vibe; it is a library. The [Sacred Texts collection](/texts/) holds ${joined} — the primary sources the temple's scholarship is built on, free to read, cross-linked back to the names they mention. The temple is the argument; the texts are the evidence.`;
}

function sectionClose(entry) {
  const idx = BUILT_IDS.indexOf(entry.id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const nav = [];
  if (prevEntry) nav.push(`previous file: **${prevEntry.unicode}** ([read it here](/sites/${prev}/blog/restoration/))`);
  if (nextEntry) nav.push(`next file: **${nextEntry.unicode}** ([read it here](/sites/${next}/blog/restoration/))`);
  return `## The File Continues

This is one of ${BUILT_IDS.length} Restoration Files — a second dispatch from every flagship temple in the fleet. The temple's [first dispatch](/sites/${entry.id}/blog/) tells the founding story of the name; the [blog index](/blog/) holds the whole archive.

${nav.length ? `Continue the series — ${nav.join(' · ')}.` : ''}

*The Restoration Files are written from the same canonical record as the temples themselves: the lexicon, the lore catalog, the pattern atlas, and the cited scholarly sources. If a file ever disagrees with its temple, the temple is right — tell us, and the file will be corrected.*`;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;

  for (const id of BUILT_IDS) {
    const entry = LEXICON_BY_ID.get(id);
    if (!entry) {
      console.warn(`  skipping ${id}: not in lexicon`);
      continue;
    }
    const archetype = ARCHETYPES.find((a) => a.id === id);
    const lore = LORE[id] || null;
    const script = getOriginalScript(entry) || entry.greek || '—';

    const body = [
      `# ${makeTitle(id, entry, lore)}`,
      '',
      sectionHook(entry, lore),
      '',
      sectionAtAGlance(entry, archetype, script),
      '',
      sectionPhilology(entry, script),
      '',
      sectionTemple(entry, archetype),
      '',
      sectionIndustries(entry),
      '',
      sectionTexts(entry),
      '',
      sectionClose(entry),
      '',
    ]
      .filter((s) => s !== '')
      .join('\n');

    const wc = wordCount(body);
    const readMin = Math.max(3, Math.round(wc / 200));
    const post = {
      entryId: id,
      series: 'restoration',
      seriesNo: BUILT_IDS.indexOf(id) + 1,
      title: body.match(/^# (.+)$/m)[1],
      description: makeDescription(entry),
      keywords: [
        entry.unicode,
        entry.ascii,
        `${entry.pantheon} mythology`,
        'Unicode domain',
        'restoration',
        'The Restoration Files',
        'PuniCodex',
        'philology',
      ],
      tags: [entry.pantheon, entry.tierLabel || `Tier ${entry.tier || '2'}`, 'restoration', 'The Restoration Files'],
      author: 'PuniCodex Team',
      publishedAt: '2026-07-30',
      readingTime: `${readMin} min read`,
      body,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    written++;
  }

  console.log(`The Restoration Files: ${written} posts written to platform/blog/series/restoration/`);
}

main();
