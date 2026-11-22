# SKILL: Your own copy of the "חולמים תקשוב" vocabulary game, for any English textbook
(for an AI assistant, such as the teacher's own Tab, helping an English teacher in Israel)

The original game: https://vocab.sites.tab.bot/ (Jet 2, grade 4). Open it first and copy its look and behaviour; this text is the full recipe.
When the copy is live, the teacher sends its link, the book name and the grade to chepti@gmail.com, and it is added to the English hub https://english-games.sites.tab.bot/ for all teachers.

## What the teacher sends you (ask for all of it in one short Hebrew message)
1. Book name and grade (e.g. "Jet 2, כיתה ד׳").
2. The word lists per unit or page, in book order (typed, a photo of the word box, a PDF, a spreadsheet, or links to her existing activities).
3. Pictures, if she has her own (only pictures she made or owns). Otherwise you make them (§9).
4. Optional: unit labels (by page or by unit), a weekly unlock calendar (§7), default addressing (את / אתה / כללי).

## 0. What you are building
A small, free, static website where students practice the vocabulary of ONE textbook, unit by unit (or page by page), with pictures, short stories and several games. Hebrew interface (RTL), English words. No login, no names, works on a phone. It carries one small anonymous tracking hook (§11a) so the answers can later feed a teacher's word-mastery heat-map. The teacher gets one link to share with the class.

Work in this order and show the teacher the result of each step before moving on:
1) word lists -> 2) her approval of the table -> 3) sentences, pictures, stories -> 4) site, with the tracking hook -> 5) tests -> 6) publish -> 7) hand-off message.
If you can only do part of it (for example, you cannot generate images or cannot publish), say so plainly at the start and use the fallback named in that section.

## 1. Input: the word lists
Ask the teacher, in one short message (Hebrew):
- Book name and grade (e.g. "Jet 2, grade 5"). Used only as a label.
- The word lists, in any form: typed or pasted, a photo of the word box on the page, a PDF, a spreadsheet, or links to her own existing online activities (e.g. Wordwall). One unit/page at a time is fine.
- How units should be labelled: by page ("עמ׳ 49") or by unit ("יחידה 4 · חלק 3").
- Optional: a weekly unlock calendar (see §7) — start date, weekday/time, holidays to skip.
- Optional: how to address the student by default — feminine (את), masculine (אתה) or neutral (כללי). A toggle is always shown.

Reading the input:
- Photo/PDF: read the page yourself (OCR / vision). Take ONLY the vocabulary list (the word box, glossary or "new words" list). Do not transcribe reading texts, exercises or dialogues.
- Keep the book order. Each unit gets an id (p49, u4p3), a Hebrew label, an order number, and its words.
- Clean every list:
  - Drop names of characters (Shira, Tom), full sentences, and instructions. Keep useful fixed phrases ("phone number", "good for you", "be careful").
  - Fix typos and capitalisation (lower-case unless it is a proper word like "English", "Monday").
  - Remove duplicates inside a unit; a word that appears in two units stays in both, but is counted once in the student's collection.
  - Hebrew: one natural translation, short. Use the slash form for gendered words (תלמיד/ה, פוחד/ת). Double-check easy-to-confuse ones (bear = דוב, scared = פוחד/ת not מפחיד, fly = לעוף as a verb unless the list means the insect).
  - Where the source had no Hebrew (picture items), write the Hebrew yourself and mark it as yours.
- Show the teacher a table per unit (English | Hebrew | note) and wait for her OK or corrections. This is the only step that needs her; everything after it you do yourself.

## 2. Data format
One file `units.json` is the single source of truth; a tiny build step turns it into `data.js` (`window.VOCAB = {...}`) that the site loads.

units.json:
{
  "book": "Jet 2",
  "units": [
    {
      "id": "p66",                 // unique, short, url-safe
      "label": "עמ׳ 66–68",        // shown to students
      "order": 66,                  // book order
      "unlock": "2026-11-07T20:00:00+02:00",   // optional, ISO with Israel offset (+02:00 winter, +03:00 summer)
      "activity": "https://…",      // optional: the teacher's own existing online activity for this unit (link/embed)
      "words": [
        {
          "en": "computer",
          "he": "מחשב",
          "ex": { "en": "I use my computer for homework.", "he": "אני משתמש/ת במחשב לשיעורי בית." },
          "img": "img/w/computer.webp"
        }
      ]
    }
  ]
}

