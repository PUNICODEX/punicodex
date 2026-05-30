# PUNYCODEX Browser — Electron MVP Implementation Plan

## Vision

A native desktop browser where Unicode domains are first-class citizens. The address bar renders scholarly Unicode names natively (never punycode for lexicon-verified domains), integrates PUNYCODEX search directly, and surfaces domain intelligence (tier badges, character breakdowns, variant spellings, pantheon metadata) inline.

**Strategic thesis:** Mainstream browsers treat IDN as a security risk and display punycode. A PUNYCODEX browser makes Unicode domains feel native, creating the distribution channel that makes the entire PUNYCODEX ecosystem inevitable.

---

## Architecture

```
platform/browser/
├── package.json              # Electron deps + start scripts
├── main.js                   # Electron main process
├── preload.js                # Secure IPC bridge
├── renderer/
│   ├── index.html            # Browser chrome shell
│   ├── browser.css           # Chrome UI styling
│   ├── browser.js            # Renderer orchestrator
│   ├── omnibox.js            # Address bar + search dropdown
│   ├── sidebar.js            # Domain intelligence panel
│   ├── webview-manager.js    # <webview> tag lifecycle
│   └── punycode-util.js      # Unicode ↔ punycode helpers
```

**Why Electron:** Fastest path to a working native browser. Chromium underneath = full web compatibility. Can pivot to Tauri later for size reduction.

---

## Dependencies

```json
{
  "name": "punycodex-browser",
  "version": "0.1.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev"
  },
  "devDependencies": {
    "electron": "^30.0.0"
  },
  "dependencies": {
    "punycode": "^2.3.1"
  }
}
```

Install with: `cd platform/browser && npm install`

---

## Core Features (MVP)

### 1. Browser Window Chrome

- **Frameless/custom** Electron window with titlebar integrating omnibox
- Dark theme matching PUNYCODEX design system (`#0a0a0f` bg, `#c9a96e` accent)
- Tab bar (simplified — just one tab for MVP, multi-tab in v2)
- Window controls (close/minimize/maximize) on right

**Window spec:**
- Min size: 900×600
- Default: 1200×800
- Frame: false (custom titlebar)
- TitleBarStyle: hidden

### 2. Omnibox (Address Bar)

The crown jewel. Replaces the traditional address bar with a PUNYCODEX-first search interface.

**Behavior matrix:**

| Input | Action |
|-------|--------|
| `https?://...` | Navigate directly |
| `xn--...` (punycode) | Convert to Unicode, show in bar, navigate |
| `.com` / `.net` / `.org` suffix present | Treat as URL, navigate |
| Lexicon-verified Unicode name | Show green checkmark, navigate |
| Everything else | Query PUNYCODEX `/api/search`, show dropdown |

**Dropdown UI:**
- PUNYCODEX results first (max 5), grouped by tier
  - Each result shows: Unicode name, Greek original, tier badge, pantheon, meaning snippet
  - "Live Site" indicator if indexed
  - Clicking navigates to the domain
- Web search fallback: "Search DuckDuckGo for: {query}"
- Keyboard navigation: ↑/↓ to select, Enter to go, Esc to close

**Unicode rendering rule:**
```
IF domain is in PUNYCODEX lexicon:
  address_bar.display = entry.unicode + ".com"
  show green checkmark + tier badge
ELSE IF domain contains non-ASCII:
  address_bar.display = punycode  // security fallback
  show gray warning icon
ELSE:
  address_bar.display = plain ASCII
```

### 3. WebView Manager

Use Electron's `<webview>` tag for page rendering (not BrowserView — simpler, supports inline devtools, easier DOM access from renderer).

**Events to handle:**
- `did-start-loading` → show loading indicator
- `did-stop-loading` → hide loading indicator, update address bar
- `did-navigate` → extract URL, check lexicon, update omnibox
- `page-title-updated` → update window title
- `new-window` → open in new webview (MVP: same webview)

**Security:**
- `allowpopups: false`
- `nodeintegration: false`
- `contextisolation: true` (via preload)
- `webSecurity: true`

### 4. Domain Intelligence Sidebar

Collapsible right panel (300px wide, toggle button in toolbar) that activates when the current page's domain matches a lexicon entry.

**Panel contents:**
```
┌─ Domain Intelligence ───────────┐
│ 🥇 Dual-Tier  greek             │
│                                 │
│  Apóllōn.com                    │
│  Ἀπόλλων                        │
│                                 │
│  Meaning: Possibly 'destroyer'  │
│  Domain: Light, Music, Prophecy │
│                                 │
│  Character Breakdown            │
│  a → A     same                 │
│  p → p     same                 │
│  o → ó     stress               │
│  l → l     same                 │
│  l → l     same                 │
│  o → ō     length               │
│  n → n     same                 │
│                                 │
│  Variants (2)                   │
│  • Ápollōn.com                  │
│  • apollon.com                  │
│                                 │
│  Sources: LSJ, Beekes           │
│                                 │
│  [ Visit Entry Page ]           │
└─────────────────────────────────┘
```

