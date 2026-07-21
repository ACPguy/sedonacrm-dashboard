// ─────────────────────────────────────────────────────────────────────────────
// VendorsView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Truck, Eye, EyeSlash, CaretLeft, CaretRight, ClipboardText, UserCircle, Plus } from '@phosphor-icons/react';
import LinkField from './shared/LinkField';
import { useRouter } from 'next/router';
import RichTextEditor from './RichTextEditor';
import ContactsTable from './shared/ContactsTable';
import TasksView from './TasksView';
import { T } from '../lib/theme';

const SUPABASE_URL    = 'https://edxcvyleielzevpappui.supabase.co';
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

// vendor_category is text[] — each element is an atomic category name
const catIncludes = (vendorCat, selected) => {
  if (!selected) return true;
  if (!vendorCat || !Array.isArray(vendorCat)) return false;
  return vendorCat.includes(selected);
};

// All known category values: atomic unnest() results merged with hardcoded fallback
const ALL_VENDOR_CATS = [
  'Accounting','Annual Tests','Architect/Draftsman','Attorney','Bank/Lender','Blinds',
  'Cleaning','Computer IT','Computer Tech','Computers','Concrete','CPA','Drywaller',
  'Electrical','Elevator','Engineer','Environmental','Excavating','Fabrication',
  'Fencing','Fire Safety','Flooring','General Contractor','Gov-State','Government',
  'Gutters','Handyman','Hauling','HVAC','Insurance','Interior Design','Janitorial',
  'Landscaping','Legal','Lender','Lighting','Locksmith','Other','Painting','Parking Lot',
  'Parking Lot - power washing','Pest Control','Phone Systems','Phones','Plumbing',
  'Powerwashing','RollUp Doors','Roofing','Security','Security Systems','Septic',
  'Sewer','Sewer/Septic','Signage','Spanish Translation','Stucco','Supplier','Surveyor',
  'Tenant Improvements','Title Co.','Towing','Trash','Tree Removal + Trimming',
  'Utility Co.','Welding','Windows',
];

const STATUS_OPTIONS  = ['Active', 'Inactive', 'Unrated Currently'];
const TEN99_OPTIONS   = ['Yes', 'No', 'Unknown'];
const tenNinetyNineRank = v => v === true ? 0 : v === false ? 1 : 2;

