/**
 * תוכן המבדק נמצא בלשונית "שאלון" בגיליון (שורה לכל רכיב). קובץ זה הופך את השורות
 * למבנה שהאתר מציג (exam) ולמפתח הבדיקה (key). המפתח אינו נשלח לדפדפן.
 *
 * עמודות: נוסח | סוג | מספר | טקסט | פרטים | ניקוד | תבחינים | תשובה לדוגמה | הסבר | יכולת | תמונה
 * סוגים: יחידה, פסקה, איור, טבלה, גרף, שאלה
 * פורמט עמודת "פרטים" לשאלות מתועד ב-SKILL.md של הסקיל ובלשונית "מדריך".
 */

var CONTENT_SHEET = 'שאלון';
var CONTENT_HEAD = ['נוסח', 'סוג', 'מספר', 'טקסט', 'פרטים', 'ניקוד', 'תבחינים', 'תשובה לדוגמה', 'הסבר', 'יכולת', 'תמונה'];

function letter_(i) { return i < 26 ? String.fromCharCode(97 + i) : 'z' + i; }
/** כוכבית של תשובה נכונה: בתחילת הטקסט או בסופו. */
function star_(o) {
  var x = String(o).trim(), star = false;
  if (x.charAt(0) === '*') { star = true; x = x.slice(1).trim(); }
  else if (x.charAt(x.length - 1) === '*') { star = true; x = x.slice(0, -1).trim(); }
  return { t: x, star: star };
}
function s_(v) { return v == null ? '' : String(v).trim(); }

/** HTML בטוח: רק b, i, u, sub, sup, br ו-span של כיוון שמאל-לימין. */
function safeHtml_(str) {
  var t = String(str == null ? '' : str);
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<(b|i|u|sub|sup)\s[^>]*>/gi, '<$1>');
  t = t.replace(/<span\s[^>]*>/gi, '<span class="ltr">');
  t = t.replace(/<br\s*\/?>/gi, '<br>');
  t = t.replace(/<(?!\/?(b|i|u|br|sub|sup|span)\b)[^>]*>/gi, '');
  return t;
}
function safeSvg_(str) {
  var t = String(str || '');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  t = t.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');
  return t;
}

