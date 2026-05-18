// ─────────────────────────────────────────────────────────────────────────────
// OwnersView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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

const CAT_OPTIONS = ['Active', 'Inactive', '???'];

const catBadgeStyle = cat => {
  if (cat === 'Active')   return css.badge(T.success, '#1e2a1e');
  if (cat === 'Inactive') return css.badge(T.text2, T.bg3);
  return css.badge(T.text3, T.bg3);
};

const STORE_KEY = 'ownersViewState';
const loadSaved = () => { try { const s = sessionStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };

// ─────────────────────────────────────────────────────────────────────────────
// More… popover — date filters only
// ─────────────────────────────────────────────────────────────────────────────
const OwnersMorePopover = ({ open, onClose, anchorRef, dateFilters, setDateFilters }) => {
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

  const toggleDate = period => {
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
      padding:'10px 12px', minWidth:'260px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
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
// Owners List
// ─────────────────────────────────────────────────────────────────────────────
const OwnersList = ({ owners, loading, error, onSelect }) => {
  const saved = useMemo(() => loadSaved(), []);

  const [catFilter,   setCatFilter]   = useState(saved?.catFilter   ?? 'Active');
  const [search,      setSearch]      = useState(saved?.search      ?? '');
  const [sortCol,     setSortCol]     = useState(saved?.sortCol     ?? 'prop_code');
  const [sortDir,     setSortDir]     = useState(saved?.sortDir     ?? 'asc');
  const [dateFilters, setDateFilters] = useState(saved?.dateFilters ?? { updated: null });
  const [moreOpen,    setMoreOpen]    = useState(false);
  const moreAnchorRef = useRef(null);

  useEffect(() => {
    document.title = 'Owners | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, []);

  // Persist filter state
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ catFilter, search, sortCol, sortDir, dateFilters }));
    } catch {}
  }, [catFilter, search, sortCol, sortDir, dateFilters]);

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...owners].sort((a, b) => {
    // null prop_codes sort last
    if (sortCol === 'prop_code') {
      const av = a.prop_code || '￿';
      const bv = b.prop_code || '￿';
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [owners, sortCol, sortDir]);

  const applyFilters = useCallback((list, { skipCat = false } = {}) => {
    return list.filter(o => {
      if (!skipCat && catFilter !== 'All' && (o.category||'') !== catFilter) return false;
      if (dateFilters.updated && !isInRange(o.updated_at, dateFilters.updated)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (o.company_dba  ||'').toLowerCase().includes(q) ||
          (o.entity_name  ||'').toLowerCase().includes(q) ||
          (o.prop_code    ||'').toLowerCase().includes(q) ||
          (o.tax_id_ein   ||'').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catFilter, search, dateFilters]);

  const filtered      = useMemo(() => applyFilters(sorted),                [sorted, applyFilters]);
  const filteredNoCat = useMemo(() => applyFilters(sorted, {skipCat:true}), [sorted, applyFilters]);

  const catCounts = useMemo(() => {
    const c = { All: filteredNoCat.length };
    CAT_OPTIONS.forEach(cat => { c[cat] = filteredNoCat.filter(o => (o.category||'') === cat).length; });
    return c;
  }, [filteredNoCat]);

  const hasMoreActive    = !!dateFilters.updated;
  const hasActiveFilters = catFilter !== 'Active' || search !== '' || !!dateFilters.updated;

  const clearFilters = () => {
    setCatFilter('Active');
    setSearch(''); setDateFilters({ updated: null });
  };

  const renderTh = (c, label, extraStyle={}) => (
    <th key={c} style={{...css.th, ...extraStyle}} onClick={() => toggleSort(c)}>
      {label}{sortCol === c
        ? <span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>
        : <span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const renderRow = (o, i) => {
    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/owners/${o.id}`, '_blank');
        if (tab) tab.focus();
      } else {
        onSelect(o);
      }
    };

    return (
      <tr key={o.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={openDetail}>
        <td style={{...css.td}} title={o.company_dba}>{o.company_dba||''}</td>
        <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{o.prop_code||''}</td>
        <td style={{...css.td}}>
          {o.category ? <span style={catBadgeStyle(o.category)}>{o.category}</span> : ''}
        </td>
        <td style={{...css.td,color:T.text1}} title={o.entity_name}>{o.entity_name||''}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{o.entity_type||''}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}} title={o.tax_id_ein}>{o.tax_id_ein||''}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{fmtNumDate(o.updated_at)}</td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Owners</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Filter bar: Category pills | More… | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>

          {/* Category pills */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All',...CAT_OPTIONS].map(cat => {
              const cnt    = catCounts[cat] ?? 0;
              const active = catFilter === cat;
              return (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',
                    display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {cat}
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
            <OwnersMorePopover
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
              style={{width:'220px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading owners…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>
              <col style={{width:'60px'}}/>
              <col style={{width:'80px'}}/>
              <col style={{width:'auto'}}/>
              <col style={{width:'140px'}}/>
              <col style={{width:'120px'}}/>
              <col style={{width:'88px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('company_dba','Company')}
                {renderTh('prop_code','Prop', {paddingLeft:'10px'})}
                {renderTh('category','Category')}
                {renderTh('entity_name','Entity Name')}
                {renderTh('entity_type','Entity Type')}
                {renderTh('tax_id_ein','EIN')}
                {renderTh('updated_at','Updated')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No owners match filters</td></tr>
              )}
              {filtered.map((o, i) => renderRow(o, i))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Owner Detail — placeholder
// ─────────────────────────────────────────────────────────────────────────────
export const OwnerDetail = ({ owner, onBack }) => {
  useEffect(() => {
    const name = owner?.company_dba || 'Owner';
    document.title = `${name} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [owner]);

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

  if (!owner) return null;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text1}>
            ← Owners
          </button>
          {owner.prop_code && <span style={{color:T.accent,fontSize:F.sm,fontWeight:'500'}}>{owner.prop_code}</span>}
          {owner.category && (
            <span style={{marginLeft:'auto'}}>
              <span style={catBadgeStyle(owner.category)}>{owner.category}</span>
            </span>
          )}
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{owner.company_dba||'Untitled Owner'}</div>
        {owner.entity_name && (
          <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>{owner.entity_name}</div>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        <div style={{...css.card,maxWidth:'600px'}}>
          <div style={css.secTitle}>Owner Info</div>
          {[
            ['Company DBA',  owner.company_dba],
            ['Prop Code',    owner.prop_code],
            ['Category',     owner.category],
            ['Entity Name',  owner.entity_name],
            ['Entity Type',  owner.entity_type],
            ['Entity State', owner.entity_state],
            ['Tax ID (EIN)', owner.tax_id_ein],
            ['Phone',        owner.main_phone],
            ['Address',      [owner.address, owner.city, owner.state, owner.zip].filter(Boolean).join(', ')],
            ['Notes',        owner.company_notes],
          ].map(([label, val]) => val ? (
            <div key={label} style={{marginBottom:'8px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{label}</div>
              <div style={{fontSize:F.base,color:T.text0,lineHeight:'1.4'}}>{val}</div>
            </div>
          ) : null)}
        </div>
        <div style={{marginTop:'16px',padding:'12px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',maxWidth:'600px'}}>
          <div style={{fontSize:F.sm,color:T.text2,fontStyle:'italic'}}>
            Full owner detail page — coming in a future build.
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function OwnersView() {
  const [owners,   setOwners]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('property_owners', 'select=*&order=prop_code.asc.nullslast')
      .then(data => { setOwners(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = useCallback(o => {
    history.pushState({ ownerId: o.id }, '');
    setSelected(o);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.ownerId) history.replaceState({}, '');
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
        <OwnersList owners={owners} loading={loading} error={error} onSelect={handleSelect}/>
      </div>
      {selected && (
        <OwnerDetail key={selected.id} owner={selected} onBack={handleBack}/>
      )}
    </div>
  );
}
