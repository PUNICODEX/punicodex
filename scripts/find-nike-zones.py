import urllib.request
import json
import os

token = os.environ['CLOUDFLARE_API_TOKEN']
headers = {'Authorization': f'Bearer {token}'}

req = urllib.request.Request('https://api.cloudflare.com/client/v4/zones?per_page=100', headers=headers)
resp = urllib.request.urlopen(req)
zones = json.loads(resp.read())['result']

found = []
for z in zones:
    zid = z['id']
    zname = z['name']
    req2 = urllib.request.Request(f'https://api.cloudflare.com/client/v4/zones/{zid}/dns_records', headers=headers)
    resp2 = urllib.request.urlopen(req2)
    records = json.loads(resp2.read())['result']
    for r in records:
        name = r['name']
        if 'nik' in name.lower() or 'nk-' in name.lower():
            found.append((zname, zid, name, r['type'], r['content'], r['proxied']))
            break

with open('scripts/nike-zones.txt', 'w', encoding='utf-8') as f:
    for zname, zid, name, rtype, content, proxied in found:
        f.write(f'{zname} ({zid}): {name} {rtype} -> {content} proxied={proxied}\n')

print(f'Found {len(found)} Nike-related zones. Written to scripts/nike-zones.txt')
