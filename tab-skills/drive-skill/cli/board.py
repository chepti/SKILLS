#!/usr/bin/env python3
"""board.py: the projects board of a Teacher Drive (the site's #projects page).

Stored in the drive's storage under _projects/board.json (not the files manifest). The page saves through
GET/PUT /api/board (viewer session); this CLI uses the admin key. Last write wins; an open page refreshes every 45 s.
Config: the same as drive.py (--config <file> | env DRIVE_CONFIG | env DRIVE_BASE + DRIVE_ADMIN_KEY | /home/user/tab/state/secrets/teacher-drive.json, chmod 600).

Usage:
  board.py get [--json]                              # readable summary (or raw JSON)
  board.py put <file.json>                           # replace the whole board ({"projects":[...]})
  board.py add-project "<title>" [--desc ".."] [--link URL]... [--status me|tab|other|none] [--top] [--task ".."]...
  board.py add-subtask "<project>" "<text>" [--who her|tab] [--first]
                                                     # --who omitted: guessed (decide/review/listen/send/film… → her = the teacher, else tab)
  board.py who "<project>" "<subtask>" her|tab       # who the subtask waits on (her = the teacher, tab = Tab)
  board.py done | undone | remove-subtask "<project>" "<subtask>"
  board.py edit-subtask "<project>" "<subtask>" "<new text>"
  board.py status "<project>" me|tab|other|none      # me = waiting on the teacher, tab = Tab working, other = waiting on someone else
  board.py finish | restore "<project>"
  board.py rename "<project>" "<new title>" [--desc ".."]
  board.py move "<project>" <position 1..N>          # reorder projects (= change the teacher's priority only when she asked)
  board.py move-subtask "<project>" "<subtask>" <position 1..k>   # reorder among the project's open subtasks
  board.py prio [--who tab|her|all] [--json]          # THE TEACHER'S PRIORITY ORDER: what to advance first (default --who tab)
PRIORITY: the teacher drags ⠿ (or taps ▲▼) on the page; array order = her priority. Every project has "rank" (1 = top, among
active projects; done = null) and every task has "rank" (1 = first among the open tasks of its project; done = null).
The page saves the order on drop; the server and this CLI re-stamp rank on every write; GET /api/board stamps it too.
"prio" lists open tasks sorted by (project rank, task rank). Read it before choosing what to work on, and don't reorder
her board yourself unless she asks (new projects go to the bottom of the active list, new tasks to the end).
"<project>" / "<subtask>" = id, or any unique part of the title/text (case-insensitive).
The page shows two columns, "⏳ מחכה ל<owner>" and "🤖 מחכה ל-Tab" (owner = the name in the Drive settings).
"""
import json, re, sys, os, secrets, string, datetime, requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv[1:]
if '--config' in _a:
    i = _a.index('--config'); os.environ['DRIVE_CONFIG'] = _a[i + 1]; del sys.argv[i + 1:i + 3]
import drive
if not drive.BASE: sys.exit('no drive config (see drive.py setup)')
BASE, H = drive.BASE, drive.H
try: OWNER = requests.get(BASE + '/admin/settings', headers=H, timeout=30).json()['settings']['owner']
except Exception: OWNER = 'מורה'
KEY = '_projects/board.json'
ST = {'me': 'מחכה ל' + OWNER, 'tab': 'Tab עובד', 'other': 'מחכה למישהו', 'none': ''}
WHO = {'her': OWNER, 'tab': 'Tab'}
HER_RE = re.compile(r'ביקורת|להחליט|החלטה|להאזין|האזנה|לבחור|בחירה|לשלוח|משוב|להעביר|לצלם|צילום|לאשר|אישור|לקרוא|לצפות|צפייה|לספר|לתת שם|למלא|ממני')
def infer_who(text): return 'her' if HER_RE.search(text or '') else 'tab'
def sync(b):
    for p in b['projects']:
        for t in p.get('tasks', []):
            if t.get('who') not in WHO: t['who'] = infer_who(t.get('text', ''))
        o = [t for t in p.get('tasks', []) if not t.get('done')]
        if p.get('status') in ('me', 'tab') and o: p['status'] = 'me' if any(t['who'] == 'her' for t in o) else 'tab'
    rank(b)

def rank(b):
    r = 0
    for p in b['projects']:
        if not p.get('done'): r += 1; p['rank'] = r
        else: p['rank'] = None
        k = 0
        for t in p.get('tasks', []):
            if not t.get('done'): k += 1; t['rank'] = k
            else: t['rank'] = None
    return b

