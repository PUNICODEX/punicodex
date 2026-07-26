#!/usr/bin/env python3
"""Build eng.json + xref.json for the Kojiki, Basil Hall Chamberlain's
translation (1919 edition), via the Internet Sacred Text Archive
transcription (sacred-texts.com/shi/kj/) archived by the Wayback Machine
(archive.org). Pages kj008..kj187 = Sections I–CLXXX (the edition's printed
numerals contain known misprints; sections are renumbered sequentially here).
The translator's introduction, preface, footnotes, and the two appendices
(Japanese song texts; chronology) are excluded. 14 chapter-groups along the
narrative arcs. Run from this directory:  python build.py
"""
import html as htmllib
import json
import re

# (slug, title, first_kj_page, last_kj_page)  — kj page = section index + 7
GROUPS = [
    ('age-of-the-gods', 'The Age of the Gods: From the Beginning of Heaven and Earth to the Heavenly Rock-Dwelling (Sections I–XVI)', 8, 23),
    ('susanoo-and-okuninushi', 'Susanoo, the Eight-Forked Serpent, and Ōkuninushi (Sections XVII–XXV)', 24, 32),
    ('pacification-and-descent', 'The Pacification of the Land and the Descent of the Heavenly Grandson (Sections XXVI–XLIII)', 33, 50),
    ('the-emperor-jimmu', 'The Emperor Jimmu (Sections XLIV–LIV)', 51, 61),
    ('the-eight-early-emperors', 'The Eight Early Emperors: Suizei to Kaikwa (Sections LV–LXII)', 62, 69),
    ('the-emperor-sujin', 'The Emperor Sujin (Sections LXIII–LXVIII)', 70, 75),
    ('the-emperor-suinin', 'The Emperor Suinin (Sections LXIX–LXXVI)', 76, 83),
    ('keiko-and-yamato-take', 'The Emperor Keikō and Yamato-take (Sections LXXVII–XCIII)', 84, 100),
    ('seimu-chuai-jingu', 'Seimu, Chūai, and the Empress Jingū (Sections XCIV–CIII)', 101, 110),
    ('the-emperor-ojin', 'The Emperor Ōjin (Sections CIV–CXVIII)', 111, 125),
    ('the-emperor-nintoku', 'The Emperor Nintoku (Sections CXIX–CXXX)', 126, 137),
    ('richu-to-anko', 'Richū, Hanzei, Ingyō, and Ankō (Sections CXXXI–CXLIX)', 138, 156),
    ('the-emperor-yuriaku', 'The Emperor Yūriaku (Sections CL–CLXII)', 157, 169),
    ('seinei-to-suiko', 'From Seinei to the Empress Suiko (Sections CLXIII–CLXXX)', 170, 187),
]

ROMAN = [(100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'), (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
def roman(n):
    out = ''
    for v, s in ROMAN:
        while n >= v:
            out += s
            n -= v
    return out

def extract(page):
    raw = open(f'raw/kj{page:03d}.html', encoding='utf-8', errors='replace').read()
    title_m = re.search(r'<TITLE>The Kojiki: (?:Volume [IV]+: )?Section [^.—]+[.—]\s*([^<]+)</TITLE>', raw, re.S)
    title = htmllib.unescape(title_m.group(1)).strip() if title_m else ''
    title = re.sub(r'^Emperor\s+', '', title)
    title = title.lstrip('—–- ').strip()
    body = raw[raw.find('<HR>'):]
    body = re.split(r'<H3[^>]*>\s*Footnotes\s*</H3>', body, flags=re.I)[0]
    body = re.sub(r'<A NAME="fr_\d+"></A><A HREF="#fn_\d+"><FONT SIZE="1">\d+</FONT></A>', '', body, flags=re.I)
    body = re.sub(r'<a name="page_\d+">.*?</A>', '', body, flags=re.S | re.I)
    body = re.sub(r'<h1[^>]*>.*?</h1>', '', body, flags=re.S | re.I)
    body = re.sub(r'<h[23][^>]*>.*?</h[23]>', '', body, flags=re.S | re.I)
    paras = []
    for ch in re.split(r'</p>\s*<p[^>]*>|<p[^>]*>|</p>', body):
        ch = re.sub(r'<br\s*/?>', ' ', ch)
        ch = re.sub(r'<[^>]+>', ' ', ch)
        ch = htmllib.unescape(ch).replace('\xa0', ' ')
        ch = re.sub(r'\[\d+\]', ' ', ch)          # print page numbers
        ch = ch.replace('--', '—')
        ch = re.sub(r'\s+', ' ', ch).strip()
        if len(ch) > 1 and re.search(r'[A-Za-z]', ch) \
                and not ch.startswith(('Buy this Book', 'The Kojiki, translated', 'Sacred Texts', 'Index', 'Previous', 'Next')):
            paras.append(ch)
    return title, paras

sections = []
for slug, group_title, first, last in GROUPS:
    paras = []
    for page in range(first, last + 1):
        sec_title, sec_paras = extract(page)
        n = page - 7
        heading = f'Section {roman(n)}. {sec_title}' if sec_title else f'Section {roman(n)}.'
        paras.append(heading)
        paras.extend(sec_paras)
    text = '\n\n'.join(paras)
    assert len(text) >= 40, slug
    sections.append({'id': slug, 'title': group_title, 'text': text})
    print(f'{slug:26s} kj{first:03d}-kj{last:03d} -> {len(paras):4d} paras, {len(text):7d} chars')

with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'lang': 'eng', 'sections': sections}, f, ensure_ascii=False, indent=2)
    f.write('\n')

candidates = {
    'kyoto': ['Kioto', 'Kyoto', 'Kiyoto'],
    'osaka': ['Osaka'],
    'kobe': ['Kobe'],
    'nikko': ['Nikko'],
    'jizo': ['Jizo'],
    'fujin': ['Deity Prince-of-Long-Wind', 'Deity of Wind'],
    'hokkaido': ['Hokkaido', 'Yezo', 'Ezo'],
    'honshu': ['Honshu', 'Hondo'],
    'kyushu': ['Kiushiu', 'Kiu-shiu', 'Kyushu', 'Tsukushi'],
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
