import urllib.request
import re
import ssl

checks = [
    ('xn--zes-9na.com', 'Zeus'),
    ('xn--athn-dpa9l.com', 'Athena'),
    ('xn--apolln-fgb.com', 'Apollon'),
    ('xn--aphrodt-27a8s.com', 'Aphrodite'),
    ('xn--hds-ela5w.com', 'Hades'),
    ('xn--w-4ma.com', 'Shu'),
    ('xn--b-xw3e.com', 'Ab'),
    ('xn--ragnark-fnc.com', 'Ragnarok'),
    ('xn--rr-4ja7b.com', 'Thor'),
    ('xn--lympos-9wa.com', 'Olympus'),
    ('xn--9gg9559c.com', 'Akh'),
    ('xn--m-yw3e.com', 'Maa'),
    ('xn--s-2w3e.com', 'Sia'),
    ('xn--r-2w3e.com', 'Ra'),
    ('xn--inn-2mao.com', 'Odinn'),
    ('xn--herms-lza.com', 'Hermes'),
    ('xn--poseidn-y0a.com', 'Poseidon'),
    ('xn--rs-lia5r.com', 'Ares'),
    ('xn--rtemis-ota.com', 'Artemis'),
    ('xn--dmtr-bvabb.com', 'Demeter'),
    ('xn--hlios-iza.com', 'Helios'),
    ('xn--seln-dvab.com', 'Selene'),
    ('xn--dinysos-m0a.com', 'Dionysos'),
    ('xn--gaa-wma.com', 'Gaia'),
    ('xn--chos-6na.com', 'Chaos'),
    ('xn--pntos-0ta.com', 'Pontos'),
    ('xn--delpho-8va.com', 'Delphoi'),
    ('xn--trtaros-hwa.com', 'Tartaros'),
    ('xn--jtunheimr-07a.com', 'Jotunheimr'),
    ('xn--lfheimr-gwa.com', 'Alfheimr'),
    ('xn--migarr-qwad.com', 'Midgardr'),
    ('xn--athnai-r3a.com', 'Athenai'),
    ('xn--kbe-qxa.com', 'Kobe'),
    ('xn--saka-k3a.com', 'Osaka'),
    ('xn--kyto-m3a.com', 'Kyoto'),
    ('xn--iva-bza.com', 'Siva'),
    ('xn--hra-3qa.com', 'Hera'),
    ('xn--herms-ksa.com', 'Hermes'),
    ('xn--aphrodt-dza75a.com', 'Aphrodite'),
    ('xn--aplln-1ta64d.com', 'Apollon'),
    ('xn--athn-dvab.com', 'Athena'),
    ('xn--promtheus-y0a.com', 'Prometheus'),
    ('xn--m-2w3e.com', 'Maa'),
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = []
for domain, expected in checks:
    try:
        req = urllib.request.Request(f'https://{domain}', headers={'User-Agent':'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        html = resp.read(5000).decode('utf-8', errors='replace')
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else 'NO TITLE'
        match = 'MATCH' if expected.lower() in title.lower() else 'MISMATCH'
        results.append((match, domain, expected, title[:70]))
    except Exception as e:
        results.append(('ERROR', domain, expected, f'{type(e).__name__}: {str(e)[:40]}'))

with open('scripts/domain-check-results.txt', 'w', encoding='utf-8') as f:
    f.write('Status | Domain | Expected | Actual Title\n')
    f.write('-' * 120 + '\n')
    for status, domain, expected, actual in results:
        f.write(f'{status:10s} | {domain:25s} | {expected:12s} | {actual}\n')

print(f'Checked {len(results)} domains. Results written to scripts/domain-check-results.txt')
