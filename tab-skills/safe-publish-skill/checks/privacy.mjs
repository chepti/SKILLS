// 2. Student privacy: IDs, full names, grades, trackers, data-collecting forms, photo metadata.
import fs from 'node:fs';
import path from 'node:path';
import { result, lineOf, standalone, tags, visibleText } from './lib.mjs';

export function validIsraeliId(s) {
  if (!/^\d{9}$/.test(s) || /^(\d)\1{8}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) { let d = Number(s[i]) * ((i % 2) + 1); sum += d > 9 ? d - 9 : d; }
  return sum % 10 === 0;
}
const TRACKERS = /google-analytics\.com|googletagmanager\.com|gtag\(|connect\.facebook\.net|fbq\(|hotjar\.com|clarity\.ms|mixpanel|segment\.(com|io)|analytics\.tiktok|doubleclick\.net|mc\.yandex|matomo\.cloud|static\.ads-twitter|snap\.licdn/i;
const ID_WORDS = /ת\.ז\.?|תעודת זהות|מספר זהות|\bID number\b/i;
const GRADE_HEAD = /<th[^>]*>\s*(ציון|ציונים|grade|score|marks?)\s*<\/th>/i;

// JPEG: find EXIF and a GPS pointer (tag 0x8825) in IFD0.
export function exifInfo(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let p = 2;
  while (p + 4 < buf.length && buf[p] === 0xff) {
    const marker = buf[p + 1], len = buf.readUInt16BE(p + 2);
    if (marker === 0xe1 && buf.slice(p + 4, p + 10).toString('latin1') === 'Exif\0\0') {
      const t = p + 10, le = buf.slice(t, t + 2).toString('latin1') === 'II';
      const u16 = o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o), u32 = o => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
      const ifd = t + u32(t + 4), n = u16(ifd);
      let gps = false;
      for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === 0x8825) gps = true;
      return { exif: true, gps };
    }
    if (marker === 0xda) break;
    p += 2 + len;
  }
  return { exif: false, gps: false };
}

export async function check(dir, cfg, files) {
  const items = [];
  const add = (level, msg, where) => items.push({ level, msg, where });
  let names = [];
  if (cfg.student_names_file) {
    const p = path.resolve(cfg._workDir, cfg.student_names_file);
    if (fs.existsSync(p)) names = fs.readFileSync(p, 'utf8').split('\n').map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);
    else add('warn', `student_names_file not found: ${cfg.student_names_file}`, '');
  }
  for (const f of files) {
    if (/\.(jpe?g)$/i.test(f.name)) {
      const ex = exifInfo(f.buf);
      if (ex?.gps) add('fail', 'photo carries GPS location in its metadata — strip it (e.g. re-save without EXIF)', f.name);
      else if (ex?.exif) add('warn', 'photo carries camera metadata — strip it', f.name);
    }
    if (/(student|pupil|class|תלמיד|כיתה).*\.(jpe?g|png|heic|webp|mp4|mov)$/i.test(f.name))
      add('warn', 'file name suggests a photo/video of students — parental consent, no names, no faces if possible', f.name);
    if (f.text == null) continue;
    const isHtml = /\.html?$/.test(f.ext), t = f.text, vis = isHtml ? visibleText(t) : t;
    for (const m of t.matchAll(/(?<![\d.])\d{9}(?![\d.])/g)) if (validIsraeliId(m[0]))
      add(f.ext === '.js' || f.inZip ? 'warn' : 'fail', 'number that is a valid Israeli ID (ת.ז) — remove', `${f.name}:${lineOf(t, m.index)}`);
    if (!f.inZip && ID_WORDS.test(vis)) add('warn', 'mentions ID numbers — make sure none are published', f.name);
    for (const n of names) { const i = vis.indexOf(n); if (i >= 0) add('fail', `full student name "${n.split(/\s+/)[0]} …" — use first name only, or none`, f.name); }
    if (isHtml && GRADE_HEAD.test(t)) add('warn', 'table with a grades column — grades never next to names on a public page', f.name);
    if (f.ext === '.csv' && /(ציון|grade|score)/i.test(t.split('\n')[0] || '')) add('fail', 'CSV with grades in the publish folder', f.name);
    const tm = !f.inZip && t.match(TRACKERS);
    if (tm) add('fail', `tracking/analytics script (${tm[0]}) — remove; students are not tracked`, f.name);
    if (isHtml) {
      for (const s of [...tags(t, 'script'), ...tags(t, 'iframe'), ...tags(t, 'link')]) {
        const src = s.attrs.src || (s.attrs.rel === 'stylesheet' ? s.attrs.href : '') || '';
        if (!/^https?:\/\//i.test(src)) continue;
        const host = new URL(src).hostname;
        if (/youtube\.com|youtu\.be/.test(host)) add('warn', 'YouTube embed — use youtube-nocookie.com', `${f.name} → ${host}`);
        else if (/fonts\.(googleapis|gstatic)\.com/.test(host)) add('warn', 'font loaded from Google — self-host it so visitors are not logged', f.name);
        else if (!(cfg.allowed_hosts || []).includes(host)) add('warn', `third-party ${s.raw.slice(1, s.raw.search(/\s/))} from ${host} — needed? it sees every visitor`, f.name);
      }
      for (const fm of tags(t, 'form')) if (/^https?:\/\//.test(fm.attrs.action || '')) add('warn', `form sends data to ${new URL(fm.attrs.action).hostname} — collect the minimum, approved tools only`, f.name);
      for (const inp of tags(t, 'input')) if (/^(email|tel)$/i.test(inp.attrs.type || '') || /^(full_?name|last_?name|surname|phone|id_?number|tz)$/i.test(inp.attrs.name || ''))
        { add('warn', `form field collects personal data (${inp.attrs.type || inp.attrs.name}) — first name/emoji only for students`, f.name); break; }
      if (/document\.cookie\s*=/.test(t)) add('warn', 'sets cookies — no tracking cookies on student pages', f.name);
    }
  }
  return result('privacy', 'פרטיות תלמידים', items, 'אין שמות מלאים, ת״ז, ציונים או מעקב');
}
standalone(import.meta.url, check);
