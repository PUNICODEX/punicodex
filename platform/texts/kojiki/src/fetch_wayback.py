#!/usr/bin/env python3
"""Fetch sacred-texts.com pages through the Wayback Machine (raw id_ mode).

usage: python fetch_wayback.py <base-url-with-{p}> <outdir> page1 page2 ...
Skips pages already cached in <outdir>; retries with backoff; accepts a page
when the payload looks like a full HTML document.
"""
import os
import sys
import time
import urllib.request

TS = '20190320062420'  # known-good snapshot era for sacred-texts.com

base_tpl, outdir, pages = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(outdir, exist_ok=True)

def looks_complete(data):
    up = data.upper()
    return b'<BODY' in up and (b'</BODY>' in up or b'</HTML>' in up)

failed = []
for p in pages:
    url = base_tpl.format(p=p)
    way = f'https://web.archive.org/web/{TS}id_/{url}'
    out = f'{outdir}/{p}.html'
    if os.path.exists(out) and os.path.getsize(out) > 1500:
        print(f'{p}: cached', flush=True)
        continue
    ok = False
    for attempt in range(8):
        try:
            req = urllib.request.Request(way, headers={'User-Agent': 'Mozilla/5.0 (corpus research)'})
            data = urllib.request.urlopen(req, timeout=120).read()
            if looks_complete(data):
                open(out, 'wb').write(data)
                print(f'{p}: {len(data)} bytes', flush=True)
                ok = True
                break
            raise ValueError(f'incomplete ({len(data)}b)')
        except Exception as e:
            wait = min(30, 2 * (attempt + 1) ** 2)
            print(f'{p}: attempt {attempt+1} failed: {e}; sleep {wait}s', flush=True)
            time.sleep(wait)
    if not ok:
        failed.append(p)
    time.sleep(1.0)
print('FAILED PAGES:', failed if failed else 'none')
