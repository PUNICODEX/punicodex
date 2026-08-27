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
const { writeFileWithRetry } = require('./write-file-retry.js');

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

// ── IDNA 2008, told four ways (a verbatim block repeated 271 times is what
// made the first register read as one long echo) ─────────────────────────────

const IDNA_TELLINGS = [
  (id) => `## What the Address Bar Allows

IDNA 2008 permits the letters these restorations use — macrons, acutes, underdots, thorn, ogonek, the lot — and the DNS carries them as punycode (\`xn--\` labels). Two honest constraints remain. First, **registrar inventory**: the protocol permits a character; the registrar's stock decides whether the exact domain can be bought today. Second, **combined marks**: forms like *Apṓllōn* (acute stacked on a macron) are philologically ideal yet effectively untypeable on phones and unsupported across much of the registration system.

That is why the rulebook keeps a fallback hierarchy — full restoration first, then the circumflex when the source carries one, then the macron-only academic standard, then an attested variant, and only as a last resort the plain ASCII form. **Every step down the ladder is still defensible; nothing on the ladder is a wrong mark.** A fallback is a choice among attested forms. A false form is not on the ladder at all.`,

  () => `## The Protocol's Position

Can the canonical form live in the address bar? Almost always, yes. IDNA 2008 admits every mark this register defends — the DNS stores them as \`xn--\` punycode and modern browsers render them natively. The real frictions are practical, not legal: some registrars stock only part of the IDN space, so a theoretically valid name can be temporarily unbuyable; and stacked combinations (an acute riding a macron) remain awkward to type on mobile keyboards even where the protocol accepts them.

The project's answer is a ranked ladder, not a compromise: the full restoration first, then attested fallbacks in descending order of completeness. The ladder's lowest rung, plain ASCII, is a vehicle for legacy systems — sanctioned, but never presented as the scholarly form.`,

  () => `## Registration, Honestly

Three facts govern every domain this project registers. One: IDNA 2008 welcomes the marks — punycode encodes them legally and browsers show them faithfully. Two: welcome is not availability — registrars hold partial inventory, so the ideal form of a name may exist in the protocol yet not in the shop window today. Three: typeability is a separate virtue — a form no one can type on a phone is a form no one will visit, however canonical.

Hence the hierarchy the rulebook enforces: take the most complete form that is *both* attested and *actually registrable*, and never accept a wrong mark for the sake of availability. The wrong accent is not a rung on that ladder; it is off the ladder entirely.`,

  () => `## Where Protocol Meets Practice

The technical answer is simple: the canonical marks are legal IDNA 2008 characters, encoded as punycode under \`xn--\`. The practical answer is messier: legal does not mean stocked (registrar inventory is partial), and stocked does not mean typeable (stacked diacritics defeat mobile keyboards).

So the register's rule is a hierarchy of attested forms — full restoration, circumflex, macron-only, attested variant, and finally plain ASCII for the systems that cannot carry marks. Every rung is defensible because every rung is attested. The forms this register rules against are not rungs; they are errors, and errors do not get rungs.`,
];

// ── Tradition deep-dives (the convention's own history, for citability) ─────

