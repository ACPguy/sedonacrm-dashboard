// ─────────────────────────────────────────────────────────────────────────────
// relations.js — centralized query/display config for RelationField
// (components/shared/RelationField.jsx), backed by LinkField.jsx.
//
// Centralizes only QUERY/DISPLAY config (table, fields, search, title/subtitle
// formatting, icon) — the read side that was duplicated identically between
// TaskDetail and NewTaskForm. Write-side logic (which FK column, whether to
// sync a denormalized field like prop_code) stays as a caller-supplied
// onChange, since that's genuine per-call-site business logic, not
// duplication.
//
// Future entries (vendorContact, tenantContact, etc.) will be added here as
// remaining LinkField call sites are migrated in later sessions.
// ─────────────────────────────────────────────────────────────────────────────
import { Buildings, UserCircle, Link, Wrench, CheckFat, FolderOpen, House, Truck, Storefront, Key } from '@phosphor-icons/react';
import { getTaskPrefix } from '../utils/taskPrefix';

export const relations = {
  property: {
    linkedTable: 'properties',
    linkedFields: 'id,podio_id,prop_code,property_name,address,city,state',
    searchFields: ['prop_code', 'property_name'],
    titleField: row => `${row.prop_code} — ${row.property_name}`,
    titleHref: row => `/properties/${row.podio_id ?? 'X' + row.id.slice(-6)}`,
    subtitleField: row => [row.address, row.city, row.state].filter(Boolean).join(', '),
    icon: Buildings,
    allowCreate: false,
  },
  // contact: consolidated registry entry (2026-07-23) replacing the former
  // vendorContact / tenantContact / taskContacts trio — all three had
  // identical linkedTable/linkedFields/searchFields/titleHref/subtitleField,
  // confirmed by reading each call site fresh rather than assumed from prior
  // session comments. One entry now covers all three usages:
  //   - Vendor Contact (TaskDetail + NewTaskForm, mode='single'): caller
  //     passes searchFilter="vendor_id.not.is.null" so search only returns
  //     contacts actually tied to a vendor company.
  //   - Tenant Contact (same, mode='single'): searchFilter="tenant_id.not.is.null".
  //     (No property-scoping filter existed on this field in the live file
  //     prior to this change — confirmed by reading TaskDetail fresh — so
  //     none was added here; a genuinely pre-existing filter would have been
  //     combined via a top-level `and=(...)` PostgREST param, mirroring the
  //     `or=(...)` construction LinkField.jsx's own search already uses. A
  //     bare filter string with no `=` — the pattern this codebase already
  //     uses elsewhere, e.g. keySafe's `prop_code.eq.X` — is kept here too
  //     for consistency with those existing call sites.)
  //   - Plain multi-select Contacts list (TaskDetail Contacts section,
  //     formerly taskContacts, mode='multi' default): no searchFilter passed
  //     at all — any contact, any category. joinTable/parentIdField/
  //     linkedIdField live here since they're per-relationship schema shape
  //     (like keySafe's reverseField), not a per-call-site value — simply
  //     unused when a call site passes mode='single'.
  // titleField/badgeField are NOT here — TaskDetail's/NewTaskForm's
  // contactTitle/contactPropCode close over local vendors/tenants state
  // (see CLAUDE.md Canonical Linker Architecture note, 2026-07-21) — stay
  // caller-supplied at every call site, unchanged by this consolidation.
  // createFields + onCreate (the inline create-new-contact flow, multi-mode
  // only) also stay local — tightly coupled write-side behavior.
  contact: {
    joinTable: 'task_contacts',
    parentIdField: 'task_id',
    linkedTable: 'contacts',
    linkedIdField: 'contact_id',
    linkedFields: 'id,full_name,company_dba,podio_id,category,created_at,primary_phone,email,vendor_id,tenant_id',
    searchFields: ['full_name', 'company_dba'],
    titleHref: row => `/contacts/${row.podio_id ?? 'X' + row.id.slice(-6)}`,
    subtitleField: row => [row.primary_phone, row.email].filter(Boolean).join(' · '),
    icon: UserCircle,
    allowCreate: true,
  },
  // relatedRecords: task_relations join table, self-referential (tasks -> tasks).
  // searchFilter and titleHref are DELIBERATELY NOT here — both depend on the
  // CURRENT record (the one Related Records is attached to), read from
  // TaskDetail's `data` closure, not from `row`: searchFilter excludes the
  // current record's own id from search results (`id.neq.${data.id}`), and
  // titleHref encodes a `?from=` back-reference to the current record's own
  // url (`/tasks/${data.task_num}`) alongside the target's `?rt=` hint — this
  // IS the navigation fix from commit 4069921, so both stay caller-supplied,
  // parameterized per the current record, same treatment as parentId.
  // titleField and iconField, by contrast, ARE pure functions of row —
  // getTaskPrefix is a stateless utility (no closures) and iconField only
  // reads row.record_type — so both live in the registry here, unlike
  // contact entry's contactTitle/contactPropCode which closed over component
  // state. titleTarget='_self' is a plain literal (not a function), so it's
  // registry-able the same way icon/allowCreate are.
  relatedRecords: {
    joinTable: 'task_relations',
    parentIdField: 'task_id',
    linkedTable: 'tasks',
    linkedIdField: 'related_task_id',
    linkedFields: 'id,record_type,task_num,title,prop_code,status',
    searchFields: ['title'],
    titleField: row => `${getTaskPrefix(row)} — ${row.title}`,
    titleTarget: '_self',
    subtitleField: row => [row.prop_code, row.status].filter(Boolean).join(' · '),
    icon: Link,
    iconField: row => ({ work_order: Wrench, task: CheckFat, project: FolderOpen, sg_task: House, acp_task: Buildings }[row.record_type] || Link),
  },
  // vendorContacts / tenantContacts: mode='reverseFK' — no join table. LinkField
  // queries `contacts` directly by FK match (reverseField=eq.parentId) and
  // PATCHes that FK to link/unlink. VendorDetail's and TenantDetail's Contacts
  // tabs (VendorsView.jsx/TenantsView.jsx) — confirmed identical in every
  // registry-able field EXCEPT reverseField and linkedFields' FK column name
  // (vendor_id vs tenant_id), read fresh from both files rather than assumed.
  // Kept as two separate entries rather than one shared entry with
  // reverseField as a caller prop: unifying linkedFields to select both FK
  // columns would change the actual query each page currently issues (a real
  // behavior change, not just a refactor), and reverseField is schema-shape
  // config — like linkedIdField/parentIdField in the join-table entries, not
  // a per-record value like parentId — so it belongs baked into the entry,
  // same treatment that kept vendorContact/tenantContact separate above.
  // mode='reverseFK' itself is also baked in here (a per-relationship
  // constant, not caller-varying) — the call site no longer passes it.
  // titleField/subtitleField/titleHref here ARE pure functions of row with NO
  // closures — VendorsView.jsx/TenantsView.jsx have no TaskDetail-style
  // contactTitle/contactPropCode helpers, so unlike vendorContact/
  // tenantContact/taskContacts, everything registry-able actually made it in.
  vendorContacts: {
    mode: 'reverseFK',
    linkedTable: 'contacts',
    reverseField: 'vendor_id',
    linkedFields: 'id,full_name,primary_phone,email,podio_id,vendor_id,created_at',
    searchFields: ['full_name', 'company_dba'],
    titleField: row => row.full_name,
    titleHref: row => `/contacts/${row.podio_id ?? 'X' + row.id.slice(-6)}`,
    subtitleField: row => [row.primary_phone, row.email].filter(Boolean).join(' · '),
    icon: UserCircle,
    allowCreate: false,
  },
  tenantContacts: {
    mode: 'reverseFK',
    linkedTable: 'contacts',
    reverseField: 'tenant_id',
    linkedFields: 'id,full_name,primary_phone,email,podio_id,tenant_id,created_at',
    searchFields: ['full_name', 'company_dba'],
    titleField: row => row.full_name,
    titleHref: row => `/contacts/${row.podio_id ?? 'X' + row.id.slice(-6)}`,
    subtitleField: row => [row.primary_phone, row.email].filter(Boolean).join(' · '),
    icon: UserCircle,
    allowCreate: false,
  },
  // contactVendorCompany / contactTenantCompany: single-mode, ContactDetail's
  // own Vendor/Tenant Company pickers (ContactsView.jsx) — write
  // contacts.vendor_id/contacts.tenant_id (a company FK ON the contact), the
  // OPPOSITE direction from vendorContacts/tenantContacts above (which pick
  // which Contacts belong to a Vendor/Tenant), and a different relationship
  // again from vendorContact/tenantContact (TaskDetail's Linked Companies
  // pickers, which write tasks.vendor_contact_id/tasks.tenant_contact_id — a
  // contact FK on a task). Named to avoid collision with both existing pairs.
  // titleField/titleHref/subtitleField/badgeField here ARE pure functions of
  // row — ContactsView.jsx has no TaskDetail-style closures — first time
  // badgeField itself has been genuinely registry-able (contactTenantCompany's
  // prop_code pill; every prior migration's badgeField closed over state).
  contactVendorCompany: {
    mode: 'single',
    linkedTable: 'vendors',
    linkedFields: 'id,company_dba,podio_id,vendor_status',
    searchFields: ['company_dba'],
    titleField: row => row.company_dba,
    titleHref: row => row.podio_id ? `/vendors/${row.podio_id}` : `/vendors/X${row.id.slice(-6)}`,
    subtitleField: row => row.vendor_status || '',
    icon: Truck,
    allowCreate: false,
  },
  contactTenantCompany: {
    mode: 'single',
    linkedTable: 'tenants',
    linkedFields: 'id,tenant_dba,podio_id,prop_code,tenant_status',
    searchFields: ['tenant_dba'],
    titleField: row => row.tenant_dba,
    titleHref: row => row.podio_id ? `/tenants/${row.podio_id}` : `/tenants/X${row.id.slice(-6)}`,
    subtitleField: row => row.prop_code || '',
    badgeField: row => row.prop_code || null,
    icon: Storefront,
    allowCreate: false,
  },
  // contactLinkedTasks: multi-mode, task_contacts join table, but the OPPOSITE
  // direction from taskContacts (task->contacts): this is contact->tasks —
  // parentIdField='contact_id', linkedIdField='task_id', linkedTable='tasks'.
  // A genuinely different relationship despite sharing the join table (does
  // NOT reuse the taskContacts entry). readOnly:true is baked in as a
  // per-relationship constant — this reverse view is intrinsically read-only
  // (no create-task-from-a-contact flow exists), same treatment as
  // mode:'reverseFK' being baked into vendorContacts/tenantContacts above.
  contactLinkedTasks: {
    joinTable: 'task_contacts',
    parentIdField: 'contact_id',
    linkedTable: 'tasks',
    linkedIdField: 'task_id',
    linkedFields: 'id,title,task_num,record_type,prop_code',
    searchFields: [],
    titleField: row => row.title || 'Untitled',
    titleHref: row => `/tasks/${row.task_num}`,
    summaryField: row => [row.record_type, row.prop_code].filter(Boolean).join(' · '),
    readOnly: true,
  },
  // keySafe: single-mode, TaskDetail Work Order Details card (WO record_type
  // only) — writes tasks.key_safe_id. No titleHref: key_safes has no
  // standalone detail route (KeySafesView is list+detail but not linked to
  // from here per the task spec), so the card title renders as plain text.
  // allowCreate is false — key safes are managed on the Property Key Safe
  // tab, not created ad hoc from a WO. searchFilter (restricting results to
  // the WO's own prop_code) stays local at the call site, same treatment as
  // relatedRecords' searchFilter — it depends on the current record's own
  // prop_code, not on `row`.
  // titleField leads with prop_code (matches how this data reads in Podio)
  // and badgeField shows status as a pill — same badgeField pattern as
  // contactTenantCompany's prop_code pill. searchFields expanded to
  // key_safe_code/on_site_location/contents/id_num/prop_code — prop_code as
  // a search term is redundant-but-harmless alongside the call site's own
  // searchFilter (both AND together in the PostgREST query: `or=(...)` is
  // one param, `searchFilter` is appended as a second, and top-level params
  // AND in PostgREST — confirmed by reading LinkField.jsx's query builder).
  // contents/id_num added to linkedFields since they're now searched on.
  // metaField adds a second card line (contents) beneath the location
  // subtitle, matching how this data reads in Podio — required the !compact
  // gate fix in LinkField.jsx's single-mode card render (see that file).
  keySafe: {
    mode: 'single',
    linkedTable: 'key_safes',
    linkedFields: 'id,key_safe_code,on_site_location,status,prop_code,contents,id_num',
    searchFields: ['key_safe_code', 'on_site_location', 'contents', 'id_num', 'prop_code'],
    titleField: row => `${row.prop_code ? row.prop_code + ' — ' : ''}${row.key_safe_code || 'Key Safe'}`,
    subtitleField: row => row.on_site_location || '',
    badgeField: row => row.status || '',
    metaField: row => row.contents || '',
    icon: Key,
    allowCreate: false,
  },
  // taskVendorCompany / taskTenantCompany: single-mode, NewTaskForm's WO
  // section (CompanyContactRow) — write tasks.vendor_id/tasks.tenant_id (the
  // WO's own company FK), added 2026-07-22 to replace a native <select> that
  // was unusable on iOS Safari (full-screen scroll wheel, no type-to-search,
  // for a list of hundreds of vendors). Query/display shape is IDENTICAL to
  // contactVendorCompany/contactTenantCompany above — same linkedTable/
  // linkedFields/titleField/titleHref/subtitleField/badgeField/icon, since
  // "pick a vendor" is the same query no matter which FK the caller's
  // onChange ultimately writes (registry entries never write anything in
  // single mode — see LinkField.jsx mode docs). Kept as separate entries
  // rather than reusing contactVendorCompany/contactTenantCompany here,
  // matching this file's established precedent of separate entries per
  // call-site semantics (e.g. vendorContacts/tenantContacts) even when the
  // query overlaps — contactVendorCompany's own name/comments document it
  // as ContactDetail-specific, and reusing it here would be misleading to a
  // future reader touching that entry expecting only ContactDetail to be
  // affected.
  taskVendorCompany: {
    mode: 'single',
    linkedTable: 'vendors',
    linkedFields: 'id,company_dba,podio_id,vendor_status',
    searchFields: ['company_dba'],
    titleField: row => row.company_dba,
    titleHref: row => row.podio_id ? `/vendors/${row.podio_id}` : `/vendors/X${row.id.slice(-6)}`,
    subtitleField: row => row.vendor_status || '',
    icon: Truck,
    allowCreate: false,
  },
  taskTenantCompany: {
    mode: 'single',
    linkedTable: 'tenants',
    linkedFields: 'id,tenant_dba,podio_id,prop_code,tenant_status',
    searchFields: ['tenant_dba'],
    titleField: row => row.tenant_dba,
    titleHref: row => row.podio_id ? `/tenants/${row.podio_id}` : `/tenants/X${row.id.slice(-6)}`,
    subtitleField: row => row.prop_code || '',
    badgeField: row => row.prop_code || null,
    icon: Storefront,
    allowCreate: false,
  },
};
