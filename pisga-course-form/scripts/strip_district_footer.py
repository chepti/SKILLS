"""Strip the Jerusalem/Manchi-specific guidance block, contact table, and
closing line from the 259-control form, producing a generic base usable for a
school in a different district.

Removes, in this order (found by each PARAGRAPH's reconstructed visible text,
not by a raw substring search on the tag-laden XML — Word routinely splits a
sentence across several runs, e.g. around a Hebrew gershayim quote mark, so a
phrase that reads as one string to a human is not contiguous in the raw XML;
searching the raw string directly missed the contact table's own intro label
the first time this script was written):
  1. The "שימו לב לבקשות הבאות..." guidance paragraphs (names the Jerusalem
     district's professional-development supervisor by name — not applicable
     elsewhere, and per her own call this is boilerplate that can go).
  2. The short "טבלת אנשי קשר..." label paragraph plus the seven-center
     contact-info table right after it.
  3. The closing "בברכת שנת לימודים... צוותי מרכזי פסג\"ה מחוז ירושלים
     ומחוז העיר ירושלים" line.

Everything else — every content control, every data field — is left
untouched; this only removes prose/table content that is not itself a field
someone needs to fill in. Run this ONCE per district to produce a reusable
base (see references/form-appearance.md's district-adaptation section), then
fill that base with fill_form.py as usual.

Usage:
    python strip_district_footer.py <blank.docx> <generic-base.docx>
"""
import io
import os
import re
import sys
import zipfile