const TRADITION_DEEPDIVE = {
  greek: (entry, id) =>
    V.pick(id, 401, [
      `## The Convention's Own History

The marks this register defends were not invented for typesetting. Ancient Greek carried a melodic pitch accent, and the acute and circumflex were added by Alexandrian scholars — Aristophanes of Byzantium, tradition holds — precisely to preserve it when the spoken language began to level. Vowel quantity (the macron's concern) is older still: it changes meter, meaning, and grammar, and the poets of the Theogony depend on it. To drop either class of mark is to drop two millennia of deliberate preservation. The restored-stress convention simply continues the oldest documented project in European scholarship: keeping the sound of Greek alive in its letters.`,
      `## Why These Marks Exist at All

Greek diacritics are a preservation technology. The acute marks pitch rising; the circumflex marks pitch rising and falling; the macron marks time — how long the vowel is held. The first two were invented by Hellenistic scholars to save the accent as speech flattened; the last matters because Greek meter is built from long and short syllables the way music is built from beats. A transliteration that keeps these is not "decorated" — it is the difference between the name as evidence and the name as guesswork. This register holds to the restored-stress convention because it is the convention that keeps the evidence.`,
    ]),
  sanskrit: (entry, id) =>
    V.pick(id, 402, [
      `## The Convention's Own History

IAST — the International Alphabet of Sanskrit Transliteration — was settled in 1912 at the International Congress of Orientalists in Athens, but its logic is far older: Sanskrit grammar (Pāṇini's Aṣṭādhyāyī, fourth century BCE) is the most precise phonological system the ancient world produced, and it distinguishes retroflex from dental consonants as carriers of meaning. The underdots of IAST (ṭ, ḍ, ṇ, ṣ, ṛ) exist because Sanskrit treats those as different letters, not flavors of one letter. The macrons mark long vowels that are, again, phonemically distinct. A romanization that flattens them does not simplify Sanskrit; it misspells it.`,
      `## The Convention's Own History

Long before IAST was formalized in 1912, Sanskrit had Pāṇini — the fourth-century-BCE grammarian whose rules describe the language's sounds with a precision no other ancient tradition matched. That heritage is why the convention is so exact: retroflexes (ṭ, ḍ, ṇ, ṣ) are not accented dentals but separate phonemes with separate meanings; long and short vowels (ā/a, ī/i, ū/u) change words, not just timing. IAST writes those distinctions down with underdots and macrons so that a reader who has never heard Sanskrit can still read it *correctly*. Dropping the marks is not transliteration at a lower resolution — it is a different, lesser claim.`,
    ]),
  egyptian: (entry, id) =>
    V.pick(id, 403, [
      `## The Convention's Own History

Egyptological transliteration exists because hieroglyphs write consonants, not vowels. The characters ꜣ (aleph) and ꜥ (ayin) are consonants — a glottal reed and a pharyngeal grip — and rendering them as vowels does not "simplify" the name, it deletes consonants from it. The conventions in use descend from nineteenth-century decipherment and the standardized Manuel de Codage: ḥ, ḫ, ḏ, ṯ each mark a distinct consonant the Egyptian wrote and a modern reader must not merge. When this register defends them, it defends the principle that a writing system older than the alphabet gets to keep its consonants.`,
      `## The Convention's Own History

When Champollion read the Rosetta Stone in the 1820s, he recovered a consonantal script — hieroglyphs record consonants and leave vowels to the reader. That single fact explains the whole transliteration apparatus: ꜣ and ꜥ are *consonants* (the glottal reed and the pharyngeal ayin), and ḥ, ḫ, ḏ, ṯ mark gutturals and emphatics that Egyptian distinguished and English merges. Egyptology settled these marks in the Manuel de Codage so every scholar writes the same name the same way. The register keeps them for the same reason: an Egyptian name without its consonants is not a simpler name — it is a shorter, wronger one.`,
    ]),
  norse: (entry, id) =>
    V.pick(id, 404, [
      `## The Convention's Own History

Old Norse orthography is a primary source in itself: þ (thorn) and ð (eth) are letters the language used natively, not transliteration marks — English once had them too, and lost them. ǫ (o with ogonek) is a nasal vowel with its own saga-era history, and normalized Old Norse spelling preserves it because the Eddas' editors do. To write th for þ or o for ǫ is not modernization; it is a different spelling of a different word. The Eddic poems survive in one manuscript tradition each — the register spells the names the way those manuscripts do.`,
      `## The Convention's Own History

The Poetic Edda survives essentially in one manuscript — the Codex Regius, c. 1270 — and normalized Old Norse spelling descends from what that manuscript and its siblings actually write. Þ and ð are not decorations: they are letters of the alphabet the skalds used (and English later abandoned), and ǫ is a nasal vowel the normalization preserves because the sources carry it. The register's rule is the manuscript's rule: spell the names the way the tradition that sang them wrote them down.`,
    ]),
  mesopotamian: (entry, id) =>
    V.pick(id, 405, [
      `## The Convention's Own History

Cuneiform writes a consonant inventory English does not have: š, ṣ, ṭ, ḫ mark sibilants and stops that Akkadian and Sumerian distinguished and meaning depends on — the difference between 'sun' and 'son' is exactly one ṣ. Assyriological transliteration (the sign lists of Borger and the Chicago Assyrian Dictionary) settled those marks over the last century and a half, and the register keeps them because dropping them merges gods, cities, and concepts that the tablets keep apart.`,
      `## The Convention's Own History

The oldest writing system on earth encodes its gods in wedge marks on clay, and its consonant system outruns the Latin alphabet: š is a hushing sibilant, ṣ and ṭ are emphatics produced deep in the mouth, ḫ is a rasp English lost centuries ago. When nineteenth-century decipherers built the transliteration conventions Assyriology still uses, they chose diacritics precisely so that none of those distinctions would be flattened. This register honors the same choice for the same reason: the tablets distinguish; so do we.`,
    ]),
};

