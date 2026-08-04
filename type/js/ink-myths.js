/**
 * PuniCodex — Canonical ink-myth registry (Check Before You Ink)
 *
 * The curated set of famous script/tattoo errors circulating online, with
 * the correction for each. Canonical, hand-edited, held to ACCURACY.md: a
 * myth card may only claim what the sources support. Where the honest answer
 * is "it depends", the card says so.
 *
 *   id      — anchor slug
 *   title   — short card title
 *   claim   — what the internet says (the myth)
 *   verdict — the scholarly truth
 *   correct — what to actually do before you ink it
 *   entry   — optional lexicon id for the temple link
 */

'use strict';

const INK_MYTHS = [
  {
    id: 'vegvisir',
    title: 'The "Viking compass" that isn’t',
    claim:
      'The Vegvísir — the eight-armed stave in a thousand tattoos — is an ancient Viking symbol carried for guidance.',
    verdict:
      'It appears first in a 17th-century Icelandic manuscript (the Huld manuscript, c. 1860 in its surviving copy) — roughly six hundred years after the Viking Age ended. No Vegvísir is carved, written, or described in any Viking-Age source.',
    correct:
      'Ink it if you love it — but ink it as an early-modern Icelandic magical stave, not as something a Viking would recognize. If you want a genuinely Viking-Age mark, use an attested runic inscription.',
  },
  {
    id: 'elder-futhark-viking-names',
    title: 'Viking names in the wrong runes',
    claim:
      'Tattoo shops write Þórr, Óðinn and Freyja in the Elder Futhark — the 24-rune alphabet all over the internet.',
    verdict:
      'The Elder Futhark was largely out of use by c. 700 CE — before the Viking Age began. Vikings carved the 16-rune Younger Futhark: Þórr is ᚦᚢᚱ, not ᚦᛟᚱᚱ. An Elder Futhark "Thor" would have looked archaic to a Viking, like Gothic script looks to us.',
    correct:
      'For any Viking-Age name, use the attested Younger Futhark form — the corpus below carries per-sign provenance for each. Elder Futhark is correct only for names from before c. 700 CE.',
    entry: 'thor',
  },
  {
    id: 'hieroglyph-name',
    title: '"Your name" in hieroglyphs',
    claim:
      'A cartouche generator can write your name in authentic ancient Egyptian hieroglyphs.',
    verdict:
      'Egyptian writing did not record vowels, and modern names do not exist in ancient Egyptian. Every "your name in hieroglyphs" is a modern phonetic bridge — a scholarly convention, not an attestation. Even for the gods, the vocalization (Ra, Amun, Isis) is conventional: the signs are real, the vowels are ours.',
    correct:
      'Treat a cartouche as a translation exercise, not an ancient artifact. For god names, use the attested sign groups with their conventional reading clearly labelled — the way this site labels them everywhere.',
  },
  {
    id: 'greek-no-marks',
    title: 'Greek, minus the "squiggles"',
    claim:
      'Greek looks cleaner without the accents and breathings — Ἀθηνᾶ becomes Αθηνα.',
    verdict:
      'Two different things are true. Lowercase Greek without breathings and accents is simply misspelled — the marks are part of the letters. But monumental capitals (ΑΘΗΝΑ) are epigraphically legitimate: ancient stone inscriptions were carved in majuscule without those marks.',
    correct:
      'Choose deliberately. Lowercase: keep every accent and breathing (Ἀθηνᾶ). Monumental capitals are correct in the ancient inscriptional style. Lowercase-without-marks is correct in neither.',
    entry: 'athena',
  },
  {
    id: 'runes-are-magic',
    title: '"Rune of power" meanings, one letter at a time',
    claim:
      'Each rune carries a fixed mystical meaning, so any word can be "translated" into a power sigil letter by letter.',
    verdict:
      'Rune poems do give the letters names (cattle, hail, yew) — but they are alphabets first. A modern word spelled into runes is a transcription, not a talisman, and the neat "meanings" tables online mostly descend from 20th-century occultism, not medieval sources.',
    correct:
      'If you want a word with genuine charge, use a word the sources actually attest — a god’s name in its own script — rather than a letter-by-letter spell of an English word.',
  },
];

module.exports = { INK_MYTHS };
