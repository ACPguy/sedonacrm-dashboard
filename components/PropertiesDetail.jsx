// ─────────────────────────────────────────────────────────────────────────────
// PropertiesDetail.jsx  —  SedonaCRM Phase 2  —  Property Hub (7 tabs)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const SUPABASE_URL      = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export const sbPatch = async (table, id, updates) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
export const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };
export const css = {
  card:     { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  secTitle: { fontSize:F.xs, fontWeight:'600', color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  badge:    (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th:       { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td:       { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};
const fmtCurrency = n => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtNum      = n => n == null ? '—' : Number(n).toLocaleString();
const fmtSqft     = n => n == null ? '—' : Number(n).toLocaleString() + ' sf';

const daysUntil = d => {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((date - today) / (1000 * 60 * 60 * 24));
};

const expiryStyle = d => {
  const days = daysUntil(d);
  if (days === null) return { color: T.text3 };
  if (days < 0)    return { color:'#fff', fontWeight:'700', background:'#7a0000', padding:'1px 5px', borderRadius:'3px', display:'inline-block' };
  if (days <= 30)  return { color: T.danger,  fontWeight:'700' };
  if (days <= 60)  return { color:'#d4924a',   fontWeight:'700' };
  if (days <= 90)  return { color:'#f0d060',   fontWeight:'700' };
  if (days <= 120) return { color: T.success,  fontWeight:'700' };
  return { color: T.text1 };
};

const fmtPmFee = agr => {
  if (!agr) return '—';
  if (agr.pm_fee_pct) {
    const pct = (Number(agr.pm_fee_pct) * 100).toFixed(1) + '%';
    return agr.pm_fee_no_less_than
      ? `${pct} (min. ${fmtCurrency(agr.pm_fee_no_less_than)}/mo)`
      : pct;
  }
  if (agr.pm_fee_fixed_amt) return fmtCurrency(agr.pm_fee_fixed_amt) + '/mo';
  if (agr.pm_fee_current_eft_amt) return fmtCurrency(agr.pm_fee_current_eft_amt) + '/mo (current)';
  return agr.pm_fee_type || '—';
};

// ── Badges ────────────────────────────────────────────────────────────────────
const PropertyStatusBadge = ({ status }) => {
  const map = { 'active':[T.success,'#1e2a1e'], 'archived':[T.text2,T.bg3], 'acp-entity':[T.purple,'#2a1f3a'] };
  const [color, bg] = map[(status||'').toLowerCase()] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

const SuiteStatusBadge = ({ status }) => {
  const map = {
    'Occupied':             [T.success, '#1e2a1e'],
    'Occupied / For Lease': [T.warn,    'rgba(212,146,74,0.15)'],
    'Vacant / For Lease':   [T.accent,  '#1a2e3a'],
    'Archived':             [T.text2,   T.bg3],
  };
  const [color, bg] = map[status] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const map = { 'High':[T.danger,'rgba(224,112,112,0.15)'], 'Medium':[T.warn,'rgba(212,146,74,0.15)'], 'Low':[T.text2,T.bg3] };
  const [color, bg] = map[priority] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{priority}</span>;
};

// ── EditableField ─────────────────────────────────────────────────────────────
export const EditableField = ({ label, value, onSave, type = 'text', options = [] }) => {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(value != null ? String(value) : '');
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value != null ? String(value) : ''); }, [value]);

  const save = async () => {
    setSaving(true);
    try { await onSave(val || null); setEditing(false); }
    catch { alert('Save failed'); }
    finally { setSaving(false); }
  };
  const cancel = () => { setVal(value != null ? String(value) : ''); setEditing(false); };
  const inputStyle = { flex:1, background:T.bg3, border:`1px solid ${T.accent}`, borderRadius:'4px', padding:'5px 8px', color:T.text0, fontSize:F.base, outline:'none' };

  return (
    <div style={{marginBottom:'10px'}}>
      {label && <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>{label}</div>}
      {editing ? (
        <div style={{display:'flex', alignItems:'flex-start', gap:'6px'}}>
          {type === 'textarea' ? (
            <textarea ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
              style={{...inputStyle, resize:'vertical', minHeight:'80px'}}/>
          ) : type === 'select' ? (
            <select ref={inputRef} value={val} onChange={e => setVal(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input ref={inputRef} type={type} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              style={inputStyle}/>
          )}
          <button onClick={save} disabled={saving}
            style={{background:T.accent, border:'none', borderRadius:'4px', padding:'5px 10px', color:'#fff', fontSize:F.sm, cursor:'pointer', whiteSpace:'nowrap'}}>
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={cancel}
            style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'5px 8px', color:T.text1, fontSize:F.sm, cursor:'pointer'}}>✕</button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} title="Click to edit"
          style={{fontSize:F.base, color:val ? T.text0 : T.text3, cursor:'text', padding:'3px 5px', borderRadius:'4px', minHeight:'24px', border:'1px solid transparent', lineHeight:'1.4'}}
          onMouseEnter={e => e.currentTarget.style.border = `1px solid ${T.border}`}
          onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
          {val || <span style={{color:T.text3, fontStyle:'italic', fontSize:F.sm}}>click to edit</span>}
        </div>
      )}
    </div>
  );
};

// ── ReadonlyField ─────────────────────────────────────────────────────────────
const ReadonlyField = ({ label, children, value, accent = false }) => (
  <div style={{marginBottom:'10px'}}>
    {label && <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>{label}</div>}
    <div style={{fontSize:F.base, color:accent ? T.accent : T.text0, fontWeight:accent ? '600' : '400', padding:'3px 5px', lineHeight:'1.4'}}>
      {children || value || <span style={{color:T.text3}}>—</span>}
    </div>
  </div>
);

// ── Sortable helper ───────────────────────────────────────────────────────────
const useSortable = (rows, defaultCol = 'prop_code', defaultDir = 'asc') => {
  const [sortCol, setSortCol] = useState(defaultCol);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const av = a[sortCol] ?? ''; const bv = b[sortCol] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [rows, sortCol, sortDir]);
  const Th = ({ c, label, align = 'left', cursor = 'pointer' }) => (
    <th style={{...css.th, textAlign:align, cursor}} onClick={() => toggleSort(c)}>
      {label}
      {sortCol === c ? <span style={{marginLeft:'3px'}}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                     : <span style={{marginLeft:'3px', color:T.bg3}}>↕</span>}
    </th>
  );
  return { sorted, Th };
};

// ─────────────────────────────────────────────────────────────────────────────
// Properties List
// ─────────────────────────────────────────────────────────────────────────────
const PropertiesList = ({ properties, agreementMap, loading, error, onSelect }) => {
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Properties | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, []);

  const withExpiry = useMemo(() =>
    properties.map(p => ({ ...p, _expires: agreementMap[p.prop_code] || null })),
    [properties, agreementMap]
  );
  const { sorted, Th } = useSortable(withExpiry, 'prop_code', 'asc');

  const filtered = useMemo(() => sorted.filter(p => {
    if (filter !== 'all' && (p.status || '') !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.prop_code||'').toLowerCase().includes(q) ||
             (p.property_name||'').toLowerCase().includes(q) ||
             (p.city||'').toLowerCase().includes(q);
    }
    return true;
  }), [sorted, filter, search]);

  const counts = useMemo(() => {
    const c = { all: properties.length };
    ['active','archived','acp-entity'].forEach(s => { c[s] = properties.filter(p => (p.status||'') === s).length; });
    return c;
  }, [properties]);

  const FILTERS = [
    { key:'active',     label:'Active' },
    { key:'archived',   label:'Archived' },
    { key:'acp-entity', label:'ACP Entity' },
    { key:'all',        label:'All' },
  ];

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      <div style={{padding:'7px 14px 6px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px'}}>
          <span style={{fontSize:F.lg, fontWeight:'600', color:T.text0}}>Properties</span>
          <span style={{fontSize:F.xs, color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
          <div style={{display:'flex', gap:'1px', background:T.bg2, borderRadius:'5px', padding:'2px', border:`0.5px solid ${T.border}`, flexShrink:0}}>
            {FILTERS.map(({ key, label }) => {
              const cnt = counts[key] ?? 0;
              const active = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  style={{padding:'3px 7px', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:F.xs,
                    background:active ? T.bg3 : 'transparent',
                    color:active ? T.text0 : T.text2,
                    fontWeight:active ? '600' : '400',
                    display:'flex', alignItems:'center', gap:'2px', whiteSpace:'nowrap'}}>
                  {label}
                  <span style={{color:active ? T.text1 : T.text3, fontSize:'10px'}}>·{cnt}</span>
                </button>
              );
            })}
          </div>
          <div style={{marginLeft:'auto', position:'relative', display:'flex', alignItems:'center'}}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{position:'absolute', left:'7px', background:'transparent', border:'none', cursor:'pointer', color:T.text2, fontSize:'14px', lineHeight:1, padding:0, zIndex:1}}>×</button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{width:'220px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'5px',
                padding:`4px 10px 4px ${search ? '26px' : '10px'}`, color:T.text0, fontSize:F.xs, outline:'none'}}/>
          </div>
        </div>
      </div>

      {loading && <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading properties…</div>}
      {error   && <div style={{padding:'32px', textAlign:'center', color:T.danger, fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1, overflowY:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'6%'}}/>
              <col style={{width:'auto'}}/>
              <col style={{width:'14%'}}/>
              <col style={{width:'9%'}}/>
              <col style={{width:'11%'}}/>
              <col style={{width:'10%'}}/>
              <col style={{width:'8%'}}/>
            </colgroup>
            <thead style={{position:'sticky', top:0, zIndex:2}}>
              <tr>
                <Th c="prop_code"     label="Prop"/>
                <Th c="property_name" label="Property Name"/>
                <Th c="address"       label="Address"/>
                <Th c="city"          label="City"/>
                <Th c="status"        label="Status"/>
                <Th c="_expires"      label="Expires"/>
                <Th c="gross_sqft"    label="Sq Ft" align="right"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{...css.td, textAlign:'center', padding:'32px', color:T.text3}}>No properties match</td></tr>
              )}
              {filtered.map((p, i) => {
                const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
                const expStyle = expiryStyle(p._expires);
                return (
                  <tr key={p.id}
                    onClick={e => {
                      if (e.target.closest('a')) return;
                      if (e.ctrlKey || e.metaKey) { window.open(`/properties/${p.podio_id ?? 'X'+p.id.slice(-6)}`, '_blank'); }
                      else {
                        try { sessionStorage.setItem('propertiesBackUrl', window.location.href); } catch {}
                        onSelect(p);
                      }
                    }}
                    style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:rowBg}}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                    <td style={{...css.td, color:T.accent, fontWeight:'600'}}>
                      <a href={`/properties/${p.podio_id ?? 'X'+p.id.slice(-6)}`}
                        onClick={e => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                            e.preventDefault();
                            try { sessionStorage.setItem('propertiesBackUrl', window.location.href); } catch {}
                            onSelect(p);
                          }
                        }}
                        style={{color:'inherit', textDecoration:'none'}}>
                        {p.prop_code}
                      </a>
                    </td>
                    <td style={css.td}>{p.property_name || '—'}</td>
                    <td style={{...css.td, color:T.text2, fontSize:F.xs}}>{p.address || '—'}</td>
                    <td style={{...css.td, color:T.text2}}>{p.city || '—'}</td>
                    <td style={css.td}><PropertyStatusBadge status={p.status}/></td>
                    <td style={css.td}>
                      {p._expires
                        ? <span style={expStyle}>{fmtDate(p._expires)}</span>
                        : <span style={{color:T.text3}}>—</span>}
                    </td>
                    <td style={{...css.td, textAlign:'right', color:T.text2}}>{fmtNum(p.gross_sqft)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Property Detail — 7 tabs
// ─────────────────────────────────────────────────────────────────────────────
export const PropertyDetail = ({ property, onBack, onUpdate }) => {
  const [tab,        setTab]        = useState('overview');
  const [data,       setData]       = useState(property);
  const loaded = useRef(new Set());

  // Overview + Info shared data
  const [agreement,    setAgreement]    = useState(null);   // null = loading, false = none found
  const [owner,        setOwner]        = useState(null);
  const [ownerContact, setOwnerContact] = useState(null);

  // Overview cards
  const [openWOs,          setOpenWOs]          = useState(null);
  const [openIssues,       setOpenIssues]       = useState(null);
  const [insuranceSummary, setInsuranceSummary] = useState(null);

  // Tab-specific data
  const [suites,         setSuites]         = useState(null);
  const [suiteTenantMap, setSuiteTenantMap] = useState({});
  const [tenants,        setTenants]        = useState(null);
  const [allWOs,         setAllWOs]         = useState(null);
  const [allIssues,      setAllIssues]      = useState(null);
  const [allInsurance,   setAllInsurance]   = useState(null);

  // Filter/sort state — must be at component level (no hooks in callbacks)
  const [woFilter,    setWoFilter]    = useState('open');
  const [woSortCol,   setWoSortCol]   = useState('follow_up_date');
  const [woSortDir,   setWoSortDir]   = useState('asc');
  const [issueFilter, setIssueFilter] = useState('open');
  const [tntFilter,   setTntFilter]   = useState('Active');

  const pc = data.prop_code;

  // Agreement + owner: load on 'overview' or 'info' (whichever comes first)
  useEffect(() => {
    if (tab !== 'overview' && tab !== 'info') return;
    if (loaded.current.has('agr-owner')) return;
    loaded.current.add('agr-owner');

    sbFetch('property_agreements', `select=*&prop_code=eq.${encodeURIComponent(pc)}&order=listing_expiry_date.desc`)
      .then(r => setAgreement(r[0] || false)).catch(() => setAgreement(false));

    sbFetch('property_owners', `select=*&prop_code=eq.${encodeURIComponent(pc)}`)
      .then(r => {
        const o = r[0] || false;
        setOwner(o);
        if (o?.primary_contact_id) {
          sbFetch('contacts', `select=*&id=eq.${o.primary_contact_id}`)
            .then(cr => setOwnerContact(cr[0] || null)).catch(() => {});
        }
      }).catch(() => setOwner(false));
  }, [tab, pc]);

  // Overview cards: open WOs, open issues, insurance summary
  useEffect(() => {
    if (tab !== 'overview' || loaded.current.has('overview-cards')) return;
    loaded.current.add('overview-cards');

    sbFetch('work_orders',
      `select=id,wo_num,podio_id,short_description,priority,stage,wo_status,follow_up_date` +
      `&prop_code=eq.${encodeURIComponent(pc)}&wo_status=neq.Closed&order=follow_up_date.asc&limit=25`)
      .then(r => setOpenWOs(r)).catch(() => setOpenWOs([]));

    sbFetch('issues',
      `select=id,issue_name,podio_id,priority,follow_up_date` +
      `&prop_code=eq.${encodeURIComponent(pc)}&status=eq.Open&order=follow_up_date.asc&limit=25`)
      .then(r => setOpenIssues(r)).catch(() => setOpenIssues([]));

    sbFetch('property_insurance',
      `select=id,insurance_co,expiry_date,annual_premium,status` +
      `&prop_code=eq.${encodeURIComponent(pc)}&order=expiry_date.asc`)
      .then(r => setInsuranceSummary(r)).catch(() => setInsuranceSummary([]));
  }, [tab, pc]);

  // Suites
  useEffect(() => {
    if (tab !== 'suites' || loaded.current.has('suites')) return;
    loaded.current.add('suites');
    sbFetch('suites', `select=*&prop_code=eq.${encodeURIComponent(pc)}&order=suite_num.asc`)
      .then(r => {
        setSuites(r);
        const ids = [...new Set(r.filter(s => s.current_tenant_id).map(s => s.current_tenant_id))];
        if (ids.length > 0) {
          sbFetch('tenants', `select=id,tenant_dba&id=in.(${ids.join(',')})`)
            .then(tr => {
              const map = {};
              tr.forEach(t => { map[t.id] = t.tenant_dba; });
              setSuiteTenantMap(map);
            }).catch(() => {});
        }
      }).catch(() => setSuites([]));
  }, [tab, pc]);

  // Tenants
  useEffect(() => {
    if (tab !== 'tenants' || loaded.current.has('tenants')) return;
    loaded.current.add('tenants');
    sbFetch('tenants', `select=id,tenant_dba,tenant_status,suite_num,lease_type,lease_ends,podio_id&prop_code=eq.${encodeURIComponent(pc)}&order=tenant_dba.asc`)
      .then(r => setTenants(r)).catch(() => setTenants([]));
  }, [tab, pc]);

  // All Work Orders
  useEffect(() => {
    if (tab !== 'work-orders' || loaded.current.has('work-orders')) return;
    loaded.current.add('work-orders');
    sbFetch('work_orders',
      `select=id,wo_num,podio_id,short_description,priority,stage,wo_status,follow_up_date,close_date,updated_at` +
      `&prop_code=eq.${encodeURIComponent(pc)}&order=follow_up_date.asc`)
      .then(r => setAllWOs(r)).catch(() => setAllWOs([]));
  }, [tab, pc]);

  // All Issues
  useEffect(() => {
    if (tab !== 'issues' || loaded.current.has('issues')) return;
    loaded.current.add('issues');
    sbFetch('issues',
      `select=id,issue_name,podio_id,priority,category,status,follow_up_date,close_date,updated_at` +
      `&prop_code=eq.${encodeURIComponent(pc)}&order=follow_up_date.asc`)
      .then(r => setAllIssues(r)).catch(() => setAllIssues([]));
  }, [tab, pc]);

  // All Insurance
  useEffect(() => {
    if (tab !== 'insurance' || loaded.current.has('insurance')) return;
    loaded.current.add('insurance');
    sbFetch('property_insurance',
      `select=*&prop_code=eq.${encodeURIComponent(pc)}&order=expiry_date.asc`)
      .then(r => setAllInsurance(r)).catch(() => setAllInsurance([]));
  }, [tab, pc]);

  // Browser tab title
  useEffect(() => {
    document.title = `${data.prop_code} · ${data.property_name || 'Property'} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.prop_code, data.property_name]);

  // Escape key
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const save = async (field, val) => {
    await sbPatch('properties', data.id, { [field]: val });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const gdriveUrl = data.gdrive_root_folder_id
    ? `https://drive.google.com/drive/folders/${data.gdrive_root_folder_id}`
    : null;

  const TABS = [
    { key:'overview',    label:'Overview' },
    { key:'info',        label:'Info' },
    { key:'suites',      label:'Suites' },
    { key:'tenants',     label:'Tenants' },
    { key:'work-orders', label: allWOs ? `Work Orders (${allWOs.length})` : 'Work Orders' },
    { key:'issues',      label: allIssues ? `Issues (${allIssues.length})` : 'Issues' },
    { key:'insurance',   label:'Insurance' },
  ];

  const hdrBtnStyle = active => ({
    padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, cursor:active ? 'pointer' : 'default',
    border:`0.5px solid ${T.border}`, background:'transparent',
    color:active ? T.text1 : T.text3,
    textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'4px',
    opacity:active ? 1 : 0.4,
  });

  // WO sort toggle
  const toggleWoSort = c => {
    if (c === woSortCol) setWoSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setWoSortCol(c); setWoSortDir('asc'); }
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>

      {/* ── Header ── */}
      <div style={{padding:'10px 16px 0', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>

        {/* Row 1: back + action buttons */}
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px'}}>
          <button onClick={onBack}
            style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'4px 10px', color:T.text1, fontSize:F.sm, cursor:'pointer', flexShrink:0}}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text1}>
            ← Properties
          </button>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px'}}>
            {gdriveUrl ? (
              <a href={gdriveUrl} target="_blank" rel="noreferrer"
                style={{...hdrBtnStyle(true), color:T.accent, borderColor:T.accent}}>Drive ↗</a>
            ) : (
              <span style={hdrBtnStyle(false)}>Drive</span>
            )}
            <span title="HelloSign — Phase 3" style={{...hdrBtnStyle(false), cursor:'not-allowed'}}>eSign</span>
          </div>
        </div>

        {/* Row 2: name + address */}
        <div style={{marginBottom:'5px'}}>
          <div style={{fontSize:F.lg, fontWeight:'600', color:T.text0, lineHeight:'1.3'}}>
            {data.property_name || data.prop_code}
          </div>
          {data.address && (
            <div style={{fontSize:F.sm, color:T.text2, marginTop:'1px'}}>
              {[data.address, data.city, data.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Row 3: chip row */}
        <div style={{display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap', marginBottom:'5px'}}>
          <span style={css.badge(T.accent, '#1a2e3a')}>{data.prop_code}</span>
          <PropertyStatusBadge status={data.status}/>
          {data.gross_sqft && (
            <span style={css.badge(T.text1, T.bg3)}>{fmtSqft(data.gross_sqft)}</span>
          )}
          {data.year_built && (
            <span style={{fontSize:F.xs, color:T.text2}}>Built {data.year_built}</span>
          )}
          {data.zoning && (
            <span style={css.badge(T.text2, T.bg3)}>{data.zoning}</span>
          )}
          {data.podio_id && (
            <span style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em'}}>Podio</span>
              <span style={css.badge(T.text2, T.bg3)}>{data.podio_id}</span>
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{display:'flex', gap:'2px', marginTop:'4px', overflowX:'auto', scrollbarWidth:'none'}}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{background:'transparent', border:'none', padding:'6px 12px', fontSize:F.sm, cursor:'pointer', borderRadius:'4px 4px 0 0', whiteSpace:'nowrap',
                color: tab === key ? T.accent : T.text1,
                borderBottom: tab === key ? `2px solid ${T.accent}` : '2px solid transparent',
                fontWeight: tab === key ? '600' : '400'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{flex:1, overflowY:'auto', padding:'16px'}}>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {tab === 'overview' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>

            {/* LEFT column */}
            <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>

              {/* Listing Agreement */}
              <div style={css.card}>
                <div style={css.secTitle}>Listing Agreement</div>
                {agreement === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : !agreement ? (
                  <div style={{fontSize:F.sm, color:T.warn}}>⚠ No listing agreement on record</div>
                ) : (
                  <>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', marginBottom:'8px'}}>
                      <div>
                        <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Type</div>
                        <div style={{fontSize:F.sm, color:T.text0}}>{agreement.listing_agreement_type || '—'}</div>
                      </div>
                      <div>
                        <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Status</div>
                        <div style={{fontSize:F.sm, color:T.text1}}>{agreement.acp_listing_status || '—'}</div>
                      </div>
                      <div>
                        <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Start</div>
                        <div style={{fontSize:F.sm, color:T.text1}}>{fmtDate(agreement.listing_start_date)}</div>
                      </div>
                      <div>
                        <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Expires</div>
                        <div style={{fontSize:F.sm}}>
                          <span style={expiryStyle(agreement.listing_expiry_date)}>
                            {fmtDate(agreement.listing_expiry_date)}
                          </span>
                          {(() => {
                            const days = daysUntil(agreement.listing_expiry_date);
                            if (days === null) return null;
                            return (
                              <span style={{fontSize:F.xs, color:T.text3, marginLeft:'6px'}}>
                                ({days < 0 ? `${Math.abs(days)}d over` : `${days}d`})
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div style={{borderTop:`0.5px solid ${T.border}`, paddingTop:'8px'}}>
                      <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>PM Fee</div>
                      <div style={{fontSize:F.sm, color:T.text0}}>{fmtPmFee(agreement)}</div>
                    </div>
                    {owner && (
                      <div style={{borderTop:`0.5px solid ${T.border}`, paddingTop:'8px', marginTop:'8px'}}>
                        <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'4px'}}>Owner</div>
                        <div style={{fontSize:F.sm, color:T.text0, fontWeight:'500'}}>{owner.company_dba || owner.entity_name || '—'}</div>
                        {owner.entity_type && <div style={{fontSize:F.xs, color:T.text2}}>{owner.entity_type}</div>}
                        {(owner.main_phone || ownerContact?.primary_phone) && (
                          <div style={{fontSize:F.xs, color:T.text2, marginTop:'2px'}}>{owner.main_phone || ownerContact?.primary_phone}</div>
                        )}
                        {ownerContact?.email && (
                          <div style={{fontSize:F.xs, color:T.accent, marginTop:'1px'}}>{ownerContact.email}</div>
                        )}
                        {ownerContact?.full_name && ownerContact.full_name !== owner.company_dba && (
                          <div style={{fontSize:F.xs, color:T.text2, marginTop:'2px'}}>Contact: {ownerContact.full_name}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Insurance */}
              <div style={css.card}>
                <div style={css.secTitle}>Insurance</div>
                {insuranceSummary === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : insuranceSummary.length === 0 ? (
                  <div style={{fontSize:F.sm, color:T.warn}}>⚠ No insurance records on file</div>
                ) : (
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <tbody>
                      {insuranceSummary.map(ins => {
                        const days = daysUntil(ins.expiry_date);
                        const expColor = days === null ? T.text1 : days < 0 ? T.danger : days <= 30 ? T.danger : days <= 60 ? T.warn : T.text1;
                        const expBg   = days !== null && days < 0 ? 'rgba(224,112,112,0.1)' : 'transparent';
                        return (
                          <tr key={ins.id} style={{borderBottom:`0.5px solid ${T.border}`}}>
                            <td style={{...css.td, paddingLeft:0, whiteSpace:'normal', wordBreak:'break-word'}}>{ins.insurance_co || '—'}</td>
                            <td style={{...css.td, color:expColor, background:expBg, borderRadius:'3px', textAlign:'right', paddingRight:'4px'}}>
                              {fmtDate(ins.expiry_date)}
                            </td>
                            <td style={{...css.td, textAlign:'right', paddingLeft:'6px'}}>
                              {ins.status && (
                                <span style={css.badge(ins.status === 'Active' ? T.success : T.text2, ins.status === 'Active' ? '#1e2a1e' : T.bg3)}>
                                  {ins.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT column */}
            <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>

              {/* Open Work Orders */}
              <div style={css.card}>
                <div style={{...css.secTitle, display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px'}}>
                  Open Work Orders
                  {openWOs !== null && (
                    <span style={css.badge(openWOs.length ? T.accent : T.text2, openWOs.length ? '#1a2e3a' : T.bg3)}>
                      {openWOs.length}
                    </span>
                  )}
                </div>
                {openWOs === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : openWOs.length === 0 ? (
                  <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic'}}>No open work orders</div>
                ) : (
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <tbody>
                      {openWOs.map(wo => (
                        <tr key={wo.id} style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer'}}
                          onClick={() => window.open(`/work-orders/${wo.podio_id ?? 'X'+wo.id.slice(-6)}`, '_blank')}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{...css.td, color:T.text2, fontSize:F.xs, paddingLeft:0, flexShrink:0, whiteSpace:'nowrap'}}>{wo.wo_num || ''}</td>
                          <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{wo.short_description || '—'}</td>
                          <td style={{...css.td, flexShrink:0}}><PriorityBadge priority={wo.priority}/></td>
                          <td style={{...css.td, color:T.text2, fontSize:F.xs, textAlign:'right', paddingRight:0, whiteSpace:'nowrap'}}>{fmtDate(wo.follow_up_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Open Issues */}
              <div style={css.card}>
                <div style={{...css.secTitle, display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px'}}>
                  Open Issues
                  {openIssues !== null && (
                    <span style={css.badge(openIssues.length ? T.warn : T.text2, openIssues.length ? 'rgba(212,146,74,0.15)' : T.bg3)}>
                      {openIssues.length}
                    </span>
                  )}
                </div>
                {openIssues === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : openIssues.length === 0 ? (
                  <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic'}}>No open issues</div>
                ) : (
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <tbody>
                      {openIssues.map(iss => (
                        <tr key={iss.id} style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer'}}
                          onClick={() => window.open(`/issues/${iss.podio_id ?? 'X'+iss.id.slice(-6)}`, '_blank')}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word', paddingLeft:0}}>{iss.issue_name || '—'}</td>
                          <td style={{...css.td, flexShrink:0}}><PriorityBadge priority={iss.priority}/></td>
                          <td style={{...css.td, color:T.text2, fontSize:F.xs, textAlign:'right', paddingRight:0, whiteSpace:'nowrap'}}>{fmtDate(iss.follow_up_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Quick Links */}
              <div style={css.card}>
                <div style={css.secTitle}>Quick Links</div>
                <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                  {gdriveUrl ? (
                    <a href={gdriveUrl} target="_blank" rel="noreferrer"
                      style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>Drive Folder ↗</a>
                  ) : (
                    <span style={{fontSize:F.sm, color:T.text3}}>Drive Folder — not linked</span>
                  )}
                  <a href={`/suites?prop=${encodeURIComponent(pc)}`}
                    style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>
                    Suites for {pc} ↗
                  </a>
                  <a href={`/tenants?prop=${encodeURIComponent(pc)}`}
                    style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>
                    Tenants for {pc} ↗
                  </a>
                  {owner && owner.podio_id ? (
                    <a href={`/owners/${owner.podio_id}`} target="_blank" rel="noreferrer"
                      style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>
                      Owner: {owner.company_dba || owner.entity_name} ↗
                    </a>
                  ) : owner ? (
                    <span style={{fontSize:F.sm, color:T.text3}}>
                      Owner: {owner.company_dba || owner.entity_name} (no direct link yet)
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ INFO TAB ════════════ */}
        {tab === 'info' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>

            {/* LEFT: Property Details */}
            <div style={css.card}>
              <div style={css.secTitle}>Property Details</div>
              <EditableField label="Property Name" value={data.property_name} onSave={v => save('property_name', v)}/>
              <ReadonlyField label="Prop Code" value={data.prop_code} accent/>
              <EditableField label="Status"    value={data.status}    onSave={v => save('status', v)} type="select" options={['active','archived','acp-entity']}/>
              <EditableField label="Address"   value={data.address}   onSave={v => save('address', v)}/>
              <EditableField label="City"      value={data.city}      onSave={v => save('city', v)}/>
              <EditableField label="State"     value={data.state}     onSave={v => save('state', v)}/>
              <EditableField label="Zip"       value={data.zip}       onSave={v => save('zip', v)}/>
              <EditableField label="Zoning"    value={data.zoning}    onSave={v => save('zoning', v)}/>
              <EditableField label="Sq Footage" value={data.gross_sqft} onSave={v => save('gross_sqft', v != null ? parseInt(v)||null : null)} type="number"/>
              <EditableField label="Year Built" value={data.year_built} onSave={v => save('year_built', v != null ? parseInt(v)||null : null)} type="number"/>
              <EditableField label="Notes"     value={data.other_notes} onSave={v => save('other_notes', v)} type="textarea"/>
            </div>

            {/* RIGHT: Ownership + Agreement */}
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

              {/* Owner */}
              <div style={css.card}>
                <div style={css.secTitle}>Ownership</div>
                {owner === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : !owner ? (
                  <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic'}}>No owner record found</div>
                ) : (
                  <>
                    <ReadonlyField label="Company"     value={owner.company_dba}/>
                    <ReadonlyField label="Entity Name" value={owner.entity_name}/>
                    <ReadonlyField label="Entity Type" value={owner.entity_type}/>
                    <ReadonlyField label="EIN"         value={owner.tax_id_ein}/>
                    {owner.main_phone && <ReadonlyField label="Phone" value={owner.main_phone}/>}
                    {ownerContact && (
                      <>
                        <ReadonlyField label="Contact"       value={ownerContact.full_name}/>
                        {ownerContact.primary_phone && <ReadonlyField label="Contact Phone" value={ownerContact.primary_phone}/>}
                        {ownerContact.email         && <ReadonlyField label="Contact Email" value={ownerContact.email}/>}
                      </>
                    )}
                    {owner.podio_id && (
                      <a href={`/owners/${owner.podio_id}`} target="_blank" rel="noreferrer"
                        style={{fontSize:F.xs, color:T.accent, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px',
                          padding:'3px 5px', borderRadius:'3px', border:`0.5px solid ${T.border}`}}>
                        Open Owner ↗
                      </a>
                    )}
                  </>
                )}
              </div>

              {/* Agreement */}
              <div style={css.card}>
                <div style={css.secTitle}>Listing Agreement</div>
                {agreement === null ? (
                  <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                ) : !agreement ? (
                  <div style={{fontSize:F.sm, color:T.warn}}>⚠ No listing agreement on record</div>
                ) : (
                  <>
                    <ReadonlyField label="Agreement Type" value={agreement.listing_agreement_type}/>
                    <ReadonlyField label="Status"         value={agreement.acp_listing_status}/>
                    <ReadonlyField label="Start Date"     value={fmtDate(agreement.listing_start_date)}/>
                    <div style={{marginBottom:'10px'}}>
                      <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Expiration</div>
                      <div style={{fontSize:F.base, padding:'3px 5px', lineHeight:'1.4'}}>
                        <span style={expiryStyle(agreement.listing_expiry_date)}>
                          {fmtDate(agreement.listing_expiry_date)}
                        </span>
                      </div>
                    </div>
                    <ReadonlyField label="PM Fee" value={fmtPmFee(agreement)}/>
                    {agreement.leasing_fee_pct && (
                      <ReadonlyField label="Leasing Commission" value={`${(Number(agreement.leasing_fee_pct)*100).toFixed(1)}%`}/>
                    )}
                    {(agreement.lease_renewal_fee_pct || agreement.lease_renewal_type) && (
                      <ReadonlyField label="Renewal Fee"
                        value={[
                          agreement.lease_renewal_fee_pct ? `${(Number(agreement.lease_renewal_fee_pct)*100).toFixed(1)}%` : null,
                          agreement.lease_renewal_type,
                        ].filter(Boolean).join(' — ')}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ SUITES TAB ════════════ */}
        {tab === 'suites' && (
          suites === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading suites…</div>
          ) : suites.length === 0 ? (
            <div style={{...css.card, textAlign:'center', color:T.text3, fontSize:F.sm, padding:'32px'}}>
              No suites found for {pc}.
            </div>
          ) : (() => {
            const totalSqft = suites.reduce((s, r) => s + (Number(r.sqft)||0), 0);
            const totalBase = suites.reduce((s, r) => s + (Number(r.current_base_rent)||0), 0);
            const totalNnn  = suites.reduce((s, r) => s + (Number(r.current_nnn)||0), 0);
            const totalRent = suites.reduce((s, r) => s + (Number(r.current_total_rent)||0), 0);
            return (
              <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
                <colgroup>
                  <col style={{width:'9%'}}/>
                  <col style={{width:'12%'}}/>
                  <col style={{width:'20%'}}/>
                  <col style={{width:'auto'}}/>
                  <col style={{width:'8%'}}/>
                  <col style={{width:'10%'}}/>
                  <col style={{width:'9%'}}/>
                  <col style={{width:'10%'}}/>
                </colgroup>
                <thead style={{position:'sticky', top:0, zIndex:2}}>
                  <tr>
                    {['Suite','Type','Status','Tenant','Sq Ft','Base Rent','NNN','Total'].map((h, i) => (
                      <th key={h} style={{...css.th, cursor:'default', textAlign: i >= 4 ? 'right' : 'left'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suites.map((s, i) => {
                    const tenantName = s.current_tenant_id ? (suiteTenantMap[s.current_tenant_id] || '…') : null;
                    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
                    return (
                      <tr key={s.id}
                        onClick={() => window.open(`/suites/${s.podio_id ?? 'X'+s.id.slice(-6)}`, '_blank')}
                        style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:rowBg}}
                        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                        <td style={{...css.td, color:T.accent, fontWeight:'600'}}>{s.suite_num || '—'}</td>
                        <td style={{...css.td, color:T.text2, fontSize:F.xs}}>{s.space_type || '—'}</td>
                        <td style={css.td}><SuiteStatusBadge status={s.status}/></td>
                        <td style={{...css.td, color:tenantName ? T.text0 : T.text3, fontStyle:tenantName ? 'normal' : 'italic'}}>
                          {tenantName || 'Vacant'}
                        </td>
                        <td style={{...css.td, textAlign:'right', color:T.text2}}>{s.sqft ? fmtNum(s.sqft) : '—'}</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(s.current_base_rent)}</td>
                        <td style={{...css.td, textAlign:'right', color:T.text2}}>{fmtCurrency(s.current_nnn)}</td>
                        <td style={{...css.td, textAlign:'right', fontWeight:'500'}}>{fmtCurrency(s.current_total_rent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{borderTop:`1px solid ${T.border}`, background:T.bg2, fontWeight:'600'}}>
                    <td colSpan={4} style={{...css.td, color:T.text1}}>Totals</td>
                    <td style={{...css.td, textAlign:'right', color:T.text2}}>{fmtNum(totalSqft)}</td>
                    <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(totalBase)}</td>
                    <td style={{...css.td, textAlign:'right', color:T.text2}}>{fmtCurrency(totalNnn)}</td>
                    <td style={{...css.td, textAlign:'right', fontWeight:'700'}}>{fmtCurrency(totalRent)}</td>
                  </tr>
                </tfoot>
              </table>
            );
          })()
        )}

        {/* ════════════ TENANTS TAB ════════════ */}
        {tab === 'tenants' && (
          tenants === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading tenants…</div>
          ) : (
            <div>
              <div style={{display:'flex', gap:'4px', marginBottom:'10px'}}>
                {['Active','Archived','All'].map(s => {
                  const cnt = s === 'All' ? tenants.length : tenants.filter(t => (t.tenant_status||'') === s).length;
                  const active = tntFilter === s;
                  return (
                    <button key={s} onClick={() => setTntFilter(s)}
                      style={{padding:'3px 9px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs,
                        border:`0.5px solid ${active ? T.accent : T.border}`,
                        background:active ? '#1a2e3a' : 'transparent',
                        color:active ? T.accent : T.text2, fontWeight:active ? '600' : '400'}}>
                      {s} <span style={{color:active ? T.accent : T.text3, fontSize:'10px'}}>·{cnt}</span>
                    </button>
                  );
                })}
              </div>
              {tenants.length === 0 ? (
                <div style={{...css.card, textAlign:'center', color:T.text3, fontSize:F.sm, padding:'32px'}}>
                  No tenants for {pc}.
                </div>
              ) : (() => {
                const filtered = tenants.filter(t =>
                  tntFilter === 'All' || (t.tenant_status||'') === tntFilter
                );
                return (
                  <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
                    <colgroup>
                      <col style={{width:'auto'}}/>
                      <col style={{width:'8%'}}/>
                      <col style={{width:'8%'}}/>
                      <col style={{width:'12%'}}/>
                      <col style={{width:'12%'}}/>
                    </colgroup>
                    <thead style={{position:'sticky', top:0, zIndex:2}}>
                      <tr>
                        {['Tenant DBA','Suite','Type','Status','Lease End'].map((h, i) => (
                          <th key={h} style={{...css.th, cursor:'default', textAlign: i === 4 ? 'right' : 'left'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} style={{...css.td, textAlign:'center', padding:'24px', color:T.text3}}>No tenants match filter</td></tr>
                      )}
                      {filtered.map((t, i) => {
                        const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
                        const expDays = daysUntil(t.lease_ends);
                        const expColor = expDays === null ? T.text2
                          : expDays < 0 ? '#fff' : expDays <= 30 ? T.danger
                          : expDays <= 60 ? '#d4924a' : expDays <= 90 ? '#f0d060'
                          : expDays <= 120 ? T.success : T.text2;
                        const expBg = expDays !== null && expDays < 0 ? '#7a0000' : 'transparent';
                        return (
                          <tr key={t.id}
                            onClick={() => window.open(`/tenants/${t.podio_id ?? 'X'+t.id.slice(-6)}`, '_blank')}
                            style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:rowBg}}
                            onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                            <td style={{...css.td, fontWeight:'500'}}>{t.tenant_dba || '—'}</td>
                            <td style={{...css.td, color:T.text2}}>{t.suite_num || '—'}</td>
                            <td style={{...css.td, color:T.text2}}>{t.lease_type || '—'}</td>
                            <td style={css.td}>
                              <span style={css.badge(
                                t.tenant_status === 'Active' ? T.success : T.text2,
                                t.tenant_status === 'Active' ? '#1e2a1e' : T.bg3)}>
                                {t.tenant_status || '—'}
                              </span>
                            </td>
                            <td style={{...css.td, textAlign:'right'}}>
                              <span style={{color:expColor, background:expBg, fontSize:F.xs,
                                fontWeight: expDays !== null && expDays <= 120 ? '700' : '400',
                                padding: expBg !== 'transparent' ? '1px 5px' : '0', borderRadius:'3px', display:'inline-block'}}>
                                {fmtDate(t.lease_ends)}
                              </span>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )
        )}

        {/* ════════════ WORK ORDERS TAB ════════════ */}
        {tab === 'work-orders' && (
          allWOs === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading work orders…</div>
          ) : (
            <div>
              <div style={{display:'flex', gap:'4px', marginBottom:'10px'}}>
                {[['open','Open'],['closed','Closed'],['all','All']].map(([key, label]) => {
                  const cnt = key === 'open' ? allWOs.filter(w => w.wo_status !== 'Closed').length
                            : key === 'closed' ? allWOs.filter(w => w.wo_status === 'Closed').length
                            : allWOs.length;
                  const active = woFilter === key;
                  return (
                    <button key={key} onClick={() => setWoFilter(key)}
                      style={{padding:'3px 9px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs,
                        border:`0.5px solid ${active ? T.accent : T.border}`,
                        background:active ? '#1a2e3a' : 'transparent',
                        color:active ? T.accent : T.text2, fontWeight:active ? '600' : '400'}}>
                      {label} <span style={{color:active ? T.accent : T.text3, fontSize:'10px'}}>·{cnt}</span>
                    </button>
                  );
                })}
              </div>
              {allWOs.length === 0 ? (
                <div style={{...css.card, textAlign:'center', color:T.text3, fontSize:F.sm, padding:'32px'}}>
                  No work orders for {pc}.
                </div>
              ) : (() => {
                const showClosed = woFilter === 'closed';
                const visibleWOs = allWOs.filter(w =>
                  woFilter === 'all' ? true :
                  woFilter === 'closed' ? w.wo_status === 'Closed' :
                  w.wo_status !== 'Closed'
                );
                const sortedWOs = [...visibleWOs].sort((a, b) => {
                  const av = a[woSortCol] ?? ''; const bv = b[woSortCol] ?? '';
                  const cmp = String(av).localeCompare(String(bv));
                  return woSortDir === 'asc' ? cmp : -cmp;
                });
                const WoTh = ({ c, label, align = 'left' }) => (
                  <th style={{...css.th, textAlign:align}} onClick={() => toggleWoSort(c)}>
                    {label}
                    {woSortCol === c ? <span style={{marginLeft:'3px'}}>{woSortDir === 'asc' ? '↑' : '↓'}</span>
                                     : <span style={{marginLeft:'3px', color:T.bg3}}>↕</span>}
                  </th>
                );
                return (
                  <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
                    <colgroup>
                      <col style={{width:'7%'}}/>
                      <col style={{width:'auto'}}/>
                      <col style={{width:'9%'}}/>
                      <col style={{width:'14%'}}/>
                      <col style={{width:'9%'}}/>
                      <col style={{width:'9%'}}/>
                    </colgroup>
                    <thead style={{position:'sticky', top:0, zIndex:2}}>
                      <tr>
                        <WoTh c="wo_num"            label="WO #"/>
                        <WoTh c="short_description" label="Description"/>
                        <WoTh c="priority"          label="Priority"/>
                        <WoTh c="stage"             label="Stage"/>
                        <WoTh c="follow_up_date"    label="FU Date" align="right"/>
                        {showClosed
                          ? <WoTh c="close_date"  label="Closed"  align="right"/>
                          : <WoTh c="updated_at"  label="Updated" align="right"/>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {sortedWOs.length === 0 && (
                        <tr><td colSpan={6} style={{...css.td, textAlign:'center', padding:'24px', color:T.text3}}>No work orders match filter</td></tr>
                      )}
                      {sortedWOs.map((wo, i) => {
                        const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
                        return (
                          <tr key={wo.id}
                            onClick={() => window.open(`/work-orders/${wo.podio_id ?? 'X'+wo.id.slice(-6)}`, '_blank')}
                            style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:rowBg}}
                            onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                            <td style={{...css.td, color:T.accent, fontWeight:'600'}}>{wo.wo_num || '—'}</td>
                            <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{wo.short_description || '—'}</td>
                            <td style={css.td}><PriorityBadge priority={wo.priority}/></td>
                            <td style={{...css.td, color:T.text2, fontSize:F.xs}}>{wo.stage || '—'}</td>
                            <td style={{...css.td, textAlign:'right', color:T.text2, fontSize:F.xs}}>{fmtDate(wo.follow_up_date)}</td>
                            <td style={{...css.td, textAlign:'right', color:T.text2, fontSize:F.xs}}>
                              {fmtDate(showClosed ? wo.close_date : wo.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )
        )}

        {/* ════════════ ISSUES TAB ════════════ */}
        {tab === 'issues' && (
          allIssues === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading issues…</div>
          ) : (
            <div>
              <div style={{display:'flex', gap:'4px', marginBottom:'10px'}}>
                {[['open','Open'],['closed','Closed'],['all','All']].map(([key, label]) => {
                  const cnt = key === 'open' ? allIssues.filter(i => i.status === 'Open').length
                            : key === 'closed' ? allIssues.filter(i => i.status === 'Closed').length
                            : allIssues.length;
                  const active = issueFilter === key;
                  return (
                    <button key={key} onClick={() => setIssueFilter(key)}
                      style={{padding:'3px 9px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs,
                        border:`0.5px solid ${active ? T.accent : T.border}`,
                        background:active ? '#1a2e3a' : 'transparent',
                        color:active ? T.accent : T.text2, fontWeight:active ? '600' : '400'}}>
                      {label} <span style={{color:active ? T.accent : T.text3, fontSize:'10px'}}>·{cnt}</span>
                    </button>
                  );
                })}
              </div>
              {allIssues.length === 0 ? (
                <div style={{...css.card, textAlign:'center', color:T.text3, fontSize:F.sm, padding:'32px'}}>
                  No issues for {pc}.
                </div>
              ) : (() => {
                const showClosed = issueFilter === 'closed';
                const visibleIssues = allIssues.filter(iss =>
                  issueFilter === 'all' ? true :
                  issueFilter === 'closed' ? iss.status === 'Closed' : iss.status === 'Open'
                );
                return (
                  <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
                    <colgroup>
                      <col style={{width:'auto'}}/>
                      <col style={{width:'9%'}}/>
                      <col style={{width:'12%'}}/>
                      <col style={{width:'9%'}}/>
                      <col style={{width:'9%'}}/>
                      <col style={{width:'9%'}}/>
                    </colgroup>
                    <thead style={{position:'sticky', top:0, zIndex:2}}>
                      <tr>
                        <th style={{...css.th, cursor:'default'}}>Issue</th>
                        <th style={{...css.th, cursor:'default'}}>Priority</th>
                        <th style={{...css.th, cursor:'default'}}>Category</th>
                        <th style={{...css.th, cursor:'default'}}>Status</th>
                        <th style={{...css.th, cursor:'default', textAlign:'right'}}>FU Date</th>
                        <th style={{...css.th, cursor:'default', textAlign:'right'}}>{showClosed ? 'Closed' : 'Updated'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleIssues.length === 0 && (
                        <tr><td colSpan={6} style={{...css.td, textAlign:'center', padding:'24px', color:T.text3}}>No issues match filter</td></tr>
                      )}
                      {visibleIssues.map((iss, i) => {
                        const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
                        return (
                          <tr key={iss.id}
                            onClick={() => window.open(`/issues/${iss.podio_id ?? 'X'+iss.id.slice(-6)}`, '_blank')}
                            style={{borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:rowBg}}
                            onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                            <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{iss.issue_name || '—'}</td>
                            <td style={css.td}><PriorityBadge priority={iss.priority}/></td>
                            <td style={{...css.td, color:T.text2, fontSize:F.xs}}>{iss.category || '—'}</td>
                            <td style={css.td}>
                              <span style={css.badge(iss.status === 'Open' ? T.warn : T.text2, iss.status === 'Open' ? 'rgba(212,146,74,0.15)' : T.bg3)}>
                                {iss.status}
                              </span>
                            </td>
                            <td style={{...css.td, textAlign:'right', color:T.text2, fontSize:F.xs}}>{fmtDate(iss.follow_up_date)}</td>
                            <td style={{...css.td, textAlign:'right', color:T.text2, fontSize:F.xs}}>
                              {fmtDate(showClosed ? iss.close_date : iss.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )
        )}

        {/* ════════════ INSURANCE TAB ════════════ */}
        {tab === 'insurance' && (
          allInsurance === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading insurance…</div>
          ) : allInsurance.length === 0 ? (
            <div style={{...css.card, textAlign:'center', color:T.text3, fontSize:F.sm, padding:'32px'}}>
              No insurance records on file.
            </div>
          ) : (
            <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
              <colgroup>
                <col style={{width:'22%'}}/>
                <col style={{width:'11%'}}/>
                <col style={{width:'11%'}}/>
                <col style={{width:'10%'}}/>
                <col style={{width:'auto'}}/>
              </colgroup>
              <thead style={{position:'sticky', top:0, zIndex:2}}>
                <tr>
                  {['Carrier','Expiry','Premium','Status','Notes'].map(h => (
                    <th key={h} style={{...css.th, cursor:'default'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allInsurance.map((ins, i) => {
                  const days = daysUntil(ins.expiry_date);
                  const expColor = days === null ? T.text1 : days < 0 ? T.danger : days <= 30 ? T.danger : days <= 60 ? T.warn : T.text1;
                  const expBg   = days !== null && days < 0 ? 'rgba(224,112,112,0.08)' : 'transparent';
                  const rowBg   = i % 2 === 0 ? 'transparent' : T.bg0;
                  return (
                    <tr key={ins.id} style={{borderBottom:`0.5px solid ${T.border}`, background:rowBg}}>
                      <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{ins.insurance_co || '—'}</td>
                      <td style={{...css.td, color:expColor, background:expBg, fontWeight:days !== null && days <= 60 ? '700' : '400'}}>
                        {fmtDate(ins.expiry_date)}
                      </td>
                      <td style={{...css.td, color:T.text2}}>{fmtCurrency(ins.annual_premium)}</td>
                      <td style={css.td}>
                        {ins.status && (
                          <span style={css.badge(ins.status === 'Active' ? T.success : T.text2, ins.status === 'Active' ? '#1e2a1e' : T.bg3)}>
                            {ins.status}
                          </span>
                        )}
                      </td>
                      <td style={{...css.td, color:T.text2, fontSize:F.xs, whiteSpace:'normal', wordBreak:'break-word'}}>{ins.other_notes || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export — SPA (list + detail)
// ─────────────────────────────────────────────────────────────────────────────
export default function PropertiesView() {
  const [properties,   setProperties]   = useState([]);
  const [agreementMap, setAgreementMap] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [selected,     setSelected]     = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('properties', 'select=*&order=prop_code.asc')
      .then(data => { setProperties(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    sbFetch('property_agreements', 'select=prop_code,listing_expiry_date&order=listing_expiry_date.desc')
      .then(rows => {
        const map = {};
        rows.forEach(r => { if (r.prop_code && !map[r.prop_code]) map[r.prop_code] = r.listing_expiry_date; });
        setAgreementMap(map);
      }).catch(() => {});
  }, []);

  const handleSelect = useCallback(p => {
    history.pushState({ propertyId: p.id }, '');
    setSelected(p);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.propertyId) history.replaceState({}, '');
    setSelected(null);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:T.bg1}}>
      <div style={{display:selected ? 'none' : 'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
        <PropertiesList
          properties={properties} agreementMap={agreementMap}
          loading={loading} error={error} onSelect={handleSelect}/>
      </div>
      {selected && (
        <PropertyDetail key={selected.id} property={selected} onBack={handleBack} onUpdate={u => setSelected(u)}/>
      )}
    </div>
  );
}
