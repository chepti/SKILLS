---
name: canva-to-rezef
description: Import the lesson resources from a Canva "sequence deck" (מצגת רצף) into the new Rezef sequence tool of Chomer Patuach (rezef.openstuff.co.il). Use when the user asks to update/sync/import the sequence deck into הרצף של חומר פתוח, add lessons or resources to a group's sequence, or refresh it after the deck changed.
---

# עדכון הרצף של חומר פתוח ממצגת הרצף ב-Canva

מצגת הרצף: עיצוב ב-Canva שבו כל שיעור הוא שקף כותרת ואחריו שקף לכל משאב. הכלי: `https://rezef.openstuff.co.il/g/<groupId>` (אחרי "ט בוחרים במדע" זה `g/2`). המורה (חפציה) מחוברת לשם בדפדפן שלה. אין להתחבר בשמה ואין להזין סיסמאות.

## 1. דרישות

- Claude in Chrome מחובר, לשונית פתוחה על `rezef.openstuff.co.il/g/<id>` (אם אין, לנווט לשם). בדיקה: `fetch('/api/auth/me')` מחזיר מורה.
- כלי Canva (`read-design`, `export-design`). כתובת העיצוב או ה-id (למשל `DAHSi3WXKhQ`). קישור `canva.link/...` מומר דרך `resolve-shortlink`.
- לשאול לפני שמוסיפים ללוח קיים: איזה טווח שיעורים, וליצור תמיד בלי למחוק או לדרוס פריטים שהמורה הוסיפה ידנית.

## 2. קריאת המצגת

- `read-design` רגיל מחזיר טקסט וקישורי טקסט בלבד. מצגות, סרטונים, מסמכים ומשחקים מוטמעים מופיעים רק ב**מצב עריכה (קריאה בלבד)**: `open_transaction: true` עם `filter: {fields:["design_content"], page_indices:[...]}`, ואחר כך שימוש חוזר ב-`transaction_id` בקבוצות של 6-8 שקפים. לא לבצע שום עריכה. ל-embed יש `"type":"embed"` ו-`url`.
- שקפים הם 1-based. הפלט גדול, ולכן כדאי להפעיל סוכן משנה שמחזיר טבלה קומפקטית לכל שיעור: שקף כותרת, מטרות (מהערות המציגה, "בסוף השיעור התלמידים יוכלו"), ולכל שקף משאב: כיתוב, כותרת, כל כתובת URL בשלמות, ומיקום ה-rect לשקפי אינפוגרפיקה.
- מבנה השקף: שקף כותרת (טקסט לבן גדול, לרוב עם הערות), ואחריו שקפי משאב עם כיתוב קטן ליד האייקון (סרטון, דף עבודה, מצגת, אינפוגרפיקה, משחק, ניסוי...) ובדרך כלל embed אחד.
- מה שאי אפשר לשלוף: סרטונים מאוחסנים ב-Canva (יש להם `videoId` ללא URL), שקפים מסוג `unsupported`, וטקסט/תמונה בלי קישור. לדווח למורה במפורש מה דולג.

## 3. ה-API של הכלי (fetch מתוך הלשונית, `credentials:'include'`, JSON)

| פעולה | קריאה |
|---|---|
| מצב הלוח | `GET /api/groups/<g>/board` (group, sequence, topics, lessons עם items, crossItems) |
| נושא חדש | `POST /api/groups/<g>/topics` ואחר כך `PATCH /api/topics/<id> {name}` |
| שיעור חדש | `POST /api/groups/<g>/lessons {topicId}` (נוצר "שיעור N") ואחר כך `PATCH /api/lessons/<id> {title}` |
| מטרות שיעור | `PATCH /api/lessons/<id> {goals}` (שורות מופרדות ב-\n) |
| הוספת קישור | `POST /api/lessons/<id>/links {urls:[url]}` מחזיר `added[0]` עם `id` (lesson-item) ו-`itemId` |
| סוג פריט | `PATCH /api/items/<itemId> {contentType}`: אחר, כלי דיגיטלי, להדפסה, מערך שיעור, מצגת, סרטון, פעילות, תבנית |
| הערה לפריט | `PATCH /api/lesson-items/<id> {note}` |
| תמונה | `POST /api/lessons/<id>/images {dataUrl, name}` |
| קישורים כלליים לנושא | `POST /api/groups/<g>/cross {urls:[...], topicId}` |
| מחיקה | `DELETE /api/lesson-items/<id>` |

## 4. מיפוי

- שער יחידה ב-Canva -> נושא. שקף כותרת -> שיעור. שקף משאב -> פריט בשיעור, לפי סדר השקפים.
- סוג לפי הכיתוב והכתובת: youtube -> סרטון. canva.link ו-Drive של מצגת -> מצגת. דף לתלמיד ב-Docs/Drive -> להדפסה. דף ניסוי -> פעילות. מערך שיעור -> מערך שיעור. Wordwall, PhET, Javalab, Gemini, אתרי משחק/בוחן -> כלי דיגיטלי.
- סיכום או נוטבוק של כל הפרק -> קישורים כלליים של הנושא (cross), לא שיעור ספציפי.
- שיעור שכבר קיים (לפי כותרת דומה) -> להוסיף אליו, לא ליצור כפילות. קישור שכבר קיים באותו שיעור (בדיקה לפי url בלוח) -> לא להוסיף שוב.
- שיעורים שבמצגת יש להם רק שקף כותרת: ליצור שיעור ריק כמקום שמור.

## 5. אינפוגרפיות ותמונות

אינפוגרפיקה ב-Canva היא תמונה ב-rect בלי קישור. `export-design` PNG של השקף, ואז **מתוך הלשונית** (CORS של הייצוא פתוח): `fetch(exportUrl)` -> `createImageBitmap` -> לחתוך בקנבס לפי left/top/width/height של ה-rect (גודל המצגת 1920x1080, יש להכפיל ביחס `bitmap.width/1920`) -> `toDataURL('image/jpeg',0.92)` -> `POST .../images`. קבצים מקומיים בכונן T בלבד, לא בכונן C.

## 6. מלכודות שנתקלנו בהן

- בסביבת ה-javascript של הכלי `return` ברמה העליונה מחזיר undefined (וההרצה כן קורה). להחזיר את הערך כביטוי אחרון.
- `GET` על `/topics`, `/lessons` ו-`/groups/<g>` נותן 405. לקרוא את הכל מ-`/board`.
- כותרת הפריט נשלפת אוטומטית מהאתר. לקישורי Canva היא יוצאת "לקוח לא נתמך – Canva" או "canva.link". **אין API לשינוי כותרת של פריט קישור**: `PATCH` עם `title` מחזיר ok אבל מתעלם. השם הנכון נשמר בשדה ההערה (`note`), שמוצג רק כשהפריט מורחב. להודיע למורה, ולהציע שינוי ידני בממשק.
- פלט JS שמכיל query string או עוגיות נחסם: לא להדפיס כתובות עם `?token=`.
- לאמת בסוף עם `/board`: ספירת פריטים לכל שיעור וסוג כל פריט.

## 7. סיום ודיווח

לטעון מחדש את העמוד, לצלם מסך, ולדווח למורה: מה נוסף לכל שיעור, מה דולג ולמה (סרטונים של Canva, שקפים בלי קישור, שקף לא נתמך), והערה על כפילויות אפשריות עם פריטים שהוסיפה ידנית.
