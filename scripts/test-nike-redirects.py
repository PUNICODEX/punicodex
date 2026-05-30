import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

domains = ['xn--nik-5qa.com', 'xn--nk-fjak.com']
for d in domains:
    try:
        req = urllib.request.Request(f'https://{d}', method='HEAD', headers={'User-Agent':'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        print(f'{d}: {resp.getcode()} (no redirect?)')
        print(f'  URL: {resp.geturl()}')
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', 'none')
        print(f'{d}: {e.code} -> {loc}')
    except Exception as e:
        print(f'{d}: ERR {type(e).__name__}')
