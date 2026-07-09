# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL RULES — READ THIS FIRST — NO EXCEPTIONS

These rules have caused the most wasted time and bad bugs. Read every one before touching a single file.

**1. NO GUESSING — EVER.**
Before writing any code, read the actual current file from GitHub raw. Before using any Supabase column, component prop, or API shape, verify it exists. Never work from memory of what a file "probably" looks like. Never assume a column name, prop name, or API response shape. Read it first, every time. Violations of this rule are the #1 source of bugs in this project.

**2. MOBILE RESPONSIVE ON EVERY NEW BUILD — NO EXCEPTIONS.**
Every new component, view, list, detail panel, form, and card must be built responsive at the same time it is built for desktop. No separate mobile pass later. No "I'll do mobile next session." Build it once, build it right. See Mobile Rules section below for patterns.

**3. DUAL NAV — ALWAYS BOTH FILES.**
Any change to navigation, topbar, or sidebar must be applied to BOTH `AppShell.jsx` (routed pages) AND `SedonaCRM.jsx` (SPA). Missing one = broken nav on half the app.

**4. ONE COMMIT PER SESSION.**
Stage ALL changes including CLAUDE.md in ONE commit. NEVER commit CLAUDE.md separately. One commit → one push → one deployment. No mid-session commits.

**5. PREVIEW BRANCH ONLY.**
All code goes to `preview`. Never push to `main` unless Scott explicitly says "approved, merge to main."

**6. npm run build BEFORE EVERY PUSH.**
Zero errors required. Fix all errors before pushing. Never push broken code — it deploys broken to Vercel.

**7. DESTRUCTIVE DB OPS — STOP AND CONFIRM.**
Before TRUNCATE, DROP TABLE, DROP COLUMN, DELETE FROM, or any ALTER that removes data: stop, tell Scott exactly what you're about to run and why, wait for explicit confirmation. No exceptions even with --dangerously-skip-permissions active.

**8. CC PROMPTS WITH JSX/TEMPLATE LITERALS → .txt FILE.**
Any CC prompt containing JSX or JavaScript template literals (backticks) must be delivered as a downloadable .txt file, not inline markdown. Backticks break markdown code fences and produce unpasteable output.

**9. CC OUTPUT DEGRADATION → CLOSE SESSION IMMEDIATELY.**
If CC output shows garbled text, truncated words, or sentences stopping mid-thought: flag it as "⚠️ CC output is degrading" and close the CC session immediately. Do not continue past this point.

---

## Project

SedonaCRM — custom AI-powered commercial property management platform replacing Podio + Globimail.
Owner: Scott Anderson, CCIM — Anderson Commercial Properties, Sedona AZ
Portfolio: 14 active NNN commercial properties, each a separate LLC (48 prop_codes total)
GitHub: https://github.com/ACPguy/sedonacrm-dashboard
Production domain: crm.andersoncp.com

## Working Directory

ALWAYS use `~/sedonacrm-dashboard/`. This is the active repo.
Chromebook: all files land in `/home/scott/` (Linux files root) — NEVER `~/Downloads/`.

## Commands

```bash
npm run dev   # dev server at localhost:3000
npm run build
npm run start

# Daily workflow
cd ~/sedonacrm-dashboard
git add .
git commit -m "description"
git push
```

## Tech Stack

- Next.js + React, hosted on Vercel Pro ($20/mo)
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS
- Gmail, Google Calendar, Google Drive (MCP connected)
- Twilio for SMS (Phase 6)
- Dropbox Sign (two-part sequential signing) for e-signature — Phase 5 Stage 3, ~$75/mo, for lease + lease amendment signing. Not yet built.
- Claude API — Sonnet 4.6 for AI agents (Phase 4+)

## Supabase

