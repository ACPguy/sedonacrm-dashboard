// ─────────────────────────────────────────────────────────────────────────────
// IssuesView.jsx  —  SedonaCRM Phase 2 UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

const fmtFuDate = d => {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  const now = new Date();
  if (date.getFullYear() !== now.getFullYear()) {
    return date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
  }
  return date.toLocaleDateString('en-US', {month:'short', day:'numeric'});
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
  if (range === 'week') { const w = new Date(now); w.setDate(w.getDate()-7); return d >= w; }
  if (range === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  if (range === 'year') return d.getFullYear()===now.getFullYear();
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
      background:colors[priority]||T.text3, marginRight:'6px', flexShrink:0,
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
  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{label}</div>
      {editing ? (
        <div style={{display:'flex',alignItems:'flex-start',gap:'6px'}}>
          {type==='textarea'?(
            <textarea ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
              style={{flex:1,background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,resize:'vertical',minHeight:'60px',outline:'none'}}/>
          ):(
            <input ref={inputRef} type={type} value={val} onChange={e=>setVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')cancel();}}
              style={{flex:1,background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none'}}/>
          )}
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

const CATEGORY_OPTIONS = [
  '???', '- PROJECT -', '$$ Issue', 'ACP Training', 'Adjust Rent', 'C-19',
  'DONE', 'GOAL', 'IT', 'Incident', 'Insurance', 'LATE RENT', 'LS Violation',
  'LS Violation ?', 'Legal', 'Lender', 'Maintenance', 'Move In', 'Move Out',
  'Note', 'Other', 'TNT Estoppels', 'Taxes',
];
const STATUS_OPTIONS = ['Open', 'In Progress', 'Not Started', 'Closed'];
const PRIORITY_OPTIONS = ['???', 'Urgent', 'High', 'Medium', 'Low'];

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
// InlineCell — inline-editable table cell
// ─────────────────────────────────────────────────────────────────────────────
const InlineCell = ({ value, displayNode, field, issueId, onOptimistic, type='text', options=null, tdStyle={}, stopPropagation=true }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const [flash, setFlash] = useState(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { if (!editing) setVal(value ?? ''); }, [value, editing]);

  const doSave = useCallback(async (newVal) => {
    const prev = value;
    const dbVal = newVal === '' ? null : newVal;
    onOptimistic(issueId, field, dbVal);
    setEditing(false);
    try {
      await sbPatch('issues', issueId, { [field]: dbVal });
      setFlash('success');
      setTimeout(() => setFlash(null), 700);
    } catch {
      onOptimistic(issueId, field, prev);
      setFlash('error');
      setTimeout(() => setFlash(null), 700);
    }
  }, [value, issueId, field, onOptimistic]);

  const handleClick = e => {
    if (stopPropagation) e.stopPropagation();
    setEditing(true);
  };

  const flashBg = flash === 'success' ? 'rgba(106,176,106,0.18)' : flash === 'error' ? 'rgba(224,112,112,0.18)' : undefined;
  const base = { ...tdStyle, transition:'background 0.4s', background: flashBg };

  if (editing) {
    if (options) {
      return (
        <td style={{...base, padding:'2px 4px'}} onClick={e => e.stopPropagation()}>
          <select autoFocus value={val}
            onChange={e => { const v = e.target.value; setVal(v); doSave(v); }}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key==='Escape') { setVal(value??''); setEditing(false); } }}
            style={{width:'100%',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'3px',color:T.text0,fontSize:F.xs,padding:'3px 4px',outline:'none',cursor:'pointer'}}>
            {options.map(o => {
              const v = o.value !== undefined ? o.value : o;
              const l = o.label !== undefined ? o.label : o;
              return <option key={String(v)} value={String(v??'')} style={{background:T.bg1}}>{l||'—'}</option>;
            })}
          </select>
        </td>
      );
    }
    return (
      <td style={{...base, padding:'2px 4px'}} onClick={e => e.stopPropagation()}>
        <input autoFocus type={type==='date'?'date':'text'} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => doSave(val)}
          onKeyDown={e => {
            if (e.key==='Escape') { setVal(value??''); setEditing(false); }
            if (e.key==='Enter') doSave(val);
          }}
          style={{width:'100%',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'3px',color:T.text0,fontSize:F.xs,padding:'3px 4px',outline:'none'}}
        />
      </td>
    );
  }

  return (
    <td style={base}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}>
      <div style={{display:'flex',alignItems:'center',gap:'3px',cursor:'pointer',minHeight:'18px',padding:'4px 8px'}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
          {displayNode ?? (val||'—')}
        </span>
        {hovered && <span style={{color:T.text3,fontSize:'9px',flexShrink:0,opacity:0.8}}>✏</span>}
      </div>
    </td>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Kanban components
// ─────────────────────────────────────────────────────────────────────────────
const KanbanCardContent = ({ issue, users }) => {
  const userName = users.find(u => u.id === issue.assigned_to_id)?.full_name;
  const shortName = userName ? userName.split(' ')[0] : null;
  const fuDate = fmtFuDate(issue.follow_up_date);
  const fuOverdue = isFuOverdue(issue.follow_up_date, issue.status);
  const propColors = { bg:'#1a2e3a', text:T.accent };

  return (
    <div style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'9px 10px',userSelect:'none'}}>
      <div style={{fontSize:F.sm,color:T.text0,fontWeight:'500',lineHeight:'1.35',marginBottom:'6px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
        {issue.issue_name||'Untitled'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'4px'}}>
        <span style={{fontSize:F.xs,background:propColors.bg,color:propColors.text,padding:'1px 6px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>
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
  const sorted = [...issues].sort((a,b) => new Date(b.updated_at||0) - new Date(a.updated_at||0));

  return (
    <div style={{flex:'1 1 0',minWidth:'180px',maxWidth:'280px',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px 8px',borderBottom:`0.5px solid ${T.border}`,marginBottom:'8px',flexShrink:0}}>
        <PriorityDot priority={priority}/>
        <span style={{fontSize:F.xs,fontWeight:'700',color:priColor[priority]||T.text1,textTransform:'uppercase',letterSpacing:'0.05em'}}>{priority}</span>
        <span style={{fontSize:F.xs,color:T.text3,marginLeft:'auto'}}>({issues.length})</span>
      </div>
      <div ref={setNodeRef} style={{
        flex:1,overflowY:'auto',padding:'0 2px',minHeight:'80px',borderRadius:'4px',
        background:isOver?'rgba(110,159,216,0.07)':'transparent',
        transition:'background 0.15s',
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

  const columns = PRIORITY_OPTIONS;
  const byPriority = useMemo(() => {
    return columns.reduce((acc, p) => {
      acc[p] = issues.filter(iss => (iss.priority || '???') === p);
      return acc;
    }, {});
  }, [issues]);

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
        {columns.map(p => (
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
// DateFilter Popover
// ─────────────────────────────────────────────────────────────────────────────
const DateFilterPopover = ({ dateFilters, setDateFilters, open, onClose, anchorRef }) => {
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

  const toggle = (row, val) => {
    setDateFilters(prev => ({ ...prev, [row]: prev[row] === val ? null : val }));
  };

  const rows = [
    { key:'opened', label:'Opened' },
    { key:'updated', label:'Updated' },
    { key:'closed', label:'Closed' },
  ];
  const periods = [
    { key:'week', label:'This Week' },
    { key:'month', label:'This Month' },
    { key:'year', label:'This Year' },
  ];

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:200,
      background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px',
      padding:'10px 12px', minWidth:'290px', boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    }}>
      {rows.map(({ key, label }) => (
        <div key={key} style={{marginBottom:key==='closed'?0:10}}>
          <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px',fontWeight:'600'}}>{label}</div>
          <div style={{display:'flex',gap:'4px'}}>
            {periods.map(({ key:pk, label:pl }) => {
              const active = dateFilters[key] === pk;
              return (
                <button key={pk} onClick={() => toggle(key, pk)}
                  style={{
                    padding:'3px 9px', borderRadius:'4px', fontSize:F.xs, cursor:'pointer',
                    border:`0.5px solid ${active ? T.warn : T.border}`,
                    background: active ? 'rgba(212,146,74,0.18)' : 'transparent',
                    color: active ? T.warn : T.text2, fontWeight: active ? '600' : '400',
                    transition:'all 0.15s',
                  }}>
                  {pl}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Issues List
// ─────────────────────────────────────────────────────────────────────────────
const IssuesList = ({ onSelect, refreshTick }) => {
  const [issues, setIssues]         = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStatusFilter]   = useState('Open');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [propFilter, setPropFilter]       = useState([]);
  const [search, setSearch]         = useState('');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [activeProps, setActiveProps]   = useState([]);
  const [sortCol, setSortCol]       = useState('priority');
  const [sortDir, setSortDir]       = useState('asc');
  const [viewMode, setViewMode]     = useState('table');
  const [dateFilters, setDateFilters] = useState({ opened: null, updated: null, closed: null });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersAnchorRef = useRef(null);

  useEffect(() => {
    setLoading(true); setError(null);
    sbFetch('issues', 'select=*')
      .then(data => { setIssues(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [refreshTick]);

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

  const updateIssue = useCallback((id, field, value) => {
    setIssues(prev => prev.map(iss => iss.id === id ? { ...iss, [field]: value } : iss));
  }, []);

  const toggleProp = code => {
    if (code === 'All') { setPropFilter([]); return; }
    setPropFilter(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  const toggleSort = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('asc'); }
  };

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const isOpen = iss => iss.status !== 'Closed';
  const priRank = p => PRIORITY_ORDER[p] ?? 99;

  const counts = useMemo(() => ({
    open: issues.filter(isOpen).length,
    urgentHigh: issues.filter(iss => (iss.priority === 'Urgent' || iss.priority === 'High') && isOpen(iss)).length,
    resolvedThisMonth: issues.filter(iss => {
      if (!iss.close_date) return false;
      const d = new Date(iss.close_date + 'T00:00:00');
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length,
  }), [issues]);

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

  const applyFilters = useCallback((list, skipPriority = false) => {
    return list.filter(iss => {
      // Status
      if (dateFilters.closed && iss.status !== 'Closed') return false;
      if (statusFilter === 'Open' && !isOpen(iss)) return false;
      if (statusFilter === 'Closed' && iss.status !== 'Closed') return false;
      // Date filters
      if (dateFilters.opened && !isInRange(iss.create_date, dateFilters.opened)) return false;
      if (dateFilters.updated && !isInRange(iss.last_updated || iss.updated_at, dateFilters.updated)) return false;
      if (dateFilters.closed && !isInRange(iss.close_date, dateFilters.closed)) return false;
      // Priority
      if (!skipPriority && priorityFilter !== 'All' && (iss.priority || '???') !== priorityFilter) return false;
      // Property
      if (propFilter.length > 0 && !propFilter.includes(iss.prop_code)) return false;
      // Assigned
      const scottId  = users.find(u => u.full_name?.includes('Scott'))?.id;
      const gabrId   = users.find(u => u.full_name?.includes('Gabrielle'))?.id;
      if (assignedFilter === 'Scott' && iss.assigned_to_id !== scottId) return false;
      if (assignedFilter === 'Gabrielle' && iss.assigned_to_id !== gabrId) return false;
      if (assignedFilter === 'None' && iss.assigned_to_id != null) return false;
      // Search
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
  }, [statusFilter, priorityFilter, propFilter, assignedFilter, search, dateFilters, users]);

  const filtered = useMemo(() => applyFilters(sorted), [sorted, applyFilters]);

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

  const hasActiveFilters = propFilter.length > 0 || priorityFilter !== 'All' ||
    statusFilter !== 'Open' || assignedFilter !== 'All' || search !== '' ||
    !!(dateFilters.opened || dateFilters.updated || dateFilters.closed);

  const hasActiveDateFilter = !!(dateFilters.opened || dateFilters.updated || dateFilters.closed);

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

  const renderTh = (c, label) => (
    <th key={c} style={css.th} onClick={() => toggleSort(c)}>
      {label}{sortCol === c
        ? <span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>
        : <span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const assignedOptions = [
    { value: '', label: '— None —' },
    ...users.map(u => ({ value: u.id, label: u.full_name })),
  ];

  const renderRow = (iss, i) => {
    const userName = users.find(u => u.id === iss.assigned_to_id)?.full_name;
    const fuDate = fmtFuDate(iss.follow_up_date);
    const fuOverdue = isFuOverdue(iss.follow_up_date, iss.status);

    const openDetail = e => {
      if (e.ctrlKey || e.metaKey) {
        const tab = window.open(`${window.location.origin}/issues/${iss.id}`, '_blank');
        if (tab) tab.focus();
      } else {
        onSelect(iss);
      }
    };

    const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;

    return (
      <tr key={iss.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg}}
        onMouseEnter={e => e.currentTarget.style.background = T.bg2}
        onMouseLeave={e => e.currentTarget.style.background = rowBg}>

        {/* Issue Title — editable */}
        <InlineCell value={iss.issue_name} field="issue_name" issueId={iss.id}
          onOptimistic={updateIssue} tdStyle={css.td}
          displayNode={<span title={iss.issue_name}>{iss.issue_name||'—'}</span>}/>

        {/* FU Date — editable */}
        <InlineCell value={iss.follow_up_date||''} field="follow_up_date" issueId={iss.id}
          type="date" onOptimistic={updateIssue}
          tdStyle={{...css.td, color: fuOverdue ? T.warn : T.text2}}
          displayNode={fuDate ? <span style={{fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDate}</span> : <span style={{color:T.text3}}>—</span>}/>

        {/* Property — not editable, click opens detail */}
        <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs,minWidth:'70px',cursor:'pointer'}}
          onClick={openDetail}>{iss.prop_code||'—'}</td>

        {/* Priority — editable */}
        <InlineCell value={iss.priority||'???'} field="priority" issueId={iss.id}
          options={PRIORITY_OPTIONS.map(p => ({value:p,label:p}))} onOptimistic={updateIssue}
          tdStyle={css.td}
          displayNode={<span style={{display:'flex',alignItems:'center'}}><PriorityDot priority={iss.priority||'???'}/>{iss.priority||'???'}</span>}/>

        {/* Assigned To — editable */}
        <InlineCell value={iss.assigned_to_id||''} field="assigned_to_id" issueId={iss.id}
          options={assignedOptions} onOptimistic={updateIssue}
          tdStyle={{...css.td,fontSize:F.xs,color:T.text1}}
          displayNode={<span>{userName||'—'}</span>}/>

        {/* Type — editable */}
        <InlineCell value={iss.category||''} field="category" issueId={iss.id}
          options={[{value:'',label:'—'},...CATEGORY_OPTIONS.map(c=>({value:c,label:c}))]} onOptimistic={updateIssue}
          tdStyle={{...css.td,color:T.text2}}
          displayNode={<span>{iss.category||'—'}</span>}/>

        {/* Status — editable */}
        <InlineCell value={iss.status||'Open'} field="status" issueId={iss.id}
          options={STATUS_OPTIONS.map(s=>({value:s,label:s}))} onOptimistic={updateIssue}
          tdStyle={css.td}
          displayNode={<StatusBadge status={iss.status||'Open'}/>}/>

        {/* Updated — not editable */}
        <td style={{...css.td,color:T.text2,fontSize:F.xs,cursor:'pointer'}} onClick={openDetail}>
          {iss.last_updated ? fmtDate(iss.last_updated) : iss.updated_at ? fmtDate(iss.updated_at) : '—'}
        </td>

        {/* Opened — not editable */}
        <td style={{...css.td,color:T.text2,fontSize:F.xs,cursor:'pointer'}} onClick={openDetail}>
          {iss.create_date ? fmtDate(iss.create_date) : '—'}
        </td>

        {/* Closed — not editable */}
        <td style={{...css.td,color:iss.close_date?T.success:T.text3,fontSize:F.xs,cursor:'pointer'}} onClick={openDetail}>
          {iss.close_date ? fmtDate(iss.close_date) : '—'}
        </td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 14px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>

        {/* Title row */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Issues</span>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length.toLocaleString()} shown</span>
            {/* View toggle */}
            <div style={{display:'flex',gap:'2px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'2px'}}>
              {[{mode:'table',icon:'≡',title:'Table view'},{mode:'kanban',icon:'⊞',title:'Kanban view'}].map(({mode,icon,title}) => (
                <button key={mode} onClick={() => setViewMode(mode)} title={title}
                  style={{padding:'4px 9px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:'15px',lineHeight:1,
                    background:viewMode===mode?T.bg3:'transparent',
                    color:viewMode===mode?T.text0:T.text2,fontWeight:viewMode===mode?'600':'400'}}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat chips + property filter */}
        <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
          {[
            ['Total Open', counts.open, T.accent],
            ['High / Urgent', counts.urgentHigh, T.danger],
            ['Resolved / Mo', counts.resolvedThisMonth, T.success],
          ].map(([label,count,color]) => (
            <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'3px 10px',flexShrink:0,display:'flex',alignItems:'center',gap:'7px'}}>
              <span style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{label}</span>
              <span style={{fontSize:F.md,fontWeight:'700',color,lineHeight:1}}>{count}</span>
            </div>
          ))}
          <div style={{flex:1,display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={() => toggleProp('All')} style={propBtnStyle(propFilter.length === 0)}>All</button>
            {[activeProps.slice(0, Math.ceil(activeProps.length/2)), activeProps.slice(Math.ceil(activeProps.length/2))].map((row, ri) => (
              <React.Fragment key={ri}>
                {row.map(pc => (
                  <button key={pc} onClick={() => toggleProp(pc)} style={propBtnStyle(propFilter.includes(pc))}>{pc}</button>
                ))}
                {ri === 0 && activeProps.length > Math.ceil(activeProps.length/2) && <div style={{flexBasis:'100%',height:0}}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>

          {/* Priority filter with counts */}
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['All','???','Urgent','High','Medium','Low'].map(p => {
              const cnt = p === 'All' ? null : priorityCounts[p] ?? 0;
              const active = priorityFilter === p;
              return (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  style={{padding:'4px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                    background:active?T.bg3:'transparent',
                    color:active?T.text0:T.text2,
                    fontWeight:active?'600':'400',display:'flex',alignItems:'center',gap:'3px',whiteSpace:'nowrap'}}>
                  {p !== 'All' && <PriorityDot priority={p}/>}
                  {p}
                  {cnt !== null && <span style={{color:active?T.text1:T.text3,fontSize:'11px'}}>·{cnt}</span>}
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['Open','Closed','All'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{padding:'4px 9px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
                  background:statusFilter===s?T.bg3:'transparent',
                  color:statusFilter===s?T.text0:T.text2,
                  fontWeight:statusFilter===s?'600':'400'}}>
                {s}
              </button>
            ))}
          </div>

          {/* Assigned To */}
          <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)}
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'4px 8px',color:T.text0,fontSize:F.xs,outline:'none',cursor:'pointer'}}>
            {['All','Scott','Gabrielle','None'].map(v => (
              <option key={v} value={v} style={{background:T.bg1}}>{v==='All'?'Assigned: All':v}</option>
            ))}
          </select>

          {/* Date Filters button */}
          <div style={{position:'relative'}} ref={filtersAnchorRef}>
            <button onClick={() => setFiltersOpen(o => !o)}
              style={{padding:'4px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                border:`0.5px solid ${hasActiveDateFilter?T.warn:T.border}`,
                background:filtersOpen?T.bg3:'transparent',
                color:hasActiveDateFilter?T.warn:T.text1,
                display:'flex',alignItems:'center',gap:'5px'}}>
              Filters
              {hasActiveDateFilter && <span style={{width:'6px',height:'6px',borderRadius:'50%',background:T.warn,flexShrink:0,display:'inline-block'}}/>}
            </button>
            <DateFilterPopover
              dateFilters={dateFilters} setDateFilters={setDateFilters}
              open={filtersOpen} onClose={() => setFiltersOpen(false)}
              anchorRef={filtersAnchorRef}/>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button onClick={clearFilters}
              style={{padding:'4px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                border:`0.5px solid ${T.border}`,background:'transparent',
                color:T.text2,display:'flex',alignItems:'center',gap:'4px',
                transition:'all 0.15s'}}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.danger; e.currentTarget.style.color=T.danger; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text2; }}>
              <span style={{fontSize:'12px'}}>×</span> Clear Filters
            </button>
          )}

          {/* Search */}
          <div style={{marginLeft:'auto',position:'relative',display:'flex',alignItems:'center'}}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>
                ×
              </button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search issues…"
              style={{width:'200px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`5px 10px 5px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}
            />
          </div>
        </div>
      </div>

      {/* Body — Table or Kanban */}
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
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>
              <col style={{width:'78px'}}/>
              <col style={{width:'72px',minWidth:'70px'}}/>
              <col style={{width:'92px'}}/>
              <col style={{width:'108px'}}/>
              <col style={{width:'88px'}}/>
              <col style={{width:'72px'}}/>
              <col style={{width:'84px'}}/>
              <col style={{width:'78px'}}/>
              <col style={{width:'78px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                {renderTh('issue_name','Issue Title')}
                {renderTh('follow_up_date','FU Date')}
                <th style={{...css.th,minWidth:'70px',paddingLeft:'10px'}}>Property</th>
                {renderTh('priority','Priority')}
                {renderTh('assigned_to_id','Assigned To')}
                {renderTh('category','Type')}
                {renderTh('status','Status')}
                {renderTh('last_updated','Updated')}
                {renderTh('create_date','Opened')}
                {renderTh('close_date','Closed')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No issues match filters</td></tr>
              )}
              {grouped ? (
                grouped.map(group => (
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={10} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
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
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Issue Detail
// ─────────────────────────────────────────────────────────────────────────────
export const IssueDetail = ({ issue, onBack, onUpdate }) => {
  const [tab, setTab] = useState('info');
  const [data, setData] = useState(issue);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(280);
  const resizingRight = useRef(false);

  const startRightResize = useCallback((e) => {
    resizingRight.current = true;
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (me) => {
      if (!resizingRight.current) return;
      setRightWidth(Math.max(180, Math.min(500, startW - (me.clientX - startX))));
    };
    const onUp = () => { resizingRight.current = false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
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

  const save = async (field, val) => {
    await sbPatch('issues', data.id, { [field]: val || null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const TABS = ['Info', 'Timeline', 'Notes'];
  const tabKey = t => t.toLowerCase();

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Issues
          </button>
          <span style={{color:T.text3,fontSize:F.sm}}>{data.prop_code||'—'}</span>
          <span style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
            <StatusBadge status={data.status}/>
            <StatusBadge status={data.priority}/>
          </span>
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,lineHeight:'1.3'}}>{data.issue_name||'Untitled Issue'}</div>
        <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>{data.prop_code} · {data.category||'Uncategorized'}</div>
      </div>

      <div style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(tabKey(t))}
            style={{background:'transparent',border:'none',padding:'6px 12px',fontSize:F.sm,cursor:'pointer',borderRadius:'4px 4px 0 0',
              color:tab===tabKey(t)?T.accent:T.text1,
              borderBottom:tab===tabKey(t)?`2px solid ${T.accent}`:'2px solid transparent',
              fontWeight:tab===tabKey(t)?'600':'400'}}>
            {t}
          </button>
        ))}
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          {tab==='info' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Issue Info</div>
                <EditableField label="Issue Title" value={data.issue_name} onSave={v=>save('issue_name',v)}/>
                <EditableField label="Issue Type" value={data.category} onSave={v=>save('category',v)}/>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Priority</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {PRIORITY_OPTIONS.map(p=>(
                      <button key={p} onClick={()=>save('priority',p)}
                        style={{padding:'3px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,
                          border:data.priority===p?`1px solid ${T.accent}`:`1px solid ${T.border}`,
                          background:data.priority===p?T.bg3:'transparent',
                          color:data.priority===p?T.text0:T.text2}}>
                        <PriorityDot priority={p}/>{p}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Status</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {STATUS_OPTIONS.map(s=>(
                      <button key={s} onClick={()=>save('status',s)}
                        style={{padding:'3px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,
                          border:data.status===s?`1px solid ${T.accent}`:`1px solid ${T.border}`,
                          background:data.status===s?T.bg3:'transparent',
                          color:data.status===s?T.text0:T.text2}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Property</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Prop Code</div>
                  <div style={{fontSize:F.md,color:T.accent,fontWeight:'600',padding:'3px 5px'}}>{data.prop_code||'—'}</div>
                </div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Follow-Up Date</div>
                  <div style={{fontSize:F.base,color:isFuOverdue(data.follow_up_date,data.status)?T.warn:T.text0,padding:'3px 5px'}}>
                    {fmtFuDate(data.follow_up_date)||'—'}
                  </div>
                </div>
              </div>
              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Description</div>
                <EditableField label="" value={data.issue_details} onSave={v=>save('issue_details',v)} type="textarea"/>
              </div>
            </div>
          )}
          {tab==='timeline' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Dates</div>
                <EditableField label="Reported Date" value={data.create_date} onSave={v=>save('create_date',v)} type="date"/>
                <EditableField label="Follow-Up Date" value={data.follow_up_date} onSave={v=>save('follow_up_date',v)} type="date"/>
                <EditableField label="Resolved Date" value={data.close_date} onSave={v=>save('close_date',v)} type="date"/>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Created</div>
                  <div style={{fontSize:F.base,color:T.text1,padding:'3px 5px'}}>{fmtDate(data.created_at)}</div>
                </div>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Status Overview</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  {[
                    ['Status', <StatusBadge status={data.status}/>],
                    ['Priority', <StatusBadge status={data.priority}/>],
                    ['Reported', data.create_date ? fmtDate(data.create_date) : 'Not set'],
                    ['Resolved', data.close_date ? fmtDate(data.close_date) : 'Open'],
                  ].map(([label,val])=>(
                    <div key={label} style={{background:T.bg3,borderRadius:'6px',padding:'10px 12px'}}>
                      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{label}</div>
                      <div style={{fontSize:F.sm,color:T.text0}}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==='notes' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Notes</div>
                <EditableField label="" value={data.strategy_notes} onSave={v=>save('strategy_notes',v)} type="textarea"/>
              </div>
            </div>
          )}
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
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function IssuesView() {
  const [selected, setSelected] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleSelect = useCallback((iss) => {
    history.pushState({ issueId: iss.id }, '');
    setSelected(iss);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.issueId) history.replaceState({}, '');
    setSelected(null);
    setRefreshTick(t => t + 1);
  }, []);

  useEffect(() => {
    const onPop = () => { setSelected(null); setRefreshTick(t => t + 1); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <IssuesList onSelect={handleSelect} refreshTick={refreshTick}/>
      </div>
      {selected && (
        <IssueDetail
          key={selected.id}
          issue={selected}
          onBack={handleBack}
          onUpdate={updated => setSelected(updated)}
        />
      )}
    </div>
  );
}
