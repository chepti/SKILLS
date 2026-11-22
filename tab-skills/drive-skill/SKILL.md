# סקיל: דרייב למורה (Teacher Drive)

סקיל לסוכן (Tab) שעובד עם מורה. הוא מקים ומתחזק **דרייב פרטי** באתר משלה, `<name>.sites.tab.bot`:
כל החומרים שהסוכן מכין לה (סרטונים, תסריטים, דפי עבודה, מצגות, קישורים לאתרים ולמעבדות) מסודרים במקום אחד,
נעול בקוד בן 6 ספרות, נוח בטלפון. בנוסף: **קישור העלאה** שאפשר לתת לסוכנים אחרים או לעמיתים,
כך שהם מעלים קבצים ישר לתיקייה מסוימת, בלי גישה לשאר הדרייב.

דוגמה חיה (נעולה בקוד, של המורה שבשבילה זה נבנה): https://hafp-files.sites.tab.bot

הסקיל ריק מתוכן: אין בו קבצים, שמות או מפתחות של אף אחד. כל דרייב מוקם מאפס ושייך רק למורה שלו.
פרטיות מובנית: פרטי הכניסה נשמרים רק במקום נעול, וכל גיבוי מוצפן, נמחק אוטומטית אחרי תקופה, ונבדק שהוא משתחזר (סעיפים 9–10).

---

## 1. מה יש בדרייב

- **תיקיות לפי פרויקט, ובתוכן לפי סוג.** למשל `פרויקט/סרטונים`, `פרויקט/תסריטים`, `פרויקט/דפי עבודה`.
- **קבצים** מכל סוג. לסרטונים ולתמונות נוצרת תמונה מקדימה, וסרטון ואודיו מתנגנים בתוך הדף.
- **קישורים ככרטיסים**: תמונה (צילום מסך של הדף או תמונת og:image), כותרת, שורת תיאור וכפתור "פתיחה".
- **הורדה**: כפתור "הורדה" ליד כל קובץ; כפתור "ZIP" על כל כרטיס תיקייה ו"הורדת התיקייה (ZIP)" בראש כל תיקייה (הכול נארז בדפדפן, כולל תת-תיקיות); ובדף הראשי גם "הורדת הכול" ו"רשימת קבצים לאקסל".
- **עיצוב**: פסטלים קרירים (מנטה, תכלת, טורקיז) על כרטיסים לבנים, גופן Rubik, מימין לשמאל, אייקוני קו נקיים. ניגודיות טקסט וכפתורים עומדת ב-WCAG AA. אייקון אמוג׳י שנותנים לתיקייה (`folder --icon 🎬`) מוצג כאייקון קו תואם (🎬 סרט, 📝 עט, 📄 דף, 🧪 מבחנה, 🔗 קישור, 🌍 גלובוס…); בלי אייקון, הוא נבחר לפי שם התיקייה (סרטונים, תסריטים, דפי עבודה, תמונות…).
- **חיפוש** בראש הדף: מקלידים ורואים מיד קבצים ותיקיות מכל הדרייב. מחפש בשם, בנתיב התיקייה, בתיאור, בסוג הקובץ,
  בשם המעלה, בהערה ובכתובת של כרטיס קישור. מתעלם מניקוד, מגרשיים ומסימני פיסוק, ומאותיות סופיות (`דף` מוצא גם `דפי`).
  פרטים בסעיף 4.
- **לוח פרויקטים** (`#projects`, לשונית "פרויקטים"): לכל פרויקט יש תת-משימות, ולכל אחת מסומן אם היא מחכה למורה או לסוכן.
  שתי תצוגות: "לפי מי מחכה" (שני טורים, "⏳ מחכה ל<שם>" ו-"🤖 מחכה ל-Tab", ולחיצה אחת מעבירה משימה מצד לצד) ו"לפי פרויקט".
- **תעדוף**: המורה גוררת את ⠿ (או לוחצת ▲▼) כדי לסדר פרויקטים, ומשימות בתוך פרויקט. הסדר נשמר בשרת מיד,
  וזה מה שהסוכן קורא לפני שהוא בוחר על מה לעבוד (`board.py prio`). פרטים בסעיף 7.
- **הריצה היומית**: הסוכן עובר פעם-פעמיים ביום על הדרייב והלוח ומעדכן אותם בעצמו. פרטים בסעיף 11.
- **העלאות של משתתפים**: עמוד `/upload` (עם קוד משתתפים או עם קישור העלאה). אפשר רק *להוסיף*:
  משתתף לא יכול למחוק, לשנות או להחליף קבצים קיימים.
- **פוטר קטן** בפינה: שם המותג של המורה (לא חובה) ומעטפה לשליחת משוב במייל (לא חובה).

שלוש רמות גישה:
| מי | איך נכנס | מה יכול |
|---|---|---|
| המורה (צופה) | קוד צפייה בן 6 ספרות | לראות הכול, להוריד, לערוך את לוח הפרויקטים |
| משתתף | קוד משתתפים (6 ספרות) **או** קישור העלאה | רק להעלות קבצים (קוד: לכל תיקייה קיימת · קישור: רק לתיקייה שלו) |
| הסוכן | מפתח אדמין (רק בקובץ הגדרות נעול, מחוץ לתיקיית הסקיל) | הכול, דרך ה-CLI |

## 2. מה בחבילה

```
drive-skill/
  SKILL.md          ← הקובץ הזה
  site/_worker.js   ← האתר כולו (דפים + API), בלי תוכן
  site/tab-site.json← הצהרת אתר: Worker + אחסון R2 בשם FILES
  cli/drive.py      ← כלי שורת פקודה: הקמה, קבצים, קישורים, תיקיות, קישורי העלאה, משיכה, גיבוי מוצפן ושחזור
  cli/board.py      ← כלי ללוח הפרויקטים ולסדר העדיפויות (prio)
  cli/link_shot.mjs ← צילום מסך נקי של דף לכרטיס קישור (סוגר חלונות קופצים)
  manifest.empty.json ← דוגמה למניפסט ריק (לא חובה; setup כותב אחד)
  explainer.pdf     ← דף הסבר קצר למורים
```

