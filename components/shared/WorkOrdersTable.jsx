// components/shared/WorkOrdersTable.jsx
// Single source of truth for the Work Orders table — used in left nav AND property/tenant/vendor/owner detail.
// WorkOrdersList self-fetches based on statusFilter + filterPropCode, so this wrapper needs no data management.
//
// Props:
//   filterPropCode     (string, optional) — server-side filter to this property
//   hidePropertyFilter (boolean)          — hides property strip buttons
//   hideSearch         (boolean, optional)— hides search bar
//   onSelect           (fn, optional)     — override row click handler

import React from 'react';
import { WorkOrdersList } from '../WorkOrdersView';

export function WorkOrdersTable({
  filterPropCode,
  hidePropertyFilter = false,
  hideSearch = false,
  onSelect,
}) {
  const defaultSelect = wo => {
    window.location.href = `/work-orders/${wo.podio_id ?? 'X'+wo.id.slice(-6)}`;
  };

  return (
    <WorkOrdersList
      filterPropCode={filterPropCode}
      onSelect={onSelect ?? defaultSelect}
      hidePropertyFilter={hidePropertyFilter}
      hideSearch={hideSearch}
    />
  );
}

export default WorkOrdersTable;
