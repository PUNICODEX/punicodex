"""Build platform/texts/ramayana/{eng.json,xref.json} from src/eng-raw.txt.

Source: Romesh C. Dutt, "The Ramayana and the Mahabharata condensed into
English verse" (1899), etext scanned/proofed by John B. Hare (2004),
downloaded as dutt.txt.gz from sacred-texts.com/hin/dutt/.

Edition structure: 12 books + prose conclusion for the Ramayana portion.
We group Dutt's books into the seven kandas:
  Bala       = Book I
  Ayodhya    = Books II-IV
  Aranya     = Books V-VI
  Kishkindha = Book VII
  Sundara    = Book VIII
  Yuddha     = Books IX-XI
  Uttara     = Book XII (+ Recital canto + prose Conclusion)
Stripped: dedication, Ratcliffe biographical note, bibliography, per-book
prose headnotes, translator's epilogue, sacred-texts.com footer lines.
Canto titles are kept (case-normalized from all-caps, OCR typos fixed).
"""
import json, re, sys

SRC = 'C:/projects/punycodex/platform/texts/ramayana/src/eng-raw.txt'
OUT = 'C:/projects/punycodex/platform/texts/ramayana/'

raw = open(SRC, encoding='utf-8').read().replace('\r\n', '\n').replace('\r', '\n')
lines = raw.split('\n')

FOOTER = re.compile(r'^\s*The Ramayana and Mahabharata, by Romesh C\. Dutt, \[1899\], at sacred-texts\.com\s*$')

# ---- locate structural markers ----
def find(pat, start=0):
    rx = re.compile(pat)
    for i in range(start, len(lines)):
        if rx.match(lines[i].strip()):
            return i
    raise SystemExit('marker not found: ' + pat)

book_starts = []
i = find(r'^BOOK I$', 0)           # first "BOOK I" after CONTENTS area
book_starts.append(i)
for n, pat in [(2, 'RAMAYANA BOOK II'), (3, 'RAMAYANA BOOK III'), (4, 'RAMAYANA BOOK IV'),
               (5, 'RAMAYANA BOOK V'), (6, 'RAMAYANA BOOK VI'), (7, 'RAMAYANA BOOK VII'),
               (8, 'RAMAYANA BOOK VIII'), (9, 'RAMAYANA BOOK IX'), (10, 'RAMAYANA BOOK X'),
               (11, 'RAMAYANA BOOK XI'), (12, 'RAMAYANA BOOK XII')]:
    book_starts.append(find(r'^' + pat + r'$', i))
conc_i = find(r'^RAMAYANA - CONCLUSION$', book_starts[-1])
epi_i = find(r"^RAMAYANA - EPILOGUE BY THE TRANSLATOR$", conc_i)
mb_i = find(r'^MAHABHARATA$', epi_i)
assert conc_i < epi_i < mb_i
print('books at lines:', [b + 1 for b in book_starts], 'conclusion:', conc_i + 1)

ROMAN = re.compile(r'^(XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\.?$')

TITLE_FIXES = {'AYODRYA': 'AYODHYA', 'SURPA-YARUA': 'SURPA-NAKHA',
               'INDRJIT': 'INDRAJIT', 'KUSARA': 'KUSA'}

def norm_canto_title(t):
    for k, v in TITLE_FIXES.items():
        t = t.replace(k, v)
    t = t.replace('--', '\u2014').strip()

    def tc(w):
        if '-' in w:
            return '-'.join(tc(p) for p in w.split('-'))
        if not w:
            return w
        return w[0].upper() + w[1:].lower()
    return ' '.join(tc(w) for w in t.split(' '))

def clean_verse_line(l):
    return l.strip().replace('--', '\u2014')

def parse_book(start, end):
    """Return (book_title, subtitle, cantos=[(roman,title,[stanzas])], tail_prose=[paras])."""
    seg = [l for l in lines[start:end] if not FOOTER.match(l)]
    # header lines: (RAMAYANA )?BOOK N / TITLE / (Subtitle)
    hi = 1  # skip the "BOOK N" line itself
    title = seg[hi].strip()
    subtitle = ''
    if hi + 1 < len(seg) and seg[hi + 1].strip().startswith('('):
        subtitle = seg[hi + 1].strip().strip('()')
        hi += 1
    # first canto marker ends the headnote
    ci = None
    for k in range(hi + 1, len(seg)):
        if ROMAN.match(seg[k].strip()):
            ci = k
            break
    if ci is None:
        raise SystemExit('no canto marker in book starting line ' + str(start + 1))
    cantos = []
    cur = None
    for l in seg[ci:]:
        s = l.strip()
        m = ROMAN.match(s)
        if m:
            if cur:
                cantos.append(cur)
            cur = [m.group(1), None, []]  # roman, title, stanzas
            stanza = []
            continue
        if cur is None:
            continue
        if cur[1] is None and s:
            cur[1] = norm_canto_title(s)
            continue
        if not s:
            if cur[2] is not None and stanza:
                cur[2].append(stanza)
                stanza = []
            continue
        stanza.append(clean_verse_line(l))
    if cur:
        if stanza:
            cur[2].append(stanza)
        cantos.append(cur)
    return title, subtitle, cantos

