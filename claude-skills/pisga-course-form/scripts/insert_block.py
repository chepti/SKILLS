"""Insert a heading + table + footer note as raw WordprocessingML immediately
after a given paragraph (by paraId) — e.g. a rubric placed right after the
מטלת סיכום text, without disturbing anything else in an already-filled (and
possibly already hand-edited) form.

Why this exists: a table built with arbitrary cm/dxa widths routinely overflows
the page. These forms are A4 portrait with ~1800 dxa margins on each side
(see references/form-appearance.md for how that number is derived and how to
re-derive it for a different form) — the safe usable width is about 8300 dxa
(~14.6 cm). Guessing widths, as earlier one-off scripts in this skill did,
overflowed the page by 30-60%. This script computes safe widths itself so
that mistake can't recur, and it always writes a real <w:tblGrid>, which is
schema-required — a table missing one makes Word "repair" the file and show
the user a scary corruption warning on open.

Usage:
    python insert_block.py <src.docx> <dst.docx> --after <paraId> --spec block.json

Spec JSON:
{
  "heading": "מחוון הערכה – מטלת סיכום",
  "headers": ["משקל", "קריטריון", "בסיסי", "בינוני", "מיטבי"],
  "col_weights": [0.08, 0.19, 0.24, 0.24, 0.25],   // optional, must sum to ~1;
                                                     //   default is equal columns
  "rows": [
    ["45%", "5 תוצרים", "...", "...", "..."]
  ],
  "footer": "סה\"כ משקלים: 100%"                     // optional
}
"""
import io
import json
import os
import re
import sys
import zipfile

# A4 portrait page width (11906 dxa) minus this form's own left+right margins
# (1800 dxa each, from <w:pgMar>). Re-derive per form with pagesetup logic
# below rather than trusting this constant blindly on a form you haven't
# measured — a landscape section or different margins changes it completely.
DEFAULT_SAFE_WIDTH = 8300

FONT = "David"          # overridden by the spec's optional "font" key
HEAD_FILL = "1B3A5C"
ALT_FILL = "EEF2F6"
ACCENT = "1B3A5C"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def page_usable_width(xml, fallback=DEFAULT_SAFE_WIDTH):
    """Read this document's own <w:pgSz>/<w:pgMar> rather than assuming A4."""
    psz = re.search(r'<w:pgSz\s+w:w="(\d+)"', xml)
    mar = re.search(r'<w:pgMar\b[^>]*w:left="(\d+)"[^>]*/>', xml) or \
        re.search(r'<w:pgMar\b[^>]*/>', xml)
    if not psz or not mar:
        print("WARNING: could not read page geometry; using fallback width %d dxa"
              % fallback)
        return fallback
    left = re.search(r'w:left="(\d+)"', mar.group())
    right = re.search(r'w:right="(\d+)"', mar.group())
    if not left or not right:
        print("WARNING: pgMar missing left/right; using fallback width %d dxa"
              % fallback)
        return fallback
    usable = int(psz.group(1)) - int(left.group(1)) - int(right.group(1))
    # leave a small safety margin — tables that exactly hit the printable edge
    # still sometimes clip in real-world Word rendering
    return usable - 40


def para(text, bold=False, size=30, color=None, align="right", before=240, after=60):
    rpr = ['<w:rFonts w:ascii="%s" w:hAnsi="%s" w:cs="%s"/>' % (FONT, FONT, FONT)]
    if bold:
        rpr.append("<w:b/><w:bCs/>")
    if color:
        rpr.append('<w:color w:val="%s"/>' % color)
    rpr.append('<w:sz w:val="%d"/><w:szCs w:val="%d"/><w:rtl/>' % (size, size))
    rpr = "<w:rPr>%s</w:rPr>" % "".join(rpr)
    return (
        # w:bidi MUST carry an explicit w:val="1" here — a bare <w:bidi/>
        # (relying on the boolean-property default of "true" when the val
        # attribute is absent) renders correctly in some Word versions but
        # NOT reliably in all of them, and the failure mode is exactly what
        # she reported: text quietly comes out left-aligned in an RTL table
        # even though every other RTL signal (bidiVisual, jc=right, the
        # David font, w:rtl on rPr) is present and correct. Every other
        # working script in this skill sets it explicitly; this one didn't,
        # and that was the actual bug — not the jc value, not column order.
        '<w:p><w:pPr><w:bidi w:val="1"/><w:jc w:val="%s"/>'
        '<w:spacing w:before="%d" w:after="%d"/>%s</w:pPr>'
        "<w:r>%s<w:t xml:space=\"preserve\">%s</w:t></w:r></w:p>"
    ) % (align, before, after, rpr, rpr, esc(text))


