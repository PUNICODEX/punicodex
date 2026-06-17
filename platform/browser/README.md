# PUNYCODEX Browser

A minimal Electron shell that uses PUNYCODEX as its default search engine.

## Run

```bash
npm install -D electron
npm run browser:dev
```

## Build

```bash
npm run browser:build
```

## Architecture

- `main.js` — Electron main process.
- `preload.js` — Safe bridge between renderer and Node.
- `renderer/` — Browser UI components reused from `platform/public/browser.html`.

## Packaging

The browser loads `platform/public/browser.html` in production. Ensure the
public assets are built before packaging.
