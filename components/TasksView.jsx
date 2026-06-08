// ─────────────────────────────────────────────────────────────────────────────
// TasksView.jsx  —  SedonaCRM Phase 2 UI
// Unified task module: work_order, task, note, project, acp_task, sg_task
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Wrench, Warning, NotePencil, FolderOpen, Buildings, House, ClipboardText, ChatCircle
} from '@phosphor-icons/react';
import RichTextEditor from './RichTextEditor';

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
  work_order:'#E8630A', task:'#EF4444', note:'#3B82F6',
  project:'#8B5CF6', acp_task:'#14B8A6', sg_task:'#10B981',
};
const TYPE_ICON_MAP = {
  work_order:Wrench, task:Warning, note:NotePencil,
  project:FolderOpen, acp_task:Buildings, sg_task:House,
};

export function formatTaskNum(recordType, taskNum) {
  if (!taskNum) return '—';
  return `${TYPE_PREFIX[recordType] || '?'}-${taskNum}`;
}

function parsePrefixedId(str) {
  if (!str) return null;
  const dash = str.indexOf('-');
  if (dash < 0) return null;
  const prefix = str.slice(0, dash);
  const num = parseInt(str.slice(dash + 1), 10);
  const recordType = REVERSE_PREFIX[prefix];
  if (!recordType || isNaN(num)) return null;
  return { recordType, taskNum: num };
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
const InlineBlurField = ({ value, onSave, type='text', highlight=false, readOnly=false, moneyFormat=false }) => {
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
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{fontSize:F.base,color:highlight?'#E8630A':(displayVal?T.text0:T.text3),fontWeight:highlight?'700':'normal',cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
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
const PRI_STYLES = {
  '???':  {activeBg:T.bg3,     activeColor:T.text0, border:T.text2,   hover:'rgba(107,114,128,0.25)'},
  Urgent: {activeBg:T.danger,  activeColor:'#fff',   border:T.danger,  hover:'rgba(239,68,68,0.20)'},
  High:   {activeBg:T.warn,    activeColor:'#fff',   border:T.warn,    hover:'rgba(212,146,74,0.20)'},
  Medium: {activeBg:T.success, activeColor:'#fff',   border:T.success, hover:'rgba(106,176,106,0.20)'},
  Low:    {activeBg:T.accent,  activeColor:'#fff',   border:T.accent,  hover:'rgba(110,159,216,0.20)'},
};
const PriorityPills = ({ value, onSave }) => (
  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
    {PRIORITY_OPTIONS.map(opt=>{
      const active=(value||'???')===opt;
      const s=PRI_STYLES[opt]||PRI_STYLES['???'];
      return (
        <button key={opt} onClick={()=>!active&&onSave(opt)}
          style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${s.border}`,background:active?s.activeBg:'transparent',color:active?s.activeColor:s.border,transition:'background 0.15s ease'}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=s.hover;}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
          {opt}
        </button>
      );
    })}
  </div>
);

// ── StatusPills ───────────────────────────────────────────────────────────────
const STA_STYLES = {
  Open:          {activeBg:T.accent,  activeColor:'#fff',  border:T.accent,  hover:'rgba(110,159,216,0.20)'},
  'In Progress': {activeBg:T.purple,  activeColor:'#fff',  border:T.purple,  hover:'rgba(154,122,212,0.20)'},
  'On Hold':     {activeBg:T.warn,    activeColor:T.bg0,   border:T.warn,    hover:'rgba(212,146,74,0.20)'},
  Closed:        {activeBg:T.text2,   activeColor:'#fff',  border:T.text2,   hover:'rgba(90,98,114,0.20)'},
  Cancelled:     {activeBg:T.danger,  activeColor:'#fff',  border:T.danger,  hover:'rgba(224,112,112,0.20)'},
};
const StatusPills = ({ value, onSave }) => (
  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
    {STATUS_OPTIONS.map(opt=>{
      const active=(value||'Open')===opt;
      const s=STA_STYLES[opt]||STA_STYLES.Open;
      return (
        <button key={opt} onClick={()=>!active&&onSave(opt)}
          style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${s.border}`,background:active?s.activeBg:'transparent',color:active?s.activeColor:s.border,transition:'background 0.15s ease'}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=s.hover;}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
          {opt}
        </button>
      );
    })}
  </div>
);

// ── GenericPills (stage, wo_type, invoice_stage) ──────────────────────────────
const GenericPills = ({ value, options, color, onSave }) => (
  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
    {options.map(opt=>{
      const active=value===opt;
      return (
        <button key={opt} onClick={()=>!active&&onSave(opt)}
          style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${color}`,background:active?color:'transparent',color:active?'#fff':color,transition:'background 0.15s ease'}}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=`${color}33`;}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
          {opt}
        </button>
      );
    })}
  </div>
);

// ── BoolPill ──────────────────────────────────────────────────────────────────
const BoolPill = ({ value, labelTrue, labelFalse, colorTrue=T.success, onSave }) => {
  const on = !!value;
  return (
    <div style={{display:'flex',gap:'5px'}}>
      <button onClick={()=>onSave(true)}
        style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:on?'default':'pointer',border:`1px solid ${colorTrue}`,background:on?colorTrue:'transparent',color:on?'#fff':colorTrue,transition:'background 0.15s ease'}}
        onMouseEnter={e=>{if(!on)e.currentTarget.style.background=`${colorTrue}33`;}}
        onMouseLeave={e=>{if(!on)e.currentTarget.style.background='transparent';}}>
        {labelTrue}
      </button>
      <button onClick={()=>onSave(false)}
        style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:!on?'default':'pointer',border:`1px solid ${T.text2}`,background:!on?T.bg3:'transparent',color:!on?T.text0:T.text2,transition:'background 0.15s ease'}}
        onMouseEnter={e=>{if(on)e.currentTarget.style.background='rgba(90,98,114,0.20)';}}
        onMouseLeave={e=>{if(on)e.currentTarget.style.background='transparent';}}>
        {labelFalse}
      </button>
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

// ─────────────────────────────────────────────────────────────────────────────
// TasksList
// ─────────────────────────────────────────────────────────────────────────────
const TasksList = ({ onSelect, filterPropCode, filterType: initType, refreshKey=0 }) => {
  const [tasks,setTasks]             = useState([]);
  const [loading,setLoading]         = useState(true);
  const [error,setError]             = useState(null);
  const [vendors,setVendors]         = useState([]);
  const [tenants,setTenants]         = useState([]);
  const [propCodes,setPropCodes]     = useState([]);
  const [typeFilter,setTypeFilter]   = useState(initType||'All');
  const [statusFilter,setStatusFilter] = useState('Open');
  const [propFilter,setPropFilter]   = useState('');
  const [search,setSearch]           = useState('');
  const [sortCol,setSortCol]         = useState('priority');
  const [sortDir,setSortDir]         = useState('asc');
  const [typeCounts,setTypeCounts]   = useState({work_order:0,task:0,note:0,project:0,acp_task:0,sg_task:0});
  const [dateFilters,setDateFilters] = useState({opened:null,updated:null,closed:null});
  const [moreOpen,setMoreOpen]       = useState(false);
  const moreAnchorRef                = useRef(null);

  const showClosed  = statusFilter === 'Closed';
  const showUpdated = !showClosed;
  const NCOLS = 12; // type|#|title|fudate|prop|priority|stage|status|vendor|tenant|updated-or-closed|opened

  useEffect(()=>{
    setLoading(true); setError(null); setTasks([]);

    const shared=[];
    if (statusFilter==='Open') shared.push('status=not.in.(Closed,Cancelled)');
    else if (statusFilter==='Closed') shared.push('status=in.(Closed,Cancelled)');
    else if (statusFilter==='In Progress') shared.push('status=eq.In%20Progress');
    else if (statusFilter==='On Hold') shared.push('status=eq.On%20Hold');
    const pc=filterPropCode||propFilter;
    if (pc) shared.push(`prop_code=eq.${encodeURIComponent(pc)}`);
    if (search) shared.push(`title=ilike.*${encodeURIComponent(search)}*`);

    const mainParts=[...shared];
    if (typeFilter!=='All') mainParts.push(`record_type=eq.${typeFilter}`);
    mainParts.push('order=updated_at.desc.nullslast');

    Promise.all([
      sbFetchAll('tasks',`select=*&${mainParts.join('&')}`),
      sbFetchAll('tasks',`select=record_type&${shared.join('&')}`),
    ]).then(([data,countData])=>{
      setTasks(data);
      const counts={work_order:0,task:0,note:0,project:0,acp_task:0,sg_task:0};
      countData.forEach(r=>{if(counts[r.record_type]!==undefined)counts[r.record_type]++;});
      setTypeCounts(counts);
      setLoading(false);
    }).catch(e=>{setError(e.message);setLoading(false);});
  },[statusFilter,typeFilter,propFilter,filterPropCode,search,refreshKey]);

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
    document.title='Tasks | SedonaCRM';
    return ()=>{document.title='SedonaCRM';};
  },[]);

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

  // Client-side date filter
  const filtered = useMemo(()=>sorted.filter(t=>{
    if (dateFilters.opened  && !isInRange(t.created_at,   dateFilters.opened))  return false;
    if (dateFilters.updated && !isInRange(t.updated_at,   dateFilters.updated)) return false;
    if (dateFilters.closed  && !isInRange(t.close_date,   dateFilters.closed))  return false;
    return true;
  }),[sorted,dateFilters]);

  // Grouped by prop_code when no specific prop selected (All Props = default)
  const grouped = useMemo(()=>{
    if (propFilter) return null; // specific prop → flat
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
  },[filtered,propFilter]);

  const toggleSort=c=>{
    if(c===sortCol)setSortDir(d=>d==='asc'?'desc':'asc');
    else{setSortCol(c);setSortDir('asc');}
  };

  const hasActiveDateFilter = !!(dateFilters.opened||dateFilters.updated||dateFilters.closed);
  const hasActiveFilters    = !!propFilter||statusFilter!=='Open'||search!==''||hasActiveDateFilter;

  const clearFilters=()=>{
    setPropFilter(''); setStatusFilter('Open');
    setSearch(''); setDateFilters({opened:null,updated:null,closed:null});
  };

  const TYPE_PILLS=[
    {key:'All',label:'All'},
    {key:'work_order',label:'Work Orders'},
    {key:'task',label:'Tasks'},
    {key:'note',label:'Notes'},
    {key:'project',label:'Projects'},
    {key:'acp_task',label:'ACP Tasks'},
    {key:'sg_task',label:'S&G Tasks'},
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
    const prefixed=formatTaskNum(task.record_type,task.task_num);
    const href=`/tasks/${prefixed}`;
    const rowBg=i%2===0?'transparent':T.bg0;
    const fuOverdue=isFuOverdue(task.follow_up_date,task);
    const fuDisplay=task.follow_up_date?fmtNumDate(task.follow_up_date):'';
    const vendorName=vendors.find(v=>v.id===task.vendor_id)?.company_dba||'';
    const tenantName=tenants.find(t=>t.id===task.tenant_id)?.tenant_dba||'';
    const openDetail=e=>{
      if(e.ctrlKey||e.metaKey){window.open(href,'_blank');}
      else{sessionStorage.setItem('tasksBackUrl',window.location.pathname+window.location.search);onSelect(task);}
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
            {prefixed}
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
          <div style={{marginLeft:'auto',position:'relative',display:'flex',alignItems:'center',flexShrink:0}}>
            {search&&(
              <button onClick={()=>setSearch('')}
                style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>×</button>
            )}
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:'160px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}/>
          </div>
        </div>
        {/* Property filter pills */}
        {!filterPropCode&&propCodes.length>0&&(
          <div className="crm-tasks-prop-strip" style={{display:'flex',gap:'4px',overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:'4px',flexWrap:'nowrap'}}>
            <button onClick={()=>setPropFilter('')} style={propBtn(!propFilter)}>All Props</button>
            <button onClick={()=>setPropFilter(propFilter==='ACP'?'':'ACP')} style={propBtn(propFilter==='ACP')}>ACP</button>
            {propCodes.map(pc=>(
              <button key={pc} onClick={()=>setPropFilter(propFilter===pc?'':pc)} style={propBtn(propFilter===pc)}>{pc}</button>
            ))}
          </div>
        )}
        {/* Type pills */}
        <div className="crm-tasks-type-strip" style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'5px'}}>
          {TYPE_PILLS.map(({key,label})=>{
            const active=typeFilter===key;
            const color=TYPE_COLOR[key]||T.accent;
            const allTotal=Object.values(typeCounts).reduce((s,n)=>s+n,0);
            const cnt=key==='All'?allTotal:(typeCounts[key]??0);
            return (
              <button key={key} onClick={()=>setTypeFilter(key)}
                style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${key==='All'?T.accent:color}`,background:active?(key==='All'?T.accent:color):'transparent',color:active?'#fff':(key==='All'?T.accent:color),transition:'background 0.15s ease',flexShrink:0}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background=key==='All'?'rgba(110,159,216,0.20)':`${color}33`;}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
                {key!=='All'&&<TaskTypeIcon recordType={key} size={12}/>}
                {label} <span style={{fontSize:'10px',opacity:0.7}}>·{cnt}</span>
              </button>
            );
          })}
        </div>
        {/* Status | More... | Clear */}
        <div className="crm-tasks-status-strip" style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'5px'}}>
          <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,flexShrink:0}}>
            {['Open','In Progress','On Hold','Closed','All'].map(s=>{
              const active=statusFilter===s;
              return (
                <button key={s} onClick={()=>setStatusFilter(s)}
                  style={{padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,background:active?T.bg3:'transparent',color:active?T.text0:T.text2,fontWeight:active?'600':'400',display:'flex',alignItems:'center',gap:'3px',whiteSpace:'nowrap'}}>
                  {s}
                  {active&&!loading&&<span style={{color:T.text3,fontSize:'10px'}}>·{tasks.length}</span>}
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

      {/* Body */}
      {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading tasks…</div>}
      {error&&<div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}
      {!loading&&!error&&(
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
              <col style={{width:'130px'}}/>
              <col style={{width:'130px'}}/>
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
              const prefixed=formatTaskNum(t.record_type,t.task_num);
              const fuOverdue=isFuOverdue(t.follow_up_date,t);
              const rowBg=i%2===0?'transparent':T.bg0;
              return (
                <div key={t.id}
                  style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{sessionStorage.setItem('tasksBackUrl',window.location.pathname);onSelect(t);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                    <TaskTypeIcon recordType={t.record_type} size={18}/>
                    <span style={{fontSize:F.xs,color:T.text2}}>{prefixed}</span>
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
  const [users,setUsers]         = useState([]);
  const [activeProps,setActiveProps] = useState([]);
  const [vendors,setVendors]     = useState([]);
  const [tenants,setTenants]     = useState([]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [rightCollapsed,setRightCollapsed] = useState(isMobile);
  const [rightWidth,setRightWidth] = useState(300);
  const [copied,setCopied]       = useState(false);
  const resizingRight = useRef(false);

  useEffect(()=>{
    if (initialTask){setData(initialTask);setLoading(false);return;}
    if (!prefixedId) return;
    const parsed=parsePrefixedId(prefixedId);
    if (!parsed){setNotFound(true);setLoading(false);return;}
    sbFetch('tasks',`task_num=eq.${parsed.taskNum}&record_type=eq.${parsed.recordType}&select=*&limit=1`)
      .then(rows=>{
        if(!rows.length){setNotFound(true);setLoading(false);return;}
        setData(rows[0]);setLoading(false);
      })
      .catch(()=>{setNotFound(true);setLoading(false);});
  },[prefixedId,initialTask]);

  useEffect(()=>{
    sbFetch('users','select=id,full_name&order=full_name.asc').then(setUsers).catch(()=>{});
    sbFetch('properties','select=prop_code,property_name,address,city,state,zip&status=eq.active&order=prop_code.asc').then(setActiveProps).catch(()=>{});
    sbFetch('vendors','select=id,company_dba,podio_id&vendor_status=eq.Active&order=company_dba.asc').then(setVendors).catch(()=>{});
    sbFetch('tenants','select=id,tenant_dba,podio_id&tenant_status=eq.Active&order=tenant_dba.asc').then(setTenants).catch(()=>{});
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
    if(!data)return;
    const raw=data.title||'';
    const trunc=raw.length>30?raw.slice(0,30)+'…':raw;
    document.title=`${formatTaskNum(data.record_type,data.task_num)} – ${trunc} | SedonaCRM`;
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
    const url=`${window.location.origin}/tasks/${formatTaskNum(data.record_type,data.task_num)}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});
  };

  if(loading) return <div style={{padding:'40px',textAlign:'center',color:T.text3}}>Loading…</div>;
  if(notFound) return <div style={{padding:'40px',textAlign:'center',color:T.danger}}>Task not found.</div>;
  if(!data) return null;

  const prefixed=formatTaskNum(data.record_type,data.task_num);
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
          <span style={{fontSize:F.xs,background:T.bg3,color:T.text1,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',fontFamily:'monospace',flexShrink:0}}>{prefixed}</span>
          {data.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>{data.prop_code}</span>}
          <StatusBadge status={data.priority}/>
          <StatusBadge status={data.status}/>
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',transition:'color 0.2s',flexShrink:0}}
            onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=T.text0;}}
            onMouseLeave={e=>{if(!copied)e.currentTarget.style.color=T.text2;}}>
            {copied?'✓ Copied':'⧉ Copy Link'}
          </button>
          {data.podio_id&&<span style={{fontSize:F.xs,color:T.text3}}>Podio ref: {data.podio_id}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
          <TaskTypeIcon recordType={data.record_type} size={28}/>
          <div style={{fontSize:F.lg,fontWeight:'700',color:'#E8630A',lineHeight:'1.3'}}>{data.title||'Untitled'}</div>
        </div>
        {/* Type conversion pills */}
        <div className="crm-task-type-pills" style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
          <span style={{fontSize:F.xs,color:T.text3,fontWeight:'600'}}>Type:</span>
          {Object.keys(TYPE_PREFIX).map(key=>{
            const active=data.record_type===key;
            const color=TYPE_COLOR[key];
            const Icon=TYPE_ICON_MAP[key];
            return (
              <button key={key} onClick={()=>handleTypeChange(key)}
                style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 9px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${color}`,background:active?color:'transparent',color:active?'#fff':color,transition:'background 0.15s ease'}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background=`${color}33`;}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
                {Icon&&<Icon size={12} weight="bold"/>}
                {TYPE_LABEL[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',minWidth:0}}>
          {/* Base fields */}
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>
            <FieldRow label="Property" topAlign>
              <InlineSelect value={data.prop_code} options={activeProps.map(p=>({value:p.prop_code,label:`${p.prop_code} — ${p.property_name}`}))} onSave={v=>save('prop_code',v)}/>
              {propInfo&&(
                <div style={{marginTop:'5px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px'}}>
                  <div style={{fontSize:F.sm,fontWeight:'500',color:T.text0}}>{propInfo.property_name}</div>
                  {propLine2&&<div style={{fontSize:F.xs,color:T.text2,marginTop:'2px'}}>{propLine2}</div>}
                </div>
              )}
            </FieldRow>
            <FieldRow label="Priority"><PriorityPills value={data.priority} onSave={v=>save('priority',v)}/></FieldRow>
            <FieldRow label="Status"><StatusPills value={data.status} onSave={handleStatusChange}/></FieldRow>
            <FieldRow label="Category">
              <InlineSelect value={data.category} options={categoryOpts} onSave={v=>save('category',v)}/>
            </FieldRow>
            <FieldRow label="Assigned To">
              <InlineSelect value={data.assigned_to} options={users.map(u=>({value:u.id,label:u.full_name}))} onSave={v=>save('assigned_to',v)}/>
            </FieldRow>
            <FieldRow label="Follow-Up Date">
              <InlineBlurField type="date" value={data.follow_up_date||''} onSave={v=>save('follow_up_date',v)}/>
            </FieldRow>
            <FieldRow label="FU End Date">
              <InlineBlurField type="date" value={data.follow_up_end_date||''} onSave={v=>save('follow_up_end_date',v)}/>
            </FieldRow>
            <FieldRow label="Follow-Up Notes" topAlign>
              <RichTextEditor value={data.follow_up_notes} onSave={v=>save('follow_up_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Details" topAlign>
              <RichTextEditor value={data.details} onSave={v=>save('details',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Internal Notes" topAlign>
              <RichTextEditor value={data.internal_notes} onSave={v=>save('internal_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Alert">
              <InlineBlurField value={data.alert||''} onSave={v=>save('alert',v)}/>
            </FieldRow>
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
              <FieldRow label="WO Type">
                <GenericPills value={data.wo_type} options={['Standard','Recurring','Budget Item']} color={T.accent} onSave={v=>save('wo_type',v)}/>
              </FieldRow>
              <FieldRow label="Stage">
                <GenericPills value={data.stage} options={['New','In Progress','Waiting on Vendor','Waiting on Parts','Complete']} color={T.purple} onSave={v=>save('stage',v)}/>
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
              <FieldRow label="Key Safe Info">
                <InlineBlurField value={data.key_safe_info||''} onSave={v=>save('key_safe_info',v)}/>
              </FieldRow>
              <FieldRow label="Instructions to Vendor" topAlign>
                <RichTextEditor value={data.instructions_to_vendor} onSave={v=>save('instructions_to_vendor',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Estimate Amount">
                <InlineBlurField value={data.estimate_amount!=null?String(data.estimate_amount):''} moneyFormat onSave={v=>save('estimate_amount',v?parseFloat(String(v).replace(/[^0-9.-]/g,'')):null)}/>
              </FieldRow>
              <FieldRow label="Estimate Log" topAlign>
                <RichTextEditor value={data.estimate_log} onSave={v=>save('estimate_log',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Invoice Location">
                <InlineBlurField value={data.invoice_location||''} onSave={v=>save('invoice_location',v)}/>
              </FieldRow>
              <FieldRow label="Invoice Stage">
                <GenericPills value={data.invoice_stage} options={['Not Received','Received','Approved','Paid']} color={T.success} onSave={v=>save('invoice_stage',v)}/>
              </FieldRow>
              <FieldRow label="Invoice Paid">
                <BoolPill value={data.invoice_paid} labelTrue="Paid ✓" labelFalse="Unpaid" colorTrue={T.success} onSave={v=>save('invoice_paid',v)}/>
              </FieldRow>
              <FieldRow label="Pmt to Bookkeeper" topAlign>
                <RichTextEditor value={data.pmt_instructions_to_bk} onSave={v=>save('pmt_instructions_to_bk',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Final Closeout Notes" topAlign>
                <RichTextEditor value={data.final_closeout_notes} onSave={v=>save('final_closeout_notes',v)} minRows={5}/>
              </FieldRow>
              <FieldRow label="Email Request Sent">
                <BoolPill value={data.email_request_sent} labelTrue="Sent ✓" labelFalse="Not Sent" colorTrue={T.accent} onSave={v=>save('email_request_sent',v)}/>
              </FieldRow>
              <FieldRow label="Make Recurring">
                <BoolPill value={data.make_recurring} labelTrue="Yes" labelFalse="No" colorTrue={T.purple} onSave={v=>save('make_recurring',v)}/>
              </FieldRow>
            </div>
          )}
        </div>

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
      {/* Mobile: floating button when panel is closed */}
      {isMobile && rightCollapsed && (
        <button onClick={()=>setRightCollapsed(false)}
          style={{position:'fixed',bottom:'16px',right:'16px',zIndex:50,background:'#E8630A',color:'#fff',border:'none',borderRadius:'50%',width:'48px',height:'48px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>
          <ChatCircle size={22} weight="bold" color="white"/>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export — list ↔ detail wrapper
// ─────────────────────────────────────────────────────────────────────────────
export default function TasksView({ filterPropCode, filterType } = {}) {
  const [selected,setSelected]             = useState(null);
  const [listRefreshKey,setListRefreshKey] = useState(0);

  const handleSelect = useCallback(task=>{
    history.pushState({taskId:task.id},'');
    setSelected(task);
  },[]);

  const handleBack = useCallback(()=>{
    if(window.history.state?.taskId) history.replaceState({},'');
    setSelected(null);
  },[]);

  const handleUpdate = useCallback(updated=>{
    setSelected(updated);
    setListRefreshKey(k=>k+1);
  },[]);

  useEffect(()=>{
    const onPop=()=>setSelected(null);
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <TasksList onSelect={handleSelect} filterPropCode={filterPropCode} filterType={filterType} refreshKey={listRefreshKey}/>
      </div>
      {selected&&(
        <TaskDetail key={selected.id} task={selected} onBack={handleBack} onUpdate={handleUpdate}/>
      )}
    </div>
  );
}
