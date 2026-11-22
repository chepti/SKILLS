// 5. Accessibility (IS 5568 / WCAG 2.1 AA): static checks on every HTML page + CSS contrast.
// Static checks catch the common mistakes; if Playwright is available also run axe.mjs on the live URL.
import { result, tags, blocks, textOf, stripComments, standalone } from './lib.mjs';

// ---- colour contrast ----
const NAMED = { white: '#ffffff', black: '#000000' };
function parseColor(v, vars) {
  if (!v) return null;
  v = v.trim().replace(/!important/, '').trim();
  for (let i = 0; i < 5 && /var\(/.test(v); i++) v = v.replace(/var\((--[\w-]+)(?:,([^)]*))?\)/g, (_, n, d) => vars[n] ?? d ?? '');
  const m = v.match(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\(([^)]+)\)|\b(white|black)\b/i);
  if (!m) return null;
  if (m[3]) return parseColor(NAMED[m[3].toLowerCase()], vars);
  if (m[1]) {
    let h = m[1]; if (h.length <= 4) h = [...h].map(c => c + c).join('');
    if (h.length === 8 && parseInt(h.slice(6), 16) < 255) return null; // translucent: skip
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const p = m[2].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (p.length > 3 && p[3] < 1) return null;
  return p.slice(0, 3);
}
const lum = c => { const [r, g, b] = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function cssRules(css) {
  const out = []; const re = /([^{}@]+)\{([^{}]*)\}/g; let m;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while ((m = re.exec(css))) {
    const d = {}; for (const part of m[2].split(';')) { const i = part.indexOf(':'); if (i > 0) d[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim(); }
    out.push({ sel: m[1].trim(), d });
  }
  return out;
}

export function contrastIssues(css) {
  const rules = cssRules(css), vars = {}, issues = [];
  for (const r of rules) for (const [k, v] of Object.entries(r.d)) if (k.startsWith('--')) vars[k] = v;
  const bodyRule = rules.filter(r => /(^|,)\s*(body|html|:root)\s*(,|$)/.test(r.sel));
  let pageBg = [255, 255, 255], pageFg = [0, 0, 0];
  for (const r of bodyRule) { pageBg = parseColor(r.d['background-color'] || r.d.background, vars) || pageBg; pageFg = parseColor(r.d.color, vars) || pageFg; }
  for (const r of rules) {
    if (/::?(placeholder|selection)|:disabled|\[disabled\]/.test(r.sel)) continue;
    const fg = parseColor(r.d.color, vars); if (!fg) continue;
    const ownBg = parseColor(r.d['background-color'] || (r.d.background && !/gradient\(.*url|url\(/.test(r.d.background) ? r.d.background : ''), vars);
    const bg = ownBg || pageBg;
    const size = parseFloat((r.d['font-size'] || '').match(/[\d.]+px/)?.[0] || r.d.font?.match(/([\d.]+)px/)?.[1] || '16');
    const bold = /bold|[6-9]00/.test(r.d['font-weight'] || r.d.font || '');
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const c = contrast(fg, bg);
    if (c < need) issues.push({ level: ownBg ? 'fail' : 'warn', msg: `contrast ${c.toFixed(2)}:1 (needs ${need}:1)${ownBg ? '' : ' against the page background — check the real background'}`, where: r.sel.slice(0, 60) });
  }
  return issues;
}

export async function check(dir, cfg, files) {
  const items = [];
  const add = (level, msg, where) => items.push({ level, msg, where });
  const pages = files.filter(f => !f.inZip && /\.html?$/.test(f.ext));
  const cssFiles = Object.fromEntries(files.filter(f => !f.inZip && f.ext === '.css').map(f => [f.name, f.text]));
  let statement = false;
  for (const f of pages) {
    const h = stripComments(f.text), where = f.name;
    if (/הצהרת נגישות|accessibility statement/i.test(h)) statement = true;
    const html = tags(h, 'html')[0]?.attrs || {};
    if (!html.lang) add('fail', '<html> has no lang', where);
    if (/^(he|ar|yi)/i.test(html.lang || '') && (html.dir || '').toLowerCase() !== 'rtl') add('fail', 'Hebrew/Arabic page without dir="rtl"', where);
    if (!/<title>\s*[^<\s][^<]*<\/title>/i.test(h)) add('fail', 'missing <title>', where);
    const vp = tags(h, 'meta').find(m => m.attrs.name === 'viewport');
    if (!vp) add('fail', 'missing viewport meta (phones)', where);
    else if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(vp.attrs.content || '')) add('fail', 'zoom is blocked (user-scalable=no / maximum-scale=1)', where);
    for (const i of tags(h, 'img')) {
      if (!('alt' in i.attrs)) add('fail', `image without alt: ${i.attrs.src || ''}`.slice(0, 90), where);
      else if (/\.(png|jpe?g|webp|gif|svg)$|^(image|img|photo|תמונה)\d*$/i.test(i.attrs.alt.trim())) add('warn', `alt text is a file name/placeholder: "${i.attrs.alt}"`, where);
    }
    const hs = [...h.matchAll(/<h([1-6])\b/gi)].map(m => +m[1]);
    const h1 = hs.filter(x => x === 1).length;
    if (h1 !== 1) add(h1 ? 'warn' : 'fail', `${h1} <h1> headings (expected exactly 1)`, where);
    for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { add('warn', `heading jumps from h${hs[i - 1]} to h${hs[i]}`, where); break; }
    for (const a of blocks(h, 'a')) if (!textOf(a.inner) && !a.attrs['aria-label'] && !a.attrs.title) add('fail', `link with no text: ${a.attrs.href || ''}`.slice(0, 90), where);
    for (const a of blocks(h, 'a')) if (/^(לחצו כאן|לחץ כאן|כאן|click here|here)$/i.test(textOf(a.inner))) add('warn', `link text "${textOf(a.inner)}" says nothing out of context`, where);
    for (const el of [...blocks(h, 'a'), ...blocks(h, 'button')]) {
      const lbl = el.attrs['aria-label'], vis = el.inner.replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (lbl && vis && !lbl.includes(vis)) add('fail', `aria-label "${lbl}" does not contain the visible text "${vis}" (voice-control users say what they see)`, where);
    }
    for (const b of blocks(h, 'button')) if (!textOf(b.inner) && !b.attrs['aria-label'] && !b.attrs.title) add('fail', 'button with no name', where);
    const ids = new Set([...h.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)/gi)].map(m => m[1]));
    for (const inp of [...tags(h, 'input'), ...tags(h, 'select'), ...tags(h, 'textarea')]) {
      const t = (inp.attrs.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(t)) continue;
      const wrapped = /<label\b[^>]*>(?:(?!<\/label>)[\s\S])*$/i.test(h.slice(0, inp.index));
      if (!wrapped && !ids.has(inp.attrs.id) && !inp.attrs['aria-label'] && !inp.attrs['aria-labelledby'] && !inp.attrs.title) add('fail', `form field without a label (${inp.attrs.name || inp.attrs.id || t || 'input'})`, where);
    }
    for (const v of blocks(h, 'video')) {
      if (!/<track\b[^>]*kind\s*=\s*["']?(captions|subtitles)/i.test(v.inner) && !('data-no-speech' in v.attrs)) add('fail', 'video without captions/subtitles track (add data-no-speech if it has no speech)', where);
      if ('autoplay' in v.attrs && !('muted' in v.attrs)) add('fail', 'video autoplays with sound', where);
    }
    for (const v of tags(h, 'audio')) if ('autoplay' in v.attrs) add('fail', 'audio autoplays', where);
    if (/<audio\b/i.test(h) && !/תמליל|transcript/i.test(h)) add('warn', 'audio without a transcript nearby', where);
    for (const fr of tags(h, 'iframe')) if (!fr.attrs.title) add('fail', 'iframe without title', where);
    if (/tabindex\s*=\s*["']?[1-9]/i.test(h)) add('warn', 'positive tabindex breaks keyboard order', where);
    if (/<(div|span)\b[^>]*\bonclick\b(?![^>]*\b(role|tabindex)\b)[^>]*>/i.test(h)) add('fail', 'clickable div/span without role/tabindex — not reachable by keyboard; use <button>', where);
    const svgs = tags(h, 'svg').filter(s => !('aria-hidden' in s.attrs) && !s.attrs['aria-label'] && s.attrs.role !== 'img');
    if (svgs.length) add('warn', `${svgs.length} inline SVG icons without aria-hidden="true" or a label`, where);
    // CSS: inline <style> + linked local stylesheets
    let css = [...h.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
    for (const l of tags(h, 'link')) if (l.attrs.rel === 'stylesheet' && cssFiles[(l.attrs.href || '').replace(/^\.?\//, '')]) css += '\n' + cssFiles[l.attrs.href.replace(/^\.?\//, '')];
    for (const i of contrastIssues(css)) add(i.level, i.msg, `${where} ${i.where}`);
    const tiny = [...css.matchAll(/font(?:-size)?\s*:[^;}]*?\b(\d+(?:\.\d+)?)px/g)].map(m => +m[1]).filter(n => n < 12);
    if (tiny.length) add('warn', `text smaller than 12px (${[...new Set(tiny)].join(', ')}px)`, where);
    const bodyFs = css.match(/body\s*\{[^}]*font-size\s*:\s*([\d.]+)px/);
    if (bodyFs && +bodyFs[1] < 16) add('warn', `body text ${bodyFs[1]}px — 16px+ reads better on phones`, where);
    if (/outline\s*:\s*(none|0)\b/.test(css) && !/:focus-visible|:focus\b/.test(css)) add('fail', 'focus outline removed with no replacement — keyboard users get lost', where);
  }
  if (pages.length && !statement) add('warn', 'no accessibility statement (הצהרת נגישות) — a short one with a contact for problems', '');
  return result('a11y', 'נגישות', items, `${pages.length} עמודים: שפה, כותרות, טקסט חלופי, ניגודיות, תוויות`);
}
standalone(import.meta.url, check);
