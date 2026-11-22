#!/usr/bin/env python3
"""drive.py: the command-line tool for a Teacher Drive site (folders by project, then type).

Config (first match wins):  --config <file.json>  |  env DRIVE_CONFIG=<file.json>  |  env DRIVE_BASE + DRIVE_ADMIN_KEY
                            |  default /home/user/tab/state/secrets/teacher-drive.json   (folder chmod 700, file chmod 600)
                            |  old default /home/user/tab/state/teacher-drive.json is still read, with a warning: run `drive.py secure`
The config file holds {"base": "https://<name>.sites.tab.bot", "admin_key": "...", "code": "...", "contributor_code": "..."}.
It is a secret. It never lives inside the skill folder (site/ there is published), /home/user/tab/files, memory, a zip or a
repo; the CLI warns (and setup refuses) when it does, and fixes a file readable by others to chmod 600.
Never paste the admin key into chat, files on the Drive, or a skill.

SETUP (once, right after publishing the site):
  drive.py setup https://<name>.sites.tab.bot --title "הדרייב של רינה" --owner "רינה" [--brand "שם בית הספר" --brand-url https://...]
           [--feedback-email someone@example.org] [--code 123456] [--contrib-code 654321]
           -> creates the admin key, the 6-digit viewer code and contributor code, writes the config file.
  drive.py settings [--title ..] [--owner ..] [--brand ..] [--brand-url ..] [--feedback-email ..]   # show / change (no republish)

FILES & LINKS (one call per item; goes straight to storage, no republish):
  drive.py add <local_path> "<project/type>" "<display name>" [--note ".."] [--replace <id>]
  drive.py link <url> "<project/type>" "<title>" [--desc "one line"] [--image <path|url> | --og] [--replace <id>]
  drive.py folder "<project/type>" [--icon 🎬]          # create an empty folder / set its icon
  drive.py list [--json]                               # everything; contributor uploads marked ⬆
  drive.py move <id> "<project/type>"   |   drive.py rename <id> "<new name>"
  drive.py remove <id>
  drive.py check-links                                 # every link card URL must answer 2xx/3xx

UPLOAD LINKS for other agents / colleagues (scoped to one folder, revocable, expire):
  drive.py upload-link "<project/type>" --label "who it is for" [--days 30 | --days 0 = never] [--no-subfolders]
  drive.py upload-links                                # all links: active / revoked / expired, upload counts
  drive.py revoke <link_id>
  drive.py contrib-code <6digits>                      # the older site-wide contributor code (any existing folder)
  drive.py code <6digits>                              # the viewer code (logs every viewer out)

CONTRIBUTOR UPLOADS:
  drive.py pull [--folder "<project/type>"] [--link <link_id>] [--new] [--out <dir>]   # download contributor files
  drive.py adopt <id> ["<project/type>"]               # make a contributor upload a normal file (can then move/rename)

PRIVACY / SECRETS:
  drive.py secure            # move an old config into the locked folder, chmod 600/700, scan the skill folder,
                             # /home/user/tab/files and memory for files holding the admin key (lists them to clean)

BACKUPS (encrypted; key kept apart from the backups):
  drive.py backup-key        # once (setup does it): random key -> /home/user/tab/state/secrets/teacher-drive-backup.key (600)
  drive.py backup [--no-files] [--prune] [--dir D] [--key K]
                             # manifest + settings + board + links + every file, streamed into an AES-256 encrypted tar
                             # (openssl, pbkdf2 200k): /home/user/tab/backups/teacher-drive/<slug>/<slug>-full|meta-<UTC>.tar.enc
                             # no plain copy touches the disk; refuses if the key sits with the backups or disk is short
  drive.py verify [backup]   # restore test (default: newest): decrypt all, sha256 of every object, parse the manifest,
                             # every manifest file present, extract a sample file to a temp folder
  drive.py prune [--keep-days 14] [--keep-months 3] [--dry-run]
                             # verify the newest first (refuses to delete if it fails), then keep 14 days + newest per month
                             # for 3 months, delete the rest; also drops the site's board daily copies older than 14 days
  drive.py backups           # list backups
  drive.py restore <backup> --out <folder>     |     drive.py restore <backup> --to-site --yes   (writes objects back)
  Daily schedule: `drive.py backup --prune` (big drive, short disk: daily `backup --no-files --prune` + weekly full)

REMOVING A DRIVE (irreversible):
  drive.py wipe --yes        # deletes EVERY stored object (files, manifest, board, links, codes). Needed before
                             # publish-cli site.delete, which refuses to remove non-empty storage. Pull/backup first.
"""
import json, os, sys, secrets, string, subprocess, tempfile, mimetypes, datetime, urllib.parse, re
import requests

SECRETS_DIR = '/home/user/tab/state/secrets'                 # locked folder (chmod 700), outside every project / site / zip
DEFAULT_CFG = SECRETS_DIR + '/teacher-drive.json'           # chmod 600
LEGACY_CFG = '/home/user/tab/state/teacher-drive.json'      # where older versions kept it; still read, with a warning
DEFAULT_BACKUP_KEY = SECRETS_DIR + '/teacher-drive-backup.key'
DEFAULT_BACKUP_DIR = '/home/user/tab/backups/teacher-drive'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'}
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(HERE)                          # the installed skill folder (site/ in it gets published)
mimetypes.add_type('video/mp4', '.mp4'); mimetypes.add_type('text/plain', '.txt'); mimetypes.add_type('audio/mp4', '.m4a')

ARGS = sys.argv[1:]
def opt(n, default=None):
    if n in ARGS:
        i = ARGS.index(n); v = ARGS[i + 1]; del ARGS[i:i + 2]; return v
    return default