## 3. הקמה (פעם אחת, כ-5 דקות)

> חשוב: מיד אחרי הפרסום מריצים `setup`. עד שהוא רץ, האתר עוד לא נעול ומי שיגיע ראשון יכול לאתחל אותו.

**שלב 1. לבחור שם** קצר באנגלית לכתובת, למשל `rina-drive`. לשאול את המורה איך לקרוא לדרייב
("הדרייב של רינה"), באיזה שם לפנות אליה בלוח ("רינה"), והאם יש לה שם מותג/אתר ומייל למשוב.

**שלב 2. לפרסם את האתר** (Tab: ראו `PUBLISH_CAPABILITY.md`):
```bash
mkdir -p /home/user/tab/drive && cp -r drive-skill/site drive-skill/cli /home/user/tab/drive/
cd /home/user/tab/drive
TAB_TASK_ID=$TAB_TASK_ID node /home/user/tab/publish-cli.mjs site.publish \
  '{"slug":"rina-drive","source_dir":"/home/user/tab/drive/site","title":"הדרייב של רינה"}'
```
הפרסום יוצר אחסון קבצים (R2) צמוד לאתר. פרסום חוזר באותו שם משאיר את כל הקבצים במקומם.

**שלב 3. להריץ setup** (יוצר מפתח אדמין, קוד צפייה וקוד משתתפים, ושומר אותם בקובץ הגדרות פרטי):
```bash
python3 /home/user/tab/drive/cli/drive.py setup https://rina-drive.sites.tab.bot \
  --title "הדרייב של רינה" --owner "רינה" \
  --brand "שם בית הספר או האתר שלה" --brand-url "https://..." --feedback-email "her@example.org"
```
- בלי `--code` נבחרים קודים אקראיים, והם מודפסים בסוף. אפשר לתת `--code 123456 --contrib-code 654321`.
- `--owner` הוא השם שמופיע בלוח: "מחכה ל**רינה**". כדאי שם פרטי, בלי ה' הידיעה.
- `--brand`, `--brand-url`, `--feedback-email` לא חובה. בלעדיהם הפינה ריקה או בלי מעטפה.
- ההגדרות (מפתח האדמין והקודים) נשמרות **במקום נעול**: `/home/user/tab/state/secrets/teacher-drive.json`
  (תיקייה בהרשאות 700, קובץ בהרשאות 600), מחוץ לתיקיית הסקיל. **זה סוד.** לא להעתיק את המפתח לצ'אט, לקבצים בדרייב,
  לסקיל, ל-zip, למאגר קוד או לזיכרון. `setup` מסרב לשמור את ההגדרות בתוך תיקיית הסקיל (שם יש `site/`, שמתפרסם),
  ב-`/home/user/tab/files` או בזיכרון, וה-CLI מתריע ומתקן להרשאות 600 קובץ שאחרים יכולים לקרוא.
  לכמה דרייבים: `--config <file>` (גם הוא בתיקייה נעולה) או משתנה הסביבה `DRIVE_CONFIG`.
- `setup` יוצר גם **מפתח גיבוי** אקראי: `/home/user/tab/state/secrets/teacher-drive-backup.key` (600).

**שלב 4. לשלוח למורה** את הכתובת ואת קוד הצפייה (קוד המשתתפים רק אם היא רוצה לתת אותו לאחרים).
לבדוק שהאתר עונה (`requests` עם `User-Agent: Mozilla/5.0`; בלי UA השרת עלול לענות 403).
את הקודים שולחים רק לה, בצ'אט הפרטי. לא כותבים אותם בקובץ, בדרייב או בזיכרון.

**שלב 5. גיבוי מוצפן, חלק מההקמה (לא לדלג):**
```bash
python3 /home/user/tab/drive/cli/drive.py backup       # גיבוי ראשון, מוצפן
python3 /home/user/tab/drive/cli/drive.py verify       # בדיקת שחזור: חייב לצאת "ok": true
```
ואז לקבוע תזמון יומי (Tab: `SCHEDULE_CAPABILITY.md`), למשל 03:00, שמריץ:
`python3 /home/user/tab/drive/cli/drive.py backup --prune`, ומודיע למורה רק אם משהו נכשל. הפרטים בסעיף 9.

**שלב 6. בדיקת סודות:** `python3 /home/user/tab/drive/cli/drive.py secure`. התשובה צריכה להיות `"ok": true`.
אם מופיע קובץ ב-`files_holding_a_secret`, מנקים או מוחקים אותו. אם קוד דלף, מחליפים אותו (`code` / `contrib-code`).

**כבר יש דרייב שהוקם בגרסה קודמת?** מעתיקים את `cli/` החדש על הישן, ואז מריצים פעם אחת:
`drive.py secure` (מעביר את ההגדרות מ-`/home/user/tab/state/teacher-drive.json` למקום הנעול), `drive.py backup-key`,
`drive.py backup`, `drive.py verify`, וקובעים את התזמון היומי. ההתקנה הישנה ממשיכה לעבוד עד אז, עם אזהרה.
כדי לקבל חיפוש, תעדוף וגרירה: מחליפים גם את `site/_worker.js` ומפרסמים מחדש באותו slug. הקבצים, הלוח, הקודים וההגדרות נשארים;
הסדר הנוכחי של הלוח הופך לסדר העדיפויות ההתחלתי. ואז מקימים את הריצה היומית (סעיף 11).

**שינוי שם, מותג או מייל בהמשך** (בלי לפרסם מחדש):
```bash
python3 cli/drive.py settings --title "..." --owner "..." --brand "..." --brand-url "..." --feedback-email "..."
```

## 4. עבודה יומיומית

