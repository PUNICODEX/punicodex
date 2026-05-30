import urllib.request
import json
import os

token = os.environ['CLOUDFLARE_API_TOKEN']
headers = {'Authorization': f'Bearer {token}'}

# Get all zones
req = urllib.request.Request('https://api.cloudflare.com/client/v4/zones?per_page=100', headers=headers)
resp = urllib.request.urlopen(req)
zones = json.loads(resp.read())['result']

out = []
out.append(f'Total zones: {len(zones)}')

# For each zone, get A records
for zone in zones:
    zone_id = zone['id']
    zone_name = zone['name']
    req2 = urllib.request.Request(f'https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?type=A', headers=headers)
    resp2 = urllib.request.urlopen(req2)
    records = json.loads(resp2.read())['result']
    if len(records) > 1:
        out.append(f'\n=== {zone_name} ({len(records)} A records) ===')
        for r in records:
            out.append(f'  {r["name"]:40s} -> {r["content"]:16s} proxied={r["proxied"]}')

# Also check for CNAME records
out.append('\n\n=== CNAME records ===')
for zone in zones:
    zone_id = zone['id']
    zone_name = zone['name']
    req2 = urllib.request.Request(f'https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?type=CNAME', headers=headers)
    resp2 = urllib.request.urlopen(req2)
    records = json.loads(resp2.read())['result']
    if records:
        out.append(f'\n{zone_name}:')
        for r in records:
            out.append(f'  {r["name"]:40s} CNAME -> {r["content"]}')

with open('scripts/cf-variants-report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print('Report written to scripts/cf-variants-report.txt')
