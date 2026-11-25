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
  Utilities: { getUuid: () => crypto.randomUUID() },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.example/exec' }) },
  UrlFetchApp: { fetch: (url, o) => { fetchLog.push({ url, o }); const body = JSON.parse(o.payload); const userTxt = body.contents[0].parts[0].text; const arr = JSON.parse(userTxt.slice(userTxt.lastIndexOf('(JSON):\n') + 8)); const out = arr.map(x => ({ id: x.id, score: 7, note: 'הסברת נכון. כדאי להוסיף פרט.' })); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) }; } },
  ContentService: {}, HtmlService: {},
};
vm.createContext(ctx);
['Content.gs', 'Code.gs', 'Setup.gs', 'Sample.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(kit, f), 'utf8'), ctx, { filename: f }));

const ok = (c, m) => { if (!c) { bad++; console.log('  X', m); } else console.log('  ✓', m); };

const call = (src) => vm.runInContext(src, ctx);
module.exports = { ctx, call, sheets, props, ss, fetchLog, vm, kit, ui, getLastAlert: () => lastAlert };
