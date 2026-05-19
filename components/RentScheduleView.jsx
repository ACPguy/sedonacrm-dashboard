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

const NCOLS = 14;

const STATUS_RANK = { Current: 0, Future: 1, Proposed: 2, Past: 3, Dead: 4, Archived: 5 };
const DEFAULT_STATUSES = ['Current', 'Future'];

const fmtNumDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

export const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

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
// More... popover — Past toggle + date filters
// ─────────────────────────────────────────────────────────────────────────────
const MorePopover = ({ open, onClose, anchorRef, statusFilters, toggleStatus, dateFilters, setDateFilters }) => {
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

  const pastActive = statusFilters.includes('Past');

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:200,
      background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px',
      padding:'10px 12px', minWidth:'280px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      {/* Past toggle */}
      <div style={{marginBottom:'10px'}}>
        <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px',fontWeight:'600'}}>Include</div>
        <button onClick={() => toggleStatus('Past')} style={filterBtnStyle(pastActive)}>
          Past
        </button>
      </div>

      <div style={{borderTop:`0.5px solid ${T.border}`,margin:'8px 0 10px'}}/>

      {/* Date filters */}
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
  const [statusFilters, setStatusFilters] = useState([...DEFAULT_STATUSES]);
  const [propFilter, setPropFilter]       = useState([]);
  const [search, setSearch]               = useState('');
  const [activeProps, setActiveProps]     = useState([]);
  const [sortCol, setSortCol]             = useState('default');
  const [sortDir, setSortDir]             = useState('asc');
  const [dateFilters, setDateFilters]     = useState({ starts: null, ends: null, updated: null });
  const [moreOpen, setMoreOpen]           = useState(false);
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

  const toggleStatus = s => {
    if (s === 'All') { setStatusFilters([]); return; }
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sortCol === 'default') {
      const ra = STATUS_RANK[a.rent_status] ?? 99;
      const rb = STATUS_RANK[b.rent_status] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.prop_code||'').localeCompare(b.prop_code||'');
    }
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
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    // Tiebreaker: status rank → prop_code
    const ra = STATUS_RANK[a.rent_status] ?? 99;
    const rb = STATUS_RANK[b.rent_status] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.prop_code||'').localeCompare(b.prop_code||'');
  }), [rows, sortCol, sortDir]);

  const filtered = useMemo(() => sorted.filter(row => {
    const allActive = statusFilters.length === 0;
    if (!allActive && !statusFilters.includes(row.rent_status)) return false;
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
  }), [sorted, statusFilters, propFilter, dateFilters, search]);

  const isDefaultStatus = statusFilters.length === 2 &&
    statusFilters.includes('Current') && statusFilters.includes('Future');
  const hasActiveDateFilter = !!(dateFilters.starts || dateFilters.ends || dateFilters.updated);
  const hasMoreActive       = statusFilters.includes('Past') || hasActiveDateFilter;
  const hasActiveFilters    = propFilter.length > 0 || !isDefaultStatus || search !== '' || hasActiveDateFilter;

  const grouped = useMemo(() => propFilter.length >= 1
    ? [...propFilter].sort()
        .map(pc => ({
          prop_code: pc,
          rows: filtered.filter(r => r.prop_code === pc),
        }))
        .filter(g => g.rows.length > 0)
    : null
  , [filtered, propFilter]);

  const clearFilters = () => {
    setStatusFilters([...DEFAULT_STATUSES]);
    setPropFilter([]);
    setSearch('');
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

  const tdR = { ...css.td, textAlign:'right', fontVariantNumeric:'tabular-nums' };

  const isEndingSoon = row => {
    if (!row.rent_ends || row.rent_status === 'Past') return false;
    const end = new Date(row.rent_ends + 'T00:00:00');
    if (isNaN(end.getTime())) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const renderRow = (row, i) => {
    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
    const endSoon = isEndingSoon(row);

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/rent-schedule/${row.podio_id ?? 'X'+row.id.slice(-6)}`, '_blank');
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
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td,color:T.accent,fontWeight:'600',fontSize:F.xs}}>{row.prop_code||''}</td>
        <td style={{...css.td,color:T.text1}} title={row.tenants?.tenant_dba}>
          <a href={`/rent-schedule/${row.podio_id ?? 'X'+row.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(row);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {row.tenants?.tenant_dba||''}
          </a>
        </td>
        <td style={{...css.td, whiteSpace:'normal', wordBreak:'break-word'}}>{row.suite_num||''}</td>
        <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{row.tenants?.lease_type||''}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{fmtNumDate(row.rent_starts)}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs,
          ...(endSoon ? {color:'#f87171',fontWeight:'700'} : {})}}>
          {fmtNumDate(row.rent_ends)}
        </td>
        <td style={{...css.td,overflow:'visible'}}><RentStatusBadge status={row.rent_status}/></td>
        <td style={{...css.td,fontSize:F.xs,color:T.text2,textAlign:'center'}}>
          {row.cpi_adjusted ? <span style={css.badge(T.purple,'#2a1f3a')}>CPI</span> : '—'}
        </td>
        <td style={{...tdR,color:T.text0}}>{fmtCurrency(row.base_rent)}</td>
        <td style={{...tdR,color:T.text2}}>{fmtCurrency(row.nnn)}</td>
        <td style={{...tdR,color:T.text2}}>{fmtCurrency(row.other_amt)}</td>
        <td style={{...tdR,color:T.text2}}>{fmtCurrency(row.cam_impound)}</td>
        <td style={{...tdR,color:T.text2}}>{fmtCurrency(row.tpt_tax)}</td>
        <td style={{...tdR,color:T.text0,fontWeight:'600'}}>{fmtCurrency(row.total)}</td>
      </tr>
    );
  };

  const allActive = statusFilters.length === 0;

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

        {/* Row 2: Status | More... | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>

          {/* Status filter — multi-select: Current | Future | All */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['Current','Future','All'].map(s => {
              const active = s === 'All' ? allActive : statusFilters.includes(s);
              return (
                <button key={s} onClick={() => toggleStatus(s)}
                  style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',whiteSpace:'nowrap'}}>
                  {s}
                </button>
              );
            })}
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
              statusFilters={statusFilters} toggleStatus={toggleStatus}
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
              {/* Prop      */} <col style={{width:'5%'}}/>
              {/* Tenant    */} <col style={{width:'15%'}}/>
              {/* Suite     */} <col style={{width:'4%'}}/>
              {/* Type      */} <col style={{width:'5%'}}/>
              {/* Start     */} <col style={{width:'6%'}}/>
              {/* End       */} <col style={{width:'6%'}}/>
              {/* Status    */} <col style={{width:'7%'}}/>
              {/* CPI       */} <col style={{width:'4%'}}/>
              {/* Base Rent */} <col style={{width:'8%'}}/>
              {/* NNN       */} <col style={{width:'7%'}}/>
              {/* Other     */} <col style={{width:'7%'}}/>
              {/* CAMi      */} <col style={{width:'7%'}}/>
              {/* TPT Tax   */} <col style={{width:'7%'}}/>
              {/* Total     */} <col style={{width:'8%'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('prop_code',    'Prop')}
                {renderTh('tenant_dba',   'Tenant')}
                {renderTh('suite_num',    'Suite')}
                {renderTh('lease_type',   'Type')}
                {renderTh('rent_starts',  'Start')}
                {renderTh('rent_ends',    'End')}
                {renderTh('rent_status',  'Status')}
                {renderTh('cpi_adjusted', 'CPI')}
                {renderTh('base_rent',    'Base Rent', {textAlign:'right'})}
                {renderTh('nnn',          'NNN',       {textAlign:'right'})}
                {renderTh('other_amt',    'Other',     {textAlign:'right'})}
                {renderTh('cam_impound',  'CAMi',      {textAlign:'right'})}
                {renderTh('tpt_tax',      'TPT Tax',   {textAlign:'right'})}
                {renderTh('total',        'Total',     {textAlign:'right'})}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={NCOLS} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No records match filters</td></tr>
              )}
              {grouped ? (
                grouped.map(group => (
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={NCOLS} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                        {group.prop_code} <span style={{color:T.text3,fontWeight:'400'}}>({group.rows.length})</span>
                      </td>
                    </tr>
                    {group.rows.map((row, i) => renderRow(row, i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((row, i) => renderRow(row, i))
              )}
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

  const moLeft = calcMoLeft(row.rent_ends);

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
          {row.tenants?.lease_type || 'Lease'} · {row.prop_code}{row.suite_num ? ` · Suite ${row.suite_num}` : ''}
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
            {field('Base Rent',   fmtCurrency(row.base_rent))}
            {field('NNN',         fmtCurrency(row.nnn))}
            {field('Other',       fmtCurrency(row.other_amt))}
            {field('CAM Impound', fmtCurrency(row.cam_impound))}
            {field('TPT Tax',     fmtCurrency(row.tpt_tax))}
            {field('Total',       fmtCurrency(row.total))}
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
            {field('Sq Ft',       row.sqft ? row.sqft.toLocaleString() : null)}
            {field('Amendment #', row.amendment_num != null ? String(row.amendment_num) : null)}
            {field('Base / SF',   row.base_per_sf ? `$${Number(row.base_per_sf).toFixed(2)}` : null)}
            {field('NNN / SF',    row.nnn_per_sf  ? `$${Number(row.nnn_per_sf).toFixed(2)}`  : null)}
            {field('CPI Adjusted', row.cpi_adjusted ? 'Yes' : 'No')}
            {field('TPT Exempt',   row.tpt_tax_exempt ? 'Yes' : 'No')}
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
    sbFetch('properties', 'select=prop_code&status=eq.active')
      .then(props => {
        const codes = props.map(p => p.prop_code).join(',');
        return sbFetch('rent_schedule',
          `select=*,tenants!rent_schedule_tenant_id_fkey(tenant_dba,lease_type)&prop_code=in.(${codes})&order=prop_code.asc,suite_num.asc`
        );
      })
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
