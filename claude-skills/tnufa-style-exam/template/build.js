// בונה את Index.html מהתבנית Index.src.html: מטמיע את התמונות (img/*.jpg) כ-data URI.
// הרצה: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'Index.src.html'), 'utf8');
const map = { wave: 'wave.jpg', party: 'party.jpg', slug: 'slug.jpg', microscope: 'microscope.jpg', runner: 'runner.jpg' };
let total = 0;
for (const k of Object.keys(map)) {
  const p = path.join(dir, 'img', map[k]);
  if (!fs.existsSync(p)) { console.log('חסר', map[k], '(נשאר ריק)'); html = html.split('__IMG_' + k + '__').join(''); continue; }
  const b = fs.readFileSync(p);
  total += b.length;
  html = html.split('__IMG_' + k + '__').join('data:image/jpeg;base64,' + b.toString('base64'));
}
fs.writeFileSync(path.join(dir, 'Index.html'), html);
console.log('Index.html נבנה:', Math.round(html.length / 1024), 'KB (תמונות', Math.round(total / 1024), 'KB)');
