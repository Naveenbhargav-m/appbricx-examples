---
name: appbricx
description: Build or change a full-stack app on the appbricx runtime — tables, roles, who may read/write which rows (Postgres RLS), sign-in per role, workflows (on data change, schedule, webhook), seed data and pages — by writing an app contract and applying it through the appbricx MCP tools. Use whenever the user wants a backend, an app with roles/permissions, an internal tool, a client portal or a shop on appbricx, or asks to check, verify or deploy an appbricx project.
when_to_use: The appbricx MCP server is connected (tools named *appbricx*), or the user mentions appbricx, an app contract, or appbricx.json.
---

# Building on appbricx

appbricx is an application runtime. You write the app's **contract** — a
JSON description of tables, roles, access, workflows, seeds and pages — and
the platform builds the rest: a per-project Postgres with row-level
security for every role, demo sign-ins, armed workflows, a data API and
compiled React pages. To build the app you never write SQL, auth, RLS
policies or webhook plumbing. Once it runs, the operate tools (below) let
you hand-tune and fix it directly; read "Changes made by hand with SQL" below
first.

## Connecting

The appbricx MCP server signs in with the browser (OAuth). If the appbricx
tools are missing or answer "unauthorized", ask the user to run `/mcp`,
pick **appbricx** and choose **Authenticate**: a browser window opens, they
sign in to Appbricx and click **Authorize**, and the tools work from then
on. In CI, a personal access token in `APPBRICX_TOKEN` is the alternative
(see the plugin README). Never ask the user to paste a token into the chat.

## The loop (always in this order)

1. `whoami`, then `list_projects` / `create_project` (or use the pinned project).
2. `get_contract`. Null = new project.
3. Call `get_guide` once (no arguments): the loop, contract shape, ACCESS and
   workflows, plus an index. Fetch other parts with `get_guide({ section })`
   (`pages`, `blocks`, `coordinates`, `seeds`, `patch`, `icons`, `components`,
   `functions`, `payments`, `operate`) only when you need them.
4. Write the contract. Start from [example.contract.json](example.contract.json)
   (a field-ops app: 3 tables, 2 roles, ownership by assignment, an event workflow
   and a daily digest) and change it to fit.
5. `check_contract` — `errors` must be empty. Read every `fixes` line: each is
   something the normalizer guessed. Make it explicit in the contract.
6. `apply_contract` — builds DEV. The reply lists demo sign-ins per role.
7. `screenshot` — **look at every screen you built** (phone size by default;
   `as` a persona, or `"guest"` for the sign-in screen). Compare with the
   user's reference/brief and fix what you see: wrong colours or fonts,
   anything cut off, hidden behind a bar, overflowing sideways. Don't report
   a visual change you haven't screenshotted.
8. `verify` — repeat 4→8 until `status` is `"pass"`. Each failing check has
   `evidence` and `fix`. Fix the **contract**, never work around the runtime.
9. `deploy` only when the user asks. It re-runs verify and refuses on red.
   Pass `subdomain` — a short, meaningful name for the app (`"tablefor"`) —
   and share the published URL it returns (`https://tablefor.<publish domain>`).
   Both take minutes: when `verify` or `deploy` answers `status: "running"`,
   call it again — that waits on the same run and returns its result.

## Templates first

