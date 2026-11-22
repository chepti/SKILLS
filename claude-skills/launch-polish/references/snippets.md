# Copy-ready snippets

Replace every `PLACEHOLDER` and every absolute URL with the project's real
values. All social/manifest URLs must be **absolute** (start with `https://`).

## Head block — full social + meta bundle

Place inside `<head>`, ideally right after `<meta charset>`.

```html
<!-- Primary meta -->
<title>PRODUCT NAME — short value line</title>
<meta name="description" content="One clear sentence, ~150 chars, what it is and who it's for." />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#134e4a" />
<link rel="canonical" href="https://example.com/app/" />

<!-- Open Graph (WhatsApp, Facebook, Telegram, iMessage, LinkedIn) -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="PRODUCT NAME" />
<meta property="og:title" content="PRODUCT NAME — short value line" />
<meta property="og:description" content="One clear sentence, same as description." />
<meta property="og:image" content="https://example.com/app/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://example.com/app/" />
<meta property="og:locale" content="he_IL" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="PRODUCT NAME — short value line" />
<meta name="twitter:description" content="One clear sentence." />
<meta name="twitter:image" content="https://example.com/app/og-image.png" />
```

For RTL Hebrew sites keep `og:locale` as `he_IL`. The text content of the tags
can be Hebrew freely.

## Favicon links

```html
<link rel="icon" href="/app/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/app/icon.svg" />
<link rel="apple-touch-icon" href="/app/apple-touch-icon.png" />
<link rel="manifest" href="/app/manifest.webmanifest" />
```

## Google Analytics 4 (gtag.js)

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### SPA virtual page views (hash router)

The `config` call above sends exactly one page_view on load. For a hash-routed
SPA, send a virtual page_view on every route change so screens are
distinguishable in reports. Skip the first fire — `config` already sent it.

```ts
// analytics.ts
declare global { interface Window { gtag?: (...a: unknown[]) => void } }
export function trackPage(hash: string): void {
  if (typeof window.gtag !== 'function') return;
  const path = '/app/' + (hash.replace(/^#/, '') || '/');
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: location.origin + location.pathname + hash,
    page_title: document.title,
  });
}
```

```tsx
// in the root component, alongside the hash-routing hook:
const firstView = useRef(true);
useEffect(() => {
  if (firstView.current) { firstView.current = false; return; }
  trackPage(hash);
}, [hash]);
```

## robots.txt

Root of the site (or subpath). For a mostly-app site, allow the entry and point
to the sitemap:

```
User-agent: *
Allow: /
Sitemap: https://example.com/app/sitemap.xml
```

If asset folders shouldn't be crawled, disallow them explicitly (optional):

```
Disallow: /app/assets/
```

## sitemap.xml

For a login-gated SPA, list only the public entry point(s):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/app/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

## manifest.webmanifest (PWA)

```json
{
  "name": "PRODUCT NAME",
  "short_name": "SHORTNAME",
  "start_url": "/app/",
  "scope": "/app/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#134e4a",
  "theme_color": "#134e4a",
  "lang": "he",
  "dir": "rtl",
  "icons": [
    { "src": "/app/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/app/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/app/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`start_url`/`scope` must match the subpath the app is served from.

## Footer — credit + feedback

Every page/app carries the "חולמים תקשוב" credit linking to `https://chepti.com`
plus a feedback button. **Exception:** separate properties such as
`openstuff.co.il` ("חומר פתוח") carry no such credit — check first.

Ask the user where feedback should go before wiring the href. The markup below
is a starting point — restyle it to the page's own type scale and palette so it
reads as part of the design, not bolted on.

```html
<footer class="site-footer">
  <a class="site-footer__credit" href="https://chepti.com" target="_blank" rel="noopener">
    נבנה ב<span class="site-footer__brand">חולמים תקשוב</span>
  </a>
  <a class="site-footer__feedback" href="FEEDBACK_DESTINATION">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
    משוב
  </a>
</footer>
```

```css
.site-footer {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 14px;
  padding: 22px 16px; margin-top: 40px;
  border-top: 1px solid var(--border, #e8eaee);
  font-size: 13px; color: var(--muted, #8b93a1);
}
.site-footer a { color: inherit; text-decoration: none; }
.site-footer__credit:hover { color: var(--text, #333); }
.site-footer__brand { font-weight: 600; }
.site-footer__feedback {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 16px; border-radius: 50px;
  border: 1px solid var(--border, #e8eaee);
}
.site-footer__feedback:hover {
  border-color: var(--accent, #ff8a5b); color: var(--accent, #ff8a5b);
}
```

`FEEDBACK_DESTINATION` is one of:
`mailto:you@example.com?subject=משוב על NAME` · a form URL ·
`https://wa.me/9725XXXXXXXX?text=...` · an issue tracker.

## llms.txt

Plain Markdown at the site root (`/llms.txt`). Short — it's a map, not docs.

```markdown
# PRODUCT NAME

> One sentence: what this is and who it's for.

Hebrew-language web app served at https://example.com/app/.

## API
- Contract (no auth): https://example.com/app/?action=help
- State snapshot: https://example.com/app/?action=state
- Batched writes: https://example.com/app/?action=ops
- Auth: `X-Key` header, or `?key=` — ask the site owner for a key.

## Notes
- All responses are JSON. Errors: `{"ok":false,"error":"<code>","message":"..."}`
- Items can be addressed by `id` or by `match` (full or partial title).
```

## AGENT.md

Committed at the repo root; a user pastes the block into any agent.

````markdown
# Driving PRODUCT NAME with an agent

## System prompt (paste this)

```
You can read and modify PRODUCT NAME through its HTTP API at
https://example.com/app/.

Discover the full contract first:
  GET https://example.com/app/?action=help        (no auth needed)

Authenticate every other call with the header `X-Key: <key>`.

Useful calls:
  GET  ?action=state                 compact snapshot of everything
  POST ?action=ops                   {"ops":[...]} — batch writes, one result each

Address items by `id`, or by `match` with a full or partial title. If `match`
is ambiguous the response lists candidates — pick one and retry, don't guess.

Always read ?action=help before your first write, and prefer one batched
?action=ops over many single calls.
```

## Getting a key
<how the user obtains one>
````

## Idempotent GA injector (PHP) — for several static apps on one host

Adapt `$GA`, `$base`, and `$apps`. Safe to re-run; backs up once.

```php
<?php
$GA   = 'G-XXXXXXXXXX';
$base = getenv('HOME') . '/public_html';
$apps = ['app1', 'app2', 'app3'];
$snippet = "\n<!-- Google tag (gtag.js) -->\n"
  . "<script async src=\"https://www.googletagmanager.com/gtag/js?id={$GA}\"></script>\n"
  . "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
  . "gtag('js',new Date());gtag('config','{$GA}');</script>\n";
foreach ($apps as $app) {
    $f = "$base/$app/index.html";
    if (!is_file($f)) { echo "SKIP $app\n"; continue; }
    $html = file_get_contents($f);
    if (strpos($html, $GA) !== false) { echo "SKIP $app (has GA)\n"; continue; }
    if (!is_file("$f.bak")) copy($f, "$f.bak");
    $new = preg_replace('/(<head[^>]*>)/i', "$1$snippet", $html, 1, $n);
    if ($n === 0) $new = $snippet . $html;
    file_put_contents($f, $new);
    echo "DONE $app\n";
}
```
