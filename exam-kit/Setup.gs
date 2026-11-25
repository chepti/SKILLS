/**
 * התקנה, הגדרות, תפריט בגיליון והצעות ניקוד מ-Gemini.
 * המפתח של Gemini נשמר רק בתא המסומן בלשונית "הגדרות" ולא בקוד ולא בשיחה.
 */

var SETTINGS_SHEET = 'הגדרות';
var VERSIONS_MARK = 'קוד נוסח';

// ---------------------------------------------------------------- הגדרות

/** קורא ערך מלשונית "הגדרות" לפי התווית בעמודה A. */
function getSetting_(label) {
  var sh = ss_().getSheetByName(SETTINGS_SHEET);
  if (!sh) return '';
  var n = Math.min(sh.getLastRow(), 40);
  if (n < 1) return '';
  var vals = sh.getRange(1, 1, n, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === label) return String(vals[i][1] == null ? '' : vals[i][1]).trim();
  }
  return '';
}
function setSetting_(label, value) {
  var sh = ss_().getSheetByName(SETTINGS_SHEET);
  var n = Math.min(sh.getLastRow(), 40), vals = sh.getRange(1, 1, n, 2).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === label) { sh.getRange(i + 1, 2).setValue(value); return true; }
  return false;
}

/** טבלת הנוסחים: קוד | שם מוצג | קבוצה | קוד גישה */
function versions_() {
  var sh = ss_().getSheetByName(SETTINGS_SHEET);
  if (!sh) return [{ id: 'A', label: 'נוסח א', group: '1', code: '' }];
  var vals = sh.getDataRange().getValues(), out = [], on = false;
  for (var i = 0; i < vals.length; i++) {
    var a = String(vals[i][0]).trim();
    if (!on) { if (a === VERSIONS_MARK) on = true; continue; }
    if (!a) break;
    out.push({ id: a, label: String(vals[i][1] || a).trim(), group: String(vals[i][2] || '1').trim(), code: String(vals[i][3] == null ? '' : vals[i][3]).trim() });
  }
  return out.length ? out : [{ id: 'A', label: 'נוסח א', group: '1', code: '' }];
}

function touchUrl_() {
  try {
    var u = webUrl_();
    if (u && getSetting_('כתובת האתר') !== u) setSetting_('כתובת האתר', u);
  } catch (e) { /* לא קריטי */ }
}

// ---------------------------------------------------------------- תפריט והתקנה

function onOpen() {
  SpreadsheetApp.getUi().createMenu('מבדק')
    .addItem('1. התקנה ראשונה', 'setupAll')
    .addItem('בדיקת תקינות השאלון', 'validateContentMenu')
    .addItem('הצגת קישורים וקודים', 'refreshStart')
    .addSeparator()
    .addItem('בדיקת חיבור ל-Gemini', 'testGemini')
    .addItem('הצעות ניקוד מ-Gemini לכל מה שממתין', 'geminiRunMenu')
    .addSeparator()
    .addItem('מחיקת נתוני כיתת הניסוי', 'clearTestData')
    .addToUi();
}

function ensureSheet_(ss, name, head) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (head) { sh.appendRow(head); sheetInit_(sh); } }
  return sh;
}