function traditionDeepDive(entry, id) {
  const fn = TRADITION_DEEPDIVE[entry.pantheon];
  if (fn) return fn(entry, id);
  return V.pick(id, 406, [
    `## The Convention's Own History

Every tradition in this register has its own scholarly transliteration standard, built by its own specialists over decades or centuries, and the register follows each on its own terms: ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s own standard'}. The principle that unifies them is the one the whole project stands on: a name is evidence, and evidence is not negotiable — not for keyboards, not for convenience, not for anyone.`,
  ]);
}

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
  if (prevEntry) nav.push(`previous entry: **${prevEntry.unicode}** ([read it](/${prev}/blog/canonical/))`);
  if (nextEntry) nav.push(`next entry: **${nextEntry.unicode}** ([read it](/${next}/blog/canonical/))`);
  const navLine = nav.length ? `Continue the register — ${nav.join(' · ')}.` : '';
  const bodies = [
    `This is one of ${BUILT_IDS.length} entries in the Canonical Register — the authoritative reference for every flagship temple. The temple's [founding dispatch](/${entry.id}/blog/) tells the name's story; its [Restoration File](/${entry.id}/blog/restoration/) details the marks; its [Resonance File](/${entry.id}/blog/resonance/) reads the archetype into the industries. The [blog index](/blog/) holds the whole archive, and the [Rulebook](/rulebook/) states the convention this register enforces.`,
    `Entry ${BUILT_IDS.indexOf(entry.id) + 1} of ${BUILT_IDS.length} in the Canonical Register. Around it: the temple's [founding dispatch](/${entry.id}/blog/), the [Restoration File](/${entry.id}/blog/restoration/) on the marks themselves, the [Resonance File](/${entry.id}/blog/resonance/) on the archetype at work, and the [Rulebook](/rulebook/) behind all of it.`,
    `The register holds ${BUILT_IDS.length} entries like this one — each temple with its own ruling. Read the temple's [founding dispatch](/${entry.id}/blog/) for the story, its [Restoration File](/${entry.id}/blog/restoration/) for the philology, its [Resonance File](/${entry.id}/blog/resonance/) for the industries, or the [whole archive](/blog/) end to end.`,
  ];
  return `## The Register Continues

${V.pick(entry.id, 307, bodies)}

${navLine}

*The Canonical Register is written from the same canonical record as the lexicon itself. If a false form is missing from this page, it is because the evidence does not support calling it false — or because we have not seen it yet. Show us, with a citation, and the register will answer.*`;
}

