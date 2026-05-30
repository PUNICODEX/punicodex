from pathlib import Path

for site, pat_hex in [('akh', 'c3a1c2b9'), ('maa', 'c3a1c2b8')]:
    f = Path(f'sites/{site}/index.html')
    content = f.read_bytes()
    pat = bytes.fromhex(pat_hex)
    idx = 0
    while True:
        idx = content.find(pat, idx)
        if idx == -1:
            break
        ctx = content[max(0,idx-15):idx+25]
        print(f'{site}: {pat_hex} at {idx}')
        print(f'  hex: {ctx.hex()}')
        print(f'  text: {ctx.decode("utf-8", errors="replace")}')
        print()
        idx += 1
