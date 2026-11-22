# SKILL: הדמיות ומעבדות מדע לכיתה ז (sim-skill) · v1 · 6.11.2026

This is the recipe for every interactive science simulation / lab built for חפציה (חפ), grade-7 science teacher and the owner of the series "סדר גודל" and the labs hub ("המעבדות", slug madalabs).
Follow it from the first line of code. Everything here comes from a correction she or her instructor actually made on an earlier sim (gas-sim, states-sim, energy-sim, volume-lab, density-lab, Semmelweis / Lind / Mendel labs, the michre game, seder-godel).

Read before building: this file (fair questions are in §9), the lesson's row in the year plan (plan-7.js, week topic and concepts), and the series episode for that week if one exists (same characters, same props, same words).

Next sims on the plan: heat transfer (week 21), pendulum/energy (weeks 19-20, energy-sim exists), microscope and cells (week 26).

-------------------------------------------------------------------------------
## 0. Definition of done (short)

1. Correct science, her terminology (§2), zero physical-logic errors (§3).
2. Looks like her series site seder-godel: calm, clean, lively; real background image; no purple, no rainbow, no glow (§4).
3. Two modes: חקירה חופשית + אתגר; data table with auto-check and targeted hints (§5).
4. Student track in TWO LEVELS, בסיס and מתקדם, progress saved, end summary (§6).
5. madalabs-ready: class-code chip, reports per mission, works fully without sign-in (§7).
6. Feedback mailto with site + page (§8). Fair multiple-choice questions (§9).
7. Verified in a real browser: 1366 desktop + 390 phone + projector, 0 console errors, screenshots looked at, physics spot checks with numbers (§10).
8. Published to its own slug, NOT linked from seder-godel or the madalabs hub until she approves (§11).

-------------------------------------------------------------------------------
## 1. Purpose and audience

- Students: grade 7 (age 12-13) in Israel, mixed ability, many on phones, often on the class projector. Tone: middle-school, not babyish ("זה כיתה ז, לא ג"). No cartoon-for-little-kids language, no "כל הכבוד גיבורים!!!".
- Teacher use: projector in class (big readouts, ?proj=1 or P key), and as homework through madalabs with a class code.
- One sim = one lesson topic from the plan. At most ONE sim per lesson on seder-godel, and only where the plan topic matches (states-sim only in the מצבי צבירה lesson, gas-sim only in "לחץ של גז").
- Enrichment that is not in the compulsory curriculum carries the label "העשרה · לא בתוכנית החובה" (density is enrichment).
- Language: Hebrew, RTL, gender-inclusive plural to students ("לחצו", "שימו לב"), feminine when addressing her.

-------------------------------------------------------------------------------
## 2. Science accuracy and terminology checklist

Check every on-screen string, hint, question and summary against this list. When unsure, write the doubt in your report; never guess a definition.

