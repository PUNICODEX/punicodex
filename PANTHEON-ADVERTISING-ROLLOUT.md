# PANTHEON ADVERTISING ROLLOUT — 54 Entries

## What We're Building

Each of the 54 pantheon entries gets **one website** with this structure:

| Page | Content |
|------|---------|
| **Home** (`/`) | Endorsement hero + 13 advertising slots + booking modal + how-it-works |
| **Lore** (`/lore/`) | Existing temple content: name, pronunciation, symbols, myths, domains, related entries |
| **Gallery** (`/gallery/`) | Existing visual content: art, sculpture, coins, architecture |
| **Dashboard** (`/dashboard/`) | Advertiser analytics (impressions, clicks, creative upload) |

This is exactly what Nike and Hermes already have.

---

## The 54 Pantheon Entries

### Greek (28)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| apollon | Apóllōn | apóllōn.com, apollōn.com | Cloudflare |
| ares | Árēs | árēs.com | Cloudflare |
| artemis | Ártemis | ártemis.com | Cloudflare |
| aphrodite | Aphrodítē | aphrodítē.com | Cloudflare |
| athena | Athénā | athénā.com | Cloudflare |
| demeter | Dēmētēr | dēmētēr.com | Cloudflare |
| hera | Hēra | hēra.com | Cloudflare |
| hermes | Hermês | hermês.com, hermēs.com | Vercel |
| hestia | Hestía | hestía.com | Cloudflare |
| poseidon | Poseidôn | poseidôn.com | Cloudflare |
| persephone | Persephonē | persephonē.com | Cloudflare |
| prometheus | Promētheus | promētheus.com | Cloudflare |
| hekate | Hekátē | hekátē.com, hekatē.com | Cloudflare |
| hades | Hádēs | hádēs.com | Cloudflare |
| hephaistos | Hēphaistos | hēphaistos.com | Cloudflare |
| zeus | Zeús | zeús.com | Cloudflare |
| nike | Níkē | níkē.com, nikē.com, níkê.com | Cloudflare |
| atlas | Átlas | átlas.com | Cloudflare |
| ker | Kēr | kēr.com | Cloudflare |
| medousa | Médousa | médousa.com | Cloudflare |
| dionysos | Diónysos | diónysos.com | Vercel |
| gaia | Gaîa | gaîa.com | Vercel |
| chaos | Cháos | cháos.com | Vercel |
| tartaros | Tártaros | tártaros.com | Vercel |
| pontos | Póntos | póntos.com | Vercel |
| delphoi | Delphoí | delphoí.com | Vercel |
| olympos | Ólympos | ólympos.com | Vercel |
| sparte | Spártē | spártē.com | Vercel |
| helios | Hēlios | hēlios.com | Vercel |

### Norse (8)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| alfheimr | Álfheimr | álfheimr.com | Vercel |
| jotunheimr | Jötunheimr | jötunheimr.com | Vercel |
| midgardr | Miðgarðr | miðgarðr.com | Vercel |
| ragnarok | Ragnarǫk | ragnarǫk.com | Vercel |
| odinn | Óðinn | óðinn.com | Vercel |
| thor | Þórr | þórr.com | Vercel |
| helheimr | Helheimr | helheimr.com | Main (Vercel alias) |
| muspellheimr | Muspellheimr | muspellheimr.com | Main (Vercel alias) |

### Egyptian (6)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| ra | Rꜥ | rꜥ.com | Vercel |
| maat | Maat | maat.com | Vercel |
| maa | Maa | maa.com | Vercel |
| shu | Shu | shu.com | Vercel |
| ab | Ab | ab.com | Vercel |
| akh | Akh | akh.com | Vercel |

### Sanskrit (2)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| shiva | Śiva | śiva.com | Vercel |
| sia | Sia | sia.com | Vercel |

### Japanese (4)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| kyoto | Kyōto | kyōto.com | Vercel |
| osaka | Ōsaka | ōsaka.com | Vercel |
| kobe | Kōbe | kōbe.com | Vercel |
| athenai | Athēnai | athēnai.com | Vercel |

### Continental/Realms (6)
| Entry | Unicode | Domain(s) | Platform |
|-------|---------|-----------|----------|
| aigyptos | Aígyptos | aígyptos.com | Vercel |
| asia | Asía | asía.com | Vercel |
| europe | Eurṓpē | eurṓpē.com | Main (Vercel alias) |
| libye | Libye | libye.com | Vercel |

---

## Platform Limits

**Cloudflare Pages (punicodex@gmail.com):** 20 projects — MAXED OUT
- Cannot add more projects
- Existing 20 stay as-is

**Vercel (hekaverse):** Currently 32 individual projects + main project
- Room for more
- All new builds go here
- The 12 "continental/realm" entries are Vercel aliases on the main project

---

## Build Strategy

### Phase 1: Generator + Generic (1 week)
Build `scripts/generate-ad-sites.js` that:
1. Reads lexicon entry + existing temple HTML
2. Outputs advertising structure:
   - Home: endorsement hero + 13 generic slots + booking modal
   - Lore: existing content auto-migrated into new template
   - Gallery: existing images auto-migrated
   - Dashboard: shared template
3. Uses pantheon color palette from `PANTHEON_COLORS`
4. Uses simple CSS animation (no custom canvas)
5. Generates generic slot names (Frame I–XIII)

### Phase 2: Themed Slots (1 week)
Replace generic slot names with pantheon-themed pools:
- Greek → "Olympian Crown", "Delphic Column", "Titan Frame", etc.
- Norse → "Valhalla Banner", "Rune Stone", "Yggdrasil Branch", etc.
- Egyptian → "Scarab Badge", "Papyrus Strip", "Obelisk Column", etc.

### Phase 3: Custom Canvas (ongoing)
Hand-craft canvas animations for top-tier entries:
- Zeus: lightning, clouds, thunderbolts
- Apollon: sun rays, lyre strings, laurel leaves
- Athénā: owl feathers, olive branches, spear glints
- etc.

---

## Preserving Existing Content

The existing `sites/{id}/index.html` temple pages contain:
- Hero with Greek name
- Name cards (Original / ASCII / Unicode)
- Pronunciation guide
- Symbols section
- Myths timeline
- Related entries
- Footer with domains

All of this moves to `/lore/index.html` in the new structure.

The existing `sites/{id}/styles.css` and `script.js` become the **lore-only** styles/scripts.
The new `sites/{id}/styles.css` and `script.js` handle the **advertising** layout.

---

## Hermes Fix Applied

- Heading: `The Messenger of the Gods, Hermês` (Unicode, not Greek script)
- Meta descriptions: use `Hermês` not `Ἑρμῆς`
- Footer domains: `hermês.com · hermēs.com` (owned variants only)
