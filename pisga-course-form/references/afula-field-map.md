# Field map — פסג"ה עפולה / מוט צפון form ("טופס בקשה לפתרון למידה במצפן")

A second, structurally different template from the 259-control Jerusalem form.
Verify first: run `inspect_form.py --controls-only` and confirm it reports
**16 total** controls. A different count means a revision of this specific
form; rebuild the map.

## What's genuinely different from the Jerusalem form

- **Only 16 real content controls** (all dropdowns — audience stage, sector,
  supervision type, education type, role, reform track, learning mode,
  tagging, operator type ×1, target-audience scope, language, LMS,
  solution type, grade y/n, payment y/n, one role-specific eligibility list).
  Everything else — name, ID numbers, hours, the whole skills/values matrix,
  and the syllabus itself — is **plain paragraph or table text**, not a
  control. `python-docx`/`fill_form.py`'s `controls` key only covers those 16.
- **Checkboxes are their own paragraphs**, each starting with a literal `☐`
  — not checkboxes living inside a control the way the Jerusalem form's are.
  Tick one with the `paragraphs` spec key: read the paragraph's current text
  and resend it with `☒` replacing the leading `☐`. There are roughly 80 of
  these across a large "ידע / מיומנויות / ערכים" (knowledge / skills /
  values) matrix plus a second "ממדי הערכה לעובד ההוראה" matrix — curate a
  handful that genuinely fit the course's subject matter rather than
  checking broadly; an AI/STEM course checking "שירות משמעותי (צבאי...)" or
  "אורח חיים בריא" reads as padding, unlike the Jerusalem form's deliberately
  wide-open audience checkboxes which were topic-appropriate for *that* course.
- **A real answer-blank paragraph can be completely empty** — no `<w:t>` run
  at all, not even a placeholder one. `fill_form.py`'s `set_text` now handles
  this (appends a new run rather than requiring an existing one to
  overwrite) — this was a gap the first time this form was filled and is now
  fixed in the shared script, not specific to this template.
- **Some paragraphs mix a label with a nested dropdown control** in the same
  paragraph (e.g. `שלב חינוך:` + the control + `במידה והנכם מלמדים...`).
  `inspect_form.py`'s "outside controls" list does **not** exclude these — it
  only excludes a paragraph whose own start sits inside a control, not one
  that merely has a control nested somewhere inside it. Writing the whole
  paragraph as one string here would clobber the control's own run. Run
  `scripts/safety_check.py <xml> <paraId...>` on every paragraph you intend
  to touch before writing to it — it flags exactly this case.
- **The syllabus is a genuine `<w:tbl>`** (table index 8 of 9 in the
  document), not content controls — fill it with `python-docx` cell access
  (`doc.tables[8].rows[i].cells[j]`), matching the RTL/font conventions in
  `references/form-appearance.md`. It has **9 data rows only** (fewer than
  the Jerusalem form's 15), and each row is **one meeting of one type** —
  `סוג מפגש` is a single choice (פא"פ / סנכרוני / א-סנכרוני), not a
  sync+async combo the way the Jerusalem form's rows can be. A course built
  around the Jerusalem template's "2 sync + 1 async per meeting" pattern
  does not port over row-for-row; each meeting collapses to one row of one type.
- **Hard constraint printed right above the table**: "יש לשבץ לפחות 4
  מפגשים פרונטליים (פנ"פ)" — at least 4 rows must be פא"פ. An all-online
  syllabus (like the biweekly Zoom-only STEM course this form was first
  filled from) fails this outright and needs real redesign, not just
  relabeling — decide which meetings genuinely benefit from being in a room
  (openers, hands-on workshops, closing showcases) the same way you would
  for the Jerusalem form's meeting table, and get a real venue name from the
  user rather than inventing one.

## Narrative sections

תקציר / מטרות / נושאי הלימוד / עקרונות למידה / תוצאות מצופות each carry an
explicit **100–300 character** requirement in their own heading text — check
the written length, don't eyeball it.

## Grading-section fields (near the end, before the syllabus)

שם/ת.ז/השכלה/תחום התמחות of the **בודק העבודה** (work assessor), and a
submission deadline recommended as "10 ימים מסיום המפגש האחרון" — compute
that from whatever the syllabus's actual final meeting date ends up being,
after any drop/reorder, not from a first draft.
