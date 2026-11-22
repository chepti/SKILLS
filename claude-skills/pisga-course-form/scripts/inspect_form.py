"""Inventory a .docx form built from Word content controls.

Prints, in document order:
  1. every content control (<w:sdt>) with its index, kind, current content,
     and the visible text immediately before/after it — that surrounding text
     is what tells you which field the control actually is;
  2. the option lists of every dropdown;
  3. body paragraphs that are NOT inside a control, with their w14:paraId —
     these are the free-text areas (numbered "1. 2. 3." lists, underscore
     rules) that you fill by paraId rather than by control index.

Run this on the blank form before filling, and again on the filled output to
verify. The control indices it prints are exactly the keys fill_form.py expects.

Usage:
    python inspect_form.py <form.docx> [--controls-only] [--paragraphs-only]
"""

import io
import re
import sys
import zipfile

WT = re.compile(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", re.S)
UNESCAPE = [("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'"), ("&amp;", "&")]


def unescape(s):
    for a, b in UNESCAPE:
        s = s.replace(a, b)
    return s


def visible(xml_fragment):
    """Visible text of an XML fragment, whitespace-collapsed."""
    txt = "".join(WT.findall(xml_fragment))
    return re.sub(r"\s+", " ", unescape(txt)).strip()


def read_document_xml(path):
    with zipfile.ZipFile(path) as z:
        return z.read("word/document.xml").decode("utf-8")


def find_controls(xml):
    """All <w:sdt> blocks as (start, end), document order, nesting-aware."""
    stack, out = [], []
    for m in re.finditer(r"<w:sdt>|</w:sdt>", xml):
        if m.group() == "<w:sdt>":
            stack.append(m.start())
        else:
            if not stack:                      # stray close tag; ignore
                continue
            out.append((stack.pop(), m.end()))
    out.sort()
    return out


def control_kind(body):
    if "<w:dropDownList" in body or "<w:comboBox" in body:
        return "dropdown"
    if "<w:date" in body:
        return "date"
    if visible(body) in ("☐", "☒", "☑"):
        return "checkbox"
    return "text"


def dropdown_options(body):
    return [unescape(o) for o in re.findall(r'<w:listItem[^>]*w:displayText="([^"]*)"', body)]


def report_controls(xml, blocks):
    print("=" * 100)
    print("CONTENT CONTROLS  (%d total)" % len(blocks))
    print("Columns: index | kind | <<text before>> | [current content] | <<text after>>")
    print("=" * 100)
    prev_end = 0
    for i, (s, e) in enumerate(blocks):
        before = visible(xml[prev_end:s])[-90:]
        nxt = blocks[i + 1][0] if i + 1 < len(blocks) else len(xml)
        after = visible(xml[e:nxt])[:50]
        body = xml[s:e]
        print("%-4d %-9s <<%s>>  [%s]  <<%s>>" % (
            i, control_kind(body), before, visible(body)[:70], after))
        prev_end = e


def report_dropdowns(xml, blocks):
    print()
    print("=" * 100)
    print("DROPDOWN OPTIONS  (a value you write must match one of these exactly)")
    print("=" * 100)
    seen = set()
    for i, (s, e) in enumerate(blocks):
        opts = dropdown_options(xml[s:e])
        if not opts:
            continue
        key = tuple(opts)
        tag = "" if key not in seen else "   (same list as an earlier control)"
        seen.add(key)
        print("control %d:%s" % (i, tag))
        for o in opts:
            print("    - %s" % o)


def report_paragraphs(xml, blocks):
    """Body paragraphs outside any control, with paraId.

    Word duplicates paragraphs inside <mc:AlternateContent> (a Choice and a
    Fallback copy of the same shape), so a paraId that appears twice lives
    inside a drawing/text box — writing to it is unreliable and it is usually
    a decorative section heading. Paragraphs that appear exactly once are the
    real, fillable body paragraphs. The dup count is printed so you can tell
    them apart at a glance.
    """
    inside = [(s, e) for s, e in blocks]

    def in_control(pos):
        return any(s <= pos < e for s, e in inside)

    counts = {}
    for m in re.finditer(r'w14:paraId="([^"]+)"', xml):
        counts[m.group(1)] = counts.get(m.group(1), 0) + 1

    print()
    print("=" * 100)
    print("BODY PARAGRAPHS OUTSIDE CONTROLS  (free-text areas — fill these by paraId)")
    print('Columns: paraId | copies-in-xml | text        (copies=2 means it sits in a')
    print("         drawing/AlternateContent — prefer paragraphs with copies=1)")
    print("=" * 100)
    for m in re.finditer(r"<w:p\s[^>]*>.*?</w:p>|<w:p\s[^>]*/>", xml, re.S):
        if in_control(m.start()):
            continue
        pid = re.search(r'w14:paraId="([^"]+)"', m.group())
        if not pid:
            continue
        pid = pid.group(1)
        txt = visible(m.group())
        print("%s  x%d  %s" % (pid, counts.get(pid, 1), txt[:110] if txt else "(empty)"))


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if not args:
        print(__doc__)
        return 1
    xml = read_document_xml(args[0])
    blocks = find_controls(xml)
    if "--paragraphs-only" not in flags:
        report_controls(xml, blocks)
        report_dropdowns(xml, blocks)
    if "--controls-only" not in flags:
        report_paragraphs(xml, blocks)
    return 0


if __name__ == "__main__":
    sys.exit(main())
