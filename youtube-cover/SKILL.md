---
name: youtube-cover
description: Make a YouTube cover (thumbnail) image for one of Chepti's videos in the channel's house style - a Pixar-like 3D illustrated scene with big colourful tilted Hebrew sticker labels - without fighting an image model over Hebrew text. Use whenever she asks for a תמונת קאבר / כיסוי / תמונה ממוזערת / thumbnail / קאבר לסרטון, hands over a video topic or title for a cover, or says Gemini keeps garbling the text on a cover.
---

# תמונת קאבר לסרטון ביוטיוב

**הרעיון: האיור נוצר בלי טקסט בכלל, והכתוביות בעברית נוספות אחר כך בקוד.** מודלי תמונה (ג'מיני, AGY) משבשים עברית "לפעמים" ודורשים ניסיונות חוזרים; כתוביות שנכתבות בקוד תמיד יוצאות נכון, עקביות ובגופן הנכון. לא מבקשים מהמודל לצייר מילים.

## הסגנון של הערוץ (מתוך הקאברים הקיימים)
- סצנת 3D בסגנון פיקסאר, צבעונית ומפורטת, תאורה רכה, דמויות עם עיניים גדולות וחמות (ילדים, מורה, רובוט חביב).
- הסצנה מספרת את נושא הסרטון במבט אחד (למשל: מורה ורובוט בודקים מבחן יחד).
- 2 עד 3 כתוביות גדולות על צבעי רקע בוהקים, מוטות מעט, בצורת מדבקה עגולה עם מסגרת לבנה וצל. הטקסט כהה וקצר: נושא, כלי או התועלת, 1 עד 3 מילים בכל כתובית.
- יחס 16:9, יעד סופי 1280×720.

## התהליך

1. **לקבוע את הנושא והכתוביות.** מכותרת הסרטון לוקחים 2-3 ביטויים קצרים ("סט מבחן", "בדיקה משותפת", "מורה + בינה"). לא כל הכותרת. אם חסר מידע, לשאול משפט אחד.
2. **ליצור איור בסיס בלי טקסט עם AGY** (לפי ההנחיות הגלובליות: התוצאה נשמרת ב-`T:\הורדות\`). הפרומפט באנגלית, וחייב לכלול:
   - `3D Pixar-style animated movie scene, very colorful and detailed, soft warm lighting, big warm expressive eyes.`
   - תיאור הסצנה המסופרת, עם הדמויות (מורה עם משקפיים, רובוט עגול וחמוד עם פנים כחולות זוהרות, ילדים מחייכים ברקע).
   - `Keep the top-right corner and the bottom-left corner relatively simple and uncluttered.` (שם יושבות הכתוביות; הפרצופים נשארים במרכז.)
   - `16:9 landscape. Absolutely no text, no letters, no words, no numbers anywhere in the image.`
   - שם קובץ תיאורי ושמירה בתיקייה הנוכחית: `Save it as <שם>-base.png in the current directory and print the file path.`

   ```powershell
   Set-Location "T:\הורדות"; & "T:\Tools\agy\bin\agy.exe" --print "<הפרומפט>" --print-timeout 170s --dangerously-skip-permissions
   ```
   לוקח כדקה, יוצא 1376×768. לפתוח את התמונה ולבדוק: אין טקסט בטעות, הפרצופים טובים, הפינות פנויות. אם לא, ליצור שוב עם תיקון בפרומפט.
3. **לכתוב קובץ `labels.json`** (UTF-8) ולהריץ את `compose-cover.ps1` שבתיקיית ה-skill:

   ```json
   [
     { "text": "סט מבחן",       "fill": "#F6E53A", "x": 0.80, "y": 0.105, "size": 0.105, "angle": -4 },
     { "text": "בדיקה משותפת", "fill": "#3FD0C0", "x": 0.79, "y": 0.275, "size": 0.078, "angle": 3 },
     { "text": "מורה + בינה",  "fill": "#FF9F43", "x": 0.19, "y": 0.91,  "size": 0.092, "angle": -3 }
   ]
   ```
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.claude\skills\youtube-cover\compose-cover.ps1" -Base "T:\הורדות\<בסיס>.png" -LabelsFile "T:\הורדות\labels.json" -Out "T:\הורדות\<שם-תיאורי>.jpg"
   ```
   - `x`, `y`: מרכז הכתובית כשבר מהרוחב והגובה. `size`: גובה הטקסט כשבר מהגובה (0.08 עד 0.11 לכתובית ארוכה, עד 0.15 למילה קצרה). `angle`: הטיה קטנה, 8- עד 8.
   - פלטת הערוץ: צהוב `#F6E53A`, טורקיז `#3FD0C0`, ירוק ליים `#A6E22E`, כתום `#FF9F43`, סגול `#B565F2` (עם `"color": "#FFFFFF"` לטקסט לבן), ורוד `#FF6FA5`.
   - להשאיר את הפרצופים גלויים. כתוביות יכולות לחפוף קצת זו את זו ואת הרקע, אבל לא להסתיר דמויות ולא לגלוש מחוץ למסגרת. אם הטקסט נחתך, מקטינים `size` או מזיזים.
   - הסיומת `.jpg` שומרת באיכות 92: **יוטיוב מגביל תמונה ממוזערת ל-2MB**, ו-PNG של איור לרוב גדול מזה.
   - הגופן Heebo Black מותקן אצלה. אפשר להחליף עם `-FontName` (למשל `Assistant ExtraBold`, `Varela Round`).
4. **לפתוח את התוצאה ולהציג לה אותה**, ולתקן לפי הערות (מיקום, צבעים, ניסוח). כל תיקון כתוביות לוקח שניות, ואין צורך ליצור את האיור מחדש.

## מלכודות
- עברית מצוירת ע"י המודל = ניסוי וטעייה. לא חוזרים לזה.
- ב-PowerShell 5.1 משתנים אינם רגישים לאותיות, ולכן שם פרמטר לא יכול להיות זהה לשם משתנה אחר בסקריפט (`-LabelsFile` ולא `-Labels`). כבר תוקן בסקריפט.
- הגדרת קבצים בכונן T: איור הבסיס והתוצאה נשמרים ב-`T:\הורדות\`, לא בתיקיית הפרויקט.
- הדבקה בעברית דרך שורת פקודה עלולה להשתבש בקידוד; הכתוביות עוברות תמיד דרך `labels.json` שנכתב ב-UTF-8, לא כארגומנט.
