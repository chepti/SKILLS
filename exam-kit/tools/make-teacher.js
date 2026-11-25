// יוצר את Teacher.html של הערכה מהקובץ של מבדק התא החי. הרצה: node tools/make-teacher.js
const fs = require('fs'), path = require('path');
const kit = path.join(__dirname, '..');
let t = fs.readFileSync('T:/CURSOR2/אולפנה/כיתה ח מטח/מבדק-התא/Teacher.html', 'utf8').replace(/^\uFEFF/, '');
let fail = 0;
function rep(a, b, all) { if (!t.includes(a)) { console.log('לא נמצא:', a.slice(0, 90)); fail++; return; } t = all ? t.split(a).join(b) : t.replace(a, b); }
function cut(a, b, replacement) { const i = t.indexOf(a), j = t.indexOf(b, i + 1); if (i < 0 || j < 0) { console.log('לא נמצאו סמנים', a.slice(0, 50)); fail++; return; } t = t.slice(0, i) + replacement + t.slice(j); }

rep("<h1>בדיקת מבדק התא</h1>", '<h1 id="pageTitle">בדיקת מבדק</h1>');
rep("<title>בדיקת מבדק התא</title>", "<title>בדיקת מבדק</title>");
// כולל נוסחים נוספים
rep('<input type="checkbox" id="inclC" checked style="margin-inline-end:6px">כולל מועד ב</label>', '<input type="checkbox" id="inclC" checked style="margin-inline-end:6px"><span id="inclTxt">כולל נוסחים נוספים</span></label>');
rep('<label class="pill" style="cursor:pointer" title="כולל תלמידות שנבחנו במועד ב (נוסח ג) באותה כיתה, בבדיקה, בסיכומים ובטבלה">', '<label class="pill" id="inclLbl" style="cursor:pointer" title="כולל תלמידות שנבחנו בנוסחים שבקבוצה נפרדת (למשל מועד ב), בבדיקה, בסיכומים ובטבלה">');
// כפתור Gemini
rep('<button class="pill go" id="nextTodo"', '<button class="pill" id="gemBtn" title="הסוכן (Gemini) מציע ניקוד והערה לכל תשובה פתוחה שעוד אין לה הצעה. נשלחות רק התשובות, בלי שמות">הצעות ניקוד מ-Gemini</button><span class="mut" id="gemSt"></span>\n      <button class="pill go" id="nextTodo"');

// נוסחים דינמיים
rep("function verLbl(v){return v==='C'?'מועד ב':(v==='B'?'ב':'א');}\nfunction verFull(v){return v==='C'?'מועד ב':'נוסח '+(v==='B'?'ב':'א');}\nfunction QMV(v){return v==='C'?D.qmetaC:D.qmeta;}",
`function VERS(){return (ALL&&ALL.versions)||[];}
function verObj(v){return VERS().filter(function(x){return x.id===v;})[0]||{id:v,label:v,group:'1'};}
function verLbl(v){return verObj(v).label;}
function verFull(v){return verObj(v).label;}
function primaryGroup(){var vs=VERS();return vs.length?vs[0].group:'1';}
function isExtra(v){return verObj(v).group!==primaryGroup();}
function extraVers(){return VERS().filter(function(x){return x.group!==primaryGroup();});}
function QMV(v){return (ALL&&ALL.qmetaBy&&ALL.qmetaBy[v])||{};}
function qmGet(v,qid){return QMV(v)[qid]||{ab:'ללא יכולת מוגדרת',unit:'-'};}`);
rep("var ALL=null,clsFilter=null,TESTCLS='חולמים תקשוב',showRem=false,inclC=true;", "var ALL=null,clsFilter=null,TESTCLS='',showRem=false,inclC=true;");
rep("if(s.ver==='C'&&!inclC)return;cnt[s.cls]", "if(isExtra(s.ver)&&!inclC)return;cnt[s.cls]");
rep("if(s.ver==='C'&&!inclC)return false;var ok=", "if(isExtra(s.ver)&&!inclC)return false;var ok=");
rep("['A','B','C'].forEach(function(v){openQuestions(v)", "VERS().map(function(x){return x.id;}).forEach(function(v){openQuestions(v)");
rep("['A','B','C'].forEach(function(v){\n    var M=D.metas[v].fields;", "VERS().map(function(x){return x.id;}).forEach(function(v){\n    var M=D.metas[v]&&D.metas[v].fields;if(!M)return;");
rep("QMV(ver)[q.qid][key]", "qmGet(ver,q.qid)[key]");
rep("QMV(s.ver)[F[c.field].qid].ab", "qmGet(s.ver,F[c.field].qid).ab");
rep("QMV(s.ver)[F[o.field].qid].ab", "qmGet(s.ver,F[o.field].qid).ab");
rep("D.subs.filter(function(s){return grp==='C'?s.ver==='C':s.ver!=='C';})", "D.subs.filter(function(s){return verObj(s.ver).group===grp;})");

