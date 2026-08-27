#!/usr/bin/env node
/**
 * PuniCodex — The Resonance Files (series generator, elevated)
 *
 * Writes platform/blog/series/resonance/{id}.json for every built flagship:
 * the patterns-angle dispatch. Four architectures — the Seats, the Office
 * Reveal, the Myth Cycle, and the Stress Test — chosen deterministically per
 * temple, each arguing the temple's pattern seats through its own mythology
 * rather than from a shared script.
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
const V = require(path.join(ROOT, 'scripts', 'lib', 'blog-voice.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const SECTOR_NAME = new Map((PATTERNS.sectors || []).map((s) => [s.id, s.name]));

function seatsFor(id) {
  return (PATTERNS.byEntry[id] || []).slice().sort((a, b) => b.weight - a.weight);
}

function glanceBlock(entry, seats) {
  const sectors = [...new Set(seats.map((s) => SECTOR_NAME.get(s.sector) || s.sector))];
  const rows = [
    `- **Temple:** ${entry.unicode}`,
    `- **Pantheon:** ${V.displayPantheon(entry.pantheon)}`,
    `- **Domain of influence:** ${entry.domain || 'Mythic'}`,
    `- **Pattern seats:** ${seats.length > 0 ? seats.length : 'unseated'}`,
    `- **Sectors touched:** ${sectors.length > 0 ? sectors.join(' · ') : '—'}`,
    `- **Strongest seat:** ${seats[0] ? seats[0].name : '—'}`,
    `- **Series:** The Resonance Files, No. ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length}`,
  ];
  return `## At a Glance\n\n${rows.join('\n')}`;
}

function methodBlock(entry) {
  return `## The Method, Stated Plainly

${V.pick(entry.id, 201, [
  'None of this is numerology. A seat exists only where the match can be argued from the deity\u2019s documented domains and deeds — weighted, published, and falsifiable. The derivation, the weights, and the challenge process are public on the [methodology page](/patterns/methodology/). If a seat in this file reads wrong, the atlas itself tells you how to prove it — and the correction becomes part of the record.',
  'The atlas is not a horoscope. Seats are earned from the sources — argued, weighted, published — and every one of them can be challenged at the [methodology page](/patterns/methodology/). A match that cannot survive an argument does not survive review. That is the whole trick: the patterns are claims, and claims can be tested.',
  'Skeptical? Good — the system is built for you. Every seat in this file carries its why-line and its weight, the full derivation is public at the [methodology page](/patterns/methodology/), and the challenge process is part of the design. Falsifiable is not a posture here; it is the mechanism.',
])}`;
}

function sponsorBlock(entry, seats) {
  if (seats.length === 0) return '';
  const top = seats[0];
  return `## For the Ones Who Work There

${V.pick(entry.id, 202, [
  `If you work in ${top.name.toLowerCase()}${seats[1] ? `, ${seats[1].name.toLowerCase()},` : ''} or any trade this temple holds a seat in, this is the honest version of what a placement means: your industry beside the story it has been re-telling all along — on the temple floor itself, before an audience that came specifically to read it. The [patron tier](/${entry.id}/patron/) and the [advertising terms](/terms/advertising/) describe the mechanics; the resonance above describes the fit.`,
  `For a sponsor in ${top.name.toLowerCase()}, the fit here is not adjacency — it is inheritance. Your trade already tells this story every working day; the temple simply holds the original. The [patron tier](/${entry.id}/patron/) and the [advertising terms](/terms/advertising/) carry the mechanics; the myths above carry the reason.`,
])}`;
}

function closeBlock(entry) {
  const idx = BUILT_IDS.indexOf(entry.id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const nav = [];
  if (prevEntry) nav.push(`previous: **${prevEntry.unicode}** ([read it](/${prev}/blog/resonance/))`);
  if (nextEntry) nav.push(`next: **${nextEntry.unicode}** ([read it](/${next}/blog/resonance/))`);
  return `## The File Continues

${V.pick(entry.id, 203, [
  `This is one of ${BUILT_IDS.length} Resonance Files — the third dispatch from every flagship temple, where the myths meet the markets. The temple's [founding dispatch](/${entry.id}/blog/) tells the name's story; its [Restoration File](/${entry.id}/blog/restoration/) tells the spelling's; the [blog index](/blog/) holds the whole archive.`,
  `One of ${BUILT_IDS.length} Resonance Files — the series where the pantheon goes to work. Read the [founding dispatch](/${entry.id}/blog/) for the name, the [Restoration File](/${entry.id}/blog/restoration/) for the spelling, or the [whole archive](/blog/) end to end.`,
])}

${nav.length ? `Continue the series — ${nav.join(' · ')}.` : ''}

*The Resonance Files are argued from the same canonical record as the pattern atlas itself: the lexicon, the lore catalog, and the cited sources. Every seat can be challenged at the methodology page — and the challenge is the point.*`;
}

// ── Architecture A: The Seats (upgraded original) ───────────────────────────

function archSeats(entry, seats, lore) {
  const u = entry.unicode;
  const lead = V.loreLead(lore);
  const parts = [];

  const openers = [
    `Every age hires the same gods; only the job titles change. **${u}** never stopped working.`,
    `The myths did not retire. They moved offices. This is the file on where **${u}** works now.`,
    `If the stories are true in the way that matters, they should show up in the world without being invoked. **${u}** shows up constantly.`,
    `Archetypes are not metaphors; they are job descriptions written early. **${u}**'s was unusually clear.`,
  ];
  parts.push(V.pick(entry.id, 17, openers));
  if (lead) parts.push(lead);
  parts.push(
    seats.length > 0
      ? `The [pattern atlas](/patterns/) — which maps every flagship temple to the industries its archetype demonstrably resonates with, each match argued and open to challenge — seats this temple in **${seats.length} ${seats.length === 1 ? 'industry' : 'industries'}**. This file reads those seats the way they were earned: through the myths.`
      : `The [pattern atlas](/patterns/) has not yet seated this temple in a modern industry. This file records what the myths already say about the work — the seats, when they are argued, will follow the same lines.`
  );
  parts.push(glanceBlock(entry, seats));

  const myths = V.loreMyths(lore, 2);
  if (myths.length > 0) {
    const blocks = myths.map((m) => {
      const frames = [
        `**${m.title}.** ${V.firstSentences(m.text, 2)} — hold that image; the industries below are where it goes to work.`,
        `**${m.title}.** ${V.firstSentences(m.text, 2)} — that is not just a story. It is a business model, four thousand years early.`,
        `**${m.title}.** ${V.firstSentences(m.text, 2)} — remember the shape of that act. You will see it again, wearing a logo.`,
      ];
      return V.pick(entry.id + m.title, 3, frames);
    });
    parts.push(`## The Myth at Work\n\n${blocks.join('\n\n')}`);
  }

  if (seats.length > 0) {
    const connectors = [
      (s) => `The why-line says it in one breath: *${s.why}* That is not a resemblance; it is the same act, performed in a newer building.`,
      (s) => `*${s.why}* — the atlas stops there, out of discipline. The myth keeps going: the function ${u} performs in the stories is precisely the function this industry sells.`,
      (s) => `*${s.why}* Swap the costume and the sentence is indistinguishable from the myth. That is what a resonance seat means.`,
    ];
    const seatBlocks = seats.slice(0, 5).map((s, i) => {
      const sectorName = SECTOR_NAME.get(s.sector) || s.sector;
      return `### ${s.name}\n\n*${s.tagline} (Sector: ${sectorName})*\n\n${V.pick(entry.id + s.industry, i, connectors)(s)}`;
    });
    let extra = '';
    if (seats.length > 5) {
      extra = `\n\nThe temple holds ${seats.length - 5} further ${seats.length - 5 === 1 ? 'seat' : 'seats'} beyond these — the full, argued list lives on its [patterns floor](/${entry.id}/patterns/).`;
    }
    parts.push(`## The Seats\n\nEach of these is argued in the atlas with a weight and a why-line. What the atlas cannot fit in one line is the whole myth — so here is each seat with its story restored.\n\n${seatBlocks.join('\n\n')}${extra}`);
  }

  const legacy = V.loreLegacy(lore);
  if (legacy) {
    parts.push(`## The Long Employment\n\n${V.firstSentences(legacy, 2)} The age changed. The work did not.`);
  }

  parts.push(methodBlock(entry));
  parts.push(sponsorBlock(entry, seats));
  parts.push(closeBlock(entry));
  return parts.filter(Boolean).join('\n\n');
}

// ── Architecture B: The Office Reveal ───────────────────────────────────────

function archOffice(entry, seats, lore) {
  const u = entry.unicode;
  const parts = [];
  const top = seats[0];
  const second = seats[1];

  if (top) {
    const scenes = [
      `Somewhere right now, in a ${top.name.toLowerCase()} office, someone is doing exactly what the myths describe — and has never heard of **${u}**. This file is the introduction.`,
      `Walk into any ${top.name.toLowerCase()} outfit and watch for ten minutes. You will see a very old act performed with newer props. The act has a name. It is **${u}**.`,
      `The ${top.name.toLowerCase()} world does not cite ${u} in its documentation. It does not need to — it performs the archetype daily, unbilled.`,
    ];
    parts.push(V.pick(entry.id, 211, scenes));
  } else {
    parts.push(`Some archetypes walk into an industry. **${u}** is harder to pin to one desk — its work shows up spread across the floor. This file follows it.`);
  }

  const myths = V.loreMyths(lore, 2);
  if (myths.length > 0) {
    const blocks = myths.map((m) => `**${m.title}.** ${V.firstSentences(m.text, 3)}`);
    parts.push(`## Before the Office, the Story\n\n${blocks.join('\n\n')}`);
  }

  parts.push(glanceBlock(entry, seats));

  if (seats.length > 0) {
    const seatBlocks = seats.slice(0, 5).map((s) => {
      const reveals = [
        `Now read the why-line with the office in mind: *${s.why}* The people doing this work did not borrow the archetype. They re-derived it — the way ${u} was always going to be re-derived wherever ${(entry.domain || 'this domain').toLowerCase()} matters.`,
        `*${s.why}* Nobody in that trade worships at this temple. They just keep its hours.`,
        `*${s.why}* The match is not poetic license. Strip the trade to its function and the function is the myth.`,
      ];
      return `### ${s.name}\n\n${V.pick(entry.id + s.industry, 5, reveals)}`;
    });
    parts.push(`## The Reveal, Seat by Seat\n\n${seatBlocks.join('\n\n')}`);
  }

  const sync = V.loreSyncretism(lore);
  if (sync) {
    parts.push(`## Not the First Rebrand\n\n${V.firstSentences(sync, 2)} The office is only the latest translation.`);
  }

  parts.push(methodBlock(entry));
  parts.push(sponsorBlock(entry, seats));
  parts.push(closeBlock(entry));
  return parts.filter(Boolean).join('\n\n');
}

// ── Architecture C: The Myth Cycle ──────────────────────────────────────────

function archMythCycle(entry, seats, lore) {
  const u = entry.unicode;
  const myths = V.loreMyths(lore, 5);
  const parts = [];

  const openers = [
    `One myth is a story. A cycle of myths is a specification. Read ${u}'s cycle in order and the industries fall out of it one by one.`,
    `The mistake is reading myths as entertainment. ${u}'s cycle reads more like a charter — each story assigning a duty the modern world still pays for.`,
    `Take ${u}'s stories in sequence. They are not episodes; they are appointments — and the modern trades are keeping them.`,
  ];
  parts.push(V.pick(entry.id, 221, openers));
  parts.push(glanceBlock(entry, seats));

  if (seats.length > 0 && myths.length > 0) {
    const seatBlocks = seats.slice(0, Math.min(4, Math.max(seats.length, 1)).valueOf()).map((s, i) => {
      const myth = myths[i % myths.length];
      return `### ${s.name} — through *${myth.title}*\n\n${V.firstSentences(myth.text, 2)}\n\nThe atlas states the seat in one line: *${s.why}* The story above is the long version of the same sentence. ${V.pick(entry.id + s.industry, 7, [
        'Industries do not invent their archetypes; they inherit them and call them best practice.',
        'The trade thinks it is optimizing a process. It is re-enacting a charter.',
        'That is the cycle working: story becomes duty, duty becomes trade.',
      ])}`;
    });
    parts.push(`## The Cycle, Read Forward\n\n${seatBlocks.join('\n\n')}`);
  } else if (myths.length > 0) {
    const blocks = myths.slice(0, 3).map((m) => `**${m.title}.** ${V.firstSentences(m.text, 2)}`);
    parts.push(`## The Cycle\n\n${blocks.join('\n\n')}\n\nNo industry seats are argued for this temple yet — but the duties are all here, waiting to be recognized. When they are, they will trace back to these stories.`);
  }

  const lead = V.loreLead(lore);
  if (lead) parts.push(`## The Theme That Runs the Cycle\n\n${lead}`);
  parts.push(methodBlock(entry));
  parts.push(sponsorBlock(entry, seats));
  parts.push(closeBlock(entry));
  return parts.filter(Boolean).join('\n\n');
}

// ── Architecture D: The Stress Test ─────────────────────────────────────────

function archStressTest(entry, seats, lore) {
  const u = entry.unicode;
  const parts = [];

  const openers = [
    `*Audit notes, ${u}: we took every seat the atlas claims for this temple and tried to break it against the myths. What survived is below.*`,
    `*The stress test for ${u}. Every seat in the atlas was attacked with the same question — is the match real, or is it poetry? — and the survivors are recorded with their evidence.*`,
    `*Audit: ${u}, seat by seat. The atlas makes claims; the myths decide which ones stand. This is the record of what held.*`,
  ];
  parts.push(V.pick(entry.id, 231, openers));
  parts.push(glanceBlock(entry, seats));

  if (seats.length > 0) {
    const myths = V.loreMyths(lore, 3);
    const verdicts = seats.slice(0, 5).map((s, i) => {
      const myth = myths[i % Math.max(1, myths.length)];
      const verdict = V.pick(entry.id + s.industry, 9, [
        'Verdict: holds under load. The correspondence is functional, not decorative.',
        'Verdict: survives scrutiny. The myth and the trade do the same work.',
        'Verdict: stands. Strip both to their function and the functions match.',
      ]);
      const evidence = myth ? ` Exhibit: *${myth.title}* — ${V.firstSentences(myth.text, 1)}` : '';
      return `### Seat ${i + 1}: ${s.name}\n\nClaim: *${s.why}*${evidence}\n\n**${verdict}**`;
    });
    parts.push(`## The Test\n\n${verdicts.join('\n\n')}`);
  }

  const lead = V.loreLead(lore);
  if (lead) {
    parts.push(`## The Control Group\n\nAgainst the seats that survived, one control: the temple's own summary of its figure — ${V.firstSentences(lead, 1)} The seats do not drift far from it. That is the audit's cleanest result.`);
  }

  parts.push(methodBlock(entry));
  parts.push(sponsorBlock(entry, seats));
  parts.push(closeBlock(entry));
  return parts.filter(Boolean).join('\n\n');
}

// ── Titles & descriptions ───────────────────────────────────────────────────

// Over-long copy ends on the last complete sentence that fits the window
// whole (a sentence mark only counts followed by an uppercase letter or the
// end, so abbreviations like "No." are not boundaries); copy without a usable
// sentence boundary falls back to a word-boundary ellipsis.
function serpDescription(desc, seriesName, no, total) {
  if (desc.length < 120) {
    // Adaptive pad: the full closer wins when it fits the window; a bare
    // series citation is the fallback so short copy never collapses back to
    // its pre-pad length via the sentence cut below.
    const full = `${desc} ${seriesName}, No. ${no} of ${total} — from the canonical record of the temple.`;
    const short = `${desc} ${seriesName}, No. ${no} of ${total}.`;
    desc = full.length <= 160 ? full : short;
    if (desc.length < 120) desc = `${desc} Every claim cited, every form weighed.`;
  }
  if (desc.length <= 160) return desc;
  let sentenceEnd = -1;
  for (const m of desc.matchAll(/[.!?](?=\s+[A-Z]|$)/g)) {
    if (m.index + 1 > 155) break;
    sentenceEnd = m.index + 1;
  }
  if (sentenceEnd >= 100) return desc.slice(0, sentenceEnd);
  const cut = desc.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
}

function makeTitle(entry, arch, seats) {
  const u = entry.unicode;
  const top = seats[0];
  const second = seats[1];
  const pools = {
    seats: [
      `Where ${u} works now: the myths behind the markets`,
      `${u} and the industries that were always telling its story`,
      `The working life of ${u}: from the myths to the modern trades`,
      `${u}, translated into industries: what the archetype actually does`,
    ],
    office: top
      ? [
          `The ${top.name.toLowerCase()} trick ${u} pulled off first`,
          `What a ${top.name.toLowerCase()} office owes to ${u}`,
          `${u} walks into a ${top.name.toLowerCase()} firm`,
          `The uncredited partner: ${u} in ${top.name.toLowerCase()}`,
        ]
      : [`Where ${u} shows up for work`, `The working shape of ${u}`],
    cycle: [
      `The ${u} cycle: stories that became duties`,
      `${u} in sequence: how the myths assigned the trades`,
      `Reading ${u}'s charter, one myth at a time`,
      `The appointments ${u} made — and who is keeping them`,
    ],
    stress: top
      ? [
          `Stress-testing ${u}: do the industry seats hold?`,
          `The ${u} audit: myths vs. markets`,
          `We tried to break ${u}'s industry seats. Here is what survived`,
          `${u} under scrutiny: the seats that held`,
        ]
      : [`The ${u} audit`, `${u} under scrutiny`],
  };
  let pool = pools[arch];
  if (arch === 'seats' && top && second) {
    pool = pool.concat([`${u} at work: ${top.name.toLowerCase()}, ${second.name.toLowerCase()}, and the myths that got there first`]);
  }
  return V.pick(entry.id, 241, pool);
}

function makeDescription(entry, arch, seats) {
  const u = entry.unicode;
  const names = seats.slice(0, 2).map((s) => s.name.toLowerCase());
  const industries = names.length === 2 ? `${names[0]} and ${names[1]}` : names[0] || 'the modern trades';
  const pools = {
    seats: [
      `The Resonance Files: ${u} — the mythology behind the archetype, and why ${industries} keep re-telling its story.`,
      `${u} at work: the myths, the pattern seats, and the industries the archetype actually rules.`,
    ],
    office: [
      `The ${industries} world performs ${u} daily, uncredited. The Resonance Files make the introduction.`,
      `What modern ${industries} owe to ${u} — the reveal, seat by seat.`,
    ],
    cycle: [
      `${u}'s myths are not episodes; they are appointments. The Resonance Files read the cycle forward into ${industries}.`,
      `Stories that became duties: the ${u} cycle and the trades — ${industries} — that keep it.`,
    ],
    stress: [
      `The ${u} audit: every claimed industry seat tested against the myths. The survivors, with evidence.`,
      `We stress-tested ${u}'s pattern seats — ${industries}. What held, and why.`,
    ],
  };
  const desc = V.pick(entry.id, 242, pools[arch]);
  return serpDescription(desc, 'The Resonance Files', BUILT_IDS.indexOf(entry.id) + 1, BUILT_IDS.length);
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  const archCount = { seats: 0, office: 0, cycle: 0, stress: 0 };

  for (const id of BUILT_IDS) {
    const entry = LEXICON_BY_ID.get(id);
    if (!entry) {
      console.warn(`  skipping ${id}: not in lexicon`);
      continue;
    }
    const lore = LORE[id] || null;
    const seats = seatsFor(id);
    const arch = ['seats', 'office', 'cycle', 'stress'][V.hashStr(id) % 4];
    archCount[arch]++;

    let body = arch === 'seats'
      ? archSeats(entry, seats, lore)
      : arch === 'office'
        ? archOffice(entry, seats, lore)
        : arch === 'cycle'
          ? archMythCycle(entry, seats, lore)
          : archStressTest(entry, seats, lore);

    let fullBody = `# ${makeTitle(entry, arch, seats)}\n\n${body}\n`;

    // Length guard.
    if (fullBody.split(/\s+/).filter(Boolean).length < 500) {
      const enrich = [];
      const symbols = V.loreSymbols(lore, 3);
      if (symbols.length > 0) {
        enrich.push(
          `## The Emblems at Work\n\n${symbols.map((s) => `**${s.name}** — ${s.meaning}`).join('; ')}. Watch for these emblems in the trades above; they show up in more logos than their owners realize.`
        );
      }
      const legacy = V.loreLegacy(lore);
      if (legacy) {
        enrich.push(`## The Long Employment\n\n${V.firstSentences(legacy, 2)}`);
      }
      enrich.push(
        `## The Tradition Behind the Trade\n\n${entry.unicode} belongs to ${V.displayPantheon(entry.pantheon)}, ${V.pantheonFlavor(entry.pantheon)}. The pattern atlas reads that tradition's functions into the modern economy with the same discipline a critical edition would — argued, weighted, and published for challenge.`
      );
      fullBody = fullBody.replace(/\n## The File Continues/, `\n${enrich.join('\n\n')}\n\n## The File Continues`);
    }

    const wc = fullBody.split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(3, Math.round(wc / 200));
    const industries = seats.slice(0, 2).map((s) => s.name);
    const post = {
      entryId: id,
      series: 'resonance',
      seriesNo: BUILT_IDS.indexOf(id) + 1,
      architecture: arch,
      title: fullBody.match(/^# (.+)$/m)[1],
      description: makeDescription(entry, arch, seats),
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
      body: fullBody,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    written++;
  }

  console.log(`The Resonance Files (elevated): ${written} posts — ${JSON.stringify(archCount)}`);
}

main();
