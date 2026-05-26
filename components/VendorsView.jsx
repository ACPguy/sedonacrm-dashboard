// ─────────────────────────────────────────────────────────────────────────────
// VendorsView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Truck } from '@phosphor-icons/react';
import ContactsTable from './shared/ContactsTable';

const SUPABASE_URL    = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
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
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
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

// vendor_category is multi-value: "HVAC; Electrical; Plumbing"
// A vendor matches a category filter if the selected category is in their list
const catIncludes = (vendorCat, selected) => {
  if (!selected) return true;
  if (!vendorCat) return false;
  return vendorCat.split('; ').map(c => c.trim()).includes(selected);
};

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

  // Derive individual categories from data
  const allCategories = useMemo(() => {
    const set = new Set();
    vendors.forEach(v => {
      if (v.vendor_category) {
        v.vendor_category.split('; ').forEach(c => { const t = c.trim(); if (t) set.add(t); });
      }
    });
    return [...set].sort();
  }, [vendors]);

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...vendors].sort((a, b) => {
    if (sortCol === 'gets_1099') {
      const cmp = tenNinetyNineRank(a.gets_1099) - tenNinetyNineRank(b.gets_1099);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''));
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
          (v.vendor_category||'').toLowerCase().includes(q) ||
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
      if (v.vendor_category) {
        v.vendor_category.split('; ').forEach(cat => {
          const t = cat.trim();
          if (t) c[t] = (c[t] || 0) + 1;
        });
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
          (v.vendor_category||'').toLowerCase().includes(q) ||
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
        <td style={{...css.td,color:T.text1,fontSize:F.xs}} title={v.vendor_category}>{v.vendor_category||''}</td>
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
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Vendors</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Filter bar: Status | 1099 | More… | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>

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
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
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
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Detail — placeholder
// ─────────────────────────────────────────────────────────────────────────────
export const VendorDetail = ({ vendor, onBack }) => {
  const [tab, setTab] = useState('info');

  useEffect(() => {
    const name = vendor?.company_dba || 'Vendor';
    document.title = `${name} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [vendor]);

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

  if (!vendor) return null;

  const TABS = ['Info', 'Contacts'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px 0',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text1}>
            <Truck size={14} weight="bold"/>← Vendors
          </button>
          {vendor.prop_code && <span style={{color:T.text3,fontSize:F.sm}}>{vendor.prop_code}</span>}
          {vendor.vendor_status && (
            <span style={{marginLeft:'auto'}}>
              <span style={css.badge(
                vendor.vendor_status==='Active' ? T.success :
                vendor.vendor_status==='Inactive' ? T.text2 : T.warn,
                vendor.vendor_status==='Active' ? '#1e2a1e' :
                vendor.vendor_status==='Inactive' ? T.bg3 : 'rgba(212,146,74,0.15)'
              )}>{vendor.vendor_status}</span>
            </span>
          )}
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{vendor.company_dba||'Untitled Vendor'}</div>
        {vendor.vendor_category && (
          <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>{vendor.vendor_category}</div>
        )}
        {/* Tab bar */}
        <div style={{display:'flex',gap:'2px',marginTop:'8px'}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase())}
              style={{background:'transparent',border:'none',padding:'6px 12px',fontSize:F.sm,cursor:'pointer',borderRadius:'4px 4px 0 0',
                color: tab === t.toLowerCase() ? T.accent : T.text1,
                borderBottom: tab === t.toLowerCase() ? `2px solid ${T.accent}` : '2px solid transparent',
                fontWeight: tab === t.toLowerCase() ? '600' : '400'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
          <div style={{...css.card,maxWidth:'600px'}}>
            <div style={css.secTitle}>Vendor Info</div>
            {[
              ['Company DBA',  vendor.company_dba],
              ['Category',     vendor.vendor_category],
              ['Status',       vendor.vendor_status],
              ['Phone',        vendor.main_phone],
              ['Fax',          vendor.fax],
              ['Address',      [vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ')],
              ['Prop Code',    vendor.prop_code],
              ['Gets 1099',    vendor.gets_1099 === true ? 'Yes' : vendor.gets_1099 === false ? 'No' : '—'],
              ['Tax ID',       vendor.tax_id],
              ['Tax ID Type',  vendor.tax_id_type],
              ['W9 On File',   vendor.w9_on_file === true ? 'Yes' : vendor.w9_on_file === false ? 'No' : '—'],
              ['Notes',        vendor.company_notes],
            ].map(([label, val]) => val ? (
              <div key={label} style={{marginBottom:'8px'}}>
                <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{label}</div>
                <div style={{fontSize:F.base,color:T.text0,lineHeight:'1.4'}}>{val}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Contacts tab */}
      {tab === 'contacts' && (
        <div style={{flex:1,overflow:'hidden'}}>
          <ContactsTable filterVendorId={vendor.id} hidePropertyFilter={true}/>
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
        <VendorDetail key={selected.id} vendor={selected} onBack={handleBack}/>
      )}
    </div>
  );
}
