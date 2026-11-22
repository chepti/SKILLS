// 3. Copyright + 4. Credits. Reads sources.json (in the publish folder or next to publish-gate.json).
import fs from 'node:fs';
import path from 'node:path';
import { result, MEDIA_EXT, readJSON, tags, visibleText, standalone } from './lib.mjs';

const OK_LICENSE = /^(own|generated|ai-generated|cc0|public[- ]domain|pd|cc[- ]by([- ](sa|nd|nc))*([- ]\d\.\d)?|ofl|sil[- ]ofl.*|mit|isc|apache.*|bsd.*|permission)$/i;
const NEEDS_CREDIT = /^cc[- ]by|^permission|^fair[- ]use|^ofl|^sil/i;
const AI_WORD = /בינה מלאכותית|\bAI\b|\bTab\b|טאב|נוצר בעזרת|בסיוע/i;

function globRe(g) { return new RegExp('^' + g.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$'); }

export function loadSources(dir, cfg) {
  const p = [cfg.sources_file && path.resolve(cfg._workDir, cfg.sources_file), path.join(dir, 'sources.json'), path.join(cfg._workDir, 'sources.json')].find(f => f && fs.existsSync(f));
  return p ? { ...readJSON(p, { assets: [] }), _path: p } : null;
}

export async function check(dir, cfg, files) {
  const cItems = [], kItems = [];
  const src = loadSources(dir, cfg);
  const assets = src?.assets || [];
  const media = files.filter(f => !f.inZip && MEDIA_EXT.has(f.ext));
  const html = files.filter(f => !f.inZip && /\.html?$/.test(f.ext));
  if (!src && media.length) cItems.push({ level: 'fail', msg: `no sources.json — ${media.length} media/font files have no recorded source and licence`, where: '' });
  // every media file needs an entry
  for (const f of media) {
    const a = assets.find(a => a.file && globRe(a.file).test(f.name));
    if (!a) { if (src) cItems.push({ level: 'fail', msg: 'no source/licence recorded', where: f.name }); continue; }
  }
  for (const a of assets) {
    const lic = String(a.license || '').trim();
    const where = a.file || a.what || '';
    if (!a.source) cItems.push({ level: 'fail', msg: 'entry has no "source"', where });
    if (/^fair[- ]use/i.test(lic)) cItems.push({ level: a.note ? 'warn' : 'fail', msg: a.note ? `fair use (סעיף 19): ${a.note}` : 'fair use needs a "note": purpose, how little is used, why no licensed alternative', where });
    else if (!OK_LICENSE.test(lic)) cItems.push({ level: 'fail', msg: `licence "${lic || 'missing'}" does not allow publishing — replace the item, get permission, or generate your own`, where });
    else if (/nc/i.test(lic)) cItems.push({ level: 'warn', msg: `${lic}: non-commercial only — fine for free teaching, not for paid courses`, where });
    if (/^permission/i.test(lic) && !a.note) cItems.push({ level: 'fail', msg: 'permission needs a "note": who allowed it and when', where });
  }
  // external media embedded straight from other sites
  for (const f of html) {
    for (const tg of ['img', 'video', 'audio', 'source', 'iframe', 'embed', 'object']) for (const t of tags(f.text, tg)) {
      const u = t.attrs.src || t.attrs.data || '';
      if (/^https?:\/\//i.test(u) && !assets.some(a => a.file === u || (a.source && u.startsWith(a.source))))
        cItems.push({ level: tg === 'iframe' ? 'warn' : 'fail', msg: `${tg} loaded from another site and not in sources.json`, where: `${f.name} → ${u.slice(0, 80)}` });
    }
    const archived = [...f.text.matchAll(/\b(?:src|href)\s*=\s*["']?https?:\/\/web\.archive\.org\/web\//gi)].length;
    if (/<!--\s*(saved from url=|Mirrored from)|HTTrack Website Copier/i.test(f.text) || archived)
      cItems.push({ level: 'fail', msg: 'looks copied from another website (saved/mirrored page) — rebuild it in your own words', where: f.name });
  }
  // credits
  const people = src?.people || [];
  const needed = [
    ...assets.filter(a => a.creator && NEEDS_CREDIT.test(String(a.license || ''))).map(a => ({ name: a.creator, why: a.file || a.what })),
    ...people.filter(p => p.ai_credit !== 'omit_name').map(p => ({ name: p.credit_as || p.name, why: p.for || 'idea/work' })),
  ];
  const creditHtml = html.filter(f => /id=["'][^"']*credit|class=["'][^"']*credit|קרדיט|תודות|credits/i.test(f.text) || /credits?\.html?$/i.test(f.name));
  const creditText = creditHtml.map(f => visibleText(f.text)).join(' ');
  if (needed.length && !creditHtml.length) kItems.push({ level: 'fail', msg: `no visible credits block, but ${needed.length} people/sources need credit`, where: 'add <section id="credits">' });
  for (const n of needed) if (creditHtml.length && !creditText.includes(n.name))
    kItems.push({ level: 'fail', msg: `"${n.name}" is not named in the credits (for: ${n.why})`, where: creditHtml.map(f => f.name).join(', ') });
  for (const p of people) {
    if (p.ai_credit === 'mention' && !AI_WORD.test(creditText)) kItems.push({ level: 'fail', msg: `${p.credit_as || p.name} asked that AI help be stated in the credits`, where: '' });
    if (p.ai_credit === 'omit_name') for (const f of files) if (f.text && f.text.includes(p.name)) kItems.push({ level: 'fail', msg: 'a person who asked not to be named appears', where: f.name });
  }
  return [
    result('copyright', 'זכויות יוצרים', cItems, src ? `לכל ${media.length} הקבצים יש מקור ורישיון` : 'אין קבצי מדיה'),
    result('credits', 'קרדיטים', kItems, needed.length ? `${needed.length} קרדיטים מופיעים` : 'אין מי שצריך קרדיט'),
  ];
}
if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { loadConfig, loadFiles, printResult } = await import('./lib.mjs');
  const dir = process.argv[2];
  const rs = await check(dir, loadConfig(dir), loadFiles(dir));
  rs.forEach(printResult);
  process.exit(rs.some(r => r.status === 'fail') ? 1 : 0);
}
