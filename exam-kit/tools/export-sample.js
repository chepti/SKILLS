// מייצא את מבדק התא (נוסחים A, B, C) לשורות של לשונית "שאלון", ובודק שהפענוח חוזר לאותו מבנה ואותם ציונים.
// הרצה: node tools/export-sample.js  ← יוצר Sample.gs
const fs = require('fs'), vm = require('vm'), path = require('path');
const kit = path.join(__dirname, '..');
const OLD = process.env.OLD_EXAM_DIR || './old-exam';

// מקור התוכן הישן
const ctxOld = { console, Date, Math, JSON, Object, Array, String, Number }; vm.createContext(ctxOld);
vm.runInContext(fs.readFileSync(OLD + '/Exam.gs', 'utf8'), ctxOld);

// פונקציות האיורים מהלקוח
const idx = fs.readFileSync(OLD + '/Index.src.html', 'utf8');
function grab(name) { const m = idx.match(new RegExp('function ' + name + '\\(\\)\\{[\\s\\S]*?\\n\\}\\n')); return m[0]; }
const ctxSvg = {}; vm.createContext(ctxSvg);
vm.runInContext(grab('slugSVG') + grab('leafSVG'), ctxSvg);
const SVG = { slug: ctxSvg.slugSVG(), leaf: ctxSvg.leafSVG() };

// פענון (הקוד החדש)
const ctxNew = { console, Date, Math, JSON, Object, Array, String, Number }; vm.createContext(ctxNew);
vm.runInContext(fs.readFileSync(kit + '/Content.gs', 'utf8'), ctxNew);

const HEAD = ['נוסח', 'סוג', 'מספר', 'טקסט', 'פרטים', 'ניקוד', 'תבחינים', 'תשובה לדוגמה', 'הסבר', 'יכולת', 'תמונה'];
const rows = [HEAD];
function row(o) { return HEAD.map(h => o[h] === undefined ? '' : o[h]); }
const sumMax = (key, fields) => fields.reduce((a, f) => a + key[f].max, 0);
const round2 = x => Math.round(x * 100) / 100;

function fieldsOfBlock(b) {
  if (b.field) return [b.field];
  if (b.k === 'cells') return [].concat(...b.rows.map(r => r.cells.map(c => c.field)));
  if (b.k === 'cloze') return b.parts.filter(p => p.field).map(p => p.field);
  if (b.k === 'matrix') return b.rows.map(r => r.field);
  return [];
}

for (const v of ['A', 'B', 'C']) {
  const { exam, key } = ctxOld.buildExam_(v);
  const QM = v === 'C' ? ctxOld.QMETA_C : ctxOld.QMETA;
  exam.units.forEach(u => {
    rows.push(row({ 'נוסח': v, 'סוג': 'יחידה', 'מספר': u.n, 'טקסט': u.title, 'פרטים': u.about }));
    u.items.forEach(it => {
      if (it.t === 'p') rows.push(row({ 'נוסח': v, 'סוג': 'פסקה', 'טקסט': it.html }));
      else if (it.t === 'fig') rows.push(row({ 'נוסח': v, 'סוג': 'איור', 'טקסט': SVG[it.name], 'פרטים': it.cap, 'הסבר': it.alt }));
      else if (it.t === 'table') rows.push(row({ 'נוסח': v, 'סוג': 'טבלה', 'טקסט': it.cap, 'פרטים': [it.head.join('|')].concat(it.rows.map(r => r.join('|'))).join(' ;; '), 'הסבר': it.note || '' }));
      else if (it.t === 'graph') {
        const lines = ['xt=' + it.xt, 'yt=' + it.yt, 'ymin=' + it.ymin, 'ymax=' + it.ymax, 'ystep=' + it.ystep, 'x=' + it.xs.join(',')];
        it.series.forEach(s => lines.push((s.style === 'dash' ? 'מקווקו:' : 'קו:') + s.name + '=' + s.ys.join(',')));
        rows.push(row({ 'נוסח': v, 'סוג': 'גרף', 'טקסט': it.cap, 'פרטים': lines.join(' ;; '), 'הסבר': it.note || '' }));
      } else if (it.t === 'q') {
        it.blocks.forEach((b, bi) => {
          const fs_ = fieldsOfBlock(b), f0 = fs_[0], k0 = key[f0], pts = round2(sumMax(key, fs_));
          const o = { 'נוסח': v, 'סוג': 'שאלה', 'מספר': it.n, 'ניקוד': pts };
          if (bi === 0) { o['טקסט'] = it.stem; if (QM[it.id]) o['יכולת'] = QM[it.id].ab; }
          if (b.k === 'mc') { o['פרטים'] = 'בחירה: ' + b.opts.map(op => (op.id === k0.answer ? '*' : '') + op.t).join(' | '); o['הסבר'] = k0.explain || ''; }
          else if (b.k === 'open') { o['פרטים'] = 'פתוחה: שורות=' + b.rows + (b.label ? '; תווית=' + b.label : ''); o['תבחינים'] = k0.rubric || ''; o['תשובה לדוגמה'] = k0.model || ''; }
          else if (b.k === 'cells') {
            if (b.rows[0].cells.length === 2) {
              o['פרטים'] = 'טבלת שם ותפקיד: כותרות=' + b.head.join('|') + ' ;; ' + b.rows.map(r => { const nk = key[r.cells[0].field], fk = key[r.cells[1].field]; const names = [].concat(nk.accept); const nm = names.join('/'); return r.label + '=' + nm + '|' + (fk.model || fk.rubric || ''); }).join(' ;; ');
              o['הסבר'] = key[b.rows[0].cells[0].field].explain || '';
            } else {
              o['פרטים'] = 'טבלת מספרים: כותרות=' + b.head.join('|') + ' ;; ' + b.rows.map(r => r.label + '=' + key[r.cells[0].field].answer).join(' ;; ');
              o['הסבר'] = k0.explain || '';
            }
          }
          else if (b.k === 'cloze') { o['פרטים'] = 'השלמה: ' + b.parts.map(p => p.s !== undefined ? p.s : '{' + p.opts.map(op => (op.id === key[p.field].answer ? '*' : '') + op.t).join('|') + '}').join(' '); o['הסבר'] = k0.explain || ''; }
          else if (b.k === 'matrix') { o['פרטים'] = 'מטריצה: עמודות=' + b.cols.map(c => c.t).join('|') + ' ;; ' + b.rows.map(r => r.t + '=' + (b.cols.find(c => c.id === key[r.field].answer).t)).join(' ;; '); o['הסבר'] = k0.explain || ''; }
          rows.push(row(o));
        });
      }
    });
  });
}