function setupAll() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  props_().setProperty('SS_ID', ss.getId());
  if (!props_().getProperty('ADMIN_KEY')) props_().setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  if (!props_().getProperty('AGENT_KEY')) props_().setProperty('AGENT_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 24));

  // הגדרות
  var st = ss.getSheetByName(SETTINGS_SHEET);
  if (!st) {
    st = ss.insertSheet(SETTINGS_SHEET);
    var rows = [
      ['הגדרה', 'ערך', 'הסבר'],
      ['שם המבדק', 'מבדק התא', 'מופיע בכותרת הדף של התלמידות'],
      ['כותרת משנה', 'מדע וטכנולוגיה, כיתה ח׳', 'מופיעה בראש המבדק'],
      ['משך מומלץ בדקות', '48', 'מוצג בדף הפתיחה'],
      ['כיתת ניסוי למורים', 'ניסוי מורים', 'מורות שמנסות את המבדק בוחרות "אני מורה", והתוצאות שלהן נשמרות בכיתה הזו בנפרד מהכיתות האמיתיות'],
      ['אכיפת פורמט כיתה', 'כן', 'כן: התלמידות כותבות כיתה כאות וספרה (ח2). לא: טקסט חופשי'],
      ['מפתח API של Gemini', '', 'להדביק כאן מפתח מ-Google AI Studio (aistudio.google.com/apikey). חשבון ארגוני בלבד. לא מדביקים את המפתח בשום מקום אחר'],
      ['דגם Gemini', 'gemini-2.5-flash', 'אפשר להחליף בדגם אחר. "בדיקת חיבור" בתפריט מציגה את הדגמים הזמינים'],
      ['סגנון ניקוד של הסוכן', 'נדיב', 'מחמיר, רגיל או נדיב. קובע כמה הסוכן סלחני כשחסר פרט משני'],
      ['הנחיות נוספות לסוכן', '', 'אופציונלי: למשל "אל תדרשי מספרים מהטבלה כשהרעיון נכון"'],
      ['כתובת האתר', '', 'מתעדכנת אוטומטית אחרי הפריסה'],
      ['אימייל למשוב', '', 'אופציונלי: אם מוזן, מוצג בתחתית דף התלמידות כפתור "שליחת משוב" לכתובת הזו']
    ];
    st.getRange(1, 1, rows.length, 3).setValues(rows);
    var vrow = rows.length + 2;
    st.getRange(vrow, 1, 1, 4).setValues([[VERSIONS_MARK, 'שם מוצג', 'קבוצה', 'קוד גישה (ריק = פתוח)']]);
    st.getRange(vrow + 1, 1, 3, 4).setValues([['A', 'נוסח א', '1', ''], ['B', 'נוסח ב', '1', ''], ['C', 'מועד ב', '2', String(Math.floor(100000 + Math.random() * 900000))]]);
    st.getRange(vrow + 5, 1).setValue('קבוצה: נוסחים באותה קבוצה נחשבים בעלי אותן שאלות בסיכומי הכיתה. נוסח עם שאלות שונות נכנס לקבוצה אחרת.');
    st.setRightToLeft(true);
    st.getRange(1, 1, 1, 3).setFontWeight('bold'); st.getRange(vrow, 1, 1, 4).setFontWeight('bold');
    st.setColumnWidth(1, 190); st.setColumnWidth(2, 230); st.setColumnWidth(3, 520); st.setColumnWidth(4, 180);
    st.getRange(1, 3, rows.length, 1).setWrap(true);
    st.getRange(7, 2).setBackground('#fff2a8').setNote('מפתח ה-API של Gemini. נשמר כאן בלבד.');
    ss.setNamedRange('GEMINI_API_KEY', st.getRange(7, 2));
    st.getRange(9, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['מחמיר', 'רגיל', 'נדיב'], true).build());
    st.getRange(6, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['כן', 'לא'], true).build());
    st.setFrozenRows(1);
  }

  // שאלון (תוכן המבדק)
  var q = ss.getSheetByName(CONTENT_SHEET);
  if (!q) {
    q = ss.insertSheet(CONTENT_SHEET);
    q.getRange(1, 1, 1, CONTENT_HEAD.length).setValues([CONTENT_HEAD]);
    sheetInit_(q);
    if (typeof SAMPLE_ROWS !== 'undefined' && SAMPLE_ROWS.length > 1) q.getRange(2, 1, SAMPLE_ROWS.length - 1, CONTENT_HEAD.length).setValues(SAMPLE_ROWS.slice(1));
    q.getRange(1, 1, q.getMaxRows(), CONTENT_HEAD.length).setWrap(true).setVerticalAlignment('top');
    [60, 70, 60, 420, 360, 60, 260, 260, 260, 110, 160].forEach(function (w, i) { q.setColumnWidth(i + 1, w); });
    q.getRange(1, 1, 1, CONTENT_HEAD.length).setBackground('#d9f2ea');
  }

  // תוצאות ונתונים
  ensureSheet_(ss, 'תוצאות', ['מזהה', 'זמן הגשה', 'שם', 'כיתה', 'נוסח', 'משך (דקות)', 'ניקוד אוטומטי', 'ניקוד פתוחות', 'סה״כ', 'מתוך', 'דגלים', 'יציאות מהחלון', 'ניסיונות הדבקה', 'המבדק היה', 'אני אוהבת ש...', 'אשמח ש...', 'פעילות או ניסוי שאהבתי', 'קוד אישי', 'פורסם', 'משוב כללי לתלמידה', 'הוסרה']);
  ensureSheet_(ss, 'תשובות פתוחות', ['מזהה', 'שם', 'נוסח', 'שאלה', 'שדה', 'מקסימום', 'תשובה', 'ניקוד מורה', 'משוב לתלמידה', 'הצעת סוכן', 'נימוק הסוכן', 'תבחינים']);
  ensureSheet_(ss, 'תשובות סגורות', ['מזהה', 'שם', 'נוסח', 'שדה', 'תשובת התלמידה', 'נכון', 'ניקוד', 'מקסימום']);
  ensureSheet_(ss, 'טיוטות', ['מזהה', 'שם', 'נוסח', 'עודכן', 'תשובות (JSON)']);
  ensureSheet_(ss, 'דוח בדיקה', ['נוסח', 'הערה']);
  writeGuide_(ss);
  var s0 = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (s0 && ss.getSheets().length > 1 && s0.getLastRow() === 0) ss.deleteSheet(s0);
  refreshStart();
  ss.setActiveSheet(ss.getSheetByName('התחלה'));
  ui.alert('ההתקנה הסתיימה', 'נוצרו הלשוניות: התחלה, שאלון, הגדרות, מדריך ולשוניות התוצאות.\n\nהשלב הבא: פריסה כאפליקציית אינטרנט (הוראות בלשונית "התחלה").', ui.ButtonSet.OK);
}