const STORE_KEY = 'vendorsViewState';
const loadSaved = () => { try { const s = sessionStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };

const TenNinetyNineBadge = ({ val }) => {
  if (val === true)  return <span style={css.badge(T.success, '#1e2a1e')}>Yes</span>;
  if (val === false) return <span style={css.badge(T.text2, T.bg3)}>No</span>;
  return <span style={css.badge(T.text3, T.bg3)}>—</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// More… popover — categories + date filters
// ─────────────────────────────────────────────────────────────────────────────
const VendorMorePopover = ({ open, onClose, anchorRef, catFilter, setCatFilter, dateFilters, setDateFilters, allCategories, catCounts }) => {
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

  const toggleDate = (period) => {
    setDateFilters(prev => ({ updated: prev.updated === period ? null : period }));
  };

  const periods = [
    { key:'week',  label:'This Week'  },
    { key:'month', label:'This Month' },
    { key:'year',  label:'This Year'  },
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
      padding:'10px 12px', minWidth:'340px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      {/* Category filter */}
      <div style={{marginBottom:'10px'}}>
        <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px',fontWeight:'600'}}>Category</div>
        <div style={{maxHeight:'180px',overflowY:'auto',display:'flex',flexWrap:'wrap',gap:'4px',paddingRight:'4px'}}>
          {allCategories.map(cat => {
            const cnt    = catCounts[cat] ?? 0;
            const active = catFilter === cat;
            return (
              <button key={cat} onClick={() => setCatFilter(active ? '' : cat)}
                style={{
                  padding:'3px 8px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
                  border:`0.5px solid ${active ? T.accent : T.border}`,
                  background: active ? 'rgba(110,159,216,0.18)' : 'transparent',
                  color: active ? T.accent : T.text2,
                  fontWeight: active ? '600' : '400',
                  display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap',
                }}>
                {cat}
                <span style={{color: active ? T.text1 : T.text3, fontSize:'10px'}}>·{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{borderTop:`0.5px solid ${T.border}`,margin:'8px 0 10px'}}/>

      {/* Updated date filter */}
      <div>
        <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px',fontWeight:'600'}}>Updated</div>
        <div style={{display:'flex',gap:'4px'}}>
          {periods.map(({ key, label }) => (
            <button key={key} onClick={() => toggleDate(key)} style={filterBtnStyle(dateFilters.updated === key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendors List
// ─────────────────────────────────────────────────────────────────────────────
const VendorsList = ({ vendors, loading, error, onSelect }) => {
  const saved = useMemo(() => loadSaved(), []);

  const [statusFilter, setStatusFilter] = useState(saved?.statusFilter ?? 'All');
  const [catFilter,    setCatFilter]    = useState(saved?.catFilter    ?? '');
  const [ten99Filter,  setTen99Filter]  = useState(saved?.ten99Filter  ?? 'All');
  const [search,       setSearch]       = useState(saved?.search       ?? '');
  const [sortCol,      setSortCol]      = useState(saved?.sortCol      ?? 'company_dba');
  const [sortDir,      setSortDir]      = useState(saved?.sortDir      ?? 'asc');
  const [dateFilters,  setDateFilters]  = useState(saved?.dateFilters  ?? { updated: null });
  const [moreOpen,     setMoreOpen]     = useState(false);
  const moreAnchorRef = useRef(null);

  useEffect(() => {
    document.title = 'Vendors | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, []);

  // Persist filter state
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ statusFilter, catFilter, ten99Filter, search, sortCol, sortDir, dateFilters }));
    } catch {}
  }, [statusFilter, catFilter, ten99Filter, search, sortCol, sortDir, dateFilters]);

  const allCategories = ALL_VENDOR_CATS;

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...vendors].sort((a, b) => {
    if (sortCol === 'gets_1099') {
      const cmp = tenNinetyNineRank(a.gets_1099) - tenNinetyNineRank(b.gets_1099);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const toStr = v => Array.isArray(v) ? v.join(', ') : String(v ?? '');
    const cmp = toStr(a[sortCol]).localeCompare(toStr(b[sortCol]));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [vendors, sortCol, sortDir]);

  const applyFilters = useCallback((list, { skipCat = false, skip1099 = false } = {}) => {
    return list.filter(v => {
      if (statusFilter !== 'All' && (v.vendor_status || '') !== statusFilter) return false;
      if (!skipCat && catFilter && !catIncludes(v.vendor_category, catFilter)) return false;
      if (!skip1099 && ten99Filter !== 'All') {
        const val = v.gets_1099 === true ? 'Yes' : v.gets_1099 === false ? 'No' : 'Unknown';
        if (val !== ten99Filter) return false;
      }
      if (dateFilters.updated && !isInRange(v.updated_at, dateFilters.updated)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (v.company_dba    ||'').toLowerCase().includes(q) ||
          (Array.isArray(v.vendor_category)?v.vendor_category.join(', '):'').toLowerCase().includes(q) ||
          (v.city           ||'').toLowerCase().includes(q) ||
          (v.main_phone     ||'').toLowerCase().includes(q) ||
          (v.prop_code      ||'').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, catFilter, ten99Filter, search, dateFilters]);

  const filtered       = useMemo(() => applyFilters(sorted),                        [sorted, applyFilters]);
  const filteredNoCat  = useMemo(() => applyFilters(sorted, {skipCat:true}),        [sorted, applyFilters]);
  const filteredNo1099 = useMemo(() => applyFilters(sorted, {skip1099:true}),       [sorted, applyFilters]);

  // Category counts against filtered-without-category set
  const catCounts = useMemo(() => {
    const c = {};
    filteredNoCat.forEach(v => {
      if (Array.isArray(v.vendor_category)) {
        v.vendor_category.forEach(cat => { if (cat) c[cat] = (c[cat] || 0) + 1; });
      }
    });
    return c;
  }, [filteredNoCat]);

  const ten99Counts = useMemo(() => {
    const c = { All: filteredNo1099.length, Yes: 0, No: 0, Unknown: 0 };
    filteredNo1099.forEach(v => {
      if (v.gets_1099 === true)       c.Yes++;
      else if (v.gets_1099 === false) c.No++;
      else                            c.Unknown++;
    });
    return c;
  }, [filteredNo1099]);

  // Status counts (all filters except status)
  const statusCounts = useMemo(() => {
    const noStatus = sorted.filter(v => {
      if (catFilter && !catIncludes(v.vendor_category, catFilter)) return false;
      if (ten99Filter !== 'All') {
        const val = v.gets_1099 === true ? 'Yes' : v.gets_1099 === false ? 'No' : 'Unknown';
        if (val !== ten99Filter) return false;
      }
      if (dateFilters.updated && !isInRange(v.updated_at, dateFilters.updated)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (v.company_dba||'').toLowerCase().includes(q) ||
          (Array.isArray(v.vendor_category)?v.vendor_category.join(', '):'').toLowerCase().includes(q) ||
          (v.city||'').toLowerCase().includes(q) ||
          (v.main_phone||'').toLowerCase().includes(q) ||
          (v.prop_code||'').toLowerCase().includes(q)
        );
      }
      return true;
    });
    const c = { All: noStatus.length };
    STATUS_OPTIONS.forEach(s => { c[s] = noStatus.filter(v => (v.vendor_status||'') === s).length; });
    return c;
  }, [sorted, catFilter, ten99Filter, search, dateFilters]);

  const hasMoreActive    = !!catFilter || !!dateFilters.updated;
  const hasActiveFilters = statusFilter !== 'All' || !!catFilter || ten99Filter !== 'All' ||
    search !== '' || !!dateFilters.updated;

  const clearFilters = () => {
    setStatusFilter('All'); setCatFilter(''); setTen99Filter('All');
    setSearch(''); setDateFilters({ updated: null });
  };

  const renderTh = (c, label, extraStyle={}) => (
    <th key={c} style={{...css.th, ...extraStyle}} onClick={() => toggleSort(c)}>
      {label}{sortCol === c
        ? <span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>
        : <span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const renderRow = (v, i) => {
    const cityState = [v.city, v.state].filter(Boolean).join(', ');
    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/vendors/${v.podio_id ?? 'X'+v.id.slice(-6)}`, '_blank');
        if (tab) tab.focus();
      } else {
        try{sessionStorage.setItem('vendorsBackUrl',window.location.href);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('vendorsNavList',JSON.stringify(navL));sessionStorage.setItem('vendorsNavIndex',String(filtered.findIndex(r=>r.id===v.id)));}catch{}
        onSelect(v);
      }
    };

    return (
      <tr key={v.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td}} title={v.company_dba}>
          <a href={`/vendors/${v.podio_id ?? 'X'+v.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(v);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {v.company_dba||''}
          </a>
        </td>
        <td style={{...css.td,color:T.text1,fontSize:F.xs}} title={Array.isArray(v.vendor_category)?v.vendor_category.join(', '):''}>{Array.isArray(v.vendor_category)?v.vendor_category.join(', '):''}</td>
        <td style={{...css.td,color:T.text1}}>{v.main_phone||''}</td>
        <td style={{...css.td,color:T.text2}}>{cityState}</td>
        <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{v.prop_code||''}</td>
        <td style={{...css.td}}><TenNinetyNineBadge val={v.gets_1099}/></td>
        <td style={{...css.td}}>
          {v.vendor_status ? (
            <span style={css.badge(
              v.vendor_status==='Active' ? T.success :
              v.vendor_status==='Inactive' ? T.text2 : T.warn,
              v.vendor_status==='Active' ? '#1e2a1e' :
              v.vendor_status==='Inactive' ? T.bg3 : 'rgba(212,146,74,0.15)'
            )}>{v.vendor_status}</span>
          ) : ''}
        </td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{fmtNumDate(v.updated_at)}</td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <Truck size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Vendors</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Filter bar: Status | 1099 | More… | Clear | Search */}
        <div className="filter-row" style={{gap:'6px',alignItems:'center',minWidth:0}}>

          {/* Status pills */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All',...STATUS_OPTIONS].map(s => {
              const cnt    = statusCounts[s] ?? 0;
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{padding:'3px 7px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',
                    display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {s}
                  <span style={{color:active?T.text1:T.text3,fontSize:'10px'}}>·{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* 1099 pills */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All',...TEN99_OPTIONS].map(t => {
              const cnt    = ten99Counts[t] ?? 0;
              const active = ten99Filter === t;
              return (
                <button key={t} onClick={() => setTen99Filter(t)}
                  style={{padding:'3px 7px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',
                    display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {t}
                  <span style={{color:active?T.text1:T.text3,fontSize:'10px'}}>·{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* More… */}
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
            <VendorMorePopover
              open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreAnchorRef}
              catFilter={catFilter} setCatFilter={setCatFilter}
              dateFilters={dateFilters} setDateFilters={setDateFilters}
              allCategories={allCategories} catCounts={catCounts}
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
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur(); } }}
              placeholder="Search…"
              style={{width:'220px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading vendors…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>
              <col style={{width:'160px'}}/>
              <col style={{width:'110px'}}/>
              <col style={{width:'130px'}}/>
              <col style={{width:'60px'}}/>
              <col style={{width:'60px'}}/>
              <col style={{width:'108px'}}/>
              <col style={{width:'88px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('company_dba','Company')}
                {renderTh('vendor_category','Category')}
                {renderTh('main_phone','Phone')}
                {renderTh('city','City/State')}
                {renderTh('prop_code','Prop', {paddingLeft:'10px'})}
                {renderTh('gets_1099','1099')}
                {renderTh('vendor_status','Status')}
                {renderTh('updated_at','Updated')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No vendors match filters</td></tr>
              )}
              {filtered.map((v, i) => renderRow(v, i))}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length === 0 && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No vendors match filters</div>}
            {filtered.map((v, i) => {
              const rowBg = i%2===0?'transparent':T.bg0;
              const statusColor = v.vendor_status==='Active'?T.success:v.vendor_status==='Inactive'?T.text2:T.warn;
              const statusBg = v.vendor_status==='Active'?'#1e2a1e':v.vendor_status==='Inactive'?T.bg3:'rgba(212,146,74,0.15)';
              return (
                <div key={v.id} style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{try{sessionStorage.setItem('vendorsBackUrl',window.location.href);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('vendorsNavList',JSON.stringify(navL));sessionStorage.setItem('vendorsNavIndex',String(filtered.findIndex(r=>r.id===v.id)));}catch{}onSelect(v);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{fontWeight:'600',fontSize:F.base,color:T.text0,marginBottom:'4px'}}>{v.company_dba||'—'}</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {v.vendor_status&&<span style={css.badge(statusColor,statusBg)}>{v.vendor_status}</span>}
                    {v.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{v.prop_code}</span>}
                    {Array.isArray(v.vendor_category)&&v.vendor_category.slice(0,2).map((c,ci)=>(
                      <span key={ci} style={css.badge(T.text2,T.bg3)}>{c}</span>
                    ))}
                  </div>
                  {v.main_phone&&<div style={{fontSize:F.xs,color:T.text2,marginTop:'3px'}}>{v.main_phone}</div>}
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
// Vendor Detail — micro-components
// ─────────────────────────────────────────────────────────────────────────────
const VD_STATUS_OPTS = ['Active', 'Inactive', 'Unrated Currently'];
const VD_TAX_ID_TYPE_OPTS = ['EIN', 'SSN'];

const VdFieldRow = ({ label, children, topAlign = false, hoverable = true }) => (
  <div className="crm-field-row"
    style={{display:'grid',gridTemplateColumns:'160px 1fr',borderBottom:`0.5px solid ${T.border}`,padding:'10px 0',minHeight:'48px'}}
    onMouseEnter={hoverable ? e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';} : undefined}
    onMouseLeave={hoverable ? e=>{e.currentTarget.style.background='';} : undefined}
  >
    <div className="crm-field-label" style={{fontSize:F.sm,fontWeight:'600',color:'#6B7280',textAlign:'right',paddingRight:'16px',alignSelf:topAlign?'start':'center',paddingTop:topAlign?'4px':'0',lineHeight:'1.4',userSelect:'none'}}>
      {label}
    </div>
    <div style={{alignSelf:topAlign?'start':'center',paddingRight:'4px'}}>
      {children}
    </div>
  </div>
);

const VdInlineBlur = ({ value, onSave, type='text', highlight=false, readOnly=false }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value ?? '');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setVal(value ?? ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = async () => {
    setEditing(false);
    const trimmed = typeof val === 'string' ? val.trim() : String(val ?? '');
    if (trimmed === String(value ?? '')) return;
    setSaving(true);
    try { await onSave(trimmed || null); }
    catch { setVal(value ?? ''); }
    finally { setSaving(false); }
  };
  const displayVal = type === 'date' && val ? fmtDate(val) : (val != null ? String(val) : '');
  if (readOnly) return <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.4'}}>{displayVal||'—'}</div>;
  return editing ? (
    <input ref={inputRef} type={type} value={val} onChange={e=>setVal(e.target.value)}
      onFocus={type==='date'?(e=>{try{e.target.showPicker();}catch(_){}}) : undefined}
      onBlur={commit}
      onKeyDown={e=>{if(e.key==='Escape'){setVal(value??'');setEditing(false);}if(e.key==='Enter')commit();}}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none',MozAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{fontSize:F.base,color:highlight?'#E8630A':(displayVal?T.text0:T.text3),fontWeight:highlight?'700':'normal',cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {displayVal || <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving && <span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

const VdInlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e=>{await onSave(e.target.value||null);}}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o=>typeof o==='object'
      ?<option key={o.value} value={o.value}>{o.label}</option>
      :<option key={o} value={o}>{o}</option>)}
  </select>
);

const VdBoolPill = ({ value, onSave }) => {
  const opts = [
    {val:true,  label:'Yes', activeBg:T.success,  activeColor:'#fff',  border:T.success, hoverBg:'rgba(106,176,106,0.20)'},
    {val:false, label:'No',  activeBg:T.bg3,      activeColor:T.text0, border:T.text2,   hoverBg:'rgba(107,114,128,0.20)'},
  ];
  return (
    <div style={{display:'flex',gap:'5px'}}>
      {opts.map(o=>{
        const active = value === o.val;
        return (
          <button key={o.label} onClick={()=>!active&&onSave(o.val)}
            style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
              border:`1px solid ${o.border}`,background:active?o.activeBg:'transparent',color:active?o.activeColor:o.border,
              transition:'background 0.15s ease'}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=o.hoverBg;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

const TaxIdField = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value ?? '');
  const [show, setShow]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setVal(value ?? ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = async () => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed === String(value ?? '')) return;
    setSaving(true);
    try { await onSave(trimmed || null); }
    catch { setVal(value ?? ''); }
    finally { setSaving(false); }
  };
  return (
    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
      {editing ? (
        <input ref={inputRef} type={show?'text':'password'} value={val}
          onChange={e=>setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e=>{if(e.key==='Escape'){setVal(value??'');setEditing(false);}if(e.key==='Enter')commit();}}
          style={{flex:1,background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none'}}
        />
      ) : (
        <div onClick={()=>setEditing(true)} title="Click to edit"
          style={{flex:1,fontSize:F.base,color:val?T.text0:T.text3,cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
          onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
          onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
          {val
            ? (show ? val : '•'.repeat(Math.min(val.length, 9)))
            : <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>
          }
          {saving && <span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
        </div>
      )}
      <button onClick={()=>setShow(s=>!s)} title={show?'Hide':'Show'}
        style={{background:'transparent',border:'none',cursor:'pointer',color:T.text2,padding:'2px',display:'flex',alignItems:'center',flexShrink:0}}
        onMouseEnter={e=>e.currentTarget.style.color=T.text0}
        onMouseLeave={e=>e.currentTarget.style.color=T.text2}>
        {show ? <EyeSlash size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  );
};

const VdActivityPanel = ({ collapsed, onCollapse, width, onMouseDown }) => {
  const [tab, setTab] = useState('comments');
  return (
    <div style={{display:'flex',flexShrink:0,height:'100%'}}>
      <div onMouseDown={onMouseDown}
        style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
        onMouseEnter={e=>e.currentTarget.style.background=T.accent}
        onMouseLeave={e=>e.currentTarget.style.background=T.border}/>
      <div style={{width:collapsed?'36px':`${width}px`,background:T.bg0,borderLeft:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden',transition:'width 200ms ease',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',padding:collapsed?'9px 0':'8px 12px',borderBottom:`0.5px solid ${T.border}`,minHeight:'42px',flexShrink:0}}>
          {!collapsed&&(
            <div style={{display:'flex',gap:'2px'}}>
              {['Comments','Activity'].map(t=>(
                <button key={t} onClick={()=>setTab(t.toLowerCase())}
                  style={{background:tab===t.toLowerCase()?T.bg2:'transparent',border:'none',padding:'4px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,color:tab===t.toLowerCase()?T.accent:T.text1,fontWeight:tab===t.toLowerCase()?'600':'400'}}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <button onClick={onCollapse}
            title={collapsed?'Expand panel':'Collapse panel'}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',borderRadius:'4px',flexShrink:0,fontSize:'14px',lineHeight:1}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {collapsed ? '«' : '»'}
          </button>
        </div>
        {!collapsed&&(
          <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
            {tab==='comments'&&(
              <div>
                <div style={{...css.card,marginBottom:'10px'}}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>Comments and attached files will sync from Podio via API at go-live.</p>
                </div>
                <div style={{textAlign:'center',marginTop:'32px'}}>
                  <span style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}}>💬</span>
                  <span style={{fontSize:F.sm,color:T.text3}}>Comments sync at go-live</span>
                </div>
              </div>
            )}
            {tab==='activity'&&(
              <div>
                <div style={{...css.card,marginBottom:'10px'}}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>Activity tracking begins at go-live.</p>
                </div>
                <div style={{textAlign:'center',marginTop:'32px'}}>
                  <span style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}}>🕐</span>
                  <span style={{fontSize:F.sm,color:T.text3}}>No activity before go-live</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Category multi-select pill picker
// ─────────────────────────────────────────────────────────────────────────────
const VendorCategoryPills = ({ value, onSave }) => {
  const [selected, setSelected] = useState(Array.isArray(value) ? value : []);
  useEffect(() => { setSelected(Array.isArray(value) ? value : []); }, [value]);

  const toggle = async cat => {
    const next = selected.includes(cat)
      ? selected.filter(c => c !== cat)
      : [...selected, cat];
    setSelected(next);
    try { await onSave(next); } catch { setSelected(selected); }
  };

  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:'4px',padding:'4px 0'}}>
      {ALL_VENDOR_CATS.map(cat => {
        const active = selected.includes(cat);
        return (
          <button key={cat} onClick={() => toggle(cat)}
            style={{padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,cursor:'pointer',
              border:'0.5px solid #6e9fd8',
              background: active ? '#6e9fd8' : 'transparent',
              color: active ? '#1a2e3a' : T.text1,
              fontWeight: active ? '600' : '400',
              transition:'background 0.15s ease',
            }}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background='rgba(110,159,216,0.20)';}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {cat}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Detail — full form
// ─────────────────────────────────────────────────────────────────────────────
export const VendorDetail = ({ vendor, onBack, onUpdate }) => {
  const router = useRouter();
  const [data, setData]                       = useState(vendor);
  const [primaryContact, setPrimaryContact]   = useState(null);
  const [referredContact, setReferredContact] = useState(null);
  const [vendorServices, setVendorServices]   = useState([]);
  const [serviceProps, setServiceProps]       = useState({});
  const [rightCollapsed, setRightCollapsed]   = useState(false);
  const [rightWidth, setRightWidth]           = useState(300);
  const [referSearch, setReferSearch]         = useState('');
  const [referResults, setReferResults]       = useState([]);
  const [referLoading, setReferLoading]       = useState(false);
  const [referOpen, setReferOpen]             = useState(false);
  const [navList, setNavList]                 = useState(null);
  const [navIdx, setNavIdx]                   = useState(-1);
  const [navLoading, setNavLoading]           = useState(false);
  const [vendorTab, setVendorTab]             = useState('tasks');
  const resizingRight        = useRef(false);
  const referRef             = useRef(null);
  const vendorContactsRef    = useRef(null);
  const vendorContactsBtnRef = useRef(null);

  // Fetch linked contacts + vendor services on mount
  useEffect(() => {
    if (data.primary_contact_id) {
      sbFetch('contacts', `id=eq.${data.primary_contact_id}&select=id,full_name,podio_id`)
        .then(rows=>setPrimaryContact(rows[0]||null)).catch(()=>{});
    }
    if (data.referred_by_contact_id) {
      sbFetch('contacts', `id=eq.${data.referred_by_contact_id}&select=id,full_name,podio_id`)
        .then(rows=>setReferredContact(rows[0]||null)).catch(()=>{});
    }
    sbFetch('vendor_services', `vendor_id=eq.${data.id}&select=*&order=prop_code.asc`)
      .then(async rows=>{
        setVendorServices(rows||[]);
        const pcs=[...new Set((rows||[]).map(r=>r.prop_code).filter(Boolean))];
        if(pcs.length){
          const props=await sbFetch('properties',`prop_code=in.(${pcs.join(',')})&select=prop_code,property_name,podio_id,id`);
          const map={};
          (props||[]).forEach(p=>{map[p.prop_code]=p;});
          setServiceProps(map);
        }
      }).catch(()=>{});
  }, []);

  // Debounced contact search for referred_by
  useEffect(() => {
    if (!referSearch || referSearch.length < 2) { setReferResults([]); setReferOpen(false); return; }
    const t = setTimeout(async () => {
      setReferLoading(true);
      try {
        const q = referSearch.replace(/['"]/g,'');
        const rows = await sbFetch('contacts', `full_name=ilike.*${q}*&select=id,full_name,podio_id&limit=5&order=full_name.asc`);
        setReferResults(rows||[]);
        setReferOpen(true);
      } catch { }
      finally { setReferLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [referSearch]);

  // Close refer dropdown on outside click
  useEffect(() => {
    const handle = e => { if (referRef.current && !referRef.current.contains(e.target)) setReferOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

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

  // Document title
  useEffect(() => {
    document.title = `${data.company_dba || 'Vendor'} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.company_dba]);

  // Nav list from sessionStorage
  useEffect(() => {
    try {
      const nl = sessionStorage.getItem('vendorsNavList');
      const ni = sessionStorage.getItem('vendorsNavIndex');
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
      const query = entry.podio_id ? `podio_id=eq.${entry.podio_id}&select=*&limit=1` : `id=eq.${entry.id}&select=*&limit=1`;
      const rows = await sbFetch('vendors', query);
      if (rows && rows[0]) {
        setData(rows[0]);
        setNavIdx(next);
        sessionStorage.setItem('vendorsNavIndex', String(next));
        const newUrl = entry.podio_id ? `/vendors/${entry.podio_id}` : `/vendors/X${entry.id.slice(-6)}`;
        window.history.replaceState(null, '', newUrl);
        setPrimaryContact(null);
        setReferredContact(null);
        setVendorServices([]);
        setServiceProps({});
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

  const startRightResize = useCallback(e => {
    resizingRight.current = true;
    const startX = e.clientX, startW = rightWidth;
    const onMove = me => { if (!resizingRight.current) return; setRightWidth(Math.max(180, Math.min(500, startW - (me.clientX - startX)))); };
    const onUp   = () => { resizingRight.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  const save = async (field, val) => {
    await sbPatch('vendors', data.id, { [field]: val ?? null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const selectReferredBy = async contact => {
    await sbPatch('vendors', data.id, { referred_by_contact_id: contact.id });
    const updated = { ...data, referred_by_contact_id: contact.id };
    setData(updated);
    setReferredContact(contact);
    setReferSearch(''); setReferResults([]); setReferOpen(false);
    onUpdate?.(updated);
  };

  const clearReferredBy = async () => {
    await sbPatch('vendors', data.id, { referred_by_contact_id: null });
    const updated = { ...data, referred_by_contact_id: null };
    setData(updated);
    setReferredContact(null);
    onUpdate?.(updated);
  };

  const statusBadgeStyle = s => css.badge(
    s==='Active'?T.success:s==='Inactive'?T.text2:T.warn,
    s==='Active'?'#1e2a1e':s==='Inactive'?T.bg3:'rgba(212,146,74,0.15)'
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <Truck size={14} weight="bold"/>← Vendors
          </button>
          {Array.isArray(data.vendor_category) && data.vendor_category.length > 0 && (
            <>
              <span style={css.badge(T.text1, T.bg3)}>{data.vendor_category[0]}</span>
              {data.vendor_category.length > 1 && (
                <span style={css.badge(T.text2, T.bg3)}>+{data.vendor_category.length-1} more</span>
              )}
            </>
          )}
          <div style={{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
            {data.vendor_status && <span style={statusBadgeStyle(data.vendor_status)}>{data.vendor_status}</span>}
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
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:'6px'}}>
          <Truck size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <div style={{fontSize:F.lg,fontWeight:'700',color:'#E8630A'}}>{data.company_dba||'Untitled Vendor'}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:'2px',padding:'0 16px',borderBottom:`1px solid ${T.border}`,background:T.bg1,flexShrink:0}}>
        {[['tasks','Tasks'],['contacts','Contacts'],['info','Vendor Info']].map(([k,label])=>(
          <button key={k} onClick={()=>setVendorTab(k)} style={{
            padding:'8px 14px',fontSize:'13px',fontWeight:vendorTab===k?'600':'400',
            color:vendorTab===k?T.accent:T.text1,background:'none',border:'none',
            borderBottom:vendorTab===k?`2px solid ${T.accent}`:'2px solid transparent',
            cursor:'pointer',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px'
          }}>
            {k==='tasks'&&<ClipboardText size={14}/>}
            {label}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {vendorTab==='tasks'&&(
        <div style={{flex:1,overflow:'hidden'}}>
          {data?.id&&<TasksView filterVendorId={data.id} hidePropertyPills embeddedMode/>}
        </div>
      )}

      {/* Contacts tab */}
      {vendorTab==='contacts'&&(
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          <div style={{background:T.bg2,borderRadius:'8px',overflow:'hidden',padding:'10px 16px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <span style={{fontSize:'11px',fontWeight:'700',color:T.text2,textTransform:'uppercase',letterSpacing:'0.06em'}}>Contacts</span>
              <button ref={vendorContactsBtnRef} onClick={()=>vendorContactsRef.current?.openPanel()}
                title="Link a contact"
                style={{display:'flex',alignItems:'center',justifyContent:'center',color:T.text1,background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <Plus size={14} weight="bold"/>
              </button>
            </div>
            <LinkField
              ref={vendorContactsRef}
              excludeRef={vendorContactsBtnRef}
              mode="reverseFK"
              parentId={data.id}
              linkedTable="contacts"
              reverseField="vendor_id"
              linkedFields="id,full_name,primary_phone,email,podio_id,vendor_id,created_at"
              searchFields={['full_name','company_dba']}
              titleField={row=>row.full_name}
              titleHref={row=>`/contacts/${row.podio_id??'X'+row.id.slice(-6)}`}
              subtitleField={row=>[row.primary_phone,row.email].filter(Boolean).join(' · ')}
              icon={UserCircle}
              sectionLabel="contact"
              compact={true}
              hideTrigger={true}
            />
          </div>
        </div>
      )}

      {/* Vendor Info tab (existing body) */}
      {vendorTab==='info'&&(
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Left: fields */}
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>

            {/* 1. Company DBA */}
            <VdFieldRow label="Company DBA">
              <VdInlineBlur value={data.company_dba||''} onSave={v=>save('company_dba',v)} highlight/>
            </VdFieldRow>

            {/* 2. Vendor Status */}
            <VdFieldRow label="Vendor Status">
              <VdInlineSelect value={data.vendor_status} options={VD_STATUS_OPTS} onSave={v=>save('vendor_status',v)}/>
            </VdFieldRow>

            {/* 3. Vendor Category — multi-select pills */}
            <VdFieldRow label="Vendor Category" topAlign>
              <VendorCategoryPills value={data.vendor_category} onSave={v=>save('vendor_category',v)}/>
            </VdFieldRow>

            {/* 4. Primary Contact linker */}
            <VdFieldRow label="Primary Contact" hoverable={false}>
              {primaryContact
                ? <span style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                    onClick={()=>router.push('/contacts/'+(primaryContact.podio_id??'X'+primaryContact.id.slice(-6)))}>
                    {primaryContact.full_name}
                  </span>
                : <span style={{fontSize:F.base,color:T.text3,fontStyle:'italic'}}>—</span>
              }
            </VdFieldRow>

            {/* 5. Main Phone */}
            <VdFieldRow label="Main Phone">
              <VdInlineBlur value={data.main_phone||''} onSave={v=>save('main_phone',v)}/>
            </VdFieldRow>

            {/* 6. Fax */}
            <VdFieldRow label="Fax">
              <VdInlineBlur value={data.fax||''} onSave={v=>save('fax',v)}/>
            </VdFieldRow>

            {/* 7. Company Notes */}
            <VdFieldRow label="Company Notes" topAlign>
              <RichTextEditor value={data.company_notes||''} onSave={v=>save('company_notes',v)} minRows={5}/>
            </VdFieldRow>

            {/* 8-11. Address */}
            <VdFieldRow label="Address">
              <VdInlineBlur value={data.address||''} onSave={v=>save('address',v)}/>
            </VdFieldRow>
            <VdFieldRow label="City">
              <VdInlineBlur value={data.city||''} onSave={v=>save('city',v)}/>
            </VdFieldRow>
            <VdFieldRow label="State">
              <VdInlineBlur value={data.state||''} onSave={v=>save('state',v)}/>
            </VdFieldRow>
            <VdFieldRow label="Zip">
              <VdInlineBlur value={data.zip||''} onSave={v=>save('zip',v)}/>
            </VdFieldRow>

            {/* 12. Referred To Us By */}
            <VdFieldRow label="Referred To Us By" hoverable={false}>
              <div ref={referRef} style={{position:'relative'}}>
                {data.referred_by_contact_id && referredContact
                  ? <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                        onClick={()=>router.push('/contacts/'+(referredContact.podio_id??'X'+referredContact.id.slice(-6)))}>
                        {referredContact.full_name}
                      </span>
                      <button onClick={clearReferredBy}
                        style={{background:'transparent',border:`0.5px solid ${T.text3}`,borderRadius:'3px',padding:'1px 5px',color:T.text3,cursor:'pointer',fontSize:F.xs,lineHeight:1}}
                        onMouseEnter={e=>e.currentTarget.style.color=T.danger}
                        onMouseLeave={e=>e.currentTarget.style.color=T.text3}>
                        ✕
                      </button>
                    </div>
                  : <div>
                      <input value={referSearch} onChange={e=>setReferSearch(e.target.value)}
                        placeholder="Search contacts by name…"
                        onFocus={()=>{ if(referResults.length) setReferOpen(true); }}
                        style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.sm,outline:'none'}}
                      />
                      {referLoading && <span style={{fontSize:F.xs,color:T.text3,marginTop:'3px',display:'block'}}>Searching…</span>}
                      {referOpen && referResults.length > 0 && (
                        <div style={{position:'absolute',top:'100%',left:0,right:0,background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,0.4)',marginTop:'2px'}}>
                          {referResults.map(c=>(
                            <div key={c.id}
                              style={{padding:'6px 10px',cursor:'pointer',fontSize:F.sm,color:T.text0,borderBottom:`0.5px solid ${T.border}`}}
                              onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                              onMouseDown={e=>{e.preventDefault();selectReferredBy(c);}}>
                              {c.full_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                }
                {data.referred_by && (
                  <div style={{fontSize:F.xs,color:T.text3,marginTop:'4px',fontStyle:'italic'}}>
                    Legacy Podio value: {data.referred_by}
                  </div>
                )}
              </div>
            </VdFieldRow>

            {/* 13. Properties Serviced */}
            <VdFieldRow label="Properties Serviced" topAlign hoverable={false}>
              {vendorServices.length === 0
                ? <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>No property services on record</span>
                : <table style={{width:'100%',borderCollapse:'collapse',marginTop:'2px'}}>
                    <thead>
                      <tr>
                        <th style={{...css.th,background:'transparent',padding:'4px 6px'}}>Prop Code</th>
                        <th style={{...css.th,background:'transparent',padding:'4px 6px'}}>Property Name</th>
                        <th style={{...css.th,background:'transparent',padding:'4px 6px'}}>Status</th>
                        <th style={{...css.th,background:'transparent',padding:'4px 6px'}}>Frequency</th>
                        <th style={{...css.th,background:'transparent',padding:'4px 6px'}}>Service Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorServices.map(svc=>{
                        const prop = serviceProps[svc.prop_code];
                        return (
                          <tr key={svc.id} style={{borderBottom:`0.5px solid ${T.border}`}}>
                            <td style={{...css.td,padding:'4px 6px'}}>
                              {prop
                                ? <span style={{color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                                    onClick={()=>router.push('/properties/'+(prop.podio_id??'X'+prop.id.slice(-6)))}>
                                    {svc.prop_code}
                                  </span>
                                : <span>{svc.prop_code||'—'}</span>
                              }
                            </td>
                            <td style={{...css.td,padding:'4px 6px'}}>{prop?.property_name||'—'}</td>
                            <td style={{...css.td,padding:'4px 6px'}}>{svc.status||'—'}</td>
                            <td style={{...css.td,padding:'4px 6px'}}>{svc.service_frequency||'—'}</td>
                            <td style={{...css.td,padding:'4px 6px'}}>{svc.service_day||'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              }
            </VdFieldRow>

            {/* 14. Request W9 placeholder */}
            <VdFieldRow label="W9 Request" hoverable={false}>
              <button disabled
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 12px',color:T.text3,fontSize:F.sm,cursor:'not-allowed',opacity:0.5}}>
                Request W9 — Coming in Phase 3
              </button>
            </VdFieldRow>

            {/* 15. Gets 1099? */}
            <VdFieldRow label="Gets 1099?">
              <VdBoolPill value={data.gets_1099} onSave={v=>save('gets_1099',v)}/>
            </VdFieldRow>

            {/* Entity section divider */}
            <div style={{padding:'7px 16px 5px',background:'rgba(255,255,255,0.015)',borderTop:`0.5px solid ${T.border}`,borderBottom:`0.5px solid ${T.border}`}}>
              <span style={{fontSize:F.xs,fontWeight:'700',color:T.text3,textTransform:'uppercase',letterSpacing:'0.1em'}}>Entity</span>
            </div>

            {/* 16. Entity Name */}
            <VdFieldRow label="Entity — Name">
              <VdInlineBlur value={data.entity_name||''} onSave={v=>save('entity_name',v)}/>
            </VdFieldRow>

            {/* 17. Tax ID — sensitive/password */}
            <VdFieldRow label="Entity — Tax ID" hoverable={false}>
              <TaxIdField value={data.tax_id||''} onSave={v=>save('tax_id',v)}/>
            </VdFieldRow>

            {/* 18. Tax ID Type */}
            <VdFieldRow label="Tax ID # is a">
              <VdInlineSelect value={data.tax_id_type} options={VD_TAX_ID_TYPE_OPTS} onSave={v=>save('tax_id_type',v)}/>
            </VdFieldRow>

            {/* 19. 1099 Notes */}
            <VdFieldRow label="1099 Notes" topAlign>
              <RichTextEditor value={data.notes_1099||''} onSave={v=>save('notes_1099',v)} minRows={5}/>
            </VdFieldRow>

            {/* 20. QBO Vendor ID */}
            <VdFieldRow label="QBO Vendor ID">
              <VdInlineBlur value={data.qbo_vendor_id||''} onSave={v=>save('qbo_vendor_id',v)}/>
            </VdFieldRow>

            {/* 21. W9 Requested Date */}
            <VdFieldRow label="W9 Requested Date">
              <VdInlineBlur type="date" value={data.w9_requested_date||''} onSave={v=>save('w9_requested_date',v)}/>
            </VdFieldRow>

            {/* 22. W9 On File */}
            <VdFieldRow label="W9 On File">
              <VdBoolPill value={data.w9_on_file} onSave={v=>save('w9_on_file',v)}/>
            </VdFieldRow>

            {/* 23. Vendor Podio ID */}
            <VdFieldRow label="Vendor Podio ID" hoverable={false}>
              {data.podio_id
                ? <span style={{fontSize:F.sm,color:T.text1,fontFamily:'monospace'}}>{data.podio_id}</span>
                : <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Available after Podio sync</span>
              }
            </VdFieldRow>

          </div>
        </div>

        {/* Right: Activity panel (defaults OPEN) */}
        <VdActivityPanel
          collapsed={rightCollapsed}
          onCollapse={()=>setRightCollapsed(c=>!c)}
          width={rightWidth}
          onMouseDown={startRightResize}
        />
      </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorsView() {
  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('vendors', 'select=*&order=company_dba.asc')
      .then(data => { setVendors(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = useCallback(v => {
    history.pushState({ vendorId: v.id }, '');
    setSelected(v);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.vendorId) history.replaceState({}, '');
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
        <VendorsList vendors={vendors} loading={loading} error={error} onSelect={handleSelect}/>
      </div>
      {selected && (
        <VendorDetail key={selected.id} vendor={selected} onBack={handleBack} onUpdate={updated=>setSelected(updated)}/>
      )}
    </div>
  );
}
