"""Fill a .docx form made of Word content controls, from a JSON spec.

Why this exists: these forms have hundreds of <w:sdt> content controls and no
plain text fields. Editing document.xml naively breaks the file — the runs are
split, the placeholder styling has to be cleared or Word keeps showing grey
placeholder text, and date/dropdown controls carry their own stored value that
must be updated alongside the visible text. This script handles all of that so
the filled document still opens cleanly and stays editable in Word.

Spec format (JSON):
{
  "expect_controls": 259,          // optional guard: fail if the count differs,
                                   //   which means you're pointed at a different
                                   //   revision of the form than you mapped
  "checks": [2, 6, "41-49"],       // controls to tick: ☐ becomes ☒
                                   //   ints or inclusive "a-b" range strings
  "controls": {
    "0":  "26/07/2026",            // plain string = the text to show
    "1":  "מעלה אדומים",            // dropdown: must match an option exactly
    "5":  {"value": "..."},        // long form, same thing
    "16": "02/11/2026"             // date control: fullDate is derived from
  },                               //   dd/mm/yyyy automatically
  "paragraphs": {
    "3DE8B978": "1. ..."           // free-text body paragraph, keyed by paraId
  }
}

Any control or paragraph value may contain literal "\n" — each one becomes a
real line break (<w:br/>) in the same run, so a dense multi-part answer (a
task description with several distinct requirements, a rubric criterion list)
renders as actual separate lines in Word instead of one run-on sentence.

A "paragraphs" value can target a genuinely empty paragraph too — a heading
followed by blank lines meant for a written answer, common in forms that
aren't built from content controls at all. There is no existing <w:t> to
overwrite there, so a brand-new run is appended before the paragraph closes.

Usage:
    python fill_form.py <blank.docx> <filled.docx> --spec spec.json
    python fill_form.py <blank.docx> <filled.docx> --spec spec.json --allow-missing-para
"""

import io
import json
import os
import re
import sys
import zipfile

WT = re.compile(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", re.S)
CHECKED = "☒"        # ☒
DATE_RE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})$")


def esc(s):
    # `"` must also be escaped, even for values that only ever land in text
    # content (w:t) — the same escaped value is reused for XML *attributes*
    # (w:lastValue="..."). Hebrew text is full of literal quote characters
    # (גרשיים, e.g. פסג"ה) that silently corrupt the file the moment such a
    # value is written into an attribute rather than an element's text.
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))


def find_controls(xml):
    stack, out = [], []
    for m in re.finditer(r"<w:sdt>|</w:sdt>", xml):
        if m.group() == "<w:sdt>":
            stack.append(m.start())
        else:
            if not stack:
                continue
            out.append((stack.pop(), m.end()))
    out.sort()
    return out


def set_text(fragment, value):
    """Put `value` in the fragment's first <w:t>, blank the rest.

    Blanking the later runs matters because Word splits placeholder text across
    several runs (e.g. "לחץ כאן להזנת טקסט" + "."); leaving them would append
    stray fragments after the real value.

    A '\\n' in `value` becomes a real <w:br/> inside that same run, so a spec
    author can write a value as several lines (e.g. one line per bullet of a
    rubric or task description) and have it actually render as separate lines
    in Word — a wall-of-text single-run paragraph reads as one run-on sentence
    no matter how many dashes or "part A / part B" markers it contains.
    """
    n = [0]

    def repl(_m):
        n[0] += 1
        if n[0] == 1:
            parts = str(value).split("\n")
            pieces = ['<w:t xml:space="preserve">%s</w:t>' % esc(parts[0])]
            for p in parts[1:]:
                pieces.append("<w:br/>")
                pieces.append('<w:t xml:space="preserve">%s</w:t>' % esc(p))
            return "".join(pieces)
        return "<w:t/>"

    out = WT.sub(repl, fragment)
    if n[0] == 0:
        # A genuinely empty answer-blank paragraph (<w:p ...>...</w:p> with a
        # <w:pPr> but no run at all) has no <w:t> for WT to find. This is a
        # common pattern — a heading followed by blank lines to write an
        # answer into — so rather than refuse, insert a brand-new run just
        # before the paragraph's closing tag. Only valid when `fragment` is
        # itself one whole paragraph (true for every caller of set_text:
        # fill_control's <w:sdt> bodies always carry an existing <w:t>, so
        # this path only fires from the paragraphs mechanism in main()).
        if not fragment.rstrip().endswith("</w:p>"):
            raise ValueError("control has no <w:t> run to write into, and "
                              "fragment is not a whole paragraph to append a run to")
        parts = str(value).split("\n")
        pieces = ['<w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>'
                  % esc(parts[0])]
        for p in parts[1:]:
            pieces.append("<w:r><w:br/></w:r>")
            pieces.append('<w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>'
                          % esc(p))
        insert = "".join(pieces)
        idx = fragment.rfind("</w:p>")
        out = fragment[:idx] + insert + fragment[idx:]
    return out


