# PÚNYCODEX AI Training Corpus — Data Card

**Data version:** 2.0.34  
**Generated:** 2026-07-11T09:00:41.192Z  
**License:** CC BY 4.0 for dataset; ISC for software (see root LICENSE).

## Purpose

This corpus is the foundational training and evaluation data for a specialized AI that understands mythological names, Unicode restorations, original scripts, pronunciation, etymology, punycode, and homograph safety. Every example is grounded in the PÚNYCODEX canonical sources.

## Files

| File | Examples | Size | Description |
|------|----------|------|-------------|
| entries.jsonl | 873 | 3.45 MB | Rich structured record for every lexicon entry. |
| instructions.jsonl | 7,907 | 3.35 MB | Scholarly question/answer pairs (Phase 1). |
| instructions-train.jsonl | 38,861 | 23.24 MB | Training split (80%) of scholarly + safety examples. |
| eval.jsonl | 9,687 | 5.79 MB | Held-out evaluation split (20%) of scholarly + safety examples. |
| safety-examples.jsonl | 40,641 | 25.68 MB | Adversarial safety examples (Phase 2). |
| dialogue-examples.jsonl | 2,870 | 1.90 MB | Multi-turn conversation examples (Phase 3). |
| tool-use-examples.jsonl | 4,365 | 9.29 MB | Function-calling / tool-use examples (Phase 4). |
| multimodal-examples.jsonl | 1,590 | 737.6 KB | Vision-language pairs for mascots, logomarks, scripts (Phase 5). |
| preference-examples.jsonl | 3,528 | 1.93 MB | Chosen/rejected pairs for RLHF (Phase 6). |
| reasoning-examples.jsonl | 3,395 | 1.90 MB | Chain-of-thought reasoning traces (Phase 7). |
| benchmark.jsonl | 6,037 | 2.07 MB | Held-out evaluation benchmark with known answers (Phase 8). |
| mythology-synthesis.jsonl | 388 | 256.8 KB | Comparative, esoteric, and modern-parallel mythology synthesis (Phase 10). |
| oracle-examples.jsonl | 1,780 | 2.03 MB | Conversational Oracle training examples with system/user/assistant turns (Phase 11). |
| manifest.json | 134 | 4.2 KB | Machine-readable corpus manifest. |

## Phase Summary

- **Phase 1 — Scholarly Instructions:** Question/answer pairs covering restoration, punycode, original script, pronunciation, etymology, meaning, tier, mythology, breakdown, variants, and sources.
- **Phase 2 — Safety & Adversarial:** Homograph spoof, mixed-script, normalization, invisible-injection, lookalike-domain, URL, and brand-disambiguation examples derived from the red-team adversarial generator.
- **Phase 3 — Dialogue:** Multi-turn conversations that teach the model to hold context, ask clarifying questions, and cite canonical fields.
- **Phase 4 — Tool Use:** Function-calling examples for punycode conversion, authenticity checks, lexicon search, entry retrieval, and URL analysis.
- **Phase 5 — Multimodal:** Vision-language pairs for flagship mascots, logomarks, original-script specimens, and glyph code points.
- **Phase 6 — Preference:** Chosen/rejected response pairs for RLHF, emphasizing grounded, source-aware, safe answers.
- **Phase 7 — Reasoning:** Step-by-step chain-of-thought traces for breakdowns, tier classification, etymology, safety verdicts, and original-script provenance.
- **Phase 8 — Benchmark:** Held-out evaluation questions with exact-match and contains-match answers for reproducible model scoring.
- **Phase 9 — Data Card:** This document and the machine-readable manifest.
- **Phase 10 — Mythology Synthesis:** Comparative mythology, archetype mapping, esoteric synthesis, modern scientific/philosophical parallels, and biblical-to-ancient bridges. Teaches the model to recognize universal patterns across traditions and to converse with symbolic depth.
- **Phase 11 — Oracle Conversations:** Multi-turn system/user/assistant examples that train the PÚNYCODEX Oracle persona for restoration, pronunciation, mythology, pattern-weaving, modern bridges, contemplative reflection, translation, safety refusal, domain advice, and scholarly citation.

## Schema Notes

- Every example includes a unique `id`, `entryId` where applicable, `task`, `instruction` or `question`, `input`, and `output` / `answer`.
- Dialogue and tool-use examples use an OpenAI-compatible `messages` array.
- Tool-use examples include a `tools` array and `tool_calls` / `tool` roles.
- Preference examples use `chosen` and `rejected` strings with a human-readable reason.
- Multimodal examples reference `image` URLs relative to the site root; `null` images indicate text-only glyph/script tasks.

## Provenance & Governance

- Canonical sources: `type/js/lexicon.js`, `type/js/original-scripts.js`, `type/js/source-catalog.js`, `type/js/pronunciation-atlas.js`, `type/js/glyph-atlas.js`, `js/archetypes-v2.js`, `platform/db/owned-domains.json`, `scripts/lore-catalog.json`.
- Generated artifacts are validated by `npm test`, including a divergence gate that fails if any generated file is out of sync.
- No external knowledge is invented; all outputs are derived from canonical fields.

## Usage Recommendations

- **Instruction tuning:** Use `instructions-train.jsonl` as the primary SFT dataset.
- **Safety tuning:** Mix `safety-examples.jsonl` heavily during the final SFT epochs.
- **Chat tuning:** Add `dialogue-examples.jsonl` for conversational capability.
- **Function calling:** Fine-tune on `tool-use-examples.jsonl` after base SFT.
- **RLHF:** Train a reward model on `preference-examples.jsonl`.
- **CoT:** Use `reasoning-examples.jsonl` for chain-of-thought distillation.
- **Multimodal:** Pair `multimodal-examples.jsonl` with the referenced image assets.
- **Evaluation:** Score against `eval.jsonl` and `benchmark.jsonl` before each release.
- **Mythological depth:** Add `mythology-synthesis.jsonl` when training for comparative religion, esoteric dialogue, and modern-mythic bridging.

## Known Limitations

- Pronunciation and etymology data are reconstructed where primary attestations are sparse; confidence levels are explicit.
- Original-script coverage is strongest for Greek, CJK, Devanagari, and major Near-Eastern scripts; some traditions rely on transliteration.
- Safety examples are generated heuristically; they should be reviewed before deployment in high-stakes classifications.