def flag(n):
    if n in ARGS: ARGS.remove(n); return True
    return False
def warn(msg): print('⚠ ' + msg, file=sys.stderr)

def _inside(path, root):
    p, r = os.path.realpath(path), os.path.realpath(root)
    return p == r or p.startswith(r.rstrip('/') + '/')
UNSAFE_ROOTS = [PROJECT_DIR, '/home/user/tab/files', '/home/user/tab/memory']   # published / shared / readable places
def secret_place_problems(path):
    """Why `path` is not a locked place for a secret (empty list = fine)."""
    out = []
    for r in UNSAFE_ROOTS:
        if os.path.isdir(r) and _inside(path, r): out.append(f'{path} is inside {r} (project / shared folder)')
    if os.path.exists(path) and os.stat(path).st_mode & 0o077: out.append(f'{path} is readable by others (mode {oct(os.stat(path).st_mode & 0o777)})')
    return out
def lock_file(path):
    if os.path.exists(path) and os.stat(path).st_mode & 0o077:
        os.chmod(path, 0o600); warn(f'{path} was readable by others; fixed to chmod 600')
def write_secret(path, text):
    """Write a secret file that is never readable by others, not even for a moment."""
    d = os.path.dirname(os.path.abspath(path)); new = not os.path.isdir(d); os.makedirs(d, exist_ok=True)
    if new or d == SECRETS_DIR: os.chmod(d, 0o700)
    tmp = path + '.tmp'
    if os.path.exists(tmp): os.remove(tmp)
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f: f.write(text)
    os.replace(tmp, path)

_cfg_arg = opt('--config') or os.environ.get('DRIVE_CONFIG')
if _cfg_arg: CFG_PATH = _cfg_arg
elif not os.path.exists(DEFAULT_CFG) and os.path.exists(LEGACY_CFG):
    CFG_PATH = LEGACY_CFG
    if not (len(ARGS) and ARGS[0] == 'secure'):
        warn(f'config is at the old path {LEGACY_CFG}; run `drive.py secure` once to move it into the locked folder {SECRETS_DIR}')
else: CFG_PATH = DEFAULT_CFG
def load_cfg():
    if os.environ.get('DRIVE_BASE') and os.environ.get('DRIVE_ADMIN_KEY') and not os.path.exists(CFG_PATH):
        return {'base': os.environ['DRIVE_BASE'].rstrip('/'), 'admin_key': os.environ['DRIVE_ADMIN_KEY']}
    if not os.path.exists(CFG_PATH): return {}
    lock_file(CFG_PATH)
    for p in secret_place_problems(CFG_PATH): warn('the drive config (admin key + codes) is not in a locked place: ' + p + ' — run `drive.py secure`')
    return json.load(open(CFG_PATH))
CFG = load_cfg()
BASE = (CFG.get('base') or '').rstrip('/')
H = {'x-admin-key': CFG.get('admin_key', ''), **UA}
STATE_DIR = os.path.dirname(os.path.abspath(CFG_PATH))
def save_cfg():
    write_secret(CFG_PATH, json.dumps(CFG, ensure_ascii=False, indent=1))
def need():
    if not BASE or not CFG.get('admin_key'): raise SystemExit('no drive config: run `drive.py setup <site url>` or set DRIVE_CONFIG / DRIVE_BASE + DRIVE_ADMIN_KEY')
def now(): return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
def rid(n=12): return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))
def segs(path): return [s.strip() for s in path.split('/') if s.strip()]

def _put(key, data, ctype):
    r = requests.put(BASE + '/admin/obj', params={'key': key}, data=data, headers={**H, 'content-type': ctype}, timeout=900)
    r.raise_for_status(); return r.json()
def _del(key): requests.delete(BASE + '/admin/obj', params={'key': key}, headers=H, timeout=60)
def get_manifest():
    r = requests.get(BASE + '/admin/obj', params={'key': '_manifest.json'}, headers=H, timeout=60)
    if r.status_code == 404: return {'title': '', 'folders': [], 'files': []}
    r.raise_for_status(); return json.loads(r.content.decode('utf-8'))
def put_manifest(m):
    _put('_manifest.json', json.dumps(m, ensure_ascii=False, indent=1).encode(), 'application/json; charset=utf-8')
def merged():
    r = requests.get(BASE + '/admin/manifest', headers=H, timeout=60); r.raise_for_status(); return r.json()
def ensure_folders(m, path):
    for i in range(1, len(path) + 1):
        if not any(f['path'] == path[:i] for f in m['folders']): m['folders'].append({'path': path[:i]})

