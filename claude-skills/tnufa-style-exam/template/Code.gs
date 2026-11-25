/**
 * מבדק התא (כיתה ח׳): אפליקציית אינטרנט ב-Apps Script.
 * Web app: Execute as me, Who has access: Anyone.
 *   (ללא פרמטרים)         דף המבדק לתלמידות
 *   ?page=result          צפייה במשוב (תלמידה, לפי קוד אישי, אחרי פרסום)
 *   ?page=teacher&key=KEY לוח המורה: בדיקה, תמונה כיתתית, פרסום משובים
 *   ?action=help          תיעוד ה-API (בלי סיסמה)
 * התוצאות נשמרות בגיליון Google שנוצר אוטומטית בחשבון המפרסם (authorize).
 * המפתח (תשובות נכונות) נשאר בשרת.
 */

var SS_TITLE = 'מבדק התא ח׳ - תוצאות';

// עמודות בלשונית "תוצאות" (מספור מ-1)
var R = { sid: 1, time: 2, name: 3, cls: 4, ver: 5, min: 6, auto: 7, open: 8, total: 9, max: 10, flags: 11, blur: 12, paste: 13, level: 14, like: 15, wish: 16, act: 17, code: 18, pub: 19, gen: 20, rem: 21 };
// עמודות בלשונית "תשובות פתוחות"
var O = { sid: 1, name: 2, ver: 3, n: 4, field: 5, max: 6, ans: 7, score: 8, fb: 9, sug: 10, sugNote: 11, rubric: 12 };

function props_() { return PropertiesService.getScriptProperties(); }

/** מפתח צר לסוכן: מותר לו להציע ניקוד, לקרוא תשובות ותמונת מצב, ולהגיש רק לכיתת הניסיון. לא לפרסם ולא לשנות ניקוד מורה. */
var AGENT_KEY = 'REPLACE_WITH_RANDOM_AGENT_KEY';
var TEST_CLASS = 'חולמים תקשוב';

/** להריץ פעם אחת מהעורך: מאשרת הרשאות, יוצרת את הגיליון ומחזירה את הקישור. */
function authorize() {
  var ss = ss_();
  Logger.log('גיליון התוצאות: ' + ss.getUrl());
  Logger.log('מפתח מורה (גם בלשונית "מידע" בגיליון): ' + props_().getProperty('ADMIN_KEY'));
  return ss.getUrl();
}

function sheetInit_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  sh.setRightToLeft(true);
}

