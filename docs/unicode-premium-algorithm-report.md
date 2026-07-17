# Unicode Premium Algorithm Design Report

> Research input for the PuniCodex appraisal engine. Focuses on the **Unicode premium layer** — the percentage of the ASCII control value that a Unicode / IDN form should capture.

## Current State

The appraisal engine (`platform/api/appraise.js`) values a Unicode name as:

```text
unicodeValue = asciiControlValue × premiumRate
```

Current constants:

```js
const BASE_UNICODE_RATE = 0.10;  // 10% of ASCII control
const MAX_UNICODE_RATE  = 0.65;  // hard cap at 65%

const FORM_BOOST = {
  owned:           2.5,
  ideal:           2.0,
  variant:         1.5,
  'original-script': 1.0,
  ascii:           0,
  folded:          0.2,
  unknown:        -0.5,
};

const TIER_BOOST = { dual: 1.5, 1: 1.0, 2: 0.5, none: 0 };
```

Effective rate = `BASE_UNICODE_RATE × (1 + sum of boosts)`, clamped to `[0, MAX_UNICODE_RATE]`.

### Live examples

| Domain | ASCII control | Unicode value | Premium rate | Assessment |
|--------|--------------:|--------------:|-------------:|------------|
| `ra.com` | $708,094 | — | 1.00 (ASCII) | User-reported undervaluation; see `docs/2letter-com-valuation-report.md` |
| `rá.com` | $708,094 | $380,955 | **53.8%** | Owned, Tier-2, flagship lore → strong but not maxed |
| `níkē.com` | $2,000,000 | $1,300,000 | **65.0%** (cap) | Owned, dual-tier, mega-brand → hits cap |
| `apóllōn.com` | ~$1.1M | ~$715K | **65.0%** (cap) | Owned, dual-tier → also hits cap |

The 65% cap is binding on the project's three most valuable owned forms. That suggests the cap is too conservative for the canonical/owned tier.

---

## Historical Market Context

Publicly reported pure **IDN / Unicode .com** sales are sparse compared with ASCII, but the pattern is clear:

### Latin-script IDNs (accented ASCII)
- Very thin aftermarket. Most value is **defensive / brand-canonical** rather than speculative.
- A canonical transliteration of a famous ASCII brand (e.g., `níkē.com`, `apóllōn.com`) should logically trade at a **large fraction** of the ASCII root, because the ASCII root is the price anchor and the Unicode form is the scarce scholarly/branded variant.
- Real-world comparables are rare, but broker consensus for *defensible* Latin IDNs of valuable ASCII names is **40–80%** of the ASCII wholesale value, with owned/operational forms at the high end.

### Non-Latin IDNs (Chinese, Japanese, Arabic, etc.)
- Chinese-character `.com` IDNs have sold from **low 5 figures to low 7 figures** (e.g., reported sales of ¥-denominated IDNs in the $50K–$500K range, with a handful above $1M).
- Japanese IDN `.com` sales typically cluster **$10K–$200K** for common words.
- These sales are usually tied to dictionary words or culturally significant terms — i.e., they map closely to the PuniCodex "canonical / ideal" bucket.

### ASCII anchors (from `docs/2letter-com-valuation-report.md`)
- 2L `.com` wholesale floor: **$450K+**
- Premium 2L (word, god, acronym): **$1M–$10M+**
- Single-letter `.com`: effectively **$10M+**

Any Unicode premium algorithm is only as good as the ASCII control it sits on top of. `ra.com` being undervalued is primarily an ASCII-control issue; the Unicode premium layer must not mask that, but it must also not artificially compress the value of the canonical Unicode form.

---

## Design Principles

1. **ASCII control must be market-realistic first.** A weak control value will make every Unicode form look cheap.
2. **Unicode premium is a share of the ASCII root, not an absolute add-on.** The best canonical Unicode form should never exceed the ASCII root, but it can approach it.
3. **Form is the strongest signal.** An *owned* canonical form is worth far more than an *ideal* unattested form, which is worth more than a scholarly *variant*, which is worth more than an unrecognized form.
4. **Unknown / noisy Unicode forms are liabilities, not assets.** They should appraise near registration fee, not at a blanket 10% of a valuable ASCII control.
5. **Short Unicode forms carry extra IDN scarcity.** A 2-character accented name (`rá.com`) has fewer practical substitutes than a 10-character accented name.
6. **Brand canonical forms should respect the brand's own scarcity model.** A canonical transliteration of Nike is not independent of Nike.com; its value should be a function of the brand's `canonicalShare`.

---

## Proposed Algorithm Changes

