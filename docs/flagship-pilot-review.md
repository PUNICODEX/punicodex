# Flagship Temple Pilot Review — 12-Temple Canonical Audit

Date: 2026-07-15
Reviewer: PUNYCODEX automated + manual audit
Scope: 12 representative flagship temples across 12 distinct pantheons

## Summary

| Temple | Pantheon | Placeholder Provenance | Sign Cards | Gallery Images | Extended Lore Words | Verdict |
|--------|----------|------------------------|------------|----------------|---------------------|---------|
| Zeús | Olympian | No | 4 | 10 | 1,048 | Pass |
| Rꜥ | Egyptian | No | 3 | 9 | 1,100 | Pass |
| Þórr | Norse | No | 3 | 9 | 1,088 | Pass |
| Śiva | Sanskrit | No | 2 | 10 | 1,174 | Pass |
| Lóng | Chinese | No | 1 | 8 | 1,246 | Pass |
| Quetzalcōātl | Nahuatl | No | 2 | 8 | 1,581 | Pass |
| Ọṣun | Yoruba | No | 3 | 7 | 1,086 | Pass |
| Jizō | Japanese | No | 2 | 11 | 905 | Pass |
| Manannán | Celtic | No | 2 | 10 | 1,205 | Pass |
| Dažbog | Slavic | No | 6 | 10 | 1,155 | Pass |
| Amitābha | Buddhist | No | 4 | 10 | 1,307 | Pass |
| Ēa | Mesopotamian | No | 3 | 10 | 1,246 | Pass |

**Result:** 12/12 temples pass the automated richness audit.

## Review Criteria

Each temple was checked for:

1. Canonical transliteration and pronunciation — IPA reconstruction present, plausible, and consistent with the tier system.
2. Lore section — sourced etymology, mythic narrative, symbols, and cultural legacy present.
3. Extended lore — scholarly depth via etymology timeline, character breakdown, cultural significance, FAQ, and primary sources.
4. Gallery — at least one on-theme image per concept/form.
5. Original script provenance — detailed sign breakdown, transmission chain, attestations, and scholarly sources; no placeholder sections.

## Per-Temple Notes

### Zeús (Olympian)
- Rich provenance with four Greek sign cards and full transmission chain.
- Etymology links PIE *dyēws to Sanskrit Dyáuṣ Pitā, Latin Iuppiter, and Germanic *Tīwaz.
- Gallery includes 10 images across lightning, eagle, oak, and Olympia concepts.

### Rꜥ (Egyptian)
- Hieroglyphic provenance includes D21 mouth, D36 forearm, and N5 sun-disk rebus.
- Notes correctly flag the original vocalisation as unknown.
- Gallery includes solar barque and Heliopolis imagery.

### Þórr (Norse)
- Younger Futhark runes (ᚦᚢᚱ) with per-rune phonetic notes.
- Acknowledges that normalized Þórr geminate -rr- is not shown in runic spelling.
- Gallery includes Mjǫllnir and storm imagery.

### Śiva (Sanskrit)
- Devanagari śi + va syllable breakdown with IAST conventions.
- Notes the schwa-deletion in connected Sanskrit speech.
- Gallery includes Naṭarāja and Himalayan imagery.

### Lóng (Chinese)
- Traditional 龍 vs simplified 龙 variants shown.
- Old Chinese reconstruction (Baxter-Sagart) cited.
- Gallery includes imperial dragon and river/rain imagery.

### Quetzalcōātl (Nahuatl)
- Colonial Nahuatl Latin-script provenance with morpheme-level sign cards.
- Explains the lack of an indigenous logographic script for the deity name.
- Extended lore is the longest of the pilot (1,581 words), reflecting careful treatment of the feathered-serpent complex.

### Ọṣun (Yoruba)
- Modern Yoruba orthography with tone and underdot explanations.
- Explicitly states the tradition is oral with 19th-century Latin-script documentation.
- Gallery includes river, brass fan, and honey imagery.

### Jizō (Japanese)
- Kanji 地蔵 broken into 地 (earth) and 蔵 (storehouse/treasury).
- Traces Sanskrit Kṣitigarbha → Chinese Dìzàng → Japanese Jizō.
- Gallery has the most images of the pilot (11), covering roadside statues, mizuko rites, and bodhisattva iconography.

### Manannán (Celtic)
- Medieval Irish Latin-script provenance; explains the absence of Ogham attestations for the full name.
- Links to Welsh Manawydan and Manx Mannan.
- Gallery includes sea, mist, and Otherworld imagery.

### Dažbog (Slavic)
- Cyrillic Дажбог with per-letter phonetic values.
- Cites Primary Chronicle and Hypatian Codex attestations.
- Acknowledges post-Christian compilation bias in the sources.

### Amitābha (Buddhist)
- Devanagari अमिताभ with IAST transliteration.
- Etymology covers a- 'without' + mā 'measure' + tā feminine suffix + bha 'light'.
- Gallery includes Pure Land and Buddha imagery.

### Ēa (Mesopotamian)
- Cuneiform 𒀭𒂍𒀀 with divine determinative, É house sign, and A water sign.
- Correctly frames the macron as a discussable vowel-length convention, not a canonical spelling.
- Gallery includes Abzu and wisdom imagery.

## Issues Found and Resolved

1. **Placeholder original-script provenance** — Quetzalcōātl, Ọṣun, Jizō, Manannán, and Dažbog initially rendered placeholder sections. Resolved by adding curated entries to `type/js/original-scripts-extra.json` and regenerating all 196 temples.
2. **Truncated / malformed subtitles** — Amitābha and Śiva subtitles were raw dictionary cruft or over-long. Resolved by regenerating from the corrected canonical lexicon.
3. **Validator script-block coverage** — The lexicon validator rejected Latin and Cyrillic original scripts. Resolved by extending the recognized block list to include Latin-1, Latin Extended-A, Latin Extended Additional, and Cyrillic, while preserving the provenance requirement.
4. **Regeneration infrastructure** — `--regenerate-all` intermittently failed with memory/stack errors. Resolved by isolating each flagship in its own Node process, streaming unified-corpus JSONL writes, and hardening copy retries.

## Remaining Observations (non-blocking)

- `long` has only one sign card (the logogram itself); this is accurate for a single-character Chinese name but could be supplemented with oracle-bone and bronze-script variants in a future curation pass.
- `jizo` extended lore is the shortest of the pilot (905 words) but covers all required sections; expansion is possible but not required for canonical readiness.
- `oshun` gallery has the fewest images (7) but covers all core concepts; additional diaspora imagery could be added later.

## Sign-off

The 12-temple pilot review is complete. All sampled flagship temples meet the canonical richness standard: bulletproof lore, extended lore, gallery coverage, and original-script provenance.
