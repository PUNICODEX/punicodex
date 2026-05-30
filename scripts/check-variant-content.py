import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

domains = ['xn--aphrodt-dza75a.com', 'xn--aplln-1ta64d.com']
for d in domains:
    try:
        req = urllib.request.Request(f'https://{d}', headers={'User-Agent':'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        html = resp.read(3000).decode('utf-8', errors='replace')
        title = re.search(r'<title>(.*?)</title>', html, re.I)
        print(f'{d}: {resp.getcode()}')
        print(f'  Title: {title.group(1) if title else "NO TITLE"}')
    except Exception as e:
        print(f'{d}: ERR {type(e).__name__}')
