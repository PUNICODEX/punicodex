import urllib.request
url = 'https://punycodex.com/sites/nike'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = resp.read()

print('Status:', resp.status)
print('Content-Type:', resp.headers.get('Content-Type'))
print('Length:', len(data))

if data[:3] == b'\xef\xbb\xbf':
    print('Has UTF-8 BOM')
else:
    print('No BOM')

idx = data.find(b'<link rel="stylesheet"')
if idx >= 0:
    print('Stylesheet found at byte', idx)
    snippet = data[max(0, idx-20):idx+120]
    print(snippet.decode('utf-8', errors='replace'))
else:
    print('NO stylesheet link found')

idx2 = data.find(b'hero-domain-cta')
print('hero-domain-cta found:', idx2 >= 0)
