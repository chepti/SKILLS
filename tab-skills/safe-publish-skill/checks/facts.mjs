// 6. Scientific accuracy. The Tab checks facts itself (see SKILL.md) and records them in FACTCHECK.md;
// this script enforces that the record exists and is clean, and applies the teacher's own TERMS.md.
import fs from 'node:fs';
import path from 'node:path';
import { result, visibleText, standalone } from './lib.mjs';

export function parseTerms(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\s*[-*]\s*(?:לא|no|avoid)\s*:\s*["“]?([^"”→←>]+?)["”]?\s*(?:→|->|←|=>)\s*(?:כן|yes|use)\s*:\s*["“]?([^"”]+?)["”]?\s*$/i);
    if (m) out.push({ bad: m[1].trim(), good: m[2].trim() });
  }
  return out;
}

export async function check(dir, cfg, files) {
  const items = [];
  const add = (level, msg, where) => items.push({ level, msg, where });
  const fp = path.resolve(cfg._workDir, cfg.facts_file || 'FACTCHECK.md');
  let rows = 0;
  if (fs.existsSync(fp)) {
    for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
      if (!/^\s*\|/.test(line) || /^\s*\|\s*[-:]+/.test(line) || /טענה|claim/i.test(line)) continue;
      rows++;
      const cell = line.split('|').map(s => s.trim()).filter(Boolean)[0] || line;
      if (/❌|wrong|שגוי/i.test(line)) add('fail', `claim marked wrong and still on the page: ${cell.slice(0, 70)}`, path.basename(fp));
      else if (/⚠️|unverified|לא נבדק|לא אומת/i.test(line)) add('warn', `not verified: ${cell.slice(0, 70)}`, path.basename(fp));
    }
    if (!rows) add('warn', 'FACTCHECK.md has no claims in its table', path.basename(fp));
  } else if (!cfg.no_science) add('warn', 'no FACTCHECK.md — the Tab has not recorded its fact check', fp);
  const tp = path.resolve(cfg._workDir, cfg.terms_file || 'TERMS.md');
  if (fs.existsSync(tp)) {
    const terms = parseTerms(fs.readFileSync(tp, 'utf8'));
    for (const f of files) {
      if (f.inZip || f.text == null || !/\.(html?|txt|md|json|js)$/.test(f.name)) continue;
      const t = /\.html?$/.test(f.name) ? visibleText(f.text) : f.text;
      for (const { bad, good } of terms) if (t.includes(bad)) add('fail', `"${bad}" → the teacher's term is "${good}"`, f.name);
    }
  }
  return result('facts', 'דיוק מדעי', items, rows ? `${rows} טענות נבדקו מול מקורות` : 'אין תוכן מדעי');
}
standalone(import.meta.url, check);
