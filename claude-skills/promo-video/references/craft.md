# Motion-design craft notes

Read this before designing scenes. The goal is a video that looks like it was edited by
someone who loved *this* project, with a visual language invented for it, not a
reusable house style.

## 1. Invent the motif from the project itself
Every video gets its own visual idea, derived from what the user points to (logo,
printed product, app UI, brand book, place, subject matter). The template's primitives
are raw material for it. They are not a default look.

How to find it:
1. Look hard at the source. List its gestures: a curve or stroke, a corner, a frame or
   box, dots, a stamp, a fold, a grid, a texture, an illustration style, a color pair,
   a typographic quirk, a physical object (a pen, a page, a key, a leaf).
2. Pick the **one** gesture that can *move*: draw itself, carry something, cut the
   screen, become a line under a title, turn into a timeline or a border.
3. Redraw it in code as a layered SVG with an outline. Don't paste the raster logo.
4. Add a **second texture** from the project's real artifacts (paper, pattern,
   illustration style, photo treatment). Real material makes it specific.
5. Thread the motif through the whole video: cold open, the gesture that clears the
   chaos, title underline, transitions, the "win" punctuation, the end card.

When the user says the source is weak or uninspiring, still use it. The craft is in
making that material sing, not in replacing it with something generic.

Primitives available (`components/graphics.tsx`): `Ribbon` (a band along any path,
with crescent/even/taper profiles), `DrawLine`, `DrawFrame` (with optional gap),
`Pop` (spring-in any glyph), `Blob`, `BandWipe`, `Grain`, `Vignette`, and `pathPoint`
(ride any object along a path). Combine and restyle them. Write new ones when the motif needs it.

## 2. Story shape (~60-90s)
1. **Cold open (3-5s):** the motif alone, plus a 3-word line.
2. **Pain or context (6-8s):** the world before. It builds, speeds up, and is then cleared by the motif.
3. **What they already have / where it lives (5-7s):** real artifacts or real places.
4. **Reveal (5-6s):** the motif gives birth to the product. The device rises and the name appears.
5. **Live demo beats (4-6 × 6-9s):** one feature per beat, one headline each, and
   something must *happen* in every beat.
6. **Bridge (5-6s):** connect the new to the old or to daily life. Literal connecting lines work well.
7. **People (5-6s):** faces and place.
8. **End card (5-6s):** name, partner logo, one call to action, and a small credit.

## 3. Live UI demos
- Rebuild the app's screens as React components from its source (tokens, radius,
  shadows, icons, tab bar, real copy). They animate cleanly and stay sharp, unlike screen recordings.
- Show the UI **in use**: typewriter text (`typed()` + `Caret`), taps (press-scale),
  sheets sliding, notifications landing, counters and progress rings filling.
- **Break the device frame**: an element flies out of the phone, grows big in the
  world, then returns. This is the signature motion-graphics move.
- Keep the phone at the **same spot across consecutive scenes** (`usePhone()`), so
  cuts feel continuous while only the screen changes.

## 4. Transitions: vary them, cut on the beat, no plain crossfades
| Type | Good for | How |
|---|---|---|
| Continuity | the device or frame persists across the cut | same position in both scenes |
| Circle reveal from a tapped element | entering a feature's "colored world" | `reveal: {kind:'circle'}` |
| Frame iris with a colored edge | a mood change (light → dark stage) | `reveal: {kind:'frame'}` |
| Band wipe edged in motif colors | big energy rises in the music | `WIPES` in Promo.tsx |
| Motif gesture that sweeps elements away | ending a chaos/pain section | inside the scene |
| Punch-in (scale 1.08→1) | a hard cut on a strong beat | inside the scene |

## 5. Typography
- A heavy display face for headlines, the app's own font for UI, and an optional hand font for analog moments.
- `Kinetic`: words rise through a mask on a spring. `*word*` = accent color, and it
  works around punctuation or prefixes (`מ*שם*.`). One idea per screen, ≤ 7 words per line.
- Size ≥ 64px in landscape and ≥ 68px in vertical. Lines don't wrap, so break them with `\n`.
- RTL: `direction: rtl` on text, and motion that leads travels right→left.

## 6. Polish layer (always on)
Animated grain, a soft vignette, Ken-Burns drift on every photo, springs rather than
linear easing, and a brand-derived glyph that punctuates every "win" moment (the
confetti, sparks, or stamps should be made of the brand's own shapes).

## 7. Photos
- AI tools often return a **grid** with filename captions. Split it with `scripts/crop_grid.py`.
  The tiles are small (~650px), so use them framed, in circles, blurred as backgrounds,
  or under strong Ken Burns, and avoid sharp full-bleed heroes.
- With two versions of a grid, pick per shot. Prefer character continuity (the same
  person recurring) and props that carry the brand's colors.
- Don't AI-generate the real product. Hebrew text comes out garbled, so ask for phone photos.
- Prompts: one shared style suffix + one line per shot; "no text, no logos"; a blank
  phone screen when UI will be composited onto it.

## 8. Vertical (9:16)
Don't crop the landscape cut. Re-lay out each scene with `useLayout().pick(landscape, vertical)`:
- text stacked on top, the device in the lower half
- side-by-side compositions become top/bottom, horizontal timelines become vertical
  (cards alternate left and right)
- `Blob` coordinates scale on their own, while wide groups (fans, card rows) need scaling down
- check stills for anything cut off at the edges
