import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  sbFetch, T, F, css, StatusBadge, PriorityDot,
  TaskTypeIcon,
} from '../TasksView';
import { getTaskPrefix } from '../../utils/taskPrefix';

const fmtNumDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

const isFuOverdue = (d, task) => {
  if (!d || task.status === 'Closed' || task.status === 'Cancelled') return false;
  const date = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return date <= today;
};

const TYPE_LABEL = { work_order:'WO', task:'TSK', project:'Proj.', acp_task:'ACP', sg_task:'S&G', note:'Note' };

const TYPE_COLOR = {
  work_order:'#EF4444', task:'#06B6D4', note:'#64748B',
  project:'#8B5CF6', acp_task:'#E8630A', sg_task:'#84CC16',
};

// Priority pill styles — mirrors TasksView.jsx PRI_STYLES
const PRI_STYLES = {
  '???':  { activeBg:T.bg3,     activeColor:T.text0, border:T.text2,   hover:'rgba(107,114,128,0.25)' },
  Urgent: { activeBg:T.danger,  activeColor:'#fff',   border:T.danger,  hover:'rgba(239,68,68,0.20)' },
  High:   { activeBg:T.warn,    activeColor:'#fff',   border:T.warn,    hover:'rgba(212,146,74,0.20)' },
  Medium: { activeBg:T.success, activeColor:'#fff',   border:T.success, hover:'rgba(106,176,106,0.20)' },
  Low:    { activeBg:T.accent,  activeColor:'#fff',   border:T.accent,  hover:'rgba(110,159,216,0.20)' },
};

// Status pill styles — mirrors TasksView.jsx STA_STYLES
const STA_STYLES = {
  Open:          { activeBg:T.accent,  activeColor:'#fff', border:T.accent,  hover:'rgba(110,159,216,0.20)' },
  'In Progress': { activeBg:T.purple,  activeColor:'#fff', border:T.purple,  hover:'rgba(154,122,212,0.20)' },
  'On Hold':     { activeBg:T.warn,    activeColor:T.bg0,  border:T.warn,    hover:'rgba(212,146,74,0.20)' },
  Closed:        { activeBg:T.text2,   activeColor:'#fff', border:T.text2,   hover:'rgba(90,98,114,0.20)' },
  Cancelled:     { activeBg:T.danger,  activeColor:'#fff', border:T.danger,  hover:'rgba(224,112,112,0.20)' },
};

// null key = All types
const TYPE_PILLS = [
  { key: null,         label: 'All' },
  { key: 'work_order', label: 'WO' },
  { key: 'task',       label: 'TSK' },
  { key: 'project',    label: 'Proj.' },
  { key: 'acp_task',   label: 'ACP' },
  { key: 'sg_task',    label: 'S&G' },
  { key: 'note',       label: 'Note' },
];

