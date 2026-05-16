# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SedonaCRM — custom AI-powered commercial property management platform replacing Podio + Globimail.
Owner: Scott Anderson, CCIM — Anderson Commercial Properties, Sedona AZ
Portfolio: 14 active NNN commercial properties, each a separate LLC (48 prop_codes total)
GitHub: https://github.com/ACPguy/sedonacrm-dashboard
Vercel: https://sedonacrm-dashboard.vercel.app/

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
- Issues — **next to build**
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

## Next Priorities

1. Build Issues standalone view
2. Build complete Property detail with all 5 tab groups using lazy-loaded reusable components
3. Wire Home dashboard urgent items to real data
