#!/usr/bin/env python3
"""Build eng.json + xref.json for Sir George Grey, Polynesian Mythology (1855
text; OCR source = the 1906 Whitcombe & Tombs reprint, archive.org item
in.ernet.dli.2015.88531, whose scan avoids the long-s corruption of the 1855
Murray scan, kept alongside as eng-raw-1855.txt).

One section per legend (22 legends); the Appendix on native songs (Grey's own
essay) is excluded. Run from this directory:  python build.py
"""
import json
import re
import sys

RAW = 'eng-raw.txt'
BODY_END = 11073  # APPENDIX heading line (1-indexed), cut here

# (slug, title, start_line_1indexed)
LEGENDS = [
    ('children-of-heaven-and-earth', 'The Children of Heaven and Earth', 546),
    ('the-legend-of-maui', 'The Legend of Maui', 1316),
    ('the-legend-of-tawhaki', 'The Legend of Tawhaki', 2570),
    ('hupes-ascent-into-heaven', "Hupe's Ascent into Heaven", 3335),
    ('kaes-theft-of-the-whale', "Kae's Theft of the Whale", 3656),
    ('the-murder-of-tuwhakararo', 'The Murder of Tuwhakararo and its Revenge', 3961),
    ('the-adventures-of-rata', 'The Adventures of Rata and the Enchanted Tree', 4251),
    ('the-dissensions-at-hawaiki', 'The Dissensions at Hawaiki', 4869),
    ('the-discovery-of-new-zealand', 'The Discovery of New Zealand', 5177),
    ('the-voyage-to-new-zealand', 'The Voyage to New Zealand', 5249),
    ('the-curse-of-manaia', 'The Curse of Manaia', 6193),
    ('hatupatu-and-his-brothers', 'Hatupatu and His Brothers', 6869),
    ('the-emigration-of-turi', 'The Emigration of Turi to New Zealand', 7497),
    ('the-emigration-of-manaia', 'The Emigration of Manaia', 8177),
    ('hine-moa', 'The Story of Hine-moa, the Maiden of Rotorua', 8632),
    ('maru-tuahu', 'The Story of Maru-tuahu and of Kahureremoa', 8998),
    ('the-two-sorcerers', 'The Two Sorcerers', 9904),
    ('the-magical-wooden-head', 'The Magical Wooden Head', 10086),
    ('kahukura-and-the-fairies', 'Kahukura and the Fairies', 10315),
    ('te-kanawas-adventure', "Te Kanawa's Adventure with the Fairies", 10445),
    ('the-loves-of-takarangi', 'The Loves of Takarangi and Rau-Mahora', 10569),
    ('the-stratagem-of-te-tonga', "The Stratagem of Te Tonga's Elopement", 10705),
]

lines = open(RAW, encoding='utf-8', errors='replace').read().replace('\r\n', '\n').split('\n')

def is_caps_line(s):
    s2 = re.sub(r'\s*\d+\s*$', '', s.strip())
    letters = [c for c in s2 if c.isalpha()]
    return len(letters) >= 8 and sum(c.isupper() for c in letters) / len(letters) > 0.9

FOOT_MARK = re.compile(r"^\s*(\*|\d{1,2}\s|†|‡|§|¶|\?\s|\|\s|f\s|t\s|['‘’“”]\s|�)")

def clean_slice(raw):
    out, cur = [], []
    for ln in raw + ['']:
        s = ln.rstrip()
        if not s.strip():
            if cur:
                out.append(' '.join(cur))
                cur = []
            continue
        t = s.strip()
        if is_caps_line(t):          # running head / original heading
            continue
        if re.match(r'^\d{1,3}\s*$', t):   # bare page number
            continue
        if re.match(r'^[B-H]\s*$', t):     # signature mark
            continue
        if FOOT_MARK.match(t):             # footnote line/paragraph start
            if cur:
                out.append(' '.join(cur))
                cur = []
            continue
        # de-hyphenate across line breaks
        if cur and cur[-1].endswith('-'):
            cur[-1] = cur[-1][:-1] + t
        else:
            cur.append(t)
    if cur:
        out.append(' '.join(cur))
    cleaned = []
    for p in out:
        p = p.replace('©', 'e')
        p = re.sub(r'\byoimg\b', 'young', p)
        p = re.sub(r'\bofi\b', 'off', p)
        p = re.sub(r'\bffis\b', 'His', p)
        p = re.sub(r'\btlie\b', 'the', p)
        p = re.sub(r'\bth\.e\b', 'the', p)
        p = p.replace('coxmtry', 'country')
        p = re.sub(r'\bv\^ry?\b', 'very', p)
        p = re.sub(r'\bthemselv\^', 'themselves', p)
        p = p.replace('Tane^ahuta', 'Tane-mahuta')
        p = re.sub(r'\s?\*(?=\s|$|[.,;:])', '', p)
        p = re.sub(r'(?<=[A-Za-z])--(?=[A-Za-z])', '', p)
        p = p.replace('--', '—')
        p = re.sub(r'^[:;,.]+\s*', '', p)
        p = re.sub(r'\s{2,}', ' ', p).strip()
        # drop all-caps heading residue and Maori subtitle glosses
        letters = [c for c in p if c.isalpha()]
        if letters and sum(c.isupper() for c in letters) / len(letters) > 0.9:
            continue
        if p.startswith('(KO') or p.startswith('(Ko'):
            continue
        if len(p) > 1 and re.search(r'[A-Za-z]', p):
            cleaned.append(p)
    return cleaned

sections = []
for i, (slug, title, start) in enumerate(LEGENDS):
    end = LEGENDS[i + 1][2] - 1 if i + 1 < len(LEGENDS) else BODY_END - 1
    raw = lines[start - 1:end]
    paras = clean_slice(raw)
    text = title + '.\n\n' + '\n\n'.join(paras)
    assert len(text) >= 40, slug
    sections.append({'id': slug, 'title': title, 'text': text})
    print(f'{slug:32s} lines {start:5d}-{end:5d} -> {len(paras):3d} paras')

with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'lang': 'eng', 'sections': sections}, f, ensure_ascii=False, indent=2)
    f.write('\n')

candidates = {
    'papatuanuku': ['Papa', 'Papa-tu-a-nuku', 'Papatuanuku'],
    'tane': ['Tane', 'Tane-mahuta'],
    'tumatauenga': ['Tu-matauenga', 'Tumatauenga'],
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
