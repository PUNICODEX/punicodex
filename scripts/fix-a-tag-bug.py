#!/usr/bin/env python3
"""
Fix the systematic </div>-instead-of-</a> bug across all site temples.

Pattern: <a ...> opens, may contain nested <div>s, but the outer closing
         tag is </div> instead of </a>.

We skip any <a> that already has </a> on the same line (inline links).
"""

import re
from pathlib import Path

SITES_DIR = Path(__file__).parent.parent / "sites"


def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = list(lines)
    file_fixes = []

    # Pass 1: Fix <a ...> blocks that close with </div> instead of </a>
    i = 0
    while i < len(new_lines):
        line = new_lines[i]
        if re.search(r'<a\s+[^>]*>', line) and not re.search(r'<a\s+[^>]*/>', line):
            # SKIP if </a> is on the same line (correct inline link)
            if re.search(r'</a>', line):
                i += 1
                continue

            div_depth = 0
            for j in range(i + 1, min(i + 25, len(new_lines))):
                inner = new_lines[j]
                div_opens = len(re.findall(r'<div\b[^>]*>', inner)) - len(re.findall(r'<div\b[^>]*/>', inner))
                div_closes = len(re.findall(r'</div>', inner))
                a_closes = len(re.findall(r'</a>', inner))

                div_depth += div_opens

                # If we see </a> before any div imbalance, it's correct
                if a_closes > 0 and div_depth >= 0:
                    break

                # Account for </div>
                div_depth -= div_closes

                # If div_depth goes negative, we hit a </div> that closes the <a> block
                if div_depth < 0:
                    stripped = inner.strip()
                    if stripped == '</div>':
                        new_lines[j] = inner.replace('</div>', '</a>', 1)
                        file_fixes.append(f"line {j+1}: </div> -> </a> (closes <a> line {i+1})")
                    break
        i += 1

    # Pass 2: Fix <div> cards (without <a>) that close with </a> instead of </div>
    # Pattern: <div class="related-card"> or <div style="cursor:default...">
    i = 0
    while i < len(new_lines):
        line = new_lines[i]
        is_related_div = (
            re.search(r'<div\s+class="related-card[^"]*"', line) or
            re.search(r'<div\s+style="cursor:default', line)
        )
        if is_related_div and not re.search(r'<a\s', line):
            div_depth = 0
            a_depth = 0
            for j in range(i + 1, min(i + 15, len(new_lines))):
                inner = new_lines[j]
                div_opens = len(re.findall(r'<div\b[^>]*>', inner)) - len(re.findall(r'<div\b[^>]*/>', inner))
                div_closes = len(re.findall(r'</div>', inner))
                a_opens_in = len(re.findall(r'<a\b[^>]*>', inner)) - len(re.findall(r'<a\b[^>]*/>', inner))
                a_closes = len(re.findall(r'</a>', inner))

                div_depth += div_opens
                a_depth += a_opens_in

                if a_closes > 0:
                    a_depth -= a_closes
                    # If we closed an <a> that was NOT opened inside this <div>,
                    # and we're at div_depth 0, this </a> is actually the close for the <div>
                    if a_depth < 0 and div_depth >= 0:
                        stripped = inner.strip()
                        if stripped == '</a>':
                            new_lines[j] = inner.replace('</a>', '</div>', 1)
                            file_fixes.append(f"line {j+1}: </a> -> </div> (closes <div> line {i+1})")
                        break
                    # If a_depth went negative but div_depth is also tracking, reset a_depth
                    if a_depth < 0:
                        a_depth = 0

                div_depth -= div_closes
                if div_depth < 0:
                    break
        i += 1

    if file_fixes:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

    return file_fixes


def main():
    total_sites = 0
    total_fixes = 0
    fixed_sites = []

    for site_dir in sorted(SITES_DIR.iterdir()):
        if not site_dir.is_dir():
            continue
        index_path = site_dir / "index.html"
        if not index_path.exists():
            continue

        fixes = fix_file(index_path)
        if fixes:
            total_sites += 1
            total_fixes += len(fixes)
            fixed_sites.append((site_dir.name, len(fixes), fixes))

    scanned = sum(1 for d in SITES_DIR.iterdir() if d.is_dir())

    print(f"\n{'='*60}")
    print(f"AUDIT & FIX COMPLETE")
    print(f"{'='*60}")
    print(f"Sites scanned:    {scanned}")
    print(f"Sites with fixes: {total_sites}")
    print(f"Total fixes:      {total_fixes}")
    print()

    for name, count, fixes in fixed_sites:
        print(f"  {name}: {count} fix(es)")
        for f in fixes:
            print(f"    - {f}")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