function ss_() {
  var id = props_().getProperty('SS_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* נמחק: ניצור מחדש */ }
  }
  var ss = SpreadsheetApp.create(SS_TITLE);
  props_().setProperty('SS_ID', ss.getId());
  var key = props_().getProperty('ADMIN_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    props_().setProperty('ADMIN_KEY', key);
  }
  var res = ss.getSheets()[0].setName('תוצאות');
  res.appendRow(['מזהה', 'זמן הגשה', 'שם', 'כיתה', 'נוסח', 'משך (דקות)', 'ניקוד אוטומטי', 'ניקוד פתוחות', 'סה״כ', 'מתוך', 'דגלים', 'יציאות מהחלון', 'ניסיונות הדבקה', 'המבדק היה', 'אני אוהבת ש...', 'אשמח ש...', 'פעילות או ניסוי שאהבתי', 'קוד אישי', 'פורסם', 'משוב כללי לתלמידה']);
  sheetInit_(res);
  var open = ss.insertSheet('תשובות פתוחות');
  open.appendRow(['מזהה', 'שם', 'נוסח', 'שאלה', 'שדה', 'מקסימום', 'תשובה', 'ניקוד מורה', 'משוב לתלמידה', 'הצעת סוכן', 'נימוק הסוכן', 'תבחינים']);
  sheetInit_(open);
  var closed = ss.insertSheet('תשובות סגורות');
  closed.appendRow(['מזהה', 'שם', 'נוסח', 'שדה', 'תשובת התלמידה', 'נכון', 'ניקוד', 'מקסימום']);
  sheetInit_(closed);
  var drafts = ss.insertSheet('טיוטות');
  drafts.appendRow(['מזהה', 'שם', 'נוסח', 'עודכן', 'תשובות (JSON)']);
  sheetInit_(drafts);
  var info = ss.insertSheet('מידע');
  info.appendRow(['מפתח מורה', key]);
  info.appendRow(['לוח בדיקה', 'נפתח מהקישור של האפליקציה, עם הוספה של ?page=teacher&key=המפתח']);
  info.appendRow(['הערה', 'כל הנתונים נשמרים כאן. אפשר גם לכתוב ניקוד ישירות בעמודה "ניקוד מורה" בלשונית "תשובות פתוחות".']);
  info.setRightToLeft(true);
  return ss;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function isAdmin_(key) { return !!key && key === props_().getProperty('ADMIN_KEY'); }
function isAgent_(key) { return isAdmin_(key) || (!!key && key === AGENT_KEY); }

/** כיתה: אות אחת וספרה או שתיים (למשל ח2). כיתת הניסוי של המורים: "חולמים תקשוב". */
function normCls_(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (/חולמים\s*תקשוב/.test(s)) return TEST_CLASS;
  var t = s.replace(/[^א-ת0-9]/g, ''), m = t.match(/^([א-ת])([0-9]{1,2})$/);
  if (m) return m[1] + m[2];
  m = t.match(/^([0-9]{1,2})([א-ת])$/);
  if (m) return m[2] + m[1];
  return 'לא תקין: ' + s.slice(0, 20);
}
/** שם: שם פרטי ואות או שתיים משם המשפחה. */
function normName_(raw) {
  return String(raw == null ? '' : raw).replace(/[^א-תA-Za-z\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}
function webUrl_() { try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; } }

function page_(file, title) {
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (!p.action) {
      if (p.page === 'result') return page_('Result', 'משוב על המבדק');
      if (p.page === 'teacher') {
        if (!isAdmin_(p.key)) return HtmlService.createHtmlOutput('<p dir="rtl" style="font-family:sans-serif">מפתח שגוי.</p>');
        var t = HtmlService.createTemplateFromFile('Teacher');
        t.key = p.key;
        return t.evaluate().setTitle('בדיקת מבדק התא').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
      return page_('Index', 'מבדק התא');
    }
    if (p.action === 'help') return json_(help_());
    if (p.action === 'state' || p.action === 'toscore') {
      if (!isAgent_(p.key)) return json_({ ok: false, error: 'מפתח שגוי' });
      return json_(p.action === 'state' ? state_() : toScore_(p.all === '1', p.cls || ''));
    }
    if (!isAdmin_(p.key)) return json_({ ok: false, error: 'מפתח שגוי' });
    if (p.action === 'sheet') return json_({ ok: true, url: ss_().getUrl() });
    if (p.action === 'results') {
      var rows = ss_().getSheetByName('תוצאות').getDataRange().getValues();
      return json_({ ok: true, head: rows.shift(), rows: rows });
    }
    return json_({ ok: false, error: 'פעולה לא מוכרת. ראו ?action=help' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** POST (text/plain עם JSON): {key, action:'suggest', items:[{sid, field, score, note, match?}]} */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!isAgent_(body.key)) return json_({ ok: false, error: 'מפתח שגוי' });
    var admin = isAdmin_(body.key);
    if (body.action === 'suggest') return json_(suggest_(body.items || []));
    if (body.action === 'ops') {
      var out = (body.ops || []).map(function (op) {
        try {
          if (op.action === 'suggest') return suggest_(op.items || []);
          if (op.action === 'grade') return admin ? saveGrades_(op.items || []) : { ok: false, error: 'הפעולה דורשת מפתח מורה' };
          if (op.action === 'submitTest') {
            if (normCls_(op.sub && op.sub.cls) !== TEST_CLASS) return { ok: false, error: 'הגשת ניסיון מותרת רק לכיתה "' + TEST_CLASS + '"' };
            return submitExam(op.sub);
          }
          return { ok: false, error: 'פעולה לא מוכרת' };
        } catch (er) { return { ok: false, error: String(er) }; }
      });
      return json_({ ok: true, results: out });
    }
    return json_({ ok: false, error: 'פעולה לא מוכרת' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function help_() {
  return {
    ok: true, service: 'exam-cell-8',
    description: 'מבדק התא לכיתה ח׳ (נוסחים א וב). תלמידות עונות בדף הראשי, המורה בודקת בלוח המורה, והתלמידות רואות משוב בעזרת קוד אישי.',
    pages: {
      'הדף הראשי': 'מבדק לתלמידות',
      '?page=result': 'משוב לתלמידה, לפי קוד אישי (אחרי פרסום)',
      '?page=teacher&key=KEY': 'לוח מורה: בדיקה עם כוכבים, תמונה כיתתית, פרסום משובים'
    },
    api: {
      'GET ?action=help': 'המסמך הזה. בלי סיסמה',
      'GET ?action=state&key=KEY': 'תמונת מצב קצרה: הגשות, ממוצע, התקדמות בדיקה, טיוטות',
      'GET ?action=toscore&key=KEY[&all=1]': 'תשובות פתוחות שממתינות להצעת ניקוד מהסוכן (עם השאלה, התבחינים והתשובה). all=1 גם כאלה שכבר יש להן הצעה',
      'GET ?action=results&key=KEY': 'כל ההגשות',
      'GET ?action=sheet&key=KEY': 'קישור לגיליון',
      'POST (text/plain, JSON) {key, action:"suggest", items:[{sid|match, field, score, note}]}': 'הצעת ניקוד: match הוא חלק משם התלמידה (במקום sid). בהתנגשות מוחזרת רשימת מועמדות',
      'POST {key, action:"ops", ops:[{action:"suggest"|"grade", items:[...]}]}': 'כמה פעולות בבקשה אחת, עם דיווח הצלחה או כשל לכל אחת. grade: {sid|match, field, score, feedback}'
    },
    auth: 'מפתח מורה בפרמטר key (בלשונית "מידע" בגיליון): גישה מלאה. מפתח סוכן: state, toscore, suggest, והגשת ניסיון לכיתה "חולמים תקשוב" בלבד (ops עם submitTest)',
    classes: 'כיתה נכתבת כאות וספרה (ח2). "חולמים תקשוב" היא כיתת הניסוי של מורים. toscore מקבל cls=ח2 לסינון',
    notes: 'ניקוד פתוחות לפי תבחינים שמוחזרים ב-toscore. הצעת הסוכן מוצגת במסך הבדיקה ליד הכוכבים של המורה. ההערה (note) נכתבת בגוף שני, פונה לתלמידה, במשפטים שלמים, כך שהמורה יכולה להעתיק אותה למשוב.'
  };
}

// ---------------------------------------------------------------- גישה לנתונים

function lastRow_(sh) { return Math.max(sh.getLastRow(), 1); }
function table_(name) {
  var sh = ss_().getSheetByName(name);
  var n = sh.getLastRow() - 1;
  return { sh: sh, rows: n > 0 ? sh.getRange(2, 1, n, sh.getLastColumn()).getValues() : [] };
}

function stripHtml_(s) { return String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

/** מטא של השדות לכל נוסח: מספר שאלה, נוסח השאלה, תווית, סוג ואפשרויות. */
function meta_(v) {
  var b = buildExam_(v), ex = b.exam, M = {}, qs = [];
  ex.units.forEach(function (u) {
    u.items.forEach(function (it) {
      if (it.t !== 'q') return;
      var q = { id: it.id, n: it.n, stem: stripHtml_(it.stem), unit: u.n, fields: [] };
      var lastText = '';
      it.blocks.forEach(function (bl) {
        function add(f, label, kind, opts) {
          var k = b.key[f];
          M[f] = { n: it.n, qid: it.id, stem: q.stem, label: label || '', kind: kind, opts: opts || null, max: k.max, type: k.type, rubric: k.rubric || '', answer: k.answer, accept: k.accept, show: k.show || '', explain: k.explain || '', model: k.model || '' };
          q.fields.push(f);
        }
        function om(arr) { var m = {}; arr.forEach(function (o) { m[o.id] = o.t; }); return m; }
        if (bl.k === 'mc') add(bl.field, '', 'mc', om(bl.opts));
        else if (bl.k === 'open') add(bl.field, bl.label || '', 'open');
        else if (bl.k === 'cells') bl.rows.forEach(function (r) { r.cells.forEach(function (c, ci) { add(c.field, r.label + ' (' + bl.head[ci + 1] + ')', c.kind === 'num' ? 'num' : (b.key[c.field].type === 'manual' ? 'open' : 'text')); }); });
        else if (bl.k === 'cloze') {
          bl.parts.forEach(function (p) {
            if (p.s !== undefined) lastText = p.s;
            else add(p.field, '...' + lastText.slice(-40), 'select', om(p.opts));
          });
        } else if (bl.k === 'matrix') bl.rows.forEach(function (r) { add(r.field, r.t, 'matrix', om(bl.cols)); });
      });
      qs.push(q);
    });
  });
  return { fields: M, questions: qs };
}

function display_(m, raw) {
  if (raw === '' || raw == null) return '(לא נענה)';
  if (m.opts) return m.opts[raw] || raw;
  return String(raw);
}
function correctDisplay_(m) {
  if (m.type === 'manual') return '';
  if (m.opts) return m.opts[m.answer] || '';
  if (m.type === 'num') return String(m.answer);
  return m.show || m.accept || '';
}

function newCode_(existing) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (var tries = 0; tries < 50; tries++) {
    var c = '';
    for (var i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!existing[c]) return c;
  }
  return 'X' + Date.now().toString(36).toUpperCase().slice(-5);
}

// ---------------------------------------------------------------- תלמידות

/** קוד גישה לנוסח ג (מועד ב). אפשר להחליף בלשונית "מידע" או ב-Script Properties בשם MOED_B_CODE. */
var MOED_B_CODE_DEFAULT = 'REPLACE_WITH_ACCESS_CODE';
function moedCode_() { return props_().getProperty('MOED_B_CODE') || MOED_B_CODE_DEFAULT; }
function normVer_(v) { return v === 'B' ? 'B' : (v === 'C' ? 'C' : 'A'); }

/** נקרא מהדפדפן: מחזיר את השאלות בלי המפתח. arg: מחרוזת נוסח, או {version, code}. */
function getExam(arg) {
  var version = (arg && typeof arg === 'object') ? arg.version : arg;
  var code = (arg && typeof arg === 'object') ? String(arg.code || '').trim() : '';
  var v = normVer_(version);
  if (v === 'C' && code !== moedCode_()) return { error: 'הקוד של מועד ב אינו נכון. אפשר לבקש אותו מהמורה.' };
  return buildExam_(v).exam;
}

function norm_(s) {
  return String(s == null ? '' : s).replace(/[֑-ׇ]/g, '').replace(/[״"׳'`]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreAuto_(key, answers) {
  var auto = 0, autoMax = 0, closedRows = [], manual = [];
  Object.keys(key).forEach(function (f) {
    var k = key[f], a = answers[f];
    var aStr = a == null ? '' : String(a);
    if (k.type === 'manual') { manual.push({ field: f, max: k.max, ans: aStr, rubric: k.rubric || '' }); return; }
    var ok = false;
    if (k.type === 'mc' || k.type === 'select' || k.type === 'matrix') ok = aStr === k.answer;
    else if (k.type === 'num') { var n = Number(norm_(aStr).replace(/[^\d.]/g, '')); ok = aStr !== '' && n === k.answer; }
    else if (k.type === 'text') { var nn = norm_(aStr); ok = [].concat(k.accept).some(function (acc) { return nn.indexOf(acc) !== -1; }); }
    var pts = ok ? k.max : 0;
    auto += pts; autoMax += k.max;
    closedRows.push({ field: f, ans: aStr, ok: ok, pts: pts, max: k.max });
  });
  return { auto: auto, autoMax: autoMax, closed: closedRows, manual: manual };
}

function flags_(sub) {
  var out = [];
  var keys = sub.keys || {}, lens = sub.lens || {};
  Object.keys(lens).forEach(function (f) {
    var L = lens[f], K = keys[f] || 0;
    if (L > 40 && L > K * 2 + 20) out.push(f + ': ' + L + ' תווים, ' + K + ' הקשות');
  });
  return out.join(' | ');
}

/** שמירת טיוטה (נקראת כל דקה בערך ובעת סגירת הדף). */
function saveDraft(sub) {
  if (!sub || !sub.sid) return { ok: false };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = ss_().getSheetByName('טיוטות');
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    var row = -1;
    for (var i = 0; i < ids.length; i++) if (ids[i][0] === sub.sid) { row = i + 2; break; }
    var vals = [sub.sid, String(sub.name || ''), sub.version || '', new Date(), JSON.stringify(sub.answers || {}).slice(0, 49000)];
    if (row > 0) sh.getRange(row, 1, 1, 5).setValues([vals]);
    else sh.appendRow(vals);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** הגשה סופית. מחזירה ok וקוד אישי אחרי שהשורות נכתבו. */
function submitExam(sub) {
  if (!sub || !sub.sid || !sub.name) return { ok: false, error: 'חסרים פרטים' };
  sub.name = normName_(sub.name);
  sub.cls = normCls_(sub.cls);
  if (!sub.name) return { ok: false, error: 'חסר שם' };
  var v = normVer_(sub.version);
  if (v === 'C' && String(sub.code || '').trim() !== moedCode_() && normCls_(sub.cls) !== TEST_CLASS) return { ok: false, error: 'קוד מועד ב חסר או שגוי' };
  var key = buildExam_(v).key;
  var answers = sub.answers || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_();
    var res = ss.getSheetByName('תוצאות');
    var last = res.getLastRow();
    var existing = {};
    if (last > 1) {
      var ex = res.getRange(2, 1, last - 1, R.code).getValues();
      for (var i = 0; i < ex.length; i++) {
        existing[ex[i][R.code - 1]] = true;
        if (ex[i][0] === sub.sid) return { ok: true, duplicate: true, code: ex[i][R.code - 1] };
      }
    }
    var sc = scoreAuto_(key, answers);
    var total = 0;
    Object.keys(key).forEach(function (f) { total += key[f].max; });
    var rowNum = last + 1;
    var minutes = sub.startedAt ? Math.round((Date.now() - Number(sub.startedAt)) / 6000) / 10 : '';
    var evs = sub.events || {};
    var fb = sub.fb || {};
    var code = newCode_(existing);
    res.appendRow([
      sub.sid, new Date(), String(sub.name).slice(0, 80), String(sub.cls || '').slice(0, 30), v, minutes,
      sc.auto, '', '', total, flags_(sub), evs.blur || 0, evs.paste || 0,
      String(fb.level || ''), String(fb.like || '').slice(0, 1000), String(fb.wish || '').slice(0, 1000), String(fb.activity || '').slice(0, 1000),
      code, '', ''
    ]);
    res.getRange(rowNum, R.open).setFormula("=SUMIFS('תשובות פתוחות'!H:H,'תשובות פתוחות'!A:A,A" + rowNum + ")");
    res.getRange(rowNum, R.total).setFormula('=G' + rowNum + '+H' + rowNum);

    var open = ss.getSheetByName('תשובות פתוחות');
    var orows = sc.manual.map(function (m) {
      return [sub.sid, String(sub.name).slice(0, 80), v, Number(m.field.replace(/^q(\d+).*/, '$1')), m.field, m.max, m.ans.slice(0, 5000), '', '', '', '', m.rubric];
    });
    if (orows.length) open.getRange(open.getLastRow() + 1, 1, orows.length, 12).setValues(orows);

    var closed = ss.getSheetByName('תשובות סגורות');
    var crows = sc.closed.map(function (c) {
      return [sub.sid, String(sub.name).slice(0, 80), v, c.field, c.ans, c.ok ? 1 : 0, c.pts, c.max];
    });
    if (crows.length) closed.getRange(closed.getLastRow() + 1, 1, crows.length, 8).setValues(crows);

    var dr = ss.getSheetByName('טיוטות');
    var dl = dr.getLastRow();
    if (dl > 1) {
      var dids = dr.getRange(2, 1, dl - 1, 1).getValues();
      for (var j = dids.length - 1; j >= 0; j--) if (dids[j][0] === sub.sid) { dr.deleteRow(j + 2); break; }
    }
    return { ok: true, code: code, resultUrl: webUrl_() + '?page=result' };
  } finally {
    lock.releaseLock();
  }
}

/** משוב לתלמידה לפי קוד אישי. מוחזר רק אם המורה פרסמה. */
function getFeedback(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4) return { ok: false, error: 'נא להקליד את הקוד האישי.' };
  var res = table_('תוצאות').rows, row = null;
  for (var i = 0; i < res.length; i++) if (res[i][R.code - 1] === code) { row = res[i]; break; }
  if (!row) return { ok: false, error: 'הקוד לא נמצא. בדקי שהקלדת נכון.' };
  if (String(row[R.pub - 1]) !== 'כן') return { ok: false, error: 'המשוב עוד לא מוכן. נסי שוב אחרי שהמורה תפרסם.' };
  var sid = row[0], v = row[R.ver - 1], m = meta_(v), F = m.fields;
  var closed = {}, openRows = {};
  table_('תשובות סגורות').rows.forEach(function (r) { if (r[0] === sid) closed[r[3]] = r; });
  table_('תשובות פתוחות').rows.forEach(function (r) { if (r[0] === sid) openRows[r[4]] = r; });
  var items = [];
  m.questions.forEach(function (q) {
    var got = 0, max = 0, parts = [];
    q.fields.forEach(function (f) {
      var fm = F[f], p = { label: fm.label, kind: fm.kind, max: fm.max };
      if (fm.type === 'manual') {
        var r = openRows[f] || [];
        p.ans = r[O.ans - 1] || '(לא נענה)';
        p.score = r[O.score - 1] === '' || r[O.score - 1] == null ? null : Number(r[O.score - 1]);
        p.feedback = r[O.fb - 1] || '';
        p.model = fm.model;
        if (p.score != null) got += p.score;
      } else {
        var c = closed[f] || [];
        p.ans = display_(fm, c[4]);
        p.ok = c[5] === 1;
        p.score = Number(c[6]) || 0;
        p.correct = correctDisplay_(fm);
        p.explain = fm.explain;
        got += p.score;
      }
      max += fm.max;
      parts.push(p);
    });
    items.push({ n: q.n, stem: q.stem, got: got, max: max, parts: parts });
  });
  return {
    ok: true, name: row[R.name - 1], version: v, total: Number(row[R.total - 1]) || 0, max: row[R.max - 1],
    general: row[R.gen - 1] || '', items: items
  };
}

// ---------------------------------------------------------------- מורה

function needAdmin_(key) { if (!isAdmin_(key)) throw new Error('מפתח שגוי'); }

/** כל הנתונים ללוח המורה. */
function tGetAll(key) {
  needAdmin_(key);
  var ss = ss_();
  var res = table_('תוצאות').rows, op = table_('תשובות פתוחות').rows, cl = table_('תשובות סגורות').rows;
  var metas = { A: meta_('A'), B: meta_('B'), C: meta_('C') };
  function strip(mt) { // בלי המפתח של הנכונות הסגורות הם לא סודיים למורה, אבל נשלח רק מה שנחוץ
    return mt;
  }
  var subs = res.map(function (r) {
    return {
      sid: r[0], time: r[1] instanceof Date ? r[1].getTime() : null, name: r[R.name - 1], cls: r[R.cls - 1], ver: r[R.ver - 1], min: r[R.min - 1],
      auto: Number(r[R.auto - 1]) || 0, open: Number(r[R.open - 1]) || 0, total: Number(r[R.total - 1]) || 0, max: r[R.max - 1],
      flags: r[R.flags - 1], blur: r[R.blur - 1], paste: r[R.paste - 1],
      level: r[R.level - 1], like: r[R.like - 1], wish: r[R.wish - 1], act: r[R.act - 1],
      code: r[R.code - 1], pub: String(r[R.pub - 1]) === 'כן', gen: r[R.gen - 1] || '', removed: String(r[R.rem - 1]) === 'כן'
    };
  });
  var open = op.map(function (r) {
    return { sid: r[0], field: r[O.field - 1], max: Number(r[O.max - 1]), ans: r[O.ans - 1], score: r[O.score - 1] === '' ? null : Number(r[O.score - 1]), fb: r[O.fb - 1] || '', sug: r[O.sug - 1] === '' ? null : Number(r[O.sug - 1]), sugNote: r[O.sugNote - 1] || '', rubric: r[O.rubric - 1] };
  });
  var closed = cl.map(function (r) { return { sid: r[0], field: r[3], ans: r[4], ok: r[5] === 1, pts: Number(r[6]), max: Number(r[7]) }; });
  var drafts = Math.max(ss.getSheetByName('טיוטות').getLastRow() - 1, 0);
  return { ok: true, metas: strip(metas), subs: subs, open: open, closed: closed, drafts: drafts, resultUrl: webUrl_() + '?page=result', qmeta: QMETA, qmetaC: QMETA_C, moedCode: moedCode_() };
}

/** שמירת ניקוד ומשוב. items: [{sid, field, score, feedback}] */
function tSaveGrades(key, items) {
  needAdmin_(key);
  return saveGrades_(items);
}
function resolveSid_(item, resRows) {
  if (item.sid) return { sid: item.sid };
  if (!item.match) return { error: 'חסר sid או match' };
  var hits = resRows.filter(function (r) { return String(r[R.name - 1]).indexOf(item.match) !== -1; });
  if (hits.length === 1) return { sid: hits[0][0] };
  if (!hits.length) return { error: 'לא נמצאה תלמידה: ' + item.match };
  return { error: 'כמה מועמדות', candidates: hits.map(function (r) { return { sid: r[0], name: r[R.name - 1], ver: r[R.ver - 1] }; }) };
}
function openIndex_(sh) {
  var n = sh.getLastRow() - 1, idx = {};
  if (n > 0) sh.getRange(2, 1, n, 5).getValues().forEach(function (r, i) { idx[r[0] + '|' + r[4]] = i + 2; });
  return idx;
}
function saveGrades_(items) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = ss_().getSheetByName('תשובות פתוחות'), idx = openIndex_(sh);
    var resRows = table_('תוצאות').rows;
    var out = [];
    items.forEach(function (it) {
      var rs = resolveSid_(it, resRows);
      if (rs.error) { out.push({ ok: false, error: rs.error, candidates: rs.candidates }); return; }
      var row = idx[rs.sid + '|' + it.field];
      if (!row) { out.push({ ok: false, error: 'שדה לא נמצא: ' + it.field }); return; }
      var max = Number(sh.getRange(row, O.max).getValue());
      if (it.score !== undefined && it.score !== null && it.score !== '') {
        var sc = Math.max(0, Math.min(max, Number(it.score)));
        sh.getRange(row, O.score).setValue(sc);
      } else if (it.score === null || it.score === '') sh.getRange(row, O.score).setValue('');
      if (it.feedback !== undefined) sh.getRange(row, O.fb).setValue(String(it.feedback).slice(0, 3000));
      out.push({ ok: true, sid: rs.sid, field: it.field });
    });
    return { ok: true, saved: out.filter(function (o) { return o.ok; }).length, results: out };
  } finally {
    lock.releaseLock();
  }
}

/** הצעות ניקוד מהסוכן. items: [{sid|match, field, score, note}] */
function suggest_(items) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = ss_().getSheetByName('תשובות פתוחות'), idx = openIndex_(sh);
    var resRows = table_('תוצאות').rows;
    var out = [];
    items.forEach(function (it) {
      var rs = resolveSid_(it, resRows);
      if (rs.error) { out.push({ ok: false, error: rs.error, candidates: rs.candidates }); return; }
      var row = idx[rs.sid + '|' + it.field];
      if (!row) { out.push({ ok: false, error: 'שדה לא נמצא: ' + it.field }); return; }
      var max = Number(sh.getRange(row, O.max).getValue());
      var sc = Math.max(0, Math.min(max, Number(it.score)));
      if (isNaN(sc)) { out.push({ ok: false, error: 'ניקוד לא תקין' }); return; }
      sh.getRange(row, O.sug).setValue(sc);
      sh.getRange(row, O.sugNote).setValue(String(it.note || '').slice(0, 1000));
      out.push({ ok: true, sid: rs.sid, field: it.field, score: sc });
    });
    return { ok: true, saved: out.filter(function (o) { return o.ok; }).length, results: out };
  } finally {
    lock.releaseLock();
  }
}

/** תשובות פתוחות לסוכן: עם השאלה והתבחינים. */
function toScore_(all, cls) {
  var res = table_('תוצאות').rows, names = {}, vers = {}, classes = {};
  var gone = {};
  res.forEach(function (r) { names[r[0]] = r[R.name - 1]; vers[r[0]] = r[R.ver - 1]; classes[r[0]] = r[R.cls - 1]; if (String(r[R.rem - 1]) === 'כן') gone[r[0]] = true; });
  var metas = { A: meta_('A'), B: meta_('B'), C: meta_('C') };
  var out = [];
  table_('תשובות פתוחות').rows.forEach(function (r) {
    var has = r[O.sug - 1] !== '' && r[O.sug - 1] != null;
    if (has && !all) return;
    if (cls && classes[r[0]] !== cls) return;
    if (gone[r[0]]) return;
    var f = r[O.field - 1], fm = metas[vers[r[0]]] && metas[vers[r[0]]].fields[f];
    out.push({ sid: r[0], name: names[r[0]], cls: classes[r[0]], ver: vers[r[0]], field: f, question: fm ? fm.stem : '', part: fm ? fm.label : '', max: r[O.max - 1], rubric: r[O.rubric - 1], model: fm ? fm.model : '', answer: r[O.ans - 1], teacherScore: r[O.score - 1], suggestion: has ? r[O.sug - 1] : null });
  });
  return { ok: true, count: out.length, items: out };
}

function state_() {
  var res = table_('תוצאות').rows, open = table_('תשובות פתוחות').rows;
  var tot = 0, n = 0, pub = 0, byCls = {};
  res = res.filter(function (r) { return String(r[R.rem - 1]) !== 'כן'; });
  res.forEach(function (r) { n++; tot += Number(r[R.total - 1]) || 0; if (String(r[R.pub - 1]) === 'כן') pub++; var c = r[R.cls - 1]; byCls[c] = (byCls[c] || 0) + 1; });
  var scored = 0, sug = 0;
  open.forEach(function (r) { if (r[O.score - 1] !== '') scored++; if (r[O.sug - 1] !== '') sug++; });
  return { ok: true, byClass: byCls, submissions: n, avgTotal: n ? Math.round(tot / n * 10) / 10 : null, openAnswers: open.length, scoredByTeacher: scored, suggestedByAgent: sug, published: pub, drafts: Math.max(ss_().getSheetByName('טיוטות').getLastRow() - 1, 0) };
}

/** פרסום או הסרת פרסום של משובים. sids: מערך מזהים. */
function tPublish(key, sids, flag, general) {
  needAdmin_(key);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = ss_().getSheetByName('תוצאות');
    var n = sh.getLastRow() - 1;
    if (n < 1) return { ok: true, changed: 0 };
    var ids = sh.getRange(2, 1, n, 1).getValues(), changed = 0;
    var set = {}; (sids || []).forEach(function (s) { set[s] = true; });
    for (var i = 0; i < ids.length; i++) {
      if (!set[ids[i][0]]) continue;
      sh.getRange(i + 2, R.pub).setValue(flag ? 'כן' : '');
      if (general && general[ids[i][0]] !== undefined) sh.getRange(i + 2, R.gen).setValue(String(general[ids[i][0]]).slice(0, 2000));
      changed++;
    }
    return { ok: true, changed: changed };
  } finally {
    lock.releaseLock();
  }
}

function resRowOf_(sh, sid) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === sid) return i + 2;
  return -1;
}

/** תיקון פרטי תלמידה: כיתה ושם (מנורמלים). */
function tUpdateStudent(key, sid, patch) {
  needAdmin_(key);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_(), sh = ss.getSheetByName('תוצאות'), row = resRowOf_(sh, sid);
    if (row < 0) return { ok: false, error: 'לא נמצאה' };
    var out = { ok: true };
    if (patch && patch.cls !== undefined) { out.cls = normCls_(patch.cls); sh.getRange(row, R.cls).setValue(out.cls); }
    if (patch && patch.name !== undefined) {
      out.name = normName_(patch.name);
      if (!out.name) return { ok: false, error: 'שם ריק' };
      sh.getRange(row, R.name).setValue(out.name);
      ['תשובות פתוחות', 'תשובות סגורות', 'טיוטות'].forEach(function (nm) {
        var s2 = ss.getSheetByName(nm), n = s2.getLastRow() - 1;
        if (n < 1) return;
        var ids = s2.getRange(2, 1, n, 1).getValues();
        for (var i = 0; i < ids.length; i++) if (ids[i][0] === sid) s2.getRange(i + 2, 2).setValue(out.name);
      });
    }
    return out;
  } finally {
    lock.releaseLock();
  }
}