- URL: `https://edxcvyleielzevpappui.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw`
- DB connection: `postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- All tables have RLS enabled
- Anon SELECT grants exist on: `properties`, `tenants`, `rent_schedule`, `work_orders`, `issues`, `leasing_pipeline`, `property_insurance`, `tnt_cois`, `monthly_reports`, `property_taxes`, `suites`, `tasks`, `task_contacts`, `email_threads`, `email_messages`, `email_thread_links`, `communication_timeline`, `users`, `briefings`, `lease_watch_drafts`, `inquiry_drafts`
- `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` and in Vercel environment variables

## Core Architecture — Property as Hub

The Property detail record is the central UI of the entire system. Every related entity tab is a **reusable component** that accepts an optional `prop_code` filter:
- Inside Property detail → receives `prop_code` → shows records for that property only
- In standalone portfolio view → no filter → shows all records, sortable

**Property detail tab groups:**
1. Overview — core fields, map, key dates
2. Leasing — Suites, Tenants, Pipeline, Move-In, Move-Out, Rent Schedule
3. Financial — CAM, Taxes, PM Fees, Invoices, Insurance
4. Operations — Work Orders, Issues, Inspections, Key Safe
5. Ownership — Owners, Agreements, Monthly Reports, YR End Reports

Every tab uses **lazy loading** — data fetches only when tab is clicked, never on property open.

## Current Component Structure

```
~/sedonacrm-dashboard/components/
  AppShell.jsx              — shared sidebar/chrome for all routed pages
  SedonaCRM.jsx             — main shell, nav, routing, Home dashboard, Properties list
  CommunicationTimeline.jsx — reusable unified comms timeline (email/note/call)
  IssuesView.jsx            — issues list + detail (routed, accepts prop_code filter)
  WorkOrdersView.jsx        — work orders list + detail (routed, accepts prop_code filter)
  TasksView.jsx             — unified tasks list + detail, all 6 record types (routed)
  TenantsView.jsx           — tenants list + detail (routed, accepts prop_code filter)
  SuitesView.jsx            — suites list + detail (routed, accepts prop_code filter)
  RentScheduleView.jsx      — rent schedule list + detail (routed)
  ContactsView.jsx          — contacts list + detail (routed)
  VendorsView.jsx           — vendors list + detail (routed)
  OwnersView.jsx            — property owners list + detail (routed)
  BriefingView.jsx          — Morning Briefing dashboard (wired into SedonaCRM.jsx HomeView)
  LeaseWatchDrafts.jsx      — Lease Watch compact card; embedded in BriefingView
  NewInquiryDrafts.jsx      — New Inquiry compact card; embedded in BriefingView below LeaseWatch
  shared/
    TasksTable.jsx     — reference only (no longer used in embedded contexts)
    WorkOrdersTable.jsx, TenantsTable.jsx, SuitesTable.jsx, IssuesTable.jsx, ContactsTable.jsx

lib/
  gmail.js               — getGmailClient(), setupWatch()
  drive.js               — getDriveClient(), createTaskFolder(), createIndexPdf()
  drivePropertyFolders.js — hardcoded prop_code → Drive root folder ID map (14 active)
  supabaseServer.js      — createServerClient() using SUPABASE_SERVICE_ROLE_KEY

pages/
  index.jsx              — renders <SedonaCRM /> (SPA root)
  home.jsx               — renders <SedonaCRM /> at clean /home URL (HomeView by default)

pages/api/agents/
  morning-briefing.js  — GET today's briefing; cron/POST runs 14 parallel queries, saves to briefings table
  lease-watch.js       — GET active drafts; cron/POST iterates tenants, calls Claude API, saves drafts
  new-inquiry.js       — GET active drafts; cron/POST keyword filter → Claude draft → pipeline insert → thread link; dismiss action
  work-order-agent.js  — GET today's wo_agent_runs row; cron/POST nudges (past-due + no-activity) + high-cost flags (≥$2,500)

pages/api/gmail/
  renew-watch.js      — POST/GET renews Gmail Pub/Sub watch; cron every 6 days
  webhook.js          — processes Pub/Sub push notifications, syncs email_threads + email_messages
  sync-now.js         — POST syncs Gmail history + polls INBOX; GET returns current state
  batch-action.js     — POST { threadIds, action: archive|spam|delete } — calls Gmail API + updates Supabase; auth: x-briefing-secret
