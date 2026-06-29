# 2-Letter `.com` Historical Valuation Report

> Research input for the PÚNYCODEX appraisal engine. Prices below are publicly reported or widely cited wholesale/retail estimates; exact transaction data for domain-only sales is often private.

## Executive Summary

Two-letter `.com` domains are the scarcest broadly liquid asset class in the domain aftermarket. Only **676** combinations exist (26 × 26), and most are already held by corporations, investors, or projects. This means the floor value of *any* clean 2L `.com` is far higher than the model’s current $250,000 floor, and premium pairs (words, gods, common acronyms) trade at multiples of that floor.

## Historical Sales & Price Ranges

### Single-letter `.com` (1L)
- **Supply:** 26 total. Effectively unavailable — most are reserved or held by major corporations.
- **Value range:** **$10,000,000 – $100,000,000+** if a clean 1L ever came to market.
- **Notable references:**
  - `X.com` — associated with Twitter/X transaction; not a pure domain sale, but illustrates 1L strategic value.
  - `Z.com`, `Q.com`, `O.com` — corporate-held; considered effectively priceless.

### Two-letter `.com` (2L)
- **Supply:** 676 total.
- **Wholesale floor (random pair):** **$300,000 – $500,000**.
- **Decent pair (one vowel / common ending):** **$500,000 – $1,000,000**.
- **Premium pair (word, god, common acronym):** **$1,000,000 – $10,000,000+**.
- **Reported/estimated notable sales:**
  - `FB.com` — ~$8.5M (Facebook, 2010)
  - `WE.com` — ~$8M (reported)
  - `JD.com` — ~$5M (reported, bundled with business assets)
  - `MI.com` — ~$3.6M (Xiaomi, 2014)
  - `IG.com` — ~$1.8M – $2M
  - `NG.com` — ~$1.5M – $2M
  - `QX.com` — ~$1M
  - `YB.com` — ~$1.2M
  - `RP.com` — ~$1M+
  - `HG.com` — ~$800K – $1M
  - `PX.com` — ~$700K+
  - `DJ.com` — ~$500K+

### Nearby benchmarks for context
- **3-letter `.com` (3L):** floor ~$15K – $50K; premium ~$100K – $500K.
- **4-letter `.com` (4L):** random ~$100 – $500; premium dictionary/word ~$10K – $100K.

## Implications for the PÚNYCODEX Algorithm

### Current issue
The engine currently applies an `intrinsicAsciiFloor` of **$250,000** for 2L `.com`, but **only when the name is already in the lexicon**. Unknown clean 2L names like `qx.com` fall back to the formula and appraise near the $50,000 `BASE_REFERENCE_VALUE`. Both cases understate true market value.

### What should change
1. **Universal short-name floor.** The scarcity floor should apply to *all* clean 1–6 character `.com` domains, not just lexicon entries.
2. **Raise 2L floor.** Move the base 2L `.com` floor to **$450,000**, aligning with current wholesale floors.
3. **Quality-adjust 2L pairs.** Within the 2L class, distinguish random consonant pairs from vowel-adjacent or repeated-letter pairs.
4. **Raise 1L floor.** Single-letter `.com` should carry a multi-million-dollar floor (recommended **$10,000,000**) to reflect effective unavailability.
5. **Calibrate 3L–6L floors.** Bring them closer to aftermarket reality so the curve is continuous.

## Recommended Constants / Formula

### Updated scarcity floor table

```js
const SCARCITY_FLOORS_USD = {
  com: {
    1: 10_000_000, // 26 exist; effectively unavailable
    2: 450_000,    // 676 exist; wholesale floor
    3: 35_000,
    4: 10_000,
    5: 3_000,
    6: 1_000,
  },
};
```

### 2L quality scoring

```js
const TWO_L_VOWELS = new Set('aeiou');
const TWO_L_COMMON_ENDS = new Set('rstln');

function twoLetterQualityScore(name) {
  const [a, b] = [...String(name || '').toLowerCase()];
  if (!a || !b) return { score: 1.0, label: 'standard' };

  const hasVowel = TWO_L_VOWELS.has(a) || TWO_L_VOWELS.has(b);
  const commonEnd = TWO_L_COMMON_ENDS.has(b);
  const repeated = a === b;

  if (repeated) return { score: 1.5, label: 'repeated-letter' };
  if (hasVowel && commonEnd) return { score: 1.35, label: 'vowel+common-end' };
  if (hasVowel) return { score: 1.2, label: 'vowel-adjacent' };
  if (commonEnd) return { score: 1.1, label: 'common-end' };
  return { score: 0.9, label: 'consonant-pair' };
}
```

### Revised `intrinsicAsciiFloor` pseudocode

```js
function intrinsicAsciiFloor(name, tld) {
  if (tld !== 'com') return 0;
  const len = [...String(name || '')].length;
  const base = SCARCITY_FLOORS_USD.com[len];
  if (!base) return 0;

  if (len === 2) {
    const quality = twoLetterQualityScore(name);
    return Math.round(base * quality.score);
  }
  return base;
}
```

## Expected Impact

