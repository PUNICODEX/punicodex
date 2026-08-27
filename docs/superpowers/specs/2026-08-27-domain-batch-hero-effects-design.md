# Domain-Batch Flagship Hero Effects — Design

## Goal

Replace the 25 generic placeholder hero canvas effects for the newly owned-domain
flagship temples with truly bespoke, pantheon-specific animations that match the
quality of existing effects such as `baldr.js` and `loki.js`.

## Scope

25 temples in the recent domain batch:

- Greek: `omphalos`, `keraunos`, `helene`, `psyche`, `oidipous`, `pandora`, `kratos`, `theseus`
- Chinese: `sunwukong`, `kongzi`, `yuhuang`, `shangdi`, `caishen`
- Sanskrit/Hindu: `ravana`, `jagannatha`, `shakti`, `narasimha`
- Japanese: `susanoo`
- Nahuatl: `tonatiuh`
- Yoruba: `oduduwa`
- Norse: `angrboda`, `jord`
- Mesopotamian: `ereshkigal`
- Buddhist: `avalokiteshvara`, `bhaisajyaguru`

`iris` already has a bespoke effect and is out of scope.

## Technical constraints

- Files live at `templates/flagship/effects/{id}.js`.
- Each file is self-contained, vanilla 2D canvas, no new dependencies.
- Read primary/secondary colours from the canvas element's `data-primary` and
  `data-secondary` attributes with fallback hex values.
- Honour `prefers-reduced-motion: reduce` by rendering one static frame and
  skipping the animation loop.
- Keep files concise: ~60–140 lines.
- The canvas element id is `{id}-hero-canvas` and is already wired in
  `templates/flagship/effects/effects.json`.

## Visual concepts

### Greek

- `omphalos` — concentric stone rings pulse from the centre like the Delphic
  navel-stone; faint mist drifts over the rings.
- `keraunos` — branching lightning forks strike downward; charged ion particles
  shimmer after each flash.
- `helene` — warm torchlight glows and distant sea sparkles; subtle palace
  silhouette.
- `psyche` — butterfly-wing scales drift upward on warm currents.
- `oidipous` — a dusty Theban crossroads; a sphinx shadow passes; the road
  rhythm suggests a limping gait.
- `pandora` — a jar lid opens; motes of shadow and light escape and swirl.
- `kratos` — chains of power constrict and spark with crimson force.
- `theseus` — a labyrinth thread unwinds; the Minotaur's horned silhouette
  looms.

### Chinese

- `sunwukong` — the Ruyi Jingu Bang spins; cloud-walk particles and celestial
  ribbons trail behind.
- `kongzi` — bamboo scrolls unroll; ink-brush strokes fade in; apricot petals
  drift.
- `yuhuang` — jade palace gates; peach blossoms fall through celestial clouds.
- `shangdi` — Shang bronze taotie masks; oracle-bone crack patterns; ritual
  smoke rises.
- `caishen` — gold ingots and lucky coins float amid red silk streamers.

### Sanskrit / Hindu

- `ravana` — ten shadow heads; Lanka's golden towers; demon-fire embers.
- `jagannatha` — temple chariot wheels turn; lotus petals; saffron cloth waves.
- `shakti` — trident energy beams; kundalini spiral; lotus mandala pulse.
- `narasimha` — lion-claw slashes; mane flames; a pillar of light bursts.

### Japanese

- `susanoo` — storm clouds swirl; sea spray; the eight-forked serpent
  silhouette undulates.

### Nahuatl

- `tonatiuh` — Aztec sun-stone rays rotate; obsidian shards glint; sacrificial
  fire rises.

### Yoruba

- `oduduwa` — an Ifá divination chain swings; earth-origin dust rises; royal
  crown motifs glimmer.

### Norse

- `angrboda` — ironwood forest mist; wolf eyes in darkness; giantess runes.
- `jord` — deep roots and bedrock strata pulse with aurora-like earth
  currents.

### Mesopotamian

- `ereshkigal` — underworld gates; cuneiform glyphs burn cold; ghost-wind
  drifts.

### Buddhist

- `avalokiteshvara` — a thousand arms of light radiate; lotus throne; water-moon
  reflection.
- `bhaisajyaguru` — healing lapis light; medicine-bowl nectar drips; aurora
  balsam currents.

## Success criteria

1. All 25 placeholder files are replaced with distinct, pantheon-themed
   animations.
2. Each effect uses the temple's own primary/secondary colours.
3. `prefers-reduced-motion` is respected.
4. No new dependencies are introduced.
5. `npm test` continues to pass (hero-canvas regression tests are unaffected).
