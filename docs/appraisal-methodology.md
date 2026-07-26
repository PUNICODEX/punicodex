# Appraisal Methodology — `appraise-3.0.0`

> How the PuniCodex appraisal engine (`platform/api/appraise.js`) estimates
> domain value, why every factor exists, and what the defensible output bands
> are. Supersedes `appraise-2.0.0`, whose ASCII-control anchor and brand
> scarcity table were removed — see "Why 3.0" below.

## Design principles

1. **Value derives from meaning and demand — never from brands.** The model
   reads the name's linguistic restoration, scholarly attestation,
   development depth, and real-world industry demand from the PuniCodex
   pattern graph. It holds no brand table, applies no brand multiplier, and
   contains no code path from a third-party trade mark to a price.
2. **No ASCII comparison for Unicode names.** Unicode names are valued from
   their own factors alone. No ASCII control value, folded-twin estimate, or
   share-of-control ratio is computed for them, so an appraisal can never be
   read as pricing by brand or ASCII adjacency. ASCII domains receive a
   direct estimate (that *is* the appraisal, not a comparison).
3. **Real market evidence over hype.** Latin-script IDN sales are sparse and
   modest. No public evidence supports five- or six-figure Latin IDN sales,
   so the model does not produce them.
4. **Verdict public, logic on request.** The default API response carries
   the verdict (value, range, confidence, liquidity, recommendation, safety,
   industry alignment, tenant revenue). The full factor breakdown — the
   algorithm itself — ships only under `?explain=1` and behind the page's
   "View the logic" button.
5. **Bounded stacking.** Multiplicative factors are individually capped and
   their product is capped (120×), so no combination of signals can explode.

## The Unicode model

```text
unicodeValue = IDN_BASE(.com $30, other TLDs lower)
             × lexiconAttestation      (3.0 when attested)
             × tier                    (dual 2.5 / 1: 2.0 / 2: 1.3)
             × flagshipDevelopment     (2.0 owned & operated temple)
             × attestationDepth        (≤1.5 by scholarly sources)
             × pantheonReach           (0.7 + weight×0.5)
             × industryDemand          (1 + min(0.35·primary + 0.08·resonant, 2.5))
             × canonicalForm           (owned 3 / ideal 2 / variant 1.5 / …)
             × availability            (1.1 when unregistered)
             [non-lexicon: length/noise penalties instead]
             (product capped at 120×)
             × tldIdnPenalty           (non-.com / non-IDN TLDs)
             × liquidityDiscount       (0.5, thin IDN resale market)
             hard-capped at $10,000 (IDN_VALUE_CEILING_USD)

totalValue = unicodeValue + tenantRevenueValue (12-month conservative
             booking capitalization of the temple's sponsorship inventory)

asciiValue (ASCII inputs only) = the pre-3.0 formula: BASE($50k) × length ×
             tldScore × lexicalQuality × pronounceability × semantic (≤5×,
             lexicon significance) × obscurity × liveBoost ×
             shortNamePremium, floored by scarcity tables.
```

## Industry demand (the 3.0 demand driver)

The pattern graph (`platform/api/industry-patterns.json`, generated from the
canonical industry map) records which real-world industries each temple's
meaning resonates with: 271 temples, 57 industries, primary (weight-2) and
resonant (weight-1) seats. The industries a name aligns with are its
end-user market — this is how "potential industries through the patterns
algorithm" enter the price. Demand from meaning, never from brands.

## Why 3.0 (the removed machinery)

`appraise-2.0.0` anchored every Unicode appraisal to an "ASCII control
value" ceiling and carried a `BRAND_SCARCITY_OVERRIDES` table (nike $2M,
apple $3M, …) that pumped brand-adjacent IDNs through a `brandCanonical`
multiplier. That design was both legally damaging (our own API published
that a temple's price derived from a third party's brand value — documentary
evidence a UDRP complainant could cite) and commercially backwards (it
capped crown-jewel restorations at a small fraction of an ASCII twin).
3.0 deletes the table, the multiplier, the ASCII ceiling, and every
brand-linked code path, and replaces the demand signal with the pattern
graph. Trademark proximity now appears only as *suppression of deceptive,
unrecognized lookalike forms* (`trademarkFactor` ≤ 0.5) — a buyer-protection
measure that can only lower a price, never raise one.

## The IDN liquidity reality (why bare-domain values stay low)

- The Latin-IDN aftermarket is **objectively thin**. Most Latin-script IDNs
  that trade at all do so in the **$10–$2,000** range.
- A canonical, owned, developed Unicode form of a famous name (e.g.
  `níkē.com`) is worth **low-to-mid four figures** for the bare domain,
  plus a separately reported tenant-revenue capitalization.
- Therefore `IDN_VALUE_CEILING_USD = $10,000` and the liquidity discount
  stays at 0.5. Inflated five-figure bare-IDN claims are not defensible.

## Calibration anchors (enforced by test/appraise.test.js)

| Input | Defensible band | Rationale |
|-------|-----------------|-----------|
| `zeus.com` | $50k–$500k | Short premium dictionary .com |
| `god.com` | $20k–$200k | Strong dictionary .com |
| `nike.com` | $10k–$500k | Same formula as any short dictionary .com — no brand table |
| `qxyjvkz.com` | ≤ $500 | Unpronounceable, no lexical value |
| `verylongrandomname12345.com` | < $100 | Long, digits, no meaning |
| `apóllōn.com` (owned IDN) | $500–$10k + tenant revenue | Premium owned IDN, thin-liquidity band |
| `apṓllōn.com` (variant) | below the owned form | Philologically real, not owned |
| `níkē.com` (strongest IDN) | $1k–$10k + tenant revenue | Meaning/demand stack only; brand-blind |
| unknown Unicode (`mýràndöm-ünïcödé.com`) | ≈ registration fee | No lexical or market signal |

## Output contract

Every appraisal returns: `appraisal.unicodeValue`, `totalValue`, `range`,
`confidence`, `liquidityRating`, `recommendation`, `tenantRevenueValue`,
`industryAlignment` (demand context: seat counts and top industries),
`lexiconMatch`, `safety` (homograph screen), and `model.version`. For ASCII
inputs it additionally returns `asciiControlValue` and the ratio fields; for
Unicode inputs those fields are `null` — there is no ASCII comparison.
`factors` (the full breakdown) and the model constants are returned only
when `?explain=1` is passed. The UI at `/appraise/` presents the verdict by
default and fetches the breakdown behind "View the logic".

## Known limits (honest)

- No true comparable-sales database exists for Latin IDNs; the ceiling and
  bands are judgment calls documented here, not fitted parameters.
- Tenant revenue uses a conservative 12-month booking capitalization at 10%
  occupancy.
- Industry demand reflects the pattern graph's coverage (271 temples);
  temples outside the graph get no demand multiplier either way.
