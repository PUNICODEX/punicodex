# Flagship Batch Promotion Plan

## Global Constraints
- All changes must pass `npm run generate` and `npm test` before commit.
- `type/js/lexicon.js` is canonical; never edit generated copies by hand.
- `js/archetypes-v2.js` is canonical for flagship archetypes; `scripts/set-rental-tiers.js` shows the rental-tier grade sets.
- `scripts/lore-catalog.json` is canonical for lore; merge `.superpowers/lore/{id}.json` entries under a single top-level key.
- `templates/flagship/effects/effects.json` registers bespoke hero effects; effect files live in `templates/flagship/effects/{id}.js`.
- `scripts/gallery-data.json` requires ≥2 images per flagship or an `_honestZero` exemption.
- `type/js/industry-patterns.js` requires ≥3 seats per flagship (`id` appears in the seat array).
- Domain-less flagships use `domainless: true` in archetypes and "watched for release" wording for domains.
- Do not edit `AGENTS.md` unless conventions change.

## Task 1 — Integrate wave-5 and wave-6 domain-less flagships into the flywheel

Wave-5 ids (14): deirdre, manawydan, math, matholwch, medb, midir, myrddin, nanna, niamh, niflheimr, nisien, ogma, pryderi, ratatoskr.
Wave-6 ids (14): reginn, sif, sigyn, sindri, skuld, sleipnir, suttungr, syn, taliesin, ullr, uppsala, vanaheimr, wyrd, yggdrasill.

Steps:
1. Verify `.superpowers/lore/{id}.json` exists for all 28 ids. For wave-6 only, merge these single-key JSON files into `scripts/lore-catalog.json` preserving valid JSON (wave-5 already merged).
2. Copy mascot/logomark/logolockup PNG assets from `ascii batch 24-08-26/punycodex/` to `sites/{id}/assets/` for wave-6 ids; convert PNG to WebP using `sharp` or the project's existing image converter.
3. Run `node scripts/promote-to-flagship.js {id} --domainless --skip-generate --skip-validate` for all 28 ids (wave-5 re-run and wave-6 first run). The script preserves existing archetype blocks.
4. Inject `rentalTier` into `js/archetypes-v2.js` for all 28 ids. Use the grade sets from `scripts/set-rental-tiers.js` as a starting point; for ids not in those sets, default to "A" unless the entry is a top-tier globally recognizable name (e.g., yggdrasill -> "S"). Ensure no duplicate rentalTier lines.
5. Add ≥3 industry-pattern seats for each of the 28 ids in `type/js/industry-patterns.js`. Avoid apostrophes in `why:` strings. Verify the validator regex (`['"]${id}['"]`) counts them.
6. Register bespoke hero effects for wave-5 and wave-6 in `templates/flagship/effects/effects.json` by adding `{ id: "{id}", file: "{id}.js" }` entries. Effect JS files already exist (wave-5 in `.superpowers/effects/`? check; wave-6 agents wrote `templates/flagship/effects/{id}.js`).
7. Curate galleries: run `node scripts/curate-gallery-images.js --only {ids}` or a batch script. For any id with zero genuine Commons coverage, add it to `_honestZero` in `scripts/gallery-data.json`.
8. Run `node scripts/generate-scholars-manifests.js` after all scholars content is in place.
9. Run `npm run generate` once.
10. Run `node scripts/validate-flywheel.js` and fix any failures.
11. Run `npm test` and fix any failures except pre-existing Printful 401s.

Deliverables: all 28 domain-less flagships pass `validate-flywheel.js` completeness and `npm test`.

## Task 2 — Promote 25 owned-domain flagships

Ids/domains: omphalós.com, keraunós.com, sūnwùkōng.com, susanō.com, helénē.com, psychḗ.com, oidípous.com, kǒngzǐ.com, îris.com, rāvaṇa.com, pandōra.com, yùhuáng.com, krátos.com, tōnatiuh.com, odùduwà.com, angrboða.com, shàngdì.com, jagannātha.com, śakti.com, jǫrð.com, thēseus.com, cáishén.com, narasiṃha.com, ereškigal.com, avalokiteśvara.com, bhaiṣajyaguru.com.

Steps:
1. For domains whose lexicon id differs from the Unicode form (e.g., iris -> îris primary domain), update `platform/db/owned-domains.json` and the archetype's domain set using `node scripts/add-owned-domain.js <id> <domain>`.
2. Add new lexicon entries for ids not yet present (e.g., omphalos, keraunos, sunwukong, susanoo, helene, psyche, oidipous, kongzi, iris-upgrade, ravana, pandora, yuhuang, kratos, tonatiuh, oduduwa, angrboda, shangdi, jagannatha, shakti, jord, theseus, caishen, narasimha, ereshkigal, avalokiteshvara, bhaisajyaguru) following ACCURACY.md, with correct pantheon, tier, pronunciation, original script, etc.
3. Promote each to flagship with `node scripts/promote-to-flagship.js <id> --domain <domain>`.
4. Generate lore, scholars, blog, effects, patterns, galleries for each (or use the same generation pipeline).
5. Run `npm run generate` and `npm test`.

## Task 3 — Add /artifacts/ tab

1. Introduce `entryType: 'artifact'` for artifact entries in the lexicon.
2. Add an artifacts tab to flagship temples where entryType is artifact.
3. Generate an `/artifacts/` index page similar to `/realms/`.
4. Update flywheel validators and tests if needed.

## Task 4 — Add realm cards for new realm flagships

1. In hand-maintained `realms/index.html`, add cards for realm-class new flagships: uppsala, vanaheimr, niflheimr, ginnungagap, annwn.
2. Ensure canonical links and imagery.

## Task 5 — Final verification and commit

1. Run `npm run generate:check` (divergence gate).
2. Run `npm test`.
3. Commit all changes with a descriptive message.
4. Push to origin/master (ask user first if not already approved).
