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
- **PENDING: S&G prop_code** — set up as a property (like ACP) with dedicated Drive folder; Scott will supply Drive folder ID for `drivePropertyFolders.js`
- **Inbox divider width persistence — NOT resolved, deprioritized.** Default width hardcoded to 570px. setPointerCapture fix is live but persistence still unreliable on hard refresh. If revisiting: re-instrument with console logging first — do NOT attempt blind fixes.
- **New Inquiry agent (Agent 3)** — uses LEASING_KEYWORDS filter. Manual **+LSG** button in EmailInbox for ambiguous cases (source='manual_lsg'). `LSG_PROPERTIES` array hardcoded in EmailInbox.jsx with 14 active properties (OLY/WNT excluded per Scott). lead-capture.js allows null prop_code. Future: Claude-API classifier if +LSG usage exceeds ~10/day.
- **leasing_pipeline working set** — 18 records (5 real + 13 'TEST — ' seeded) after 2026-07-11 reset. Delete all 'TEST — ' prefixed records before go-live. Stage filter: `stage=not.in.(Dead,On Hold,Landlord Declined Use)`; limit 5000.

## Next Priorities

1. Phase 5 Stage 4 (part 2): PipelineView click-through detail panel (record detail, stage transition buttons, LOI drafting UI, qual gate form)
3. Phase 5 Stage 4 (part 3): Pipeline embed in Property detail Leasing tab — replace inline tab with `<PipelineView propCode={data.prop_code} />` per TODO comment at SedonaCRM.jsx:888
4. Phase 5 Stage 3: Dropbox Sign integration (two-part sequential signing, webhook endpoint)
5. Extend LinkField to Vendor/Tenant join tables and future relationships (Key Safes, COIs, Vendor Services) once proper join tables exist
6. (Optional, low priority) Revisit inbox divider persistence — see Known Gaps for what's already been ruled out

## LinkField Architecture (permanent)

`components/shared/LinkField.jsx` — canonical many-to-many relationship field. Config-driven, zero hardcoded table names. Piloted on Task ↔ Contacts via `task_contacts`.

**Props:** `mode` ('multi' default | 'single'), `value` (single mode: current FK id), `onChange` (single mode: (row|null)=>void — caller persists), `onCreateNew` (single mode: ()=>void — caller opens modal), `joinTable`, `parentIdField`, `parentId`, `linkedTable`, `linkedIdField`, `linkedFields` (select clause), `searchFields`, `titleField` (string or fn), `titleHref` (fn), `subtitleField` (fn/string, optional — phone/email line), `summaryField` (fn/string), `metaField` (fn/string), `readOnly`, `allowCreate`, `createFields`, `onCreate` (async fn → new row), `sectionLabel`, `variant` ('card' default | 'chip').

**variant='card' (default):** Podio-style stacked cards — UserCircle icon + title link (T.accent + ↗) + optional subtitle (phone/email) + meta line. No × on the card itself. Trigger button says "Add / remove"; opening the panel shows currently-linked items as removable chips at the top so unlinking is still possible. ContactsView "Linked Tasks" (readOnly, no subtitleField) renders as cards with just icon + title + meta, no subtitle gap.

**variant='chip':** compact inline pills with × unlink. Pass `variant="chip"` explicitly on any call site that wants the old look.

**mode='multi' (default):** self-persisting join-table mode. Inserts/deletes join rows; caller owns nothing.

**mode='single':** pure controlled picker — no table writes. `onChange(row|null)` on pick/clear (caller persists). `onCreateNew()` on "+ Create new" (caller opens StackedFormModal then calls onChange). joinTable/parentId fields unused. Card + × clear shown when value set; dashed trigger always visible ("Change …" / "+ Add …"). First production consumer: TaskDetail Linked Companies card (Vendor Contact + Tenant Contact pickers).