Before writing a whole app or a common feature yourself, call
`search_templates` (`query`, `kind`: app, block, workflow, component). There
are checked templates for organisations and teams, Stripe subscriptions and
one-off payments, a booking calendar, comments with mentions, notifications,
a welcome email, booking reminders, digests, overdue alerts, reply-deadline
escalation, a trend chart, a CSV export, and ten complete showcase apps.
`get_template({ slug })` shows what it adds and its `params` (where it
attaches to the user's tables and roles). `use_template` with
`dry_run: true` returns the merged diff and the check report; without it, it
applies to dev. An app template creates a new project. Names that clash are
refused: pass `prefix`. See `get_guide({ section: "templates" })`.

For small edits after the first apply, prefer `patch_contract` with typed ops
(`add_field`, `add_entity`, `adopt_table`, `set_workflow`, …) over resending the whole
contract — it can't accidentally drop anything.

## What to get right the first time

- **Roles are personas.** `kind: "staff"` manages shared records; `kind:
  "consumer"` acts through pages (orders, bookings, posts). The FIRST consumer
  persona is the public sign-up. No consumer at all = an invite-only app
  (staff add people from the generated Team & access page).
- **Access is derived and enforced in Postgres.** Only add `access` where the
  default is wrong. "Each technician sees only their jobs" =
  `"owner_refs": ["technician"]` + `"access": { "technician": { "read": "own", "update": "own" } }`.
  "Shoppers see only their own orders" = `"access": { "shopper": { "create": true, "read": "own" } }`.
  Signed-out visitors never see more than a signed-in consumer.
- **Names:** snake_case, singular entities. Never declare `id`, `created_at`,
  `updated_at`, `user_id`, `org_id`, `created_by` — every table has them.
- **Seeds:** optional. Seed `id`s ("t1") are labels for refs between seed rows;
  the platform maps them to UUIDs. After the first apply, omit `seeds` to keep
  all rows.
- **Pages:** optional. Omit them and each table gets a list + form page for its
  staff roles. Add pages (PAGE GRAMMAR in the guide) when consumers need a real
  flow, e.g. a catalog to browse and an order form.
- **Workflows:** `notify` / `email` / `integration` steps cover nearly
  everything. A notification about ONE person's record goes to that person:
  `{ "action": "notify", "to": "technician", ... }` (a ref to a persona's entity) —
  a role-wide notify shows the text to the whole role; `custom` code is a last resort and must pass a strict type check
  (a failing step is dropped — `check_contract` tells you why).
- The data model only grows: removing a field hides it from the app, but the
  column and its data stay.

## Changes made by hand with SQL

You may add tables, extra columns, indexes, views, functions, triggers,
constraints or policies to the DEV database yourself. The platform keeps them:

- `apply_contract` / `patch_contract` never drop or rewrite them. If a contract
  change would break one, the apply fails and names it; nothing runs. Fix the
  object or the contract, then apply again. Common case: a `SELECT *` view
  on an entity blocks changes to that entity's text fields. Write the view's
  columns out instead.
- A table you made gets the app roles' grants and, once, row-level security
  with no policies: only admin access can use it. To make it part of the app
  (pages, the data API, per-role access), adopt it rather than declaring a
  same-named entity:
  `patch_contract [{ "op": "adopt_table", "table": "supplier", "personas": ["staff"], "access": { "staff": { "read": "all", "create": true, "update": "all", "delete": "all" } } }]`.
  The columns are read from the database and become fields. The table and
  its rows are kept. It needs a single-column primary key named `id` (uuid,
  so other tables can ref it). Details: `get_guide({ section: "patch" })`.
- `deploy` carries these objects to production in dependency order. A change
  that would need a DROP there (a view whose columns changed shape, a
  function with a new return type) is held back until the user explicitly
  asks for a destructive publish. Tell them when that happens.

## Custom UI — your own React components

Owning the whole look:
- `"chrome": "none"` on a page → your component draws the entire screen
  (its own header and tab bar).
- `"app": { "brand_color": "#FFC629" }` → the exact brand colour on buttons,
  links, focus rings and the platform's sign-in screen.
- `"auth": { "screen": "MyLogin" }` → your own sign-in / sign-up screen (a code
  component using `app.auth.signIn / signUp`); keep "Email" / "Password"
  labels and a "Sign in" button.
- `"auth": { "google": true }` → "Continue with Google", no Google Cloud setup.
  On your own screen, render `app.auth.providers` as buttons calling
  `app.auth.startProvider(p.name)`. Design the screen for this app; avoid
  defaulting to a photo-left / form-right split.
- `entities[].rules` → rules the server enforces BEFORE a write (e.g. who may
  send the first message); a refused write is not saved. Use these instead of
  "flag it in a workflow afterwards".
- `motion/react` in components → real motion: enter/exit transitions,
  shared-element layout animations, springy drag (swipe decks, drag-to-reorder
  boards), scroll effects. `qrcode.react` for QR codes.
- `recharts` in components → real charts (line, bar, area, pie, radar,
  scatter, composed) inside a fixed-height `ResponsiveContainer`, coloured
  with `hsl(var(--primary))`.
- Primitives for the rest, from `@app/kit/primitives`:
  `<MapView markers={[{ lat, lng, label }]} />` (OpenStreetMap, no API key),
  `<Embed url="https://youtu.be/…" title="Tour" />` (YouTube, Vimeo, Google
  Maps, Loom, Figma, Calendly, Spotify, Typeform, Google Forms, CodePen in a
  sandboxed frame; other URLs become a link card),
  `<RichTextEditor value={md} onChange={setMd} />` + `<Markdown text={md} />`
  (rich text stored as markdown in a text field). Raw `<iframe>` stays banned.
- `<form onSubmit={(e) => { e.preventDefault(); … }}>` works (Enter to submit,
  `required` / `type="email"` validation); no `action` / `method` / `target`.
- `app.ai.ask(prompt, { system })` / `app.ai.chat(messages)` in components →
  the app's own AI (summaries, suggested replies, triage, hints), metered to
  the project. Call it on a user action and catch the rejection.
- **Server functions** (`get_guide({ section: "functions" })`) → your own
  server code. Need a third-party API (Stripe, a weather API, your CRM)?
  Declare a workflow with `"on": { "call": true, "roles": ["member"] }` and
  one `custom` step whose code uses `ctx.http.fetch` with a key from
  `ctx.secrets.get("NAME")` (an environment variable the app owner sets) and
  `return`s the data; call it from the component with
  `const data = await app.call<T>("<workflow id>", input)`. It runs
  server-side as the signed-in caller (`ctx.db` is row-secured to them,
  `user` is `{ id, role, … }`), so secrets never reach the browser. No
  `roles` = any signed-in user; `"public": true` = signed-out visitors too.
  Errors reject `app.call` with the thrown message; 30 s limit, no retries.
- **Payments** (`get_guide({ section: "payments" })`) → declare `basket`,
  create the order + line rows, then
  `await app.pay.checkout("order", orderId, "offline")` — the server
  computes the amount from the lines; the component never sends one.
  "offline" records a payment due (pay at pickup). "card" (listed by
  `app.pay.methods()` once the owner connects Stripe) sends the shopper to
  Stripe Checkout; back on the page, `app.pay.returned()` gives the order and
  `await app.pay.confirm("order", orderId)` asks Stripe and marks it "paid".
  Payment state lives in a platform ledger (`app.pay.status("order", id)`),
  not on the order row: give the order a status enum staff move along.
- Demo logins are readable (`ava@<app>.test` + a word password). When the user
  names logins, put them on `demo_logins` entries (`email`, `password`) or in
  `accounts` — they are used exactly as written.

Blocks are the fast path; when the app needs its own look or interaction
(a swipe stack with photo carousels, a chat thread, a profile editor), write
**custom code components** and place them on pages:

1. `get_guide({ section: "components" })` — the standard signature: one
   default-exported React component with its declared props **plus
   `app: AppHandle`** (rows / query / create / update / transition / upload /
   live / navigate / `me(entity)` / `ai` / `call` / `pay`). `get_guide({ section: "primitives" })`
   lists the UI pieces you may import.
2. Write the TSX, then `check_component({ name, source, sample })` — it runs
   every gate in seconds (allowed imports only, no fetch/storage, strict
   types, renders with the sample and with empty props). Fix until it passes.
3. Put it in the contract's `components` (with its `source`) and place it:
   `"layout": { "kind": "custom", "custom": "SwipeStack", "props": {...} }` —
   a custom node can be the whole page or sit beside blocks.
4. `apply_contract`, `verify`.

Components live in the contract, so the next session gets them back from
`get_contract` (with source) and changes them with `patch_contract`
`set_component` / `add_page` — keep each component focused (≤ 40 KB) and
name props clearly so whoever comes next can extend it. Declare "who
wrote this" refs (`swiper_id`, `sender_id`) as the entity's `actor_ref` so
the server stamps them, and add `demo_logins` when the app needs two people
signed in to demo (see `get_guide({ section: "loop" })`). Writes still go
through the app's data API: row-level security decides what a component's
user may do, whatever the component tries.

## Reading results

- `query_data({ entity })` reads DEV rows (read-only) — use it to confirm seeds and what a
  workflow wrote.
- `logs` shows workflow runs, their last log lines and notifications.
- 409 `PROJECT_BUSY`: another build is running — wait and retry.
  409 `HAND_EDITED_FILES`: someone edited a compiled page; ask the user before
  re-applying with `force: true` (their file is backed up first).
- 422 `CONTRACT_INVALID`: read `report.errors`.

## Operating the running app

After `apply_contract` (and after `deploy`), these tools work on the live
app. Each takes `env: "dev"` (the preview, default) or `env: "prod"` (the
published app). Full reference: `get_guide({ section: "operate" })`.

- `describe_schema` first: the real tables, columns, keys, indexes, views,
  functions and triggers. `origin` tells you whether the contract manages a
  table (`contract`), the platform made it (`platform`, `internal`
  `_appbricx_*`: leave those alone) or someone made it by hand.
- `sql`: any SQL, like the builder's SQL editor (several statements, DDL
  and DML, one transaction, past RLS). Reads need the read scope, dev
  writes apply, prod writes deploy.
- `edit_rows`: fix or add data through the app's own rules (access,
  before-write rules, RLS, workflows on change). `as: { role: "member" }` to act as
  a persona and see what they are allowed to do; `as: "admin"` (default) to
  write past RLS.
