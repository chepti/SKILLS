// Shared helpers for the pre-publish checks. Node 18+, no dependencies.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const TEXT_EXT = new Set(['.html','.htm','.js','.mjs','.cjs','.css','.json','.txt','.md','.csv','.svg','.xml','.webmanifest','.map','.yml','.yaml','.env','.ini','.toml','.py','.sh','.ts','.vtt','.srt','']);
export const MEDIA_EXT = new Set(['.png','.jpg','.jpeg','.gif','.webp','.avif','.svg','.heic','.mp4','.webm','.mov','.m4v','.mp3','.m4a','.wav','.ogg','.opus','.pdf','.docx','.pptx','.xlsx','.woff','.woff2','.ttf','.otf']);

// Every file under dir (relative paths), skipping nothing: hidden files matter here.
export function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else if (e.isFile()) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// Minimal ZIP reader (stored + deflate) so archives are scanned too.
export function zipEntries(buf) {
  const out = [];
  let eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return out;
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < n && buf.readUInt32LE(p) === 0x02014b50; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString('utf8');
    p += 46 + nl + xl + cl;
    if (name.endsWith('/')) continue;
    const ln = buf.readUInt16LE(local + 26), lx = buf.readUInt16LE(local + 28);
    const data = buf.slice(local + 30 + ln + lx, local + 30 + ln + lx + csize);
    let body = null;
    try { body = method === 0 ? data : method === 8 ? zlib.inflateRawSync(data) : null; } catch { body = null; }
    out.push({ name, body });
  }
  return out;
}

// All scannable files: {name, ext, text|null, buf}. Zip members appear as "x.zip!inner/path".
export function loadFiles(dir) {
  const files = [];
  for (const rel of walk(dir)) {
    const buf = fs.readFileSync(path.join(dir, rel));
    const ext = path.extname(rel).toLowerCase();
    files.push({ name: rel, ext, buf, text: TEXT_EXT.has(ext) ? buf.toString('utf8') : null });
    if (ext === '.zip') for (const z of zipEntries(buf)) {
      const zext = path.extname(z.name).toLowerCase();
      files.push({ name: `${rel}!${z.name}`, ext: zext, buf: z.body || Buffer.alloc(0),
        text: z.body && TEXT_EXT.has(zext) ? z.body.toString('utf8') : null, inZip: true });
    }
  }
  return files;
}

export function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

export function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

// Config: publish-gate.json next to (above) the publish folder, or --config.
export function loadConfig(dir, explicit) {
  const p = explicit || [path.join(dir, '..', 'publish-gate.json'), path.join(dir, 'publish-gate.json')].find(f => fs.existsSync(f));
  const c = p ? readJSON(p, {}) : {};
  c._path = p || null;
  c._workDir = p ? path.dirname(p) : path.join(dir, '..');
  return c;
}

// --- tiny HTML helpers (good enough for a gate; axe is the deep check) ---
export function stripComments(html) { return html.replace(/<!--[\s\S]*?-->/g, ''); }
export function tags(html, name) {
  const re = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(html))) out.push({ attrs: attrs(m[1]), raw: m[0], index: m.index });
  return out;
}
export function attrs(s) {
  const a = {}; const re = /([:\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let m;
  while ((m = re.exec(s))) a[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  return a;
}
// Inner HTML of <name ...>…</name> blocks (not nested-aware; fine for a, button, h1-h6, label, video).
export function blocks(html, name) {
  const re = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(html))) out.push({ attrs: attrs(m[1]), inner: m[2], index: m.index });
  return out;
}
export function textOf(inner) {
  const alts = [...inner.matchAll(/<img\b[^>]*\balt\s*=\s*"([^"]*)"/gi)].map(m => m[1]).join(' ');
  const labels = [...inner.matchAll(/aria-label\s*=\s*"([^"]*)"/gi)].map(m => m[1]).join(' ');
  return (inner.replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ') + ' ' + alts + ' ' + labels).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
}
export function visibleText(html) {
  return decode(stripComments(html).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}

// Result helper: each check returns {topic, title, status, items:[{level, msg, where}]}
export function result(topic, title, items, okNote = '') {
  const status = items.some(i => i.level === 'fail') ? 'fail' : items.some(i => i.level === 'warn') ? 'warn' : 'pass';
  return { topic, title, status, items, okNote };
}
export const ICON = { pass: '✅', warn: '⚠️', fail: '❌' };

export function printResult(r) {
  console.log(`${ICON[r.status]} ${r.title}${r.status === 'pass' && r.okNote ? ' · ' + r.okNote : ''}`);
  for (const i of r.items) console.log(`   ${ICON[i.level]} ${i.msg}${i.where ? '  (' + i.where + ')' : ''}`);
}

// Standalone runner used by every check file.
export async function standalone(metaUrl, fn) {
  if (process.argv[1] && path.resolve(process.argv[1]) === new URL(metaUrl).pathname) {
    const dir = process.argv[2];
    if (!dir || !fs.existsSync(dir)) { console.error('usage: node <check>.mjs <publish-folder> [--config publish-gate.json]'); process.exit(2); }
    const ci = process.argv.indexOf('--config');
    const cfg = loadConfig(dir, ci > 0 ? process.argv[ci + 1] : null);
    const r = await fn(dir, cfg, loadFiles(dir));
    printResult(r);
    process.exit(r.status === 'fail' ? 1 : 0);
  }
}
