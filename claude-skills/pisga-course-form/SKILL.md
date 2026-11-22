---
name: pisga-course-form
description: >-
  Fill in a פסג"ה / Pisga course-request form ("טופס בקשה להקמת פתרון למידה",
  טופס בקשה לפתרון למידה, טופס השתלמות) — the Word .docx forms Israeli teachers
  submit to open a professional-development course (השתלמות / פיתוח מקצועי),
  including planning the syllabus (סילבוס), laying out the meeting dates,
  and doing the academic-hour (שעות אקדמיות) arithmetic. Use this whenever the
  user mentions פסג"ה, השתלמות, פתרון למידה, מצפן, גמול, שעות אקדמיות, a course
  syllabus for teachers, or asks to fill a course-opening form — and also
  whenever they hand over a .docx form whose fields turn out to be Word content
  controls rather than plain text, since the same scripts here are what make
  such a form fillable at all. Prefer this skill over editing the .docx by hand
  or with a generic docx library; those approaches silently break the form.
---

# Pisga course-request forms

These forms are the gate between a teacher's course idea and an approved,
funded course. They are Word documents built **entirely out of content controls**
(`<w:sdt>` — dropdowns, date pickers, checkboxes, click-here-to-type fields),
often 250+ of them, plus a few free-text paragraph areas. There is almost no
plain text to edit, which is why ordinary approaches fail: `python-docx` cannot
address content controls, and hand-editing `document.xml` leaves grey
placeholder styling that Word wipes the moment the user clicks a field.

Two things matter most in the result. First, **the arithmetic has to close** —
the meeting hours must sum to the requested total, because that is the first
thing the Pisga checks and a mismatch bounces the form. Second, **do not invent
answers to administrative questions** (budget source, expected enrolment,
contact person). A wrong guess there costs the user a rejected submission;
a blank you flagged costs them one sentence of thought.

## Workflow

### 1. Read everything in the folder first

Look at the blank form **and any previously filled forms sitting beside it**
(`.docx`, or `.pdf` exports). Those prior submissions are worth more than any
instruction here: they show the user's voice, how they phrase objectives, how
they handled ambiguous fields, and which options actually got approved. Extract
text from PDFs with `pypdf` (`pip install pypdf`) if needed.

### 2. Map the form's fields

```bash
python scripts/inspect_form.py <blank-form.docx>
```

This prints every content control in document order with its index, kind, and
the visible text just before and after it — that surrounding text is what
identifies the field. It also prints every dropdown's option list, and the
free-text body paragraphs with their `paraId`.

If the inspector reports **259 controls**, this is the unified תשפ"ו
Jerusalem/Manchi form and `references/field-map-259.md` already has the whole
map — read it and skip re-deriving. Any other count means a different revision;
build the map from the inspector output.

