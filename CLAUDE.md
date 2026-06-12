# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SedonaCRM — custom AI-powered commercial property management platform replacing Podio + Globimail.
Owner: Scott Anderson, CCIM — Anderson Commercial Properties, Sedona AZ
Portfolio: 14 active NNN commercial properties, each a separate LLC (48 prop_codes total)
GitHub: https://github.com/ACPguy/sedonacrm-dashboard
Production domain: crm.andersoncp.com

## Working Directory

ALWAYS use `~/sedonacrm-dashboard/`. This is the active repo.

## Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build
npm run start

# Daily workflow
cd ~/sedonacrm-dashboard
npm run dev
git add .
git commit -m "description"
git push
```

## Tech Stack

- Next.js + React, hosted on Vercel
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS
- Gmail, Google Calendar, Google Drive (MCP connected)
- Twilio for SMS (Phase 6)
- HelloSign webhooks for e-signature (Phase 3)
- Claude API — Sonnet 4 for AI agents (Phase 4+)

## Supabase

- URL: `https://edxcvyleielzevpappui.supabase.co`
- Anon key: *(Scott to paste anon key here)*
- DB connection: `postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- All tables have RLS enabled
- Anon SELECT grants exist on: `properties`, `tenants`, `rent_schedule`, `work_orders`, `issues`, `leasing_pipeline`, `property_insurance`, `tnt_cois`, `monthly_reports`, `property_taxes`, `suites`, `tasks`, `task_contacts`
- `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` and in Vercel environment variables (used by server-side Gmail/webhook code via `lib/supabaseServer.js`)

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
  CommunicationTimeline.jsx — reusable unified comms timeline (email/note/call); used in Tasks, Contacts, Tenants
  IssuesView.jsx            — issues list + detail (routed, accepts prop_code filter)
  WorkOrdersView.jsx        — work orders list + detail (routed, accepts prop_code filter)
  TasksView.jsx             — unified tasks list + detail, all 6 record types (routed); has Details|Comms tabs
  TenantsView.jsx           — tenants list + detail (routed, accepts prop_code filter); has Communications tab
  SuitesView.jsx            — suites list + detail (routed, accepts prop_code filter)
  RentScheduleView.jsx      — rent schedule list + detail (routed, accepts prop_code filter)
  ContactsView.jsx          — contacts list + detail (routed); has Comms tab
  VendorsView.jsx           — vendors list + detail (routed)
  OwnersView.jsx            — property owners list + detail (routed)
  shared/
    TasksTable.jsx     — shared reusable tasks table (self-fetching, filterable)
    WorkOrdersTable.jsx, TenantsTable.jsx, SuitesTable.jsx, IssuesTable.jsx, ContactsTable.jsx

~/sedonacrm-dashboard/lib/
  gmail.js               — getGmailClient() (OAuth2 + token refresh), setupWatch()
  drive.js               — getDriveClient(), getOrCreateWorkHistoryFolder(), createTaskFolder(), createIndexPdf()
  drivePropertyFolders.js — hardcoded prop_code → Google Drive root folder ID map (14 active properties)
  supabaseServer.js      — createServerClient() using SUPABASE_SERVICE_ROLE_KEY

~/sedonacrm-dashboard/utils/
  taskPrefix.js   — getTaskPrefix(task): prop_code-based display ID (CR1-3685); display-only, never in URLs
  formatDate.js   — formatDate(val): MM-DD-YYYY UTC formatter

~/sedonacrm-dashboard/pages/
  index.jsx            — main SPA entry (SedonaCRM shell)
  tasks/index.jsx + [id].jsx   — /tasks, /tasks/3737 (bare task_num URLs)
  issues/index.jsx + [id].jsx
  work-orders/index.jsx + [id].jsx
  tenants/index.jsx + [id].jsx
  rent-schedule/index.jsx + [id].jsx
  contacts/index.jsx + [id].jsx
  vendors/index.jsx + [id].jsx
  owners/index.jsx + [id].jsx
  settings/index.jsx
  inbox/index.jsx      — /inbox — EmailInbox in AppShell
  api/gmail/webhook.js      — Pub/Sub push receiver; processes history, upserts email_threads + email_messages + communication_timeline
  api/gmail/send.js         — POST: send email via Gmail API; injects CRM header + footer; writes timeline
  api/gmail/thread-update.js — POST: mark-read / archive via service-role PATCH
  api/ai/summarize.js        — POST {threadText} → Anthropic API → {summary}
  api/ai/draft-reply.js      — POST {threadText} → Anthropic API → {draft}
  api/tasks/create-drive-folder.js — POST {taskId}: creates Work History subfolder + 000_CR1-N_Info.pdf
```

## Standalone Portfolio Views (routed Next.js pages)