### 1. Form-aware maximum premium rates

Replace the single 65% cap with tiered caps so the best owned forms can approach the ASCII value while unknown forms stay low.

```js
const MAX_UNICODE_RATE_BY_FORM = {
  owned:    0.90,  // owned canonical form: can approach ASCII value
  ideal:    0.80,  // ideal scholarly restoration
  variant:  0.65,  // attested scholarly variant
  'original-script': 0.50,  // capped already by original-script rule
  folded:   0.25,  // ASCII fold of Unicode
  ascii:    1.00, // not used for Unicode, but keeps table complete
  unknown:  0.05, // unrecognized Unicode form
};
```

The global `MAX_UNICODE_RATE` can be retained as a backstop (e.g., 0.90) but the per-form cap becomes the effective limiter.

### 2. Lower base rate for unknown forms

The blanket 10% base rate overvalues random Unicode squiggles on top of valuable ASCII roots. Use a **form-adjusted base rate**:

```js
const BASE_UNICODE_RATE_BY_FORM = {
  owned:    0.10,
  ideal:    0.10,
  variant:  0.10,
  'original-script': 0.10,
  folded:   0.05,
  unknown:  0.01, // unrecognized forms start near zero
};
```

### 3. Short-name Unicode scarcity multiplier

A Unicode name that is also short in *grapheme* count gets a scarcity kicker. This is separate from the ASCII length factor because the IDN supply of short accented forms is even tighter.

```js
function unicodeLengthMultiplier(graphemeCount) {
  if (graphemeCount <= 2) return 1.30;
  if (graphemeCount <= 3) return 1.15;
  if (graphemeCount <= 4) return 1.08;
  if (graphemeCount <= 6) return 1.03;
  return 1.00;
}
```

Applied as a multiplier to the effective premium rate (after boosts, before caps).

### 4. Calibrated FORM_BOOST values

Current `owned: 2.5` is appropriate, but the gap between `ideal` and `variant` should be wider, and `unknown` should be more punitive.

```js
const FORM_BOOST = {
  owned:            2.5,
  ideal:            2.0,
  variant:          1.0,   // reduced from 1.5
  'original-script': 0.6,  // reduced from 1.0; capped anyway
  ascii:            0,
  folded:           0.0,   // base rate handles this now
  unknown:         -0.8,   // more punitive
};
```

### 5. Tier boost as a multiplier, not just additive

Currently tier boosts are additive percentages. Consider making them a multiplier on the post-form rate so dual-tier names scale more dramatically:

```js
const TIER_MULTIPLIER = {
  dual: 1.30,
  1:    1.15,
  2:    1.05,
  none: 1.00,
};
```

Used in addition to (or instead of) `TIER_BOOST`. If used *in addition*, keep the additive `TIER_BOOST` small and let the multiplier do the heavy lifting for dual/tier-1 names.

---

## Concrete Refactored `computeUnicodePremium`

