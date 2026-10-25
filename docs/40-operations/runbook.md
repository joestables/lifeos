# Runbook

*Provisionally agreed ([ADR-0035](../20-architecture/adr/0035-preventing-catching-fixing-bugs.md)).
Filled in as each piece is built.*

## Stage 1 cut-over from v1

1. Pause the v1 project. It stops working at once, Recipes and Gym included.
   Joe chose not to take a `pg_dump` first. A paused free project can, as
   far as is known, be restored, or its backup downloaded, from the
   dashboard for about 90 days.
2. Create the v2 project in London (eu-west-2).
3. Delete v1 once it is clearly not needed.

Done 9 October 2026.

## Noticing problems

- **`ops.events`** is the one errors table (schema `ops`, not exposed to the
  API):
  - the app reports uncaught errors, screens that crash, and writes the
    server refused, through `core.report_event`, with the screen, the build
    and the last ten actions — pages visited and the kind of control
    clicked, never its text or the content of your Items
    (`src/data/report.ts`). A report that can't be sent waits for the next
    try;
  - Edge Functions, `pg_cron` jobs and Integration syncs report failures to
    the same table;
  - not reported: the browser's "ResizeObserver loop" notice (harmless),
    and a page's code gone with a new deploy, which reloads instead;
  - a write sent twice (a reload while the first was on its way) whose own
    id is then taken was already applied, so it isn't refused.
- It is queryable by Claude through the Supabase MCP, so "what broke this
  week?" is one question.
- **No in-app bug reporting.** Joe reports a problem by telling Claude, which
  reads `ops.events` to find it.
- **A nightly health check** (`pg_cron`, 03:00 UTC, `ops.health_check()`)
  looks at the last day's events, failed jobs and the heartbeats of jobs
  outside the database (from Stage 2, Reminder sending and the nightly
  series run; from Stage 3, Google Calendar connections that aren't
  syncing), and records what it finds in `ops.health_runs`. **Nobody is
  notified** (Joe, 10 October): Joe checks, or asks Claude "any problems?",
  and Claude reads `ops.health_runs` and `ops.events`. Notifications can be
  added later. A broken Integration also shows in Inbox.
- **A nightly smoke walk** of production with the test account, confirming
  that sign-in, capture and Inbox still work, is deferred until the roadmap
  is complete (Joe, 12 October 2026).

## Notifications

Reminders, the morning digest and overdue nudges
([ADR-0044](../20-architecture/adr/0044-reminder-delivery.md)):

- **Each minute** the `pg_cron` job `minute-notifications` runs
  `core_private.notifications_tick()`: it queues what has come due in
  `core.reminder_deliveries`, one row per notification and device, and when
  rows wait it calls `send-notifications` through `pg_net` with the Vault
  secret `push_secret`.
- **`send-notifications`** claims rows, sends each by Web Push with the
  VAPID keys in Vault (it makes them the first time it runs) and records
  each result: *sent*, *failed* (tried again next minute), *gone* (the
  device stops being sent to and `ops.events` gets `push_device_gone`),
  *skipped* (done or deleted meanwhile, or the digest had nothing to say)
  or *missed* (over 12 hours late). Its heartbeat is `send-notifications`.
- **`notification-action`** does Done and Snooze from a notification's
  buttons, proved by the delivery's token; the service worker keeps a press
  made with no signal and sends it later.
- **Checking it:** `select status, count(*) from core.reminder_deliveries
  where created_at > now() - interval '1 day' group by 1`; the 03:00 health
  check reports rows waiting over an hour. A real notification on each
  phone and computer is checked by hand.
- **Deploying them:** Claude deploys both functions through the Supabase
  MCP without JWT checks (each checks its own secret or token);
  `notification-action` with `packages/recurrence`'s files.

## Google Calendar

Connecting and syncing are LifeOS's own
([ADR-0047](../20-architecture/adr/0047-google-calendar-sync.md)), in four
Edge Functions deployed by Claude through the Supabase MCP, sharing
`supabase/functions/calendar-sync/run.ts` and `supabase.ts`:

