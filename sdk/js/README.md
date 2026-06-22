# @punycodex/authenticity-sdk

Browser-grade JavaScript SDK for the PÚNYCODEX Name Authenticity Shield.

## Install

```bash
npm install @punycodex/authenticity-sdk
```

## Quick start

```javascript
const { AuthenticitySDK } = require('@punycodex/authenticity-sdk');

const sdk = new AuthenticitySDK({
  apiBaseUrl: 'https://punycodex.com/api/v2',
  apiKey: 'your-api-key',
  offlineFirst: true,
});

const verdict = await sdk.check('аpple', 'term'); // Cyrillic а
console.log(verdict.verdict); // 'homograph-spoof'
console.log(sdk.decideAction(verdict)); // 'block' (default policy)
```

## Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiBaseUrl` | `string` | `https://punycodex.com/api/v2` | Base URL of the Authenticity API. |
| `apiKey` | `string` | `null` | Bearer token for authenticated endpoints. |
| `offlineFirst` | `boolean` | `false` | Run the pure-JS offline classifier for `term` checks before calling the API. |
| `policy` | `object` | see below | Decision policy for `decideAction`. |

## Policy

```javascript
sdk.configure({
  defaultAction: 'warn',
  severityActions: {
    none: 'allow',
    low: 'allow',
    medium: 'log',
    high: 'warn',
    critical: 'block',
  },
  allowlist: ['nike.com'],
  blocklist: ['evil-apple.com'],
});
```

Actions: `block`, `warn`, `log`, `allow`.

## API methods

- `sdk.check(input, type)` — Check a term, domain, or URL. If `offlineFirst` and `type === 'term'`, uses the offline classifier.
- `sdk.checkUrl(url)` — Convenience wrapper for URL checks.
- `sdk.report(input, type, comment)` — Submit a suspicious name for review.
- `sdk.decideAction(verdict, severity)` — Map a verdict to an action using the configured policy.

## Offline classifier

The offline classifier (`sdk/js/src/offline-classifier.js`) is browser-safe and requires no database. It imports only pure-JS platform modules:

- `platform/api/confusable-atlas.js`
- `platform/api/name-decomposer.js`
- `platform/api/glyph-renderer.js`

It ships with a lightweight brand identity list covering the top 10 most-spoofed brands.
