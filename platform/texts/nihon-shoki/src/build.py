#!/usr/bin/env python3
"""Build eng.json + xref.json for Aston's Nihongi (1896), 2 vols, archive.org
identifiers nihongi1asto / nihongi2asto.

Pipeline: slice the two djvu.txt volumes at the BOOK markers (mapped by
sequence, the OCR mangling several Roman numerals), drop running heads /
signature marks / page numbers, de-hyphenate, drop footnote zones (from the
first marker-led paragraph of each inferred page to the page end), and emit
13 grouped sections. Run from this directory:  python build.py
"""
import json
import re
import sys

# (book_number, volume, marker_line_1indexed, clean_header)
VOL1 = 'eng-raw-vol1.txt'
VOL2 = 'eng-raw-vol2.txt'
BOOKS = [
    (1, 1, 852, 'Book I. The Age of the Gods, Part I.'),
    (2, 1, 4517, 'Book II. The Age of the Gods, Part II.'),
    (3, 1, 7096, 'Book III. The Emperor Jimmu.'),
    (4, 1, 8832, 'Book IV. The Emperor Suizei.'),
    (5, 1, 9604, 'Book V. The Emperor Sujin.'),
    (6, 1, 10547, 'Book VI. The Emperor Suinin.'),
    (7, 1, 11854, 'Book VII. The Emperor Keikō.'),
    (8, 1, 13559, 'Book VIII. The Emperor Chūai.'),
    (9, 1, 13931, 'Book IX. The Empress Jingū.'),
    (10, 1, 15710, 'Book X. The Emperor Ōjin.'),
    (11, 1, 16817, 'Book XI. The Emperor Nintoku.'),
    (12, 1, 18569, 'Book XII. The Emperor Richū.'),
    (13, 1, 19220, 'Book XIII. The Emperor Ingyō.'),
    (14, 1, 20365, 'Book XIV. The Emperor Yūriaku.'),
    (15, 1, 22726, 'Book XV. The Emperor Seinei.'),
    (16, 1, 22982, 'Book XVI. The Emperors Kenzō, Ninken, and Muretsu.'),
    (17, 2, 253, 'Book XVII. The Emperor Keitai.'),
    (18, 2, 1799, 'Book XVIII. The Emperors Ankan and Senka.'),
    (19, 2, 2376, 'Book XIX. The Emperor Kimmei.'),
    (20, 2, 5567, 'Book XX. The Emperor Bidatsu.'),
    (21, 2, 6454, 'Book XXI. The Emperor Yōmei.'),
    (22, 2, 7286, 'Book XXII. The Empress Suiko.'),
    (23, 2, 9561, 'Book XXIII. The Emperor Jomei.'),
    (24, 2, 10385, 'Book XXIV. The Empress Kōgyoku.'),
    (25, 2, 11837, 'Book XXV. The Emperor Kōtoku.'),
    (26, 2, 15103, 'Book XXVI. The Empress Saimei.'),
    (27, 2, 16624, 'Book XXVII. The Emperor Tenchi.'),
    (28, 2, 18365, 'Book XXVIII. The Emperor Temmu, Part I.'),
    (29, 2, 19487, 'Book XXIX. The Emperor Temmu, Part II.'),
    (30, 2, 23375, 'Book XXX. The Empress Jitō.'),
]
VOL_END = {1: 'BND OF VOly', 2: 'INDEX.'}  # body cut markers