- Tasks — fully routed (`/tasks`, `/tasks/[task_num]` e.g. `/tasks/3737` — bare task_num, no prefix)
- Inbox — fully routed (`/inbox`) — EmailInbox two-panel view
- Issues — fully routed (`/issues`, `/issues/[id]`)
- Work Orders — fully routed (`/work-orders`, `/work-orders/[id]`)
- Tenants — fully routed (`/tenants`, `/tenants/[id]`)
- Suites — fully routed (`/suites`, `/suites/[id]`)
- Rent Schedule — fully routed (`/rent-schedule`, `/rent-schedule/[id]`)
- Contacts — fully routed (`/contacts`, `/contacts/[id]`)
- Vendors — fully routed (`/vendors`, `/vendors/[id]`)
- Owners — fully routed (`/owners`, `/owners/[id]`)
- Settings — fully routed (`/settings`) — Gmail OAuth connect
- Properties list — built (SPA only, property detail is the next build)
- Leasing Pipeline — SPA view only (not routed)
- Calendar — pending
- Morning Briefing / Dashboard — pending

## Per-Record Standards

Every record in the system gets:
- Unique URL with deep linking
- Copy link button
- Communication thread (email + SMS + internal notes)
- Field-level audit log
- HelloSign e-signature button
- AI summarize thread button
- Google Drive file attachments

## User Roles

- **Admin (Scott):** everything
- **Employee:** properties, tenants, work orders, tasks, communications — no financials
- **Vendor:** only their assigned work orders

## Valid prop_codes (48 total, 14 active)

```
1McC, 777, ACP, ART, ARVS, ATS, CDY, CHQ, COB, CPP, CR1, CRMS, CVP, DCC, DCM, DCP,
DEM, DON, FOX, KOD, KTA, LAP, LASO, LEEN, LPP, MILL, MYN, OLY, OMP, PLZ, PW213, PWP,
RHS, RR, SAC, SEP, SS, SSB, STP, SUNT, SWV, SYC, VDN, VVP, WAL, WNT, WSP, YAV
```

## Seeding Rules

Use `psql` only — never the Supabase SQL editor.

```bash
export DB='postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
```

- Chromebook: all files land in `/home/scott/` (Linux files root), NOT `~/Downloads`
- Before seeding any table: check columns, drop CHECK+FK constraints, test with R01, run full loop
- CASCADE check before any TRUNCATE
- Working directory for all file edits: `~/sedonacrm-dashboard/`

## Phase Status

- **Phase 0:** Complete
- **Phase 1:** Complete (26 tables seeded, 3 deferred)
- **Phase 2:** IN PROGRESS — UI build
- **Phase 3 Stage 1:** Complete — Gmail OAuth, /settings page
- **Phase 3 Stage 2A:** Complete — 5 Gmail DB tables, webhook receiver, lib/gmail.js, lib/supabaseServer.js
- **Phase 3 Stage 2B:** Complete — CommunicationTimeline.jsx wired into Tasks, Contacts, Tenants
- **Phase 3 Stage 2C:** Complete — EmailInbox + EmailCompose + AppShell Inbox nav + unread badge + AI summarize/draft
- **Drive folder auto-creation:** Complete — lib/drive.js, drivePropertyFolders.js, /api/tasks/create-drive-folder; + Drive scope in OAuth
- **Drive index PDF:** Deferred — createIndexPdf() implemented, folder creation works, PDF media upload silently failing; investigate next session
- **Phase 4+:** Pending

## Gmail DB Tables (Phase 3 Stage 2A)

Five tables created in Supabase for the Gmail integration:

| Table | Purpose |
|---|---|
| `email_accounts` | One row per connected Gmail account; stores OAuth tokens, pubsub watch state |
| `email_threads` | One row per Gmail thread; linked to a CRM record via `linked_record_type` + `linked_record_id` |
| `email_messages` | One row per Gmail message; stores headers, body (html/text), direction |
| `email_thread_links` | Junction: many records can be linked to one thread (primary + reference links) |
| `communication_timeline` | Unified activity log per record: entry_type = email / note / call / sms |

`communication_timeline` fields used by CommunicationTimeline.jsx:
- `record_type`, `record_id` — the CRM record this entry belongs to
- `entry_type` — 'email' | 'note' | 'call' | 'sms'
- `email_message_id`, `email_thread_id` — FKs for email entries
- `subject`, `body_preview`, `direction`, `from_address`, `from_name`, `entry_at`
- `is_reference`, `reference_record_type`, `reference_record_id`, `reference_label`, `reference_url`

## Session Management

1. **Run /compact before closing** — At the end of every working session, run `/compact` to summarize the conversation and reduce context size before closing.

2. **Start a fresh session after each major feature or ~2 hours** — Exit and re-launch Claude Code after completing each major feature or after approximately 2 hours of work, whichever comes first. This keeps context lean and prevents slowdowns.

