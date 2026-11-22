# How a filled form is supposed to look

These forms get opened in real Word by a real person, sometimes hand-edited,
sometimes printed. A filled control that reads correctly in `inspect_form.py`
but overflows the page, misaligns, or triggers Word's "we found a problem
with this content" repair dialog is not actually done. This file exists
because both were shipped once — a rubric table 30-60% wider than the page,
and a table missing a schema-required element — before this file did.

## Page geometry — measure it, don't assume it

The Jerusalem/Manchi תשפ"ו form (and forms with a similar structure) are **A4
portrait**, not landscape:

```
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1440" w:right="1800" w:bottom="1276" w:left="1800" .../>
```

Usable content width = `11906 − 1800 − 1800 = 8306` dxa (twentieths of a
point) ≈ 5.77 in ≈ 14.65 cm. **Any table you add — a rubric, an appendix,
anything — must total no more than about 8300 dxa.** A table built with
`Cm()` widths chosen by eye routinely blows past this: six columns at
`Cm(4.4)` alone is already 19.4 cm, well over the 14.65 cm budget.

Don't hardcode 8306 for a form you haven't measured — pull the real numbers
with a one-liner against the specific file:

```python
import re, zipfile
xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8")
pgsz = re.search(r'<w:pgSz\s+w:w="(\d+)"', xml)
pgmar = re.search(r'<w:pgMar\b[^>]*/>', xml)
```

`scripts/insert_block.py` does exactly this automatically before building any
table — use it rather than a bespoke script with eyeballed widths.

## `<w:tblGrid>` is not optional

A `<w:tbl>` without a `<w:tblGrid>` (one `<w:gridCol>` per column, matching
the column widths) is invalid per the OOXML schema. Word does not reject it —
it silently "repairs" the file and shows the user a dialog implying their
document is corrupted, which is a terrible thing to hand someone. Every raw
table you hand-build needs `<w:tblGrid>` with real `<w:gridCol w:w="..."/>`
entries summing to the table's own `<w:tblW>`.

## RTL and font conventions already in use

Match what the surrounding form already does, so an inserted block doesn't
visually stick out:

- `<w:bidiVisual/>` on `<w:tblPr>` — right-to-left column order
- `<w:bidi/>` on every `<w:pPr>` — right-to-left paragraph direction
- `<w:jc w:val="right"/>` (or `"center"` for numeric/short cells)
- `rFonts w:ascii="David" w:hAnsi="David" w:cs="David"` on every run
- `<w:rtl/>` inside `<w:rPr>` alongside the font
- Header row: white text (`FFFFFF`) on a dark fill (this skill's convention:
  `1B3A5C`), body rows alternating white/`EEF2F6` for scanability

## Two ways to insert a table — pick based on where it goes

**At the very end of the document** (after everything, own page): use
python-docx directly (`doc.add_page_break()`, `doc.add_table()` with `Cm()`
widths chosen to sum under the page budget). python-docx generates a correct
`<w:tblGrid>` for you automatically, so this path never hits that bug.

**In the middle of the document** (e.g. a rubric that must sit right after
the מטלת סיכום text, not at the end): python-docx can only append at the
body's end, so this needs raw XML string-splicing at the target paragraph's
`</w:p>`. Use `scripts/insert_block.py` for this — it measures the real page
width, builds a schema-valid table, and inserts it at a `paraId` anchor
without touching anything else in the file (safe to run on a form the user
has already hand-edited in Word).

## Every script's `sys.stdout` rebind must live inside `main()`

Every script here rewraps `sys.stdout` in a UTF-8 `TextIOWrapper` so Hebrew
prints correctly on Windows consoles. Do this **inside `main()`**, guarded by
`if __name__ == "__main__":`, never at module level. A module-level rebind
runs the moment the file is *imported*, not just when it's run — and the
moment another script does `from plan_dates import holiday_flags` (exactly
the kind of reuse this skill's reference docs encourage), that import closes
the *importing* script's own stdout out from under it, and every later
`print()` anywhere in the process raises `ValueError: I/O operation on closed
file`. This has broken two different scripts in this skill already
(`plan_dates.py`, `clean_header.py`) the first time something tried to import
them rather than run them as a subprocess — check any new script against
this before considering it finished.

## Locating an anchor paragraph

A paragraph you want to insert after may be a genuine top-level body
paragraph even when `python-docx`'s `document.paragraphs` doesn't list it —
that property only walks *direct* children of `<w:body>`, and most
paragraphs in these forms sit inside tables or content controls that hide
them from it. Trust `inspect_form.py --paragraphs-only`'s "BODY PARAGRAPHS
OUTSIDE CONTROLS" report instead — it correctly finds a paragraph as long as
it isn't nested inside a `<w:sdt>`, regardless of what `python-docx` sees.

## Adapting the form for a different Pisga center's district

The Jerusalem/Manchi form carries content specific to that district that
does **not** generalize to other regions:

- the מרכז פסג"ה dropdown's option list (seven Jerusalem-district centers only)
- the "לאיזה מחוז" checkboxes (מחוז ירושלים / מנח"י / ארצי — no southern,
  northern, central, etc. option exists)
- the contact-info table at the very end (the same seven centers)
- the closing "בברכת שנת לימודים... צוותי מרכזי פסג\"ה מחוז ירושלים ומחוז
  העיר ירושלים" line
- the named district supervisor (לימור שנטמן) in the special-approval note

For a school outside this district, write the real Pisga-center name as free
text into the dropdown control anyway (fill_form.py will warn that the value
doesn't match the list — that warning is expected and harmless here, since
the goal is a document a human reads values off of to enter into Mitzpan by
hand, not a live interactive dropdown) and remove the contact table and the
district-specific closing/supervisor text with a raw string-splice (find the
table's span with the same stack-based `<w:tbl>`/`</w:tbl>` matching
`fill_form.py` and `inspect_form.py` already use, delete it, delete the
paragraph introducing it). Don't try to rebuild the dropdown's own
`<w:listItem>` entries to add the new center by name — leave the list as-is
and rely on the free-text override; rewriting a dropdown's item list is far
more failure-prone than it looks and buys nothing here.

## Meeting-row topics vs. genuine flexibility

When the actual content of a self-study slot is the learner's free choice
(e.g. "pick 6 of these 9 units") but the form still wants one concrete title
per row for Mitzpan's sake, give each row a real, specific title anyway — a
row that says "יחידת בחירה" conveys nothing to whoever reads the form later.
State the flexibility once, clearly, in the surrounding descriptive text
(a "תקציר" or "נושאי לימוד" line), not by hollowing out every row title.
