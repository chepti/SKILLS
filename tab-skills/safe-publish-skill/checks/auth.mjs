// 8. Password protection & sign-in: teacher-only areas need real auth; student analytics → teacher Google sign-in, verified on the server.
import { result, lineOf, standalone } from './lib.mjs';

export const SERVER_FILE = /(^|\/)(_worker\.js|_middleware\.(m?js|ts)|worker\.(m?js|ts)|functions\/|server\.(m?js|py|ts)|api\/|netlify\/functions\/)/;
const SCRIPT_EXT = /\.(html?|m?js|cjs|ts|jsx|tsx|vue|svelte)$/;
// Code the browser runs: <script> blocks + on*="" handlers of HTML, whole JS files. Visible text and <pre> examples are ignored.
export function clientCode(f) {
  if (/\.html?$/.test(f.ext)) return [...f.text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n')
    + '\n' + [...f.text.matchAll(/\son\w+\s*=\s*"([^"]*)"/gi)].map(m => m[1]).join('\n');
  return f.text;
}
const PW = '(?:pass(?:word|wd|code)?|pwd|pin|secret|admin[_-]?(?:code|key|pass)|teacher[_-]?(?:code|key|pass|pin)|access[_-]?code|unlock[_-]?code|קוד|סיסמה|סיסמא)';
const HARD_COMPARE = new RegExp(`\\b\\w*${PW}\\w*\\b\\s*(?:===?|!==?)\\s*["'\`]([^"'\`]{3,})["'\`]|["'\`]([^"'\`]{3,})["'\`]\\s*(?:===?|!==?)\\s*\\w*${PW}\\w*\\b`, 'i');
const HARD_CONST = new RegExp(`\\b(?:const|let|var)\\s+\\w*${PW}\\w*\\s*=\\s*["'\`]([^"'\`\\s]{3,})["'\`]`, 'i');
const PROMPT_CMP = /prompt\s*\([^)]*\)\s*(?:===?|!==?)\s*["'`][^"'`]{2,}["'`]/i;
const ATOB_CMP = /(?:atob|btoa)\s*\([^)]*\)\s*===?\s*\w*|===?\s*(?:atob|btoa)\s*\(/i;
const PLACEHOLDER = /^(?:x+|\*+|\.\.\.|…|your[-_ ].*|<.*>|changeme|placeholder|null|undefined|true|false|ok|none|error|\s*)$/i;
const URL_PW = /[?&#](pass(?:word)?|pwd|pin|admin(?:[_-]?key)?|key|teacher[_-]?code|code)=([^&\s"'<>#]{3,})/gi;
const PARAM_READ = /\.get\(\s*["'](pass(?:word)?|pwd|pin|admin(?:[_-]?key)?|key|teacher[_-]?code|admin)["']\s*\)/i;
const TEACHER_AREA = /(^|[\/'"`])(admin|teacher|teachers|dashboard|report|reports|analytics|grades|answers|answer-keys?|keys|upload|uploads|manage|moreh|מורה|ניהול)(?=[\/'"`.?]|$)/i;
const STUDENT_DATA = /['"`](?:\/?api\/)?\/?(?:students?\/)?(report|reports|results?|progress|scores?|analytics|attempts?|submissions?|roster|track|events)(?=['"`\/?])|['"`]\/?(?:api\/)?students?\/[\w\/-]*['"`]/i;
const GOOGLE_CLIENT = /accounts\.google\.com\/gsi|google\.accounts\.id\.|GoogleAuthProvider|signInWithPopup|signInWithRedirect|firebase(?:js)?[\/-]auth|apis\.google\.com\/js\/platform|gapi\.auth2/;
const GOOGLE_VERIFY = /securetoken@system\.gserviceaccount\.com|securetoken\.google\.com|oauth2\.googleapis\.com\/tokeninfo|googleapis\.com\/oauth2\/v\d\/certs|verifyIdToken|google-auth-library|jose\b[\s\S]{0,200}jwtVerify|firebase-admin/;
const ALLOWLIST = /(TEACHER|ADMIN|ALLOWED|OWNER)_?EMAILS?|allow(?:ed)?[_-]?(?:list|emails)|teacher[_-]?allow|admins?\s*(?:=|:)\s*\[|\.includes\(\s*(?:\w+\.)*email|hd\s*===/i;
const SERVER_DENY = /\b40[13]\b|Unauthorized|Forbidden/;
const SERVER_AUTHREAD = /authorization|x-[\w-]*(?:key|token)|cookie|getAll\(['"]cookie|session|bearer/i;
const HASHING = /crypto\.subtle\.(?:digest|sign|verify|importKey)|createHmac|timingSafeEqual|bcrypt|scrypt|pbkdf2|argon2|hashlib|hmac\b|sha-?256/i;
const PLAIN_ENV_CMP = /(?:===?|!==?)\s*env\.\w*(?:PASS|PWD|PIN|CODE|KEY|SECRET)\w*|env\.\w*(?:PASS|PWD|PIN|CODE|KEY|SECRET)\w*\s*(?:===?|!==?)/i;
const RATE = /\b429\b|rate[-_ ]?limit|too many|attempts|tries|lock(?:ed|out)?_?until|backoff|cooldown|failCount|fails?\s*[>+]/i;
const PW_LOGIN = /['"`]\/(?:api\/)?(?:login|signin|auth|unlock|teacher\/login|admin\/login|check-?code|verify-?code)['"`]|\b(?:password|passcode|pin|code)\b\s*(?:===?|!==?)/i;
const EMAIL_CODE = /(?:email|mail)[\s\S]{0,80}(?:code|otp|magic)|otp|magic[-_ ]?link/i;

export async function check(dir, cfg, files) {
  const items = [];
  const seen = new Set();
  const add = (level, msg, where) => { const k = level + msg + (where || ''); if (!seen.has(k)) { seen.add(k); items.push({ level, msg, where }); } };
  const ac = cfg.auth || {};
  let server = '', client = '', serverNames = [], teacherFiles = [];
  for (const f of files) {
    if (f.text == null || f.inZip) continue;
    const base = f.name.split('/').pop();
    const isServer = SERVER_FILE.test(f.name);
    if (!isServer && /\.html?$/.test(f.ext) && TEACHER_AREA.test('/' + base.replace(/\.html?$/, ''))) teacherFiles.push(f.name);
    if (!SCRIPT_EXT.test(f.name)) continue;
    if (isServer) { server += '\n' + f.text; serverNames.push(f.name); continue; }
    const code = clientCode(f);
    if (!code.trim()) continue;
    client += '\n' + code;
    // A password / PIN / teacher code checked in the browser is visible to every student (View Source).
    for (const re of [HARD_COMPARE, HARD_CONST]) {
      const m = re.exec(code);
      if (m && !PLACEHOLDER.test(m[1] ?? m[2] ?? '')) add('fail', 'password/PIN/teacher code written in browser code — anyone can read it with View Source. Check it on the server, against a hash', `${f.name}:${lineOf(code, m.index)}`);
    }
    const p = PROMPT_CMP.exec(code) || ATOB_CMP.exec(code);
    if (p) add('fail', 'password checked in the browser (prompt/atob compare) — not protection, move the check to the server', `${f.name}:${lineOf(code, p.index)}`);
    const r = PARAM_READ.exec(code);
    if (r) add('warn', `code reads a secret from the URL (?${r[1]}=) — URLs land in history, logs and shared links. Send it in a header or POST body`, `${f.name}:${lineOf(code, r.index)}`);
  }
  for (const f of files) {
    if (f.text == null || f.inZip || !/\.(html?|m?js|json|txt|md|csv)$/.test(f.ext)) continue;
    const t = /\.html?$/.test(f.ext) ? f.text.replace(/<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi, '') : f.text;
    if (/\.(md|txt)$/.test(f.ext)) continue; // docs explain URLs; links in pages and code are what leak
    for (const m of t.matchAll(URL_PW)) {
      const [, name, val] = m;
      if (PLACEHOLDER.test(val) || /^(\$\{|['"+])/.test(val)) continue;
      if (/^(key|code)$/i.test(name) && val.length < 8) continue; // a short ?code= is usually a class code / page id
      add('fail', `a password/key travels in a link (${name}=…) — never put it in a URL; rotate it, it is no longer secret`, `${f.name}:${lineOf(t, m.index)}`);
    }
  }

  const hasServer = serverNames.length > 0;
  const tracks = ac.student_data ?? (STUDENT_DATA.test(client) || STUDENT_DATA.test(server));
  const googleClient = GOOGLE_CLIENT.test(client) || GOOGLE_CLIENT.test(server);
  const googleVerify = GOOGLE_VERIFY.test(server);
  const teacherRoutes = hasServer && TEACHER_AREA.test((server.match(/['"`]\/?[\w\/-]{1,60}['"`]/g) || []).map(x => '/' + x.replace(/^['"`]\/?/, '')).join(' '));

  // Teacher-only pages with no server at all: a "hidden" page is public to anyone who has the link.
  if (teacherFiles.length && !hasServer && !ac.static_teacher_ok)
    add('warn', `teacher-only page served as a plain public file (${teacherFiles.slice(0, 3).join(', ')}) — anyone with the link sees it. Put it behind server sign-in, or confirm it holds nothing private and set auth.static_teacher_ok`, teacherFiles[0]);

  if (hasServer && (teacherRoutes || tracks)) {
    if (!SERVER_DENY.test(server) || !SERVER_AUTHREAD.test(server))
      add('fail', tracks ? 'server stores/returns student data but never checks a sign-in (no 401/403) — student data is open to anyone' : 'server has teacher/admin routes but never checks a sign-in (no 401/403)', serverNames[0]);
    if (PW_LOGIN.test(server)) {
      if (!HASHING.test(server)) add('warn', 'password/code login compares plain text — store a hash or HMAC (crypto.subtle) in a secret, compare in constant time', serverNames[0]);
      else if (PLAIN_ENV_CMP.test(server)) add('warn', 'a password/code is compared directly with an env value — compare HMAC/hash of it instead (constant time)', serverNames[0]);
      if (!RATE.test(server)) add('warn', 'login has no limit on failed tries — lock for a few minutes after ~5 wrong attempts (429)', serverNames[0]);
    }
  }
  if (tracks && hasServer) {
    if (!googleClient && !ac.teacher_google_waived)
      add('warn', 'site tracks student activity for a teacher — strongly recommended: teacher signs in with Google (Firebase Auth / Google Identity) + email allowlist. Students keep light sign-in (first name + class code + secret emoji/PIN)', serverNames[0]);
    if (googleClient && !googleVerify)
      add('fail', 'Google sign-in is used but the server never verifies the ID token — never trust the client: verify signature, aud, iss, exp on the server', serverNames[0] || 'client');
    if (googleClient && googleVerify && !ALLOWLIST.test(server))
      add('warn', 'Google sign-in has no teacher email allowlist on the server — any Google account could open the teacher area', serverNames[0]);
    if (googleClient && EMAIL_CODE.test(server) && !ac.email_code_no_admin)
      add('warn', 'there is also an email-code login — confirm it can never grant admin/teacher-of-all rights (admin only via verified Google + allowlist), then set auth.email_code_no_admin', serverNames[0]);
  }
  if (tracks && !hasServer && !ac.student_data_local_only)
    add('warn', 'student activity is sent somewhere but this folder has no server code to check — confirm the endpoint requires a verified teacher sign-in', 'client');

  const note = tracks ? (googleClient ? 'נתוני תלמידים מאחורי כניסת מורה עם גוגל שנבדקת בשרת' : 'נתוני תלמידים מאחורי כניסה') : hasServer && teacherRoutes ? 'אזורי מורה דורשים כניסה' : 'אין אזור מורה או נתוני תלמידים; אין סיסמאות בדפדפן';
  return result('auth', 'הגנה בסיסמה והזדהות', items, note);
}

// --live: teacher/data endpoints must not hand out data without a token; optional login rate-limit probe.
export async function liveProbe(live, cfg) {
  const items = [];
  const ac = cfg.auth || {};
  const paths = [...new Set(['/api/report', '/api/reports', '/api/results', '/api/analytics', '/api/students', '/api/admin', '/api/teacher', ...(ac.teacher_paths || [])])];
  for (const p of paths) {
    try {
      const r = await fetch(new URL(p, live), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      if (r.status !== 200) continue;
      const ct = r.headers.get('content-type') || '';
      const body = (await r.text()).slice(0, 2000);
      const isIndex = /<html/i.test(body) && !(ac.teacher_paths || []).includes(p);
      if (isIndex) continue;
      if (/json|csv/.test(ct) || /^[\[{]/.test(body.trim())) {
        const data = body.length > 30 && !/"(error|ok)"\s*:\s*(false|"[^"]*")\s*[,}]/.test(body.slice(0, 120));
        if (data) items.push({ level: 'fail', msg: 'answers 200 with data without any token — teacher/analytics endpoint is open', where: p });
      } else if ((ac.teacher_paths || []).includes(p)) items.push({ level: 'fail', msg: 'teacher page answers 200 without sign-in', where: p });
    } catch (e) { items.push({ level: 'warn', msg: `could not reach (${e.name})`, where: p }); }
  }
  if (ac.login_path && process.argv.includes('--probe-login')) {
    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) {
      try {
        const r = await fetch(new URL(ac.login_path, live), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: `wrong-${i}`, code: `wrong-${i}` }), signal: AbortSignal.timeout(10000) });
        if (r.status === 429 || r.status === 423) limited = true;
      } catch { break; }
    }
    items.push(limited ? { level: 'pass', msg: 'login locks after repeated wrong tries', where: ac.login_path }
      : { level: 'warn', msg: '12 wrong tries in a row were all accepted for checking — add a lock / 429 after ~5', where: ac.login_path });
  }
  return items.filter(i => i.level !== 'pass');
}
standalone(import.meta.url, check);
