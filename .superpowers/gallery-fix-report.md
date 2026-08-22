# Gallery Fix Report — alias-based curation + quality pass

Date: 2026-08-22. Branch: master. Scope: `scripts/curate-gallery-images.js`,
`scripts/gallery-data.json`. No `npm run generate` / full battery run (per instructions).

## Root causes found

1. **Diacritic name search** — as briefed: Commons coverage lives under other
   spellings. Fixed via `ALIASES`.
2. **Short-name topicality gate** — `scorePage` only accepts aliases of ≥ 4
   squashed alphanumerics, so bare `Tyr` (3), `Om` (2), `Eos` (3), `Ma` (2) can
   never match. Fixed with multi-word aliases (`Tyr feeding`, `Om mani padme`,
   `Eos Memnon`, `goddess Maat`, …) that squash into real Commons titles.
3. **JUNK regex false positive** — the unbounded term `game` matched the
   substring "game" inside "Gilgamesh", scoring every Gilgamesh file −20.
   Fixed to `\bgames?\b`.
4. **No coverage** — genuinely thin figures; honest zero coverage kept (below).

## Newly curated (via aliases / MANUAL, this session)

| id | images | notes |
|---|---|---|
| om | 6 | Om mani padme hum mani-stone photos + tablet in 3 scripts + Hari Om calligraphy. Post-run swap: dropped an ashram building and a photo of a man named "Hari Om Dahiya". |
| tyr | 3 | PD manuscript illustrations (Louis Huard "Tyr feeding Fenrir", SÁM 66 78v, IB 299 4to). Thin but all genuine. |
| ma | 6 | Maat: Turin bronze statuette (CC0), KV15 winged Maat, Seti I relief (Florence), MET figure (CC0), KV17 relief. Dropped a "mountain of Goddess maat" landscape. |
| eos | 6 | Louvre Eos/Memnon (Douris, Diosphos Painter), Eos pursuing Tithonos, Etruscan mirror, Met Sappho-painter lekythos, MAHG abduction cup. Dropped a Tithonos-Painter warrior lekythos (matched the painter's name, not the subject) and a duplicate detail shot. |
| monokeros | 6 | MET Unicorn Tapestries (CC0) ×5 + Cluny "Mon seul désir" (La Dame à la licorne). |
| iuno | 6 | Hand-finished: script picked Rembrandt Juno but also 2 duplicate expo photos, 2 ships and the NASA spacecraft → replaced with MFA Boston statue, Juno Sospita, Rubens Juno and Argus, Juno Moneta denarius, Tiepolo Juno and Luna. |
| gilgamesh | 6 | Ashmolean Huwawa tablet, Dream Tablet, Sydney statue, Louvre "Hero mastering a lion" relief (AO19862), Sichulski painting, Gilgamesh+Lamassu statue. Dropped a Camden market bar photo. |
| hp | 6 | Nile-god Hapy only: Petrie slab, Hatshepsut relief, Philae cavern reliefs, Walters plaque, Neues Museum granite statue. Dropped 3 funerary/canopic "Hapy" figures (that Hapy is the Son of Horus — a different god). |
| athiratu | 5 | MANUAL list (search polluted by a ship named Asherah): Israel Museum Asherah + Judaean pillar figurines, Met pillar figurine, Penn Beit Shemesh heads, Revadim "Mother of Twins". |

## Quality pass on today's earlier bulk run

| id | verdict | action |
|---|---|---|
| iuppiter | 4/6 same-monument photos | Rebuilt: Jupiter Smyrna (Louvre), Jupiter Dolichenus (Louvre + KHM group + Tulln replica), Tempesta Ganymede print, Louvre-Lens Jupiter. |
| iason | 4/6 junk (1876 architectural drawings of a Swedish building "Iason") | Rebuilt: kept 2 Delos murals; added Waterhouse, Moreau, van Loo, de Troy Jason & Medea paintings. |
| argos | 6/6 junk — entry is Argos Panoptes (Hera's hundred-eyed watcher), gallery had modern Argos city, railway wagons, UK retail stores | Rebuilt: Velázquez/Rubens/Bloemaert/Jordaens/Loth Mercury & Argus + Munich Io-Argos vase. |
| midas | 5/6 good | Swapped Allan Stewart illustration (dubious PD tag on a contemporary illustrator) for PD "The Golden Touch" book illustration. |
| odysseus | all genuine | Kept as curated. |
| nezha | 2/6 junk (mall pavilion exterior; a person named Nezha Alaoui) | Rebuilt: kept Third Prince statue, Ping Sien Si deity, opera scene; added 3 temple statue photos (馬公靈蓮堂, 興仁懋靈殿, 赤崁龍德宮). |
| change | 6/6 junk (all Chang'e lunar-probe imagery) | Rebuilt: 6 art-historical Chang'e works (Tang Yin school, MET anonymous, Wu Youru, Summer Palace corridor panel, Vanderbilt sculpture). |
| houyi | 4/6 junk (Kaohsiung MRT "Houyi Station") | Kept Qing V&A figure + Yueyang Hou Yi statue; added 帝鉴图说 Houyi album leaf. Only 3 genuine depictions exist ≥ usable size — honest 3. |
| longwang | 6/6 junk (all Typhoon Longwang satellite images) | Rebuilt: Qunyi + Wangqu Dragon King temples, 龙王顶/龙王殿, 龙王塔 pagoda, dragon-king carving. |
| xiwangmu | all genuine | Kept as curated. |
| olodumare | 2/2 junk (novel cover of "Igbo Olodumare"; photo of a villager) | **Entry removed** — the supreme orisha has essentially no depiction coverage on Commons; honest absence. |

## Confirmed zero-coverage (aliases investigated, nothing genuine on Commons)

- **nirmata** (Sanskrit "creator" concept) — only an unrelated modern statue caption using Hindi "nirmata".
- **aer** (Greek air/mist concept), **pyr** (Greek fire concept), **he** (Greek
  feminine article / Orphic concept) — no depiction coverage exists; the
  task-suggested "Hebe" alias would be factually wrong for this entry.
- **mot** (Canaanite death god) — no depictions; search returns German "Muth" mines.
- **ameretat**, **haurvatat**, **ashavahista** (Amesha Spentas) — no
  figural tradition; "Khordad" matches are an Iranian missile system.
- **tvastr** — only matches are his son Trisiras or Io's Tvashtar volcano.
- **oba** — matches are the Ōba river in Japan; Benin "Oba" art is a different
  word (king title), not the orisha.
- **aganju** — only one modern Candomblé terreiro photo series (1 image after
  series dedupe, below the 2-image floor).

## Verification

- `node scripts/curate-gallery-images.js --only tyr,eos,gilgamesh,iuno,ma,hp,om,monokeros,athiratu`
  → 9 entries written.
- All touched entries: every `src` is `upload.wikimedia.org`, every caption
  carries a free-license credit (PD / CC0 / CC BY / CC BY-SA) — checked
  programmatically (0 bad).
- `node test/cards-gallery.test.js` — 5/5 pass. `node test/brand.test.js` — 29/29 pass.
- `node --test test/links.js` — pass (8,659 files scanned, 898,860 links, all valid).
