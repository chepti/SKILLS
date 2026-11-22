# Agent-readiness (AGENTS)

An app a human can use but an agent can't drive is only half shipped. The test
is simple: **can an agent discover what this app does, and then do it, starting
from nothing but the URL?**

If the app holds no data at all (a brochure page, a client-side one-off), say so
in one sentence and stop — don't invent an API layer.

## The seven points

### 1. A self-describing endpoint, no auth
`GET ?action=help` (or `/api/help`) returns JSON listing every action, its
fields, allowed values, and an example. **No password**, so an agent can learn
the contract from one URL.

Only the *contract* is public — never the data. If describing an action would
leak schema you consider sensitive, that's a signal the data model needs
rethinking, not that help should be gated.

```json
{
  "name": "Reading Tracker",
  "version": "1.2.0",
  "auth": { "type": "header", "name": "X-Key", "also": "?key=" },
  "actions": {
    "list":   { "method": "GET",  "params": {}, "returns": "array of items" },
    "create": { "method": "POST", "params": {
                  "title":  { "type": "string", "required": true },
                  "status": { "type": "enum", "values": ["todo","doing","done"] }
                }, "example": { "title": "פרק 3", "status": "todo" } },
    "update": { "method": "POST", "params": {
                  "match": { "type": "string", "note": "כותרת מלאה או חלקית" },
                  "id":    { "type": "string" },
                  "status":{ "type": "enum", "values": ["todo","doing","done"] }
                } },
    "delete": { "method": "POST", "params": { "id": { "type": "string" } } }
  },
  "endpoints": { "state": "?action=state", "ops": "?action=ops" }
}
```

### 2. Read **and** write over HTTP
Read-only is not enough — an agent must create, update, and delete. Every action
reachable with a plain HTTP request; no form-only flows.

### 3. Auth in a header or query param
`X-Key: <secret>` or `?key=<secret>`. **Not** a cookie session — an agent can't
log in through a form. Accept both header and param; the header is preferred,
the param is the fallback for tools that can't set headers.

Keep the key out of the client bundle and out of git (see the secrets item in
SKILL.md).

### 4. A compact state snapshot
`GET ?action=state` returns the current state in a **token-frugal** shape so an
agent doesn't have to pull everything. Short keys, no redundant nesting, no HTML,
no base64 blobs. Support `?since=<timestamp>` or a `limit` when the dataset can
grow.

```json
{ "count": 3, "items": [
  { "id": "a1", "t": "פרק 3", "s": "doing" },
  { "id": "a2", "t": "פרק 4", "s": "todo" }
] }
```

### 5. Batched operations
`POST ?action=ops` takes an array of operations in one request and returns a
per-operation result, so one round trip replaces dozens. **Report each result
separately** — a partial failure must not look like a total failure.

```json
// request
{ "ops": [
  { "op": "create", "title": "פרק 5" },
  { "op": "update", "match": "פרק 3", "status": "done" },
  { "op": "delete", "id": "zz9" }
] }

// response
{ "results": [
  { "ok": true,  "op": "create", "id": "a7" },
  { "ok": true,  "op": "update", "id": "a1" },
  { "ok": false, "op": "delete", "error": "not_found", "id": "zz9" }
] }
```

### 6. Addressing by human-readable name
An agent rarely knows internal ids. Accept `{"match": "part of the title"}`
alongside `id`. On ambiguity, **return the candidates** — never a bare error:

```json
{ "ok": false, "error": "ambiguous", "candidates": [
  { "id": "a1", "title": "פרק 3 — חלק א" },
  { "id": "a4", "title": "פרק 3 — חלק ב" }
] }
```

That single behaviour is what lets an agent recover on its own instead of
giving up.

### 7. Discovery files
- **`llms.txt`** at the site root — a short Markdown map of what this is and
  where the API lives.
- **`AGENT.md`** — a paste-ready system prompt so a user can point any agent at
  the app in seconds.

Templates for both are in `snippets.md`.

## Design notes

- **Errors:** always `{"ok": false, "error": "<machine_code>", "message":
  "<human text>"}`. A machine code an agent can branch on beats prose.
- **Idempotency:** if an op can be retried, make retries safe (accept a client
  `opId` and ignore duplicates), so a network hiccup doesn't double-create.
- **CORS:** if agents or other origins will call it from a browser, send
  `Access-Control-Allow-Origin` and handle `OPTIONS`. Server-side agents don't
  need it — don't open it wider than necessary.
- **Rate limits / size caps:** cap request body size and ops-per-batch, and say
  the limits in `help` so an agent can chunk correctly.
- **Versioning:** put a `version` in `help`. If you break the contract, bump it.

## Verify

```
curl -s 'https://example.com/app/?action=help' | head -40
curl -s 'https://example.com/app/?action=state' -H 'X-Key: ...'
curl -s 'https://example.com/app/?action=ops' -H 'X-Key: ...' \
     -H 'Content-Type: application/json' \
     -d '{"ops":[{"op":"create","title":"test"}]}'
```

`node scripts/check-launch.mjs <url> --agent` probes the first, fourth, and
seventh points automatically. The rest need the key, so check them by hand.

Three things to confirm by hand:
1. `help` works **without** any key.
2. A wrong key is rejected with a clear error, not a 500 or an HTML login page.
3. A batch with one bad op still returns the good ones' results.