```bash
D="python3 /home/user/tab/drive/cli/drive.py"
$D add  ./ep3.mp4  "חשמל · כיתה ח/סרטונים"  "פרק 3 · מעגל חשמלי"        # קובץ (תמונה מקדימה נוצרת לבד)
$D add  ./ep3-v2.mp4 "חשמל · כיתה ח/סרטונים" "פרק 3 · מעגל חשמלי" --replace <id>   # גרסה חדשה במקום הישנה
$D link https://example.org/lab "חשמל · כיתה ח/מעבדות" "מעבדת מעגלים" --desc "סימולציה לתלמידים"
$D link https://blog.example.org/123/ "..." "..." --og                     # תמונת og:image במקום צילום מסך
$D folder "חשמל · כיתה ח/דפי עבודה" --icon 📝                               # תיקייה ריקה / אייקון
$D list                      # הכול, כולל העלאות של משתתפים (מסומנות ⬆)
$D move <id> "חשמל · כיתה ח/גרסאות קודמות"   ·   $D rename <id> "שם חדש"   ·   $D remove <id>
$D check-links               # כל כרטיסי הקישור עונים?
```
- **שם תצוגה בעברית, בלי סיומת.** הקובץ עצמו שומר את הסיומת והבייטים שלו.
- הכול נכנס ישר לאחסון: אין צורך לפרסם מחדש אחרי הוספה.
- גבול: קובץ שהסוכן מעלה עובר בבקשה אחת, עד כ-95MB. קובץ גדול יותר: לכווץ (סרטון 720p עד ~15MB מספיק לטלפון),
  או להעלות דרך עמוד ההעלאה בדפדפן (עד 500MB, בחלקים).

### חיפוש (בדף, למורה)
תיבת החיפוש יושבת בכותרת הדביקה של לשונית "קבצים" (ונעלמת בלוח הפרויקטים). כך היא עובדת, כדי שתוכלו להסביר למורה:
- **מתעדכן תוך כדי הקלדה**, בלי Enter. בדסקטופ `/` קופץ לתיבה. `Esc` סוגר קודם חלון פתוח (סרטון, תמונה) ורק אז מנקה את החיפוש. ✕ מנקה.
- **איפה מחפשים:** שם הקובץ, נתיב התיקייה, התיאור, הסיומת (`pdf`, `mp4`), שם המעלה, הערה, והדומיין של כרטיס קישור.
  תיקייה נמצאת לפי השם שלה. **לא** מחפש בתוך תוכן הקבצים (טקסט של PDF או תמלול). לכן שם ותיאור טובים חשובים: `--desc` בכל `add` / `link`.
- **נרמול עברית:** הניקוד והטעמים נמחקים, סימני פיסוק (״ ׳ ' " · - , וכו') נמחקים, אותיות סופיות הופכות לרגילות (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ),
  ואנגלית לאותיות קטנות. כל מילה שמקלידים חייבת להופיע (AND), גם בלי רווחים (`דףעבודה` מוצא `דף עבודה`).
- **דירוג:** שם שמתחיל במילה > המילה בשם > המילה במקום אחר. עד 60 תוצאות, ואז כפתור "הצגת הכול".
- **תוצאה = אותו כרטיס כמו בתיקייה** (צפייה, האזנה, הורדה), ומעליו פירורי לחם של התיקייה. לחיצה עליהם קופצת לתיקייה ומנקה את החיפוש.
- הכול רץ בדפדפן על המניפסט שכבר נטען. אין שרת חיפוש ואין אינדקס לתחזק. קובץ שנוסף מופיע בחיפוש אחרי רענון.

הסוכן עצמו מחפש עם `$D list` (ואפשר `| grep`), לא דרך הדף.

### מוסכמות תיקיות (לפי פרויקט, ואז לפי סוג)
1. **שכבה ראשונה = פרויקט** (סדרה, יחידה, השתלמות, אתר). שם שמזהה גם בלי הקשר: `שם הפרויקט · כיתה ז`.
2. **שכבה שנייה = סוג**, מתוך רשימה קבועה:
   `סרטונים` · `תסריטים` · `דפי עבודה` · `מצגות` · `מעבדות` (או `מעבדות ומשחקים`) · `תמונות` · `הקלטות` ·
   `מקורות ובדיקת עובדות` · `גרסאות קודמות` · `קישורים`.
3. פרויקט חדש מקבל תיקייה משלו עם תתי-תיקיות סוג. **לא** בונים תיקיות סוג בראש (`סרטונים/…`) לצד תיקיות פרויקט.
   אם משהו נמצא בתיקיית סוג ישנה: `move`.
4. מה שלא שייך לפרויקט: `שונות/{תמונות,קישורים,תסריטים}`.
5. שמות קבצים: `פרק 3 · שם הפרק`, `שורה 07`, `דף עבודה · נושא`. עקביות חשובה יותר מאורך.
6. אם המורה קבעה מבנה משלה, הוא גובר. לרשום אותו בזיכרון ולהשתמש רק בנתיבים האלה.

## 5. קישור העלאה לסוכנים אחרים ולעמיתים

כשהמורה עובדת גם עם כלי AI אחר (למשל כלי שמפיק קריינות), או כשעמית צריך לשלוח חומרים, יוצרים לו
**קישור העלאה**: מוגבל לתיקייה אחת, אפשר לבטל אותו, ויש לו תוקף.
```bash
$D upload-link "חשמל · כיתה ח/הקלטות" --label "כלי הקריינות של רינה" --days 14
#   --days 0 = בלי תפוגה  ·  --no-subfolders = בלי יצירת תת-תיקיות
```
הפקודה מדפיסה:
- **קישור לאדם**: `https://<site>/u/<token>`. נפתח עמוד העלאה פשוט, שמראה לאיזו תיקייה הקבצים נכנסים.
  אפשר לבחור תת-תיקייה קיימת או ליצור חדשה (רמה אחת) בתוך התיקייה של הקישור.
