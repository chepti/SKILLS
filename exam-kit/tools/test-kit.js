// בדיקת שרת הערכה מול "גיליון" בזיכרון. הרצה: node tools/test-kit.js
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const kit = path.join(__dirname, '..');

// ---------- סימולציה של Apps Script ----------
function permissive(obj) { return new Proxy(obj, { get(t, p) { if (p in t) return t[p]; if (typeof p === 'symbol') return undefined; return function () { return this === undefined ? proxy : proxyOf(t); }; } }); }
function proxyOf(t) { return permissive(t); }
let proxy;
function makeSheet(name) {
  const sh = { name, rows: [] };
  const maxc = () => sh.rows.reduce((m, r) => Math.max(m, r.length), 0);
  sh.getName = () => name;
  sh.getLastRow = () => sh.rows.length;
  sh.getLastColumn = () => Math.max(maxc(), 1);
  sh.getMaxRows = () => Math.max(sh.rows.length, 100);
  sh.appendRow = a => { sh.rows.push(a.slice()); return psh; };
  sh.deleteRow = i => { sh.rows.splice(i - 1, 1); };
  sh.getRange = (r, c, nr, nc) => {
    nr = nr || 1; nc = nc || 1;
    const rg = {
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (sh.rows[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); } return out; },
      getValue: () => { const v = (sh.rows[r - 1] || [])[c - 1]; return v === undefined ? '' : v; },
      setValues: vals => { vals.forEach((row, i) => { while (sh.rows.length < r + i) sh.rows.push([]); row.forEach((v, j) => { const R_ = sh.rows[r - 1 + i]; while (R_.length < c - 1 + j) R_.push(''); R_[c - 1 + j] = v; }); }); return prg; },
      setValue: v => { while (sh.rows.length < r) sh.rows.push([]); const R_ = sh.rows[r - 1]; while (R_.length < c - 1) R_.push(''); R_[c - 1] = v; return prg; },
      setFormula: f => { while (sh.rows.length < r) sh.rows.push([]); const R_ = sh.rows[r - 1]; while (R_.length < c - 1) R_.push(''); R_[c - 1] = f; return prg; }
    };
    const prg = permissive(rg);
    return prg;
  };
  sh.getDataRange = () => sh.getRange(1, 1, Math.max(sh.rows.length, 1), maxc() || 1);
  const psh = permissive(sh);
  return psh;
}
const sheets = {};
const ss = permissive({
  getId: () => 'SSID', getUrl: () => 'https://sheet.example',
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => { sheets[n] = makeSheet(n); return sheets[n]; },
  getSheets: () => Object.values(sheets),
  deleteSheet: () => {}, setActiveSheet: () => {}, setNamedRange: () => {},
});
const props = {};
let lastAlert = null;
const ui = permissive({ alert: (...a) => { lastAlert = a.join(' | '); return 1; }, ButtonSet: { OK: 1, YES_NO: 2 }, Button: { YES: 1 } });
const fetchLog = [];
const ctx = {
  console, Date, Math, JSON, Object, Array, String, Number, encodeURIComponent, isNaN, parseInt, parseFloat, RegExp, Error,
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, getUi: () => ui, newDataValidation: () => permissive({ requireValueInList: () => permissive({ build: () => ({}) }) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { getUuid: () => crypto.randomUUID(), sleep: () => {} },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.example/exec' }) },
  UrlFetchApp: { fetch: (url, o) => { fetchLog.push({ url, o }); if (/\/models\?/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.8-flash-lite', supportedGenerationMethods: ['generateContent'] }] }) }; if (global.__failFn) { const c = global.__failFn(url); if (c) return { getResponseCode: () => c, getContentText: () => JSON.stringify({ error: { message: 'simulated ' + c } }) }; } const body = JSON.parse(o.payload); const userTxt = body.contents[0].parts[0].text; const arr = JSON.parse(userTxt.slice(userTxt.lastIndexOf('(JSON):\n') + 8)); const out = arr.map(x => ({ id: x.id, score: 7, note: 'הסברת נכון. כדאי להוסיף פרט.' })); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) }; } },
  ContentService: {}, HtmlService: {},
};
vm.createContext(ctx);
['Content.gs', 'Code.gs', 'Setup.gs', 'Sample.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(kit, f), 'utf8'), ctx, { filename: f }));
const call = (src) => vm.runInContext(src, ctx);

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('  X', m); } else console.log('  ✓', m); };

// ---------- התקנה ----------
ctx.SpreadsheetApp.getActiveSpreadsheet = () => ss;
call('setupAll()');
ok(['התחלה', 'שאלון', 'הגדרות', 'מדריך', 'תוצאות', 'תשובות פתוחות', 'תשובות סגורות', 'טיוטות', 'דוח בדיקה'].every(n => sheets[n]), 'נוצרו כל הלשוניות');
ok(!!props.ADMIN_KEY && !!props.AGENT_KEY, 'נוצרו מפתחות');
ok(sheets['שאלון'].rows.length === 101, 'שאלון נטען עם ' + sheets['שאלון'].rows.length + ' שורות');
const vers = call('versions_()');
ok(vers.length === 3 && vers[2].code.length === 6, 'נוסחים: ' + vers.map(v => v.id + ':' + v.label + (v.code ? '(קוד)' : '')).join(', '));
call('validateContentMenu()');
ok(/תקין/.test(lastAlert) && sheets['דוח בדיקה'].rows.slice(1).every(r => /תקין/.test(r[1])), 'בדיקת תקינות עברה: ' + sheets['דוח בדיקה'].rows.slice(1).map(r => r[1]).join(' / '));

// ---------- תלמידות ----------
const info = call('getStartInfo()');
ok(info.title === 'מבדק התא' && info.versions.length === 3 && info.versions[2].locked && !info.versions[0].locked, 'getStartInfo');
const exA = call("getExam('A')");
ok(exA.units && exA.units.length === 3 && !JSON.stringify(exA).includes('"answer"'), 'getExam A בלי מפתח');
ok(call("getExam({version:'C',code:''})").error, 'נוסח נעול דורש קוד');
const code = vers[2].code;
ok(call(`getExam({version:'C',code:'${code}'})`).units.length === 3, 'נוסח נעול עם קוד נכון');

function answersFor(v, skill) {
  const b = vm.runInContext(`built_('${v}')`, ctx), ans = {};
  Object.keys(b.key).forEach(f => { const k = b.key[f]; if (k.type === 'manual') ans[f] = f === 'q3' ? 'הנבטים השתמשו במלאי של עמילן' : (f === 'q1f1' ? '' : 'תשובה'); else if (k.type === 'num') ans[f] = String(k.answer); else if (k.type === 'text') ans[f] = [].concat(k.accept)[0]; else ans[f] = k.answer; });
  return ans;
}
ctx.__ans = answersFor('A');
const sub = { sid: 'S1', name: 'זהבה כ', cls: 'ח2', version: 'A', startedAt: Date.now() - 40 * 60000, answers: ctx.__ans, keys: {}, lens: {}, events: { blur: 0, paste: 0 }, fb: { level: 'הוגן' } };
ctx.__sub = sub;
const r1 = call('submitExam(__sub)');
ok(r1.ok && r1.code && r1.code.length === 6, 'הגשה נקלטה, קוד ' + r1.code);
const res = sheets['תוצאות'].rows[1];
ok(res && res[3] === 'ח2' && res[4] === 'A' && res[6] > 0, 'שורת תוצאות: כיתה ' + res[3] + ' נוסח ' + res[4] + ' אוטומטי ' + res[6]);
const dup = call('submitExam(__sub)');
ok(dup.duplicate, 'הגשה כפולה נחסמת');
// נוסח נעול בלי קוד
ctx.__subC = { sid: 'S2', name: 'אסתר ק', cls: 'ח2', version: 'C', startedAt: Date.now(), answers: answersFor('C'), keys: {}, lens: {}, events: {}, fb: {} };
ok(!call('submitExam(__subC)').ok, 'הגשה לנוסח נעול בלי קוד נדחית');
ctx.__subC.code = code;
ok(call('submitExam(__subC)').ok, 'הגשה לנוסח נעול עם קוד');
ok(call("normCls_(\"ח'2\")") === 'ח2' && call("normCls_('ניסוי  מורים')") === 'ניסוי מורים', 'נרמול כיתה');

// ---------- לוח מורה ----------
const all = call(`tGetAll('${props.ADMIN_KEY}')`);
ok(all.ok && all.subs.length === 2 && all.versions.length === 3 && all.qmetaBy.C && all.metas.C.fields.q3, 'tGetAll: ' + all.subs.length + ' תלמידות, נוסחים ' + all.versions.map(v => v.id).join(','));
ok(all.open.length > 0, 'תשובות פתוחות: ' + all.open.length);

// ---------- Gemini ----------
sheets['הגדרות'].rows[6][1] = 'FAKE-KEY';
ok(call('geminiKey_()') === 'FAKE-KEY', 'קריאת המפתח מהתא');
const g1 = call("geminiBatch_({cls:'ח2'})");
ok(g1.processed > 0, 'geminiBatch עיבד ' + g1.processed + ', נשארו ' + g1.remaining);
for (let k = 0; k < 6 && !fetchLog.length; k++) call("geminiBatch_({cls:'ח2'})");
ok(fetchLog.length >= 1 && fetchLog[0].o.headers['x-goog-api-key'] === 'FAKE-KEY' && !fetchLog[0].url.includes('FAKE'), 'המפתח נשלח בכותרת ולא בכתובת');
const payload = fetchLog[0].o.payload;
const mm = payload.match(/.{25}(זהבה כ|אסתר ק|ח2|S1|S2).{25}/); ok(!mm, 'לא נשלחים שם וכיתה ל-Gemini' + (mm ? ': ' + mm[0] : ''));
const sugRows = sheets['תשובות פתוחות'].rows.slice(1).filter(r => r[9] !== '');
ok(sugRows.length > 0 && sugRows.some(r => r[9] === 0 && /לא כתבת/.test(r[10])), 'הצעות נכתבו, ותשובה ריקה קיבלה 0 בלי קריאה');
let loops = 0, rem = 1; while (rem > 0 && loops++ < 20) { const g = call("geminiBatch_({cls:'ח2'})"); rem = g.remaining; if (!g.processed) break; }
ok(rem === 0, 'הלולאה מסיימת את כל ההמתנות');

// ---------- עמידות: עומס ודגם גיבוי ----------
const probe = "geminiPost_({contents:[{parts:[{text:'x (JSON):\\n[]'}]}]})";
let n503 = 0; global.__failFn = () => (n503++ < 2 ? 503 : 0);
let r = null; try { r = call(probe); } catch (e) { r = null; }
ok(r && r.candidates && n503 === 3, 'שני כשלי 503 ואז הצלחה באותו דגם');
global.__failFn = url => (url.includes('gemini-2.5-flash') ? 0 : 503);
sheets['הגדרות'].rows.forEach(rw => { if (rw[0] === 'דגם' || /דגם Gemini/.test(String(rw[0]))) rw[1] = 'gemini-main-x'; });
fetchLog.length = 0; let r2 = null; try { r2 = call(probe); } catch (e) { r2 = null; }
ok(r2 && fetchLog.some(f => f.url.includes('gemini-2.5-flash')), 'מעבר לדגם גיבוי כשהראשי עמוס');
global.__failFn = () => 503; let msg = ''; try { call(probe); } catch (e) { msg = String(e.message || e); }
ok(/עמוס/.test(msg), 'הודעת עומס בעברית אחרי כל הניסיונות');
global.__failFn = url => (url.includes('gemini-3.8-flash:') ? 0 : 404);
fetchLog.length = 0; let r3 = null; try { r3 = call(probe); } catch (e) { r3 = null; }
ok(r3 && fetchLog.some(f => f.url.includes('gemini-3.8-flash:')), 'דגם מוגדר נדחה: מגלים דגם זמין (3.8) ועוברים אליו');
global.__failFn = null;

// ---------- פרסום ומשוב ----------
call(`tPublish('${props.ADMIN_KEY}',['S1'],true,null)`);
const fb = call(`getFeedback('${r1.code}')`);
ok(fb.ok && fb.items.length === 14 && fb.items.every(i => i.parts.length > 0), 'getFeedback החזיר ' + (fb.items || []).length + ' שאלות');
console.log(bad ? '\nנכשלו ' + bad + ' בדיקות' : '\nכל הבדיקות עברו');
process.exit(bad ? 1 : 0);