function padDescription(desc, id) {
  return desc.length >= 120 ? desc : desc + ' The Canonical Register, No. ' + (BUILT_IDS.indexOf(id) + 1) + ' of ' + BUILT_IDS.length + '.';
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  const register = {};
  const archCount = { ruling: 0, dossier: 0, trial: 0, letter: 0 };

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
    const asciiStatus = asciiIsCanonical ? 'canonical' : 'fallback';

    const falseForms = entry.pantheon === 'greek' ? greekFalseForms(entry) : traditionFalseForms(entry);
    const variants = (entry.variants || []).filter((v) => v.type === 'alt-stress' || v.type === 'alt');
    const conventions = (entry.variants || []).filter((v) => v.type === 'macron-only' || v.type === 'ideal');
    const precedent = PRECEDENTS[id] || null;
    const seriesNo = BUILT_IDS.indexOf(id) + 1;

    // ── Shared evidence blocks ──────────────────────────────────────────────
    const attestation = entry.greek && entry.greek !== '—'
      ? `The name is attested as **${entry.greek}**${V.citeSources(lore) ? `, ${V.citeSources(lore)}` : ''}.${entry.meaning ? ` On the evidence, it means "${entry.meaning}".` : ''} The canonical transliteration is **${u}**.`
      : script && script !== '—'
        ? `The attested form is **${script}**, from the tradition's own record. The canonical transliteration is **${u}**.`
        : `The tradition's record preserves this name in its romanized scholarly form: **${u}** — no older script survives to transcribe, so the canonical content is the exactness of the spelling itself.`;

    const marksBlock = marks.length > 0
      ? `Every mark is evidence, and every piece of evidence is checkable:\n\n${marks.map((m) => `- **${m.char} → ${m.to}** — ${m.note}: ${m.type === 'stress' ? 'the stress position' : 'the vowel length'}, as the sources give it.`).join('\n')}`
      : `No diacritics are required here: the canonical form is the exactness of the spelling itself, the form ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s convention'} demands.`;

    const conventionsBlock = conventions.length > 0
      ? `**Accepted conventions.** These alternate forms are legitimate in their own contexts — not false, and not contested, but sanctioned by convention:\n\n${conventions.map((v) => `- **${v.unicode}** — ${v.note || 'an accepted conventional form'}.`).join('\n')}`
      : '';

    const asciiBlock = asciiIsCanonical
      ? `The plain form *${ascii}* differs from the canonical **${u}** only by convention of display — case, not content. It is **acceptable everywhere**: in legacy systems, in plain-text citation, in the DNS itself. What is not acceptable is what follows in the register: respellings that change the letters, not just their case.`
      : `The plain form *${ascii}* is **not false — it is a fallback**, and the register is exact about what that means. In systems that cannot carry diacritics (legacy databases, older tooling, parts of the address-bar pipeline) the flattened form is the accepted vehicle, and the rulebook names it explicitly as the final rung of the fallback hierarchy: full restoration first, circumflex where attested, macron-only by the academic standard, an attested variant, and only then plain ASCII.\n\nWhat the fallback status forbids is promotion: *${ascii}* may carry the name where marks are impossible, but it may not *represent* the name where marks are possible. ${marks.length > 0 ? `Every mark it drops — ${marks.map((m) => `**${m.char} → ${m.to}**`).join(', ')} — is a fact the sources recorded.` : ''} A fallback is a vehicle, never the primary.`;

    const falseBlock = falseForms.length > 0
      ? falseForms
          .map(
            (f, i) => `### False form ${i + 1}: *${f.form}*\n\n**Origin:** ${f.origin}.\n\n**Violation:** ${f.violation}.`
          )
          .join('\n\n')
      : `No circulating form of this name currently qualifies as false under the register's standard — a rare standing. The spelling is short, sturdy, and rarely mangled.`;

    const contestedBlock = variants.length > 0
      ? `Not every non-canonical form is false. These forms carry real scholarly support — they are recorded in the lexicon as variants, with their sources, and the register presents them honestly rather than pretending unanimity:\n\n${variants.map((v) => `- **${v.unicode}** — ${v.note || 'attested alternate form'}.${v.sources && v.sources.length ? ` Support: ${v.sources.join(', ')}.` : ''}`).join('\n')}\n\n${V.pick(id, 303, [
        `Where scholars disagree, the register reports the disagreement. The canonical form above remains the temple's primary because the evidence for it is stronger — not because the others were never argued.`,
        `The canonical form stands above the contested ones here by weight of evidence, not by decree. If the scholarship shifts, the register shifts with it — that is what "canonical" means when it is honest.`,
      ])}`
      : `No alternate form of this name carries documented scholarly support in the lexicon's record. The convention here — ${TRADITION_CONVENTION[entry.pantheon] || 'the tradition\u2019s standard'} — produces exactly one defensible transliteration: **${u}**. Forms that differ from it are not contested; they are simply wrong.`;

    const idnaBlock = IDNA_TELLINGS[V.hashStr(id) % IDNA_TELLINGS.length](id);
    const deepDiveBlock = traditionDeepDive(entry, id);
    const glance = glanceBlock(entry, script, falseForms.length, variants.length);

    // Lore mining blocks.
    const arch = V.loreArchaeology(lore);
    const legacy = V.loreLegacy(lore);
    const sync = V.loreSyncretism(lore);
    const symbols = V.loreSymbols(lore, 3);
    const pron = V.lorePronunciation(lore);

    // ── The four architectures ──────────────────────────────────────────────
    const architecture = ['ruling', 'dossier', 'trial', 'letter'][V.hashStr(id) % 4];
    archCount[architecture]++;
    const parts = [];

    if (architecture === 'ruling') {
      parts.push(V.pick(id, 301, [
        `Misspell a god and you have not spelled the god at all — you have named something else. This is the register entry for **${u}**, with the false forms on record and the honest status of the plain form beneath it.`,
        `The internet spells **${u}** more ways than one, and only one of them is the name the sources wrote. This is the register's ruling — canonical, fallback, contested, and false, each in its proper place.`,
        `There is exactly one canonical form of this name, and it is **${u}**. Everything else in circulation is documented below — with its origin, its status, and where it fails.`,
        `A name is a chain of evidence. **${u}** is intact; the forms below are where the chain broke. The register records each break, and why — and it is equally precise about what the plain form may legitimately do.`,
      ]));
      parts.push(glance);
      parts.push(`## The Canonical Form\n\n${attestation}\n\n${marksBlock}${conventionsBlock ? '\n\n' + conventionsBlock : ''}`);
      parts.push(`## Where the Flattened Form Stands\n\n${asciiBlock}`);
      parts.push(`## The Register of False Forms\n\n${falseBlock}`);
      parts.push(`## The Contested Forms\n\n${contestedBlock}`);
      parts.push(deepDiveBlock);
      if (precedent) parts.push(`## ${precedent.title}\n\n${precedent.text}`);
      parts.push(idnaBlock);
      if (arch) parts.push(`## Where the Name Stood First\n\n${arch} The temple on the web is the newest of these addresses — the first one that fits in a pocket.`);
    } else if (architecture === 'dossier') {
      parts.push(V.pick(id, 311, [
        `*Evidence dossier ${String(seriesNo).padStart(3, '0')} — ${u}. Every exhibit catalogued, every ruling stated with its grounds.*`,
        `*Dossier ${String(seriesNo).padStart(3, '0')} · ${u} · the complete evidentiary record for this name, open for audit.*`,
      ]));
      parts.push(glance);
      let n = 1;
      const exhibits = [];
      exhibits.push(`**Exhibit ${n++} — the attestation.** ${attestation}`);
      if (marks.length > 0) {
        exhibits.push(`**Exhibit ${n++} — the preserved marks.** ${marks.map((m) => `**${m.char} → ${m.to}** (${m.note})`).join('; ')}. Each is verifiable against the sources named in the attestation.`);
      }
      exhibits.push(`**Exhibit ${n++} — the flattened form.** ${asciiBlock}`);
      falseForms.forEach((f) => {
        exhibits.push(`**Exhibit ${n++} — struck from the record: *${f.form}*.** Origin: ${f.origin}. Grounds: ${f.violation}.`);
      });
      if (variants.length > 0 || conventions.length > 0) {
        const pool = [...conventions.map((v) => `**${v.unicode}** (${v.note || 'convention'})`), ...variants.map((v) => `**${v.unicode}** (${v.note || 'variant'}${v.sources && v.sources.length ? `; support: ${v.sources.join(', ')}` : ''})`)];
        exhibits.push(`**Exhibit ${n++} — forms with legitimate standing.** ${pool.join('; ')}. Recorded with their grounds; none displaces the canonical primary.`);
      }
      if (arch) exhibits.push(`**Exhibit ${n++} — the physical record.** ${arch}`);
      if (legacy) exhibits.push(`**Exhibit ${n++} — the continuing record.** ${V.firstSentences(legacy, 2)}`);
      parts.push(`## The Evidence\n\n${exhibits.join('\n\n')}`);
      parts.push(deepDiveBlock);
      if (precedent) parts.push(`## ${precedent.title}\n\n${precedent.text}`);
      parts.push(idnaBlock);
    } else if (architecture === 'trial') {
      parts.push(V.pick(id, 321, [
        `*The name ${u} versus the internet, session ${String(seriesNo).padStart(3, '0')} of the Canonical Register. The charge: widespread misspelling, with intent to confuse. The register sits in judgment.*`,
        `*Court is in session. In the matter of ${u}, the register hears the evidence — the attestation, the marks, and the forms that stand accused.*`,
      ]));
      parts.push(glance);
      parts.push(`## The Charge\n\n${V.pick(id, 322, [
        `That the name **${u}** is routinely written in forms that move, drop, or invent its marks — and that each such form teaches the reader a different, lesser name. The register's task is to separate the honest fallback from the outright false.`,
        `That confusion about this name is now self-sustaining: wrong forms cite wrong forms until the wrongness looks like consensus. The register's task is to restore the evidence to the center of the record.`,
      ])}`);
      parts.push(`## The Defense of the Canonical Form\n\n${attestation}\n\n${marksBlock}${conventionsBlock ? '\n\n' + conventionsBlock : ''}`);
      parts.push(`## The Character Witness\n\n${asciiBlock}`);
      if (falseForms.length > 0) {
        const cross = falseForms
          .map((f, i) => `### The witness *${f.form}*\n\nWhere it comes from: ${f.origin}. Why it cannot stand: ${f.violation}.`)
          .join('\n\n');
        parts.push(`## Cross-Examination\n\n${cross}`);
      }
      parts.push(`## Mitigating Circumstances\n\n${contestedBlock}`);
      parts.push(deepDiveBlock);
      if (precedent) parts.push(`## Precedent Cited: ${precedent.title}\n\n${precedent.text}`);
      parts.push(idnaBlock);
    } else {
      // The Philologist's Letter.
      parts.push(V.pick(id, 331, [
        `*A letter to a colleague, ${new Date('2026-07-31').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — on the name ${u}, and on the forms that keep failing it.*`,
        `*Correspondence ${String(seriesNo).padStart(3, '0')} — a colleague asks why we are so strict about ${u}. Here is the whole answer.*`,
      ]));
      parts.push(V.pick(id, 332, [
        `You asked why the register cares so much about one name. It is a fair question, and ${u} is as good a case as any to answer it with.`,
        `Your note said, roughly: surely the marks are a nicety. Permit me to use ${u} to show they are not.`,
      ]));
      parts.push(`First, the attestation. ${attestation}`);
      if (marks.length > 0) parts.push(`And the marks themselves: ${marks.map((m) => `**${m.char} → ${m.to}** (${m.note})`).join('; ')}. Remove any one of them and you have not simplified the name — you have told a small lie about it, ${V.pick(id, 333, ['and small lies in references have long consequences', 'and references are built of exactly such small truths', 'and the whole discipline is the refusal of such lies'])}.`);
      if (pron && pron.approximation) parts.push(`Say it aloud as the sources heard it: ${pron.approximation.charAt(0).toLowerCase() + pron.approximation.slice(1)} The marks are what carry that sound to a reader who has never heard it spoken.`);
      parts.push(`On the plain form — and I want to be precise, because you pushed on this. ${asciiBlock.replace(/\*\*/g, '*')}`);
      if (falseForms.length > 0) {
        const letters = falseForms
          .map((f) => `As for *${f.form}*: it comes from ${f.origin}, and it fails because ${f.violation.charAt(0).toLowerCase() + f.violation.slice(1)}`)
          .join(' ');
        parts.push(`Now to the forms that provoked your letter. ${letters}`);
      }
      if (variants.length > 0) parts.push(`You will see other forms in serious books — ${variants.map((v) => `**${v.unicode}**`).join(', ')} — and they are not errors. ${contestedBlock.replace(/\*\*/g, '*')}`);
      if (sync) parts.push(`One more thing, because it always surprises: the name did not stay home. ${V.firstSentences(sync, 2)}`);
      if (legacy) parts.push(`And it never stopped working. ${V.firstSentences(legacy, 2)}`);
      parts.push(deepDiveBlock);
      if (precedent) parts.push(`A last story, because it is ours. ${precedent.text}`);
      parts.push(idnaBlock);
      parts.push(`Write back when you have checked the sources; they are better company than I am.\n\n*— The Register*`);
    }

    // A per-entry evidence docket closes every ruling, so no two verdicts
    // share a tail: the counts and forms below come from this entry's file.
    const docketBits = [
      falseForms.length > 0
        ? `${falseForms.length} false ${falseForms.length === 1 ? 'form' : 'forms'} ruled against, *${falseForms[0].form}* first on the docket`
        : 'no false forms on the docket',
    ];
    if (marks.length > 0) {
      docketBits.push(
        `${marks.length} preserved ${marks.length === 1 ? 'mark' : 'marks'} verified: ${marks.map((m) => `**${m.char} → ${m.to}**`).join(', ')}`
      );
    }
    docketBits.push(
      variants.length > 0
        ? `${variants.length} contested ${variants.length === 1 ? 'form' : 'forms'} recorded with ${variants.length === 1 ? 'its' : 'their'} support`
        : 'no contested forms attested'
    );
    const docketSources = (lore?.sources || []).map((s) => s.name).filter(Boolean);
    const evidenceDocket = `The docket for this ruling: ${docketBits.join('; ')}${
      docketSources.length > 0
        ? `; the attestation rests on ${docketSources.length} cited ${docketSources.length === 1 ? 'source' : 'sources'} — ${docketSources.slice(0, 3).join(', ')}`
        : ''
    }.`;

    // The verdict (all architectures, four voices).
    parts.push(V.pick(id, 341, [
      `## The Verdict

**${u}** is the canonical form: attested, checkable, and enforced across the temple, the lexicon, the cards, the APIs, and this register. ${
        asciiIsCanonical
          ? `The plain form *${ascii}* shares that standing — the two are the same name in every system.`
          : `The plain form *${ascii}* is sanctioned as the fallback vehicle and nothing more.`
      } The false forms above are documented so that no reader has to take the temple's word on faith — the violations are stated, the sources are named, and the register stands open to challenge on every line.

The temple of **${u}** stands at [/${id}/](/${id}/).`,
      `## The Verdict

The register rules for **${u}**, and the ruling is checkable: every mark sourced, every violation stated, every borderline form given its honest standing. ${
        asciiIsCanonical
          ? `*${ascii}* carries the name freely — it differs only in display, and the register says so without reservation.`
          : `*${ascii}* is the sanctioned fallback for systems without marks — a vehicle, never the scholarly primary.`
      } Anything else in circulation has its origin and its failure recorded above. That is the whole of the law on this name — and the temple at [/${id}/](/${id}/) enforces it.`,
      `## The Verdict

Case closed on **${u}**: canonical, cited, and defended. ${
        asciiIsCanonical
          ? `The keyboard form *${ascii}* is the same name in another register of display — always acceptable.`
          : `The keyboard form *${ascii}* rides as the sanctioned fallback — and stays in that lane.`
      } The register's files remain open: if a source surfaces that changes any line of this entry, the entry changes. Until then, the temple at [/${id}/](/${id}/) holds the canonical form.`,
      `## The Verdict

So the register finds: **${u}**, canonical; *${ascii}*, ${
        asciiIsCanonical ? 'equally canonical' : 'a sanctioned fallback'
      }; the contested forms, recorded with their support; the false forms, ruled against with their violations named. Every line of that finding cites its evidence, and the evidence is open to any reader — the register asks to be checked, not trusted. The temple keeps the canonical form at [/${id}/](/${id}/).`,
    ]) + `\n\n${evidenceDocket}`);

    parts.push(closeBlock(entry));

    const fullBody = `# ${V.pick(id, 304, [
      `The canonical register: ${u}`,
      `${u} — the one true spelling, and the forms that fail it`,
      `The register rules: ${u}`,
      `${u}: canonical, contested, and the false forms on record`,
      architecture === 'dossier' ? `Evidence dossier: ${u}` : architecture === 'trial' ? `${u} versus the internet` : architecture === 'letter' ? `On ${u}: a letter to a colleague` : `The register rules: ${u}`,
    ])}\n\n${parts.filter(Boolean).join('\n\n')}\n`;

    const wc = fullBody.split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(3, Math.round(wc / 200));
    const post = {
      entryId: id,
      series: 'canonical',
      seriesNo,
      architecture,
      title: fullBody.match(/^# (.+)$/m)[1],
      description: padDescription(V.pick(id, 305, [
        `The Canonical Register: ${u} — the one true spelling, the false forms dissected, the contested forms weighed, and what IDNA 2008 allows.`,
        `${u}, canonically: the attested form, the status of the plain form, the violations online, and the register's ruling.`,
        `Every false form of ${u} on record — its origin, its violation, and the canonical form that answers it.`,
      ]), id),
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
    writeFileWithRetry(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(post, null, 2)}\n`, 'utf8');

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
      blog: `/${id}/blog/canonical/`,
      temple: `/${id}/`,
    };

    written++;
  }

  writeFileWithRetry(
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

  console.log(`The Canonical Register (elevated): ${written} entries — ${JSON.stringify(archCount)}`);
}

main();
