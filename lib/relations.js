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
import { Buildings } from '@phosphor-icons/react';

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
};
