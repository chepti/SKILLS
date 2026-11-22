---
name: promo-video
description: Produce a polished promo / explainer video with motion graphics, kinetic typography, and live animated UI demos of an app, rendered to MP4 with Remotion (React), in landscape 16:9 and vertical 9:16, with free music synced to the beat. Hebrew/RTL-first. Use this whenever the user asks for a סרטון תדמית, סרטון הסבר, promo video, explainer, trailer, motion graphics, "סרטון לאפליקציה", a video showing how an app works, a reel/סטטוס/טיקטוק version of a video, or wants to turn a product, course, or app into a video, even if they don't say "Remotion" or "motion graphics".
---

# Promo video (Remotion)

Ship a finished MP4 that looks hand-edited: a visual motif invented for *this*
project that runs through the whole video, live UI that actually does things, cuts on
the beat, and varied transitions. The template is a working engine (scene sequencing,
reveals, kinetic type, phone, animation primitives, landscape+vertical) with placeholder
recipe scenes. The look itself is designed fresh every time.

## The quality bar (the user's own words — this is the standard every video is judged by)

> הי, אני רוצה סרטון תדמית מהמם עם יכולות גרפיות מתקדמות GRAPHIC MOTION והדגמה בלייב
> שיסביר ... שיראו את ה-UI ואנימציות של איך זה נראה.
> תשקיע בעריכה מקצועית, שייראה כאילו אפטריסט ממש נהנה מהפרוייקט והכניס מלא דברים
> יצירתיים בגרפיקה, בחיתוכים מעניינים. שתהיה שפה עיצובית מיוחדת, אפשר לשאוב מ...

What this means in practice:
- **"מהמם / אפטריסט שנהנה"**: no slideshow. Every few seconds something should
  surprise: an element breaks out of the phone, the motif sweeps the screen clean,
  a brand shape becomes a timeline, the confetti is made of the brand's own shapes. If a scene is just
  "text fades in next to a screenshot", it's not done.
- **"הדגמה בלייב / שיראו את ה-UI"**: the real app screens, animated, *being used*:
  typing, tapping, notifications landing, counters climbing. Not static mockups.
- **"חיתוכים מעניינים"**: cut on the beat and vary the transitions (circle reveal from
  a tap, frame iris, band wipe, continuity, punch-in). Never use a plain crossfade.
- **"שפה עיצובית מיוחדת, לשאוב מ..."**: whatever the user points to (a logo, a
  printed product, a brand, a place), pull one gesture from it and make it the video's
  motif. It's different for every project, and nothing from a previous video carries over by default.
  If they say the source is weak ("אין בו שאר רוח"), make the magic with it anyway.
  Don't swap it for something generic.

