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
npm run dev # dev server at localhost:3000
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
- HelloSign webhooks for e-signature (Phase 3)
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

pages/api/agents/
  morning-briefing.js — GET today's briefing; POST runs 14 parallel queries, saves to briefings table
  lease-watch.js      — GET active drafts; POST iterates tenants, calls Claude API, saves drafts
  new-inquiry.js      — GET active drafts; POST keyword filter → Claude draft → pipeline insert → thread link; dismiss action

pages/api/gmail/
  renew-watch.js      — POST renews Gmail Pub/Sub watch; cron every 6 days
  webhook.js          — processes Pub/Sub push notifications, syncs email_threads + email_messages
```

## Phase Status

- **Phases 0–3:** Complete
- **Phase 4:** IN PROGRESS
  - Agent 7 Morning Briefing: Complete (cron `0 12 * * *` = 5am AZ)
    - `briefings` table, `/api/agents/morning-briefing`, `BriefingView.jsx`
    - HomeView wired: SedonaCRM.jsx HomeView => `<BriefingView />`
    - Env vars set in Vercel: BRIEFING_SECRET + NEXT_PUBLIC_BRIEFING_SECRET
  - Agent 1 Lease Watch: Complete (cron `0 13 * * *` = 6am AZ)
    - `lease_watch_drafts` table, `/api/agents/lease-watch`, `LeaseWatchDrafts.jsx`
    - Milestones: 12mo/6mo/3mo/2mo/1mo; Claude API drafts personalized emails
    - Drafts saved with status='draft'; approve button placeholder (send wires in Phase 6)
    - Compact card in BriefingView above NewInquiryDrafts and above Urgent/Attention/FYI
  - Agent 3 New Inquiry: Complete (cron `0 15,17,19,21,23,1 * * *` = 8am–6pm AZ, 6x/day)
    - `inquiry_drafts` table, `/api/agents/new-inquiry`, `NewInquiryDrafts.jsx`
    - Keyword detection → Claude draft reply → leasing_pipeline insert → thread link → dedup
    - Dismiss action: POST { action: 'dismiss', id } → sets status='dismissed'
    - Compact card in BriefingView below LeaseWatchDrafts, above Urgent/Attention/FYI
    - Approve button placeholder (send wires in Phase 6)
  - Gmail Watch Auto-Renewal: Complete (cron `0 11 */6 * *` = every 6 days)
    - `pages/api/gmail/renew-watch.js` — renewed manually 2026-06-26, expires 2026-07-03
  - Remaining Phase 4: Agents 4, 9
- **Phase 5+:** Pending

## Agents Env Vars (Vercel) — all set ✅

- BRIEFING_SECRET
- NEXT_PUBLIC_BRIEFING_SECRET
- ANTHROPIC_API_KEY

## Monthly Cost

- Vercel Pro: $20/mo (upgraded from Hobby 2026-06-26 — required for 6x/day crons)
- Claude API: active, ~$10–15/mo estimated
- Supabase: $0 (free tier)
- Twilio: not yet active (Phase 6)
- Total: ~$30–35/mo

## Next Priorities

1. Build manual Gmail "Sync Now" button in Inbox view
2. Verify Agent 3 end-to-end with real inquiry email
3. Confirm NewInquiryDrafts card displays correctly in BriefingView
4. Begin Agent 4 (Work Order — auto Drive folder on WO creation)
5. Phase 5 start: Leasing Pipeline

## Current Git State

- main: `8de3736` — new-inquiry cron restored to 6x/day (Vercel Pro)
- preview: in sync with main
- All Phase 4 Agent 3 work fully merged and live on production

## Seeding Rules

Use `psql` only — `export DB='postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres'`
- Before seeding any table: check columns, drop CHECK+FK constraints, test R01, run full loop
- Chromebook: all files land in `/home/scott/`, NOT `~/Downloads`

## Workflow Rules

1. **All code to preview branch** — never directly to main unless Scott says "approved, merge"
2. **One commit per session** — stage ALL changes including CLAUDE.md in one commit. NEVER commit CLAUDE.md separately. One push = one deployment.
3. **npm run build before every push** — zero errors required
4. **Read CLAUDE.md first** — at start of every new session before doing anything
5. **Start fresh session after each major feature or ~2 hours**
6. **CLAUDE.md size rule:** Keep under 30k chars. Before adding session notes, remove oldest completed session logs. Only Next Priorities and Current Git State need to persist as session history.

## Session Close Procedure

1. Update CLAUDE.md: Next Priorities + Current Git State + any new permanent rules/schema. Keep under 30k.
2. Commit ALL changes + CLAUDE.md in ONE commit to preview branch.
3. Merge preview → main if Scott approved.
4. Upload build log to Drive (parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA`)
5. Upload updated CLAUDE.md to Drive as `CLAUDE_YYYY-MM-DD.md` (parentId: `1n6NTGVHDQJAYp14Z6LasI7uuwMV_pxUA`)
6. Move previous dated copy to Archive (folder `1I1kBuVZd7jbLh_WYzFtEBzrtmKcvazfb`)
NEVER upload `.md` files without `disableConversionToGoogleType: true`

