// ─────────────────────────────────────────────────────────────────────────────
// WorkOrdersView.jsx  —  SedonaCRM Phase 2 UI
// Drop this file into ~/sedonacrm-dashboard/components/WorkOrdersView.jsx
//
// USAGE in SedonaCRM.jsx:
//   import WorkOrdersView from './WorkOrdersView';
//   // In the nav, add:  { icon: 'ti-tool', label: 'Work Orders', view: 'work-orders' }
//   // In the render switch, add:
//   case 'work-orders': return <WorkOrdersView sbFetch={sbFetch} sbPatch={sbPatch} T={T} F={F} css={css} fmtDate={fmtDate} fmtMoney={fmtMoney} StatusBadge={StatusBadge} EditableField={EditableField} ActivityPanel={ActivityPanel} useSortable={useSortable} />;
//
// OR if you haven't split yet, paste the three components (WorkOrdersList,
// WorkOrderDetail, WorkOrdersView) into SedonaCRM.jsx and add the nav/case above.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Re-export-friendly: accepts all shared utilities as props so this file
//    works whether imported standalone OR inlined in the monolith.
// ── If you paste into the monolith, delete the prop destructuring below and
//    reference the already-defined constants directly.

// ─── Inline constants (only needed if using as standalone file) ───────────────
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
  tdNum: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', textAlign:'right' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtMoney = n => n != null && n !== '' ? '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';

