// ─────────────────────────────────────────────────────────────────────────────
// ContactsView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { UserCircle } from '@phosphor-icons/react';
import RichTextEditor from './RichTextEditor';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
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

const CATEGORY_OPTIONS = ['Vendor', 'Tenant', 'Broker', 'Investor', 'ACP Client (Primary)', 'ACP Client Other', 'Prospect TNT', 'Other'];

const ContactStatusBadge = ({ status }) => {
  const s = (status||'').toLowerCase();
  const [color, bg] = s === 'active' ? [T.success, '#1e2a1e'] : [T.text2, T.bg3];
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  return <span style={css.badge(color, bg)}>{label}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// EditableField — inline edit with select support
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
// More... popover — date filters: Updated / Added
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
      if (isActive) return { updated: null, added: null };
      return { updated: null, added: null, [row]: period };
    });
  };

  const dateRows = [
    { key: 'updated', label: 'Updated' },
    { key: 'added',   label: 'Added'   },
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
      padding:'10px 12px', minWidth:'260px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
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
// ContactsList
// ─────────────────────────────────────────────────────────────────────────────
const NCOLS = 7;

export const ContactsList = ({ contacts, loading, error, onSelect, hidePropertyFilter = false }) => {
  const [statusFilter, setStatusFilter]     = useState('Active');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [propFilter, setPropFilter]         = useState([]);
  const [search, setSearch]                 = useState('');
  const [activeProps, setActiveProps]       = useState([]);
  const [sortCol, setSortCol]               = useState('full_name');
  const [sortDir, setSortDir]               = useState('asc');
  const [dateFilters, setDateFilters]       = useState({ updated: null, added: null });
  const [moreOpen, setMoreOpen]             = useState(false);
  const moreAnchorRef = useRef(null);

  useEffect(() => {
    if (hidePropertyFilter) return;
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
  }, [hidePropertyFilter]);

  useEffect(() => {
    if (hidePropertyFilter) return;
    document.title = 'Contacts | SedonaCRM';
    return () => { document.title = 'SedonaCRM'; };
  }, [hidePropertyFilter]);

  const toggleProp = code => {
    if (code === 'All') { setPropFilter([]); return; }
    setPropFilter(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...contacts].sort((a, b) => {
    const av = a[sortCol] ?? '';
    const bv = b[sortCol] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [contacts, sortCol, sortDir]);

  const applyFilters = useCallback((list, skipCategory = false) => {
    return list.filter(c => {
      if (statusFilter === 'Active'   && c.status !== 'active')   return false;
      if (statusFilter === 'Archived' && c.status !== 'archived') return false;
      if (!skipCategory && categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      if (propFilter.length > 0 && !propFilter.includes(c.prop_code)) return false;
      if (dateFilters.updated && !isInRange(c.updated_at, dateFilters.updated)) return false;
      if (dateFilters.added   && !isInRange(c.created_at, dateFilters.added))   return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (c.full_name||'').toLowerCase().includes(q) ||
          (c.company_dba||'').toLowerCase().includes(q) ||
          (c.email||'').toLowerCase().includes(q) ||
          (c.primary_phone||'').toLowerCase().includes(q) ||
          (c.prop_code||'').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, categoryFilter, propFilter, dateFilters, search]);

  const filtered           = useMemo(() => applyFilters(sorted),       [sorted, applyFilters]);
  const filteredNoCategory = useMemo(() => applyFilters(sorted, true), [sorted, applyFilters]);

  const categoryCounts = useMemo(() => {
    const c = {};
    CATEGORY_OPTIONS.forEach(cat => { c[cat] = 0; });
    filteredNoCategory.forEach(contact => {
      if (contact.category && c[contact.category] !== undefined) c[contact.category]++;
    });
    return c;
  }, [filteredNoCategory]);

  const grouped = useMemo(() => propFilter.length >= 1
    ? [...propFilter].sort()
        .map(pc => ({
          prop_code: pc,
          rows: filtered.filter(c => c.prop_code === pc),
        }))
        .filter(g => g.rows.length > 0)
    : null
  , [filtered, propFilter]);

  const hasActiveDateFilter = !!(dateFilters.updated || dateFilters.added);
  const hasMoreActive       = hasActiveDateFilter;
  const hasActiveFilters    = propFilter.length > 0 || categoryFilter !== 'All' ||
    statusFilter !== 'Active' || search !== '' || hasActiveDateFilter;

  const clearFilters = () => {
    setStatusFilter('Active'); setCategoryFilter('All'); setPropFilter([]);
    setSearch(''); setDateFilters({ updated: null, added: null });
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

  const renderRow = (contact, i) => {
    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/contacts/${contact.podio_id ?? 'X'+contact.id.slice(-6)}`, '_blank');
        if (tab) tab.focus();
      } else {
        onSelect(contact);
      }
    };
    return (
      <tr key={contact.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td,fontWeight:'500'}} title={contact.full_name}>
          <a href={`/contacts/${contact.podio_id ?? 'X'+contact.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(contact);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {contact.full_name||''}
          </a>
        </td>
        <td style={{...css.td,color:T.accent,fontWeight:'600',fontSize:F.xs}}>{contact.prop_code||''}</td>
        <td style={{...css.td,color:T.text1}} title={contact.company_dba}>{contact.company_dba||''}</td>
        <td style={{...css.td,fontSize:F.xs}}>
          {contact.category
            ? <span style={css.badge(T.text1, T.bg3)}>{contact.category}</span>
            : ''}
        </td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{contact.primary_phone||''}</td>
        <td style={{...css.td,color:T.text2,fontSize:F.xs}} title={contact.email}>{contact.email||''}</td>
        <td style={{...css.td,overflow:'visible'}}><ContactStatusBadge status={contact.status}/></td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <UserCircle size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Contacts</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Row 1: Property strip */}
        {!hidePropertyFilter && (
          <div style={{display:'flex',gap:'4px',overflowX:'auto',scrollbarWidth:'none',marginBottom:'5px'}}>
            <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
            {activeProps.map(pc => (
              <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
            ))}
          </div>
        )}

        {/* Row 2: Category | Status | More... | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0,flexWrap:'wrap'}}>

          {/* Category pills with counts */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0,overflowX:'auto',scrollbarWidth:'none',maxWidth:'100%'}}>
            {['All', ...CATEGORY_OPTIONS].map(cat => {
              const cnt    = cat === 'All' ? null : (categoryCounts[cat] ?? 0);
              const active = categoryFilter === cat;
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  style={{padding:'3px 6px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {cat}
                  {cnt !== null && <span style={{color:active?T.text1:T.text3,fontSize:'10px'}}>·{cnt}</span>}
                </button>
              );
            })}
          </div>

          {/* Active / Archived / All */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['Active','Archived','All'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                  background:statusFilter===s?T.bg3:'transparent',
                  color:statusFilter===s?T.text0:T.text2,
                  fontWeight:statusFilter===s?'600':'400'}}>
                {s}
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
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading contacts…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              {/* Name     */} <col style={{width:'22%'}}/>
              {/* Prop     */} <col style={{width:'6%'}}/>
              {/* Company  */} <col style={{width:'20%'}}/>
              {/* Category */} <col style={{width:'16%'}}/>
              {/* Phone    */} <col style={{width:'11%'}}/>
              {/* Email    */} <col style={{width:'18%'}}/>
              {/* Status   */} <col style={{width:'7%'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('full_name',     'Name')}
                {renderTh('prop_code',     'Prop')}
                {renderTh('company_dba',   'Company')}
                {renderTh('category',      'Category')}
                {renderTh('primary_phone', 'Phone')}
                {renderTh('email',         'Email')}
                {renderTh('status',        'Status')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={NCOLS} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No contacts match filters</td></tr>
              )}
              {grouped ? (
                grouped.map(group => (
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={NCOLS} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                        {group.prop_code} <span style={{color:T.text3,fontWeight:'400'}}>({group.rows.length})</span>
                      </td>
                    </tr>
                    {group.rows.map((contact, i) => renderRow(contact, i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((contact, i) => renderRow(contact, i))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ContactDetail — full tabbed detail form
// ─────────────────────────────────────────────────────────────────────────────
export const ContactDetail = ({ contact, onBack, onUpdate }) => {
  const [tab,  setTab]  = useState('dashboard');
  const [data, setData] = useState(contact);
  const [copied, setCopied] = useState(false);

  // Document title
  useEffect(() => {
    document.title = `${data.full_name || 'Contact'} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.full_name]);

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
    await sbPatch('contacts', data.id, { [field]: val });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const TABS = ['Dashboard', 'Contact Info', 'Work Orders', 'Issues', 'Tenant', 'Communications'];
  const tk = t => t.toLowerCase().replace(/ /g, '-');

  const tabBtnStyle = active => ({
    background:'transparent', border:'none', padding:'6px 12px', fontSize:F.sm, cursor:'pointer',
    borderRadius:'4px 4px 0 0',
    color: active ? T.accent : T.text1,
    borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
    fontWeight: active ? '600' : '400',
    whiteSpace:'nowrap',
  });

  const placeholderPanel = (icon, msg, sub) => (
    <div style={css.card}>
      <div style={{padding:'32px 0', textAlign:'center'}}>
        <div style={{fontSize:'32px', color:T.bg3, marginBottom:'8px'}}>{icon}</div>
        <div style={{fontSize:F.base, color:T.text2, marginBottom:'4px'}}>{msg}</div>
        {sub && <div style={{fontSize:F.sm, color:T.text3}}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>

      {/* ── Header ── */}
      <div style={{padding:'10px 16px 0', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>

        {/* Row 1: Back + Copy Link */}
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px'}}>
          <button onClick={onBack}
            style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'4px 10px', color:T.text1, fontSize:F.sm, cursor:'pointer', flexShrink:0, display:'inline-flex', alignItems:'center', gap:'5px'}}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text1}>
            <UserCircle size={14} weight="bold"/>← Contacts
          </button>
          <div style={{marginLeft:'auto', display:'flex', gap:'6px'}}>
            <button onClick={copyLink}
              style={{padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
                border:`0.5px solid ${copied ? T.success : T.border}`,
                background:'transparent',
                color: copied ? T.success : T.text2}}>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Row 2: Name + company */}
        <div style={{marginBottom:'5px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <UserCircle size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
            <div style={{fontSize:F.lg, fontWeight:'600', color:T.text0, lineHeight:'1.3'}}>
              {data.full_name || 'Unnamed Contact'}
            </div>
          </div>
          {data.company_dba && (
            <div style={{fontSize:F.sm, color:T.text2, marginTop:'1px'}}>{data.company_dba}</div>
          )}
        </div>

        {/* Row 3: Badges */}
        <div style={{display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap', marginBottom:'5px'}}>
          {data.category && <span style={css.badge(T.text1, T.bg3)}>{data.category}</span>}
          <ContactStatusBadge status={data.status}/>
          {data.prop_code && <span style={css.badge(T.accent, '#1a2e3a')}>{data.prop_code}</span>}
          {data.podio_id && (
            <span style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em'}}>Podio</span>
              <span style={css.badge(T.text2, T.bg3)}>{data.podio_id}</span>
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{display:'flex', gap:'2px', marginTop:'4px', overflowX:'auto', scrollbarWidth:'none'}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(tk(t))} style={tabBtnStyle(tab === tk(t))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{flex:1, overflowY:'auto', padding:'16px', background:T.bg1}}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>

            {/* Summary card */}
            <div style={css.card}>
              <div style={css.secTitle}>Contact Summary</div>
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Full Name</div>
                <div style={{fontSize:F.base, color:T.text0, padding:'3px 5px', fontWeight:'600'}}>{data.full_name || '—'}</div>
              </div>
              {data.company_dba && (
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'2px'}}>Company</div>
                  <div style={{fontSize:F.base, color:T.text1, padding:'3px 5px'}}>{data.company_dba}</div>
                </div>
              )}
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px'}}>
                {data.category && <span style={css.badge(T.text1, T.bg3)}>{data.category}</span>}
                <ContactStatusBadge status={data.status}/>
              </div>
              {data.primary_phone && (
                <div style={{marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:F.xs, color:T.text3, minWidth:'50px'}}>Phone</span>
                  <a href={`tel:${data.primary_phone}`} style={{fontSize:F.sm, color:T.accent, textDecoration:'none'}}>{data.primary_phone}</a>
                </div>
              )}
              {data.email && (
                <div style={{marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:F.xs, color:T.text3, minWidth:'50px'}}>Email</span>
                  <a href={`mailto:${data.email}`} style={{fontSize:F.sm, color:T.accent, textDecoration:'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{data.email}</a>
                </div>
              )}
              {data.title && (
                <div style={{marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:F.xs, color:T.text3, minWidth:'50px'}}>Title</span>
                  <span style={{fontSize:F.sm, color:T.text1}}>{data.title}</span>
                </div>
              )}
            </div>

            {/* Recent Activity placeholder */}
            <div style={css.card}>
              <div style={css.secTitle}>Recent Activity</div>
              <div style={{padding:'24px 0', textAlign:'center'}}>
                <div style={{fontSize:'28px', color:T.bg3, marginBottom:'6px'}}>📋</div>
                <div style={{fontSize:F.sm, color:T.text3}}>Activity feed — coming in Phase 3</div>
              </div>
              <div style={{marginTop:'12px', borderTop:`0.5px solid ${T.border}`, paddingTop:'10px'}}>
                <div style={{fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'6px'}}>Record</div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:F.xs, color:T.text3, marginBottom:'4px'}}>
                  <span>Added</span><span style={{color:T.text2}}>{fmtDate(data.created_at)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:F.xs, color:T.text3}}>
                  <span>Updated</span><span style={{color:T.text2}}>{fmtDate(data.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Quick Links — deferred until FK columns added */}
            <div style={{...css.card, gridColumn:'1 / -1'}}>
              <div style={css.secTitle}>Linked Records</div>
              <div style={{fontSize:F.sm, color:T.text3, fontStyle:'italic'}}>
                Tenant, vendor, and owner links will appear here after Podio sync adds the FK columns.
              </div>
            </div>
          </div>
        )}

        {/* ── CONTACT INFO ── */}
        {tab === 'contact-info' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>

            {/* Name / Company / Role */}
            <div style={css.card}>
              <div style={css.secTitle}>Name / Company / Role</div>
              <EditableField label="Full Name"  value={data.full_name}   onSave={v => save('full_name', v)}/>
              <EditableField label="First Name" value={data.first_name}  onSave={v => save('first_name', v)}/>
              <EditableField label="Last Name"  value={data.last_name}   onSave={v => save('last_name', v)}/>
              <EditableField label="Company"    value={data.company_dba} onSave={v => save('company_dba', v)}/>
              <EditableField label="Title"      value={data.title}       onSave={v => save('title', v)}/>
            </div>

            {/* Contact Details */}
            <div style={css.card}>
              <div style={css.secTitle}>Contact Details</div>
              <EditableField label="Email"             value={data.email}             onSave={v => save('email', v)}/>
              <EditableField label="Primary Phone"     value={data.primary_phone}     onSave={v => save('primary_phone', v)}/>
              <EditableField label="Main Office Phone" value={data.main_office_phone} onSave={v => save('main_office_phone', v)}/>
              <EditableField label="Direct Phone"      value={data.direct_phone}      onSave={v => save('direct_phone', v)}/>
              <EditableField label="Alt Phone"         value={data.alt_phone}         onSave={v => save('alt_phone', v)}/>
              <EditableField label="Website"           value={data.website}           onSave={v => save('website', v)}/>
            </div>

            {/* Category / Status */}
            <div style={css.card}>
              <div style={css.secTitle}>Category / Status</div>
              <EditableField label="Category" value={data.category}  onSave={v => save('category', v)}  type="select" options={CATEGORY_OPTIONS}/>
              <EditableField label="Status"   value={data.status}    onSave={v => save('status', v)}    type="select" options={['active', 'archived']}/>
              <EditableField label="Property" value={data.prop_code} onSave={v => save('prop_code', v)}/>
            </div>

            {/* Address */}
            <div style={css.card}>
              <div style={css.secTitle}>Address</div>
              <EditableField label="Street" value={data.address} onSave={v => save('address', v)}/>
              <EditableField label="City"   value={data.city}    onSave={v => save('city', v)}/>
              <EditableField label="State"  value={data.state}   onSave={v => save('state', v)}/>
              <EditableField label="ZIP"    value={data.zip}     onSave={v => save('zip', v)}/>
            </div>

            {/* Notes — full width */}
            <div style={{...css.card, gridColumn:'1 / -1'}}>
              <div style={css.secTitle}>Notes</div>
              <EditableField label="" value={data.notes} onSave={v => save('notes', v)} type="textarea"/>
            </div>
          </div>
        )}

        {/* ── WORK ORDERS ── */}
        {tab === 'work-orders' && (
          placeholderPanel(
            '🔧',
            'Work order relationships will be available after Podio sync',
            'When contact_id is added to work_orders schema, this tab will show the shared WorkOrdersTable.'
          )
        )}

        {/* ── ISSUES ── */}
        {tab === 'issues' && (
          placeholderPanel(
            '⚠',
            'Issues relationships will be available after Podio sync',
            'When contact_id is added to issues schema, this tab will show the shared IssuesTable.'
          )
        )}

        {/* ── TENANT ── */}
        {tab === 'tenant' && (
          <div style={css.card}>
            <div style={css.secTitle}>Linked Tenant</div>
            <div style={{padding:'16px 0', textAlign:'center'}}>
              <div style={{fontSize:'28px', color:T.bg3, marginBottom:'6px'}}>🏢</div>
              <div style={{fontSize:F.sm, color:T.text3}}>No tenant record linked to this contact</div>
              <div style={{fontSize:F.xs, color:T.text3, marginTop:'4px', fontStyle:'italic'}}>
                Tenant links will be available after the tenant_id FK column is added to the contacts table.
              </div>
            </div>
          </div>
        )}

        {/* ── COMMUNICATIONS ── */}
        {tab === 'communications' && (
          placeholderPanel(
            '✉',
            'Email and SMS thread will appear here — coming in Phase 3',
            'Gmail sync + Twilio SMS — Phase 3 & 6'
          )
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('contacts', 'select=*&order=full_name.asc&limit=10000')
      .then(data => { setContacts(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = useCallback((contact) => {
    try { sessionStorage.setItem('contactsBackUrl', window.location.href); } catch {}
    history.pushState({ contactId: contact.id }, '');
    setSelected(contact);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.contactId) history.replaceState({}, '');
    setSelected(null);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:T.bg1}}>
      <div style={{display:selected?'none':'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
        <ContactsList
          contacts={contacts}
          loading={loading} error={error}
          onSelect={handleSelect}
        />
      </div>
      {selected && (
        <ContactDetail
          key={selected.id}
          contact={selected}
          onBack={handleBack}
          onUpdate={updated => setSelected(updated)}
        />
      )}
    </div>
  );
}
