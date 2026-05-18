// ─────────────────────────────────────────────────────────────────────────────
// ContactsView.jsx  —  SedonaCRM Phase 2 UI
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

const ContactsList = ({ contacts, loading, error, onSelect }) => {
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
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Contacts | SedonaCRM';
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
        const tab = window.open(`${window.location.origin}/contacts/${contact.id}`, '_blank');
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
        onClick={openDetail}>
        <td style={{...css.td,fontWeight:'500'}} title={contact.full_name}>{contact.full_name||''}</td>
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
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Contacts</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Row 1: Property strip */}
        <div style={{display:'flex',gap:'4px',overflowX:'auto',scrollbarWidth:'none',marginBottom:'5px'}}>
          <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
          {activeProps.map(pc => (
            <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
          ))}
        </div>

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
// ContactDetail — placeholder detail view
// ─────────────────────────────────────────────────────────────────────────────
export const ContactDetail = ({ contact, onBack }) => {
  useEffect(() => {
    const name = contact.full_name || 'Contact';
    document.title = `${name} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [contact.full_name]);

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

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Contacts
          </button>
          <span style={{color:T.text3,fontSize:F.sm}}>{contact.category||'—'}</span>
          <span style={{marginLeft:'auto'}}>
            <ContactStatusBadge status={contact.status}/>
          </span>
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{contact.full_name||'Unnamed Contact'}</div>
        {contact.company_dba && (
          <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>{contact.company_dba}</div>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px',background:T.bg1}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',maxWidth:'900px'}}>
          <div style={css.card}>
            <div style={css.secTitle}>Contact Info</div>
            {field('Full Name', contact.full_name)}
            {field('Category', contact.category)}
            {field('Company', contact.company_dba)}
            {field('Title', contact.title)}
            {field('Property', contact.prop_code)}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Communication</div>
            {field('Email', contact.email)}
            {field('Phone', contact.primary_phone)}
            {field('Alt Phone', contact.alt_phone)}
            {field('Website', contact.website)}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Address</div>
            {field('Street', contact.address)}
            {field('City', contact.city)}
            {field('State', contact.state)}
            {field('ZIP', contact.zip)}
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Record</div>
            {field('Status', contact.status ? contact.status.charAt(0).toUpperCase()+contact.status.slice(1) : null)}
            {field('Added',   fmtDate(contact.created_at))}
            {field('Updated', fmtDate(contact.updated_at))}
          </div>
          {contact.notes && (
            <div style={{...css.card,gridColumn:'1 / -1'}}>
              <div style={css.secTitle}>Notes</div>
              <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.5',whiteSpace:'pre-wrap'}}>{contact.notes}</div>
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
export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('contacts', 'select=*&order=full_name.asc')
      .then(data => { setContacts(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const handleSelect = useCallback((contact) => {
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
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
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
        />
      )}
    </div>
  );
}
