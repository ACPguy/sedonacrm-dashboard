// ─────────────────────────────────────────────────────────────────────────────
// IssuesView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CheckFat, CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
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

// MM-DD-YYYY numeric format for table cells
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

const isFuOverdue = (d, status) => {
  if (!d || status === 'Closed') return false;
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

export const StatusBadge = ({ status }) => {
  const s = (status||'').toLowerCase();
  const map = {
    open:[T.accent,'#1a2e3a'], closed:[T.text2,T.bg3],
    'in progress':[T.purple,'#2a1f3a'], 'not started':[T.text2,T.bg3],
    urgent:[T.danger,'#3d1f1f'], high:[T.warn,'#3d2e1a'],
    medium:[T.success,'#1e2a1e'], low:[T.accent,'#1a2e3a'], '???':[T.text2,T.bg3],
  };
  const [color,bg] = map[s]||[T.text2,T.bg3];
  return <span style={css.badge(color,bg)}>{status||'—'}</span>;
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

export const EditableField = ({ label, value, onSave, type='text' }) => {
  const [editing,setEditing] = useState(false);
  const [val,setVal] = useState(value||'');
  const [saving,setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);
  useEffect(()=>{ setVal(value||''); },[value]);
  const save = async () => {
    setSaving(true);
    try { await onSave(val); setEditing(false); }
    catch { alert('Save failed'); }
    finally { setSaving(false); }
  };
  const cancel = () => { setVal(value||''); setEditing(false); };

  if (type === 'textarea') return <RichTextEditor label={label} value={value} onSave={onSave}/>;

  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{label}</div>
      {editing ? (
        <div style={{display:'flex',alignItems:'flex-start',gap:'6px'}}>
          <input ref={inputRef} type={type} value={val} onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')cancel();}}
            style={{flex:1,background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none'}}/>
          <button onClick={save} disabled={saving} style={{background:T.accent,border:'none',borderRadius:'4px',padding:'5px 10px',color:'#fff',fontSize:F.sm,cursor:'pointer',whiteSpace:'nowrap'}}>
            {saving?'…':'Save'}
          </button>
          <button onClick={cancel} style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>✕</button>
        </div>
      ):(
        <div onClick={()=>setEditing(true)} title="Click to edit"
          style={{fontSize:F.base,color:val?T.text0:T.text3,cursor:'text',padding:'3px 5px',borderRadius:'4px',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4'}}
          onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
          onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
          {val||<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>click to edit</span>}
        </div>
      )}
    </div>
  );
};

export const PRIORITY_ORDER = { '???': 0, 'Urgent': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
const PRIORITY_OPTIONS = ['???', 'Urgent', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS   = ['Open', 'In Progress', 'Not Started', 'Closed'];

// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel
// ─────────────────────────────────────────────────────────────────────────────
export const ActivityPanel = ({ collapsed, onCollapse, width, onMouseDown }) => {
  const [tab,setTab] = useState('comments');
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
            {tab==='activity'&&(
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
// Kanban components
// ─────────────────────────────────────────────────────────────────────────────
const KanbanCardContent = ({ issue, users }) => {
  const userName  = users.find(u => u.id === issue.assigned_to_id)?.full_name;
  const shortName = userName ? userName.split(' ')[0] : null;
  const fuDate    = issue.follow_up_date ? fmtNumDate(issue.follow_up_date) : null;
  const fuOverdue = isFuOverdue(issue.follow_up_date, issue.status);

  return (
    <div style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'9px 10px',userSelect:'none'}}>
      <div style={{fontSize:F.sm,color:T.text0,fontWeight:'500',lineHeight:'1.35',marginBottom:'6px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
        {issue.issue_name||'Untitled'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'4px'}}>
        <span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>
          {issue.prop_code||'—'}
        </span>
        {issue.category && (
          <span style={{fontSize:F.xs,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'80px'}}>{issue.category}</span>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px'}}>
        <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
          {shortName && <span style={{fontSize:F.xs,color:T.text2}}>{shortName}</span>}
          {fuDate && (
            <span style={{fontSize:F.xs,color:fuOverdue?T.warn:T.text2,fontWeight:fuOverdue?'600':'400'}}>
              {fuOverdue && '⚠ '}{fuDate}
            </span>
          )}
        </div>
        <StatusBadge status={issue.status||'Open'}/>
      </div>
    </div>
  );
};

const KanbanCard = ({ issue, users, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: issue.id });
  const style = {
    transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    marginBottom: '7px',
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      onClick={e => { e.stopPropagation(); if (!isDragging) onCardClick(issue); }}>
      <KanbanCardContent issue={issue} users={users}/>
    </div>
  );
};

const KanbanColumn = ({ priority, issues, users, onCardClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: priority });
  const priColor = { '???':T.text2, Urgent:T.danger, High:T.warn, Medium:T.success, Low:T.accent };
  const sorted   = [...issues].sort((a,b) => new Date(b.updated_at||0) - new Date(a.updated_at||0));

  return (
    <div style={{flex:'1 1 0',minWidth:'180px',maxWidth:'280px',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px 8px',borderBottom:`0.5px solid ${T.border}`,marginBottom:'8px',flexShrink:0}}>
        <PriorityDot priority={priority}/>
        <span style={{fontSize:F.xs,fontWeight:'700',color:priColor[priority]||T.text1,textTransform:'uppercase',letterSpacing:'0.05em'}}>{priority}</span>
        <span style={{fontSize:F.xs,color:T.text3,marginLeft:'auto'}}>({issues.length})</span>
      </div>
      <div ref={setNodeRef} style={{
        flex:1, overflowY:'auto', padding:'0 2px', minHeight:'80px', borderRadius:'4px',
        background: isOver ? 'rgba(110,159,216,0.07)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        {sorted.map(iss => (
          <KanbanCard key={iss.id} issue={iss} users={users} onCardClick={onCardClick}/>
        ))}
        {issues.length === 0 && (
          <div style={{color:T.text3,fontSize:F.xs,textAlign:'center',padding:'16px 0',fontStyle:'italic'}}>empty</div>
        )}
      </div>
    </div>
  );
};

const KanbanView = ({ issues, users, onCardClick, onPriorityChange }) => {
  const [activeIssue, setActiveIssue] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byPriority = useMemo(() =>
    PRIORITY_OPTIONS.reduce((acc, p) => {
      acc[p] = issues.filter(iss => (iss.priority || '???') === p);
      return acc;
    }, {})
  , [issues]);

  const handleDragStart = ({ active }) => {
    setActiveIssue(issues.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveIssue(null);
    if (!over) return;
    const newPriority = over.id;
    const iss = issues.find(i => i.id === active.id);
    if (!iss) return;
    const currentPriority = iss.priority || '???';
    if (currentPriority === newPriority) return;
    onPriorityChange(iss.id, newPriority, currentPriority);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{display:'flex',gap:'10px',height:'100%',overflow:'hidden',padding:'12px 14px'}}>
        {PRIORITY_OPTIONS.map(p => (
          <KanbanColumn key={p} priority={p} issues={byPriority[p]||[]} users={users} onCardClick={onCardClick}/>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <div style={{width:'220px',opacity:0.9,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',cursor:'grabbing'}}>
            <KanbanCardContent issue={activeIssue} users={users}/>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// More... popover (Assigned + Date filters)
// ─────────────────────────────────────────────────────────────────────────────
const MorePopover = ({ open, onClose, anchorRef, assignedFilter, setAssignedFilter, dateFilters, setDateFilters }) => {
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

  // Global single date filter: clicking any period clears all others
  const toggleDate = (row, period) => {
    setDateFilters(prev => {
      const isActive = prev[row] === period;
      if (isActive) return { opened: null, updated: null, closed: null };
      return { opened: null, updated: null, closed: null, [row]: period };
    });
  };

  const assignedOptions = ['All','Scott','Gabrielle','None'];
  const dateRows = [
    { key:'opened', label:'Opened' },
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
      padding:'10px 12px', minWidth:'300px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      {/* Assigned filter */}
      <div style={{marginBottom:'10px'}}>
        <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px',fontWeight:'600'}}>Assigned</div>
        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
          {assignedOptions.map(v => {
            const active = assignedFilter === v;
            return (
              <button key={v} onClick={() => setAssignedFilter(v)}
                style={{
                  padding:'3px 9px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
                  border:`0.5px solid ${active ? T.accent : T.border}`,
                  background: active ? 'rgba(110,159,216,0.18)' : 'transparent',
                  color: active ? T.accent : T.text2,
                  fontWeight: active ? '600' : '400',
                  transition:'all 0.15s',
                }}>
                {v === 'All' ? 'All' : v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
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
// Issues List
// ─────────────────────────────────────────────────────────────────────────────
export const IssuesList = ({ onSelect, hidePropStrip = false, hidePropertyFilter = false, hideSearch = false, filterPropCode, refreshKey = 0 }) => {
  const _hidePropStrip = hidePropStrip || hidePropertyFilter;
  const [issues, setIssues]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [users, setUsers]         = useState([]);
  const [statusFilter, setStatusFilter]     = useState('Open');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [propFilter, setPropFilter]         = useState([]);
  const [search, setSearch]       = useState('');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [activeProps, setActiveProps]       = useState([]);
  const [sortCol, setSortCol]     = useState('priority');
  const [sortDir, setSortDir]     = useState('asc');
  const [viewMode, setViewMode]   = useState('table');
  const [dateFilters, setDateFilters] = useState({ opened: null, updated: null, closed: null });
  const [moreOpen, setMoreOpen]   = useState(false);
  const moreAnchorRef = useRef(null);

  // Server-side fetch — re-runs when status filter, prop filter, or refreshKey changes
  useEffect(() => {
    setLoading(true); setError(null); setIssues([]);
    const propPart   = filterPropCode ? `&prop_code=eq.${encodeURIComponent(filterPropCode)}` : '';
    const statusPart = statusFilter === 'Open'   ? '&status=eq.Open'   :
                       statusFilter === 'Closed' ? '&status=eq.Closed' : '';
    const params = `select=*${statusPart}${propPart}&order=create_date.desc`;
    sbFetch('issues', params)
      .then(data => { setIssues(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, [statusFilter, filterPropCode, refreshKey]);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
    sbFetch('users', 'select=id,full_name&order=full_name.asc')
      .then(data => setUsers(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Issues | SedonaCRM';
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

  const isOpen  = iss => iss.status !== 'Closed';
  const priRank = p   => PRIORITY_ORDER[p] ?? 99;

  const sorted = useMemo(() => [...issues].sort((a, b) => {
    let cmp = sortCol === 'priority'
      ? priRank(a.priority) - priRank(b.priority)
      : sortCol === 'follow_up_date'
        ? (a.follow_up_date||'9999') > (b.follow_up_date||'9999') ? 1 : -1
        : String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''));
    if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
    if (sortCol !== 'priority') return priRank(a.priority) - priRank(b.priority);
    return String(a.prop_code ?? '').localeCompare(String(b.prop_code ?? ''));
  }), [issues, sortCol, sortDir]);

  const scottId = useMemo(() => users.find(u => u.full_name?.includes('Scott'))?.id,      [users]);
  const gabrId  = useMemo(() => users.find(u => u.full_name?.includes('Gabrielle'))?.id,  [users]);

  const applyFilters = useCallback((list, skipPriority = false) => {
    return list.filter(iss => {
      if (dateFilters.closed && iss.status !== 'Closed') return false;
      if (statusFilter === 'Open'   && !isOpen(iss)) return false;
      if (statusFilter === 'Closed' && iss.status !== 'Closed') return false;
      if (dateFilters.opened  && !isInRange(iss.create_date, dateFilters.opened))  return false;
      if (dateFilters.updated && !isInRange(iss.last_updated || iss.updated_at, dateFilters.updated)) return false;
      if (dateFilters.closed  && !isInRange(iss.close_date, dateFilters.closed))   return false;
      if (!skipPriority && priorityFilter !== 'All' && (iss.priority || '???') !== priorityFilter) return false;
      if (propFilter.length > 0 && !propFilter.includes(iss.prop_code)) return false;
      if (assignedFilter === 'Scott'     && iss.assigned_to_id !== scottId) return false;
      if (assignedFilter === 'Gabrielle' && iss.assigned_to_id !== gabrId)  return false;
      if (assignedFilter === 'None'      && iss.assigned_to_id != null)     return false;
      if (search) {
        const q = search.toLowerCase();
        const uName = users.find(u => u.id === iss.assigned_to_id)?.full_name || '';
        return (
          (iss.issue_name||'').toLowerCase().includes(q) ||
          (iss.prop_code||'').toLowerCase().includes(q) ||
          (iss.category||'').toLowerCase().includes(q) ||
          (iss.issue_details||'').toLowerCase().includes(q) ||
          uName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, priorityFilter, propFilter, assignedFilter, search, dateFilters, scottId, gabrId, users]);

  const filtered          = useMemo(() => applyFilters(sorted),        [sorted, applyFilters]);
  const filteredNoPriority = useMemo(() => applyFilters(sorted, true), [sorted, applyFilters]);

  const priorityCounts = useMemo(() => {
    const c = { '???': 0, Urgent: 0, High: 0, Medium: 0, Low: 0 };
    filteredNoPriority.forEach(iss => { const p = iss.priority || '???'; c[p] = (c[p]||0) + 1; });
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

  const hasActiveDateFilter = !!(dateFilters.opened || dateFilters.updated || dateFilters.closed);
  const hasMoreActive       = assignedFilter !== 'All' || hasActiveDateFilter;
  const hasActiveFilters    = propFilter.length > 0 || priorityFilter !== 'All' ||
    statusFilter !== 'Open' || assignedFilter !== 'All' || search !== '' || hasActiveDateFilter;

  const showClosed = statusFilter === 'Closed';
  const showOpened = !showClosed;

  const clearFilters = () => {
    setStatusFilter('Open'); setPriorityFilter('All'); setPropFilter([]);
    setAssignedFilter('All'); setSearch('');
    setDateFilters({ opened: null, updated: null, closed: null });
  };

  const handlePriorityChange = async (issueId, newPriority, prevPriority) => {
    setIssues(prev => prev.map(iss => iss.id === issueId ? { ...iss, priority: newPriority } : iss));
    try {
      await sbPatch('issues', issueId, { priority: newPriority });
    } catch {
      setIssues(prev => prev.map(iss => iss.id === issueId ? { ...iss, priority: prevPriority } : iss));
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

  const renderRow = (iss, i) => {
    const userName = users.find(u => u.id === iss.assigned_to_id)?.full_name;
    const fuOverdue = isFuOverdue(iss.follow_up_date, iss.status);
    const fuDisplay = iss.follow_up_date ? fmtNumDate(iss.follow_up_date) : '';

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/issues/${iss.podio_id ?? 'X'+iss.id.slice(-6)}`, '_blank');
        if (tab) tab.focus();
      } else {
        sessionStorage.setItem('issuesBackUrl', window.location.pathname + window.location.search);
        const navL = filtered.map(r => ({ id: r.id, podio_id: r.podio_id }));
        sessionStorage.setItem('issuesNavList', JSON.stringify(navL));
        sessionStorage.setItem('issuesNavIndex', String(filtered.findIndex(r => r.id === iss.id)));
        onSelect(iss);
      }
    };

    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;

    return (
      <tr key={iss.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>

        {/* Issue Title — real anchor enables ctrl+click, middle-click, right-click → open in new tab */}
        <td style={{...css.td}} title={iss.issue_name}>
          <a href={`/issues/${iss.podio_id ?? 'X'+iss.id.slice(-6)}`}
            onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();onSelect(iss);}}}
            style={{color:'inherit',textDecoration:'none'}}>
            {iss.issue_name||''}
          </a>
        </td>

        {/* FU Date — read-only */}
        <td style={{...css.td, color: fuOverdue ? T.warn : T.text2}}>
          {fuDisplay
            ? <span style={{fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDisplay}</span>
            : ''}
        </td>

        {/* Prop — read-only */}
        <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs,minWidth:'70px'}}>
          {iss.prop_code||''}
        </td>

        {/* Priority — read-only */}
        <td style={css.td}>
          <span style={{display:'flex',alignItems:'center'}}>
            <PriorityDot priority={iss.priority||'???'}/>{iss.priority||'???'}
          </span>
        </td>

        {/* Assigned — read-only */}
        <td style={{...css.td,fontSize:F.xs,color:T.text1}}>{userName||''}</td>

        {/* Status — read-only, never truncated */}
        <td style={{...css.td,minWidth:'70px',overflow:'visible',whiteSpace:'nowrap'}}>
          <StatusBadge status={iss.status||'Open'}/>
        </td>

        {/* Updated — read-only */}
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
          {iss.last_updated ? fmtNumDate(iss.last_updated) : iss.updated_at ? fmtNumDate(iss.updated_at) : ''}
        </td>

        {/* Opened — hidden when filtering for Closed */}
        {showOpened && (
          <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
            {iss.create_date ? fmtNumDate(iss.create_date) : ''}
          </td>
        )}

        {/* Closed — only shown when filtering for Closed */}
        {showClosed && (
          <td style={{...css.td,color:iss.close_date?T.success:T.text3,fontSize:F.xs}}>
            {iss.close_date ? fmtNumDate(iss.close_date) : ''}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header — tightly packed */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title + count + view toggle */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <CheckFat size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Issues</span>
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

        {/* Row 1: Property buttons — scrollable single line */}
        {!_hidePropStrip && (
          <div className="filter-row" style={{gap:'4px',marginBottom:'5px'}}>
            <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
            {activeProps.map(pc => (
              <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
            ))}
          </div>
        )}

        {/* Row 2: Priority | Status | More... | Clear | Search */}
        <div style={{display:'flex',gap:'6px',alignItems:'center',minWidth:0}}>

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
                  {active && !loading && <span style={{color:T.text3,fontSize:'10px'}}>·{issues.length}</span>}
                </button>
              );
            })}
          </div>

          {/* More... button */}
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
              assignedFilter={assignedFilter} setAssignedFilter={setAssignedFilter}
              dateFilters={dateFilters} setDateFilters={setDateFilters}
            />
          </div>

          {/* Clear Filters — orange when active, always shown for layout stability */}
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
      {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading issues…</div>}
      {error   && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}

      {!loading && !error && viewMode === 'kanban' && (
        <div style={{flex:1,overflowX:'auto',overflowY:'hidden'}}>
          <KanbanView
            issues={filtered}
            users={users}
            onCardClick={onSelect}
            onPriorityChange={handlePriorityChange}
          />
        </div>
      )}

      {!loading && !error && viewMode === 'table' && (
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>
              <col style={{width:'82px'}}/>
              <col style={{width:'68px',minWidth:'68px'}}/>
              <col style={{width:'90px'}}/>
              <col style={{width:'100px'}}/>
              <col style={{width:'76px',minWidth:'76px'}}/>
              <col style={{width:'86px'}}/>
              {showOpened && <col style={{width:'82px'}}/>}
              {showClosed && <col style={{width:'82px'}}/>}
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('issue_name','Issue Title')}
                {renderTh('follow_up_date','FU Date')}
                {renderTh('prop_code','Prop', {paddingLeft:'10px'})}
                {renderTh('priority','Priority')}
                {renderTh('assigned_to_id','Assigned')}
                <th style={{...css.th,minWidth:'76px',overflow:'visible'}}>Status</th>
                {renderTh('last_updated','Updated')}
                {showOpened && renderTh('create_date','Opened')}
                {showClosed && renderTh('close_date','Closed')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No issues match filters</td></tr>
              )}
              {grouped ? (
                grouped.map(group => (
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={8} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                        {group.prop_code} <span style={{color:T.text3,fontWeight:'400'}}>({group.rows.length})</span>
                      </td>
                    </tr>
                    {group.rows.map((iss, i) => renderRow(iss, i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((iss, i) => renderRow(iss, i))
              )}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length === 0 && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No issues match filters</div>}
            {filtered.map((iss, i) => {
              const fuOverdue = isFuOverdue(iss.follow_up_date, iss.status);
              const fuDisplay = iss.follow_up_date ? fmtNumDate(iss.follow_up_date) : null;
              const rowBg = i%2===0?'transparent':T.bg0;
              return (
                <div key={iss.id} style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{sessionStorage.setItem('issuesBackUrl',window.location.pathname+window.location.search);const navL=filtered.map(r=>({id:r.id,podio_id:r.podio_id}));sessionStorage.setItem('issuesNavList',JSON.stringify(navL));sessionStorage.setItem('issuesNavIndex',String(filtered.findIndex(r=>r.id===iss.id)));onSelect(iss);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{fontWeight:'600',fontSize:F.base,color:T.text0,marginBottom:'4px',lineHeight:'1.3'}}>{iss.issue_name||'—'}</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {iss.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{iss.prop_code}</span>}
                    <StatusBadge status={iss.status||'Open'}/>
                    {iss.priority&&<span style={{display:'flex',alignItems:'center',gap:'3px',fontSize:F.xs,color:T.text2}}><PriorityDot priority={iss.priority}/>{iss.priority}</span>}
                    {fuDisplay&&<span style={{fontSize:F.xs,color:fuOverdue?T.warn:T.text2,fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDisplay}</span>}
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
// Issue Detail — blur-save inline editing, activity panel default open
// ─────────────────────────────────────────────────────────────────────────────

const IssueBlurField = ({ label, value, onSave, type = 'text', readOnly = false, highlight = false }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
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
  const labelEl = (
    <div style={{fontSize:F.xs,color:'#374151',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'2px',userSelect:'none'}}>{label}</div>
  );
  if (readOnly) return (
    <div style={{marginBottom:'10px'}}>
      {labelEl}
      <div style={{fontSize:F.base,color:T.text1,padding:'3px 5px'}}>{value || '—'}</div>
    </div>
  );
  return (
    <div style={{marginBottom:'10px'}}>
      {labelEl}
      {editing ? (
        <input ref={inputRef} type={type} value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); }
            if (e.key === 'Enter') commit();
          }}
          style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none'}}
        />
      ) : (
        <div onClick={() => setEditing(true)} title="Click to edit"
          style={{fontSize:F.base,color:highlight?'#E8630A':(val?T.text0:T.text3),fontWeight:highlight?'700':'normal',cursor:'text',padding:'3px 5px',borderRadius:'4px',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4'}}
          onMouseEnter={e => e.currentTarget.style.border = `1px solid ${T.border}`}
          onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
          {(type === 'date' && val ? fmtDate(val) : val) || <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
          {saving && <span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
        </div>
      )}
    </div>
  );
};

const IssueSelectField = ({ label, value, options, onSave }) => (
  <div style={{marginBottom:'10px'}}>
    <div style={{fontSize:F.xs,color:'#374151',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'2px',userSelect:'none'}}>{label}</div>
    <select value={value||''} onChange={async e => { await onSave(e.target.value||null); }}
      style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
      <option value="">—</option>
      {options.map(o => typeof o === 'object'
        ? <option key={o.value} value={o.value}>{o.label}</option>
        : <option key={o} value={o}>{o}</option>
      )}
    </select>
  </div>
);

const IssuePriorityField = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const PRIORITY_COLORS = {
    '???': [T.text2, T.bg3],
    Urgent: [T.danger, '#3d1f1f'],
    High: [T.warn, '#3d2e1a'],
    Medium: [T.success, '#1e2a1e'],
    Low: [T.accent, '#1a2e3a'],
  };
  const [color, bg] = PRIORITY_COLORS[value] || PRIORITY_COLORS['???'];
  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{fontSize:F.xs,color:'#374151',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'2px',userSelect:'none'}}>Priority</div>
      {editing ? (
        <select value={value||'???'} autoFocus
          onChange={async e => { await onSave(e.target.value); setEditing(false); }}
          onBlur={() => setEditing(false)}
          style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
          {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div onClick={() => setEditing(true)} title="Click to change" style={{cursor:'pointer',display:'inline-block',padding:'3px 0'}}>
          <span style={css.badge(color, bg)}>{value || '???'}</span>
        </div>
      )}
    </div>
  );
};

const FieldRow = ({ label, children, topAlign = false, hoverable = true }) => (
  <div className="crm-field-row"
    style={{display:'grid',gridTemplateColumns:'160px 1fr',borderBottom:`0.5px solid ${T.border}`,padding:'10px 0',minHeight:'48px'}}
    onMouseEnter={hoverable ? e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } : undefined}
    onMouseLeave={hoverable ? e => { e.currentTarget.style.background = ''; } : undefined}
  >
    <div className="crm-field-label" style={{
      fontSize:F.sm, fontWeight:'600', color:'#6B7280',
      textAlign:'right', paddingRight:'16px',
      alignSelf: topAlign ? 'start' : 'center',
      paddingTop: topAlign ? '4px' : '0',
      lineHeight:'1.4', userSelect:'none',
    }}>
      {label}
    </div>
    <div style={{alignSelf: topAlign ? 'start' : 'center', paddingRight:'4px'}}>
      {children}
    </div>
  </div>
);

const InlineBlurField = ({ value, onSave, type = 'text', highlight = false, readOnly = false }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
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
  if (readOnly) return (
    <div style={{fontSize:F.base, color:T.text1, lineHeight:'1.4'}}>{displayVal || '—'}</div>
  );
  return editing ? (
    <input ref={inputRef} type={type} value={val} onChange={e => setVal(e.target.value)}
      onFocus={type === 'date' ? (e => { try { e.target.showPicker(); } catch(_) {} }) : undefined}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); }
        if (e.key === 'Enter') commit();
      }}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none',MozAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{
        fontSize:F.base, color: highlight?'#E8630A':(displayVal?T.text0:T.text3),
        fontWeight: highlight?'700':'normal', cursor:'text', padding:'4px 0',
        minHeight:'24px', border:'1px solid transparent', lineHeight:'1.4', borderRadius:'4px',
      }}
      onMouseEnter={e => e.currentTarget.style.border = `1px solid ${T.border}`}
      onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
      {displayVal || <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving && <span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

const InlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e => { await onSave(e.target.value||null); }}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o => typeof o === 'object'
      ? <option key={o.value} value={o.value}>{o.label}</option>
      : <option key={o} value={o}>{o}</option>
    )}
  </select>
);

const PriorityPills = ({ value, onSave }) => {
  const styles = {
    '???':  { activeBg: T.bg3,     activeColor: T.text0, border: T.text2,   hoverBg: 'rgba(107,114,128,0.25)' },
    Urgent: { activeBg: T.danger,  activeColor: '#fff',  border: T.danger,  hoverBg: 'rgba(239,68,68,0.20)' },
    High:   { activeBg: T.warn,    activeColor: '#fff',  border: T.warn,    hoverBg: 'rgba(249,115,22,0.20)' },
    Medium: { activeBg: T.success, activeColor: '#fff',  border: T.success, hoverBg: 'rgba(234,179,8,0.20)' },
    Low:    { activeBg: T.accent,  activeColor: '#fff',  border: T.accent,  hoverBg: 'rgba(34,197,94,0.20)' },
  };
  return (
    <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
      {PRIORITY_OPTIONS.map(opt => {
        const active = (value || '???') === opt;
        const s = styles[opt] || styles['???'];
        return (
          <button key={opt} onClick={() => !active && onSave(opt)}
            style={{
              padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, fontWeight:'600',
              cursor: active ? 'default' : 'pointer',
              border: `1px solid ${s.border}`,
              background: active ? s.activeBg : 'transparent',
              color: active ? s.activeColor : s.border,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = s.hoverBg; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const StatusPills = ({ value, onSave }) => {
  const styles = {
    Open:   { activeBg: T.danger, activeColor: '#fff', border: T.danger, hoverBg: 'rgba(239,68,68,0.20)' },
    Closed: { activeBg: T.warn,   activeColor: T.bg0,  border: T.warn,  hoverBg: 'rgba(245,158,11,0.20)' },
  };
  return (
    <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
      {['Open', 'Closed'].map(opt => {
        const active = (value || 'Open') === opt;
        const s = styles[opt];
        return (
          <button key={opt} onClick={() => !active && onSave(opt)}
            style={{
              padding:'3px 10px', borderRadius:'4px', fontSize:F.xs, fontWeight:'600',
              cursor: active ? 'default' : 'pointer',
              border: `1px solid ${s.border}`,
              background: active ? s.activeBg : 'transparent',
              color: active ? s.activeColor : s.border,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = s.hoverBg; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const CATEGORY_OPTIONS = [
  '- PROJECT -','???','$ Issue','ACP Training','Adjust Rent','C-19','DONE','GOAL',
  'Incident','Insurance','LATE RENT','Legal','Lender','LS Violation','LS Violation ?',
  'Move In','Move Out','Note','Other','Taxes','TNT Estoppels',
];

export const IssueDetail = ({ issue, onBack, onUpdate }) => {
  const [data, setData] = useState(issue);
  const [users, setUsers] = useState([]);
  const [activeProps, setActiveProps] = useState([]);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(300);
  const [copied, setCopied] = useState(false);
  const [navList, setNavList]   = useState(null);
  const [navIdx, setNavIdx]     = useState(-1);
  const [navLoading, setNavLoading] = useState(false);
  const resizingRight = useRef(false);

  useEffect(() => {
    sbFetch('users', 'select=id,full_name&order=full_name.asc').then(setUsers).catch(() => {});
    sbFetch('properties', 'select=prop_code,property_name,address,city,state,zip&status=eq.active&order=prop_code.asc')
      .then(setActiveProps).catch(() => {});
  }, []);

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
    const raw = data.issue_name || '';
    const truncated = raw.length > 30 ? raw.substring(0, 30) + '…' : raw;
    document.title = `${data.prop_code || ''} – ${truncated} | SedonaCRM`;
    return () => { document.title = 'SedonaCRM'; };
  }, [data.prop_code, data.issue_name]);

  useEffect(() => {
    try {
      const list = JSON.parse(sessionStorage.getItem('issuesNavList') || 'null');
      const idx  = parseInt(sessionStorage.getItem('issuesNavIndex') || '-1', 10);
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
      const rows = await sbFetch('issues', `podio_id=eq.${entry.podio_id}&select=*&limit=1`);
      if (!rows.length) return;
      const newRec = rows[0];
      setData(newRec);
      setNavIdx(newIdx);
      sessionStorage.setItem('issuesNavIndex', String(newIdx));
      window.history.replaceState({}, '', `/issues/${entry.podio_id}`);
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
    await sbPatch('issues', data.id, { [field]: val ?? null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const handleStatusChange = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'Closed' && !data.close_date) {
      const d = new Date();
      updates.close_date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } else if (newStatus !== 'Closed') {
      updates.close_date = null;
    }
    await sbPatch('issues', data.id, updates);
    const updated = { ...data, ...updates };
    setData(updated);
    onUpdate?.(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/issues/${data.podio_id ?? 'X'+data.id.slice(-6)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
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
            <CheckFat size={14} weight="bold"/>← Issues
          </button>
          <span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>
            {data.prop_code||'—'}
          </span>
          {data.podio_id && <span style={{fontSize:F.xs,color:T.text3}}>#{data.podio_id}</span>}
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',flexShrink:0,transition:'color 0.2s'}}
            onMouseEnter={e=>{ if(!copied) e.currentTarget.style.color=T.text0; }}
            onMouseLeave={e=>{ if(!copied) e.currentTarget.style.color=T.text2; }}>
            {copied ? '✓ Copied' : '⧉ Copy Link'}
          </button>
          <div style={{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
            <StatusBadge status={data.priority}/>
            <StatusBadge status={data.status}/>
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
          <CheckFat size={20} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <div style={{fontSize:F.lg,fontWeight:'600',color:'#E8630A'}}>{data.issue_name||'Untitled Issue'}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>
            <FieldRow label="Issue Name">
              <InlineBlurField value={data.issue_name} onSave={v=>save('issue_name',v)} highlight/>
            </FieldRow>
            <FieldRow label="Prop Code" topAlign>
              <select value={data.prop_code||''} onChange={async e=>{await save('prop_code',e.target.value||null);}}
                style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:data.prop_code?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                <option value="">—</option>
                {activeProps.map(p=>(<option key={p.prop_code} value={p.prop_code}>{p.prop_code} — {p.property_name}</option>))}
              </select>
              {(() => {
                const prop = activeProps.find(p => p.prop_code === data.prop_code);
                if (!prop) return null;
                const addr2 = [prop.city, prop.state, prop.zip].filter(Boolean).join(' ');
                const line2 = prop.address ? (addr2 ? `${prop.address}, ${addr2}` : prop.address) : addr2;
                return (
                  <div style={{marginTop:'5px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px'}}>
                    <div style={{fontSize:F.sm,fontWeight:'500',color:T.text0}}>{prop.property_name}</div>
                    {line2 && <div style={{fontSize:F.xs,color:T.text2,marginTop:'2px'}}>{line2}</div>}
                  </div>
                );
              })()}
            </FieldRow>
            <FieldRow label="FU Date">
              <InlineBlurField type="date" value={data.follow_up_date||''} onSave={v=>save('follow_up_date',v)}/>
            </FieldRow>
            <FieldRow label="FU Notes" topAlign>
              <RichTextEditor value={data.follow_up_notes} onSave={v=>save('follow_up_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Priority">
              <PriorityPills value={data.priority} onSave={v=>save('priority',v)}/>
            </FieldRow>
            <FieldRow label="Status">
              <StatusPills value={data.status} onSave={handleStatusChange}/>
            </FieldRow>
            <FieldRow label="Assigned To">
              <InlineSelect value={data.assigned_to_id} options={users.map(u=>({value:u.id,label:u.full_name}))} onSave={v=>save('assigned_to_id',v)}/>
            </FieldRow>
            <FieldRow label="Category">
              <InlineSelect value={data.category} options={CATEGORY_OPTIONS} onSave={v=>save('category',v)}/>
            </FieldRow>
            <FieldRow label="Issue Details" topAlign>
              <RichTextEditor value={data.issue_details} onSave={v=>save('issue_details',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Contacts" hoverable={false}>
              <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>Available after Podio sync</span>
            </FieldRow>
            <FieldRow label="Podio Link" hoverable={false}>
              {data.podio_url
                ? <a href={data.podio_url} target="_blank" rel="noopener noreferrer" style={{color:T.accent,textDecoration:'none',fontSize:F.sm}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                    Podio Record ↗
                  </a>
                : <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
            </FieldRow>
            <FieldRow label="Last Updated" hoverable={false}>
              <InlineBlurField readOnly value={data.last_updated?fmtDate(data.last_updated):(data.updated_at?fmtDate(data.updated_at):'')}/>
            </FieldRow>
            <FieldRow label="Create Date" hoverable={false}>
              <InlineBlurField readOnly value={data.create_date?fmtDate(data.create_date):''}/>
            </FieldRow>
            {data.status === 'Closed' && (
              <FieldRow label="Date Closed">
                <InlineBlurField type="date" value={data.close_date||''} onSave={v=>save('close_date',v)}/>
              </FieldRow>
            )}
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
// Main export — issues state lives here so Kanban drags survive detail/back
// ─────────────────────────────────────────────────────────────────────────────
export default function IssuesView() {
  const [selected, setSelected]       = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleSelect = useCallback((iss) => {
    history.pushState({ issueId: iss.id }, '');
    setSelected(iss);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.issueId) history.replaceState({}, '');
    setSelected(null);
  }, []);

  // Bump refreshKey so IssuesList re-fetches after an inline edit (e.g. status changed to Closed)
  const handleUpdate = useCallback((updated) => {
    setSelected(updated);
    setListRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <IssuesList onSelect={handleSelect} refreshKey={listRefreshKey}/>
      </div>
      {selected && (
        <IssueDetail
          key={selected.id}
          issue={selected}
          onBack={handleBack}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
