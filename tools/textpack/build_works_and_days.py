"""Build platform/texts/works-and-days/{eng.json,xref.json} from PG 348
(Evelyn-White 1914 Loeb), the HESIOD'S WORKS AND DAYS poem only
(ll. 1-828; the Hesiodic fragments that follow in the ebook are excluded).

- 11 thematic sections with scholarly block titles; each (ll. N-M) block
  becomes one paragraph with the marker stripped.
- Strips 13xx footnote reference digits (series assigned to W&D in PG 348).
"""
import json, re

SRC = 'C:/projects/punycodex/platform/texts/works-and-days/src/eng-raw.txt'
OUT = 'C:/projects/punycodex/platform/texts/works-and-days/'

raw = open(SRC, encoding='utf-8').read().replace('\r\n', '\n').replace('\r', '\n')
lines = raw.split('\n')

start = max(i for i, l in enumerate(lines) if l.strip() == 'HESIOD’S WORKS AND DAYS')
end = next(i for i, l in enumerate(lines) if i > start and l.strip() == 'THE DIVINATION BY BIRDS')
print('W&D region lines', start + 1, '..', end + 1)
region = lines[start + 1:end]

# clean PG placeholders and re-break lines with a mid-line (ll.) marker
clean = []
for l in region:
    l = l.replace('{[0-9]}', '')
    mm = re.search(r'\(ll\. \d', l)
    if mm and mm.start() > 0:
        clean.append(l[:mm.start()])
        clean.append(l[mm.start():])
    else:
        clean.append(l)
region = clean

LLM = re.compile(r'^\(ll\. (\d+)[a-z]?-(\d+)[a-z]?\)\s*')
FN = re.compile(r'\s?13\d{2}(?=[\s,.;:;’”—)]|$)')

# collect blocks: (start_line, end_line, [paras]); an (ll.) block may span
# several blank-line-separated paragraphs — only a new (ll.) marker closes it
blocks = []
cur = None
buf = []   # lines of current paragraph within block

def flush_para():
    global buf
    if cur is None or not buf:
        buf = []
        return
    txt = ' '.join(l.strip() for l in buf if l.strip())
    buf = []
    txt = FN.sub('', txt)
    txt = re.sub(r'\s+', ' ', txt).strip()
    if txt:
        cur[2].append(txt)

def flush_block():
    flush_para()
    if cur is not None and cur[2]:
        blocks.append(tuple(cur))

for l in region:
    s = l.strip()
    m = LLM.match(s)
    if m:
        flush_block()
        cur = [int(m.group(1)), int(m.group(2)), []]
        rest = s[m.end():]
        buf = [rest] if rest else []
        continue
    if not s:
        flush_para()
        continue
    if cur is not None:
        buf.append(l)
flush_block()
blocks = [(a, b, ps) for a, b, ps in blocks]
print('blocks parsed:', len(blocks), 'coverage:', blocks[0][0], '-', blocks[-1][1])

SECTIONS = [
    ('proem', 'Proem', 1, 10),
    ('two-strifes', 'The Two Strifes', 11, 41),
    ('prometheus-and-pandora', 'Prometheus and Pandora', 42, 105),
    ('five-ages', 'The Five Ages', 106, 201),
    ('hawk-and-nightingale', 'The Hawk and the Nightingale', 202, 212),
    ('justice', 'Justice and Prosperity', 213, 285),
    ('work', 'The Blessings of Work', 286, 382),
    ('farmers-year', 'The Farmer’s Year', 383, 617),
    ('seafaring', 'Seafaring', 618, 694),
    ('precepts', 'Precepts for Right Living', 695, 764),
    ('days', 'Lucky and Unlucky Days', 765, 828),
]
sections = []
for sid, title, lo, hi in SECTIONS:
    paras = [p for a, b, ps in blocks if lo <= a <= hi for p in ps]
    if not paras:
        raise SystemExit('empty section ' + sid)
    text = '\n\n'.join(paras)
    sections.append({'id': sid, 'title': title, 'text': text})
    print(sid, '|', title, '|', len(paras), 'paras', len(text), 'chars')

corpus = {'lang': 'eng', 'sections': sections}
with open(OUT + 'eng.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')

corpus_text = '\n'.join(s['text'] for s in sections)

def attested(form):
    return re.search(r'(?<![\w\u0300-\u036f])' + re.escape(form) + r'(?![\w\u0300-\u036f])', corpus_text) is not None

CANDIDATES = {
    'zeus': ['Zeus'], 'prometheus': ['Prometheus'], 'demeter': ['Demeter'],
    'athena': ['Athene', 'Athena', 'Pallas'], 'aphrodite': ['Aphrodite'],
    'hermes': ['Hermes'], 'hephaistos': ['Hephaestus'], 'kronos': ['Cronos'],
    'hera': ['Hera'], 'ares': ['Ares'], 'apollon': ['Apollo', 'Phoebus'],
    'poseidon': ['Poseidon'], 'hades': ['Hades', 'Aidoneus'], 'persephone': ['Persephone'],
    'okeanos': ['Ocean', 'Oceanus'], 'eos': ['Eos'], 'helios': ['Helios', 'Helius'],
    'iris': ['Iris'], 'artemis': ['Artemis'], 'dionysos': ['Dionysus'],
    'olympos': ['Olympus'], 'gaia': ['Gaia', 'Earth'], 'ouranos': ['Uranus', 'Ouranos'],
    'hekate': ['Hecate'], 'rhea': ['Rhea'], 'leto': ['Leto'], 'selene': ['Selene'],
    'atlas': ['Atlas'], 'styx': ['Styx'], 'erebus': ['Erebus'], 'hypnos': ['Hypnos', 'Sleep'],
    'thanatos': ['Thanatos', 'Death'], 'hemera': ['Hemera'], 'aither': ['Aether'],
    'nike': ['Nike'], 'tyche': ['Tyche'], 'troia': ['Troy'],
}
links = []
for temple, forms in CANDIDATES.items():
    ok = [f for f in forms if attested(f)]
    if ok:
        links.append({'temple': temple, 'forms': ok})
        print(temple, ok)
xref = {'version': 1, 'links': links}
with open(OUT + 'xref.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(xref, ensure_ascii=False, indent=2) + '\n')
print('written', len(links), 'temples')
