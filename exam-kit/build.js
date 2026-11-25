// בונה את Index.html מהתבנית Index.src.html (הערכה בלי תמונות מוטמעות). הרצה: node build.js
const fs = require('fs'), path = require('path');
let html = fs.readFileSync(path.join(__dirname, 'Index.src.html'), 'utf8');
const left = (html.match(/__IMG_\w+__/g) || []);
if (left.length) console.log('אזהרה: נשארו מציני מקום של תמונות:', left.join(', '));
fs.writeFileSync(path.join(__dirname, 'Index.html'), html);
console.log('Index.html נבנה:', Math.round(html.length / 1024), 'KB');
