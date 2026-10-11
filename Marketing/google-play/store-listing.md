# PuniCodex — Google Play Store Listing

## App name (30 characters max)

```
PuniCodex: The Gods' Keyboard
```

## Short description (80 characters max)

```
The Unicode keyboard of the gods — 980 names, 1,700+ symbols, living temples.
```

Keyword strategy: the title carries the brand + epic (and "UNICODE" is
literally embedded in p-UNICODEX-x — worth an in-store search test to see
if Play's fuzzy tokenization surfaces it for "unicode" queries). The
reliable coverage lives in the short description: "Unicode keyboard" as
literal tokens in a Play-indexed field.

## Full description (4000 characters max)

```
Type the gods. Correctly.

PuniCodex is the scholarly Unicode keyboard: a real system keyboard with a
980-name suggestion engine for mythological names — restored from the
sources, with every accent, macron and spiritus in its right place.

Type "apoll" and tap → Apóllōn. Type "zeus" and space → Zeús. Not ASCII
approximations — the actual scholarly restorations used by lexicons.

⌨️ A REAL KEYBOARD, NOT A STICKER PACK
Full QWERTY + symbols, long-press accent popups, double-tap caps lock,
key repeat, sound and haptics. Works in every app — messages, notes,
browsers, anywhere.

📖 980 NAMES · 25 PANTHEONS
Greek, Norse, Egyptian, Sanskrit, Celtic, Mesopotamian, Yorùbá, Nahuatl,
Shintō, Slavic, Zoroastrian, Canaanite and more — each with meaning,
etymology, original script, tier and scholarly sources.

🏛️ EVERY NAME OPENS ITS TEMPLE
Every name links to its living temple page on punicodex.com — lore,
pronunciation, name variations, and the god's real Unicode domain
(e.g. apóllōn.com). The keyboard is the doorway; the temple is the home.

🔣 THE UNICODE DIRECTORY (Ω KEY)
1,700+ curated symbols, one gold key away: every precomposed Latin
diacritic, Greek and Coptic, Cyrillic, runes, Egyptian hieroglyphs,
cuneiform, Gothic, Linear B, Braille, Baybayin, math, arrows, currency,
combining marks (shown on dotted circles) — searchable and categorized,
fully offline. Multi-select mode strings characters into sequences.

🛡️ AUTHENTICITY SHIELD
Paste any link or name to catch homograph and mixed-script spoofs —
the same confusable atlases used by security teams. Checked on-device.

🔒 PRIVATE BY ARCHITECTURE
Zero keylogging. Zero trackers. Zero network calls while you type.
The lexicon and directory live on your device; nothing you type ever
leaves your phone.

⚡ FAST SETUP
Enable in settings, pick PuniCodex from the keyboard switcher, done.
Works alongside Gboard — switch any time.

For classicists, polytheists, pagans, fantasy writers, historians,
linguists, Hellenic students, mythology lovers — and anyone who has ever
winced at "Persephone" without her stress accent.

The names were written with care 2,500 years ago. Type them with care now.

punicodex.com
```

## What's new (500 characters max) — for release 1.2.7

```
• Keyboard settings screen redesigned (typing, sound, haptics, stats)
• Fixed settings crash on Android 14+
• Every typed name now links to its temple page
• Domain card shows the real Unicode domain (e.g. apóllōn.com)
• Unicode directory: combining marks now visible on dotted circles
• Multi-select mode: clearer ON/OFF state, safer buffer handling
• Faster typing: cached haptics, lighter key preview
```

## Graphic assets

Three device classes, all rendered from the same templates (upload each set
to its matching Play Store slot):

| Class | Folder | Size | Count |
|---|---|---|---|
| Feature graphic (required) | `feature-graphic-1024x500.png` | 1024×500 | 1 |
| Phone (required) | `phone/` | 1080×1920 | 8 |
| 7" tablet (optional) | `tablet-7in/` | 1200×1920 | 8 |
| 10" tablet (optional) | `tablet-10in/` | 1600×2560 | 8 |
| Web/laptop promo (not a Play slot) | `promo/` | 1920×1080 | 1 |

The tablet classes use a tablet bezel frame (slimmer radius, camera dot);
`promo/laptop-1920x1080.png` is a laptop mockup with browser chrome showing
the live desktop type tool — use it for the website, socials, ChromeOS
outreach, or press.

Screenshot order (same in every class) — lead with the download hook:

1. `screenshot-1-directory.png` — the Ω Unicode directory (1,700+ symbols)
2. `screenshot-2-latin.png` — Latin, the first category
3. `screenshot-3-letterlike.png` — Letterlike, the last category
4. `screenshot-4-convert.png` — type conversion (apoll → Apóllōn)
5. `screenshot-5-temple.png` — every name opens its temple
6. `screenshot-6-keyboard.png` — the keyboard itself
7. `screenshot-7-shield.png` — Authenticity Shield
8. `screenshot-8-setup.png` — 30-second setup

Play Store limits: each class 2–8 shots (phone class is required), 320–3840px
per side, aspect ratio no taller than 2:1 — all renders comply (raw device
captures are 1344×2992, too tall for the 2:1 rule, which is why the framed
compositions are the deliverables).

Raw device captures are in `../_work/` (uncropped, unframed — reusable).
Templates + renderer: `../_templates/` — edit `render.js` (shots, copy,
sizes) or drop new crops into `_work/`, then `node ../_templates/render.js`
regenerates the whole kit.
