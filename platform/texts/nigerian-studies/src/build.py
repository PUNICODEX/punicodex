#!/usr/bin/env python3
"""Build eng.json + xref.json for R. E. Dennett, Nigerian Studies (1910,
Macmillan; archive.org item nigerianstudieso00denn).

CURATED SCOPE: only the chapters containing the Orisha myths and theology
(II, V, VI, VII, VIII, IX, X, XI, XII, XV, XVI). The history/political-system
chapters (Explanatory I, I, III, IV, XIII, XIV, XVII, XVIII) are excluded.
Run from this directory:  python build.py
"""
import json
import re

RAW = 'eng-raw.txt'

# (slug, title, chapter_start_line_1indexed, end_line_exclusive)
CHAPTERS = [
    ('creation-and-the-sacred-stones', 'Creation and the Sacred Stones at Ife (Chapter II)', 1045, 1455),
    ('jakuta-the-four-winds', 'Jakuta: The Four Winds (Chapter V)', 3162, 3535),
    ('odudua-and-the-four-days', 'Odudua and the Four Days of the Week (Chapter VI)', 3535, 3897),
    ('obatala', 'Obatala (Chapter VII)', 3897, 4128),
    ('ifa-and-the-four-walls', 'Ifa and the Four Walls of the Yoruba Kingdom (Chapter VIII)', 4128, 4476),
    ('eshu', 'Eshu (Chapter IX)', 4476, 4593),
    ('aganju-yemoja-ogboni', 'Aganju, Yemoja, their Offspring, and the Ogboni or Council (Chapter X)', 4593, 5362),
    ('olokun-olosa-fisherman', 'Olokun, Olosa, and the Fisherman (Chapter XI)', 5362, 5771),
    ('ogun-oshowsi-hunter', 'Ogun, Oshowsi, and the Hunter (Chapter XII)', 5771, 6372),
    ('odus-of-ifa', 'Odus of Ifa (Chapter XV)', 7271, 7892),
    ('shango-oya-oba-oshun', 'Shango — Oya — Oba — Oshun (Chapter XVI)', 7892, 10411),
]

lines = open(RAW, encoding='utf-8', errors='replace').read().replace('\r\n', '\n').split('\n')

FOOT_MARK = re.compile(r"^\s*\d{1,2}\s+\S")

def clean_chapter(raw):
    # drop "CHAPTER N" + all-caps title lines + drop-cap single word
    i = 0
    while i < len(raw):
        s = raw[i].strip()
        if not s:
            i += 1
            continue
        if re.match(r'^CHAPTER\b', s) or (len([c for c in s if c.isalpha()]) >= 3 and
                sum(c.isupper() for c in s if c.isalpha()) / max(1, len([c for c in s if c.isalpha()])) > 0.9
                and not re.search(r'[a-z].*[a-z]', s)):
            i += 1
            continue
        break
    raw = raw[i:]

    # split into pages: page number lines / running heads / signatures delimit
    pages, page = [], []
    for ln in raw:
        s = ln.strip()
        if (re.match(r'^\d{1,3}\s*$', s) or re.match(r'^[B-H]\s*$', s)
                or s.upper() == 'NIGERIAN STUDIES' or re.match(r'^CHAP\b', s.upper())):
            if page:
                pages.append(page)
                page = []
        else:
            page.append(ln)
    if page:
        pages.append(page)

    cleaned = []
    for pg in pages:
        joined, buf = [], None
        for ln in pg:
            s = ln.strip()
            if buf is not None:
                s = buf + s
                buf = None
            if s.endswith('-'):
                buf = s[:-1]
                continue
            joined.append(s)
        if buf is not None:
            joined.append(buf)
        paras, cur = [], []
        for ln in joined + ['']:
            if ln:
                cur.append(ln)
            elif cur:
                paras.append(' '.join(cur))
                cur = []
        for p in paras:
            if FOOT_MARK.match(p):
                break  # rest of the page is footnote apparatus
            # glued footnote digits: "Ta1", "stone,3", "heaven.2"
            p = re.sub(r'(?<=[A-Za-z,;.])\d{1,2}(?=\s|$|[.,;:)\]])', '', p)
            # French-style spaced punctuation from the scan
            p = re.sub(r'\s+([!?;:])', r'\1', p)
            p = re.sub(r'\s{2,}', ' ', p).strip()
            p = re.sub(r'^[:;,.]+\s*', '', p)
            if len(p) > 1 and re.search(r'[A-Za-z]', p):
                cleaned.append(p)
    # drop-cap: first paragraph a single short word duplicated in the next
    if cleaned and len(cleaned[0]) < 20 and ' ' not in cleaned[0].strip('.,;:'):
        cleaned.pop(0)
    return cleaned

sections = []
for slug, title, start, end in CHAPTERS:
    raw = lines[start - 1:end - 1]
    paras = clean_chapter(raw)
    text = title.replace(' (Chapter', ' (Chapter') + '\n\n' + '\n\n'.join(paras)
    text = text
    assert len(text) >= 40, slug
    sections.append({'id': slug, 'title': title, 'text': text})
    print(f'{slug:28s} lines {start:5d}-{end - 1:5d} -> {len(paras):3d} paras')

with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'lang': 'eng', 'sections': sections}, f, ensure_ascii=False, indent=2)
    f.write('\n')

candidates = {
    'shango': ['Shango', 'Jakuta'],
    'oya': ['Oya'],
    'oba': ['Oba'],
    'oshun': ['Oshun'],
    'obatala': ['Obatala'],
    'olodumare': ['Olodumare', 'Olorun', 'Eleda'],
    'orunmila': ['Orunmila', 'Ifa'],
    'eshu': ['Eshu', 'Elegba'],
    'ogun': ['Ogun'],
    'ochosi': ['Oshowsi', 'Oshosi'],
    'aganju': ['Aganju'],
    'babaluaye': ['Shankpana', 'Shakpana', 'Shankpano', 'Bulu'],
    # 'orun': no capitalized whole-word attestation as heaven in the curated
    # chapters (Dennett's "Orun" is a day-name / town-name) — excluded.
}
full = '\n\n'.join(s['text'] for s in sections)
links = []
for temple, forms in candidates.items():
    good = [fm for fm in forms
            if re.search(r'(?<![A-Za-z])' + re.escape(fm) + r'(?![A-Za-z])', full)]
    if good:
        links.append({'temple': temple, 'forms': good})
with open('../xref.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'version': 1, 'links': links}, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('sections:', len(sections), 'words~', len(re.findall(r'\S+', full)))
print('xref:', json.dumps(links, ensure_ascii=False))
