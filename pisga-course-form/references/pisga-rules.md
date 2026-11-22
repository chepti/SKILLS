# Pisga course-request rules and domain knowledge

## Academic hours

A Pisga academic hour (שעה אקדמית) is **45 minutes**, and the ministry requires a
**15-minute break after every 90 minutes of content**. So clock time is not
`45 × n`:

| academic hours | clock time | reads as |
|---|---|---|
| 1 | 0:45 | |
| 2 | 1:30 | שעתיים אק' |
| 3 | 2:30 | שעתיים וחצי |
| 4 | 3:15 | שלוש שעות ו-15 דקות |
| 5 | 4:15 | |
| 6 | 5:00 | |
| 7 | 6:00 | |
| 8 | 6:45 | |

Formula: `minutes = 45n + 15 × floor((n−1)/2)`. Use
`scripts/plan_dates.py hours --academic N --start HH:MM` rather than doing this
by hand — an off-by-15-minutes end time is the single easiest mistake to make
here, and it silently changes the hour count the coordinator is paid for.

Common windows: **16:30–19:00 = 3 academic hours**, **20:00–21:30 = 2**,
**16:00–19:15 = 4**.

## Structural constraints the form itself imposes

- An **א-סינכרוני** (asynchronous) meeting must be **2–4 academic hours**. Four is
  the ceiling, so reaching a large asynchronous total needs more meetings, not
  longer ones.
- The form recommends **10 meetings × 3 academic hours = 30**, but any split that
  sums correctly is accepted. Always state the arithmetic explicitly when you
  present a plan; the total is the thing the Pisga checks first.
- **שעות מרצה משולמות** (paid lecturer hours): the form says payment follows the
  meeting's academic hours, so mirroring the academic hours is the defensible
  default. Some centres pay fewer hours for asynchronous units (a 4-hour
  asynchronous unit paid as 3). If prior filled forms in the folder show that
  reduction, ask rather than assume.
- Submit **at least 30 days before** the first meeting.
- Fewer than 20 expected participants requires an attached
  **בקשה לאישור מיעוט נרשמים** and the district supervisor's approval.
- **עד 15 איש** is only for קהילות מקצועיות לומדות.
- The **בודק העבודות** (work assessor) must hold at least an M.A.
- A summative task (**מטלת סיכום**) must be process-based across the course, not
  only at the end, must include a reflective part, is submitted individually,
  and from תשפ"ו a **מחוון** (rubric) with point distribution must be attached as
  a separate file.
- Lecturers must already be registered in the Mitzpan lecturer database, or they
  cannot be paid retroactively.

## Meeting-mode dropdown

The `אופן הלמידה` dropdown does **not** contain "פנים אל פנים". Face-to-face
meetings are recorded as **הרצאה** or **סדנה** — pick whichever describes the
session, and `סוג החדר` only applies to those. For online meetings leave
`סוג החדר` unset rather than inventing a room; a stray "חדר רגיל" on a
synchronous online meeting reads as a booking request.

Typical option lists (verify against the actual form — revisions differ):

- `אופן הלמידה`: הרצאה, סדנה, מקוון סינכרוני, מקוון א-סינכרוני, סיור/ביקור, סימולציה
- `סוג החדר`: חדר רגיל, אולם, חדר תקשוב, מרחב חדשני בפסג"ה
- `סוג המרצה`: מרצה חיצוני-מקבל שכר מרצה עבור הרצאה, מרצה פנימי-מנחה ללא שכר מרצה,
  מבצע פדגוגי-גוף אקדמי מאושר ע"י משרד החינוך
- `מרכז פסג"ה`: בית שמש, מודיעין, מטה בנימין, מעלה אדומים, קרית ארבע,
  ירושלים מערב, ירושלים מזרח

An asynchronous meeting still needs a start and end time in the table even
though learning is self-paced. Fill a nominal window matching its academic hours
(4 hours → e.g. 16:00–19:15); prior approved forms in the folder do exactly this.

## Pisga centre contacts

The contact table printed inside the form goes stale fast — people leave and the
form is not reissued. Treat it as a starting point, not fact, and say so when
you hand the form over. As of July 2026, **גתית פלג has left פסג"ה מעלה אדומים**
and her replacement is unknown.

The district supervisor for professional development named in the תשפ"ו form is
**לימור שנטמן**; special requests (minority enrolment, early opening, summer
courses) route to her.

## Form year vs course year

The form is issued per Hebrew school year, and a course planned late in one
Gregorian year may belong to the *next* Hebrew year. If the form says תשפ"ו and
the first meeting falls after Rosh Hashanah of תשפ"ז, flag it and ask whether a
newer form exists — the fields are similar between revisions but the control
count changes, which invalidates any cached field map.

## Chepti's standing details

When she is the lecturer or coordinator (usually both):

- שם: ישראלה ישראלי
- ת.ז.: 000000000
- תואר אקדמי: M.A
- נייד: 0500000000
- דוא"ל: teacher@example.com
- סוג המרצה: מרצה חיצוני-מקבל שכר מרצה עבור הרצאה
- Learning environment: **not** Moodle — she runs
  **חומר פתוח** (`openstuff.co.il`) as the shared workspace where participants
  publish products, tag them with the course tag, and review each other. Her
  summative tasks are built around that: publish N products with a usage
  description, image, direct link and tags; give constructive feedback and
  ratings on peers' products; write a one-page personal reflection.

Confirm these against the current conversation before writing them in — they are
defaults to save her retyping, not facts to assert.
