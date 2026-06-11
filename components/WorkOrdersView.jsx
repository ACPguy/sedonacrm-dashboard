// ─────────────────────────────────────────────────────────────────────────────
// WorkOrdersView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Wrench, CaretLeft, CaretRight } from '@phosphor-icons/react';
import RichTextEditor from './RichTextEditor';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

// Paginates through all rows 1000 at a time (bypasses Supabase anon max_rows=1000 cap).
// Use for unfiltered full-table loads; prop-filtered fetches are always <1000.
export const sbFetchAll = async (table, baseParams = '') => {
  const PAGE = 1000;
  let offset = 0;
  let all = [];
  while (true) {
    const sep = baseParams ? '&' : '';
    const page = await sbFetch(table, `${baseParams}${sep}limit=${PAGE}&offset=${offset}`);
    all = all.concat(page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`[sbFetchAll] ${table} — fetched ${all.length} total rows (${Math.ceil(all.length/PAGE)} pages)`);
  return all;
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

const WO_CLOSED_STATUSES = ['Closed', 'Closed - Not Done'];
const isWoClosed = wo => WO_CLOSED_STATUSES.includes(wo.wo_status);

const isFuOverdue = (d, wo) => {
  if (!d || isWoClosed(wo)) return false;
  const date = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return date <= today;
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

// Stage badge — maps wo_status values (New / Request Sent / Re-Opened / Closed / Closed - Not Done)
export const StatusBadge = ({ status }) => {
  const map = {
    'New':               [T.accent,  '#1a2e3a'],
    'Request Sent':      [T.purple,  '#2a1f3a'],
    'Re-Opened':         [T.warn,    '#3d2e1a'],
    'Closed':            [T.success, '#1e2a1e'],
    'Closed - Not Done': [T.danger,  '#3d1f1f'],
  };
  const [color, bg] = map[status] || [T.text2, T.bg3];
  return <span style={css.badge(color, bg)}>{status || '—'}</span>;
};

// Open/Closed badge derived from wo_status
const OpenClosedBadge = ({ wo }) => {
  const closed = isWoClosed(wo);
  return <span style={css.badge(
    closed ? T.text2 : T.accent,
    closed ? T.bg3   : '#1a2e3a'
  )}>{closed ? 'Closed' : 'Open'}</span>;
};

export const PriorityDot = ({ priority }) => {
  const colors = { '???':T.text3, Urgent:T.danger, High:T.warn, Medium:T.success, Low:T.accent };
  return (
    <span style={{
      display:'inline-block', width:'7px', height:'7px', borderRadius:'50%',
      background:colors[priority]||T.text3, marginRight:'5px', flexShrink:0,
      verticalAlign:'middle', position:'relative', top:'-1px'
    }}/>
  );
};

export const PRIORITY_ORDER = { '???': 0, 'Urgent': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
const PRIORITY_OPTIONS = ['???', 'Urgent', 'High', 'Medium', 'Low'];

const NCOLS = 12; // WO# | Title | FU Date | Prop | Priority | Stage | Status | Vendor | Tenant | Updated | Opened | Closed

// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel
// ─────────────────────────────────────────────────────────────────────────────
export const ActivityPanel = ({ collapsed, onCollapse, width, onMouseDown }) => {
  const [tab, setTab] = useState('comments');
  return (
    <div style={{display:'flex',flexShrink:0,height:'100%'}}>
      <div onMouseDown={onMouseDown}
        style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
        onMouseEnter={e=>e.currentTarget.style.background=T.accent}
        onMouseLeave={e=>e.currentTarget.style.background=T.border}/>
      <div style={{width:collapsed?'36px':`${width}px`,background:T.bg0,borderLeft:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden',transition:'width 200ms ease',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',padding:collapsed?'9px 0':'8px 12px',borderBottom:`0.5px solid ${T.border}`,minHeight:'42px',flexShrink:0}}>
          {!collapsed && (
            <div style={{display:'flex',gap:'2px'}}>
              {['Comments','Activity'].map(t => (
                <button key={t} onClick={() => setTab(t.toLowerCase())}
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
        {!collapsed && (
          <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
            {tab==='comments' && (
              <div>
                <div style={{...css.card,marginBottom:'10px'}}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                    Comments and attached files will sync from Podio via API at go-live.
                  </p>
                </div>
                <div style={{textAlign:'center',marginTop:'32px'}}>
                  <span style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}}>💬</span>
                  <span style={{fontSize:F.sm,color:T.text3}}>Comments sync at go-live</span>
                </div>
              </div>
            )}
            {tab==='activity' && (
              <div>
                <div style={{...css.card,marginBottom:'10px'}}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                    Activity tracking begins at go-live.
                  </p>
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
// Kanban — columns by Priority (like Issues)
// ─────────────────────────────────────────────────────────────────────────────
const KanbanCardContent = ({ wo, vendors }) => {
  const vendor    = vendors.find(v => v.id === wo.vendor_id);
  const shortName = vendor?.company_dba
    ? vendor.company_dba.split(' ').slice(0, 2).join(' ')
    : null;
  const fuDate    = wo.follow_up_date ? fmtNumDate(wo.follow_up_date) : null;
  const fuOverdue = isFuOverdue(wo.follow_up_date, wo);

  return (
    <div style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'9px 10px',userSelect:'none'}}>
      <div style={{fontSize:F.sm,color:T.text0,fontWeight:'500',lineHeight:'1.35',marginBottom:'5px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
        {wo.short_description || 'Untitled'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'5px'}}>
        <span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>
          {wo.prop_code || '—'}
        </span>
        {wo.podio_wo_number && (
          <span style={{fontSize:F.xs,color:T.text2}}>#{wo.podio_wo_number}</span>
        )}
      </div>
      {wo.wo_status && (
        <div style={{marginBottom:'5px'}}>
          <StatusBadge status={wo.wo_status}/>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
        {shortName && (
          <span style={{fontSize:F.xs,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'90px'}}>{shortName}</span>
        )}
        {fuDate && (
          <span style={{fontSize:F.xs,color:fuOverdue?T.warn:T.text2,fontWeight:fuOverdue?'600':'400'}}>
            {fuOverdue && '⚠ '}{fuDate}
          </span>
        )}
      </div>
    </div>
  );
};

const KanbanCard = ({ wo, vendors, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: wo.id });
  const style = {
    transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    marginBottom: '7px',
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      onClick={e => { e.stopPropagation(); if (!isDragging) onCardClick(wo); }}>
      <KanbanCardContent wo={wo} vendors={vendors}/>
    </div>
  );
};

const KanbanColumn = ({ priority, wos, vendors, onCardClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: priority });
  const priColor = { '???':T.text2, Urgent:T.danger, High:T.warn, Medium:T.success, Low:T.accent };
  const color    = priColor[priority] || T.text2;
  const sorted   = [...wos].sort((a, b) => new Date(b.updated_at||0) - new Date(a.updated_at||0));

  return (
    <div style={{flex:'1 1 0',minWidth:'180px',maxWidth:'280px',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px 8px',borderBottom:`0.5px solid ${T.border}`,marginBottom:'8px',flexShrink:0}}>
        <PriorityDot priority={priority}/>
        <span style={{fontSize:F.xs,fontWeight:'700',color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{priority}</span>
        <span style={{fontSize:F.xs,color:T.text3,marginLeft:'auto'}}>({wos.length})</span>
      </div>
      <div ref={setNodeRef} style={{
        flex:1, overflowY:'auto', padding:'0 2px', minHeight:'80px', borderRadius:'4px',
        background: isOver ? 'rgba(110,159,216,0.07)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        {sorted.map(wo => (
          <KanbanCard key={wo.id} wo={wo} vendors={vendors} onCardClick={onCardClick}/>
        ))}
        {wos.length === 0 && (
          <div style={{color:T.text3,fontSize:F.xs,textAlign:'center',padding:'16px 0',fontStyle:'italic'}}>empty</div>
        )}
      </div>
    </div>
  );
};

const KanbanView = ({ wos, vendors, onCardClick, onPriorityChange }) => {
  const [activeWo, setActiveWo] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byPriority = useMemo(() =>
    PRIORITY_OPTIONS.reduce((acc, p) => {
      acc[p] = wos.filter(wo => (wo.priority || '???') === p);
      return acc;
    }, {})
  , [wos]);

  const handleDragStart = ({ active }) => {
    setActiveWo(wos.find(w => w.id === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveWo(null);
    if (!over) return;
    const newPriority = over.id;
    const wo = wos.find(w => w.id === active.id);
    if (!wo) return;
    const currentPriority = wo.priority || '???';
    if (currentPriority === newPriority) return;
    onPriorityChange(wo.id, newPriority, currentPriority);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{display:'flex',gap:'10px',height:'100%',overflow:'hidden',padding:'12px 14px'}}>
        {PRIORITY_OPTIONS.map(p => (
          <KanbanColumn key={p} priority={p} wos={byPriority[p]||[]} vendors={vendors} onCardClick={onCardClick}/>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeWo ? (
          <div style={{width:'220px',opacity:0.9,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',cursor:'grabbing'}}>
            <KanbanCardContent wo={activeWo} vendors={vendors}/>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// More... popover (date filters)
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
      if (isActive) return { opened: null, updated: null, closed: null };
      return { opened: null, updated: null, closed: null, [row]: period };
    });
  };

  const dateRows = [
    { key:'opened',  label:'Opened'  },
    { key:'updated', label:'Updated' },
    { key:'closed',  label:'Closed'  },
  ];
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
// WorkOrders List
// ─────────────────────────────────────────────────────────────────────────────
export const WorkOrdersList = ({ onSelect, hidePropStrip = false, hidePropertyFilter = false, hideSearch = false, filterPropCode }) => {
  const _hidePropStrip = hidePropStrip || hidePropertyFilter;
  const [wos, setWos]                       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [vendors, setVendors]               = useState([]);
  const [tenants, setTenants]               = useState([]);
  const [statusFilter, setStatusFilter]     = useState('Open');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [propFilter, setPropFilter]         = useState([]);
  const [search, setSearch]                 = useState('');
  const [activeProps, setActiveProps]       = useState([]);
  const [sortCol, setSortCol]               = useState('priority');
  const [sortDir, setSortDir]               = useState('asc');
  const [viewMode, setViewMode]             = useState('table');
  const [dateFilters, setDateFilters]       = useState({ opened: null, updated: null, closed: null });
  const [moreOpen, setMoreOpen]             = useState(false);
  const moreAnchorRef = useRef(null);

  // Server-side fetch — re-runs when status filter or prop filter changes
  useEffect(() => {
    setLoading(true); setError(null); setWos([]);
    const propPart = filterPropCode ? `&prop_code=eq.${encodeURIComponent(filterPropCode)}` : '';
    const statusPart =
      statusFilter === 'Open'   ? '&wo_status=not.in.(Closed,Closed%20-%20Not%20Done)' :
      statusFilter === 'Closed' ? '&wo_status=in.(Closed,Closed%20-%20Not%20Done)'     : '';
    const params = `select=*${statusPart}${propPart}&order=created_at.desc`;
    // All-status cross-property fetch can exceed 1000 rows — use paginated fetch
    const fetchFn = (statusFilter === 'All' && !filterPropCode) ? sbFetchAll : sbFetch;
    fetchFn('work_orders', params)
      .then(data => { setWos(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, [statusFilter, filterPropCode]);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
    sbFetch('vendors', 'select=id,company_dba&order=company_dba.asc')
      .then(data => setVendors(data))
      .catch(() => {});
    sbFetch('tenants', 'select=id,tenant_dba&order=tenant_dba.asc')
      .then(data => setTenants(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Work Orders | SedonaCRM';
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

  const priRank = p => PRIORITY_ORDER[p] ?? 99;

  const sorted = useMemo(() => [...wos].sort((a, b) => {
    let cmp = sortCol === 'priority'
      ? priRank(a.priority) - priRank(b.priority)
      : sortCol === 'follow_up_date'
        ? (a.follow_up_date||'9999') > (b.follow_up_date||'9999') ? 1 : -1
        : sortCol === 'podio_wo_number'
          ? (a.podio_wo_number||0) - (b.podio_wo_number||0)
          : String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''));
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    if (sortCol !== 'priority') return priRank(a.priority) - priRank(b.priority);
    return String(a.prop_code ?? '').localeCompare(String(b.prop_code ?? ''));
  }), [wos, sortCol, sortDir]);

  const applyFilters = useCallback((list, skipPriority = false) => {
    return list.filter(wo => {
      const closed = isWoClosed(wo);
      if (dateFilters.closed && !closed) return false;
      if (statusFilter === 'Open'   && closed)  return false;
      if (statusFilter === 'Closed' && !closed) return false;
      if (dateFilters.opened  && !isInRange(wo.created_at, dateFilters.opened))  return false;
      if (dateFilters.updated && !isInRange(wo.updated_at, dateFilters.updated)) return false;
      if (dateFilters.closed  && !isInRange(wo.closed_at,  dateFilters.closed))  return false;
      if (!skipPriority && priorityFilter !== 'All' && (wo.priority || '???') !== priorityFilter) return false;
      if (propFilter.length > 0 && !propFilter.includes(wo.prop_code)) return false;
      if (search) {
        const q     = search.toLowerCase();
        const vName = vendors.find(v => v.id === wo.vendor_id)?.company_dba || '';
        const tName = tenants.find(t => t.id === wo.tenant_id)?.tenant_dba  || '';
        const woNum = wo.podio_wo_number ? String(wo.podio_wo_number) : '';
        return (
          woNum.includes(q) ||
          (wo.short_description||'').toLowerCase().includes(q) ||
          (wo.prop_code||'').toLowerCase().includes(q) ||
          (wo.category||'').toLowerCase().includes(q) ||
          (wo.internal_notes||'').toLowerCase().includes(q) ||
          vName.toLowerCase().includes(q) ||
          tName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, priorityFilter, propFilter, search, dateFilters, vendors, tenants]);

  const filtered           = useMemo(() => applyFilters(sorted),       [sorted, applyFilters]);
  const filteredNoPriority = useMemo(() => applyFilters(sorted, true), [sorted, applyFilters]);

  // Diagnostic log — shows loaded total, status filter, and visible count after filters
  useEffect(() => {
    console.log(`[WorkOrdersList] loaded=${wos.length} statusFilter=${statusFilter} visible=${filtered.length}`);
  }, [wos.length, statusFilter, filtered.length]);

  const priorityCounts = useMemo(() => {
    const c = { '???': 0, Urgent: 0, High: 0, Medium: 0, Low: 0 };
    filteredNoPriority.forEach(wo => { const p = wo.priority || '???'; c[p] = (c[p]||0) + 1; });
    return c;
  }, [filteredNoPriority]);

  const grouped = useMemo(() => propFilter.length >= 1
    ? [...propFilter].sort()
        .map(pc => ({
          prop_code: pc,
          rows: filtered.filter(i => i.prop_code === pc)
            .sort((a, b) => priRank(a.priority) - priRank(b.priority)),
        }))
        .filter(g => g.rows.length > 0)
    : null
  , [filtered, propFilter]);

  const showClosed  = statusFilter === 'Closed';
  const showUpdated = !showClosed;

  const hasActiveDateFilter = !!(dateFilters.opened || dateFilters.updated || dateFilters.closed);
  const hasActiveFilters    = propFilter.length > 0 || priorityFilter !== 'All' ||
    statusFilter !== 'Open' || search !== '' || hasActiveDateFilter;

  const clearFilters = () => {
    setStatusFilter('Open'); setPriorityFilter('All'); setPropFilter([]);
    setSearch('');
    setDateFilters({ opened: null, updated: null, closed: null });
  };

  const handlePriorityChange = async (woId, newPriority, prevPriority) => {
    setWos(prev => prev.map(w => w.id === woId ? { ...w, priority: newPriority } : w));
    try {
      await sbPatch('work_orders', woId, { priority: newPriority });
    } catch {
      setWos(prev => prev.map(w => w.id === woId ? { ...w, priority: prevPriority } : w));
    }
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

  const renderRow = (wo, i) => {
    const vendor     = vendors.find(v => v.id === wo.vendor_id);
    const vendorName = vendor?.company_dba || '';
    const tenant     = tenants.find(t => t.id === wo.tenant_id);
    const tenantName = tenant?.tenant_dba || '';
    const fuOverdue  = isFuOverdue(wo.follow_up_date, wo);
    const fuDisplay  = wo.follow_up_date ? fmtNumDate(wo.follow_up_date) : '';
    const woUrl      = `/work-orders/${wo.podio_id ?? 'X'+wo.id.slice(-6)}`;
    const rowBg      = i % 2 === 0 ? 'transparent' : T.bg0;

    return (
      <tr key={wo.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e => {
          if (e.target.closest('a')) return;
          if (!e.ctrlKey && !e.metaKey) {
            sessionStorage.setItem('workOrdersBackUrl', window.location.pathname + window.location.search);
            const navL = filtered.map(r => ({ id: r.id, podio_id: r.podio_id }));
            sessionStorage.setItem('workOrdersNavList', JSON.stringify(navL));
            sessionStorage.setItem('workOrdersNavIndex', String(filtered.findIndex(r => r.id === wo.id)));
            onSelect(wo);
          }
        }}>

        {/* WO # — real anchor enables ctrl+click, middle-click, right-click → open in new tab */}
        <td style={{...css.td, minWidth:'52px', fontSize:F.xs, color:T.text1}}>
          <a href={woUrl}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                sessionStorage.setItem('workOrdersBackUrl', window.location.pathname + window.location.search);
                const navL = filtered.map(r => ({ id: r.id, podio_id: r.podio_id }));
                sessionStorage.setItem('workOrdersNavList', JSON.stringify(navL));
                sessionStorage.setItem('workOrdersNavIndex', String(filtered.findIndex(r => r.id === wo.id)));
                onSelect(wo);
              }
            }}
            style={{color:T.text1, textDecoration:'none'}}>
            {wo.podio_wo_number || '—'}
          </a>
        </td>

        {/* WO Title */}
        <td style={{...css.td}} title={wo.short_description}>
          <a href={woUrl}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(wo);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {wo.short_description ? (wo.short_description.length > 25 ? wo.short_description.slice(0,25)+'…' : wo.short_description) : ''}
          </a>
        </td>

        {/* FU Date */}
        <td style={{...css.td, overflow:'visible', color: fuOverdue ? T.warn : T.text2}}>
          {fuDisplay
            ? <span style={{fontWeight:fuOverdue?'600':'400'}}>{fuOverdue && '⚠ '}{fuDisplay}</span>
            : ''}
        </td>

        {/* Prop */}
        <td style={{...css.td, color:T.accent, fontWeight:'500', fontSize:F.xs}}>
          {wo.prop_code || ''}
        </td>

        {/* Priority */}
        <td style={css.td}>
          <span style={{display:'flex',alignItems:'center'}}>
            <PriorityDot priority={wo.priority||'???'}/>{wo.priority||'???'}
          </span>
        </td>

        {/* Stage (wo_status) — no truncation */}
        <td style={{...css.td, overflow:'visible', whiteSpace:'nowrap'}}>
          <StatusBadge status={wo.wo_status || 'New'}/>
        </td>

        {/* Status (open/closed) — no truncation */}
        <td style={{...css.td, overflow:'visible', whiteSpace:'nowrap'}}>
          <OpenClosedBadge wo={wo}/>
        </td>

        {/* Vendor */}
        <td style={{...css.td, fontSize:F.xs, color:T.text1}} title={vendorName}>
          {vendorName}
        </td>

        {/* Tenant */}
        <td style={{...css.td, fontSize:F.xs, color:T.text1}} title={tenantName}>
          {tenantName}
        </td>

        {/* Updated — shown when not in Closed filter */}
        {showUpdated && (
          <td style={{...css.td, color:T.text2, fontSize:F.xs}}>
            {wo.updated_at ? fmtNumDate(wo.updated_at) : ''}
          </td>
        )}

        {/* Opened */}
        <td style={{...css.td, color:T.text2, fontSize:F.xs}}>
          {wo.created_at ? fmtNumDate(wo.created_at) : ''}
        </td>

        {/* Closed — shown only when in Closed filter */}
        {showClosed && (
          <td style={{...css.td, color:wo.closed_at?T.success:T.text3, fontSize:F.xs}}>
            {wo.closed_at ? fmtNumDate(wo.closed_at) : ''}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count + view toggle */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <Wrench size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Work Orders</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
          <div style={{marginLeft:'auto',display:'flex',gap:'2px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'2px'}}>
            {[{mode:'table',icon:'≡',title:'Table view'},{mode:'kanban',icon:'⊞',title:'Kanban view'}].map(({mode,icon,title}) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={title}
                style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:'14px',lineHeight:1,
                  background:viewMode===mode?T.bg3:'transparent',
                  color:viewMode===mode?T.text0:T.text2,fontWeight:viewMode===mode?'600':'400'}}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1: Property buttons — scrollable */}
        {!_hidePropStrip && (
          <div className="filter-row" style={{gap:'4px',marginBottom:'5px'}}>
            <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
            {activeProps.map(pc => (
              <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
            ))}
          </div>
        )}

        {/* Row 2: Priority | Status | More... | Clear | Search */}
        <div className="filter-row" style={{gap:'6px',alignItems:'center'}}>

          {/* Priority filter with counts */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['All','???','Urgent','High','Medium','Low'].map(p => {
              const cnt    = p === 'All' ? null : priorityCounts[p] ?? 0;
              const active = priorityFilter === p;
              return (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  style={{padding:'3px 6px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',display:'flex',alignItems:'center',gap:'2px',whiteSpace:'nowrap'}}>
                  {p !== 'All' && <PriorityDot priority={p}/>}
                  {p}
                  {cnt !== null && <span style={{color:active?T.text1:T.text3,fontSize:'10px'}}>·{cnt}</span>}
                </button>
              );
            })}
          </div>

          {/* Open / Closed / All */}
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['Open','Closed','All'].map(s => {
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',
                    display:'flex',alignItems:'center',gap:'3px',whiteSpace:'nowrap'}}>
                  {s}
                  {active && !loading && <span style={{color:T.text3,fontSize:'10px'}}>·{wos.length}</span>}
                </button>
              );
            })}
          </div>

          {/* More... button */}
          <div style={{position:'relative',flexShrink:0}} ref={moreAnchorRef}>
            <button onClick={() => setMoreOpen(o => !o)}
              style={{padding:'3px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                border:`0.5px solid ${hasActiveDateFilter ? T.warn : T.border}`,
                background: moreOpen ? T.bg3 : 'transparent',
                color: hasActiveDateFilter ? T.warn : T.text1,
                display:'flex',alignItems:'center',gap:'5px'}}>
              More…
              {hasActiveDateFilter && <span style={{width:'5px',height:'5px',borderRadius:'50%',background:T.warn,flexShrink:0,display:'inline-block'}}/>}
            </button>
            <MorePopover
              open={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreAnchorRef}
              dateFilters={dateFilters} setDateFilters={setDateFilters}
            />
          </div>

          {/* Clear Filters — orange when active, hidden when none */}
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
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading work orders…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && viewMode === 'kanban' && (
        <div style={{flex:1,overflowX:'auto',overflowY:'hidden'}}>
          <KanbanView
            wos={filtered}
            vendors={vendors}
            onCardClick={onSelect}
            onPriorityChange={handlePriorityChange}
          />
        </div>
      )}

      {!loading && !error && viewMode === 'table' && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              {/* WO # */}    <col style={{width:'54px',  minWidth:'54px'}}/>
              {/* Title */}   <col style={{width:'auto'}}/>
              {/* FU Date */} <col style={{width:'100px', minWidth:'100px'}}/>
              {/* Prop */}    <col style={{width:'58px',  minWidth:'58px'}}/>
              {/* Priority */}<col style={{width:'88px',  minWidth:'80px'}}/>
              {/* Stage */}   <col style={{width:'136px', minWidth:'136px'}}/>
              {/* Status */}  <col style={{width:'68px',  minWidth:'60px'}}/>
              {/* Vendor */}  <col style={{width:'110px', minWidth:'80px'}}/>
              {/* Tenant */}  <col style={{width:'100px', minWidth:'80px'}}/>
              {showUpdated && <col style={{width:'82px',  minWidth:'76px'}}/>/* Updated */}
              {/* Opened */}  <col style={{width:'82px',  minWidth:'76px'}}/>
              {showClosed  && <col style={{width:'82px',  minWidth:'76px'}}/>/* Closed */}
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('podio_wo_number', 'WO #')}
                {renderTh('short_description', 'WO Title')}
                {renderTh('follow_up_date', 'FU Date')}
                {renderTh('prop_code', 'Prop')}
                {renderTh('priority', 'Priority')}
                {renderTh('wo_status', 'Stage')}
                <th style={{...css.th, minWidth:'60px', overflow:'visible'}}>Status</th>
                {renderTh('vendor_id', 'Vendor')}
                {renderTh('tenant_id', 'Tenant')}
                {showUpdated && renderTh('updated_at', 'Updated')}
                {renderTh('created_at', 'Opened')}
                {showClosed  && renderTh('closed_at',  'Closed')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>
                    No work orders match filters
                  </td>
                </tr>
              )}
              {grouped ? (
                grouped.map(group => (
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={11} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                        {group.prop_code} <span style={{color:T.text3,fontWeight:'400'}}>({group.rows.length})</span>
                      </td>
                    </tr>
                    {group.rows.map((wo, i) => renderRow(wo, i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((wo, i) => renderRow(wo, i))
              )}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length === 0 && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No work orders match filters</div>}
            {filtered.map((wo, i) => {
              const vendorName = vendors.find(v=>v.id===wo.vendor_id)?.company_dba||'';
              const fuOverdue = isFuOverdue(wo.follow_up_date, wo);
              const fuDisplay = wo.follow_up_date ? fmtNumDate(wo.follow_up_date) : null;
              const rowBg = i%2===0?'transparent':T.bg0;
              return (
                <div key={wo.id} style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{sessionStorage.setItem('workOrdersBackUrl',window.location.pathname+window.location.search);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('workOrdersNavList',JSON.stringify(navL));sessionStorage.setItem('workOrdersNavIndex',String(filtered.findIndex(r=>r.id===wo.id)));onSelect(wo);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{display:'flex',gap:'6px',alignItems:'baseline',marginBottom:'4px'}}>
                    {wo.podio_wo_number&&<span style={{fontSize:F.xs,color:T.text2,fontWeight:'600'}}>#{wo.podio_wo_number}</span>}
                    <span style={{fontWeight:'600',fontSize:F.base,color:T.text0,lineHeight:'1.3'}}>{wo.short_description||'—'}</span>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {wo.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{wo.prop_code}</span>}
                    <StatusBadge status={wo.wo_status||'New'}/>
                    {fuDisplay&&<span style={{fontSize:F.xs,color:fuOverdue?T.warn:T.text2,fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDisplay}</span>}
                    {vendorName&&<span style={{fontSize:F.xs,color:T.text2}}>{vendorName}</span>}
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
// WorkOrder Detail — form micro-components
// ─────────────────────────────────────────────────────────────────────────────
const WoFieldRow = ({ label, children, topAlign = false, hoverable = true }) => (
  <div className="crm-field-row"
    style={{display:'grid',gridTemplateColumns:'170px 1fr',borderBottom:`0.5px solid ${T.border}`,padding:'10px 0',minHeight:'48px'}}
    onMouseEnter={hoverable ? e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } : undefined}
    onMouseLeave={hoverable ? e => { e.currentTarget.style.background = ''; } : undefined}
  >
    <div className="crm-field-label" style={{fontSize:F.sm,fontWeight:'600',color:'#6B7280',textAlign:'right',paddingRight:'16px',alignSelf:topAlign?'start':'center',paddingTop:topAlign?'4px':'0',lineHeight:'1.4',userSelect:'none'}}>
      {label}
    </div>
    <div style={{alignSelf:topAlign?'start':'center',paddingRight:'4px'}}>
      {children}
    </div>
  </div>
);

const WoInlineBlur = ({ value, onSave, type = 'text', highlight = false, readOnly = false }) => {
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
  const displayVal = type === 'date' && val ? fmtDate(val) : val;
  if (readOnly) return <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.4'}}>{displayVal||'—'}</div>;
  return editing ? (
    <input ref={inputRef} type={type} value={val} onChange={e => setVal(e.target.value)}
      onFocus={type==='date'?(e=>{try{e.target.showPicker();}catch(_){}}) : undefined}
      onBlur={commit}
      onKeyDown={e=>{
        if(e.key==='Escape'){setVal(value??'');setEditing(false);}
        if(e.key==='Enter')commit();
      }}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none',MozAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{fontSize:F.base,color:highlight?'#E8630A':(displayVal?T.text0:T.text3),fontWeight:highlight?'700':'normal',cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {displayVal||<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving&&<span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

const WoInlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e => { await onSave(e.target.value||null); }}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o=>typeof o==='object'
      ?<option key={o.value} value={o.value}>{o.label}</option>
      :<option key={o} value={o}>{o}</option>)}
  </select>
);

const WoPriorityPills = ({ value, onSave }) => {
  const opts = ['???','Urgent','High','Medium','Low'];
  const styles = {
    '???':  {activeBg:T.bg3,    activeColor:T.text0, border:T.text2,  hoverBg:'rgba(107,114,128,0.25)'},
    Urgent: {activeBg:T.danger, activeColor:'#fff',  border:T.danger, hoverBg:'rgba(224,112,112,0.20)'},
    High:   {activeBg:T.warn,   activeColor:'#fff',  border:T.warn,   hoverBg:'rgba(212,146,74,0.20)'},
    Medium: {activeBg:T.success,activeColor:'#fff',  border:T.success,hoverBg:'rgba(106,176,106,0.20)'},
    Low:    {activeBg:T.accent, activeColor:'#fff',  border:T.accent, hoverBg:'rgba(110,159,216,0.20)'},
  };
  return (
    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
      {opts.map(opt=>{
        const active=(value||'???')===opt;
        const s=styles[opt]||styles['???'];
        return(
          <button key={opt} onClick={()=>!active&&onSave(opt)}
            style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
              border:`1px solid ${s.border}`,background:active?s.activeBg:'transparent',color:active?s.activeColor:s.border,
              transition:'background 0.15s ease'}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=s.hoverBg;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const WO_STATUS_OPTS = ['New','Request Sent','Re-Opened','Closed','Closed - Not Done'];
const WO_STATUS_STYLES = {
  'New':               {activeBg:T.accent,  activeColor:'#fff',border:T.accent,  hoverBg:'rgba(110,159,216,0.20)'},
  'Request Sent':      {activeBg:'#9a7ad4', activeColor:'#fff',border:'#9a7ad4', hoverBg:'rgba(154,122,212,0.20)'},
  'Re-Opened':         {activeBg:T.warn,    activeColor:'#fff',border:T.warn,    hoverBg:'rgba(212,146,74,0.20)'},
  'Closed':            {activeBg:T.success, activeColor:'#fff',border:T.success, hoverBg:'rgba(106,176,106,0.20)'},
  'Closed - Not Done': {activeBg:T.danger,  activeColor:'#fff',border:T.danger,  hoverBg:'rgba(224,112,112,0.20)'},
};

const WoStatusPills = ({ value, onSave }) => (
  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
    {WO_STATUS_OPTS.map(opt=>{
      const active=(value||'New')===opt;
      const s=WO_STATUS_STYLES[opt];
      return(
        <button key={opt} onClick={()=>!active&&onSave(opt)}
          style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
            border:`1px solid ${s.border}`,background:active?s.activeBg:'transparent',color:active?s.activeColor:s.border,
            transition:'background 0.15s ease'}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=s.hoverBg;}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
          {opt}
        </button>
      );
    })}
  </div>
);

const WoTypePills = ({ value, onSave }) => {
  const opts = ['Work Order Request','Request for Proposal'];
  const styles = {
    'Work Order Request':   {activeBg:T.accent,  activeColor:'#fff',border:T.accent,  hoverBg:'rgba(110,159,216,0.20)'},
    'Request for Proposal': {activeBg:'#9a7ad4', activeColor:'#fff',border:'#9a7ad4', hoverBg:'rgba(154,122,212,0.20)'},
  };
  return (
    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
      {opts.map(opt=>{
        const active=value===opt;
        const s=styles[opt];
        return(
          <button key={opt} onClick={()=>!active&&onSave(opt)}
            style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
              border:`1px solid ${s.border}`,background:active?s.activeBg:'transparent',color:active?s.activeColor:s.border,
              transition:'background 0.15s ease'}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=s.hoverBg;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const WO_CATEGORY_OPTIONS = [
  'Roof','Plumbing','HVAC','Lighting',"TI's",'Common Area','Landscape','Other',
  'Bldg. Shell','P-Lot','Signs','Electrical','Pest Control','Fire / Security',
  'Restroom','Trash','Utilities','Windows/Doors','Flooring','Keys',
];

const PhaseButton = ({ label }) => (
  <button onClick={() => alert('Coming in Phase 3')}
    style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 12px',color:T.text2,fontSize:F.sm,cursor:'pointer',transition:'border-color 0.15s,color 0.15s'}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}>
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// WorkOrder Detail
// ─────────────────────────────────────────────────────────────────────────────
export const WorkOrderDetail = ({ wo, onBack, onUpdate }) => {
  const [data, setData]                     = useState(wo);
  const [activeProps, setActiveProps]       = useState([]);
  const [vendorName, setVendorName]         = useState('');
  const [tenantName, setTenantName]         = useState('');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightWidth, setRightWidth]         = useState(300);
  const [copied, setCopied]                 = useState(false);
  const [navList, setNavList]               = useState(null);
  const [navIdx, setNavIdx]                 = useState(-1);
  const [navLoading, setNavLoading]         = useState(false);
  const resizingRight = useRef(false);

  useEffect(() => {
    sbFetch('properties','select=prop_code,property_name,address,city,state,zip,podio_id&status=eq.active&order=prop_code.asc')
      .then(setActiveProps).catch(()=>{});
    if (data.vendor_id) {
      sbFetch('vendors',`id=eq.${data.vendor_id}&select=id,company_dba`)
        .then(d=>{if(d[0])setVendorName(d[0].company_dba||'');}).catch(()=>{});
    }
    if (data.tenant_id) {
      sbFetch('tenants',`id=eq.${data.tenant_id}&select=id,tenant_dba,podio_id`)
        .then(d=>{if(d[0])setTenantName(d[0].tenant_dba||'');}).catch(()=>{});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRightResize = useCallback((e) => {
    resizingRight.current = true;
    const startX = e.clientX, startW = rightWidth;
    const onMove = me => {
      if (!resizingRight.current) return;
      setRightWidth(Math.max(180, Math.min(500, startW - (me.clientX - startX))));
    };
    const onUp = () => {
      resizingRight.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightWidth]);

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

  useEffect(() => {
    const raw = data.short_description || '';
    const truncated = raw.length > 30 ? raw.substring(0, 30) + '…' : raw;
    document.title = `${data.prop_code || ''} – ${truncated} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.prop_code, data.short_description]);

  useEffect(() => {
    try {
      const list = JSON.parse(sessionStorage.getItem('workOrdersNavList') || 'null');
      const idx  = parseInt(sessionStorage.getItem('workOrdersNavIndex') || '-1', 10);
      if (list && Array.isArray(list) && idx >= 0) { setNavList(list); setNavIdx(idx); }
    } catch {}
  }, []);

  const goNav = async dir => {
    if (!navList || navLoading) return;
    const newIdx = navIdx + dir;
    if (newIdx < 0 || newIdx >= navList.length) return;
    setNavLoading(true);
    try {
      const entry = navList[newIdx];
      const rows = await sbFetch('work_orders', `podio_id=eq.${entry.podio_id}&select=*&limit=1`);
      if (!rows.length) return;
      const newRec = rows[0];
      setData(newRec);
      setNavIdx(newIdx);
      sessionStorage.setItem('workOrdersNavIndex', String(newIdx));
      window.history.replaceState({}, '', `/work-orders/${entry.podio_id}`);
    } catch {}
    finally { setNavLoading(false); }
  };

  const goNavRef = useRef(goNav);
  goNavRef.current = goNav;

  useEffect(() => {
    const onArrow = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || document.activeElement?.contentEditable === 'true';
      if (isEditing) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') goNavRef.current(-1);
      else goNavRef.current(1);
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, []);

  const save = async (field, val) => {
    await sbPatch('work_orders', data.id, { [field]: val ?? null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const handleWoStatusChange = async (newStatus) => {
    const updates = { wo_status: newStatus };
    const isClosed = newStatus === 'Closed' || newStatus === 'Closed - Not Done';
    if (isClosed && !data.closed_at) {
      const d = new Date();
      updates.closed_at = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    await sbPatch('work_orders', data.id, updates);
    const updated = { ...data, ...updates };
    setData(updated);
    onUpdate?.(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/work-orders/${data.podio_id ?? 'X'+data.id.slice(-6)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const vendorHref = data.vendor_podio_id
    ? `/vendors/${data.vendor_podio_id}`
    : data.vendor_id ? `/vendors/X${data.vendor_id.slice(-6)}` : undefined;
  const tenantHref = data.tenant_podio_id ? `/tenants/${data.tenant_podio_id}` : undefined;

  const renderVendorLink = () => vendorName ? (
    vendorHref
      ? <a href={vendorHref} style={{color:T.accent,fontSize:F.sm,textDecoration:'none'}}
          onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
          onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>{vendorName}</a>
      : <span style={{fontSize:F.sm,color:T.text1}}>{vendorName}</span>
  ) : <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>;

  const renderTenantLink = () => tenantName ? (
    tenantHref
      ? <a href={tenantHref} style={{color:T.accent,fontSize:F.sm,textDecoration:'none'}}
          onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
          onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>{tenantName}</a>
      : <span style={{fontSize:F.sm,color:T.text1}}>{tenantName}</span>
  ) : <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* ── Header ── */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <Wrench size={14} weight="bold"/>← Work Orders
          </button>
          {data.prop_code && (
            <span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>
              {data.prop_code}
            </span>
          )}
          {data.podio_id && <span style={{fontSize:F.xs,color:T.text3}}>#{data.podio_id}</span>}
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',flexShrink:0,transition:'color 0.2s'}}
            onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=T.text0;}}
            onMouseLeave={e=>{if(!copied)e.currentTarget.style.color=T.text2;}}>
            {copied?'✓ Copied':'⧉ Copy Link'}
          </button>
          <div style={{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
            <StatusBadge status={data.wo_status||'New'}/>
            {data.priority && <StatusBadge status={data.priority}/>}
          </div>
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
          <Wrench size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <div style={{fontSize:F.lg,fontWeight:'700',color:'#E8630A',lineHeight:'1.3'}}>
            {data.short_description||'Untitled Work Order'}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>

            {/* 1. Short Description */}
            <WoFieldRow label="Short Description">
              <WoInlineBlur value={data.short_description} onSave={v=>save('short_description',v)} highlight/>
            </WoFieldRow>

            {/* 2. Prop Code */}
            <WoFieldRow label="Prop Code" topAlign>
              <select value={data.prop_code||''} onChange={async e=>{await save('prop_code',e.target.value||null);}}
                style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:data.prop_code?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                <option value="">—</option>
                {activeProps.map(p=>(<option key={p.prop_code} value={p.prop_code}>{p.prop_code} — {p.property_name}</option>))}
              </select>
              {(()=>{
                const prop=activeProps.find(p=>p.prop_code===data.prop_code);
                if(!prop)return null;
                const addr2=[prop.city,prop.state,prop.zip].filter(Boolean).join(' ');
                const line2=prop.address?(addr2?`${prop.address}, ${addr2}`:prop.address):addr2;
                return(
                  <div style={{marginTop:'5px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px'}}>
                    <div style={{fontSize:F.sm,fontWeight:'500',color:T.text0}}>{prop.property_name}</div>
                    {line2&&<div style={{fontSize:F.xs,color:T.text2,marginTop:'2px'}}>{line2}</div>}
                  </div>
                );
              })()}
            </WoFieldRow>

            {/* 3. FU Date */}
            <WoFieldRow label="FU Date">
              <WoInlineBlur type="date" value={data.follow_up_date||''} onSave={v=>save('follow_up_date',v)}/>
            </WoFieldRow>

            {/* 4. FU Notes (follow_up_topic) */}
            <WoFieldRow label="FU Notes" topAlign>
              <RichTextEditor value={data.follow_up_topic} onSave={v=>save('follow_up_topic',v)} minRows={5}/>
            </WoFieldRow>

            {/* 5. Priority */}
            <WoFieldRow label="Priority">
              <WoPriorityPills value={data.priority} onSave={v=>save('priority',v)}/>
            </WoFieldRow>

            {/* 6. Assigned To — not in schema */}
            <WoFieldRow label="Assigned To" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Not in schema yet</span>
            </WoFieldRow>

            {/* 7. WO Category */}
            <WoFieldRow label="WO Category">
              <WoInlineSelect value={data.wo_category} options={WO_CATEGORY_OPTIONS} onSave={v=>save('wo_category',v)}/>
            </WoFieldRow>

            {/* 8. Budget Item (boolean) */}
            <WoFieldRow label="Budget Item">
              <div style={{display:'flex',gap:'6px'}}>
                {[true,false].map(opt=>{
                  const active=data.budget_item===opt;
                  const color=opt?T.success:T.text2;
                  const hoverBg=opt?'rgba(106,176,106,0.15)':'rgba(90,98,114,0.15)';
                  return(
                    <button key={String(opt)} onClick={async()=>{if(!active)await save('budget_item',opt);}}
                      style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
                        border:`1px solid ${active?color:T.border}`,
                        background:active?(opt?'rgba(106,176,106,0.18)':'rgba(90,98,114,0.18)'):'transparent',
                        color:active?color:T.text2,transition:'background 0.15s ease'}}
                      onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hoverBg;}}
                      onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
                      {opt?'Yes':'No'}
                    </button>
                  );
                })}
              </div>
            </WoFieldRow>

            {/* 9. Internal Notes */}
            <WoFieldRow label="Internal Notes" topAlign>
              <RichTextEditor value={data.internal_notes} onSave={v=>save('internal_notes',v)} minRows={5}/>
            </WoFieldRow>

            {/* 10. Instructions to Vendor (vendor_instructions — 2563 rows) */}
            <WoFieldRow label="Instructions to Vendor" topAlign>
              <RichTextEditor value={data.vendor_instructions} onSave={v=>save('vendor_instructions',v)} minRows={5}/>
            </WoFieldRow>

            {/* 11. Property Linker */}
            <WoFieldRow label="Property" hoverable={false}>
              {(()=>{
                const prop=activeProps.find(p=>p.prop_code===data.prop_code);
                if(!prop)return<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>;
                const href=prop.podio_id?`/properties/${prop.podio_id}`:undefined;
                return href?(
                  <a href={href} style={{color:T.accent,fontSize:F.sm,textDecoration:'none'}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                    {data.prop_code} — {prop.property_name}
                  </a>
                ):(
                  <span style={{fontSize:F.sm,color:T.text1}}>{data.prop_code} — {prop.property_name}</span>
                );
              })()}
            </WoFieldRow>

            {/* 12. Key Safe */}
            <WoFieldRow label="Key Safe" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Linked at go-live</span>
            </WoFieldRow>

            {/* 13. Vendor Linker */}
            <WoFieldRow label="Vendor" hoverable={false}>
              {renderVendorLink()}
            </WoFieldRow>

            {/* 14. Tenant Linker */}
            <WoFieldRow label="Tenant (if any)" hoverable={false}>
              {renderTenantLink()}
            </WoFieldRow>

            {/* 15. WO Type */}
            <WoFieldRow label="WO Type">
              <WoTypePills value={data.wo_type} onSave={v=>save('wo_type',v)}/>
            </WoFieldRow>

            {/* 16–19. Phase 3 action buttons */}
            <WoFieldRow label="Email to Vendor" hoverable={false}>
              <PhaseButton label="Draft Email"/>
            </WoFieldRow>
            <WoFieldRow label="Request Update" hoverable={false}>
              <PhaseButton label="Draft Request"/>
            </WoFieldRow>
            <WoFieldRow label="Tenant Update" hoverable={false}>
              <PhaseButton label="Draft Update"/>
            </WoFieldRow>
            <WoFieldRow label="Owner FYI" hoverable={false}>
              <PhaseButton label="Draft FYI"/>
            </WoFieldRow>

            {/* 20. Contacts */}
            <WoFieldRow label="Contacts" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Available after Podio sync</span>
            </WoFieldRow>

            {/* 21. Pmt Instructions */}
            <WoFieldRow label="Pmt Instructions" topAlign>
              <RichTextEditor value={data.pmt_instructions_to_bk} onSave={v=>save('pmt_instructions_to_bk',v)} minRows={5}/>
            </WoFieldRow>

            {/* 22. Invoice Location */}
            <WoFieldRow label="Invoice Location">
              <WoInlineBlur value={data.invoice_location} onSave={v=>save('invoice_location',v)}/>
            </WoFieldRow>

            {/* 23. Invoice Stage */}
            <WoFieldRow label="Invoice Stage">
              <WoInlineBlur value={data.invoice_stage} onSave={v=>save('invoice_stage',v)}/>
            </WoFieldRow>

            {/* 24. Close Out Notes (final_close_notes — 5 rows) */}
            <WoFieldRow label="Close Out Notes" topAlign>
              <RichTextEditor value={data.final_close_notes} onSave={v=>save('final_close_notes',v)} minRows={5}/>
            </WoFieldRow>

            {/* 25. Work Stage (wo_status) */}
            <WoFieldRow label="Work Stage">
              <WoStatusPills value={data.wo_status} onSave={handleWoStatusChange}/>
            </WoFieldRow>

            {/* 26. APP Links */}
            <WoFieldRow label="APP Links" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Available after Podio sync</span>
            </WoFieldRow>

            {/* 27. Vendor Company */}
            <WoFieldRow label="Vendor Company" hoverable={false}>
              {renderVendorLink()}
            </WoFieldRow>

            {/* 28. Tenant Company */}
            <WoFieldRow label="Tenant Company" hoverable={false}>
              {renderTenantLink()}
            </WoFieldRow>

            {/* 29. Suite — no FK on work_orders */}
            <WoFieldRow label="Suite" hoverable={false}>
              <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>
            </WoFieldRow>

            {/* 30. Podio ID */}
            <WoFieldRow label="Podio ID" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3}}>{data.podio_id||'—'}</span>
            </WoFieldRow>

            {/* 31. Podio URL */}
            <WoFieldRow label="Podio URL" hoverable={false}>
              {(()=>{
                const url=data.podio_url||(data.podio_id?`https://podio.com/item/${data.podio_id}`:null);
                return url?(
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{color:T.accent,textDecoration:'none',fontSize:F.sm}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                    Open in Podio ↗
                  </a>
                ):<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>;
              })()}
            </WoFieldRow>

          </div>
        </div>

        <ActivityPanel
          collapsed={rightCollapsed}
          onCollapse={() => setRightCollapsed(c => !c)}
          width={rightWidth}
          onMouseDown={startRightResize}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function WorkOrdersView() {
  const [selected, setSelected] = useState(null);

  const handleSelect = useCallback((wo) => {
    history.pushState({ woId: wo.id }, '');
    setSelected(wo);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.woId) history.replaceState({}, '');
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
        <WorkOrdersList onSelect={handleSelect}/>
      </div>
      {selected && (
        <WorkOrderDetail
          key={selected.id}
          wo={selected}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