**⚠️ Rendering guard rule:** `variant='card'` and `variant='chip'` blocks MUST include `mode !== 'single'`. Without it, both blocks mount alongside the dedicated `{mode === 'single' && (...)}` block, sharing `panelRef`/`searchOpen` — panelRef.current gets overwritten, breaking the outside-click listener (fires before onClick, swallowing picks). Correct: `{!loadingLinks && variant === 'card' && mode !== 'single' && (` / `{!loadingLinks && variant === 'chip' && mode !== 'single' && (`.

**Forward mode** (TaskDetail Contacts, allowCreate=true): add/remove/search/create inline. **Reverse/read-only** (ContactDetail Linked Tasks): same join table, opposite direction; no add/create UI.

**To add another relationship:** drop in `<LinkField .../>` with the correct props — no new state/effects/functions needed in the parent view.

**External link icon:** uses ↗ character inline (~11px), consistent with FieldWithBadge pattern. No circular badge.

**Search result row click priority:** In `renderPanel()` (shared by all card/chip/single call sites), the result row's outer `div onClick` is the primary "select/link this" action. The contact name is rendered as a plain colored `<span>` — NOT an anchor — so clicking it selects the result. A small secondary `↗` anchor after the name (with `onClick stopPropagation`) opens the record in a new tab without triggering the row's select. Do NOT regress this to the old pattern where the name was the anchor — that made clicking the most prominent element open a new tab instead of linking.

## TaskDetail Architecture Notes (permanent)

- **Details tab — 7 section cards (in order):** Core → Follow-Up → Contacts (LinkField, all types) → Linked Companies (LinkField mode='single', always visible) → Work Order Details (WO only; Financials + Closeout collapsed sub-panels) → Notes & Relationships → Documents → Dates. System Info collapsible block at end.
- **Category:** shown in Core for all record types EXCEPT `work_order` (WO has its own WO Category field in the WO Details card).
- **Property field** in TaskDetail closed state: `CodeOnlySelect` component shows just prop_code; dropdown options show "code — name".
- **Linked Companies:** uses `LinkField mode='single'` for both Vendor Contact and Tenant Contact. Picking a contact auto-fills the read-only Company box via `handleContactChange` (reads `vendor_id`/`tenant_id` FK from the contact row, saves both fields via `saveMany`). "+ Create new" opens `StackedFormModal` (zIndex 310) with a 4-field form (name/company/phone/email). **Deliberate asymmetry:** Vendor Contact modal auto-creates (or reuses via case-insensitive exact ilike match on company_dba) a `vendors` row when a company name is typed — new vendor row appended to local state immediately so Company box fills without refresh. Tenant Contact modal intentionally does NOT create a `tenants` row — new tenants must go through the leasing pipeline; company_dba is free-text only on the contact. `ContactFirstRow` was retired; `CompanyContactRow` kept for NewTaskForm WO section (company-first flow).
- **`CompanyContactRow`** kept intact for NewTaskForm WO section (company-first flow).

## Current Git State