function writeGuide_(ss) {
  var g = ss.getSheetByName('מדריך');
  if (g) return;
  g = ss.insertSheet('מדריך');
  var L = [
    ['איך כותבים את לשונית "שאלון"'],
    ['כל שורה היא רכיב אחד במבדק: יחידה, פסקה, איור, טבלה, גרף או שאלה. השורות של נוסח אחד מופיעות לפי הסדר. עמודת "נוסח" מכילה את קוד הנוסח מהלשונית "הגדרות" (A, B, C).'],
    [''],
    ['סוג = יחידה'],
    ['מספר: מספר היחידה. טקסט: הכותרת. פרטים: תיאור קצר (אם ריק נוצר "שאלות X–Y"). תמונה: כתובת תמונה לבאנר (אופציונלי).'],
    ['סוג = פסקה'],
    ['טקסט: פסקת קריאה. מותר <b>, <i>, <br>.'],
    ['סוג = איור'],
    ['טקסט: קוד SVG (מתחיל ב-<svg) או כתובת תמונה (https). פרטים: כיתוב. הסבר: תיאור לקורא מסך.'],
    ['סוג = טבלה'],
    ['טקסט: כיתוב. פרטים: שורת כותרות ואחריה שורות, תאים מופרדים ב-| ושורות מופרדות ב- ;;   למשל: המין|חתול|כלב ;; כרומוזומים|38|78'],
    ['סוג = גרף'],
    ['טקסט: כיתוב. פרטים (מופרדים ב- ;;): xt=כותרת ציר x ;; yt=כותרת ציר y ;; ymin=0 ;; ymax=100 ;; ystep=20 ;; x=0,2,4 ;; קו:שם=100,95,90 ;; מקווקו:שם=100,70,40'],
    ['סוג = שאלה'],
    ['מספר: מספר השאלה. טקסט: ניסוח השאלה. פרטים: סוג השאלה ואחריו נקודתיים. ניקוד: ניקוד כולל (מתחלק שווה בין השדות). יכולת: למשל "הסבר תופעות" (לתמונה הכיתתית).'],
    ['בחירה: אפשרות | *אפשרות נכונה | אפשרות | אפשרות   (כוכבית * לפני או אחרי התשובה הנכונה). עמודת "הסבר": ההסבר שהתלמידה תקבל במשוב.'],
    ['פתוחה: שורות=4   (אפשר גם ; תווית=א לשאלה עם כמה חלקים: כל חלק בשורה נפרדת עם אותו מספר שאלה). עמודות "תבחינים" ו"תשובה לדוגמה" חובה.'],
    ['טבלת מספרים: כותרות=התא|מספר ;; תא זרע=31 ;; ביצית=32   (בדיקה אוטומטית)'],
    ['טבלת שם ותפקיד: כותרות=מספר|שם|תפקיד ;; 1=גרעין/גרעינון|שולט בתא ומכיל DNA ;; 2=כלורופלסט|מייצר סוכר מאור   (שם נבדק אוטומטית, תפקיד על ידי המורה)'],
    ['השלמה: אצל הרצים מספר התאים {גדל*|קטן|לא השתנה}. לכן מגיע {יותר חמצן*|פחות חמצן}.   (קלוז עם רשימות)'],
    ['מטריצה: עמודות=תא|רקמה|איבר ;; שריר אחד=תא ;; הלב=איבר   (כל שורה: פריט=העמודה הנכונה)'],
    [''],
    ['טיפים'],
    ['אחרי שינוי בשאלון: בתפריט מבדק > בדיקת תקינות השאלון. הבדיקה מדווחת על חסרים (תשובה נכונה, תבחינים, סך ניקוד 100).'],
    ['הדרך הנוחה לכתוב שאלון: לתת לבינה מלאכותית (Gemini, Claude) את הסקיל "tnufa-exam-author", לתאר לה את הנושא והכיתה, ולהדביק את השורות שהיא מחזירה ממש בתא A2 של לשונית השאלון.'],
    ['תוצאות ונתונים אישיים: הכול נשמר בגיליון הזה בחשבון שלך בלבד.']
  ];
  g.getRange(1, 1, L.length, 1).setValues(L);
  g.setColumnWidth(1, 900); g.getRange(1, 1, L.length, 1).setWrap(true).setVerticalAlignment('top');
  [1, 4, 6, 8, 10, 12, 14, 22].forEach(function (r) { g.getRange(r, 1).setFontWeight('bold'); });
  g.setRightToLeft(true);
}

