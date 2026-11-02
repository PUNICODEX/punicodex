from PIL import Image
import colorsys, sys
from collections import Counter
img = Image.open(sys.argv[1]).convert("RGBA")
img.thumbnail((120, 120))
c = Counter()
for r, g, b, a in img.getdata():
    if a > 200:
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        if s > 0.35 and v > 0.25:
            c[(round(h*12), round(s*4), round(v*4))] += 1
if not c:
    print("#D4AF37 #228B22")
    sys.exit()
(h, s, v), n = c.most_common(1)[0]
h, s, v = h/12, min(1, s/4 + 0.15), min(1, v/4 + 0.2)
r, g, b = colorsys.hsv_to_rgb(h, s, v)
h2 = (h + 0.42) % 1.0
r2, g2, b2 = colorsys.hsv_to_rgb(h2, max(0.45, s*0.7), max(0.3, v*0.75))
fmt = lambda x: "#%02X%02X%02X" % tuple(round(i*255) for i in x)
print(fmt((r, g, b)), fmt((r2, g2, b2)))