- **הוראות לסוכן**, מוכנות להעתקה:
  ```bash
  curl -sS -X POST "https://<site>/api/upload" -H "X-Upload-Token: <token>" \
       --url-query "filename=line07.mp3" --url-query "name=שורה 07" --url-query "uploader=<who>" \
       --data-binary @line07.mp3
  # תת-תיקייה: --url-query "folder=<התיקייה של הקישור>/<sub>"   (‏--url-query מקודד עברית ורווחים; curl 7.87 ומעלה)
  ```
  סוגים מותרים: mp4 m4v mov webm mp3 m4a wav ogg aac pdf doc docx ppt pptx xls xlsx txt jpg jpeg png gif webp heic.
  התשובה: `{"ok":true,"id":...,"folder":...}`. העלאה מחוץ לתיקייה נענית ב-400, וטוקן לא בתוקף ב-403.

ניהול:
```bash
$D upload-links          # כל הקישורים: פעיל / בוטל / פג, כמה העלאות, תאריך תפוגה
$D revoke <link_id>      # מבטל מיד: גם הקישור וגם מי שכבר פתח אותו בדפדפן
```
- הטוקן מופיע רק פעם אחת, בתשובה ל-`upload-link`. באחסון נשמר רק ה-hash שלו. קישור שאבד: מבטלים ויוצרים חדש.
- כל העלאה נרשמת עם `via` (שם הקישור) ו-`uploader` (אם נמסר). כך יודעים מי העלה מה.
- קיים גם **קוד משתתפים** כללי (`contrib-code <6digits>`), שמאפשר העלאה לכל תיקייה קיימת. לסוכנים עדיף קישור,
  כי הוא מוגבל לתיקייה ואפשר לבטל אותו בלי להשפיע על אחרים.

## 6. משיכת העלאות של משתתפים

```bash
$D pull --new --folder "חשמל · כיתה ח/הקלטות" --out /home/user/tab/files/incoming
#   --new: רק מה שעוד לא נמשך (נשמר ליד קובץ ההגדרות) · --link <link_id>: רק ממקור אחד
$D adopt <id> ["פרויקט/סוג"]   # העלאה של משתתף הופכת לקובץ רגיל (ואז אפשר move / rename / --replace)
```
דפוס עבודה: המורה אומרת "העליתי" → `pull --new` → בודקים כל קובץ (שם, אורך, איכות; לאודיו: תמלול) →
מדווחים לה בשורה אחת מה הגיע ומה חסר.

## 7. לוח הפרויקטים ותעדוף

לשונית "פרויקטים" (`#projects`) היא המקום שבו המורה רואה מה מחכה לה ומה הסוכן עושה. היא עורכת אותו בעצמה בדפדפן,
והסוכן מעדכן אותו דרך `board.py`. הכתיבה האחרונה גוברת, והדף מתרענן כל 45 שניות, לכן **קוראים (`get`) לפני שכותבים**.

**מבנה.** פרויקט = כותרת, תיאור, קישורים, סטטוס (`me` מחכה למורה · `tab` הסוכן עובד · `other` מחכה למישהו אחר), ורשימת משימות.
משימה = טקסט + `who` (`her` = המורה, `tab` = הסוכן) + `done`. פרויקט שהסתיים (`finish`) יורד ל"הסתיימו".

**שתי תצוגות** (המורה בוחרת, הבחירה נשמרת במכשיר):
- **"לפי מי מחכה"** (ברירת המחדל): שני טורים, "⏳ מחכה ל<שם>" ו-"🤖 מחכה ל-Tab". בכל טור המשימות מקובצות לפי פרויקט.
  לחיצה על התג ⏳/🤖 ליד משימה מעבירה אותה לטור השני. שדה "+ משימה" בתחתית כל טור.
- **"לפי פרויקט"**: כרטיס לכל פרויקט, עם "הבאה:" (המשימה הפתוחה הראשונה) והרשימה המלאה בלחיצה.

**תעדוף (גרירה).** הסדר בלוח **הוא** סדר העדיפויות של המורה: מה שלמעלה, הסוכן מקדם קודם.
- ⠿ ליד כל פרויקט (בשתי התצוגות) וליד כל משימה: גוררים למעלה או למטה. עובד בעכבר ובמגע (טלפון), עם גלילה אוטומטית רק לכיוון הגרירה.
- ▲▼ ליד כל פרויקט (ובמשימה, במצב עריכה) לדיוק או למי שלא נוח לגרור. במקלדת: פוקוס על ⠿ ואז חץ למעלה/למטה.
- גרירה של קבוצת פרויקט בטור אחד משנה את מקום הפרויקט בכל מקום. גרירת משימה משנה את הסדר רק בתוך הפרויקט שלה.
- נשמר בשרת ברגע השחרור, זהה בכל המכשירים, ושורד רענון. רק מי שנכנס עם קוד הצפייה יכול לשמור (בלי זה: 401).
- כל פרויקט פעיל מקבל `rank` (1 = הכי חשוב); כל משימה פתוחה מקבלת `rank` בתוך הפרויקט שלה. שהסתיים = `null`.
  השרת מחשב את זה בכל קריאה (`GET /api/board`) ובכל שמירה, וגם ה-CLI.

```bash
B="python3 /home/user/tab/drive/cli/board.py"
$B prio                       # המשימות של הסוכן לפי סדר המורה:  1. [P1·2] פרויקט → משימה
$B prio --who all             # כל המשימות הפתוחות (גם שלה), עם [שם] / [Tab]
$B prio --json                # שורות: order, project_rank, task_rank, project, project_id, task, task_id, who
$B get                        # סיכום: הטורים, ואז #1..N פרויקטים לפי הסדר ו-☐1..k משימות   (--json = כולל rank)
$B add-project "חשמל · כיתה ח" --desc "סדרת סרטונים" --link https://... --task "לכתוב תסריט פרק 1" --task "להחליט על הדמויות"
$B add-subtask "חשמל" "להאזין לקריינות פרק 2" --who her       # her = המורה · tab = הסוכן (בלי --who: ניחוש לפי פועל)
$B done "חשמל" "תסריט פרק 1"   ·   $B who "חשמל" "קריינות" tab   ·   $B finish "חשמל"
$B move "חשמל" 1              # להזיז פרויקט (רק כשהמורה ביקשה)
$B move-subtask "חשמל" "קריינות" 1   # להזיז משימה בתוך הפרויקט (רק כשהמורה ביקשה)
```