/** לשונית "התחלה": הוראות, קישורים וקודים. */
function refreshStart() {
  var ss = ss_(), sh = ss.getSheetByName('התחלה');
  if (!sh) sh = ss.insertSheet('התחלה', 0);
  sh.clear();
  var url = webUrl_() || getSetting_('כתובת האתר');
  var key = props_().getProperty('ADMIN_KEY') || '(עוד לא הותקן)';
  var L = [
    ['ערכה: מבדק מקוון בסגנון תנופה'],
    [''],
    ['שלבים'],
    ['1. הועתק הגיליון הזה: הסקריפט והלשוניות כבר בפנים. בתפריט "מבדק" לבחור "התקנה ראשונה" (אישור הרשאות חד-פעמי).'],
    ['2. תוכן המבדק: בלשונית "שאלון". אפשר לכתוב ידנית לפי הלשונית "מדריך", או לתת לבינה מלאכותית את הסקיל tnufa-exam-author ולהדביק את מה שהיא מחזירה. אחר כך: מבדק > בדיקת תקינות השאלון.'],
    ['3. פריסה: תוספות > Apps Script > פריסה > פריסה חדשה > סוג: אפליקציית אינטרנט > הפעלה בתור: אני > גישה: כל אחד > פריסה. אחרי הכניסה הראשונה לכתובת, היא מופיעה גם כאן ובהגדרות.'],
    ['4. בדיקה: בלשונית "הגדרות" להדביק מפתח API מ-Google AI Studio בתא הצהוב. בתפריט: בדיקת חיבור ל-Gemini. בלוח המורה: כפתור "הצעות ניקוד מ-Gemini".'],
    [''],
    ['קישורים'],
    ['כתובת לתלמידות', url || '(אחרי הפריסה)'],
    ['לוח המורה', url ? url + '?page=teacher&key=' + key : '(אחרי הפריסה)'],
    ['משוב לתלמידות (קוד אישי)', url ? url + '?page=result' : '(אחרי הפריסה)'],
    ['מפתח מורה (אל תשתפי)', key],
    [''],
    ['פרטיות'],
    ['נתוני התלמידות נשמרים בגיליון הזה. אל Gemini נשלחים רק ניסוח השאלה, התבחינים ותשובת התלמידה, בלי שם ובלי כיתה. השתמשי בחשבון ארגוני שמוגדר שלא לאמן מודלים על המידע.']
  ];
  var vals = L.map(function (r) { var x = r.slice(); while (x.length < 2) x.push(''); return x; });
  sh.getRange(1, 1, vals.length, 2).setValues(vals);
  sh.setRightToLeft(true); sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 760);
  sh.getRange(1, 1, vals.length, 2).setWrap(true).setVerticalAlignment('top');
  [1, 3, 9, 15].forEach(function (r) { sh.getRange(r, 1).setFontWeight('bold'); });
  sh.getRange(1, 1).setFontSize(16);
  [4, 5, 6, 7, 16].forEach(function (r) { sh.getRange(r, 1, 1, 2).mergeAcross(); });
}

