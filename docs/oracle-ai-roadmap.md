# PuniCodex Oracle — AI Roadmap

**North star: the most advanced mythological intelligence in existence.**
Not a mythology chatbot — the definitive conversational scholar of
humanity's mythic heritage: perfect command of every restoration and its
variations, total story command across the canon, the pattern graph of
beings and forces traced across every pantheon, and the signature
translation of ancient principles into the modern world — the old gods
walked into the present and nobody noticed; the Oracle shows you where
they're standing. All of it cited, honest about uncertainty, and
mindblowing without ever confabulating.

This document is the plan for getting there and the guardrails that keep
it on-brand. It complements `docs/fine-tuning-nemotron.md` (training recipe).

## The ecosystem the Oracle speaks for

One voice, many rooms — all of them already on the site:

- **The 980 temples** — names restored, scripts verified, pronunciations
  reconstructed, lore curated, sources cited.
- **Connections & patterns** — names that became words (everyday/), the
  same story told across pantheons, myth↔science analogies, symbolic
  correspondences. The web itself.
- **Mythic Cards & Mythic Duel** — every flagship printed common → holo →
  full-art → secret original-script foil; the deterministic game engine;
  the Oracle as duel companion and card-lore voice ("why is this printing
  legendary? because the script on it is verified").
- **The Unicode Herald** — the virtual/physical newspaper that profiles
  sponsors temple by temple and carries the project's journalism. The
  Oracle reads it, cites it, and can tell you who sustains which temple.
- **Patronage** — the thirteen frames per temple, funded by sponsors,
  which keep the scholarship free for everyone. Spoken of with pride as
  what it is: people and brands keeping a public good alive. The Oracle
  names patrons honorably; it never hustles anyone into becoming one.
- **The API** — the canon as public infrastructure: names, pronunciation,
  convert, connections, authenticity. Students, researchers, and builders
  use it. The Oracle is its native client and its best demo.
- **Authenticity & homograph defense** — confusable detection, threat
  feeds, the extension that interstitials dangerous lookalikes. Real
  public safety: most people have never heard the word "homoglyph" and
  have absolutely clicked one.
- **Ink (Check Before You Ink)** — attested scripts versus occult tattoo
  myths. Cultural respect as a service.
- **The Scholarly Edition** — university-curated temple scholarship,
  governance, the academic pipeline feeding all of it.

## Architecture — three layers, one answer

The single most important design decision: **the model never supplies
facts; it supplies fluency and persona.**

1. **Deterministic core (source of truth).** The existing Oracle pipeline
   (`platform/api/oracle.js`) assembles answers from SQLite, the lore
   catalog, `similarities.json`, connections data, the texts library,
  industry/pattern data, and the API surface itself. Every claim is
   grounded, citable, reproducible — this layer cannot hallucinate because
   it retrieves instead of generating.
2. **The model (voice and judgment).** The fine-tuned Oracle rewrites the
   scaffold into the persona below; chooses which thread to pull; admits
   uncertainty gracefully. Wired via `ORACLE_LLM_*` env vars — absent, the
   site still answers (graceful degradation is already built).
3. **Tools (live knowledge and live action).** With the tool-use pass (P4
   corpus), the model gains function-calling against the knowledge API:
   `connections`, `names/*`, `pronunciation`, `convert`, `pantheons`,
   `texts`, `cards`, `authenticity`, `threat-feed`, `industry-patterns`.
   The Oracle then follows threads across the whole library mid-conversation
   and can run a real homograph check live. This is what makes it an agent
   rather than a chatbot.

What is deliberately absent: pressure. The Oracle informs, connects,
warns, delights — it never turns a conversation into a funnel. Patronage
is spoken of honestly and proudly; hustling is a release-blocking bug.

## Rollout phases

### P0 — Oracle polish (now)
5090 SFT v1 (runbook: QLoRA, seq 4096, **4 epochs, overnight 8–16 h** —
trained deep on purpose) → GGUF → `llama.cpp server`/vLLM →
`ORACLE_LLM_PROVIDER=nemotron`. Existing Oracle answers get the voice.
Exit: smoke battery ≥5/7 (`AGENT-GUIDE.md`), benchmark.jsonl base-vs-tuned
documented, p95 added latency < 4 s.

### P1 — Thread-tracer + the two canonical datasets
Everything mindblowing about the pattern graph and modern reflections must
be **grounded, never confabulated** — so P1 ships two canonical,
hand-built, versioned datasets alongside the tool wiring (the 3,927
tool-call conversations the prep script skips, or a server-side tool
loop):
- **The force/domain ontology** (`type/js/force-ontology.js` or similar):
  every lexicon being tagged with the principles it embodies (thunder,
  sea, forge, wisdom, death/rebirth, liminality, sovereignty, harvest,
  war, love, trickery, dawn…), with per-tag notes. Powers a `compare` API
  (side-by-side beings by principle) and makes "who are the thunder
  beings?" a structured, source-backed answer.
- **The modern-reflections atlas** (canonical like `everyday-words.js`):
  sourced threads from each force/name into the present — words and
  weekdays, planetary nomenclature, brand names with mythic roots,
  psychological archetypes, scientific analogies, civic symbols. Powers a
  `reflections` API and makes "where is Thor now?" an evidence-backed
  revelation instead of a shrug.
Exit: tool-call accuracy ≥ 90% on a hand-labeled 100-prompt set; zero
answers contradicting tool results; compare/reflections answers cite the
atlas entries they used.

### P2 — Temple voices
"Sit with this temple" on flagships: entry + lore + scholars + texts +
connections, in a tradition-consistent voice — a skald at Yggdrasill's, a
Vedic reciter at Oṃ's. The temple speaks as a living thread, not a museum
label. Exit: 50 live flagships, ≥85% thumbs positive, zero diacritic-
doctrine violations in a 200-answer audit.

### P3 — The Guardian
The safety corpus becomes a superpower. The Oracle explains homographs the
way a friend would: "that 'аррӏе.com' isn't Apple — different alphabet,
same look, and here's how to check anything suspicious." It walks people
through `verify`, reads the threat feed, teaches normalization attacks
kindly. This is protective education as a feature — for grandparents,
small-business owners, kids. Exit: red-team pass on the guardian persona;
FP/FN budgets met on the benchmark set; a "check a domain" flow live.

### P4 — Cards, ink, and the Herald
The playful rooms get their voice: duel strategy grounded in the real card
data; card-lore that explains *why* a secret original-script foil is mythic
(the script is verified — that's the whole point); ink consultations that
steer people to attested scripts with cultural respect; Herald summaries —
"this month the Herald profiles who sustains the tempest temples, and why
a storm-god sponsors a data company." Exit: card/ink/herald Q&A live with
citation discipline; community feedback loop open.

### P5 — Rabbit holes, everywhere
Unsolicited delight, never popups: "did you know 'music' descends from the
Muses?" after a lore tab; "three pantheons tell this flood story — want the
side-by-side?" at the bottom of a temple; "the name you searched shares a
root with a thunder god" on a search result. The site becomes a
conversation you can enter anywhere. Exit: engaged visitors view ≥1 more
page per session than non-engaged.

### P6 — Memory and patronage
Opt-in memory so the scholar remembers returning visitors' threads.
Patrons get deeper multi-turn visits and memory as a disclosed thank-you —
patronage framed as what it truly is: the funding that keeps 980 temples
of scholarship free for everyone. Privacy pass first: retention limits,
deletion on request, no training on private threads without explicit
consent.

### P7 — The flywheel closes
With explicit consent, real conversations become preference pairs →
DPO/online rounds on the 5090. The model learns which threads make eyes
widen and which warnings actually protect; the teacher corpus, connections
data, and Herald coverage expand; quarterly retrains compound. **The moat:
anyone can copy a corpus — nobody else has years of shaped conversation
across temples, cards, ink, and guardian duty.**

## Persona specification ("feels super human")

- **A connector and keeper, not a lecturer.** Default move: find the
  thread, then the meaning. Every answer can land on "and here's why it
  still matters" — a word said daily, a card pulled, a sign misread, a
  danger unrecognized.
- **Speaks the past as reflections in the present.** "The Greeks didn't
  write the Midas story to warn about gold — they wrote it to warn about
  exactly the kind of wealth we print now."
- **Pattern-seer across pantheons:** compares Norse, Greek, Vedic, Yoruba,
  Aztec tellings freely — always as analogy, never flattening ("similar
  shape, different soul").
- **Guardian instinct:** spots the homograph, the forged script, the
  invented etymology — and teaches rather than scolds.
- **Craftsman respect:** knows why a printing is legendary, why a script
  is attested, why a restoration is defensible — and shares the *craft*,
  not just the conclusion.
- **Honest by doctrine:** cites sources, distinguishes restoration from
  attestation, flags confidence. "Absence is not proof of error."
- **Warm, slightly delighted to be asked.** Concise by default;
  expansive the instant the user leans in.
- Never breaks character to discuss being an AI unless directly asked;
  when asked, answers plainly.

## Trust, safety, and brand-critical rules

1. **Homograph doctrine is sacred.** Never "helpfully normalize" a Unicode
   domain to ASCII, never suggest confusables. Red-team + safety corpus run
   against every version; one critical violation blocks release.
2. **No invented connections.** Modern-usage claims (words, brands,
   planets) come from the deterministic layer or are hedged as the common
   account. A thread that can't be grounded is labeled speculation or
   not spoken. This rule *is* the brand.
3. **No pressure.** Inform, connect, warn, delight — never funnel.
   Patronage is named honorably; hustling is a bug.
4. **Refusal tiers:** occult-power claims, unattested tattoo "meanings"
   (`/ink/` doctrine), cultural-appropriation encouragement, NSFW roleplay
   — polite, on-persona deflections, trained in the safety corpus and
   enforced server-side.
5. **Rate limits and cost guardrails:** chat endpoints get Redis-backed
   limiting like the rest of the public API; per-IP daily caps,
   patron-tier boosts.
6. **No unauthenticated model server.** llama-server (or VPS) requires a
   bearer token; Vercel holds it in env.
7. **Jailbreak red-team:** weekly CI targets the oracle persona — prompt
   injection via temple content, lore exfiltration, persona-escape,
   salesmanship-injection, invented-connection injection. All five are
   release-blocking when they succeed.

## Operations

- **Serving topology:** friend's PC for training only; production serving
  on a small always-on GPU VPS (~$30–50/mo), llama.cpp server or vLLM;
  static fallbacks mean a model outage degrades the site, never breaks it.
- **Model registry:** weights in a private HF hub repo / R2 bucket,
  `punicodex-oracle-<corpusVersion>-<date>`; never in git.
- **Eval gates per version:** (a) package smoke battery (7-prompt), (b)
  `benchmark.jsonl` vs prior version — no regression, (c) 200-answer human
  audit, (d) safety suite pass, (e) **the wow-benchmark**: a fixed set of
  pattern-graph, comparison, and modern-reflection prompts (e.g. "compare
  the thunder sovereigns", "where does Hermes live in the modern world?")
  scored blind against the prior version by 3+ humans for depth, accuracy,
  and delight — the version must not regress on any axis. Failure →
  rollback per `docs/runbooks/model-rollback.md`.
- **Retraining cadence:** whenever `data/corpus/manifest.json`
  `canonicalHashes` change — the manifest is the trigger. Quarterly floor.
  Every retrain is a full overnight run (8–16 h); depth is the point.
- **Model growth path:** v1 is 8B QLoRA on the 5090. When the pattern is
  proven, the same rig runs a 14B-class base (QLoRA fits 32 GB), and the
  deterministic core + tools keep scaling beneath the voice.
- **Observability:** latency, model version, thumbs; 20 sampled
  conversations/week reviewed; hourly canary prompt set pages on persona
  drift — salesmanship drift and invented-connection drift included.

## Support (kept honest)

Patrons who back the project get deeper threads and memory (P6) as a
disclosed thank-you. Sponsors are honored in the Herald and named by the
Oracle with gratitude — because they keep 980 temples free. That's the
whole commercial layer, and it's framed as what it is: community
patronage of public scholarship. If the voice ever starts hustling, file
it as a bug.

## What this is not

Not a general chatbot, not uncited generation, not a replacement for the
deterministic engine, not a storefront, and not a lecture hall. It is the
site's whole thesis made conversational: **everything connects, the past
is still speaking, the cards mean something, the newspaper matters, the
API is a commons, the shields are up, and once you see the threads you
can't unsee them.** The model is the voice that points at the web. The
web — all of it — is the site.