// לוח כיתתי לפי קבוצות
rep("  var hasAB=D.subs.some(function(s){return s.ver!=='C';}),hasC=D.subs.some(function(s){return s.ver==='C';});", "  var groups={};D.subs.forEach(function(s){var g=verObj(s.ver).group;if(!groups[g])groups[g]=[];if(groups[g].indexOf(s.ver)<0)groups[g].push(s.ver);});var gkeys=Object.keys(groups);");
rep("(hasAB&&hasC?' מועד ב מוצג בנפרד כי שאלותיו שונות.':'')", "(gkeys.length>1?' נוסחים בקבוצות שונות מוצגים בנפרד כי השאלות שלהם שונות.':'')");
rep("  if(hasAB)h+=qBlock('AB','A',hasC?'נוסחים א וב':'');\n  if(hasC)h+=qBlock('C','C',hasAB?'מועד ב':'');", "  gkeys.forEach(function(g){h+=qBlock(g,groups[g][0],gkeys.length>1?groups[g].map(verLbl).join(', '):'');});");
rep("  var byV={A:[],B:[],C:[]};complete.forEach(function(s){(byV[s.ver]||(byV[s.ver]=[])).push(totalOf(s.sid));});", "  var byV={};complete.forEach(function(s){(byV[s.ver]||(byV[s.ver]=[])).push(totalOf(s.sid));});");
const i1 = t.indexOf("  h+='<h2 class=\"sec\">השוואת נוסחים</h2>"), j1 = t.indexOf('\n', i1);
if (i1 < 0) { console.log('חסרה השוואת נוסחים'); fail++; } else t = t.slice(0, i1) + "  h+='<h2 class=\"sec\">השוואת נוסחים</h2><div class=\"panel\">'+VERS().map(function(v){var a=byV[v.id]||[];return esc(v.label)+': ממוצע '+r1(avg(a))+' ('+a.length+' תלמידות)';}).join(' · ')+'<div class=\"mut\">הפרש גדול עשוי להעיד שנוסח אחד קשה יותר, או על הבדל בין קבוצות הישיבה.</div></div>';" + t.slice(j1);

// פרסום: קודי גישה ומסנן נוסחים
const i2 = t.indexOf("  if(ALL&&ALL.moedCode)h+="), j2 = t.indexOf('\n', i2);
if (i2 < 0) { console.log('חסר פאנל מועד ב'); fail++; } else t = t.slice(0, i2) + "  var lockedV=VERS().filter(function(v){return v.code;});\n  if(lockedV.length)h+='<div class=\"panel\" style=\"margin-top:12px\"><b>נוסחים עם קוד גישה</b>: '+lockedV.map(function(v){return esc(v.label)+' <b style=\"direction:ltr;display:inline-block;letter-spacing:2px\">'+esc(v.code)+'</b>';}).join(' · ')+'. בטופס הכניסה התלמידות בוחרות את הנוסח ומקלידות את הקוד. אפשר להציג אותן יחד עם הכיתה או בלעדיהן בעזרת המתג בראש הדף.</div>';" + t.slice(j2);
rep(`'<select id="pver" class="pill"><option value="">כל הנוסחים</option><option value="A">נוסח א</option><option value="B">נוסח ב</option><option value="C">מועד ב</option></select>'+`,
    `'<select id="pver" class="pill"><option value="">כל הנוסחים</option>'+VERS().map(function(v){return '<option value="'+esc(v.id)+'">'+esc(v.label)+'</option>';}).join('')+'</select>'+`);

// הגדרות בטעינה
rep("ALL=d;applyFilter();$('sst').textContent='';", "ALL=d;TESTCLS=d.testClass||'';$('pageTitle').textContent='בדיקה: '+(d.title||'מבדק');var ex=extraVers();$('inclLbl').style.display=ex.length?'':'none';$('inclTxt').textContent='כולל '+ex.map(function(v){return v.label;}).join(', ');applyFilter();$('sst').textContent='';");
// Gemini
rep("$('nextTodo').addEventListener('click',gotoNextTodo);", `$('nextTodo').addEventListener('click',gotoNextTodo);
function runGemini(){
  if(!ALL||!ALL.geminiReady){$('gemSt').textContent='להדביק מפתח API בתא הצהוב בלשונית "הגדרות" בגיליון, ואז ללחוץ רענון.';return;}
  var btn=$('gemBtn'),total=0;btn.disabled=true;$('gemSt').textContent='מבקשת הצעות...';
  function step(){
    run('tGemini',[KEY,{cls:clsFilter==='*'?'':clsFilter}],function(r){
      if(!r||!r.ok){btn.disabled=false;$('gemSt').textContent='שגיאה: '+((r&&r.error)||'לא ידועה');return;}
      total+=r.processed;$('gemSt').textContent='נוצרו הצעות ל-'+total+' תשובות'+(r.remaining>0?' · נשארו '+r.remaining:'');
      if(r.remaining>0&&r.processed>0)step();
      else if(r.remaining>0){btn.disabled=false;$('gemSt').textContent='לא נשמרו הצעות ל-'+r.remaining+' תשובות'+(r.error?': '+r.error:'')+'. אפשר ללחוץ שוב.';load();}
      else{btn.disabled=false;$('gemSt').textContent='סיום: הצעות ל-'+total+' תשובות. מרעננת...';load();}
    },function(){btn.disabled=false;$('gemSt').textContent='הבקשה נכשלה או נקטעה (ייתכן שהשירות עמוס). אפשר ללחוץ שוב להמשך.';load();});
  }
  step();
}
$('gemBtn').addEventListener('click',runGemini);`);
// הסרת טקסט ספציפי למבדק התא
rep('העבר לכיתת הניסוי (חולמים תקשוב)', 'העבר לכיתת הניסוי');

fs.writeFileSync(kit + '/Teacher.html', t);
console.log(fail ? 'נכשלו ' + fail : 'Teacher.html נוצר', t.length);
