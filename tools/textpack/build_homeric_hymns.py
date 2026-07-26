"""Build platform/texts/homeric-hymns/{eng.json,xref.json} from PG 348
(Evelyn-White 1914 Loeb), lines covering THE HOMERIC HYMNS (I-XXXIII).

- One section per hymn (33). Hymn III keeps its internal sub-heading
  "To Pythian Apollo" as a paragraph.
- Strips: (ll. N-M) line-range markers, 25xx footnote reference digits,
  PG boilerplate (outside slice). Lacuna lines normalized to "* * * * *".
- Titles case-normalized ("II. To Demeter"); ids numbered to stay unique
  (two hymns each to Dionysus, Aphrodite, Hermes, Athena, Hestia,
  Demeter, Artemis, the Dioscuri).
"""
import json, re

SRC = 'C:/projects/punycodex/platform/texts/homeric-hymns/src/eng-raw.txt'
OUT = 'C:/projects/punycodex/platform/texts/homeric-hymns/'

raw = open(SRC, encoding='utf-8').read().replace('\r\n', '\n').replace('\r', '\n')
lines = raw.split('\n')

start = max(i for i, l in enumerate(lines) if l.strip() == 'THE HOMERIC HYMNS')
end = next(i for i, l in enumerate(lines) if i > start and l.strip().startswith('HOMER’S EPIGRAMS'))
print('hymns region lines', start + 1, '..', end + 1)
region = lines[start + 1:end]

HEADER = re.compile(r'^([IVXLC]+)\.\s+TO\s+(.+?)(\s+25\d{2})?\s*$')
PYTHIAN = re.compile(r'^TO PYTHIAN APOLLO—?\s*$')
LL = re.compile(r'^\(ll\. [\d,\s\-–a-zA-Z]+\)\s*')
FN = re.compile(r'\s?25\d{2}(?=[\s,.;:;’”—)]|$)')
LACUNA = re.compile(r'^(\*\s+){3,}\*$')

def titlecase(s):
    small = {'of', 'the', 'and', 'in', 'to'}
    words = s.lower().split(' ')
    out = []
    for k, w in enumerate(words):
        if k > 0 and w in small:
            out.append(w)
        else:
            out.append('-'.join(p.capitalize() for p in w.split('-')))
    return ' '.join(out)

def clean_block(txt):
    txt = LL.sub('', txt)
    # lacuna markers: standalone -> asterisks, inline ".... ((LACUNA)) ...." -> single ellipsis
    txt = re.sub(r'\.{3,}\s*\(\(LACUNA\)\)\s*\.{3,}', '…', txt)
    txt = txt.replace('((LACUNA))', '* * *')
    txt = FN.sub('', txt)
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt

hymns = []  # (roman, deity, [blocks])
cur = None
buf = []

def flush_buf():
    global buf
    if cur is None:
        buf = []
        return
    txt = ' '.join(l.strip() for l in buf if l.strip())
    buf = []
    txt = clean_block(txt)
    if txt:
        cur[2].append(txt)

for l in region:
    s = l.strip()
    m = HEADER.match(s)
    if m:
        flush_buf()
        if cur:
            hymns.append(cur)
        cur = [m.group(1), m.group(2), []]
        continue
    if PYTHIAN.match(s):
        flush_buf()
        cur[2].append('To Pythian Apollo')
        continue
    if cur is None:
        continue
    if LACUNA.match(s):
        flush_buf()
        cur[2].append('* * * * *')
        continue
    if not s:
        flush_buf()
        continue
    buf.append(l)
flush_buf()
if cur:
    hymns.append(cur)
print('hymns parsed:', len(hymns))

def slugify(s):
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

ROMAN_NUM = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
             'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18,
             'XIX': 19, 'XX': 20, 'XXI': 21, 'XXII': 22, 'XXIII': 23, 'XXIV': 24, 'XXV': 25,
             'XXVI': 26, 'XXVII': 27, 'XXVIII': 28, 'XXIX': 29, 'XXX': 30, 'XXXI': 31,
             'XXXII': 32, 'XXXIII': 33}

sections = []
for roman, deity, blocks in hymns:
    n = ROMAN_NUM[roman]
    sid = f'{n:02d}-to-{slugify(deity)}'
    title = f'{roman}. To {titlecase(deity)}'
    text = '\n\n'.join(blocks)
    sections.append({'id': sid, 'title': title, 'text': text})
    print(sid, '|', title, '|', len(blocks), 'blocks', len(text), 'chars')

corpus = {'lang': 'eng', 'sections': sections}
with open(OUT + 'eng.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')

corpus_text = '\n'.join(s['text'] for s in sections)

def attested(form):
    return re.search(r'(?<![\w\u0300-\u036f])' + re.escape(form) + r'(?![\w\u0300-\u036f])', corpus_text) is not None

CANDIDATES = {
    'zeus': ['Zeus'], 'hera': ['Hera'], 'poseidon': ['Poseidon'], 'demeter': ['Demeter'],
    'athena': ['Athene', 'Athena', 'Pallas'], 'apollon': ['Apollo', 'Phoebus', 'Phoibos'],
    'artemis': ['Artemis'], 'ares': ['Ares'], 'aphrodite': ['Aphrodite', 'Cytherea', 'Cypris'],
    'hephaistos': ['Hephaestus'], 'hermes': ['Hermes'], 'hestia': ['Hestia'],
    'dionysos': ['Dionysus', 'Bacchus', 'Iacchus'], 'persephone': ['Persephone', 'Kore', 'Proserpine'],
    'hades': ['Hades', 'Aidoneus'], 'hekate': ['Hecate'], 'kronos': ['Cronos', 'Kronos'],
    'rhea': ['Rhea'], 'leto': ['Leto'], 'iris': ['Iris'], 'helios': ['Helios', 'Helius'],
    'selene': ['Selene', 'Mene'], 'eos': ['Eos'], 'gaia': ['Gaia', 'Gaea', 'Earth'],
    'ouranos': ['Uranus', 'Ouranos'], 'okeanos': ['Ocean', 'Oceanus'],
    'eros': ['Eros'], 'herakles': ['Heracles', 'Herakles'], 'asklepios': ['Asclepius', 'Asklepios'],
    'prometheus': ['Prometheus'], 'atlas': ['Atlas'], 'delos': ['Delos'], 'delphoi': ['Delphi', 'Pytho'],
    'olympos': ['Olympus'], 'styx': ['Styx'], 'mnemosyne': ['Mnemosyne'], 'typhon': ['Typhon', 'Typhoeus'],
    'aither': ['Aether'], 'erebus': ['Erebus'], 'nike': ['Nike'],
    'theia': ['Theia'], 'coeus': ['Coeus', 'Koios'],
    'pegasos': ['Pegasus'], 'python': ['Python'], 'midas': ['Midas'],
    'odysseus': ['Odysseus'], 'iason': ['Jason'],
    'troia': ['Troy', 'Ilium'], 'orpheus': ['Orpheus'],
    'achilleus': ['Achilles'], 'andromeda': ['Andromeda'], 'cerberus': ['Cerberus'],
}
links = []
for temple, forms in CANDIDATES.items():
    if not forms:
        continue
    ok = [f for f in forms if attested(f)]
    if ok:
        links.append({'temple': temple, 'forms': ok})
        print(temple, ok)
xref = {'version': 1, 'links': links}
with open(OUT + 'xref.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(xref, ensure_ascii=False, indent=2) + '\n')
print('written', len(links), 'temples')
