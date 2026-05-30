from pathlib import Path

files = ['sites/ab/index.html', 'sites/jotunheimr/index.html', 'sites/maa/index.html', 'sites/thor/index.html']
for f_str in files:
    f = Path(f_str)
    content = f.read_bytes()
    for bad in [b'\xc3\xa2\xc2\xb2', b'\xc3\x9a']:
        idx = content.find(bad)
        if idx >= 0:
            ctx = content[max(0,idx-20):idx+len(bad)+20]
            print(f'{f_str}: found {bad.hex()} at {idx}')
            print(f'  Context bytes: {ctx.hex()}')
            try:
                print(f'  Context text: {ctx.decode("utf-8")}')
            except:
                print(f'  Context text: <undecodable>')
            print()