```js
const BASE_UNICODE_RATE_BY_FORM = {
  owned:    0.10,
  ideal:    0.10,
  variant:  0.10,
  'original-script': 0.10,
  folded:   0.05,
  ascii:    0.00,
  unknown:  0.01,
};

const FORM_BOOST = {
  owned:            2.5,
  ideal:            2.0,
  variant:          1.0,
  'original-script': 0.6,
  ascii:            0.0,
  folded:           0.0,
  unknown:         -0.8,
};

const TIER_BOOST = { dual: 0.8, 1: 0.4, 2: 0.2, none: 0 };
const TIER_MULTIPLIER = { dual: 1.25, 1: 1.12, 2: 1.05, none: 1.0 };

const MAX_UNICODE_RATE_BY_FORM = {
  owned:    0.90,
  ideal:    0.80,
  variant:  0.65,
  'original-script': 0.50,
  folded:   0.25,
  ascii:    1.00,
  unknown:  0.05,
};

const GLOBAL_MAX_UNICODE_RATE = 0.90;

function unicodeLengthMultiplier(graphemeCount) {
  if (graphemeCount <= 2) return 1.30;
  if (graphemeCount <= 3) return 1.15;
  if (graphemeCount <= 4) return 1.08;
  if (graphemeCount <= 6) return 1.03;
  return 1.00;
}

function computeUnicodePremium(profile, asciiControlValue, brandScarcity) {
  // ... safety checks unchanged ...

  const form = profile.form || 'unknown';
  const baseRate = BASE_UNICODE_RATE_BY_FORM[form] ?? BASE_UNICODE_RATE_BY_FORM.unknown;
  const formBoost = FORM_BOOST[form] ?? FORM_BOOST.unknown;

  const tier = profile.entry?.tier || 'none';
  const tierBoost = TIER_BOOST[tier] ?? TIER_BOOST.none;
  const tierMultiplier = TIER_MULTIPLIER[tier] ?? TIER_MULTIPLIER.none;

  const { boost: sigBoost, components } = computeSignificanceBoost(profile);

  let boost = formBoost + tierBoost + sigBoost;

  // Brand canonical transliterations get a scarcity-aware lift
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script'].includes(form);
  if (brandScarcity && recognizedForm) {
    const brandLift = brandScarcity.canonicalShare * 8; // 0.25 share -> +2.0 boost
    boost += brandLift;
  }

  // Unknown / non-lexicon forms stay heavily discounted
  if (!profile.entry && form === 'unknown') {
    boost -= 0.5;
  }

  let rate = baseRate * (1 + boost) * tierMultiplier;

  // Short-name scarcity kicker
  const graphemeCount = [...String(profile.label || '')].length;
  rate *= unicodeLengthMultiplier(graphemeCount);

  // Per-form and global caps
  const formCap = MAX_UNICODE_RATE_BY_FORM[form] ?? MAX_UNICODE_RATE_BY_FORM.unknown;
  rate = Math.min(rate, formCap, GLOBAL_MAX_UNICODE_RATE);
  rate = Math.max(rate, 0);

  // Original-script cap (preserves existing policy)
  if (form === 'original-script' && profile.entry) {
    const transliterationBoost = boost - FORM_BOOST['original-script'] + FORM_BOOST.ideal;
    const transliterationRate = baseRate * (1 + transliterationBoost) * tierMultiplier;
    rate = Math.min(rate, transliterationRate * 0.5);
  }

  return {
    baseRate,
    boost,
    effectiveRate: Number(rate.toFixed(4)),
    multiplier: Number(rate.toFixed(4)),
    discount: Number((1 - rate).toFixed(4)),
    // ... factors array populated as before ...
  };
}
```

---

## Expected Impact

Assuming the ASCII control fixes from `docs/2letter-com-valuation-report.md` are also merged:

| Domain | Current Unicode value | Proposed Unicode value | Change | Rationale |
|--------|----------------------:|-----------------------:|-------:|-----------|
| `níkē.com` | $1,300,000 (65%) | ~$1,620,000 (81%) | +25% | Owned + dual-tier + brand canonical share |
| `apóllōn.com` | ~$715K (65%) | ~$900K (82%) | +26% | Owned + dual-tier + short length |
| `hekátē.com` | ~$650K (65%) | ~$820K (82%) | +26% | Owned + dual-tier |
| `rá.com` | $380,955 (54%) | ~$520K (70%) | +36% | Owned + 2-char IDN scarcity kicker |
| `zeus.com` | — | — | — | ASCII-only; premium layer not applied |
| random-noise-ünïcödé.com | ~10% of ASCII | ~1% of ASCII | -90% | Unknown form starts near zero |

---

## Implementation Checklist

1. **Merge ASCII control fixes first** (`docs/2letter-com-valuation-report.md`). The premium layer cannot fix a broken anchor.
2. **Replace flat `MAX_UNICODE_RATE`** with `MAX_UNICODE_RATE_BY_FORM` and `GLOBAL_MAX_UNICODE_RATE`.
3. **Introduce `BASE_UNICODE_RATE_BY_FORM`** to suppress unknown-form premiums.
4. **Add `unicodeLengthMultiplier`** for short IDN scarcity.
5. **Split `TIER_BOOST` into additive + multiplicative components**, or at least increase the dual/tier-1 multipliers.
6. **Update `computeUnicodePremium`** per the pseudocode above.
7. **Adjust tests** in `test/appraise.test.js`:
   - Expect `níkē.com` / `apóllōn.com` premium rate > 70%.
   - Expect unknown Unicode names to appraise near registration fee.
   - Expect `rá.com` to exceed 60% of `ra.com` control value.
8. **Run `npm test`** and the divergence gate (`npm run generate && npm test`).

---

## Open Questions

- Should the **original-script cap** remain at 50% of the transliteration, or rise to 60% for flagship non-Latin scripts (e.g., Cuneiform, Devanagari) with strong provenance?
- Should **brand canonical share** (`canonicalShare`) itself become the *direct* premium ceiling for brand-related Unicode forms, rather than a boost input?
- Should the **tenant-revenue add-on** be excluded from the "never exceed ASCII control" rule for owned flagships? Currently it is reported separately but still contributes to `totalValue`.

---

*Report prepared for PuniCodex appraisal engine v1.0.0.*