**הכלל לסוכן: לקרוא את העדיפויות לפני שבוחרים על מה לעבוד.**
1. בתחילת כל עבודה יזומה (ריצה יומית, "מה עכשיו?", זמן פנוי בין משימות): `board.py prio`. השורה הראשונה היא מה שמקדמים קודם.
2. כשכמה דברים פתוחים בשיחה, מסדרים אותם לפי אותו סדר, ואומרים למורה במה מתחילים.
3. **לא מסדרים מחדש את הלוח שלה.** פרויקט חדש נכנס לסוף הרשימה הפעילה, משימה חדשה לסוף הפרויקט. `move` / `move-subtask` / `--top` / `--first` רק כשהיא ביקשה.
4. משימה של הסוכן שתקועה על המורה: `who ... her`, כדי שתעבור לטור שלה. ומה שהיא סיימה: `who ... tab` או `done`.
5. סדר העדיפויות לא מחליף בקשה מפורשת: מה שהיא מבקשת עכשיו בצ'אט קודם, ואחר כך הלוח.

## 8. הרגלים טובים

- **ריצה יומית**: תזמון קבוע (פעם או פעמיים ביום) שמסנכרן את הדרייב ואת הלוח. איך מקימים ומה בודקים: סעיף 11.
- **לא לשמור מפתחות תשובות בתיקייה שמשתפים.** הדרייב פרטי, אבל קוד הצפייה עובר מיד ליד. מפתחות תשובות,
  ציונים ופרטי תלמידים שמים רק במקום שהמורה בלבד רואה, ולעולם לא באתר שפונה לתלמידים.
- **לא לשים סודות בקבצים**: סיסמאות, קודים, מפתחות API, מספרי טלפון של תלמידים. גם לא בתיאור של כרטיס קישור.
- **טיוטות** נכנסות רק אם המורה ביקשה. בדרייב יש רק גרסאות סופיות, והגרסה הקודמת עוברת ל`גרסאות קודמות` או מוחלפת.
- **החלפה ולא כפילות**: גרסה חדשה של אותו קובץ = `add ... --replace <id>`.
- **קישור העלאה לכל סוכן או עמית, עם תוקף.** כשהעבודה נגמרת: `revoke`.
- **גיבוי**: רק מוצפן, דרך `drive.py backup` (סעיף 9). לא לשמור עותק פתוח של המניפסט או של הקבצים (למשל `list --json > backup.json`).
  הלוח נמצא ב-`_projects/board.json`, ובכל יום נשמר עותק שלו ב-`_projects/daily/`. `prune` מוחק עותקים ישנים מ-14 יום.
- **בדיקה אחרי כל שינוי באתר**: `requests` עם `User-Agent: Mozilla/5.0`, ואם התשובה ישנה, להוסיף `?nc=<time>`.

## 9. גיבויים מוצפנים

כל גיבוי של הדרייב (המניפסט, ההגדרות, הלוח, רשומות הקישורים וההעלאות, וכל הקבצים) **מוצפן**. אין גיבוי פתוח.
```bash
D="python3 /home/user/tab/drive/cli/drive.py"
$D backup                    # גיבוי מלא, מוצפן: /home/user/tab/backups/teacher-drive/<slug>/<slug>-full-<UTC>.tar.enc
$D backup --no-files         # רק מניפסט, הגדרות, לוח וקישורים (קטן מאוד)
$D verify                    # בדיקת שחזור של הגיבוי האחרון מכל סוג
$D prune [--dry-run]         # מדיניות שמירה (למטה); קודם בודק שחזור
$D backups                   # רשימת הגיבויים
$D restore <file> --out <folder>      # שחזור לתיקייה מקומית
$D restore <file> --to-site --yes     # כתיבה חזרה לדרייב (אחרי תקלה)
```
- **הצפנה:** AES-256 (‏`openssl enc -aes-256-cbc -pbkdf2`, ‏200,000 סבבים) עם קובץ מפתח. הגיבוי נארז ומוצפן תוך כדי הורדה,
  כך ששום עותק פתוח לא נכתב לדיסק. קובץ ההגדרות (`_config.json`, ה-hash של הקודים) לא נכלל.
- **המפתח בנפרד:** `/home/user/tab/state/secrets/teacher-drive-backup.key` (600). אף פעם לא באותה תיקייה עם הגיבויים, לא בתיקיית הסקיל,
  לא ב-zip ולא במאגר קוד. הכלי מסרב לגבות אם המפתח והגיבויים יושבים יחד. **בלי המפתח אין שחזור**, לכן כדאי לשמור עותק שני
  של המפתח במקום נעול אחר, אבל לא ליד הגיבויים.
- **שמירה ומחיקה אוטומטית:** כל הגיבויים מ-14 הימים האחרונים, ועוד גיבוי אחד לכל חודש (האחרון בחודש) ל-3 חודשים. כל השאר נמחק.
  זה חל על כל סוג בנפרד (מלא / `--no-files`). אותו `prune` מוחק גם את העותקים היומיים של הלוח באתר שישנים מ-14 יום.
- **בדיקת שחזור לפני מחיקה:** `prune` מפענח קודם את הגיבוי החדש ביותר עד הסוף, בודק sha256 של כל קובץ מול הרשימה שבתוך הגיבוי,
  קורא את המניפסט, מוודא שכל קובץ שהמניפסט מזכיר נמצא בגיבוי, ומחלץ קובץ לדוגמה לתיקייה זמנית. אם משהו נכשל,
  **הוא לא מוחק כלום** ויוצא עם שגיאה. אז מודיעים למורה ובודקים.
- **תזמון:** פעם ביום `backup --prune`. דרייב גדול ודיסק קטן: כל יום `backup --no-files --prune`, ופעם בשבוע גיבוי מלא.
  `backup` בודק לפני שהוא מתחיל שיש מספיק מקום פנוי.