3. **Read CLAUDE.md first on every new session** — Before doing anything else at the start of a new session, read this file to restore full project context.

4. **Update Next Priorities after every session** — After completing work, update the "Next Priorities" section below with what was finished and what comes next, so the next session picks up exactly where this one left off.

## Session Close Procedure (mandatory — every session)

At the end of every session, CC must complete ALL of the following steps in order:

1. Update CLAUDE.md with everything built this session (new files, schema changes,
   architecture rules, known gaps, next priorities)

2. Commit CLAUDE.md to main:
   ```
   git add CLAUDE.md
   git commit -m "CLAUDE.md: update after [session topic]"
   git push origin main
   ```

3. Write build log to `~/[YYYY-MM-DD]_SedonaCRM_Build_Log_[Topic].md`

PERMANENT RULES — CLAUDE.md Drive archive:
- The repo file is always CLAUDE.md (never rename — CC auto-reads it by this exact filename)
- Drive archive copies are named with a date prefix: CLAUDE_YYYY-MM-DD.md (e.g. CLAUDE_2026-06-11.md)
- Never overwrite a previous Drive archive copy — always create a new dated file
- After uploading the new dated copy, move the previous dated copy to the Archive folder
- Keep all dated copies in Archive indefinitely — never delete them

4. Upload build log to Google Drive:
   - parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA` (2 - Build Log folder)
   - contentMimeType: `text/plain`
   - disableConversionToGoogleType: `true`
   - Title: `YYYY-MM-DD_SedonaCRM_Build_Log_Topic.md` (exact filename)

5. Upload updated CLAUDE.md to Google Drive as a new dated file:
   - Title: `CLAUDE_YYYY-MM-DD.md` (e.g. `CLAUDE_2026-06-12.md`)
   - parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA` (2 - Build Log folder — keep current copy here)
   - contentMimeType: `text/plain`
   - disableConversionToGoogleType: `true`

6. Move the PREVIOUS session's CLAUDE_YYYY-MM-DD.md to the Archive folder:
   - Archive folder ID: `1I1kBuVZd7jbLh_WYzFtEBzrtmKcvazfb`
   - Use Drive MCP move or copy+delete to relocate the old dated file
   - Never delete old copies — archive only

7. Report both Drive file IDs to confirm successful upload.

NEVER skip any of these steps. NEVER upload `.md` files without
`disableConversionToGoogleType: true` — they will convert to Google Docs.
NEVER upload to the wrong folder.

## Permanent Terminology Notes

- **`property_agreements` table** (14 rows) = ACP's management agreement with property owners. Contains: commission structures, management fees, agreement start/end/expiration dates, and terms of ACP's contract to manage and lease the property. This is **NOT** the leasing pipeline. Never confuse these.

## Architecture Rule — Single Source of Truth for All Table Components

Every table/list view in the app must have exactly **ONE** shared component that is used everywhere.
The primary version is always the one in the left-hand navigation pane.
That component is built once, lives in `components/shared/`, and is imported everywhere it is needed.
**NEVER build a second version of a table for use in a sub-view, tab, or detail form.**
Instead, pass props to the shared component to control filtering and hide features not needed in that context.

**Standard props every shared table component must accept:**
- `filterPropCode` (string, optional) — auto-filter to this property
- `filterTenantId` (string, optional) — auto-filter to this tenant
- `hidePropertyFilter` (boolean) — hides preset property sort buttons when used inside a property detail
- `hideSearch` (boolean, optional) — hides search bar if not needed in context

Any change made to a shared component automatically reflects everywhere it is used.
**If CC finds itself creating a second version of an existing table — STOP and use the shared component instead.**

## Workflow Rule — Preview Branch Only

All code changes go to the `preview` branch — never directly to `main`.
Never run `git push origin main` unless Scott explicitly says "approved, merge to main."
Always run `npm run build` before pushing — zero errors required.
When stopped and waiting for Scott, always run:
```
echo -e "\a\a\a" && echo "★★★ STOPPED — WAITING FOR SCOTT ★★★"
```

## Development Rules

1. **SELECT DISTINCT before any UI field from Podio** — Before building any dropdown, filter, badge, or component that displays or filters a field sourced from Podio data, always run `SELECT DISTINCT col FROM table ORDER BY col;` to confirm the exact values in the database. Never hardcode options without checking first.

2. **npm run dev before every commit** — After every set of changes, run `npm run dev` (or `npm run build`) and confirm no build errors before committing or pushing. Fix errors first, then push. Never push broken code to GitHub (it deploys broken to Vercel).