function validateContentMenu() {
  var ui = SpreadsheetApp.getUi(), ss = ss_();
  var vals = ss.getSheetByName(CONTENT_SHEET).getDataRange().getValues();
  var rep = ss.getSheetByName('דוח בדיקה') || ss.insertSheet('דוח בדיקה');
  rep.clear(); rep.appendRow(['נוסח', 'הערה']); sheetInit_(rep);
  var lines = [], total = 0;
  versions_().forEach(function (v) {
    var r = parseContent_(vals, v.id), qn = 0;
    r.exam.units.forEach(function (u) { u.items.forEach(function (i) { if (i.t === 'q') qn++; }); });
    var issues = r.issues;
    if (!issues.length) lines.push([v.id, 'תקין: ' + qn + ' שאלות, ' + Math.round(r.total * 100) / 100 + ' נקודות']);
    issues.forEach(function (x) { lines.push([v.id, x]); total++; });
  });
  rep.getRange(2, 1, lines.length, 2).setValues(lines);
  rep.setColumnWidth(2, 700); rep.setRightToLeft(true);
  ss.setActiveSheet(rep);
  ui.alert(total ? 'נמצאו ' + total + ' הערות' : 'השאלון תקין', total ? 'הפירוט בלשונית "דוח בדיקה".' : 'כל הנוסחים תקינים.', ui.ButtonSet.OK);
}

function clearTestData() {
  var ui = SpreadsheetApp.getUi(), ss = ss_(), tc = testClass_();
  if (!tc) { ui.alert('לא הוגדרה כיתת ניסוי.'); return; }
  if (ui.alert('למחוק את כל הנתונים של כיתת הניסוי "' + tc + '"?', 'המחיקה אינה הפיכה.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var res = ss.getSheetByName('תוצאות'), n = res.getLastRow() - 1, ids = {};
  if (n > 0) {
    var v = res.getRange(2, 1, n, R.cls).getValues();
    for (var i = v.length - 1; i >= 0; i--) if (String(v[i][R.cls - 1]) === tc) { ids[v[i][0]] = true; res.deleteRow(i + 2); }
  }
  ['תשובות פתוחות', 'תשובות סגורות', 'טיוטות'].forEach(function (nm) {
    var sh = ss.getSheetByName(nm), m = sh.getLastRow() - 1;
    if (m < 1) return;
    var col = sh.getRange(2, 1, m, 1).getValues();
    for (var j = col.length - 1; j >= 0; j--) if (ids[col[j][0]]) sh.deleteRow(j + 2);
  });
  ui.alert('נמחקו ' + Object.keys(ids).length + ' הגשות של כיתת הניסוי.');
}

// ---------------------------------------------------------------- Gemini

function geminiKey_() { return getSetting_('מפתח API של Gemini'); }
function geminiModel_() { return getSetting_('דגם Gemini') || 'gemini-2.5-flash'; }

function geminiPost_(body) {
  var key = geminiKey_();
  if (!key) throw new Error('חסר מפתח API. יש להדביק אותו בתא הצהוב בלשונית "הגדרות".');
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(geminiModel_()) + ':generateContent';
  var resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(body), muteHttpExceptions: true });
  var code = resp.getResponseCode(), txt = resp.getContentText();
  if (code !== 200) {
    var msg = ''; try { msg = JSON.parse(txt).error.message; } catch (e) { msg = txt.slice(0, 200); }
    throw new Error('Gemini החזיר שגיאה ' + code + ': ' + String(msg).replace(key, '***'));
  }
  return JSON.parse(txt);
}