- גיבוי שנמצא רק על אותו מחשב מגן מטעויות (קובץ שנמחק, מניפסט שנהרס), לא מאובדן המחשב. אפשר להעתיק את קבצי `.tar.enc`
  למקום נוסף, כי הם מוצפנים. את המפתח לא מעתיקים איתם.

## 10. פרטיות ואבטחה (צ'קליסט)

- [ ] **הדרייב נעול** בקוד צפייה בן 6 ספרות. החלפת קוד (`code`) מנתקת את כל מי שמחובר.
- [ ] **העלאה בלי גישה לקריאה:** קוד משתתפים נפרד (שונה מקוד הצפייה), או עדיף **קישור העלאה** מוגבל לתיקייה אחת,
      עם תוקף (ברירת מחדל 30 יום; לא להשתמש ב-`--days 0` בלי סיבה), שאפשר לבטל מיד (`revoke`). הטוקן מוצג פעם אחת, ובאחסון נשמר רק ה-hash שלו.
- [ ] **מפתח האדמין והקודים** נמצאים רק ב-`/home/user/tab/state/secrets/teacher-drive.json` (תיקייה 700, קובץ 600), או במשתני סביבה.
      לא בתיקיית הסקיל, לא ב-`site/`, לא ב-zip, לא במאגר קוד, לא בזיכרון, לא בדרייב ולא בצ'אט (חוץ מהקודים שנשלחים למורה עצמה).
- [ ] **`drive.py secure` עובר נקי** (`"ok": true`) אחרי ההקמה ואחרי כל עדכון של הסקיל.
- [ ] **גיבויים מוצפנים בלבד**, עם מפתח שנשמר בנפרד מהגיבויים.
- [ ] **מחיקה אוטומטית:** 14 יום + אחד לחודש ל-3 חודשים, דרך תזמון יומי של `backup --prune`.
- [ ] **לפני כל מחיקה נבדק שגיבוי מוצפן באמת משתחזר.** אם הבדיקה נכשלת, לא מוחקים ומודיעים למורה.
- [ ] **אין בסקיל ובחבילה שום סוד או פרט אישי:** `manifest.empty.json` ריק, ה-zip בלי קובצי הגדרות. לפני שמשתפים סקיל או קבצים: `grep -r admin_key`.
- [ ] **לא שומרים בדרייב** מפתחות תשובות, ציונים ופרטי תלמידים. אלה הולכים רק למקום שרק המורה רואה.

---

## 11. הריצה היומית (תזמון קבוע של הסוכן)

המורה לא צריכה לבקש "תעדכן את הדרייב". הסוכן קובע לעצמו תזמון קבוע, ובכל ריצה מוודא שהדרייב והלוח משקפים את מה שקרה באמת.
מומלץ פעמיים ביום, אחת בצהריים ואחת בערב (למשל 13:00 ו-21:30 לפי השעון שלה), או פעם אחת בערב אם יש מעט עבודה.
זה תזמון **נפרד** מהגיבוי הלילי (`backup --prune`, שלב 5), כי לגיבוי אין צורך במודל ולסנכרון יש.

**מה בודקים בכל ריצה, לפי הסדר:**
1. **עדיפויות:** `board.py prio --who all`. כך יודעים מה חשוב לה עכשיו, ובזה מתחילים.
2. **הדרייב מול מה שהסתיים:** משווים את מה שהסוכן סיים מאז הריצה הקודמת (הרשימות שלו בזיכרון, הקבצים הסופיים החדשים בתיקיית העבודה,
   אתרים שפורסמו) עם `drive.py list`.
   - חסר → `add` (או `link` לאתר/מעבדה), לתיקייה הנכונה לפי מוסכמות התיקיות (סעיף 4) ולפי המבנה שהמורה קבעה.
   - גרסה חדשה של משהו שכבר שם → `add ... --replace <id>`, לא כפילות.
   - טיוטות, קבצי ביניים ודברים שמחכים לאישור שלה: לא מעלים, אלא אם ביקשה.
   - פריט שיושב בתיקיית סוג ישנה בראש הדרייב → `move` לתיקיית הפרויקט.
3. **קישורים:** `drive.py check-links`. כל כרטיס קישור חייב לענות 200. שבור → לתקן את הכתובת או להחליף את הכרטיס.
4. **העלאות של משתתפים:** `drive.py pull --new`. בודקים כל קובץ (שם, אורך, איכות; אודיו: תמלול), `adopt` למה שנכנס לעבודה,
   ומה שהגיע הופך למשימה בלוח.
5. **תיבות נכנסות:** כל מקום שבו המורה או עמיתים משאירים לסוכן בקשות (תיבת המייל של הסוכן, תיקיית "הערות" בדרייב, ערוץ הערות של פרויקט).
   כל בקשה חדשה = משימה בלוח (`add-subtask`), עם `who` נכון.
6. **הלוח עצמו:** לכל משימה של הסוכן הסטטוס הנכון. מה שהסתיים → `done`; פרויקט שנגמר → `finish`; מה שתקוע עליה → `who ... her`;
   עבודה חדשה שהתחילה → משימה חדשה. שום דבר ישן. **לא משנים את הסדר שלה** (סעיף 7).
7. **מה הלאה:** המשימה הראשונה של הסוכן ב-`prio` היא הבאה בתור. מתחילים רק עבודה שהמורה כבר ביקשה (בלי הוצאות, בלי פנייה החוצה בשמה).
8. **הודעה:** רק אם משהו נוסף, תוקן או מחכה לה. שורה אחת-שתיים בצ'אט, מה נוסף ומה מחכה לה. אם הכול מסונכרן: לא שולחים כלום.
   לא שולחים בשעות מנוחה (למשל אחרי 23:00), ולא שולחים קבצי וידאו בצ'אט, רק קישור לדרייב.
9. **רישום:** שורה בזיכרון של הסוכן (תאריך, מה נוסף/תוקן), כדי שהריצה הבאה תדע מאיפה להמשיך.

