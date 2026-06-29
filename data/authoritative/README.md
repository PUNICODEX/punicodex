# `data/authoritative/` — Scholarly Import Workspace

This directory is the staging ground for pulling in **publicly available
authoritative datasets** and turning them into human-reviewed suggestions for
the PÚNYCODEX canonical sources.

It is part of the **Monolithic Flywheel Evolution** plan. Canonical sources
still live at:

- `type/js/lexicon.js`
- `type/js/original-scripts.js`
- `type/js/source-catalog.js`
- `js/archetypes-v2.js`
- `platform/db/owned-domains.json`
- `scripts/lore-catalog.json`

Nothing in this workspace is allowed to mutate those files automatically.
All changes arrive as **suggestions** that must be reviewed and applied with
`scripts/apply-suggestions.js`.

## Directory layout

```
data/authoritative/
├── README.md                 # This file
├── corpus/                   # Long-lived curated corpora (e.g. IAST index)
├── snapshots/                # Raw responses downloaded from external APIs
│   └── {source}/{runId}.json
├── staging/
│   └── suggestions/          # Normalized suggestion batches produced by importers
│       └── {source}/{runId}.json
└── importers/                # One module per external source
    └── {source}.js
```

## Workflow

### Single-source run

1. **Run an importer**
   ```bash
   node scripts/import-runner.js {source} [--run-id {id}] [--args ...]
   ```
   - Downloads raw snapshot if the source is online.
   - Runs the importer module from `data/authoritative/importers/{source}.js`.
   - Writes suggestions to `data/authoritative/staging/suggestions/{source}/{runId}.json`.

2. **Inspect suggestions**
   ```bash
   node scripts/import-runner.js {source} --dry-run
   ```
   - Loads the latest suggestion batch and prints a summary without touching
     canonical sources.

### Multi-source orchestrated run

The orchestrator runs all importers, merges suggestions by **authority tier**, and
flags same-tier conflicts for manual review:

```bash
node scripts/import-orchestrator.js [--run-id {id}]
```

- Tier order is defined in `data/authoritative/source-tiers.json` (lower rank =
  more authoritative).
- Higher-tier suggestions override lower-tier suggestions for the same
  `id:field`.
- Same-tier conflicts are written to
  `data/authoritative/staging/merged/{runId}-conflicts.json`.

3. **Apply reviewed suggestions**
   ```bash
   node scripts/apply-suggestions.js data/authoritative/staging/merged/{runId}.json
   ```
   - Applies the approved suggestions to canonical sources.
   - Records provenance on every changed object.
   - Refuses to apply suggestions that conflict with `ACCURACY.md` or the
     existing tier system.
   - Skips suggestions whose `confidence` is below the auto-apply threshold
     (`0.5`).

4. **Regenerate derived artifacts**
   ```bash
   npm run generate
   npm test
   ```

## Suggestion schema

A suggestion batch is a JSON object with these top-level fields:

```json
{
  "source": "wikidata",
  "runId": "2026-06-26T10-00-00Z",
  "retrievedAt": "2026-06-26T10:00:00Z",
  "license": "CC0",
  "url": "https://www.wikidata.org/wiki/Special:EntityData/Q101609.json",
  "suggestions": [
    {
      "id": "zeus",
      "field": "meaning",
      "value": "sky and thunder god",
      "confidence": 0.92,
      "provenance": {
        "source": "wikidata",
        "recordId": "Q101609",
        "retrievedAt": "2026-06-26T10:00:00Z",
        "url": "https://www.wikidata.org/wiki/Special:EntityData/Q101609.json",
        "license": "CC0"
      },
      "note": "English description from Wikidata entity"
    }
  ]
}
```

Supported suggestion types (so far):

| `field`         | Description |
|-----------------|-------------|
| `meaning`       | Update the `meaning` field of a lexicon entry |
| `greek`         | Update the `greek` original-script field |
| `originalScript`| Update `type/js/original-scripts.js` mapping |
| `sourceCatalog` | Add or update a source catalog entry |
| `etymology`     | Add or replace an `etymology` object |
| `variant`       | Add a scholarly variant with required `sources` |
| `lore`          | Add or update a lore-catalog section |

Importers may define additional `field` values; `apply-suggestions.js` must be
updated to understand them before they can be applied.

## Importer module contract

Each file in `data/authoritative/importers/{source}.js` must export:

```js
module.exports = {
  name: 'Wikidata',
  source: 'wikidata',
  defaultLicense: 'CC0',
  requiresOnline: true,
  async run({ lexicon, sourceCatalog, args, fetch, writeSnapshot, readSnapshot }) {
    // Return { suggestions[], snapshot?: object|Buffer }
  }
};
```

- `requiresOnline: true` means the runner will fetch a fresh snapshot.
- `requiresOnline: false` means the importer works from an existing snapshot or
corpus file.

## Source authority tiers

`data/authoritative/source-tiers.json` groups importers by authority:

| Tier | Rank | Sources |
|------|------|---------|
| primary-lexicon | 1 | `perseus-greek`, `cologne-sanskrit`, `etcsL-sumerian`, `psd-akkadian`, `rundata-norse`, `faulkner-egyptian`, `allen-egyptian` |
| scholarly-corpus | 2 | `ctext-chinese`, `celt-irish`, `gretil-sanskrit`, `skaldic-norse` |
| general-knowledge | 3 | `wikidata` |

## Current importers

| Source | Status | Scope |
|--------|--------|-------|
| `wikidata` | active | Entity IDs, English descriptions, native-script labels |
| `perseus-greek` | active | Greek lemmata and LSJ definitions for Greek entries |
| `cologne-sanskrit` | active | Monier-Williams headwords, glosses, and Devanagari |
| `etcsL-sumerian` | stub | No online source configured |
| `psd-akkadian` | stub | No online source configured |
| `rundata-norse` | stub | No online source configured |
| `faulkner-egyptian` | stub | No online source configured |
| `allen-egyptian` | stub | No online source configured |
| `ctext-chinese` | stub | No online source configured |
| `celt-irish` | stub | No online source configured |
| `gretil-sanskrit` | stub | No online source configured |
| `skaldic-norse` | stub | No online source configured |

Planned future importers:

- `cdli` — Sumerian/Akkadian sign forms and catalogue links.

## License notes

Every importer must record the license of the upstream data. The PÚNYCODEX
dataset is released under **CC BY 4.0** (see `LICENSE`). Upstream data that is
more restrictive than CC BY 4.0 must be flagged in the suggestion batch and
reviewed before inclusion.
