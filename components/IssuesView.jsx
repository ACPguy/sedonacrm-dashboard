// ─────────────────────────────────────────────────────────────────────────────
// IssuesView.jsx  —  SedonaCRM Phase 2 UI
// Standalone reusable component. Wire into SedonaCRM.jsx:
//   import IssuesView from './IssuesView';
//   nav: { icon: 'ti-alert-triangle', label: 'Issues', view: 'issues' }
//   case 'issues': return <IssuesView key={resetKey}/>;
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const sbPatch = async (table, id, updates) => {
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

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };
const css = {
  card: { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  secTitle: { fontSize:F.xs, fontWeight:'600', color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  badge: (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th: { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

const StatusBadge = ({ status }) => {
  const s = (status||'').toLowerCase();
  const map = {
    open:[T.accent,'#1a2e3a'], closed:[T.text2,T.bg3],
    high:[T.danger,'#3d1f1f'], medium:[T.warn,'#3d2e1a'], low:[T.success,'#1e2a1e'],
    '???':[T.text2,T.bg3],
  };
  const [color,bg] = map[s]||[T.text2,T.bg3];
  return <span style={css.badge(color,bg)}>{status||'—'}</span>;
};

const EditableField = ({ label, value, onSave, type='text' }) => {
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

const useSortable = (data, defaultCol, defaultDir='asc') => {
  const [col,setCol] = useState(defaultCol);
  const [dir,setDir] = useState(defaultDir);
  const toggle = c => { if(c===col) setDir(d=>d==='asc'?'desc':'asc'); else{setCol(c);setDir('asc');} };
  const sorted = [...(data||[])].sort((a,b)=>{
    const av=a[col]??'', bv=b[col]??'';
    const cmp = typeof av==='number'?av-bv : isNaN(Number(av))||av===''?String(av).localeCompare(String(bv)):Number(av)-Number(bv);
    return dir==='asc'?cmp:-cmp;
  });
  const Th = ({c,label,align}) => (
    <th style={{...css.th,textAlign:align||'left'}} onClick={()=>toggle(c)}>
      {label}{col===c?<span style={{marginLeft:'3px'}}>{dir==='asc'?'↑':'↓'}</span>:<span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );
  return { sorted, Th };
};

// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel
// ─────────────────────────────────────────────────────────────────────────────
const ActivityPanel = ({ collapsed, onCollapse, width, onMouseDown }) => {
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
                    Comments and attached files will sync from Podio via API at go-live. All existing comment history will appear here.
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
                    Activity tracking begins at go-live. Field changes and status updates will appear here.
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
// Priority dot
// ─────────────────────────────────────────────────────────────────────────────
const PriorityDot = ({ priority }) => {
  const colors = { High:T.danger, Medium:T.warn, Low:T.success, '???':T.text3 };
  return (
    <span style={{
      display:'inline-block', width:'7px', height:'7px', borderRadius:'50%',
      background:colors[priority]||T.text3, marginRight:'6px', flexShrink:0,
      verticalAlign:'middle', position:'relative', top:'-1px'
    }}/>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Issue Detail
// ─────────────────────────────────────────────────────────────────────────────
const IssueDetail = ({ issue, onBack, onUpdate }) => {
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
      {/* Header */}
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
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,lineHeight:'1.3'}}>{data.issue_title||'Untitled Issue'}</div>
        <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>
          {data.prop_code} · {data.issue_type||'Uncategorized'}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(tabKey(t))}
            style={{
              background:'transparent', border:'none', padding:'6px 12px',
              fontSize:F.sm, cursor:'pointer', borderRadius:'4px 4px 0 0',
              color:tab===tabKey(t)?T.accent:T.text1,
              borderBottom:tab===tabKey(t)?`2px solid ${T.accent}`:'2px solid transparent',
              fontWeight:tab===tabKey(t)?'600':'400',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

          {/* ── INFO TAB ── */}
          {tab==='info' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Issue Info</div>
                <EditableField label="Issue Title" value={data.issue_title} onSave={v=>save('issue_title',v)}/>
                <EditableField label="Issue Type" value={data.issue_type} onSave={v=>save('issue_type',v)}/>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Priority</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {['High','Medium','Low','???'].map(p=>(
                      <button key={p} onClick={()=>save('priority',p)}
                        style={{
                          padding:'3px 10px', borderRadius:'4px', cursor:'pointer', fontSize:F.sm,
                          border:data.priority===p?`1px solid ${T.accent}`:`1px solid ${T.border}`,
                          background:data.priority===p?T.bg3:'transparent',
                          color:data.priority===p?T.text0:T.text2,
                        }}>
                        <PriorityDot priority={p}/>{p}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Status</div>
                  <div style={{display:'flex',gap:'6px'}}>
                    {['Open','Closed'].map(s=>(
                      <button key={s} onClick={()=>save('status',s)}
                        style={{
                          padding:'3px 10px', borderRadius:'4px', cursor:'pointer', fontSize:F.sm,
                          border:data.status===s?`1px solid ${T.accent}`:`1px solid ${T.border}`,
                          background:data.status===s?T.bg3:'transparent',
                          color:data.status===s?T.text0:T.text2,
                        }}>
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
              </div>

              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Description</div>
                <EditableField label="" value={data.description} onSave={v=>save('description',v)} type="textarea"/>
              </div>
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {tab==='timeline' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Dates</div>
                <EditableField label="Reported Date" value={data.reported_date} onSave={v=>save('reported_date',v)} type="date"/>
                <EditableField label="Resolved Date" value={data.resolved_date} onSave={v=>save('resolved_date',v)} type="date"/>
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
                    ['Reported', data.reported_date ? fmtDate(data.reported_date) : 'Not set'],
                    ['Resolved', data.resolved_date ? fmtDate(data.resolved_date) : 'Open'],
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

          {/* ── NOTES TAB ── */}
          {tab==='notes' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Notes</div>
                <EditableField label="" value={data.notes} onSave={v=>save('notes',v)} type="textarea"/>
              </div>
            </div>
          )}

        </div>

        {/* Right activity panel */}
        <ActivityPanel
          collapsed={rightCollapsed}
          onCollapse={()=>setRightCollapsed(c=>!c)}
          width={rightWidth}
          onMouseDown={startRightResize}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Issues List
// ─────────────────────────────────────────────────────────────────────────────
const IssuesList = ({ onSelect }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Open');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [propFilter, setPropFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeProps, setActiveProps] = useState([]);

  const { sorted, Th } = useSortable(issues, 'reported_date', 'desc');

  useEffect(() => {
    setLoading(true);
    setError(null);
    sbFetch('issues', 'select=*&order=reported_date.desc')
      .then(data => { setIssues(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const isOpen = iss => !iss.status || iss.status === 'Open';

  const counts = {
    open: issues.filter(isOpen).length,
    high: issues.filter(iss => iss.priority === 'High' && isOpen(iss)).length,
    resolvedThisMonth: issues.filter(iss => {
      if (!iss.resolved_date) return false;
      const d = new Date(iss.resolved_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length,
  };

  const filtered = sorted.filter(iss => {
    if (statusFilter === 'Open' && !isOpen(iss)) return false;
    if (statusFilter === 'Closed' && iss.status !== 'Closed') return false;
    if (priorityFilter !== 'All' && iss.priority !== priorityFilter) return false;
    if (propFilter && iss.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (iss.issue_title||'').toLowerCase().includes(q) ||
        (iss.prop_code||'').toLowerCase().includes(q) ||
        (iss.issue_type||'').toLowerCase().includes(q) ||
        (iss.description||'').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Issues</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Summary stat cards */}
        <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
          {[
            ['Total Open', counts.open, T.accent],
            ['High Priority', counts.high, T.danger],
            ['Resolved This Month', counts.resolvedThisMonth, T.success],
          ].map(([label,count,color])=>(
            <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 14px',minWidth:'120px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
              <div style={{fontSize:F.xl,fontWeight:'700',color,marginTop:'2px'}}>{count}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          {/* Status */}
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['Open','Closed','All'].map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                style={{padding:'4px 12px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:statusFilter===s?T.bg3:'transparent',
                  color:statusFilter===s?T.text0:T.text2,
                  fontWeight:statusFilter===s?'600':'400'}}>
                {s}
              </button>
            ))}
          </div>

          {/* Priority */}
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['All','High','Medium','Low'].map(p=>(
              <button key={p} onClick={()=>setPriorityFilter(p)}
                style={{padding:'4px 10px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:priorityFilter===p?T.bg3:'transparent',
                  color:priorityFilter===p?T.text0:T.text2,
                  fontWeight:priorityFilter===p?'600':'400'}}>
                {p!=='All'&&<PriorityDot priority={p}/>}{p}
              </button>
            ))}
          </div>

          {/* Property dropdown */}
          <select value={propFilter} onChange={e=>setPropFilter(e.target.value)}
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:propFilter?T.text0:T.text2,fontSize:F.sm,outline:'none',cursor:'pointer'}}>
            <option value="">All Properties</option>
            {activeProps.map(c=><option key={c} value={c}>{c}</option>)}
          </select>

          {/* Search */}
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search issues…"
            style={{flex:1,minWidth:'180px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading issues…</div>}
        {error && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}
        {!loading && !error && (
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>  {/* Title */}
              <col style={{width:'60px'}}/>  {/* Prop */}
              <col style={{width:'110px'}}/> {/* Type */}
              <col style={{width:'80px'}}/>  {/* Priority */}
              <col style={{width:'70px'}}/>  {/* Status */}
              <col style={{width:'105px'}}/> {/* Reported */}
              <col style={{width:'105px'}}/> {/* Resolved */}
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="issue_title"    label="Issue Title"/>
                <Th c="prop_code"      label="Prop"/>
                <Th c="issue_type"     label="Type"/>
                <Th c="priority"       label="Priority"/>
                <Th c="status"         label="Status"/>
                <Th c="reported_date"  label="Reported"/>
                <Th c="resolved_date"  label="Resolved"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No issues match filters</td></tr>
              )}
              {filtered.map((iss,i) => (
                <tr key={iss.id}
                  onClick={()=>onSelect(iss)}
                  style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                  <td style={css.td} title={iss.issue_title}>{iss.issue_title||'—'}</td>
                  <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{iss.prop_code}</td>
                  <td style={{...css.td,color:T.text2}}>{iss.issue_type||'—'}</td>
                  <td style={css.td}>
                    <span style={{display:'flex',alignItems:'center'}}>
                      <PriorityDot priority={iss.priority}/>{iss.priority||'—'}
                    </span>
                  </td>
                  <td style={css.td}><StatusBadge status={iss.status||'Open'}/></td>
                  <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{iss.reported_date ? fmtDate(iss.reported_date) : '—'}</td>
                  <td style={{...css.td,color:iss.resolved_date?T.success:T.text3,fontSize:F.xs}}>
                    {iss.resolved_date ? fmtDate(iss.resolved_date) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function IssuesView() {
  const [selected, setSelected] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      {selected ? (
        <IssueDetail
          key={selected.id}
          issue={selected}
          onBack={()=>{ setSelected(null); setResetKey(k=>k+1); }}
          onUpdate={updated=>setSelected(updated)}
        />
      ) : (
        <IssuesList key={resetKey} onSelect={setSelected}/>
      )}
    </div>
  );
}