/** הסרה (הסתרה הפיכה) או שחזור של תלמידות. flag true = הסרה. */
function tRemove(key, sids, flag) {
  needAdmin_(key);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = ss_().getSheetByName('תוצאות');
    if (sh.getRange(1, R.rem).getValue() === '') sh.getRange(1, R.rem).setValue('הוסרה').setFontWeight('bold');
    var changed = 0;
    (sids || []).forEach(function (sid) {
      var row = resRowOf_(sh, sid);
      if (row > 0) { sh.getRange(row, R.rem).setValue(flag ? 'כן' : ''); changed++; }
    });
    return { ok: true, changed: changed };
  } finally {
    lock.releaseLock();
  }
}

/** מחיקה סופית (רק לתלמידות שהוסרו קודם). */
function tDelete(key, sids) {
  needAdmin_(key);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_(), sh = ss.getSheetByName('תוצאות'), deleted = 0;
    (sids || []).forEach(function (sid) {
      var row = resRowOf_(sh, sid);
      if (row < 0 || String(sh.getRange(row, R.rem).getValue()) !== 'כן') return;
      sh.deleteRow(row); deleted++;
      ['תשובות פתוחות', 'תשובות סגורות', 'טיוטות'].forEach(function (nm) {
        var s2 = ss.getSheetByName(nm), n = s2.getLastRow() - 1;
        if (n < 1) return;
        var ids = s2.getRange(2, 1, n, 1).getValues();
        for (var i = ids.length - 1; i >= 0; i--) if (ids[i][0] === sid) s2.deleteRow(i + 2);
      });
    });
    return { ok: true, deleted: deleted };
  } finally {
    lock.releaseLock();
  }
}

function tSaveGeneral(key, sid, text) {
  needAdmin_(key);
  var sh = ss_().getSheetByName('תוצאות');
  var n = sh.getLastRow() - 1;
  if (n < 1) return { ok: false };
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === sid) { sh.getRange(i + 2, R.gen).setValue(String(text || '').slice(0, 2000)); return { ok: true }; }
  return { ok: false };
}
