# Chinese Language Module — Pronunciation Rules Engine

Date: 2026-08-19. Branch: master. Author: subagent (pronunciation-chinese task).

## What was built

A Modern Standard Mandarin module for `type/js/pronunciation-rules.js`
(canonical), covering `chinese` and `taoist` pantheons (61 lexicon entries).
Previously these fell back to orthographic passthrough (`derived: false`) and
their temple pages omitted the "Say it right" panel entirely.

## Design decisions

### Syllable segmentation
- `chineseChunks()` splits the display form on apostrophes (`Cháng'é`) and
  camelCase boundaries (`SūnWùkōng`, `ZhāngDàolíng`) **before** lowercasing
  (the shared `graphemes()` helper lowercases, so case info must be read
  first). Hyphen/space also split, defensively.
- Within a chunk, parsing is greedy longest-match: digraph initials
  (zh/ch/sh) before single letters, then the longest written final from a
  68-key table. Longest-match resolves every lexicon case unambiguously
  (verified by inspection of all 61 outputs).
- **Null-initial y/w are tabled as orthographic aliases**, not rewritten:
  `yi/ya/ye/yao/you/yan/yin/yang/ying/yong/yu/yue/yuan/yun` and
  `wu/wa/wo/wai/wei/wan/wen/wang/weng` map directly to their canonical final
  values. This handles the standalone contractions (`you`→iu, `wei`→ui,
  `wen`→un) with zero letter-array surgery and preserves grapheme→tone-mark
  alignment. First draft rewrote letters instead; it broke on `wen`
  (produced the non-key `uen`) — aliases are strictly simpler.
- ü in NFD is `u` + combining diaeresis; the letter array maps that grapheme
  to `ü` for final matching (`Nǚwā`, `LǚDōngbīn`). After j/q/x a written `u`
  is mutated to `ü` before final matching (`Quán` → [tɕʰyɛn], `Lǎojūn` →
  [tɕyn]).
- Apical vowels: final `i` after zh/ch/sh/r → [ʅ], after z/c/s → [ɿ]
  (`Kǒngzǐ` → /kʰʊ˨˩˦ŋ.tsɿ˨˩˦/).

### Tone layer
- Tone mark on the nucleus → Chao letters appended to the nucleus token's
  `p` (macron ˥, acute ˧˥, caron ˨˩˦, grave ˥˩, none = neutral), and the
  accent vocabulary field set (`macron|acute|caron|grave|undefined`) so the
  contour layer reads it. `renderIpa` carries the letters for free.
- `collectNotes` and `rhythmSyllable` now strip Chao tone letters
  (U+02E5–U+02E9) before map lookup — otherwise every tone-marked nucleus
  would miss its note/rhythm entry.
- `syllableContour(syllable, stressed, language)` gained a language param;
  chinese/taoist return `level/rise/fall-rise/fall/neutral` per syllable
  regardless of stress (stressIndex is always null). Top-level
  `timing.contour` for tonal languages is the per-syllable contours joined
  (`'rise level'`) instead of the misleading `'flat'`. Non-tonal languages
  are byte-identical in behavior.
- The panel (`buildPronunciationPanel`) renders `mora · contour` per chip —
  the new contour strings display sensibly with no template change.

### Syllabification
- `syllabify(tokens, onsetSet, codaOnly)` gained an optional third param: a
  lone intervocalic consonant whose `p` is in `codaOnly` closes the LEFT
  syllable instead of migrating right. Chinese declares `{n, ŋ}` — without
  this, `Cháng'é` syllabified as /ʈʂʰa.ŋɤ/ (the generic
  single-consonant-goes-right rule). All other languages pass no third arg
  and behave exactly as before.

### Prosody
- `PROSODY.chinese`: `moraMs 250`, `geminate false`, `codaWeight 0.5`,
  `codaNasalMora false`, model `'syllable-timed (one beat per syllable;
  lexical tone contour per syllable)'`. `prosodyFor` maps `taoist`→`chinese`
  (and `greek-location`→`greek` as before).
- Morae: simple final 1, diphthong/triphthong 2 (counted as vowel elements
  in the nucleus IPA, glides/̯ excluded), coda nasal +0.5 via the existing
  syllable-level rounding.
- **moraMs tuning tension (documented):** the brief asked for a 2-syllable
  name at ≈500–700ms with citation syllables ~200–300ms. With the spec'd
  mora counting, 2-syllable names span 2–5 morae (Nézhā=2, Hòuyì=3,
  Guānyīn=5), so no single moraMs satisfies all. Chose 250: a light CV
  syllable = 250ms (inside the 200–300ms citation range) and the canonical
  light 2-syllable case (Nézhā) lands at exactly 500ms. Heavy names run
  long (Guānyīn 1250ms) — inherent to uncapped mora counting.

### Respelling / notes
- Global RESPELL additions (no collisions with existing languages — verified
  Sanskrit/Japanese emit tie-bar affricates, different strings):
  `ʈʂ→j, ʈʂʰ→chr, tɕ→j, tɕʰ→ch, ɻ→r, ts→ts, tsʰ→ts, ɤ→uh, ɚ→ur, ʅ→ir,
  ɿ→ih` plus compound nuclei `ai̯→eye, ei̯→ay, ou̯→oh, iau̯→yow, iou̯→yoh,
  uai̯→why, uei̯→way, ia→yah, iɛ→yeh, ua→wah, uo/wo→waw, uə→wuh, yɛ→yweh,
  iʊ→yoo`.