When the user's request is shorter than this, still hold to this bar. When they fill
the "..." (who it's for, what it explains, what to draw from), that defines the
audience, the message, and the motif source.

Read `references/craft.md` before designing scenes. It holds the creative playbook
(story shape, transitions, how to break the device frame, photo handling, vertical rules).

## Workflow

### 1. Brief (fast)
Have an Explore agent summarize the app: its purpose, audience, features (with page
files), design tokens (colors, fonts, radius, icon set), logo path, and daily user flow.
Look at the motif source yourself (logo, printed product, screenshots, whatever the user
named) and design the motif per eferences/craft.md §1.

### 2. Propose and stop
In one message, give the user:
- the visual concept (motif, palette, textures)
- a script table: time · what's on screen · on-screen text. Aim for ~90s, and say whether there's narration (default: text + music)
- image prompts: one shared style suffix plus one line per shot with a target filename;
  ask for real photos of any physical product instead of AI ones
- 3-5 short decisions (music, URL/QR or none, formats, text approval)

Then wait for their go-ahead and images. The user generates the images elsewhere.
If they want speed, start on everything that doesn't depend on the images.

### 3. Set up the project
```powershell
# copy the template into <repo>/video (skip if it exists)
robocopy "$env:USERPROFILE\.claude\skills\promo-video\template" video /E
cd video; npm install --no-fund --no-audit
```
- `tsconfig.json` must exist or `remotion render` fails (it's in the template).
- The first render downloads Chrome Headless Shell (~110MB, one time). Remotion
  ships ffmpeg (`npx remotion ffmpeg` / `npx remotion ffprobe`), so nothing else needs installing.
- Copy the app's logo into `video/public/`.

### 4. Assets
- **Images:** if the user drops a grid image, split it with
  `python <skill>/scripts/crop_grid.py <grid.jpg> video/public/images name1 name2 …`
  (use `--prefix v2-` for a second version). View the tiles and pick per shot. Copy
  non-ASCII filenames to ASCII names.
- **Music:** `python <skill>/scripts/find_music.py [categories]` lists Mixkit tracks
  (free license, no attribution) with mp3 URLs and durations. Ask the user before
  downloading, stating the filename, source, and size. Pick 2-3 candidates near the target length.
  Decode with `npx remotion ffmpeg` and run `scripts/analyze_music.py`. Choose the track whose
  energy rises land near your act breaks.

### 5. Build
The template structure (keep it, replace the content):
| File | Role | Action |
|---|---|---|
| `src/timeline.ts` | BPM, `beat(n)`, scene start frames `S` | set from the music analysis; put every cut on a beat |
| `src/theme.ts` | fonts + color tokens | replace with the app's tokens |
| `src/anim.ts` | easing, springs, `rnd`, `useLayout().pick()` | keep |
| `src/components/graphics.tsx` | primitives: `Ribbon` (band along any path), `DrawLine`, `DrawFrame`, `Pop`, `Spark`, `Blob`, `BandWipe`, `Grain`, `Vignette`, `pathPoint` | keep; add the project's own motif components (redrawn logo elements, glyphs, textures) |
| `src/components/type.tsx` | `Kinetic` headlines (`*accent*`), `typed()`, `Caret`, `Tag` | keep |
| `src/components/media.tsx` | `Photo` (Ken Burns), `Phone` (390×844 screen), `Page` | keep |
| `src/components/ui.tsx` | `Card`, `StatusBar`, `TabBar`, `Notification`, `ExampleScreen` | keep the kit; build the app's real screens from its source |
| `src/scenes/Examples.tsx` | 3 placeholder recipes (open / live demo with breakout / end card) + `usePhone()` | read for patterns, then replace with the script's scenes |
| `src/Promo.tsx` | `SCENES` list, reveals, `WIPES`, `MUSIC`, grain | edit the arrays; set `MUSIC` |
| `src/Root.tsx` | `Promo` 1920×1080 + `PromoVertical` 1080×1920 | keep |

Write every scene orientation-aware from the start (`const { pick, W, H } = useLayout()`),
so the vertical version only needs a review pass. Use Lucide icons and no emoji
(the user's design rule). The end card carries a small "הפקה: חולמים תקשוב · chepti.com" credit.

### 6. Review with stills (cheap), then render (slow)
```powershell
node scripts/stills.mjs 90 300 450 …                     # one mid-scene frame per scene
$env:COMP='PromoVertical'; node scripts/stills.mjs …    # vertical
python <skill>/scripts/sheet.py out/stills Promo-       # contact sheets → Read them
```
Fix what you see (overflow, text collisions, cropped elements, literal `*` marks).
Then render, in the background, ~8 min each at concurrency 6:
```powershell
npx remotion render Promo out/promo.mp4 --concurrency=6 --log=error
npx remotion render PromoVertical out/promo-vertical.mp4 --concurrency=6 --log=error
```
Check with `npx remotion ffprobe` (video + audio streams, duration), grab one frame
with `npx remotion ffmpeg -ss <t> … -frames:v 1` to confirm, then send the MP4 with
SendUserFile. Commit `video/` (node_modules and out are gitignored), only that path.

### 7. Report honestly
Tell the user what you looked at (stills, which frames) versus what you didn't watch
end to end, list any placeholder content you invented (names, quotes, dates), and
offer the other format if only one was made.

## Gotchas
- `Html5Audio` (not `Audio`) for music. Fade the volume in over ~8 frames and out over the last ~3.5s.
- Keep `Freeze` frame-0 copies for reveals that start before a scene: `SceneBlock` in
  `Promo.tsx` already handles this.
- Kinetic lines don't wrap (`nowrap`). Break with `\n` and check width in vertical.
- Long renders can exceed a tool timeout. Run them in the background and wait for the notification.
- On Windows, never write zips with Compress-Archive (user rule). This workflow doesn't need zips.