3. **Left nav always-navigate on click** — Nav items must always navigate on click, even when the user is already on that module or inside a detail record. Use the `handleNav`/`go` pattern: if `router.asPath` already matches the target path (exact, or starts with `path + '/'`, or `path + '?'`), call `router.replace(path).then(() => router.reload())`; otherwise call `router.push(path)`. Never use `?t=Date.now()` — Next.js does not re-mount components for same-path navigations with different query params. This pattern is in `go()` in AppShell.jsx and `handleNav()` in SedonaCRM.jsx; apply the same logic in any new nav code.

4. **Date fields always use `<input type="date">`** — Any editable field that stores a date must use `<input type="date">` so the browser's native calendar picker opens on click. Display mode (not editing) must always show MM-DD-YYYY via `fmtDate()`. Value stored/sent to Supabase must be YYYY-MM-DD. This applies to `InlineBlurField` (pass `type="date"`) and `EditableField` (pass `type="date"`). No exceptions unless Scott explicitly requests otherwise.

5. **Pill hover rule** — Inactive pills in any pill picker (`PriorityPills`, `StatusPills`, and any similar component) show a semi-transparent (~20% alpha) version of their active color on hover, via `onMouseEnter`/`onMouseLeave` setting `background`. Use `transition: 'background 0.15s ease'` on all pills. Active pill: no hover change — leave it alone.

6. **Multi-line text fields** — All `RichTextEditor` and `<textarea>` fields use `minRows={5}` (default). Edit mode: minimum 120px tall (`minRows * 24px`); always include 72px bottom padding so there are 3 lines of blank space below the cursor; content auto-expands to show all existing text with no scrollbar. Always include the full TipTap toolbar. Label div inside `RichTextEditor` stays conditional (`{label && ...}`).

7. **Destructive Database Operations — ALWAYS STOP AND CONFIRM** — Before executing ANY of the following, stop and tell me exactly what you are about to run and why, then wait for my explicit confirmation before proceeding:
   - TRUNCATE (any table)
   - DROP TABLE or DROP COLUMN
   - DELETE FROM (any table)
   - Any ALTER TABLE that removes or modifies existing data
   - Any psql command that could result in data loss

   This rule applies even when --dangerously-skip-permissions is active.
   For all other operations (file reads, file writes, git, npm, SELECT queries), proceed without asking.

8. **High-volume list views default to Open only — never fetch all records on mount** — Work Orders and Issues list views load only Open (non-closed) records by default. Closed records are NOT fetched until the user explicitly selects a Closed or All filter pill. Each filter pill click triggers a new Supabase query — do NOT filter a pre-loaded full dataset client-side. This applies everywhere these tables render: standalone list views, Property detail tabs, Tenant detail tabs, Contact detail tabs, and any other embedded context.

9. **Mobile stat summary rows are always pill-style horizontal scroll** — Any row of summary statistics rendered above a table (occupancy stats, financial totals, portfolio counts, or any other KPI summary) must use the `.stats-pill-row` + `.stat-pill` CSS pattern on mobile (< 768px). Desktop layout is unrestricted. Never render a multi-row grid of stat cards on mobile — it consumes too much vertical space. Use `.md-hidden` on the mobile pill row (shows on mobile, hidden on desktop) and `.mobile-hidden` on the desktop grid (hidden on mobile, shows on desktop). This applies to all existing and future list views: Tenants, Properties, Work Orders, Issues, Contacts, Vendors, Owners, and any new module added in future phases.

10. **Filter state is always encoded in URL query params** — Every list view with filter pills (prop_code, type, priority, status, or any other filter dimension) must encode the active filter state into the URL via `window.history.replaceState` on every filter change, and restore state from URL params on mount. Use a `hasMounted` ref to skip the initial sync so the restore effect runs first. This ensures the browser back button and the detail-view back button always return to the exact filtered state the user was in. Apply to all existing modules (Tasks, Work Orders, Issues, Tenants, Contacts, Vendors, Owners, Properties) and all future list views added in Phases 3 through 10.

## URL Routing Rules (permanent)

- All detail page routes use `podio_id`, NOT UUID
- Pattern: `/[module]/[podio_id]` — e.g. `/work-orders/3737`, `/tenants/2556`
- Detail page lookup: if param contains hyphens → `WHERE id = param` (UUID fallback for old bookmarks); otherwise → `WHERE podio_id = param`
- List view link generation: always use `record.podio_id ?? 'X'+record.id.slice(-6)`
- X-prefix fallback (e.g. `X32f3fc`) = null podio_id row; cold URL load will return not-found (acceptable until podio_ids are populated)
- Production domain: crm.andersoncp.com
- Never construct detail URLs using UUID directly
- Tables with full podio_id coverage: tenants (312/312), suites (177/177), rent_schedule (1406/1406), work_orders (2914/2914), contacts (2539/2539), issues (1233/1234), properties (47/48)
- Tables with ZERO podio_id coverage (all X-fallback): vendors (0/622), property_owners (0/43)
- Vendors podio_id: not available in xlsx export — will be populated at go-live via Podio API sync; currently uses X-fallback URLs