Terminology (her and her instructor's corrections):
- התכה (melting), התעבות, התאדות, רתיחה, קיפאון, המראה. Never "נמס" for a solid melting. המסה = dissolving (ערבוב חומר בנוזל לתמיסה), not heating. Melting = the same substance changing state.
- No "מניסקוס". Say: "קוראים בגובה העיניים, בנקודה הנמוכה של פני המים".
- גוף vs חפץ: גוף = a portion of matter (a cube of aluminium, the water in a cup). חפץ = a made object (כוס, כתר, מפתח). "כוס היא חפץ, לא גוף".
- צפיפות = מסה חלקי נפח, always said in words with the reason ("כמה גרם חומר יש בכל סמ"ק"). Units גרם לסמ"ק; 1 מ"ל = 1 סמ"ק. Density is a property of the MATERIAL, not of the body.
- Ice is the exception: water expands when it freezes, so ice is less dense than water and floats. Say it briefly whenever ice appears.
- Heat: "קור" does not travel. Heat passes from the hotter body to the colder one (conduction through a metal spoon, etc.). Never "the cold came in from outside".
- Insulation: wool / a coat / a blanket insulates because it traps air, a poor conductor; it does not "make heat" and does not "keep cold out".
- Gas track for grade 7: °C only, no Kelvin, no kPa ("יחידות לחץ" as a plain number). Kelvin/kPa only in the advanced track.
- Names and facts: Hebrew transliteration of names (סולסברי, not Salisbury); real book titles in their real Hebrew form (Velikovsky: "עולמות מתנגשים"); places true to history (Velikovsky's pin in Israel). Dates and quotes from a source you actually read; mark anything unchecked.
- Credit what inspired you (e.g. "בהשראת PhET", with the licence text when you use their material; PhET HTML sims are CC BY-NC 4.0).

Numbers:
- Use real material constants (water 1.00, ice 0.92, aluminium 2.70, iron 7.87-7.9, copper 8.96, gold 19.3 g/cm3; water melts 0 °C / boils 100 °C at 1 atm; latent heats 334 / 2257 J/g; g = 9.8).
- Rounding: state it ("עגלו ל-2 ספרות אחרי הנקודה") and accept a tolerance in auto-checks (density: ±3 % of the student's own m/V; volume reading ±max(1 mL, 3 %)).
- Exercises must have ONE defensible answer. Ambiguous wording is a bug: name the body, the quantity and the unit in every question; avoid "it" that could mean two things.

-------------------------------------------------------------------------------
## 3. Physical-logic checklist (what the picture shows must be possible)

She notices every one of these. Check each in screenshots AND while animating.
- Things fall and rest on something: nothing floats in the air, nothing passes through a table, a beaker wall or another body. Objects sit ON the shelf/plate, not hovering 2 px above it.
- Water level rises ONLY when the body actually touches/enters the water, by exactly the submerged volume; it does not rise early, and returns exactly when the body leaves. A floating body displaces its own mass in water (level rise = m / 1.00 mL); pushed fully under, the full volume.
- The pushing rod (or hand) is thin and its own volume is negligible, or accounted for. Say so in the teacher note.
- Floating bodies float with the right fraction submerged (ice 92 %, wood ~50 %).
- The scale reads only what is on it, settles to the exact value, shows units, tares to 0.
- Containers have openings where things pour; caps are off before pouring; pouring comes from the mouth of the bottle.
- People / hands: two hands at most, holding things they could hold; no third hand.
- Props consistent across screens: same beaker, same cylinder, same table; water = clear bottle, alcohol = dark bottle, on fixed sides.
- Heat flows hot → cold; temperature plateaus during a change of state; a closed container does not lose mass.
- Pendulum: max turning height = release height without friction; period independent of mass.
- Gas: particles never stop or fall to the bottom; collisions visible; pressure doubles when N doubles (check numerically).
- Reflect the real experiment: if the class does it with a measuring cylinder, the sim uses a measuring cylinder with readable graduations and a magnifier ("זכוכית מגדלת") for reading at eye level.

-------------------------------------------------------------------------------
## 4. Visual design system (matches seder-godel.sites.tab.bot)

Her verdicts: density-lab v1 "נראה כמו אני יכול להיות כל כך סלופ", "הכל סגול", "ואין תמונת רקע?". energy-sim v3: "זה לא שיפור משמעותי" (tiny, pale, mostly white). She dislikes BOTH extremes: candy/neon AND pale/empty/cramped.

Target: calm, clean, confident, lively. Light background, real imagery, one main accent, soft pastel category fills, dark readable ink.

### 4.1 Palette (exact, from seder-godel styles.css / app.js)
```
--bg      #f4f8fb   page background (under the background image's light wash)
--card    #ffffff   cards
--ink     #26304f   main text, headings, selected chip fill
--ink2    #3d4770   secondary headings, chip text
--soft    #5b6585   muted text, captions
--line    #dfe6ef   borders, dividers;  card border #e3e9f2
--mint    #5fae9c   MAIN ACCENT (primary buttons, progress, focus ring)
--mint-dk #2f7565   accent text / pressed;  deeper #2c6a5b
--ok-bg   #e5f5ef   success fill (with #2c6a5b text, border #bfe3d4)
--warn-bg #fff6e2   amber note / "העשרה" badge (text #8a5a12, border #ead7ae); gold accent #c9a35a
--bad-bg  #fdecea   error fill (text #9a3412) — the only red, used sparingly
--info-bg #eef3ff   info/hint fill (text #34407a)
```
Category tints (pastel fill + its ink), pick per category, max 4 per screen:
```
mint  #e2f4ef / #2f7565     sky   #e3eefb / #2f5b93     aqua  #def3f5 / #1d6470
leaf  #e8f3e3 / #47703a     cream #fff6e2 / #8a5a12
```
seder-godel also has lilac/indigo tints (#ebe7fb/#5a4aa8, #e6e9ff/#3c45a3, #f0e7f7/#74468f): do NOT use them in sims (she is tired of purple). Never #4338ca, #6c63ff, #8b5cf6, #a855f7 or any violet accent.

Materials keep their real colours, muted and believable: copper #b87333-ish, gold #c9a35a/#d4af37 with a soft highlight, aluminium #c9d1d9, iron #5b6470, wood #b98a5a, cork #d6b48a, ice translucent #dff3fb. Paint for mystery bodies: muted, not neon (e.g. #c96a5a, #5a86c9, #5aa37a, #c9a35a, #7a8ca8) — no violet.

### 4.2 Type
- Rubik only (self-hosted woff2 Hebrew subset, preload, font-display:swap), weights 400/500/700.
- Sizes (normal page): body 16-17 px, labels 14.5-15 px minimum, h2 24-32 px, big readouts 28-40 px. Inside a 1920×1080 scaled stage: minimum 24-26 px stage units.
- Student handwriting (notebook entries, logbook) may use a handwriting Hebrew font; everything else Rubik.
- Numbers with units: wrap mixed Hebrew/number strings in LRI/PDI (\u2066…\u2069) so "300 מ"ל" never flips.
- Quotes: straight " only. Never guillemets (U+00AB/U+00BB), never U+2039/U+203A, never smart quotes. Hebrew abbreviations with the regular " (סמ"ק, מ"ל).

### 4.3 Shape, spacing, depth
- Radius: cards 18 px, small controls 12-14 px, chips/pills 999px.
- Card: background #fff, border 1px solid #e3e9f2, shadow 0 2px 10px rgba(40,60,110,.06). ONE shadow level for everything; the hero/stage image may use 0 10px 30px rgba(60,80,140,.16).
- Chip: white, 1px solid --line, text #3d4770, padding 7px 14px, radius 999; selected = background #26304f, white text.
- Buttons: primary = --mint background, white text, min-height 44-48 px, radius 14; secondary = white with --line border and --mint-dk text.
- Spacing: 12-16 px gaps on phone, 18-26 px on desktop; let the background show between cards ("קצת מרווח בין הריבועים, שתהיה תחושה של הרקע"). Never cram; never leave huge empty white areas.
- Icons: Lucide only (inline SVG, stroke 2, currentColor), never emoji anywhere in the UI, not even in buttons, chips, toasts or teacher reports.
- Focus: 3px solid --mint outline, offset 2px. Touch targets ≥ 44 px.

### 4.4 Background imagery
- Every sim has a REAL picture behind the apparatus: a photographic or painterly school-lab scene that matches the topic (bench, window, shelves; for heat: a kitchen/lab bench with a kettle; for cells: a microscope bench). Generated (no text, no people, no logos) or a licensed photo.
- Treatment: slightly blurred (1.5-3 px), desaturated ~0.85, a light wash 15-25 % of #f4f8fb on top so the apparatus and the numbers pop. Export webp 2560 or 1920 wide, 40-80 KB.
- Do NOT reuse the same background image across sims or twice on one page; each sim its own picture (gas-sim and states-sim sharing bg-lab.webp was a shortcut, not the standard).
- Item images (bodies, bottles, tools) are die-cut stickers: transparent background with a shape-cut outline, never inside boxes. Prefer elements from the series videos over drawn icons.
- Characters may animate and speak in small speech bubbles (her request for labs); respect prefers-reduced-motion.

### 4.5 Forbidden (each of these has been rejected)
rainbow / multi-stop gradients; gradient text; neon or glow; glassmorphism (frosted cards with backdrop blur) as the main look; heavy or stacked drop shadows; sparkles icons as decoration; decorative blobs; more than one accent colour competing per screen; purple dominance; oversized emoji-like decorations; confetti storms (a short small burst in the palette at most); pale grey-on-white low-contrast text; tiny stage on a phone with large white panels; the same picture repeated.

-------------------------------------------------------------------------------
## 5. UX patterns

Screens: פתיחה (title, one-line purpose, mode buttons, "מה זה X?" info, משוב) → מעבדה (header + stage + side panel) → summary.

Header: home, title + enrichment badge if any, mode tabs, madalabs chip (§7), info, feedback. On phones the header collapses to icons with aria-labels.

### 5.1 Explore mode (חקירה חופשית)
- Everything draggable and clickable; tool sets (e.g. "אותו נפח", "אותה מסה", "אותו חומר") as chips.
- Live instruments with units and a magnifier where reading precision matters.
- "רשמו מדידה" button that records the CURRENT steady reading; a click while the reading is still settling is remembered and records when steady.
- Short contextual note under the stage telling what to try next (one sentence).

### 5.2 Challenge mode (אתגר)
- Levels, each with one clear goal sentence, mystery bodies (letters א-ה, muted paint).
- Students measure, fill the table, then identify (pick from a reference table; options shuffled).
- Final level = the story challenge (density: Archimedes' crown; each sim needs one memorable finale).

### 5.3 Data table with auto-check and targeted hints
- Columns per quantity with units in the header; one row per body; decimal comma or point accepted.
- Check on blur/Enter, not on every keystroke. Mark the cell ok / tip / bad with icon + colour + text (never colour alone).
- Hints are TARGETED to the likely mistake, not generic: e.g. volume entered = total reading → "זה גובה המים עם הגוף. הנפח הוא ההפרש: הקריאה פחות 300 מ"ל"; floating body measured without pushing → "הוא צף, רק חלק ממנו בתוך המים…"; correct division of wrong measurements → "החישוב נכון, אבל אחת המדידות לא מדויקת".
- A result line after a full correct row connects to the concept ("קטן מ-1, לכן הוא צף").

### 5.4 Stars and feedback
- 3 stars per level: 3 = no mistakes, 2 = 1-2 mistakes, 1 = finished. Stars are Lucide star icons in --warn/gold, saved in localStorage.
- Never punish by blocking; after 3 wrong tries reveal the reasoning, not just the answer.
- Every question: predict first (lock the prediction), then experiment, then "why" with plausible distractors, then a short discovery card.

### 5.5 Projector and accessibility
- ?proj=1 or P: bigger numbers, solid fills, thicker outlines, no transparency.
- Phone portrait: the stage must fill the width and be readable; if the stage is a fixed 16:9, use a vertical layout for 390 px instead of shrinking it (the energy-sim lesson). Rotate hint only as a last resort.
- Windows/panels that can be hidden must really re-flow (the states-sim lesson: hiding a panel must give its space to the others).
- Keyboard: every control reachable; arrows only inside their widget.
- prefers-reduced-motion: no auto-animation, no confetti, transitions off.

-------------------------------------------------------------------------------
## 6. STUDENT TRACK in two levels (מסלול תלמיד: בסיס / מתקדם)

Same simulation, same physics, same checks. The levels differ in scaffolding, numbers, question depth and hints. Proven pattern: gas-sim (מסלול החוקרים / מסלול האתגר) and states-sim (7 regular + 6 advanced missions).

### 6.1 Names and entry
- Track choice screen when no track is set: two cards.
  - "בסיס" (subtitle: "צעד אחר צעד, עם רמזים") — icon Lucide compass.
  - "מתקדם" (subtitle: "פחות רמזים, יותר חישוב והסבר") — icon Lucide mountain.
- Free exploration stays available from both ("מעבדה חופשית").
- URL: ?track=basic | ?track=adv sets it (used in teacher direct links); ?choose=1 reopens the choice. A small chip in the header shows the track and lets the student switch (progress per track is kept).

### 6.2 What changes between the levels
| | בסיס | מתקדם |
|---|---|---|
| Scaffolding | one step on screen at a time, the next step unlocks when the previous is done; formula card always visible; the start reading is pre-filled | the whole mission at once; formula card on demand; the student finds the start reading |
| Numbers | whole numbers or one decimal; bodies with simple volumes (8, 10, 20, 27 סמ"ק) | decimals, rounding to 2 places, irregular shapes, values that need care |
| Units | everyday units only (°C, גרם, סמ"ק) | adds the second unit where the curriculum allows (K, kPa, ק"ג/מ"ק) |
| Questions | predict + "what happened" (qualitative), 3 options | predict + "why" + "what would happen if…", 4 options, sometimes a numeric answer |
| Hints | immediate targeted hint after the 1st mistake; reveal after 2 | targeted hint after the 2nd mistake; reveal after 3; no number given in the hint |
| Missions | 5-7 short | 5-7 longer, includes one transfer/design question |
| Summary | 3 rules in plain words | the rules + one equation/graph insight + one real-life application |

### 6.3 Mission anatomy (data, one object per mission)
```js
{ id:'samevol', n:3, title:'אותו נפח, מסה שונה', icon:'scale' /* Lucide */,
  setup:{set:'samevol'},                         // what the stage loads
  intro:'<p>…</p>',                               // 1-2 sentences, what we are about to find out
  predict:{ q:'…', opts:['…','…','…'], ok:1 },   // options shuffled at render, similar length
  steps:[ { t:'שקלו את שלושת הגופים', s:'גררו כל גוף אל המאזניים', done:st=>… }, … ],
  check:{ table:true },                           // the data table must be right before moving on
  why:{ q:'…', opts:[{t:'…',ok:true},{t:'…',h:'targeted hint'}] },
  disc:'<p>…</p>' }                               // the discovery card, the sentence to remember
```

### 6.4 Progress saved
- localStorage keys per sim and track: `<simKey>.track` = basic|adv; `<simKey>.progress.<track>.v1` = {done:[ids], pred:{id:index}, stars:{id:n}, meas:{id:n}, at}.
- Resume where the student stopped ("ממשיכים ממשימה 4"). "התחלה מחדש" asks for confirmation and clears only that track.
- Works with no sign-in and offline. With madalabs sign-in the same progress is ALSO reported (§7).

### 6.5 End summary
- After the last mission: a summary screen with the track name, missions done k/N, stars, the 3 rules learned (filled from the discoveries), and the student's predictions vs results ("ניבאת X, יצא Y").
- Buttons: "למסלול המתקדם" (from בסיס), "מעבדה חופשית", "הדפסה" (print-friendly summary, no background image), back to madalabs if signed in.
- Reported to madalabs as the track overview activity.

-------------------------------------------------------------------------------
## 7. madalabs integration (the labs hub, https://madalabs.sites.tab.bot/)

How it works today :
- Teacher signs in with Google, creates a class (class code). Student joins at madalabs with class code + name + secret icon sequence. Each lab card or teacher direct link opens the lab with ?ml=<token>; the SDK stores it in the lab's localStorage (madalabs.session) and removes it from the URL.
- Direct link format: https://madalabs.sites.tab.bot/#/join?lab=<slug>&class=<CODE> → sign-in → back to the lab.
- Reports: POST /api/report on the hub via madalabs-sdk.js. The hub accepts a report from any https://<slug>.sites.tab.bot origin with lab = that slug, so a new sim reports without any hub change. The teacher's class page lists every lab that has data (a lab not yet in the hub's LABS list shows its slug as the title and a generic icon); the hub card, title, grade chips, collections and the "קישור ישיר" button need the hub entry (only after she approves).
- Not signed in: the SDK keeps reports on the device (≤50, ≤7 days) and sends them after sign-in. The sim must work 100 % without madalabs.

### 7.1 Adapter: copy ml.js (download it from this page) into the sim
This is gas-sim's ml.js (the reference adapter) with Lucide icons instead of the emoji and the seder-godel palette; logic unchanged. It loads the SDK async, turns off the SDK's floating badge, serializes reports (the hub keeps ONE file per student, so two parallel reports can overwrite each other — seen live on Nov 5), and exposes:
```html
<html lang="he" dir="rtl" data-ml-nobadge data-lab="<slug>">
…
<script src="ml.js?v=3"></script>   <!-- before the app script -->
```
```js
MLLab.chip(headerEl, {big:true /* only inside a scaled 1920x1080 stage */, before:someEl});
MLLab.onSession(s => { /* null | {student:{sid,name}, class:{code,name,grade}} */ });
MLLab.report({activity, done, score, max, details});   // fire-and-forget, never throws
```

### 7.2 What to report (rules of the hub)
- activity: ≤ 60 chars, unique per mission AND track, mission number first so teacher views sort: "משימה 3 · בסיס · אותו נפח". No emoji (her rule; older sims used emoji prefixes — do not copy that).
- Per track overview: "מסלול בסיס · התקדמות" / "מסלול מתקדם · התקדמות", done = all missions done, details {מסלול, "משימות שהושלמו": "k מתוך N", "אילו משימות", "כוכבים"}.
- On prediction lock: done:false {מסלול, הניבוי, שלב}. On mission done: done:true {מסלול, הניבוי "…" · התאים/לא התאים, ההסבר: בניסיון הראשון / אחרי N ניסיונות, מדידות שנרשמו, המדידות "…" (last 12)}.
- Free lab: "מעבדה חופשית" with its measurements, debounced 1.5 s.
- On sign-in: once per student per done-count, send the overview again (covers work done before sign-in).
- score/max ONLY for something that is a grade (e.g. challenge level stars 0-3 or identifications right/total). Progress is NOT a grade (1/7 paints the teacher card red "קשה").
- details: flat object, JSON ≤ 2000 chars, keys < 26 chars, no "?" in keys (long keys are treated as open answers). Values: straight quotes; avoid the teacher-card mark words unless meant (✓ at start, "נכון", "טעה", "שגוי", "רחוק", "חסר", "ניחש: X · בפועל: Y" are counted as right/wrong).
- Helper:
```js
const TRK = TRACK==='adv' ? 'מסלול מתקדם' : 'מסלול בסיס', TW = TRACK==='adv' ? 'מתקדם' : 'בסיס';
const act = (m) => ('משימה '+m.n+' · '+TW+' · '+m.title).slice(0,60);
const rep = o => { try { if (window.MLLab) MLLab.report(o); } catch(e){} };
```

### 7.3 Live test without touching real classes
- Use a dedicated test teacher and a test class, play one mission as a test student, read the teacher's class view, then delete every test class, student and progress row. The hub's totals must be identical before and after.

### 7.4 Adding to the hub (ONLY after she approves)
- app.js LABS entry {slug, img:"img/cards/<slug>.webp" (640×400 webp, ~10 KB, from a real screenshot), alt, title, lu:<Lucide name>, grades:["ז׳"], kind:"sim", path:"<start page>"}; JOIN_LABS and LINK_LABS += slug; _worker.js LABS (+ COL_LABS, + COLS_BUILTIN "sims" if it belongs there).
- Publish madalabs-staging first, then madalabs (md5 check of live vs local before editing, totals before/after). site/site-name.js holds the site name.
- seder-godel: one sim per lesson, in its lesson only, through the review mode ("לבדיקה") until she clicks "מאשרת".

-------------------------------------------------------------------------------
## 8. Feedback button

Paste the feedback <script> block (the one used on all her sites) once before </body>, set NAME to the sim's name. Every a.fb / [data-fb] link then opens mail to chepti@gmail.com with subject "משוב · <NAME> · <page>" and a body with the link, site, page and date. In a single-page sim set window.fbPageTitle to the current mission/level ("משימה 3 · אותו נפח") on every screen change. Visible label or tooltip "שלחו משוב"; Lucide message-square icon.

-------------------------------------------------------------------------------
## 9. Fair questions (standing rule)

Every multiple-choice question in every lab/game/worksheet, current and future, must be fair:
- Option order shuffled at runtime (Fisher–Yates per render) — correct answer NOT always first/same slot; verify position distribution in QA.
- Correct answer NOT the longest/most detailed: all options similar length (±20%) and same grammatical form/level of detail; distractors plausible (real misconceptions), no joke/absurd options, no "none of the above"-style giveaways.
- No wording cues (e.g., echoing the question's words only in the correct option; absolutes only in wrong ones).
- QA step for every lab worker: list each question's option lengths + correct index; fix any where correct is longest or position is fixed.
Also shuffle every list of chips/materials/items, not only quiz options.

-------------------------------------------------------------------------------
## 10. Verification checklist (do all, in a real browser)

Playwright with Chromium. Run locally first (python3 -m http.server started with its output to a file, start_new_session, killed after), then live.
1. Viewports: 1366×768 desktop, 390×844 phone portrait, 844×390 phone landscape, ?proj=1. No horizontal scroll, nothing clipped, no overlapping labels.
2. 0 console errors, 0 page errors, 0 failed requests (record them all, list them in the report).
3. Screenshots of: intro, explore, one challenge level, each track's first mission, the end summary, the madalabs chip signed-out and signed-in. OPEN AND LOOK at each (attach_image) and compare side by side with seder-godel. Ask: would a design-savvy teacher be embarrassed? Is anything purple, glowing, pale, cramped, repeated?
4. Physics spot checks with numbers written in NOTES (e.g. density: sink 27 cm3 aluminium → level 300→327 mL, ice floats 92 % submerged and the level rises by its mass, pushed wood → full volume; heat: equal final temperature, energy conserved within 1 %; pendulum: period at 30°, L=1 m = 2.04 s for every mass).
5. Scripted run of every mission of BOTH tracks to the summary; progress survives a reload; "התחלה מחדש" clears only that track.
6. Question audit table: for every question, option lengths + correct index; shuffle verified over 20 renders.
7. String audit: grep the built files for emoji (U+1F300–1FAFF, U+2600–27BF), U+00AB U+00BB U+2039 U+203A, "נמס", "מניסקוס", "קור עובר", Kelvin/kPa in the basic track, English leftovers, "undefined", "NaN".
8. madalabs: signed-out works; with a test teacher (§7.3) one mission + overview arrive in the class view with the right activity names; cleanup done, stats equal.
9. Size: keep the sim small (target < 1 MB; images webp; fonts subset). Cache-busters ?v=N bumped on every changed js/css (the edge served stale files once).

-------------------------------------------------------------------------------
## 11. Publish flow

- One task = one publisher for a slug. If another worker owns the slug right now, do not publish it; write your changes as a plan.
- Backup before editing a live sim: tar of the source next to your NOTES; check live md5 == local before editing.
- Publish the folder to its own address (<slug>.sites.tab.bot). Read the receipt; then fetch the live files and compare md5.
- Do NOT link a new sim from seder-godel or madalabs, she sees it first and approves. Drive link card ('מעבדות ומשחקים') comes after approval.
- Report: URL, what changed, screenshots paths, live check numbers, doubts.

-------------------------------------------------------------------------------
## 12. Lessons learned (concrete past mistakes, do not repeat)

1. density-lab v1: violet theme (#4338ca), candy material colours, gradients, sparkles icon, no background picture → "סלופ", "הכל סגול", "ואין תמונת רקע?". Use §4 from the start.
2. energy-sim v1-v3: tiny pale stage on a portrait phone, mostly white panels; "more components" was not enough → "לא שיפור משמעותי". The fix was a real illustrated scene with the apparatus as the hero. Design for the phone in portrait, not only 1366.
3. Emojis in UI (gas-sim, states-sim headers and the ml.js chip) → her rule is Lucide only. Use the emoji-free ml.js in this folder.
4. Guillemets (U+00AB/U+00BB) in strings, including teacher-report details → straight " everywhere (seder-godel had to be scrubbed, plan text from outside too).
5. "נמס" in a script → "עבר התכה". "מניסקוס" on a lesson card → "בגובה העיניים, בנקודה הנמוכה".
6. "The cold came in from outside" (ep01) → heat passes hot → cold. Wool insulates by trapping air.
7. "כוס היא גוף" → כוס is a חפץ; גוף is a portion of matter.
8. Floating/density must state מסה חלקי נפח and the ice exception.
9. Correct answer always first and longest (Lind, michre) → shuffle + balanced lengths + audit table.
10. Gas regular track showed Kelvin and kPa → grade-7 basic track uses °C and plain "יחידות לחץ".
11. "Hide window" did not re-flow the other windows (states-sim) → real re-flow.
12. A record button clicked while the gauge was settling recorded a wrong value; pumping then measuring at once read 19 % low → record only steady readings, restart the measurement after a change.
13. Two parallel madalabs reports lost one → serialize (ml.js does). A duplicated element id (moreBtn) attached handlers to the wrong button → unique ids.
14. Progress sent as score painted the teacher card red → no score for progress.
15. Same image twice / two episodes with the same joke → no repeats of pictures or gags.
16. Babyish tone ("מאיה בזום") → grade 7 is middle school.
17. Drawn icons where the series has real elements; boxed item images → stickers, video elements.
18. A sim placed in a lesson whose plan topic did not match → one sim per lesson, topic must match.
19. Stale cache after publish → bump ?v=.
20. Volume-lab: the water must not rise before the body touches it; the reading is at eye level with a magnifier.
