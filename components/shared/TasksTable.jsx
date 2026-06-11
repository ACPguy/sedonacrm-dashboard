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
}) {
  const router = useRouter();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);

    const run = async () => {
      const parts = ['status=not.in.(Closed,Cancelled)', 'order=updated_at.desc.nullslast'];
      if (filterPropCode)  parts.push(`prop_code=eq.${encodeURIComponent(filterPropCode)}`);
      if (filterProjectId) parts.push(`project_id=eq.${filterProjectId}`);
      if (filterType)      parts.push(`record_type=eq.${filterType}`);
      if (filterVendorId)  parts.push(`vendor_id=eq.${filterVendorId}`);
      if (filterTenantId)  parts.push(`tenant_id=eq.${filterTenantId}`);

      if (filterContactId) {
        let tcRows = [];
        try {
          tcRows = await sbFetch('task_contacts', `contact_id=eq.${filterContactId}&select=task_id`);
        } catch (jErr) {
          console.log('[TasksTable] task_contacts fetch error:', filterContactId, jErr);
        }
        console.log('[TasksTable] task_contacts fetch:', filterContactId, tcRows);
        const taskIds = (tcRows || []).map(r => r.task_id);
        if (!taskIds.length) {
          if (!cancelled) { setTasks([]); setLoading(false); }
          return;
        }
        parts.push(`id=in.(${taskIds.join(',')})`);
      }

      const data = await sbFetch('tasks', `select=id,task_num,record_type,title,prop_code,priority,status,assigned_to,updated_at,created_at&${parts.join('&')}`);
      console.log('[TasksTable] tasks fetch:', { filterTenantId, filterVendorId, filterContactId, count: data.length });
      if (!cancelled) { setTasks(data); setLoading(false); }
    };

    run().catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filterPropCode, filterProjectId, filterType, filterVendorId, filterTenantId, filterContactId]);

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

  return (
    <div>
      {!hideSearch && (
        <div style={{marginBottom:'8px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…"
            style={{width:'200px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'4px 10px',color:T.text0,fontSize:F.xs,outline:'none'}}/>
        </div>
      )}
      <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
        <colgroup>
          <col style={{width:'28px'}}/>
          <col style={{width:'68px'}}/>
          <col/>
          {!hidePropertyFilter&&<col style={{width:'56px'}}/>}
          <col style={{width:'70px'}}/>
          <col style={{width:'76px'}}/>
          <col style={{width:'80px'}}/>
        </colgroup>
        <thead>
          <tr>
            <th style={{...css.th,cursor:'default'}}></th>
            <th style={css.th}>#</th>
            <th style={css.th}>Title</th>
            {!hidePropertyFilter&&<th style={css.th}>Prop</th>}
            <th style={css.th}>Priority</th>
            <th style={css.th}>Status</th>
            <th style={css.th}>Updated</th>
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
            return (
              <tr key={task.id}
                style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                onMouseLeave={e=>e.currentTarget.style.background=rowBg}
                onClick={e=>{if(e.ctrlKey||e.metaKey){window.open(href,'_blank');}else{navigate(task);}}}>
                <td style={{...css.td,width:'28px',textAlign:'center',overflow:'visible',padding:'4px'}}>
                  <TaskTypeIcon recordType={task.record_type} size={13}/>
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
                <td style={css.td}>
                  <span style={{display:'flex',alignItems:'center'}}>
                    <PriorityDot priority={task.priority||'???'}/>{task.priority||'???'}
                  </span>
                </td>
                <td style={{...css.td,overflow:'visible'}}><StatusBadge status={task.status||'Open'}/></td>
                <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
                  {task.updated_at?fmtNumDate(task.updated_at):task.created_at?fmtNumDate(task.created_at):''}
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
          return (
            <div key={task.id}
              style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
              onClick={()=>navigate(task)}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
              onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}>
                <TaskTypeIcon recordType={task.record_type} size={16}/>
                <span style={{fontSize:F.xs,color:T.text2}}>{displayId}</span>
                <span style={{fontWeight:'600',fontSize:F.sm,color:T.text0}}>{task.title||'—'}</span>
              </div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',alignItems:'center'}}>
                {!hidePropertyFilter&&task.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 5px',borderRadius:'3px',fontWeight:'600'}}>{task.prop_code}</span>}
                <StatusBadge status={task.status||'Open'}/>
                {task.priority&&<span style={{display:'flex',alignItems:'center',gap:'3px',fontSize:F.xs,color:T.text2}}><PriorityDot priority={task.priority}/>{task.priority}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