def now(): return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
def rid(p): return p + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))

def get():
    r = requests.get(BASE + '/admin/obj', params={'key': KEY}, headers=H, timeout=60)
    if r.status_code == 404: return {'version': 1, 'updatedAt': None, 'projects': []}
    r.raise_for_status(); return rank(json.loads(r.content.decode('utf-8')))

def put(b):
    old = requests.get(BASE + '/admin/obj', params={'key': KEY}, headers=H, timeout=60)
    if old.status_code == 200:
        requests.put(BASE + '/admin/obj', params={'key': '_projects/board.prev.json'}, data=old.content, headers={**H, 'content-type': 'application/json'}, timeout=60)
    sync(b); b['version'] = 1; b['updatedAt'] = now(); b['updatedBy'] = 'tab'
    r = requests.put(BASE + '/admin/obj', params={'key': KEY}, data=json.dumps(b, ensure_ascii=False).encode(), headers={**H, 'content-type': 'application/json; charset=utf-8'}, timeout=60)
    r.raise_for_status(); return b

def find(items, q, field):
    for x in items:
        if x['id'] == q: return x
    m = [x for x in items if q.lower() in x.get(field, '').lower()]
    if len(m) == 1: return m[0]
    exact = [x for x in m if x.get(field, '').strip().lower() == q.strip().lower()]
    if len(exact) == 1: return exact[0]
    sys.exit(f'"{q}": {"no match" if not m else str(len(m)) + " matches: " + " / ".join(x.get(field, "") for x in m)}')

def proj(b, q): return find(b['projects'], q, 'title')
def reorder_tasks(p):
    p['tasks'] = [t for t in p['tasks'] if not t.get('done')] + [t for t in p['tasks'] if t.get('done')]

def summary(b):
    act = [p for p in b['projects'] if not p.get('done')]; dn = [p for p in b['projects'] if p.get('done')]
    print(f"updated {b.get('updatedAt')} by {b.get('updatedBy', '?')} · {len(act)} active, {len(dn)} done")
    for w, lab in (('her', '⏳ מחכה ל' + OWNER), ('tab', '🤖 מחכה ל-Tab')):
        rows = [(p['title'], t['text']) for p in act for t in p['tasks'] if not t.get('done') and t.get('who', infer_who(t.get('text', ''))) == w]
        print(f"\n{lab} ({len(rows)}):"); [print(f"   · {t}  — {pt}") for pt, t in rows]
    for i, p in enumerate(act, 1):
        nxt = next((t['text'] for t in p['tasks'] if not t.get('done')), '—')
        print(f"\n#{i}. {p['title']}  [{ST.get(p.get('status') or 'none', '')}]  ({p['id']})")
        if p.get('desc'): print('   ' + p['desc'])
        for l in p.get('links', []): print('   🔗 ' + l['url'])
        print('   ▶ הבאה: ' + nxt)
        for t in p['tasks']: print(f"   {'☑' if t.get('done') else '☐' + str(t.get('rank'))} [{WHO.get(t.get('who'), '?')}] {t['text']}  ({t['id']})")
    if dn:
        print('\nהסתיימו:')
        for p in dn: print(f"   ✓ {p['title']}  ({p.get('doneAt', '')[:10]}, {p['id']})")

def opt(args, name, multi=False):
    vals = []
    while name in args:
        i = args.index(name); vals.append(args[i + 1]); del args[i:i + 2]
    return vals if multi else (vals[-1] if vals else None)
def flag(args, name):
    if name in args: args.remove(name); return True
    return False