stories/<unit-id>.json (one short story per unit):
{
  "unit": "p66",
  "title": "Tom's Favorite Day", "titleHe": "היום האהוב על טום",
  "sentences": [
    { "en": "On Monday, his [favorite] [lesson] is [math].", "he": "ביום שני, השיעור האהוב עליו הוא מתמטיקה." },
    { "en": "He [learns|learn] [art] and [writes|write] in his [notebook].", "he": "…" }
  ]
}
Vocabulary inside a sentence is marked [word] or [surface form|base word]. The build step checks: every word of the unit appears in its story, every marked word exists in this or an earlier unit, every example sentence contains its word. Matching ignores case and trailing ?!.…

## 3. Site structure
- Plain static files: index.html, app.css, app.js, track.js (§11a), data.js, fonts/ (self-hosted Rubik), img/w/*.webp. No server code of your own, no database, no framework needed, no build server. Total size: keep it small (pictures 512px WebP, 5–25 KB each, lazy-loaded in lists).
- Hash routes, so any static host works: #/ home · #/u/<id>/<mode> · #/all/<mode> · #/mine (my words) · #/kiosk.
- Home: a short hero ("אני כבר יודעת 23 מילים!" with a yellow star icon), then a shelf of unit cards in book order, a card "כל המילים" (all open words together), and the "המילים שלי" sticker book. The newest open unit is the one in view.
- Inside a unit: a row of tabs for the modes below. The default tab is the learning path.

## 4. Game modes (all built from the same word data)
1. Learning path ("בואי נתחיל", default). Short rounds of ~6 questions:
   meet the word (picture, word, Hebrew, audio, example sentence with a speaker icon and a "תרגום" tap) -> picture to word with 2 options -> 3–4 options -> optional spelling bonus with a letter bank (first 1–2 letters given; only the right letter goes in).
   First round = the 3 easiest new words (concrete before abstract). Later rounds mix 1–2 new words with words in progress. The last item of every round is an easy one she already got right.
2. Flashcards: flip, audio, "ידעתי!" (check icon) / "עוד פעם בהמשך" (rotate icon) (the card comes back a few cards later).
3. Pictures: picture -> choose the English word (4 options), then show word = Hebrew.
4. Match-up: tap two (or drag) to pair English with Hebrew/picture; rounds of 6 (5 on a phone).
5. Quiz: 4 options, alternating EN->HE and HE->EN; distractors from the same unit first and of similar length; shuffle properly (Fisher–Yates).
6. Spelling: hear the word and see the Hebrew/picture -> type the English; forgiving about case and spaces; hint letters.
7. Story: the unit's short story. This unit's words highlighted (teal), earlier units' words in soft mint. Tap a word = popup with picture, Hebrew, speaker. "הקראה" (play icon) reads sentence by sentence with highlighting; Hebrew per sentence or for all. Default mode "מילים שאני מבינה" (star icon): tapping a highlighted word marks it as understood and counts it.
8. Complete the story: one gap per unit word, a word bank with pictures; tap a chip then a gap.
9. Word list: every word with picture, Hebrew, a speaker button, and the example sentence on tap.
10. All words: the path, flashcards, match, quiz, spelling and pictures over every OPEN unit together.
11. My words (sticker book): a word becomes a sticker once it was answered right in 2 different games. Shown per unit; words in progress show with a sprout icon, "בדרך לאוסף". Never list or count unknown words.
12. Kiosk (prize shop): every correct answer = one star (filled yellow star icon, #ffc83d). Stars buy fun extras: titles, sticker packs, a background theme, a confetti/fireworks effect, a pet that hatches from an egg and grows, accessories for it, and one far "dream" prize. Prices rise from ~80 to a few thousand stars. The total earned never goes down; spending is stored separately (balance = earned − spent, never negative). Confirm before buying ("לא עכשיו" to cancel). All prize art is inline SVG/CSS (no emoji) — no image files, no people.
13. Optional: if the teacher already has an online activity for the unit, show it as the first tab (embed if the site allows it, plus an "פתיחה בלשונית חדשה" button with an external-link icon).

Audio: use the browser's built-in speech (speechSynthesis), lang en-US, rate about 0.88, preferring a natural en-US voice when the device has one. No recordings and no audio files are needed. If speech is not available, hide the speaker buttons quietly.

## 5. Success-first (this matters more than any feature)
Students should feel what they know, not what they don't.
- Only successes are counted and shown: stars, stickers, "אני כבר יודעת X מילים". No red, no cross mark, no shake, no failure sound, no "3/10", no mistake counters, no "words to review" lists.
- A miss = a gentle reveal: "זו המילה see" with audio, the right option glows soft yellow, the chosen one just dims; auto-continue after ~3 s or "הבא ←". The missed word comes back 2 items later (max twice). Getting it on the comeback shows "עכשיו את יודעת את זה!".
- If the last answer was a miss, add one easy item so every round ends on a success. End screen: a party icon, new stars, new stickers, the total known.
- Addressing: Hebrew strings in three forms (feminine / masculine / neutral) with a small toggle in the top bar "פנייה: את / אתה / כללי", saved on the device.

## 6. Progress storage
Everything lives in the browser's localStorage under one key, e.g. {w:{"<english word lower>":{ok:{game:count},seen,col}}, stars, k:{spent,own,on}, voice}. Keyed by the English word, so a word known on one page counts everywhere. The progress itself stays on the device; the only thing that leaves it is the anonymous answer stream of §11a. Plan a small migration if you change the shape later, so students keep their stars.

## 7. Weekly unlock (optional)
For a book that is taught over the year: units already taught are open; each later unit opens on a fixed weekday and time (e.g. every Saturday 20:00 Israel time), skipping holidays the teacher names (check the dates on a Hebrew calendar such as hebcal.com — e.g. Hanukkah, Pesach). Remember the clock change: +02:00 in winter, +03:00 from the end of March.
- isOpen(unit) = no unlock date, or unlock <= now. Only open units feed any game, "all words", the sticker book and stories — locked words never leak.
- Locked units show as translucent dashed cards after the open ones, with "ייפתח במוצאי שבת 14.11" (or the weekday chosen) and a moon icon on the next one; a tap shows "עוד מעט!"; a direct link to a locked unit goes home with that note. If a unit opens while the page is open, refresh it (check once a minute).
- Teacher-only, not advertised on the site: ?all=1 opens everything (for preparing lessons), ?now=<ISO date> pretends another moment (for testing). Tell the teacher these two in your hand-off message.

## 8. Design rules
- Cool pastels: mint, sky, teal. Main sky tone #A9D4E0, teal for buttons/links (#027380 on white passes contrast), mint highlights (#d9f2ea), white rounded cards (radius ~18–20 px) with a soft shadow, light background (#f4faf9).
- No purple or violet anywhere (not in highlights, focus rings, icons or the favicon). No neon, no busy cartoon backgrounds. Friendly but not childish — it should feel good to an 11–13 year old too.
- Font: Rubik only (never Arial), self-hosted (one woff2 file), so the site loads no outside fonts.
- Icons: Lucide icons only (https://lucide.dev, copied into the page as inline SVG, stroke 2, currentColor). No emoji anywhere: not in labels, buttons, toasts, the kiosk or the favicon. Stars are the Lucide star, filled yellow (#ffc83d).
- Quotes: straight double quotes " in every text (never « » and never curly quotes).
- dir="rtl" lang="he" for the page; every English word/sentence wrapped with lang="en" dir="ltr" (unicode-bidi: isolate) so punctuation does not jump.
- Phone first: at 390×844 no sideways scrolling; on a 1366×768 laptop each screen fits without page scrolling. Tap targets at least 44 px. Respect prefers-reduced-motion (no confetti then). Visible focus outlines. Text contrast WCAG AA.
- Footer on every screen, bottom-right, small: a link with an envelope line icon and the text "חולמים תקשוב", aria-label="שלחו משוב · חולמים תקשוב", title="שלחו משוב"; hidden when printing. Build its mailto when it is clicked: to chepti@gmail.com, subject "משוב · <site name> · <current page or game>", body starting with the page address (location.href), the site name, the page and the date, then an empty line for the message, all with encodeURIComponent. This is how a feedback email says where it came from.
- The interface text stays short.

## 9. Pictures
- Every word gets its OWN picture, all in one consistent style: flat, soft pastel illustration, white background, no text or letters in the image, 512 px, saved as WebP 5–25 KB.
- Never use textbook art, scans of the book, clip-art or images found online. Generate them, or draw simple SVG.
- People: modest and respectful. Girls and women always in long skirts below the knee (never trousers or shorts), modest sleeves. No touching between boys and girls. No body shaming, no stereotypes, no scary or violent scenes.
- Abstract words (from, very, but, try, I want): a simple clear scene or symbol; if it still does not read well, keep it simple rather than wrong.
- Make a contact sheet per unit (all pictures with their word under each), LOOK at it, and redo any picture that is unclear, shows the wrong meaning, contains text, or breaks the rules. A word already pictured in an earlier unit reuses its picture.
- Pictures the teacher sent: use them for their words (crop to square, 512 px WebP); make the rest in the same style as hers.
- No image tool? Draw a simple inline SVG per word (no emoji), and say so to the teacher.

## 10. Sentences and stories
- One short, simple example sentence per word (A1–A2 level, school/family/everyday life), with a Hebrew translation. Use the word as listed.
- One story per unit: 6–10 short sentences, uses ALL of the unit's words, recycles at least 3 words from earlier units, a Hebrew line for every sentence, a title in English and Hebrew. Kind, light, everyday content.
- Write them yourself (never copy the book's reading texts), then read every sentence again: grammar, natural Hebrew, correct [word|base] marks, nothing unkind. Tell the teacher which texts you wrote so she can glance at them.

## 11. Privacy
- No login, no names, no forms, no ads, no third-party scripts or fonts, no analytics other than the hook below.
- Progress stays on the student's device (localStorage); clearing the browser clears it.
- Do not ask the teacher for student names or any student data; you do not need any.
- The hook (§11a) sends only: which game, a random id made on the device (not a name, not linked to a person), the word, right or not, how many tries, the time. Say this in one line in the hand-off message so the teacher can tell parents.

## 11a. Tracking hook (required, do not change it)
Every copy reports anonymous answers to ONE shared endpoint, so a teacher heat-map (students × words) can be built later. Copy this file as track.js, exactly, and load it before app.js:

```js
/* vocab-track v1 — anonymous word-level events to one shared endpoint.
   VocabTrack.init({gameId:"jet-2-grade-4"}) once; VocabTrack.answer(word, correct, {unit, mode}) on every answer.
   Sends: game_id, player_id (random per device, no names), class_code ("" for now), word, correct, attempts, ts.
   Never throws, never blocks the game; batches every 8 s and on page hide (sendBeacon). ?track=0 turns it off; local files, localhost and automated browsers send nothing unless ?track=1. */
