#!/usr/bin/env python3
"""Build eng.json + xref.json for the Tao Teh King (Legge 1891, PG eBook 216).

Parses the PG 216 plain text into 81 chapters, groups them into 12 thematic
sections (Legge's chapter numbers preserved inline), and emits the corpus
contract files. Run from this directory:  python build.py

Parsing notes: chapter start lines are "N. 1. ..." (ch. 1-5, 7-9, and all
"N. 1." style), "N." alone (ch. 6, 12, 20, 21, 28), or "N. Text..." without a
verse marker (ch. 11, 24). Verse numbers inside chapters never exceed 9, so
any leading number >= 10 equal to the expected chapter is unambiguous; for
1-9 we require the "N. 1." double marker (ch. 6 is the lone exception).
"""
import json
import re
import sys

RAW = 'eng-raw.txt'

# (slug, title, first_chapter, last_chapter)
GROUPS = [
    ('mystery-of-the-tao', 'The Mystery of the Tao (Chapters 1–7)', 1, 7),
    ('excellence-of-the-way', 'The Excellence of the Way (Chapters 8–14)', 8, 14),
    ('ancients-and-the-return', 'The Ancients and the Return (Chapters 15–21)', 15, 21),
    ('the-uncarved-block', 'The Uncarved Block (Chapters 22–28)', 22, 28),
    ('way-of-non-action', 'The Way of Non-Action (Chapters 29–37)', 29, 37),
    ('operation-of-virtue', 'The Operation of Virtue (Chapters 38–44)', 38, 44),
    ('returning-to-the-mother', 'Returning to the Mother (Chapters 45–52)', 45, 52),
    ('governing-by-stillness', 'Governing by Stillness (Chapters 53–60)', 53, 60),
    ('the-three-treasures', 'The Three Treasures (Chapters 61–67)', 61, 67),
    ('strength-of-yielding', 'The Strength of Yielding (Chapters 68–73)', 68, 73),
    ('way-of-heaven', 'The Way of Heaven (Chapters 74–78)', 74, 78),
    ('sages-final-words', "The Sage's Final Words (Chapters 79–81)", 79, 81),
]

text = open(RAW, encoding='utf-8').read().replace('\r\n', '\n')
body = text[text.index('*** START OF'):text.index('*** END OF')]
body = body[body.index('PART 1.'):]  # drop PG header + title page
lines = body.split('\n')

# --- split into chapters -------------------------------------------------
chapters = {}          # n -> list of raw lines
expected = 1
cur = None
for ln in lines:
    if ln.startswith('PART'):
        continue
    stripped = re.sub(r'^Ch\.\s*', '', ln)
    m = re.match(r'^(\d{1,2})\.(\s+(.*))?$', stripped)
    is_chapter = False
    if m:
        n = int(m.group(1))
        if n == expected:
            if n >= 10 or re.match(r'^\d\.\s+1\.\s', stripped):
                is_chapter = True
            elif n == 6 and stripped.strip() == '6.':
                is_chapter = True
    if is_chapter:
        cur = int(m.group(1))
        chapters[cur] = [m.group(3) or '']
        expected += 1
        continue
    if cur is not None:
        chapters[cur].append(ln)

if sorted(chapters) != list(range(1, 82)):
    sys.exit(f'chapter parse failed: {sorted(chapters)}')

# --- clean each chapter into paragraphs -----------------------------------
def clean_chapter(n, raw_lines):
    paras, buf = [], []
    for ln in raw_lines + ['']:  # sentinel flushes the buffer
        if ln.strip():
            buf.append(ln.strip())
        elif buf:
            paras.append(' '.join(buf))
            buf = []
    out = []
    for joined in paras:
        joined = re.sub(r'^\d{1,2}\.\s*', '', joined)  # Legge verse number
        if not joined:
            continue
        joined = re.sub(r'\s{2,}', ' ', joined).strip()
        out.append(joined)
    if not out:
        sys.exit(f'chapter {n} produced no paragraphs')
    out[0] = f'Chapter {n}. ' + out[0]
    return out

chapter_paras = {n: clean_chapter(n, raw) for n, raw in chapters.items()}

sections = []
for slug, title, a, b in GROUPS:
    paras = []
    for n in range(a, b + 1):
        paras.extend(chapter_paras[n])
    text_out = '\n\n'.join(paras).replace('--', '—')
    assert len(text_out) >= 40, slug
    assert 'Project Gutenberg' not in text_out
    sections.append({'id': slug, 'title': title, 'text': text_out})

corpus = {'lang': 'eng', 'sections': sections}
with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')

# --- xref: only forms genuinely attested as capitalized whole words -------
candidates = {
    'tian': ['Heaven'],
    'tiandi': ['Heaven and Earth'],
    'laozi': ['Lao', 'Laozi', 'Lao-tse', 'Lao-tan'],
    'taichi': ["T'ai Chi", 'Tai Chi'],
    'yinyang': ['Yin', 'Yang'],
    'wuji': ['Wu-chi', 'Wuji'],
}
full = '\n\n'.join(s['text'] for s in sections)
links = []
for temple, forms in candidates.items():
    good = [fm for fm in forms
            if re.search(r'(?<![A-Za-z])' + re.escape(fm) + r'(?![A-Za-z])', full)]
    if good:
        links.append({'temple': temple, 'forms': good})

xref = {'version': 1, 'links': links}
with open('../xref.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(xref, ensure_ascii=False, indent=2) + '\n')

words = len(re.findall(r'\S+', full))
print(f'sections={len(sections)} chapters=81 words~{words}')
print('xref:', json.dumps(links, ensure_ascii=False))
