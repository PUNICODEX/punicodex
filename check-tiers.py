import re
content = open('js/archetypes-v2.js', encoding='utf-8').read()
tiers = re.findall(r'tier:\s*"([^"]+)".*?tierDetail:\s*"([^"]+)"', content, re.DOTALL)
from collections import Counter
print('Tier + tierDetail distribution:')
for (t, td), count in sorted(Counter(tiers).items()):
    print(f'  tier={t}, tierDetail={td}: {count}')