WT = re.compile(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", re.S)
GUIDANCE_ANCHOR = "לימור שנטמן"
CONTACT_ANCHOR = "טבלת אנשי קשר"
CLOSING_ANCHOR = "בברכת שנת לימודים"
SIMULATION_ANCHOR = "שילוב מפגש סימולציה"   # names two Jerusalem-district staff
                                            # by name, phone and personal email


def visible(fragment):
    """Concatenated <w:t> text of a fragment, whitespace-collapsed — immune
    to a phrase being split across several runs, unlike a raw substring
    search on the tag-laden XML itself."""
    return re.sub(r"\s+", " ", "".join(WT.findall(fragment))).strip()


def iter_paragraphs(xml):
    """(start, end, visible_text) for every top-level <w:p ...>...</w:p>."""
    for m in re.finditer(r"<w:p\b[^>]*>.*?</w:p>|<w:p\b[^>]*/>", xml, re.S):
        yield m.start(), m.end(), visible(m.group())


def find_paragraph_containing(xml, needle):
    for s, e, text in iter_paragraphs(xml):
        if needle in text:
            return s, e
    return None


def find_table_span(xml, inside_pos):
    """Innermost <w:tbl>...</w:tbl> span containing `inside_pos`."""
    stack, tables = [], []
    for m in re.finditer(r"<w:tbl>|</w:tbl>", xml):
        if m.group() == "<w:tbl>":
            stack.append(m.start())
        else:
            s = stack.pop()
            tables.append((s, m.end()))
    containing = [t for t in tables if t[0] <= inside_pos <= t[1]]
    if not containing:
        return None
    return min(containing, key=lambda t: t[1] - t[0])


def find_table_after(xml, pos):
    m = re.search(r"<w:tbl>", xml[pos:])
    if not m:
        return None
    return find_table_span(xml, pos + m.start() + 1)


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    src, dst = sys.argv[1], sys.argv[2]

    with zipfile.ZipFile(src) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    removed = []

    # Each step re-scans the current (already-edited) xml fresh, so the order
    # between independent steps doesn't matter — only that each step finishes
    # its own edit before the next one searches.

    # 0. Optional "simulation session" block — names two specific staff
    #    members at two specific Jerusalem-district centers, with personal
    #    phone numbers and email addresses. Runs from its heading paragraph
    #    to the blank paragraph that follows its last contact line.
    paras = list(iter_paragraphs(xml))
    sim_idx = next((i for i, (_s, _e, t) in enumerate(paras)
                    if t == SIMULATION_ANCHOR), None)
    if sim_idx is not None:
        # The block has an internal blank spacer paragraph partway through
        # (between the request-instructions paragraph and the two named
        # contacts), so stopping at the first blank line cuts the block in
        # half and leaves both contacts' names/emails/phones in place. Two
        # CONSECUTIVE blanks is what actually marks the end of the section
        # (the gap before the next real heading is five blanks wide); cap the
        # scan itself as a safety net in case a form revision removes that
        # gap entirely.
        end_idx = sim_idx
        blank_streak = 0
        for i in range(sim_idx + 1, min(len(paras), sim_idx + 20)):
            end_idx = i
            if paras[i][2] == "":
                blank_streak += 1
                if blank_streak >= 2:
                    end_idx = i - 1
                    break
            else:
                blank_streak = 0
        s, e = paras[sim_idx][0], paras[end_idx][1]
        xml = xml[:s] + xml[e:]
        removed.append("simulation-session block")
    else:
        print("WARNING: simulation-session heading not found — form revision "
              "may have changed its wording, or this form doesn't have it")

    # 3. Closing line.
    hit = find_paragraph_containing(xml, CLOSING_ANCHOR)
    if hit:
        xml = xml[:hit[0]] + xml[hit[1]:]
        removed.append("closing line")
    else:
        print("WARNING: closing-line marker not found — form revision may "
              "have changed its wording")

    # 2. Contact table + its intro label paragraph.
    hit = find_paragraph_containing(xml, CONTACT_ANCHOR)
    if hit:
        intro_start, intro_end = hit
        table = find_table_after(xml, intro_end)
        span = (intro_start, table[1]) if table else (intro_start, intro_end)
        if not table:
            print("WARNING: found the contact-table intro label but no "
                  "<w:tbl> right after it — removed just the label")
        xml = xml[:span[0]] + xml[span[1]:]
        removed.append("contact table (+ its intro line)")
    else:
        print("WARNING: contact-table intro label not found")

    # 1. Guidance paragraphs — from the one naming the supervisor, back to
    #    the nearest preceding "שימו לב" paragraph (itself not a unique
    #    marker — it also introduces unrelated notes elsewhere in the form —
    #    so anchor on the name and walk backward a few paragraphs instead of
    #    searching for "שימו לב" from the top of the document).
    paras = list(iter_paragraphs(xml))
    anchor_idx = next((i for i, (_s, _e, t) in enumerate(paras)
                       if GUIDANCE_ANCHOR in t), None)
    if anchor_idx is not None:
        start_idx = anchor_idx
        for i in range(anchor_idx, max(-1, anchor_idx - 6), -1):
            if "שימו לב" in paras[i][2]:
                start_idx = i
                break
        end_idx = anchor_idx
        for i in range(anchor_idx, min(len(paras), anchor_idx + 6)):
            if "בקשה לאישור" in paras[i][2] or i == anchor_idx:
                end_idx = i
        s, e = paras[start_idx][0], paras[end_idx][1]
        xml = xml[:s] + xml[e:]
        removed.append("guidance block")
    else:
        print("WARNING: guidance-block marker not found")

    import xml.etree.ElementTree as ET
    try:
        ET.fromstring(xml.encode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print("ERROR: result is not well-formed XML: %s" % err)
        return 1

    if os.path.exists(dst):
        os.remove(dst)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = xml.encode("utf-8")
            zout.writestr(item, data)

    print("removed:", ", ".join(removed) if removed else "NOTHING — check warnings above")
    print("wrote:", dst)
    print()
    print("Still present and needing manual attention per school:")
    print("  - מרכז פסג\"ה dropdown still only lists Jerusalem-district centers;")
    print("    write the real center name as free text (fill_form.py will warn,")
    print("    that warning is expected and harmless here).")
    print("  - the מחוז ירושלים/מנח\"י/ארצי checkboxes have no correct option for")
    print("    another district; leave them unchecked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