```

## Phase Status

- **Phases 0–3:** Complete
- **Phase 4:** IN PROGRESS
  - Agent 7 Morning Briefing: Complete (cron `0 12 * * *` = 5am AZ)
  - Agent 1 Lease Watch: Complete (cron `0 13 * * *` = 6am AZ)
  - Agent 3 New Inquiry: Complete (cron `0 15,17,19,21,23,1 * * *` = 8am–6pm AZ, 6x/day)
  - Gmail Watch Auto-Renewal: Complete (cron `0 11 */6 * *` = every 6 days; renewed 2026-06-26, expires 2026-07-03)
  - Agent 4 Work Order Agent: Complete — nudge logic (Urgent=2d, High=7d, Normal=10d past due + 14d no-activity), high-cost flag ($2,500+), stores to `wo_agent_runs`; WorkOrderAgentDrafts card in BriefingView; cron `0 14 * * *` (7am AZ, daily)
  - Remaining Phase 4: Agent 9
- **Phase 4 Supporting work (complete):**
  - BriefingView: 5 collapsible agent sections, `propCode` prop, mobile pass, `embedded` prop
  - Drive folders: date-first naming, auto-create on save for ALL task types
  - LeaseWatchDrafts + NewInquiryDrafts: collapsible headers + scrollable bodies
  - HomeView: "Home" header + HouseLine icon, collapsible weather strip, larger fonts
  - BriefingView: ↻ dropdown (Refresh + Re-run), Expand/Collapse All; all 5 sections default closed
  - Cron auth fixes (2026-07-03): all 5 cron routes now accept GET (Vercel sends GET) + CRON_SECRET Bearer header
  - Home URL (2026-07-03): clean `/home` route; `/?view=morning-briefing` 307-redirects to `/home`
  - Gmail sync fixes (2026-07-07): skip SPAM/TRASH in history.list loop; outbound emails matched to contacts via "to" header
  - EmailInbox prev/next nav (2026-07-07): ‹ › buttons + ArrowLeft/Right keyboard nav in thread detail; steps through in-memory threads array
  - EmailInbox batch select (2026-07-07): checkboxes on thread rows + batch toolbar (Archive/Spam/Delete); batch-action.js calls Gmail API for each action
  - handleArchive bug fix (2026-07-07): single-thread Archive now also calls Gmail API (removeLabelIds INBOX) via batch-action endpoint
  - EmailInbox compact rows (2026-07-07): single-line ThreadListItem with sender name (130px col, hidden mobile), subject+snippet combined, paperclip icon, small indicator badges; shift-click range select; row height ~32px
  - EmailInbox resizable list panel (2026-07-07): draggable 4px divider between list and detail; width persists to localStorage (key: sedonacrm_inbox_list_width); bounds 280–700px; offset calculated via containerRef.getBoundingClientRect().left (works with variable sidebar width); sender col uses flex clamp(70px,28%,200px) for proportional growth
  - EmailInbox grid columns (2026-07-07): ThreadListItem refactored to Fragment of 6 cells (no wrapper div); grid container uses `gridTemplateColumns:'32px 20px fit-content(180px) minmax(0,1fr) 64px 60px'`; sender col auto-sizes to content (no dead space); formatSmartTime shows clock time today, short date otherwise; select-all checkbox inline with filter pills (indeterminate when partial)
  - EmailInbox fixes (2026-07-07): indicator col fixed to 64px (was auto — could spill), overflow:hidden + justifyContent:flex-end on cell; listWidthRef now initialised from listWidth (not hardcoded 340); mount-time useEffect re-reads localStorage after hydration; handleDividerMouseDown syncs ref to current state before starting drag
  - EmailInbox Inbox tab (2026-07-07): added 'inbox' as first/default filter tab; buildQuery filters `is_archived=eq.false&is_deleted=eq.false`; replaces 'unread' as default; empty-state reads "Inbox is empty."
  - EmailInbox sender col + sort (2026-07-07): sender column cap tightened 180px→130px; buildQuery base uses `order=last_message_at.desc.nullslast` so NULL timestamps always sort to bottom on all tabs
  - Agent cards propCode filtering (2026-07-09): LeaseWatchDrafts, NewInquiryDrafts, WorkOrderAgentDrafts all accept propCode prop and filter client-side; new-inquiry GET joins leasing_pipeline(prop_code); snapshot strip removed from BriefingView
  - BriefingView embedded in Property Dashboard tab (2026-07-09): `<BriefingView propCode={data.prop_code} embedded={true} />` inserted below stat card grid in SedonaCRM.jsx dashboard tab
- **Phase 5+:** Pending

## Agents Env Vars (Vercel) — all set ✅

- BRIEFING_SECRET, NEXT_PUBLIC_BRIEFING_SECRET, ANTHROPIC_API_KEY
- CRON_SECRET ✅ set in Vercel (Production + Preview) — confirmed working (Gmail watch renewal succeeded)

## Monthly Cost

- Vercel Pro: $20/mo | Claude API: ~$10–15/mo | Supabase: $0 | Total: ~$30–35/mo

## Gmail Inbox — Session Summary (2026-07-07)

Extensive session, ~10 commits on preview, none yet merged to main. In order:

1. Spam/Trash exclusion — webhook.js + sync-now.js history.list loops now skip messages labeled SPAM/TRASH (previously synced into inbox unfiltered)
2. Outbound contact linking — matching logic extended to check the "to" address for outbound mail (previously only inbound sender was checked)
3. Prev/Next thread navigation — buttons + arrow keys, steps through in-memory thread list
4. Batch select + batch actions — checkboxes, Archive/Spam/Delete via new pages/api/gmail/batch-action.js (also fixed a pre-existing bug where Archive only updated the DB and never actually archived in Gmail)
5. Compact single-line inbox rows — CSS Grid layout (6 columns: checkbox, unread dot, sender, subject+snippet, indicators, time) replacing the old 3-line stacked card design
6. Sender name + attachment display — new email_threads columns (last_sender_name, last_sender_address, has_attachment) populated on every sync; paperclip icon shown when has_attachment is true
7. Shift-click range select — matches Gmail's range-selection behavior
8. Resizable divider between thread list and detail pane — width saved to localStorage (persistence still has a known bug, see Known Gaps)
9. Grid column dead-space fix — sender column uses fit-content(130px) instead of a fixed percentage, so short names don't leave wasted space
10. Gmail-style time format — clock time for today's mail, short date otherwise
11. Select-all checkbox with indeterminate state
12. New default "Inbox" filter tab — excludes archived/deleted, shows read+unread (mirrors actual Gmail Inbox); tab order is now Inbox, Unread, All, Linked, Flagged
13. Defensive nullslast ordering on all filter queries — prevents any future NULL last_message_at row from sorting to the top
14. One-time data cleanup — deleted a single junk test row (id c77641cc-077f-44c7-9ef0-6b9d6528483d, gmail_thread_id 'test-123') that had no real Gmail data and was causing incorrect sort order

New schema this session: email_threads gained last_sender_name, last_sender_address, has_attachment, is_deleted; email_messages gained has_attachment. New endpoint: pages/api/gmail/batch-action.js.

## Known Gaps

- **CRITICAL — Podio migration status:** All current Supabase data is placeholder/test data only, imported via .xlsx exports. Podio remains the live system of record; staff continue working in Podio normally throughout the build. Two-stage sync plan: (1) parallel test sync — full Podio API pull of record data + inter-table links + comments + file attachments into a test environment, run alongside live Podio for several weeks to validate the new DB and find bugs; (2) final cutover sync — complete verified full sync, then Podio shutdown + CRM go-live. Never treat xlsx-imported data as final/production-ready. Never suggest the CRM is ready to cut over until the final Podio API sync is verified complete.
- **PENDING: S&G prop_code** — set up as a property (like ACP) with dedicated Drive folder; Scott will supply Drive folder ID for `drivePropertyFolders.js`
- **Inbox divider width does not reliably persist across a hard refresh.** Root cause not yet fully found — a prior fix (syncing listWidthRef to listWidth, adding a mount-time localStorage re-read effect) did not fully resolve it per Scott's testing. Needs further investigation next session — check for a possible race between the mount effect and the lazy useState initializer both writing to listWidth, or a Vercel/browser caching factor.
- **Inbox indicator badges (CON/LEA/red dot) have no legend or tooltip.** They're understandable to Claude/CC but not self-explanatory to Scott day-to-day. Needs a small legend, tooltip on hover, or expanded labels next session.

## Next Priorities

1. Fix inbox divider width persistence (see Known Gaps — real bug, not yet resolved)
2. Add a legend/tooltip for inbox indicator badges (CON/LEA/flagged dot/paperclip meaning)
3. Phase 5: Leasing Pipeline

## Current Git State

- main: `cf849dd` — docs: update git state — Agent 4 + WorkOrderAgentDrafts merged to main (2026-07-09)
- preview: `8a5af67` — feat: embed BriefingView with propCode filtering into Property Dashboard tab (2026-07-09)

---

## Seeding Rules

Use `psql` only — `export DB='postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres'`
- Before seeding any table: check columns, drop CHECK+FK constraints, test R01, run full loop
- CASCADE check before any TRUNCATE: always run the referential check query against `information_schema` + `pg_constraint` first

---

## Workflow Rules

1. **All code to preview branch** — never directly to main unless Scott says "approved, merge"
2. **One commit per session** — stage ALL changes including CLAUDE.md in one commit. NEVER commit CLAUDE.md separately. One push = one deployment.
3. **npm run build before every push** — zero errors required
4. **Read CLAUDE.md first** — at start of every new session before doing anything
5. **Start fresh CC session after each major feature or ~2 hours** — keeps context lean, prevents slowdowns and output degradation
6. **CLAUDE.md size rule:** Keep under 30k chars. Remove oldest completed session logs before adding new ones.
7. **Push immediately after every commit** — never let commits sit locally. Every `git commit` must be followed immediately by `git push origin preview`. No batching commits before pushing.

## Session Close Procedure

1. Update CLAUDE.md: Next Priorities + Current Git State + any new permanent rules/schema. Keep under 30k.
2. Commit ALL changes + CLAUDE.md in ONE commit to preview branch.
3. Merge preview → main if Scott approved.
4. Upload build log to Drive (parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA`)
5. Upload updated CLAUDE.md to Drive as `CLAUDE_YYYY-MM-DD.md` (parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA`)
6. Move previous dated copy to Archive folder (`1I1kBuVZd7jbLh_WYzFtEBzrtmKcvazfb`)
- NEVER upload `.md` files without `disableConversionToGoogleType: true` + `contentMimeType: text/plain`
- NEVER upload to wrong folder

---

## Development Rules (permanent)

1. **SELECT DISTINCT before any UI field from Podio** — confirm exact values before building dropdowns/filters
2. **npm run build before every commit** — fix all errors first
3. **Left nav always-navigate on click** — use `handleNav`/`go` pattern: if already on target path, call `router.replace().then(() => router.reload())`
4. **Date fields always use `<input type="date">`** — browser native picker; display via `fmtDate()` (MM-DD-YYYY); store YYYY-MM-DD
5. **Pill hover:** inactive pills ~20% alpha active color on hover, `0.15s ease` transition; active pill: no hover change
6. **Multi-line text:** minRows=5, 120px min height, 72px bottom padding, full TipTap toolbar, auto-expand
7. **Destructive DB ops:** ALWAYS stop and confirm before TRUNCATE / DROP / DELETE / ALTER removing data
8. **List views default to Open only** — WO + Issues; fetch Closed only when user selects filter. Never filter a pre-loaded dataset client-side — each pill = new Supabase query.
9. **Mobile stat rows:** always `.stats-pill-row` + `.stat-pill` pill-style horizontal scroll on mobile (<768px). Never a multi-row grid on mobile.
10. **Filter state in URL query params** on every filter change; restore on mount via `hasMounted` ref
11. **Search queries: server-side LIMIT cap of 5 results per module** — never unbounded queries
12. **grep -n before editing any large JSX file** — CC frequently misidentifies line numbers without this step
13. **Claude.ai single instruction rule** — give one clear instruction at a time. Never counter an instruction with an alternative in the same response.
14. **AI agents draft only — Scott approves everything. Nothing sends autonomously, ever.** Applies to all agents (Lease Watch, CAM Reconciliation, New Inquiry, Work Order, Rent Collection, Insurance Cert, Morning Briefing, Owner Reporting, Re-Engagement, Portfolio Analyst).
15. **Every record requires:** unique URL, copy-link button, communication thread, audit log, AI summarize button, Drive file attachments. Audit log and AI summarize are not yet built on most record types — treat as an open build item per module, not as already satisfied.
16. **CLAUDE.md Current Git State must always reflect the ACTUAL commit hash of the last real code/feature commit AFTER it has been pushed — never a placeholder written before the commit exists, and never the hash of the CLAUDE.md-only housekeeping commit that follows it (since that commit's own hash isn't known until after it's made).** If uncertain, leave it for a small final follow-up commit once the real hash is confirmed via `git log -1`.
17. **Vercel Cron auth — CRON_SECRET is required.** All cron routes must check `req.headers['authorization'] === \`Bearer ${process.env.CRON_SECRET}\`` in addition to `x-vercel-cron`. Vercel's documented method is the Bearer token; `x-vercel-cron` alone is unreliable. Pattern: `isCron = x-vercel-cron === '1' || authorization === Bearer CRON_SECRET`. Plain GET (no cron header) returns existing data for UI polls. Never remove the Bearer check.

---

## Mobile Rules (permanent — applies to EVERY new component)

**The rule:** Every new component, view, list, detail panel, form, and card must be built mobile-responsive simultaneously with the desktop build. No separate mobile pass later. Build it once, build it right.

**Breakpoints:**
- Mobile: `max-width: 639px` (use `.mobile-hidden` to hide on mobile, `.md-hidden` to hide on desktop)
- Desktop: `min-width: 768px`

**Patterns by UI type:**

- **List tables on mobile:** use `.crm-mobile-cards` card pattern — hide table, show stacked cards
- **Tab bars:** `overflow-x: auto`, `-webkit-overflow-scrolling: touch`, `scrollbar-width: none`, `.crm-detail-tab-bar::-webkit-scrollbar { display: none }`
- **Detail headers:** `flexWrap: wrap`, name uses `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- **Detail form grids:** `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- **Stat summary rows above tables:** `.stats-pill-row` + `.stat-pill` horizontal scroll (see Rule 9)
- **ActivityPanel:** hidden on mobile (`.mobile-hidden`)
- **Touch targets:** minimum 44px height/width on all buttons and interactive elements
- **EmailInbox:** single-panel mode on mobile using `useWindowWidth` hook — list hides when thread open, show ← back button
- **Two-panel layouts:** stack vertically on mobile (flex-direction: column)

**Mental check before every commit:** "Does this work at 390px width?" If no — fix it before committing.

---

## Architecture Rules (permanent)

- **Single source of truth:** ONE shared component per table/list in `components/shared/`. NEVER build a second version for a sub-view or tab.
- **Dual nav architecture:** `AppShell.jsx` (routed pages) + `SedonaCRM.jsx` (SPA). ANY nav or topbar change must be applied to BOTH files.
- **`property_agreements` table:** ACP's mgmt agreement with property owners — NOT leasing pipeline. Never confuse.
- **Vercel build cache:** `next.config.js` uses `generateBuildId: async () => require('crypto').randomBytes(8).toString('hex')` — do not remove.
- **Vercel env vars:** changes require full redeploy. If a new var doesn't propagate after redeploy, delete it and recreate before redeploying.
- **GitHub raw reads:** subject to 60–120s CDN cache after push. Use `wc -l` comparison as fast check for whether a file changed.
- **Home URL:** `/home` is the canonical home route (renders SedonaCRM SPA). `/?view=morning-briefing` 307-redirects to `/home`. Do not revert to query-param routing for Home.

---

## URL Routing Rules (permanent)

- All detail pages use `podio_id`, NOT UUID: `/[module]/[podio_id]`
- Link generation: `record.podio_id ?? 'X'+record.id.slice(-6)`
- Vendors + Owners: ZERO podio_id coverage — all X-fallback until go-live Podio sync
- Tasks URL: bare `task_num` only (`/tasks/3685`) — never WO-prefixed
- Lookup: if param has hyphens → UUID fallback; otherwise → podio_id

## History API Rule (permanent)

ALWAYS spread existing state:
`window.history.replaceState({ ...window.history.state, url: newUrl, as: newUrl }, '', newUrl)`
NEVER use `replaceState({}, ...)` — strips Next.js `__N` marker, breaks Back button.

## Prev/Next Navigation (permanent)

All detail views support keyboard (ArrowLeft/Right) and button (‹ ›) navigation.
- List view writes `{module}NavList` + `{module}NavIndex` to sessionStorage on row click
- `goNav(dir)` fetches adjacent record, updates URL via replaceState (spread pattern above)
- `goNavRef` pattern required for arrow key useEffect with empty dep array
- Skip arrow key when in input/textarea/select or contentEditable

## Gmail / OAuth Rules (permanent)

- Token store: `email_accounts` table (not `gmail_tokens`)
- OAuth re-auth only at crm.andersoncp.com/settings (GOOGLE_REDIRECT_URI is production only)
- Scopes: `gmail.modify`, `gmail.send`, `drive` — do NOT add `userinfo.email`
- Do NOT overwrite .env.local with `vercel env pull` — it strips Supabase keys
- Gmail watch expires every 7 days — auto-renewed by cron `0 11 */6 * *` via `/api/gmail/renew-watch`

---

## Tasks Module DB Notes (permanent)

- `tasks` table: record_types = work_order (2,914), task (1,234), sg_task (220), note/project/acp_task (0)
- UNIQUE index: (record_type, task_num) — task_num is Podio ID
- Display ID: `getTaskPrefix(task)` from `utils/taskPrefix.js` → `CR1-3685`
- Sequences: work_order=3717, task=1846, acp_task=518, sg_task=220
- Added columns: drive_folder_id, drive_folder_url, drive_index_pdf_id, vendor_contact_id, tenant_contact_id

## Schema Notes (permanent)

- `contacts`: added `vendor_id uuid FK → vendors` + `tenant_id uuid FK → tenants`
- `work_orders` + `tasks`: added `vendor_contact_id` + `tenant_contact_id`
- `briefings`: run_date (UNIQUE), status, urgent/attention/fyi/snapshot (jsonb)
- `lease_watch_drafts`: tenant_id + milestone (UNIQUE pair), subject, body, status
- `inquiry_drafts`: thread_id (UNIQUE), pipeline_id FK, prospect_name, prospect_email, subject, body, status
- `wo_agent_runs`: run_date (UNIQUE), status, nudge_items/high_cost_items (jsonb) — ✅ migration run 2026-07-09, table + RLS live
- `email_threads`: added `is_deleted boolean DEFAULT false` (2026-07-07) — set by batch-action delete action
- `email_threads`: added `last_sender_name text`, `last_sender_address text`, `has_attachment boolean DEFAULT false` (2026-07-07) — populated by webhook.js + sync-now.js on every new message; old threads show null/false until re-synced
- `email_messages`: added `has_attachment boolean DEFAULT false` (2026-07-07)

## Drive Folder Architecture (permanent)

- Trigger: auto-created on task save (fire-and-forget) for ALL record types; also manual `+ Drive Folder` button in WO header
- Structure: `[Property Root]/Work History/[YYYY-MM-DD] — [displayId] — [title]/`
- Hardcoded in `lib/drivePropertyFolders.js` (14 active properties; S&G folder ID pending)
- Index PDF upload silently failing (pdf-lib issue) — independent of folder creation

## Embedded TasksView Architecture (permanent)

All 5 embedded Tasks tab contexts use `<TasksView embeddedMode hidePropertyPills filterXxx={...}/>`:
| Context | Props |
|---|---|
| Property detail (SedonaCRM.jsx) | `filterPropCode={data.prop_code} hidePropertyPills embeddedMode` |
| Owner detail (OwnersView.jsx) | `filterPropCode={data.prop_code} hidePropertyPills embeddedMode` |
| Tenant detail (TenantsView.jsx) | `filterTenantId={data.id} hidePropertyPills embeddedMode` |
| Vendor detail (VendorsView.jsx) | `filterVendorId={data.id} hidePropertyPills embeddedMode` |
| Contact detail (ContactsView.jsx) | `filterContactId={data.id} hidePropertyPills embeddedMode` |

## Valid prop_codes (48 total, 14 active)

```
1McC, 777, ACP, ART, ARVS, ATS, CDY, CHQ, COB, CPP, CR1, CRMS, CVP, DCC, DCM, DCP,
DEM, DON, FOX, KOD, KTA, LAP, LASO, LEEN, LPP, MILL, MYN, OLY, OMP, PLZ, PW213, PWP,
RHS, RR, SAC, SEP, SS, SSB, STP, SUNT, SWV, SYC, VDN, VVP, WAL, WNT, WSP, YAV
```
