import re, sys, time, urllib.request, os

BASE = 'https://www.sacred-texts.com/hin/rigveda/rv%02d%03d.htm'
COUNTS = {1:191, 2:43, 3:62, 4:58, 5:87, 6:75, 7:104, 8:103, 9:114, 10:191}
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml'}
os.makedirs('rvhymns', exist_ok=True)

def fetch(url, tries=6):
    for t in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read().decode('utf-8', 'replace')
            if 'Just a moment' in data or len(data) < 3000:
                time.sleep(6 + 3*t)
                continue
            return data
        except Exception as e:
            time.sleep(6 + 3*t)
    return None

todo = []
for m, cnt in COUNTS.items():
    for h in range(1, cnt+1):
        path = 'rvhymns/rv%02d%03d.htm' % (m, h)
        if not (os.path.exists(path) and os.path.getsize(path) > 3000):
            todo.append((m, h, path))

print('to download:', len(todo), flush=True)
done = 0
for m, h, path in todo:
    url = BASE % (m, h)
    data = fetch(url)
    if data is None:
        print('FAILED', url, flush=True)
    else:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(data)
        done += 1
        if done % 50 == 0:
            print('progress', done, '/', len(todo), flush=True)
    time.sleep(0.35)
print('DONE', done, 'of', len(todo), flush=True)
