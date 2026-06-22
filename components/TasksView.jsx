// ─────────────────────────────────────────────────────────────────────────────
// TasksView.jsx  —  SedonaCRM Phase 2 UI
// Unified task module: work_order, task, note, project, acp_task, sg_task
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Wrench, CheckFat, NotePencil, FolderOpen, Buildings, House, Star, ClipboardText, ChatCircle,
  CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import RichTextEditor from './RichTextEditor';
import CommunicationTimeline from './CommunicationTimeline';
import { getTaskPrefix } from '../utils/taskPrefix';

const SUPABASE_URL      = 'https://edxcvyleielzevpappui.supabase.co';
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

// Paginates through all rows 1000 at a time (Supabase anon cap = 1000/request).
export const sbFetchAll = async (table, baseParams = '') => {
  const PAGE = 1000;
  let offset = 0, all = [];
  while (true) {
    const sep = baseParams ? '&' : '';
    const page = await sbFetch(table, `${baseParams}${sep}limit=${PAGE}&offset=${offset}`);
    all = all.concat(page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
};

const isFuOverdue = (d, task) => {
  if (!d || task.status === 'Closed' || task.status === 'Cancelled') return false;
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

export const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
export const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };
export const css = {
  card: { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  badge: (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th: { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};

// ── Type prefix / icon helpers ────────────────────────────────────────────────
export const TYPE_PREFIX = {
  work_order:'WO', task:'TSK', note:'NOTE', project:'PRJ', acp_task:'ACP', sg_task:'SG',
};
const REVERSE_PREFIX = { WO:'work_order', TSK:'task', NOTE:'note', PRJ:'project', ACP:'acp_task', SG:'sg_task' };
const TYPE_LABEL = { work_order:'Work Order', task:'Task', note:'Note', project:'Project', acp_task:'ACP Task', sg_task:'S&G Task' };
const TYPE_COLOR = {
  work_order:'#EF4444', task:'#06B6D4', note:'#64748B',
  project:'#8B5CF6', acp_task:'#E8630A', sg_task:'#84CC16',
};
const TYPE_ICON_MAP = {
  work_order:Wrench, task:CheckFat, note:NotePencil,
  project:FolderOpen, acp_task:Buildings, sg_task:House,
};

export function formatTaskNum(recordType, taskNum) {
  if (!taskNum) return '—';
  return `${TYPE_PREFIX[recordType] || '?'}-${taskNum}`;
}

function parsePrefixedId(str) {
  if (!str) return null;
  const dash = str.indexOf('-');
  if (dash >= 0) {
    const prefix = str.slice(0, dash);
    const num = parseInt(str.slice(dash + 1), 10);
    const recordType = REVERSE_PREFIX[prefix];
    if (!recordType || isNaN(num)) return null;
    return { recordType, taskNum: num };
  }
  // Bare task_num — no record_type known
  const num = parseInt(str, 10);
  if (isNaN(num)) return null;
  return { recordType: null, taskNum: num };
}

export const TaskTypeIcon = ({ recordType, size = 16 }) => {
  const Icon = TYPE_ICON_MAP[recordType];
  if (!Icon) return null;
  return <Icon size={size} weight="bold" color={TYPE_COLOR[recordType] || T.text2} />;
};

// ── Date helpers ──────────────────────────────────────────────────────────────
export const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};
const fmtNumDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Display components ────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = {
    open:[T.accent,'#1a2e3a'], closed:[T.text2,T.bg3],
    'in progress':[T.purple,'#2a1f3a'], 'on hold':[T.warn,'#3d2e1a'],
    cancelled:[T.danger,'#3d1f1f'],
  };
  const [color,bg] = map[(status||'').toLowerCase()] || [T.text2,T.bg3];
  return <span style={css.badge(color,bg)}>{status||'—'}</span>;
};

export const PriorityDot = ({ priority }) => {
  const colors = { '???':T.text3, Urgent:T.danger, High:T.warn, Medium:T.success, Low:T.accent };
  return (
    <span style={{display:'inline-block',width:'7px',height:'7px',borderRadius:'50%',
      background:colors[priority]||T.text3,marginRight:'5px',flexShrink:0,
      verticalAlign:'middle',position:'relative',top:'-1px'}}/>
  );
};

// ── Hardcoded assignees ───────────────────────────────────────────────────────
const ASSIGNEES = [
  { id: '573b65b5-ba16-437b-9101-d0bff2453dde', name: 'Scott Anderson' },
  { id: '9e79f9cd-4415-40d3-b1ce-5c50b35dbf5e', name: 'Gabrielle Anderson' },
];

// ── Pill color maps ───────────────────────────────────────────────────────────
const PRI_COLORS = { '???':'#6b7280', Urgent:'#ef4444', High:'#f97316', Medium:'#f59e0b', Low:'#22c55e' };
const STA_COLORS = { Open:'#3b82f6', 'In Progress':'#f59e0b', 'On Hold':'#6b7280', Closed:'#22c55e', Cancelled:'#ef4444' };

// ── WO-specific pill option sets ─────────────────────────────────────────────
const WO_TYPE_OPTIONS = ['Work Order Request','Request For Proposal'];
const EMAIL_REQUEST_OPTIONS = ['No Files','With Files','Discussed In-Person'];
const INVOICE_STAGE_OPTIONS = ['Email to BK Now','Pending','Uploaded to TO PAY'];
const INVOICE_LOCATION_OPTIONS = [{label:"'Files'",value:'Files'},{label:'@comments',value:'@comments'}];
const WORK_STAGE_OPTIONS = [
  {label:'-Pending',           value:'Pending'},
  {label:'Work Done - Request Invoice', value:'Work Done - Request Invoice'},
  {label:'CLOSE - WORK DONE',  value:'CLOSE - WORK DONE'},
  {label:'CLOSE - Create FU WO',value:'CLOSE - Create FU WO'},
  {label:'+CLOSE - Work NOT Done',value:'+CLOSE - Work NOT Done'},
  {label:'++ RE-OPEN WORK ORDER',value:'++ RE-OPEN WORK ORDER'},
];

// ── Category options (from actual DB data) ────────────────────────────────────
export const PRIORITY_ORDER = { '???':0, Urgent:1, High:2, Medium:3, Low:4 };
const PRIORITY_OPTIONS = ['???','Urgent','High','Medium','Low'];
const STATUS_OPTIONS   = ['Open','In Progress','On Hold','Closed','Cancelled'];

const CATEGORY_OPTIONS = {
  work_order:['Roof','Plumbing','HVAC','Lighting',"TI's",'Common Area','Bldg. Shell','Landscape','P-Lot','Signs','Electrical','Pest Control','Fire / Security','Restroom','Trash','Utilities','Windows/Doors','Flooring','Keys','Other'],
  task:      ['$$ Issue','Insurance','LS Violation','LS Violation ?','Incident','Note','Lender','Taxes','Move In','Move Out','LATE RENT','- PROJECT -','DONE','Legal','Adjust Rent','TNT Estoppels','ACP Training','GOAL','C-19','???','Other'],
  note:      ['General','Follow-Up','FYI','Reference','Other'],
  project:   ['Bid','Renovation','Maintenance','Administrative','Other'],
  acp_task:  ['Legal','IT','Taxes','Financial','HR','Marketing','Other'],
  sg_task:   ['FIN$','WNT','JMZ','*HLTH','CARS','??','Mom','OLY','JMZ REMOD.','OTHER','Trip','*GOAL','FOX'],
};

// ── ActivityPanel ─────────────────────────────────────────────────────────────
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
          {!collapsed && (
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
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',borderRadius:'4px',flexShrink:0,fontSize:'14px',lineHeight:1}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {collapsed?'«':'»'}
          </button>
        </div>
        {!collapsed && (
          <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
            {tab==='comments' && (
              <div style={{...css.card}}>
                <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                  Comments and files will sync from Podio via API at go-live.
                </p>
              </div>
            )}
            {tab==='activity' && (
              <div style={{...css.card}}>
                <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                  Activity tracking begins at go-live.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── FieldRow ──────────────────────────────────────────────────────────────────
const FieldRow = ({ label, children, topAlign=false, hoverable=true }) => (
  <div className="crm-field-row"
    style={{display:'grid',gridTemplateColumns:'160px 1fr',borderBottom:`0.5px solid ${T.border}`,padding:'10px 0',minHeight:'48px'}}
    onMouseEnter={hoverable?e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';}:undefined}
    onMouseLeave={hoverable?e=>{e.currentTarget.style.background='';}:undefined}>
    <div className="crm-field-label" style={{fontSize:F.sm,fontWeight:'600',color:'#6B7280',textAlign:'right',paddingRight:'16px',alignSelf:topAlign?'start':'center',paddingTop:topAlign?'4px':'0',lineHeight:'1.4',userSelect:'none'}}>
      {label}
    </div>
    <div style={{alignSelf:topAlign?'start':'center',paddingRight:'4px'}}>
      {children}
    </div>
  </div>
);

// ── InlineBlurField ───────────────────────────────────────────────────────────
const InlineBlurField = ({ value, onSave, type='text', highlight=false, readOnly=false, moneyFormat=false, bigTitle=false }) => {
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(value??'');
  const [saving,setSaving]   = useState(false);
  const inputRef = useRef(null);
  useEffect(()=>{ setVal(value??''); },[value]);
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);

  const commit = async () => {
    setEditing(false);
    const trimmed = typeof val==='string'?val.trim():String(val??'');
    if (trimmed===String(value??'')) return;
    setSaving(true);
    try { await onSave(trimmed||null); }
    catch { setVal(value??''); }
    finally { setSaving(false); }
  };

  const fmtDisplay = v => {
    if (moneyFormat && v != null && v !== '') return '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    if (type==='date' && v) return fmtDate(v);
    return v;
  };

  const displayVal = fmtDisplay(val);

  if (readOnly) return (
    <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.4',padding:'4px 0'}}>{displayVal||'—'}</div>
  );

  return editing ? (
    <input ref={inputRef} type={type} value={val}
      onChange={e=>setVal(e.target.value)}
      onFocus={type==='date'?e=>{try{e.target.showPicker();}catch(_){}}:undefined}
      onBlur={commit}
      onKeyDown={e=>{
        if(e.key==='Escape'){setVal(value??'');setEditing(false);}
        if(e.key==='Enter') commit();
      }}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:bigTitle?'18px':F.base,fontWeight:bigTitle?'600':'normal',outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{fontSize:bigTitle?'18px':F.base,color:bigTitle?'#E8630A':(highlight?'#E8630A':(displayVal?T.text0:T.text3)),fontWeight:bigTitle?'600':(highlight?'700':'normal'),cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {displayVal||<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving&&<span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

// ── InlineSelect ──────────────────────────────────────────────────────────────
const InlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e=>{await onSave(e.target.value||null);}}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o=>typeof o==='object'
      ?<option key={o.value} value={o.value}>{o.label}</option>
      :<option key={o} value={o}>{o}</option>
    )}
  </select>
);

// ── PriorityPills ─────────────────────────────────────────────────────────────
const PriorityPills = ({ value, onSave }) => {
  const [hov,setHov] = useState(null);
  return (
    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
      {PRIORITY_OPTIONS.map(opt=>{
        const active=(value||'???')===opt;
        const c=PRI_COLORS[opt]||'#6b7280';
        const isHov=!active&&hov===opt;
        return (
          <button key={opt} onClick={()=>!active&&onSave(opt)}
            onMouseEnter={()=>!active&&setHov(opt)}
            onMouseLeave={()=>setHov(null)}
            style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:active?'default':'pointer',transition:'all 0.15s ease',
              border:`1px solid ${active||isHov?c:T.border}`,
              background:active?c:'transparent',
              color:active?'#fff':(isHov?c:T.text2),
              fontWeight:active?600:'normal'}}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

// ── StatusPills ───────────────────────────────────────────────────────────────
const StatusPills = ({ value, onSave }) => {
  const [hov,setHov] = useState(null);
  return (
    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
      {STATUS_OPTIONS.map(opt=>{
        const active=(value||'Open')===opt;
        const c=STA_COLORS[opt]||'#6b7280';
        const isHov=!active&&hov===opt;
        return (
          <button key={opt} onClick={()=>!active&&onSave(opt)}
            onMouseEnter={()=>!active&&setHov(opt)}
            onMouseLeave={()=>setHov(null)}
            style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:active?'default':'pointer',transition:'all 0.15s ease',
              border:`1px solid ${active||isHov?c:T.border}`,
              background:active?c:'transparent',
              color:active?'#fff':(isHov?c:T.text2),
              fontWeight:active?600:'normal'}}>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

// ── GenericPills (stage, wo_type, invoice_stage) ──────────────────────────────
// options: string[] or {label,value}[] — clicking active pill deselects (sets null)
const GenericPills = ({ value, options, onSave }) => {
  const [hov,setHov] = useState(null);
  return (
    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
      {options.map(opt=>{
        const v = typeof opt==='object'?opt.value:opt;
        const label = typeof opt==='object'?opt.label:opt;
        const active=value===v;
        const isHov=!active&&hov===v;
        return (
          <button key={v} onClick={()=>onSave(active?null:v)}
            onMouseEnter={()=>!active&&setHov(v)}
            onMouseLeave={()=>setHov(null)}
            style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:'pointer',transition:'all 0.15s ease',
              border:`1px solid ${active?'#E8630A':(isHov?'#E8630A':T.border)}`,
              background:active?'#E8630A':'transparent',
              color:active?'#fff':(isHov?'#E8630A':T.text2),
              fontWeight:active?600:'normal'}}>
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ── BoolPill ──────────────────────────────────────────────────────────────────
const BoolPill = ({ value, labelTrue, labelFalse, onSave }) => {
  const [hov,setHov] = useState(null);
  return (
    <div style={{display:'flex',gap:'5px'}}>
      {[{v:true,label:labelTrue},{v:false,label:labelFalse}].map(({v,label})=>{
        const active=value===v;
        const isHov=!active&&hov===String(v);
        return (
          <button key={String(v)} onClick={()=>onSave(v)}
            onMouseEnter={()=>!active&&setHov(String(v))}
            onMouseLeave={()=>setHov(null)}
            style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:active?'default':'pointer',transition:'all 0.15s ease',
              border:`1px solid ${active?'#E8630A':(isHov?'#E8630A':T.border)}`,
              background:active?'#E8630A':'transparent',
              color:active?'#fff':(isHov?'#E8630A':T.text2),
              fontWeight:active?600:'normal'}}>
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ── MorePopover (date sub-filters) ───────────────────────────────────────────
const MorePopover = ({ open, onClose, anchorRef, dateFilters, setDateFilters }) => {
  const ref = useRef(null);
  useEffect(()=>{
    if(!open)return;
    const handle=e=>{
      if(ref.current&&!ref.current.contains(e.target)&&
         anchorRef.current&&!anchorRef.current.contains(e.target))onClose();
    };
    document.addEventListener('mousedown',handle);
    return ()=>document.removeEventListener('mousedown',handle);
  },[open,onClose]);
  if(!open)return null;

  const toggleDate=(row,period)=>{
    setDateFilters(prev=>{
      const isActive=prev[row]===period;
      if(isActive)return{opened:null,updated:null,closed:null};
      return{opened:null,updated:null,closed:null,[row]:period};
    });
  };

  const dateRows=[{key:'opened',label:'Opened'},{key:'updated',label:'Updated'},{key:'closed',label:'Closed'}];
  const periods=[{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'year',label:'This Year'}];
  const btnStyle=active=>({
    padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,cursor:'pointer',
    border:`0.5px solid ${active?T.warn:T.border}`,
    background:active?'rgba(212,146,74,0.18)':'transparent',
    color:active?T.warn:T.text2,
    fontWeight:active?'600':'400',
    transition:'all 0.15s',
  });

  return (
    <div ref={ref} style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:200,
      background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',
      padding:'10px 12px',minWidth:'280px',boxShadow:'0 6px 20px rgba(0,0,0,0.5)'}}>
      {dateRows.map(({key,label},idx)=>(
        <div key={key} style={{marginBottom:idx<dateRows.length-1?10:0}}>
          <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'5px',fontWeight:'600'}}>{label}</div>
          <div style={{display:'flex',gap:'4px'}}>
            {periods.map(({key:pk,label:pl})=>(
              <button key={pk} onClick={()=>toggleDate(key,pk)} style={btnStyle(dateFilters[key]===pk)}>{pl}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Kanban view (priority columns) ───────────────────────────────────────────
const TaskKanbanCardContent = ({ task, vendors, tenants }) => {
  const vendor = vendors.find(v=>v.id===task.vendor_id);
  const shortVendor = vendor?.company_dba ? vendor.company_dba.split(' ').slice(0,2).join(' ') : null;
  const fuDate = task.follow_up_date ? fmtDate(task.follow_up_date) : null;
  const fuOverdue = isFuOverdue(task.follow_up_date, task);
  const displayId = getTaskPrefix(task);
  return (
    <div style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'9px 10px',userSelect:'none'}}>
      <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'4px'}}>
        <TaskTypeIcon recordType={task.record_type} size={12}/>
        <span style={{fontSize:F.xs,color:T.text2}}>{displayId}</span>
      </div>
      <div style={{fontSize:F.sm,color:T.text0,fontWeight:'500',lineHeight:'1.35',marginBottom:'5px'}}>
        {task.title||'Untitled'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'4px',flexWrap:'wrap',marginBottom:'4px'}}>
        {task.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>{task.prop_code}</span>}
        {task.stage&&<span style={{fontSize:F.xs,background:'#2a1f3a',color:T.purple,padding:'1px 6px',borderRadius:'3px',fontWeight:'500'}}>{task.stage}</span>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
        {shortVendor&&<span style={{fontSize:F.xs,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'90px'}}>{shortVendor}</span>}
        {fuDate&&<span style={{fontSize:F.xs,color:fuOverdue?T.warn:T.text2,fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDate}</span>}
      </div>
    </div>
  );
};

const TaskKanbanCard = ({ task, vendors, tenants, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: transform?`translate(${transform.x}px,${transform.y}px)`:undefined,
    opacity: isDragging?0.4:1,
    cursor: isDragging?'grabbing':'grab',
    marginBottom:'7px',
    touchAction:'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      onClick={e=>{e.stopPropagation();if(!isDragging)onCardClick(task);}}>
      <TaskKanbanCardContent task={task} vendors={vendors} tenants={tenants}/>
    </div>
  );
};

const TaskKanbanColumn = ({ priority, tasks, vendors, tenants, onCardClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: priority });
  const priColor = { '???':T.text2, Urgent:T.danger, High:T.warn, Medium:T.success, Low:T.accent };
  const color = priColor[priority]||T.text2;
  const colTasks = [...tasks].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  return (
    <div style={{flex:'1 1 0',minWidth:'180px',maxWidth:'280px',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px 8px',borderBottom:`0.5px solid ${T.border}`,marginBottom:'8px',flexShrink:0}}>
        <PriorityDot priority={priority}/>
        <span style={{fontSize:F.xs,fontWeight:'700',color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{priority}</span>
        <span style={{fontSize:F.xs,color:T.text3,marginLeft:'auto'}}>({tasks.length})</span>
      </div>
      <div ref={setNodeRef} style={{flex:1,overflowY:'auto',padding:'0 2px',minHeight:'80px',borderRadius:'4px',
        background:isOver?'rgba(110,159,216,0.07)':'transparent',transition:'background 0.15s'}}>
        {colTasks.map(t=>(
          <TaskKanbanCard key={t.id} task={t} vendors={vendors} tenants={tenants} onCardClick={onCardClick}/>
        ))}
        {tasks.length===0&&<div style={{color:T.text3,fontSize:F.xs,textAlign:'center',padding:'16px 0',fontStyle:'italic'}}>empty</div>}
      </div>
    </div>
  );
};

const TaskKanbanView = ({ tasks, vendors, tenants, onCardClick, onPriorityChange }) => {
  const [activeTask,setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}));
  const PRIORITY_OPTIONS_K = ['???','Urgent','High','Medium','Low'];
  const byPriority = useMemo(()=>
    PRIORITY_OPTIONS_K.reduce((acc,p)=>{
      acc[p]=tasks.filter(t=>(t.priority||'???')===p);
      return acc;
    },{})
  ,[tasks]);
  const handleDragStart=({active})=>setActiveTask(tasks.find(t=>t.id===active.id)||null);
  const handleDragEnd=({active,over})=>{
    setActiveTask(null);
    if(!over)return;
    const newPriority=over.id;
    const task=tasks.find(t=>t.id===active.id);
    if(!task)return;
    const cur=task.priority||'???';
    if(cur===newPriority)return;
    onPriorityChange(task.id,newPriority,cur);
  };
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{display:'flex',gap:'10px',height:'100%',overflow:'hidden',padding:'12px 14px'}}>
        {PRIORITY_OPTIONS_K.map(p=>(
          <TaskKanbanColumn key={p} priority={p} tasks={byPriority[p]||[]} vendors={vendors} tenants={tenants} onCardClick={onCardClick}/>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask?(
          <div style={{width:'220px',opacity:0.9,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',cursor:'grabbing'}}>
            <TaskKanbanCardContent task={activeTask} vendors={vendors} tenants={tenants}/>
          </div>
        ):null}
      </DragOverlay>
    </DndContext>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TasksList
// ─────────────────────────────────────────────────────────────────────────────
const TasksList = ({ onSelect, filterPropCode, filterType: initType, refreshKey=0, filterVendorId, filterTenantId, filterContactId, hidePropertyPills, embeddedMode }) => {
  const [tasks,setTasks]             = useState([]);
  const [loading,setLoading]         = useState(true);
  const [error,setError]             = useState(null);
  const [vendors,setVendors]         = useState([]);
  const [tenants,setTenants]         = useState([]);
  const [propCodes,setPropCodes]     = useState([]);
  const [typeFilter,setTypeFilter]   = useState(initType||'All');
  const [statusFilter,setStatusFilter] = useState('Open');
  const [propFilter,setPropFilter]   = useState([]);
  const [search,setSearch]           = useState('');
  const [sortCol,setSortCol]         = useState('priority');
  const [sortDir,setSortDir]         = useState('asc');
  const [typeCounts,setTypeCounts]   = useState({work_order:0,task:0,note:0,project:0,acp_task:0,sg_task:0});
  const [dateFilters,setDateFilters] = useState({opened:null,updated:null,closed:null});
  const [moreOpen,setMoreOpen]       = useState(false);
  const [priorityFilter,setPriorityFilter] = useState('All');
  const [viewMode,setViewMode]       = useState('table');
  const moreAnchorRef                = useRef(null);
  const hasMounted                   = useRef(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const router                          = useRouter();
  const [newModalOpen,setNewModalOpen]  = useState(false);
  const [newModalType,setNewModalType]  = useState(null);
  const [winW,setWinW]                  = useState(()=>typeof window!=='undefined'?window.innerWidth:999);

  // Restore filter state from URL query params on mount (standalone list only)
  // Sets filtersReady=true to unblock the fetch effect once state is applied.
  useEffect(()=>{
    if(embeddedMode||filterPropCode){setFiltersReady(true);return;}
    const params=new URLSearchParams(window.location.search);
    if(params.get('prop'))setPropFilter([params.get('prop')]);
    if(params.get('type'))setTypeFilter(params.get('type'));
    if(params.get('priority'))setPriorityFilter(params.get('priority'));
    if(params.get('status'))setStatusFilter(params.get('status'));
    setFiltersReady(true);
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Sync active filters to URL query params (after first mount)
  useEffect(()=>{
    if(!hasMounted.current){hasMounted.current=true;return;}
    if(embeddedMode||filterPropCode)return;
    const params=new URLSearchParams();
    if(propFilter.length===1)params.set('prop',propFilter[0]);
    if(typeFilter!=='All')params.set('type',typeFilter);
    if(priorityFilter!=='All')params.set('priority',priorityFilter);
    if(statusFilter!=='Open')params.set('status',statusFilter);
    const qs=params.toString();
    const url=qs?`/tasks?${qs}`:'/tasks';
    // Preserve Next.js's history-state markers (__N/idx/key) — replacing them with
    // a bare object makes Next ignore the popstate when the user later hits Back,
    // desyncing router.asPath from window.location. Only the URL is changed here.
    window.history.replaceState({...window.history.state,url,as:url},'',url);
  },[propFilter.join(','),typeFilter,priorityFilter,statusFilter]);// eslint-disable-line react-hooks/exhaustive-deps

  const showClosed  = statusFilter === 'Closed';
  const showUpdated = !showClosed;
  const NCOLS = 12; // type|#|title|fudate|prop|priority|stage|status|vendor|tenant|updated-or-closed|opened

  useEffect(()=>{
    if(!filtersReady) return;
    setLoading(true); setError(null); setTasks([]);

    const run = async () => {
      const shared=[];
      if (statusFilter==='Open') shared.push('status=not.in.(Closed,Cancelled)');
      else if (statusFilter==='Closed') shared.push('status=in.(Closed,Cancelled)');
      else if (statusFilter==='In Progress') shared.push('status=eq.In%20Progress');
      else if (statusFilter==='On Hold') shared.push('status=eq.On%20Hold');
      if (filterPropCode) shared.push(`prop_code=eq.${encodeURIComponent(filterPropCode)}`);
      else if (propFilter.length===1) shared.push(`prop_code=eq.${encodeURIComponent(propFilter[0])}`);
      else if (propFilter.length>1) shared.push(`prop_code=in.(${propFilter.map(encodeURIComponent).join(',')})`);
      if (filterVendorId) shared.push(`vendor_id=eq.${filterVendorId}`);
      if (filterTenantId) shared.push(`tenant_id=eq.${filterTenantId}`);
      if (filterContactId) {
        const tcRows = await sbFetch('task_contacts', `contact_id=eq.${filterContactId}&select=task_id`);
        const taskIds = (tcRows||[]).map(r=>r.task_id);
        if (!taskIds.length) {
          setTasks([]);
          setTypeCounts({work_order:0,task:0,note:0,project:0,acp_task:0,sg_task:0});
          setLoading(false);
          return;
        }
        shared.push(`id=in.(${taskIds.join(',')})`);
      }
      if (search) {
        if (/^\d+$/.test(search)) shared.push(`task_num=eq.${parseInt(search,10)}`);
        else {
          const enc = encodeURIComponent(search);
          const [vRows, tRows] = await Promise.all([
            sbFetch('vendors', `company_dba=ilike.*${enc}*&select=id&limit=50`).catch(()=>[]),
            sbFetch('tenants', `tenant_dba=ilike.*${enc}*&select=id&limit=50`).catch(()=>[]),
          ]);
          const vIds = (Array.isArray(vRows)?vRows:[]).map(r=>r.id);
          const tIds = (Array.isArray(tRows)?tRows:[]).map(r=>r.id);
          const orParts = [`title.ilike.*${enc}*`];
          if (vIds.length) orParts.push(`vendor_id.in.(${vIds.join(',')})`);
          if (tIds.length) orParts.push(`tenant_id.in.(${tIds.join(',')})`);
          if (orParts.length === 1) shared.push(`title=ilike.*${enc}*`);
          else shared.push(`or=(${orParts.join(',')})`);
        }
      }

      const mainParts=[...shared];
      if (typeFilter!=='All') mainParts.push(`record_type=eq.${typeFilter}`);
      mainParts.push('order=updated_at.desc.nullslast');

      const [data,countData] = await Promise.all([
        sbFetchAll('tasks',`select=*&${mainParts.join('&')}`),
        sbFetchAll('tasks',`select=record_type&${shared.join('&')}`),
      ]);
      setTasks(data);
      const counts={work_order:0,task:0,note:0,project:0,acp_task:0,sg_task:0};
      countData.forEach(r=>{if(counts[r.record_type]!==undefined)counts[r.record_type]++;});
      setTypeCounts(counts);
      setLoading(false);
    };

    run().catch(e=>{setError(e.message);setLoading(false);});
  },[filtersReady,statusFilter,typeFilter,propFilter.join(','),filterPropCode,filterVendorId,filterTenantId,filterContactId,search,refreshKey]);

  useEffect(()=>{
    sbFetch('vendors','select=id,company_dba&vendor_status=eq.Active&order=company_dba.asc').then(setVendors).catch(()=>{});
    sbFetch('tenants','select=id,tenant_dba&tenant_status=eq.Active&order=tenant_dba.asc').then(setTenants).catch(()=>{});
    if (!filterPropCode) {
      sbFetch('properties','select=prop_code&status=eq.active&order=prop_code.asc')
        .then(d=>setPropCodes(d.map(r=>r.prop_code)))
        .catch(()=>{});
    }
  },[filterPropCode]);

  useEffect(()=>{
    if(embeddedMode) return;
    document.title='Tasks | SedonaCRM';
    return ()=>{document.title='SedonaCRM';};
  },[embeddedMode]);

  useEffect(()=>{
    const h=()=>setWinW(window.innerWidth);
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);

  useEffect(()=>{
    if(!newModalOpen)return;
    const h=e=>{if(e.key==='Escape'){setNewModalOpen(false);setNewModalType(null);}};
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[newModalOpen]);

  // Client-side sort (priority → updated_at secondary)
  const sorted = useMemo(()=>[...tasks].sort((a,b)=>{
    if (sortCol==='priority') {
      const pa=PRIORITY_ORDER[a.priority]??99, pb=PRIORITY_ORDER[b.priority]??99;
      if (pa!==pb) return sortDir==='asc'?pa-pb:pb-pa;
      return new Date(b.updated_at||0)-new Date(a.updated_at||0);
    }
    if (sortCol==='updated_at') {
      const cmp=(a.updated_at||'0000')<(b.updated_at||'0000')?-1:1;
      return sortDir==='asc'?cmp:-cmp;
    }
    const cmp=String(a[sortCol]??'').localeCompare(String(b[sortCol]??''));
    return sortDir==='asc'?cmp:-cmp;
  }),[tasks,sortCol,sortDir]);

  // Client-side date filter (no priority)
  const filteredNoPriority = useMemo(()=>sorted.filter(t=>{
    if (dateFilters.opened  && !isInRange(t.created_at,   dateFilters.opened))  return false;
    if (dateFilters.updated && !isInRange(t.updated_at,   dateFilters.updated)) return false;
    if (dateFilters.closed  && !isInRange(t.close_date,   dateFilters.closed))  return false;
    return true;
  }),[sorted,dateFilters]);

  const filtered = useMemo(()=>filteredNoPriority.filter(t=>{
    if (priorityFilter!=='All' && (t.priority||'???')!==priorityFilter) return false;
    return true;
  }),[filteredNoPriority,priorityFilter]);

  const priorityCounts = useMemo(()=>{
    const c={'???':0,Urgent:0,High:0,Medium:0,Low:0};
    filteredNoPriority.forEach(t=>{const p=t.priority||'???';c[p]=(c[p]||0)+1;});
    return c;
  },[filteredNoPriority]);

  // Grouped by prop_code — always group, even when one prop selected
  const grouped = useMemo(()=>{
    const map={};
    filtered.forEach(t=>{
      const key=t.prop_code||'—';
      if(!map[key])map[key]=[];
      map[key].push(t);
    });
    return Object.entries(map)
      .sort(([a],[b])=>{
        if(a==='—')return 1; if(b==='—')return -1;
        return a.localeCompare(b);
      })
      .map(([prop_code,rows])=>({prop_code,rows}));
  },[filtered,propFilter.join(',')]);

  const toggleSort=c=>{
    if(c===sortCol)setSortDir(d=>d==='asc'?'desc':'asc');
    else{setSortCol(c);setSortDir('asc');}
  };

  const hasActiveDateFilter = !!(dateFilters.opened||dateFilters.updated||dateFilters.closed);
  const hasActiveFilters    = propFilter.length>0||typeFilter!=='All'||priorityFilter!=='All'||statusFilter!=='Open'||search!==''||hasActiveDateFilter;

  const clearFilters=()=>{
    setPropFilter([]); setTypeFilter('All'); setStatusFilter('Open'); setPriorityFilter('All');
    setSearch(''); setDateFilters({opened:null,updated:null,closed:null});
  };

  const handlePriorityChange=async(taskId,newPriority,prevPriority)=>{
    setTasks(prev=>prev.map(t=>t.id===taskId?{...t,priority:newPriority}:t));
    try{ await sbPatch('tasks',taskId,{priority:newPriority}); }
    catch{ setTasks(prev=>prev.map(t=>t.id===taskId?{...t,priority:prevPriority}:t)); }
  };

  const handleKanbanCardClick=task=>{
    const href=`/tasks/${task.task_num}`;
    sessionStorage.setItem('tasksBackUrl',window.location.href);
    const navL=filtered.map(t=>({task_num:t.task_num,record_type:t.record_type}));
    sessionStorage.setItem('tasksNavList',JSON.stringify(navL));
    sessionStorage.setItem('tasksNavIndex',String(filtered.findIndex(t=>t.id===task.id)));
    if(embeddedMode){window.location.href=href;}
    else{onSelect(task);}
  };

  const TYPE_PILLS=[
    {key:'All',       label:'All'},
    {key:'work_order',label:'WO'},
    {key:'task',      label:'TSK'},
    {key:'project',   label:'Proj.'},
    {key:'acp_task',  label:'ACP'},
    {key:'sg_task',   label:'S&G'},
    {key:'note',      label:'Note'},
  ];

  const propBtn=active=>({
    padding:'3px 7px',borderRadius:'4px',cursor:'pointer',fontSize:F.xs,whiteSpace:'nowrap',flexShrink:0,
    border:`0.5px solid ${active?T.accent:T.border}`,background:active?T.accent:'transparent',
    color:active?'#fff':T.text2,fontWeight:active?'600':'400',
  });

  const renderTh=(c,label,extra={})=>(
    <th key={c} style={{...css.th,...extra}} onClick={()=>toggleSort(c)}>
      {label}{sortCol===c?<span style={{marginLeft:'3px'}}>{sortDir==='asc'?'↑':'↓'}</span>:<span style={{marginLeft:'3px',color:T.bg3}}>↕</span>}
    </th>
  );

  const renderRow=(task,i)=>{
    const displayId=getTaskPrefix(task);
    const href=`/tasks/${task.task_num}`;
    const rowBg=i%2===0?'transparent':T.bg0;
    const fuOverdue=isFuOverdue(task.follow_up_date,task);
    const fuDisplay=task.follow_up_date?fmtNumDate(task.follow_up_date):'';
    const vendorName=vendors.find(v=>v.id===task.vendor_id)?.company_dba||'';
    const tenantName=tenants.find(t=>t.id===task.tenant_id)?.tenant_dba||'';
    const openDetail=e=>{
      if(e.ctrlKey||e.metaKey){window.open(href,'_blank');}
      else{
        sessionStorage.setItem('tasksBackUrl',window.location.href);
        const visualList=grouped?grouped.flatMap(g=>g.rows):filtered;
        const navL=visualList.map(t=>({task_num:t.task_num,record_type:t.record_type}));
        sessionStorage.setItem('tasksNavList',JSON.stringify(navL));
        sessionStorage.setItem('tasksNavIndex',String(visualList.findIndex(t=>t.id===task.id)));
        if(embeddedMode){window.location.href=href;}
        else{onSelect(task);}
      }
    };
    return (
      <tr key={task.id}
        style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
        onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
        onMouseLeave={e=>e.currentTarget.style.background=rowBg}
        onClick={e=>{if(e.target.closest('a'))return;openDetail(e);}}>
        <td style={{...css.td,width:'32px',textAlign:'center',overflow:'visible',padding:'4px'}}>
          <TaskTypeIcon recordType={task.record_type} size={14}/>
        </td>
        <td style={{...css.td,fontSize:F.xs,color:T.text2,minWidth:'52px'}}>
          <a href={href} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();openDetail(e);}}} style={{color:T.text2,textDecoration:'none'}}>
            {displayId}
          </a>
        </td>
        <td style={css.td} title={task.title}>
          <a href={href} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();openDetail(e);}}} style={{color:'inherit',textDecoration:'none'}}>
            {task.title||''}
          </a>
        </td>
        <td style={{...css.td,overflow:'visible',color:fuOverdue?T.warn:T.text2}}>
          {fuDisplay?<span style={{fontWeight:fuOverdue?'600':'400'}}>{fuOverdue&&'⚠ '}{fuDisplay}</span>:''}
        </td>
        <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{task.prop_code||''}</td>
        <td style={css.td}>
          <span style={{display:'flex',alignItems:'center'}}>
            <PriorityDot priority={task.priority||'???'}/>{task.priority||'???'}
          </span>
        </td>
        <td style={{...css.td,overflow:'visible'}}>
          {task.stage&&<span style={css.badge(T.purple,'#2a1f3a')}>{task.stage}</span>}
        </td>
        <td style={{...css.td,overflow:'visible'}}><StatusBadge status={task.status||'Open'}/></td>
        <td style={{...css.td,fontSize:F.xs,color:T.text1}} title={vendorName}>{vendorName}</td>
        <td style={{...css.td,fontSize:F.xs,color:T.text1}} title={tenantName}>{tenantName}</td>
        {showUpdated&&(
          <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
            {task.updated_at?fmtNumDate(task.updated_at):''}
          </td>
        )}
        {showClosed&&(
          <td style={{...css.td,color:task.close_date?T.success:T.text3,fontSize:F.xs}}>
            {task.close_date?fmtNumDate(task.close_date):''}
          </td>
        )}
        <td style={{...css.td,color:T.text2,fontSize:F.xs}}>
          {task.created_at?fmtNumDate(task.created_at):''}
        </td>
      </tr>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div className="crm-tasks-header" style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        {/* Title + count + search */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <ClipboardText size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Tasks</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{filtered.length.toLocaleString()} shown</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <button onClick={()=>{setNewModalType(null);setNewModalOpen(true);}}
              style={{background:'#E8630A',color:'#fff',border:'none',borderRadius:'4px',padding:embeddedMode?'6px 12px':'8px 16px',fontSize:embeddedMode?'12px':'14px',fontWeight:'600',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
              + New
            </button>
            <div style={{display:'flex',gap:'2px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'2px'}}>
              {[{mode:'table',icon:'≡',title:'Table view'},{mode:'kanban',icon:'⊞',title:'Kanban view'}].map(({mode,icon,title})=>(
                <button key={mode} onClick={()=>setViewMode(mode)} title={title}
                  style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:'14px',lineHeight:1,
                    background:viewMode===mode?T.bg3:'transparent',
                    color:viewMode===mode?T.text0:T.text2,fontWeight:viewMode===mode?'600':'400'}}>
                  {icon}
                </button>
              ))}
            </div>
            <div style={{position:'relative',display:'flex',alignItems:'center'}}>
              {search&&(
                <button onClick={()=>setSearch('')}
                  style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>×</button>
              )}
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur(); } }}
                placeholder="Search…"
                style={{width:'160px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}/>
            </div>
          </div>
        </div>
        {/* Property filter pills */}
        {!filterPropCode&&!hidePropertyPills&&propCodes.length>0&&(
          <div className="crm-tasks-prop-strip" style={{display:'flex',gap:'4px',overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:'4px',flexWrap:'nowrap'}}>
            {hasActiveFilters&&<button onClick={clearFilters} className="pill-clear" style={{position:'sticky',left:0,zIndex:2}}>× Clear</button>}
            <button onClick={()=>setPropFilter([])} style={propBtn(propFilter.length===0)}>All</button>
            <button onClick={()=>setPropFilter(pf=>pf.includes('ACP')?pf.filter(x=>x!=='ACP'):[...pf,'ACP'])} style={propBtn(propFilter.includes('ACP'))}>ACP</button>
            {propCodes.map(pc=>(
              <button key={pc} onClick={()=>setPropFilter(pf=>pf.includes(pc)?pf.filter(x=>x!==pc):[...pf,pc])} style={propBtn(propFilter.includes(pc))}>{pc}</button>
            ))}
          </div>
        )}
        {/* Type pills — own row */}
        <div className="crm-tasks-type-strip filter-row" style={{gap:'4px',marginBottom:'5px'}}>
          {hasActiveFilters&&<button onClick={clearFilters} className="pill-clear" style={{position:'sticky',left:0,zIndex:2}}>× Clear</button>}
          {TYPE_PILLS.map(({key,label})=>{
            const active=typeFilter===key;
            const allTotal=Object.values(typeCounts).reduce((s,n)=>s+n,0);
            const cnt=key==='All'?allTotal:(typeCounts[key]??0);
            return (
              <button key={key} onClick={()=>setTypeFilter(key)}
                style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,fontWeight:active?'600':'400',cursor:active?'default':'pointer',border:`0.5px solid ${active?'#E8630A':T.border}`,background:active?'#E8630A':'transparent',color:active?'#fff':T.text2,flexShrink:0}}>
                {key!=='All'&&<TaskTypeIcon recordType={key} size={12}/>}
                {label}{key!=='All'&&<span style={{fontSize:'10px',opacity:0.7}}>·{cnt}</span>}
              </button>
            );
          })}
        </div>
        {/* Priority + Status pills on same row */}
        <div className="filter-row" style={{alignItems:'center',gap:'6px',marginBottom:'4px'}}>
          {/* Priority left */}
          <div className="crm-tasks-priority-strip" style={{display:'flex',gap:'4px',flexShrink:0}}>
            {['All','???','Urgent','High','Medium','Low'].map(p=>{
              const cnt=p==='All'?null:priorityCounts[p]??0;
              const active=priorityFilter===p;
              const color=p==='All'?'#E8630A':(PRI_COLORS[p]||'#6b7280');
              return (
                <button key={p} onClick={()=>setPriorityFilter(p)}
                  style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,fontWeight:active?'600':'400',cursor:active?'default':'pointer',border:`0.5px solid ${active?color:T.border}`,background:active?color:'transparent',color:active?'#fff':T.text2,flexShrink:0}}>
                  {p!=='All'&&<PriorityDot priority={p}/>}
                  {p}{cnt!==null&&<span style={{fontSize:'10px',opacity:0.7}}>·{cnt}</span>}
                </button>
              );
            })}
          </div>
          {/* Status + More + Clear right */}
          <div className="crm-tasks-status-strip" style={{display:'flex',gap:'4px',alignItems:'center',marginLeft:'auto',flexShrink:0}}>
            <div style={{display:'flex',gap:'4px',flexShrink:0}}>
              {['Open','In Progress','On Hold','Closed','All'].map(s=>{
                const active=statusFilter===s;
                const sc={Open:'#3b82f6','In Progress':'#f59e0b','On Hold':'#6b7280',Closed:'#22c55e',All:'#E8630A'}[s]||'#E8630A';
                return (
                  <button key={s} onClick={()=>setStatusFilter(s)}
                    style={{padding:'3px 8px',borderRadius:'4px',cursor:'pointer',fontSize:F.xs,fontWeight:active?'600':'400',border:`0.5px solid ${active?sc:T.border}`,background:active?sc:'transparent',color:active?'#fff':T.text2,display:'flex',alignItems:'center',gap:'3px',whiteSpace:'nowrap'}}>
                    {s}
                    {active&&!loading&&<span style={{opacity:0.7,fontSize:'10px'}}>·{tasks.length}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{position:'relative',flexShrink:0}} ref={moreAnchorRef}>
              <button onClick={()=>setMoreOpen(o=>!o)}
                style={{padding:'3px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                  border:`0.5px solid ${hasActiveDateFilter?T.warn:T.border}`,
                  background:moreOpen?T.bg3:'transparent',color:hasActiveDateFilter?T.warn:T.text1,
                  display:'flex',alignItems:'center',gap:'5px'}}>
                More…
                {hasActiveDateFilter&&<span style={{width:'5px',height:'5px',borderRadius:'50%',background:T.warn,flexShrink:0,display:'inline-block'}}/>}
              </button>
              <MorePopover open={moreOpen} onClose={()=>setMoreOpen(false)} anchorRef={moreAnchorRef}
                dateFilters={dateFilters} setDateFilters={setDateFilters}/>
            </div>
            <button onClick={clearFilters}
              style={{padding:'3px 9px',borderRadius:'5px',cursor:'pointer',fontSize:F.xs,
                border:`0.5px solid ${hasActiveFilters?T.warn:T.border}`,background:'transparent',
                color:hasActiveFilters?T.warn:T.text3,display:'flex',alignItems:'center',gap:'3px',
                transition:'all 0.15s',visibility:hasActiveFilters?'visible':'hidden'}}>
              <span style={{fontSize:'12px'}}>×</span> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading tasks…</div>}
      {error&&<div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}
      {!loading&&!error&&viewMode==='kanban'&&(
        <div style={{flex:1,overflow:'hidden'}}>
          <TaskKanbanView tasks={filtered} vendors={vendors} tenants={tenants} onCardClick={handleKanbanCardClick} onPriorityChange={handlePriorityChange}/>
        </div>
      )}
      {!loading&&!error&&viewMode==='table'&&(
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'36px'}}/>
              <col style={{width:'90px'}}/>
              <col/>
              <col style={{width:'100px'}}/>
              <col style={{width:'70px'}}/>
              <col style={{width:'90px'}}/>
              <col style={{width:'110px'}}/>
              <col style={{width:'90px'}}/>
              <col style={{width:'120px'}}/>
              <col style={{width:'120px'}}/>
              {showUpdated&&<col style={{width:'100px'}}/>}
              {showClosed &&<col style={{width:'100px'}}/>}
              <col style={{width:'100px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                <th style={{...css.th,cursor:'default'}}/>
                {renderTh('task_num','#')}
                {renderTh('title','Title')}
                {renderTh('follow_up_date','FU Date')}
                {renderTh('prop_code','Prop')}
                {renderTh('priority','Priority')}
                {renderTh('stage','Stage')}
                <th style={css.th}>Status</th>
                {renderTh('vendor_id','Vendor')}
                {renderTh('tenant_id','Tenant')}
                {showUpdated&&renderTh('updated_at','Updated')}
                {showClosed &&renderTh('close_date','Closed')}
                {renderTh('created_at','Opened')}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={NCOLS} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No tasks match filters</td></tr>
              )}
              {grouped ? (
                grouped.map(group=>(
                  <React.Fragment key={group.prop_code}>
                    <tr style={{background:T.bg3,position:'sticky',top:'29px',zIndex:1}}>
                      <td colSpan={NCOLS} style={{...css.td,fontWeight:'600',color:T.accent,padding:'4px 10px',fontSize:F.xs,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                        {group.prop_code} <span style={{color:T.text3,fontWeight:'400'}}>({group.rows.length})</span>
                      </td>
                    </tr>
                    {group.rows.map((t,i)=>renderRow(t,i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((t,i)=>renderRow(t,i))
              )}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {filtered.length===0&&<div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No tasks match filters</div>}
            {filtered.map((t,i)=>{
              const displayId=getTaskPrefix(t);
              const fuOverdue=isFuOverdue(t.follow_up_date,t);
              const rowBg=i%2===0?'transparent':T.bg0;
              return (
                <div key={t.id}
                  style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{
                    sessionStorage.setItem('tasksBackUrl',window.location.href);
                    const navL=filtered.map(x=>({task_num:x.task_num,record_type:x.record_type}));
                    sessionStorage.setItem('tasksNavList',JSON.stringify(navL));
                    sessionStorage.setItem('tasksNavIndex',String(i));
                    if(embeddedMode){window.location.href=`/tasks/${t.task_num}`;}
                    else{onSelect(t);}
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                    <TaskTypeIcon recordType={t.record_type} size={18}/>
                    <span style={{fontSize:F.xs,color:T.text2}}>{displayId}</span>
                    <span style={{fontWeight:'600',fontSize:F.base,color:T.text0,lineHeight:'1.3'}}>{t.title||'—'}</span>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                    {t.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{t.prop_code}</span>}
                    <StatusBadge status={t.status||'Open'}/>
                    {t.priority&&<span style={{display:'flex',alignItems:'center',gap:'3px',fontSize:F.xs,color:T.text2}}><PriorityDot priority={t.priority}/>{t.priority}</span>}
                    {fuOverdue&&t.follow_up_date&&<span style={{fontSize:F.xs,color:T.warn,fontWeight:'600'}}>⚠ {fmtNumDate(t.follow_up_date)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    {newModalOpen&&(
      <div onClick={e=>{if(e.target===e.currentTarget){setNewModalOpen(false);setNewModalType(null);}}}
        style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'8px',padding:'24px',maxWidth:'480px',width:'calc(100% - 40px)',boxShadow:'0 20px 60px rgba(0,0,0,0.7)'}}>
          <div style={{fontSize:'18px',fontWeight:'600',color:T.text0,marginBottom:'4px'}}>New Record — Select Type</div>
          <div style={{fontSize:F.sm,color:T.text2,marginBottom:'16px'}}>Choose the type to create:</div>
          {[
            {key:'task',label:'Task',Icon:CheckFat,color:'#06b6d4'},
            {key:'work_order',label:'Work Order',Icon:Wrench,color:'#ef4444'},
            {key:'project',label:'Project',Icon:FolderOpen,color:'#a855f7'},
            {key:'acp_task',label:'ACP Task',Icon:Buildings,color:'#f97316'},
            {key:'sg_task',label:'S&G Task',Icon:Star,color:'#84cc16'},
          ].map(({key,label,Icon,color})=>(
            <button key={key} onClick={()=>{
              const params=new URLSearchParams({type:key});
              if(filterPropCode)params.set('prop_code',filterPropCode);
              if(filterTenantId)params.set('tenant_id',filterTenantId);
              if(filterVendorId)params.set('vendor_id',filterVendorId);
              setNewModalOpen(false);
              window.location.href=`/tasks/new?${params.toString()}`;
            }}
              style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',marginBottom:'8px',borderRadius:'6px',border:`1px solid ${T.border}`,background:T.bg3,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.bg3+'cc';e.currentTarget.style.borderColor=color;}}
              onMouseLeave={e=>{e.currentTarget.style.background=T.bg3;e.currentTarget.style.borderColor=T.border;}}>
              <Icon size={20} weight="bold" color={color}/>
              <span style={{flex:1,fontSize:F.base,fontWeight:'500',color:T.text0}}>{label}</span>
              <span style={{color:T.text3,fontSize:'16px'}}>›</span>
            </button>
          ))}
          <div style={{textAlign:'center',marginTop:'12px'}}>
            <button onClick={()=>{setNewModalOpen(false);setNewModalType(null);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:F.sm}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {!embeddedMode&&winW<640&&(
      <button onClick={()=>{setNewModalType(null);setNewModalOpen(true);}}
        style={{position:'fixed',bottom:'24px',right:'20px',zIndex:999,width:'52px',height:'52px',borderRadius:'50%',background:'#E8630A',color:'#fff',border:'none',fontSize:'28px',lineHeight:1,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 3px 12px rgba(0,0,0,0.5)'}}>
        +
      </button>
    )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskDetail — named export, used by list inline and /tasks/[id] cold-load
// ─────────────────────────────────────────────────────────────────────────────
export const TaskDetail = ({ task: initialTask, prefixedId, onBack, onUpdate }) => {
  const [data,setData]           = useState(initialTask||null);
  const [loading,setLoading]     = useState(!initialTask);
  const [notFound,setNotFound]   = useState(false);
  const [activeProps,setActiveProps] = useState([]);
  const [vendors,setVendors]     = useState([]);
  const [tenants,setTenants]     = useState([]);
  const [isMobile,setIsMobile] = useState(()=>typeof window!=='undefined'&&window.innerWidth<640);
  const [rightCollapsed,setRightCollapsed] = useState(()=>typeof window!=='undefined'&&window.innerWidth<640);
  const [rightWidth,setRightWidth] = useState(300);
  const [copied,setCopied]       = useState(false);
  const [detailTab,setDetailTab] = useState('details');
  const [navList,setNavList]     = useState(null);
  const [navIdx,setNavIdx]       = useState(-1);
  const [navLoading,setNavLoading] = useState(false);
  const [driveFolderLoading,setDriveFolderLoading] = useState(false);
  const [sysOpen,setSysOpen] = useState(false);
  const resizingRight = useRef(false);

  useEffect(()=>{
    if (initialTask){setData(initialTask);setLoading(false);return;}
    if (!prefixedId) return;
    const parsed=parsePrefixedId(prefixedId);
    if (!parsed){setNotFound(true);setLoading(false);return;}
    // For in-app navigation, record_type is stored in sessionStorage navList.
    // Bare task_num cold loads (no navList match) fall back to work_order-wins ordering.
    let recordType=parsed.recordType;
    if (!recordType) {
      try {
        const navL=JSON.parse(sessionStorage.getItem('tasksNavList')||'[]');
        const navI=parseInt(sessionStorage.getItem('tasksNavIndex')||'-1',10);
        const e=navI>=0?navL[navI]:null;
        if (e&&e.task_num===parsed.taskNum&&e.record_type) recordType=e.record_type;
      } catch {}
    }
    const params=recordType
      ?`task_num=eq.${parsed.taskNum}&record_type=eq.${recordType}&select=*&limit=1`
      :`task_num=eq.${parsed.taskNum}&select=*&order=record_type.desc&limit=1`;
    sbFetch('tasks',params)
      .then(rows=>{
        if(!rows.length){setNotFound(true);setLoading(false);return;}
        setData(rows[0]);setLoading(false);
      })
      .catch(()=>{setNotFound(true);setLoading(false);});
  },[prefixedId,initialTask]);

  useEffect(()=>{
    sbFetch('properties','select=prop_code,property_name,address,city,state,zip&status=eq.active&order=prop_code.asc').then(setActiveProps).catch(()=>{});
    sbFetch('vendors','select=id,company_dba,podio_id&vendor_status=eq.Active&order=company_dba.asc').then(setVendors).catch(()=>{});
    sbFetch('tenants','select=id,tenant_dba,podio_id&tenant_status=eq.Active&order=tenant_dba.asc').then(setTenants).catch(()=>{});
  },[]);

  useEffect(()=>{
    try{
      const list=JSON.parse(sessionStorage.getItem('tasksNavList')||'null');
      const idx=parseInt(sessionStorage.getItem('tasksNavIndex')||'-1',10);
      if(list&&Array.isArray(list)&&idx>=0){setNavList(list);setNavIdx(idx);}
    }catch{}
  },[]);

  useEffect(()=>{
    const onKey=e=>{
      if(e.key!=='Escape')return;
      const tag=e.target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select')return;
      onBack?.();
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[onBack]);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<640);
    window.addEventListener('resize',onResize);
    return ()=>window.removeEventListener('resize',onResize);
  },[]);

  useEffect(()=>{
    if(!data)return;
    const raw=data.title||'';
    const trunc=raw.length>30?raw.slice(0,30)+'…':raw;
    document.title=`${getTaskPrefix(data)} – ${trunc} | SedonaCRM`;
    return ()=>{document.title='SedonaCRM';};
  },[data?.title,data?.record_type,data?.task_num]);

  const startRightResize=useCallback(e=>{
    resizingRight.current=true;
    const startX=e.clientX,startW=rightWidth;
    const onMove=me=>{if(!resizingRight.current)return;setRightWidth(Math.max(180,Math.min(500,startW-(me.clientX-startX))));};
    const onUp=()=>{resizingRight.current=false;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
  },[rightWidth]);

  const save=async(field,val)=>{
    const updates={[field]:val??null};
    await sbPatch('tasks',data.id,updates);
    const updated={...data,...updates};
    setData(updated);
    onUpdate?.(updated);
  };

  const handleStatusChange=async newStatus=>{
    const updates={status:newStatus};
    const isClosed=newStatus==='Closed'||newStatus==='Cancelled';
    if(isClosed&&data.status!=='Closed'&&data.status!=='Cancelled'&&!data.close_date){
      updates.close_date=todayStr();
    } else if(!isClosed){
      updates.close_date=null;
    }
    await sbPatch('tasks',data.id,updates);
    const updated={...data,...updates};
    setData(updated);
    onUpdate?.(updated);
  };

  const handleTypeChange=async newType=>{
    if(!data||newType===data.record_type)return;
    console.log(`Type changed from ${TYPE_LABEL[data.record_type]} to ${TYPE_LABEL[newType]}`);
    await sbPatch('tasks',data.id,{record_type:newType});
    const updated={...data,record_type:newType};
    setData(updated);
    onUpdate?.(updated);
  };

  const copyLink=()=>{
    if(!data)return;
    const url=`${window.location.origin}/tasks/${data.task_num}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});
  };

  const createDriveFolder=async()=>{
    if(!data||driveFolderLoading)return;
    setDriveFolderLoading(true);
    try{
      const r=await fetch('/api/tasks/create-drive-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:data.id})});
      const json=await r.json();
      if(json.folderId){
        setData(prev=>({...prev,drive_folder_id:json.folderId,drive_folder_url:json.folderUrl}));
      } else {
        console.error('[createDriveFolder]',json.error);
      }
    }catch(err){
      console.error('[createDriveFolder]',err);
    }finally{
      setDriveFolderLoading(false);
    }
  };

  const goNav=async dir=>{
    if(!navList||navLoading)return;
    const newIdx=navIdx+dir;
    if(newIdx<0||newIdx>=navList.length)return;
    setNavLoading(true);
    try{
      const entry=navList[newIdx];
      const rows=await sbFetch('tasks',`task_num=eq.${entry.task_num}&record_type=eq.${entry.record_type}&select=*&limit=1`);
      if(!rows.length)return;
      const newTask=rows[0];
      setData(newTask);
      setNavIdx(newIdx);
      sessionStorage.setItem('tasksNavIndex',String(newIdx));
      // Preserve Next.js's history-state markers (see filter-sync effect above) so
      // that pressing Back after using prev/next still triggers a real route change.
      const url=`/tasks/${newTask.task_num}`;
      window.history.replaceState({...window.history.state,url,as:url},'',url);
    }catch{}
    finally{setNavLoading(false);}
  };

  const goNavRef = useRef(goNav);
  goNavRef.current = goNav;

  useEffect(()=>{
    const onArrow=e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
      const tag=document.activeElement?.tagName?.toLowerCase();
      const isEditing=tag==='input'||tag==='textarea'||document.activeElement?.contentEditable==='true';
      if(isEditing)return;
      e.preventDefault();
      if(e.key==='ArrowLeft')goNavRef.current(-1);
      else goNavRef.current(1);
    };
    window.addEventListener('keydown',onArrow);
    return ()=>window.removeEventListener('keydown',onArrow);
  },[]);

  if(loading) return <div style={{padding:'40px',textAlign:'center',color:T.text3}}>Loading…</div>;
  if(notFound) return <div style={{padding:'40px',textAlign:'center',color:T.danger}}>Task not found.</div>;
  if(!data) return null;

  const displayId=getTaskPrefix(data);
  const categoryOpts=CATEGORY_OPTIONS[data.record_type]||[];
  const propInfo=activeProps.find(p=>p.prop_code===data.prop_code);
  const addr2=propInfo?[propInfo.city,propInfo.state,propInfo.zip].filter(Boolean).join(' '):'';
  const propLine2=propInfo?(propInfo.address?(addr2?`${propInfo.address}, ${addr2}`:propInfo.address):addr2):'';
  const isClosed=data.status==='Closed'||data.status==='Cancelled';

  const vendorLink=vid=>{const v=vendors.find(x=>x.id===vid);if(!v)return null;return v.podio_id?`/vendors/${v.podio_id}`:`/vendors/X${v.id.slice(-6)}`;};
  const tenantLink=tid=>{const t=tenants.find(x=>x.id===tid);if(!t)return null;return t.podio_id?`/tenants/${t.podio_id}`:`/tenants/X${t.id.slice(-6)}`;};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <ClipboardText size={14} weight="bold"/>← Tasks
          </button>
          <span style={{fontSize:F.xs,background:T.bg3,color:T.text1,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',fontFamily:'monospace',flexShrink:0}}>{displayId}</span>
          {data.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>{data.prop_code}</span>}
          <StatusBadge status={data.priority}/>
          <StatusBadge status={data.status}/>
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',transition:'color 0.2s',flexShrink:0}}
            onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=T.text0;}}
            onMouseLeave={e=>{if(!copied)e.currentTarget.style.color=T.text2;}}>
            {copied?'✓ Copied':'⧉ Copy Link'}
          </button>
          {data.record_type==='work_order'&&(
            data.drive_folder_id
              ? <a href={data.drive_folder_url} target="_blank" rel="noopener noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:'#4285F4',fontSize:F.xs,cursor:'pointer',textDecoration:'none',flexShrink:0}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#4285F4'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}><path d="M12 2L2 19h20L12 2z" fill="#0F9D58" opacity=".9"/><path d="M2 19h8l-4-7-4 7z" fill="#4285F4" opacity=".9"/><path d="M22 19h-8l4-7 4 7z" fill="#FBBC05" opacity=".9"/></svg>
                  Drive Folder
                </a>
              : <button onClick={createDriveFolder} disabled={driveFolderLoading}
                  style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:T.text2,fontSize:F.xs,cursor:driveFolderLoading?'wait':'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'4px'}}
                  onMouseEnter={e=>{if(!driveFolderLoading)e.currentTarget.style.color=T.text0;}}
                  onMouseLeave={e=>{if(!driveFolderLoading)e.currentTarget.style.color=T.text2;}}>
                  {driveFolderLoading?'Creating…':'+ Drive Folder'}
                </button>
          )}
          {data.podio_id&&<span style={{fontSize:F.xs,color:T.text3}}>Podio ref: {data.podio_id}</span>}
          {navList&&navList.length>1&&(
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'3px',flexShrink:0}}>
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
        {/* Type conversion pills */}
        {(()=>{const TYPE_SHORT={work_order:'WO',task:'TSK',note:'Note',project:'Proj.',acp_task:'ACP',sg_task:'S&G'};return(
        <div className="crm-task-type-pills" style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
          <span style={{fontSize:F.xs,color:T.text3,fontWeight:'600'}}>Type:</span>
          {Object.keys(TYPE_PREFIX).map(key=>{
            const active=data.record_type===key;
            return (
              <button key={key} onClick={()=>handleTypeChange(key)}
                style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:active?'default':'pointer',
                  border:`1px solid ${active?'#E8630A':T.border}`,
                  background:active?'#E8630A':'transparent',
                  color:active?'#fff':T.text2,
                  fontWeight:active?600:'normal',
                  transition:'all 0.15s ease'}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor='#E8630A';e.currentTarget.style.color='#E8630A';}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}}>
                {TYPE_SHORT[key]||key}
              </button>
            );
          })}
        </div>
        );})()}
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,overflow:'hidden',flexDirection:'column'}}>
        {/* Comms / Details tab bar */}
        <div style={{display:'flex',gap:'2px',padding:'0 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
          {['Details','Comms'].map(t=>(
            <button key={t} onClick={()=>setDetailTab(t.toLowerCase())}
              style={{background:'transparent',border:'none',padding:'6px 10px',borderRadius:'4px 4px 0 0',cursor:'pointer',fontSize:F.sm,
                color:detailTab===t.toLowerCase()?T.accent:T.text1,
                borderBottom:detailTab===t.toLowerCase()?`2px solid ${T.accent}`:'2px solid transparent',
                fontWeight:detailTab===t.toLowerCase()?'600':'400',transition:'color 0.15s'}}>
              {t}
            </button>
          ))}
        </div>
        {/* Content row */}
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          {detailTab!=='comms'&&<div style={{flex:1,overflowY:'auto',minWidth:0}}>
          {/* Base fields */}
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>
            {/* Title — icon + large editable field */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,minHeight:'52px'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background=''}>
              <div style={{display:'flex',alignItems:'center',flexShrink:0}}>
                <TaskTypeIcon recordType={data.record_type} size={22}/>
              </div>
              <div style={{flex:1}}>
                <InlineBlurField value={data.title} onSave={v=>save('title',v)} bigTitle/>
              </div>
            </div>
            <FieldRow label="Property" topAlign>
              <InlineSelect value={data.prop_code} options={activeProps.map(p=>({value:p.prop_code,label:`${p.prop_code} — ${p.property_name}`}))} onSave={v=>save('prop_code',v)}/>
              {propInfo&&(
                <div style={{marginTop:'5px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px'}}>
                  <div style={{fontSize:F.sm,fontWeight:'500',color:T.text0}}>{propInfo.property_name}</div>
                  {propLine2&&<div style={{fontSize:F.xs,color:T.text2,marginTop:'2px'}}>{propLine2}</div>}
                </div>
              )}
            </FieldRow>
            <FieldRow label="Alert">
              <InlineBlurField value={data.alert||''} onSave={v=>save('alert',v)}/>
            </FieldRow>
            <FieldRow label="FU Date">
              <InlineBlurField type="date" value={data.follow_up_date||''} onSave={v=>save('follow_up_date',v)}/>
            </FieldRow>
            <FieldRow label="FU Notes" topAlign>
              <RichTextEditor value={data.follow_up_notes} onSave={v=>save('follow_up_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Priority"><PriorityPills value={data.priority} onSave={v=>save('priority',v)}/></FieldRow>
            <FieldRow label="Assigned To">
              <select value={data.assigned_to||''} onChange={async e=>save('assigned_to',e.target.value||null)}
                style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:data.assigned_to?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                <option value="">—</option>
                {ASSIGNEES.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Status"><StatusPills value={data.status} onSave={handleStatusChange}/></FieldRow>
            {data.record_type!=='work_order'&&(
              <FieldRow label="Category">
                <InlineSelect value={data.category} options={categoryOpts} onSave={v=>save('category',v)}/>
              </FieldRow>
            )}
            <FieldRow label="Details" topAlign>
              <RichTextEditor value={data.details} onSave={v=>save('details',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Internal Notes" topAlign>
              <RichTextEditor value={data.internal_notes} onSave={v=>save('internal_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Depends On Task #">
              <InlineBlurField value={data.depends_on_task_id!=null?String(data.depends_on_task_id):''} onSave={v=>save('depends_on_task_id',v||null)}/>
            </FieldRow>
            {(data.record_type==='project'||data.project_id)&&(
              <>
                <FieldRow label="Parent Project #">
                  <InlineBlurField value={data.project_id!=null?String(data.project_id):''} onSave={v=>save('project_id',v||null)}/>
                </FieldRow>
                <FieldRow label="Project Type">
                  <InlineBlurField value={data.project_type||''} onSave={v=>save('project_type',v)}/>
                </FieldRow>
                <FieldRow label="Sequence Order">
                  <InlineBlurField type="number" value={data.sequence_order!=null?String(data.sequence_order):''} onSave={v=>save('sequence_order',v?parseInt(v,10):null)}/>
                </FieldRow>
              </>
            )}
            {isClosed&&(
              <FieldRow label="Close Date">
                <InlineBlurField type="date" value={data.close_date||''} onSave={v=>save('close_date',v)}/>
              </FieldRow>
            )}
            <FieldRow label="Created" hoverable={false}>
              <InlineBlurField readOnly value={data.created_at?fmtDate(data.created_at):''}/>
            </FieldRow>
            <FieldRow label="Last Updated" hoverable={false}>
              <InlineBlurField readOnly value={data.updated_at?fmtDate(data.updated_at):''}/>
            </FieldRow>
            {data.podio_url&&(
              <FieldRow label="Podio Link" hoverable={false}>
                <a href={data.podio_url} target="_blank" rel="noopener noreferrer"
                  style={{color:T.accent,textDecoration:'none',fontSize:F.sm}}
                  onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                  onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                  Podio Record ↗
                </a>
              </FieldRow>
            )}
          </div>

          {/* Work Order section */}
          {data.record_type==='work_order'&&(
            <div style={{background:T.bg2,borderRadius:'8px',margin:'0 16px 12px',overflow:'hidden'}}>
              <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg3}}>
                <span style={{fontSize:F.xs,fontWeight:'700',color:'#E8630A',textTransform:'uppercase',letterSpacing:'0.07em',display:'flex',alignItems:'center',gap:'6px'}}>
                  <Wrench size={13} weight="bold"/>Work Order Details
                </span>
              </div>
              <FieldRow label="WO Category">
                <InlineSelect value={data.wo_category} options={CATEGORY_OPTIONS.work_order} onSave={v=>save('wo_category',v)}/>
              </FieldRow>
              <FieldRow label="Budget Item?">
                <BoolPill value={data.is_budget_item} labelTrue="Yes" labelFalse="No" onSave={v=>save('is_budget_item',v)}/>
              </FieldRow>
              <FieldRow label="WO Instructions to Vendor" topAlign>
                <RichTextEditor value={data.instructions_to_vendor} onSave={v=>save('instructions_to_vendor',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Keys / Key Safe">
                <InlineBlurField value={data.key_safe_info||''} onSave={v=>save('key_safe_info',v)}/>
              </FieldRow>
              <FieldRow label="Vendor" topAlign>
                <InlineSelect value={data.vendor_id} options={vendors.map(v=>({value:v.id,label:v.company_dba}))} onSave={v=>save('vendor_id',v)}/>
                {data.vendor_id&&vendorLink(data.vendor_id)&&(
                  <a href={vendorLink(data.vendor_id)} style={{fontSize:F.xs,color:T.accent,marginTop:'4px',display:'block',textDecoration:'none'}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                    {vendors.find(v=>v.id===data.vendor_id)?.company_dba} ↗
                  </a>
                )}
              </FieldRow>
              <FieldRow label="Tenant" topAlign>
                <InlineSelect value={data.tenant_id} options={tenants.map(t=>({value:t.id,label:t.tenant_dba}))} onSave={v=>save('tenant_id',v)}/>
                {data.tenant_id&&tenantLink(data.tenant_id)&&(
                  <a href={tenantLink(data.tenant_id)} style={{fontSize:F.xs,color:T.accent,marginTop:'4px',display:'block',textDecoration:'none'}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                    {tenants.find(t=>t.id===data.tenant_id)?.tenant_dba} ↗
                  </a>
                )}
              </FieldRow>
              <FieldRow label="WO Type">
                <GenericPills value={data.wo_type} options={WO_TYPE_OPTIONS} onSave={v=>save('wo_type',v)}/>
              </FieldRow>
              <FieldRow label="Email Request To Vendor">
                <GenericPills value={data.email_request_sent} options={EMAIL_REQUEST_OPTIONS} onSave={v=>save('email_request_sent',v)}/>
              </FieldRow>
              <FieldRow label="Estimate Amount">
                <InlineBlurField value={data.estimate_amount!=null?String(data.estimate_amount):''} moneyFormat onSave={v=>save('estimate_amount',v?parseFloat(String(v).replace(/[^0-9.-]/g,'')):null)}/>
              </FieldRow>
              <FieldRow label="Log" topAlign>
                <RichTextEditor value={data.estimate_log} onSave={v=>save('estimate_log',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Pmt Instructions to BK">
                <InlineBlurField value={data.pmt_instructions_to_bk||''} onSave={v=>save('pmt_instructions_to_bk',v)}/>
              </FieldRow>
              <FieldRow label="Invoice Location">
                <GenericPills value={data.invoice_location} options={INVOICE_LOCATION_OPTIONS} onSave={v=>save('invoice_location',v)}/>
              </FieldRow>
              <FieldRow label="Invoice Stage">
                <GenericPills value={data.invoice_stage} options={INVOICE_STAGE_OPTIONS} onSave={v=>save('invoice_stage',v)}/>
              </FieldRow>
              <FieldRow label="Invoice Paid">
                <BoolPill value={data.invoice_paid} labelTrue="Paid ✓" labelFalse="Unpaid" onSave={v=>save('invoice_paid',v)}/>
              </FieldRow>
              <FieldRow label="Final Close-Out Notes" topAlign>
                <RichTextEditor value={data.final_closeout_notes} onSave={v=>save('final_closeout_notes',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Work Stage">
                <GenericPills value={data.stage} options={WORK_STAGE_OPTIONS} onSave={v=>save('stage',v)}/>
              </FieldRow>
              <FieldRow label="Make Recurring">
                <BoolPill value={data.make_recurring} labelTrue="Yes" labelFalse="No" onSave={v=>save('make_recurring',v)}/>
              </FieldRow>
              <FieldRow label="Bid Status">
                <InlineBlurField value={data.bid_status||''} onSave={v=>save('bid_status',v)}/>
              </FieldRow>
              <FieldRow label="Drive Folder" hoverable={false}>
                {data.drive_folder_url
                  ?<a href={data.drive_folder_url} target="_blank" rel="noopener noreferrer"
                    style={{display:'inline-block',padding:'4px 12px',border:`1px solid #E8630A`,borderRadius:'4px',color:'#E8630A',fontSize:F.sm,textDecoration:'none',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(232,99,10,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    📁 Open Drive Folder
                  </a>
                  :<span style={{fontSize:F.sm,color:T.text2}}>No Drive folder linked</span>
                }
              </FieldRow>
            </div>
          )}
          {/* System Info — collapsible */}
          <div style={{margin:'0 16px 12px',background:T.bg2,borderRadius:'8px',overflow:'hidden'}}>
            <button onClick={()=>setSysOpen(o=>!o)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:T.bg3,border:'none',cursor:'pointer',color:T.text2,fontSize:F.xs,fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:sysOpen?`0.5px solid ${T.border}`:'none'}}>
              <span>System Info</span>
              <span>{sysOpen?'▲':'▼'}</span>
            </button>
            {sysOpen&&(
              <>
                {data.wo_num!=null&&<FieldRow label="WO Num" hoverable={false}><InlineBlurField readOnly value={String(data.wo_num)}/></FieldRow>}
                <FieldRow label="Podio ID" hoverable={false}><InlineBlurField readOnly value={data.podio_id!=null?String(data.podio_id):'—'}/></FieldRow>
                {data.podio_url&&(
                  <FieldRow label="Podio URL" hoverable={false}>
                    <a href={data.podio_url} target="_blank" rel="noopener noreferrer"
                      style={{color:T.accent,fontSize:F.sm,textDecoration:'none',wordBreak:'break-all'}}
                      onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                      onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                      {data.podio_url} ↗
                    </a>
                  </FieldRow>
                )}
                <FieldRow label="Legacy Module" hoverable={false}><InlineBlurField readOnly value={data.legacy_module||'—'}/></FieldRow>
                <FieldRow label="UUID" hoverable={false}><div style={{fontSize:F.xs,color:T.text2,fontFamily:'monospace',padding:'4px 0',wordBreak:'break-all'}}>{data.id}</div></FieldRow>
                <FieldRow label="Created At" hoverable={false}><InlineBlurField readOnly value={data.created_at?fmtDate(data.created_at):'—'}/></FieldRow>
                <FieldRow label="Created By" hoverable={false}><InlineBlurField readOnly value={data.created_by||'—'}/></FieldRow>
                <FieldRow label="Updated At" hoverable={false}><InlineBlurField readOnly value={data.updated_at?fmtDate(data.updated_at):'—'}/></FieldRow>
              </>
            )}
          </div>
          </div>}
          {detailTab==='comms'&&(
            <div style={{flex:1,overflow:'auto',background:T.bg1}}>
              <CommunicationTimeline
                recordType={data.record_type}
                recordId={data.id}
                fromAccount="scott@andersoncp.com"
                crmRecordLabel={`${displayId}${data.title ? ` — ${data.title}` : ''}`}
                crmRecordUrl={`/tasks/${data.task_num}`}
              />
            </div>
          )}
          {/* Desktop: always in flow. Mobile: only when open. */}
          {(!rightCollapsed || !isMobile) && (
            <ActivityPanel
              collapsed={rightCollapsed}
              onCollapse={()=>setRightCollapsed(c=>!c)}
              width={rightWidth}
              onMouseDown={isMobile ? undefined : startRightResize}
            />
          )}
        </div>
      </div>
      {/* Mobile: floating button when panel is closed */}
      {isMobile && rightCollapsed && (
        <button onClick={()=>setRightCollapsed(false)}
          style={{position:'fixed',bottom:'16px',right:'16px',zIndex:50,background:'#E8630A',color:'#fff',border:'none',borderRadius:'50%',width:'56px',height:'56px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>
          <ChatCircle size={26} weight="fill" color="white"/>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NewTaskForm — named export; renders a blank create form at /tasks/new
// ─────────────────────────────────────────────────────────────────────────────
export const NewTaskForm = ({ initType='task', initPropCode=null, initTenantId=null, initVendorId=null }) => {
  const router = useRouter();
  const [formData,setFormData] = useState({
    record_type: initType,
    title: '',
    status: 'Open',
    priority: '???',
    prop_code: initPropCode,
    tenant_id: initTenantId,
    vendor_id: initVendorId,
    category: null,
    details: null,
    internal_notes: null,
    alert: null,
    follow_up_date: null,
    follow_up_notes: null,
    assigned_to: null,
    // WO fields
    wo_category: null,
    is_budget_item: null,
    instructions_to_vendor: null,
    key_safe_info: null,
    wo_type: null,
    email_request_sent: null,
    estimate_amount: null,
    estimate_log: null,
    pmt_instructions_to_bk: null,
    invoice_location: null,
    invoice_stage: null,
    invoice_paid: null,
    final_closeout_notes: null,
    stage: null,
    make_recurring: null,
  });
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState(null);
  const [titleError,setTitleError] = useState(false);
  const [assignedToError,setAssignedToError] = useState(false);
  const [vendors,setVendors] = useState([]);
  const [tenants,setTenants] = useState([]);
  const [activeProps,setActiveProps] = useState([]);
  useEffect(()=>{
    sbFetch('vendors','select=id,company_dba&vendor_status=eq.Active&order=company_dba.asc').then(setVendors).catch(()=>{});
    sbFetch('tenants','select=id,tenant_dba&tenant_status=eq.Active&order=tenant_dba.asc').then(setTenants).catch(()=>{});
    sbFetch('properties','select=prop_code,property_name&status=eq.active&order=prop_code.asc').then(setActiveProps).catch(()=>{});
  },[]);

  useEffect(()=>{
    document.title='New Task | SedonaCRM';
    return ()=>{document.title='SedonaCRM';};
  },[]);

  const set=(field,val)=>setFormData(prev=>({...prev,[field]:val}));

  const handleSave=async()=>{
    if(!formData.title?.trim()){
      setTitleError(true);
      setTimeout(()=>setTitleError(false),1200);
      return;
    }
    if(!formData.assigned_to){
      setAssignedToError(true);
      return;
    }
    setAssignedToError(false);
    setSaving(true);setSaveError(null);
    try{
      const body={};
      for(const[k,v]of Object.entries(formData)){if(v!=null&&v!=='')body[k]=v;}
      const res=await fetch('/api/tasks/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const json=await res.json();
      if(!res.ok)throw new Error(json.error||'Failed to create');
      router.push(`/tasks/${json.task_num}`);
    }catch(err){
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const handleBack=()=>{
    if(typeof window!=='undefined'&&window.history.length>1){window.history.back();}
    else{router.push('/tasks');}
  };

  const TYPE_SHORT_NEW={work_order:'WO',task:'TSK',project:'Proj.',acp_task:'ACP',sg_task:'S&G'};
  const categoryOpts=CATEGORY_OPTIONS[formData.record_type]||[];
  const propInfo=activeProps.find(p=>p.prop_code===formData.prop_code);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>
          <button onClick={handleBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Cancel
          </button>
          <span style={{fontSize:F.base,fontWeight:'600',color:T.text0}}>
            New {TYPE_LABEL[formData.record_type]||formData.record_type}
          </span>
          {saveError&&<span style={{fontSize:F.xs,color:T.danger}}>{saveError}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{marginLeft:'auto',background:saving?T.bg3:'#22c55e',border:'none',borderRadius:'4px',padding:'6px 16px',color:'#fff',fontSize:F.sm,fontWeight:'600',cursor:saving?'not-allowed':'pointer',flexShrink:0}}>
            {saving?'Saving…':'Save'}
          </button>
        </div>
        {/* Type pills */}
        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
          <span style={{fontSize:F.xs,color:T.text3,fontWeight:'600'}}>Type:</span>
          {['work_order','task','project','acp_task','sg_task'].map(key=>{
            const active=formData.record_type===key;
            return (
              <button key={key} onClick={()=>set('record_type',key)}
                style={{padding:'3px 12px',borderRadius:20,fontSize:12,cursor:active?'default':'pointer',
                  border:`1px solid ${active?'#E8630A':T.border}`,
                  background:active?'#E8630A':'transparent',
                  color:active?'#fff':T.text2,fontWeight:active?600:'normal',
                  transition:'all 0.15s ease'}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor='#E8630A';e.currentTarget.style.color='#E8630A';}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}}>
                {TYPE_SHORT_NEW[key]||key}
              </button>
            );
          })}
        </div>
      </div>
      {/* Banner */}
      <div style={{background:'#451a03',borderBottom:`0.5px solid #92400e`,padding:'7px 16px',flexShrink:0}}>
        <span style={{fontSize:F.sm,color:'#fbbf24'}}>
          New - Fill &amp; Save
        </span>
      </div>
      {/* Form */}
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>
          {/* Title */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,minHeight:'52px',
            outline:titleError?`2px solid ${T.danger}`:'none'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
            onMouseLeave={e=>e.currentTarget.style.background=''}>
            <TaskTypeIcon recordType={formData.record_type} size={22}/>
            <div style={{flex:1}}>
              <input value={formData.title} onChange={e=>{set('title',e.target.value);if(titleError)setTitleError(false);}}
                placeholder="Title (required)"
                autoFocus
                style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',outline:'none',fontSize:'18px',fontWeight:'600',color:formData.title?T.text0:T.text3,padding:'4px 0'}}/>
              {titleError&&<div style={{fontSize:F.xs,color:T.danger,marginTop:'2px'}}>Title is required</div>}
            </div>
          </div>
          <FieldRow label="Property" topAlign>
            <InlineSelect value={formData.prop_code} options={activeProps.map(p=>({value:p.prop_code,label:`${p.prop_code} — ${p.property_name}`}))} onSave={v=>set('prop_code',v)}/>
            {propInfo&&<div style={{marginTop:'5px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px'}}>
              <div style={{fontSize:F.sm,fontWeight:'500',color:T.text0}}>{propInfo.property_name}</div>
            </div>}
          </FieldRow>
          <FieldRow label="Alert">
            <InlineBlurField value={formData.alert||''} onSave={v=>set('alert',v)}/>
          </FieldRow>
          <FieldRow label="FU Date">
            <InlineBlurField type="date" value={formData.follow_up_date||''} onSave={v=>set('follow_up_date',v)}/>
          </FieldRow>
          <FieldRow label="FU Notes" topAlign>
            <RichTextEditor value={formData.follow_up_notes} onSave={v=>set('follow_up_notes',v)} minRows={5}/>
          </FieldRow>
          <FieldRow label="Priority"><PriorityPills value={formData.priority} onSave={v=>set('priority',v)}/></FieldRow>
          <FieldRow label="Assigned To *">
            <select value={formData.assigned_to||''} onChange={e=>{set('assigned_to',e.target.value||null);if(e.target.value)setAssignedToError(false);}}
              style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${assignedToError?T.danger:T.border}`,borderRadius:'4px',padding:'5px 8px',color:formData.assigned_to?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
              <option value="">— select —</option>
              {ASSIGNEES.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {assignedToError&&<div style={{fontSize:F.xs,color:T.danger,marginTop:'3px'}}>Assigned To is required</div>}
          </FieldRow>
          <FieldRow label="Status"><StatusPills value={formData.status} onSave={v=>set('status',v)}/></FieldRow>
          {formData.record_type!=='work_order'&&(
            <FieldRow label="Category">
              <InlineSelect value={formData.category} options={categoryOpts} onSave={v=>set('category',v)}/>
            </FieldRow>
          )}
          <FieldRow label="Details" topAlign>
            <RichTextEditor value={formData.details} onSave={v=>set('details',v)} minRows={5}/>
          </FieldRow>
          <FieldRow label="Internal Notes" topAlign>
            <RichTextEditor value={formData.internal_notes} onSave={v=>set('internal_notes',v)} minRows={5}/>
          </FieldRow>
        </div>
        {/* WO-specific section */}
        {formData.record_type==='work_order'&&(
          <div style={{background:T.bg2,borderRadius:'8px',margin:'0 16px 12px',overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg3}}>
              <span style={{fontSize:F.xs,fontWeight:'700',color:'#E8630A',textTransform:'uppercase',letterSpacing:'0.07em',display:'flex',alignItems:'center',gap:'6px'}}>
                <Wrench size={13} weight="bold"/>Work Order Details
              </span>
            </div>
            <FieldRow label="WO Category">
              <InlineSelect value={formData.wo_category} options={CATEGORY_OPTIONS.work_order} onSave={v=>set('wo_category',v)}/>
            </FieldRow>
            <FieldRow label="Budget Item?">
              <BoolPill value={formData.is_budget_item} labelTrue="Yes" labelFalse="No" onSave={v=>set('is_budget_item',v)}/>
            </FieldRow>
            <FieldRow label="WO Instructions to Vendor" topAlign>
              <RichTextEditor value={formData.instructions_to_vendor} onSave={v=>set('instructions_to_vendor',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Keys / Key Safe">
              <InlineBlurField value={formData.key_safe_info||''} onSave={v=>set('key_safe_info',v)}/>
            </FieldRow>
            <FieldRow label="Vendor">
              <InlineSelect value={formData.vendor_id} options={vendors.map(v=>({value:v.id,label:v.company_dba}))} onSave={v=>set('vendor_id',v)}/>
            </FieldRow>
            <FieldRow label="Tenant">
              <InlineSelect value={formData.tenant_id} options={tenants.map(t=>({value:t.id,label:t.tenant_dba}))} onSave={v=>set('tenant_id',v)}/>
            </FieldRow>
            <FieldRow label="WO Type">
              <GenericPills value={formData.wo_type} options={WO_TYPE_OPTIONS} onSave={v=>set('wo_type',v)}/>
            </FieldRow>
            <FieldRow label="Email Request To Vendor">
              <GenericPills value={formData.email_request_sent} options={EMAIL_REQUEST_OPTIONS} onSave={v=>set('email_request_sent',v)}/>
            </FieldRow>
            <FieldRow label="Estimate Amount">
              <InlineBlurField type="number" value={formData.estimate_amount!=null?String(formData.estimate_amount):''} onSave={v=>set('estimate_amount',v?parseFloat(v):null)}/>
            </FieldRow>
            <FieldRow label="Log" topAlign>
              <RichTextEditor value={formData.estimate_log} onSave={v=>set('estimate_log',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Pmt Instructions to BK">
              <InlineBlurField value={formData.pmt_instructions_to_bk||''} onSave={v=>set('pmt_instructions_to_bk',v)}/>
            </FieldRow>
            <FieldRow label="Invoice Location">
              <GenericPills value={formData.invoice_location} options={INVOICE_LOCATION_OPTIONS} onSave={v=>set('invoice_location',v)}/>
            </FieldRow>
            <FieldRow label="Invoice Stage">
              <GenericPills value={formData.invoice_stage} options={INVOICE_STAGE_OPTIONS} onSave={v=>set('invoice_stage',v)}/>
            </FieldRow>
            <FieldRow label="Invoice Paid">
              <BoolPill value={formData.invoice_paid} labelTrue="Paid ✓" labelFalse="Unpaid" onSave={v=>set('invoice_paid',v)}/>
            </FieldRow>
            <FieldRow label="Final Close-Out Notes" topAlign>
              <RichTextEditor value={formData.final_closeout_notes} onSave={v=>set('final_closeout_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Work Stage">
              <GenericPills value={formData.stage} options={WORK_STAGE_OPTIONS} onSave={v=>set('stage',v)}/>
            </FieldRow>
            <FieldRow label="Make Recurring">
              <BoolPill value={formData.make_recurring} labelTrue="Yes" labelFalse="No" onSave={v=>set('make_recurring',v)}/>
            </FieldRow>
          </div>
        )}
        {/* Bottom save/cancel */}
        <div style={{padding:'16px',display:'flex',justifyContent:'center',gap:'12px'}}>
          <button onClick={handleBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'8px 20px',color:T.text1,fontSize:F.base,cursor:'pointer'}}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{background:saving?T.bg3:'#22c55e',border:'none',borderRadius:'4px',padding:'8px 24px',color:'#fff',fontSize:F.base,fontWeight:'600',cursor:saving?'not-allowed':'pointer'}}>
            {saving?'Saving…':'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export — list view; row clicks navigate to /tasks/[id]
// ─────────────────────────────────────────────────────────────────────────────
export default function TasksView({ filterPropCode, filterType, filterVendorId, filterTenantId, filterContactId, hidePropertyPills, embeddedMode } = {}) {
  const router = useRouter();

  const handleSelect = useCallback(task=>{
    router.push(`/tasks/${task.task_num}`);
  },[router]);

  if(embeddedMode){
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
        <TasksList
          filterPropCode={filterPropCode}
          filterType={filterType}
          filterVendorId={filterVendorId}
          filterTenantId={filterTenantId}
          filterContactId={filterContactId}
          hidePropertyPills={hidePropertyPills}
          embeddedMode={true}
        />
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <TasksList onSelect={handleSelect} filterPropCode={filterPropCode} filterType={filterType}/>
    </div>
  );
}
