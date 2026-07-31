#!/usr/bin/env node
/**
 * PuniCodex — The Resonance Files (series generator)
 *
 * Writes platform/blog/series/resonance/{id}.json for every built flagship:
 * the third dispatch per temple — the mythology read forward into the modern
 * economy. Each post takes the temple's pattern seats (the industries its
 * archetype genuinely resonates with, from the canonical pattern atlas) and
 * argues them through the deity's own myths: not "this god fits this market",
 * but "this is the story that market has always told".
 *
 * Usage:
 *   node scripts/generate-blog-series-resonance.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'resonance');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const LORE = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const PATTERNS = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const SECTOR_NAME = new Map((PATTERNS.sectors || []).map((s) => [s.id, s.name]));

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

function stripHtml(h) {
  return String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentences(text, n) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return parts.slice(0, n).join(' ').trim();
}

function displayPantheon(p) {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
}

function wordCount(md) {
  return md.split(/\s+/).filter(Boolean).length;
}

// ── Title & description ─────────────────────────────────────────────────────

function makeTitle(entry, seats) {
  const u = entry.unicode;
  const top = seats[0];
  const second = seats[1];
  const formulas = [
    () => `Where ${u} works now: the myths behind the markets`,
    () => `${u} and the industries that were always telling its story`,
    () => `The working life of ${u}: from the myths to the modern trades`,
    () => `${u}, translated into industries: what the archetype actually does`,
    () => `Reading ${u} through the work it rules today`,
  ];
  if (top && second) {
    formulas.push(() => `${u} at work: ${top.name.toLowerCase()}, ${second.name.toLowerCase()}, and the myths that got there first`);
  }
  if (top) {
    formulas.push(() => `Why ${top.name.toLowerCase()} keeps re-telling the story of ${u}`);
  }
  return pick(entry.id, 7, formulas)();
}

function makeDescription(entry, seats) {
  const u = entry.unicode;
  const names = seats.slice(0, 2).map((s) => s.name.toLowerCase());
  const industries = names.length === 2 ? `${names[0]} and ${names[1]}` : names[0] || 'the modern trades';
  const templates = [
    `The Resonance Files: ${u} — the mythology behind the archetype, and why ${industries} keep re-telling its story.`,
    `${u} at work: the myths, the pattern seats, and the industries — ${industries} — the archetype actually rules.`,
    `How ${u}'s mythology maps onto real industries: ${industries}, argued through the sources and open to challenge.`,
  ];
  return pick(entry.id, 13, templates);
}

// ── Body sections ───────────────────────────────────────────────────────────

function sectionHook(entry, lore, seats) {
  const u = entry.unicode;
  const lead = stripHtml(lore?.mythology?.lead);
  const openers = [
    `Every age hires the same gods; only the job titles change. **${u}** never stopped working.`,
    `The myths did not retire. They moved offices. This is the file on where **${u}** works now.`,
    `If the stories are true in the way that matters, they should show up in the world without being invoked. **${u}** shows up constantly.`,
    `Archetypes are not metaphors; they are job descriptions written early. **${u}**'s was unusually clear.`,
  ];
  const opener = pick(entry.id, 17, openers);
  const seatLine =
    seats.length > 0
      ? `The [pattern atlas](/patterns/) — which maps every flagship temple to the industries its archetype demonstrably resonates with, each match argued and open to challenge — seats this temple in **${seats.length} ${seats.length === 1 ? 'industry' : 'industries'}**. This file reads those seats the way they were earned: through the myths.`
      : `The [pattern atlas](/patterns/) has not yet seated this temple in a modern industry. This file records what the myths already say about the work — the seats, when they are argued, will follow the same lines.`;
  return `${opener}\n\n${lead ? `${lead}\n\n` : ''}${seatLine}`;
}

function sectionAtAGlance(entry, seats) {
  const sectors = [...new Set(seats.map((s) => SECTOR_NAME.get(s.sector) || s.sector))];
  const rows = [
    `- **Temple:** ${entry.unicode}`,
    `- **Pantheon:** ${displayPantheon(entry.pantheon)}`,
    `- **Domain of influence:** ${entry.domain || 'Mythic'}`,
    `- **Pattern seats:** ${seats.length > 0 ? seats.length : 'unseated'}`,
    `- **Sectors touched:** ${sectors.length > 0 ? sectors.join(' · ') : '—'}`,
    `- **Strongest seat:** ${seats[0] ? seats[0].name : '—'}`,
    `- **Series:** The Resonance Files, No. ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length}`,
  ];
  return `## At a Glance\n\n${rows.join('\n')}`;
}

function sectionMythAtWork(entry, lore) {
  const myths = (lore?.mythology?.myths || []).slice(0, 2);
  if (myths.length === 0) {
    return `## The Myth at Work

The temple's full record lives in its [lore halls](/sites/${entry.id}/lore/) — the sources, the variants, the archaeology. What matters for the pattern is the figure's *function*: ${entry.domain || 'mythic domains'}, exercised the same way in every age that retells it.`;
  }
  const blocks = myths.map((m) => {
    const tale = firstSentences(stripHtml(m.text), 2);
    const frames = [
      `**${m.title}.** ${tale} — hold that image; the industries below are where it goes to work.`,
      `**${m.title}.** ${tale} — that is not just a story. It is a business model, four thousand years early.`,
      `**${m.title}.** ${tale} — remember the shape of that act. You will see it again, wearing a logo.`,
    ];
    return pick(entry.id + m.title, 3, frames);
  });
  return `## The Myth at Work\n\n${blocks.join('\n\n')}`;
}

function sectionSeats(entry, seats, lore) {
  if (seats.length === 0) return '';
  const lead = stripHtml(lore?.mythology?.lead);
  const lines = [];
  lines.push('## The Seats');
  lines.push('');
  lines.push(
    `Each of these is argued in the atlas with a weight and a why-line. What the atlas cannot fit in one line is the whole myth — so here is each seat with its story restored.`
  );
  lines.push('');
  const connectors = [
    (s) => `The why-line says it in one breath: *${s.why}* That is not a resemblance; it is the same act, performed in a newer building.`,
    (s) => `*${s.why}* — the atlas stops there, out of discipline. The myth keeps going: the function ${entry.unicode} performs in the stories is precisely the function this industry sells.`,
    (s) => `*${s.why}* Swap the costume and the sentence is indistinguishable from the myth. That is what a resonance seat means.`,
  ];
  seats.slice(0, 5).forEach((s, i) => {
    const sectorName = SECTOR_NAME.get(s.sector) || s.sector;
    lines.push(`### ${s.name}`);
    lines.push('');
    lines.push(`*${s.tagline} (Sector: ${sectorName})*`);
    lines.push('');
    lines.push(pick(entry.id + s.industry, i, connectors)(s));
    lines.push('');
  });
  if (seats.length > 5) {
    lines.push(
      `The temple holds ${seats.length - 5} further ${seats.length - 5 === 1 ? 'seat' : 'seats'} beyond these — the full, argued list lives on its [patterns floor](/sites/${entry.id}/patterns/).`
    );
    lines.push('');
  }
  if (lead) {
    lines.push(
      `Read the myth again after the seats and it stops sounding ancient: ${firstSentences(lead, 1)} The age changed. The work did not.`
    );
  }
  return lines.join('\n');
}

function sectionMethod(entry) {
  return `## The Method, Stated Plainly

None of this is numerology. A seat exists only where the match can be argued from the deity's documented domains and deeds — weighted, published, and falsifiable. The full derivation, the weights, and the challenge process are public on the [methodology page](/patterns/methodology/). If a seat in this file reads wrong, the atlas itself tells you how to prove it — and the correction becomes part of the record.`;
}

function sectionSponsor(entry, seats) {
  if (seats.length === 0) return '';
  const top = seats[0];
  return `## For the Ones Who Work There

If you work in ${top.name.toLowerCase()}${seats[1] ? `, ${seats[1].name.toLowerCase()},` : ''} or any trade this temple holds a seat in, this is the honest version of what a placement means: your industry beside the story it has been re-telling all along — on the temple floor itself, before an audience that came specifically to read it. The [patron tier](/sites/${entry.id}/patron/) and the [advertising terms](/terms/advertising/) describe the mechanics; the resonance above describes the fit. The story is the pitch; the seats are just where it already works.`;
}

function sectionClose(entry) {
  const idx = BUILT_IDS.indexOf(entry.id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const nav = [];
  if (prevEntry) nav.push(`previous: **${prevEntry.unicode}** ([read it](/sites/${prev}/blog/resonance/))`);
  if (nextEntry) nav.push(`next: **${nextEntry.unicode}** ([read it](/sites/${next}/blog/resonance/))`);
  return `## The File Continues

This is one of ${BUILT_IDS.length} Resonance Files — the third dispatch from every flagship temple, where the myths meet the markets. The temple's [founding dispatch](/sites/${entry.id}/blog/) tells the name's story; its [Restoration File](/sites/${entry.id}/blog/restoration/) tells the spelling's; the [blog index](/blog/) holds the whole archive.

${nav.length ? `Continue the series — ${nav.join(' · ')}.` : ''}

*The Resonance Files are argued from the same canonical record as the pattern atlas itself: the lexicon, the lore catalog, and the cited sources. Every seat can be challenged at the methodology page — and the challenge is the point.*`;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  let unseated = 0;

  for (const id of BUILT_IDS) {
    const entry = LEXICON_BY_ID.get(id);
    if (!entry) {
      console.warn(`  skipping ${id}: not in lexicon`);
      continue;
    }
    const lore = LORE[id] || null;
    const seats = (PATTERNS.byEntry[id] || []).slice().sort((a, b) => b.weight - a.weight);
    if (seats.length === 0) unseated++;

    const body = [
      `# ${makeTitle(entry, seats)}`,
      '',
      sectionHook(entry, lore, seats),
      '',
      sectionAtAGlance(entry, seats),
      '',
      sectionMythAtWork(entry, lore),
      '',
      sectionSeats(entry, seats, lore),
      '',
      sectionMethod(entry),
      '',
      sectionSponsor(entry, seats),
      '',
      sectionClose(entry),
      '',
    ]
      .filter((s) => s !== '')
      .join('\n');

    const wc = wordCount(body);
    const readMin = Math.max(3, Math.round(wc / 200));
    const industries = seats.slice(0, 2).map((s) => s.name);
    const post = {
      entryId: id,
      series: 'resonance',
      seriesNo: BUILT_IDS.indexOf(id) + 1,
      title: body.match(/^# (.+)$/m)[1],
      description: makeDescription(entry, seats),
      keywords: [
        entry.unicode,
        entry.ascii,
        `${entry.pantheon} mythology`,
        'pattern atlas',
        'The Resonance Files',
        'PuniCodex',
        'archetype',
        ...industries,
      ],
      tags: [entry.pantheon, entry.tierLabel || `Tier ${entry.tier || '2'}`, 'patterns', 'The Resonance Files', ...industries.slice(0, 1)],
      author: 'PuniCodex Team',
      publishedAt: '2026-07-31',
      readingTime: `${readMin} min read`,
      body,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    written++;
  }

  console.log(`The Resonance Files: ${written} posts written to platform/blog/series/resonance/ (${unseated} unseated)`);
}

main();
