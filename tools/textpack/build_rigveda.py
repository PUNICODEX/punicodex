"""Build platform/texts/rig-veda/{eng.json,xref.json} from the per-hymn pages
scraped from sacred-texts.com/hin/rigveda/ (Griffith 1896 translation).

- One section per Mandala; each hymn = heading paragraph + verse paragraph.
- Verse lines joined with spaces; verse numbers kept inline as in source.
- HTML entities decoded to the translator's Unicode forms (Sūrya, Vāyu,
  Aśvins, Vṛtra, Ṛṣi, ...).
- rv01179 (Rati): keep only the verse paragraph; drop JBH editorial notes
  and commentary paragraphs (translator-apparatus rule).
"""
import glob, html, json, re, sys

SRCDIR = 'C:/projects/punycodex/tools/textpack/rvhymns/'
OUT = 'C:/projects/punycodex/platform/texts/rig-veda/'
COUNTS = {1: 191, 2: 43, 3: 62, 4: 58, 5: 87, 6: 75, 7: 104, 8: 103, 9: 114, 10: 191}
ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

def roman_to_int(s):
    vals = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}
    total = 0
    for a, b in zip(s, s[1:] + 'I'):
        total += -vals[a] if vals[a] < vals[b] else vals[a]
    return total

def clean(t):
    t = html.unescape(t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def parse_hymn(path):
    t = open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'<h3[^>]*>(.*?)</h3>', t, re.S)
    title = clean(re.sub(r'<[^>]+>', '', m.group(1)))  # "HYMN XL. Indra. Sūrya. Atri."
    i = t.find('</h3>')
    j = t.find('<HR>', i)
    seg = t[i:j] if j > 0 else t[i:]
    ps = re.findall(r'<p[^>]*>(.*?)</p>', seg, re.S)
    paras = []
    for p in ps:
        p = re.sub(r'<br\s*/?>', '\n', p)
        p = re.sub(r'<[^>]+>', '', p)
        p = html.unescape(p)
        p = re.sub(r'[ \t]+', ' ', p)
        p = ' '.join(l.strip() for l in p.split('\n') if l.strip())
        if not p:
            continue
        paras.append(p)
    # rv01179: only the paragraph starting with verse number 1 is body text
    if 'rv01179' in path:
        paras = [p for p in paras if re.match(r'^1\s', p)]
    return title, paras

assert html.unescape('&#151;') == '\u2014', 'entity mapping check'

sections = []
total_hymns = 0
for m in range(1, 11):
    paras = []
    for h in range(1, COUNTS[m] + 1):
        path = SRCDIR + 'rv%02d%03d.htm' % (m, h)
        title, vparas = parse_hymn(path)
        mm = re.match(r'HYMN ([IVXLCl]+)\.?\s*(.*)', title)
        if not mm:
            raise SystemExit('bad hymn title: ' + path + ' :: ' + title)
        rn, deity = mm.group(1).replace('l', 'I'), mm.group(2).strip()
        # rv07074 quirk: "HYMN I.XXIV. Aśvins." — drop the second garbled numeral
        deity = re.sub(r'^[IVXLCl]+\.\s*', '', deity)
        num = roman_to_int(rn)
        if num != h:
            print(f'  numbering mismatch tolerated: {path}: roman {rn}={num} != file hymn {h}')
        num = h  # filename is authoritative
        deity = deity.rstrip('.')
        head = f'Hymn {num}.' + (f' {deity}.' if deity else '')
        paras.append(head)
        if not vparas:
            raise SystemExit('no verses: ' + path)
        paras.append(' '.join(vparas))
        total_hymns += 1
    text = '\n\n'.join(paras)
    sections.append({'id': 'mandala-%02d' % m,
                     'title': f'Mandala {ROMANS[m-1]} (Hymns 1\u2013{COUNTS[m]})',
                     'text': text})
    print('mandala', m, 'hymns', COUNTS[m], 'chars', len(text))
print('total hymns:', total_hymns)

corpus = {'lang': 'eng', 'sections': sections}
with open(OUT + 'eng.json', 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')

corpus_text = '\n'.join(s['text'] for s in sections)

def attested(form):
    return re.search(r'(?<![\w\u0300-\u036f])' + re.escape(form) + r'(?![\w\u0300-\u036f])', corpus_text) is not None

CANDIDATES = {
    'surya': ['Sūrya', 'Surya', 'SŪRYA'],
    'vac': ['Vāc', 'Vac', 'Vach', 'Vāk'],
    'rta': ['Ṛta', 'Rita', 'Rta'],
    'prajapati': ['Prajāpati', 'Prajapati'],
    'dhatr': ['Dhātṛ', 'Dhatr', 'Dhātar', 'Dhaţri'],
    'pusan': ['Pūṣan', 'Pushan', 'Pūshan', 'Pusan'],
    'tvastr': ['Tvaṣṭar', 'Tvaṣṭṛ', 'Tvashtar', 'Tvashtri', 'Tvaṣṭri', 'Tvastar'],
    'amsa': ['Aṃśa', 'Amsa', 'Anśa'],
    'varuna': ['Varuṇa', 'Varuna'],
    'daksa': ['Dakṣa', 'Daksha'],
    'shiva': ['Rudra', 'Śiva', 'Siva'],
    'saraswati': ['Sarasvatī', 'Saraswati', 'Sarasvati'],
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
