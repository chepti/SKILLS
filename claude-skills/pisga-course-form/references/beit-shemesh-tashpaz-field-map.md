# Field map — פסג"ה בית שמש "בקשה לפתרון למידה במערכת מצפן לשנה"ל תשפ"ז"

A third distinct template (after the 259-control Jerusalem/Manchi form and the
16-control Afula form). Signed "צוות פסג"ה בית שמש" at the bottom. Verify:
`inspect_form.py --controls-only` reports **20 total** controls, and
`fill_legacy.py list` reports **168 FORMTEXT fields**. A different count means
a different revision — re-list and rebuild this map.

## What is different

- Only the **20 checkboxes** are content controls (w14 checkboxes). Everything
  else — name, hours, every narrative box, every meeting row — is an
  **old-style Word text form field** (`begin / FORMTEXT / separate / result /
  end` runs). `fill_form.py` cannot see them; use **`scripts/fill_legacy.py`**
  (`list` to map, `fill` with `{"fields": {"<index>": "text"}}`).
- The document is unprotected, so a field's result text is just replaceable.
- The label comes **before** its checkbox ("אופק ☐"), unlike what the
  inspector's "text after" column suggests.
- One checkbox is **pre-ticked in the blank form**: control 11 (רב גילי). Leave
  it, or set it to "☐" deliberately — don't assume the blank is all-empty.
- No "מקום/אופן" option for fully-online: "אופן הלמידה" offers only
  **פנים אל פנים / היברידי**. A fully online course ticks היברידי.
- Page is A4 with **1080 dxa side margins** (usable ≈ 9700 dxa, not 8300) and
  **Tahoma** throughout — pass `"font": "Tahoma"` in an `insert_block` spec.

## Checkbox controls (use fill_form.py `checks`)

| idx | label | idx | label |
|---|---|---|---|
| 0 | אופק | 10 | חט"ע |
| 1 | עוז | 11 | רב גילי *(pre-ticked)* |
| 2 | פנים אל פנים | 12 | חינוך רגיל |
| 3 | היברידי | 13 | חינוך מיוחד |
| 4 | 15 שעות (עוז בלבד) | 14 | כלל עובדי ההוראה |
| 5 | 30 שעות | 15 | קהל יעד מוגדר בלבד |
| 6 | 60 שעות | 16 | עם ציון |
| 7 | קדם יסודי | 17 | ללא ציון |
| 8 | יסודי | 18 | מודל: כן |
| 9 | חט"ב | 19 | מודל: לא |

`fill_form.py` keeps the hidden `w14:checked` state in step with the ☒/☐ glyph.

## Legacy text fields (use fill_legacy.py `fields`)

| index | field |
|---|---|
| 0 / 1 / 2 | רכז הקורס: שם / נייד / מייל |
| 3 | שם פתרון הלמידה |
| 4 | "ציין מי קהל היעד" (only when control 15 is ticked) |
| 5–8, 9–12, 13–16 | מרצה חיצוני 1 / 2 / 3: שם / ת.ז / טלפון / מייל |
| 17–28 | מרצה פנימי 1–3, same four fields |
| 29 / 30 | מספר משתתפים: מינימום / מקסימום |
| 31 | תקציר (**100–300 chars** — count it) |
| 32–35 | מטרות 1–4 |
| 36–39 | נושאי לימוד 1–4 |
| 40–44 | עקרונות למידה 1–5 |
| 45–47 | תוצאות מצופות 1–3 |
| 48 + 8·m (m = 0..14) | **meeting m+1**, eight fields, in this order: +0 תאריך, +1 נושא, +2 שם המרצה, +3 שעות מרצה מתוקצבות, +4 אופי המפגש (סוג), +5 היכן מתקיים, +6 בין השעות, +7 ש' אקדמאיות |

15 meeting slots (48…167). Leave unused blocks wholly untouched.

## Outside the fields

- The **מטלת סיום** answer has no field: it is the empty paragraph `13802AF7`
  (fill with the `paragraphs` key of fill_form.py; run `safety_check.py` first).
  The form says "send the rubric as an attachment or link" — a rubric can
  instead be placed in the body with
  `insert_block.py --before 0DC34D02 ...` (the "תכנית המפגשים" heading),
  which lands it between the task and the schedule.
- The header holds the center's logo image (5 MB) — it is the *right* center
  here, unlike the Jerusalem form for a school elsewhere; leave it.

## Order of operations

```
fill_legacy.py fill  blank.docx  s1.docx --spec legacy.json
fill_form.py         s1.docx     s2.docx --spec form.json      # checks + task paragraph
insert_block.py      s2.docx     out.docx --before 0DC34D02 --spec rubric.json
```
