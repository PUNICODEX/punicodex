# PÚNYCODEX Type — Browser Extension

Scholarly transliteration for classical names. Type `apollo` → Ápollōn.

## Features

- **895 entries** across 14 pantheons (Greek, Norse, Egyptian, Sanskrit, Japanese, Nahuatl, Yoruba, and more)
- **Inline autocomplete** on any website — type in any input field and see suggestions
- **Popup lookup** — press `Ctrl+Shift+P` (Mac: `⌘+Shift+P`) for the full typing interface
- **Source citations** — every entry cites standard references (LSJ, Faulkner, MW, etc.)
- **Real-time blocking** — invalid keystrokes are rejected before they reach the page
- **Keyboard navigation** — arrow keys, Enter to select, Escape to clear

## Installation (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `extension/` folder

## Files

```
extension/
├── manifest.json          # Chrome Extension Manifest V3
├── background/
│   └── background.js      # Service worker (settings, clipboard)
├── content/
│   ├── content.js         # Injected into all web pages
│   └── content.css        # Dropdown styles (isolated)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html       # Settings page
│   ├── options.css
│   └── options.js
├── shared/
│   ├── engine.js          # Pure trie engine (shared with website)
│   └── lexicon.js         # 895-entry scholarly lexicon
└── icons/
    └── icon{16,32,48,128}.png
```

## Architecture

- **Content script** detects focused `<input>` and `<textarea>` fields, shows inline autocomplete dropdown
- **Popup** provides the full typing interface with result card, sources, and copy-to-clipboard
- **Background worker** handles settings persistence and clipboard API fallback
- **Engine** is pure JavaScript with no DOM dependencies — reusable across website and extension

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` / `⌘+Shift+P` | Open popup |
| `↑` / `↓` | Navigate suggestions |
| `Enter` or `Tab` | Select and transform |
| `Escape` | Close dropdown / clear |

## License

© PÚNYCODEX. All rights reserved.
