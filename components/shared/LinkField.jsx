// ─────────────────────────────────────────────────────────────────────────────
// LinkField.jsx — generic many-to-many relationship field
// Canonical implementation; pilot: Task <-> Contacts via task_contacts
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { T } from '../../lib/theme';

const SUPABASE_URL      = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const F = { xs: '12px', sm: '13px', base: '14px' };

const lfFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const lfPost = async (table, body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const lfDelete = async (table, params) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const resolve = (fn, row) => (typeof fn === 'function' ? fn(row) : (row?.[fn] ?? ''));

// ─────────────────────────────────────────────────────────────────────────────
export default function LinkField({
  joinTable,
  parentIdField,
  parentId,
  linkedTable,
  linkedIdField,
  linkedFields = '*',
  searchFields = [],
  titleField,
  titleHref,
  summaryField,
  metaField,
  readOnly = false,
  allowCreate = false,
  createFields = [],
  onCreate,
  sectionLabel,
}) {
  const [linked,       setLinked]       = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [createForm,   setCreateForm]   = useState({});
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');
  const [isMobile,     setIsMobile]     = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const panelRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Load linked records ────────────────────────────────────────────────────
  const loadLinked = useCallback(async () => {
    if (!parentId) { setLinked([]); return; }
    setLoadingLinks(true);
    try {
      const joinRows = await lfFetch(
        joinTable,
        `${parentIdField}=eq.${parentId}&select=id,${linkedIdField},created_at&order=created_at.asc`
      );
      if (!joinRows.length) { setLinked([]); setLoadingLinks(false); return; }
      const ids = joinRows.map(r => r[linkedIdField]).join(',');
      const linkedRows = await lfFetch(linkedTable, `id=in.(${ids})&select=${linkedFields}`);
      const byId = Object.fromEntries(linkedRows.map(r => [r.id, r]));
      setLinked(
        joinRows
          .map(jr => ({ _joinId: jr.id, _joinCreatedAt: jr.created_at, ...byId[jr[linkedIdField]] }))
          .filter(r => r.id)
      );
    } catch {
      setLinked([]);
    }
    setLoadingLinks(false);
  }, [parentId, joinTable, parentIdField, linkedIdField, linkedTable, linkedFields]);

  useEffect(() => { loadLinked(); }, [loadLinked]);

  // ── Search ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchOpen || query.trim().length < 1 || searchFields.length === 0) {
      setResults([]);
      return;
    }
    setSearching(true);
    const q    = encodeURIComponent(query.trim());
    const linkedIds = linked.map(r => r.id);
    const filter = searchFields.length === 1
      ? `${searchFields[0]}.ilike.*${q}*`
      : `or=(${searchFields.map(f => `${f}.ilike.*${q}*`).join(',')})`;
    lfFetch(linkedTable, `${filter}&select=${linkedFields}&limit=10`)
      .then(rows => {
        setResults(rows.filter(r => !linkedIds.includes(r.id)));
        setSearching(false);
      })
      .catch(() => setSearching(false));
  }, [query, searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close search on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!searchOpen) return;
    const h = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
        setCreateOpen(false);
        setCreateForm({});
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [searchOpen]);

  // ── Link an existing record ────────────────────────────────────────────────
  const link = async row => {
    setError('');
    try {
      const jr    = await lfPost(joinTable, { [parentIdField]: parentId, [linkedIdField]: row.id });
      const newJr = Array.isArray(jr) ? jr[0] : jr;
      setLinked(prev => [...prev, { _joinId: newJr.id, _joinCreatedAt: newJr.created_at, ...row }]);
      setSearchOpen(false);
      setQuery('');
      setResults([]);
    } catch (e) {
      setError('Failed to link: ' + e.message);
    }
  };

  // ── Unlink ─────────────────────────────────────────────────────────────────
  const unlink = async joinId => {
    setError('');
    try {
      await lfDelete(joinTable, `id=eq.${joinId}`);
      setLinked(prev => prev.filter(r => r._joinId !== joinId));
    } catch (e) {
      setError('Failed to remove: ' + e.message);
    }
  };

  // ── Create & link ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    setError('');
    try {
      const newRow  = await onCreate(createForm);
      const created = Array.isArray(newRow) ? newRow[0] : newRow;
      await link(created);
      setCreateOpen(false);
      setCreateForm({});
    } catch (e) {
      setError('Failed to create: ' + e.message);
    }
    setCreating(false);
  };

  const addLabel = sectionLabel
    ? `+ Add ${sectionLabel}`
    : `+ Add ${linkedTable.replace(/_/g, ' ')}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '10px 16px' }}>

      {/* Loading */}
      {loadingLinks && (
        <div style={{ color: T.text3, fontSize: F.xs, paddingBottom: '4px' }}>Loading…</div>
      )}

      {/* Chips */}
      {!loadingLinks && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          marginBottom: (linked.length || !readOnly) ? '8px' : 0,
        }}>
          {linked.map(row => {
            const title = resolve(titleField, row);
            const href  = titleHref?.(row);
            return (
              <span key={row._joinId} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: T.bg3, border: `0.5px solid ${T.border}`,
                borderRadius: '20px', padding: '3px 6px 3px 10px',
                fontSize: F.sm, color: T.text0,
              }}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      color: 'inherit', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                    }}>
                    {title}
                    <span style={{ fontSize: '11px', color: T.text2, lineHeight: 1 }}>↗</span>
                  </a>
                ) : title}
                {!readOnly && (
                  <button
                    onClick={() => unlink(row._joinId)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: T.text2, fontSize: '12px', lineHeight: 1,
                      padding: '2px 3px', borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      minWidth: '20px', minHeight: '20px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = T.danger}
                    onMouseLeave={e => e.currentTarget.style.color = T.text2}
                    title="Remove link">×</button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div style={{ fontSize: F.xs, color: T.danger, marginBottom: '6px' }}>{error}</div>
      )}

      {/* Add trigger + search panel */}
      {!readOnly && (
        <div ref={panelRef} style={{ position: 'relative', display: 'inline-block', width: isMobile ? '100%' : 'auto' }}>
          {!searchOpen ? (
            <button
              onClick={() => { setSearchOpen(true); setQuery(''); setError(''); }}
              style={{
                background: 'transparent', border: `1px dashed ${T.border}`,
                borderRadius: '20px', padding: '3px 12px', fontSize: F.sm,
                color: T.text2, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: '32px',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              {addLabel}
            </button>
          ) : (
            <div style={{
              width: isMobile ? '100%' : '300px', background: T.bg3,
              border: `1px solid ${T.border}`, borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)', overflow: 'hidden', zIndex: 10, position: 'relative',
            }}>
              <input
                autoFocus
                value={query}
                onChange={e => { setQuery(e.target.value); setCreateOpen(false); }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false); setQuery(''); setResults([]);
                    setCreateOpen(false); setCreateForm({});
                  }
                }}
                placeholder={`Search…`}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                  background: 'transparent', border: 'none',
                  borderBottom: `0.5px solid ${T.border}`,
                  color: T.text0, fontSize: F.sm, outline: 'none', minHeight: '44px',
                }}
              />

              {/* Searching indicator */}
              {searching && (
                <div style={{ padding: '8px 10px', color: T.text3, fontSize: F.xs }}>Searching…</div>
              )}

              {/* Results */}
              {!searching && results.map(row => {
                const title   = resolve(titleField, row);
                const summary = summaryField ? resolve(summaryField, row) : '';
                const meta    = metaField ? resolve(metaField, row) : '';
                const href    = titleHref?.(row);
                return (
                  <div
                    key={row.id}
                    onClick={() => link(row)}
                    style={{
                      padding: '8px 10px', cursor: 'pointer',
                      borderBottom: `0.5px solid ${T.border}`,
                      minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {href ? (
                        <a
                          href={href} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ color: T.accent, fontSize: F.sm, fontWeight: '500', textDecoration: 'none' }}>
                          {title}
                        </a>
                      ) : (
                        <span style={{ color: T.accent, fontSize: F.sm, fontWeight: '500' }}>{title}</span>
                      )}
                    </div>
                    {summary && (
                      <div style={{ fontSize: F.xs, color: T.text2, marginTop: '1px' }}>{summary}</div>
                    )}
                    {meta && (
                      <div style={{ fontSize: '11px', color: T.text3, marginTop: '1px' }}>{meta}</div>
                    )}
                  </div>
                );
              })}

              {/* No results */}
              {!searching && query.trim().length > 0 && results.length === 0 && !allowCreate && (
                <div style={{ padding: '8px 10px', color: T.text3, fontSize: F.xs }}>No results found</div>
              )}

              {/* Create new row */}
              {!searching && query.trim().length > 0 && results.length === 0 && allowCreate && !createOpen && (
                <div
                  onClick={() => {
                    const prefill = {};
                    if (createFields.length > 0) prefill[createFields[0]] = query;
                    setCreateOpen(true);
                    setCreateForm(prefill);
                  }}
                  style={{
                    padding: '8px 10px', cursor: 'pointer', color: T.accent,
                    fontSize: F.sm, minHeight: '44px', display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  + Create new &ldquo;{query}&rdquo;
                </div>
              )}

              {/* Inline create form */}
              {createOpen && (
                <div style={{ padding: '10px', borderTop: `0.5px solid ${T.border}` }}>
                  {createFields.map(f => (
                    <input
                      key={f}
                      placeholder={f.replace(/_/g, ' ')}
                      value={createForm[f] || ''}
                      onChange={e => setCreateForm(prev => ({ ...prev, [f]: e.target.value }))}
                      style={{
                        display: 'block', width: '100%', boxSizing: 'border-box',
                        padding: '6px 8px', marginBottom: '6px',
                        background: T.bg2, border: `0.5px solid ${T.border}`,
                        borderRadius: '4px', color: T.text0, fontSize: F.sm,
                        outline: 'none', minHeight: '36px',
                      }}
                    />
                  ))}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      style={{
                        background: T.accent, border: 'none', borderRadius: '4px',
                        padding: '5px 12px', color: '#fff', fontSize: F.sm,
                        cursor: creating ? 'wait' : 'pointer', minHeight: '32px',
                      }}>
                      {creating ? 'Creating…' : 'Create & Link'}
                    </button>
                    <button
                      onClick={() => { setCreateOpen(false); setCreateForm({}); }}
                      style={{
                        background: 'transparent', border: `0.5px solid ${T.border}`,
                        borderRadius: '4px', padding: '5px 8px',
                        color: T.text1, fontSize: F.sm, cursor: 'pointer', minHeight: '32px',
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Read-only empty state */}
      {readOnly && !loadingLinks && linked.length === 0 && (
        <div style={{ fontSize: F.xs, color: T.text3, fontStyle: 'italic' }}>None</div>
      )}
    </div>
  );
}
