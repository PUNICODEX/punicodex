# The Open Unicode Web Protocol (OUWP) v1

## Abstract

The Open Unicode Web Protocol (OUWP) defines a decentralized index and
attribution layer for the Unicode web: domain names, pages, and resources
encoded in non-ASCII Unicode scripts. It enables search engines, browsers,
registrars, and cultural institutions to share verified Unicode-web metadata
while preserving provenance, licensing, and scholarly attribution.

## Status

Version 1.0 — Draft. Maintained by the PUNYCODEX project.

## 1. Scope

OUWP addresses four problems:

1. **Discovery** — How to find punycode (`xn--`) domains and Unicode front URLs.
2. **Verification** — How to prove a domain serves Unicode-related content.
3. **Attribution** — How to credit lexicons, scholars, and source catalogs.
4. **Interoperability** — How to exchange entries between search engines.

## 2. Data Model

### 2.1 Unicode Web Record

A record represents one Unicode-aware web property.

```json
{
  "recordId": "sha256(domain+":"+punycode)",
  "domain": "zeús.com",
  "punycode": "xn--zes-fma.com",
  "ascii": "zeus",
  "unicode": "Zeús",
  "script": "Greek",
  "canonicalEntry": {
    "id": "zeus",
    "source": "https://punycodex.com/api/v1/names/zeus"
  },
  "verifiedAt": "2026-06-17T00:00:00Z",
  "verificationMethod": "dns-txt",
  "contentSnapshot": {
    "title": "Zeús — Greek Sky Father",
    "url": "https://xn--zeus-fma.com/",
    "fetchedAt": "2026-06-17T00:00:00Z"
  },
  "license": "CC BY 4.0",
  "attribution": ["PUNYCODEX", "LSJ"]
}
```

### 2.2 Verification Methods

| Method | Mechanism | Trust Level |
|--------|-----------|-------------|
| `dns-txt` | `_ouwp.example.com TXT` record | High |
| `well-known` | `/.well-known/ouwp.json` | High |
| `backlink` | Link from canonical entry page | Medium |
| `manual` | Curator review | Medium |

### 2.3 DNS TXT Record Format

```
_ouwp.example.com. IN TXT "v=OUWP1; id=zeus; verify=https://punycodex.com/api/v1/names/zeus"
```

## 3. API Exchange Format

Partners exchange records via `application/json` over HTTPS.

### 3.1 Submit Record

```http
POST /api/partners/records
Authorization: Bearer <partner-key>
Content-Type: application/json

{ /* Unicode Web Record */ }
```

### 3.2 Query Records

```http
GET /api/partners/records?q=zeus&script=Greek&limit=20
```

Response envelope:

```json
{
  "records": [ /* ... */ ],
  "total": 1,
  "limit": 20,
  "offset": 0,
  "attribution": "Data © PUNYCODEX contributors, CC BY 4.0"
}
```

## 4. Attribution & Licensing

Every record MUST carry:

- `license` — SPDX identifier or URL.
- `attribution` — Human-readable list of sources.
- `canonicalEntry` — Link back to the authoritative scholarly record.

Aggregators MUST display attribution and MUST NOT remove canonical links.

## 5. Security

- Only `https://` sources are valid for verification.
- Private IP ranges and localhost are rejected.
- Records are content-hash deduplicated.
- Partners authenticate via scoped API keys.

## 6. Extensions

Future versions may add:

- Multimodal embeddings for glyph/shape search.
- On-chain notarization of verification events.
- Federated gossip between partner nodes.

## 7. References

- PUNYCODEX API docs: https://punycodex.com/api/v1/docs
- IDNA2008: https://unicode.org/reports/tr46/
- RFC 5891: Internationalized Domain Names in Applications