function testGemini() {
  var ui = SpreadsheetApp.getUi();
  try {
    var key = geminiKey_();
    if (!key) { ui.alert('חסר מפתח', 'יש להדביק מפתח API בתא הצהוב בלשונית "הגדרות".', ui.ButtonSet.OK); return; }
    var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) { ui.alert('החיבור נכשל', 'קוד ' + r.getResponseCode() + '. בדקי שהמפתח נכון ושה-API פעיל בפרויקט.', ui.ButtonSet.OK); return; }
    var models = (JSON.parse(r.getContentText()).models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace('models/', ''); });
    var cur = geminiModel_(), has = models.indexOf(cur) >= 0;
    var out = gemini_([{ id: '1', answer: 'הגרעין שולט בתא' }], { stem: 'בדיקה: מה תפקיד הגרעין?', max: 2, rubric: '2 נק׳: שולט בתא או מכיל חומר תורשתי', model: 'שולט בתא ומכיל חומר תורשתי.' }, []);
    ui.alert('החיבור תקין', 'דגם נוכחי: ' + cur + (has ? ' (זמין)' : ' (לא נמצא ברשימה, כדאי להחליף)') + '\nבדיקת ניקוד לדוגמה: ' + JSON.stringify(out[0] || {}) + '\nדגמי flash זמינים: ' + models.filter(function (m) { return /flash/.test(m); }).slice(0, 6).join(', '), ui.ButtonSet.OK);
  } catch (e) { ui.alert('שגיאה', String(e.message || e), ui.ButtonSet.OK); }
}

