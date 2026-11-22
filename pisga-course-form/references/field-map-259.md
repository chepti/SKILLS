# Field map — "טופס מעודכן תשפו פתרונות למידה דו מחוזי" (259 controls)

A cached map for the unified תשפ"ו Jerusalem/Manchi form, so you can skip
re-deriving it. **Verify first**: run `inspect_form.py` and confirm the header
says exactly `259 total`. A different count means a different revision and every
index below is wrong — rebuild the map from the inspector output instead.
`fill_form.py` enforces this if you put `"expect_controls": 259` in the spec.

## Control indices

| idx | field |
|---|---|
| 0 | תאריך מילוי הטופס *(date)* |
| 1 | מרכז פסג"ה *(dropdown)* |
| 2, 3, 4 | מחוז: ירושלים · העיר ירושלים (מנח"י) · ארצי |
| 5 | שם פתרון הלמידה |
| 6, 7, 8 | רפורמה: אופק · עוז · לא ברפורמה |
| 9, 10 | עם ציון · בלי ציון |
| 11, 12, 13 | מקום: מרכז פסג"ה · פתרון למידה היברידי · אחר |
| 14 | "אחר" — היכן |
| 15 | היקף שעות שנתי לגמול |
| 16, 17 | תאריך התחלה · תאריך סיום *(dates)* |
| 18, 19 | מתוקצבת ממשרד החינוך · לא מתוקצבת |
| 20, 21, 22 | מקור תקציבי: פסג"ה · מפמ"ר · יחידות מטה |
| 23 | שם היחידה |
| 24, 25 | מקור תקציבי אחר *(checkbox, text)* |
| 26, 27 | חלוקת התקציב: עד 31.12 · מ-1.1 |
| 28 | לכל עו"ה |
| 29, 30 | לקהל היעד המוגדר בלבד *(checkbox, text)* |
| 31 | אשכול גננות |
| 32, 33 | קהל יעד אחר *(checkbox, text)* |
| 34 | פחות מ-20 איש |
| 35 | עד 15 איש (קהילות מקצועיות) |
| 36 | בין 20-25 |
| 37 | בין 30-40 |
| 38 | בין 60-100 |
| 39 | בין 25-30 |
| 40 | בין 40-60 |
| 41–48 | תפקידים: גננות · רכזים · מחנכים · יועצים · מורים מקצועיים · מנהלים · מפקחים · מדריכים |
| 49 | עו"ה בחינוך המיוחד |
| 50, 51 | תפקיד אחר · כלל עו"ה |
| 52–58 | כיתות: גן ילדים · א-ג · ד-ו · ז-ט · י-יב · חינוך מיוחד · חינוך מבוגרים |
| 59, 60, 61 | פיקוח: ממלכתי · ממ"ד · מגזר ערבי |
| 62, 63 | פיקוח אחר *(checkbox, text)* |
| 64, 65, 66 | תנאי קבלה: אין · יש · פירוט |
| 67–70 | רכז/ת: שם מלא · ת.ז. · טלפון נייד · דוא"ל |
| 71–76 | מרצה 1: סוג *(dropdown)* · שם · ת.ז. · תואר אקדמי · נייד · דוא"ל |
| 77–82 | מרצה 2 (same six offsets) |
| 83–88 | מרצה 3 |
| 89–94 | מרצה 4 |
| 95–100 | מרצה 5 |
| 101–104 | מרצה 6 — **irregular**: the form is missing the סוג dropdown here, so it is only four text controls (שם · ת.ז. or תואר · נייד · דוא"ל). Inspect before using. |
| 105, 106 | אתר מלווה במודל: כן · לא |
| 107 | סביבת הלמידה (when "לא") |
| 108 | שם בודק/ת העבודה |
| 109–258 | טבלת המפגשים, 15 rows × 10 controls |

Note that the checkbox ordering in the participant-count block is **not** visual
reading order — 37 is `בין 30-40` and 39 is `בין 25-30`, because the form lays
them out in two columns. Always read the inspector's `<<text after>>` column
rather than assuming.

## Meeting table

Row *r* (1-based) starts at `base = 109 + 10 × (r − 1)`, then:

| offset | field |
|---|---|
| +0 | תאריך *(date)* |
| +1 | יום *(dropdown)* |
| +2 | שעת התחלה |
| +3 | שעת סיום |
| +4 | מס' שעות אקדמיות |
| +5 | נושא השיעור (עד 2 משפטים) |
| +6 | שם המנחה |
| +7 | אופן הלמידה *(dropdown)* |
| +8 | סוג החדר *(dropdown)* |
| +9 | מס' שעות מרצה משולמות |

Leave unused rows entirely alone; a partially filled row looks like an error.

`נושא השיעור` is genuinely capped at "עד 2 משפטים" — put the calendar-facing
title there, not the full reasoning behind the row. A value like "משימה +
חומרי ליבה – משימת יישום (שעה): מיפוי שלושה תהליכים... יחידת למידה עצמית (3
ש"א): הפקת חומרי ליבה." reads as one dense run-on sentence in the cell; the
dash gets lost in the wall of text and the "short title" never actually reads
as short. Put the structural breakdown (2+1 split, task vs. unit) in your own
reply or the reference syllabus you hand the user, not in this field.

## Free-text paragraphs (fill by paraId)

These sections are ordinary body paragraphs, not controls. Each is a `1. 2. 3.`
list; write the whole line including its number.

| section | paraIds (items 1, 2, 3) |
|---|---|
| תקציר הפתרון | `3DE8B978`, `2BAF3B6E`, `65FD094C` |
| מטרות | `0ACB932B`, `3ED9A174`, `3E13B366` |
| נושאי לימוד | `1F47D8CE`, `225520B8`, `36D4EA11` |
| עקרונות ומרכיבים | `3F677EB1`, `5160ED89`, `0585E390` |
| תוצאות מצופות | `00742E04`, `16CBAF3B`, `5859B8EF` |
| הגדרת מטלת הסיכום | `125D2A71` (replaces the row of underscores) |

The section *headings* appear twice in the XML because they sit inside decorative
shapes (`mc:Choice` + `mc:Fallback`). Never write to a paraId the inspector marks
`x2` — pick the `x1` paragraphs, which are the real body content.
