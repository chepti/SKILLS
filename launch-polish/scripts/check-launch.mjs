#!/usr/bin/env node
/**
 * check-launch.mjs — pre-publish audit for launch-polish.
 *
 * Reads a live URL over HTTP and reports what's present, what's weak, and
 * what's missing. Read-only: safe to run against production.
 *
 * Usage:
 *   node check-launch.mjs https://example.com/app/
 *   node check-launch.mjs https://example.com/app/ --ga G-XXXXXXXXXX
 *   node check-launch.mjs https://example.com/app/ --agent
 *   node check-launch.mjs https://example.com/app/ --no-credit --json
 *
 * Requires Node 18+ (global fetch).
 */

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.includes(`--${n}`);
const val = (n) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};

if (!target) {
  console.error('Usage: node check-launch.mjs <url> [--ga G-XXXX] [--agent] [--no-credit] [--json]');
  process.exit(2);
}

const BASE = new URL(target.endsWith('/') || /\.[a-z]{2,5}$/i.test(new URL(target).pathname)
  ? target
  : target + '/');
const WANT_GA = val('ga');
const CHECK_AGENT = flag('agent');
const CHECK_CREDIT = !flag('no-credit');
const AS_JSON = flag('json');

const UA = 'Mozilla/5.0 (compatible; launch-polish-audit/1.0)';
const results = [];
const add = (item, status, note = '') => results.push({ item, status, note });

async function get(url, opts = {}) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000),
      ...opts,
    });
    const ct = res.headers.get('content-type') || '';
    const len = Number(res.headers.get('content-length') || 0);
    let body = '';
    if (!opts.head) body = await res.text();
    return { ok: res.ok, status: res.status, ct, len, body, url: res.url };
  } catch (e) {
    return { ok: false, status: 0, ct: '', len: 0, body: '', err: String(e.message || e) };
  }
}

/** Reachability probe that tolerates servers rejecting HEAD. */
async function reachable(url) {
  let r = await get(url, { method: 'HEAD', head: true });
  if (!r.ok || r.status === 405) r = await get(url, { method: 'GET' });
  return r;
}

const head = (html) => {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html;
};

function meta(html, attr, name) {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'i'
  );
  const tag = html.match(re);
  if (!tag) return null;
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].trim() : '';
}

const ogv = (h, n) => meta(h, 'property', n) ?? meta(h, 'name', n);
const namev = (h, n) => meta(h, 'name', n) ?? meta(h, 'property', n);

