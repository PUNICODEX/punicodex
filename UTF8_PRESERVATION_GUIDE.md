# UTF-8 Preservation Guide — PUNYCODEX

> **TL;DR**: Every HTML, CSS, and JS file in this repo MUST be saved as **UTF-8 without BOM**. If you save as Windows-1252, cp1252, or any other encoding, multi-byte Unicode characters (Greek, Egyptian, Sanskrit, Japanese, IPA, etc.) will be destroyed.

---

## What Happened (The Corruption)

### The Bug
PUNYCODEX is a Unicode pantheon website. Every temple page contains characters from:
- Greek (Ἀπόλλων, Ζεύς, Μέδουσα)
- Egyptian (Ꜣḫ, Rꜥ, Ꜣst)
- Sanskrit (Śiva, ṇḍava)
- Japanese (神戸, 京都, 大阪)
- IPA (/pʰó.nɛː/, /hɛ́ː.rɛːs/)
- Coptic (ⲁⲓⲅⲩⲡⲧⲟⲥ)
- Arabic (قبط, شعور)
- Hebrew (רֵעַ, שכלנות)
- Tamil (சிவன்)
- Devanagari (शिव, देव)

These characters are **multi-byte in UTF-8**. When an agent or editor saves a file as **Windows-1252** (the default on many Windows systems), the bytes cannot be mapped and are replaced with:
- `?` (ASCII 0x3F) — the original bytes are **permanently lost**
- Garbage characters like `Î`, `Â`, `Ã`, `±`, `´`, `¼`
- Or in extreme cases, every character gets separated by em-dashes

### The Symptoms

| Symptom | What It Means |
|---------|--------------|
| `?` replaces a character | The UTF-8 bytes had no Windows-1252 mapping. Original is **lost**. |
| `Î`, `Â`, `Ã`, etc. | A 2-byte UTF-8 sequence was misread as two Windows-1252 chars. |
| `???` in a row | A 3-byte or 4-byte UTF-8 character was completely destroyed. |
| Em-dashes between every character | Catastrophic corruption. File is unrecoverable. |
| `U+FFFD` (replacement char) | The file was re-read as UTF-8 and bad bytes became replacement chars. |

### Real Examples from This Repo

```
Before:  Ἀπόλλων
After:   ?p????µ?

Before:  /hɛ́ː.rɛːs/
After:   /há.r??s/

Before:  Πλούτων
After:   ????t??

Before:  *sóh₂wl̥
After:   *sóh2wl?

Before:  ⲁⲓⲅⲩⲡⲧⲟⲥ
After:   ????????
```

---

## How to Prevent It

### 1. Always Verify Before Saving

Run this check **before** committing any changes to HTML/JS/CSS files:

```bash
# Check for U+FFFD replacement characters (guaranteed corruption)
python -c "import pathlib; t=pathlib.Path('sites/zeus/index.html').read_text(encoding='utf-8'); print('U+FFFD count:', t.count('\ufffd'))"
```

**Result must be `0`.** Any U+FFFD means the file is already corrupted.

### 2. Check for Literal `?` Corruptions

Run this script on all modified HTML files:

```python
import os

def count_questionable(text):
    count = 0
    for i, ch in enumerate(text):
        if ch == '?':
            ctx = text[max(0,i-20):i+20]
            safe_phrases = [
                'http', '?v=', 'href=', 'src=', 'required', 'optional',
                '? Because', 'we die?', 'she go?', 'ASCII?', 'spellings?',
                'font-family:', '?token', 'googleapis', 'family=Cinzel',
                '.status', 'map(d', '===', 'ends_at', 'creative_path',
                'uncertain', 'disputed', 'pronounce N', 'mean in Greek'
            ]
            if any(s in ctx for s in safe_phrases):
                continue
            if ' ? ' in ctx:
                continue
            count += 1
    return count

for root, dirs, files in os.walk('sites'):
    for name in files:
        if not name.endswith('.html'):
            continue
        path = os.path.join(root, name)
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
        c = count_questionable(text)
        if c > 0:
            print(f'{path}: {c} suspicious "?" characters')
```

### 3. Always Save as UTF-8

#### VS Code
- Bottom-right status bar → click encoding → **"Save with Encoding" → "UTF-8"**
- Set as default: `settings.json` → `"files.encoding": "utf8"`

#### Vim / Neovim
```vim
:set fileencoding=utf-8
:set bomb?   " Make sure BOM is OFF
```