## Routing Pattern (established — all major modules complete)

All modules follow the same Next.js routing pattern. Issues was the template; all others now match.

**File structure per module:**
```
pages/<module>/index.jsx    — list page, wraps component in AppShell
pages/<module>/[id].jsx     — cold-loadable detail page, loads by podio_id
components/<Module>View.jsx — named exports: sbFetch, sbPatch, T, F, fmtDate, css,
                               StatusBadge, EditableField, ActivityPanel, <Module>Detail
                               default export: <Module>View (list, used by index page)
components/AppShell.jsx     — shared sidebar/chrome for all routed pages
```

**Navigation rules:**
- All routed modules: SedonaCRM nav → `router.push('/<module>')` (not navTo)
- AppShell nav: routed modules → `/<module>`, SPA-only views → `/?view=xxx`
- SedonaCRM reads `router.query.view` on load and sets currentView
- Ctrl+click a row → native anchor tag (href set on `<a>` wrapping the row cell)
- Back button in detail → `sessionStorage.getItem('<module>BackUrl') || '/<module>'`
- Escape key in detail → calls onBack()

**When adding a new routed module (e.g. Properties detail, Suites):**
1. Add named exports to the component (sbFetch, T, F, Detail component, etc.)
2. Create `pages/<module>/index.jsx` wrapping the view in AppShell
3. Create `pages/<module>/[id].jsx` loading the record by podio_id
4. Add nav item to AppShell pointing to `/<module>`
5. Change SedonaCRM nav onClick to `router.push('/<module>')`

## Tasks Module — DB Architecture Notes

**tasks table** (4,368 rows as of 2026-06-06):
- record_type: work_order (2,914), task (1,234), sg_task (220), note/project/acp_task (0 — ready for new records)
- UNIQUE index: `(record_type, task_num)` — global unique on task_num alone is impossible because WO and issue Podio IDs overlap in 1,046 values across apps
- task_num is the Podio ID for work_orders and tasks; sequential (1–220) for sg_tasks
- **Display IDs:** `getTaskPrefix(task)` → prop_code-based e.g. `CR1-3685`, `ACP-1816`, or bare `3685` if no prop_code — display only, never in URLs
- **URL format:** `/tasks/3685` — bare task_num only. `parsePrefixedId` handles both bare numbers and legacy `WO-N` format (backwards-compatible)
- **Lookup:** bare task_num queries without record_type filter, `order=record_type.desc` so work_order wins on conflicts
- Internal type prefixes (WO-, TSK-) — used only in `formatTaskNum()` export; not used in URLs or display
- Sequences: work_order=3717, task=1846, acp_task=518, note=1, sg_task=220
- wo_status mapping applied: work_order status = Open (151), Closed (2,336), Cancelled (427)
- Added columns (2026-06-09): `drive_folder_id TEXT`, `drive_folder_url TEXT`, `drive_index_pdf_id TEXT`

**task_sequences table**: tracks next task_num per record_type. Trigger `trg_tasks_assign_num` fires BEFORE INSERT, auto-increments and assigns task_num.

**task_contacts table**: junction between tasks and contacts (migrated from issue_contacts; 0 rows since issue_contacts was empty).

## Next Priorities

**Completed sessions up to 2026-06-09:**

- Phase 3 Stage 1: Gmail OAuth + /settings page
- Phase 3 Stage 2A: 5 Gmail DB tables + webhook receiver + lib/gmail.js + lib/supabaseServer.js
- Phase 3 Stage 2B: CommunicationTimeline.jsx wired into TasksView, ContactsView, TenantsView
- Phase 3 Stage 2C: EmailInbox + EmailCompose + /inbox route + AppShell unread badge + AI summarize/draft-reply
- Tasks: prop_code-based display IDs (CR1-3685), bare task_num URLs (/tasks/3685), router.push navigation
- Drive folder auto-creation for WOs: lib/drive.js + drivePropertyFolders.js + /api/tasks/create-drive-folder
- OAuth scope fix: added Drive scope, fixed callback (Gmail profile endpoint, emailAddress field, service key for both upserts)
- Index PDF: createIndexPdf() implemented in lib/drive.js; PDF media upload silently failing — deferred
- All changes merged to main

**Completed session 2026-06-11 — Tasks module bug fixes (preview branch):**

