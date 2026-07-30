# Mythic Duel v2 — Design & Architecture
## "The Olympian Protocol" · v2.0 · PuniCodex flagship game

> The trading-card game of the Unicode Pantheon: elite, self-contained
> gameplay that also feeds — and is fed by — the sponsorship, merch, and
> patron economy. This document is the plan of record. It is deliberately
> public: the spectacle is the marketing.

---

## 1. Vision

Every one of the 1,156 cards is a door into a temple; every temple is a
business. Mythic Duel v2 makes the loop real:

- **The game is elite on its own.** Hero-driven battles with cinematic
  attack sequences, signature moves per character, ranks, seasons, and
  quests — fun before it ever touches money.
- **The game feeds the business.** Quests and ranks mint real discount
  codes and patron trials through the existing engines. Players become
  sponsors because they *love* a god.
- **The business feeds the game.** Merch, sponsorships, and patronage
  unlock exclusive card editions — collectibles that exist because the
  economy is real.

Design law: **no pay-to-win**. Everything purchasable is cosmetic or
collectible (editions, frames, foils). Competitive stats come from the
canonical lexicon, not the wallet.

## 2. Current state (v1, audited)

- `game/engine.js` — full rules engine: 2 heroes @ 30 HP, turns, minions,
  ability DSL (on_play/on_attack/on_death/passive), seeded deterministic
  RNG, AI opponent, win detection, action log. **Kept as the rules
  authority — v2 wraps it, never rewrites it.**
- `game/game.js` — collection (localStorage), 3 pack types, deck editor,
  basic board render, Ink economy, win/loss stats.
- `game/cards.json` — the full FR1 set with stats/abilities/art.

Gaps: no presentation layer (attacks are log lines), no accounts, no
server persistence, no integrations, no ladder, no sequences.

## 3. Architecture

```
engine.js (rules authority, unchanged)
    │  action stream (playCard / attack / effect / death / win)
    ▼
game/fx/sequences.js ── canvas attack-sequence engine (60fps, 2D)
    │  archetype registry: 14 attack archetypes × per-character params
    ▼
game/battle-v2.js ── hero panels, board, hand, log, floaters, banners
    │
    ├─ /api/game/* (server: collection, profile, quests, leaderboard)
    │     Postgres (operational.js) — already provisioned pattern
    │
    └─ integrations
          merch webhook ──────► card unlock (Relic edition)
          booking go-live ────► Patron's Seal foil
          patron activation ──► signature edition
          quests/ranks ───────► discount-engine codes + patron trials
```

### 3.1 The attack-sequence engine (the spectacle)

Fourteen archetypes, each a parameterized canvas sequence (particles,
trajectory, impact frames, color ramp, screen shake weight). A character's
archetype derives deterministically from `pantheon + domain keywords`; its
parameters derive from `tier + pantheon colors + rarity` — so every one of
the 271 flagships attacks *visibly differently* without hand-animating 271
characters:

| Archetype | Signature | Example assignments (deterministic) |
|---|---|---|
| Bolt | lightning fork + strobe | Zeus, Thor, Perkūnas |
| Blade | sword arc + slash flash | Árēs, Achilleús |
| Flood | wave crest + spray | Poseidon, Njordr, Gaṅgā |
| Flame | fireball + embers | Hēphaistos, Sūrya |
| Shadow | void tendrils + drain | Hades, Anubis, Erebos |
| Bloom | petals + growth rings | Demeter, Freyr |
| Storm | rotating cyclone | Fūjin, Oya |
| Decay | wither + ash | Apep, Mórrígan-line |
| Radiance | beam + halo | Ra, Ahura Mazda |
| Song | note waves + charm | Apóllōn, Sarasvatī |
| Quake | ground fissure + rubble | Gē, Tlaltecuhtli |
| Gale | feathered gust | Hermês, Fujin-alt |
| Veil | mist + mind spiral | Mèngpó, Hekátē |
| Warhorn | charge banner + shockwave | Tūmatauenga, Kārttikeya |

Special moves fire from the ability DSL with per-archetype visuals; the
top ~30 flagships carry bespoke overrides (e.g. Zeus: "Storm of Olympos" —
full-screen bolt cascade).

Feel layer: damage floaters, hero-screen shake scaled to damage, death
dissolve, heal glow, turn banners, lethal slow-mo (0.35× for 900 ms),
victory/defeat ceremony.

### 3.2 Hero system

Each deck anchors to a **hero character** (the lead card's deity, chosen
in the deck editor): mascot portrait, 30 HP hero bar, and a **hero power**
(once per turn, 2 Ink) derived from the hero's pantheon + domain — e.g.
Olympian Bolt (deal 2), Nile Ward (restore 3), Seidr Veil (enemy −2 power
this turn). Hero powers use the same effect DSL as cards, so the engine
stays the single rules authority.

### 3.3 Accounts & collection (server)

- Identity = the existing **Sponsor Sandbox account**
  (`provisionTenantAccount` + bearer sessions) — no second auth system.
- Tables (Postgres via operational.js):
  `game_profiles (account_id, ink, rank_tier, rank_points, xp, stats)`,
  `game_cards (account_id, card_id, variant, source, acquired_at)`,
  `game_battles (account_id, deck_json, result, created_at)`,
  `game_quests (account_id, quest_id, progress, completed_at)`,
  `game_unlocks (account_id, source, ref_id, card_id, created_at)` —
  idempotency keys for merch/sponsor/patron grants.
- localStorage collection migrates to server on first login; guests play
  fully offline and can claim later (email claim).

### 3.4 The integration loop

- **Merch → cards:** store webhook fulfillment (existing) →
  `game_unlocks` + `game_cards` insert for the buyer's account
  (provisioned by email). Product's temple determines the card; merch
  grants the **Relic edition** (alt frame, +1 Ink-cost cosmetic aura —
  cosmetic, not power).
- **Sponsor → cards:** booking go-live → **Patron's Seal foil** of the
  temple, delivered to the sponsor's sandbox inbox.
- **Patron → cards:** patron activation → signature edition by tier.
- **Game → business:** the quest engine (weekly pantheon quests, rank
  milestones) mints codes through the **discount engine** itself
  (temple-scoped, `max_uses: 1`, personal) — e.g. "Win 5 with a Greek
  deck" → 25% off any Greek frame; "Reach Gold" → a patron trial week.
  Codes surface in the sandbox's discount tab.

### 3.5 Scale

Millions of users without websockets: **asynchronous ghost battles** —
you fight AI piloting other players' submitted decks (deterministic seed
recorded per battle; replays verifiable). Ranks from ghost win rate over
weekly seasons; leaderboards are plain SQL on `game_battles`. Battles run
client-side; the server only records signed result summaries (cheating is
cosmetic-only by design — stats are the canon, wins buy nothing but
cosmetics and discount codes with hard caps).

## 4. Phases

- **P1 — The Elite Battle** (this build): sequences engine, hero panels,
  hero powers, feel layer, mobile touch, autoplay + speed toggle.
- **P2 — Accounts & Collection:** game tables, sandbox-linked login,
  collection sync, inbox.
- **P3 — Integration loop:** merch unlocks, sponsor/patron editions,
  quest engine + discount minting.
- **P4 — Ladder & Seasons:** ghost battles, weekly pantheon seasons,
  leaderboards, seasonal reward foils.

## 5. Success measures

- First-battle completion rate (tutorial), D7 return rate, battles/user/week.
- Quest→code redemption rate; sponsor conversion from players vs. organic.
- Zero pay-to-win incidents: every competitive stat still computable from
  `game/cards.json` + the rules engine alone.