GROUPS = [
    ('age-of-the-gods-part-i', 'The Age of the Gods, Part I (Book I)', [1]),
    ('age-of-the-gods-part-ii', 'The Age of the Gods, Part II (Book II)', [2]),
    ('the-emperor-jimmu', 'The Emperor Jimmu (Book III)', [3]),
    ('suizei-and-sujin', 'Suizei and Sujin (Books IV–V)', [4, 5]),
    ('suinin-and-keiko', 'Suinin and Keikō (Books VI–VII)', [6, 7]),
    ('chuai-and-jingu', 'Chūai and the Empress Jingū (Books VIII–IX)', [8, 9]),
    ('ojin-and-nintoku', 'Ōjin and Nintoku (Books X–XI)', [10, 11]),
    ('richu-ingyo-yuriaku', 'Richū, Ingyō, and Yūriaku (Books XII–XIV)', [12, 13, 14]),
    ('seinei-to-muretsu', 'Seinei, Kenzō, Ninken, and Muretsu (Books XV–XVI)', [15, 16]),
    ('keitai-ankan-kimmei', 'Keitai, Ankan, and Kimmei (Books XVII–XIX)', [17, 18, 19]),
    ('bidatsu-to-jomei', 'Bidatsu, Yōmei, Suiko, and Jomei (Books XX–XXIII)', [20, 21, 22, 23]),
    ('kogyoku-kotoku-saimei', 'Kōgyoku, Kōtoku, and Saimei (Books XXIV–XXVI)', [24, 25, 26]),
    ('tenchi-temmu-jito', 'Tenchi, Temmu, and Jitō (Books XXVII–XXX)', [27, 28, 29, 30]),
]

HEAD_RE = [
    re.compile(r'^\s*\d{1,3}\s+NIHONGI[.,]?\s*$', re.I),          # 2 NIHONGI.
    re.compile(r'^\s*[A-Z][A-Za-z ,\'.()\-]*\s+\d{1,3}\s*\.?\s*$'),# KENZO. 379 / AGE OF THE Gops. 3
    re.compile(r'^\s*\d{1,3}\s*$'),                                # bare page number
    re.compile(r'^\s*[B-H]\s*$'),                                  # signature mark
]
FOOT_MARK = re.compile(r"^\s*(\*|\d{1,2}\s|§|¶|\?\s|\|\s|['‘’“”]\s|�)")
NOTEISH = re.compile(r'(See above|See below|Vide |ibid|op\. cit|p\. \d|pp\. \d|J\.A\.S\.T|T\.A\.S\.J|'
                     r'Transactions|reprint|Dr\. |Mr\. |Prof\. |Ch\. K\.|Griffis|Satow|Chamberlain|'
                     r'Florenz|Motoori|Motowori|Hirata|Aston,|W\.G\. )')

def is_running_head(ln):
    if not ln.strip():
        return False
    for rx in HEAD_RE:
        if rx.match(ln):
            letters = [c for c in ln if c.isalpha()]
            # guard: keep normal sentences that merely end in a number
            if len(ln) > 45:
                return False
            if letters and sum(c.isupper() for c in letters) / len(letters) < 0.6:
                return rx.pattern == r'^\s*\d{1,3}\s*$'
            return True
    return False

