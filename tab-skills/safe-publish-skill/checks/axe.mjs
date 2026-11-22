// Optional deep accessibility check of the LIVE page with axe-core (WCAG 2.1 A/AA rules) at phone + desktop width.
// Needs Playwright and axe-core:  npm i --no-save playwright-core axe-core  (or use what your box has)
//   node axe.mjs https://your-site.example/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const url = process.argv[2];
if (!url) { console.error('usage: node axe.mjs <url>'); process.exit(2); }
let pw, axeSrc;
try { pw = require('playwright-core'); } catch { try { pw = require('playwright'); } catch { console.log('⚠️ Playwright not installed — skipped (static a11y.mjs still ran)'); process.exit(0); } }
try { axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch { console.log('⚠️ axe-core not installed — skipped'); process.exit(0); }
const browser = await pw.chromium.launch();
let bad = 0;
for (const [w, h] of [[390, 844], [1366, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(`${r.violations.length || errors.length || sideways ? '❌' : '✅'} ${w}px: ${r.violations.length} axe violations, ${errors.length} console errors, sideways scroll: ${sideways ? 'yes' : 'no'}`);
  for (const v of r.violations) console.log(`   ❌ ${v.id} (${v.impact}): ${v.help} — ${v.nodes.length}× e.g. ${v.nodes[0]?.target}`);
  for (const e of errors) console.log(`   ❌ console: ${e.slice(0, 120)}`);
  bad += r.violations.length + errors.length + (sideways ? 1 : 0);
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
