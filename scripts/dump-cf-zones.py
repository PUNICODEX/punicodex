import urllib.request
import json
import os

token = os.environ['CLOUDFLARE_API_TOKEN']
headers = {'Authorization': f'Bearer {token}'}

req = urllib.request.Request('https://api.cloudflare.com/client/v4/zones?per_page=100', headers=headers)
resp = urllib.request.urlopen(req)
zones = json.loads(resp.read())['result']

out = []
for z in zones:
    zid = z['id']
    zname = z['name']
    req2 = urllib.request.Request(f'https://api.cloudflare.com/client/v4/zones/{zid}/dns_records', headers=headers)
    resp2 = urllib.request.urlopen(req2)
    records = json.loads(resp2.read())['result']
    out.append(f'=== {zname} ({zid}) ===')
    for r in records:
        name = r['name']
        rtype = r['type']
        content = r['content']
        proxied = r['proxied']
        out.append(f'  {name:40s} {rtype:6s} -> {content:30s} proxied={proxied}')
    out.append('')

with open('scripts/all-cf-zones.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f'Wrote {len(zones)} zones to scripts/all-cf-zones.txt')