| Domain | Current ASCII control | Proposed ASCII control | Rationale |
|--------|----------------------|------------------------|-----------|
| `x.com` | $50,000 | $10,000,000+ | 1L scarcity |
| `qx.com` | $50,000 | ~$405,000 | Base 2L floor × consonant-pair quality |
| `ra.com` | $708,094 | $708,094+ | Formula already exceeds floor; no regression |
| `aa.com` | $250,000 floor | ~$675,000 | Repeated-letter premium |
| `ai.com` | $50,000 | ~$540,000 | Vowel-adjacent 2L premium |

## Refined ASCII Control Valuation (Implemented)

The initial floor-only fix correctly raised the wholesale minimums, but user feedback showed that **premium, meaningful short pairs still traded above the formula-driven value**. `ra.com` (Egyptian sun god + globally recognized acronym + premium `R-A` letters) was a clear example: the floor anchored it at ~$540K, while the formula produced ~$708K, but comparable premium 2L pairs trade well above $1M.

### What was added

1. **Short-name scarcity multiplier** applied to the formula-driven ASCII value for 1–3 character `.com` names, before the floor is enforced.
2. **Premium bigram set** for common acronyms and culturally significant short forms (`ra`, `re`, `ai`, `om`, `it`, `go`, etc.).
3. **Meaning boost** when the short name exists in the PÚNYCODEX lexicon (dictionary word, deity, place, etc.).
4. **Caps** to prevent runaway values: max 4× for 2L names, 5× for 1L names.

### New constants / functions

```js
const PREMIUM_BIGRAMS = new Set([
  'ai', 'ar', 'as', 'at', 'be', 'by', 'cd', 'co', 'do', 'ea', 'et', 'ev', 'go', 'he',
  'hr', 'if', 'in', 'io', 'is', 'it', 'iv', 'me', 'my', 'no', 'of', 'om', 'on', 'or',
  'os', 'ox', 'pc', 'pr', 'ra', 're', 'so', 'ta', 'to', 'tv', 'up', 'us', 'vr', 'we',
]);

function shortNamePremiumMultiplier(label, tld, entry) {
  if (tld !== 'com') return { multiplier: 1.0, note: null, pattern: null };
  const clean = String(label || '').toLowerCase();
  const len = [...clean].length;

  if (len === 1) {
    return { multiplier: 5.0, note: '1L .com extreme scarcity', pattern: '1L' };
  }

  if (len === 2) {
    const quality = twoLetterQualityScore(clean);
    const bigramBoost = PREMIUM_BIGRAMS.has(clean) ? 1.5 : 1.0;
    const meaningBoost = entry ? 1.3 : 1.0;
    const multiplier = Math.min(4.0, Math.max(0.8, quality.score * bigramBoost * meaningBoost));
    return {
      multiplier,
      note: `2L .com scarcity (${quality.label})`,
      pattern: '2L',
    };
  }

  if (len === 3) {
    return { multiplier: 1.2, note: '3L .com scarcity', pattern: '3L' };
  }

  return { multiplier: 1.0, note: null, pattern: null };
}
```

The multiplier is folded into `estimateAsciiValue` alongside the existing length, quality, significance, and fame factors.

### Updated impact

| Domain | Prior ASCII control | Refined ASCII control | Rationale |
|--------|---------------------|-----------------------|-----------|
| `ra.com` | ~$708,000 | **~$1,657,000** | Premium bigram + lexicon meaning + 2L scarcity multiplier |
| `qx.com` | ~$405,000 | ~$405,000 | Consonant-pair floor; no premium bigram |
| `aa.com` | ~$675,000 | ~$675,000 | Repeated-letter floor |
| `ai.com` | ~$540,000 | ~$540,000 | Premium bigram floor |
| `om.com` | $3,680,000 | $3,680,000 | Market-comp override preserved |

### Validation

- `ra.com` now appraises above $1M, addressing the reported undervaluation.
- Random pairs (`qx.com`) still hit the ~$400K wholesale floor.
- Single-letter names (`x.com`) remain at the $10M scarcity floor.
- All existing appraisal tests pass.

## Implementation Status

All changes have been applied to `platform/api/appraise.js` and covered by new tests in `test/appraise.test.js`:

- `SCARCITY_FLOORS_USD`, `twoLetterQualityScore`, and `intrinsicAsciiFloor` updated.
- `shortNamePremiumMultiplier` added and folded into `estimateAsciiValue`.
- `.com` `maxValue` raised to $10,000,000 so 1L scarcity floors are not capped.
- Added tests for 2L floor, 1L floor, 2L quality adjustment, and `ra.com` non-regression.
- Full test suite passes (`npm test`).

## Next Steps

1. Consider curated `MARKET_COMP_OVERRIDES` entries only for verifiable public 2L sales (e.g., `fb`, `ig`, `mi`).
2. Monitor user feedback on whether the 1L $10M floor and 2L premium multiplier feel realistic.
3. Re-run `npm run generate && npm test` if any canonical source is edited later.

---

*Report prepared for PÚNYCODEX appraisal engine v1.0.0.*