- BUG FIX: `TasksTable.jsx` — `navigate()` now writes `tasksNavList` (stores `{id, task_num, record_type}` tuples), `tasksNavIndex`, `tasksBackUrl` to sessionStorage before `router.push`; fixes wrong task opening when multiple record_types share the same task_num integer
- BUG FIX: `TasksTable.jsx` — added `filterContactId` prop with async `task_contacts` junction fetch; empty result guard returns `[]` immediately
- BUG FIX: `TasksTable.jsx` — added `backUrl` prop (written to `tasksBackUrl` on navigate); mobile cards unified to call `navigate(task)` instead of raw `router.push`
- BUG FIX: `TasksView.jsx` — mobile cards `onClick` now checks `embeddedMode` before calling `onSelect`; uses `window.location.href` when embedded so Property/Owners detail task rows navigate correctly
- UI: TYPE_PILLS reordered and relabeled → All, WO, TSK, Proj., ACP, S&G, Note
- UI: TasksView type strip and priority+status row get `.filter-row` class (always scrollable, nowrap)
- UI: Mobile FAB updated — 56px diameter, `ChatCircle size=26 weight="fill"`, `#E8630A` orange; `isMobile` converted to `useState` + resize listener (was one-time `window.innerWidth` check at mount)
- UI: `.filter-row` CSS class added to `styles/globals.css` — `flex-wrap:nowrap`, `overflow-x:auto`, `-webkit-overflow-scrolling:touch`, `scrollbar-width:none`, `padding-bottom:4px`; `.filter-row > *` sets `flex-shrink:0`
- UI: `.filter-row` applied to property strip in WorkOrdersView, IssuesView, TenantsView, ContactsView; and outer filter bar in VendorsView, OwnersView
- Commit: `1e8b3ad` on `preview` branch

**Completed session 2026-06-11 — Group 1-3 bug fixes (preview branch):**

- BUG FIX: `pages/tasks/[id].jsx` — reads `tasksNavList[navIdx]` from sessionStorage before rendering `TaskDetail`; builds prefixed ID (e.g. `TSK-3685`) so `parsePrefixedId` gets the correct `record_type`, fixing wrong-record opens for task records that share a task_num with a work_order
- BUG FIX: `TasksTable.jsx` — navL now stores `{ task_num, record_type }` (no `id`); `navigate()` finds idx by both fields; empty state changed to "No tasks found" (colSpan=99); added `console.log` for junction/fetch debugging; `backUrl` stores `window.location.href`
- BUG FIX: `TasksView.jsx` — mobile cards navL uses `{ task_num, record_type }`; `tasksBackUrl` stores `window.location.href` (not just pathname); added `hasMounted` ref + URL restore effect (reads `?prop/type/priority/status` on mount) + URL sync effect (writes on filter change)
- BUG FIX: `VendorsView.jsx`, `TenantsView.jsx`, `ContactsView.jsx` — switched embedded tasks tab from `<TasksView embeddedMode/>` to `<TasksTable/>` (shared component); each passes `backUrl={window.location.href}` and `hidePropertyFilter`
- UI: `WorkOrdersView.jsx` + `IssuesView.jsx` — Row 2 filter div (priority/status) now has `filter-row` class for mobile horizontal scroll
- UI: `TenantsView.jsx` — mobile stats bar replaced with `.stats-pill-row` / `.md-hidden` pills; desktop card grid now has `.mobile-hidden`; both in same wrapper div
- CSS: `styles/globals.css` — added `.stats-pill-row`, `.stat-pill`, `.stat-label`, `.stat-value`, `.mobile-hidden`, `.md-hidden` per Rule 9
- `CLAUDE.md` — Development Rules 9 and 10 added; Session Close Procedure updated (Steps 4-7 with dated archive pattern)
- Commit on `preview` branch

**Tasks navigation — RESOLVED (2026-06-12 session 3):**

**Root cause (commit `8800fc7`):** `TasksView.jsx`'s filter-URL sync (Rule 10) and `goNav` prev/next were calling `history.replaceState({}, '', url)` with a bare empty object. This stripped Next.js's internal `__N` marker from `event.state`. When Backspace fired a `popstate`, Next's router checked `event.state.__N`, found it absent, and did nothing — leaving the page frozen on the first press. Second Backspace hit a stale history entry, cycling instead of returning.

**Fix:** spread the existing state: `replaceState({...window.history.state, url, as: url}, '', url)`. `__N` is preserved on every replaceState call. Next's popstate handler sees it and performs the route transition normally.

**Confirmed PASS (fresh incognito, commit `8800fc7`):**
1. ✅ Overlay values agree (history.length, asPath, location)
2. ✅ Backspace once → filtered list re-renders correctly (asPath + location = /tasks?prop=LEEN&type=task)
3. ✅ Backspace again → goes to actual prior page (confirmed correct on truly fresh session)
4. ✅ Escape, on-screen Back, prev/next all still work
5. ✅ history.length stable across prev/next

