# Domain-Batch Flagship Hero Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 25 generic placeholder hero canvas effects for the domain-batch flagship temples with bespoke, pantheon-specific animations.

**Architecture:** Each temple gets a self-contained `templates/flagship/effects/{id}.js` file that targets its `{id}-hero-canvas` element, reads temple colours from `data-primary`/`data-secondary`, and draws a unique animation using only the 2D canvas API. Files follow the established style of `baldr.js` and `loki.js` (helper functions for colour parsing, resize handling, reduced-motion guard).

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D. No new dependencies.

## Global Constraints

- Files live at `templates/flagship/effects/{id}.js`.
- Canvas id is `{id}-hero-canvas`.
- Read primary/secondary colours from `data-primary` / `data-secondary` with fallback hex values.
- Honour `prefers-reduced-motion: reduce` by drawing one static frame and skipping `requestAnimationFrame`.
- No new dependencies.
- Keep files ~60–140 lines.

---

### Task 1: Greek hero effects

**Files:**
- Modify: `templates/flagship/effects/omphalos.js`
- Modify: `templates/flagship/effects/keraunos.js`
- Modify: `templates/flagship/effects/helene.js`
- Modify: `templates/flagship/effects/psyche.js`
- Modify: `templates/flagship/effects/oidipous.js`
- Modify: `templates/flagship/effects/pandora.js`
- Modify: `templates/flagship/effects/kratos.js`
- Modify: `templates/flagship/effects/theseus.js`

**Interfaces:**
- Consumes: existing `effects.json` registry entry (already maps `{id}` → `{id}-hero-canvas`).
- Produces: self-contained IIFE canvas animations.

- [ ] **Step 1: Replace `omphalos.js`**
  Concentric stone rings pulse from the centre; faint mist drifts over them.

- [ ] **Step 2: Replace `keraunos.js`**
  Branching lightning forks strike downward; charged ion particles shimmer after each flash.

- [ ] **Step 3: Replace `helene.js`**
  Warm torchlight glows and distant sea sparkles; subtle palace silhouette.

- [ ] **Step 4: Replace `psyche.js`**
  Butterfly-wing scales drift upward on warm currents.

- [ ] **Step 5: Replace `oidipous.js`**
  Dusty Theban crossroads; sphinx shadow passes; road rhythm suggests a limping gait.

- [ ] **Step 6: Replace `pandora.js`**
  Jar lid opens; motes of shadow and light escape and swirl.

- [ ] **Step 7: Replace `kratos.js`**
  Chains of power constrict and spark with crimson force.

- [ ] **Step 8: Replace `theseus.js`**
  Labyrinth thread unwinds; Minotaur horned silhouette looms.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 2: Chinese hero effects

**Files:**
- Modify: `templates/flagship/effects/sunwukong.js`
- Modify: `templates/flagship/effects/kongzi.js`
- Modify: `templates/flagship/effects/yuhuang.js`
- Modify: `templates/flagship/effects/shangdi.js`
- Modify: `templates/flagship/effects/caishen.js`

- [ ] **Step 1: Replace `sunwukong.js`**
  Golden staff spins; cloud-walk particles; celestial ribbons.

- [ ] **Step 2: Replace `kongzi.js`**
  Bamboo scrolls unroll; ink-brush strokes; apricot petals drift.

- [ ] **Step 3: Replace `yuhuang.js`**
  Jade palace gates; peach blossoms fall through celestial clouds.

- [ ] **Step 4: Replace `shangdi.js`**
  Shang bronze taotie masks; oracle-bone crack patterns; ritual smoke.

- [ ] **Step 5: Replace `caishen.js`**
  Gold ingots and lucky coins float amid red silk streamers.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 3: Sanskrit / Hindu hero effects

**Files:**
- Modify: `templates/flagship/effects/ravana.js`
- Modify: `templates/flagship/effects/jagannatha.js`
- Modify: `templates/flagship/effects/shakti.js`
- Modify: `templates/flagship/effects/narasimha.js`

- [ ] **Step 1: Replace `ravana.js`**
  Ten shadow heads; Lanka's golden towers; demon-fire embers.

- [ ] **Step 2: Replace `jagannatha.js`**
  Temple chariot wheels turn; lotus petals; saffron cloth waves.

- [ ] **Step 3: Replace `shakti.js`**
  Trident energy beams; kundalini spiral; lotus mandala pulse.

- [ ] **Step 4: Replace `narasimha.js`**
  Lion-claw slashes; mane flames; pillar of light burst.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 4: Japanese, Nahuatl, Yoruba hero effects

**Files:**
- Modify: `templates/flagship/effects/susanoo.js`
- Modify: `templates/flagship/effects/tonatiuh.js`
- Modify: `templates/flagship/effects/oduduwa.js`

- [ ] **Step 1: Replace `susanoo.js`**
  Storm clouds swirl; sea spray; eight-forked serpent silhouette undulates.

- [ ] **Step 2: Replace `tonatiuh.js`**
  Aztec sun-stone rays rotate; obsidian shards glint; sacrificial fire rises.

- [ ] **Step 3: Replace `oduduwa.js`**
  Ifá divination chain swings; earth-origin dust rises; royal crown motifs.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 5: Norse and Mesopotamian hero effects

**Files:**
- Modify: `templates/flagship/effects/angrboda.js`
- Modify: `templates/flagship/effects/jord.js`
- Modify: `templates/flagship/effects/ereshkigal.js`

- [ ] **Step 1: Replace `angrboda.js`**
  Ironwood forest mist; wolf eyes in darkness; giantess runes.

- [ ] **Step 2: Replace `jord.js`**
  Deep roots and bedrock strata pulse with aurora-like earth currents.

- [ ] **Step 3: Replace `ereshkigal.js`**
  Underworld gates; cuneiform glyphs burn cold; ghost-wind drifts.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 6: Buddhist hero effects

**Files:**
- Modify: `templates/flagship/effects/avalokiteshvara.js`
- Modify: `templates/flagship/effects/bhaisajyaguru.js`

- [ ] **Step 1: Replace `avalokiteshvara.js`**
  Thousand arms of light radiate; lotus throne; water-moon reflection.

- [ ] **Step 2: Replace `bhaisajyaguru.js`**
  Healing lapis light; medicine-bowl nectar drips; aurora balsam currents.

**Verification:**
Run `node -c templates/flagship/effects/{id}.js` for each file.

---

### Task 7: Regenerate and verify

**Files:**
- Generated: `sites/{id}/index.html` and related flagship pages.

- [ ] **Step 1: Run generate**
  `npm run generate`

- [ ] **Step 2: Run flywheel validator**
  `node scripts/validate-flywheel.js`
  Expected: pass (with existing warnings).

- [ ] **Step 3: Run hero-canvas regression tests**
  `npm test`
  Expected: all hero-canvas related tests pass.

---

## Self-review

- **Spec coverage:** every design concept maps to a task and step.
- **Placeholder scan:** no TODO/TBD.
- **Type consistency:** each file is an IIFE targeting its own canvas id; no cross-file interfaces.
