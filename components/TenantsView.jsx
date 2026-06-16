// ─────────────────────────────────────────────────────────────────────────────
// TenantsView.jsx  —  SedonaCRM Phase 2 UI  (definitive detail template)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Storefront, CaretLeft, CaretRight, ClipboardText } from '@phosphor-icons/react';
import RichTextEditor from './RichTextEditor';
import ContactsTable from './shared/ContactsTable';
import TasksView from './TasksView';
import CommunicationTimeline from './CommunicationTimeline';

const SUPABASE_URL     = 'https://edxcvyleielzevpappui.supabase.co';
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
  card: { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  secTitle: { fontSize:F.xs, fontWeight:'600', color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  badge: (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th: { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};

const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

const fmtNumDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

const fmtCurrency = n => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtNum      = n => n != null && n !== '' ? Number(n).toLocaleString() : '—';
const fmtSqft     = n => n == null ? '—' : Number(n).toLocaleString() + ' sf';
const fmtPct      = n => n == null ? '—' : Number(n).toFixed(4) + '%';

const daysUntil = d => {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((date - today) / (1000 * 60 * 60 * 24));
};

const isInRange = (dateVal, range) => {
  if (!dateVal || !range) return false;
  const d = new Date(typeof dateVal === 'string' && dateVal.length === 10 ? dateVal + 'T00:00:00' : dateVal);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'week')  { const w = new Date(now); w.setDate(w.getDate()-7); return d >= w; }
  if (range === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  if (range === 'year')  return d.getFullYear()===now.getFullYear();
  return false;
};

const TENANT_STATUS_OPTIONS = ['Active', 'Archived', 'Dead Prospect', 'LSG Prospect'];
const LEASE_STATUS_OPTIONS  = ['Active', 'Expired', 'MTM'];
const LEASE_TYPE_OPTIONS    = ['NNN', 'Gross', 'Other'];

const STORE_KEY = 'tenantsViewState';
const loadSaved = () => { try { const s = sessionStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────
const TenantStatusBadge = ({ status }) => {
  const map = {
    'Active':         [T.success, '#1e2a1e'],
    'Archived':       [T.text2,   T.bg3],
    'Dead Prospect':  [T.danger,  '#3d1f1f'],
    'LSG Prospect':   [T.accent,  '#1a2e3a'],
  };
  const [color, bg] = map[status] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

const LeaseStatusBadge = ({ status }) => {
  const map = {
    'Active':  [T.success, '#1e2a1e'],
    'Expired': [T.warn,    'rgba(212,146,74,0.15)'],
    'MTM':     [T.purple,  '#2a1f3a'],
  };
  const [color, bg] = map[status] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

const RentStatusBadge = ({ status }) => {
  const map = {
    'Current':  [T.success, '#1e2a1e'],
    'Future':   [T.accent,  '#1a2e3a'],
    'Past':     [T.text2,   T.bg3],
    'Proposed': [T.purple,  '#2a1f3a'],
    'Dead':     [T.text3,   T.bg3],
  };
  const [color, bg] = map[status] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// EditableField — extended with type='select'
// ─────────────────────────────────────────────────────────────────────────────
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

  if (type === 'textarea') return <RichTextEditor label={label} value={value} onSave={onSave}/>;

  return (
    <div style={{marginBottom:'10px'}}>
      {label && <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>{label}</div>}
      {editing ? (
        <div style={{display:'flex', alignItems:'flex-start', gap:'6px'}}>
          {type === 'select' ? (
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
          {(type === 'date' ? fmtDate(val) : val) || <span style={{color:T.text3, fontStyle:'italic', fontSize:F.sm}}>click to edit</span>}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ReadonlyField
// ─────────────────────────────────────────────────────────────────────────────
const ReadonlyField = ({ label, children, value, accent = false }) => (
  <div style={{marginBottom:'10px'}}>
    {label && <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>{label}</div>}
    <div style={{fontSize:F.base, color:accent ? T.accent : T.text0, fontWeight:accent ? '600' : '400', padding:'3px 5px', lineHeight:'1.4'}}>
      {children || value || <span style={{color:T.text3}}>—</span>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// More… popover (list — date filter only)
// ─────────────────────────────────────────────────────────────────────────────
const TenantsMorePopover = ({ open, onClose, anchorRef, dateFilters, setDateFilters }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = e => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  if (!open) return null;

  const toggleDate = period => setDateFilters(prev => ({ updated: prev.updated === period ? null : period }));
  const periods = [{ key:'week', label:'This Week' }, { key:'month', label:'This Month' }, { key:'year', label:'This Year' }];
  const btnStyle = active => ({
    padding:'3px 9px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
    border:`0.5px solid ${active ? T.warn : T.border}`,
    background: active ? 'rgba(212,146,74,0.18)' : 'transparent',
    color: active ? T.warn : T.text2,
    fontWeight: active ? '600' : '400',
    transition:'all 0.15s',
  });

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:200,
      background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px',
      padding:'10px 12px', minWidth:'260px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px', fontWeight:'600'}}>Updated</div>
      <div style={{display:'flex', gap:'4px'}}>
        {periods.map(({ key, label }) => (
          <button key={key} onClick={() => toggleDate(key)} style={btnStyle(dateFilters.updated === key)}>{label}</button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tenants List
// ─────────────────────────────────────────────────────────────────────────────
export const TenantsList = ({ tenants = [], loading = false, error = null, onSelect, filterPropCode, hidePropertyPills }) => {
  const saved = useMemo(() => loadSaved(), []);

  const [statusFilter, setStatusFilter] = useState(saved?.statusFilter ?? 'Active');
  const [search,       setSearch]       = useState(saved?.search       ?? '');
  const [sortCol,      setSortCol]      = useState(saved?.sortCol      ?? 'tenant_dba');
  const [sortDir,      setSortDir]      = useState(saved?.sortDir      ?? 'asc');
  const [dateFilters,  setDateFilters]  = useState(saved?.dateFilters  ?? { updated: null });
  const [propFilter,   setPropFilter]   = useState(saved?.propFilter   ?? []);
  const [activeProps,  setActiveProps]  = useState([]);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const moreAnchorRef = useRef(null);
  const [selfTenants, setSelfTenants] = useState(null);
  const [selfLoading, setSelfLoading] = useState(false);
  const [selfError,   setSelfError]   = useState(null);
  const [rentRollLoading, setRentRollLoading] = useState(false);

  useEffect(() => {
    document.title = 'Tenants | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, []);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(d => setActiveProps(d.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ statusFilter, search, sortCol, sortDir, dateFilters, propFilter }));
    } catch {}
  }, [statusFilter, search, sortCol, sortDir, dateFilters, propFilter]);

  useEffect(() => {
    if (!filterPropCode) return;
    setSelfLoading(true); setSelfError(null);
    sbFetch('tenants', `select=*&prop_code=eq.${encodeURIComponent(filterPropCode)}&order=tenant_dba.asc`)
      .then(d => { setSelfTenants(d); setSelfLoading(false); })
      .catch(e => { setSelfError(e.message); setSelfLoading(false); });
  }, [filterPropCode]);

  const effectiveTenants = filterPropCode ? (selfTenants || []) : tenants;
  const effectiveLoading = filterPropCode ? selfLoading : loading;
  const effectiveError   = filterPropCode ? selfError   : error;

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...effectiveTenants].sort((a, b) => {
    if (sortCol === 'sqft' || sortCol === 'lease_ends') {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [effectiveTenants, sortCol, sortDir]);

  const toggleProp = code => {
    if (code === 'All') { setPropFilter([]); return; }
    setPropFilter(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  const propBtnStyle = active => ({
    padding:'3px 7px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs, whiteSpace:'nowrap', flexShrink:0,
    border:`0.5px solid ${active ? T.accent : T.border}`,
    background: active ? T.accent : 'transparent',
    color: active ? '#fff' : T.text2,
    fontWeight: active ? '600' : '400',
  });

  const filtered = useMemo(() => sorted.filter(t => {
    if (filterPropCode && t.prop_code !== filterPropCode) return false;
    if (propFilter.length > 0 && !propFilter.includes(t.prop_code)) return false;
    if (statusFilter !== 'All' && (t.tenant_status || '') !== statusFilter) return false;
    if (dateFilters.updated && !isInRange(t.updated_at, dateFilters.updated)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (t.tenant_dba  ||'').toLowerCase().includes(q) ||
        (t.prop_code   ||'').toLowerCase().includes(q) ||
        (t.suite_num   ||'').toLowerCase().includes(q) ||
        (t.entity_name ||'').toLowerCase().includes(q)
      );
    }
    return true;
  }), [sorted, statusFilter, search, dateFilters, propFilter]);

  const statusCounts = useMemo(() => {
    const base = sorted.filter(t => {
      if (filterPropCode && t.prop_code !== filterPropCode) return false;
      if (propFilter.length > 0 && !propFilter.includes(t.prop_code)) return false;
      if (dateFilters.updated && !isInRange(t.updated_at, dateFilters.updated)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (t.tenant_dba  ||'').toLowerCase().includes(q) ||
          (t.prop_code   ||'').toLowerCase().includes(q) ||
          (t.suite_num   ||'').toLowerCase().includes(q) ||
          (t.entity_name ||'').toLowerCase().includes(q)
        );
      }
      return true;
    });
    const c = { All: base.length };
    TENANT_STATUS_OPTIONS.forEach(s => { c[s] = base.filter(t => (t.tenant_status || '') === s).length; });
    return c;
  }, [sorted, search, dateFilters, propFilter]);

  const groups = propFilter.length > 0
    ? [...propFilter].sort().map(pc => ({
        prop_code: pc,
        rows: filtered.filter(t => t.prop_code === pc),
      })).filter(g => g.rows.length > 0)
    : null;

  const hasMoreActive    = !!dateFilters.updated;
  const hasActiveFilters = statusFilter !== 'Active' || search !== '' || !!dateFilters.updated || propFilter.length > 0;

  const clearFilters = () => {
    setStatusFilter('Active'); setSearch(''); setDateFilters({ updated: null }); setPropFilter([]);
  };

  const renderTh = (c, label, extraStyle = {}) => (
    <th key={c} style={{...css.th, ...extraStyle}} onClick={() => toggleSort(c)}>
      {label}
      {sortCol === c
        ? <span style={{marginLeft:'3px'}}>{sortDir === 'asc' ? '↑' : '↓'}</span>
        : <span style={{marginLeft:'3px', color:T.bg3}}>↕</span>}
    </th>
  );

  const renderRow = (t, i) => {
    const rowBg  = i % 2 === 0 ? 'transparent' : T.bg0;
    const exp    = daysUntil(t.lease_ends);
    const expColor = exp === null ? T.text3 : exp < 0 ? T.danger : exp < 60 ? T.danger : exp < 180 ? T.warn : T.text2;
    const expBg    = exp !== null && exp < 60 ? '#3d1f1f' : exp !== null && exp < 180 ? '#3d2e1a' : 'transparent';
    const expLabel = exp === null ? '—' : exp < 0 ? `${Math.abs(exp)}d over` : `${exp}d`;

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/tenants/${t.podio_id ?? 'X'+t.id.slice(-6)}`, '_blank');
        if (tab) tab.focus();
      } else {
        try { sessionStorage.setItem('tenantsBackUrl', window.location.href); } catch {}
        try {
          const navL = filtered.map(r => ({ id: r.id, podio_id: r.podio_id }));
          sessionStorage.setItem('tenantsNavList', JSON.stringify(navL));
          sessionStorage.setItem('tenantsNavIndex', String(filtered.findIndex(r => r.id === t.id)));
        } catch {}
        onSelect(t);
      }
    };

    return (
      <tr key={t.id}
        style={{borderBottom:`0.5px solid ${T.border}`, background:rowBg, cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td}} title={t.tenant_dba}>
          <a href={`/tenants/${t.podio_id ?? 'X'+t.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(t);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {t.tenant_dba || ''}
          </a>
        </td>
        {!hidePropertyPills && <td style={{...css.td, color:T.accent, fontWeight:'500', fontSize:F.xs}}>{t.prop_code || ''}</td>}
        <td style={{...css.td, color:T.text1}}>{t.suite_num || '—'}</td>
        <td style={{...css.td, color:T.text2, textAlign:'right'}}>{t.sqft ? Number(t.sqft).toLocaleString() : '—'}</td>
        <td style={{...css.td, color:T.text2}}>{t.lease_type || '—'}</td>
        <td style={{...css.td, color:T.text1}}>{fmtNumDate(t.lease_ends) || '—'}</td>
        <td style={{...css.td}}>
          <span style={{fontSize:F.xs, padding:'2px 6px', borderRadius:'3px', background:expBg, color:expColor}}>
            {expLabel}
          </span>
        </td>
        <td style={{...css.td}}><TenantStatusBadge status={t.tenant_status}/></td>
        <td style={{...css.td, color:T.text2, fontSize:F.xs}}>{fmtNumDate(t.updated_at)}</td>
      </tr>
    );
  };

  const generateRentRoll = async () => {
    if (rentRollLoading) return;
    setRentRollLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let params = `rent_status=eq.Current&rent_starts=lte.${today}&rent_ends=gte.${today}&select=*&order=prop_code.asc,suite_num.asc`;
      if (filterPropCode) params += `&prop_code=eq.${encodeURIComponent(filterPropCode)}`;
      let vParams = `select=suite_num,sqft,asking_base_per_sf,asking_nnn_per_sf,prop_code&status=eq.Vacant&order=prop_code.asc,suite_num.asc`;
      if (filterPropCode) vParams += `&prop_code=eq.${encodeURIComponent(filterPropCode)}`;
      const [rows, vacantRows] = await Promise.all([
        sbFetch('rent_schedule', params),
        sbFetch('suites', vParams),
      ]);
      const occupied_sf = rows.reduce((s, r) => s + (Number(r.sqft) || 0), 0);
      const monthly_total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
      const occupancy = { occupied_sf, vacant_sf: 0, gross_sf: 0, occ_pct: 0, monthly_total };
      generatePortfolioPDF(rows, occupancy, filterPropCode, vacantRows);
    } catch (e) {
      console.error('Rent roll error:', e);
      alert('Could not generate rent roll. Check console for details.');
    }
    setRentRollLoading(false);
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px'}}>
          <Storefront size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg, fontWeight:'600', color:T.text0}}>Tenants</span>
          <span style={{fontSize:F.xs, color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
          <button onClick={generateRentRoll} disabled={rentRollLoading}
            style={{padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
              border:`0.5px solid ${T.accent}`, background:'transparent', color:T.accent,
              display:'inline-flex', alignItems:'center', gap:'5px', opacity: rentRollLoading ? 0.5 : 1,
              marginLeft:'auto'}}>
            {rentRollLoading ? 'Loading…' : 'Rent Roll PDF'}
          </button>
        </div>

        {/* Row 1: Property strip */}
        {!filterPropCode && !hidePropertyPills && (
        <div className="filter-row" style={{gap:'4px',marginBottom:'5px'}}>
          <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
          {activeProps.map(pc => (
            <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
          ))}
        </div>
        )}

        {/* Row 2: Filter bar */}
        <div style={{display:'flex', gap:'6px', alignItems:'center', minWidth:0}}>
          {/* Status pills */}
          <div style={{display:'flex', gap:'1px', background:T.bg2, borderRadius:'5px', padding:'2px', border:`0.5px solid ${T.border}`, flexShrink:0}}>
            {['All', ...TENANT_STATUS_OPTIONS].map(s => {
              const cnt    = statusCounts[s] ?? 0;
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{padding:'3px 7px', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:F.xs,
                    background:active ? T.bg3 : 'transparent',
                    color:active ? T.text0 : T.text2,
                    fontWeight:active ? '600' : '400',
                    display:'flex', alignItems:'center', gap:'2px', whiteSpace:'nowrap'}}>
                  {s}
                  <span style={{color:active ? T.text1 : T.text3, fontSize:'10px'}}>·{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* More… */}
          <div style={{position:'relative', flexShrink:0}} ref={moreAnchorRef}>
            <button onClick={() => setMoreOpen(o => !o)}
              style={{padding:'3px 9px', borderRadius:'5px', cursor:'pointer', fontSize:F.xs,
                border:`0.5px solid ${hasMoreActive ? T.warn : T.border}`,
                background: moreOpen ? T.bg3 : 'transparent',
                color: hasMoreActive ? T.warn : T.text1,
                display:'flex', alignItems:'center', gap:'5px'}}>
              More…
              {hasMoreActive && <span style={{width:'5px', height:'5px', borderRadius:'50%', background:T.warn, flexShrink:0, display:'inline-block'}}/>}
            </button>
            <TenantsMorePopover
              open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreAnchorRef}
              dateFilters={dateFilters} setDateFilters={setDateFilters}
            />
          </div>

          {/* Clear Filters */}
          <button onClick={clearFilters}
            style={{
              padding:'3px 9px', borderRadius:'5px', cursor:'pointer', fontSize:F.xs,
              border:`0.5px solid ${hasActiveFilters ? T.warn : T.border}`,
              background:'transparent', color: hasActiveFilters ? T.warn : T.text3,
              display:'flex', alignItems:'center', gap:'3px', transition:'all 0.15s',
              visibility: hasActiveFilters ? 'visible' : 'hidden',
            }}>
            <span style={{fontSize:'12px'}}>×</span> Clear
          </button>

          {/* Search */}
          <div style={{marginLeft:'auto', position:'relative', display:'flex', alignItems:'center', flexShrink:0}}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{position:'absolute', left:'7px', background:'transparent', border:'none', cursor:'pointer', color:T.text2, fontSize:'14px', lineHeight:1, padding:0, zIndex:1}}>
                ×
              </button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{width:'220px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'5px', padding:`4px 10px 4px ${search ? '26px' : '10px'}`, color:T.text0, fontSize:F.xs, outline:'none'}}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {effectiveLoading && <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading tenants…</div>}
      {effectiveError   && <div style={{padding:'32px', textAlign:'center', color:T.danger, fontSize:F.sm}}>Error: {effectiveError}</div>}

      {!effectiveLoading && !effectiveError && (
        <div style={{flex:1, overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'22%'}}/>
              {!hidePropertyPills && <col style={{width:'6%'}}/>}
              <col style={{width:'6%'}}/>
              <col style={{width:'7%'}}/>
              <col style={{width:'7%'}}/>
              <col style={{width:'9%'}}/>
              <col style={{width:'8%'}}/>
              <col style={{width:'12%'}}/>
              <col style={{width:'9%'}}/>
            </colgroup>
            <thead style={{position:'sticky', top:0, zIndex:2}}>
              <tr>
                {renderTh('tenant_dba', 'Tenant')}
                {!hidePropertyPills && renderTh('prop_code',  'Prop')}
                {renderTh('suite_num',  'Suite')}
                {renderTh('sqft',       'Sq Ft',  {textAlign:'right'})}
                {renderTh('lease_type', 'Type')}
                {renderTh('lease_ends', 'Lease End')}
                <th style={css.th}>Expires</th>
                {renderTh('tenant_status', 'Status')}
                {renderTh('updated_at',    'Updated')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={hidePropertyPills ? 8 : 9} style={{...css.td, textAlign:'center', padding:'32px', color:T.text3}}>No tenants match filters</td></tr>
              )}
              {groups
                ? groups.map(g => (
                    <React.Fragment key={g.prop_code}>
                      <tr style={{background:T.bg3, position:'sticky', top:'28px', zIndex:1}}>
                        <td colSpan={hidePropertyPills ? 8 : 9} style={{...css.td, color:T.accent, fontWeight:'600', padding:'4px 10px', fontSize:F.xs, textTransform:'uppercase', letterSpacing:'0.07em'}}>
                          {g.prop_code} <span style={{color:T.text3, fontWeight:'400'}}>({g.rows.length})</span>
                        </td>
                      </tr>
                      {g.rows.map((t, i) => renderRow(t, i))}
                    </React.Fragment>
                  ))
                : filtered.map((t, i) => renderRow(t, i))
              }
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length === 0 && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No tenants match filters</div>}
            {filtered.map((t, i) => {
              const rowBg = i%2===0?'transparent':T.bg0;
              const exp = daysUntil(t.lease_ends);
              const expColor = exp===null?T.text3:exp<0?T.danger:exp<180?T.warn:T.text2;
              return (
                <div key={t.id} style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{try{sessionStorage.setItem('tenantsBackUrl',window.location.href);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('tenantsNavList',JSON.stringify(navL));sessionStorage.setItem('tenantsNavIndex',String(filtered.findIndex(r=>r.id===t.id)));}catch{}onSelect(t);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{fontWeight:'600',fontSize:F.base,color:T.text0,marginBottom:'4px'}}>{t.tenant_dba||'—'}</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {!hidePropertyPills && t.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{t.prop_code}</span>}
                    {t.suite_num&&<span style={{fontSize:F.xs,color:T.text2}}>Suite {t.suite_num}</span>}
                    <TenantStatusBadge status={t.tenant_status}/>
                    {t.lease_ends&&<span style={{fontSize:F.xs,color:expColor}}>{fmtNumDate(t.lease_ends)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Detail
// ─────────────────────────────────────────────────────────────────────────────
export const TenantDetail = ({ tenant, onBack, onUpdate }) => {
  const [tab,      setTab]      = useState('tasks');
  const [data,     setData]     = useState(tenant);
  const [property, setProperty] = useState(null);
  const [suite,    setSuite]    = useState(null);
  const [navList,  setNavList]  = useState(null);
  const [navIdx,   setNavIdx]   = useState(-1);
  const [navLoading, setNavLoading] = useState(false);

  // Lazy-loaded tab data
  const [contacts,         setContacts]         = useState(null);
  const [rent,             setRent]             = useState(null);
  const [cois,             setCois]             = useState(null);
  const [issues,           setIssues]           = useState(null);
  const [workOrders,       setWorkOrders]       = useState(null);
  const [rentStatusFilter, setRentStatusFilter] = useState(new Set(['Current', 'Future']));
  const loaded = useRef(new Set());

  // Load property + suite immediately (needed for Info tab)
  useEffect(() => {
    if (data.prop_code) {
      sbFetch('properties', `select=id,prop_code,property_name,address,city,state&prop_code=eq.${encodeURIComponent(data.prop_code)}`)
        .then(r => setProperty(r[0] || null)).catch(() => {});
    }
    if (data.prop_code && data.suite_num) {
      sbFetch('suites', `select=*&prop_code=eq.${encodeURIComponent(data.prop_code)}&suite_num=eq.${encodeURIComponent(data.suite_num)}`)
        .then(r => setSuite(r[0] || null)).catch(() => {});
    }
  }, [data.prop_code, data.suite_num]);

  // Lazy load Contacts tab
  useEffect(() => {
    if (tab !== 'contacts' || loaded.current.has('contacts')) return;
    loaded.current.add('contacts');
    const ids = [data.primary_contact_id, data.accounting_contact_id].filter(Boolean);
    if (ids.length === 0) { setContacts({ primary: null, accounting: null }); return; }
    Promise.all([
      data.primary_contact_id    ? sbFetch('contacts', `select=*&id=eq.${data.primary_contact_id}`)    : Promise.resolve([]),
      data.accounting_contact_id ? sbFetch('contacts', `select=*&id=eq.${data.accounting_contact_id}`) : Promise.resolve([]),
    ]).then(([pc, ac]) => {
      setContacts({ primary: pc[0] || null, accounting: ac[0] || null });
    }).catch(() => setContacts({ primary: null, accounting: null }));
  }, [tab, data.primary_contact_id, data.accounting_contact_id]);

  // Lazy load Rent tab (also needed for Overview)
  useEffect(() => {
    if ((tab !== 'rent' && tab !== 'overview') || loaded.current.has('rent')) return;
    loaded.current.add('rent');
    sbFetch('rent_schedule', `select=*&tenant_id=eq.${data.id}&order=rent_starts.asc`)
      .then(r => setRent(r)).catch(() => setRent([]));
  }, [tab, data.id]);

  // Lazy load COIs tab (also needed for Overview)
  useEffect(() => {
    if ((tab !== 'cois' && tab !== 'overview') || loaded.current.has('cois')) return;
    loaded.current.add('cois');
    sbFetch('tnt_cois', `select=*&tenant_id=eq.${data.id}&order=expiry_date.asc`)
      .then(r => setCois(r)).catch(() => setCois([]));
  }, [tab, data.id]);

  // Lazy load Overview tab issues + work orders
  useEffect(() => {
    if (tab !== 'overview' || loaded.current.has('overview')) return;
    loaded.current.add('overview');
    if (data.prop_code) {
      sbFetch('issues', `select=id,issue_name,priority,follow_up_date&prop_code=eq.${encodeURIComponent(data.prop_code)}&status=neq.Closed&order=follow_up_date.asc`)
        .then(r => setIssues(r)).catch(() => setIssues([]));
    } else {
      setIssues([]);
    }
    sbFetch('work_orders', `select=id,wo_num,short_description,priority,stage,wo_status,follow_up_date&tenant_id=eq.${data.id}&wo_status=neq.Closed&wo_status=neq.Closed-Not Done&order=follow_up_date.asc`)
      .then(r => setWorkOrders(r)).catch(() => setWorkOrders([]));
  }, [tab, data.id, data.prop_code]);

  // Browser tab title
  useEffect(() => {
    const prop  = data.prop_code || '';
    const name  = data.tenant_dba || 'Tenant';
    document.title = `${prop} · ${name} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.prop_code, data.tenant_dba]);

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

  // Nav list from sessionStorage
  useEffect(() => {
    try {
      const nl = sessionStorage.getItem('tenantsNavList');
      const ni = sessionStorage.getItem('tenantsNavIndex');
      if (nl) { setNavList(JSON.parse(nl)); setNavIdx(ni !== null ? parseInt(ni, 10) : -1); }
    } catch {}
  }, []);

  const goNav = async (dir) => {
    if (!navList) return;
    const next = navIdx + dir;
    if (next < 0 || next >= navList.length) return;
    const entry = navList[next];
    setNavLoading(true);
    try {
      const rows = await sbFetch('tenants', `podio_id=eq.${entry.podio_id}&select=*&limit=1`);
      if (rows && rows[0]) {
        setData(rows[0]);
        setNavIdx(next);
        sessionStorage.setItem('tenantsNavIndex', String(next));
        window.history.replaceState(null, '', `/tenants/${entry.podio_id}`);
        loaded.current = new Set();
        setTab('tasks');
      }
    } catch {}
    setNavLoading(false);
  };

  const goNavRef = useRef(goNav);
  goNavRef.current = goNav;

  // Arrow key nav
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') goNavRef.current(-1);
      if (e.key === 'ArrowRight') goNavRef.current(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const save = async (field, val) => {
    await sbPatch('tenants', data.id, { [field]: val });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const TABS = ['Tasks', 'Overview', 'Info', 'Contacts', 'Rent', 'COIs', 'Activity', 'Communications'];
  const tk   = t => t.toLowerCase();

  const hdrBtnStyle = (active) => ({
    padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, cursor: active ? 'pointer' : 'default',
    border:`0.5px solid ${active ? T.border : T.border}`,
    background:'transparent',
    color: active ? T.text1 : T.text3,
    textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'4px',
    opacity: active ? 1 : 0.4,
  });

  const propAddr = property ? [property.address, property.city, property.state].filter(Boolean).join(', ') : null;

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>

      {/* ── Header ── */}
      <div style={{padding:'10px 16px 0', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>
        {/* Row 1: Back button + action buttons */}
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px', flexWrap:'wrap', rowGap:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'4px 10px', color:T.text1, fontSize:F.sm, cursor:'pointer', flexShrink:0, display:'inline-flex', alignItems:'center', gap:'5px'}}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text1}>
            <Storefront size={14} weight="bold"/>← Tenants
          </button>

          {/* Action buttons — right-aligned */}
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px'}}>
            {data.gdrive_folder_url ? (
              <a href={data.gdrive_folder_url} target="_blank" rel="noreferrer"
                style={{...hdrBtnStyle(true), color:T.accent, borderColor:T.accent}}>
                Drive ↗
              </a>
            ) : (
              <span style={hdrBtnStyle(false)}>Drive</span>
            )}

            {data.gdrive_lease_url ? (
              <a href={data.gdrive_lease_url} target="_blank" rel="noreferrer"
                style={{...hdrBtnStyle(true), color:T.warn, borderColor:T.warn}}>
                Lease PDF ↗
              </a>
            ) : (
              <span style={hdrBtnStyle(false)}>Lease PDF</span>
            )}

            <span title="HelloSign — Phase 3"
              style={{...hdrBtnStyle(false), cursor:'not-allowed'}}>
              eSign
            </span>
          </div>

          {/* Prev/Next nav */}
          {navList&&navList.length>1&&(
            <div style={{display:'flex',alignItems:'center',gap:'3px',flexShrink:0}}>
              <button onClick={()=>goNav(-1)} disabled={navIdx<=0||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 6px',cursor:navIdx<=0?'not-allowed':'pointer',opacity:navIdx<=0?0.3:1,color:T.text1,display:'flex',alignItems:'center'}}
                onMouseEnter={e=>{if(navIdx>0)e.currentTarget.style.borderColor=T.accent;}}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <CaretLeft size={18} weight="bold"/>
              </button>
              <span style={{fontSize:F.xs,color:T.text3,padding:'0 6px',whiteSpace:'nowrap'}}>{navIdx+1} of {navList.length}</span>
              <button onClick={()=>goNav(1)} disabled={navIdx>=navList.length-1||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 6px',cursor:navIdx>=navList.length-1?'not-allowed':'pointer',opacity:navIdx>=navList.length-1?0.3:1,color:T.text1,display:'flex',alignItems:'center'}}
                onMouseEnter={e=>{if(navIdx<navList.length-1)e.currentTarget.style.borderColor=T.accent;}}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <CaretRight size={18} weight="bold"/>
              </button>
            </div>
          )}
        </div>

        {/* Row 2: title + entity subtitle */}
        <div style={{marginBottom:'5px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Storefront size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
            <div style={{fontSize:F.lg, fontWeight:'600', color:T.text0, lineHeight:'1.3', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {data.tenant_dba || 'Untitled Tenant'}
            </div>
          </div>
          {data.entity_name && (
            <div style={{fontSize:F.sm, color:T.text2, marginTop:'1px'}}>{data.entity_name}</div>
          )}
        </div>

        {/* Row 3: chip row */}
        <div style={{display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap', marginBottom:'5px'}}>
          {data.prop_code && (
            <span style={css.badge(T.accent, '#1a2e3a')}>{data.prop_code}</span>
          )}
          {data.suite_num && (
            <span style={css.badge(T.text1, T.bg3)}>Suite {data.suite_num}</span>
          )}
          {data.lease_type && (
            <span style={css.badge(T.text2, T.bg3)}>{data.lease_type}</span>
          )}
          {data.lease_status && <LeaseStatusBadge status={data.lease_status}/>}
          <TenantStatusBadge status={data.tenant_status}/>
          {data.podio_id && (
            <span style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em'}}>Podio</span>
              <span style={{...css.badge(T.text2, T.bg3)}}>{data.podio_id}</span>
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="crm-detail-tab-bar" style={{display:'flex', gap:'2px', marginTop:'4px', overflowX:'auto', scrollbarWidth:'none', WebkitOverflowScrolling:'touch'}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(tk(t))}
              style={{background:'transparent', border:'none', padding:'6px 12px', fontSize:F.sm, cursor:'pointer', borderRadius:'4px 4px 0 0', whiteSpace:'nowrap',
                color: tab === tk(t) ? T.accent : T.text1,
                borderBottom: tab === tk(t) ? `2px solid ${T.accent}` : '2px solid transparent',
                fontWeight: tab === tk(t) ? '600' : '400'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab==='tasks'&&(
        <div style={{flex:1,overflow:'hidden'}}>
          {data?.id&&<TasksView filterTenantId={data.id} hidePropertyPills embeddedMode/>}
        </div>
      )}
      {tab!=='tasks'&&(
      <div style={{flex:1, overflowY:'auto', padding:'16px'}}>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (() => {
          // Find first Current or Future rent row for lease health
          const activeRent = rent?.find(r => r.rent_status === 'Current' || r.rent_status === 'Future') ?? rent?.[0] ?? null;
          const expDays    = daysUntil(activeRent?.rent_ends ?? data.lease_ends);
          const expColor   = expDays === null ? T.text1
            : expDays < 0   ? '#fff'
            : expDays <= 30  ? T.danger
            : expDays <= 60  ? '#d4924a'
            : expDays <= 90  ? '#f0d060'
            : expDays <= 120 ? T.success
            : T.text1;
          const expBg = expDays !== null && expDays < 0 ? '#7a0000' : 'transparent';
          const sqft  = suite?.sqft || data.sqft;

          return (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px'}}>

              {/* LEFT col */}
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>

                {/* Lease Health */}
                <div style={css.card}>
                  <div style={css.secTitle}>Lease Health</div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'10px'}}>
                    <div>
                      <div style={{fontSize:F.md, fontWeight:'600', color:T.text0}}>{data.tenant_dba}</div>
                      <div style={{fontSize:F.xs, color:T.text2, marginTop:'2px'}}>{data.prop_code}{data.suite_num ? ` · Suite ${data.suite_num}` : ''}</div>
                    </div>
                    {data.lease_type && <span style={css.badge(T.text1, T.bg3)}>{data.lease_type}</span>}
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'8px 16px', marginBottom:'10px'}}>
                    <div>
                      <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Rent Start</div>
                      <div style={{fontSize:F.sm, color:T.text1}}>{fmtDate(activeRent?.rent_starts ?? data.lease_starts) || '—'}</div>
                    </div>
                    <div>
                      <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Rent End</div>
                      <div style={{fontSize:F.sm, fontWeight: expDays !== null && expDays <= 120 ? '700' : '400',
                        color:expColor, background:expBg, padding: expBg !== 'transparent' ? '1px 5px' : '0',
                        borderRadius:'3px', display:'inline-block'}}>
                        {fmtDate(activeRent?.rent_ends ?? data.lease_ends) || '—'}
                        {expDays !== null && (
                          <span style={{fontSize:F.xs, fontWeight:'400', color: expBg !== 'transparent' ? '#fff' : T.text2, marginLeft:'6px'}}>
                            {expDays < 0 ? `(${Math.abs(expDays)}d over)` : `(${expDays}d)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <span style={{fontSize:F.xs, color:T.text3}}>Monthly Rent</span>
                    <span style={{fontSize:F.md, fontWeight:'600', color:T.text0}}>{fmtCurrency(activeRent?.total ?? null)}</span>
                  </div>
                </div>

                {/* COI Status */}
                <div style={css.card}>
                  <div style={css.secTitle}>COI Status</div>
                  {cois === null ? (
                    <div style={{fontSize:F.sm, color:T.text3}}>Loading…</div>
                  ) : cois.length === 0 ? (
                    <div style={{fontSize:F.sm, color:T.warn}}>⚠ No certificates of insurance on record</div>
                  ) : (
                    <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', minWidth:'480px'}}>
                      <tbody>
                        {cois.map(c => {
                          const cd = daysUntil(c.expiry_date);
                          const cc = cd === null ? T.text1 : cd < 0 ? T.danger : cd <= 30 ? T.danger : cd <= 60 ? '#d4924a' : T.text1;
                          const cbg = cd !== null && cd < 0 ? 'rgba(224,112,112,0.1)' : 'transparent';
                          return (
                            <tr key={c.id} style={{borderBottom:`0.5px solid ${T.border}`}}>
                              <td style={{...css.td, padding:'4px 4px 4px 0', whiteSpace:'normal', wordBreak:'break-word'}}>{c.insured_company || '—'}</td>
                              <td style={{...css.td, color:cc, background:cbg, borderRadius:'3px', textAlign:'right', paddingRight:'4px', flexShrink:0}}>{fmtDate(c.expiry_date) || '—'}</td>
                              <td style={{css:{}, textAlign:'right', paddingLeft:'6px'}}>
                                {c.coi_status && <span style={css.badge(c.coi_status==='Current'?T.success:T.danger, c.coi_status==='Current'?'#1e2a1e':'#3d1f1f')}>{c.coi_status}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT col */}
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>

                {/* Quick Links */}
                <div style={css.card}>
                  <div style={css.secTitle}>Quick Links</div>
                  <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                    {data.gdrive_folder_url ? (
                      <a href={data.gdrive_folder_url} target="_blank" rel="noreferrer"
                        style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>Drive Folder ↗</a>
                    ) : (
                      <span style={{fontSize:F.sm, color:T.text3}}>Drive Folder — not linked</span>
                    )}
                    {data.gdrive_lease_url ? (
                      <a href={data.gdrive_lease_url} target="_blank" rel="noreferrer"
                        style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>PDF Lease ↗</a>
                    ) : (
                      <span style={{fontSize:F.sm, color:T.text3}}>PDF Lease — not linked</span>
                    )}
                    {property?.id && (
                      <a href={`/properties/${property.podio_id ?? 'X'+property.id.slice(-6)}`} target="_blank" rel="noreferrer"
                        style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>Property Page ↗</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px'}}>

            {/* Entity Info — full width at top */}
            <div style={{...css.card, gridColumn:'1 / -1'}}>
              <div style={css.secTitle}>Entity Info</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'16px'}}>
                <ReadonlyField label="Entity Name"  value={data.entity_name}/>
                <ReadonlyField label="Entity Type"  value={data.entity_type}/>
                <ReadonlyField label="Entity State" value={data.entity_state}/>
              </div>
              {data.entity_sig_block && (
                <div style={{marginTop:'8px', padding:'8px', background:T.bg3, borderRadius:'4px', fontSize:F.sm, color:T.text1, lineHeight:'1.5', whiteSpace:'pre-wrap'}}>
                  {data.entity_sig_block}
                </div>
              )}
              <div style={{marginTop:'12px'}}>
                <div style={css.secTitle}>Mailing Address</div>
                <ReadonlyField label="" value={[data.address, data.city, data.state, data.zip].filter(Boolean).join(', ')}/>
              </div>
            </div>

            {/* LEFT: Tenant Info */}
            <div style={css.card}>
              <div style={css.secTitle}>Tenant Info</div>
              <EditableField label="Tenant DBA"    value={data.tenant_dba}    onSave={v => save('tenant_dba', v)}/>
              <EditableField label="Legal Name"    value={data.entity_name}   onSave={v => save('entity_name', v)}/>
              <EditableField label="Lease Type"    value={data.lease_type}    onSave={v => save('lease_type', v)}    type="select" options={LEASE_TYPE_OPTIONS}/>
              <EditableField label="Lease Status"  value={data.lease_status}  onSave={v => save('lease_status', v)}  type="select" options={LEASE_STATUS_OPTIONS}/>
              <EditableField label="Tenant Status" value={data.tenant_status} onSave={v => save('tenant_status', v)} type="select" options={TENANT_STATUS_OPTIONS}/>
              <EditableField label="Tenant Use"    value={data.tenant_use}    onSave={v => save('tenant_use', v)}/>
            </div>

            {/* RIGHT: Property & Suite */}
            <div>
              <div style={{...css.card, marginBottom:'12px'}}>
                <div style={css.secTitle}>Property</div>
                {property ? (
                  <>
                    <ReadonlyField label="Property Name" value={property.property_name}/>
                    {propAddr && <ReadonlyField label="Address" value={propAddr}/>}
                    <a href={`/properties/${property.podio_id ?? 'X'+property.id.slice(-6)}`} target="_blank" rel="noreferrer"
                      style={{fontSize:F.xs, color:T.accent, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px', padding:'3px 5px', borderRadius:'3px', border:`0.5px solid ${T.border}`}}>
                      Open Property ↗
                    </a>
                  </>
                ) : (
                  <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic'}}>Loading property…</div>
                )}
              </div>

              <div style={css.card}>
                <div style={css.secTitle}>Suite</div>
                <ReadonlyField label="Suite #"     value={data.suite_num}/>
                <ReadonlyField label="Sq Ft"       value={fmtSqft(data.sqft)}/>
                {suite && (
                  <>
                    {suite.space_type    && <ReadonlyField label="Space Type" value={suite.space_type}/>}
                    {suite.location_desc && <ReadonlyField label="Location"   value={suite.location_desc}/>}
                  </>
                )}
              </div>
            </div>

            {/* BOTTOM LEFT: Lease Terms */}
            <div style={css.card}>
              <div style={css.secTitle}>Lease Terms</div>
              <EditableField label="Lease Starts"       value={data.lease_starts}       onSave={v => save('lease_starts', v)}       type="date"/>
              <EditableField label="Lease Ends"         value={data.lease_ends}         onSave={v => save('lease_ends', v)}         type="date"/>
              <EditableField label="Term (months)"      value={data.lease_term_months}  onSave={v => save('lease_term_months', v != null ? parseInt(v) || null : null)} type="number"/>
              <EditableField label="Amendment #"        value={data.amendment_num}      onSave={v => save('amendment_num', v != null ? parseInt(v) || null : null)} type="number"/>
              <EditableField label="Security Deposit"   value={data.security_deposit}   onSave={v => save('security_deposit', v != null ? parseFloat(v) || null : null)} type="number"/>
              <EditableField label="Day Rent Due"       value={data.day_rent_due}       onSave={v => save('day_rent_due', v != null ? parseInt(v) || null : null)} type="number"/>
              <EditableField label="Pays Rent How"      value={data.pays_rent_how}      onSave={v => save('pays_rent_how', v)}/>
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>TPT Tax Exempt</div>
                <div style={{display:'flex', gap:'6px'}}>
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => save('tpt_tax_exempt', v)}
                      style={{padding:'3px 10px', borderRadius:'4px', cursor:'pointer', fontSize:F.sm,
                        border: data.tpt_tax_exempt === v ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: data.tpt_tax_exempt === v ? T.bg3 : 'transparent',
                        color: data.tpt_tax_exempt === v ? T.text0 : T.text2}}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTTOM RIGHT: Notes */}
            <div style={css.card}>
              <div style={css.secTitle}>Notes</div>
              <EditableField label="Company Notes" value={data.company_notes}              onSave={v => save('company_notes', v)}              type="textarea"/>
              <EditableField label="Lease Notes"   value={data.lease_notes}                onSave={v => save('lease_notes', v)}                type="textarea"/>
              {(data.future_lease_change_notes || '') && (
                <EditableField label="Future Lease Changes" value={data.future_lease_change_notes} onSave={v => save('future_lease_change_notes', v)} type="textarea"/>
              )}
            </div>
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <div>
            {/* Primary + Accounting linked contacts */}
            {contacts === null ? (
              <div style={{padding:'24px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading contacts…</div>
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px', marginBottom:'16px'}}>
                {/* Primary Contact */}
                <div style={css.card}>
                  <div style={css.secTitle}>Primary Contact</div>
                  {contacts.primary ? (
                    <>
                      <ReadonlyField label="Name"   value={contacts.primary.full_name}/>
                      <ReadonlyField label="Title"  value={contacts.primary.title}/>
                      <ReadonlyField label="Phone"  value={contacts.primary.primary_phone || contacts.primary.main_office_phone}/>
                      <ReadonlyField label="Email"  value={contacts.primary.email}/>
                      {contacts.primary.company_dba && <ReadonlyField label="Company" value={contacts.primary.company_dba}/>}
                    </>
                  ) : (
                    <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic', padding:'8px 0'}}>No primary contact linked.</div>
                  )}
                </div>

                {/* Accounting Contact */}
                <div style={css.card}>
                  <div style={css.secTitle}>Accounting Contact</div>
                  {contacts.accounting ? (
                    <>
                      <ReadonlyField label="Name"   value={contacts.accounting.full_name}/>
                      <ReadonlyField label="Title"  value={contacts.accounting.title}/>
                      <ReadonlyField label="Phone"  value={contacts.accounting.primary_phone || contacts.accounting.main_office_phone}/>
                      <ReadonlyField label="Email"  value={contacts.accounting.email}/>
                      {contacts.accounting.company_dba && <ReadonlyField label="Company" value={contacts.accounting.company_dba}/>}
                    </>
                  ) : (
                    <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic', padding:'8px 0'}}>No accounting contact linked.</div>
                  )}
                </div>
              </div>
            )}

            {/* All contacts for this tenant */}
            <div style={{height:'400px', overflow:'hidden', border:`0.5px solid ${T.border}`, borderRadius:'6px'}}>
              <ContactsTable filterTenantId={data.id} hidePropertyFilter={true}/>
            </div>
          </div>
        )}

        {/* ── RENT TAB ── */}
        {tab === 'rent' && (() => {
          if (rent === null) return (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading rent schedule…</div>
          );
          if (rent.length === 0) return (
            <div style={css.card}>
              <div style={{padding:'16px 0', textAlign:'center', color:T.text3, fontSize:F.sm}}>No rent schedule records found for this tenant.</div>
            </div>
          );

          const sqft = suite?.sqft || data.sqft;
          const toggleRentFilter = status => {
            setRentStatusFilter(prev => {
              const next = new Set(prev);
              if (status === 'All') return new Set(['All']);
              next.delete('All');
              if (next.has(status)) next.delete(status); else next.add(status);
              return next.size === 0 ? new Set(['All']) : next;
            });
          };
          const visibleRent = rent.filter(r =>
            rentStatusFilter.has('All') || rentStatusFilter.size === 0 || rentStatusFilter.has(r.rent_status)
          );
          const rentEndStyle = d => {
            const days = daysUntil(d);
            if (days === null) return {};
            if (days < 0)      return { color:'#fff', fontWeight:'700', background:'#7a0000', padding:'1px 5px', borderRadius:'3px', display:'inline-block' };
            if (days <= 30)    return { color:T.danger,  fontWeight:'700' };
            if (days <= 60)    return { color:'#d4924a', fontWeight:'700' };
            if (days <= 90)    return { color:'#f0d060', fontWeight:'700' };
            if (days <= 120)   return { color:T.success, fontWeight:'700' };
            return {};
          };
          const sum = col => visibleRent.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);

          return (
            <div>
              <div style={{display:'flex', gap:'4px', marginBottom:'10px', flexWrap:'wrap'}}>
                {['Current','Future','Past','All'].map(s => {
                  const active = rentStatusFilter.has(s);
                  return (
                    <button key={s} onClick={() => toggleRentFilter(s)}
                      style={{padding:'3px 9px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs,
                        border:`0.5px solid ${active ? T.accent : T.border}`,
                        background: active ? '#1a2e3a' : 'transparent',
                        color: active ? T.accent : T.text2, fontWeight: active ? '600' : '400'}}>
                      {s} <span style={{color:active ? T.accent : T.text3, fontSize:'10px'}}>·{s === 'All' ? rent.length : rent.filter(r => r.rent_status === s).length}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
                <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed', minWidth:'900px'}}>
                  <colgroup>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'8%'}}/>
                    <col style={{width:'8%'}}/>
                    <col style={{width:'8%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'8%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'7%'}}/>
                    <col style={{width:'auto'}}/>
                  </colgroup>
                  <thead style={{position:'sticky', top:0, zIndex:2}}>
                    <tr>
                      {['Status','Rent Start','Rent End','Base Rent','NNN','Other','CAMi','TPT Tax','Total','Base/SF','NNN/SF','Notes'].map(h => (
                        <th key={h} style={{...css.th, cursor:'default', textAlign: h==='Status'||h==='Notes' ? 'left' : 'right'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRent.length === 0 && (
                      <tr><td colSpan={12} style={{...css.td, textAlign:'center', padding:'24px', color:T.text3}}>No rows match filter</td></tr>
                    )}
                    {visibleRent.map((r, i) => {
                      const endStyle = rentEndStyle(r.rent_ends);
                      const bpsf = sqft && r.base_rent != null ? (Number(r.base_rent) / Number(sqft)).toFixed(2) : null;
                      const npsf = sqft && r.nnn != null        ? (Number(r.nnn)       / Number(sqft)).toFixed(2) : null;
                      return (
                        <tr key={r.id} style={{borderBottom:`0.5px solid ${T.border}`, background: i%2===0 ? 'transparent' : T.bg0}}>
                          <td style={css.td}><RentStatusBadge status={r.rent_status}/></td>
                          <td style={{...css.td, textAlign:'right', color:T.text1}}>{fmtNumDate(r.rent_starts) || '—'}</td>
                          <td style={{...css.td, textAlign:'right'}}><span style={endStyle}>{fmtNumDate(r.rent_ends) || '—'}</span></td>
                          <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(r.base_rent)}</td>
                          <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(r.nnn)}</td>
                          <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(r.other_amt)}</td>
                          <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(r.cam_impound)}</td>
                          <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(r.tpt_tax)}</td>
                          <td style={{...css.td, textAlign:'right', fontWeight:'500'}}>{fmtCurrency(r.total)}</td>
                          <td style={{...css.td, textAlign:'right', color:T.text2}}>{bpsf ? '$'+bpsf : '—'}</td>
                          <td style={{...css.td, textAlign:'right', color:T.text2}}>{npsf ? '$'+npsf : '—'}</td>
                          <td style={{...css.td, color:T.text2, fontSize:F.xs, whiteSpace:'normal', wordBreak:'break-word', maxWidth:'200px'}}>{r.notes || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {visibleRent.length > 0 && (
                    <tfoot>
                      <tr style={{borderTop:`1px solid ${T.border}`, background:T.bg2, fontWeight:'600'}}>
                        <td style={{...css.td, color:T.text1}} colSpan={3}>Totals</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(sum('base_rent'))}</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(sum('nnn'))}</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(sum('other_amt'))}</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(sum('cam_impound'))}</td>
                        <td style={{...css.td, textAlign:'right'}}>{fmtCurrency(sum('tpt_tax'))}</td>
                        <td style={{...css.td, textAlign:'right', fontWeight:'700'}}>{fmtCurrency(sum('total'))}</td>
                        <td style={css.td}/><td style={css.td}/><td style={css.td}/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── COIS TAB ── */}
        {tab === 'cois' && (
          cois === null ? (
            <div style={{padding:'32px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading COIs…</div>
          ) : cois.length === 0 ? (
            <div style={css.card}>
              <div style={{padding:'16px 0', textAlign:'center', color:T.text3, fontSize:F.sm}}>No COI records found for this tenant.</div>
            </div>
          ) : (
            <div>
              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
              <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed', minWidth:'480px'}}>
                <colgroup>
                  <col style={{width:'25%'}}/>
                  <col style={{width:'10%'}}/>
                  <col style={{width:'10%'}}/>
                  <col style={{width:'12%'}}/>
                  <col style={{width:'auto'}}/>
                </colgroup>
                <thead style={{position:'sticky', top:0, zIndex:2}}>
                  <tr>
                    {['Insured Company','Expiry','COI Status',"Add'l Insured",'Notes'].map(h => (
                      <th key={h} style={{...css.th, cursor:'default'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cois.map((c, i) => {
                    const exp  = daysUntil(c.expiry_date);
                    const expiredColor = exp !== null && exp < 0 ? T.danger : exp !== null && exp < 30 ? T.warn : T.text1;
                    const coiStatusColor = c.coi_status === 'Current' ? T.success : c.coi_status === 'Expired' ? T.danger : T.warn;
                    const coiStatusBg   = c.coi_status === 'Current' ? '#1e2a1e'  : c.coi_status === 'Expired' ? '#3d1f1f'  : 'rgba(212,146,74,0.15)';
                    const addlColor     = c.additional_insured_status === 'On File' ? T.success : T.warn;
                    const addlBg        = c.additional_insured_status === 'On File' ? '#1e2a1e' : 'rgba(212,146,74,0.15)';
                    return (
                      <tr key={c.id}
                        style={{borderBottom:`0.5px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : T.bg0}}>
                        <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{c.insured_company || ''}</td>
                        <td style={{...css.td, color:expiredColor, whiteSpace:'normal', wordBreak:'break-word'}}>{fmtNumDate(c.expiry_date) || '—'}</td>
                        <td style={css.td}>
                          {c.coi_status && <span style={css.badge(coiStatusColor, coiStatusBg)}>{c.coi_status}</span>}
                        </td>
                        <td style={css.td}>
                          {c.additional_insured_status && (
                            <span style={css.badge(addlColor, addlBg)}>{c.additional_insured_status}</span>
                          )}
                        </td>
                        <td style={{...css.td, color:T.text2, fontSize:F.xs, whiteSpace:'normal', wordBreak:'break-word'}}>{c.internal_notes || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab === 'activity' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px'}}>
            <div style={css.card}>
              <div style={css.secTitle}>Work Orders</div>
              <div style={{padding:'20px 0', textAlign:'center'}}>
                <div style={{fontSize:'28px', color:T.bg3, marginBottom:'6px'}}>🔧</div>
                <div style={{fontSize:F.sm, color:T.text3}}>Work orders filtered by tenant — coming in a future build.</div>
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>Issues</div>
              <div style={{padding:'20px 0', textAlign:'center'}}>
                <div style={{fontSize:'28px', color:T.bg3, marginBottom:'6px'}}>⚠️</div>
                <div style={{fontSize:F.sm, color:T.text3}}>Issues filtered by tenant — coming in a future build.</div>
              </div>
            </div>
          </div>
        )}

      </div>
      )}

      {/* ── COMMUNICATIONS TAB (full-height, no scroll wrapper) ── */}
      {tab === 'communications' && (
        <div style={{flex:1, overflow:'hidden'}}>
          <CommunicationTimeline
            recordType="tenant"
            recordId={data.id}
            fromAccount="scott@andersoncp.com"
            crmRecordLabel={data.tenant_dba || 'Tenant'}
            crmRecordUrl={`/tenants/${data.podio_id ?? 'X'+data.id.slice(-6)}`}
          />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TenantRentList — shared rent-roll table (source of truth for all contexts)
// Props: rows (rent_schedule+tenants join), loading, error, properties,
//        hidePropertyFilter, grossSqft, onRowClick(row)
// ─────────────────────────────────────────────────────────────────────────────
const generatePortfolioPDF = (rows, occupancy, propCode, vacantRows = []) => {
  const fmt = n => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '—';
  const fmtD = d => fmtDate(d);
  const fmtN = n => n != null && n !== '' ? Number(n).toLocaleString() : '—';
  const tableRows = rows.map(r => `
    <tr>
      <td>${r.tenant_dba||'—'}</td><td>${r.prop_code||'—'}</td><td>${r.suite_num||'—'}</td>
      <td style="text-align:right">${fmtN(r.sqft)}</td>
      <td style="text-align:right">${fmt(r.security_deposit)}</td>
      <td>${fmtD(r.lease_ends)}</td>
      <td style="text-align:right">${fmt(r.base_rent)}</td>
      <td style="text-align:right">${fmt(r.nnn)}</td>
      <td style="text-align:right">${fmt(r.other_amt)}</td>
      <td style="text-align:right">${fmt(r.cam_impound)}</td>
      <td style="text-align:right">${fmt(r.tpt_tax)}</td>
      <td style="text-align:right">${fmt(r.total)}</td>
      <td style="text-align:right">${r.base_per_sf?Number(r.base_per_sf).toFixed(2):'—'}</td>
      <td style="text-align:right">${r.nnn_per_sf?Number(r.nnn_per_sf).toFixed(2):'—'}</td>
    </tr>`).join('');
  const summaryParts = [
    `<span>Occupied: ${fmtN(occupancy.occupied_sf)} sf</span>`,
    occupancy.gross_sf>0 ? `<span>Vacant: ${fmtN(occupancy.vacant_sf)} sf</span>` : '',
    occupancy.gross_sf>0 ? `<span>Gross: ${fmtN(occupancy.gross_sf)} sf</span>` : '',
    occupancy.gross_sf>0 ? `<span>Occupancy: ${occupancy.occ_pct}%</span>` : '',
    `<span>Monthly Total: ${fmt(occupancy.monthly_total)}</span>`,
  ].filter(Boolean).join('');
  const vacantSection = vacantRows.length>0 ? `
    <h2 style="color:#E8630A;margin-top:24px;margin-bottom:6px;font-size:13px">${vacantRows.length} Vacant Suite${vacantRows.length===1?'':'s'} — ${fmtN(vacantRows.reduce((s,r)=>s+(Number(r.sqft)||0),0))} sf</h2>
    <table><thead><tr>
      <th style="text-align:left">Suite</th>
      <th style="text-align:right">Sq Ft</th>
      <th style="text-align:right">Asking Base/sf</th>
      <th style="text-align:right">Asking NNN/sf</th>
    </tr></thead><tbody>
      ${vacantRows.map(r=>`<tr>
        <td>${r.suite_num||'—'}</td>
        <td style="text-align:right">${fmtN(r.sqft)}</td>
        <td style="text-align:right">${r.asking_base_per_sf?'$'+Number(r.asking_base_per_sf).toFixed(2):'—'}</td>
        <td style="text-align:right">${r.asking_nnn_per_sf?'$'+Number(r.asking_nnn_per_sf).toFixed(2):'—'}</td>
      </tr>`).join('')}
    </tbody></table>` : '';
  const html = `<!DOCTYPE html><html><head><title>${propCode?propCode+' — Rent Roll':'Portfolio Rent Roll'}</title>
  <style>
    @page{size:landscape;margin:12mm}
    body{font-family:Arial,sans-serif;font-size:11px;margin:0}
    h2{font-size:15px;font-weight:700;color:#E8630A;margin:0 0 8px 0}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f7f0ea;padding:4px 8px;font-size:10px;text-align:left;border-bottom:1.5px solid #E8630A;white-space:nowrap}
    td{padding:4px 8px;border-bottom:0.5px solid #eee}
    tfoot td{background:#f7f0ea;font-weight:bold;border-top:1.5px solid #E8630A}
    .summary{margin-bottom:10px;font-size:11px;color:#E8630A;font-weight:600}
    .summary span{margin-right:20px}
  </style></head><body>
  <h2>${propCode?propCode+' — Rent Roll':'Portfolio Rent Roll — All Properties'}</h2>
  <div class="summary">${summaryParts}</div>
  <table><thead><tr>
    <th>Tenant DBA</th><th>Prop</th><th>Suite</th><th style="text-align:right">Sq Ft</th><th style="text-align:right">Security</th><th>Lease Ends</th>
    <th style="text-align:right">Base Rent</th><th style="text-align:right">NNN</th><th style="text-align:right">Other</th><th style="text-align:right">CAMi</th><th style="text-align:right">TPT Tax</th><th style="text-align:right">Total</th><th style="text-align:right">Base/sf</th><th style="text-align:right">NNN/sf</th>
  </tr></thead><tbody>${tableRows}</tbody>
  <tfoot><tr>
    <td colspan="6">TOTALS (${rows.length} tenants)</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.base_rent)||0),0))}</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.nnn)||0),0))}</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.other_amt)||0),0))}</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.cam_impound)||0),0))}</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0))}</td>
    <td style="text-align:right">${fmt(rows.reduce((s,r)=>s+(Number(r.total)||0),0))}</td>
    <td colspan="2"></td>
  </tr></tfoot></table>
  ${vacantSection}
  </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

export const TenantRentList = ({
  rows = [], loading = false, error = null, properties = [],
  hidePropertyFilter = false, grossSqft, onRowClick, onGeneratePDF,
}) => {
  const [propFilter,   setPropFilter]   = useState([]);
  const [statusFilter, setStatusFilter] = useState('Active');
  const [search,       setSearch]       = useState('');
  const [sortCol,      setSortCol]      = useState('suite_num');
  const [sortDir,      setSortDir]      = useState('asc');

  const calcMo = endDate => {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    return (end - new Date()) / (1000*60*60*24*30.44);
  };
  const moColor = mo => {
    if (mo === null || mo < 0) return T.text3;
    if (mo <= 3)  return T.danger;
    if (mo <= 12) return T.warn;
    return T.success;
  };

  const activePropCodes = useMemo(() => properties.map(p => p.prop_code), [properties]);

  const toggleProp = code => {
    if (code === 'All') { setPropFilter([]); return; }
    setPropFilter(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const sorted = useMemo(() => {
    const numeric = ['sqft','security_deposit','base_rent','nnn','other_amt','cam_impound','tpt_tax','total','base_per_sf','nnn_per_sf'];
    return [...rows].sort((a, b) => {
      const av = numeric.includes(sortCol) ? (Number(a[sortCol])||0) : String(a[sortCol]??'');
      const bv = numeric.includes(sortCol) ? (Number(b[sortCol])||0) : String(b[sortCol]??'');
      const cmp = typeof av === 'number' ? av - bv : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const matchesSearch = r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.tenant_dba||'').toLowerCase().includes(q) ||
           (r.suite_num  ||'').toLowerCase().includes(q) ||
           (r.prop_code  ||'').toLowerCase().includes(q);
  };

  const filtered = useMemo(() => sorted.filter(r => {
    if (propFilter.length > 0 && !propFilter.includes(r.prop_code)) return false;
    const ts = r.tenants?.tenant_status || '';
    if (statusFilter !== 'All' && ts !== statusFilter) return false;
    return matchesSearch(r);
  }), [sorted, propFilter, statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusCounts = useMemo(() => {
    const base = sorted.filter(r => {
      if (propFilter.length > 0 && !propFilter.includes(r.prop_code)) return false;
      return matchesSearch(r);
    });
    const c = { All: base.length };
    TENANT_STATUS_OPTIONS.forEach(s => { c[s] = base.filter(r => (r.tenants?.tenant_status||'') === s).length; });
    return c;
  }, [sorted, propFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const occupancy = useMemo(() => {
    const occupied_sf   = filtered.reduce((s,r) => s+(Number(r.sqft)||0), 0);
    const gross_sf      = grossSqft != null ? Number(grossSqft) : properties.reduce((s,p) => s+(Number(p.gross_sqft)||0), 0);
    const vacant_sf     = Math.max(0, gross_sf - occupied_sf);
    const occ_pct       = gross_sf > 0 ? Math.round(occupied_sf/gross_sf*100) : 0;
    const monthly_total = filtered.reduce((s,r) => s+(Number(r.total)||0), 0);
    return { occupied_sf, vacant_sf, gross_sf, occ_pct, vacancy_pct: 100-occ_pct, monthly_total };
  }, [filtered, grossSqft, properties]);

  const hasActiveFilters = propFilter.length > 0 || statusFilter !== 'Active' || search !== '';
  const clearFilters = () => { setPropFilter([]); setStatusFilter('Active'); setSearch(''); };

  const toggleSort = col => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const Th = ({ col, label, align='left' }) => (
    <th style={{...css.th, textAlign:align}} onClick={() => toggleSort(col)}>
      {label}
      {sortCol===col ? <span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>
                     : <span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const propBtnStyle = active => ({
    padding:'3px 7px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs, whiteSpace:'nowrap', flexShrink:0,
    border:`0.5px solid ${active ? T.accent : T.border}`,
    background: active ? T.accent : 'transparent',
    color: active ? '#fff' : T.text2, fontWeight: active ? '600' : '400',
  });

  const colSpan = hidePropertyFilter ? 13 : 14;
  const propMap = Object.fromEntries(properties.map(p => [p.prop_code, p.property_name || '']));
  const groups  = propFilter.length > 0
    ? [...propFilter].sort().map(pc => ({
        prop_code: pc,
        property_name: propMap[pc] || '',
        rows: filtered.filter(r => r.prop_code === pc),
      })).filter(g => g.rows.length > 0)
    : null;

  const renderRow = (r, i) => {
    const mo      = calcMo(r.lease_ends);
    const rowBg   = i % 2 === 0 ? 'transparent' : T.bg0;
    const podioId = r.tenants?.podio_id;
    const href    = podioId ? `/tenants/${podioId}` : undefined;
    return (
      <tr key={r.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e => {
          if (e.target.closest('a')) return;
          if ((e.ctrlKey||e.metaKey) && href) window.open(href,'_blank');
          else if (onRowClick) onRowClick(r);
        }}>
        <td style={css.td}>
          {href ? (
            <a href={href}
              onClick={e => { if (!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0) { e.preventDefault(); onRowClick?.(r); } }}
              style={{color:T.accent,textDecoration:'none',fontWeight:'500'}}>
              {r.tenant_dba||'—'}
            </a>
          ) : (r.tenant_dba||'—')}
        </td>
        {!hidePropertyFilter && <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{r.prop_code||'—'}</td>}
        <td style={css.td}>{r.suite_num||'—'}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtNum(r.sqft)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.security_deposit)}</td>
        <td style={{...css.td,color:moColor(mo),fontWeight:mo!==null&&mo<=12?'600':'400'}}>{fmtDate(r.lease_ends)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.base_rent)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.nnn)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.other_amt)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.cam_impound)}</td>
        <td style={{...css.td,textAlign:'right'}}>{fmtCurrency(r.tpt_tax)}</td>
        <td style={{...css.td,textAlign:'right',fontWeight:'600',color:T.text0}}>{fmtCurrency(r.total)}</td>
        <td style={{...css.td,textAlign:'right'}}>{r.base_per_sf?Number(r.base_per_sf).toFixed(2):'—'}</td>
        <td style={{...css.td,textAlign:'right'}}>{r.nnn_per_sf?Number(r.nnn_per_sf).toFixed(2):'—'}</td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <Storefront size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Tenants</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>
        {!hidePropertyFilter && (
          <div style={{display:'flex',gap:'4px',overflowX:'auto',scrollbarWidth:'none',marginBottom:'5px'}}>
            <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length===0)}>All</button>
            {activePropCodes.map(pc => (
              <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All',...TENANT_STATUS_OPTIONS].map(s => {
              const cnt = statusCounts[s] ?? 0;
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{padding:'3px 7px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',color:active?T.text0:T.text2,fontWeight:active?'600':'400',
                    display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {s}<span style={{color:active?T.text1:T.text3,fontSize:'10px'}}>·{cnt}</span>
                </button>
              );
            })}
          </div>
          <button onClick={clearFilters}
            style={{padding:'3px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
              border:`0.5px solid ${hasActiveFilters?T.warn:T.border}`,background:'transparent',
              color:hasActiveFilters?T.warn:T.text3,display:'flex',alignItems:'center',gap:'3px',
              transition:'all 0.15s',visibility:hasActiveFilters?'visible':'hidden'}}>
            <span style={{fontSize:'12px'}}>×</span> Clear
          </button>
          <div style={{marginLeft:'auto',position:'relative',display:'flex',alignItems:'center',flexShrink:0}}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>×</button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{width:'220px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',
                padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}/>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && !error && (
        <div style={{borderBottom:`0.5px solid ${T.border}`,background:T.bg1,flexShrink:0}}>
          {/* Mobile: horizontal-scrolling pill row */}
          <div className="stats-pill-row md-hidden" style={{padding:'6px 14px 2px'}}>
            <div className="stat-pill">
              <span className="stat-label">Occupied</span>
              <span className="stat-value" style={{color:T.success}}>{fmtNum(occupancy.occupied_sf)} sf</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Vacant</span>
              <span className="stat-value">{fmtNum(occupancy.vacant_sf)} sf</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Gross</span>
              <span className="stat-value">{fmtNum(occupancy.gross_sf)} sf</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Occupancy</span>
              <span className="stat-value" style={{color:occupancy.occ_pct>=90?T.success:occupancy.occ_pct>=70?T.warn:T.danger}}>{occupancy.occ_pct}%</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Vacancy</span>
              <span className="stat-value">{occupancy.vacancy_pct}%</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Mo. Total</span>
              <span className="stat-value" style={{color:T.accent}}>{fmtCurrency(occupancy.monthly_total)}</span>
            </div>
          </div>
          {/* Desktop: existing card grid */}
          <div className="mobile-hidden" style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',flexWrap:'wrap'}}>
            {[
              ['Occupied',     `${fmtNum(occupancy.occupied_sf)} sf`,   T.success],
              ['Vacant',       `${fmtNum(occupancy.vacant_sf)} sf`,     T.text2],
              ['Gross',        `${fmtNum(occupancy.gross_sf)} sf`,      T.text1],
              ['Occupancy',    `${occupancy.occ_pct}%`,                 occupancy.occ_pct>=90?T.success:occupancy.occ_pct>=70?T.warn:T.danger],
              ['Vacancy',      `${occupancy.vacancy_pct}%`,             T.text2],
              ['Monthly Total', fmtCurrency(occupancy.monthly_total),   T.accent],
            ].map(([label,val,color]) => (
              <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'6px 12px',minWidth:'90px'}}>
                <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
                <div style={{fontSize:F.md,fontWeight:'600',color,marginTop:'2px'}}>{val}</div>
              </div>
            ))}
            <button
              onClick={() => onGeneratePDF ? onGeneratePDF() : generatePortfolioPDF(filtered, occupancy)}
              style={{marginLeft:'auto',background:T.accent,border:'none',borderRadius:'5px',
                padding:'6px 14px',color:'#fff',fontSize:F.sm,cursor:'pointer',flexShrink:0,
                transition:'filter 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.9)';}}
              onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
              Rent Roll PDF
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading tenants…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                <Th col="tenant_dba"      label="Tenant DBA"/>
                {!hidePropertyFilter && <Th col="prop_code" label="Prop"/>}
                <Th col="suite_num"       label="Suite"/>
                <Th col="sqft"            label="Sq Ft"     align="right"/>
                <Th col="security_deposit" label="Security" align="right"/>
                <Th col="lease_ends"      label="Lease Ends"/>
                <Th col="base_rent"       label="Base Rent" align="right"/>
                <Th col="nnn"             label="NNN"       align="right"/>
                <Th col="other_amt"       label="Other"     align="right"/>
                <Th col="cam_impound"     label="CAMi"      align="right"/>
                <Th col="tpt_tax"         label="TPT Tax"   align="right"/>
                <Th col="total"           label="Total"     align="right"/>
                <Th col="base_per_sf"     label="Base/sf"   align="right"/>
                <Th col="nnn_per_sf"      label="NNN/sf"    align="right"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={colSpan} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No current rent schedule rows match filters</td></tr>
              )}
              {groups
                ? groups.map(g => (
                    <React.Fragment key={g.prop_code}>
                      <tr style={{background:T.bg3, position:'sticky', top:'28px', zIndex:1}}>
                        <td colSpan={colSpan} style={{...css.td, color:T.accent, fontWeight:'600', padding:'4px 10px', fontSize:F.xs, textTransform:'uppercase', letterSpacing:'0.07em'}}>
                          {g.prop_code}{g.property_name ? ` — ${g.property_name}` : ''} <span style={{color:T.text3, fontWeight:'400'}}>· {g.rows.length} tenant{g.rows.length !== 1 ? 's' : ''}</span>
                        </td>
                      </tr>
                      {g.rows.map((r, i) => renderRow(r, i))}
                    </React.Fragment>
                  ))
                : filtered.map((r, i) => renderRow(r, i))
              }
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={hidePropertyFilter?2:3} style={{...css.th,background:T.bg3,color:T.text2}}>TOTALS</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtNum(filtered.reduce((s,r)=>s+(Number(r.sqft)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.security_deposit)||0),0))}</td>
                  <td style={{...css.th,background:T.bg3}}></td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.base_rent)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.nnn)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.other_amt)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.cam_impound)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0))}</td>
                  <td style={{...css.th,textAlign:'right',background:T.bg3,color:T.text0,fontWeight:'700'}}>{fmtCurrency(filtered.reduce((s,r)=>s+(Number(r.total)||0),0))}</td>
                  <td colSpan={2} style={{...css.th,background:T.bg3}}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export — routed /tenants page
// ─────────────────────────────────────────────────────────────────────────────
export default function TenantsView() {
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('tenants', 'select=*&order=tenant_dba.asc')
      .then(d => { setTenants(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = t => {
    try { sessionStorage.setItem('tenantsBackUrl', window.location.href); } catch {}
    router.push('/tenants/' + (t.podio_id ?? 'X' + t.id.slice(-6)));
  };

  return (
    <TenantsList
      tenants={tenants}
      loading={loading}
      error={error}
      onSelect={handleSelect}
    />
  );
}
