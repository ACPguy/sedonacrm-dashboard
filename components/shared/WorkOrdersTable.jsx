// components/shared/WorkOrdersTable.jsx
// Single source of truth for the Work Orders table — used in left nav AND property/tenant/vendor/owner detail.
// Source lives in WorkOrdersView.jsx. This file is the standard import point.
//
// Props:
//   filterPropCode     (string, optional) — self-fetch WOs for this property only
//   hidePropertyFilter (boolean)          — hides property strip buttons
//   hideSearch         (boolean, optional)— hides search bar
//   onSelect           (fn, optional)     — override row click handler

import React, { useState, useEffect } from 'react';
import { WorkOrdersList, sbFetch, sbFetchAll } from '../WorkOrdersView';

export function WorkOrdersTable({
  filterPropCode,
  hidePropertyFilter = false,
  hideSearch = false,
  onSelect,
}) {
  const [wos,     setWos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    if (filterPropCode) {
      // Prop-filtered: always <1000 rows, single fetch is fine
      const params = `select=*&prop_code=eq.${encodeURIComponent(filterPropCode)}&order=created_at.desc`;
      console.log(`[WorkOrdersTable] prop-filtered query: work_orders?${params}`);
      sbFetch('work_orders', params)
        .then(data => {
          console.log(`[WorkOrdersTable] prop=${filterPropCode} returned ${data.length} rows`);
          setWos(data); setLoading(false);
        })
        .catch(e => { setError(e.message); setLoading(false); });
    } else {
      // Full table: paginate to bypass the Supabase anon max_rows=1000 cap
      console.log('[WorkOrdersTable] unfiltered — using sbFetchAll (paginated)');
      sbFetchAll('work_orders', 'select=*&order=created_at.desc')
        .then(data => { setWos(data); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    }
  }, [filterPropCode]);

  const defaultSelect = wo => {
    window.location.href = `/work-orders/${wo.podio_id ?? 'X'+wo.id.slice(-6)}`;
  };

  return (
    <WorkOrdersList
      wos={wos} setWos={setWos}
      loading={loading} error={error}
      onSelect={onSelect ?? defaultSelect}
      hidePropertyFilter={hidePropertyFilter}
      hideSearch={hideSearch}
    />
  );
}

export default WorkOrdersTable;
