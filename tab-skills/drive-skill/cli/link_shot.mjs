// link_shot.mjs <url> <out.jpg> [width height]: a clean page screenshot for a Drive link card (closes cookie/welcome pop-ups).
// Needs playwright-core under /home/user/node_modules and a headless Chrome under ~/.cache/ms-playwright; drive.py falls back to og:image when this fails.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const require = createRequire('/home/user/node_modules/'); const { chromium } = require('playwright-core');
const [url, out, W = '1200', H = '750'] = process.argv.slice(2);
const exe = execFileSync('bash', ['-lc', 'ls /home/user/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | head -1']).toString().trim();
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--hide-scrollbars'] });
const ctx = await b.newContext({ viewport: { width: +W, height: +H }, locale: 'he-IL', deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const page = await ctx.newPage();
try { await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) { try { await page.waitForLoadState('load', { timeout: 10000 }); } catch (e2) {} }
await page.waitForTimeout(2500);
const words = ['אישור', 'מאשר', 'מאשרת', 'הבנתי', 'סגירה', 'סגור', 'קבל', 'אני מסכים', 'בואו נתחיל', 'התחל', 'דלג', 'Accept', 'Accept all', 'I agree', 'Got it', 'OK', 'Close', 'Skip', '×', '✕', '✖'];
for (let round = 0; round < 3; round++) {
  let clicked = false;
  for (const fr of page.frames()) {
    for (const w of words) {
      const loc = fr.locator(`button:text-is("${w}"), [role=button]:text-is("${w}"), a:text-is("${w}")`).first();
      try { if (await loc.isVisible({ timeout: 200 })) { await loc.click({ timeout: 1500 }); clicked = true; await page.waitForTimeout(600); } } catch (e) {}
    }
    for (const sel of ['[aria-label*="close" i]', '[aria-label*="סגור"]', '[aria-label*="סגירה"]', '.cookie-close', '#cookie-accept', '.cc-btn', '.close-button']) {
      const loc = fr.locator(sel).first();
      try { if (await loc.isVisible({ timeout: 150 })) { await loc.click({ timeout: 1500 }); clicked = true; await page.waitForTimeout(600); } } catch (e) {}
    }
  }
  if (!clicked) break;
}
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(800);
await page.evaluate(() => window.scrollTo(0, 0));
fs.writeFileSync(out, await page.screenshot({ type: 'jpeg', quality: 82 }));
await b.close(); console.log(out);
