// components/shared/ContactsTable.jsx
// Single source of truth for the Contacts table — used in left nav AND property/tenant/vendor/owner detail.
// Source lives in ContactsView.jsx. This file is the standard import point.
//
// Props:
//   filterPropCode     (string, optional) — filter to contacts for this property
//   filterTenantId     (string, optional) — filter to contacts for this tenant
//   filterVendorId     (string, optional) — filter to contacts for this vendor
//   filterOwnerId      (string, optional) — filter to contacts for this owner
//   hidePropertyFilter (boolean)          — hides property strip buttons
//   onSelect           (fn, optional)     — override row click; defaults to open detail in new tab

import React, { useState, useEffect, useCallback } from 'react';
import { ContactsList, sbFetch } from '../ContactsView';

export function ContactsTable({
  filterPropCode,
  filterTenantId,
  filterVendorId,
  filterOwnerId,
  hidePropertyFilter = false,
  onSelect,
}) {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    let params;
    if      (filterPropCode)  params = `select=*&prop_code=eq.${encodeURIComponent(filterPropCode)}&order=full_name.asc&limit=10000`;
    else if (filterTenantId)  params = `select=*&tenant_id=eq.${filterTenantId}&order=full_name.asc&limit=10000`;
    else if (filterVendorId)  params = `select=*&vendor_id=eq.${filterVendorId}&order=full_name.asc&limit=10000`;
    else if (filterOwnerId)   params = `select=*&owner_id=eq.${filterOwnerId}&order=full_name.asc&limit=10000`;
    else                      params = 'select=*&order=full_name.asc&limit=10000';
    sbFetch('contacts', params)
      .then(data => { setContacts(data); setLoading(false); })
      .catch(e => {
        // 400 = unknown column (FK not yet in schema) — show empty rather than error
        if (e.message.startsWith('400')) { setContacts([]); setLoading(false); }
        else { setError(e.message); setLoading(false); }
      });
  }, [filterPropCode, filterTenantId, filterVendorId, filterOwnerId]);

  const defaultSelect = useCallback(contact => {
    window.open(`/contacts/${contact.podio_id ?? 'X'+contact.id.slice(-6)}`, '_blank');
  }, []);

  return (
    <ContactsList
      contacts={contacts}
      loading={loading}
      error={error}
      onSelect={onSelect ?? defaultSelect}
      hidePropertyFilter={hidePropertyFilter}
    />
  );
}

export default ContactsTable;
