---
name: launch-polish
description: >-
  Pre-publish gate for a website or web app — everything that must be right
  before a link is shared: social link preview (Open Graph/Twitter cards), a
  real favicon, meta description, theme color, robots.txt, sitemap.xml, a PWA
  manifest, analytics (decide if it's even needed, then connect to an existing
  or new GA4 property), the standard site footer (credit + feedback), secrets
  hygiene, and agent-readiness (self-describing endpoints, llms.txt, AGENT.md).
  Use whenever a project is "good enough to share", before a launch or a demo,
  or when the user mentions publishing, link preview, how the link looks on
  WhatsApp/Facebook, SEO, analytics/tracking, favicon, "add to home screen",
  PWA, API/endpoints for agents, or making a project discoverable. Also use to
  roll the same polish out across several static apps on one hosting account.
  Works for static SPAs (React/Vite/hash-router), plain HTML, PHP apps, and
  folders served under a subpath (e.g. example.com/rashi/). Prefer this skill
  over ad-hoc snippet pasting whenever launch readiness comes up.
---

# Launch Polish

Turn a working project into one that **looks trustworthy when its link is
shared**, **can be found**, **can be measured**, and **can be driven by an
agent** — with the least ceremony.

For a niche audience (a profession, a community), the **link preview matters
more than Google ranking** — people arrive from WhatsApp, Facebook groups, and
word of mouth. Treat Open Graph as top priority, not an afterthought.

## How to work

1. **Detect the setup first.** Static SPA with a build step (source
   `index.html` + `dist/`), plain HTML, PHP app, or a folder under a subpath?
   This decides where edits go. **Read the existing `index.html` before
   editing.** For SPA projects edit the *source* `index.html`, not the built
   file — the build overwrites `dist/`.
2. **Establish the public base URL** (e.g. `https://example.com/rashi/`).
   Open Graph and manifest URLs must be **absolute** — relative URLs break the
   preview when Facebook/WhatsApp servers unfurl the link.
3. **Run the audit before changing anything** —
   `node scripts/check-launch.mjs <url>` (see Audit below). It tells you what's
   already there so you don't redo it and don't miss anything.
4. **Work through the checklist**, skipping what passed. Each item is
   independent.
5. **Ask, don't invent.** Measurement IDs, domains, and the feedback
   destination are real-world values — a placeholder shipped to production
   silently breaks things. Batch the questions into one round (see Questions).
6. **Verify and report** — re-run the audit, then give the user the report
   table (see Report).

Read `references/snippets.md` for copy-ready markup, `references/assets.md`
for generating icons and the share image, and `references/agentic.md` for the
agent-readiness contract.

## Questions to batch up front

Ask these together, once, near the start — not one at a time mid-work. Skip any
you can answer from the repo:

- **Analytics:** is measurement wanted here at all? If yes — existing GA4
  property or a new one? (Never invent a `G-` ID.)
- **Favicon:** is there a brand mark to use, or should one be generated?
- **Feedback destination:** where should the footer's feedback button go
  (email / form / WhatsApp / issue tracker)?
- **Public base URL**, if not obvious from the repo or deploy config.

## Checklist (highest impact first)

### 1. Social link preview — Open Graph + Twitter
What renders the title, description, and image when the link is pasted into
WhatsApp, Facebook, Telegram, iMessage, Slack. Without it: a bare URL or a
random scraped fragment. Add `og:title`, `og:description`, `og:image`
(**absolute** URL, 1200×630), `og:url`, `og:type`, `og:site_name`, `og:locale`,
and the `twitter:*` equivalents.

The `og:image` is the single most visible asset — a clear branded card beats a
screenshot. See `references/assets.md`.

