# -*- coding: utf-8 -*-
"""Check whether given paraIds are safe for whole-paragraph text replacement.

inspect_form.py's "outside controls" filter only excludes a paragraph whose
OWN start position sits inside a control's span — it does NOT catch a
paragraph that merely has a control nested somewhere inside it (label text +
an <w:sdt> dropdown + more label text, all one paragraph). Overwriting such a
paragraph's first <w:t> would clobber the dropdown's own placeholder run.
This script flags exactly that case before any paragraph gets touched.
"""
import re
import sys

xml = open(sys.argv[1], encoding="utf-8").read()


def find_controls(x):
    stack, out = [], []
    for m in re.finditer(r"<w:sdt>|</w:sdt>", x):
        if m.group() == "<w:sdt>":
            stack.append(m.start())
        else:
            if not stack:
                continue
            out.append((stack.pop(), m.end()))
    out.sort()
    return out


controls = find_controls(xml)

for pid in sys.argv[2:]:
    m = re.search(r'<w:p\s[^>]*w14:paraId="%s"[^>]*>.*?</w:p>' % pid, xml, re.S)
    if not m:
        print("%s  MISSING" % pid)
        continue
    s, e = m.start(), m.end()
    nested = [i for i, (cs, ce) in enumerate(controls) if s <= cs < e]
    print("%s  %s%s" % (pid, "SAFE" if not nested else "UNSAFE",
                        " (contains control %s)" % nested if nested else ""))