**API call:** `GET /api/entry/{id}` — same data model as entry.html

### 5. Variant Navigator

When visiting a Unicode domain that has accepted spelling variants in the lexicon, show a subtle banner:

> "This name has 3 accepted scholarly spellings: **Apóllōn** · Ápollōn · Apollo"

Clicking a variant navigates to that domain. This educates users that Unicode domains are not singular — there are valid alternatives.

### 6. Lexicon Shield / Trust Indicator

Three-state trust system in the address bar:

| State | Icon | Meaning |
|-------|------|---------|
| ✅ Green | Scholarly verified | In PUNYCODEX lexicon |
| ⚠️ Gray | Unknown Unicode | Non-ASCII, not in lexicon |
| — None | ASCII plain | Standard ASCII domain |

Green domains get Unicode display. Gray domains display punycode (same as Chrome's security model, but we add the lexicon layer).

---

## API Contracts

The browser calls the existing PUNYCODEX server at `http://localhost:3456`.

### `GET /api/search?q={query}&limit=5`
Returns search results. Browser uses this for omnibox dropdown.

### `GET /api/entry/{id}`
Returns full entry data. Browser uses this for sidebar panel.

### `GET /api/stats`
Returns platform stats. Browser shows in about/settings page.

### `GET /api/health`
Heartbeat check. Browser uses to detect if local server is running.

**Server discovery:** The browser should try localhost:3456 first. If unavailable, show a "Start PUNYCODEX Server" button that runs `npm run platform` from the project root.

---

## File-by-File Implementation Spec

### `main.js` — Main Process

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,           // Custom titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true      // Enable <webview>
    }
  });

  mainWindow.loadFile('renderer/index.html');
  
  // Dev tools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// IPC handlers for renderer → main communication
ipcMain.handle('navigate', (event, url) => {
  // URL validation, punycode detection, etc.
});
```

### `preload.js` — Secure Bridge

Exposes only safe APIs to the renderer:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('punycodex', {
  // Navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // Platform API proxy (avoids CORS issues)
  apiGet: (endpoint) => ipcRenderer.invoke('api-get', endpoint),
});
```

### `renderer/index.html` — Chrome Shell

Structure:
```html
<div class="browser-chrome">
  <!-- Titlebar / Drag region -->
  <div class="titlebar">
    <div class="window-controls">⋯</div>
    
    <!-- Omnibox container -->
    <div class="omnibox-container">
      <div class="trust-icon"></div>
      <input type="text" class="omnibox" placeholder="Search PUNYCODEX or enter address…">
      <div class="omnibox-dropdown"></div>
    </div>
    
    <!-- Toolbar buttons -->
    <button class="toolbar-btn sidebar-toggle">☰</button>
  </div>
  
  <!-- Content area -->
  <div class="content-area">
    <webview class="page-webview" src="about:blank"></webview>
    
    <!-- Domain intelligence sidebar -->
    <aside class="domain-sidebar collapsed">
      <div class="sidebar-content"></div>
    </aside>
  </div>
  
  <!-- Variant banner -->
  <div class="variant-banner hidden"></div>
</div>
```

### `renderer/omnibox.js` — Omnibox Logic

Key functions:
- `normalizeInput(input)` → determines if URL, punycode, or search query
- `searchPunycodex(query)` → fetches `/api/search?q={query}&limit=5`
- `renderDropdown(results)` → builds HTML for dropdown
- `onEnter(url)` → navigates webview
- `updateDisplay(url)` → converts punycode→Unicode if lexicon-verified

### `renderer/sidebar.js` — Domain Intelligence

Key functions:
- `detectLexiconEntry(url)` → extracts domain, checks against lexicon
- `loadEntry(id)` → fetches `/api/entry/{id}`
- `renderSidebar(entry)` → builds panel HTML
- `renderVariants(entry)` → finds other entries with same ASCII

### `renderer/webview-manager.js` — WebView Lifecycle

Key functions:
- `navigate(url)` → sets webview src
- `handleDidNavigate(url)` → triggers omnibox update + sidebar detection
- `getCurrentUrl()` → reads webview.getURL()

### `renderer/punycode-util.js` — Helpers

```javascript
// Uses node's punycode module (available via webpack or direct require in preload)
function toUnicode(punycodeDomain) { ... }
function toPunycode(unicodeDomain) { ... }
function isPunycode(str) { return str.startsWith('xn--'); }
```

---

## Security Model

