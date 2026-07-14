# PÚNYCODEX Oracle — Model Card

**Model family:** PÚNYCODEX Oracle (specialized language model)  
**Data version:** 2.0.51  
**Generated:** 2026-07-14T10:59:40.713Z  
**License:** CC BY 4.0 for dataset; ISC for software (see root LICENSE).

## Intended Use

- Answer scholarly questions about mythological names, Unicode restorations, original scripts, pronunciation, etymology, and meaning.
- Convert between Unicode domain names and punycode (xn--) representations.
- Detect and explain homograph attacks, mixed-script deception, normalization tricks, and brand-impersonation risks.
- Engage in comparative mythology, symbolic correspondence, scientific analogy, and contemplative reflection.
- Support the PÚNYCODEX search engine, browser extension, mobile app, and API v1.

## Training Data

| Split | Examples | File |
|-------|----------|------|
| Train | 56,462 | `data/corpus/chat-train.jsonl` |
| Evaluation | 14,234 | `data/corpus/chat-eval.jsonl` |
| **Total** | **70,696** | — |

Source corpora:
- `instructions.jsonl`: 8,129 examples
- `safety-examples.jsonl`: 41,441 examples
- `dialogue-examples.jsonl`: 2,970 examples
- `tool-use-examples.jsonl`: 4,470 examples
- `multimodal-examples.jsonl`: 1,707 examples
- `preference-examples.jsonl`: 3,614 examples
- `reasoning-examples.jsonl`: 3,494 examples
- `mythology-synthesis.jsonl`: 391 examples
- `oracle-examples.jsonl`: 1,796 examples
- `symbolic-correspondences.jsonl`: 1,233 examples
- `scientific-analogies.jsonl`: 1,451 examples

## Training Recipe (recommended)

1. **Base model:** any modern decoder-only LLM with strong multilingual and Unicode support (e.g., Llama 3, Mistral, Qwen, or a domain-continued pretrained checkpoint).
2. **Continual pretraining (optional):** run a small number of epochs on the raw lore, source catalog, and extended provenance text to adapt tokenization to diacritics, Greek, and non-Latin scripts.
3. **Supervised fine-tuning:** train on `chat-train.jsonl` with full chat messages. Use a low learning rate (1e-5 to 5e-6) and train for 2-3 epochs.
4. **Safety tuning:** up-weight `safety` and `oracle_safety` examples in the final SFT epoch.
5. **Tool-use tuning:** fine-tune on `tool-use-examples.jsonl` after base SFT so the model learns the function-calling schema.
6. **RLHF / DPO:** use the `preference` records in `chat-train.jsonl` (`preference.rejected` is included for each chosen example) to train a reward model or run DPO.
7. **Evaluation:** score against `eval.jsonl`, `benchmark.jsonl`, and the per-task metrics before each release.

## Evaluation

- `chat-eval.jsonl`: held-out chat examples across all tasks.
- `benchmark.jsonl`: exact-match and contains-match benchmark questions.
- `test/ai-corpus-phases.test.js`: regression tests guarding corpus integrity.

## Hardware Guidance

- **Minimum viable SFT:** 24 GB VRAM (QLoRA on a 7B/8B model, rank 64, batch size 1-2).
- **Comfortable full fine-tune:** 80 GB VRAM (A100/H100) for 7B-13B dense models.
- **Preferred for production:** 2× H100 80 GB or equivalent for 70B-class models and larger batch sizes.

## Limitations

- Pronunciation and etymology are reconstructed where primary attestations are sparse; confidence levels are explicit.
- Original-script coverage is strongest for Greek, CJK, Devanagari, and major Near-Eastern scripts.
- Safety examples are heuristic; they do not replace legal review or human moderation.
- The model is not a registrar, lawyer, or trademark authority.

## Ethical Use

Do not use this model to generate deceptive domains, impersonate brands, or evade security controls. The PÚNYCODEX Oracle is designed to illuminate names, not to weaponize them.

## Continual Pretraining (Phase 15)

Before supervised fine-tuning, domain-adapt the base model on the raw scholarly corpus:

- `data/corpus/pretrain.jsonl` — 5,248 training documents (396,010 whitespace tokens).
- `data/corpus/pretrain-validation.jsonl` — 271 validation documents (21,020 whitespace tokens).
- HuggingFace-compatible splits in `data/corpus/huggingface/`.

Documents are drawn from structured entry records, flagship lore, original-script provenance, pronunciation notes, the source catalog, mythology synthesis, oracle reflections, symbolic correspondences, and scientific analogies. Strip HTML and normalize whitespace before tokenization. This step teaches the model the domain's scripts, diacritics, scholarly vocabulary, and canonical source style before chat-format SFT.
