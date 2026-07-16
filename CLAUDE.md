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
- Claude API — `claude-sonnet-5` for AI agents (Phase 4+). **Model strings need periodic review against Anthropic's deprecation schedule** (docs.anthropic.com/en/docs/about-claude/models/overview). `claude-sonnet-4-20250514` was hardcoded in loi-draft.js and retired June 15, 2026 — caught and fixed 2026-07-11.

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

pages/api/pipeline/
  lead-capture.js       — POST: create leasing_pipeline at New Inquiry (inbound lead)
  transition.js         — POST: advance/exit stage; handles NA-skip for stage_5_state/stage_7_state
  submit-application.js — POST: write lease_applications row + link via pipeline_id FK
  loi-draft.js          — POST: Claude API LOI draft (draft only, no auto-send)
  movein-clearance.js   — GET: check 5 clearance gates (lease signed, invoices, COI, blocking WOs)
  notice-to-vacate.js   — POST: set suite "Vacant / For Lease — Pending" + auto-create notice_triggered pipeline record
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
  - BriefingView: 5 collapsible agent sections, `propCode` + `embedded` props, Expand/Collapse All, ↻ (Refresh + Re-run) dropdown; all sections default closed; embedded in Property Dashboard tab
  - Drive folders: date-first naming (`[YYYY-MM-DD] — [displayId] — [title]`), auto-create on save for ALL task types
  - Home URL: `/home` canonical route; `/?view=morning-briefing` 307-redirects; cron routes accept GET + CRON_SECRET Bearer (2026-07-03)
  - EmailInbox (2026-07-07): compact CSS Grid rows (6-col), batch select + Archive/Spam/Delete, ‹ › prev/next nav, resizable divider (localStorage, default 570px), Inbox default tab (excludes archived/deleted), SPAM/TRASH exclusion in sync, shift-click range select, formatSmartTime, select-all w/ indeterminate state
  - Agent cards propCode filtering: LeaseWatchDrafts, NewInquiryDrafts, WorkOrderAgentDrafts all filter client-side by propCode
- **Phase 5:** IN PROGRESS
  - Stage 1 — DB Schema: Complete (2026-07-11)
  - Stage 2 — Pipeline API routes: Complete (2026-07-11)
  - Stage 4 (part 1) — PipelineView.jsx: Complete (2026-07-11); list+board view, dual nav, /pipeline route, mobile responsive, .crm-mobile-only CSS added
  - Stage 3 (Dropbox Sign) + Stage 4 parts 2–3 (detail panel, prop embed): Pending

## Agents Env Vars (Vercel) — all set ✅

- BRIEFING_SECRET, NEXT_PUBLIC_BRIEFING_SECRET, ANTHROPIC_API_KEY
- CRON_SECRET ✅ set in Vercel (Production + Preview) — confirmed working (Gmail watch renewal succeeded)

## Monthly Cost

- Vercel Pro: $20/mo | Claude API: ~$10–15/mo | Supabase: $0 | Total: ~$30–35/mo

## Known Gaps