## Development Rules (permanent)

1. **SELECT DISTINCT before any UI field from Podio** — confirm exact values before building dropdowns/filters
2. **npm run build before every commit**
3. **Left nav always-navigate on click** — use `handleNav`/`go` pattern: if already on target path, call `router.replace().then(() => router.reload())`
4. **Date fields always use `<input type="date">`** — browser native picker; display via `fmtDate()` (MM-DD-YYYY); store YYYY-MM-DD
5. **Pill hover:** inactive pills ~20% alpha on hover, `0.15s ease` transition
6. **Multi-line text:** minRows=5, TipTap toolbar, auto-expand
7. **Destructive DB ops:** ALWAYS stop and confirm before TRUNCATE / DROP / DELETE / ALTER removing data
8. **List views default to Open only** — WO + Issues; fetch Closed only when user selects filter
9. **Mobile stat rows:** pill-style horizontal scroll on mobile (<768px)
10. **Filter state in URL query params** on every filter change; restore on mount

## Architecture Rules (permanent)

- **Single source of truth:** ONE shared component per table/list in `components/shared/`. NEVER build a second version.
- **Dual nav architecture:** `AppShell.jsx` (routed pages) + `SedonaCRM.jsx` (SPA). Nav changes must be applied to BOTH.
- **`property_agreements` table:** ACP's mgmt agreement with owners — NOT leasing pipeline. Never confuse.
- **Vercel build cache:** `next.config.js` uses `generateBuildId: async () => require('crypto').randomBytes(8).toString('hex')` — ensures every deploy gets a fresh route manifest. Do not remove.

## URL Routing Rules (permanent)

- All detail pages use `podio_id`, NOT UUID: `/[module]/[podio_id]`
- Link generation: `record.podio_id ?? 'X'+record.id.slice(-6)`
- Vendors + Owners: ZERO podio_id coverage — all X-fallback until go-live Podio sync
- Tasks URL: bare `task_num` only (`/tasks/3685`) — never WO-prefixed
- Lookup: if param has hyphens => UUID fallback; otherwise => podio_id

## History API Rule (permanent)

ALWAYS spread existing state:
`window.history.replaceState({ ...window.history.state, url: newUrl, as: newUrl }, '', newUrl)`
NEVER use `replaceState({}, ...)` — strips Next.js __N marker, breaks Back button.

## Prev/Next Navigation (permanent)

All detail views support keyboard (ArrowLeft/Right) and button (‹ ›) navigation.
- List view writes `{module}NavList` + `{module}NavIndex` to sessionStorage on row click
- `goNav(dir)` fetches adjacent record, updates URL via replaceState (spread pattern)
- `goNavRef` pattern required for arrow key useEffect with empty dep array
- Skip arrow key when in input/textarea/select or contentEditable

## Gmail / OAuth Rules (permanent)

- Token store: `email_accounts` table (not `gmail_tokens`)
- OAuth re-auth only at crm.andersoncp.com/settings (GOOGLE_REDIRECT_URI is production)
- Scopes: `gmail.modify`, `gmail.send`, `drive` — do NOT add `userinfo.email`
- Do NOT overwrite .env.local with `vercel env pull`
- Gmail watch expires every 7 days — auto-renewed by cron `0 11 */6 * *` via `/api/gmail/renew-watch`

## Tasks Module DB Notes (permanent)

- `tasks` table: record_types = work_order (2,914), task (1,234), sg_task (220), note/project/acp_task (0)
- UNIQUE index: (record_type, task_num) — task_num is Podio ID
- Display ID: `getTaskPrefix(task)` from `utils/taskPrefix.js` → `CR1-3685`
- Sequences: work_order=3717, task=1846, acp_task=518, sg_task=220
- Added columns: drive_folder_id, drive_folder_url, drive_index_pdf_id, vendor_contact_id, tenant_contact_id

## Schema Notes (permanent)

- `contacts` table: Added `vendor_id uuid FK → vendors` + `tenant_id uuid FK → tenants` — filters contacts by company in WO panel
- `work_orders` + `tasks`: added `vendor_contact_id` + `tenant_contact_id`
- `briefings` table: run_date (UNIQUE), status, urgent/jsonb, attention/jsonb, fyi/jsonb, snapshot/jsonb
- `lease_watch_drafts` table: tenant_id + milestone (UNIQUE pair), subject, body, status (draft/edited/approved/sent/dismissed)
- `inquiry_drafts` table: thread_id (UNIQUE), pipeline_id FK, prospect_name, prospect_email, subject, body, status (draft/edited/approved/sent/dismissed), created_at

## Drive Folder Architecture (permanent)

- Trigger: manual `+ Drive Folder` button in WO header
- Structure: `[Property Root]/Work History/[displayId] — [title] — [YYYY-MM-DD]/`
- Hardcoded in `lib/drivePropertyFolders.js` (14 active properties)
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
