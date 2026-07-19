# Appraisal Methodology — `appraise-2.0.0`

> How the PuniCodex appraisal engine (`platform/api/appraise.js`) estimates
> domain value, why every factor exists, and what the defensible output bands
> are. Supersedes `unicode-premium-algorithm-report.md` (the pre-2.0 model,
> kept for history).

## Design principles

1. **An IDN is never worth more than its ASCII counterpart.** The ASCII
   control value is the ceiling for every Unicode appraisal.
2. **Real market evidence over hype.** Latin-script IDN sales are sparse and
   modest. No public evidence supports five- or six-figure Latin IDN sales,
   so the model does not produce them.
3. **Show the work.** Every appraisal returns a per-factor breakdown, a
   range (not a point), a confidence level, and a liquidity rating.
4. **Bounded stacking.** Multiplicative factors are individually capped and
   their product is capped (120×), so no combination of signals can explode.

## The two-layer model

```text
asciiControlValue = BASE($50k for a perfect 4–5L .com)
                  × lengthFactor            (1.0 → 0.1 by label length)
                  × tldScore                (.com 1.0, weak TLDs much lower)
                  × lexicalQualityFactor    (hyphens, digits, charset)
                  × pronounceabilityFactor  (1.0 / 0.5 / 0.1 / 0.05)
                  × semanticMultiplier      (≤ 5×, lexicon significance only)
                  × brandRiskFactor         (0.12–1.0 trademark proximity)
                  × obscurityDiscount       (unknown long-tail names)
                  × liveBoost               (developed site evidence)
                  × shortNamePremium        (1L/2L/3L .com scarcity, ≤ 5×)
              floored by intrinsicAsciiFloor (1–6 char .com scarcity table)
              floored by REGISTRATION_FEE_USD
              capped by tldMaxValue
              capped at $500 when unpronounceable AND lexically unknown

unicodeValue = asciiControlValue × premiumRate
  premiumRate starts at IDN_BASE_VALUE_USD-equivalent and is multiplied by
  form (owned/ideal/variant), tier (dual/1/2), and brand-canonical signals
  (each bounded), their product capped at 120×. unicodeValue is hard-capped
  at $10,000 absent verifiable market comps.

totalValue = unicodeValue + tenantRevenueValue (12-month conservative
             booking capitalization for developed flagship temples)
```

## The IDN liquidity reality (why Unicode values are low)

This is the deliberate, defensible center of the model:

- The Latin-IDN aftermarket is **objectively thin**. Most Latin-script IDNs
  that trade at all do so in the **$10–$2,000** range.
- Premium cases — a canonical, owned, developed Unicode form of a famous
  name (e.g. `níkē.com`) — are worth **low-to-mid four figures**, supported
  by brand-defensive demand and tenant revenue, not by speculative comps.
- Therefore `IDN_VALUE_CEILING_USD = $10,000` and typical premium rates are
  a small single-digit percentage of the ASCII control. The pre-2.0 model's
  40–65% premium rates ($500K–$1.3M for Unicode forms) had no verifiable
  market basis and were removed.

## Pronounceability (added 2026-07-19)

A `.com` is an aftermarket asset only if a buyer can say it. Random
consonant piles (`qxyjvkz.com`) have no end-user market:

- Diacritics are folded first (ý→y), then non-letters stripped.
- Acronyms (≤3 chars) are exempt — the scarcity market prices letters, not
  pronounceability (`qx.com`, `x.com`).
- 4-consonant cluster → ×0.5; 5+ run or vowel-less → ×0.1 / ×0.05; and
  unpronounceable names with no lexical backing are capped at $500.

## Calibration anchors (enforced by test/appraise.test.js)

| Input | Defensible band | Rationale |
|-------|-----------------|-----------|
| `zeus.com` | $50k–$500k | Short premium dictionary .com; real market trades at this level |
| `god.com` | $20k–$200k | Strong dictionary .com |
| `hermes.com` | market-comp override | Verified comparable |
| `qxyjvkz.com` | ≤ $500 | Unpronounceable, no lexical value |
| `verylongrandomname12345.com` | < $100 | Long, digits, no meaning |
| `apóllōn.com` (owned IDN) | $500–$10k + tenant revenue | Premium owned IDN, thin-liquidity band |
| `apṓllōn.com` (variant) | ~half the owned form | Philologically real, not owned |
| `níkē.com` (strongest IDN) | $3k–$10k | Approaches but never exceeds the ceiling |
| unknown Unicode (`mýràndöm-ünïcödé.com`) | ≈ registration fee | No lexical or market signal |

## Output contract

Every appraisal returns: `asciiControlValue`, `unicodeValue`, `totalValue`,
`range { low, high }`, `confidence` (0.3–0.8), `liquidityRating`,
`recommendation`, `factors` (named, with impact + note), `safety`
(homograph screen), and `model.version`. The UI at `/appraise/` presents
the range, the factor breakdown, and a disclaimer that these are
algorithmic estimates, not offers or financial advice.

## Known limits (honest)

- No true comparable-sales database exists for Latin IDNs; the ceiling and
  bands are judgment calls documented here, not fitted parameters.
- `a.com`-class hypotheticals ($10M+) are theoretical anchors, not offers.
- Tenant revenue uses a conservative 12-month booking capitalization.