def main(a):
    if not a: print(__doc__); return
    cmd, a = a[0], a[1:]
    if cmd == 'get':
        b = get(); print(json.dumps(b, ensure_ascii=False, indent=1)) if flag(a, '--json') else summary(b); return
    if cmd == 'put':
        b = json.load(open(a[0])); assert isinstance(b.get('projects'), list); put(b); print('ok', len(b['projects']), 'projects'); return
    if cmd == 'prio':
        who = opt(a, '--who') or 'tab'; js = flag(a, '--json'); b = get()
        rows = [{'order': 0, 'project_rank': p['rank'], 'task_rank': t['rank'], 'project': p['title'], 'project_id': p['id'], 'task': t['text'], 'task_id': t['id'], 'who': t.get('who')}
                for p in b['projects'] if not p.get('done') for t in p['tasks'] if not t.get('done') and (who == 'all' or t.get('who') == who)]
        rows.sort(key=lambda x: (x['project_rank'], x['task_rank']))
        for i, x in enumerate(rows, 1): x['order'] = i
        if js: print(json.dumps(rows, ensure_ascii=False, indent=1)); return
        print(f"priority order ({who}; board updated {b.get('updatedAt')} by {b.get('updatedBy', '?')}):")
        for x in rows: print(f"{x['order']:>3}. [P{x['project_rank']}·{x['task_rank']}] {x['project']}  →  {x['task']}" + ('' if who != 'all' else f"  [{WHO.get(x['who'], '?')}]"))
        return
    b = get()
    if cmd == 'add-project':
        desc, status, links, tasks, top = opt(a, '--desc'), opt(a, '--status') or 'me', opt(a, '--link', True), opt(a, '--task', True), flag(a, '--top')
        p = {'id': rid('p'), 'title': a[0], 'desc': desc or '', 'links': [{'url': u, 'label': ''} for u in links], 'status': '' if status == 'none' else status,
             'done': False, 'doneAt': None, 'createdAt': now(), 'tasks': [{'id': rid('t'), 'text': t, 'who': infer_who(t), 'done': False, 'doneAt': None} for t in tasks]}
        if top: b['projects'].insert(0, p)
        else:
            k = max([i for i, x in enumerate(b['projects']) if not x.get('done')] or [-1]) + 1; b['projects'].insert(k, p)
    elif cmd == 'add-subtask':
        first = flag(a, '--first'); who = opt(a, '--who'); assert who in (None, 'her', 'tab'), '--who her|tab'
        p = proj(b, a[0]); t = {'id': rid('t'), 'text': a[1], 'who': who or infer_who(a[1]), 'done': False, 'doneAt': None}
        op = [x for x in p['tasks'] if not x.get('done')]; dn = [x for x in p['tasks'] if x.get('done')]
        (op.insert(0, t) if first else op.append(t)); p['tasks'] = op + dn
    elif cmd in ('done', 'undone'):
        p = proj(b, a[0]); t = find(p['tasks'], a[1], 'text'); t['done'] = cmd == 'done'; t['doneAt'] = now() if t['done'] else None
        if t['done']: p['tasks'].remove(t); op = [x for x in p['tasks'] if not x.get('done')]; p['tasks'] = op + [t] + [x for x in p['tasks'] if x.get('done')]
        else: reorder_tasks(p)
    elif cmd == 'remove-subtask':
        p = proj(b, a[0]); t = find(p['tasks'], a[1], 'text'); p['tasks'].remove(t)
    elif cmd == 'edit-subtask':
        p = proj(b, a[0]); find(p['tasks'], a[1], 'text')['text'] = a[2]
    elif cmd == 'who':
        assert len(a) == 3 and a[2] in WHO, 'who "<project>" "<subtask>" her|tab'
        p = proj(b, a[0]); find(p['tasks'], a[1], 'text')['who'] = a[2]
    elif cmd == 'status':
        p = proj(b, a[0]); assert a[1] in ST, 'status: me|tab|other|none'; p['status'] = '' if a[1] == 'none' else a[1]
    elif cmd == 'finish':
        p = proj(b, a[0]); p['done'] = True; p['doneAt'] = now()
    elif cmd == 'restore':
        p = proj(b, a[0]); p['done'] = False; p['doneAt'] = None; b['projects'].remove(p)
        k = max([i for i, x in enumerate(b['projects']) if not x.get('done')] or [-1]) + 1; b['projects'].insert(k, p)
    elif cmd == 'rename':
        desc = opt(a, '--desc'); p = proj(b, a[0]); p['title'] = a[1]
        if desc is not None: p['desc'] = desc
    elif cmd == 'move':
        p = proj(b, a[0]); act = [x for x in b['projects'] if not x.get('done') and x is not p]; dn = [x for x in b['projects'] if x.get('done')]
        act.insert(max(0, min(len(act), int(a[1]) - 1)), p); b['projects'] = act + dn
    elif cmd == 'move-subtask':
        p = proj(b, a[0]); t = find([x for x in p['tasks'] if not x.get('done')], a[1], 'text')
        op = [x for x in p['tasks'] if not x.get('done') and x is not t]; dn = [x for x in p['tasks'] if x.get('done')]
        op.insert(max(0, min(len(op), int(a[2]) - 1)), t); p['tasks'] = op + dn
    else:
        sys.exit('unknown command; run without arguments for help')
    put(b); summary(b)

if __name__ == '__main__': main(sys.argv[1:])
