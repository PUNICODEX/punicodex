#!/usr/bin/env node
/**
 * PÚNYCODEX — Blog content generator
 *
 * Synthesizes one SEO-optimized blog post per built flagship temple from the
 * canonical scholarly sources. Output is the canonical source for the blog tab:
 *   platform/blog/content/{id}.json
 *
 * Usage:
 *   node scripts/generate-blog-content.js
 *   node scripts/generate-blog-content.js --regenerate
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
const LORE_CATALOG_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const SCHOLARS_DIR = path.join(ROOT, 'platform', 'scholars', 'content');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const {
  getOriginalScript,
  getScriptName,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);

const BUILT_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();

const LORE_CATALOG = JSON.parse(fs.readFileSync(LORE_CATALOG_PATH, 'utf8'));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const REGENERATE = process.argv.includes('--regenerate');
const PUBLISHED_AT = '2026-07-16';

// ── Deterministic helpers ───────────────────────────────────────────────────

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFrom(arr, seed, count) {
  if (!arr || arr.length === 0) return [];
  const out = [];
  let idx = seed % arr.length;
  const used = new Set();
  while (out.length < count && used.size < arr.length) {
    if (!used.has(idx)) {
      out.push(arr[idx]);
      used.add(idx);
    }
    idx = (idx + Math.max(1, seed % 7)) % arr.length;
  }
  return out;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMd(md) {
  return (md || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)/g, '')
    .replace(/(\*|_)/g, '')
    .replace(/`/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(text) {
  return stripMd(stripHtml(text)).replace(/\s+/g, ' ').trim();
}

function firstSentence(text) {
  const cleaned = plain(text);
  const m = cleaned.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : cleaned.slice(0, 140).trim() || cleaned;
}

function excerpt(text, max = 1150) {
  const cleaned = plain(text).replace(/\[\^\d+\]/g, '');
  if (!cleaned) return '';
  if (cleaned.length <= max) return cleaned;
  const trunc = cleaned.slice(0, max);
  const lastSpace = trunc.lastIndexOf(' ');
  return (lastSpace > 80 ? trunc.slice(0, lastSpace) : trunc) + '...';
}

function wordCount(md) {
  return md.split(/\s+/).filter((w) => w.length > 0).length;
}

// ── Source extraction ───────────────────────────────────────────────────────

function loadScholars(id) {
  const p = path.join(SCHOLARS_DIR, `${id}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function sectionBody(scholars, key) {
  return scholars?.sections?.[key]?.body || '';
}

function collectExternalLinks(scholars, lore) {
  const links = [];
  const add = (name, url) => {
    if (!url || typeof url !== 'string') return;
    if (!url.startsWith('http')) return;
    // avoid duplicates
    if (links.some((l) => l.url === url)) return;
    links.push({ name: plain(name).replace(/\s+/g, ' ') || 'Source', url });
  };

  if (scholars?.sections) {
    for (const sec of Object.values(scholars.sections)) {
      if (sec.sources) {
        for (const s of sec.sources) {
          add(s.citation || s.name || 'Source', s.url);
        }
      }
    }
  }

  if (lore?.sources) {
    for (const s of lore.sources) {
      add(s.name || s.citation || 'Source', s.url);
    }
  }

  if (links.length === 0) {
    const fallback = fallbackUrl(scholars?.entryId);
    if (fallback) add('Scholarly reference', fallback);
  }

  return links.slice(0, 4);
}

function fallbackUrl(id) {
  const entry = LEXICON_BY_ID.get(id);
  const map = {
    greek: 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek',
    'greek-location': 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek',
    sanskrit: 'https://www.sanskrit-lexicon.uni-koeln.de/',
    norse: 'https://heimskringla.no/wiki/Main_Page',
    egyptian: 'https://www.britishmuseum.org/',
    canaanite: 'https://www.britishmuseum.org/',
    phoenician: 'https://www.britishmuseum.org/',
    hittite: 'https://www.britishmuseum.org/',
    mesopotamian: 'https://www.britishmuseum.org/',
    japanese: 'https://jisho.org/',
    chinese: 'https://ctext.org/',
    taoist: 'https://ctext.org/',
    buddhist: 'https://www.buddhistdoor.net/',
    celtic: 'https://www.ucc.ie/celt/',
    zoroastrian: 'https://avesta.org/',
    slavic: 'https://www.rusliterature.org/',
    nahuatl: 'https://nahuatl.wired-humanities.org/',
    polynesian: 'https://www.te Papa.govt.nz/',
    yoruba: 'https://www.artsrn.ualberta.ca/ifa/',
    incan: 'https://www.britishmuseum.org/',
    korean: 'https://stdict.korean.go.kr/',
    baltic: 'https://www.lki.lt/',
    abrahamic: 'https://www.perseus.tufts.edu/hopper/',
  };
  return map[entry?.pantheon] || 'https://punycodex.com/lexicon/';
}

function buildData(id) {
  const entry = LEXICON_BY_ID.get(id);
  const archetype = ARCHETYPES.find((a) => a.id === id);
  const scholars = loadScholars(id);
  const lore = LORE_CATALOG[id];

  const script = getOriginalScript(entry);
  const scriptName = getScriptName(entry);
  const scriptLabel = script ? `${scriptName}` : 'scholarly transliteration';

  const overview = sectionBody(scholars, 'overview') || lore?.domains?.lead || '';
  const theName = sectionBody(scholars, 'the-name') || overview;
  const pronunciation = sectionBody(scholars, 'pronunciation') || '';
  const domains = sectionBody(scholars, 'domains') || lore?.domains?.lead || '';
  const mythology = sectionBody(scholars, 'mythology') || '';
  const syncretism = sectionBody(scholars, 'syncretism') || lore?.syncretism || '';
  const culturalLegacy = sectionBody(scholars, 'cultural-legacy') || lore?.culturalLegacy || '';
  const originalScript = sectionBody(scholars, 'original-script') || lore?.originalScriptNote || '';

  const pronunciationApprox =
    lore?.pronunciation?.approximation || firstSentence(pronunciation);

  const mythologyLead =
    lore?.mythology?.lead || (lore?.mythology?.myths?.[0]?.text) || mythology;

  const etymology = entry?.etymology;

  return {
    id,
    unicode: entry?.unicode || id,
    ascii: entry?.ascii || id,
    greek: entry?.greek || '',
    domain: entry?.domain || archetype?.domain || '',
    meaning: entry?.meaning || '',
    tier: entry?.tier || '',
    tierLabel: entry?.tierLabel || archetype?.tier || '',
    pantheon: entry?.pantheon || '',
    script: script || entry?.greek || '',
    scriptName,
    scriptLabel,
    overviewFirst: excerpt(overview, 760),
    nameFirst: excerpt(theName, 760),
    domainsFirst: excerpt(domains, 760),
    pronunciationApprox: firstSentence(pronunciationApprox),
    mythFirst: excerpt(mythologyLead, 760),
    syncretismFirst: excerpt(syncretism, 760),
    cultureFirst: excerpt(culturalLegacy, 760),
    scriptNote: excerpt(originalScript, 760) || `The name appears in ${scriptLabel}.`,
    etymologyDerivation: etymology?.derivation || etymology?.protoGloss || '',
    etymologyProto: etymology?.protoForm || '',
    etymologyGloss: etymology?.protoGloss || '',
    variants: (entry?.variants || [])
      .filter((v) => v && v.unicode)
      .map((v) => v.unicode)
      .slice(0, 3),
  };
}

// ── Internal crosslinks ─────────────────────────────────────────────────────

function internalLinks(id, pantheon, count) {
  const same = LEXICON.filter((e) => e.id !== id && e.pantheon === pantheon).sort(
    (a, b) => a.id.localeCompare(b.id)
  );
  const pool = same.length >= count ? same : LEXICON.filter((e) => e.id !== id).sort((a, b) => a.id.localeCompare(b.id));
  const seed = hash(id + ':bloglinks');
  const picked = pickFrom(pool, seed, count);
  return picked.map((e) => ({ id: e.id, label: e.unicode || e.id }));
}

// ── Title / description / keywords ──────────────────────────────────────────

const TITLE_TEMPLATES = [
  'Why {unicode} belongs in your address bar',
  'The hidden history behind {unicode}',
  'From {script} to Unicode: the journey of {unicode}',
  '{unicode} in 2026: why scholars still care',
  'How {unicode} got its accent back',
  'The name {unicode} and the world it opens',
  'Pronouncing {unicode}: a guide for the curious',
  'The many faces of {unicode}',
];

const SHORT_TITLE_TEMPLATES = [
  '{unicode}: a Unicode restoration story',
  '{unicode} and the original script',
  'Restoring {unicode}',
  '{unicode}: name, myth, and Unicode',
];

const DESCRIPTION_TEMPLATES = [
  'Explore the Unicode restoration of {unicode} and why the original form still matters in 2026.',
  'A scholarly look at {unicode}: etymology, pronunciation, and the fight to keep original names on the web.',
  'From {script} to Unicode: why {unicode} is more than a domain name.',
  'Why {unicode} remains a living name: mythology, modern DNS, and the PÚNYCODEX restoration.',
  'Discover {unicode}: the story behind the Unicode domain, the original script, and the scholars preserving it.',
];

function makeTitle(data, angleIdx) {
  const tpl = TITLE_TEMPLATES[angleIdx % TITLE_TEMPLATES.length];
  let title = tpl
    .replace(/{unicode}/g, data.unicode)
    .replace(/{script}/g, data.scriptName);
  if (title.length > 70) {
    const short = SHORT_TITLE_TEMPLATES[angleIdx % SHORT_TITLE_TEMPLATES.length].replace(/{unicode}/g, data.unicode);
    title = short.length > 70 ? `${data.unicode}: a Unicode story` : short;
  }
  return title.slice(0, 70);
}

function makeDescription(data, angleIdx) {
  const tpl = DESCRIPTION_TEMPLATES[angleIdx % DESCRIPTION_TEMPLATES.length];
  let desc = tpl
    .replace(/{unicode}/g, data.unicode)
    .replace(/{script}/g, data.scriptName);
  if (desc.length > 160) {
    desc = `Discover ${data.unicode}: the Unicode restoration, original script, and scholarly story behind the name.`;
  }
  return desc.slice(0, 160);
}

function makeKeywords(data) {
  const kw = [
    data.unicode,
    data.ascii,
    `${data.pantheon} mythology`,
    'Unicode domain',
    'original script',
    'PÚNYCODEX',
    'IDN',
    `${data.scriptName} restoration`,
  ];
  return kw.filter(Boolean).slice(0, 8);
}

function makeTags(data) {
  return [
    data.pantheon || 'mythology',
    data.tierLabel || 'tier-2',
    'Unicode',
    'original script',
    'restoration',
  ].filter(Boolean).slice(0, 5);
}

// ── Angle builders ──────────────────────────────────────────────────────────

function relatedLinksMd(links) {
  return links
    .map((l) => `- [${l.label}](/sites/${l.id}/)`)
    .join('\n');
}

function sourcesMd(links) {
  if (links.length === 0) return '';
  return links
    .map((l) => `- [${l.name}](${l.url})`)
    .join('\n');
}

function angle0(data, links, externals) {
  return `# Why ${data.unicode} Belongs in the Address Bar

Every address bar is a choice. When you type **${data.unicode}**, you are not typing a novelty; you are restoring a name. The plain ASCII form *${data.ascii}* is the leftover of a DNS that was built for English typewriters, not for the world's naming traditions. ${data.overviewFirst || data.nameFirst}

## The Name the DNS Almost Forgot

${data.nameFirst || `The name ${data.unicode} carries a meaning that ASCII cannot show.`} In scholarly terms, it belongs to the **${data.tierLabel}** class: ${tierExplanation(data)}. That detail is not decorative; it is the difference between a label and a lived name.

## From ${data.scriptName} to the Browser

${data.scriptNote || `The original form appears in ${data.scriptName || 'its source tradition'}.`} The PÚNYCODEX temple does not invent a spelling; it recovers one. By registering the Unicode form, the project proves that the original script can survive inside the infrastructure of the modern web.

## Why 2026 Still Needs This

In 2026, names are data. Search engines, AI training corpora, and localization teams all need authoritative forms. ${data.unicode} is a small but concrete demonstration that philology and DNS can coexist. The [Scholarly Edition](/sites/${data.id}/scholars/) preserves the argument; the blog makes it approachable.

## Related Names

${relatedLinksMd(links)}

## Read More

${sourcesMd(externals)}`;
}

function angle1(data, links, externals) {
  return `# The Hidden History Behind ${data.unicode}

Behind the modern ASCII *${data.ascii}* hides a longer story. ${data.nameFirst || data.overviewFirst} That history reaches back through manuscripts, inscriptions, and oral traditions before it ever reached a keyboard.

## Etymology

${data.etymologyDerivation ? data.etymologyDerivation : `The deeper roots of ${data.unicode} are still debated among specialists.`} ${data.etymologyProto ? `Reconstructed proto-forms such as *${data.etymologyProto}* give linguists a ladder back toward the name's earliest sound.` : ''} ${data.meaning ? `The traditional gloss is "${data.meaning}."` : ''}

## In Myth

${data.mythFirst || `${data.unicode} appears in stories that shaped its civilization.`} These narratives are not dusty footnotes; they are the reason the name acquired its resonance.

## Across Cultures

${data.syncretismFirst || `${data.unicode} did not stay inside one language or one pantheon.`} Names travel, adapt, and accumulate meanings. Tracking that travel is part of what makes the restoration worthwhile.

## The Unicode Decision

Restoring ${data.unicode} is not an aesthetic choice. It is a decision to honor the name as attested rather than the name as flattened by ASCII. That choice is documented in the [Scholarly Edition](/sites/${data.id}/scholars/) and defended by the sources below.

## Related Names

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

function angle2(data, links, externals) {
  return `# From ${data.scriptName} to Unicode: The Journey of ${data.unicode}

Long before it was a domain, the name traveled through scripts. ${data.scriptNote || `In ${data.scriptName || 'its original writing system'}, the form carries information that the Latin alphabet alone cannot hold.`} This post follows ${data.unicode} from its earliest attestation to the address bar.

## The Original Sign

${data.script ? `The original script gives us **${data.script}**. ` : ''}${data.scriptNote || `That sign or sequence encodes sounds, syllables, and cultural context that a simple transliteration loses.`}

## The Scholarly Transliteration

${data.nameFirst || data.overviewFirst} Scholars settled on ${data.unicode} as the registrable restoration: faithful enough to be recognizable, precise enough to carry the marks that matter.

## DNS as a Time Machine

Punycode lets the DNS carry non-ASCII characters without breaking older routers. To the user, the address bar shows ${data.unicode}; to the infrastructure, it is an encoded xn-- string. The duality is invisible, but the result is revolutionary: a pre-digital name living inside a post-digital system.

## Pronunciation

${data.pronunciationApprox ? `Scholars reconstruct the sound as *${data.pronunciationApprox}*.` : `The pronunciation of ${data.unicode} has been reconstructed from meter, rhyme, and comparative evidence.`} Hearing the name in your own voice is one way to make the restoration personal.

## Related Names

${relatedLinksMd(links)}

## Further Reading

${sourcesMd(externals)}`;
}

function angle3(data, links, externals) {
  return `# ${data.unicode} in 2026: Why Scholars Still Care

In 2026, names are treated as data points. ${data.unicode} is a reminder that they are also cultural artifacts. ${data.overviewFirst || data.nameFirst} The question is not whether the name is old, but whether the digital world is old enough to hold it.

## The Scholarly Argument

${data.nameFirst || `The restoration of ${data.unicode} rests on attested spelling, stress, and length.`} The PÚNYCODEX Scholarly Edition collects these arguments in one place, with sources and revision history, so the claim can be inspected rather than merely asserted.

## What the Accent Preserves

${data.tierLabel ? `This entry is classified as **${data.tierLabel}**. ` : ''}${tierExplanation(data)} Those marks are not ornaments; they are the coordinates that place the name inside a language.

## A Living Edition

The [Scholarly Edition](/sites/${data.id}/scholars/) is not a static page. Verified contributors can improve it, and every change is attributed. That model turns a blog post like this one into an invitation to dig deeper.

## Where to Learn More

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

function angle4(data, links, externals) {
  return `# How ${data.unicode} Got Its Accent Back

The ASCII form *${data.ascii}* is missing something. ${data.unicode} restores the marks that the original language used to distinguish this name from a thousand others. ${data.nameFirst || data.overviewFirst}

## The Missing Marks

${data.tierLabel ? `Classified as **${data.tierLabel}**, this restoration ` : 'This restoration '}carries the stress and length that standard ASCII discards. ${tierExplanation(data)}

## Step by Step

The transformation from *${data.ascii}* to **${data.unicode}** happens one character at a time. Some letters stay the same; others gain accents, macrons, or entirely new shapes. The breakdown on the [temple home page](/sites/${data.id}/) shows exactly how.

## Why Stress and Length Matter

In the source language, changing a stress or a vowel length can change a meaning. Names are especially sensitive because they are proper nouns: one spelling points to one entity. ${data.unicode} preserves that pointer in a way *${data.ascii}* cannot.

## The Restored Form

${data.unicode} is now a domain. That simple fact turns a philological detail into a public demonstration. Anyone who types it participates in the restoration.

## Related Names

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

function angle5(data, links, externals) {
  return `# The Name ${data.unicode} and the World It Opens

A name is a door. ${data.unicode} opens onto ${data.domain ? data.domain.toLowerCase() : 'a mythic landscape'}. ${data.overviewFirst || data.nameFirst}

## Domain and Meaning

${data.domain ? `The temple domain is **${data.domain}**. ` : ''}${data.meaning ? `The traditional meaning is "${data.meaning}." ` : ''}Together, those two facts explain why the name mattered enough to be remembered for millennia.

## The Mythic Landscape

${data.mythFirst || `${data.unicode} appears in narratives that shaped how its culture understood power, identity, and fate.`} Myth is the memory of a civilization, and names are the hooks on which that memory hangs.

## Modern Patterns

The [Patterns](/sites/${data.id}/patterns/) page maps the industries and sister temples that share ${data.unicode}'s current. A name that once organized ritual now organizes search, advertising, and creative collaboration.

## Join the Restoration

You can support the work through the [Patron](/sites/${data.id}/patron/) wall, submit creative work, or simply share the address. Every visit to ${data.unicode} is a vote for original scripts.

## Related Names

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

function angle6(data, links, externals) {
  return `# Pronouncing ${data.unicode}: A Guide for the Curious

Saying **${data.unicode}** out loud is harder than reading it on a screen, and more rewarding. ${data.pronunciationApprox ? `Scholars reconstruct the sound as *${data.pronunciationApprox}*.` : `The original pronunciation has to be reconstructed from meter, cognates, and later testimony.`}

## The Reconstructed Sound

${data.nameFirst || data.overviewFirst} The sounds preserved in ${data.unicode} are not random; they follow rules that linguists have spent centuries recovering.

## Sound by Sound

${data.etymologyDerivation ? `Etymologically, ${data.etymologyDerivation.toLowerCase()} ` : ''}${data.etymologyProto ? `That points back to a reconstructed form like *${data.etymologyProto}*.` : ''} Each segment locks into the next, so a small change in one place ripples through the whole name.

## Kin Forms

${data.variants.length ? `Related spellings include ${data.variants.join(', ')}. ` : ''}Names rarely have only one valid shape. The restoration chooses the form that best balances historical accuracy with the practical limits of DNS.

## From Speech to Screen

Pronunciation and spelling converge in Unicode. ${data.unicode} carries enough phonetic information to be read aloud by someone who knows the conventions, and enough visual distinctiveness to stand out in an address bar.

## Related Names

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

function angle7(data, links, externals) {
  return `# The Many Faces of ${data.unicode}

No important name has only one face. ${data.unicode} appears as a mythic character, a scholarly reconstruction, a cultural memory, and now a Unicode domain. ${data.overviewFirst || data.nameFirst}

## In Myth

${data.mythFirst || `${data.unicode} moves through stories that test the boundaries of power and mortality.`} The mythic face is the one most people meet first, and it is the reason the name survived.

## Across Cultures

${data.syncretismFirst || `${data.unicode} was borrowed, translated, and reinterpreted as it moved between languages.`} Each culture kept what resonated and reshaped the rest.

## In the Scholarly Record

${data.cultureFirst || `${data.unicode} has left traces in inscriptions, manuscripts, and comparative linguistics.`} The Scholarly Edition collects those traces so readers can follow the argument from source to conclusion.

## The Unicode Face

The newest face is digital. ${data.unicode} demonstrates that a name can be at once ancient and clickable, venerable and searchable. That is the face this blog exists to celebrate.

## Related Names

${relatedLinksMd(links)}

## Sources

${sourcesMd(externals)}`;
}

const ANGLES = [angle0, angle1, angle2, angle3, angle4, angle5, angle6, angle7];

function tierExplanation(data) {
  if (data.tier === 'dual') {
    return `the Greek original carries both stress and length, and multiple historically valid Unicode spellings exist`;
  }
  if (data.tier === '1') {
    return `the Greek original carries both stress and length, and only one valid Unicode restoration exists`;
  }
  return `the original preserves at least one philological feature that ASCII cannot encode`;
}

function buildBody(data, angleIdx, links, externals) {
  const builder = ANGLES[angleIdx % ANGLES.length];
  let body = builder(data, links, externals).trim();

  // If the angle is still light, add a substantive extra section before the closing.
  let wc = wordCount(body);
  if (wc < 850) {
    const extraSections = [
      { h: 'What the Sources Record', t: data.domainsFirst || data.overviewFirst },
      { h: 'The Cultural Afterlife', t: data.cultureFirst || data.overviewFirst },
      { h: 'The Name in Context', t: data.overviewFirst || data.domainsFirst },
    ];
    const extra = extraSections[angleIdx % extraSections.length];
    if (extra.t) {
      body += `\n\n## ${extra.h}\n\n${extra.t}`;
      wc = wordCount(body);
    }
  }

  // Add a unifying closing section before the related-name list.
  const closing = `\n\n## Why This Restoration Matters\n\nRestoring ${data.unicode} is part of a larger effort to make the web multilingual by default. The PÚNYCODEX project does not ask users to learn a new alphabet; it asks the infrastructure to respect the alphabets that already exist. A single Unicode domain is a small proof, but it is a proof that scales: every name restored makes the next one easier.`;
  body = body.replace(/\n\n## Related Names/, `${closing}\n\n## Related Names`);

  // Ensure word count lands in the 700–900 target range (test allows up to 950).
  wc = wordCount(body);
  const expansions = [
    `\n\n## The PÚNYCODEX Angle\n\nThe PÚNYCODEX project treats ${data.unicode} as more than a curiosity. It is a proof that the domain-name system can carry the full weight of human naming, from ${data.scriptName || 'its source tradition'} to the modern browser. Every visit to this temple is a small act of preservation.`,
    `\n\n## For Developers and Linguists\n\nThe PÚNYCODEX dataset exposes ${data.unicode} through a versioned API, making the restoration usable by search engines, localization pipelines, and scholarly tools. Because the canonical sources are stored as structured JSON, every improvement flows automatically to the temple, the extension, and the mobile app.`,
    `\n\n## Visit the Temple\n\nIf this post sparked your curiosity, the [home page](/sites/${data.id}/) offers the full name breakdown, the [lore page](/sites/${data.id}/lore/) explores the myth, and the [Scholarly Edition](/sites/${data.id}/scholars/) provides the footnotes. Each page is a doorway into the same restoration.`,
    `\n\n## Why This Name Still Travels\n\nNames like ${data.unicode} do not retire. They resurface in translations, in adaptations, in brand names, and in scholarly debates because they still do useful cultural work. Keeping the original spelling alive in a domain is one way to make sure that work continues in the digital layer.`,
    `\n\n## A Note on the Address Bar\n\nWhen you type ${data.unicode}, the browser performs an invisible conversion into Punycode so the global DNS can route the request. The user sees the original name; the machines see a compatible ASCII encoding. That duality is the engineering compromise that makes the restoration possible, and it is the reason every Unicode domain is both a technical milestone and a small act of cultural memory.`
  ];
  while (wc < 720 && expansions.length > 0) {
    body += expansions.shift();
    wc = wordCount(body);
  }
  while (wc > 950) {
    const lastBreak = Math.max(body.lastIndexOf('\n\n'), body.lastIndexOf('\n## '));
    if (lastBreak <= 200) break;
    body = body.slice(0, lastBreak).trim();
    wc = wordCount(body);
  }
  return body;
}

// ── Main loop ───────────────────────────────────────────────────────────────

fs.mkdirSync(BLOG_DIR, { recursive: true });

let created = 0;
let skipped = 0;

for (const id of BUILT_IDS) {
  const outPath = path.join(BLOG_DIR, `${id}.json`);
  if (!REGENERATE && fs.existsSync(outPath)) {
    skipped++;
    continue;
  }

  const data = buildData(id);
  const seed = hash(id);
  const angleIdx = seed % ANGLES.length;

  const links = internalLinks(id, data.pantheon, 3);
  const scholars = loadScholars(id);
  const externals = collectExternalLinks(scholars, LORE_CATALOG[id]);

  const title = makeTitle(data, angleIdx);
  const description = makeDescription(data, angleIdx);
  const body = buildBody(data, angleIdx, links, externals);
  const wc = wordCount(body);

  const post = {
    entryId: id,
    title,
    description,
    keywords: makeKeywords(data),
    tags: makeTags(data),
    author: 'PÚNYCODEX Team',
    publishedAt: PUBLISHED_AT,
    body,
    readingTime: `${Math.max(4, Math.round(wc / 200))} min read`,
  };

  fs.writeFileSync(outPath, JSON.stringify(post, null, 2) + '\n', 'utf8');
  created++;
}

console.log(`Blog content: ${created} created, ${skipped} preserved (total ${BUILT_IDS.length})`);