- `run { action: "workflow" }` to fire a workflow now; `get_run`,
  `dead_letters`, `replay` when one failed. `tail` shows recent change
  events, topic messages, requests and errors.
- `secrets`: set the keys `ctx.secrets.get(...)` reads (list never shows
  values; set and delete need a workspace owner or admin token). Ask the
  user for a key; never invent one.
- Undo: `snapshots` (list, create, restore) for data, `deploys` (list,
  rollback) for the published files.

Rules for prod:
- Every prod write (`sql`, `edit_rows`) takes a database snapshot first and
  returns `snapshotId`. Tell the user the id. If the snapshot fails nothing
  is written.
- Prefer dev first: try the change on `env: "dev"`, check it, then repeat
  on prod. Ask before destructive prod SQL (DROP, TRUNCATE, DELETE without
  a WHERE).
- Every write is recorded in the project's audit trail with your token.

Hand-tuning: indexes, views, functions, triggers and extra tables or
columns made with `sql` survive `apply_contract`, `patch_contract` and
publish; they are never dropped for being outside the contract. Check with
`describe_schema` afterwards. Tables and fields the contract owns still
change through the contract (`patch_contract`), not `ALTER`.

## Reporting back to the user

Say what you built in their terms (tables, who can do what, which workflows
fire when), give the demo sign-ins from the apply reply, and paste the verify
result line by line. Never claim "verified" unless `verify` returned `"pass"`.
