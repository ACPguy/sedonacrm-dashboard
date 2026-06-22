// ─────────────────────────────────────────────────────────────────────────────
// OwnersView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Briefcase, Eye, EyeSlash, CaretLeft, CaretRight, ClipboardText } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import RichTextEditor from './RichTextEditor';
import ContactsTable from './shared/ContactsTable';
import TasksView from './TasksView';

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
export const fmtDate = fmtNumDate;

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
        const tab = window.open(`${window.location.origin}/owners/${o.podio_id ?? 'X'+o.id.slice(-6)}`, '_blank');
        if (tab) tab.focus();
      } else {
        try{sessionStorage.setItem('ownersBackUrl',window.location.href);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('ownersNavList',JSON.stringify(navL));sessionStorage.setItem('ownersNavIndex',String(filtered.findIndex(r=>r.id===o.id)));}catch{}
        onSelect(o);
      }
    };

    return (
      <tr key={o.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td}} title={o.company_dba}>
          <a href={`/owners/${o.podio_id ?? 'X'+o.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(o);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {o.company_dba||''}
          </a>
        </td>
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
          <Briefcase size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Owners</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Filter bar: Category pills | More… | Clear | Search */}
        <div className="filter-row" style={{gap:'6px',alignItems:'center',minWidth:0}}>

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
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur(); } }}
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
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
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
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length === 0 && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No owners match filters</div>}
            {filtered.map((o, i) => {
              const rowBg = i%2===0?'transparent':T.bg0;
              return (
                <div key={o.id} style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{try{sessionStorage.setItem('ownersBackUrl',window.location.href);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('ownersNavList',JSON.stringify(navL));sessionStorage.setItem('ownersNavIndex',String(filtered.findIndex(r=>r.id===o.id)));}catch{}onSelect(o);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{fontWeight:'600',fontSize:F.base,color:T.text0,marginBottom:'4px'}}>{o.company_dba||'—'}</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {o.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{o.prop_code}</span>}
                    {o.category&&<span style={catBadgeStyle(o.category)}>{o.category}</span>}
                    {o.entity_type&&<span style={{fontSize:F.xs,color:T.text2}}>{o.entity_type}</span>}
                  </div>
                  {o.entity_name&&<div style={{fontSize:F.xs,color:T.text2,marginTop:'3px'}}>{o.entity_name}</div>}
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
// Owner Detail — micro-components
// ─────────────────────────────────────────────────────────────────────────────
const OW_CAT_OPTS    = ['Active', 'Inactive', '???'];
const OW_ENTITY_OPTS = ['Limited Liability Company', 'Partnership', 'Sole Proprietor'];

const OwFieldRow = ({ label, children, topAlign = false, hoverable = true }) => (
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

const OwInlineBlur = ({ value, onSave, type='text', highlight=false, readOnly=false }) => {
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

const OwInlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e=>{await onSave(e.target.value||null);}}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const OwTaxIdField = ({ value, onSave }) => {
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

const OwActivityPanel = ({ collapsed, onCollapse, width, onMouseDown }) => {
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
// Owner Detail — full form
// ─────────────────────────────────────────────────────────────────────────────
export const OwnerDetail = ({ owner, onBack, onUpdate }) => {
  const router = useRouter();
  const [data, setData]                       = useState(owner);
  const [primaryContact, setPrimaryContact]   = useState(null);
  const [linkedProp, setLinkedProp]           = useState(null);
  const [rightCollapsed, setRightCollapsed]   = useState(false);
  const [rightWidth, setRightWidth]           = useState(300);
  const [copied, setCopied]                   = useState(false);
  const [ownerTab, setOwnerTab]               = useState('properties');
  const [agmtData, setAgmtData]               = useState(null);
  const [agmtLoading, setAgmtLoading]         = useState(false);
  const [navList, setNavList]                 = useState(null);
  const [navIdx, setNavIdx]                   = useState(-1);
  const [navLoading, setNavLoading]           = useState(false);
  const [ownerTopTab, setOwnerTopTab]         = useState('tasks');
  const agmtFetched = useRef(false);
  const resizingRight = useRef(false);

  // Mount: fetch primary contact + linked property (for linker display + Properties tab)
  useEffect(() => {
    if (data.primary_contact_id) {
      sbFetch('contacts', `id=eq.${data.primary_contact_id}&select=id,full_name,podio_id`)
        .then(rows => setPrimaryContact(rows[0]||null)).catch(()=>{});
    }
    if (data.prop_code) {
      sbFetch('properties', `prop_code=eq.${data.prop_code}&select=*`)
        .then(rows => setLinkedProp(rows[0]||null)).catch(()=>{});
    }
  }, []);

  // Lazy: Listing Agreement tab
  useEffect(() => {
    if (ownerTab !== 'listing' || agmtFetched.current) return;
    agmtFetched.current = true;
    if (!data.prop_code) { setAgmtData([]); return; }
    setAgmtLoading(true);
    sbFetch('property_agreements', `prop_code=eq.${data.prop_code}&select=*`)
      .then(rows => setAgmtData(rows||[]))
      .catch(()=>setAgmtData([]))
      .finally(()=>setAgmtLoading(false));
  }, [ownerTab]);

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
    document.title = `${data.company_dba || 'Owner'} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.company_dba]);

  // Nav list from sessionStorage
  useEffect(() => {
    try {
      const nl = sessionStorage.getItem('ownersNavList');
      const ni = sessionStorage.getItem('ownersNavIndex');
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
      const rows = await sbFetch('property_owners', query);
      if (rows && rows[0]) {
        setData(rows[0]);
        setNavIdx(next);
        sessionStorage.setItem('ownersNavIndex', String(next));
        const newUrl = entry.podio_id ? `/owners/${entry.podio_id}` : `/owners/X${entry.id.slice(-6)}`;
        window.history.replaceState(null, '', newUrl);
        setPrimaryContact(null);
        setLinkedProp(null);
        setAgmtData(null);
        agmtFetched.current = false;
        setOwnerTab('properties');
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
    await sbPatch('property_owners', data.id, { [field]: val ?? null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/owners/${data.podio_id ?? 'X'+data.id.slice(-6)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const expiryStyle = d => {
    if (!d) return {};
    const days = Math.round((new Date(d) - new Date()) / (1000*60*60*24));
    if (days < 0)    return {color:'#fff',fontWeight:'700',background:'#7a0000',borderRadius:'3px',padding:'2px 6px',display:'inline-block'};
    if (days <= 30)  return {color:'#e07070',fontWeight:'700'};
    if (days <= 60)  return {color:'#d4924a',fontWeight:'700'};
    if (days <= 90)  return {color:'#f0d060',fontWeight:'700'};
    if (days <= 120) return {color:'#6ab06a',fontWeight:'700'};
    return {};
  };

  const owCatBadge = cat => {
    if (cat === 'Active')   return css.badge(T.success, '#1e2a1e');
    if (cat === 'Inactive') return css.badge(T.text2, T.bg3);
    return css.badge(T.text3, T.bg3);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <Briefcase size={14} weight="bold"/>← Owners
          </button>
          {data.category && <span style={owCatBadge(data.category)}>{data.category}</span>}
          {data.entity_type && <span style={css.badge(T.text2, T.bg3)}>{data.entity_type}</span>}
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',flexShrink:0,transition:'color 0.2s'}}
            onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=T.text0;}}
            onMouseLeave={e=>{if(!copied)e.currentTarget.style.color=T.text2;}}>
            {copied ? '✓ Copied' : '⧉ Copy Link'}
          </button>

          {/* Prev/Next nav */}
          {navList&&navList.length>1&&(
            <div style={{display:'flex',alignItems:'center',gap:'3px',flexShrink:0,marginLeft:'auto'}}>
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
          <Briefcase size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <div style={{fontSize:F.lg,fontWeight:'700',color:'#E8630A'}}>{data.company_dba||'Untitled Owner'}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:'2px',padding:'0 16px',borderBottom:`1px solid ${T.border}`,background:T.bg1,flexShrink:0}}>
        {[['tasks','Tasks'],['info','Owner Info']].map(([k,label])=>(
          <button key={k} onClick={()=>setOwnerTopTab(k)} style={{
            padding:'8px 14px',fontSize:'13px',fontWeight:ownerTopTab===k?'600':'400',
            color:ownerTopTab===k?T.accent:T.text1,background:'none',border:'none',
            borderBottom:ownerTopTab===k?`2px solid ${T.accent}`:'2px solid transparent',
            cursor:'pointer',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px'
          }}>
            {k==='tasks'&&<ClipboardText size={14}/>}
            {label}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {ownerTopTab==='tasks'&&(
        <div style={{flex:1,overflow:'hidden'}}>
          <TasksView filterPropCode={data.prop_code} hidePropertyPills embeddedMode/>
        </div>
      )}

      {/* Owner Info tab (existing body) */}
      {ownerTopTab==='info'&&(
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Left: fields + sub-tabs */}
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>

            {/* 2. Property linker */}
            <OwFieldRow label="Property" hoverable={false}>
              {linkedProp
                ? <span style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                    onClick={()=>router.push('/properties/'+(linkedProp.podio_id??'X'+linkedProp.id.slice(-6)))}>
                    {linkedProp.prop_code} — {linkedProp.property_name}
                  </span>
                : <span style={{fontSize:F.base,color:T.text3,fontStyle:'italic'}}>
                    {data.prop_code || '—'}
                  </span>
              }
            </OwFieldRow>

            {/* 3. Company DBA */}
            <OwFieldRow label="Company DBA">
              <OwInlineBlur value={data.company_dba||''} onSave={v=>save('company_dba',v)} highlight/>
            </OwFieldRow>

            {/* 4. Category */}
            <OwFieldRow label="Category">
              <OwInlineSelect value={data.category} options={OW_CAT_OPTS} onSave={v=>save('category',v)}/>
            </OwFieldRow>

            {/* 5. Primary Contact linker */}
            <OwFieldRow label="Primary Contact" hoverable={false}>
              {primaryContact
                ? <span style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                    onClick={()=>router.push('/contacts/'+(primaryContact.podio_id??'X'+primaryContact.id.slice(-6)))}>
                    {primaryContact.full_name}
                  </span>
                : <span style={{fontSize:F.base,color:T.text3,fontStyle:'italic'}}>—</span>
              }
            </OwFieldRow>

            {/* 6. Main Phone */}
            <OwFieldRow label="Main Phone">
              <OwInlineBlur value={data.main_phone||''} onSave={v=>save('main_phone',v)}/>
            </OwFieldRow>

            {/* 7. Fax */}
            <OwFieldRow label="Fax">
              <OwInlineBlur value={data.fax||''} onSave={v=>save('fax',v)}/>
            </OwFieldRow>

            {/* 8. Company Notes */}
            <OwFieldRow label="Company Notes" topAlign>
              <RichTextEditor value={data.company_notes||''} onSave={v=>save('company_notes',v)} minRows={5}/>
            </OwFieldRow>

            {/* 9–12. Address */}
            <OwFieldRow label="Address">
              <OwInlineBlur value={data.address||''} onSave={v=>save('address',v)}/>
            </OwFieldRow>
            <OwFieldRow label="City">
              <OwInlineBlur value={data.city||''} onSave={v=>save('city',v)}/>
            </OwFieldRow>
            <OwFieldRow label="State">
              <OwInlineBlur value={data.state||''} onSave={v=>save('state',v)}/>
            </OwFieldRow>
            <OwFieldRow label="ZIP">
              <OwInlineBlur value={data.zip||''} onSave={v=>save('zip',v)}/>
            </OwFieldRow>

            {/* ENTITY section divider */}
            <div style={{padding:'7px 16px 5px',background:'rgba(255,255,255,0.015)',borderTop:`0.5px solid ${T.border}`,borderBottom:`0.5px solid ${T.border}`}}>
              <span style={{fontSize:F.xs,fontWeight:'700',color:T.text3,textTransform:'uppercase',letterSpacing:'0.1em'}}>Entity</span>
            </div>

            {/* 13. Entity Type */}
            <OwFieldRow label="Entity Type">
              <OwInlineSelect value={data.entity_type} options={OW_ENTITY_OPTS} onSave={v=>save('entity_type',v)}/>
            </OwFieldRow>

            {/* 14. Entity Name */}
            <OwFieldRow label="Entity Name">
              <OwInlineBlur value={data.entity_name||''} onSave={v=>save('entity_name',v)}/>
            </OwFieldRow>

            {/* 15. Entity State */}
            <OwFieldRow label="Entity State">
              <OwInlineBlur value={data.entity_state||''} onSave={v=>save('entity_state',v)}/>
            </OwFieldRow>

            {/* 16. Entity Sig Block */}
            <OwFieldRow label="Sig Block" topAlign>
              <RichTextEditor value={data.entity_sig_block||''} onSave={v=>save('entity_sig_block',v)} minRows={5}/>
            </OwFieldRow>

            {/* 17. Tax ID / EIN — sensitive */}
            <OwFieldRow label="Tax ID / EIN" hoverable={false}>
              <OwTaxIdField value={data.tax_id_ein||''} onSave={v=>save('tax_id_ein',v)}/>
              <div style={{fontSize:F.xs,color:T.text3,fontStyle:'italic',marginTop:'3px'}}>Stored encrypted in app layer</div>
            </OwFieldRow>

            {/* 18. Old Archived Property */}
            <OwFieldRow label="Old Archived Prop">
              <OwInlineBlur value={data.old_archived_property||''} onSave={v=>save('old_archived_property',v)}/>
            </OwFieldRow>

            {/* 19. Podio ID — read-only */}
            <OwFieldRow label="Podio ID" hoverable={false}>
              {data.podio_id
                ? <span style={{fontSize:F.sm,color:T.text1,fontFamily:'monospace'}}>{data.podio_id}</span>
                : <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Available after Podio sync</span>
              }
            </OwFieldRow>

            {/* 20–21. Timestamps — read-only */}
            <OwFieldRow label="Created" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text2}}>{data.created_at ? fmtDate(data.created_at) : '—'}</span>
            </OwFieldRow>
            <OwFieldRow label="Last Updated" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text2}}>{data.updated_at ? fmtDate(data.updated_at) : '—'}</span>
            </OwFieldRow>
          </div>

          {/* Sub-tabs: Properties | Listing Agreement */}
          <div style={{margin:'16px 16px 0'}}>
            <div style={{display:'flex',gap:'2px',borderBottom:`0.5px solid ${T.border}`}}>
              {[['properties','Properties'],['listing','Listing Agreement']].map(([key,label])=>(
                <button key={key} onClick={()=>setOwnerTab(key)}
                  style={{background:'transparent',border:'none',padding:'7px 14px',fontSize:F.sm,cursor:'pointer',
                    color:ownerTab===key?T.accent:T.text1,
                    borderBottom:ownerTab===key?`2px solid ${T.accent}`:'2px solid transparent',
                    fontWeight:ownerTab===key?'600':'400'}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Properties tab */}
            {ownerTab==='properties'&&(
              <div style={{padding:'16px 0'}}>
                {!linkedProp && !data.prop_code && (
                  <div style={{color:T.text3,fontSize:F.sm,fontStyle:'italic'}}>No property linked to this owner</div>
                )}
                {!linkedProp && data.prop_code && (
                  <div style={{color:T.text3,fontSize:F.sm}}>Loading…</div>
                )}
                {linkedProp && (
                  <div onClick={()=>router.push('/properties/'+(linkedProp.podio_id??'X'+linkedProp.id.slice(-6)))}
                    style={{...css.card,cursor:'pointer',display:'flex',flexDirection:'column',gap:'6px'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                    onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:F.base,fontWeight:'700',color:T.accent}}>{linkedProp.prop_code}</span>
                      {linkedProp.status && (
                        <span style={css.badge(
                          linkedProp.status==='Active'?T.success:T.text2,
                          linkedProp.status==='Active'?'#1e2a1e':T.bg3
                        )}>{linkedProp.status}</span>
                      )}
                    </div>
                    <div style={{fontSize:F.base,color:T.text0}}>{linkedProp.property_name||''}</div>
                    {linkedProp.address && (
                      <div style={{fontSize:F.sm,color:T.text2}}>
                        {[linkedProp.address,linkedProp.city,linkedProp.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Listing Agreement tab */}
            {ownerTab==='listing'&&(
              <div style={{padding:'16px 0'}}>
                {agmtLoading && <div style={{color:T.text3,fontSize:F.sm}}>Loading…</div>}
                {!agmtLoading && agmtData && agmtData.length === 0 && (
                  <div style={{color:T.text3,fontSize:F.sm,fontStyle:'italic'}}>No listing agreement on record</div>
                )}
                {!agmtLoading && agmtData && agmtData.map(agmt => (
                  <div key={agmt.id} style={{...css.card,marginBottom:'10px'}}>
                    {[
                      ['Agreement Type',    agmt.listing_agreement_type],
                      ['Listing Start',     agmt.listing_start_date ? fmtDate(agmt.listing_start_date) : null],
                      ['ACP Listing Status',agmt.acp_listing_status],
                      ['PM Fee Type',       agmt.pm_fee_type],
                      ['PM Fee %',          agmt.pm_fee_pct != null ? (Number(agmt.pm_fee_pct)*100).toFixed(2)+'%' : null],
                    ].map(([label,val])=>val?(
                      <div key={label} style={{display:'flex',gap:'12px',padding:'5px 0',borderBottom:`0.5px solid ${T.border}`}}>
                        <div style={{width:'150px',fontSize:F.sm,color:T.text2,flexShrink:0}}>{label}</div>
                        <div style={{fontSize:F.sm,color:T.text0}}>{val}</div>
                      </div>
                    ):null)}
                    {agmt.listing_expiry_date&&(
                      <div style={{display:'flex',gap:'12px',padding:'5px 0',borderBottom:`0.5px solid ${T.border}`}}>
                        <div style={{width:'150px',fontSize:F.sm,color:T.text2,flexShrink:0}}>Listing Expiry</div>
                        <div style={{fontSize:F.sm,...expiryStyle(agmt.listing_expiry_date)}}>{fmtDate(agmt.listing_expiry_date)}</div>
                      </div>
                    )}
                    {linkedProp&&(
                      <div style={{marginTop:'12px'}}>
                        <button
                          onClick={()=>router.push('/properties/'+(linkedProp.podio_id??'X'+linkedProp.id.slice(-6))+'?tab=listing')}
                          style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 12px',color:T.accent,fontSize:F.sm,cursor:'pointer'}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                          View full Listing tab →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{height:'40px'}}/>
        </div>

        {/* Right: Activity panel */}
        <OwActivityPanel
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
        <OwnerDetail key={selected.id} owner={selected} onBack={handleBack} onUpdate={updated=>setSelected(updated)}/>
      )}
    </div>
  );
}
