import re, sys
sys.stdout.reconfigure(encoding='utf-8')
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract sia entry
m = re.search(r'id:\s*"sia",([\s\S]*?)(?=^\s+\{)', content, re.MULTILINE)
if m:
    print("=== SIA ENTRY ===")
    print(m.group(0)[:1200])

# Extract maat entry
m2 = re.search(r'id:\s*"maat",([\s\S]*?)(?=^\s+\{)', content, re.MULTILINE)
if m2:
    print("\n=== MAAT ENTRY ===")
    print(m2.group(0)[:1200])
