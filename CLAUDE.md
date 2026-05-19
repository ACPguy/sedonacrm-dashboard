# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SedonaCRM — custom AI-powered commercial property management platform replacing Podio + Globimail.
Owner: Scott Anderson, CCIM — Anderson Commercial Properties, Sedona AZ
Portfolio: 14 active NNN commercial properties, each a separate LLC (48 prop_codes total)
GitHub: https://github.com/ACPguy/sedonacrm-dashboard
Production domain: crm.andersoncp.com

## Working Directory

ALWAYS use `~/sedonacrm-dashboard-fresh/`. The old `~/sedonacrm-dashboard/` is dead — do not use it.

## Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build
npm run start

# Daily workflow
cd ~/sedonacrm-dashboard-fresh
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
- Anon SELECT grants exist on: `properties`, `tenants`, `rent_schedule`, `work_orders`, `issues`, `leasing_pipeline`, `property_insurance`, `tnt_cois`, `monthly_reports`, `property_taxes`, `suites`

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
~/sedonacrm-dashboard-fresh/components/
  SedonaCRM.jsx      — main shell, nav, routing, Home dashboard, Properties list, Tenants list
  WorkOrdersView.jsx — work orders list + detail (reusable, accepts prop_code filter)
  SuitesView.jsx     — suites list + detail (reusable, accepts prop_code filter)
```

## Standalone Portfolio Views (same components, no prop_code filter)

- Work Orders — built
- Suites — built
- Tenants — built
- Properties list — built
- Issues — built
- Leasing Pipeline — pending
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
- Component copy command: `cp ~/SedonaCRM.jsx ~/sedonacrm-dashboard-fresh/components/SedonaCRM.jsx`

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

## Development Rules

1. **SELECT DISTINCT before any UI field from Podio** — Before building any dropdown, filter, badge, or component that displays or filters a field sourced from Podio data, always run `SELECT DISTINCT col FROM table ORDER BY col;` to confirm the exact values in the database. Never hardcode options without checking first.

2. **npm run dev before every commit** — After every set of changes, run `npm run dev` (or `npm run build`) and confirm no build errors before committing or pushing. Fix errors first, then push. Never push broken code to GitHub (it deploys broken to Vercel).

3. **Destructive Database Operations — ALWAYS STOP AND CONFIRM** — Before executing ANY of the following, stop and tell me exactly what you are about to run and why, then wait for my explicit confirmation before proceeding:
   - TRUNCATE (any table)
   - DROP TABLE or DROP COLUMN
   - DELETE FROM (any table)
   - Any ALTER TABLE that removes or modifies existing data
   - Any psql command that could result in data loss

   This rule applies even when --dangerously-skip-permissions is active.
   For all other operations (file reads, file writes, git, npm, SELECT queries), proceed without asking.

## URL Routing Rules (permanent)

- All detail page routes use `podio_id`, NOT UUID
- Pattern: `/[module]/[podio_id]` — e.g. `/work-orders/3737`, `/tenants/2556`
- Detail page lookup: if param contains hyphens → `WHERE id = param` (UUID fallback for old bookmarks); otherwise → `WHERE podio_id = param`
- List view link generation: always use `record.podio_id ?? 'X'+record.id.slice(-6)`
- X-prefix fallback (e.g. `X32f3fc`) = null podio_id row; cold URL load will return not-found (acceptable until podio_ids are populated)
- Production domain: crm.andersoncp.com
- Never construct detail URLs using UUID directly
- Tables with full podio_id coverage: tenants (312/312), suites (177/177), rent_schedule (1406/1406), issues (1233/1234), properties (47/48)
- Tables with ZERO podio_id coverage (all X-fallback): work_orders (0/2914), contacts (0/2539), vendors (0/622), property_owners (0/43)

## Routing Pattern (Issues as template for all modules)

Modules get proper Next.js pages. Issues is the template — replicate this for Work Orders, Suites, Tenants, etc.

**File structure:**
```
pages/issues/index.jsx        — list page, wraps component in AppShell
pages/issues/[id].jsx         — cold-loadable detail page
components/AppShell.jsx       — shared sidebar/chrome for all routed pages
components/IssuesView.jsx     — exports: sbFetch, sbPatch, T, F, css, fmtDate,
                                  StatusBadge, EditableField, ActivityPanel,
                                  PriorityDot, PRIORITY_ORDER, IssueDetail
                                  default export: IssuesView (SPA, used by index page)
```

**Navigation rules:**
- Issues nav in SedonaCRM → `router.push('/issues')` (not navTo)
- AppShell nav: Issues → `/issues`, all others → `/?view=xxx`
- SedonaCRM reads `router.query.view` on load and sets currentView
- Ctrl+click a row → `window.open('/issues/${id}', '_blank')`
- Back button in detail → `sessionStorage.getItem('issuesBackUrl') || '/issues'`
- Escape key in detail → calls onBack()

**When adding a new routed module:**
1. Add named exports to the component (sbFetch, T, F, Detail component, etc.)
2. Create `pages/<module>/index.jsx` wrapping the view in AppShell
3. Create `pages/<module>/[id].jsx` loading the record by ID and rendering Detail
4. Add nav item to AppShell pointing to `/<module>`
5. Change SedonaCRM nav onClick to `router.push('/<module>')`

## Next Priorities

**Completed last session:**
- Ctrl+click nav opens new tab (AppShell NavBtn → `<a>`, SedonaCRM NavItem → Ctrl+click handler)
- Date format MM-DD-YYYY UTC everywhere (getUTC* methods in 9 files)
- Tenant Detail: Overview tab as default, 4-card layout, 3-row header with chip row
- Rent tab: multi-select filter pills, 12 cols, 5-level expiry color coding, footer totals
- COIs tab: full-width, no truncation, word-wrap
- Properties list: 7 cols, Expires col fixed (RLS policy added for anon SELECT on property_agreements), color-coded
- Tenants list: property strip, grouped view (A→Z), % colwidths
- Suites list: defaults to current/active, property strip, grouped (A→Z), Tenant column, Location removed, Clear Filters
- Issues list: Opened/Closed column toggle by status filter (same as Work Orders)
- Work Orders list: no truncation, Closed/Updated columns toggle by filter
- Rent Schedule list: Suite column word-wrap, Tenant column truncates

- Routing: all 7 detail pages switched to podio_id URL routing; UUID fallback retained for old bookmarks
- Domain: production domain updated to crm.andersoncp.com in CLAUDE.md and Project section
- URL Routing Rules section added to CLAUDE.md (permanent reference)
- Note: work_orders, contacts, vendors, property_owners have zero podio_id coverage — all use X-fallback until data is populated

**Next:**
1. Property detail form — hub of the entire system
   - 5 tab groups: Overview, Leasing, Financial, Operations, Ownership
   - Each tab embeds filtered views (Issues, Work Orders, Tenants, Rent Schedule, etc.)
   - Map embed on Overview tab

2. Tenant detail form — continue refinements as needed after Property detail template is established

3. All other detail forms follow — Vendors, Owners, Contacts, Work Orders

4. Populate podio_id for work_orders, contacts, vendors, property_owners tables (currently all null)