const StatusBadge = ({ status }) => {
  const s = (status||'').toLowerCase();
  const map = {
    open:[T.accent,'#1a2e3a'], closed:[T.text2,T.bg3], 'in progress':[T.warn,'#3d2e1a'],
    new:[T.purple,'#2a1e3a'], complete:[T.success,'#1e2a1e'],
    'waiting on vendor':[T.warn,'#3d2e1a'], 'waiting on parts':[T.warn,'#3d2e1a'],
    high:[T.danger,'#3d1f1f'], medium:[T.warn,'#3d2e1a'], low:[T.success,'#1e2a1e'],
    '???':[T.text2,T.bg3],
    received:[T.accent,'#1a2e3a'], approved:[T.success,'#1e2a1e'], paid:[T.text2,T.bg3],
    'not received':[T.text2,T.bg3],
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
  return { sorted, toggle, Th };
};

// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel (inline copy — remove if using shared version from monolith)
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
// Priority dot indicator
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
// Stage progress bar
// ─────────────────────────────────────────────────────────────────────────────
const STAGES = ['New','In Progress','Waiting on Vendor','Waiting on Parts','Complete'];
const StageBar = ({ stage }) => {
  const idx = STAGES.indexOf(stage);
  return (
    <div style={{display:'flex',gap:'3px',alignItems:'center'}}>
      {STAGES.map((s,i) => (
        <div key={s} title={s} style={{
          flex:1, height:'4px', borderRadius:'2px',
          background: i <= idx ? (stage==='Complete'?T.success:T.accent) : T.bg3,
          transition:'background 0.2s',
        }}/>
      ))}
      <span style={{fontSize:F.xs,color:T.text2,whiteSpace:'nowrap',marginLeft:'6px'}}>{stage||'—'}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Work Order Detail
// ─────────────────────────────────────────────────────────────────────────────
const WorkOrderDetail = ({ wo, onBack, onUpdate }) => {
  const [tab, setTab] = useState('info');
  const [data, setData] = useState(wo);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(280);
  const resizingRight = useRef(false);

  // Right panel resize
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
    await sbPatch('work_orders', data.id, { [field]: val || null });
    const updated = { ...data, [field]: val };
    setData(updated);
    onUpdate?.(updated);
  };

  const TABS = ['Info','Vendor & Cost','Timeline','Notes'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Work Orders
          </button>
          <span style={{color:T.text3,fontSize:F.sm}}>WO #{data.wo_num||'—'}</span>
          <span style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
            <StatusBadge status={data.status}/>
            <StatusBadge status={data.priority}/>
          </span>
        </div>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
          <div>
            <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,lineHeight:'1.3'}}>{data.short_description}</div>
            <div style={{fontSize:F.sm,color:T.text2,marginTop:'2px'}}>
              {data.prop_code} · {data.category||'Uncategorized'} · {data.wo_type||'Standard'}
            </div>
          </div>
        </div>
        {/* Stage bar */}
        <div style={{marginTop:'10px'}}>
          <StageBar stage={data.stage}/>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-'))}
            style={{
              background:'transparent', border:'none', padding:'6px 12px',
              fontSize:F.sm, cursor:'pointer', borderRadius:'4px 4px 0 0',
              color: tab===t.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-') ? T.accent : T.text1,
              borderBottom: tab===t.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-') ? `2px solid ${T.accent}` : '2px solid transparent',
              fontWeight: tab===t.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-') ? '600' : '400',
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
                <div style={css.secTitle}>Work Order Info</div>
                <EditableField label="Short Description" value={data.short_description} onSave={v=>save('short_description',v)}/>
                <EditableField label="Category" value={data.category} onSave={v=>save('category',v)}/>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Priority</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {['High','Medium','Low','???'].map(p=>(
                      <button key={p} onClick={()=>save('priority',p)}
                        style={{
                          padding:'3px 10px', borderRadius:'4px', cursor:'pointer', fontSize:F.sm,
                          border: data.priority===p ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                          background: data.priority===p ? T.bg3 : 'transparent',
                          color: data.priority===p ? T.text0 : T.text2,
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
                          border: data.status===s ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                          background: data.status===s ? T.bg3 : 'transparent',
                          color: data.status===s ? T.text0 : T.text2,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Stage</div>
                  <select value={data.stage||''} onChange={e=>save('stage',e.target.value)}
                    style={{width:'100%',background:T.bg3,border:`1px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                    <option value="">— select —</option>
                    {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={css.card}>
                <div style={css.secTitle}>Property & Tenant</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Property</div>
                  <div style={{fontSize:F.base,color:T.text0,padding:'3px 5px'}}>{data.prop_code||'—'}</div>
                </div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>WO Type</div>
                  <select value={data.wo_type||''} onChange={e=>save('wo_type',e.target.value)}
                    style={{width:'100%',background:T.bg3,border:`1px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                    <option value="">— select —</option>
                    {['Standard','Recurring','Budget Item'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <EditableField label="Key Safe Info" value={data.key_safe_info} onSave={v=>save('key_safe_info',v)}/>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Budget Item</div>
                  <button onClick={()=>save('is_budget_item',!data.is_budget_item)}
                    style={{padding:'3px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,border:`1px solid ${T.border}`,background:data.is_budget_item?T.accent:'transparent',color:data.is_budget_item?'#fff':T.text2}}>
                    {data.is_budget_item ? '✓ Budget Item' : 'Mark as Budget Item'}
                  </button>
                </div>
              </div>

              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Instructions to Vendor</div>
                <EditableField label="" value={data.instructions_to_vendor} onSave={v=>save('instructions_to_vendor',v)} type="textarea"/>
              </div>
            </div>
          )}

          {/* ── VENDOR & COST TAB ── */}
          {tab==='vendor-&-cost' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Vendor</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Vendor ID</div>
                  <div style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',padding:'3px 5px'}}>
                    {data.vendor_id ? `UUID: ${data.vendor_id.slice(0,8)}…` : 'No vendor assigned — will wire at go-live via Podio API'}
                  </div>
                </div>
                <EditableField label="Estimate Amount" value={data.estimate_amount} onSave={v=>save('estimate_amount',v)} type="number"/>
                <EditableField label="Estimate Log / Notes" value={data.estimate_log} onSave={v=>save('estimate_log',v)} type="textarea"/>
              </div>

              <div style={css.card}>
                <div style={css.secTitle}>Invoice</div>
                <div style={{marginBottom:'10px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Invoice Stage</div>
                  <select value={data.invoice_stage||''} onChange={e=>save('invoice_stage',e.target.value)}
                    style={{width:'100%',background:T.bg3,border:`1px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                    <option value="">— select —</option>
                    {['Not Received','Received','Approved','Paid'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <EditableField label="Invoice Location / Reference" value={data.invoice_location} onSave={v=>save('invoice_location',v)}/>
                <EditableField label="Payment Instructions to Bookkeeper" value={data.pmt_instructions_to_bk} onSave={v=>save('pmt_instructions_to_bk',v)} type="textarea"/>
              </div>

              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Estimate Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
                  {[
                    ['Estimate',fmtMoney(data.estimate_amount)],
                    ['Invoice Stage',data.invoice_stage||'—'],
                    ['WO Type',data.wo_type||'—'],
                  ].map(([label,val])=>(
                    <div key={label} style={{background:T.bg3,borderRadius:'6px',padding:'10px 12px'}}>
                      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{label}</div>
                      <div style={{fontSize:F.md,color:T.text0,fontWeight:'500'}}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {tab==='timeline' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Dates</div>
                <EditableField label="Follow-Up Date" value={data.follow_up_date} onSave={v=>save('follow_up_date',v)} type="date"/>
                <EditableField label="Follow-Up End Date" value={data.follow_up_end_date} onSave={v=>save('follow_up_end_date',v)} type="date"/>
                <EditableField label="Close Date" value={data.close_date} onSave={v=>save('close_date',v)} type="date"/>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Created</div>
                  <div style={{fontSize:F.base,color:T.text1,padding:'3px 5px'}}>{fmtDate(data.created_at)}</div>
                </div>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Follow-Up Topic</div>
                <EditableField label="" value={data.follow_up_topic} onSave={v=>save('follow_up_topic',v)} type="textarea"/>
                <div style={{marginTop:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Email Request Sent</div>
                  <button onClick={()=>save('email_request_sent',!data.email_request_sent)}
                    style={{padding:'3px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,border:`1px solid ${T.border}`,background:data.email_request_sent?T.success:'transparent',color:data.email_request_sent?'#fff':T.text2}}>
                    {data.email_request_sent ? '✓ Email Sent' : 'Mark Email Sent'}
                  </button>
                </div>
                <div style={{marginTop:'12px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Make Recurring</div>
                  <button onClick={()=>save('make_recurring',!data.make_recurring)}
                    style={{padding:'3px 10px',borderRadius:'4px',cursor:'pointer',fontSize:F.sm,border:`1px solid ${T.border}`,background:data.make_recurring?T.accent:'transparent',color:data.make_recurring?'#fff':T.text2}}>
                    {data.make_recurring ? '✓ Recurring' : 'Set Recurring'}
                  </button>
                </div>
              </div>

              {/* Timeline summary cards */}
              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Status Overview</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
                  {[
                    ['Status',<StatusBadge status={data.status}/>],
                    ['Stage',data.stage||'—'],
                    ['Follow-Up',data.follow_up_date?fmtDate(data.follow_up_date):'Not set'],
                    ['Closed',data.close_date?fmtDate(data.close_date):'Open'],
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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Internal Notes</div>
                <EditableField label="" value={data.internal_notes} onSave={v=>save('internal_notes',v)} type="textarea"/>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Final Closeout Notes</div>
                <EditableField label="" value={data.final_closeout_notes} onSave={v=>save('final_closeout_notes',v)} type="textarea"/>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Alert</div>
                <EditableField label="Alert / Flag" value={data.alert} onSave={v=>save('alert',v)}/>
              </div>
              {data.podio_id && (
                <div style={css.card}>
                  <div style={css.secTitle}>Podio</div>
                  <div style={{fontSize:F.sm,color:T.text2,marginBottom:'4px'}}>Podio ID: {data.podio_id}</div>
                  {data.podio_url && (
                    <a href={data.podio_url} target="_blank" rel="noreferrer"
                      style={{fontSize:F.sm,color:T.accent,textDecoration:'none'}}>
                      View in Podio ↗
                    </a>
                  )}
                </div>
              )}
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
// Work Orders List
// ─────────────────────────────────────────────────────────────────────────────
const WorkOrdersList = ({ onSelect }) => {
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [propFilter, setPropFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeProps, setActiveProps] = useState([]);

  const { sorted, Th } = useSortable(wos, 'created_at', 'desc');

  // Fetch all WOs (status is null in seeded data — filter client-side)
  useEffect(() => {
    setLoading(true);
    setError(null);
    sbFetch('work_orders', 'select=*&order=created_at.desc')
      .then(data => { setWos(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Fetch active properties for dropdown
  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(data => setActiveProps(data.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  const priorities = ['All','High','Medium','Low'];

  const filtered = sorted.filter(w => {
    // Status filter — treat null/empty as Open
    if (statusFilter === 'Open' && w.status && w.status !== 'Open') return false;
    if (statusFilter === 'Open' && !w.status) { /* null = treat as open, keep */ }
    if (statusFilter === 'Closed' && w.status !== 'Closed') return false;
    if (priorityFilter !== 'All' && w.priority !== priorityFilter) return false;
    if (propFilter && w.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (w.short_description||'').toLowerCase().includes(q) ||
        (w.prop_code||'').toLowerCase().includes(q) ||
        (w.category||'').toLowerCase().includes(q) ||
        String(w.wo_num||w.podio_id||'').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary counts — treat null status as open
  const counts = {
    open: wos.filter(w=>!w.status||w.status==='Open').length,
    high: wos.filter(w=>w.priority==='High'&&(!w.status||w.status==='Open')).length,
    invoicePending: wos.filter(w=>w.invoice_stage==='Received'||w.invoice_stage==='Approved').length,
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Work Orders</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length.toLocaleString()} shown</span>
        </div>

        {/* Summary stat cards */}
        <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
          {[
            ['Open WOs', counts.open, T.accent],
            ['High Priority', counts.high, T.danger],
            ['Invoice Pending', counts.invoicePending, T.warn],
          ].map(([label,count,color])=>(
            <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 14px',minWidth:'110px'}}>
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
            {priorities.map(p=>(
              <button key={p} onClick={()=>setPriorityFilter(p)}
                style={{padding:'4px 10px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:priorityFilter===p?T.bg3:'transparent',
                  color:priorityFilter===p?T.text0:T.text2,
                  fontWeight:priorityFilter===p?'600':'400'}}>
                {p!=='All'&&<PriorityDot priority={p}/>}{p}
              </button>
            ))}
          </div>

          {/* Property filter — active properties only, alphabetical */}
          <select value={propFilter} onChange={e=>setPropFilter(e.target.value)}
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:propFilter?T.text0:T.text2,fontSize:F.sm,outline:'none',cursor:'pointer'}}>
            <option value="">All Properties</option>
            {activeProps.map(c=><option key={c} value={c}>{c}</option>)}
          </select>

          {/* Search */}
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search WOs…"
            style={{flex:1,minWidth:'180px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading work orders…</div>}
        {error && <div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}
        {!loading && !error && (
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/>  {/* Description */}
              <col style={{width:'55px'}}/>  {/* Prop */}
              <col style={{width:'60px'}}/>  {/* WO# */}
              <col style={{width:'80px'}}/>  {/* Priority */}
              <col style={{width:'110px'}}/> {/* Category */}
              <col style={{width:'60px'}}/>  {/* Budget */}
              <col style={{width:'130px'}}/> {/* Stage */}
              <col style={{width:'90px'}}/>  {/* Invoice */}
              <col style={{width:'90px'}}/>  {/* Follow-Up */}
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="short_description" label="Short Description"/>
                <Th c="prop_code" label="Prop"/>
                <Th c="wo_num" label="WO#"/>
                <Th c="priority" label="Priority"/>
                <Th c="category" label="Category"/>
                <Th c="is_budget_item" label="Budget"/>
                <Th c="stage" label="Stage"/>
                <Th c="invoice_stage" label="Invoice"/>
                <Th c="follow_up_date" label="Follow-Up"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No work orders match filters</td></tr>
              )}
              {filtered.map((w,i) => (
                <tr key={w.id}
                  onClick={()=>onSelect(w)}
                  style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                  <td style={css.td} title={w.short_description}>{w.short_description}</td>
                  <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{w.prop_code}</td>
                  <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{w.wo_num||w.podio_id||'—'}</td>
                  <td style={css.td}>
                    <span style={{display:'flex',alignItems:'center'}}>
                      <PriorityDot priority={w.priority}/>{w.priority||'—'}
                    </span>
                  </td>
                  <td style={{...css.td,color:T.text2}}>{w.category||'—'}</td>
                  <td style={{...css.td,textAlign:'center',color:w.is_budget_item?T.warn:T.text3,fontSize:F.xs}}>{w.is_budget_item?'Yes':'No'}</td>
                  <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{w.stage||'—'}</td>
                  <td style={css.td}>{w.invoice_stage ? <StatusBadge status={w.invoice_stage}/> : <span style={{color:T.text3,fontSize:F.xs}}>—</span>}</td>
                  <td style={{...css.td,color:w.follow_up_date&&new Date(w.follow_up_date)<new Date()?T.danger:T.text2,fontSize:F.xs}}>
                    {w.follow_up_date?fmtDate(w.follow_up_date):'—'}
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
export default function WorkOrdersView() {
  const [selected, setSelected] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const handleSelect = (wo) => setSelected(wo);
  const handleBack = () => setSelected(null);
  const handleUpdate = (updated) => setSelected(updated);

  // Re-mounts list when returning from detail to pick up any edits
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      {selected ? (
        <WorkOrderDetail key={selected.id} wo={selected} onBack={handleBack} onUpdate={handleUpdate}/>
      ) : (
        <WorkOrdersList key={resetKey} onSelect={handleSelect}/>
      )}
    </div>
  );
}