- main: `9ce6031` — merged from preview 2026-07-11 (Scott-approved)
- preview: (commit pending this session)

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
- `wo_agent_runs`: run_date (UNIQUE), status, nudge_items/high_cost_items (jsonb) — table + RLS live
- `email_threads`: `is_deleted boolean DEFAULT false` (batch-action delete); `last_sender_name`, `last_sender_address`, `has_attachment boolean DEFAULT false` (populated by webhook + sync-now; old threads null/false until re-synced)
- `email_messages`: `has_attachment boolean DEFAULT false`
- **Phase 5 Stage 1 — 2026-07-11:** `leasing_pipeline` +30 cols (stage_5/7_state, pipeline_source, LOI negotiation fields, qual fields, broker fields, on_hold/dead fields). `suites` status CHECK +6th value `'Vacant / For Lease — Pending'`. `key_handovers` NEW table (employee/admin RLS only). `lease_applications` NEW table 106-col (employee/admin RLS only — contains SSN/financial data). `leasing_pipeline.stage` migrated from Podio values to 13-value model; original in `stage_raw_podio`; CHECK constraint added.
- **`task_contacts` RLS (confirmed 2026-07-16):** Anon key has SELECT (already listed above) + INSERT + DELETE. Intentional — CRM is internal; LinkField uses anon key client-side for link/unlink. If tightening needed, add service-role API routes.
- **`contacts` anon INSERT policy (2026-07-17):** `"anon can insert contacts"` WITH CHECK (true). Required for LinkField `allowCreate` (create-and-link from TaskDetail). Without it, the create POST 400s.
- **`vendors` anon INSERT policy (2026-07-18):** `"anon can insert vendors"` WITH CHECK (true). Required for Vendor Contact modal auto-create-company in `handleContactModalSave`. Previously anon had SELECT only.
- **`tasks` anon UPDATE policy (2026-07-18):** `"anon_update_tasks"` USING (true) WITH CHECK (true). **Critical — was missing, causing ALL task field saves (every InlineBlurField, saveMany, etc.) to silently return 200 + empty array without touching any row.** Root cause: only `authenticated` roles had UPDATE. `sbPatch` now also throws explicitly if response array is empty, so this class of failure is no longer silent. `save` and `saveMany` in TaskDetail now catch errors and surface them via a visible banner below the tab bar. Future direct-write helpers must follow the same "throw if 0 rows" convention.
- **`automation_agents` (2026-07-20):** Automations registry — one row per scheduled cron agent. Columns: id, name (unique), description, code_location, cron_schedule, last_run_at, last_run_status, created_at, updated_at. RLS enabled, **zero anon policies** — internal-only, same pattern as `key_handovers`/`lease_applications`. All reads/writes via service-role API routes only. Seeded with 4 rows: Morning Briefing, Lease Watch, New Inquiry, Work Order Agent.
- **`automation_triggers` (2026-07-20):** Per-record automation trigger registry — button/event/date triggers. Columns: id, name, module, trigger_type (CHECK: button_click/item_created/item_updated/date_field), trigger_detail, condition_display, action_display, config (jsonb), status (CHECK: active/paused), recurs (CHECK: one_time/repeating), last_fired_at, fire_count, why_not_view, code_location, last_modified_by, change_note, created_at, updated_at. RLS enabled, **zero anon policies**. Currently empty — rows added as WO button/date triggers are built.
- **`leasing_pipeline` has NO FK to `properties`** — links via `prop_code` (text) only. PostgREST join syntax `properties(...)` will NOT work from leasing_pipeline. Query properties separately by prop_code.
- **Postgres RPC suffix-lookup functions (2026-07-17):** `find_contact_by_id_suffix(p_suffix text)` and `find_issue_by_id_suffix(p_suffix text)` — both SECURITY INVOKER, granted to anon. Used by X-prefix detail-page lookup for tables >1000 rows (Supabase max-rows=1000 cap prevents fetch-all). Add similar functions for any other large table needing X-prefix lookup.

## Drive Folder Architecture (permanent)

- Trigger: auto-created on task save (fire-and-forget) for ALL record types; also manual `+ Drive Folder` button in WO header
- Structure: `[Property Root]/Work History/[YYYY-MM-DD] — [displayId] — [title]/`
- Hardcoded in `lib/drivePropertyFolders.js` (14 active properties; S&G folder ID pending)

## Embedded TasksView Architecture (permanent)

All 5 contexts use `<TasksView embeddedMode hidePropertyPills filterXxx={...}/>`:
Property/Owner → `filterPropCode={data.prop_code}` | Tenant → `filterTenantId={data.id}` | Vendor → `filterVendorId={data.id}` | Contact → `filterContactId={data.id}`

## Valid prop_codes

48 total (14 active). Full list: `drivePropertyFolders.js` and Supabase `properties` table.