### 2. Meta description + title
One `<title>` and one `<meta name="description">` (~150 chars, plain language,
what it is and who it's for). Both the SEO snippet and a preview fallback.

### 3. Favicon — verify it exists, and that it's a real one
**Check first, then decide.** In order:
- Is there a favicon at all? A missing one shows the browser's blank page icon.
- Is it a **placeholder**? A data-URI emoji, the Vite/CRA default logo, or a
  framework stock icon all read as unfinished. Treat these as missing.
- Is there already a **brand asset** in the repo (`logo.*`, `favicon*.png`,
  `icon*.png`, a brand folder)? Prefer it over generating something new —
  and prefer the largest square source available.
- Only if nothing usable exists, ask the user for a preference before
  generating: their existing mark, an initial/monogram, or a simple symbol.

Ship the full set (`favicon.ico`, 180×180 `apple-touch-icon.png`, `icon.svg`
if available, plus the PWA sizes). Generation recipes in `references/assets.md`.

Once shared, **keep the favicon and og:image stable** — caches and users
remember them.

### 4. Analytics — decide whether it's needed, then connect
Don't add tracking reflexively. Adding GA loads a third-party script that sends
visitor data to Google; that's the user's call.

**Ask whether it's needed.** Reasonable to skip for: an internal tool, a
one-off/disposable page, a personal utility, or when the audience is sensitive
(children, health) and nobody will read the reports anyway.

**If yes, ask which property:** connect to an **existing** GA4 property (reuse
one `G-` ID across related apps so they roll up together) or create a **new**
one (cleaner separation per product). Get the real Measurement ID from the
user. If they want a new property, point them at GA4 Admin → Create property →
Web stream, and wait for the ID rather than shipping a placeholder.

Then add the `gtag.js` snippet. For a **hash-router SPA** the initial `config`
fires only one page_view — add virtual page_views on route change so you can
see which screens get used. See `references/snippets.md`.

Multi-property note: static folders under a WordPress domain (e.g.
`example.com/app/`) are **invisible to WordPress analytics plugins** like Site
Kit, which only tag WordPress-rendered pages. Each static app needs its own tag.

Privacy: GA4 anonymizes IP by default; keep PII (names, nicknames) out of
events — send screen paths only. Offer a privacy-friendlier counter if the user
cares.

### 5. theme-color + mobile viewport
`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
and `<meta name="theme-color" content="#...">` so mobile browser chrome matches
the brand.

### 6. robots.txt + sitemap.xml
Two small files at the site root (or subpath) so search engines index the
public entry and skip asset folders. For a login-gated SPA, only the public
landing is worth indexing.

### 7. PWA — installable on phones/tablets
For classroom/tablet use this is a big win: `manifest.webmanifest` +
`apple-touch-icon` + `theme-color` make it "Add to Home Screen" and open
full-screen. A service worker for offline is optional and heavier — only add if
the user asks for offline.

### 8. Footer — credit + feedback
Every page/app gets a footer with the **"חולמים תקשוב"** credit linking to
`https://chepti.com`, plus a **feedback button**. It must be designed into the
page, not look pasted on — match the page's type scale, spacing, and palette.

If the project has no defined feedback destination, **ask where it should go**
before building it.

**Exception:** `openstuff.co.il` ("חומר פתוח") is a separate property and
carries **no** "חולמים תקשוב" credit. Check whether the project you're
publishing is one of these separate assets before adding the credit.

Markup in `references/snippets.md`.

### 9. Secrets hygiene — before the first push
The failure mode is permanent: a token in git history stays there.
- Config files with passwords/tokens/API keys are in `.gitignore`.
- A `config.sample.php` (or `.env.example`) is committed as the template.
- `.htaccess` (or server config) blocks direct HTTP access to the config file
  and to any flat-file data store.
- No secret is hardcoded in client-side JS — anything in the bundle is public.

### 10. Agent-readiness (AGENTS)
An app with no API layer can't be driven by an agent. Work through the
seven-point contract in `references/agentic.md`: self-describing `?action=help`
without auth, read **and** write over HTTP, auth via header or query param
(not cookie sessions), a compact `?action=state`, a batched `?action=ops`,
addressing by human-readable `match` as well as `id`, and discovery files
(`llms.txt` at the root + `AGENT.md` with a paste-ready system prompt).

**If the app holds no data at all** (a brochure page, a client-side one-off),
say so in one sentence and don't invent an API layer.

Report what exists and what's missing in the table below. Offer to add what's
missing — don't add it unasked if it meaningfully expands the work.

## Rolling out across several apps on one host

Don't hand-edit each. Write one **idempotent** injector (PHP/Node/bash) that:
takes the app folders and shared values (GA id, base domain), skips a file if
the marker is already present, backs up each `index.html` once (`.bak`) before
first edit, and inserts after `<head>` (case-insensitive).
`references/snippets.md` has a ready PHP injector.

Per-app values that differ (title, og:image, canonical) still need per-app
attention — the injector is for shared boilerplate only.

## Audit

```
node scripts/check-launch.mjs https://example.com/app/
```

Fetches the live page and reports PASS/WARN/FAIL per item: meta and OG tags,
whether `og:image` is absolute and actually loads, favicon and apple-touch-icon
reachability, manifest validity and icon reachability, GA tag presence,
`robots.txt` and its sitemap, the footer credit, `llms.txt`, and agent
endpoints. Flags:

- `--ga G-XXXXXXXXXX` — assert this exact Measurement ID is present
- `--agent` — also probe `?action=help`, `?action=state`, `/api/help`
- `--no-credit` — skip the footer-credit check (separate properties)
- `--json` — machine-readable output

Run it **before** changes (to see what exists) and **after** (to confirm).
It only reads over HTTP — safe to run against production.

## Verify before calling it done

- **Link preview:** the served HTML (not just the source) has an absolute
  `og:image` that returns 200. The #1 failure mode is a relative `og:image` —
  fine locally, blank when shared. Facebook's sharing debugger re-scrapes on
  demand.
- **Analytics:** load the page, confirm a request to
  `google-analytics.com/g/collect` fires and `window.gtag` is a function; then
  confirm yourself in GA4 Realtime.
- **Favicon/manifest:** tab icon renders; `manifest.webmanifest` returns 200
  with icon paths that also return 200.
- **Built output:** for SPAs, verify the tags survived the build and are in the
  deployed file — not only in the source.

## Report

Close with two short tables — what was changed, and agent-readiness:

| Item | Status | Note |
|---|---|---|
| Link preview (OG) | ✅ / ⚠️ / ❌ | |
| Title + description | | |
| Favicon set | | |
| Analytics | | e.g. "skipped — internal tool" |
| theme-color + viewport | | |
| robots + sitemap | | |
| PWA manifest | | |
| Footer (credit + feedback) | | |
| Secrets hygiene | | |

| Agent contract | Status |
|---|---|
| `?action=help` (no auth) | |
| Read + write over HTTP | |
| Auth via header/param | |
| `?action=state` | |
| `?action=ops` (batch) | |
| Addressing by `match` | |
| `llms.txt` + `AGENT.md` | |

## Guardrails

- **Never invent** a GA Measurement ID, a domain, or a feedback address. Ask.
- Adding analytics is the user's call — surface the tradeoff, don't add
  silently, especially for sensitive audiences.
- Keep `og:image` and favicon stable once the link has been shared.
- Don't add an API layer to an app that holds no data.
- Don't commit a secret to "fix it later" — history is forever.