Do not trust visual reading order for checkbox groups. Two-column layouts
interleave the indices (in the תשפ"ו form, `בין 30-40` comes before `בין 25-30`).
Read the inspector's "text after" column for every checkbox you tick.

### 3. Plan the schedule and close the arithmetic

```bash
python scripts/plan_dates.py hours --academic 3 --start 16:30      # -> 19:00
python scripts/plan_dates.py schedule --start 2026-11-02 --count 10 --every 14
```

An academic hour is 45 minutes **plus a 15-minute break after every 90 minutes**,
so 3 academic hours is 2:30, not 2:15. The `hours` subcommand does this
correctly; see `references/pisga-rules.md` for the table and the structural
limits (asynchronous meetings are capped at 4 academic hours, etc.).

The `schedule` subcommand flags Jewish holidays and school breaks. Israeli
school holidays move against the Gregorian calendar every year, so this is a
real check, not a formality — and never tell the user the dates avoid holidays
unless the script actually verified it (it says so loudly when `pyluach` is
missing).

Write out the hour breakdown explicitly when you present the plan, e.g.
"4 face-to-face × 3 + 3 asynchronous × 4 + 3 synchronous × 2 = 30". The user can
check your reasoning at a glance, and stating it catches your own slips.

### 4. Ask the open questions in ordinary conversation

Write the questions as plain prose in your reply — **not** with `AskUserQuestion`.
These forms raise a dozen small interlocking decisions at once (reform track,
budget source, target audience, enrolment band, meeting rhythm), and a
multiple-choice widget forces them into a shape that does not fit. The user
wants to answer them in a sentence, skip the ones that do not matter, and say
"everything broad" once.

Ask well: propose a sensible default for each question so the user can just
agree, and group related items. Then act on what you get — if the user says
"it's all broad and doesn't much matter", that is a real delegation, so decide
and move on rather than asking again.

### 5. Draft the substantive content

The narrative sections (תקציר, מטרות, נושאי לימוד, עקרונות ומרכיבים,
תוצאות מצופות, מטלת סיכום) are yours to write, following the prior forms' voice.
Keep each numbered item to the two sentences the form asks for, make objectives
measurable, and keep the sections consistent with the syllabus you just built —
an approver reading the objectives should recognise the meetings.

For the syllabus itself, think about which meetings genuinely need to be in the
room. Openers that build the group, hands-on workshops where people get stuck,
and closing product presentations earn face-to-face time; tool walkthroughs
don't. Say why you assigned them that way — the reasoning is what the user
evaluates, and it is what they will defend to the Pisga.

### 6. Fill and verify

Write a spec JSON (schema in `scripts/fill_form.py`'s docstring;
`assets/example-spec.json` is a complete real one), then:

```bash
python scripts/fill_form.py <blank.docx> <filled.docx> --spec spec.json
python scripts/inspect_form.py <filled.docx>          # read back what landed
```

Put `"expect_controls": N` in the spec. It turns "the form was revised and every
index shifted" from a silently mangled document into an immediate error.

For repetitive tables, generate the spec with a short throwaway script rather
than typing 150 JSON entries — and have it assert the hour total before writing,
so a wrong sum fails loudly instead of reaching the user.

`fill_form.py` validates dropdown values against the real option lists, derives
date-control values from `dd/mm/yyyy`, and refuses to emit malformed XML. Then
re-inspect the output: reading the values back is the only check that catches an
index that pointed at the wrong field.

### 7. Hand over with the gaps named

State plainly what you left blank and why, and flag anything you noticed that
the user should verify before submitting — a stale contact-person table, a form
issued for a different Hebrew year than the course falls in, an enrolment band
you picked on thin evidence. Leave unused table rows completely untouched; a
half-filled row reads as a mistake.

### 8. Adding a rubric or any other block after the fact

If she asks for a scoring rubric (or any table) added into a form — whether a
fresh one or one already filled and hand-edited — read
`references/form-appearance.md` first and use `scripts/insert_block.py`. Both
exist because a hand-picked column width routinely overflows the page by
30-60%, and a hand-built `<w:tbl>` missing `<w:tblGrid>` makes Word show the
user a false "this file is corrupted" dialog on open. Both mistakes were
shipped once; the fix is now load-bearing infrastructure, not a one-off.

### 9. Adapting the form for a different Pisga center's district

The 259-control form is Jerusalem/Manchi-specific — its מרכז פסג"ה dropdown
only lists that district's seven centers, and it carries a district-specific
contact table and closing line. A school in another district still shares
"a similar file structure" (her words), so reuse the same template rather
than starting over, but read the district-adaptation section of
`references/form-appearance.md` before touching it — free-text-override the
center-name dropdown (accept the resulting harmless warning) rather than
trying to rebuild its option list, and strip the contact table and
district-specific closing text with the same stack-based `<w:tbl>` matching
`inspect_form.py` already uses.

Some districts hand out a genuinely different template rather than a
reskinned Jerusalem form — check the control count before assuming. The
Afula/מוט צפון form is one of these (16 controls, not 259): its checkboxes
are plain paragraphs rather than living inside controls, its syllabus is a
real table instead of content controls with only 9 rows and a hard "≥4
face-to-face meetings" rule, and some paragraphs mix a label with a nested
control in a way `inspect_form.py`'s paragraph list doesn't flag on its own.
Read `references/afula-field-map.md` if the form you're holding matches that
shape, and run `scripts/safety_check.py` on every paragraph before writing to
it whenever a form isn't the familiar 259-control one.

A third distinct template exists: the **Beit Shemesh תשפ"ז** form (20 controls,
all of them checkboxes; everything else is old-style FORMTEXT fields). Run
`scripts/fill_legacy.py list <form>` — if it reports 168 fields, read
`references/beit-shemesh-tashpaz-field-map.md`. Count the controls *and* the
legacy fields before choosing a path: a form can look like it has "no
fields" to `inspect_form.py` and still be fillable.

## Bundled files

- `scripts/fill_legacy.py` — list and fill old-style FORMTEXT text fields (Beit Shemesh תשפ"ז form)
- `references/beit-shemesh-tashpaz-field-map.md` — field map for that template

- `scripts/inspect_form.py` — map controls, dropdown options, and free-text paragraphs
- `scripts/fill_form.py` — apply a spec JSON to the form, safely
- `scripts/plan_dates.py` — `schedule` (dates + holiday flags), `hours` (academic-hour math)
- `scripts/insert_block.py` — insert a heading+table+footer (e.g. a rubric) at a paraId anchor, with page-width-safe, schema-valid table XML
- `scripts/safety_check.py` — verify a paraId has no control nested inside it before whole-paragraph text replacement touches it
- `references/pisga-rules.md` — hour table, form constraints, dropdown vocabularies, centre contacts, the user's standing details
- `references/field-map-259.md` — cached field map for the 259-control תשפ"ו form
- `references/afula-field-map.md` — field map for the 16-control Afula/מוט צפון template — a genuinely different form, not a reskin
- `references/form-appearance.md` — page geometry, table-width budget, RTL/font conventions, and how to adapt the form for a different district
- `assets/example-spec.json` — a complete worked spec for that form

Requires `pyluach` for holiday checking and `pypdf` only if reading PDF examples.