// ---------- בדיקת מעבר הלוך ושוב ----------
let bad = 0;
for (const v of ['A', 'B', 'C']) {
  const orig = ctxOld.buildExam_(v);
  const parsed = ctxNew.parseContent_(rows, v);
  const oq = {}, pq = {};
  orig.exam.units.forEach(u => u.items.forEach(i => { if (i.t === 'q') oq[i.n] = i; }));
  parsed.exam.units.forEach(u => u.items.forEach(i => { if (i.t === 'q') pq[i.n] = i; }));
  const ok = (cond, msg) => { if (!cond) { bad++; console.log('  X', v, msg); } };
  ok(Object.keys(oq).length === Object.keys(pq).length, 'מספר שאלות');
  ok(Object.keys(orig.key).length === Object.keys(parsed.key).length, 'מספר שדות ' + Object.keys(orig.key).length + ' מול ' + Object.keys(parsed.key).length);
  ok(Math.abs(parsed.total - 100) < 0.01, 'סך ניקוד ' + parsed.total);
  ok(parsed.issues.length === 0, 'בעיות: ' + parsed.issues.join(' | '));
  // כל תשובה נכונה במקור צריכה לקבל ניקוד מלא גם אצל הפענוח החדש (לפי מיפוי שדות זהה)
  for (const f of Object.keys(orig.key)) {
    const a = orig.key[f], b = parsed.key[f];
    if (!b) { ok(false, 'שדה חסר ' + f); continue; }
    ok(a.type === b.type, 'סוג ' + f + ' ' + a.type + ' מול ' + b.type);
    ok(Math.abs(a.max - b.max) < 0.01, 'ניקוד ' + f + ' ' + a.max + ' מול ' + b.max);
    if (a.type === 'mc' || a.type === 'select') ok(a.answer === b.answer, 'תשובה ' + f);
    if (a.type === 'num') ok(a.answer === b.answer, 'מספר ' + f);
    if (a.type === 'matrix') { /* מזהי עמודות שונים (c1..) אך הטקסט זהה */ }
  }
  console.log(v, 'שורות', rows.filter(r => r[0] === v).length, 'שדות', Object.keys(parsed.key).length, 'ניקוד', parsed.total, 'בעיות', parsed.issues.length);
}
console.log(bad ? 'נמצאו ' + bad + ' אי-התאמות' : 'מעבר הלוך ושוב תקין');

fs.writeFileSync(kit + '/Sample.gs', '/** שורות לדוגמה: מבדק התא (נוסחים A, B, C). נוצר על ידי tools/export-sample.js */\nvar SAMPLE_ROWS = ' + JSON.stringify(rows) + ';\n');
console.log('Sample.gs נכתב:', rows.length, 'שורות');