(function(){
  var EP = "https://english-games.sites.tab.bot/api/v1/events", K = "vt1", C = {gameId: "", classCode: ""}, Q = [], N = {}, T = null, off = false;
  function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function pid(){ var p = ls(K + ".pid"); if (!p || !/^[A-Za-z0-9_-]{8,64}$/.test(p)){ p = ""; var a = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < 22; i++) p += a[Math.floor(Math.random() * 36)]; ls(K + ".pid", p); } return p; }
  function send(beacon){
    if (off || !Q.length || !C.gameId) return;
    var ev = Q.splice(0, 50), body = JSON.stringify({v: 1, game_id: C.gameId, game_url: location.origin + location.pathname, player_id: pid(), class_code: C.classCode || "", events: ev});
    try {
      if (!(beacon && navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([body], {type: "text/plain"}))))
        fetch(EP, {method: "POST", body: body, headers: {"content-type": "text/plain"}, keepalive: true, mode: "cors"}).catch(function(){ Q = ev.concat(Q).slice(-200); });
    } catch (e) {}
    if (Q.length) send(beacon);
  }
  window.VocabTrack = {
    init: function(o){ o = o || {}; C.gameId = String(o.gameId || "").toLowerCase(); C.classCode = o.classCode || ls(K + ".class") || "";
      if (o.endpoint) EP = o.endpoint; var q = location.search, force = /[?&]track=1\b/.test(q);
      off = /[?&]track=0\b/.test(q) || ls(K + ".off") === "1" || (!force && (navigator.webdriver || !/^https:$/.test(location.protocol) || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)));
      addEventListener("pagehide", function(){ send(true); }); document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "hidden") send(true); });
      addEventListener("hashchange", function(){ N = {}; }); },
    answer: function(word, correct, o){ try {
      if (off || !word) return; o = o || {}; var w = String(word).toLowerCase().slice(0, 60), k = w + "|" + (o.mode || "");
      var n = N[k] = (N[k] || 0) + 1; if (correct) delete N[k];
      Q.push({word: w, correct: !!correct, attempts: Math.min(n, 99), ts: Date.now(), unit: String(o.unit || "").slice(0, 40), mode: String(o.mode || "").slice(0, 30)});
      if (Q.length >= 50) send(false); else if (!T) T = setTimeout(function(){ T = null; send(false); }, 8000);
    } catch (e) {} },
    flush: function(){ send(false); },
    playerId: pid,
    forget: function(){ var p = pid(); try { localStorage.removeItem(K + ".pid"); } catch (e) {} return fetch(EP + "?player_id=" + encodeURIComponent(p), {method: "DELETE", mode: "cors"}); }
  };
})();
```

In app.js:
1. Once at start: `VocabTrack.init({gameId: "<book>-grade-<n>"})`. game_id = lowercase latin letters, digits and "-", from the book name and grade, e.g. "jet-2-grade-4", "high-five-grade-5". Do not invent a different id per unit.
2. On EVERY answer the student gives, right or wrong: `VocabTrack.answer(word.en, correct, {unit: unit.id, mode: "<game mode>"})`. Places: path/pictures/quiz/spelling (each answer), flashcards ("ידעתי" = true, "עוד פעם" = false), match-up (right pair = true for that word; wrong pair = false for the first tile tapped), story "words I understand" (tap = true), complete-the-story (right gap = true, wrong chip = false for the gap's word). attempts is counted for you (1 = right on the first try; it resets after a right answer or a new screen).
3. Nothing else. No class code yet: leave it empty (the field exists for later). Never put a name, email or free text into any field.
The hook never throws and never slows the game; it batches answers and sends them every few seconds and when the page is hidden. It sends nothing from local files, localhost or automated test browsers, unless the address has ?track=1; ?track=0 turns it off.

Endpoint: POST https://english-games.sites.tab.bot/api/v1/events (JSON as text/plain, CORS open). JSON schema: GET https://english-games.sites.tab.bot/api/v1/schema. Batch shape:
```json
{"v": 1, "game_id": "jet-2-grade-4", "game_url": "https://…/", "player_id": "k3x9…(22 random chars)", "class_code": "",
 "events": [{"word": "apple", "correct": false, "attempts": 1, "ts": 1793917239837, "unit": "p6", "mode": "pic"},
            {"word": "apple", "correct": true, "attempts": 2, "ts": 1793917243112, "unit": "p6", "mode": "pic"}]}