// null key = All priorities
const PRIORITY_PILLS = [
  { key: null,     label: 'All' },
  { key: '???',    label: '???' },
  { key: 'Urgent', label: 'Urgent' },
  { key: 'High',   label: 'High' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Low',    label: 'Low' },
];

// null key = Open default (status=not.in.(Closed,Cancelled)); 'All' = no filter; others = eq.[value]
const STATUS_PILLS = [
  { key: null,          label: 'Open' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'On Hold',     label: 'On Hold' },
  { key: 'Closed',      label: 'Closed' },
  { key: 'Cancelled',   label: 'Cancelled' },
  { key: 'All',         label: 'All' },
];

export default function TasksTable({
  filterPropCode,
  filterProjectId,
  filterType,
  filterVendorId,
  filterTenantId,
  filterContactId,
  backUrl,
  hidePropertyFilter = false,
  hideSearch = false,
  hideTypeFilter = false,
  hideVendorCol = false,
  hideTenantCol = false,
}) {
  const router = useRouter();
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [vendors, setVendors]     = useState([]);
  const [tenants, setTenants]     = useState([]);
  const [typeFilter, setTypeFilter]         = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [statusFilter, setStatusFilter]     = useState(null);

  useEffect(() => { setFiltersReady(true); }, []);

  useEffect(() => {
    sbFetch('vendors', 'select=id,company_dba&vendor_status=eq.Active&order=company_dba.asc').then(setVendors).catch(()=>{});
    sbFetch('tenants', 'select=id,tenant_dba&tenant_status=eq.Active&order=tenant_dba.asc').then(setTenants).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    let cancelled = false;
    setLoading(true); setError(null);

    const run = async () => {
      const parts = ['order=updated_at.desc.nullslast'];

      // Status: null = Open (not Closed/Cancelled), 'All' = no filter, else exact match
      if (statusFilter === null) {
        parts.push('status=not.in.(Closed,Cancelled)');
      } else if (statusFilter !== 'All') {
        parts.push(`status=eq.${encodeURIComponent(statusFilter)}`);
      }

      if (filterPropCode)  parts.push(`prop_code=eq.${encodeURIComponent(filterPropCode)}`);
      if (filterProjectId) parts.push(`project_id=eq.${filterProjectId}`);
      // External filterType prop takes precedence over local type pill
      if (filterType)      parts.push(`record_type=eq.${filterType}`);
      else if (typeFilter)  parts.push(`record_type=eq.${typeFilter}`);
      if (filterVendorId)  parts.push(`vendor_id=eq.${filterVendorId}`);
      if (filterTenantId)  parts.push(`tenant_id=eq.${filterTenantId}`);
      if (priorityFilter)  parts.push(`priority=eq.${encodeURIComponent(priorityFilter)}`);

      if (filterContactId) {
        let tcRows = [];
        try {
          tcRows = await sbFetch('task_contacts', `contact_id=eq.${filterContactId}&select=task_id`);
        } catch (jErr) {
          setError(jErr.message); setLoading(false); return;
        }
        const taskIds = (tcRows || []).map(r => r.task_id);
        if (!taskIds.length) {
          if (!cancelled) { setTasks([]); setLoading(false); }
          return;
        }
        parts.push(`id=in.(${taskIds.join(',')})`);
      }

      const data = await sbFetch('tasks',
        `select=id,task_num,record_type,title,prop_code,priority,status,stage,follow_up_date,vendor_id,tenant_id,updated_at,created_at&${parts.join('&')}`
      );
      if (!cancelled) { setTasks(data); setLoading(false); }
    };

    run().catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filtersReady, filterPropCode, filterProjectId, filterType, filterVendorId, filterTenantId, filterContactId, typeFilter, priorityFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t =>
      (t.title||'').toLowerCase().includes(q) ||
      (t.prop_code||'').toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const navigate = task => {
    const navL = filtered.map(t => ({ task_num: t.task_num, record_type: t.record_type }));
    const idx  = filtered.findIndex(t => t.task_num === task.task_num && t.record_type === task.record_type);
    try {
      sessionStorage.setItem('tasksNavList',  JSON.stringify(navL));
      sessionStorage.setItem('tasksNavIndex', String(idx));
      sessionStorage.setItem('tasksBackUrl',  backUrl || window.location.href);
    } catch {}
    router.push(`/tasks/${task.task_num}`);
  };

  if (loading) return <div style={{padding:'20px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading…</div>;
  if (error)   return <div style={{padding:'20px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>;

  // Local th style — overflow:hidden prevents narrow headers bleeding into adjacent cells
  const thStyle = {...css.th, overflow:'hidden', textOverflow:'ellipsis'};

  return (
    <div style={{height:'100%', overflow:'auto'}}>
      {!hideSearch && (
        <div style={{marginBottom:'6px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…"
            style={{width:'200px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'4px 10px',color:T.text0,fontSize:F.xs,outline:'none'}}/>
        </div>
      )}

      {/* Filter pills — Type | Priority | Status in one scrollable row */}
      <div className="filter-row" style={{gap:'4px',marginBottom:'6px'}}>

        {/* Type pills */}
        {!hideTypeFilter && <>
          {TYPE_PILLS.map(({key, label}) => {
            const active = typeFilter === key;
            const color = key ? TYPE_COLOR[key] : T.accent;
            const hoverBg = key ? `${TYPE_COLOR[key]}33` : 'rgba(110,159,216,0.20)';
            return (
              <button key={String(key)} onClick={()=>setTypeFilter(key)}
                style={{padding:'2px 8px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',
                  cursor:active?'default':'pointer',border:`1px solid ${color}`,
                  background:active?color:'transparent',color:active?'#fff':color,
                  transition:'background 0.15s ease',flexShrink:0,whiteSpace:'nowrap'}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hoverBg;}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
                {label}
              </button>
            );
          })}
          <span style={{color:T.border,flexShrink:0,alignSelf:'center',padding:'0 2px',userSelect:'none'}}>|</span>
        </>}

        {/* Priority pills */}
        {PRIORITY_PILLS.map(({key, label}) => {
          const active = priorityFilter === key;
          let activeBg, activeFg, border, hoverBg;
          if (key === null) {
            activeBg = T.accent; activeFg = '#fff'; border = T.accent; hoverBg = 'rgba(110,159,216,0.20)';
          } else {
            const s = PRI_STYLES[key] || PRI_STYLES['???'];
            activeBg = s.activeBg; activeFg = s.activeColor; border = s.border; hoverBg = s.hover;
          }
          return (
            <button key={String(key)} onClick={()=>setPriorityFilter(key)}
              style={{padding:'2px 8px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',
                cursor:active?'default':'pointer',border:`1px solid ${border}`,
                background:active?activeBg:'transparent',color:active?activeFg:border,
                transition:'background 0.15s ease',flexShrink:0,whiteSpace:'nowrap'}}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hoverBg;}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
              {label}
            </button>
          );
        })}
        <span style={{color:T.border,flexShrink:0,alignSelf:'center',padding:'0 2px',userSelect:'none'}}>|</span>

        {/* Status pills */}
        {STATUS_PILLS.map(({key, label}) => {
          const active = statusFilter === key;
          let activeBg, activeFg, border, hoverBg;
          if (key === null) {
            // Default "Open" — same visual as Open status badge
            activeBg = T.accent; activeFg = '#fff'; border = T.accent; hoverBg = 'rgba(110,159,216,0.20)';
          } else if (key === 'All') {
            activeBg = T.bg3; activeFg = T.text0; border = T.text2; hoverBg = 'rgba(90,98,114,0.20)';
          } else {
            const s = STA_STYLES[key] || STA_STYLES.Open;
            activeBg = s.activeBg; activeFg = s.activeColor; border = s.border; hoverBg = s.hover;
          }
          return (
            <button key={String(key)} onClick={()=>setStatusFilter(key)}
              style={{padding:'2px 8px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',
                cursor:active?'default':'pointer',border:`1px solid ${border}`,
                background:active?activeBg:'transparent',color:active?activeFg:border,
                transition:'background 0.15s ease',flexShrink:0,whiteSpace:'nowrap'}}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hoverBg;}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
              {label}
            </button>
          );
        })}

      </div>

      <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
        <colgroup>
          <col style={{width:'28px'}}/>
          <col style={{width:'38px'}}/>
          <col style={{width:'90px'}}/>
          <col/>
          {!hidePropertyFilter&&<col style={{width:'56px'}}/>}
          <col style={{width:'88px'}}/>
          <col style={{width:'70px'}}/>
          <col style={{width:'90px'}}/>
          <col style={{width:'76px'}}/>
          {!hideVendorCol&&<col style={{width:'100px'}}/>}
          {!hideTenantCol&&<col style={{width:'100px'}}/>}
          <col style={{width:'80px'}}/>
          <col style={{width:'80px'}}/>
        </colgroup>
        <thead>
          <tr>
            <th style={{...thStyle,cursor:'default'}}></th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Title</th>
            {!hidePropertyFilter&&<th style={thStyle}>Prop</th>}
            <th style={thStyle}>FU Date</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Stage</th>
            <th style={thStyle}>Status</th>
            {!hideVendorCol&&<th style={thStyle}>Vendor</th>}
            {!hideTenantCol&&<th style={thStyle}>Tenant</th>}
            <th style={thStyle}>Updated</th>
            <th style={thStyle}>Opened</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length===0&&(
            <tr><td colSpan={99} style={{textAlign:'center',padding:'24px',opacity:0.5,fontSize:'13px',color:T.text3}}>No tasks found</td></tr>
          )}
          {filtered.map((task,i)=>{
            const displayId=getTaskPrefix(task);
            const href=`/tasks/${task.task_num}`;
            const rowBg=i%2===0?'transparent':T.bg0;
            const fuOverdue=isFuOverdue(task.follow_up_date,task);
            const vendorName=vendors.find(v=>v.id===task.vendor_id)?.company_dba||'';
            const tenantName=tenants.find(t=>t.id===task.tenant_id)?.tenant_dba||'';
            return (
              <tr key={task.id}
                style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                onMouseLeave={e=>e.currentTarget.style.background=rowBg}
                onClick={e=>{if(e.ctrlKey||e.metaKey){window.open(href,'_blank');}else{navigate(task);}}}>
                <td style={{...css.td,width:'28px',textAlign:'center',overflow:'visible',padding:'4px'}}>
                  <TaskTypeIcon recordType={task.record_type} size={13}/>
                </td>
                <td style={{...css.td,fontSize:F.xs,color:T.text3,fontWeight:'600'}}>
                  {TYPE_LABEL[task.record_type]||task.record_type}
                </td>
                <td style={{...css.td,fontSize:F.xs,color:T.text2}}>
                  <a href={href} onClick={e=>{if(!e.ctrlKey&&!e.metaKey){e.preventDefault();navigate(task);}}} style={{color:'inherit',textDecoration:'none'}}>{displayId}</a>
                </td>
                <td style={css.td} title={task.title}>
                  <a href={href} onClick={e=>{if(!e.ctrlKey&&!e.metaKey){e.preventDefault();navigate(task);}}} style={{color:'inherit',textDecoration:'none'}}>{task.title||''}</a>
                </td>
                {!hidePropertyFilter&&(
                  <td style={{...css.td,fontSize:F.xs}}>
                    {task.prop_code&&<span style={{background:'#1a2e3a',color:T.accent,padding:'1px 5px',borderRadius:'3px',fontWeight:'600'}}>{task.prop_code}</span>}
                  </td>
                )}
                <td style={{...css.td,color:fuOverdue?T.warn:T.text2,fontSize:F.xs}}>
                  {task.follow_up_date
                    ? <span style={{fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fmtNumDate(task.follow_up_date)}</span>
                    : ''}
                </td>
                <td style={css.td}>
                  <span style={{display:'flex',alignItems:'center'}}>
                    <PriorityDot priority={task.priority||'???'}/>{task.priority||'???'}
                  </span>
                </td>
                <td style={{...css.td,overflow:'visible'}}>
                  {task.stage&&<span style={css.badge(T.purple,'#2a1f3a')}>{task.stage}</span>}
                </td>
                <td style={{...css.td,overflow:'visible'}}><StatusBadge status={task.status||'Open'}/></td>
                {!hideVendorCol&&<td style={{...css.td,fontSize:F.xs,color:T.text1}} title={vendorName}>{vendorName}</td>}
                {!hideTenantCol&&<td style={{...css.td,fontSize:F.xs,color:T.text1}} title={tenantName}>{tenantName}</td>}
                <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
                  {task.updated_at?fmtNumDate(task.updated_at):''}
                </td>
                <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
                  {task.created_at?fmtNumDate(task.created_at):''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="crm-mobile-cards">
        {filtered.map((task,i)=>{
          const displayId=getTaskPrefix(task);
          const rowBg=i%2===0?'transparent':T.bg0;
          const fuOverdue=isFuOverdue(task.follow_up_date,task);
          const vendorName=!hideVendorCol?(vendors.find(v=>v.id===task.vendor_id)?.company_dba||''):'';
          const tenantName=!hideTenantCol?(tenants.find(t=>t.id===task.tenant_id)?.tenant_dba||''):'';
          return (
            <div key={task.id}
              style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
              onClick={()=>navigate(task)}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
              onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',flexWrap:'wrap'}}>
                <TaskTypeIcon recordType={task.record_type} size={16}/>
                <span style={{fontSize:F.xs,color:T.text3,fontWeight:'600'}}>{TYPE_LABEL[task.record_type]||task.record_type}</span>
                <span style={{fontSize:F.xs,color:T.text2}}>{displayId}</span>
                <span style={{fontWeight:'600',fontSize:F.sm,color:T.text0}}>{task.title||'—'}</span>
              </div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',alignItems:'center'}}>
                {!hidePropertyFilter&&task.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 5px',borderRadius:'3px',fontWeight:'600'}}>{task.prop_code}</span>}
                <StatusBadge status={task.status||'Open'}/>
                {task.priority&&<span style={{display:'flex',alignItems:'center',gap:'3px',fontSize:F.xs,color:T.text2}}><PriorityDot priority={task.priority}/>{task.priority}</span>}
                {fuOverdue&&task.follow_up_date&&<span style={{fontSize:F.xs,color:T.warn,fontWeight:'600'}}>⚠ {fmtNumDate(task.follow_up_date)}</span>}
                {task.stage&&<span style={{...css.badge(T.purple,'#2a1f3a'),fontSize:'11px'}}>{task.stage}</span>}
                {vendorName&&<span style={{fontSize:F.xs,color:T.text1}}>{vendorName}</span>}
                {tenantName&&<span style={{fontSize:F.xs,color:T.text1}}>{tenantName}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