def clean_book(raw_lines):
    # 1) drop the mangled header block: leading lines until the first
    #    non-header sentence line. Aston's book headers are BOOK lines,
    #    "THE EMPEROR/EMPRESS ..." lines, "(X TENNO.)" parentheticals,
    #    "Part I." lines, and all-caps name lines ending in . ) ' or ;
    i = 0
    while i < len(raw_lines):
        s = raw_lines[i].strip()
        if not s:
            i += 1
            continue
        if (re.match(r'^BOOK\b', s, re.I)
                or re.match(r'^THE (EMPEROR|EMPRESS)\b', s)
                or re.match(r'^THE AGE OF THE GOD', s, re.I)
                or s.startswith('(')
                or re.match(r'^(Part|reer)\b', s, re.I)
                or (re.match(r'^[A-Z][A-Z ,\'.!?()\-;|*�]{4,}$', s)
                    and re.search(r'[.);\'"]$', s))):
            i += 1
            continue
        break
    lines = raw_lines[i:]

    # 2) split into pages on running-head lines (heads themselves dropped)
    pages, page = [], []
    for ln in lines:
        if is_running_head(ln):
            if page:
                pages.append(page)
                page = []
        else:
            page.append(ln)
    if page:
        pages.append(page)

    # 3) per page: de-hyphenate, build paragraphs, drop the footnote zone
    #    (from the first marker-led paragraph to the page end). A page that
    #    ended inside a note zone hands over: drop up to 3 leading
    #    citation-looking continuation paragraphs of the next page.
    cleaned = []
    prev_in_notes = False
    for pg in pages:
        joined = []
        buf = None
        for ln in pg:
            if buf is not None:
                ln = buf + ln.lstrip()
                buf = None
            stripped = ln.rstrip()
            if stripped.endswith('-') and not stripped.endswith(' -'):
                buf = stripped[:-1] if not stripped.endswith('--') else stripped[:-2]
                continue
            joined.append(ln)
        if buf is not None:
            joined.append(buf)
        paras, cur = [], []
        for ln in joined + ['']:
            if ln.strip():
                cur.append(ln.strip())
            elif cur:
                paras.append(' '.join(cur))
                cur = []
        if prev_in_notes:
            dropped = 0
            while paras and dropped < 3 and (FOOT_MARK.match(paras[0]) or NOTEISH.search(paras[0])):
                paras.pop(0)
                dropped += 1
        prev_in_notes = False
        for p in paras:
            if FOOT_MARK.match(p):
                prev_in_notes = True
                break  # rest of this page is footnote apparatus
            p = re.sub(r'(?<=[A-Za-z])--(?=[A-Za-z])', '', p)
            p = p.replace('--', '—')
            p = re.sub(r'\s?\*(?=\s|$|[.,;:])', '', p)  # stray asterisk footnote markers
            p = re.sub(r'^[:;,.]+\s*', '', p)
            # systematic scan OCR errors (old-style THE ligature, 1st/9th)
            p = re.sub(r'\bTue\b|\bTure\b|\bTHe\b', 'The', p)
            p = re.sub(r'\bist\b', '1st', p)
            p = re.sub(r'\bgth\b', '9th', p)
            p = p.replace('<', ' ').replace('>', ' ')  # never legitimate here
            p = re.sub(r'\s{2,}', ' ', p).strip()
            # OCR page-furniture gibberish: short, mostly caps or mostly symbols
            letters = [c for c in p if c.isalpha()]
            if p and len(p) < 30 and letters:
                upper_ratio = sum(c.isupper() for c in letters) / len(letters)
                if upper_ratio > 0.55 or len(letters) / len(p) < 0.55:
                    continue
            if len(p) > 1 and re.search(r'[A-Za-z]', p):
                cleaned.append(p)
    return cleaned

# --- slice the volumes into books -----------------------------------------
vol_lines = {1: open(VOL1, encoding='utf-8', errors='replace').read().replace('\r\n', '\n').split('\n'),
             2: open(VOL2, encoding='utf-8', errors='replace').read().replace('\r\n', '\n').split('\n')}
book_text = {}
for idx, (num, vol, start, header) in enumerate(BOOKS):
    lines = vol_lines[vol]
    end = len(lines)
    if idx + 1 < len(BOOKS) and BOOKS[idx + 1][1] == vol:
        end = BOOKS[idx + 1][2] - 1
    else:
        # last book of the volume: cut at the end marker
        marker = VOL_END[vol]
        for j in range(start - 1, len(lines)):
            if marker in lines[j]:
                end = j
                break
    raw = lines[start - 1:end]
    paras = clean_book(raw)
    book_text[num] = [header] + paras
    print(f'book {num:2d}: {len(raw):5d} raw lines -> {len(paras):4d} paragraphs')

sections = []
for slug, title, nums in GROUPS:
    paras = []
    for n in nums:
        paras.extend(book_text[n])
    t = '\n\n'.join(paras)
    assert len(t) >= 40, slug
    assert 'Project Gutenberg' not in t
    sections.append({'id': slug, 'title': title, 'text': t})

with open('../eng.json', 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'lang': 'eng', 'sections': sections}, f, ensure_ascii=False, indent=2)
    f.write('\n')

# --- xref ------------------------------------------------------------------
candidates = {
    'kyushu': ['Kiushiu', 'Tsukushi'],
    'osaka': ['Osaka'],
    'kobe': ['Kobe'],
    'fujin': ['Shina tohe no Mikoto', 'Shina tsu hiko no Mikoto', 'Wind-God', 'Wind-Gods', 'God of the Wind'],
    # kyoto/nikko/hokkaido/honshu/jizo occur only inside Aston's footnote
    # apparatus (or not at all) — excluded on attestation grounds.
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