function linkHref(html, relPattern) {
  const re = new RegExp(`<link[^>]*rel=["'][^"']*${relPattern}[^"']*["'][^>]*>`, 'gi');
  const tags = html.match(re) || [];
  return tags
    .map((t) => (t.match(/href=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean);
}

const abs = (href) => {
  try { return new URL(href, BASE).href; } catch { return null; }
};

const PLACEHOLDER_ICON = /^data:|vite\.svg|logo192\.png|react\.svg|next\.svg|favicon-placeholder/i;

async function main() {
  const page = await get(BASE.href);
  if (!page.ok) {
    add('Page reachable', 'FAIL', `HTTP ${page.status}${page.err ? ' — ' + page.err : ''}`);
    return report();
  }
  add('Page reachable', 'PASS', `HTTP ${page.status}`);

  const html = page.body;
  const H = head(html);

  // --- title + description -------------------------------------------------
  const title = (H.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  if (!title) add('Title', 'FAIL', 'missing');
  else if (title.length < 10) add('Title', 'WARN', `very short (${title.length}) — "${title}"`);
  else if (/^(vite|react app|document|untitled)/i.test(title)) add('Title', 'FAIL', `framework default — "${title}"`);
  else add('Title', 'PASS', title.slice(0, 60));

  const desc = namev(H, 'description');
  if (!desc) add('Meta description', 'FAIL', 'missing');
  else if (desc.length < 50) add('Meta description', 'WARN', `short (${desc.length} chars)`);
  else if (desc.length > 200) add('Meta description', 'WARN', `long (${desc.length} chars)`);
  else add('Meta description', 'PASS', `${desc.length} chars`);

  // --- Open Graph ----------------------------------------------------------
  const ogTitle = ogv(H, 'og:title');
  const ogDesc = ogv(H, 'og:description');
  const ogImage = ogv(H, 'og:image');
  const ogUrl = ogv(H, 'og:url');
  const ogType = ogv(H, 'og:type');

  const ogMissing = [
    ['og:title', ogTitle], ['og:description', ogDesc],
    ['og:image', ogImage], ['og:url', ogUrl], ['og:type', ogType],
  ].filter(([, v]) => !v).map(([k]) => k);

  if (ogMissing.length === 5) add('Open Graph', 'FAIL', 'no OG tags at all');
  else if (ogMissing.length) add('Open Graph', 'WARN', `missing: ${ogMissing.join(', ')}`);
  else add('Open Graph', 'PASS', 'core tags present');

  if (ogImage) {
    if (!/^https?:\/\//i.test(ogImage)) {
      add('og:image absolute', 'FAIL', `relative ("${ogImage}") — previews will be blank when shared`);
    } else {
      add('og:image absolute', 'PASS');
      const img = await reachable(ogImage);
      if (!img.ok) add('og:image loads', 'FAIL', `HTTP ${img.status} at ${ogImage}`);
      else if (!/^image\//i.test(img.ct)) add('og:image loads', 'WARN', `content-type ${img.ct || 'unknown'}`);
      else if (img.len && img.len > 800_000) add('og:image loads', 'WARN', `${Math.round(img.len / 1024)} KB — heavy for a scraper`);
      else add('og:image loads', 'PASS', img.len ? `${Math.round(img.len / 1024)} KB` : 'ok');
    }
    const w = ogv(H, 'og:image:width'), h2 = ogv(H, 'og:image:height');
    if (w && h2 && !(w === '1200' && h2 === '630')) add('og:image size hint', 'WARN', `${w}x${h2} (1200x630 recommended)`);
  }

  if (ogUrl && !/^https?:\/\//i.test(ogUrl)) add('og:url absolute', 'FAIL', ogUrl);

  const tw = namev(H, 'twitter:card');
  if (!tw) add('Twitter card', 'WARN', 'no twitter:card');
  else if (tw !== 'summary_large_image' && ogImage) add('Twitter card', 'WARN', `"${tw}" — summary_large_image shows the image big`);
  else add('Twitter card', 'PASS', tw);

  // --- viewport + theme-color ---------------------------------------------
  const vp = namev(H, 'viewport');
  if (!vp) add('Viewport', 'FAIL', 'missing — mobile layout will be wrong');
  else add('Viewport', 'PASS', /viewport-fit=cover/.test(vp) ? 'with viewport-fit' : 'no viewport-fit (notch padding)');

  const tc = namev(H, 'theme-color');
  add('theme-color', tc ? 'PASS' : 'WARN', tc || 'missing');

  const canon = linkHref(H, 'canonical')[0];
  if (!canon) add('Canonical', 'WARN', 'missing');
  else add('Canonical', /^https?:\/\//i.test(canon) ? 'PASS' : 'WARN', canon);

  // --- favicon -------------------------------------------------------------
  const icons = linkHref(H, 'icon');
  const real = icons.filter((h) => !PLACEHOLDER_ICON.test(h));
  if (!icons.length) {
    const fav = await reachable(new URL('favicon.ico', BASE).href);
    add('Favicon', fav.ok ? 'WARN' : 'FAIL',
      fav.ok ? 'no <link>, but /favicon.ico exists' : 'none declared and /favicon.ico missing');
  } else if (!real.length) {
    add('Favicon', 'FAIL', `placeholder only (${icons[0].slice(0, 40)})`);
  } else {
    const f = await reachable(abs(real[0]));
    add('Favicon', f.ok ? 'PASS' : 'FAIL', f.ok ? real[0] : `declared but HTTP ${f.status}: ${real[0]}`);
  }

  const apple = linkHref(H, 'apple-touch-icon')[0];
  if (!apple) add('apple-touch-icon', 'WARN', 'missing — blurry icon on iOS home screen');
  else {
    const a = await reachable(abs(apple));
    add('apple-touch-icon', a.ok ? 'PASS' : 'FAIL', a.ok ? apple : `HTTP ${a.status}`);
  }

  // --- manifest ------------------------------------------------------------
  const manifest = linkHref(H, 'manifest')[0];
  if (!manifest) add('PWA manifest', 'WARN', 'not linked — not installable');
  else {
    const m = await get(abs(manifest));
    if (!m.ok) add('PWA manifest', 'FAIL', `HTTP ${m.status} at ${manifest}`);
    else {
      try {
        const j = JSON.parse(m.body);
        const missing = ['name', 'start_url', 'icons'].filter((k) => !j[k]);
        if (missing.length) add('PWA manifest', 'WARN', `missing keys: ${missing.join(', ')}`);
        else {
          const first = j.icons[0]?.src;
          const ic = first ? await reachable(new URL(first, abs(manifest)).href) : { ok: false, status: 0 };
          add('PWA manifest', ic.ok ? 'PASS' : 'WARN',
            ic.ok ? `${j.icons.length} icons, first loads` : `icon not reachable (HTTP ${ic.status})`);
          if (!j.icons.some((i) => (i.purpose || '').includes('maskable')))
            add('Maskable icon', 'WARN', 'no maskable icon — Android will letterbox it');
        }
      } catch {
        add('PWA manifest', 'FAIL', 'not valid JSON');
      }
    }
  }

  // --- analytics -----------------------------------------------------------
  // GA can arrive as gtag.js, inside a GTM container, or via a plugin/proxy
  // (WordPress Site Kit, Cloudflare Zaraz…). Missing all of these is the only
  // safe "no analytics" verdict — a false negative here leads to a duplicate tag.
  const uniqGa = [...new Set([...html.matchAll(/\b(G-[A-Z0-9]{6,})\b/g)].map((m) => m[1]))];
  const gtm = [...new Set([...html.matchAll(/\b(GTM-[A-Z0-9]+)\b/g)].map((m) => m[1]))];
  const otherAnalytics = [
    [/googletagmanager\.com/i, 'googletagmanager.com'],
    [/google-analytics\.com/i, 'google-analytics.com'],
    [/googlesitekit/i, 'WordPress Site Kit'],
    [/plausible\.io|umami|matomo|cloudflareinsights|zaraz/i, 'privacy-friendly counter'],
  ].filter(([re]) => re.test(html)).map(([, n]) => n);

  if (WANT_GA) {
    add('Analytics (GA4)', uniqGa.includes(WANT_GA) ? 'PASS' : 'FAIL',
      uniqGa.length ? `found ${uniqGa.join(', ')}, expected ${WANT_GA}` : `expected ${WANT_GA}, none found`);
  } else if (uniqGa.length || gtm.length) {
    add('Analytics', 'PASS', [...uniqGa, ...gtm].join(', ') + (otherAnalytics.length ? ` (via ${otherAnalytics[0]})` : ''));
  } else if (otherAnalytics.length) {
    add('Analytics', 'WARN', `loader present (${otherAnalytics.join(', ')}) but no measurement ID in the HTML — verify in DevTools`);
  } else {
    add('Analytics', 'SKIP', 'no tag — intentional? confirm with the user');
  }
  if (/G-XXXXXXXXXX|UA-XXXXX|YOUR_[A-Z_]*ID/.test(html))
    add('Analytics placeholder', 'FAIL', 'a placeholder ID is live in the page');

  // --- robots + sitemap ----------------------------------------------------
  const origin = new URL(BASE).origin;
  const robots = await get(`${origin}/robots.txt`);
  if (!robots.ok) add('robots.txt', 'WARN', `HTTP ${robots.status}`);
  else {
    const sm = (robots.body.match(/Sitemap:\s*(\S+)/i) || [])[1];
    if (!sm) add('robots.txt', 'WARN', 'present, no Sitemap: line');
    else {
      const s = await reachable(sm);
      add('robots.txt', 'PASS', 'present with Sitemap');
      add('sitemap.xml', s.ok ? 'PASS' : 'FAIL', s.ok ? sm : `declared but HTTP ${s.status}: ${sm}`);
    }
  }

  // --- footer credit -------------------------------------------------------
  if (CHECK_CREDIT) {
    const hasCredit = /chepti\.com/i.test(html);
    add('Footer credit', hasCredit ? 'PASS' : 'WARN',
      hasCredit ? 'links to chepti.com' : 'no chepti.com link (use --no-credit for separate properties)');
  }

  // --- agent readiness -----------------------------------------------------
  const llms = await get(`${origin}/llms.txt`);
  add('llms.txt', llms.ok ? 'PASS' : (CHECK_AGENT ? 'FAIL' : 'WARN'),
    llms.ok ? `${llms.body.length} bytes` : `HTTP ${llms.status}`);

  if (CHECK_AGENT) {
    for (const [label, u] of [
      ['?action=help (no auth)', `${BASE.href}?action=help`],
      ['/api/help', `${origin}/api/help`],
      ['?action=state', `${BASE.href}?action=state`],
    ]) {
      const r = await get(u);
      if (!r.ok) { add(label, 'FAIL', `HTTP ${r.status}`); continue; }
      const looksJson = /json/i.test(r.ct) || /^\s*[{[]/.test(r.body);
      if (!looksJson) add(label, 'FAIL', `returned ${r.ct || 'non-JSON'} — likely the HTML page`);
      else {
        try { JSON.parse(r.body); add(label, 'PASS', `${r.body.length} bytes JSON`); }
        catch { add(label, 'WARN', 'JSON-ish but did not parse'); }
      }
    }
  }

  report();
}

function report() {
  if (AS_JSON) {
    console.log(JSON.stringify({ url: BASE.href, results }, null, 2));
  } else {
    const icon = { PASS: '✅', WARN: '⚠️ ', FAIL: '❌', SKIP: '— ' };
    const w = Math.max(...results.map((r) => r.item.length));
    console.log(`\nLaunch audit — ${BASE.href}\n${'-'.repeat(w + 30)}`);
    for (const r of results) {
      console.log(`${icon[r.status] || '  '} ${r.item.padEnd(w)}  ${r.note}`);
    }
    const f = results.filter((r) => r.status === 'FAIL').length;
    const n = results.filter((r) => r.status === 'WARN').length;
    console.log(`${'-'.repeat(w + 30)}\n${f} fail · ${n} warn · ${results.length} checks\n`);
  }
  process.exitCode = results.some((r) => r.status === 'FAIL') ? 1 : 0;
}

main().catch((e) => { console.error('audit crashed:', e); process.exit(2); });