#### Notepad++
- Encoding menu → **"Encode in UTF-8"** (NOT "UTF-8 BOM")

#### Any AI Agent
When writing files, **always specify `encoding='utf-8'`**:
```python
with open('sites/zeus/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
```

**Never rely on system defaults.** Windows defaults to `cp1252`. Always be explicit.

### 4. Git Configuration

Add to `.gitattributes`:
```
*.html text eol=lf working-tree-encoding=UTF-8
*.js   text eol=lf working-tree-encoding=UTF-8
*.css  text eol=lf working-tree-encoding=UTF-8
```

This tells Git to treat these files as UTF-8 and normalize line endings.

### 5. Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Reject commits with U+FFFD in HTML/JS/CSS
if git diff --cached --name-only | grep -E '\.(html|js|css)$' | xargs grep -l $'\xef\xbf\xbd'; then
    echo "ERROR: U+FFFD (replacement character) detected. File is corrupted."
    echo "Fix the corruption before committing. See UTF8_PRESERVATION_GUIDE.md"
    exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## The Source of Truth

The **only** authoritative source of clean Unicode data is:

```
type/js/lexicon.js
```

This file contains all 850 entries with verified UTF-8 strings:
- `id`, `ascii`, `unicode`, `greek`
- `meaning`, `domain`, `pantheon`, `tier`
- `breakdown` (character-by-character mapping)
- `etymology`

**It has been verified:**
```python
import pathlib
t = pathlib.Path('type/js/lexicon.js').read_text(encoding='utf-8')
assert t.count('\ufffd') == 0, "LEXICON IS CORRUPTED"
print(f"Clean. Total chars: {len(t)}")
```

If any temple page is corrupted beyond repair, regenerate it:
```bash
node scripts/generate-temples.js
```

This script skips hand-crafted flagships and only regenerates base temples. It always writes with `fs.writeFileSync(path, html, 'utf8')`.

---

## Emergency Recovery

### Scenario 1: A Few Files Are Corrupted

1. Identify the corrupted files with the checker script above.
2. Look up the correct data in `type/js/lexicon.js`.
3. Use targeted `str.replace()` to fix exact patterns.
4. Verify with the checker script.

### Scenario 2: Many Files Are Corrupted

1. Run the base temple generator:
   ```bash
   node scripts/generate-temples.js
   ```
2. This regenerates 802 clean base temples from the lexicon.
3. Hand-crafted flagships (48 pages) will be skipped.
4. Fix the remaining corruptions in flagships manually or with scripts.

### Scenario 3: A File Is Completely Destroyed (Em-dashes Between Every Character)

Example: `sites/ab/index.html` had em-dashes between every single byte.

1. Delete the file.
2. Run the generator:
   ```bash
   node scripts/generate-temples.js
   ```
3. The generator will create a fresh base temple since the file is missing.

### Scenario 4: Corrupted Git History

If the corruption is committed:
1. `git checkout HEAD~1 -- sites/` to restore the previous version.
2. Or use `git log -- sites/zeus/index.html` to find the last clean commit.
3. Then apply your intended changes carefully, verifying UTF-8 at each step.

---

## Testing

After any bulk fix, run all four test suites:

```bash
node test/run-all.js
```

This runs:
1. **Lexicon Validator** — 73,000+ assertions on schema, uniqueness, Unicode renderability
2. **Engine Unit Tests** — trie construction, completions, filtering
3. **Link Checker** — 19,000+ internal links across 884 files
4. **SEO Validator** — schema.org, meta tags, canonical URLs on all 850 pages

All must pass before deployment.

---

## Quick Reference: Encoding Checklist

| Check | Command |
|-------|---------|
| File is UTF-8 | `python -c "open('file.html',encoding='utf-8').read()"` |
| No U+FFFD | `python -c "print(open('file.html',encoding='utf-8').read().count('\ufffd'))"` |
| Lexicon is clean | `node -e "const L=require('./type/js/lexicon.js').LEXICON; console.log('Clean')"` |
| Links valid | `node test/links.js` |
| SEO valid | `node scripts/validate-seo.js` |
| All tests | `node test/run-all.js` |

---

## Final Rule

> **Never save a file without explicitly specifying UTF-8.**
> **Never assume the editor or agent will do the right thing.**
> **Always verify after saving.**

The 850 gods of PUNYCODEX deserve their names intact.