# ---------- setup / settings ----------
SETTING_FLAGS = {'--title': 'title', '--owner': 'owner', '--brand': 'brand', '--brand-url': 'brand_url', '--feedback-email': 'feedback_email'}
def setup(base):
    global BASE, H
    bad = [p for p in secret_place_problems(CFG_PATH) if 'inside' in p]
    if bad: raise SystemExit('refused: the config holds the admin key and codes; keep it in a locked place, not here: ' + bad[0])
    if os.path.exists(CFG_PATH) and json.load(open(CFG_PATH)).get('base', '').rstrip('/') != base.rstrip('/'):
        raise SystemExit(f'{CFG_PATH} already holds another drive; use --config <new file>')
    code = opt('--code') or ''.join(secrets.choice('0123456789') for _ in range(6))
    ccode = opt('--contrib-code') or ''.join(secrets.choice('0123456789') for _ in range(6))
    if ccode == code: raise SystemExit('contributor code must differ from the viewer code')
    st = {v: opt(k) for k, v in SETTING_FLAGS.items()}; st = {k: v for k, v in st.items() if v is not None}
    key = secrets.token_urlsafe(32)
    BASE = base.rstrip('/'); H = {'x-admin-key': key, **UA}
    r = requests.post(BASE + '/admin/init', json={'code': code, 'admin_key': key}, headers=UA, timeout=60)
    if r.status_code == 409: raise SystemExit('this site is already initialized (its admin key is wherever setup first saved it)')
    r.raise_for_status()
    CFG.clear(); CFG.update({'base': BASE, 'admin_key': key, 'code': code, 'contributor_code': ccode, 'created': now()}); save_cfg()
    requests.post(BASE + '/admin/contrib_code', json={'code': ccode}, headers=H, timeout=60).raise_for_status()
    if st: requests.post(BASE + '/admin/settings', json=st, headers=H, timeout=60).raise_for_status()
    put_manifest({'title': st.get('title', ''), 'folders': [], 'files': []})
    bkey, bdir = backup_paths()
    if not os.path.exists(bkey): write_secret(bkey, secrets.token_urlsafe(48) + '\n')
    print(json.dumps({'ok': True, 'site': BASE, 'viewer_code': code, 'contributor_code': ccode, 'config': CFG_PATH,
                      'backup_key': bkey, 'backups_dir': bdir,
                      'next': 'schedule a daily `drive.py backup --prune` (encrypted, 14 days + monthly x3, restore-tested before pruning)',
                      'settings': requests.get(BASE + '/admin/settings', headers=H, timeout=60).json().get('settings')}, ensure_ascii=False, indent=1))

def settings():
    st = {v: opt(k) for k, v in SETTING_FLAGS.items()}; st = {k: v for k, v in st.items() if v is not None}
    r = requests.post(BASE + '/admin/settings', json=st, headers=H, timeout=60) if st else requests.get(BASE + '/admin/settings', headers=H, timeout=60)
    r.raise_for_status(); print(json.dumps(r.json()['settings'], ensure_ascii=False, indent=1))

