# PuniCodex Authenticity Extension v2

Manifest V3 browser extension that integrates the PuniCodex Authenticity Checker.

## Features

- Checks every tab URL against the Authenticity API.
- Blocks high/critical threats by redirecting to the interstitial page.
- Warns users with a dismissible top banner.
- Highlights suspicious links on the page.
- Manual name/domain/URL checker in the popup.
- Configurable policy, allowlist, blocklist, and API endpoint.

## Install (developer mode)

1. Open Chrome → `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension-v2/` folder.

## Build

To package for the Chrome Web Store:

```bash
cd extension-v2
zip -r punicodex-authenticity-v2.zip \
  manifest.json background/ content/ popup/ options/ shared/ icons/
```

## Files

- `manifest.json` — Manifest V3 configuration.
- `background/background.js` — Service worker that checks tab URLs and caches results for 5 minutes.
- `content/content.js` + `content.css` — Page link highlighting and warning banners.
- `popup/popup.*` — Toolbar popup UI.
- `options/options.*` — Extension settings page.
- `shared/storage.js` — `chrome.storage.sync` wrapper.
