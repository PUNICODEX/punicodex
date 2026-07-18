# PuniCodex AI Training Corpus — Data Card

**Data version:** 2.0.65  
**Generated:** 2026-07-18T14:06:54.573Z  
**License:** CC BY 4.0 for dataset; ISC for software (see root LICENSE).

## Purpose

This corpus is the foundational training and evaluation data for a specialized AI that understands mythological names, Unicode restorations, original scripts, pronunciation, etymology, punycode, and homograph safety. Every example is grounded in the PuniCodex canonical sources.

## Files

| File | Examples | Size | Description |
|------|----------|------|-------------|
| entries.jsonl | 895 | 4.01 MB | Rich structured record for every lexicon entry. |
| instructions.jsonl | 8,210 | 3.57 MB | Scholarly question/answer pairs (Phase 1). |
| instructions-train.jsonl | 39,676 | 23.76 MB | Training split (80%) of scholarly + safety examples. |
| eval.jsonl | 10,015 | 6.01 MB | Held-out evaluation split (20%) of scholarly + safety examples. |
| safety-examples.jsonl | 41,481 | 26.21 MB | Adversarial safety examples (Phase 2). |
| dialogue-examples.jsonl | 3,042 | 2.06 MB | Multi-turn conversation examples (Phase 3). |
| tool-use-examples.jsonl | 4,475 | 9.52 MB | Function-calling / tool-use examples (Phase 4). |
| multimodal-examples.jsonl | 1,757 | 820.9 KB | Vision-language pairs for mascots, logomarks, scripts (Phase 5). |
| preference-examples.jsonl | 3,618 | 1.97 MB | Chosen/rejected pairs for RLHF (Phase 6). |
| reasoning-examples.jsonl | 3,501 | 1.97 MB | Chain-of-thought reasoning traces (Phase 7). |
| benchmark.jsonl | 6,146 | 2.10 MB | Held-out evaluation benchmark with known answers (Phase 8). |
| mythology-synthesis.jsonl | 391 | 258.8 KB | Comparative, esoteric, and modern-parallel mythology synthesis (Phase 10). |
| oracle-examples.jsonl | 1,865 | 2.13 MB | Conversational Oracle training examples with system/user/assistant turns (Phase 11). |
| symbolic-correspondences.jsonl | 1,233 | 743.0 KB | Symbolic and hermetic correspondences with confidence and provenance (Phase 12). |
| scientific-analogies.jsonl | 1,500 | 1.02 MB | Scientific and philosophical analogies bridging ancient myth and modern thought (Phase 13). |
| chat-train.jsonl | 56,855 | 76.95 MB | Unified chat-format training corpus, 80% deterministic split (Phase 14). |
| chat-eval.jsonl | 14,218 | 19.25 MB | Held-out chat-format evaluation split, 20% (Phase 14). |
| MODEL_CARD.md | 78 | 4.4 KB | Model card with training recipe, evaluation plan, and hardware guidance (Phases 14-15). |
| pretrain.jsonl | 5,353 | 3.74 MB | Raw-text continual pretraining corpus, 95% split (Phase 15). |
| pretrain-validation.jsonl | 291 | 208.8 KB | Held-out raw-text validation split, 5% (Phase 15). |
| huggingface/train.jsonl | 5,353 | 3.02 MB | HuggingFace-compatible continual pretraining split (Phase 15). |
| huggingface/validation.jsonl | 291 | 168.4 KB | HuggingFace-compatible validation split (Phase 15). |
| manifest.json | 320 | 10.0 KB | Machine-readable corpus manifest. |

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
- **Phase 11 — Oracle Conversations:** Multi-turn system/user/assistant examples that train the PuniCodex Oracle persona for restoration, pronunciation, mythology, pattern-weaving, modern bridges, contemplative reflection, translation, safety refusal, domain advice, and scholarly citation.
- **Phase 12 — Symbolic Correspondences:** Planetary, elemental, alchemical, tarot, chakra, sefirot, runic, wuxing, directional, metal, gemstone, color, and animal mappings for entries, with explicit confidence levels and cultural provenance.
- **Phase 13 — Scientific & Philosophical Analogies:** Dense mappings of mythological figures to modern concepts in physics, biology, neuroscience, systems science, philosophy, and technology, emphasizing analogy over equivalence.
- **Phase 14 — Unified Training Corpus:** Every Phase 1-13 example converted into a single OpenAI-compatible chat format with a consistent Oracle system persona, deterministic 80/20 train/eval split, and a model card with training recipe and hardware guidance.
- **Phase 15 — Continual Pretraining Corpus:** Raw-text scholarly documents drawn from structured entry records, flagship lore, original-script provenance, pronunciation notes, the source catalog, mythology synthesis, oracle reflections, symbolic correspondences, and scientific analogies. Provided as plain JSONL and HuggingFace-compatible splits for domain-adapting the base model before chat-format SFT.

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
- **Unified SFT:** Use `chat-train.jsonl` as the single chat-format supervised-fine-tuning dataset; it already mixes all phases with the Oracle persona.
- **Held-out evaluation:** Score against `chat-eval.jsonl` (chat format) and `benchmark.jsonl` (exact/contains answers) before each release.
- **Continual pretraining:** Before SFT, domain-adapt the base model on `pretrain.jsonl` (or `huggingface/train.jsonl`) to learn scripts, diacritics, scholarly vocabulary, and canonical style.
- **Model card:** Read `MODEL_CARD.md` for the recommended training recipe, hardware sizing, and ethical-use boundaries.

## Known Limitations

- Pronunciation and etymology data are reconstructed where primary attestations are sparse; confidence levels are explicit.
- Original-script coverage is strongest for Greek, CJK, Devanagari, and major Near-Eastern scripts; some traditions rely on transliteration.
- Safety examples are generated heuristically; they should be reviewed before deployment in high-stakes classifications.
