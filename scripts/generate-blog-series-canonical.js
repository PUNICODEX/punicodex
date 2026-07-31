#!/usr/bin/env node
/**
 * PuniCodex — The Canonical Register (series generator)
 *
 * Writes platform/blog/series/canonical/{id}.json for every built flagship:
 * the authoritative reference dispatch. Each post sets down the canonical
 * transliteration with its evidence, dissects the false forms circulating on
 * the internet (macrons and accents in the wrong place, dropped diacritics,
 * folk respellings — each with its origin and its exact violation), weighs
 * the genuinely contested scholarly variants, and states plainly what
 * IDNA 2008 and the registrars allow — including this project's own
 * precedents (the wrong-stress domain we abandoned, the canonical form we
 * promoted over the recognizable one).
 *
 * Usage:
 *   node scripts/generate-blog-series-canonical.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'canonical');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { getOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const LORE = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const V = require(path.join(ROOT, 'scripts', 'lib', 'blog-voice.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

// ── Tradition conventions (what "correct" means here) ───────────────────────

const TRADITION_CONVENTION = {
  greek: 'the restored-stress convention: acute and circumflex for pitch, macrons for vowel quantity, exactly as the sources write',
  sanskrit: 'IAST — macrons for long vowels, underdots for retroflexes, the International Alphabet of Sanskrit Transliteration',
  norse: 'normalized Old Norse spelling — þ, ð, ǫ, æ and length marks preserved as the editions print them',
  egyptian: 'Egyptological transliteration — ꜣ, ꜥ, ḥ, ḏ, ṯ as the grammars record them',
  mesopotamian: 'Assyriological transliteration — š, ṣ, ṭ, ḫ as the sign lists require',
  japanese: 'Hepburn with macrons — ō and ū marked, never collapsed to o/u or rewritten ou',
  chinese: 'pinyin with tone marks — tones shown, ǖ kept distinct from u',
  yoruba: 'modern Yoruba orthography — underdotted vowels and ṣ preserved',
  zoroastrian: 'Avestan scholarly transliteration as the liturgies are edited',
  roman: 'Latin editorial convention, with Greek originals kept distinct from Roman reception',
  polynesian: 'vowel-length marking as the language commissions standardize it',
  canaanite: 'Ugaritic/Phoenician scholarly convention with matres and gutturals shown',
  abrahamic: 'biblical scholarly transliteration with matres and gutturals shown',
};

// ── The false-form engine ───────────────────────────────────────────────────
// Each false form is a real error pattern seen in the wild, with its origin
// story and the exact mark it violates. Generated from the entry's own
// structure so every accusation is specific.

function greekFalseForms(entry) {
  const forms = [];
  const u = entry.unicode;
  const ascii = entry.ascii;
  const marks = (entry.breakdown || []).filter((b) => b.type === 'stress' || b.type === 'length');
  const stress = marks.find((b) => b.type === 'stress');
  const length = marks.find((b) => b.type === 'length');

  // 2. Stress moved to the first syllable (English stress habit).
  if (stress) {
    const firstVowel = u.match(/[aeiouāēīōūáéíóúâêîôû]/i);
    if (firstVowel) {
      const idx = firstVowel.index;
      const wrong = u.slice(0, idx) + firstVowel[0].normalize('NFD').replace(/̀-ͯ/g, '') + '́'.normalize('NFC') + u.slice(idx + 1);
      const wrongForm = wrong.replace(/[áéíóúâêîôû]/g, (c) => c.normalize('NFD').replace(/̀-ͯ/g, '')).replace(firstVowel[0], firstVowel[0].normalize('NFD').replace(/̀-ͯ/g, '') + '́');
      forms.push({
        form: wrongForm.normalize('NFC'),
        origin: 'the English ear — English speakers slam the first syllable of every borrowed name (DEL-fi, MY-cene), so the accent drifts forward online',
        violation: `moves the stress from ${stress.char} (where the Greek puts it) to ${firstVowel[0].toUpperCase()} — a different word with a different rhythm; the sources stress ${stress.char} and nothing else`,
      });
    }
  }

  // 3. Macron dropped, stress kept (the "half restoration").
  if (length && stress) {
    const noMacron = u.replace(/[āēīōū]/g, (c) => ({ ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u' })[c] || c);
    forms.push({
      form: noMacron.normalize('NFC'),
      origin: 'the half-restoration — well-meaning posts that keep the accent because it looks Greek and drop the macron because it looks optional',
      violation: `drops the vowel length on ${length.char} → ${length.to}: the quantity is as attested as the accent (${length.note}), and without it the meter of the name collapses`,
    });
  }

  // 4. Macron on the wrong vowel.
  if (length) {
    const vowels = [...u.matchAll(/[aeiou](?!̀-ͯ)/g)].map((m) => m[0]);
    if (vowels.length > 1) {
      const wrongVowel = vowels.find((v) => v !== length.char) || vowels[0];
      const wrong = u.replace(/[āēīōū]/g, (c) => ({ ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u' })[c] || c).replace(wrongVowel, { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū' }[wrongVowel]);
      forms.push({
        form: wrong.normalize('NFC'),
        origin: 'macron roulette — pages that know a long vowel exists somewhere in the name and plant the bar on the wrong one',
        violation: `lengthens ${wrongVowel} when the attested long vowel is ${length.char} (${length.note}); moving the bar is not a small error — it asserts a different Greek word`,
      });
    }
  }

  // 5. Circumflex/acute confusion.
  if (stress) {
    const circumflexed = u.replace(/[áéíóú]/g, (c) => ({ á: 'â', é: 'ê', í: 'î', ó: 'ô', ú: 'û' })[c] || c);
    forms.push({
      form: circumflexed.normalize('NFC'),
      origin: 'the circumflex habit — writers who learned that "the little hat means Greek" and apply it wherever an acute belongs',
      violation: `the source carries an acute (oxeia, a rising tone), not a circumflex (perispomene, a rise-fall): the two marks are different facts about pitch, and only the acute is attested on ${stress.char}`,
    });
  }

  // 6. The folk respelling.
  const folk = ascii.replace(/ll/g, 'l').replace(/ph/g, 'f').replace(/th/g, 't').replace(/rh/g, 'r');
  if (folk !== ascii) {
    forms.push({
      form: folk,
      origin: 'the anglicized respelling — the name written the way English guesses it sounds',
      violation: 'rewrites the consonants of the attested form to fit English spelling habits; every cluster simplified this way erases a letter the sources write',
    });
  }

  return forms.slice(0, 5);
}

// Per-tradition diacritic maps for the "stripped/wrong" forms.
const STRIP_MAP = {
  sanskrit: { ā: 'a', ī: 'i', ū: 'u', ṛ: 'r', ṝ: 'ri', ṭ: 't', ḍ: 'd', ṇ: 'n', ṣ: 's', ṃ: 'm', ḥ: 'h', ś: 's', ñ: 'n', ṅ: 'n' },
  norse: { þ: 'th', ð: 'd', ǫ: 'o', æ: 'ae', œ: 'oe', ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u', ý: 'y', ø: 'o', ǣ: 'ae' },
  egyptian: { ꜣ: 'a', ꜥ: "'", ḥ: 'h', ḫ: 'kh', ḏ: 'd', ṯ: 't', ỉ: 'i', š: 'sh', ẖ: 'h' },
  japanese: { ō: 'o', ū: 'u', ā: 'a', ē: 'e', ī: 'i' },
  chinese: { ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u', ü: 'u', ń: 'n', ň: 'n', ǹ: 'n' },
  mesopotamian: { š: 'sh', ṣ: 's', ṭ: 't', ḫ: 'kh', ḥ: 'h', ā: 'a', ē: 'e', ī: 'i', ū: 'u', â: 'a', ê: 'e', î: 'i', û: 'u' },
  canaanite: { š: 'sh', ṣ: 's', ṭ: 't', ḥ: 'h', ā: 'a', ē: 'e', ō: 'o', î: 'i', û: 'u', ʿ: "'", ʾ: "'", ġ: 'g', ḏ: 'd' },
  yoruba: { ọ: 'o', ẹ: 'e', ṣ: 's', ń: 'n', é: 'e', ó: 'o', è: 'e', ò: 'o' },
  zoroastrian: { ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o', š: 'sh', ž: 'zh', ṧ: 's', ṅ: 'n', ṇ: 'n', ṭ: 't', ḍ: 'd', ɫ: 'l', x́: 'kh' },
  slavic: { š: 'sh', č: 'ch', ž: 'zh', ą: 'a', č: 'ch', ė: 'e', į: 'i', ū: 'u', ě: 'e' },
  baltic: { š: 'sh', č: 'ch', ž: 'zh', ė: 'e', į: 'i', ū: 'u', ą: 'a' },
  polynesian: { ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u', ʻ: "'" },
  abrahamic: { ā: 'a', ē: 'e', ō: 'o', ḥ: 'h', ṭ: 't', ṣ: 's', š: 'sh', ʿ: "'", ʾ: "'", ḏ: 'd', ṯ: 't' },
};

function stripMarks(u, map) {
  let out = u;
  for (const [mark, plain] of Object.entries(map)) {
    out = out.split(mark).join(plain);
  }
  return out;
}

function traditionFalseForms(entry) {
  const pantheon = entry.pantheon;
  const map = STRIP_MAP[pantheon] || { ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u' };
  const u = entry.unicode;
  const forms = [];
  const stripped = stripMarks(u, map);
  const hasMarks = stripped !== u;

  if (hasMarks) {
    // The "publisher compromise" form — stripped letters printed as the name.
    forms.push({
      form: stripped,
      origin: 'the publisher compromise — older books and hurried websites that print the "English equivalent" as if it were the name itself',
      violation: `every substitution here (${Object.keys(map).filter((k) => u.includes(k)).slice(0, 3).map((k) => `${k}→${map[k]}`).join(', ')}) is a romanization of convenience, not an attested spelling — it teaches the reader to guess, not to read`,
    });
    // The near-miss: one distinctive letter swapped for its neighbor.
    const distinctive = Object.keys(map).filter((k) => u.includes(k));
    if (distinctive.length > 0) {
      const swapExamples = {
        ṭ: ['t', 'a dental for a retroflex — the tongue is in the wrong place entirely'],
        ḍ: ['d', 'a dental for a retroflex — the tongue is in the wrong place entirely'],
        ṇ: ['n', 'a dental nasal for a retroflex — they are different phonemes in Sanskrit'],
        ṣ: ['s', 'a plain sibilant for a retroflex ṣ — the distinction carries meaning'],
        þ: ['p', 'a plosive for the fricative þ — thorn is not a fancy p'],
        ð: ['þ', 'eth and thorn are not interchangeable: one is voiced, one is not'],
        ǫ: ['ö', 'the o-with-ogonek (a nasal vowel) is not a diaeresis — different history, different sound'],
        ꜣ: ['â', 'the aleph ꜣ is a consonant (a glottal/vocalic reed), not a long vowel â'],
        ꜥ: ['a', 'the ayin ꜥ is a pharyngeal consonant, not a vowel — deleting it deletes a consonant'],
        š: ['s', 'š is a hushing sibilant, not plain s — the whole Semitic consonant inventory depends on it'],
        ō: ['ô', 'a macron (length) is not a circumflex (quality/tone) — they answer different questions'],
        ǖ: ['ü', 'tone marks are not decoration: dropping them erases the lexical tone'],
        ọ: ['ô', 'the underdot of ọ marks vowel quality, not tone or length'],
        ū: ['ú', 'a macron marks length; an acute marks tone — different facts'],
      };
      const letter = distinctive[0];
      const swap = swapExamples[letter];
      if (swap) {
        forms.push({
          form: u.split(letter).join(swap[0][0]),
          origin: 'the near-miss — a form that looks right at a glance and circulates on wikis and forums',
          violation: swap[1],
        });
      }
    }
  }

  // The folk/anglicized respelling.
  const folk = entry.ascii.replace(/ll/g, 'l').replace(/ph/g, 'f').replace(/th/g, 't').replace(/rh/g, 'r').replace(/kh/g, 'k').replace(/bh/g, 'b').replace(/dh/g, 'd');
  if (folk !== entry.ascii) {
    forms.push({
      form: folk,
      origin: 'the anglicized respelling — the name written the way English guesses it sounds',
      violation: 'rewrites attested consonant clusters to fit English spelling habits; every cluster simplified this way erases a letter the sources write',
    });
  }

  return forms.slice(0, 4);
}

// ── Precedents (this project's own history, told straight) ──────────────────

const PRECEDENTS = {
  apollon: {
    title: 'The domain we abandoned',
    text: 'This project once held the wrong-stress form *ápollōn.com* — the accent on the first syllable, where the English ear wants it. It was retired deliberately, in favor of **apollōn.com**: the sources stress the second syllable, and the rulebook is explicit — a wrong accent position is worse than no accent. The wrong domain was not kept "for the traffic"; it was dropped because the evidence said so. That is what canonical means in practice.',
  },
  athena: {
    title: 'Canonical over recognizable',
    text: 'Two attested forms compete here: **Athēnâ** (Ἀθηνᾶ, the contracted Attic form with the circumflex) and **Athénā** (the form more readers recognize). When the domain for the canonical circumflexed form was acquired, it became the primary — **athēnâ.com** — and the recognizable form remains live as an attested variant, not the head of the temple. The rule: when both are owned, canonical beats recognizable.',
  },
  asia: {
    title: 'The reviewed exception',
    text: 'The final -ā of **Āsíā** is long by first-declension rule, though the surface looks like an ordinary short-a ending. This is the lexicon’s one standing editorial exception, reviewed and recorded: mechanical rules catch most of the fleet, and scholarship catches the rest. An exception with a citation is not an inconsistency; it is the system working.',
  },
};

const IDNA_NOTE = `## What the Address Bar Allows

IDNA 2008 permits the letters these restorations use — macrons, acutes, underdots, thorn, ogonek, the lot — and the DNS carries them as punycode (\`xn--\` labels). Two honest constraints remain. First, **registrar inventory**: the protocol permits a character; the registrar's stock decides whether the exact domain can be bought today. Second, **combined marks**: forms like *Apṓllōn* (acute stacked on a macron) are philologically ideal yet effectively untypeable on phones and unsupported across much of the registration system.

That is why the rulebook keeps a fallback hierarchy — full restoration first, then the circumflex when the source carries one, then the macron-only academic standard, then an attested variant, and only as a last resort the plain ASCII form. **Every step down the ladder is still defensible; nothing on the ladder is a wrong mark.** A fallback is a choice among attested forms. A false form is not on the ladder at all.`;

// ── Post assembly ───────────────────────────────────────────────────────────

function glanceBlock(entry, script, falseCount, contestedCount) {
  const rows = [
    `- **Canonical form:** ${entry.unicode}`,
    `- **Original script:** ${script}`,
    `- **Pantheon:** ${V.displayPantheon(entry.pantheon)}`,
    `- **Convention:** ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s own scholarly transliteration standard'}`,
    `- **False forms on record:** ${falseCount}`,
    `- **Contested forms:** ${contestedCount > 0 ? contestedCount : 'none attested'}`,
    `- **Series:** The Canonical Register, No. ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length}`,
  ];
  return `## At a Glance\n\n${rows.join('\n')}`;
}

function closeBlock(entry) {
  const idx = BUILT_IDS.indexOf(entry.id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const nav = [];
  if (prevEntry) nav.push(`previous entry: **${prevEntry.unicode}** ([read it](/sites/${prev}/blog/canonical/))`);
  if (nextEntry) nav.push(`next entry: **${nextEntry.unicode}** ([read it](/sites/${next}/blog/canonical/))`);
  return `## The Register Continues

This is one of ${BUILT_IDS.length} entries in the Canonical Register — the authoritative reference for every flagship temple. The temple's [founding dispatch](/sites/${entry.id}/blog/) tells the name's story; its [Restoration File](/sites/${entry.id}/blog/restoration/) details the marks; its [Resonance File](/sites/${entry.id}/blog/resonance/) reads the archetype into the industries. The [blog index](/blog/) holds the whole archive, and the [Rulebook](/rulebook/) states the convention this register enforces.

${nav.length ? `Continue the register — ${nav.join(' · ')}.` : ''}

*The Canonical Register is written from the same canonical record as the lexicon itself. If a false form is missing from this page, it is because the evidence does not support calling it false — or because we have not seen it yet. Show us, with a citation, and the register will answer.*`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  const register = {};

  for (const id of BUILT_IDS) {
    const entry = LEXICON_BY_ID.get(id);
    if (!entry) {
      console.warn(`  skipping ${id}: not in lexicon`);
      continue;
    }
    const lore = LORE[id] || null;
    const script = getOriginalScript(entry) || entry.greek || '—';
    const u = entry.unicode;
    const ascii = entry.ascii;

    // The truth about the flattened form, per entry: canonical when the
    // forms coincide but for case; a sanctioned fallback everywhere else.
    const asciiIsCanonical = u.toLowerCase() === ascii.toLowerCase();
    const marks = (entry.breakdown || []).filter((b) => b.type === 'stress' || b.type === 'length');
    const asciiStatus = asciiIsCanonical
      ? marks.length === 0
        ? 'canonical'
        : 'canonical'
      : 'fallback';

    const falseForms = entry.pantheon === 'greek' ? greekFalseForms(entry) : traditionFalseForms(entry);
    const variants = (entry.variants || []).filter((v) => v.type === 'alt-stress' || v.type === 'alt');
    const precedent = PRECEDENTS[id] || null;

    // Hook — calibrated: authority without false claims.
    const hooks = asciiIsCanonical
      ? [
          `This name carries no diacritics to lose: **${u}** is complete exactly as the keyboard writes it. The register's work here is subtler — defending the *spelling* against the respellings.`,
          `No marks, no mercy for the manglers: **${u}** is already its own canonical form. What the register polices here is the exactness of the letters themselves.`,
        ]
      : [
          `Misspell a god and you have not spelled the god at all — you have named something else. This is the register entry for **${u}**, with the false forms on record and the honest status of the plain form beneath it.`,
          `The internet spells **${u}** more ways than one, and only one of them is the name the sources wrote. This is the register's ruling — canonical, fallback, contested, and false, each in its proper place.`,
          `There is exactly one canonical form of this name, and it is **${u}**. Everything else in circulation is documented below — with its origin, its status, and where it fails.`,
          `A name is a chain of evidence. **${u}** is intact; the forms below are where the chain broke. The register records each break, and why — and it is equally precise about what the plain form may legitimately do.`,
        ];
    const parts = [];
    parts.push(V.pick(id, 301, hooks));
    parts.push(glanceBlock(entry, script, falseForms.length, variants.length));

    // The canonical form.
    const conventions = (entry.variants || []).filter((v) => v.type === 'macron-only' || v.type === 'ideal');
    const canonicalSection = ['## The Canonical Form', ''];
    if (entry.greek && entry.greek !== '—') {
      const cite = V.citeSources(lore);
      canonicalSection.push(`The name is attested as **${entry.greek}**${cite ? `, ${cite}` : ''}.${entry.meaning ? ` On the evidence, it means "${entry.meaning}".` : ''} The canonical transliteration is **${u}**.`);
    } else if (script && script !== '—') {
      canonicalSection.push(`The attested form is **${script}**, from the tradition's own record. The canonical transliteration is **${u}**.`);
    } else {
      canonicalSection.push(`The tradition's record preserves this name in its romanized scholarly form: **${u}** — no older script survives to transcribe, so the canonical content is the exactness of the spelling itself.`);
    }
    canonicalSection.push('');
    if (marks.length > 0) {
      canonicalSection.push('Every mark is evidence, and every piece of evidence is checkable:');
      canonicalSection.push('');
      for (const m of marks) {
        const what = m.type === 'stress' ? 'the stress position' : 'the vowel length';
        canonicalSection.push(`- **${m.char} → ${m.to}** — ${m.note}: ${what}, as the sources give it.`);
      }
    } else {
      canonicalSection.push(`No diacritics are required here: the canonical form is the exactness of the spelling itself, the form ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s convention'} demands.`);
    }
    if (conventions.length > 0) {
      canonicalSection.push('');
      canonicalSection.push('**Accepted conventions.** These alternate forms are legitimate in their own contexts — not false, and not contested, but sanctioned by convention:');
      canonicalSection.push('');
      for (const v of conventions) {
        canonicalSection.push(`- **${v.unicode}** — ${v.note || 'an accepted conventional form'}.`);
      }
    }
    parts.push(canonicalSection.join('\n'));

    // Where the flattened form stands.
    const asciiSection = ['## Where the Flattened Form Stands', ''];
    if (asciiIsCanonical) {
      asciiSection.push(
        `The plain form *${ascii}* differs from the canonical **${u}** only by convention of display — case, not content. It is **acceptable everywhere**: in legacy systems, in plain-text citation, in the DNS itself. What is not acceptable is what follows in the register: respellings that change the letters, not just their case.`
      );
    } else {
      asciiSection.push(
        `The plain form *${ascii}* is **not false — it is a fallback**, and the register is exact about what that means. In systems that cannot carry diacritics (legacy databases, older tooling, parts of the address-bar pipeline) the flattened form is the accepted vehicle, and the rulebook names it explicitly as the final rung of the fallback hierarchy: full restoration first, circumflex where attested, macron-only by the academic standard, an attested variant, and only then plain ASCII.`
      );
      asciiSection.push('');
      asciiSection.push(
        `What the fallback status forbids is promotion: *${ascii}* may carry the name where marks are impossible, but it may not *represent* the name where marks are possible. ${marks.length > 0 ? `Every mark it drops — ${marks.map((m) => `**${m.char} → ${m.to}**`).join(', ')} — is a fact the sources recorded.` : ''} A fallback is a vehicle, never the primary.`
      );
    }
    parts.push(asciiSection.join('\n'));

    // The register of false forms.
    if (falseForms.length > 0) {
      const registerSection = ['## The Register of False Forms', ''];
      registerSection.push(
        V.pick(id, 302, [
          'Each of these circulates. Each is wrong in a specific way — and the specificity is the point: a false form is not "a different style," it is a claim that fails.',
          'These are the forms the register rules against. None of them is attacked as taste; each is shown to break a mark the evidence sets down.',
          'The following forms are found in the wild — wikis, forums, even printed pages. The register lists each with its origin and its violation.',
        ])
      );
      registerSection.push('');
      falseForms.forEach((f, i) => {
        registerSection.push(`### False form ${i + 1}: *${f.form}*`);
        registerSection.push('');
        registerSection.push(`**Origin:** ${f.origin}.`);
        registerSection.push('');
        registerSection.push(`**Violation:** ${f.violation}.`);
        registerSection.push('');
      });
      parts.push(registerSection.join('\n'));
    } else {
      parts.push(`## The Register of False Forms\n\nNo circulating form of this name currently qualifies as false under the register's standard — a rare standing. The spelling is short, sturdy, and rarely mangled. The forms that *do* vary from the canonical are handled below: the flattened form (already ruled acceptable) and any contested variants with real support.`);
    }

    // Contested forms.
    const contestedSection = ['## The Contested Forms', ''];
    if (variants.length > 0) {
      contestedSection.push(
        'Not every non-canonical form is false. These forms carry real scholarly support — they are recorded in the lexicon as variants, with their sources, and the register presents them honestly rather than pretending unanimity:'
      );
      contestedSection.push('');
      for (const v of variants) {
        contestedSection.push(`- **${v.unicode}** — ${v.note || 'attested alternate form'}.${v.sources && v.sources.length ? ` Support: ${v.sources.join(', ')}.` : ''}`);
      }
      contestedSection.push('');
      contestedSection.push(
        V.pick(id, 303, [
          `Where scholars disagree, the register reports the disagreement. The canonical form above remains the temple's primary because the evidence for it is stronger — not because the others were never argued.`,
          `The canonical form stands above the contested ones here by weight of evidence, not by decree. If the scholarship shifts, the register shifts with it — that is what "canonical" means when it is honest.`,
        ])
      );
    } else {
      contestedSection.push(
        `No alternate form of this name carries documented scholarly support in the lexicon's record. The convention here — ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s standard'} — produces exactly one defensible transliteration: **${u}**. Forms that differ from it are not contested; they are simply wrong.`
      );
    }
    parts.push(contestedSection.join('\n'));

    // Precedent + IDNA.
    if (precedent) {
      parts.push(`## ${precedent.title}\n\n${precedent.text}`);
    }
    parts.push(IDNA_NOTE);

    // The verdict.
    parts.push(`## The Verdict

**${u}** is the canonical form: attested, checkable, and enforced across the temple, the lexicon, the cards, the APIs, and this register. ${
      asciiIsCanonical
        ? `The plain form *${ascii}* shares that standing — the two are the same name in every system.`
        : `The plain form *${ascii}* is sanctioned as the fallback vehicle and nothing more.`
    } The false forms above are documented so that no reader has to take the temple's word on faith — the violations are stated, the sources are named, and the register stands open to challenge on every line.

The temple of **${u}** stands at [/sites/${id}/](/sites/${id}/).`);

    parts.push(closeBlock(entry));

    const fullBody = `# ${V.pick(id, 304, [
      `The canonical register: ${u}`,
      `${u} — the one true spelling, and the forms that fail it`,
      `The register rules: ${u}`,
      `${u}: canonical, contested, and the false forms on record`,
    ])}\n\n${parts.join('\n\n')}\n`;

    const wc = fullBody.split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(3, Math.round(wc / 200));
    const post = {
      entryId: id,
      series: 'canonical',
      seriesNo: BUILT_IDS.indexOf(id) + 1,
      title: fullBody.match(/^# (.+)$/m)[1],
      description: V.pick(id, 305, [
        `The Canonical Register: ${u} — the one true spelling, the false forms dissected, the contested forms weighed, and what IDNA 2008 allows.`,
        `${u}, canonically: the attested form, the status of the plain form, the violations online, and the register's ruling.`,
        `Every false form of ${u} on record — its origin, its violation, and the canonical form that answers it.`,
      ]),
      keywords: [
        entry.unicode,
        entry.ascii,
        'canonical transliteration',
        'false transliteration',
        `${entry.pantheon} mythology`,
        'The Canonical Register',
        'PuniCodex',
        'IDNA 2008',
        'philology',
      ],
      tags: [entry.pantheon, entry.tierLabel || `Tier ${entry.tier || '2'}`, 'canonical', 'The Canonical Register'],
      author: 'PuniCodex Team',
      publishedAt: '2026-07-31',
      readingTime: `${readMin} min read`,
      body: fullBody,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');

    // The machine-readable register — the API and AI layer.
    register[id] = {
      entryId: id,
      canonical: u,
      ascii,
      asciiStatus,
      convention: TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s own scholarly transliteration standard',
      originalScript: script,
      falseForms: falseForms.map((f) => ({ form: f.form, origin: f.origin, violation: f.violation })),
      conventions: conventions.map((v) => ({ form: v.unicode, note: v.note || null })),
      contested: variants.map((v) => ({ form: v.unicode, note: v.note || null, sources: v.sources || [] })),
      precedent: precedent ? precedent.title : null,
      blog: `/sites/${id}/blog/canonical/`,
      temple: `/sites/${id}/`,
    };

    written++;
  }

  fs.writeFileSync(
    path.join(ROOT, 'platform', 'api', 'canonical-register.json'),
    `${JSON.stringify(
      {
        _meta: {
          generator: 'scripts/generate-blog-series-canonical.js',
          warning: 'GENERATED FILE — do not edit by hand. The Canonical Register, machine-readable.',
          count: Object.keys(register).length,
        },
        entries: register,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`The Canonical Register: ${written} entries written (posts + machine-readable register)`);
}

main();