- **`calendar-connect`** (the app, as me): starts connecting
  (`core.calendar_begin` makes a one-time state; Google's consent page asks
  for Calendar, offline, every time), finishes connecting with the code
  the callback sent me back with (`core.calendar_finish`, only for the
  person who began; then lists and reads my calendars once), disconnects
  (revokes the token at
  Google, then `core.calendar_disconnected`), and syncs when Plan opens, at
  most once a minute. It doesn't ask the gateway to check the token, which
  would refuse the browser's preflight; every database call carries the
  person's token, so the database checks it.
- **`calendar-callback`** (Google's redirect): trades the code for tokens
  with the client secret and connects no one itself: it keeps the refresh
  token in Vault against the state (`core.calendar_received`, the state
  good once for 15 minutes) and sends me back to Settings, only at the
  app's own addresses, with `?calendar=finish&code=…` for the app to finish
  as me, or `cancelled`, `expired` or `failed`. The app's own addresses
  (`allowedReturn` in `calendar-sync/run.ts`): `joestables.uk` (and
  `www.`), the old `lifeos-bice-mu.vercel.app`, previews and localhost;
  with no good address, `https://joestables.uk/settings`.
- **Deploying** `calendar-connect` and `calendar-callback`: from 25 October
  each as one bundled file, `node scripts/bundle-function.mjs <name> out.js`,
  sent through the Supabase MCP without JWT checks.
- **`calendar-sync`** (every five minutes, `pg_cron` job `calendar-sync`,
  through `pg_net` with `calendar_secret` from Vault, only while a calendar
  is on): a fresh access token per connection; Google refusing it marks the
  connection broken (`core.calendar_broken`, an `ops.events` row, Inbox's
  notice, the health check); the calendar list refreshed; each calendar
  that is on read from its sync token, or from four weeks back (first time,
  after a 410, and weekly so repeats reach 12 weeks ahead); then instances
  a changed repeat no longer has go (`core.calendar_prune`).
- **`calendar-push`** (two-way, [ADR-0048](../20-architecture/adr/0048-google-calendar-two-way.md);
  `pg_cron` job `calendar-push` every minute, waking it through `pg_net`
  with `calendar_secret` only while `core_private.calendar_outbox` has a
  row due): claims up to 50 jobs (`core.calendar_outbox_claim`), sends
  each Event, or repeating Event as one Google repeating event, to its
  calendar, and records it (`core.calendar_sent`, keeping Google's id and
  `etag`; a change made meanwhile stays waiting) or the failure
  (`core.calendar_unpushed`, tried again after 5 minutes, doubling to 6
  hours). A refused token breaks the connection as the sync does, and its
  jobs wait, a quarter of an hour at a time. A new Event's chosen calendar
  is in `core_private.event_calendars`. It is deployed with `calendar-sync`'s
  `run.ts` and `supabase.ts` and `packages/recurrence/src/days.ts`.
- **Checking it:** `select * from core.connections`;
  `select name, level, new_events, synced_until from core.calendar_links`;
  what waits or failed:
  `select * from core_private.calendar_outbox where sent_at is null or error is not null order by id desc`;
  the jobs' runs in `cron.job_run_details`; the functions' logs
  (`get_logs`, edge functions).
- **Secrets:** the client's ID and secret are Edge Function secrets
  (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, entered by Joe); each refresh
  token, and `calendar_secret`, are in Vault.

## The AI service

`ai`, an Edge Function deployed by Claude through the Supabase MCP without
JWT checks (it asks Auth who the token is), with `rules.ts`, `schema.ts`,
`run.ts` and `packages/food`'s `imported.ts` and `units.ts`
([ADR-0054](../20-architecture/adr/0054-the-ai-service-and-import.md)):

- **Tasks:** `status` (can the AI be used, and how much of today's
  allowance is left), `recipe.import` (RCP-014; also what Import from a
  link in a Draft Variation uses), `recipe.fill_lines` (RCP-007 5: the
  Variation's method is sent, and only then) and `meal.ingredients`
  (MPL-006 2: a link's lines and servings only). Gemini's free tier
  only: the key and the optional settings are in
  [integration setup](integration-setup.md#gemini-stage-4).
- **The allowance:** each use is an `ai` row in `ops.events`
  (`core.ai_take`, as the service role), with the prompt's version and never
  what was sent; a day is a UTC day. A failure is an `ai_failed` row with
  why.
- **Checking it:** `select kind, message, count(*) from ops.events where
  source = 'edge' and kind like 'ai%' and at > now() - interval '1 day'
  group by 1, 2`. Many `ai_failed` with 429 mean the free quota is used
  up; Google's limits change, so set `AI_DAILY_ALLOWANCE` from what AI
  Studio shows.
- **Speed:** the model is Flash-Lite, then Flash when it is busy or out
  of quota. Each answer is asked for with little thinking (Gemini 3's
  `thinkingLevel: low`, else 2.5's `thinkingBudget: 0`, else the model's
  default) and may take 100 seconds at most, so the function answers
  before its own limit; too slow is said as "took too long". Each call's
  model, thinking and time are in the function's logs (`ai: gemini …`).
  The first live imports (23 October) timed out at two minutes with the
  model's default thinking.
- **A bad import** is traced to its prompt by the version in its `ai` row
  (`PROMPT_VERSION` in `rules.ts`).
- **`link-preview`** (not AI, nothing counted): a link's name and picture,
  the picture as a data URL, for a typed Meal (MPL-006 6) and a shared Idea
  (RCP-003 1). Deployed by Claude through the Supabase MCP without JWT
  checks (it asks Auth who the token is), as one file:
  `node scripts/bundle-function.mjs link-preview out.js` bundles only the
  code it uses from the `ai` function's `run.ts`, leaving the prompts and
  schemas out (from 25 October; before, the six files were sent as they
  are).

## The nightly series run

Repeating Tasks are made ahead by the `extend-series` Edge Function
([ADR-0045](../20-architecture/adr/0045-extending-series.md)):

- **When:** `pg_cron` job `nightly-series`, 02:00 UTC, calls it through
  `pg_net` with the project's URL and a shared secret from Vault
  (`project_url`, `series_secret`); the function refuses any call whose
  secret the database doesn't confirm (`core.series_secret_ok`), so the
  secret lives only in Vault.
- **What it does:** makes each series' occurrences up to 12 weeks ahead (and
  the one after), the next of a Task repeated after it's done if nothing
  made it, then skips untouched occurrences overtaken by a newer due one,
  and records its heartbeat (`ops.heartbeats`, `extend-series`). A failure
  goes to `ops.events`; the 03:00 health check reports a heartbeat that is
  late or failed.
- **Checking it:** `select * from ops.heartbeats` and
  `select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'nightly-series') order by start_time desc limit 5`.
- **Running it by hand:** the same `net.http_post` as the job; running it
  twice does no harm.
- **`pg_net` sits in the `public` schema**, which the security advisor
  warns about. Moving it means dropping and re-creating the extension, and
  on the live project the drop hangs (it waits on `pg_net`'s own background
  worker) until the Supabase MCP gives up and it rolls back (tried twice, 12
  October). Its functions are in the `net` schema, which the API doesn't
  expose, so the warning is left standing.
- **Deploying it:** Claude deploys `supabase/functions/extend-series`
  through the Supabase MCP with `packages/recurrence`'s files, without JWT
  checks (it checks its own secret). Changing the secret is one Vault
  update. A missed night changes nothing anyone
  sees: 12 weeks are already made.

## Recovering

- **A bad deploy:** Vercel's instant rollback.
- **A bad migration:** fix forward; never edit a migration that has run.
- **Something deleted:** undo, or recover it from Settings (deleted means
  archived).
- **Data loss:** no backups are taken for now, so it can't be restored
  ([backups](backups.md)).
