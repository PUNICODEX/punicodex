# PuniCodex Android App

Play Store-ready Android app bundling the PuniCodex companion app + system keyboard IME.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Main App | Capacitor + WebView | Full PWA experience (Type, Compose, Directory, History) |
| Keyboard IME | Native Java (`InputMethodService`) | System keyboard with Unicode suggestions |
| Suggestion Engine | Java trie (ported from JS) | Real-time autocomplete for 859 lexicon entries |
| Shared Data | JSON assets | Lexicon + 584-character palette bundled in APK |

## Project Structure

```
android/
├── app/src/main/
│   ├── java/com/punicodex/
│   │   ├── app/MainActivity.java          # Capacitor entry
│   │   └── keyboard/
│   │       ├── PunyKeyboardService.java   # IME service
│   │       ├── PunyKeyboardPlugin.java    # Capacitor bridge
│   │       ├── SuggestionEngine.java      # Trie engine
│   │       ├── LexiconLoader.java         # Asset loader
│   │       ├── LexiconEntry.java          # Data model
│   │       └── PaletteEntry.java          # Data model
│   ├── assets/
│   │   ├── public/                        # Copied from mobile/ (web app)
│   │   └── shared/
│   │       ├── lexicon.json               # 859 entries
│   │       └── keyboard-palette.json      # 584 quick-insert chars
│   └── res/
│       ├── layout/keyboard_view.xml       # Keyboard UI
│       └── xml/method.xml                 # IME config
```

## Build Commands

From project root:

```bash
# Sync web assets + regenerate JSON
npm run android:assets
npm run android:sync

# Debug APK
npm run android:build

# Release AAB (for Play Store)
npm run android:bundle

# Open in Android Studio
npm run android:open
```

## Play Store Checklist

- [x] Capacitor app shell
- [x] Native keyboard IME with trie autocomplete
- [x] Shared JSON data assets
- [x] App-keyboard bridge (Capacitor plugin)
- [x] Keyboard settings UI in web app
- [x] Release signing config
- [x] AAB build succeeds

### Still needed (manual)
- [ ] Replace `release-key.jks` with your own Play Store upload key
- [ ] Update `versionCode` and `versionName` for each release
- [ ] App icon (adaptive) — `res/mipmap-*/`
- [ ] Feature graphic (1024×500)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

## Keyboard Usage

After installing the app:

1. Open the app → go to History tab → tap "Open Keyboard Settings"
2. Enable **PuniCodex Keyboard**
3. While typing in any app, tap the keyboard switcher (🌐) to select PuniCodex
4. Type "zeus" → suggestion row shows `Zéus` → tap to insert
5. Tap **123** to browse 584 curated Unicode characters by category

## Technical Notes

- The keyboard IME is a native Android `InputMethodService` (not a WebView) for reliability
- The trie engine is a direct port of `mobile/shared/engine.js` — same completion behavior
- The web app detects Capacitor via `window.Capacitor` and shows keyboard settings only when running native
- All 4,475 directory characters are available in the app; the keyboard uses a curated 584-character subset for performance