def cell(text, width, bold=False, size=18, color=None, fill=None, align="right"):
    shd = '<w:shd w:val="clear" w:fill="%s"/>' % fill if fill else ""
    inner = para(text, bold=bold, size=size, color=color, align=align,
                before=20, after=20)
    return (
        '<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s'
        "<w:vAlign w:val=\"center\"/></w:tcPr>%s</w:tc>"
    ) % (width, shd, inner)


def build_table(headers, rows, total_width, col_weights=None):
    n = len(headers)
    if col_weights and abs(sum(col_weights) - 1.0) > 0.02:
        raise ValueError("col_weights must sum to ~1.0, got %r" % col_weights)
    weights = col_weights or [1.0 / n] * n
    widths = [int(total_width * w) for w in weights]
    # rounding can leave a few dxa unassigned; give the remainder to the last column
    widths[-1] += total_width - sum(widths)

    grid = "".join('<w:gridCol w:w="%d"/>' % w for w in widths)
    hdr_cells = "".join(
        cell(h, widths[i], bold=True, size=19, color="FFFFFF", fill=HEAD_FILL,
             align="center")
        for i, h in enumerate(headers)
    )
    body_rows = []
    for i, row in enumerate(rows):
        fill = ALT_FILL if i % 2 == 1 else None
        cells = []
        for j, val in enumerate(row):
            is_first_text_col = j == 1 and n > 2  # convention: col 0 = weight/number
            cells.append(cell(
                str(val), widths[j],
                bold=(j == 0 or is_first_text_col),
                color=ACCENT if is_first_text_col else None,
                fill=fill,
                align="center" if j == 0 else "right",
            ))
        body_rows.append("<w:tr>%s</w:tr>" % "".join(cells))

    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="a4"/><w:bidiVisual/>'
        '<w:tblW w:w="%d" w:type="dxa"/><w:jc w:val="center"/>'
        "<w:tblBorders>"
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        "</w:tblBorders></w:tblPr>"
        # <w:tblGrid> is schema-required. Omitting it is exactly what made Word
        # show a "we found a problem with this content" repair dialog before.
        "<w:tblGrid>%s</w:tblGrid>"
        "<w:tr>%s</w:tr>%s</w:tbl>"
    ) % (total_width, grid, hdr_cells, "".join(body_rows))


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    argv = sys.argv[1:]
    # --after <paraId>: insert right after that paragraph (default use case).
    # --before <paraId>: insert right before it — for a form where the heading
    # that follows the spot you want (e.g. "תכנית המפגשים") is the easiest
    # stable anchor, and the content must land above it, not below.
    mode = "--after" if "--after" in argv else ("--before" if "--before" in argv else None)
    if mode is None or "--spec" not in argv or len(argv) < 6:
        print(__doc__)
        return 1
    src, dst = argv[0], argv[1]
    anchor = argv[argv.index(mode) + 1]
    spec_path = argv[argv.index("--spec") + 1]

    with open(spec_path, encoding="utf-8-sig") as f:
        spec = json.load(f)
    # Optional per-form font (this skill's default, David, suits the Jerusalem
    # form; the Beit Shemesh תשפ"ז template is Tahoma throughout).
    global FONT
    FONT = spec.get("font", FONT)

    with zipfile.ZipFile(src) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    m = re.search(r'<w:p\s[^>]*w14:paraId="%s"[^>]*>.*?</w:p>' % re.escape(anchor),
                  xml, re.S)
    if not m:
        print("ERROR: anchor paraId %s not found. Re-run inspect_form.py "
              "--paragraphs-only to relocate it — the form may have been "
              "edited since you last mapped it." % anchor)
        return 1

    width = page_usable_width(xml)
    print("usable page width for this form: %d dxa" % width)

    pieces = []
    if spec.get("heading"):
        pieces.append(para(spec["heading"], bold=True, size=30, color=ACCENT))
    pieces.append(build_table(spec["headers"], spec["rows"], width,
                              spec.get("col_weights")))
    if spec.get("footer"):
        pieces.append(para(spec["footer"], size=18, before=60, after=200))
    block = "".join(pieces)

    insert_at = m.start() if mode == "--before" else m.end()
    new_xml = xml[:insert_at] + block + xml[insert_at:]

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
            if item.filename == "word/document.xml":
                data = new_xml.encode("utf-8")
            zout.writestr(item, data)

    print("inserted block (%d table rows) %s paraId %s"
          % (len(spec["rows"]), "before" if mode == "--before" else "after", anchor))
    print("wrote:", dst)
    return 0


if __name__ == "__main__":
    sys.exit(main())