# ---------- files ----------
def _thumb(path, ctype):
    out = tempfile.mktemp(suffix='.jpg')
    if ctype.startswith('video/'):
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True, timeout=60).stdout.strip() or 10)
        cmd = ['timeout', '-k', '5', '60', 'ffmpeg', '-y', '-loglevel', 'error', '-ss', str(max(0, min(d * 0.3, d - 0.5))), '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', out]
    elif ctype.startswith('image/'):
        cmd = ['timeout', '-k', '5', '60', 'ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-vf', 'scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=white', '-q:v', '4', out]
    else: return None
    try: subprocess.run(cmd, timeout=90, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception: return None
    return out if os.path.exists(out) and os.path.getsize(out) > 0 else None

def add(path, folder, name, note=None, replace=None):
    if not os.path.isfile(path): raise SystemExit(f'no such file: {path}')
    m = get_manifest()
    ext = os.path.splitext(path)[1].lstrip('.').lower()
    ctype = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    if ctype.startswith('text/'): ctype += '; charset=utf-8'
    fid = replace or rid()
    if replace and not any(f['id'] == replace for f in m['files']):
        c = next((f for f in merged()['files'] if f['id'] == replace and f.get('contrib')), None)
        if not c: raise SystemExit(f'no entry with id {replace}')
        requests.delete(BASE + '/admin/contrib_entry', params={'id': replace}, headers=H, timeout=60).raise_for_status()
        if c.get('uploader') and not note: note = 'הועלה ע״י ' + c['uploader']
    key = f'f/{fid}.{ext}' if ext else f'f/{fid}'
    with open(path, 'rb') as fh: _put(key, fh, ctype)
    t = _thumb(path, ctype); tkey = None
    if t:
        tkey = f't/{fid}.jpg'
        with open(t, 'rb') as fh: _put(tkey, fh, 'image/jpeg')
        os.remove(t)
    e = {'id': fid, 'key': key, 'name': name, 'ext': ext, 'folder': segs(folder), 'size': os.path.getsize(path), 'type': ctype, 'thumb': tkey, 'added': now()}
    if note: e['note'] = note
    old = next((f for f in m['files'] if f['id'] == fid), None)
    if old:
        if old.get('key') and old['key'] != key: _del(old['key'])
        m['files'][m['files'].index(old)] = e
    else: m['files'].append(e)
    ensure_folders(m, e['folder']); put_manifest(m); return e

def _card_image(src):
    from PIL import Image
    im = Image.open(src).convert('RGB'); W, Hh = 800, 500
    s = max(W / im.width, Hh / im.height); im = im.resize((max(W, round(im.width * s)), max(Hh, round(im.height * s))), Image.LANCZOS)
    x = (im.width - W) // 2; im = im.crop((x, 0, x + W, Hh))
    out = tempfile.mktemp(suffix='.jpg'); im.save(out, 'JPEG', quality=84, optimize=True); return out
def _og_image(url):
    m = re.match(r'https?://([^/]+)/(\d+)/?$', url)
    if m:  # a WordPress post by id: its featured image
        try:
            j = requests.get(f'https://{m.group(1)}/wp-json/wp/v2/posts/{m.group(2)}?_embed=wp:featuredmedia', headers=UA, timeout=30).json()
            s = (j.get('_embedded', {}).get('wp:featuredmedia') or [{}])[0].get('source_url')
            if s: return s
        except Exception: pass
    try:
        from bs4 import BeautifulSoup
        b = BeautifulSoup(requests.get(url, headers=UA, timeout=30).content, 'lxml')
        t = b.find('meta', property='og:image') or b.find('meta', attrs={'name': 'twitter:image'})
        return urllib.parse.urljoin(url, t['content']) if t and t.get('content') else None
    except Exception: return None
def _fetch(u):
    r = requests.get(u, headers=UA, timeout=60); r.raise_for_status()
    out = tempfile.mktemp(suffix=os.path.splitext(urllib.parse.urlparse(u).path)[1] or '.img'); open(out, 'wb').write(r.content); return out
def _screenshot(url):
    out = tempfile.mktemp(suffix='.jpg')
    try: subprocess.run(['timeout', '-k', '5', '90', 'node', os.path.join(HERE, 'link_shot.mjs'), url, out], timeout=100, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception: return None
    return out if os.path.exists(out) and os.path.getsize(out) > 0 else None

def link(url, folder, name, desc=None, image=None, og=False, replace=None):
    if not url.startswith(('http://', 'https://')): raise SystemExit('url must start with http(s)://')
    m = get_manifest(); fid = replace or rid()
    old = next((f for f in m['files'] if f['id'] == fid), None)
    if replace and not old: raise SystemExit(f'no entry with id {replace}')
    src = None
    if image: src = _fetch(image) if image.startswith(('http://', 'https://')) else image
    elif og:
        o = _og_image(url); src = _fetch(o) if o else None
    if not src: src = _screenshot(url)
    if not src and not og:
        o = _og_image(url); src = _fetch(o) if o else None
    tkey = old.get('thumb') if old else None
    if src:
        t = _card_image(src); tkey = f't/{fid}.jpg'
        with open(t, 'rb') as fh: _put(tkey, fh, 'image/jpeg')
        os.remove(t)
    e = {'id': fid, 'kind': 'link', 'url': url, 'name': name, 'desc': desc or '', 'key': None, 'ext': '', 'size': 0, 'type': 'text/uri-list',
         'folder': segs(folder), 'thumb': tkey, 'added': now()}
    if old: m['files'][m['files'].index(old)] = e
    else: m['files'].append(e)
    ensure_folders(m, e['folder']); put_manifest(m); return e

def remove(fid):
    m = get_manifest(); f = next((x for x in m['files'] if x['id'] == fid), None)
    if f is None:
        r = requests.delete(BASE + '/admin/contrib_entry', params={'id': fid}, headers=H, timeout=60)
        if r.status_code == 404: raise SystemExit(f'no file with id {fid}')
        r.raise_for_status(); return r.json()['deleted']
    for k in [f.get('key'), f.get('thumb')]:
        if k: _del(k)
    m['files'].remove(f); put_manifest(m); return f

def adopt(fid, folder=None):
    c = next((f for f in merged()['files'] if f['id'] == fid and f.get('contrib')), None)
    if not c: raise SystemExit(f'no contributor upload with id {fid}')
    m = get_manifest(); e = dict(c); e.pop('contrib', None)
    if folder: e['folder'] = segs(folder)
    if c.get('uploader') and 'note' not in e: e['note'] = 'הועלה ע״י ' + c['uploader']
    m['files'].append(e); ensure_folders(m, e['folder']); put_manifest(m)
    _del('_contrib/' + fid + '.json'); return e

def move(fid, folder=None, name=None):
    m = get_manifest(); f = next((x for x in m['files'] if x['id'] == fid), None)
    if f is None: raise SystemExit(f'{fid} is not a normal file (a contributor upload? `adopt` it first)')
    if folder: f['folder'] = segs(folder); ensure_folders(m, f['folder'])
    if name: f['name'] = name
    put_manifest(m); return f

def folder_cmd(path, icon=None):
    m = get_manifest(); p = segs(path); ensure_folders(m, p)
    if icon: next(f for f in m['folders'] if f['path'] == p)['icon'] = icon
    put_manifest(m)

def check_links():
    bad = 0
    for f in merged()['files']:
        if f.get('kind') != 'link': continue
        try: s = requests.get(f['url'], headers=UA, timeout=30, allow_redirects=True).status_code
        except Exception as e: s = str(e)[:60]
        ok = isinstance(s, int) and s < 400
        bad += not ok
        print('OK ' if ok else 'BAD', s, f['id'], '/'.join(f['folder']), '|', f['name'], f['url'])
    print('broken:', bad)

# ---------- upload links ----------
AGENT_NOTE = """הוראות לסוכן אחר (העתיקו כמו שהן):
להעלאת קובץ לתיקייה "{folder}": בקשת POST שגוף הבקשה הוא הקובץ, והטוקן בכותרת X-Upload-Token.
  curl -sS -X POST "{api}" -H "X-Upload-Token: {token}" \\
       --url-query "filename=line07.mp3" --url-query "name=שורה 07" --url-query "uploader=<who>" \\
       --data-binary @line07.mp3
  Python: requests.post("{api}", params={{"filename": "line07.mp3", "name": "שורה 07"}},
                        headers={{"X-Upload-Token": "{token}"}}, data=open("line07.mp3", "rb"))
תת-תיקייה חדשה (אם מותר): גם --url-query "folder={folder}/<sub>". סוגים: mp4 mov webm mp3 m4a wav ogg aac pdf doc(x) ppt(x) xls(x) txt jpg png gif webp heic.
תשובה: {{"ok":true,...}}. עד ~95MB בבקשה אחת; קבצים גדולים יותר: דרך הדף {url}
אדם: פשוט לפתוח את הקישור {url} ולבחור קובץ."""
def upload_link(folder, label, days, sub):
    r = requests.post(BASE + '/admin/upload_link', json={'folder': folder, 'label': label, 'days': days, 'allow_sub': sub}, headers=H, timeout=60)
    r.raise_for_status(); j = r.json()
    print(json.dumps({k: j[k] for k in ('id', 'url', 'folder', 'label', 'expires', 'allow_sub')}, ensure_ascii=False, indent=1))
    print(); print(AGENT_NOTE.format(folder=j['folder'], api=j['api'], token=j['token'], url=j['url']))
def upload_links():
    r = requests.get(BASE + '/admin/upload_links', headers=H, timeout=60); r.raise_for_status()
    for l in r.json()['links']:
        st = 'active' if l['active'] else ('revoked' if l.get('revoked') else 'expired')
        print(l['id'], st.ljust(7), l['folder'], '|', l['label'], '| uploads', l.get('uploads', 0), '| expires', (l.get('expires') or 'never')[:10])
def revoke(lid):
    r = requests.delete(BASE + '/admin/upload_link', params={'id': lid}, headers=H, timeout=60); r.raise_for_status(); print('revoked', lid)

# ---------- pull ----------
def pull(folder=None, link_id=None, new=False, out=None):
    out = out or os.path.join(os.getcwd(), 'drive-pull')
    seen_path = CFG_PATH + '.pulled.json'
    seen = set(json.load(open(seen_path))) if os.path.exists(seen_path) else set()
    want = segs(folder) if folder else None
    got = []; written = set()
    for f in merged()['files']:
        if not f.get('contrib'): continue
        if want and f['folder'][:len(want)] != want: continue
        if link_id and f.get('link_id') != link_id: continue
        if new and f['id'] in seen: continue
        d = os.path.join(out, *f['folder']); os.makedirs(d, exist_ok=True)
        safe = re.sub(r'[\\/:*?"<>|]+', '-', f['name']).strip() or f['id']
        p = os.path.join(d, safe + ('.' + f['ext'] if f.get('ext') else ''))
        if p in written or (os.path.exists(p) and os.path.getsize(p) != f.get('size')):
            root_, ext_ = os.path.splitext(p); p = root_ + '-' + f['id'] + ext_
        written.add(p)
        with requests.get(BASE + '/admin/obj', params={'key': f['key']}, headers=H, timeout=900, stream=True) as r:
            r.raise_for_status()
            with open(p, 'wb') as fh:
                for ch in r.iter_content(1 << 20): fh.write(ch)
        seen.add(f['id']); got.append({'id': f['id'], 'path': p, 'size': os.path.getsize(p), 'uploader': f.get('uploader'), 'via': f.get('via'), 'added': f.get('added')})
    json.dump(sorted(seen), open(seen_path, 'w'))
    print(json.dumps(got, ensure_ascii=False, indent=1)); print(len(got), 'file(s) ->', out)

# ---------- secrets / backups ----------
import hashlib, tarfile, shutil, io, random
BACKUP_RE = re.compile(r'^(?P<slug>[a-z0-9-]+)-(?P<kind>full|meta)-(?P<ts>\d{8}T\d{6}Z)\.tar\.enc$')
OPENSSL = ['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-md', 'sha256', '-salt']

def _slug(): return (urllib.parse.urlparse(BASE).hostname or 'drive').split('.')[0]
def backup_paths():
    key = opt('--key') or os.environ.get('DRIVE_BACKUP_KEY') or DEFAULT_BACKUP_KEY
    bdir = opt('--dir') or os.environ.get('DRIVE_BACKUP_DIR') or os.path.join(DEFAULT_BACKUP_DIR, _slug() if BASE else '')
    return key, bdir
def check_key_apart(key, bdir):
    """The key must never sit with the backups (same folder, inside it, or the backups inside the key's folder)."""
    kd = os.path.dirname(os.path.abspath(key))
    if _inside(key, bdir) or _inside(bdir, kd) or _inside(kd, bdir):
        raise SystemExit(f'refused: backup key {key} and backups {bdir} must be in separate folders (keep the key in {SECRETS_DIR})')
    for p in secret_place_problems(key): raise SystemExit('refused: backup key is not in a locked place: ' + p)
    for r in UNSAFE_ROOTS:
        if os.path.isdir(r) and _inside(bdir, r): raise SystemExit(f'refused: backups must not be inside {r} (project / shared folder)')

def backup_key_cmd():
    key, _ = backup_paths()
    if os.path.exists(key):
        lock_file(key); print(json.dumps({'ok': True, 'key': key, 'existed': True, 'fingerprint': _fp(key)})); return
    write_secret(key, secrets.token_urlsafe(48) + '\n')
    print(json.dumps({'ok': True, 'key': key, 'created': True, 'fingerprint': _fp(key),
                      'note': 'without this key no backup can be restored: keep a second copy in another locked place, never next to the backups'}))
def _fp(key): return hashlib.sha256(open(key, 'rb').read().strip()).hexdigest()[:12]

class _HashRead:
    def __init__(self, raw): self.raw, self.h, self.n = raw, hashlib.sha256(), 0
    def read(self, n=-1):
        b = self.raw.read(n); self.h.update(b); self.n += len(b); return b

def backup(files=True):
    """Stream every stored object (except the login hashes file) into a tar, encrypted on the fly: no plain copy touches the disk."""
    key, bdir = backup_paths()
    if not os.path.exists(key): raise SystemExit(f'no backup key at {key}: run `drive.py backup-key` first')
    check_key_apart(key, bdir)
    objs = requests.get(BASE + '/admin/list', headers=H, timeout=120).json()['objects']
    objs = [o for o in objs if o['key'] != '_config.json' and not o['key'].startswith('_pending/')]
    if not files: objs = [o for o in objs if not o['key'].startswith(('f/', 't/'))]
    total = sum(o['size'] for o in objs)
    os.makedirs(bdir, exist_ok=True); os.chmod(bdir, 0o700)
    free = shutil.disk_usage(bdir).free
    if total + 300 * 2**20 > free: raise SystemExit(f'refused: backup needs ~{total >> 20} MB, only {free >> 20} MB free (use --no-files, or another --dir)')
    kind = 'full' if files else 'meta'
    name = f"{_slug()}-{kind}-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.tar.enc"
    out = os.path.join(bdir, name); part = out + '.partial'
    fd = os.open(part, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600); os.close(fd)
    p = subprocess.Popen(OPENSSL + ['-e', '-pass', 'file:' + key, '-out', part], stdin=subprocess.PIPE)
    index = []
    try:
        with tarfile.open(fileobj=p.stdin, mode='w|') as tar:
            for o in objs:
                r = requests.get(BASE + '/admin/obj', params={'key': o['key']}, headers=H, stream=True, timeout=900)
                if r.status_code == 404: continue
                r.raise_for_status(); r.raw.decode_content = True
                ti = tarfile.TarInfo(o['key']); ti.size = o['size']; ti.mtime = int(datetime.datetime.now().timestamp()); ti.mode = 0o600
                hr = _HashRead(r.raw); tar.addfile(ti, hr); r.close()
                index.append({'key': o['key'], 'size': o['size'], 'sha256': hr.h.hexdigest()})
            idx = json.dumps({'tool': 'teacher-drive', 'v': 1, 'kind': kind, 'created': now(), 'site': BASE, 'objects': index}, ensure_ascii=False).encode()
            ti = tarfile.TarInfo('_backup/index.json'); ti.size = len(idx); ti.mode = 0o600; tar.addfile(ti, io.BytesIO(idx))
        p.stdin.close()
        if p.wait() != 0: raise SystemExit('openssl failed')
    except BaseException:
        p.kill(); p.wait()
        if os.path.exists(part): os.remove(part)
        raise
    os.replace(part, out)
    print(json.dumps({'ok': True, 'backup': out, 'kind': kind, 'objects': len(index), 'bytes': total, 'encrypted_size': os.path.getsize(out)}))
    return out

def _decrypt_stream(path, key):
    return subprocess.Popen(OPENSSL + ['-d', '-pass', 'file:' + key, '-in', path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def verify(path, key=None, sample=1):
    """Restore test: decrypt the whole backup, check every object against its sha256, parse the manifest,
    check every file the manifest names is inside (full backups), and really extract a sample file to a temp folder."""
    key = key or backup_paths()[0]
    p = _decrypt_stream(path, key); seen = {}; man = None; idx = None; contrib = []
    picks = []; tmp = tempfile.mkdtemp(prefix='drive-verify-'); os.chmod(tmp, 0o700)
    try:
        with tarfile.open(fileobj=p.stdout, mode='r|') as tar:
            for m in tar:
                f = tar.extractfile(m); h = hashlib.sha256(); n = 0; keep = None
                if m.name in ('_manifest.json', '_backup/index.json') or m.name.startswith('_contrib/'): keep = io.BytesIO()
                spot = m.name.startswith('f/') and (len(picks) < sample or random.random() < 0.2)
                sf = open(os.path.join(tmp, 'sample'), 'wb') if spot else None
                while True:
                    b = f.read(1 << 20)
                    if not b: break
                    h.update(b); n += len(b)
                    if keep: keep.write(b)
                    if sf: sf.write(b)
                if sf:
                    sf.close(); sz = os.path.getsize(os.path.join(tmp, 'sample'))
                    picks = (picks + [(m.name, sz, h.hexdigest())])[-sample:]
                seen[m.name] = (n, h.hexdigest())
                if m.name == '_manifest.json': man = json.loads(keep.getvalue().decode('utf-8'))
                elif m.name == '_backup/index.json': idx = json.loads(keep.getvalue().decode('utf-8'))
                elif m.name.startswith('_contrib/') and m.name.endswith('.json'): contrib.append(json.loads(keep.getvalue().decode('utf-8')))
        err = p.stderr.read().decode(errors='replace'); rc = p.wait()
    except (tarfile.TarError, ValueError, json.JSONDecodeError) as e:
        p.kill(); p.wait(); shutil.rmtree(tmp, ignore_errors=True)
        return {'ok': False, 'backup': path, 'error': f'cannot read backup (wrong key or damaged file): {e}'}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    probs = []
    if rc != 0: probs.append('decrypt failed: ' + err.strip()[:200])
    if idx is None: probs.append('no index inside (not a complete backup)')
    if man is None: probs.append('no manifest inside')
    if idx:
        for o in idx['objects']:
            s = seen.get(o['key'])
            if not s: probs.append('missing ' + o['key'])
            elif s != (o['size'], o['sha256']): probs.append('damaged ' + o['key'])
        if idx.get('kind') == 'full' and man is not None:
            want = [f['key'] for f in man.get('files', []) if f.get('key')] + [e['key'] for e in contrib if e.get('key')]
            probs += ['manifest file not in backup: ' + k for k in want if k not in seen]
    res = {'ok': not probs, 'backup': path, 'kind': idx and idx.get('kind'), 'created': idx and idx.get('created'),
           'objects': len(seen) - 1, 'manifest_files': len((man or {}).get('files', [])),
           'sample_restored': [{'key': k, 'size': s, 'sha256_ok': seen.get(k, (0, ''))[1] == hx} for k, s, hx in picks]}
    if probs: res['problems'] = probs[:20]
    return res

def list_backups(bdir):
    out = []
    for fn in os.listdir(bdir) if os.path.isdir(bdir) else []:
        m = BACKUP_RE.match(fn)
        if m: out.append({'path': os.path.join(bdir, fn), 'kind': m['kind'],
                          'at': datetime.datetime.strptime(m['ts'], '%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)})
    return sorted(out, key=lambda b: b['at'], reverse=True)

def prune(days=14, months=3, dry=False, server_board_days=14):
    """Keep every backup from the last `days` days + the newest backup of each calendar month for `months` months;
    delete the rest. Never deletes anything unless the newest backup of that kind passes `verify` first."""
    key, bdir = backup_paths(); check_key_apart(key, bdir)
    nowt = datetime.datetime.now(datetime.timezone.utc); report = {'ok': True, 'kept': [], 'deleted': [], 'verified': []}
    for kind in ('full', 'meta'):
        bs = [b for b in list_backups(bdir) if b['kind'] == kind]
        if not bs: continue
        v = verify(bs[0]['path'], key); report['verified'].append(v)
        if not v['ok']:
            report['ok'] = False; report['refused'] = f'newest {kind} backup failed the restore test; nothing of this kind deleted'; continue
        months_kept = set()
        for i, b in enumerate(bs):                                   # newest first
            age = (nowt - b['at']).days; mk = (b['at'].year, b['at'].month)
            if i == 0 or age < days: keep = True
            elif age < months * 31 and mk not in months_kept: keep = True; months_kept.add(mk)
            else: keep = False
            (report['kept'] if keep else report['deleted']).append(os.path.basename(b['path']))
            if not keep and not dry: os.remove(b['path'])
    for fn in os.listdir(bdir) if os.path.isdir(bdir) else []:      # leftovers of a backup that broke off
        fp = os.path.join(bdir, fn)
        if fn.endswith('.partial') and nowt.timestamp() - os.path.getmtime(fp) > 86400:
            report['deleted'].append(fn)
            if not dry: os.remove(fp)
    if BASE and server_board_days:                                   # the board's daily safety copies on the site
        cut = (nowt - datetime.timedelta(days=server_board_days)).strftime('%Y-%m-%d')
        old = [o['key'] for o in requests.get(BASE + '/admin/list', headers=H, timeout=120).json()['objects']
               if o['key'].startswith('_projects/daily/') and o['key'][16:26] < cut]
        report['board_daily_deleted'] = len(old)
        if not dry:
            for k in old: _del(k)
    report['dry_run'] = dry
    print(json.dumps(report, ensure_ascii=False, indent=1, default=str))
    if not report['ok']: sys.exit(2)

def restore(path, out=None, to_site=False):
    key = backup_paths()[0]
    v = verify(path, key)
    if not v['ok']: raise SystemExit('refused: backup failed the restore test: ' + json.dumps(v, ensure_ascii=False))
    p = _decrypt_stream(path, key)
    if out:
        os.makedirs(out, exist_ok=True); os.chmod(out, 0o700)
        with tarfile.open(fileobj=p.stdout, mode='r|') as tar: tar.extractall(out, filter='data')
        p.wait(); print(json.dumps({'ok': True, 'restored_to': out, 'objects': v['objects']})); return
    if not to_site: raise SystemExit('give --out <folder> (local copy) or --to-site --yes (write back to the drive)')
    need(); types = {}; n = 0
    with tarfile.open(fileobj=p.stdout, mode='r|') as tar:
        for m in tar:
            if m.name.startswith('_backup/'): continue
            b = tar.extractfile(m).read()
            if m.name == '_manifest.json':
                for f in json.loads(b.decode('utf-8')).get('files', []):
                    if f.get('key'): types[f['key']] = f.get('type')
            ct = types.get(m.name) or ('image/jpeg' if m.name.startswith('t/') else 'application/json; charset=utf-8' if m.name.endswith('.json')
                                       else mimetypes.guess_type(m.name)[0] or 'application/octet-stream')
            _put(m.name, b, ct); n += 1
    p.wait(); print(json.dumps({'ok': True, 'restored_to_site': BASE, 'objects': n}))

def secure():
    """Move the config (admin key + codes) into the locked folder, lock the backup key, and scan the project for leaked secrets."""
    os.makedirs(SECRETS_DIR, exist_ok=True); os.chmod(SECRETS_DIR, 0o700); moved = []
    src = CFG_PATH
    if os.path.exists(src) and os.path.realpath(src) != os.path.realpath(DEFAULT_CFG) and not _cfg_arg:
        if os.path.exists(DEFAULT_CFG): raise SystemExit(f'{DEFAULT_CFG} already exists; compare it with {src} by hand')
        write_secret(DEFAULT_CFG, open(src).read())
        for extra in ('.pulled.json',):
            if os.path.exists(src + extra): shutil.move(src + extra, DEFAULT_CFG + extra)
        os.remove(src); moved.append(f'{src} -> {DEFAULT_CFG}')
    for p in (DEFAULT_CFG if not _cfg_arg else CFG_PATH, DEFAULT_BACKUP_KEY): lock_file(p)
    cfg = json.load(open(DEFAULT_CFG if not _cfg_arg else CFG_PATH)) if os.path.exists(DEFAULT_CFG if not _cfg_arg else CFG_PATH) else CFG
    needles = [v for k, v in cfg.items() if k in ('admin_key', 'code', 'contributor_code') and v and len(str(v)) >= 6]
    leaks = []
    for root in [PROJECT_DIR, '/home/user/tab/files', '/home/user/tab/memory']:
        for dp, dn, fns in os.walk(root) if os.path.isdir(root) else []:
            dn[:] = [x for x in dn if x not in ('node_modules', '.git')]
            for fn in fns:
                fp = os.path.join(dp, fn)
                if fn.lower().endswith(('.mp4', '.mp3', '.m4a', '.wav', '.ogg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mov', '.enc')): continue
                try:
                    if os.path.getsize(fp) > 20 * 2**20: continue
                    data = open(fp, 'rb').read()
                except OSError: continue
                if any(str(n).encode() in data for n in needles if len(str(n)) > 6) or (b'admin_key' in data and fn.endswith('.json')):
                    leaks.append(fp)
    print(json.dumps({'ok': not leaks, 'moved': moved, 'config': DEFAULT_CFG if not _cfg_arg else CFG_PATH,
                      'secret_problems': secret_place_problems(DEFAULT_CFG if not _cfg_arg else CFG_PATH),
                      'files_holding_a_secret': leaks, 'note': 'delete or clean every file listed; a code that leaked: change it (drive.py code / contrib-code)'},
                     ensure_ascii=False, indent=1))

if __name__ == '__main__':
    a = ARGS
    if not a or a[0] in ('-h', '--help', 'help'): print(__doc__); sys.exit(0)
    cmd = a[0]
    if cmd == 'setup': setup(a[1]); sys.exit(0)
    if cmd == 'backup-key': backup_key_cmd(); sys.exit(0)
    if cmd == 'secure': secure(); sys.exit(0)
    if cmd == 'verify':
        k, bd = backup_paths(); bs = list_backups(bd)
        tg = [a[1]] if len(a) > 1 else [next(b['path'] for b in bs if b['kind'] == kd) for kd in ('full', 'meta') if any(b['kind'] == kd for b in bs)]
        if not tg: raise SystemExit('no backups in ' + bd)
        rs = [verify(t, k) for t in tg]; print(json.dumps(rs if len(rs) > 1 else rs[0], ensure_ascii=False, indent=1))
        sys.exit(0 if all(r['ok'] for r in rs) else 2)
    if cmd == 'backups':
        k, bd = backup_paths()
        for b in list_backups(bd): print(b['at'].strftime('%Y-%m-%d %H:%M'), b['kind'], os.path.getsize(b['path']), b['path'])
        sys.exit(0)
    if cmd == 'restore':
        o = opt('--out'); ts = flag('--to-site')
        if ts and not flag('--yes'): raise SystemExit('--to-site overwrites objects on the drive with the backup copy; add --yes')
        restore(a[1], o, ts); sys.exit(0)
    need()
    if cmd == 'settings': settings()
    elif cmd == 'add':
        note, rep = opt('--note'), opt('--replace'); print(json.dumps(add(a[1], a[2], a[3], note, rep), ensure_ascii=False, indent=1))
    elif cmd == 'link':
        desc, img, rep = opt('--desc'), opt('--image'), opt('--replace'); og = flag('--og')
        print(json.dumps(link(a[1], a[2], a[3], desc, img, og, rep), ensure_ascii=False, indent=1))
    elif cmd == 'list':
        mm = merged()
        if flag('--json'): print(json.dumps(mm, ensure_ascii=False, indent=1)); sys.exit(0)
        for f in mm['files']:
            if f.get('kind') == 'link': print(f['id'], '/'.join(f['folder']), '|', f['name'], '🔗', f['url']); continue
            extra = f"  ⬆ {f.get('uploader') or 'משתתף'}{' via ' + f['via'] if f.get('via') else ''} {f.get('added', '')[:16]}" if f.get('contrib') else ''
            print(f['id'], '/'.join(f['folder']), '|', f['name'], f.get('ext', ''), f.get('size', 0), extra)
    elif cmd == 'remove': print(json.dumps(remove(a[1]), ensure_ascii=False))
    elif cmd == 'move': print(json.dumps(move(a[1], folder=a[2]), ensure_ascii=False))
    elif cmd == 'rename': print(json.dumps(move(a[1], name=a[2]), ensure_ascii=False))
    elif cmd == 'adopt': print(json.dumps(adopt(a[1], a[2] if len(a) > 2 else None), ensure_ascii=False))
    elif cmd == 'folder': icon = opt('--icon'); folder_cmd(a[1], icon); print('ok')
    elif cmd == 'check-links': check_links()
    elif cmd == 'upload-link':
        label = opt('--label', 'קישור העלאה'); days = int(opt('--days', '30')); sub = not flag('--no-subfolders')
        upload_link(a[1], label, days, sub)
    elif cmd == 'upload-links': upload_links()
    elif cmd == 'revoke': revoke(a[1])
    elif cmd == 'pull':
        fo, li, out = opt('--folder'), opt('--link'), opt('--out'); new = flag('--new'); pull(fo, li, new, out)
    elif cmd == 'backup':
        out = backup(files=not flag('--no-files'))
        if flag('--prune'): prune(int(opt('--keep-days', '14')), int(opt('--keep-months', '3')), flag('--dry-run'))
    elif cmd == 'prune': prune(int(opt('--keep-days', '14')), int(opt('--keep-months', '3')), flag('--dry-run'))
    elif cmd == 'wipe':
        if not flag('--yes'): raise SystemExit('this deletes everything on the drive; run `wipe --yes` to confirm')
        r = requests.post(BASE + '/admin/wipe', json={'confirm': 'DELETE EVERYTHING'}, headers=H, timeout=300); r.raise_for_status(); print(r.text)
    elif cmd in ('code', 'contrib-code'):
        if not re.fullmatch(r'\d{6}', a[1]): raise SystemExit('6 digits')
        r = requests.post(BASE + ('/admin/code' if cmd == 'code' else '/admin/contrib_code'), json={'code': a[1]}, headers=H, timeout=30); print(r.text)
        if r.ok and os.path.exists(CFG_PATH): CFG['code' if cmd == 'code' else 'contributor_code'] = a[1]; save_cfg()
    else: print(__doc__); sys.exit(1)
