# Generating icons and the share image

These are the visual assets launch-polish needs. Generate them once, keep them
stable (caches and users remember them).

## The share image (og:image) — 1200×630

This is the most visible asset — it's the card people see when the link is
shared. A clean branded card beats a raw screenshot.

- Size: exactly **1200×630 px** (the standard OG ratio). Smaller images get
  cropped or shown tiny.
- Content: product name large, a one-line tagline, and a simple on-brand
  background or a single clear illustration. Legible as a thumbnail.
- Format: PNG or JPG. Keep under ~300 KB (compress; it's fetched by scrapers).
- Save at the app root as `og-image.png` and reference it with an **absolute**
  URL in the meta tag.

If the project already has a hero/background illustration, crop/letterbox it to
1200×630 and overlay the title. If not, a solid brand-gradient background with
centered title text works well and is quick to produce.

## Favicons

### Check before you generate

Don't produce a new mark before looking for one. In order:

1. **Is there a favicon at all?** No `<link rel="icon">` and no `/favicon.ico`
   means the browser shows its blank-page glyph.
2. **Is it a placeholder?** Treat these as missing:
   - a data-URI emoji (`href="data:image/svg+xml,<svg>…🎓…"`)
   - the framework default (`vite.svg`, `logo192.png`, `favicon.ico` shipped by
     CRA, the Next.js default)
   - a 1×1 or obviously wrong-sized file
3. **Is there a brand asset already in the repo?** Search for `logo.*`,
   `favicon*.*`, `icon*.*`, `brand/`, `assets/img/`. Prefer the **largest square
   source** available; upscaling a 32px icon looks worse than generating fresh.
4. **Only if nothing usable exists,** ask the user before generating. Offer:
   their existing mark (they may have one outside the repo), a monogram of the
   product's initial in the brand colour, or a simple symbol matching the
   product. Don't pick for them — the favicon is the most-repeated brand
   surface the project has.

Quick probe of a live site:

```
curl -sI https://example.com/app/favicon.ico | head -3
curl -s  https://example.com/app/ | grep -io '<link[^>]*rel="[^"]*icon[^"]*"[^>]*>'
```

### The set to ship

Generate from one square source image (512×512 or an SVG):

- `favicon.ico` — multi-size ICO (16/32/48) for the browser tab.
- `icon.svg` — crisp vector for modern browsers (optional but nice).
- `apple-touch-icon.png` — 180×180, used when added to iOS home screen.
- `icon-192.png`, `icon-512.png` — for the PWA manifest.
- `icon-512-maskable.png` — 512×512 with the logo inside the safe zone
  (~80% centered) so Android can mask it to any shape.

### Producing them

If `sharp` (Node) is available, it's the simplest cross-platform path:

```js
const sharp = require('sharp');
const src = 'icon-source.png'; // 512x512+
await sharp(src).resize(180).png().toFile('apple-touch-icon.png');
await sharp(src).resize(192).png().toFile('icon-192.png');
await sharp(src).resize(512).png().toFile('icon-512.png');
// .ico: resize to 32 and 16, or use a dedicated ico encoder / online tool
```

ImageMagick works too: `magick icon-source.png -resize 180x180 apple-touch-icon.png`.
For `.ico`, `magick icon-source.png -define icon:auto-resize=16,32,48 favicon.ico`.

Keep image assets out of the JS bundle — put them in the public/static folder so
they're served directly and cached.

## Compressing

Share images and backgrounds should be WebP or well-compressed PNG/JPG.
`sharp(src).resize(WIDTH).webp({ quality: 78 })` typically lands a full-width
background under ~450 KB while staying crisp. Test the visible result — quality
72–82 is the usual sweet spot.
