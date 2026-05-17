// ─────────────────────────────────────────────────────────────────────────────
// RentScheduleView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
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

const fmtNumDate = d => {
  if (!d) return '';
  const date = new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(date.getTime())) return '';
  const m   = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${m}-${day}-${date.getFullYear()}`;
};

export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

const fmtCurrency = v => {
  if (v == null || v === '') return '';
  return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isInRange = (dateVal, range) => {
  if (!dateVal || !range) return false;
  const d = new Date(typeof dateVal === 'string' && dateVal.length === 10
    ? dateVal + 'T00:00:00' : dateVal);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'week')  { const w = new Date(now); w.setDate(w.getDate()-7); return d >= w; }
  if (range === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  if (range === 'year')  return d.getFullYear()===now.getFullYear();
  return false;
};

const calcMoLeft = endDate => {
  if (!endDate) return null;
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(end.getTime())) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((end - now) / (1000 * 60 * 60 * 24 * 30.44));
};

const moLeftColor = mo => {
  if (mo === null || mo < 0) return T.text3;
  if (mo <= 3)  return T.danger;
  if (mo <= 12) return T.warn;
  return T.success;
};

const RentStatusBadge = ({ status }) => {
  const map = {
    current:  [T.success, '#1e2a1e'],
    future:   [T.accent,  '#1a2e3a'],
    proposed: [T.purple,  '#2a1f3a'],
    past:     [T.text2,   T.bg3],
    dead:     [T.danger,  '#3d1f1f'],
    archived: [T.text3,   T.bg3],
  };
  const [color, bg] = map[(status||'').toLowerCase()] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status||'—'}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// More... popover — date filters: Start Date / End Date / Updated
// ─────────────────────────────────────────────────────────────────────────────
const MorePopover = ({ open, onClose, anchorRef, dateFilters, setDateFilters }) => {
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

  const toggleDate = (row, period) => {
    setDateFilters(prev => {
      const isActive = prev[row] === period;
      if (isActive) return { starts: null, ends: null, updated: null };
      return { starts: null, ends: null, updated: null, [row]: period };
    });
  };

  const dateRows = [
    { key: 'starts',  label: 'Start Date' },
    { key: 'ends',    label: 'End Date'   },
    { key: 'updated', label: 'Updated'    },
  ];
  const periods = [
    { key: 'week',  label: 'This Week'  },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year'  },
  ];

  const filterBtnStyle = active => ({
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
      padding:'10px 12px', minWidth:'280px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      {dateRows.map(({ key, label }, idx) => (
        <div key={key} style={{marginBottom: idx < dateRows.length - 1 ? 10 : 0}}>
          <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px',fontWeight:'600'}}>{label}</div>
          <div style={{display:'flex',gap:'4px'}}>
            {periods.map(({ key:pk, label:pl }) => (
              <button key={pk} onClick={() => toggleDate(key, pk)} style={filterBtnStyle(dateFilters[key] === pk)}>
                {pl}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RentScheduleList
// ─────────────────────────────────────────────────────────────────────────────
const RentScheduleList = ({ rows, loading, error, onSelect }) => {
  const [expiryFilter, setExpiryFilter] = useState('All');
  const [propFilter, setPropFilter]     = useState([]);
  const [search, setSearch]             = useState('');
  const [activeProps, setActiveProps]   = useState([]);
  const [sortCol, setSortCol]           = useState('prop_code');
  const [sortDir, setSortDir]           = useState('asc');
  const [dateFilters, setDateFilters]   = useState({ starts: null, ends: null, updated: null });
  const [moreOpen, setMoreOpen]         = useState(false);
  const moreAnchorRef = useRef(null);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Rent Schedule | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, []);

  const toggleProp = code => {
    if (code === 'All') { setPropFilter([]); return; }
    setPropFilter(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const matchesExpiry = (row, filter) => {
    if (filter === 'All') return true;
    const ml = calcMoLeft(row.rent_ends);
    if (filter === 'Expiring 3mo')  return ml !== null && ml >= 0 && ml <= 3;
    if (filter === 'Expiring 12mo') return ml !== null && ml >= 0 && ml <= 12;
    if (filter === 'Expired')       return ml === null || ml < 0;
    return true;
  };

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    let av, bv;
    if (sortCol === 'tenant_dba') {
      av = a.tenants?.tenant_dba ?? '';
      bv = b.tenants?.tenant_dba ?? '';
    } else if (sortCol === 'lease_type') {
      av = a.tenants?.lease_type ?? '';
      bv = b.tenants?.lease_type ?? '';
    } else {
      av = a[sortCol] ?? '';
      bv = b[sortCol] ?? '';
    }
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [rows, sortCol, sortDir]);

  const filtered = useMemo(() => sorted.filter(row => {
    if (!matchesExpiry(row, expiryFilter)) return false;
    if (propFilter.length > 0 && !propFilter.includes(row.prop_code)) return false;
    if (dateFilters.starts  && !isInRange(row.rent_starts, dateFilters.starts))  return false;
    if (dateFilters.ends    && !isInRange(row.rent_ends,   dateFilters.ends))    return false;
    if (dateFilters.updated && !isInRange(row.updated_at,  dateFilters.updated)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (row.prop_code||'').toLowerCase().includes(q) ||
        (row.suite_num||'').toLowerCase().includes(q) ||
        (row.tenants?.tenant_dba||'').toLowerCase().includes(q)
      );
    }
    return true;
  }), [sorted, expiryFilter, propFilter, dateFilters, search]);

  const hasActiveDateFilter = !!(dateFilters.starts || dateFilters.ends || dateFilters.updated);
  const hasMoreActive       = hasActiveDateFilter;
  const hasActiveFilters    = propFilter.length > 0 || expiryFilter !== 'All' || search !== '' || hasActiveDateFilter;

  const clearFilters = () => {
    setExpiryFilter('All'); setPropFilter([]); setSearch('');
    setDateFilters({ starts: null, ends: null, updated: null });
  };

  const propBtnStyle = active => ({
    padding:'3px 7px', borderRadius:'4px', cursor:'pointer', fontSize:F.xs, whiteSpace:'nowrap', flexShrink:0,
    border:`0.5px solid ${active ? T.accent : T.border}`,
    background: active ? T.accent : 'transparent',
    color: active ? '#fff' : T.text2,
    fontWeight: active ? '600' : '400',
  });

  const renderTh = (c, label, extraStyle={}) => (
    <th key={c} style={{...css.th, ...extraStyle}} onClick={() => toggleSort(c)}>
      {label}{sortCol === c
        ? <span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>
        : <span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const renderRow = (row, i) => {
    const moLeft = calcMoLeft(row.rent_ends);
    const rowBg  = i % 2 === 0 ? 'transparent' : T.bg0;
    const annual = row.base_rent != null ? Number(row.base_rent) * 12 : null;

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/rent-schedule/${row.id}`, '_blank');
        if (tab) tab.focus();
      } else {
        onSelect(row);
      }
    };

    return (
      <tr key={row.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={openDetail}>
        <td style={{...css.td,color:T.accent,fontWeight:'600',fontSize:F.xs}}>{row.prop_code||''}</td>
        <td style={css.td}>{row.suite_num||''}</td>
        <td style={{...css.td,color:T.text1}} title={row.tenants?.tenant_dba}>{row.tenants?.tenant_dba||''}</td>
        <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{row.tenants?.lease_type||''}</td>
        <td style={{...css.td,textAlign:'right',fontVariantNumeric:'tabular-nums',color:T.text0}}>{fmtCurrency(row.base_rent)}</td>
        <td style={{...css.td,textAlign:'right',fontVariantNumeric:'tabular-nums',color:T.text2}}>{fmtCurrency(annual)}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{fmtNumDate(row.rent_starts)}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{fmtNumDate(row.rent_ends)}</td>
        <td style={{...css.td,textAlign:'center',fontWeight:'600',color:moLeftColor(moLeft),fontSize:F.xs}}>
          {moLeft === null ? '—' : moLeft < 0 ? 'Exp' : String(moLeft)}
        </td>
        <td style={{...css.td,minWidth:'72px',overflow:'visible'}}>
          <RentStatusBadge status={row.rent_status}/>
        </td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Rent Schedule</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Row 1: Property strip */}
        <div style={{display:'flex',gap:'4px',overflowX:'auto',scrollbarWidth:'none',marginBottom:'5px'}}>
          <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
          {activeProps.map(pc => (
            <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
          ))}
        </div>

        {/* Row 2: Expiry | More... | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>

          {/* Expiry quick filter */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All','Expiring 3mo','Expiring 12mo','Expired'].map(f => (
              <button key={f} onClick={() => setExpiryFilter(f)}
                style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                  background:expiryFilter===f?T.bg3:'transparent',
                  color:expiryFilter===f?T.text0:T.text2,
                  fontWeight:expiryFilter===f?'600':'400',whiteSpace:'nowrap'}}>
                {f}
              </button>
            ))}
          </div>

          {/* More... */}
          <div style={{position:'relative',flexShrink:0}} ref={moreAnchorRef}>
            <button onClick={() => setMoreOpen(o => !o)}
              style={{padding:'3px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                border:`0.5px solid ${hasMoreActive ? T.warn : T.border}`,
                background: moreOpen ? T.bg3 : 'transparent',
                color: hasMoreActive ? T.warn : T.text1,
                display:'flex',alignItems:'center',gap:'5px'}}>
              More…
              {hasMoreActive && <span style={{width:'5px',height:'5px',borderRadius:'50%',background:T.warn,flexShrink:0,display:'inline-block'}}/>}
            </button>
            <MorePopover
              open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreAnchorRef}
              dateFilters={dateFilters} setDateFilters={setDateFilters}
            />
          </div>

          {/* Clear Filters */}
          <button onClick={clearFilters}
            style={{
              padding:'3px 9px', borderRadius:'5px', cursor:'pointer', fontSize:F.xs,
              border:`0.5px solid ${hasActiveFilters ? T.warn : T.border}`,
              background:'transparent',
              color: hasActiveFilters ? T.warn : T.text3,
              display:'flex', alignItems:'center', gap:'3px',
              transition:'all 0.15s',
              visibility: hasActiveFilters ? 'visible' : 'hidden',
            }}>
            <span style={{fontSize:'12px'}}>×</span> Clear
          </button>

          {/* Search */}
          <div style={{marginLeft:'auto',position:'relative',display:'flex',alignItems:'center',flexShrink:0}}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>
                ×
              </button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{width:'180px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading rent schedule…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'58px'}}/>
              <col style={{width:'64px'}}/>
              <col style={{width:'auto'}}/>
              <col style={{width:'56px'}}/>
              <col style={{width:'94px'}}/>
              <col style={{width:'94px'}}/>
              <col style={{width:'82px'}}/>
              <col style={{width:'82px'}}/>
              <col style={{width:'62px'}}/>
              <col style={{width:'76px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('prop_code',   'Prop')}
                {renderTh('suite_num',   'Suite')}
                {renderTh('tenant_dba',  'Tenant')}
                {renderTh('lease_type',  'Type')}
                <th style={{...css.th,textAlign:'right',cursor:'default'}}>Monthly</th>
                <th style={{...css.th,textAlign:'right',cursor:'default'}}>Annual</th>
                {renderTh('rent_starts', 'Start')}
                {renderTh('rent_ends',   'End')}
                {renderTh('rent_ends',   'Mo. Left', {textAlign:'center'})}
                <th style={{...css.th,cursor:'default'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No records match filters</td></tr>
              )}
              {filtered.map((row, i) => renderRow(row, i))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RentScheduleDetail — placeholder detail view
// ─────────────────────────────────────────────────────────────────────────────
export const RentScheduleDetail = ({ row, onBack }) => {
  useEffect(() => {
    const label = `${row.prop_code||''} – ${row.tenants?.tenant_dba||'Rent Record'}`;
    document.title = `${label} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [row]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const field = (label, value) => (
    <div style={{marginBottom:'10px'}}>
      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{label}</div>
      <div style={{fontSize:F.base,color:value?T.text0:T.text3,padding:'3px 5px'}}>{value||'—'}</div>
    </div>
  );

  const moLeft   = calcMoLeft(row.rent_ends);
  const annual   = row.base_rent != null ? Number(row.base_rent) * 12 : null;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Rent Schedule
          </button>
          <span style={{color:T.accent,fontWeight:'600',fontSize:F.sm}}>{row.prop_code||'—'}</span>
          {row.suite_num && <span style={{color:T.text2,fontSize:F.sm}}>Suite {row.suite_num}</span>}
          <span style={{marginLeft:'auto'}}>
            <RentStatusBadge status={row.rent_status}/>
          </span>
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{row.tenants?.tenant_dba||'Unnamed Tenant'}</div>
        <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>
          {row.tenants?.lease_type || 'Lease'} · {row.prop_code} {row.suite_num ? `· Suite ${row.suite_num}` : ''}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px',background:T.bg1}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',maxWidth:'900px'}}>
          <div style={css.card}>
            <div style={css.secTitle}>Rent Details</div>
            {field('Prop Code',  row.prop_code)}
            {field('Suite',      row.suite_num)}
            {field('Tenant',     row.tenants?.tenant_dba)}
            {field('Lease Type', row.tenants?.lease_type)}
            {field('Status',     row.rent_status)}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Financials</div>
            {field('Monthly Rent', fmtCurrency(row.base_rent))}
            {field('Annual Rent',  fmtCurrency(annual))}
            {field('NNN',          fmtCurrency(row.nnn))}
            {field('CAM Impound',  fmtCurrency(row.cam_impound))}
            {field('TPT Tax',      fmtCurrency(row.tpt_tax))}
            {field('Total',        fmtCurrency(row.total))}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Term</div>
            {field('Rent Start', fmtDate(row.rent_starts))}
            {field('Rent End',   fmtDate(row.rent_ends))}
            <div style={{marginBottom:'10px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Mo. Left</div>
              <div style={{fontSize:F.md,fontWeight:'700',color:moLeftColor(moLeft),padding:'3px 5px'}}>
                {moLeft === null ? '—' : moLeft < 0 ? 'Expired' : `${moLeft} months`}
              </div>
            </div>
            {field('Lease Start', fmtDate(row.lease_starts))}
            {field('Lease End',   fmtDate(row.lease_ends))}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Additional</div>
            {field('Sq Ft',         row.sqft ? row.sqft.toLocaleString() : null)}
            {field('Amendment #',   row.amendment_num != null ? String(row.amendment_num) : null)}
            {field('Base / SF',     row.base_per_sf ? `$${Number(row.base_per_sf).toFixed(2)}` : null)}
            {field('NNN / SF',      row.nnn_per_sf  ? `$${Number(row.nnn_per_sf).toFixed(2)}`  : null)}
            {field('CPI Adjusted',  row.cpi_adjusted ? 'Yes' : 'No')}
            {field('TPT Exempt',    row.tpt_tax_exempt ? 'Yes' : 'No')}
          </div>
          {row.notes && (
            <div style={{...css.card,gridColumn:'1 / -1'}}>
              <div style={css.secTitle}>Notes</div>
              <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.5',whiteSpace:'pre-wrap'}}>{row.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function RentScheduleView() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('rent_schedule',
      'select=*,tenants!rent_schedule_tenant_id_fkey(tenant_dba,lease_type)&order=prop_code.asc,suite_num.asc'
    )
      .then(data => { setRows(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = useCallback((row) => {
    history.pushState({ rentId: row.id }, '');
    setSelected(row);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.rentId) history.replaceState({}, '');
    setSelected(null);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <RentScheduleList rows={rows} loading={loading} error={error} onSelect={handleSelect}/>
      </div>
      {selected && (
        <RentScheduleDetail
          key={selected.id}
          row={selected}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
