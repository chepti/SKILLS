// The pre-publish gate: runs all 8 checks, prints one short report, exits 1 if anything failed.
//   node gate.mjs <publish-folder> [--config publish-gate.json] [--live https://site.example] [--json report.json] [--all] [--probe-login]
//   node gate.mjs override --log <notes/publish-overrides.md> --site <name> --failed "<topics>" --words "<teacher's exact words>"
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadFiles, result, ICON } from './lib.mjs';
import { check as security } from './security.mjs';
import { check as privacy } from './privacy.mjs';
import { check as sources } from './sources.mjs';
import { check as a11y } from './a11y.mjs';
import { check as facts } from './facts.mjs';
import { check as keysafe } from './keysafe.mjs';
import { check as auth, liveProbe as authLive } from './auth.mjs';

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

if (process.argv[2] === 'override') {
  const log = arg('--log'), words = arg('--words');
  if (!log || !words) { console.error('override needs --log and --words (the teacher\'s exact words)'); process.exit(2); }
  const line = `- ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${arg('--site', '?')} · עקיפה של: ${arg('--failed', '?')} · המורה: "${words}"\n`;
  if (!fs.existsSync(log)) fs.writeFileSync(log, '# פרסומים למרות בקרה שנכשלה\n\n');
  fs.appendFileSync(log, line);
  console.log('logged: ' + line.trim());
  process.exit(0);
}

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node gate.mjs <publish-folder> [--config publish-gate.json] [--live URL] [--json out.json]'); process.exit(2); }
const cfg = loadConfig(dir, arg('--config'));
const files = loadFiles(dir);
const results = [
  await security(dir, cfg, files), await privacy(dir, cfg, files), ...(await sources(dir, cfg, files)),
  await a11y(dir, cfg, files), await facts(dir, cfg, files), await keysafe(dir, cfg, files), await auth(dir, cfg, files),
];

// Optional: probe the live site — secrets and protected paths must not answer 200.
const live = arg('--live');
if (live) {
  const items = [];
  const probe = ['/.env', '/.git/config', '/sources.json.bak', '/admin', '/api/admin', ...(cfg.protected_paths || [])];
  for (const p of probe) {
    try {
      const r = await fetch(new URL(p, live), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      const body = r.status === 200 ? (await r.text()).slice(0, 400) : '';
      const isIndex = /<html/i.test(body) && !(cfg.protected_paths || []).includes(p); // SPA fallback
      if (r.status === 200 && !isIndex) items.push({ level: 'fail', msg: `answers 200 without a key`, where: p });
    } catch (e) { items.push({ level: 'warn', msg: `could not reach (${e.name})`, where: p }); }
  }
  const sec = results.find(r => r.topic === 'security');
  Object.assign(sec, result('security', sec.title, [...sec.items, ...items], sec.okNote + ' · נבדק גם באתר החי'));
  const au = results.find(r => r.topic === 'auth');
  Object.assign(au, result('auth', au.title, [...au.items, ...(await authLive(live, cfg))], au.okNote + ' · נבדק גם באתר החי'));
}

const worst = results.some(r => r.status === 'fail') ? 'fail' : results.some(r => r.status === 'warn') ? 'warn' : 'pass';
const when = new Date().toLocaleString('he-IL', { timeZone: cfg.timezone || 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
console.log(`🛡️ בקרה לפני פרסום · ${cfg.site_name || path.basename(path.resolve(dir))} · ${when}`);
const LIMIT = process.argv.includes('--all') ? Infinity : 8;
for (const r of results) {
  console.log(`${ICON[r.status]} ${r.title}${r.status === 'pass' ? ' · ' + r.okNote : ''}`);
  for (const i of r.items.slice(0, LIMIT)) console.log(`   ${ICON[i.level]} ${i.msg}${i.where ? '  (' + i.where + ')' : ''}`);
  if (r.items.length > LIMIT) console.log(`   … ועוד ${r.items.length - LIMIT} (--all מציג הכל)`);
}
console.log(worst === 'fail' ? '⛔ לא מפרסמים: יש ❌. מתקנים ומריצים שוב (או שהמורה מחליטה במפורש לעקוף).'
  : worst === 'warn' ? '🟡 אפשר לפרסם: אין ❌. כל ⚠️ נבדק ומדווח למורה במשפט.' : '🟢 הכל עבר. אפשר לפרסם.');
const out = arg('--json');
if (out) fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), dir: path.resolve(dir), status: worst, results }, null, 1));
process.exit(worst === 'fail' ? 1 : 0);