function splitLines_(str) { return String(str || '').split(/;;|\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
function splitPipes_(str) { return String(str || '').split('|').map(function (x) { return x.trim(); }); }
function kv_(line) { var i = line.indexOf('='); return i < 0 ? [line.trim(), ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }

/**
 * values: מערך דו-ממדי כולל שורת כותרת. ver: קוד הנוסח.
 * מחזיר {exam, key, qmeta, issues, total}
 */
function parseContent_(values, ver) {
  var issues = [];
  if (!values || values.length < 2) return { exam: { version: ver, units: [] }, key: {}, qmeta: {}, issues: ['השאלון ריק'], total: 0 };
  var ix = {};
  values[0].forEach(function (h, i) { ix[s_(h)] = i; });
  CONTENT_HEAD.forEach(function (h) { if (ix[h] === undefined) issues.push('חסרה עמודה בשם "' + h + '" בלשונית השאלון'); });
  function cell(r, name) { return ix[name] === undefined ? '' : r[ix[name]]; }

  var units = [], cur = null, qmap = {}, key = {}, qmeta = {}, lastRowNo = 1;
  function unit() {
    if (!cur) { cur = { n: units.length + 1, title: 'יחידה ' + (units.length + 1), about: '', image: '', items: [] }; units.push(cur); }
    return cur;
  }

  values.slice(1).forEach(function (r, ri) {
    lastRowNo = ri + 2;
    if (s_(cell(r, 'נוסח')).toLowerCase() !== String(ver).toLowerCase()) return;
    var kind = s_(cell(r, 'סוג'));
    if (!kind) return;
    var where = 'שורה ' + (ri + 2) + ': ';
    var text = s_(cell(r, 'טקסט')), det = s_(cell(r, 'פרטים'));

    if (kind === 'יחידה') {
      cur = { n: Number(cell(r, 'מספר')) || units.length + 1, title: text || ('יחידה ' + (units.length + 1)), about: det, image: s_(cell(r, 'תמונה')), items: [] };
      units.push(cur);
      return;
    }
    if (kind === 'פסקה') { unit().items.push({ t: 'p', html: safeHtml_(text) }); return; }
    if (kind === 'איור') {
      var fig = { t: 'fig', cap: det, alt: s_(cell(r, 'הסבר')) || det };
      if (/^<svg/i.test(text)) fig.svg = safeSvg_(text);
      else if (/^https?:\/\//i.test(text)) fig.url = text;
      else issues.push(where + 'איור צריך להכיל קוד SVG (שמתחיל ב-<svg) או כתובת תמונה (https)');
      unit().items.push(fig); return;
    }
    if (kind === 'טבלה') {
      var lines = splitLines_(det);
      if (lines.length < 2) { issues.push(where + 'טבלה צריכה שורת כותרות ולפחות שורה אחת (מופרדות ב- ;;)'); return; }
      var rowsT = lines.map(splitPipes_);
      unit().items.push({ t: 'table', cap: text, note: s_(cell(r, 'הסבר')), head: rowsT[0], rows: rowsT.slice(1) });
      return;
    }
    if (kind === 'גרף') {
      var g = { t: 'graph', cap: text, note: s_(cell(r, 'הסבר')), xt: '', yt: '', xs: [], ymin: 0, ymax: 100, ystep: 20, series: [] };
      splitLines_(det).forEach(function (ln) {
        var p = kv_(ln), k = p[0], v = p[1];
        if (k === 'xt') g.xt = v; else if (k === 'yt') g.yt = v;
        else if (k === 'ymin') g.ymin = Number(v); else if (k === 'ymax') g.ymax = Number(v); else if (k === 'ystep') g.ystep = Number(v);
        else if (k === 'x') g.xs = v.split(',').map(Number);
        else if (k.indexOf('קו:') === 0 || k.indexOf('מקווקו:') === 0) {
          g.series.push({ name: k.slice(k.indexOf(':') + 1), ys: v.split(',').map(Number), style: k.indexOf('מקווקו') === 0 ? 'dash' : 'solid' });
        }
      });
      if (!g.xs.length || !g.series.length) { issues.push(where + 'גרף צריך x= וקו אחד לפחות (קו:שם=ערכים)'); return; }
      g.series.forEach(function (se) { if (se.ys.length !== g.xs.length) issues.push(where + 'מספר הערכים בקו "' + se.name + '" שונה ממספר ערכי x'); });
      unit().items.push(g); return;
    }
    if (kind !== 'שאלה') { issues.push(where + 'סוג לא מוכר: "' + kind + '"'); return; }

    // ---------- שאלה ----------
    var n = Number(cell(r, 'מספר'));
    if (!n) { issues.push(where + 'לשאלה חסר מספר'); return; }
    var u = unit(), q = qmap[n];
    if (!q) { q = { t: 'q', id: 'q' + n, n: n, stem: safeHtml_(text), blocks: [], _unit: u.n }; qmap[n] = q; u.items.push(q); }
    else if (text && !q.stem) q.stem = safeHtml_(text);
    var ab = s_(cell(r, 'יכולת'));
    if (ab && !qmeta[q.id]) qmeta[q.id] = { ab: ab, unit: u.n };
    var colon = det.indexOf(':');
    if (colon < 0) { issues.push(where + 'בעמודת "פרטים" של שאלה צריך לכתוב סוג ואחריו נקודתיים (למשל "בחירה: ...")'); return; }
    var qk = det.slice(0, colon).trim(), rest = det.slice(colon + 1).trim();
    var pts = Number(cell(r, 'ניקוד')) || 0;
    var rubric = s_(cell(r, 'תבחינים')), model = s_(cell(r, 'תשובה לדוגמה')), explain = s_(cell(r, 'הסבר'));
    function fid(suffix) { return q.id + suffix; }
    function hasField(id) { return !!key[id]; }

    if (qk === 'בחירה') {
      var opts = splitPipes_(rest), ids = ['a', 'b', 'c', 'd', 'e', 'f'], corr = -1, list = [];
      opts.forEach(function (o, i) { var sx = star_(o); if (sx.star) corr = corr < 0 ? i : -2; list.push({ id: ids[i], t: sx.t }); });
      if (opts.length < 2 || opts.length > 6) issues.push(where + 'שאלת בחירה צריכה בין 2 ל-6 אפשרויות');
      if (corr === -1) issues.push(where + 'לא סומנה תשובה נכונה (כוכבית * בתחילת האפשרות הנכונה)');
      if (corr === -2) issues.push(where + 'סומנה יותר מתשובה נכונה אחת');
      var f = hasField(fid('')) ? fid(letter_(q.blocks.length)) : fid('');
      key[f] = { type: 'mc', answer: corr >= 0 ? ids[corr] : 'a', explain: explain, max: pts };
      q.blocks.push({ k: 'mc', field: f, opts: list });
      var lens = list.map(function (o) { return o.t.length; });
      if (corr >= 0 && lens[corr] === Math.max.apply(null, lens) && lens.filter(function (x) { return x === lens[corr]; }).length === 1 && lens.length > 2 && lens[corr] > 12)
        issues.push(where + 'התשובה הנכונה היא הארוכה ביותר: כדאי לקצר אותה או להאריך מסיח');
      return;
    }
    if (qk === 'פתוחה') {
      var prm = {}; rest.split(';').forEach(function (x) { var p = kv_(x); if (p[0]) prm[p[0]] = p[1]; });
      var lab = prm['תווית'] || '';
      var idx = lab ? 'abcdefgh'.charAt('אבגדהוזח'.indexOf(lab) >= 0 ? 'אבגדהוזח'.indexOf(lab) : 0) : '';
      var f2 = fid(idx);
      if (hasField(f2)) f2 = fid(letter_(q.blocks.length));
      key[f2] = { type: 'manual', rubric: rubric, model: model, max: pts };
      if (!rubric) issues.push(where + 'לשאלה פתוחה חסרים תבחינים');
      q.blocks.push({ k: 'open', field: f2, rows: Number(prm['שורות']) || 4, label: lab });
      return;
    }
    if (qk === 'טבלת מספרים') {
      var ls = splitLines_(rest), headN = [], rowsN = [];
      ls.forEach(function (ln) { var p = kv_(ln); if (p[0] === 'כותרות') headN = p[1].split('|').map(function (x) { return x.trim(); }); else rowsN.push(p); });
      var perN = rowsN.length ? pts / rowsN.length : 0, blockRows = [];
      rowsN.forEach(function (p, i) {
        var f3 = fid(letter_(i)); key[f3] = { type: 'num', answer: Number(p[1]), explain: explain, max: perN };
        if (isNaN(key[f3].answer)) issues.push(where + 'בטבלת מספרים התשובה חייבת להיות מספר: "' + p[1] + '"');
        blockRows.push({ label: p[0], cells: [{ field: f3, kind: 'num' }] });
      });
      q.blocks.push({ k: 'cells', head: headN.length ? headN : ['התא', 'מספר'], rows: blockRows });
      return;
    }
    if (qk === 'טבלת שם ותפקיד') {
      var ls2 = splitLines_(rest), headS = [], rowsS = [];
      ls2.forEach(function (ln) { var p = kv_(ln); if (p[0] === 'כותרות') headS = p[1].split('|').map(function (x) { return x.trim(); }); else rowsS.push(p); });
      var perS = rowsS.length ? pts / (rowsS.length * 2) : 0, rowsOut = [];
      rowsS.forEach(function (p, i) {
        var parts = p[1].split('|'), names = parts[0].split('/').map(function (x) { return x.trim(); }).filter(Boolean), fn = (parts[1] || '').trim();
        var fn1 = fid('n' + (i + 1)), ff1 = fid('f' + (i + 1));
        key[fn1] = { type: 'text', accept: names, show: names[0] || '', explain: explain, max: perS };
        key[ff1] = { type: 'manual', rubric: fn, model: fn, max: perS };
        rowsOut.push({ label: p[0], cells: [{ field: fn1 }, { field: ff1 }] });
      });
      q.blocks.push({ k: 'cells', head: headS.length ? headS : ['מספר', 'שם', 'תפקיד'], rows: rowsOut });
      return;
    }
    if (qk === 'השלמה') {
      var parts2 = [], last = 0, re = /\{([^}]+)\}/g, m, bi = 0, blanks = [];
      while ((m = re.exec(rest))) { blanks.push(m); }
      var perC = blanks.length ? pts / blanks.length : 0;
      blanks.forEach(function (mm) {
        if (mm.index > last) parts2.push({ s: rest.slice(last, mm.index).trim() });
        var ops = mm[1].split('|').map(function (x) { return x.trim(); }), idsC = ['a', 'b', 'c', 'd', 'e'], correct = -1, lc = [];
        ops.forEach(function (o, i) { var sx = star_(o); if (sx.star) correct = correct < 0 ? i : -2; lc.push({ id: idsC[i], t: sx.t }); });
        if (correct < 0) issues.push(where + 'בהשלמה חסרה תשובה נכונה אחת בכל סוגריים (כוכבית *)');
        var f4 = fid(letter_(bi++));
        key[f4] = { type: 'select', answer: correct >= 0 ? idsC[correct] : 'a', explain: explain, max: perC };
        parts2.push({ field: f4, opts: lc });
        last = mm.index + mm[0].length;
      });
      if (last < rest.length) parts2.push({ s: rest.slice(last).trim() });
      if (!blanks.length) issues.push(where + 'בהשלמה צריך לפחות סוגריים מסולסלים אחד: {אפשרות*|אפשרות}');
      q.blocks.push({ k: 'cloze', parts: parts2 });
      return;
    }
    if (qk === 'מטריצה') {
      var ls3 = splitLines_(rest), cols = [], rowsM = [];
      ls3.forEach(function (ln) { var p = kv_(ln); if (p[0] === 'עמודות') cols = p[1].split('|').map(function (x, i) { return { id: 'c' + (i + 1), t: x.trim() }; }); else rowsM.push(p); });
      var perM = rowsM.length ? pts / rowsM.length : 0, outM = [];
      rowsM.forEach(function (p, i) {
        var ci = -1; cols.forEach(function (c, j) { if (c.t === p[1]) ci = j; });
        if (ci < 0) issues.push(where + 'במטריצה העמודה "' + p[1] + '" אינה ברשימת העמודות');
        var f5 = fid(letter_(i)); key[f5] = { type: 'matrix', answer: ci >= 0 ? cols[ci].id : 'c1', explain: explain, max: perM };
        outM.push({ field: f5, t: p[0] });
      });
      q.blocks.push({ k: 'matrix', cols: cols, rows: outM });
      return;
    }
    issues.push(where + 'סוג שאלה לא מוכר: "' + qk + '"');
  });

  // תיאור אוטומטי של יחידה, ובדיקות כלליות
  var total = 0;
  Object.keys(key).forEach(function (f) { total += Number(key[f].max) || 0; });
  units.forEach(function (u) {
    var ns = u.items.filter(function (x) { return x.t === 'q'; }).map(function (x) { return x.n; });
    if (!u.about && ns.length) u.about = ns.length > 1 ? 'שאלות ' + Math.min.apply(null, ns) + '–' + Math.max.apply(null, ns) + '.' : 'שאלה ' + ns[0] + '.';
    u.items.forEach(function (x) { if (x.t === 'q') { delete x._unit; if (!x.blocks.length) issues.push('שאלה ' + x.n + ' ללא תוכן'); if (!x.stem) issues.push('שאלה ' + x.n + ' ללא ניסוח'); } });
  });
  if (!units.length) issues.push('לנוסח "' + ver + '" אין שורות בשאלון');
  if (units.length && Math.abs(total - 100) > 0.01) issues.push('סך הניקוד בנוסח "' + ver + '" הוא ' + Math.round(total * 100) / 100 + ' ולא 100');
  return { exam: { version: ver, units: units }, key: key, qmeta: qmeta, issues: issues, total: total };
}

/** נקודת הכניסה של הקוד הקיים: בונה נוסח מהגיליון. */
function buildExam_(v) {
  var sh = ss_().getSheetByName(CONTENT_SHEET);
  var vals = sh ? sh.getDataRange().getValues() : [];
  var r = parseContent_(vals, v);
  return { exam: r.exam, key: r.key, qmeta: r.qmeta, issues: r.issues };
}
