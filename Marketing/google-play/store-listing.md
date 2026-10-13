# PuniCodex — Google Play Store Listing

## App name (30 characters max)

```
PuniCodex: The Gods' Keyboard
```

## Short description (80 characters max)

```
The Unicode keyboard of the gods — 980 names, 7,000+ symbols, living temples.
```

Keyword strategy: the title carries the brand + epic (and "UNICODE" is
literally embedded in p-UNICODEX-x — worth an in-store search test to see
if Play's fuzzy tokenization surfaces it for "unicode" queries). The
reliable coverage lives in the short description: "Unicode keyboard" as
literal tokens in a Play-indexed field.

## Full description (4000 characters max)

```
Type the gods — correctly. Free forever.

PuniCodex is the most complete Unicode keyboard ever built for Android —
and the only one wired into a living mythology. A real system keyboard, a
scholarly name engine, the deepest symbol directory on mobile, and living
temples behind every name. Completely
free. No ads. No subscription.

🏛️ 980 NAMES, RESTORED FROM THE SOURCES
Type "apoll" → tap → Apóllōn. "zeus" → Zeús. "persephone" → Persephonē.
Not ASCII approximations — the actual scholarly restorations used by
lexicons and universities: every acute, circumflex, macron and rough
breathing exactly where the sources put them. 25 pantheons — Greek, Norse,
Egyptian, Sanskrit, Celtic, Mesopotamian, Yorùbá, Nahuatl, Shintō, Slavic,
Zoroastrian, Canaanite and more — each with meaning, etymology, original
script, tier and cited sources. Long-press any suggestion for its
scholarly variant sheet: full restoration, circumflex form, macron-only
(the LSJ convention), and plain ASCII — with each form's real punycode
domain.

⌨️ A REAL KEYBOARD, TUNED FOR FAST TYPING
Full QWERTY plus a symbols panel; the suggestion bar re-ranks with every
keystroke. Long-press accent popups on every letter — á à â ä ã å ā
ă ǎ on "a" alone, ḥ ḫ on "h", þ on "t", ß on "s". Double-tap shift
within 350 ms for caps lock. Backspace repeats in stages: characters, then
accelerating, then whole words. The space bar doubles as a status line
showing the tracked word. Haptics tuned for speed. Works in
every app — messages, notes, browsers — and switches with Gboard in one
tap.

🔣 THE Ω DIRECTORY: 7,728 CHARACTERS, ONE GOLD KEY
Tap Ω and open the most generous symbol directory on mobile, fully
offline: every precomposed Latin diacritic; Greek and
Coptic; Cyrillic; runes; Egyptian hieroglyphs; cuneiform; Gothic; Linear
B; Braille; Baybayin; Hebrew; Arabic; Devanagari; Tamil; Thai; Tibetan;
Armenian; Georgian; Cherokee; Hangul; Bopomofo; Mongolian; Phoenician;
Glagolitic; Ogham; Ugaritic; Old Persian; Ancient Greek numerals — plus
mathematics, arrows, currency, alchemical signs and combining marks shown
on dotted circles. Every cell shows glyph, name and U+ code.
Search by name, keyword or code — "arrow", "rune", "U+16A0". Category
chips filter instantly; the directory remembers your category, size and
transparency between sessions. Move it by its header, resize with − / +, go
see-through with ◐, collapse the keys with ▼.

✍️ MULTI-SELECT & SEQUENCES
Toggle Multi-select (or long-press Ω) and taps queue characters into a
string instead of inserting — build ᛟᚱᚦᛟᚱ piece by piece, then Copy,
Insert or Clear.

🎨 MAKE IT YOURS
Long-press any directory character and pin it to any key: your symbol,
one hold away. Letters pin to both cases. Your custom variants appear in
orange inside the long-press sheet and can be deleted with a long-press —
built-in defaults never can. The "All" view leads with up to six
categories you pin, in your order.

🏛️ EVERY NAME OPENS ITS TEMPLE
Every suggestion links to its flagship temple on punicodex.com: lore,
pronunciation with IPA, name variations, and the god's real, live Unicode
domain (apóllōn.com is a real website you can visit). The keyboard
is the doorway; the temple is the home.

🛡️ AUTHENTICITY SHIELD
Paste any link or name to catch homograph and mixed-script spoofs — the
same confusable atlases security teams use. Checked entirely on-device.

🔒 PRIVATE BY ARCHITECTURE
Zero keylogging. Zero trackers. Zero network calls while you type. The
lexicon and the directory live on your device; nothing you type ever
leaves your phone.

⚡ 30-SECOND SETUP
Enable PuniCodex in settings, pick it in the keyboard switcher, done.
Free forever — completely free, always.

For classicists, polytheists, pagans, fantasy writers, historians,
linguists, students of Greek, mythology lovers — and anyone who has ever
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

1. `screenshot-1-directory.png` — the Ω Unicode directory (7,000+ symbols)
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
