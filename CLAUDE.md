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
  AppShell.jsx         — shared sidebar/chrome for all routed pages
  SedonaCRM.jsx        — main shell, nav, routing, Home dashboard, Properties list
  IssuesView.jsx       — issues list + detail (routed, accepts prop_code filter)
  WorkOrdersView.jsx   — work orders list + detail (routed, accepts prop_code filter)
  TasksView.jsx        — unified tasks list + detail, all 6 record types (routed)
  TenantsView.jsx      — tenants list + detail (routed, accepts prop_code filter)
  SuitesView.jsx       — suites list + detail (routed, accepts prop_code filter)
  RentScheduleView.jsx — rent schedule list + detail (routed, accepts prop_code filter)
  ContactsView.jsx     — contacts list + detail (routed)
  VendorsView.jsx      — vendors list + detail (routed)
  OwnersView.jsx       — property owners list + detail (routed)
  shared/
    TasksTable.jsx     — shared reusable tasks table (self-fetching, filterable)
    WorkOrdersTable.jsx, TenantsTable.jsx, SuitesTable.jsx, IssuesTable.jsx, ContactsTable.jsx

~/sedonacrm-dashboard/pages/
  index.jsx            — main SPA entry (SedonaCRM shell)
  tasks/index.jsx + [id].jsx   — /tasks, /tasks/WO-3737 (prefixed task_num URLs)
  issues/index.jsx + [id].jsx
  work-orders/index.jsx + [id].jsx
  tenants/index.jsx + [id].jsx
  rent-schedule/index.jsx + [id].jsx
  contacts/index.jsx + [id].jsx
  vendors/index.jsx + [id].jsx
  owners/index.jsx + [id].jsx
  settings/index.jsx
```

## Standalone Portfolio Views (routed Next.js pages)

- Tasks — fully routed (`/tasks`, `/tasks/[prefixed_id]` e.g. `/tasks/WO-3737`)
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
- **Phase 3+:** Pending

## Session Management

1. **Run /compact before closing** — At the end of every working session, run `/compact` to summarize the conversation and reduce context size before closing.

2. **Start a fresh session after each major feature or ~2 hours** — Exit and re-launch Claude Code after completing each major feature or after approximately 2 hours of work, whichever comes first. This keeps context lean and prevents slowdowns.

3. **Read CLAUDE.md first on every new session** — Before doing anything else at the start of a new session, read this file to restore full project context.

4. **Update Next Priorities after every session** — After completing work, update the "Next Priorities" section below with what was finished and what comes next, so the next session picks up exactly where this one left off.

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
- URL prefix: WO-N, TSK-N, SG-N, NOTE-N, PRJ-N, ACP-N
- Sequences: work_order=3717, task=1846, acp_task=518, note=1, sg_task=220
- wo_status mapping applied: work_order status = Open (151), Closed (2,336), Cancelled (427)

**task_sequences table**: tracks next task_num per record_type. Trigger `trg_tasks_assign_num` fires BEFORE INSERT, auto-increments and assigns task_num.

**task_contacts table**: junction between tasks and contacts (migrated from issue_contacts; 0 rows since issue_contacts was empty).

## Next Priorities

**Completed this session (2026-06-06):**

Tasks Module Stage 1 — DB:
- `task_sequences`, `tasks`, `task_contacts` tables created with full RLS and anon SELECT
- Migrated 2,914 work_orders + 1,234 issues (all as 'task', scope was NULL) + 220 S&G Projects
- WO statuses corrected from wo_status field: 151 Open, 2,336 Closed, 427 Cancelled
- S&G Projects seeded via Python script (`~/seed_sg_tasks.py`); xlsx at `/home/scott/S+G Projects - Last view used.xlsx`

Tasks Module Stage 2 — UI (on `preview` branch, commit fbbc5ec):
- `components/TasksView.jsx`: unified list + detail for all 6 record types
  - sbFetchAll for >1000 row pagination
  - Priority sort default (??? → Urgent → High → Medium → Low)
  - Grouped property headers (alphabetical, null prop_code → "—" group at bottom)
  - Columns: type icon | # | title | FU Date | prop | priority | stage | status | vendor | tenant | updated/closed | opened
  - Closed/Updated column swap on status filter
  - More… date filter dropdown (Opened/Updated/Closed × Week/Month/Year)
  - ACP pill hardcoded (status='acp-entity', not in active properties query)
  - Type conversion pills in detail header
  - WO-specific detail section (stage, vendor, tenant, invoice, etc.)
  - Mobile: activity panel closed by default, floating "Activity ›" button
- `components/shared/TasksTable.jsx`: self-fetching shared table, prop/type/vendor/tenant filters
- `pages/tasks/index.jsx` + `pages/tasks/[id].jsx`: routed pages
- `AppShell.jsx` + `SedonaCRM.jsx`: Tasks nav item added after Issues (ClipboardText icon)

**Completed previous sessions:**
- Phase 3 Stage 1: Gmail OAuth + /settings page
- LeasingPipelineView, TntCoisView (SPA views)
- PropertyDetail: all tabs lazy-loaded
- ContactDetail: full tabbed form, Issues tab wired
- All major list views routed with shared table components

**Next:**
1. Merge preview → main (`git push origin preview:main`) when Scott approves
2. Property detail — remaining tab groups:
   - Financial: CAM, Taxes, PM Fees, Invoices, Insurance
   - Operations: Work Orders (vendor name), Inspections, Key Safe
   - Ownership: Owners, Agreements, Monthly Reports, YR End Reports
3. Phase 3 Stage 2: Gmail compose/send, thread sync, AI summarize
4. Populate podio_id for vendors (deferred to go-live Podio API sync)

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
- `goNav(dir)` fetches adjacent record, calls `setData(newRec)`, updates `navIdx`, writes new index to sessionStorage, calls `window.history.replaceState({}, '', newUrl)`
- `goNavRef` pattern: `const goNavRef=useRef(goNav); goNavRef.current=goNav;` placed after `goNav` definition, before early returns — arrow key useEffect uses `goNavRef.current` with empty dep array
- Arrow key useEffect skips when `e.target.tagName` is input/textarea/select or `e.target.isContentEditable`
- Nav UI: shown only when `navList && navList.length > 1`; right-aligned in header first flex div via `marginLeft:'auto'`; CaretLeft/CaretRight size=18 weight="bold" from @phosphor-icons/react

**Per-module keys and identifiers:**
| Module | NavList key | NavIndex key | Identifier | goNav query | URL |
|---|---|---|---|---|---|
| Tasks | tasksNavList | tasksNavIndex | `{task_num,record_type}` | by prefix+num | `/tasks/WO-N` etc |
| WorkOrders | workOrdersNavList | workOrdersNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/work-orders/N` |
| Issues | issuesNavList | issuesNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/issues/N` |
| Tenants | tenantsNavList | tenantsNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/tenants/N` |
| Suites | suitesNavList | suitesNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/suites/N` |
| RentSchedule | rentNavList | rentNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/rent-schedule/N` |
| Contacts | contactsNavList | contactsNavIndex | `{id,podio_id}` | `podio_id=eq.N` | `/contacts/N` |
| Vendors | vendorsNavList | vendorsNavIndex | `{id,podio_id}` | podio_id (or id fallback) | `/vendors/N` or `/vendors/XsufFix` |
| Owners | ownersNavList | ownersNavIndex | `{id,podio_id}` | podio_id (or id fallback) | `/owners/N` or `/owners/XsufFix` |
| KeySafes | keySafesNavList | keySafesNavIndex | `{id}` | `id=eq.UUID` | `/key-safes/XsufFix` |