**NavDebugOverlay removed (same session):** Component deleted from `pages/tasks/[id].jsx` — no longer needed.

**Known gaps / still open (non-navigation):**
- PENDING: Filter state URL encoding (Rule 10) not yet applied to Work Orders, Issues, Tenants, Contacts, Vendors, Owners list views (only Tasks done)
- PENDING: Index PDF upload silently failing — investigate pdf-lib Readable stream + Drive media upload
- PENDING: "Link to record" button in EmailInbox thread detail — console.log placeholder
- PENDING: File attachments in EmailCompose — drag/drop UI exists, actual send not wired
- PENDING: Drive folder map missing: LPN, WNT, OLY, SSP — deferred until folders are created in Drive
- PENDING: Gmail backfill (/api/gmail/backfill) — not yet triggered
- PENDING: Populate podio_id for vendors — deferred to go-live Podio API sync
- PENDING: Property detail remaining tabs: Financial (CAM/Taxes/PM Fees/Invoices/Insurance), Operations (Inspections), Ownership (Owners/Agreements/Reports)

**Completed session 2026-06-12 session 1 — Tasks navigation record lookup fixed (preview branch):**
- BUG FIX: `TasksView.jsx` TaskDetail fetch useEffect — unambiguous record_type lookup (commit `5b9d011`)
- CLEANUP: `pages/tasks/[id].jsx` — removed RT_PREFIX roundtrip, passes bare `id` as `prefixedId`

**Completed session 2026-06-12 session 2 — revert + instrument (preview branch):**
- REVERT: `fb3c3b0` reverted via `8af6e2e` — router.back() broke all triggers
- ADDED: NavDebugOverlay in `pages/tasks/[id].jsx` gated by `NEXT_PUBLIC_DEBUG_NAV=1` (commit `e225d5c`)
- NOTE: main branch still has record lookup bug (from `be19e0c`). Do not merge until Backspace is also resolved.

**Completed session 2026-06-12 session 3 — Tasks navigation RESOLVED, merged to main:**
- ROOT CAUSE FOUND: bare `{}` in `history.replaceState` stripped Next.js `__N` marker → popstate handler no-op on first Backspace
- FIX: `{...window.history.state, url, as: url}` spread in both `TasksView.jsx` (filter URL sync) and wherever `goNav` calls replaceState (commit `8800fc7`)
- REMOVED: `NavDebugOverlay` from `pages/tasks/[id].jsx` (no longer needed)
- MERGED: preview → main; deployed to crm.andersoncp.com

**Next priorities (start here next session):**
1. Debug embedded Tasks tabs — Property/Owner/Tenant/Vendor/Contact detail all 5 report broken header/missing columns/truncated Task # (separate session, Prompt 2)
2. Debug index PDF upload (pdf-lib Readable stream issue)
3. Filter state URL encoding (Rule 10) for Work Orders, Issues, Tenants, Contacts, Vendors, Owners
4. Phase 4: Workflow automations + Agents 1/3/4/7/9

## Task ID Display vs URL Rule (permanent)

- **Display:** `getTaskPrefix(task)` from `utils/taskPrefix.js` → prop_code prefix e.g. `CR1-3685`, `ACP-1816`, or bare `3685` if no prop_code. Used in table `#` column, page title, badge, CRM email footer label.
- **URL:** Always bare `task_num` — `/tasks/3685`. Never use `formatTaskNum()` (WO-prefix) in URLs.
- **`formatTaskNum()`** is a named export still available but used only internally for legacy `parsePrefixedId` reverse-lookup. Do not use in new URL construction.
- **Lookup (in-app):** `TaskDetail` fetch useEffect reads `tasksNavList[tasksNavIndex]` from sessionStorage; uses `task_num=eq.N&record_type=eq.X` — unambiguous, correct record always opens.
- **Lookup (cold load / no navList match):** `task_num=eq.N&order=record_type.desc` fallback — `work_order` wins on collisions. Acceptable for bare bookmarked/shared URLs.

## OAuth / Google API Rules (permanent)

- **Token store:** `email_accounts` table is the canonical OAuth token store. Never read from `gmail_tokens` for API calls — `gmail_tokens` is Stage 1 legacy only.
- **Callback profile fetch:** Use `https://gmail.googleapis.com/gmail/v1/users/me/profile` (not the userinfo endpoint) — requires only `gmail.modify` scope. Field is `emailAddress` not `email`.
- **Re-auth must be done on production URL:** `GOOGLE_REDIRECT_URI` is set to `crm.andersoncp.com`. OAuth re-auth will not work from preview/localhost — always do it at crm.andersoncp.com/settings.
- **Scopes (current):** `gmail.modify`, `gmail.send`, `drive` — do not add `userinfo.email`; use Gmail profile endpoint instead.
- **Drive client:** `getDriveClient(emailAccountId)` in `lib/drive.js` — reuses same OAuth2 token + refresh pattern as `getGmailClient()`.

