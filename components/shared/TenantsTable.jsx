// components/shared/TenantsTable.jsx
// Single source of truth for the Tenants rent-roll table — used in left nav AND property detail.
// Source list component lives in TenantsView.jsx (TenantRentList).
//
// Props:
//   filterPropCode     (string, optional)  — show only rows for this property
//   hidePropertyFilter (boolean)           — hides property strip + Prop column
//   grossSqft          (number, optional)  — property gross sqft for occupancy calc
//                                            (pass from PropertyDetail; omit for portfolio totals)

import React, { useState, useEffect } from 'react';
import { TenantRentList, sbFetch } from '../TenantsView';

export function TenantsTable({
  filterPropCode,
  hidePropertyFilter = false,
  grossSqft,
}) {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setLoading(true); setError(null);

    const rentParams = filterPropCode
      ? `prop_code=eq.${encodeURIComponent(filterPropCode)}&rent_status=eq.Current&rent_starts=lte.${today}&rent_ends=gte.${today}&select=*,tenants!rent_schedule_tenant_id_fkey(id,podio_id,tenant_status)&order=suite_num.asc`
      : `rent_status=eq.Current&rent_starts=lte.${today}&rent_ends=gte.${today}&select=*,tenants!rent_schedule_tenant_id_fkey(id,podio_id,tenant_status)&order=suite_num.asc`;

    const fetches = [sbFetch('rent_schedule', rentParams)];
    if (!filterPropCode) {
      fetches.push(sbFetch('properties', 'select=prop_code,property_name,gross_sqft&status=eq.active&order=prop_code.asc'));
    }

    Promise.all(fetches)
      .then(([rentRows, props]) => {
        setRows(rentRows);
        setProperties(props || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [filterPropCode]);

  return (
    <TenantRentList
      rows={rows}
      loading={loading}
      error={error}
      properties={properties}
      hidePropertyFilter={hidePropertyFilter}
      grossSqft={grossSqft}
    />
  );
}

export default TenantsTable;