**איך מקימים (Tab, `SCHEDULE_CAPABILITY.md`):** תזמון יומי עם הוראה מלאה במילים, באזור הזמן של המורה. כל ריצה נפתחת בלי זיכרון של השיחה,
לכן ההוראה צריכה להכיל את כל מה שצריך: כתובת הדרייב, הנתיבים ל-CLI, מבנה התיקיות שלה, ומתי לשלוח הודעה.
```bash
node /home/user/tab/schedule-cli.mjs schedule.create '{
  "timezone": "Asia/Jerusalem",
  "schedule": {"type": "daily", "local_time": "21:30"},
  "prompt": "Daily Drive + projects-board run for <teacher> (her request: keep the Drive and the board up to date).\nDrive: https://<slug>.sites.tab.bot. CLIs: python3 /home/user/tab/drive/cli/drive.py (list/add/link/--replace/move/check-links/pull --new) and python3 /home/user/tab/drive/cli/board.py (prio/get/add-subtask/done/who/finish). Config is the locked file; never print keys or codes.\nDo, in order: (1) board.py prio --who all. (2) Compare what I finished since the last run (my memory notes, newest final files, published sites) with drive.py list: missing -> add to the right project/type folder; newer version -> --replace <id>; skip drafts and anything awaiting her approval. (3) drive.py check-links: every link card must answer 200. (4) drive.py pull --new: check each upload, adopt what is used, add a board task. (5) Read her inboxes (my mailbox, the notes folder) and add a board task per new request. (6) Board: every task of mine has the right state (done / waiting on her / in progress); add new ones, finish finished projects; do NOT reorder her priority. (7) The top Tab task in prio is next; start it only if she already asked for it.\nFolder rule: <her folder structure, e.g. project first, then type: <project>/{סרטונים,תסריטים,דפי עבודה}>.\nMessage her ONLY if something was added, fixed or waits on her: one short line in Hebrew listing what. All in sync: send nothing. No message after 23:00. Never send video files in chat. Log the result as one line in my memory."
}'
```
- לריצת צהריים: אותו `prompt` עם `"local_time": "13:00"`. שתי ריצות, אותם כללים.
- `node /home/user/tab/schedule-cli.mjs schedule.list` מראה את התזמונים ואת הריצה הבאה. שינוי כלל = לבטל (`schedule.cancel`) וליצור מחדש עם ההוראה המעודכנת.
- כשהמורה משנה כלל (מבנה תיקיות, מתי להודיע), מעדכנים **גם** את ההוראה של התזמון, אחרת הריצה הבאה תעבוד לפי הכלל הישן.
- בהוראה אין סודות: לא קוד צפייה, לא מפתח אדמין, לא קישור העלאה. ה-CLI קורא אותם מקובץ ההגדרות הנעול.
- סוכן שאינו Tab: אותה הוראה ככל משימה מתוזמנת יומית בכלי שלו (cron, תזכורת קבועה).

## English technical reference

**Architecture.** One Cloudflare-style Worker (`site/_worker.js`) with one R2 bucket bound as `FILES`
(declared in `tab-site.json`). The site has no static assets. Storage layout:
`_config.json` (salt, sha256 hashes of the viewer code, contributor code and admin key; session ids) ·
`_settings.json` (title, owner, brand, brand_url, feedback_email) · `_manifest.json` (`{title, folders:[{path:[...],icon}], files:[...]}`) ·
`f/<id>.<ext>` (file bytes) · `t/<id>.jpg` (thumbs/cards) · `_contrib/<id>.json` (one record per contributor upload, merged into the view) ·
`_links/<id>.json` (upload links; `token_hash` only) · `_pending/` (multipart uploads in flight) · `_projects/board.json` (+ `board.prev.json`, `daily/`).