function isNonAnswer_(a) {
  var s = String(a == null ? '' : a).trim();
  var t = s.replace(/[\s.\-?!,:;"'״׳]/g, '');
  if (!t) return true;
  if (/^(לא\s*יודע|לא\s*ידע|אין\s*לי\s*מושג|אינני\s*יודע|לא\s*זוכר|לא\s*הבנתי)/.test(s.replace(/^[\s"']+/, ''))) return true;
  var words = s.split(/\s+/);
  if (words.length === 1 && t.length <= 6) return true;
  return false;
}

/**
 * items: [{id, answer}] (בלי שם וכיתה). ctx: {stem, max, rubric, model, label}. examples: [{answer, score}]
 * מחזיר מערך {id, score, note}.
 */
function gemini_(items, ctx, examples) {
  var style = getSetting_('סגנון ניקוד של הסוכן') || 'רגיל', extra = getSetting_('הנחיות נוספות לסוכן');
  var styleTxt = { 'מחמיר': 'היי מדויקת ומחמירה: נקודות רק על מה שכתוב במפורש.', 'רגיל': 'היי הוגנת: נקודות על מה שכתוב, וחלקיות כשהרעיון נכון וחסר פרט.', 'נדיב': 'היי נדיבה: כשהרעיון המרכזי נכון וההסבר סביר, תני ניקוד גבוה גם אם חסר פרט משני כמו מספר מהטבלה או שם מדויק. לא לתת נקודות לתשובה שאין בה רעיון נכון.' }[style] || '';
  var sys = 'את מורה למדעים שבודקת תשובות פתוחות של תלמידות בחטיבת הביניים. נקדי כל תשובה לפי התבחינים.\n' + styleTxt + '\n' +
    'כללים: הניקוד הוא מספר שלם בין 0 לניקוד המרבי. תשובה ריקה, "לא יודעת" או רצף סימנים: 0. ' +
    'בשדה note כתבי הערה קצרה בגוף שני, בלשון נקבה, הפונה ישירות לתלמידה, במשפטים שלמים (עד שלושה): מה היה טוב ומה חסר. אל תעתיקי את התשובה לדוגמה במלואה. אל תזכירי ניקוד במספרים. אל תוסיפי טקסט מחוץ ל-JSON.' + (extra ? '\nהנחיות נוספות מהמורה: ' + extra : '');
  var user = 'השאלה: ' + ctx.stem + (ctx.label ? ' (חלק ' + ctx.label + ')' : '') + '\nניקוד מרבי: ' + ctx.max + '\nתבחינים: ' + ctx.rubric + '\nתשובה לדוגמה: ' + ctx.model +
    (examples && examples.length ? '\n\nדוגמאות לניקוד של המורה (לכיול):\n' + examples.map(function (e) { return '- תשובה: "' + e.answer + '" ← ניקוד ' + e.score; }).join('\n') : '') +
    '\n\nהתשובות לבדיקה (JSON):\n' + JSON.stringify(items.map(function (x) { return { id: x.id, answer: x.answer }; }));
  var body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, score: { type: 'INTEGER' }, note: { type: 'STRING' } }, required: ['id', 'score', 'note'] } } }
  };
  var data = geminiPost_(body);
  var txt = (((data.candidates || [])[0] || {}).content || {}).parts;
  txt = txt && txt[0] && txt[0].text;
  if (!txt) throw new Error('Gemini לא החזיר תשובה (ייתכן שנחסם). נסי שוב או החליפי דגם.');
  var arr = JSON.parse(txt);
  return arr.map(function (x) { return { id: String(x.id), score: Math.max(0, Math.min(Number(ctx.max), Math.round(Number(x.score) || 0))), note: String(x.note || '').slice(0, 600) }; });
}

/**
 * מעבד קבוצה אחת (נוסח + שדה) של תשובות שממתינות להצעה. נקרא שוב ושוב עד ש-remaining מגיע ל-0.
 * opts: {cls}
 */
function geminiBatch_(opts) {
  var cls = (opts && opts.cls) || '';
  var res = table_('תוצאות').rows, info = {};
  res.forEach(function (r) { info[r[0]] = { cls: r[R.cls - 1], gone: String(r[R.rem - 1]) === 'כן' }; });
  var sh = ss_().getSheetByName('תשובות פתוחות'), n = sh.getLastRow() - 1;
  if (n < 1) return { processed: 0, remaining: 0 };
  var all = sh.getRange(2, 1, n, 12).getValues(), pend = [], graded = {};
  all.forEach(function (r, i) {
    var sid = r[0], f = r[O.field - 1], ver = r[O.ver - 1];
    var gk = ver + '|' + f;
    if (r[O.score - 1] !== '' && r[O.score - 1] != null && String(r[O.ans - 1]).trim()) { (graded[gk] = graded[gk] || []).push({ answer: String(r[O.ans - 1]).slice(0, 600), score: Number(r[O.score - 1]) }); }
    var has = r[O.sug - 1] !== '' && r[O.sug - 1] != null, done = r[O.score - 1] !== '' && r[O.score - 1] != null;
    if (has || done || !info[sid] || info[sid].gone) return;
    if (cls && info[sid].cls !== cls) return;
    pend.push({ row: i + 2, sid: sid, field: f, ver: ver, ans: String(r[O.ans - 1] == null ? '' : r[O.ans - 1]), max: Number(r[O.max - 1]), rubric: r[O.rubric - 1] });
  });
  if (!pend.length) return { processed: 0, remaining: 0 };
  var first = pend[0], group = pend.filter(function (p) { return p.ver === first.ver && p.field === first.field; });
  var batch = group.slice(0, 12), out = [];
  // ללא קריאה: תשובות ריקות
  var toAsk = [], map = {};
  batch.forEach(function (p, i) {
    if (isNonAnswer_(p.ans)) out.push({ sid: p.sid, field: p.field, score: 0, note: 'לא כתבת תשובה בסעיף הזה. כדאי לקרוא שוב את השאלה ולנסות לענות, גם אם לא בטוחה.' });
    else { var id = String(i + 1); map[id] = p; toAsk.push({ id: id, answer: p.ans }); }
  });
  var fm = meta_(first.ver).fields[first.field] || {};
  if (toAsk.length) {
    var ex = (graded[first.ver + '|' + first.field] || []).slice(0, 4);
    var ctx = { stem: fm.stem || '', label: fm.label || '', max: first.max, rubric: first.rubric || fm.rubric || '', model: fm.model || '' };
    var results = gemini_(toAsk, ctx, ex);
    results.forEach(function (r) { var p = map[r.id]; if (p) out.push({ sid: p.sid, field: p.field, score: r.score, note: r.note }); });
  }
  if (out.length) suggest_(out);
  return { processed: out.length, remaining: pend.length - batch.length };
}

/** לשימוש לוח המורה: כל קריאה מעבדת עד 12 תשובות. */
function tGemini(key, opts) {
  needAdmin_(key);
  try { return Object.assign({ ok: true }, geminiBatch_(opts || {})); }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
}

function geminiRunMenu() {
  var ui = SpreadsheetApp.getUi(), start = Date.now(), total = 0, rem = 1;
  try {
    while (rem > 0 && Date.now() - start < 270000) { var r = geminiBatch_({}); total += r.processed; rem = r.remaining; }
    ui.alert('הצעות ניקוד', 'נוצרו הצעות ל-' + total + ' תשובות.' + (rem > 0 ? ' נשארו עוד ' + rem + ': להריץ שוב.' : ' אין עוד תשובות שממתינות.') + '\nההצעות מופיעות בלוח הבדיקה ליד הכוכבים, ובלשונית "תשובות פתוחות" בעמודה "הצעת סוכן".', ui.ButtonSet.OK);
  } catch (e) { ui.alert('שגיאה', String(e.message || e), ui.ButtonSet.OK); }
}
