#!/usr/bin/env node
/**
 * PuniCodex — The Restoration Files (series generator, elevated)
 *
 * Writes platform/blog/series/restoration/{id}.json for every built flagship.
 * Four essay architectures — the Evidence Ledger, Myth First, the Bench
 * Notes, and the Provenance Record — chosen deterministically per temple so
 * no two dispatches share a skeleton. Every post mines the full lore catalog:
 * mythology, archaeology, syncretism, cultural legacy, pronunciation,
 * symbols, and the cited sources.
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
const V = require(path.join(ROOT, 'scripts', 'lib', 'blog-voice.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

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

// ── Shared fragments ────────────────────────────────────────────────────────

function tierSentence(entry) {
  const tier = entry.tier;
  if (tier === 'dual') {
    return V.pick(entry.id, 101, [
      'The name preserves both stress and vowel length, and the sources admit more than one historically valid spelling — so the temple presents the pair as a dual-tier restoration, the rarest class in the lexicon.',
      'Stress and length survive together here, and two attested spellings stand on the same evidence. That combination places the name in the dual tier — the lexicon\u2019s smallest and most scrutinized class.',
      'Both features — the accent and the long vowel — survive, and the variants are not errors but attested alternatives. The temple holds the pair as a dual-tier restoration.',
    ]);
  }
  if (tier === '1') {
    return V.pick(entry.id, 102, [
      'The restoration preserves more than the ASCII form can express — stress, length, or a letter the Latin keyboard lost — which places it, mechanically, in Tier-1.',
      'What survives here cannot be shown in ASCII: a feature of the original that the fallback alphabet flattens. That is the Tier-1 test, and this name passes it without argument.',
      'Tier-1 is not a compliment; it is a measurement. This restoration keeps something the ASCII form provably loses, and the measurement is repeatable.',
    ]);
  }
  return V.pick(entry.id, 103, [
    'One decisive feature survives — a single, honest mark — which places the restoration in Tier-2: exact, and exactly labeled.',
    'The restoration keeps one feature the ASCII form drops. One is enough to matter, and the label says so plainly: Tier-2.',
    'Tier-2 here means one preserved truth — not less important, just singular. The temple shows it and names it.',
  ]);
}

function marksList(entry) {
  const marks = (entry.breakdown || []).filter((b) => b.type === 'stress' || b.type === 'length');
  return marks;
}

function textsLinks(entry) {
  const ids = TEXT_BY_PANTHEON[entry.pantheon] || [];
  const links = ids.filter((id) => TEXT_TITLE.has(id)).map((id) => `[${TEXT_TITLE.get(id)}](/texts/${id}/)`);
  return links;
}

function seatsFor(id) {
  return (PATTERNS.byEntry[id] || []).slice().sort((a, b) => b.weight - a.weight);
}

function glanceBlock(entry, script, extra) {
  const rows = [
    `- **Restored name:** ${entry.unicode}`,
    `- **ASCII form:** ${entry.ascii}`,
    `- **Meaning:** "${entry.meaning || 'See the temple record'}"`,
    `- **Domain of influence:** ${entry.domain || 'Mythic'}`,
    `- **Pantheon:** ${V.displayPantheon(entry.pantheon)}`,
    `- **Classification:** ${entry.tierLabel || `Tier ${entry.tier || '2'}`}`,
    `- **Original script:** ${script}`,
  ];
  if (extra) rows.push(extra);
  rows.push(`- **Series:** The Restoration Files, No. ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length}`);
  return `## At a Glance\n\n${rows.join('\n')}`;
}

function closeBlock(entry, variant) {
  const idx = BUILT_IDS.indexOf(entry.id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const nav = [];
  if (prevEntry) nav.push(`previous file: **${prevEntry.unicode}** ([read it here](/sites/${prev}/blog/restoration/))`);
  if (nextEntry) nav.push(`next file: **${nextEntry.unicode}** ([read it here](/sites/${next}/blog/restoration/))`);
  const outros = [
    `The temple's [founding dispatch](/sites/${entry.id}/blog/) tells the name's story; its [Resonance File](/sites/${entry.id}/blog/resonance/) reads the myths into the industries; the [blog index](/blog/) holds the whole archive.`,
    `Read the [founding dispatch](/sites/${entry.id}/blog/) for the name's full story, the [Resonance File](/sites/${entry.id}/blog/resonance/) for the archetype at work — or the [whole archive](/blog/) in one sitting.`,
  ];
  return `## The File Continues

${V.pick(entry.id, 104, outros)}

${nav.length ? `Continue the series — ${nav.join(' · ')}.` : ''}

*The Restoration Files are written from the same canonical record as the temples themselves: the lexicon, the lore catalog, the pattern atlas, and the cited scholarly sources. If a file ever disagrees with its temple, the temple is right — tell us, and the file will be corrected.*`;
}

// ── Architecture A: The Evidence Ledger ─────────────────────────────────────

function archLedger(entry, script, lore) {
  const u = entry.unicode;
  const marks = marksList(entry);
  const lead = V.loreLead(lore);
  const arch = V.loreArchaeology(lore);
  const seats = seatsFor(entry.id);
  const texts = textsLinks(entry);
  const openers = [
    `Every name in this series was once flattened to fit a keyboard. **${u}** is what the evidence put back.`,
    `Some restorations are cosmetic. **${u}** is not — the marks in this name are the difference between reading the sources and guessing at them.`,
    `The domain you're reading about exists because someone refused to let **${u}** stay *${entry.ascii}*.`,
    `There is a version of this name the early internet had to settle for: *${entry.ascii}*. This is the file on how **${u}** replaced it.`,
  ];
  const parts = [];
  parts.push(V.pick(entry.id, 31, openers));
  if (lead) parts.push(lead);
  parts.push(glanceBlock(entry, script, null));

  // The Name Before the Marks
  const phil = ['## The Name Before the Marks', ''];
  if (entry.greek && entry.greek !== '—') {
    const cite = V.citeSources(lore);
    phil.push(`The name is attested as **${entry.greek}**${cite ? `, ${cite}` : ''}.${entry.meaning ? ` On the evidence, it means "${entry.meaning}".` : ''}`);
    phil.push('');
  }
  if (marks.length > 0) {
    phil.push(`Strip **${u}** to *${entry.ascii}* and ${marks.length === 1 ? 'one piece of evidence vanishes' : `${marks.length} pieces of evidence vanish`}:`);
    phil.push('');
    for (const m of marks) {
      const what = m.type === 'stress' ? 'the stress position' : 'the vowel length';
      phil.push(`- **${m.char} → ${m.to}** — ${m.note}: ${what} the ASCII form cannot show.`);
    }
    phil.push('');
    phil.push(V.pick(entry.id, 41, [
      'None of these marks is decoration. Each one is a fact about how the name was spoken, and each one is checkable against the scholarly record the temple cites.',
      'A reader who knows the marks hears the name correctly on the first try. A reader who never sees them never gets the chance.',
      'These are the small, provable things a restoration is made of: not taste, not branding — attestation.',
    ]));
  }
  const pron = V.lorePronunciation(lore);
  if (pron && pron.approximation) {
    phil.push('');
    phil.push(`Spoken, the name runs ${pron.ipa ? `\`${pron.ipa}\` — ` : ''}${pron.approximation.charAt(0).toLowerCase() + pron.approximation.slice(1)}`);
  }
  parts.push(phil.join('\n'));

  // The temple
  parts.push(`## The Temple That Stands Now

The restored name is not a plaque; it is an address. The temple of **${u}** lives at [/sites/${entry.id}/](/sites/${entry.id}/), with its mythology in the [lore halls](/sites/${entry.id}/lore/), its peer-reviewed record in the [Scholarly Edition](/sites/${entry.id}/scholars/), and its place in the pattern atlas on the [patterns floor](/sites/${entry.id}/patterns/).

${tierSentence(entry)}`);

  if (arch) {
    parts.push(`## Where the Name Stood First

${arch} The temple on the web is the newest of these addresses — the first one that fits in a pocket.`);
  }

  if (seats.length > 0) {
    parts.push(`## The Archetype at Work

The [pattern atlas](/patterns/) seats this temple in **${seats.length} ${seats.length === 1 ? 'industry' : 'industries'}**, each match argued and weighted: ${seats.slice(0, 3).map((s) => `**${s.name}** (${s.why.charAt(0).toLowerCase() + s.why.slice(1)})`).join('; ')}. The [Resonance File](/sites/${entry.id}/blog/resonance/) reads those seats through the myths themselves.`);
  }

  if (texts.length > 0) {
    const joined = texts.length === 1 ? texts[0] : `${texts.slice(0, -1).join(', ')}${texts.length > 2 ? ',' : ''} and ${texts[texts.length - 1]}`;
    parts.push(`## In the Sacred Texts

The ${V.displayPantheon(entry.pantheon)} tradition is not a vibe; it is a library. The [Sacred Texts collection](/texts/) holds ${joined} — the primary sources the temple's scholarship is built on. The temple is the argument; the texts are the evidence.`);
  }

  parts.push(closeBlock(entry));
  return parts.join('\n\n');
}

// ── Architecture B: Myth First ──────────────────────────────────────────────

function archMythFirst(entry, script, lore) {
  const u = entry.unicode;
  const myths = V.loreMyths(lore, 3);
  const marks = marksList(entry);
  const texts = textsLinks(entry);
  const parts = [];

  const openers = [
    `Before the spelling, the story. **${u}** earns its restoration the old way — through what was actually told.`,
    `The marks in **${u}** make the most sense standing next to the myths they have to carry. So the myths come first.`,
    `You cannot weigh an accent without knowing what it carries. Here is what **${u}** has been carrying.`,
  ];
  parts.push(V.pick(entry.id, 61, openers));

  if (myths.length > 0) {
    const blocks = myths.map((m) => {
      const tale = V.firstSentences(m.text, 3);
      return `**${m.title}.** ${tale}`;
    });
    parts.push(`## The Stories That Carry the Name\n\n${blocks.join('\n\n')}`);
  }

  const phil = ['## And Here Is What the Spelling Preserves', ''];
  if (entry.greek && entry.greek !== '—') {
    const cite = V.citeSources(lore);
    phil.push(`Against those stories, the attestation: **${entry.greek}**${cite ? `, ${cite}` : ''}.${entry.meaning ? ` The name means "${entry.meaning}".` : ''}`);
    phil.push('');
  }
  if (marks.length > 0) {
    phil.push(`The restoration keeps ${marks.length === 1 ? 'one feature' : `${marks.length} features`} the ASCII form *${entry.ascii}* cannot show:`);
    phil.push('');
    for (const m of marks) {
      const what = m.type === 'stress' ? 'where the voice peaks' : 'how long the vowel is held';
      phil.push(`- **${m.char} → ${m.to}** — ${m.note}: ${what}.`);
    }
    phil.push('');
    phil.push(V.pick(entry.id, 62, [
      'Read the myths again with the marks in place and the name lands differently — stressed where the sources stressed it, held where they held it.',
      'A storyteller pronouncing the name would restore every one of them by instinct. The file only writes down what the voice already knows.',
    ]));
  }
  parts.push(phil.join('\n'));

  parts.push(glanceBlock(entry, script, null));

  const sync = V.loreSyncretism(lore);
  if (sync) {
    parts.push(`## The Name Travels\n\n${V.firstSentences(sync, 2)}`);
  }

  parts.push(`## The Address It Earned

The temple of **${u}** stands at [/sites/${entry.id}/](/sites/${entry.id}/) — [lore](/sites/${entry.id}/lore/), [scholars](/sites/${entry.id}/scholars/), [patterns](/sites/${entry.id}/patterns/) — because a name carrying this much story deserves more than a parking page. ${tierSentence(entry)}`);

  if (texts.length > 0) {
    const joined = texts.length === 1 ? texts[0] : `${texts.slice(0, -1).join(', ')}${texts.length > 2 ? ',' : ''} and ${texts[texts.length - 1]}`;
    parts.push(`## The Sources Are Open\n\nThe myths above are retold from the temple's record; the primary voices are in the [Sacred Texts](/texts/): ${joined}. Nothing in this file outranks them.`);
  }

  parts.push(closeBlock(entry));
  return parts.join('\n\n');
}

// ── Architecture C: The Bench Notes ─────────────────────────────────────────

function archBench(entry, script, lore) {
  const u = entry.unicode;
  const marks = marksList(entry);
  const parts = [];

  const openers = [
    `*From the restoration bench — the working notes on ${u}, kept because the process is the proof.*`,
    `*Bench notes, ${u}: what we found, what we rejected, and what we finally set down. Kept in the open, because a restoration you cannot audit is just a spelling with confidence.*`,
    `*The workshop file for ${u}. Every rejected form is recorded here too — that is the point of keeping notes.*`,
  ];
  parts.push(V.pick(entry.id, 71, openers));

  const found = ['## What We Found', ''];
  if (entry.greek && entry.greek !== '—') {
    const cite = V.citeSources(lore);
    found.push(`The attestation, ${cite || 'from the canonical record'}: **${entry.greek}**.${entry.meaning ? ` Meaning: "${entry.meaning}".` : ''}`);
  } else {
    found.push(`The attestation runs through the tradition's own sources: **${script}**.${entry.meaning ? ` Meaning: "${entry.meaning}".` : ''}`);
  }
  const lead = V.loreLead(lore);
  if (lead) found.push(`\nThe figure behind the name: ${V.firstSentences(lead, 1)}`);
  parts.push(found.join('\n'));

  const myths = V.loreMyths(lore, 2);
  if (myths.length > 0) {
    const blocks = myths.map((m) => `**${m.title}.** ${V.firstSentences(m.text, 2)}`);
    parts.push(`## What the Name Carried In\n\n${blocks.join('\n\n')}\n\nA spelling that has to carry stories like these is not a label. It is equipment.`);
  }

  const arch = V.loreArchaeology(lore);
  if (arch) {
    parts.push(`## Where It Stood Before Us\n\n${arch} The bench inherits all of it — the web temple is the newest site, not the first.`);
  }

  if (marks.length > 0) {
    const keep = ['## What We Kept', ''];
    keep.push(`The evidence, mark by mark — ${marks.length} ${marks.length === 1 ? 'feature' : 'features'} the keyboard form *${entry.ascii}* cannot hold:`);
    keep.push('');
    for (const m of marks) {
      keep.push(`- **${m.char} → ${m.to}** — ${m.note}. Kept.`);
    }
    parts.push(keep.join('\n'));
  }

  const rejected = ['## What We Rejected', ''];
  rejected.push(V.pick(entry.id, 72, [
    `The plain ASCII *${entry.ascii}* — admissible as a fallback, never as the primary. A wrong accent would have been worse: the rulebook is explicit that a misplaced mark is worse than none.`,
    `*${entry.ascii}* as the primary form. It survives as the convenience it is; it does not get to lead. The hierarchy is full restoration first, and this name can afford to stand at the top of it.`,
    `Any form invented for availability. The rule on the bench: if the evidence does not carry it, the domain does not get it — whatever the registrar has in stock.`,
  ]));
  parts.push(rejected.join('\n'));

  const setDown = ['## What We Set Down', ''];
  setDown.push(`**${u}** — ${tierSentence(entry)}`);
  const pron = V.lorePronunciation(lore);
  if (pron && pron.approximation) {
    setDown.push(`\nFor the voice: ${pron.approximation.charAt(0).toLowerCase() + pron.approximation.slice(1)}`);
  }
  setDown.push(`\nThe temple stands at [/sites/${entry.id}/](/sites/${entry.id}/) — the notes above are public in its [Scholarly Edition](/sites/${entry.id}/scholars/), sources and all.`);
  parts.push(setDown.join('\n'));

  parts.push(glanceBlock(entry, script, null));
  parts.push(closeBlock(entry));
  return parts.join('\n\n');
}

// ── Architecture D: The Provenance Record ───────────────────────────────────

function archProvenance(entry, script, lore) {
  const u = entry.unicode;
  const marks = marksList(entry);
  const seats = seatsFor(entry.id);
  const arch = V.loreArchaeology(lore);
  const legacy = V.loreLegacy(lore);
  const sources = V.sourceList(lore, 4);
  const parts = [];

  const openers = [
    `*Provenance record ${String(BUILT_IDS.indexOf(entry.id) + 1).padStart(3, '0')} · ${u} · one temple, fully accounted for.*`,
    `*Catalogue entry — ${u}. Every claim below carries its chain of custody.*`,
    `*The provenance file for ${u}. Nothing here is unsourced; that is what the file is for.*`,
  ];
  parts.push(V.pick(entry.id, 81, openers));

  const entries = [];
  let n = 1;
  if (entry.greek && entry.greek !== '—') {
    entries.push(`**${n++}. The attestation.** **${entry.greek}**${entry.meaning ? ` — "${entry.meaning}"` : ''}.${sources.length ? ` On record: ${sources.join(', ')}.` : ''}`);
  } else {
    entries.push(`**${n++}. The attestation.** **${script}**, from the tradition's own record.${sources.length ? ` On record: ${sources.join(', ')}.` : ''}`);
  }
  if (marks.length > 0) {
    entries.push(
      `**${n++}. The preserved evidence.** ${marks.map((m) => `**${m.char} → ${m.to}** (${m.note})`).join('; ')} — absent from the ASCII form *${entry.ascii}*, present in the restoration, verifiable against the sources above.`
    );
  }
  const myths = V.loreMyths(lore, 2);
  if (myths.length > 0) {
    entries.push(
      `**${n++}. The narrative record.** ${myths.map((m) => `**${m.title}** — ${V.firstSentences(m.text, 2)}`).join(' ')}`
    );
  }
  if (arch) {
    entries.push(`**${n++}. The physical record.** ${arch}`);
  }
  entries.push(`**${n++}. The current holding.** The temple at [/sites/${entry.id}/](/sites/${entry.id}/), classified ${entry.tierLabel || `Tier ${entry.tier || '2'}`}. ${tierSentence(entry)}`);
  if (seats.length > 0) {
    entries.push(
      `**${n++}. The documented resonances.** ${seats.slice(0, 3).map((s) => `**${s.name}**`).join(', ')} — seats argued and weighted in the [pattern atlas](/patterns/), read through the myths in this temple's [Resonance File](/sites/${entry.id}/blog/resonance/).`
    );
  }
  const texts = textsLinks(entry);
  if (texts.length > 0) {
    entries.push(
      `**${n++}. The primary sources.** ${texts.join(', ')} — the library this file answers to, open at the [Sacred Texts collection](/texts/).`
    );
  }
  if (legacy) {
    entries.push(`**${n++}. The continuing record.** ${V.firstSentences(legacy, 2)}`);
  }
  parts.push(`## Provenance\n\n${entries.join('\n\n')}`);

  parts.push(glanceBlock(entry, script, null));
  parts.push(closeBlock(entry));
  return parts.join('\n\n');
}

// ── Titles & descriptions ───────────────────────────────────────────────────

function makeTitle(entry, arch) {
  const u = entry.unicode;
  const pools = {
    ledger: [
      `Inside the ${u} restoration: what the marks recover`,
      `${u}: the restoration, the temple, and the world it opens`,
      `Reading ${u} the way it was meant to be written`,
      `Why ${u} is spelled that way — and what it costs to get it right`,
    ],
    myth: [
      `${u}: the stories first, then the spelling`,
      `What the myths made ${u} carry`,
      `${u}, told properly — story and script together`,
      `The weight ${u} was always carrying`,
    ],
    bench: [
      `Bench notes: the ${u} restoration`,
      `How ${u} was rebuilt, mark by mark`,
      `The working file on ${u}`,
      `${u}: found, rejected, set down`,
    ],
    provenance: [
      `Provenance record: ${u}`,
      `${u}, fully accounted for`,
      `The provenance file on ${u}`,
      `${u}: one temple, every claim sourced`,
    ],
  };
  return V.pick(entry.id, 91, pools[arch]);
}

function makeDescription(entry, arch) {
  const u = entry.unicode;
  const pools = {
    ledger: [
      `The Restoration Files: ${u} — the philology of the name, the temple it lives in, and the evidence behind every mark.`,
      `${u}, restored: the attestation, the marks, the temple, and the sources you can check.`,
    ],
    myth: [
      `${u}: the myths that carry the name, and the spelling that carries the myths — the Restoration Files.`,
      `The stories first, then the script: ${u} restored the way the sources wrote it.`,
    ],
    bench: [
      `From the restoration bench: the working notes on ${u} — what was found, what was rejected, and what was finally set down.`,
      `The workshop file on ${u}: every kept mark and every rejected form, on the public record.`,
    ],
    provenance: [
      `The provenance record for ${u}: attestation, evidence, holding, and legacy — every claim sourced.`,
      `${u} in the catalogue: the full chain of custody behind the restoration, open for audit.`,
    ],
  };
  const desc = V.pick(entry.id, 92, pools[arch]);
  return desc.length >= 100 ? desc : `${desc} The Restoration Files, No. ${BUILT_IDS.indexOf(entry.id) + 1}.`;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  const archCount = { ledger: 0, myth: 0, bench: 0, provenance: 0 };

  for (const id of BUILT_IDS) {
    const entry = LEXICON_BY_ID.get(id);
    if (!entry) {
      console.warn(`  skipping ${id}: not in lexicon`);
      continue;
    }
    const lore = LORE[id] || null;
    const script = getOriginalScript(entry) || entry.greek || '—';
    const arch = ['ledger', 'myth', 'bench', 'provenance'][V.hashStr(id) % 4];
    archCount[arch]++;

    const body = arch === 'ledger'
      ? archLedger(entry, script, lore)
      : arch === 'myth'
        ? archMythFirst(entry, script, lore)
        : arch === 'bench'
          ? archBench(entry, script, lore)
          : archProvenance(entry, script, lore);

    let fullBody = `# ${makeTitle(entry, arch)}\n\n${body}\n`;

    // Length guard: lore-poor entries still get a full dispatch — the
    // temple's symbols, its pronunciation, and its tradition's discipline.
    if (fullBody.split(/\s+/).filter(Boolean).length < 450) {
      const enrich = [];
      const symbols = V.loreSymbols(lore, 3);
      if (symbols.length > 0) {
        enrich.push(
          `## The Emblems\n\nThe name does not travel alone. ${symbols.map((s) => `**${s.name}** — ${s.meaning}`).join('; ')}. Each emblem is filed in the temple's record with its own provenance, the same discipline the spelling gets.`
        );
      }
      const pron = V.lorePronunciation(lore);
      if (pron && pron.approximation) {
        enrich.push(
          `## For the Voice\n\n${pron.approximation}${pron.ipa ? ` The reconstructed line runs \`${pron.ipa}\` — the temple's pronunciation atlas carries the phonemes one by one.` : ''}`
        );
      }
      enrich.push(
        `## The Discipline It Answers To\n\nThis restoration belongs to ${V.displayPantheon(entry.pantheon)}, ${V.pantheonFlavor(entry.pantheon)}. The rules that govern it are not house style; they are the tradition's own scholarship, applied with the same care here as in any edition — and published, with the sources, so the file can be checked the way an edition can be checked. ${tierSentence(entry)}`
      );
      fullBody = fullBody.replace(/\n## The File Continues/, `\n${enrich.join('\n\n')}\n\n## The File Continues`);
    }
    const wc = fullBody.split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(3, Math.round(wc / 200));
    const post = {
      entryId: id,
      series: 'restoration',
      seriesNo: BUILT_IDS.indexOf(id) + 1,
      architecture: arch,
      title: fullBody.match(/^# (.+)$/m)[1],
      description: makeDescription(entry, arch),
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
      publishedAt: '2026-07-31',
      readingTime: `${readMin} min read`,
      body: fullBody,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    written++;
  }

  console.log(`The Restoration Files (elevated): ${written} posts — ${JSON.stringify(archCount)}`);
}

main();