- **CRITICAL — Podio migration status:** All current Supabase data is placeholder/test data only, imported via .xlsx exports. Podio remains the live system of record; staff continue working in Podio normally throughout the build. Two-stage sync plan: (1) parallel test sync — full Podio API pull of record data + inter-table links + comments + file attachments into a test environment, run alongside live Podio for several weeks to validate the new DB and find bugs; (2) final cutover sync — complete verified full sync, then Podio shutdown + CRM go-live. Never treat xlsx-imported data as final/production-ready. Never suggest the CRM is ready to cut over until the final Podio API sync is verified complete.
- **PENDING: S&G prop_code** — set up as a property (like ACP) with dedicated Drive folder; Scott will supply Drive folder ID for `drivePropertyFolders.js`
- **Inbox divider width persistence — NOT resolved, deprioritized.** Workaround: default width hardcoded to 570px. Pointer Events API fix (setPointerCapture) is live but persistence across hard refresh still unreliable in "release over address bar" scenario. If revisiting: re-instrument with console logging first — do NOT attempt blind fixes.
- **Inbox indicator badges (CON/LEA/WOR/ISS/TEN/TAS/red dot/paperclip) — RESOLVED.** Legend "?" info button next to Sync button in Inbox header.
- **New Inquiry agent (Agent 3) — uses broad LEASING_KEYWORDS filter (2026-07-11).** Manual **+LSG** button in EmailInbox for ambiguous cases — one-click pipeline creation; source='manual_lsg'. lead-capture.js accepts thread_id and links the email_thread on create (link_status='manual_linked'). Agent auto-creates on keyword match; +LSG handles cases that are real but don't hit keywords. Future: if +LSG usage exceeds ~10/day, revisit with Claude-API classifier using confirmed examples as training data.
- **+LSG modal property dropdown scoped to Scott's confirmed 14 active properties (CR1, DCM, LAP, LEEN, LPP, MYN, OMP, PWP, RHS, SAC, SSB, VDN, VVP, WSP) — NOT the same as properties.status='active' (16 rows, includes OLY/WNT which are excluded per Scott 2026-07-11). Property field is optional for general inquiries with no specific building.** Hardcoded as `LSG_PROPERTIES` array with code+name in EmailInbox.jsx; lead-capture.js now allows null prop_code.
- **PipelineView.jsx fetch bug fixed 2026-07-11 — was filtering on stale `status` field instead of `stage`, and had no row limit (silently capped at PostgREST's 1000-row default). Both fixed.** Filter now uses `stage=not.in.(Dead,On Hold,Landlord Declined Use)`; limit set to 5000. Revisit with real pagination if leasing_pipeline approaches 5000 rows.
- **leasing_pipeline reset 2026-07-11 — bulk Podio xlsx import (2408 rows) and non-leasing agent false-positives (16 rows) deleted, leaving 5 real records + 13 seeded 'TEST — ' records spanning all pipeline stages for UI testing.** Full historical Podio data remains untouched in Podio itself and the original xlsx in Drive; this was disposable placeholder data only, never production data. Delete all 'TEST — ' prefixed records before go-live.

## Next Priorities

1. Phase 5 Stage 4 (part 2): PipelineView click-through detail panel (record detail, stage transition buttons, LOI drafting UI, qual gate form)
2. Phase 5 Stage 4 (part 3): Pipeline embed in Property detail Leasing tab — replace inline tab with `<PipelineView propCode={data.prop_code} />` per TODO comment at SedonaCRM.jsx:888
3. Phase 5 Stage 3: Dropbox Sign integration (two-part sequential signing, webhook endpoint)
4. (Optional, low priority) Revisit inbox divider persistence if it becomes a real pain point — see Known Gaps for what's already been ruled out

## TaskDetail Reorganization Notes (2026-07-16, permanent)

- **Note record type removed** — zero rows existed; TYPE_PREFIX, REVERSE_PREFIX, TYPE_LABEL, TYPE_COLOR, TYPE_ICON_MAP, CATEGORY_OPTIONS, typeCounts, TYPE_PILLS, and TYPE_SHORT all cleaned. `NotePencil` import removed.
- **TaskDetail Details tab reorganized into 7 labeled section cards:** Core (title, property, priority, assigned to, status, category) → Follow-Up (alert, FU date, FU notes) → Linked Companies (vendor + tenant, always visible for all record types) → Work Order Details (WO only; Financials and Closeout are collapsed sub-panels defaulting closed) → Notes & Relationships (details, internal notes, depends on, project fields) → Documents (drive folder + podio link, always visible) → Dates (created, last updated, close date — close date always rendered, em dash when empty)
- **Category field** now shows for ALL record types (removed `record_type!=='work_order'` condition)
- **Property field** in TaskDetail closed state shows just prop_code (e.g. "CR1") via new `CodeOnlySelect` component; dropdown options still show "code — name"
- **CompanyContactRow** (vendor + tenant) moved out of WO-only block into always-visible "Linked Companies" section
- **System Info** collapsible block unchanged, remains last
- **Session A2 follow-up fixes (2026-07-16):** (1) Linked Companies column order swapped — Contact is now LEFT, Company is RIGHT (both desktop and mobile stacking order). (2) Text link below field replaced with small circular icon-only corner badge (↗, ~18px, 44px tap target) at the right edge of the select field; appears only when a value is selected. (3) Category hidden in Core when `record_type==='work_order'` — WO Category in the Work Order Details card covers it; Category stays visible in Core for all other types.
- **Session B — contact-first linking (2026-07-16):** Linked Companies section now uses `ContactFirstRow` (contact-first flow): user picks Contact → company auto-fills from that contact's `vendor_id`/`tenant_id` column → both saved atomically via `saveMany`. Company field is read-only display (not a selector). `FieldWithBadge` extracted to module scope (reusable corner-badge pattern for future record types). `CompanyContactRow` kept intact for NewTaskForm's WO section (company-first flow still correct there). Contact URL pattern: `/contacts/${podio_id ?? 'X'+id.slice(-6)}`.
- **Copy Link removed (2026-07-16):** Removed from all 7 detail views: TasksView, IssuesView, WorkOrdersView, ContactsView, OwnersView, VendorsView, KeySafesView. `copied` state, `copyLink` function, and button removed from each. Feature was never needed (URL bar serves this purpose).

## Schema Notes — leasing_pipeline FK gap (permanent)

`leasing_pipeline` has NO FK to `properties`. It links via `prop_code` (text) only. PostgREST join syntax `properties(...)` will NOT work from leasing_pipeline queries. Always query properties separately by prop_code when needed.

## Current Git State

- main: `9ce6031` — merged from preview 2026-07-11 (Scott-approved)
- preview: `1bd1c83` — Session B contact-first vendor/tenant linking (Copy Link removal commit hash TBD after push)

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
- Additional CSS classes: `.crm-desktop-only` (hidden at ≤639px), `.crm-mobile-only` (hidden at ≥640px — added 2026-07-11 for board view mobile/desktop split)

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
- **Phase 5 Stage 1 — 2026-07-11:**
- `leasing_pipeline`: +30 columns — stage_5_state/stage_7_state (pending/complete/NA 3-way), pipeline_source (inbound/notice_triggered), departing_tenant_id FK→tenants, dead_reason/dead_notes, landlord_declined_reason/landlord_declined_notes, on_hold_date/on_hold_notes, qual_business_type/qual_credit_indication/qual_capital/qual_notes/qual_passed/qual_passed_date, app_sent_date/app_received_date, loi_submitted_at/loi_proposed_rent/loi_proposed_term/loi_proposed_start_date/loi_counter_at/loi_counter_rent/loi_counter_term/loi_approved_at/loi_notes, broker_contact_id FK→contacts/broker_commission_pct/broker_commission_note
- `suites`: status CHECK extended with 6th value `'Vacant / For Lease — Pending'` (auto-triggered by notice-to-vacate, internal-only status while current tenancy still active)
- `lease_amendments` + `tenants`: added `restoration_obligations text` (filled at move-out from lease review, per spec item #15)
- `key_handovers`: NEW table — one row per key type per move-in (key_type: suite/dumpster/restroom/key_safe/other); FKs to leasing_pipeline + tenants + properties; RLS (employee/admin only, no anon read)
- `lease_applications`: NEW table — 106-column prospect self-submit intake form; FK to leasing_pipeline; includes computed GENERATED STORED columns for total_assets/total_liabilities/net_worth; consent fields normalized to boolean+timestamp; RLS (employee/admin only, no anon read — contains SSN, financial data)
- **Stage data migration — 2026-07-11:** `leasing_pipeline.stage` migrated from raw Podio values to the 13-value stage model. Original values preserved in `stage_raw_podio` for audit. CHECK constraint `leasing_pipeline_stage_check` added. After migration: 2503 rows total (New Inquiry=833, Info Sent=399, Showing Scheduled=37, Application Sent=22, LOI=11, Lease Drafting=1, Fully Executed=75, Move-In=433, Dead=692). Then reset to 18-record working set for UI testing (see Known Gaps).

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
