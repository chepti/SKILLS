// 7. Answer keys never reach students: no key files, no key text, answers only behind teacher login.
import { result, lineOf, visibleText, standalone } from './lib.mjs';

const KEY_FILE = /(answer[-_ .]?key|\banswers?\b|solutions?|marking|rubric|teacher[-_ ]?(copy|edition|guide|only)|מחוון|פתרון|פתרונות|תשובות|למורה)/i;
const KEY_TEXT = /מחוון|פתרון מלא|דף תשובות|תשובות לדף|answer key|marking scheme|teacher'?s copy/i;
const ANSWER_FIELD = /["']?\b(answer|correct|correctAnswer|correct_answer|isCorrect|solution|answerIndex|rightAnswer)\b["']?\s*:/;

export async function check(dir, cfg, files) {
  const items = [];
  const add = (level, msg, where) => items.push({ level, msg, where });
  const students = (cfg.audience || 'students') !== 'teachers';
  const allow = new Set(cfg.keys_allow || []);
  for (const f of files) {
    const base = f.name.split(/[/!]/).pop();
    if (KEY_FILE.test(base) && !allow.has(f.name)) add('fail', 'file name looks like an answer key / solution — keep it out of the public folder (teacher login only)', f.name);
    if (f.text == null || f.inZip) continue;
    const vis = /\.html?$/.test(f.ext) ? visibleText(f.text) : f.text;
    const m = vis.match(KEY_TEXT);
    if (m && students) add('fail', `text "${m[0]}" on a student-facing file`, f.name);
    if (/\.(js|mjs|json)$/.test(f.ext) || /\.html?$/.test(f.ext)) {
      const a = ANSWER_FIELD.exec(f.text);
      if (a && !cfg.practice_answers_ok) add('warn', 'correct answers ship to the browser — OK only for a self-check practice game, never for a graded task/test (then check answers on the server). Confirm and set practice_answers_ok', `${f.name}:${lineOf(f.text, a.index)}`);
    }
  }
  return result('keys', 'מפתחות תשובות', items, cfg.practice_answers_ok ? 'אין מחוון; תשובות רק למשחק תרגול' : 'אין מחוון או פתרונות בקבצים הציבוריים');
}
standalone(import.meta.url, check);