## Drive Folder Architecture (permanent)

- **Trigger:** Manual `+ Drive Folder` button in work_order task detail header. Fire-and-forget POST to `/api/tasks/create-drive-folder`.
- **Structure:** `[Property Root]/Work History/[displayId] — [title] — [YYYY-MM-DD]/`
- **Property root folders:** Hardcoded in `lib/drivePropertyFolders.js` (14 active properties). Missing properties return 400.
- **Index PDF:** `000_[propCode]-[taskNum]_Info.pdf` created inside the task folder — best-effort, never blocks folder creation.
- **Error handling:** PDF errors logged only, never surfaced to user. Folder creation success is returned immediately.
- **DB columns:** `tasks.drive_folder_id`, `tasks.drive_folder_url`, `tasks.drive_index_pdf_id`

## History API Rules (permanent)

**ALWAYS spread existing state in replaceState/pushState calls:**
```js
// CORRECT — preserves Next.js __N marker
window.history.replaceState({ ...window.history.state, url: newUrl, as: newUrl }, '', newUrl);

// WRONG — strips __N, breaks popstate/Backspace in Next.js router
window.history.replaceState({}, '', newUrl);
```

**Why:** Next.js's popstate handler checks `event.state.__N` to decide whether to perform a client-side route transition. A bare `{}` wipes this marker. On first Backspace the router sees no `__N` and does nothing — page freezes. Second Backspace hits an older stale entry, causing cycling rather than returning to the list.

**Scope note:** Other modules (WorkOrders, Issues, Tenants, etc.) also call `replaceState` for filter-URL sync but use SPA-style popstate listeners rather than relying on Next's router for Back — different architecture, not necessarily broken today. Flag and fix if any future module routes through Next's router-based back navigation.

**Applies to:** any `window.history.replaceState` or `window.history.pushState` call in this codebase. No exceptions.

## Prev/Next Navigation Rule (permanent)

All detail views support keyboard (ArrowLeft/ArrowRight) and button (‹ ›) navigation across the list that opened them.

**List view writes to sessionStorage on row click:**
```js
const navL = items.map(r => ({ id: r.id, podio_id: r.podio_id })); // include only fields needed by goNav
sessionStorage.setItem('{module}NavList', JSON.stringify(navL));
sessionStorage.setItem('{module}NavIndex', String(items.findIndex(r => r.id === item.id)));
```

**Detail view pattern:**
- State: `const [navList,setNavList]=useState(null); const [navIdx,setNavIdx]=useState(-1); const [navLoading,setNavLoading]=useState(false);`
- Mount useEffect reads `{module}NavList` / `{module}NavIndex` from sessionStorage (empty dep array)
- `goNav(dir)` fetches adjacent record, calls `setData(newRec)`, updates `navIdx`, writes new index to sessionStorage, calls `window.history.replaceState({...window.history.state, url: newUrl, as: newUrl}, '', newUrl)`
- `goNavRef` pattern: `const goNavRef=useRef(goNav); goNavRef.current=goNav;` placed after `goNav` definition, before early returns — arrow key useEffect uses `goNavRef.current` with empty dep array
- Arrow key useEffect skips when `e.target.tagName` is input/textarea/select or `e.target.isContentEditable`
- Nav UI: shown only when `navList && navList.length > 1`; right-aligned in header first flex div via `marginLeft:'auto'`; CaretLeft/CaretRight size=18 weight="bold" from @phosphor-icons/react

**Per-module keys and identifiers:**
| Module | NavList key | NavIndex key | Identifier | goNav query | URL |
|---|---|---|---|---|---|
| Tasks | tasksNavList | tasksNavIndex | `{task_num,record_type}` | task_num=eq.N (+ record_type if known) | `/tasks/N` |
| WorkOrders | workOrdersNavList | workOrdersNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/work-orders/N` |
| Issues | issuesNavList | issuesNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/issues/N` |
| Tenants | tenantsNavList | tenantsNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/tenants/N` |
| Suites | suitesNavList | suitesNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/suites/N` |
| RentSchedule | rentNavList | rentNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/rent-schedule/N` |
| Contacts | contactsNavList | contactsNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/contacts/N` |
| Vendors | vendorsNavList | vendorsNavIndex | `{id,podio_id}` | podio_id (or id fallback) | `/vendors/N` or `/vendors/XsufFix` |
| Owners | ownersNavList | ownersNavIndex | `{id,podio_id}` | podio_id (or id fallback) | `/owners/N` or `/owners/XsufFix` |
| KeySafes | keySafesNavList | keySafesNavIndex | `{id}` | `id=eq.UUID` | `/key-safes/XsufFix` |