- **Two collisions resolved with a per-language override map** instead of
  changing globals: Mandarin ü [y] → `'ew'` (Greek/Norse short y keeps
  `'ee'` — changing the global would have degraded 6 existing respellings:
  tethys, ymir, yggdrasill, eileithyia, zephyros, amethystos), and Mandarin
  sh [ʂ] → `'shr'` (Sanskrit ṣ keeps `'sh'`). Mechanism: optional 4th param
  `overrides` on `deriveRespelling`, sourced from `spec.respell`.
- NOTES: added ʈʂ/ʈʂʰ/tɕ/tɕʰ/ɻ/ts/tsʰ/ɤ/ɚ/ʅ/ɿ guidance in the existing
  register; the existing ɕ note was reworded to cover both Japanese sh and
  pinyin x ("soft 'sh' … tongue flat behind the lower teeth") — no test
  asserted the old text.
- Rule line added to `PRONUNCIATION_RULE_LINES` in create-flagship.js for
  chinese + taoist ("Mandarin is tonal — the mark over each vowel is the
  pitch pattern: ā level, á rising, ǎ dipping, à falling.").

## Validator numbers

IMPORTANT: the pronunciation atlas was reseeded by a parallel workstream
while this module was being built (926/926 entries, 0 skipped). The honest
same-atlas comparison below uses the current working-tree atlas against the
HEAD engine (fallback) vs the new engine:

| metric (chinese+taoist, n=61) | OLD (fallback) | NEW (module) |
|---|---|---|
| passthrough (derived:false) | 61 | 0 |
| exact | 3 | 4 |
| exact+near (≤2 edits) | 27 | 13 |
| meanDist | 3.74 | 5.82 |

The Levenshtein coverage DROPPING is expected and honest: most atlas Chinese
entries are ASCII-romanization-derived junk (e.g. jadeemperor `/yuhuˈaŋg/`,
zhongliquan `/zhoːŋglˈikuˈan/`) which the old fallback accidentally
resembled; real IPA with retroflexes and tone letters diverges from it.
Against the **curated** atlas entries the module agrees tightly:

- nezha dist 0 (atlas `/nɤ˧˥ ʈʂa˥/`), wuji dist 0
- bagua 1, taichi 1, houyi 1, pangu 1 (atlas drops the ŋ)
- mengpo 2, wuxing 2, long 2, change 2 (tone-letter position: module puts
  the contour on the nucleus before a coda nasal, atlas after the rime —
  a notational 2-edit transposition, per the task's explicit
  "append to the nucleus vowel token" instruction)
- yanluo 4, yinyang 5, xiwangmu 3, longwang 5 (atlas writes jɛn/waŋ/lwo
  without the i/u glides)

Full-run totals (current atlas, new engine): 926 compared, exact 301 (32.5%),
ex+near 729 (78.7%); timing mora-agreement 308/336 (91.7%), flagship headline
141/158 (89.2%). These totals are NOT comparable to a pre-module run because
the atlas itself changed mid-task (893→926 entries).

## Test results

- `node --test test/pronunciation.test.js` — 28/28 pass (10 new tests:
  nezha full shape, change apostrophe, xiwangmu 3-syllable T3, houyi T4+T4,
  longwang T2+T2, sunwukong camelCase, nuwa ü + respell override, yamen
  neutral tone, all-61-entries loop, nezha panel).
- `node --test test/everyday-ink.test.js` — pass (engine consumer sanity).
- `node scripts/create-flagship.js {nezha,change,houyi,longwang,xiwangmu}` —
  all OK; `grep -c "Say it right"` = 2 for each of the five temples.
- biome format + lint clean on all three touched covered files.

## Entries that don't derive cleanly

None throw; all 61 derive with `derived:true` and non-empty IPA. Two caveats:

- **bodhidharma** (`Bodhidharma`) — an unmarked Sanskrit-name romanization,
  not tone-marked pinyin. Derives as /pwot.xit.xaɻ.ma/ with all-neutral
  contours; the non-pinyin `dh`/`rh` clusters become stray consonant codas.
  Acceptable (it is not a flagship), but flagging: if a clean reading is
  wanted, the lexicon form should carry pinyin (Pútídámó) or the entry is
  honestly a conventional-reading candidate.
- **yamen** (`Yámen`) — second syllable genuinely unmarked in the lexicon;
  rendered as neutral tone. This is data-faithful (and serves as the
  neutral-tone test case).

## Files touched

- `type/js/pronunciation-rules.js` (+407/-16: tokenizer, prosody, contour,
  respell/rhythm/notes maps, LANGUAGES, header comment)
- `test/pronunciation.test.js` (+101)
- `scripts/create-flagship.js` (+4: chinese/taoist rule lines)
- `AGENTS.md` (Pronunciation Engine section: chinese/taoist coverage line)
- `sites/{nezha,change,houyi,longwang,xiwangmu}/**` — create-flagship
  rewrites (expected; the full `npm run generate` is the controller's job)
