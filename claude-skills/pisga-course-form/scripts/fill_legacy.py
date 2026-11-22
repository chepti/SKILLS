"""Fill (and list) the legacy FORMTEXT form fields used by the פסג"ה בית שמש
תשפ"ז template, where everything except ~20 checkboxes is an old-style Word
"text form field" (a begin / FORMTEXT / separate / result / end run chain), NOT
a content control. fill_form.py cannot see these at all.

Two commands:

  python fill_legacy.py list <form.docx>
      Prints every FORMTEXT field with its global index and where it sits
      (table / row / cell, the label text around it, and — for meeting
      tables — which "מפגש N" block it belongs to). Use it to build a map.

  python fill_legacy.py fill <src.docx> <dst.docx> --spec spec.json
      spec.json: {"fields": {"0": "text", "5": "text", ...},
                  "expect_fields": 168}
      Replaces each field's *result* runs (the part between "separate" and
      "end") with one run holding the text. A literal "\\n" becomes a real
      line break. Fields you don't name are left exactly as they were —
      a half-filled meeting block reads as a mistake, so leave whole
      untouched blocks alone.

Fields are indexed in document order, so an index is only meaningful for the
exact template revision it was listed from — "expect_fields" turns a revised
template into an immediate error instead of values landing in the wrong boxes.
The tick-boxes in this form are ordinary w14 checkbox content controls and
ARE handled by fill_form.py ("checks"); use both scripts, fill_legacy first,
on the same file chain (each reads a docx and writes a docx).
"""
import io
import json
import os
import re
import sys
import zipfile

WT = re.compile(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", re.S)

# A run may or may not carry its own <w:rPr> before the field char.
RUNHEAD = r'<w:r\b[^>]*>(?:<w:rPr>(?:(?!</w:rPr>).)*</w:rPr>)?\s*'

# begin-run ... FORMTEXT ... separate-run | result runs | end-run
FIELD = re.compile(
    r'(' + RUNHEAD + r'<w:fldChar w:fldCharType="begin">(?:(?!</w:r>).)*?</w:r>'
    r'(?:(?!<w:fldChar w:fldCharType="end").)*?FORMTEXT'
    r'(?:(?!<w:fldChar w:fldCharType="separate").)*?'
    r'<w:fldChar w:fldCharType="separate"/>\s*</w:r>)'
    r'(.*?)'
    r'(' + RUNHEAD + r'<w:fldChar w:fldCharType="end"/>\s*</w:r>)',
    re.S,
)

def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def visible(frag):
    return re.sub(r"\s+", " ", "".join(WT.findall(frag))).strip()


def result_run(value, rpr=""):
    parts = str(value).split("\n")
    body = '<w:t xml:space="preserve">%s</w:t>' % esc(parts[0])
    for p in parts[1:]:
        body += '<w:br/><w:t xml:space="preserve">%s</w:t>' % esc(p)
    # w:rtl so Hebrew keeps right-to-left run behaviour like the surrounding text
    if not rpr:
        rpr = "<w:rPr><w:rtl/></w:rPr>"
    elif "<w:rtl/>" not in rpr:
        rpr = rpr.replace("</w:rPr>", "<w:rtl/></w:rPr>")
    return "<w:r>%s%s</w:r>" % (rpr, body)


def read_xml(path):
    with zipfile.ZipFile(path) as z:
        return z.read("word/document.xml").decode("utf-8")


def cmd_list(path):
    x = read_xml(path)
    # context: table/row/cell for each field, via position lookup
    tbls, stack = [], []
    for m in re.finditer(r"<w:tbl>|</w:tbl>", x):
        if m.group() == "<w:tbl>":
            stack.append(m.start())
        else:
            tbls.append((stack.pop(), m.end()))
    tbls.sort()

    def locate(pos):
        for ti, (s, e) in enumerate(tbls):
            if s <= pos <= e:
                t = x[s:e]
                rel = pos - s
                for ri, rm in enumerate(re.finditer(r"<w:tr\b.*?</w:tr>", t, re.S)):
                    if rm.start() <= rel <= rm.end():
                        for ci, cm in enumerate(re.finditer(r"<w:tc>.*?</w:tc>", rm.group(), re.S)):
                            if rm.start() + cm.start() <= rel <= rm.start() + cm.end():
                                return ti, ri, ci
                        return ti, ri, -1
                return ti, -1, -1
        return -1, -1, -1

    n = 0
    for m in FIELD.finditer(x):
        ti, ri, ci = locate(m.start())
        # label = visible text of the enclosing paragraph (other than the field)
        ps = x.rfind("<w:p ", 0, m.start())
        pe = x.find("</w:p>", m.end())
        label = visible(x[ps:pe])
        print("#%-4d T%d R%d C%d | %r" % (n, ti, ri, ci, label[:70]))
        n += 1
    print("total FORMTEXT fields:", n)


def cmd_fill(src, dst, spec_path):
    with open(spec_path, encoding="utf-8-sig") as f:
        spec = json.load(f)
    values = {int(k): v for k, v in (spec.get("fields") or {}).items()}
    x = read_xml(src)

    total = len(FIELD.findall(x))
    expected = spec.get("expect_fields")
    if expected is not None and total != expected:
        print("ERROR: form has %d FORMTEXT fields, spec expects %d — wrong "
              "template revision; re-run `list` and rebuild the map." % (total, expected))
        return 1
    bad = [i for i in values if not 0 <= i < total]
    if bad:
        print("ERROR: field indices out of range (0-%d): %s" % (total - 1, bad))
        return 1

    counter = [-1]

    def repl(m):
        counter[0] += 1
        i = counter[0]
        if i in values:
            first = re.search(r"<w:rPr>(?:(?!</w:rPr>).)*</w:rPr>", m.group(2), re.S)
            return (m.group(1)
                    + result_run(values[i], first.group(0) if first else "")
                    + m.group(3))
        return m.group(0)

    new_xml = FIELD.sub(repl, x)

    import xml.etree.ElementTree as ET
    try:
        ET.fromstring(new_xml.encode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print("ERROR: produced XML is not well-formed: %s" % err)
        return 1

    if os.path.exists(dst):
        os.remove(dst)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = new_xml.encode("utf-8")
            zout.writestr(item, data)
    print("fields filled: %d of %d" % (len(values), total))
    print("wrote:", dst)
    return 0


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "list":
        cmd_list(a[1])
        return 0
    if len(a) >= 5 and a[0] == "fill" and "--spec" in a:
        return cmd_fill(a[1], a[2], a[a.index("--spec") + 1])
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main())
