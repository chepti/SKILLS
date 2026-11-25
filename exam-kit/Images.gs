/**
 * תמונות: המורה מעלה תמונה מהמחשב (למשל תמונה שה-Gem יצר), והיא נשמרת בתיקייה בדרייב.
 * בתא "תמונה" בלשונית השאלון נרשם drive:<מזהה>, ובזמן ההצגה לתלמידות התמונה מוטמעת בדף.
 * כך אין צורך לפתוח שיתוף ציבורי של הקבצים (עובד גם בחשבון ארגוני סגור).
 */

/** מקבל drive:ID או כתובת https ומחזיר כתובת לשימוש בדף (data URI לקבצי דרייב), או מחרוזת ריקה. */
function resolveImg_(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  var m = s.match(/^drive:([\w-]+)$/);
  if (!m) return /^https:\/\//i.test(s) ? s : '';
  try {
    var blob = DriveApp.getFileById(m[1]).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) { return ''; }
}

function imageFolder_() {
  var id = props_().getProperty('IMG_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* ניצור חדשה */ } }
  var f = DriveApp.createFolder('תמונות המבדק (' + ss_().getName() + ')');
  props_().setProperty('IMG_FOLDER', f.getId());
  return f;
}

/** רשימת המקומות שאפשר להעלות אליהם תמונה: באנר של יחידה ואיורים. */
function imageTargets() {
  var sh = ss_().getSheetByName(CONTENT_SHEET);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues(), head = vals[0].map(function (h) { return s_(h); });
  var ix = {}; head.forEach(function (h, i) { ix[h] = i; });
  var out = [], curUnit = '';
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i], kind = s_(r[ix['סוג']]), ver = s_(r[ix['נוסח']]);
    if (!kind) continue;
    var has = !!s_(r[ix['תמונה']]);
    if (kind === 'יחידה') {
      curUnit = s_(r[ix['טקסט']]);
      out.push({ row: i + 1, label: 'נוסח ' + ver + ' · תמונה ראשית ליחידה ' + (r[ix['מספר']] || '') + ': ' + curUnit, has: has });
    } else if (kind === 'איור') {
      var svg = /^<svg/i.test(s_(r[ix['טקסט']]));
      out.push({ row: i + 1, label: 'נוסח ' + ver + ' · איור ביחידה "' + curUnit + '": ' + (s_(r[ix['פרטים']]) || '(ללא כיתוב)') + (svg ? ' (כבר יש איור וקטורי)' : ''), has: has });
    }
  }
  return out;
}

/** נקרא מהחלון. dataUrl: תמונה שכבר הוקטנה בדפדפן. */
function saveImage(row, dataUrl) {
  var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('הקובץ אינו תמונה נתמכת (jpg, png, webp).');
  var sh = ss_().getSheetByName(CONTENT_SHEET);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return s_(h); });
  var col = head.indexOf('תמונה') + 1;
  if (!col) throw new Error('חסרה עמודה "תמונה" בלשונית השאלון.');
  var kind = s_(sh.getRange(row, head.indexOf('סוג') + 1).getValue());
  if (kind !== 'יחידה' && kind !== 'איור') throw new Error('אפשר להעלות תמונה רק לשורת יחידה או איור.');
  var ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'img-row' + row + '-' + Date.now() + '.' + ext);
  var file = imageFolder_().createFile(blob);
  sh.getRange(row, col).setValue('drive:' + file.getId());
  BUILD_MEMO_ = {};
  return { ok: true, id: file.getId() };
}

function openImageDialog() {
  var html = HtmlService.createHtmlOutputFromFile('ImageDialog').setWidth(520).setHeight(560).setTitle('הוספת תמונה');
  SpreadsheetApp.getUi().showModalDialog(html, 'הוספת תמונה למבדק');
}