| Layer | Rule |
|-------|------|
| Main process | Never loads remote content. Only local files. |
| Preload | Exposes minimal IPC surface. No node APIs. |
| Renderer | No nodeIntegration. Context isolation ON. |
| WebView | `nodeintegration=no`, `allowpopups=no`. Sandboxed. |
| Navigation | Main process validates all URLs before webview loads. Block file://, chrome://, etc. |

**Address bar spoofing protection:** The browser chrome (omnibox, trust icons) is drawn by Electron's trusted renderer process, not the web page. Impossible for a malicious site to spoof the address bar (unlike web browsers where this is a persistent attack vector).

---

## Design System

Reuse PUNYCODEX colors exactly:
```css
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --surface-2: #1a1a26;
  --text: #e8e6f0;
  --text-dim: #8a87a0;
  --accent: #c9a96e;
  --border: #2a2a3a;
  --tier-dual: #c9a96e;
  --tier-1: #7ec9a0;
  --tier-2: #87aee8;
}
```

Font: `Segoe UI, system-ui, sans-serif` (Windows-native, clean)
Omnibox font: monospace for domains, sans-serif for search text

---

## Build & Run

```bash
# From project root
cd platform/browser
npm install
electron .              # Run browser

# In another terminal (from project root)
npm run platform        # Start search engine backend
```

**Packaging (future):**
```bash
npm install --save-dev @electron-forge/cli
npx electron-forge make   # Builds .exe, .dmg, .AppImage
```

---

## MVP Scope Decisions

**IN MVP:**
- Single window, single webview
- Omnibox with PUNYCODEX search + dropdown
- Domain intelligence sidebar
- Variant navigator banner
- Trust indicator (green/gray/none)
- Native Unicode display for verified domains
- Basic navigation (back/forward/reload)
- Custom titlebar with window controls

**OUT OF MVP (v2):**
- Multiple tabs (use BrowserView or webview switching)
- Bookmarks
- History
- Downloads manager
- Settings/preferences panel
- DevTools integration
- Auto-update
- Cross-platform packaging (.dmg, .deb)
- Tauri rewrite for smaller binary

---

## Integration with Existing Codebase

The browser lives entirely in `platform/browser/`. It does NOT modify:
- `platform/server.js`
- `platform/api/`
- `platform/db/`
- `type/js/lexicon.js`

It only **consumes** the existing API. Zero breaking changes.

The browser's `package.json` is separate from the root `package.json`. No dependency conflicts.

---

## Known Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| `<webview>` is deprecated-ish | It's still supported. If removed, switch to `BrowserView` |
| Punycode→Unicode conversion | Use Node's built-in `url.domainToUnicode()` in main process |
| CORS when calling localhost:3456 | Preload script proxies API calls through IPC (bypasses CORS) |
| Address bar focus + dropdown | Standard HTML input + absolute-positioned div |
| WebView capture of keyboard shortcuts | IPC from renderer to main for shortcuts like Ctrl+L (focus omnibox) |
| Window drag region with frameless | `-webkit-app-region: drag` on titlebar, `no-drag` on interactive elements |

---

## Next Steps After MVP

1. **Multi-tab support** — BrowserView array, tab bar UI
2. **Bookmarks** — SQLite store, sync with PUNYCODEX account
3. **Content quality scoring** — Crawler extension that scores sites, search ranks by score
4. **Tauri rewrite** — Drop from ~150MB to ~5MB binary
5. **Mobile port** — React Native WebView wrapper
6. **Extension API** — Let developers build sidebar plugins
7. **Auto-crawl on visit** — When user visits a Unicode domain not in index, background-crawl it

---

## Success Criteria for MVP

- [ ] `npm install && electron .` launches a working browser window
- [ ] Typing `hekate` in omnibox shows PUNYCODEX results with tier badges
- [ ] Clicking a result navigates webview to the domain
- [ ] Address bar displays `Hekátē.com` (Unicode) with green checkmark
- [ ] Sidebar shows entry details, breakdown, variants
- [ ] Visiting a non-lexicon Unicode domain shows punycode + gray warning
- [ ] Visiting an ASCII domain shows plain text, no icon
- [ ] Back/forward/reload buttons work
- [ ] Custom titlebar with minimize/maximize/close works on Windows

---

## File Creation Order (for next chat)

1. `platform/browser/package.json` — deps
2. `platform/browser/main.js` — main process
3. `platform/browser/preload.js` — IPC bridge
4. `platform/browser/renderer/browser.css` — chrome styling
5. `platform/browser/renderer/index.html` — shell
6. `platform/browser/renderer/punycode-util.js` — helpers
7. `platform/browser/renderer/omnibox.js` — address bar
8. `platform/browser/renderer/webview-manager.js` — navigation
9. `platform/browser/renderer/sidebar.js` — domain intel
10. `platform/browser/renderer/browser.js` — orchestrator
11. `npm install` and test