def fill_control(body, value):
    # Drop the placeholder flag, or Word renders the value as grey placeholder
    # text and clears it the moment the user clicks the field.
    body = body.replace("<w:showingPlcHdr/>", "")

    # Date controls store the machine-readable date separately from the text.
    m = DATE_RE.match(str(value).strip())
    if m and "<w:date" in body:
        iso = "%04d-%02d-%02dT00:00:00Z" % (int(m.group(3)), int(m.group(2)), int(m.group(1)))
        body = re.sub(r'(<w:date\b[^>]*?)\s*w:fullDate="[^"]*"', r"\1", body)
        body = re.sub(r"<w:date\b", '<w:date w:fullDate="%s"' % iso, body, count=1)

    # A w14 checkbox control keeps its on/off state in <w14:checked w14:val>
    # SEPARATELY from the ☒/☐ glyph it displays. Writing only the glyph shows
    # the right symbol, but the first click in Word then "toggles" from the
    # stale stored state and appears to do nothing (or to un-tick the wrong
    # way). Keep the two in step.
    if "<w14:checkbox>" in body and str(value) in (CHECKED, "☐"):
        want = "1" if str(value) == CHECKED else "0"
        body = re.sub(r'(<w14:checked w14:val=")[01](")', r"\g<1>%s\2" % want, body)

    # Dropdowns remember the selected option in w:lastValue.
    if "<w:dropDownList" in body:
        def fix(mm):
            attrs = re.sub(r'\s*w:lastValue="[^"]*"', "", mm.group(2))
            return "%s%s w:lastValue=\"%s\">" % (mm.group(1), attrs, esc(value))
        body = re.sub(r"(<w:dropDownList\b)((?:(?!>).)*)>", fix, body, count=1)

    return set_text(body, value)


def expand_indices(items):
    out = []
    for it in items:
        if isinstance(it, int):
            out.append(it)
            continue
        s = str(it).strip()
        if "-" in s:
            a, b = s.split("-", 1)
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(s))
    return out


def validate_dropdown(body, value, idx, warnings):
    opts = re.findall(r'<w:listItem[^>]*w:displayText="([^"]*)"', body)
    if not opts:
        return
    plain = [o.replace("&quot;", '"').replace("&amp;", "&") for o in opts]
    if value not in plain:
        warnings.append(
            "control %d is a dropdown and %r is not one of its options: %s"
            % (idx, value, plain))


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    argv = sys.argv[1:]
    if "--spec" not in argv or len(argv) < 4:
        print(__doc__)
        return 1
    src, dst = argv[0], argv[1]
    spec_path = argv[argv.index("--spec") + 1]
    allow_missing_para = "--allow-missing-para" in argv

    # utf-8-sig, not utf-8: PowerShell's `Out-File -Encoding utf8` always writes a
    # BOM, and json.load rejects it outright. Tolerating it here saves a baffling
    # "Unexpected UTF-8 BOM" failure every time a spec is written from a shell.
    with open(spec_path, encoding="utf-8-sig") as f:
        spec = json.load(f)

    with zipfile.ZipFile(src) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    blocks = find_controls(xml)
    expected = spec.get("expect_controls")
    if expected is not None and len(blocks) != expected:
        print("ERROR: form has %d content controls, spec expects %d." % (len(blocks), expected))
        print("       The field map you built no longer matches this file.")
        print("       Re-run inspect_form.py and rebuild the spec.")
        return 1

    # index -> value
    values = {}
    for raw, v in (spec.get("controls") or {}).items():
        values[int(raw)] = v["value"] if isinstance(v, dict) else v
    for i in expand_indices(spec.get("checks") or []):
        values[i] = CHECKED

    warnings = []
    for i in sorted(values):
        if not 0 <= i < len(blocks):
            print("ERROR: control index %d is out of range (0-%d)" % (i, len(blocks) - 1))
            return 1
        body = xml[blocks[i][0]:blocks[i][1]]
        if values[i] != CHECKED:
            validate_dropdown(body, values[i], i, warnings)

    # Apply back-to-front so earlier offsets stay valid.
    for i in sorted(values, reverse=True):
        s, e = blocks[i]
        try:
            xml = xml[:s] + fill_control(xml[s:e], values[i]) + xml[e:]
        except ValueError as err:
            print("ERROR: control %d: %s" % (i, err))
            return 1

    # Free-text body paragraphs, addressed by paraId.
    para_done, para_missing = 0, []
    for pid, text in (spec.get("paragraphs") or {}).items():
        m = re.search(r'<w:p\s[^>]*w14:paraId="%s"[^>]*>.*?</w:p>' % re.escape(pid), xml, re.S)
        if not m:
            para_missing.append(pid)
            continue
        try:
            xml = xml[:m.start()] + set_text(m.group(), text) + xml[m.end():]
        except ValueError:
            para_missing.append(pid + " (paragraph has no run to write into)")
            continue
        para_done += 1

    if para_missing and not allow_missing_para:
        print("ERROR: these paraIds were not found or not writable: %s" % ", ".join(para_missing))
        print("       Re-run inspect_form.py --paragraphs-only to get current ids.")
        return 1

    # Well-formedness check before we ship a file Word might refuse to open.
    try:
        import xml.etree.ElementTree as ET
        ET.fromstring(xml.encode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print("ERROR: produced XML is not well-formed: %s" % err)
        return 1

    if os.path.exists(dst):
        os.remove(dst)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = xml.encode("utf-8")
            zout.writestr(item, data)

    for w in warnings:
        print("WARNING: %s" % w)
    if para_missing:
        print("WARNING: skipped paraIds: %s" % ", ".join(para_missing))
    print("controls filled: %d   paragraphs filled: %d" % (len(values), para_done))
    print("wrote: %s" % dst)
    print("Now run inspect_form.py on the output to read back what landed in each field.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
