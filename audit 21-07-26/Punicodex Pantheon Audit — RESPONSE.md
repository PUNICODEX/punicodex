# Punicodex Pantheon Audit — Response & Resolution Log

**Response date:** 2026-07-21
**Audit reviewed:** `Punicodex Pantheon Audit.xlsx` (Perplexity AI, 21-07-26) — 252 entries, 50 flagged
**Status:** all 50 flags triaged. 16 flags produced repo fixes, 4 domains replaced by owner, 27 resisted with evidence, 3 content notes folded into lore.

**Caveats on the audit itself:** it audited 252 entries while the live corpus is 265 flagships / 927 lexicon entries (stale scope), and it contains at least one internal self-contradiction (the `Athénā` row reads *"OK is wrong here: entry FLAGGED"*). Its findings were nonetheless valuable — roughly a third were actionable.

---

## A. The ꜣ / ꜥ question (Egyptological vs Semitological signs)

**DNS fact:** U+02BE (ʾ) and U+02BF (ʿ) — the Semitological half-rings — are **not valid characters in IDNA2008** and cannot be registered in .com at all. The Egyptological letters U+A722/23 (Ꜣꜣ) and U+A724/25 (Ꜥꜥ) are the **only registrable approximations** of aleph and ayin. Every flag that recommends U+02BF is void by DNS law, not by preference. Scholar pages disclose the convention ("the registrable alef ꜣ (U+A723)").

| Flag | Verdict |
|---|---|
| Baꜥal, ꜥAnat, ꜥAsherah (ayin) | **RESIST** — U+02BF is unregistrable; ꜥ is the only lawful approximation. |
| Ꜣmun, ꜣb, ꜣnpw (j vs ꜣ) | **RESIST** — the reed-leaf *j* was /ʔ/ (aleph-class) in early Egyptian (Allen, Loprieno); the j-form would be plain ASCII, not a restoration. Provenance notes strengthened. |
| Ꜥpp → ꜥꜣpp | **CONCEDE (acquisition)** — fuller skeleton is better; ꜥꜣpp.com recommended. |
| Stḫ | **RESIST** — *s-t-ḫ* is a legitimate consonantal reading; Greek Σήθ preserves the -ḫ. |
| Ḥp | **CONCEDE (acquisition)** — ḥꜥpy.com is the fuller form. |
| Sꜥ → Sꜣ | **CONCEDE — FIXED** — Faulkner's headword is *sjꜣ*. **sꜣ.com acquired and wired as primary**; sꜥ.com removed from the project; lexicon display, breakdown, and hieroglyph provenance (𓋴𓇌𓄿) all updated. |

## B. Domains replaced by owner (all four integrated)

| Old | New | Repo work completed |
|---|---|---|
| méngpó.com | **mèngpó.com** | 孟 is 4th tone. Lexicon display → Mèngpó; breakdown shows grave (falling tone); archetype domain + punycode swapped; owned-domains swapped; old punycode detached from Vercel, new attached. |
| sphigx.com | **sphínx.com** | Lexicon unicode → Sphínx (acute restored; γξ→'nx' by convention); ascii field corrected sphigx→sphinx; archetype name/domain swapped; Vercel swapped. |
| sꜥ.com | **sꜣ.com** | See A above. Full re-base completed. |
| iūppiter.com | **iūpiter.com** | Hybrid retired. Lexicon unicode → Iūpiter; breakdown drops the second p with the note "Single-p spelling (Iūpiter, not Iuppiter)"; Vercel swapped. |

## C. Flags fixed in the repository

