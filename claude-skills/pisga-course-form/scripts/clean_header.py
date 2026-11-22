"""Strip a district-specific logo and district-mentioning text out of a
form's page header (word/header1.xml etc.), for a school outside that
district. Two things live in the top header of the Jerusalem/Manchi form:
a ministry/district logo image, and the text "משרד החינוך מחוז ירושלים והעיר
ירושלים" — both need to go for a school elsewhere; the generic form title
("טופס בקשה להקמת פתרון למידה (השתלמות)") stays.

Operates at the individual <w:t>...</w:t> element level, NOT whole
<w:r>...</w:r> runs — the district phrase and the form title turned out to
share the same run in this header (adjacent <w:t> elements inside one <w:r>,
with no run break between them despite reading as two unrelated sentences),
so dropping whole runs the first time this script was written silently ate
the title too. A <w:t> is blanked only if its OWN text contains the district
word; sibling <w:t> elements in the same run are untouched. Drawings
(<w:drawing>, and the VML <w:pict> fallback some Word versions pair with it)
are removed outright — a header logo is never something to keep, whichever
district it names.

Usage:
    python clean_header.py <src.docx> <dst.docx> [--part word/header1.xml]
"""
import io
import os
import re
import sys
import zipfile

DEFAULT_PART = "word/header1.xml"
DISTRICT_WORD = "ירושלים"


def strip_drawings(xml):
    n = 0

    def repl(_m):
        nonlocal n
        n += 1
        return ""

    xml = re.sub(r"<w:drawing>.*?</w:drawing>", repl, xml, flags=re.S)
    xml = re.sub(r"<w:pict>.*?</w:pict>", repl, xml, flags=re.S)
    return xml, n


def strip_district_text(xml):
    """Blank each <w:t>...</w:t> element whose OWN text mentions the
    district — keeping the tags (and any attributes) so nothing else about
    the run changes — without touching sibling <w:t> elements in the same
    run that don't."""
    n = 0

    def repl(m):
        nonlocal n
        open_tag, text, close_tag = m.group(1), m.group(2), m.group(3)
        if DISTRICT_WORD in text:
            n += 1
            return open_tag + close_tag
        return m.group(0)

    xml = re.sub(r"(<w:t(?:\s[^>]*)?>)(.*?)(</w:t>)", repl, xml, flags=re.S)
    return xml, n


def clean(xml):
    xml, dropped_drawings = strip_drawings(xml)
    xml, dropped_text = strip_district_text(xml)
    return xml, dropped_drawings, dropped_text


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    argv = sys.argv[1:]
    if len(argv) < 2:
        print(__doc__)
        return 1
    src, dst = argv[0], argv[1]
    part = argv[argv.index("--part") + 1] if "--part" in argv else DEFAULT_PART

    with zipfile.ZipFile(src) as z:
        names = z.namelist()
        if part not in names:
            print("ERROR: %s has no part %r. Header parts present: %s"
                  % (src, part, [n for n in names if "header" in n]))
            return 1
        xml = z.read(part).decode("utf-8")

    new_xml, dropped_drawings, dropped_text = clean(xml)

    import xml.etree.ElementTree as ET
    try:
        ET.fromstring(new_xml.encode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print("ERROR: result is not well-formed XML: %s" % err)
        return 1

    if os.path.exists(dst):
        os.remove(dst)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == part:
                data = new_xml.encode("utf-8")
            zout.writestr(item, data)

    print("removed %d drawing(s) and blanked %d district-mentioning text node(s) in %s"
          % (dropped_drawings, dropped_text, part))
    print("wrote:", dst)
    return 0


if __name__ == "__main__":
    sys.exit(main())
