#!/usr/bin/env python3
"""Build eng.json + xref.json for the Kumulipo, Queen Liliuokalani's
translation (1897, Lee and Shepard), via the Internet Sacred Text Archive
transcription (sacred-texts.com/pac/lku/) archived by the Wayback Machine
(archive.org). Pages lku02..lku17 = the sixteen eras. The dedication
genealogy table (lku18) and the title page/introduction (lku00/lku01) are
excluded. Run from this directory:  python build.py
"""
import html as htmllib
import json
import re

ERA_TITLES = [
    ('era-01', 'The First Era'), ('era-02', 'The Second Era'),
    ('era-03', 'The Third Era'), ('era-04', 'The Fourth Era'),
    ('era-05', 'The Fifth Era'), ('era-06', 'The Sixth Era'),
    ('era-07', 'The Seventh Era'), ('era-08', 'The Eighth Era'),
    ('era-09', 'The Ninth Era'), ('era-10', 'The Tenth Era'),
    ('era-11', 'The Eleventh Era'), ('era-12', 'The Twelfth Era'),
    # the 1897 edition prints no "Thirteenth Era"; the Paliku genealogy
    # branch occupies that position under this heading
    ('era-13-branch-of-twelfth', 'A Branch of the Twelfth Era'),
    ('era-14', 'The Fourteenth Era'),
    ('era-15', 'The Fifteenth Era'), ('era-16', 'The Sixteenth Era'),
]

def extract(page_file):
    raw = open(page_file, encoding='utf-8', errors='replace').read()
    body = raw[raw.find('<BODY'):]
    body = re.sub(r'<A NAME="page_\d+">.*?</A>', '', body, flags=re.S)  # page anchors
    # find the era heading; skip everything before it (title/dedication block)
    m = re.search(r'<h3[^>]*>(.*?)</h3>', body, re.S)
    if not m:
        raise ValueError(f'no era heading in {page_file}')
    body = body[m.end():]
    # drop the Footnotes block and the trailing nav link
    body = re.split(r'Footnotes|<A HREF="lku\d+\.htm">Next</A>', body)[0]
    has_verses = re.search(r'<h4[^>]*>', body) is not None
    chunks = re.split(r'<h[34][^>]*>.*?</h[34]>', body, flags=re.S)
    paras = []
    for ch in chunks:
        ch = re.sub(r'<br\s*/?>', '\n', ch)
        ch = re.sub(r'<[^>]+>', ' ', ch)
        ch = htmllib.unescape(ch).replace('\xa0', ' ')
        lines = []
        for ln in ch.split('\n'):
            ln = re.sub(r'\bp\.\s?\d+\b', '', ln)          # stray page anchors
            ln = re.sub(r'(?<=[a-zA-Z,;])\s+\d{1,2}(?=\s+[a-zA-Z])', '', ln)  # footnote markers
            ln = ln.replace('--', '—')
            ln = re.sub(r'\s+', ' ', ln).strip()
            if ln and re.search(r'[A-Za-z]', ln) and not ln.startswith(('Sacred Texts', 'Next', 'Previous', 'Index', '(Turn to')):
                lines.append(ln)
        if has_verses:
            joined = ' '.join(lines).strip()
            if joined:
                paras.append(joined)
        else:
            paras.extend(lines)
    return paras

sections = []
for i, (slug, title) in enumerate(ERA_TITLES):
    paras = extract(f'raw/lku{i + 2:02d}.html')
    text = '\n\n'.join(paras)
    assert len(text) >= 40, slug
    sections.append({'id': slug, 'title': title, 'text': text})
    print(f'{slug}: {len(paras):3d} paragraphs, {len(text):6d} chars | {paras[0][:60]}')

with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'lang': 'eng', 'sections': sections}, f, ensure_ascii=False, indent=2)
    f.write('\n')

candidates = {
    'papatuanuku': ['Papa'],
    'tane': ['Kane'],
    'kanaloa': ['Kanaloa'],
    'tumatauenga': ['Ku'],
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
