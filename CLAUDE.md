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
    StackedFormModal.jsx — generic overlay shell for full-form create flows (Contact, Vendor, future). Props: title, onClose, children, footer, maxWidth, zIndex. No backdrop/Escape-to-close. Caller passes increasing zIndex for stacked modals. No consumers wired yet — shell-only as of 2026-07-17.

lib/
  gmail.js               — getGmailClient(), setupWatch()
  drive.js               — getDriveClient(), createTaskFolder(), createIndexPdf()
  drivePropertyFolders.js — hardcoded prop_code → Drive root folder ID map (14 active)
  supabaseServer.js      — createServerClient() using SUPABASE_SERVICE_ROLE_KEY

pages/
  index.jsx              — renders <SedonaCRM /> (SPA root)
  home.jsx               — renders <SedonaCRM /> at clean /home URL (HomeView by default)

pages/api/agents/
  morning-briefing.js, lease-watch.js, new-inquiry.js, work-order-agent.js

pages/api/gmail/
  renew-watch.js, webhook.js, sync-now.js, batch-action.js

pages/api/pipeline/
  lead-capture.js, transition.js, submit-application.js, loi-draft.js, movein-clearance.js, notice-to-vacate.js
```

## Phase Status

- **Phases 0–3:** Complete
- **Phase 4:** Complete except Agent 9. All agents, BriefingView, EmailInbox, Drive folders, Home URL canonical route, cron auth — all done.
- **Phase 5:** IN PROGRESS — Stages 1 (DB), 2 (API routes), 4-part-1 (PipelineView list+board) complete. Stage 3 (Dropbox Sign) + Stage 4 parts 2–3 (detail panel, prop embed) pending.

## Agents Env Vars (Vercel) — all set ✅

- BRIEFING_SECRET, NEXT_PUBLIC_BRIEFING_SECRET, ANTHROPIC_API_KEY
- CRON_SECRET ✅ set in Vercel (Production + Preview) — confirmed working (Gmail watch renewal succeeded)

## Monthly Cost

- Vercel Pro: $20/mo | Claude API: ~$10–15/mo | Supabase: $0 | Total: ~$30–35/mo

## Known Gaps

- **CRITICAL — Podio migration status:** All Supabase data is placeholder/xlsx-import only. Podio is the live system of record. Two-stage sync planned: (1) parallel test sync, (2) final cutover + go-live. Never treat xlsx-imported data as production-ready; never suggest CRM is ready to cut over until the final Podio API sync is verified complete.
- **PENDING: S&G prop_code** — set up as a property (like ACP) with dedicated Drive folder; Scott will supply Drive folder ID for `drivePropertyFolders.js`. **Scott to run himself (2026-07-24, not run from any session — same as every prior schema/data change):**
  ```sql
  INSERT INTO properties (prop_code, property_name, state, status)
  VALUES ('S&G', 'Scott & Gab (Personal)', 'AZ', 'sg-entity');
  ```
  The `property` linker's `searchFilter: 'status=neq.archived'` (2026-07-24) will pick S&G up automatically once this runs — no code change needed on that side. Verified the Property picker degrades gracefully if this hasn't run yet (just doesn't show S&G, no error).
- **Inbox divider width persistence — NOT resolved, deprioritized.** Default width hardcoded to 570px. setPointerCapture fix is live but persistence still unreliable on hard refresh. If revisiting: re-instrument with console logging first — do NOT attempt blind fixes.
- **New Inquiry agent (Agent 3)** — uses LEASING_KEYWORDS filter. Manual **+LSG** button in EmailInbox for ambiguous cases (source='manual_lsg'). `LSG_PROPERTIES` array hardcoded in EmailInbox.jsx with 14 active properties (OLY/WNT excluded per Scott). lead-capture.js allows null prop_code. Future: Claude-API classifier if +LSG usage exceeds ~10/day.
- **leasing_pipeline working set** — 18 records (5 real + 13 'TEST — ' seeded) after 2026-07-11 reset. Delete all 'TEST — ' prefixed records before go-live. Stage filter: `stage=not.in.(Dead,On Hold,Landlord Declined Use)`; limit 5000.

## RFP Vendor Email — 3-part build (in progress, this session)

- **Part 1 — DONE:** `public/branding/acp-logo.png` committed. NOTE: the Drive file ID originally given for this (`1yj87nkP50RRhNZot_h7Wbqg3cVJr3HB2`, "Podio PDF V2 - LTR Head Logo size - 2020.12.11.png") was NOT a usable logo — it's a screenshot of a Podio PDF template editor (toolbar + "Insert/edit image" dialog + red annotation arrow). Found and used the real logo instead: `ACP - Large Logo - transparent.png` (Drive id `0BxXST_g3FJFkaGI1VWZNdi15R3M`), transparent PNG, resized from source 2214x894 down to 880x356 (2x retina for ~220px header display width) to trim file size. If either logo Drive file ever needs re-fetching, use this ID, not the one from the original spec.
- **Part 2 — DONE:** `lib/rfpEmailTemplate.js` (`buildRfpEmailHtml(task, property, vendorContact, keySafe, attachmentList)`). Scott pasted the actual approved `rfp-email-preview.html` content directly into chat (the file itself was never actually attached to the session filesystem, despite the spec calling it "attached this session" — Claude Code sessions have no file-attachment channel; only pasted text works). Template matches that preview's structure/styling exactly, with the preview's placeholder inline-SVG logo swapped for the real `<img>` asset. **Caller contract, since the fixed 5-arg signature has no separate tenantContact param:** the Tenant section only renders if the caller attaches the resolved tenant contact onto the task object as `task.tenantContact = { full_name, primary_phone }` (tasks.tenant_contact_id is only an FK — no name/phone on the task row itself) — Part 3 must fetch and attach this the same way it resolves vendorContact. `attachmentList` items need only a `name` field (matches `/api/tasks/list-attachments`'s Drive `files.list()` shape). Rich text (`task.details`) goes through a small inline sanitizer (strips script/style/iframe/object/embed/form tags, on*= handlers, javascript: URLs) rather than pulling in a new sanitizer dependency — reasonable since `details` is internal TipTap editor output, not external untrusted HTML. Verified live: built a temporary test API route + Playwright (installed via `npm install --no-save`, removed after, package.json/lock untouched) to screenshot the rendered output against realistic sample data — layout, conditional sections (tenant/key safe/attachments), and the real logo all confirmed correct before the test route was deleted.
- **Part 3 — pending, IMPORTANT CORRECTION from Scott:** do NOT create new "Send RFP to Vendor" / "Send RFP + Attachments" buttons as the original spec literally said. The WO Details card already has an "Email Request To Vendor" field (`GenericPills`, `EMAIL_REQUEST_OPTIONS = ['No Files','With Files','Discussed In-Person']`, TasksView.jsx ~line 2034 in TaskDetail / ~line 2690 in NewTaskForm) — Scott's own naming for the two sends is "Send Request - NO FILES" and "Send Request - WITH FILES". Next session must re-examine this field before building anything: figure out how Scott wants actual send behavior wired to what's currently a plain status pill selector (not real buttons), rather than bolting new UI on top per the original (superseded) spec wording.

## Next Priorities

1. Phase 5 Stage 4 (part 2): PipelineView click-through detail panel (record detail, stage transition buttons, LOI drafting UI, qual gate form)
2. Phase 5 Stage 4 (part 3): Pipeline embed in Property detail Leasing tab — replace inline tab with `<PipelineView propCode={data.prop_code} />` per TODO comment at SedonaCRM.jsx:888
3. Phase 5 Stage 3: Dropbox Sign integration (two-part sequential signing, webhook endpoint)
4. Review/delete duplicate Alliance Land Surveying LLC vendor row (`8137893e-315e-42b8-82be-cac8c5ae2d23`) — nothing references it
5. Review 37 contacts left null in backfill (25 ambiguous, 2 unresolved vendor, 1 unresolved tenant, 9 unknown app) — see dry-run report
6. Extend LinkField to new relationship types (COIs, Vendor Services) — design schema first, then wire (see Canonical Linker Architecture). Key Safes↔WOs already done (`keySafe` registry entry).
7. (Optional, low priority) Revisit inbox divider persistence — see Known Gaps for what's already been ruled out
8. **Podio sync → key_safe_id mapping (go-live blocker):** the old `tasks.key_safe_info` free-text field is what Podio sync will likely keep writing into — there's currently no logic mapping that (or whatever Podio sends) into the new `key_safe_id` FK. `key_safes.podio_id` already exists as a plausible matching key. Needs real sync-design work before go-live; not attempted yet.
9. **NewTaskForm missing fields (from 2026-07-22 field audit, see TaskDetail Architecture Notes):** Bid Status, Depends On Task #, Parent Project # / Project Type / Sequence Order, and Close Date all exist in TaskDetail but have no NewTaskForm equivalent — currently settable only after the task is saved. Decide per-field whether that's acceptable (like Drive Folder/Podio/System Info) or worth adding as real fields (`AvailableAfterSaving` no longer exists as of 2026-07-24 — Contacts/Related Records became staged-pickable instead of placeholder-shown, so any new placeholder for these would need its own small component, not a reused one).
10. **`relatedRecords`' `searchFilter` still has the missing-`=` bug** (`` `id.neq.${data.id}` `` never actually excludes the current record from its own Related Records search) — found 2026-07-23 while fixing the same bug class at Key Safe/Tenant Contact, deliberately left unfixed (out of scope for that session). Fix is a one-line change to `` `id=neq.${data.id}` ``.
11. **Audit every other `searchFilter` call site in the codebase for the same missing-`=` bug** — Key Safe and Tenant Contact were fixed 2026-07-23, but this bug class (found in `LinkField.jsx` call sites specifically) may exist anywhere else `searchFilter` was ever passed as a bare `"column.op.val"` string. Grep for `searchFilter={` and check each one has a literal `=`.

## Canonical Linker Architecture (permanent)

LinkField.jsx (`components/shared/LinkField.jsx`) is the ONLY component for any interactive relationship field anywhere in SedonaCRM — not just contacts/companies. This is the universal relationship layer for the whole database: Work Orders/Tasks ↔ Projects, Insurance ↔ Properties/Tenants/Vendors, Key Safes ↔ Work Orders, Reports ↔ Properties, and every future relationship. Single-select or multi-select, any table, any relationship. Config-driven, zero hardcoded table names (originally piloted on Task ↔ Contacts via `task_contacts`). To add another relationship, drop in `<LinkField .../>` (or `<RelationField rel="..." .../>` once registered — see below) with the correct props; no new state/effects/functions needed in the parent view. Do NOT build a new picker/connector/linker component for any future module — extend LinkField's props instead. If the shared visual template (compact-mode look, trash-icon removal, etc.) needs to change, change `LinkField.jsx` ONCE — every call site inherits it; do not patch individual call sites.

**Full prop reference:** `mode` (`'multi'` default | `'single'` | `'reverseFK'` | `'staged'` — see Modes below), `value` (single mode: current FK id), `onChange` (single mode: `(row|null)=>void` — caller persists), `onCreateNew` (single mode: `()=>void` — caller opens its own creation flow, e.g. StackedFormModal, then calls `onChange`), `stagedRows`/`onStagedChange` (staged mode: array of full row objects + `fn(newArray)=>void` — caller owns the array, LinkField never writes), `joinTable`/`parentIdField`/`parentId`/`linkedIdField` (multi mode: join-table shape), `linkedTable`, `linkedFields` (select clause), `searchFields` (array of columns to search), `titleField` (string or `fn(row)`), `titleHref` (`fn(row)=>url`), `titleTarget` (string, default `'_blank'`; pass `'_self'` for same-tab in-app navigation — also hides the ↗ arrow), `subtitleField` (fn/string, optional — phone/email line), `summaryField` (fn/string), `metaField` (fn/string), `readOnly`, `allowCreate`, `createFields` (array of field names for the inline create form), `onCreate` (async `fn(fields)=>newRow`), `sectionLabel`, `variant` (`'card'` default | `'chip'`), `badgeField` (`fn(row)=>string|null` — small pill after the title, works in multi + single card variants), `excludeRef` (React ref — clicks on this element do NOT count as "outside" for panel close; use when the trigger button lives outside the LinkField layout), `reverseField` (reverseFK mode: FK column on `linkedTable`, e.g. `'vendor_id'`), `iconField` (`fn(row)=>IconComponent` — overrides `icon` per card when provided), `icon` (Phosphor component, default `UserCircle`), `searchFilter` (optional PostgREST filter string appended to the search query — **must be a real `key=value` PostgREST fragment, e.g. `'vendor_id=not.is.null'` or `'prop_code=eq.ACP'` — see the "searchFilter syntax bug" note below, this was gotten wrong repeatedly**), `showAllOnOpen` (boolean, default false — see its own note below), `compact`, `hideTrigger`.

**showAllOnOpen prop (2026-07-24):** when true, opening the panel with an empty query fetches the full list (still respecting `searchFilter`) instead of waiting for typed input — ordered by `searchFields[0]` ascending, `limit=100`. The moment the user types anything, normal typed search (the `or=(...)ilike` path, `limit=10`) takes over identically to every other field. Opt-in per call site (or per registry entry, for entries with exactly one call-site meaning) — deliberately NOT a global default, since large/unscoped lists (the plain Contacts multi-select, Vendor Contact) need to stay type-to-search to avoid the unusable-full-list problem `taskVendorCompany`/`taskTenantCompany` were built to fix in the first place (2026-07-22). Current users: `property` (registry-level — all call sites want it, and there's no per-call-site variation), `keySafe` (registry-level, same reasoning), and Tenant Contact (call-site prop, NOT registry-level — the shared `contact` entry is also used for Vendor Contact and the plain Contacts list, which must NOT get this behavior; threaded as a prop at both TaskDetail's and NewTaskForm's Tenant Contact instances specifically).

**⚠️ searchFilter syntax bug (found + fixed 2026-07-23, after being silently wrong since at least 2026-07-22):** `LinkField.jsx` appends `searchFilter` as a raw string — `` `&${searchFilter}` `` — directly onto the search query. A bare `"column.op.val"` string (dots, no `=`) is NOT a valid PostgREST filter fragment: standard URL query-string parsing splits on `&` then `=`, so a dotted string with no `=` becomes a query param whose KEY is the entire string and whose VALUE is empty — PostgREST silently drops it as a no-op rather than filtering anything. This was confirmed by reproducing the exact query string LinkField.jsx builds and parsing it with Node's `querystring`/`URLSearchParams` (direct network access to Supabase is blocked in this environment, so PostgREST's actual response couldn't be observed directly) — and matches Scott's live report that Key Safe "still shows key safes from other properties" despite the filter code looking correct. **Every `searchFilter` value must contain a literal `=`** — e.g. `vendor_id=not.is.null`, `prop_code=eq.ACP`, `tenant_id=in.(id1,id2)`. Fixed at the Key Safe and Tenant Contact call sites (2026-07-23) — **`relatedRecords`' `` searchFilter={`id.neq.${data.id}`} `` at TaskDetail's Related Records section still has this exact bug and was deliberately left unfixed (out of scope for that session)** — it never actually excludes the current record from its own search results; needs `` `id=neq.${data.id}` `` when someone picks this up.

**variant='card' (default):** Podio-style stacked cards — icon + title link (`T.accent` + ↗) + optional badge pill + optional subtitle (phone/email) + meta line. Each multi-mode card has a Trash icon button (absolute-positioned right, 32×32 hit target) that removes the link immediately on click — no confirm dialog. Trigger button says "Add / remove"; in multi mode the panel doesn't show chips at the top — unlinking is via the trash icon on the card instead. Read-only cards (no `subtitleField`, e.g. ContactsView "Linked Tasks") render as just icon + title + meta, no subtitle gap.

**variant='chip':** compact inline pills with × unlink. Pass `variant="chip"` explicitly on any call site that wants this look (default is `'card'`).

**Modes:**
- **`mode='multi'` (default):** self-persisting join-table mode. Inserts/deletes join-table rows on every pick/clear; the caller does nothing extra. Forward mode (e.g. TaskDetail Contacts, `allowCreate=true`): add/remove/search/create inline. Reverse/read-only (e.g. ContactDetail Linked Tasks): same join table, opposite direction, no add/create UI.
- **`mode='single'`:** pure controlled picker — does NOT write to any table itself. `onChange(row|null)` fires on every pick or clear; the caller saves to DB. `onCreateNew()` fires on "+ Create new"; the caller opens its own modal and then calls `onChange` with the new row. `joinTable`/`parentIdField`/`parentId`/`linkedIdField` are unused. Card + × clear shown when a value is set; dashed trigger always visible ("Change …" / "+ Add …").
- **`mode='reverseFK'`:** direct FK reverse lookup — no join table. Queries `linkedTable WHERE reverseField=parentId`. Link sets `reverseField=parentId` on the target row (PATCH); unlink sets `reverseField=null` (internal helper: `lfPatch`). Requires anon UPDATE on `linkedTable`. Reusable for any one-to-many FK where the FK lives on the child table.
- **`mode='staged'`** (2026-07-24): fully local multi-select — no join-table writes at all, for picking records before a parent row exists to link against (e.g. Contacts/Related Records in NewTaskForm, before Save creates the task). Caller owns the array via `stagedRows` (full row objects, not ids) + `onStagedChange` (`fn(newArray)=>void`); LinkField never fetches/POSTs/DELETEs in this mode. Renders through the same card/chip UI as `'multi'` — `link()`/`unlink()` both short-circuit to `onStagedChange` calls before touching any table, so search, "+ Create new" (`allowCreate`/`createFields`/`onCreate`), and card rendering all work unmodified. `joinTable`/`parentIdField`/`parentId`/`linkedIdField` unused, same as single mode. The caller must write `stagedRows` into the real join table once a real parent id exists (see NewTaskForm's `handleSave`).

**compact prop (default false):** When true — reduced card padding (7px 10px vs 10px 12px), icon size 32px (2×, both multi and single mode cards), `paddingRight:'36px'` on the card text div, `alignItems:'center'` on the row. Removal is via the Trash icon button (absolute-positioned right, 32×32 hit target) on the card itself, in both multi mode (calls unlink) and single mode (calls `onChange(null)`) — the old in-panel "✕ Remove" row in compact single mode is gone. Non-compact single mode still uses the inline × clear button. A Plus icon button (not text) typically sits next to the field label to open the search panel via `ref.openPanel()`. When false (default): renders exactly as before.

**Outside-click boundary (compact mode):** `panelRef` is attached to the panel root div itself (via `renderPanel`), not the outer compact wrapper — so clicking other linked cards while the panel is open correctly closes it, since the cards are outside the panel.

**hideTrigger prop (default false, requires compact=true):** When true, LinkField renders NO trigger button when closed — the parent is fully responsible for opening the panel. The parent must hold a `ref` to the LinkField and call `ref.current.openPanel()` (exposed via `useImperativeHandle`). Use this when the "Add / Remove" button needs to live outside the LinkField's layout (e.g. inline next to a label on the same row). When `searchOpen` becomes true, the panel renders in-flow regardless of `hideTrigger`. LinkField is a `React.forwardRef` component; this doesn't affect any existing JSX call site.

**titleTarget + back-navigation pattern:** `titleTarget` (default `'_blank'`) controls the anchor target on card title links; pass `'_self'` for same-tab in-app navigation (used by the Related Records linker — tasks linking to tasks), which also hides the ↗ arrow (the search panel's own ↗ always stays `_blank`). For same-tab navigation between same-type records, `titleHref` can additionally encode `?rt=${record_type}&from=${encodeURIComponent(sourceUrl)}` — `tasks/[id].jsx` reads `rt` as `recordTypeHint` (fixes wrong-record lookup when `task_num` is shared across record_types) and `from` as the back URL (takes priority over the sessionStorage `tasksBackUrl` fallback). On mobile, `router.back()` works naturally since navigation is same-tab. This is the exact fix from commit 4069921 for Related Records; re-verified byte-identical after the RelationField migration (see below).

**External link icon:** uses ↗ character inline (~11px), consistent with the FieldWithBadge pattern. No circular badge.

---

**RelationField / relations.js registry:** `RelationField` (`components/shared/RelationField.jsx`) is a thin config-lookup wrapper around LinkField, backed by `lib/relations.js`. Purpose: centralize per-relationship query/display config (table, fields, search, title/subtitle formatting, icon) so it can't drift between call sites the way NewTaskForm's Property fetch once did (missing the `id` field, fixed 2026-07-21 — the bug that motivated this whole registry pattern). Usage: `<RelationField rel="property" ... />` — the caller still passes `value`/`onChange`/`mode`/`compact`/etc.; the registry entry supplies the query/display config. Write-side logic (which FK column, denormalized-field syncing like `property_id`+`prop_code`) intentionally stays as caller-supplied `onChange`, not centralized — that's genuine per-relationship business logic, not duplication.

**General rule for what belongs in the registry vs. stays local:** a `titleField`/`badgeField`/similar display function belongs in `lib/relations.js` only when it's a pure function of `row` alone. It stays caller-supplied whenever it closes over component state (e.g. reading other local arrays — `vendors`/`tenants` lists — to show authoritative linked-company data instead of the row's own unreliable free-text field) — a registry module has no access to a component's local state, so an impure function moved there would simply break. This single rule, confirmed independently across all six migrations below, is why some relationships have `titleField`/`badgeField` in the registry and others don't.

**Registry entries and their call sites** (general purity rule above governs what's local vs registry for each):
- `property` — TaskDetail + NewTaskForm. All-pure config; `onChange` (saves `property_id`+`prop_code` together) stays local at both sites. **2026-07-24:** `searchFilter: 'status=neq.archived'` (excludes archived rather than enumerating active/acp-entity/sg-entity, so new statuses show by default) + `showAllOnOpen: true` (48 prop_codes total — small enough to show in full immediately).
- `contact` — **consolidated 2026-07-23**, replacing the former separate `vendorContact`/`tenantContact`/`taskContacts` entries (all three had identical query/display config). One entry, three call-site shapes: Vendor Contact (TaskDetail + NewTaskForm, `mode:'single'`, `searchFilter="vendor_id=not.is.null"`), Tenant Contact (same, `searchFilter` built by `tenantIdsSearchFilterFor()` in TasksView.jsx as `tenant_id=in.(...)`), and the plain multi-select Contacts list (TaskDetail Contacts section, `mode:'multi'` default, no searchFilter — any contact, any category). `titleField`/`badgeField` stay local at every call site (`contactTitle`/`contactPropCode`, closing over local `vendors`/`tenants` state). `createFields`+`onCreate` (multi-mode only) also stay local. **Correction (2026-07-24): `contacts.prop_code` DOES exist** — a prior session claimed it didn't. It's populated for the large majority of tenant-linked contacts (confirmed live: 9/10 sampled had it correctly populated; 1/10 had it null despite a valid `tenant_id`). `tenantIdsSearchFilterFor` is kept anyway — not because the column is missing, but because deriving from `tenants` via the FK can't go stale independently the way a denormalized column can, so it correctly handles the occasional unpopulated row.
- `relatedRecords` — TaskDetail Related Records (`task_relations`, self-referential tasks↔tasks, `titleTarget:'_self'`). `searchFilter`/`titleHref` stay local (depend on the CURRENT record, not `row` — this is the 4069921 same-tab nav + `?rt=`/`?from=` fix). `titleField`/`iconField` are pure, live in registry. **Its `searchFilter` still has the syntax bug** (see above) — not fixed as of 2026-07-23.
- `vendorContacts` / `tenantContacts` — VendorDetail/TenantDetail Contacts tabs (`mode:'reverseFK'`, no join table). Two entries (differ by `reverseField` + FK column) since unifying would change the live query. Fully registry-able — no closures at these call sites.
- `contactVendorCompany` / `contactTenantCompany` — ContactDetail's own Vendor/Tenant Company pickers (`mode:'single'`, writes `contacts.vendor_id`/`tenant_id`). Fully registry-able, incl. `badgeField` (`contactTenantCompany`'s `prop_code` pill).
- `contactLinkedTasks` — ContactDetail's read-only reverse view of `task_contacts` (opposite direction from `contact`: `parentIdField:'contact_id'`). `readOnly:true` baked in.
- `taskVendorCompany` / `taskTenantCompany` — TaskDetail's Vendor/Tenant Company card AND NewTaskForm's WO section (`mode:'single'`, writes `tasks.vendor_id`/`tenant_id` directly — a different FK than `contactVendorCompany`/`contact`). Query/display shape identical to `contactVendorCompany`/`contactTenantCompany`, kept as separate entries for call-site clarity. **2026-07-23: wired into BOTH TaskDetail and NewTaskForm** — Company is now independently pickable in both, including at task creation.
- `keySafe` — TaskDetail + NewTaskForm WO Details (`mode:'single'`, writes `tasks.key_safe_id`). `titleField` leads with prop_code, `badgeField` shows status, `metaField` shows contents (required removing LinkField's single-mode `!compact` gate on `metaField`). `searchFilter` fixed 2026-07-23 (see syntax bug note above). **2026-07-24:** `showAllOnOpen: true` — a WO's key safe list is already property-scoped by the call site's `searchFilter`, so it's small.

**Series status:** the LinkField→RelationField migration is complete across the entire app. `grep -rn "<LinkField"` shows it appears nowhere except inside `RelationField.jsx` itself.

**Three things to handle BEFORE pointing LinkField at a new relationship type:**
1. `icon` prop defaults to `UserCircle` — pass `icon={SomePhosphorComponent}` at the call site for any non-contact entity (e.g. Property linker uses `icon={Buildings}`).
2. LinkField is the UI/interaction layer only — it does not create the underlying relationship. Each new linker target (Insurance↔Properties, Key Safes↔Work Orders, etc.) needs its own schema decision first (direct FK for one-to-many, join table for many-to-many), same pattern as `task_contacts`. Design the relationship, then wire LinkField to it — two steps, not one.
3. LinkField currently reads/writes via the anon Supabase key. Fine for contacts/vendors/tenants/properties (anon-readable tables). Any future linker target that's deliberately RLS-locked (e.g. `automation_agents`, or future sensitive/financial tables) will NOT be reachable by LinkField as-is — it would need a server-route mode instead of direct anon calls. Check RLS/anon grants on the target table before wiring a new linker to it.

**⚠️ Rendering guard rule:** `variant='card'` and `variant='chip'` blocks MUST include `mode !== 'single'`. Without it, both blocks mount alongside the dedicated `{mode === 'single' && (...)}` block, sharing `panelRef`/`searchOpen` — `panelRef.current` gets overwritten, breaking the outside-click listener (fires before onClick, swallowing picks). Correct: `{!loadingLinks && variant === 'card' && mode !== 'single' && (` / `{!loadingLinks && variant === 'chip' && mode !== 'single' && (`.

**Search result row click priority:** In `renderPanel()` (shared by all card/chip/single call sites), the result row's outer `div onClick` is the primary "select/link this" action. The contact name is rendered as a plain colored `<span>` — NOT an anchor — so clicking it selects the result. A small secondary `↗` anchor after the name (with `onClick stopPropagation`) opens the record in a new tab without triggering the row's select. Do NOT regress this to the old pattern where the name was the anchor — that made clicking the most prominent element open a new tab instead of linking.

## TaskDetail Architecture Notes (permanent)

- **Details tab — 10 section cards (in order):** Core → Follow-Up → Contacts (LinkField multi, all types) → Vendor / Tenant Contact (LinkField mode='single' ×2) → Vendor / Tenant Company (LinkField mode='single' ×2) → Related Records (LinkField multi, task_relations join table, all types) → Work Order Details (WO only; Financials + Closeout collapsed sub-panels) → Notes & Relationships → Documents → Dates. System Info collapsible block at end.
- **Category:** shown in Core for all record types EXCEPT `work_order` (WO has its own WO Category field in the WO Details card).
- **Property field** in TaskDetail closed state: `CodeOnlySelect` component shows just prop_code; dropdown options show "code — name".
- **Contact/Company Decoupling Rebuild (2026-07-23) — permanent architecture, reapplied cleanly against `preview` after a first attempt (branch `claude/contact-company-rebuild-us7o49`) was built from a stale base (`main`, missing `247eadb`) and had to be redone; the underlying design/logic from that attempt was independently verified correct and re-derived here, not redesigned.** Contact and Company are two fully independent fields on `tasks`, in two separate cards ("Vendor / Tenant Contact" and "Vendor / Tenant Company"), never in the same row. Picking a Contact writes ONLY `{type}_contact_id` (`handleContactChange`) — it never touches `vendor_id`/`tenant_id`, on existing tasks, ever. Picking a Company writes ONLY `vendor_id`/`tenant_id` (`handleVendorCompanyChange`/`handleTenantCompanyChange`) — it never touches the Contact fields. The ONE exception, scoped narrowly: **first-save-only fallback** in `/api/tasks/create.js` — if a new task is created with a Contact picked but Company left blank, the server looks up that contact's own `vendor_id`/`tenant_id` and fills the task's Company from it (never overrides a manually-picked Company; never runs on any update/PATCH path, since those go straight from the client to Supabase via `sbPatch`, bypassing this route entirely).
- **NewTaskForm mirrors TaskDetail's layout exactly (2026-07-23):** the old `CompanyContactRow` (company-first cascade, added 2026-07-22 then already removed once before this) and its 247eadb-era replacement `NewTaskContactField`+`AvailableAfterSaving`-for-Company pairing are both gone. `NewTaskContactField` was generalized into `NewTaskLinkField` (adds a `sectionLabel` prop, and 2026-07-24 a `showAllOnOpen` prop) and is now used for all 4 fields — Vendor Contact, Vendor Company, Tenant Contact, Tenant Company — each its own full-width block, never paired in a row. Company is pickable immediately during creation (writes into local `formData.vendor_id`/`tenant_id`, same as Property/Key Safe already did) — no more waiting for a saved task id. NewTaskForm's now-unused `isMobile` state + resize listener (added 247eadb specifically for the old Contact+Company row-pairing's mobile stacking) was removed — the new one-field-per-row layout doesn't need a breakpoint check.
- **Staged Contacts + Related Records picking at create time (2026-07-24):** `AvailableAfterSaving` (the "Available after saving" placeholder) is gone from NewTaskForm — Contacts and Related Records are now pickable during creation via `RelationField mode="staged"` (see Canonical Linker Architecture's `mode='staged'` note), holding full row objects in local `stagedContacts`/`stagedRelatedRecords` state (NewTaskForm). Nothing is written until `handleSave`: after `/api/tasks/create` returns the real `id`, each staged row is POSTed to `task_contacts`/`task_relations` in a loop, individually try/caught. A staged pick removed before Save is simply never in the array when that loop runs — genuinely never written, not written-then-deleted. If the task itself was created but one or more links fail, the form does NOT auto-navigate away (that would strand the user with no way back to a task they can't see the URL for) — it shows an error banner naming exactly what failed and an "Open created task →" link (`createdTaskNum` state) so the user can finish linking manually from the now-real, saved task. Verified live (Playwright + mocked Supabase, since real network access isn't available in this environment): happy path posts the correct new `task_id` to both join tables and auto-navigates; a pick removed pre-save is confirmed never POSTed; a simulated `task_contacts` POST failure correctly blocks navigation and shows the error + link; TaskDetail's own (non-staged) multi-mode Contacts add/link on an existing task still fires a real, immediate POST — confirming the `mode='staged'` addition to `LinkField.jsx` is purely additive (every render path new code reads from `displayLinked`, which is byte-identical to the old `linked` state for every mode except `'staged'`) and doesn't affect any of the ~15 other call sites.
- **NewTaskForm field order reconciled with TaskDetail (2026-07-24):** confirmed live that the two forms had diverged significantly (Details/Internal Notes were inside NewTaskForm's top card instead of after WO Details; Vendor/Tenant Contact/Company were nested inside the WO-only section instead of their own always-visible cards; FU Date/Notes came before Priority/Status/Category instead of after). Reordered NewTaskForm's JSX to match TaskDetail's card sequence exactly for every field present in both: Core (Property→Priority→Assigned To→Status→Category) → Follow-Up (FU Date→FU Notes) → Contacts → Vendor/Tenant Contact → Vendor/Tenant Company → Related Records → Work Order Details (WO only) → Notes & Relationships (Details→Internal Notes). **Deliberate scope call:** Vendor/Tenant Contact and Vendor/Tenant Company were ungated from `record_type==='work_order'` in NewTaskForm — TaskDetail shows these cards for every record type, and matching field ORDER without also matching this visibility scope would leave true order-matching impossible (they'd still be buried inside a WO-only block instead of appearing in sequence for non-WO types). Verified live: a `task`-type new-task form now shows both cards (previously hidden entirely for non-WO). Fields that exist in TaskDetail but not NewTaskForm (Bid Status, Depends On Task #, Parent Project fields, Close Date — see the field audit below) stay absent, per instruction — this session only reconciled order/visibility of fields already present in both, not field coverage.
- **Vendor/Tenant Company lookups** (TasksList rows, TaskDetail display, NewTaskForm picker) load ALL vendors/tenants regardless of status — do NOT add an Active-only filter back (a prior version's Active-only filter silently blanked out ~74%/65% of correctly-linked companies; fixed 2026-07-20).
- **Tenant Company** shows a `prop_code` badge (via the `taskTenantCompany` registry entry's `badgeField`). Vendor Company intentionally has no badge — vendors aren't tied to a single property.
- **Contacts, Vendor Contact, Tenant Contact, Vendor Company, Tenant Company trigger buttons** are all `Plus` icon (14px) with a `title` tooltip and `excludeRef` wired to their own button.
- **Multi-mode `loadLinked()` retries once on failure** (`LinkField.jsx`, fixed 2026-07-22) — a bare `catch{setLinked([])}` with no retry left sections (Contacts, Related Records, reverseFK tabs) permanently empty after one transient network hiccup, with no visible error. Now retries once after 800ms before giving up.
- **Alert field removed from Follow-Up** (TaskDetail + NewTaskForm) — UI only, `tasks.alert` column untouched.
- **"Keys / Key Safe" free-text field (`tasks.key_safe_info`)** hidden from both TaskDetail's and NewTaskForm's WO sections (2026-07-22) — UI only, column untouched. Both forms use the `keySafe` RelationField instead (`mode:'single'`, writes `key_safe_id`), scoped by `searchFilter={`prop_code=eq.${prop_code}`}` (fixed missing `=` 2026-07-23 — see Canonical Linker Architecture's searchFilter syntax bug note) and only rendered inside `record_type==='work_order'`. See Next Priorities for the still-open Podio-sync mapping gap.
- **Tenant Contact search scoped to the selected property, correctly this time (2026-07-23):** `247eadb` (2026-07-22) first attempted this via `searchFilter={`prop_code.eq.${prop_code}`}`, which had the missing `=` bug (see searchFilter syntax bug note above). Fixed via `tenantIdsSearchFilterFor(tenants, propCode)` (top of TasksView.jsx): derives the qualifying tenant ids from the already-loaded local `tenants` list and builds `` `tenant_id=in.(${ids.join(',')})` ``, falling back to a guaranteed-empty filter when no tenants match the property (never silently reverts to unscoped). Applied at both TaskDetail's and NewTaskForm's Tenant Contact call sites. Vendor Contact is deliberately NOT property-scoped (`searchFilter="vendor_id=not.is.null"` only) — vendors work across multiple properties. **Correction (2026-07-24): `contacts.prop_code` DOES exist** — the 2026-07-23 session's claim that it didn't was wrong; it's populated for 9/10 sampled tenant-linked contacts (confirmed live), with the occasional row left null. `tenantIdsSearchFilterFor` stays the approach anyway — deriving from `tenants` via the FK can't drift independently of the FK the way a denormalized column can, so it's the more robust choice, not a workaround for a missing column.
- **Key Safe "disappears when saved empty" — investigated live 2026-07-22, could NOT reproduce.** Reported: Key Safe shows in NewTaskForm while creating, but doesn't appear in TaskDetail after saving a WO with it left blank. Tested via 4 independent live reproductions (mocked Supabase REST + real Chromium, matching the project's established live-verification technique): (1) direct TaskDetail load with `record_type:'work_order', key_safe_id:null, prop_code` set; (2) same with `prop_code:null`; (3) the actual real flow — fill NewTaskForm, click Save (client-side `router.push`, not a hard reload), land on the new task; (4) same as (3) at a 390px mobile viewport. In all four, the Key Safe field renders correctly with its empty `—` state, alongside WO Category/Budget Item/WO Type, confirmed via `innerText` (which excludes hidden/`display:none` content, so this isn't a false positive) and a screenshot. **No code change made for this finding** — the described mechanism doesn't exist in the current code at HEAD. Likely explanation: Scott's observation predates one of this session-period's earlier fixes (the `keySafe` linker was only added to NewTaskForm a few commits before this session, per git log), or was seen against a stale Vercel preview/browser cache. Recommend Scott re-verify once this session's commit is deployed and hard-refreshed; if it recurs, capture the exact record_type/key_safe_id/prop_code of the specific row for a targeted repro. **A DIFFERENT, real Key Safe bug was found and fixed 2026-07-23** — its property `searchFilter` never actually filtered anything, matching Scott's separate report that Key Safe search "still shows key safes from other properties." Root cause + fix: see Canonical Linker Architecture's searchFilter syntax bug note above. These are two distinct reports about two distinct symptoms (display-after-save vs. search-not-filtering) — do not conflate them.
- **Field audit (2026-07-22, report-only, see Next Priorities for anything actioned):** Went through every TaskDetail/NewTaskForm field. Findings: (1) **Bid Status** exists in TaskDetail's WO Closeout sub-panel but has no NewTaskForm equivalent — can only be set after saving. (2) **Depends On Task #**, **Parent Project # / Project Type / Sequence Order** (project-only) exist in TaskDetail's Notes & Relationships but have no NewTaskForm equivalent. (3) **Close Date** exists in TaskDetail's Dates card but not in NewTaskForm (arguably fine — a new task is rarely already closed). (4) TaskDetail's WO Financials/Closeout fields are organized into collapsible `+ FINANCIALS`/`+ CLOSEOUT` sub-panels; NewTaskForm renders the same fields flat/always-visible — a UI consistency difference, not a bug. (5) Drive Folder, Podio Link, and System Info fields are correctly absent from NewTaskForm (architecturally justified — none of that data exists before the row is saved). (6) All other fields checked (Property, Priority, Assigned To, Status, Category, FU Date/Notes, WO Category, Budget Item?, WO Type, WO Instructions to Vendor, Email Request To Vendor, Estimate Amount, Log, Pmt Instructions to BK, Invoice Location/Stage/Paid, Final Close-Out Notes, Work Stage, Make Recurring, Details, Internal Notes) appear correctly in both create and saved modes, share the same option constants (`ASSIGNEES`/`WO_TYPE_OPTIONS`/etc.), and values set at creation survive into the saved view via the standard `formData` → POST body → insert → `select=*` round-trip. No fixes applied for (1)–(4); flagged in Next Priorities.

## Current Git State

- main: `148d885` — merge: Contact/Company decoupling + searchFilter bug fixes + staged Contacts/Related Records + NewTaskForm field-order reconciliation (preview 00c32d7) into main (merged 2026-07-24, Scott approved: "Yes. Merge to main."). Brings in `247eadb`/`4cd6d4f`/`102e1ae` — see TaskDetail Architecture Notes and Canonical Linker Architecture for what changed.
- preview: `00c32d7` — same content as main as of this merge (docs: update git state to 102e1ae)

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
13. **Supabase pagination required for any table that may exceed 1,000 rows** — PostgREST's default max-rows silently truncates with no error. Use `.range()`/offset loop. Known to have silently truncated PipelineView (2026-07-11) and the Contacts linking script (2026-07-20).
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
- `wo_agent_runs`: run_date (UNIQUE), status, nudge_items/high_cost_items (jsonb) — table + RLS live
- `email_threads`: `is_deleted boolean DEFAULT false` (batch-action delete); `last_sender_name`, `last_sender_address`, `has_attachment boolean DEFAULT false` (populated by webhook + sync-now; old threads null/false until re-synced)
- `email_messages`: `has_attachment boolean DEFAULT false`
- **Phase 5 Stage 1 — 2026-07-11:** `leasing_pipeline` +30 cols (stage_5/7_state, pipeline_source, LOI negotiation fields, qual fields, broker fields, on_hold/dead fields). `suites` status CHECK +6th value `'Vacant / For Lease — Pending'`. `key_handovers` NEW table (employee/admin RLS only). `lease_applications` NEW table 106-col (employee/admin RLS only — contains SSN/financial data). `leasing_pipeline.stage` migrated from Podio values to 13-value model; original in `stage_raw_podio`; CHECK constraint added.
- **`task_contacts` RLS (confirmed 2026-07-16):** Anon key has SELECT (already listed above) + INSERT + DELETE. Intentional — CRM is internal; LinkField uses anon key client-side for link/unlink. If tightening needed, add service-role API routes.
- **`contacts` anon INSERT policy (2026-07-17):** `"anon can insert contacts"` WITH CHECK (true). Required for LinkField `allowCreate` (create-and-link from TaskDetail). Without it, the create POST 400s.
- **`vendors` anon INSERT policy (2026-07-18):** `"anon can insert vendors"` WITH CHECK (true). Required for Vendor Contact modal auto-create-company in `handleContactModalSave`. Previously anon had SELECT only.
- **`vendors.podio_id` backfill (2026-07-20):** 621/622 rows populated via `scripts/podio-vendors-backfill.js` (Podio app auth, company_dba case-insensitive exact match). One row intentionally NULL — duplicate "Alliance Land Surveying LLC" (id `8137893e-315e-42b8-82be-cac8c5ae2d23`), flagged for Scott to review/delete. Script lives at `scripts/podio-vendors-backfill.js`; re-runnable with `--write` flag. Podio API creds in `.env.local` as PODIO_CLIENT_ID/SECRET/APP_ID/APP_TOKEN.
- **`contacts.vendor_id` / `contacts.tenant_id` backfill (2026-07-20):** 429 vendor + 311 tenant = 740 contacts linked via `scripts/podio-contacts-linking.js`. Method: Podio relationship fields (`type: app`) on each contact, using linked record's `item_id` (global) to match `vendors.podio_id` and `app_item_id` (per-app sequential) to match `tenants.podio_id`. **Do NOT use `contacts.company_dba` for vendor/tenant matching** — it is a free-text field on the contact itself, not a reliable FK. 37 rows left null (25 ambiguous/multi-link, 2 unresolved vendor, 1 unresolved tenant, 9 unknown app) — manual review needed. Script re-runnable with `--write`. Contacts Podio app ID: 7286881.
- **`tasks` anon UPDATE policy (2026-07-18):** `"anon_update_tasks"` USING (true) WITH CHECK (true). **Critical — was missing, causing ALL task field saves (every InlineBlurField, saveMany, etc.) to silently return 200 + empty array without touching any row.** Root cause: only `authenticated` roles had UPDATE. `sbPatch` now also throws explicitly if response array is empty, so this class of failure is no longer silent. `save` and `saveMany` in TaskDetail now catch errors and surface them via a visible banner below the tab bar. Future direct-write helpers must follow the same "throw if 0 rows" convention.
- **`automation_agents` (2026-07-20):** Automations registry — one row per scheduled cron agent. Columns: id, name (unique), description, code_location, cron_schedule, last_run_at, last_run_status, created_at, updated_at. RLS enabled, **zero anon policies** — internal-only, same pattern as `key_handovers`/`lease_applications`. All reads/writes via service-role API routes only. Seeded with 4 rows: Morning Briefing, Lease Watch, New Inquiry, Work Order Agent.
- **`automation_triggers` (2026-07-20):** Per-record automation trigger registry — button/event/date triggers. Columns: id, name, module, trigger_type (CHECK: button_click/item_created/item_updated/date_field), trigger_detail, condition_display, action_display, config (jsonb), status (CHECK: active/paused), recurs (CHECK: one_time/repeating), last_fired_at, fire_count, why_not_view, code_location, last_modified_by, change_note, created_at, updated_at. RLS enabled, **zero anon policies**. Currently empty — rows added as WO button/date triggers are built.
- **`leasing_pipeline` has NO FK to `properties`** — links via `prop_code` (text) only. PostgREST join syntax `properties(...)` will NOT work from leasing_pipeline. Query properties separately by prop_code.
- **`tasks.property_id` (2026-07-21):** `uuid FK → properties(id)`, backfilled from `prop_code` match (4,153/4,374 rows — 221 had null prop_code and remain null). Index: `idx_tasks_property_id`. Covered by existing `anon_update_tasks` policy. Used by the Property single-mode LinkField in TaskDetail + NewTaskForm; `handlePropertyChange` saves both `property_id` and `prop_code` atomically so legacy prop_code filters stay intact.
- **Postgres RPC suffix-lookup functions (2026-07-17):** `find_contact_by_id_suffix(p_suffix text)` and `find_issue_by_id_suffix(p_suffix text)` — both SECURITY INVOKER, granted to anon. Used by X-prefix detail-page lookup for tables >1000 rows (Supabase max-rows=1000 cap prevents fetch-all). Add similar functions for any other large table needing X-prefix lookup.
- **`contacts` anon UPDATE policy (2026-07-21):** `"anon update contacts"` USING (true) WITH CHECK (true). Required for reverseFK mode LinkField to set/clear vendor_id and tenant_id from VendorDetail/TenantDetail Contacts tab.
- **`task_relations` (2026-07-21):** Self-referential many-to-many join table for related records. Columns: id, task_id FK→tasks(id) ON DELETE CASCADE, related_task_id FK→tasks(id) ON DELETE CASCADE, created_at. UNIQUE(task_id, related_task_id). RLS: anon SELECT + INSERT + DELETE. Designed to expand to cross-module links (insurance items, COIs, etc.) in the future; currently links tasks/WOs/projects to other tasks/WOs/projects.

## Drive Folder Architecture (permanent)

- Trigger: auto-created on task save (fire-and-forget) for ALL record types; also manual `+ Drive Folder` button in WO header
- Structure: `[Property Root]/Work History/[YYYY-MM-DD] — [displayId] — [title]/`
- Hardcoded in `lib/drivePropertyFolders.js` (14 active properties; S&G folder ID pending)

## Embedded TasksView Architecture (permanent)

All 5 contexts use `<TasksView embeddedMode hidePropertyPills filterXxx={...}/>`:
Property/Owner → `filterPropCode={data.prop_code}` | Tenant → `filterTenantId={data.id}` | Vendor → `filterVendorId={data.id}` | Contact → `filterContactId={data.id}`

## Valid prop_codes

48 total (14 active). Full list: `drivePropertyFolders.js` and Supabase `properties` table.