| Flag | Fix |
|---|---|
| **Kārtikeya** | Unicode → **Kārttikeya** (correct IAST geminate; breakdown records the tt as a merge step). Domain was already correct. |
| **Trengtreng** | Pantheon `incan` → **`mapuche`** (new pantheon wired into the validator enum, scholars taxonomy kit, codex colors/docs, temple palettes/labels); gloss → "Flood, Land-Shaping". Its scholars page already argued the point. |
| **Athénā** | Original-script field **Ἀθήνᾶ → Ἀθηνᾶ** (two accents on one word is impossible orthography). Accuracy validator's own stale expectation corrected; engine stacked-form tests now assert the correct behavior for a circumflex-on-alpha entry. |
| **Méngpó tone** | Fixed in B above. |
| **Šāpšu pantheon** | phoenician → **canaanite** (Ugaritic deity). The Šāpšu long-ā flag itself resisted (used in Ugaritology, cf. DULAT). |
| **Aganjú gloss** | "Volcanoes, Wilderness" → **"Wilderness, Earth, Diaspora Volcano"** (the volcano bond is Cuban Santería; Yorubaland has none). |
| **Monókerōs gloss** | "Purity, Rarity, Wonder" → **"Rarity, Ferocity, Wonder"** (Ctesias' fierce Indian beast; medieval purity symbolism moved to lore). |
| **Þórr tagline** | Was byte-identical to Perkūnas ("The Thunder of the Oaks") → **"The Warder of Miðgarðr"**. |
| **Kānāloa** | Pukui & Elbert / UH Mānoa write **Kanaloa with no kahakō** — entry re-based to the dictionary form (tier-2); kānāloa.com kept as the documented owned variant. |
| **Huitzilopōchtli / Itzpapālōtl / Tezcatlipōca** | Under-marked by our own doctrine. **Acquisition recommended** (huītzilōpōchtli, ītzpāpālōtl, tēzcatlīpōca); current forms stay as documented partial variants. |
| **Dāgan** | Dāgān is the fully-marked form — acquisition recommended; Dāgan kept (standard in English scholarship). |

## D. The Yoruba flags — all six addressed

The audit flagged 6 of 12 Yoruba entries (50%), five of them on missing tone marks. The resolution turns on a fact of Yoruba orthography the audit treats as a deficiency but which is actually the norm: **written Yoruba in Nigeria routinely omits tone marks.** Tone marking is obligatory only in dictionaries and disambiguation contexts; newspapers, literature, and everyday writing carry the **underdots** (ẹ/ọ for the open vowels /ɛ, ɔ/, ṣ for /ʃ/) without tones. The underdots are the phonemically load-bearing marks — they change meaning — and every owned form preserves them. The fully tone-marked versions are dictionary citation forms, and each entry now documents them explicitly.

| Flag | Resolution |
|---|---|
| **Aganjú** gloss | **FIXED** — "Volcanoes, Wilderness" → "Wilderness, Earth, Diaspora Volcano" (the volcano bond is Cuban Santería; Yorubaland has no volcanoes). Tagline → "The Wilderness of the Orisha". |
| **Ẹṣu** (wants Èṣù) | Fully tone-marked **Ẹ̀ṣù** added as a sourced variant; new provenance record in original-scripts-extra.json shows the tone-marked standard with sign-by-sign reading. Owned form Ẹṣu keeps both underdots — Wikipedia's "Èṣù" actually preserves *fewer* features than ours (no underdots). |
| **Ọba** (wants Ọbà) | **Ọbà** added as a sourced variant + new provenance record. Owned form keeps the underdot; the final low tone is now documented. |
| **Ọbatálá** (wants Ọbàtálá) | **Ọbàtálá** added as a sourced variant + new provenance record (low tone on ba, high tones on tálá). Owned form keeps the underdot + both high tones. |
| **Ọrúnmìlà** (wants Ọ̀rúnmìlà) | **Ọ̀rúnmìlà** added as a sourced variant + new provenance record. Owned form keeps the underdot + three of four tones. |
| **Ọṣun** (wants Ọ̀ṣun) | **Ọ̀ṣun** already stood in the canonical provenance record; now also added as a sourced variant. Owned form keeps both underdots. |

If fully tone-marked domains are ever obtainable (ẹ̀ṣù.com, ọ̀ṣun.com, ọbà.com, ọ̀bàtálá.com, ọ̀rúnmìlà.com), they can be wired as primaries with the current forms demoted to variants — the variant scaffolding now in place makes that a one-line change per entry.

## E. Flags resisted with evidence

- **Búri** — *progenitor* means *ancestor*, not *direct father*. The audit misreads English.
- **Týr cognate with Zeus/Jove** — mainstream PIE *dyēus*; *deywós* is a derivative of the same root, not a rival.
- **Ēl** — the theonym is conventionally written ʾĒl with macron (Cross, M.S. Smith); the short vowel belongs to the generic noun ʾil.
- **Anû, Enlīl, Ēa** — the audit itself admits Ēa is "genuinely disputed"; our scholars pages already disclose these macrons as reconstruction choices.
- **Ašeratu** — Phoenician *š*-form is exactly correct (Ugaritic ṯ → Phoenician š); the audit's own citation undermines it.
- **Gē, Promētheus** — macron-only is the LSJ convention and explicit house doctrine; combined marks are the ideal only where the domain exists.
- **Hádēs** — the "dropped iota" is the iota-subscript convention (ᾅδης = Hádēs).
- **AhuraMazdā** — domains contain no spaces; the temple presents the two-word form.
- **Atlantís** — quoted tagline describes Plato's island only; no conflation in our data.
- **Nirmātā, Hē** — concept/epithet entries are a documented class (Archē, Anánkē, Hen).
- **Xiān, Ēōs (plain-ASCII domains)** — doctrine's last-resort fallback where the diacritic domain is unobtainable.
- **Mōt** — Mōt is standard in English scholarship; mūt.com listed as optional acquisition.

## E. Verification

- Lexicon validator: 84,654 assertions green.
- Philological accuracy: 967 green.
- Flywheel integrity (archetype/domain/middleware routing): green after regeneration.
- All four replacement punycodes attached to the Vercel project; all four refunded domains detached.
- Full 136-suite test run: green.
