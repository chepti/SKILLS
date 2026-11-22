// 1. Information security: secrets, credentials, contact details, risky files, open admin routes.
import { result, lineOf, standalone } from './lib.mjs';

const SECRET_PATTERNS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/, 'AI service key (sk-…)'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, 'GitHub token'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/\b[sr]k_live_[A-Za-z0-9]{10,}/, 'Stripe live key'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'signed token (JWT)'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{20,}/, 'Bearer token'],
];
const ASSIGN = /\b(pass(?:word|wd)?|pwd|secret|api[_-]?key|apikey|token|admin[_-]?key|access[_-]?key|client[_-]?secret|upload[_-]?code|up[_-]?token|private[_-]?key|x-admin-key)\b["']?\s*[:=]\s*["'`]([^"'`\s]{6,})["'`]/gi;
const PLACEHOLDER = /x{3,}|your|example|<|\.\.\.|\*\*\*|changeme|placeholder|process\.env|env\.|\$\{|todo|dummy|test/i;
const URL_SECRET = /https?:\/\/[^\s"'<>]*[?&](token|key|code|uptoken|secret|sig|signature|auth|password)=([A-Za-z0-9_\-%.]{8,})/gi;
const GOOGLE_KEY = /\bAIza[0-9A-Za-z_-]{35}\b/g;
export const EMAIL = /(?<![\w.+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w])/g;
export const PHONE_IL = /(?<![\d+])(?:\+972[-\s]?|0)(?:5\d|[23489]|7\d)[-\s]?\d{3}[-\s]?\d{4}(?!\d)/g;
const RISKY_FILE = [
  [/(^|\/)\.env(\.|$)/i, 'fail', '.env file'], [/\.(pem|key|p12|pfx|keystore)$/i, 'fail', 'key/certificate file'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)/i, 'fail', 'SSH key'], [/(^|\/)\.git\//, 'fail', '.git folder (whole history is downloadable)'],
  [/(^|\/)\.htpasswd$/i, 'fail', 'password file'], [/(^|\/)secrets?\//i, 'fail', 'secrets folder'],
  [/\.(sqlite3?|db)$/i, 'fail', 'database file'], [/(\.bak|\.old|~)$/i, 'warn', 'backup copy'],
  [/(^|\/)\.DS_Store$/i, 'warn', '.DS_Store (folder listing)'], [/\.map$/i, 'warn', 'source map'],
  [/(^|\/)node_modules\//, 'warn', 'node_modules inside the publish folder'],
];

export async function check(dir, cfg, files) {
  const items = [];
  const allowEmails = new Set((cfg.allowed_emails || []).map(e => e.toLowerCase()));
  const allowPhones = new Set((cfg.allowed_phones || []).map(p => p.replace(/\D/g, '')));
  const seen = new Set();
  const add = (level, msg, where) => { const k = level + msg + where; if (!seen.has(k)) { seen.add(k); items.push({ level, msg, where }); } };
  for (const f of files) {
    for (const [re, level, what] of RISKY_FILE) if (re.test(f.name)) add(level, `${what} — remove it from the publish folder`, f.name);
    if (f.text == null) continue;
    const t = f.text;
    for (const [re, what] of SECRET_PATTERNS) { const m = re.exec(t); if (m) add('fail', `${what}`, `${f.name}:${lineOf(t, m.index)}`); }
    for (const m of t.matchAll(ASSIGN)) if (!PLACEHOLDER.test(m[2])) add('fail', `secret value in "${m[1]}"`, `${f.name}:${lineOf(t, m.index)}`);
    for (const m of t.matchAll(URL_SECRET)) if (!PLACEHOLDER.test(m[2])) add('fail', `link carries a secret (${m[1]}=…) — e.g. an upload link with its code`, `${f.name}:${lineOf(t, m.index)}`);
    for (const m of t.matchAll(GOOGLE_KEY)) add('warn', 'Google/Firebase key: OK only if it is a public web config restricted to your domain', `${f.name}:${lineOf(t, m.index)}`);
    for (const m of t.matchAll(EMAIL)) {
      const e = m[0].toLowerCase();
      if (allowEmails.has(e) || /@system\.gserviceaccount\.com$/.test(e) || /@(?:[\w-]+\.)*(example|invalid|test|localhost)$|@example\.(com|org|net)$/.test(e) || /\.(png|jpe?g|webp|svg|gif)$/.test(e)) continue;
      add('fail', `email address ${e.replace(/^(.).*(@.*)$/, '$1…$2')} — remove, or add to allowed_emails if it is meant to be public`, `${f.name}:${lineOf(t, m.index)}`);
    }
    for (const m of t.matchAll(PHONE_IL)) {
      if (allowPhones.has(m[0].replace(/\D/g, ''))) continue;
      add('fail', `phone number ${m[0].slice(0, 4)}… — remove, or add to allowed_phones if it is meant to be public`, `${f.name}:${lineOf(t, m.index)}`);
    }
    // Server code with admin routes must check a key and answer 401/403.
    if (/(^|\/)(_worker\.js|functions\/|server\.(m?js|py)|api\/)/.test(f.name) && /['"`]\/(api\/)?admin/i.test(t) && !/40[13]/.test(t))
      add('fail', 'server code has an /admin route but never answers 401/403 — require a key', f.name);
  }
  return result('security', 'אבטחת מידע', items, 'אין מפתחות, סיסמאות, קודים או פרטי קשר חשופים');
}
standalone(import.meta.url, check);
