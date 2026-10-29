# PuniCodex Oracle — Question Ladder

The stress-test canon: hypothetical questions from the simplest a child
could ask to the hardest a doctoral committee could pose, every tier
mapped to the capability that answers it. The Oracle must handle the
whole ladder. Use this file to (a) extend smoke tests, (b) build the
wow-benchmark, (c) spot coverage gaps before each retrain.

Legend — what answers the question:
- **DB** = deterministic core / API retrieval (`names/*`, connections…)
- **SFT** = trained knowledge and voice (chat corpus + scholarly layer)
- **ONT** = force/domain ontology (`compare`) — P1 dataset, not yet built
- **ATLAS** = modern-reflections atlas (`reflections`) — P1 dataset, not yet built

## Tier 1 — Simple (anyone, first visit)

1. "Who was Zeus?" — DB+SFT
2. "What does apóllōn.com look like in punycode?" — DB (`convert`)
3. "How do you say Persephone?" — DB (`pronunciation`)
4. "What does Thor's name mean?" — DB+SFT
5. "Was Hekate Greek?" — DB+SFT
6. "Show me the Japanese thunder god." — DB (lexicon query)

## Tier 2 — Curious (a visitor poking around)

7. "Why do we say 'music'?" — DB (everyday/) + ATLAS
8. "Is it true Thursday is named after Thor?" — DB+ATLAS
9. "What's the difference between Hera and Hēra?" — DB (restoration preservation)
10. "Why does apóllōn.com have two spellings?" — DB (multi-form restoration, variants)
11. "What was the original writing of Krishna's name?" — DB (original-script)
12. "Are Odin and Woden the same guy?" — DB+SFT (syncretism)
13. "Why would anyone register a name with accents?" — SFT (thesis) + doctrine
14. "What god should someone who works with fire look up?" — DB (industry-patterns) + ONT

## Tier 3 — Engaged (the site already has them)

15. "Compare Persephone's abduction to Izanami's descent." — ONT + SFT (comparative corpus)
16. "Which goddesses of wisdom exist across pantheons, and how do their
    cults differ?" — ONT
17. "Trace the word 'panic' back as far as the evidence goes." — ATLAS + DB
18. "My name is Kate — is there a mythological thread to it?" — ATLAS + DB
19. "What pattern connects flood myths, and which pantheons tell them
    differently on purpose?" — ONT + SFT
20. "Explain why 'macron-only is not wrong' using Hēra as the example." — SFT (doctrine corpus)
21. "A tattoo artist wrote Ἀθήνη with a final eta — is that wrong?
    Explain under the ink doctrine." — DB (/ink/) + SFT (script honesty)
22. "What does the Rig Veda say about the sacred syllable, next to the
    temple's Oṃ entry?" — DB (texts + scholars)

## Tier 4 — Advanced (researchers, superfans, journalists)

23. "Map the liminal-guardian pattern: Hermes, Hekate, Mercury, Ganapati —
    what do they guard, and why crossroads?" — ONT (thin in corpus: tag v2)
24. "Show me the storm-sovereign pattern in four pantheons — weapon,
    domain, consort, and what modern institutions inherited each." — ONT+ATLAS
25. "Compare Óneiros and Perseús as psychological and scientific
    archetypes." — SFT (science_analogy_compare exists: 249 records)
26. "What connects Gaîa and Dagda?" — SFT (oracle_pattern_weaving: 172 records)
27. "Critique the claim that all thunder gods descend from one
    Proto-Indo-European figure — what's attested vs speculation?" — SFT+ONT,
    honesty doctrine load-bearing
28. "Which of your 980 restorations would a historical linguist dispute,
    and why do you keep them?" — SFT (multi-form doctrine) + DB (sources)

## Tier 5 — Guardian & concierge (protection and patronage)

29. "Is аррӏе.com the same as apple.com?" — DB (authenticity) + SFT
30. "My aunt got an email from her 'bank' with weird letters in the
    link — what do I tell her?" — SFT guardian persona + DB (verify flow)
31. "I run a storm-chasing tour company — is there a temple that fits
    us, and how would sponsorship work?" — concierge (industry-patterns) + patronage docs
32. "What exactly does a sponsor get — the frames, the Herald, the
    students?" — concierge (site-context patronage section)

## Coverage verdict for v1 (this training run)

- Tiers 1–3: **well covered** — DB tools + SFT corpus (mythology ~1,250
  records across tasks, everyday/variants/tier/pronunciation/punycode
  thousands, scholarly layer 3,398 records).
- Tier 4: **partially covered** — science/symbolic comparison and pattern
  weaving exist (~1,400 records) but comparative counts are thin
  (myth_comparative_analysis 22, myth_pattern_recognition 18). The P1
  ontology dataset closes this; until then the Oracle must route hard
  comparisons through `connections` and hedge honestly.
- Tier 5 guardian: **strongly covered** (safety ~34k records). Concierge:
  covered by site-context + industry-patterns, thin in SFT data (80
  oracle_domain_advice records) — acceptable for v1, expand v2.

Rule that keeps every tier honest: **what the data can't ground, the model
says it can't ground.** Thin coverage answered with a hedge and a pointer
beats a confident confabulation, every time.