```
Rules the server enforces: game_id matches ^[a-z0-9][a-z0-9._-]{1,79}$, player_id ^[A-Za-z0-9_-]{8,64}$, up to 50 events per batch, word up to 60 chars, correct true/false. The answer is {"ok": true, "stored": N}. `VocabTrack.forget()` deletes everything this device sent (DELETE …/api/v1/events?player_id=…).

## 12. Copyright
- A list of vocabulary words with translations is fine to use.
- Do NOT copy textbook pages, scans, illustrations, reading texts, recordings or exercises; do not use the publisher's logo or cover. Pictures, sentences and stories are your own.
- Name the book only as a reference ("תרגול אוצר המילים של Jet 2"), with a small line that the site is not affiliated with the publisher.
- If the teacher links to other teachers' online activities, link or embed them with the creator's name; do not copy their images.

## 13. Publishing (free)
Any free static host works because there is no server code of your own, for example GitHub Pages, Netlify (drag-and-drop the folder) or Cloudflare Pages. If you can publish yourself, do it; otherwise give the teacher the folder as a ZIP and step-by-step instructions for the drag-and-drop route (about 3 minutes). Use a short, clear address. Open the live link after publishing and check that every file loads.

## 14. Test before handing over
Check on a phone width (390×844) and a laptop width (1366×768): every unit opens; every game can be played to the end screen; quiz options are 4 distinct with the right one present; a miss shows the gentle reveal and the word comes back; every round ends on a success; stars/stickers persist after reload; kiosk balance never goes negative; locked units show no words; ?all=1 and ?now= work; no sideways scroll; footer present and its mailto carries the page; no purple; no emoji; no "x/10" or a cross mark anywhere; Rubik loaded; 0 console errors. Hook: open the live site with ?track=1, answer one word right and one wrong, and check the network: one POST to /api/v1/events answered {"ok":true,"stored":2} with your game_id; then run VocabTrack.forget() in the console to delete the test rows. Fix and re-test until all pass.

## 15. Hand-off message to the teacher (Hebrew, short)
The link, what the students will find (in 3 lines), the teacher-only ?all=1, the unlock calendar if any, that only anonymous answers are collected (no names), how to add a unit later (send the next list — you add it, rebuild data.js, publish again), and the last step: send the link, the book name and the grade to chepti@gmail.com so the game is added to the English hub https://english-games.sites.tab.bot/.