**Branding.** Pages carry the placeholders `__TITLE__`, `__OWNER__`, `__CREDIT__` and `__FEEDBACK_EMAIL__`. The worker fills them into every
HTML/JS response from `_settings.json` (30 s cache). Settings are sanitized (no `< > " ' \` or backtick), so they are safe inside both HTML and JS strings.
If there is no feedback email, the envelope is hidden. If there is no brand, the credit is empty.

**Auth.** Viewer: POST `/login` (form `code`) → cookie `hs`. Contributor code: header `X-Contributor-Code`, or `/api/contrib/login` → cookie `hc`.
Upload link: token `<12 chars>_<32 chars>` in header `X-Upload-Token`, query `?t=`, or cookie `ht` (set by GET `/u/<token>`, then 303 to `/upload`).
Revoked/expired links fail everywhere at once, because each request re-reads `_links/<id>.json`. Admin: header `x-admin-key` (only its sha256 is stored).

**Admin API** (all need `x-admin-key`): `POST /admin/init {code, admin_key}` (once; 409 after) · `GET|POST /admin/settings` ·
`GET|PUT|DELETE /admin/obj?key=` (raw object; `_config.json` refused) · `GET /admin/list` · `GET /admin/manifest` (merged, incl. contrib) ·
`POST /admin/code {code}` · `POST /admin/contrib_code {code}` · `DELETE /admin/contrib_entry?id=` ·
`POST /admin/upload_link {folder, label, days (0 = never; default 30), allow_sub (default true)}` → `{id, token, url, api, expires}` ·
`GET /admin/upload_links` · `DELETE /admin/upload_link?id=` (revoke).

**Contributor API:** `GET /api/contrib/session` → `{contrib, viewer, scope, label, allow_sub}` · `GET /api/folders` ·
`POST /api/upload?filename=&name=&folder=&uploader=` (raw body, needs Content-Length, ≤ ~95 MB per request) ·
`POST /api/upload/init` → `PUT /api/upload/part?id=&uploadId=&n=` (8 MB parts) → `POST /api/upload/complete` (≤ 500 MB) ·
`POST /api/upload/thumb?id=` (JPEG ≤ 600 KB, once, within 1 h). Folder rules: with a link, the folder must be the link's folder or below it
(one new sub-level allowed when `allow_sub`). With the code, it must be an existing folder, or one new sub-level under one.

**CLI config:** `--config <file>` | `DRIVE_CONFIG` | `DRIVE_BASE` + `DRIVE_ADMIN_KEY` | default `/home/user/tab/state/secrets/teacher-drive.json`
(dir 0700, file 0600; written with O_EXCL 0600, never briefly world-readable). The pre-2026-11-03 default `/home/user/tab/state/teacher-drive.json`
is still read with a warning; `drive.py secure` moves it (and its `.pulled.json`), fixes modes, and scans the skill folder, `/home/user/tab/files`
and memory for files containing the admin key. `setup` refuses a config path inside the skill folder, `files/` or `memory/`.

**Backups.** `drive.py backup` lists objects (`GET /admin/list`, minus `_config.json` and `_pending/`; `--no-files` also drops `f/` and `t/`),
streams each into a tar piped to `openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -salt -pass file:<key>`, and appends
`_backup/index.json` (key, size, sha256 per object). Output `<dir>/<slug>-full|meta-<YYYYmmddTHHMMSSZ>.tar.enc` (0600, dir 0700), via `.partial` + rename.
Key: `--key` | `DRIVE_BACKUP_KEY` | `/home/user/tab/state/secrets/teacher-drive-backup.key`; dir: `--dir` | `DRIVE_BACKUP_DIR` |
`/home/user/tab/backups/teacher-drive/<slug>`. Refused when the key is inside the backup dir (or vice versa), the key is group/world-readable,
or the backup dir is inside the skill folder / `files/` / `memory/`. `verify` = full decrypt + per-object sha256 vs index + manifest parse +
every manifest/contrib file key present (full) + one sample file extracted to a 0700 temp dir. `prune` verifies the newest backup of each kind
first and deletes nothing of that kind if it fails (exit 2); then keeps the newest overall, everything < 14 days, and the newest per calendar
month among backups < 93 days; deletes the rest, `.partial` leftovers > 1 day, and site objects `_projects/daily/<date>.json` older than 14 days.
`restore --to-site --yes` PUTs every object back (content types from the manifest); the site must already be set up (its `_config.json` is never in a backup).
Python 3 with `requests` (and `Pillow` + `bs4`/`lxml` for link cards). `ffmpeg`/`ffprobe` make the video/image thumbs.
`link_shot.mjs` needs `playwright-core` + headless Chrome; if it fails, `link` falls back to og:image, then to a card without an image.

**Update the site code:** replace `site/_worker.js` and publish again under the same slug. Storage and settings stay.
**Remove a drive:** first `drive.py wipe --yes` (`POST /admin/wipe {"confirm":"DELETE EVERYTHING"}` deletes every object,
`_config.json` included), then `node /home/user/tab/publish-cli.mjs site.delete '{"slug":"<name>"}'`. Pull everything you want to keep first.
Measured 2026-11-03: `site.delete` on a non-empty store removes the Worker but leaves the store (provider error 10008 "bucket … is not empty")
and the row stays `deleting`; a new publish under that slug is then refused ("being removed and the removal did not finish"),
so the store can no longer be emptied from the box and the name stays held. Always `wipe --yes` first.

**Search (client-side, in the APP page).** Sticky search box `#q` in the files tab (hidden on `#projects`). Index = the loaded manifest:
per file `name`, `folder` path, `desc`, `ext`, `uploader`, `note`, and the host of a link card's `url`; folders by their own last path segment.
Normalisation `snorm()`: Hebrew niqqud/cantillation (U+0591–U+05C7, maqaf/sof-pasuq aside) and Latin diacritics removed, punctuation (״ ׳ ' " · - , . : ; ( ) etc.) removed,
lower-case, final letters ך ם ן ף ץ → כ מ נ פ צ, spaces collapsed. Query tokens are ANDed; each token also matches the space-less haystack.
Ranking: name starts with a token > all tokens in the name > elsewhere; folders first. Cap 60 rows + "show all". Rows reuse the folder-view
row/card renderers (same play/open/download) plus a breadcrumb (`.hcr[data-go]` → jump to folder, clears search). `/` focuses, Esc closes overlay then clears.
No server endpoint, no index to maintain. File contents are not searched.

**Board API + priority.** `GET /api/board` (viewer session) → `{version, updatedAt, updatedBy, projects:[{id, title, desc, links:[{url,label}],
status: ""|"me"|"tab"|"other", done, doneAt, createdAt, rank, tasks:[{id, text, who:"her"|"tab", done, doneAt, rank}]}], rankNote}`.
`PUT /api/board` `{board:{projects:[...]}, base:<updatedAt>}` (viewer session; 401 without) saves the whole board; the server keeps
`_projects/board.prev.json` and one `_projects/daily/<date>.json` per day, keeps each task's `who` if a client dropped it, and returns
`{ok, updatedAt, overwrote_newer}`. **Priority = array order.** `rankBoard()` stamps `rank` on every GET and every web PUT: projects 1..N among
active ones, tasks 1..k among the open tasks of their project, done = `null`. `board.py` re-stamps on every write (`rank()`), and
`board.py prio [--who tab|her|all] [--json]` returns open tasks sorted by `(project_rank, task_rank)`. The page (`/board.js?v=4`) reorders the
array on drop (pointer events: mouse + touch; ▲▼ buttons; ArrowUp/Down on a focused grip); in a filtered view an item lands next to the item it
passed, done projects keep their slots. The agent reads with the admin key via `GET /admin/obj?key=_projects/board.json` (same JSON, ranks
added client-side by `board.py`).

**Daily run.** A daily schedule (see section 11) whose prompt is self-contained: Drive URL, CLI paths, folder rules, when to message.
Steps: `board.py prio --who all` → compare finished work with `drive.py list` (add / `--replace` / `move`) → `check-links` → `pull --new` →
inboxes → board states (never reorder) → next task = top Tab row in `prio` → message only on change → one memory line. No secrets in the prompt.