book_ends = book_starts[1:] + [conc_i]
books = [parse_book(s, e) for s, e in zip(book_starts, book_ends)]

# prose conclusion block (Uttara) — paragraphs split on blank lines
conc_paras = []
buf = []
for l in lines[conc_i + 1:epi_i]:
    if FOOTER.match(l):
        continue
    s = l.strip()
    if not s:
        if buf:
            conc_paras.append(' '.join(buf))
            buf = []
        continue
    buf.append(s)
if buf:
    conc_paras.append(' '.join(buf))
print('conclusion paragraphs:', len(conc_paras))

def book_to_paras(cantos, per_para=4):
    """Yield heading/verse paragraphs for one book."""
    out = []
    for roman, title, stanzas in cantos:
        out.append(f'Canto {roman} \u2014 {title}')
        for i in range(0, len(stanzas), per_para):
            grp = stanzas[i:i + per_para]
            out.append(' '.join(' '.join(st) for st in grp))
    return out

KANDAS = [
    ('bala', 'Bala Kanda \u2014 The Bridal of Sita', [0]),
    ('ayodhya', 'Ayodhya Kanda \u2014 The Banishment', [1, 2, 3]),
    ('aranya', 'Aranya Kanda \u2014 Life in the Forest', [4, 5]),
    ('kishkindha', 'Kishkindha Kanda \u2014 The Alliance with Sugriva', [6]),
    ('sundara', 'Sundara Kanda \u2014 Sita Discovered', [7]),
    ('yuddha', 'Yuddha Kanda \u2014 The War in Ceylon', [8, 9, 10]),
    ('uttara', 'Uttara Kanda \u2014 The Horse Sacrifice', [11]),
]
ROMAN_NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

sections = []
for kid, ktitle, idxs in KANDAS:
    paras = []
    for bi in idxs:
        btitle, subtitle, cantos = books[bi]
        if len(idxs) > 1:
            head = f'Book {ROMAN_NUM[bi]} \u2014 {norm_canto_title(btitle)}'
            if subtitle:
                head += f' ({subtitle})'
            paras.append(head)
        paras.extend(book_to_paras(cantos))
        if bi == 11 and conc_paras:  # Uttara prose conclusion
            paras.append('Conclusion')
            paras.extend(conc_paras)
    text = '\n\n'.join(p for p in paras if p.strip())
    sections.append({'id': kid, 'title': ktitle, 'text': text})
    print(kid, len(paras), 'paragraphs', len(text), 'chars')

corpus = {'lang': 'eng', 'sections': sections}
with open(OUT + 'eng.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')

# ---- xref: only forms attested as capitalized whole words in OUR corpus ----
corpus_text = '\n'.join(s['text'] for s in sections)

def attested(form):
    return re.search(r'(?<![A-Za-z])' + re.escape(form) + r'(?![A-Za-z])', corpus_text) is not None

CANDIDATES = {
    'rama': ['Rama', 'RAMA'],
    'sita': ['Sita', 'SITA'],
    'hanuman': ['Hanuman', 'HANUMAN'],
    'vishnu': ['Vishnu', 'VISHNU'],
    'lakshmi': ['Lakshmi', 'LAKSHMI', 'Sri', 'SRI'],
    'shiva': ['Siva', 'SIVA', 'Rudra', 'RUDRA'],
    'surya': ['Surya', 'SURYA', 'Vivasat', 'VIVASAT', 'Sun-god'],
}
links = []
for temple, forms in CANDIDATES.items():
    ok = [f for f in forms if attested(f)]
    print(temple, ok)
    if ok:
        links.append({'temple': temple, 'forms': ok})
xref = {'version': 1, 'links': links}
with open(OUT + 'xref.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(xref, ensure_ascii=False, indent=2) + '\n')
print('written')
