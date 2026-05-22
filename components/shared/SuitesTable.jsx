// components/shared/SuitesTable.jsx
// Single source of truth for the Suites table — used in left nav AND property detail.
// Source lives in SuitesView.jsx. This file is the standard import point.
//
// Props:
//   filterPropCode     (string, optional) — self-fetch suites for this property only
//   hidePropertyFilter (boolean)          — hides property strip buttons
//   onSelect           (fn, optional)     — override row click handler

import React, { useState, useEffect, useCallback } from 'react';
import { SuitesList, sbFetch } from '../SuitesView';

export function SuitesTable({
  filterPropCode,
  hidePropertyFilter = false,
  onSelect,
}) {
  const [suites,  setSuites]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    const params = filterPropCode
      ? `select=*&prop_code=eq.${encodeURIComponent(filterPropCode)}&order=suite_num.asc`
      : 'select=*&order=prop_code.asc,suite_num.asc';
    sbFetch('suites', params)
      .then(data => { setSuites(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [filterPropCode]);

  const defaultSelect = useCallback(suite => {
    window.open(`/suites/${suite.podio_id ?? 'X'+suite.id.slice(-6)}`, '_blank');
  }, []);

  return (
    <SuitesList
      suites={suites}
      loading={loading}
      error={error}
      onSelect={onSelect ?? defaultSelect}
      hidePropertyFilter={hidePropertyFilter}
    />
  );
}

export default SuitesTable;
