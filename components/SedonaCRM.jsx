import WorkOrdersView from './WorkOrdersView';
import WorkOrdersTable from './shared/WorkOrdersTable';
import SuitesView from './SuitesView';
import SuitesTable from './shared/SuitesTable';
import IssuesView, { IssuesList } from './IssuesView';
import TasksView from './TasksView';
import ContactsTable from './shared/ContactsTable';
import TenantsTable from './shared/TenantsTable';
import { TenantsList } from './TenantsView';
import RichTextEditor from './RichTextEditor';
import GlobalSearch from './GlobalSearch';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { HouseLine, BuildingOffice, Buildings, Storefront, CheckFat, Wrench, Cube, UserCircle, Truck, Briefcase, ChartBar, Umbrella, ClipboardText, Gear, Key, CaretLeft, CaretRight, EnvelopeSimple, SquaresFour, List } from '@phosphor-icons/react';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

export const sbFetch = async (table, params = '') => {
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

// ── Theme ─────────────────────────────────────────────────────────────────────
export const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
export const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };
const css = {
  shell: { display:'flex', height:'100vh', background:T.bg1, fontFamily:'var(--font-sans)', color:T.text0, fontSize:F.base, overflow:'hidden' },
  topbar: { padding:'8px 16px', background:T.bg0, borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', gap:'12px', flexShrink:0 },
  card: { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  secTitle: { fontSize:F.xs, fontWeight:'600', color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  badge: (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th: { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  tdNum: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', textAlign:'right' },
  tfoot: { fontSize:F.sm, fontWeight:'600', color:T.text0, padding:'5px 8px', whiteSpace:'nowrap', background:T.bg3, textAlign:'right' },
};

const today = new Date();
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};
const fmtMoney = n => n != null && n !== '' ? '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
const fmtNum = n => n != null && n !== '' ? Number(n).toLocaleString() : '—';

const StatusBadge = ({ status }) => {
  const s = (status||'').toLowerCase();
  const map = {
    active:[T.success,'#1e2a1e'], archived:[T.text2,T.bg3], current:[T.success,'#1e2a1e'],
    expired:[T.danger,'#3d1f1f'], pending:[T.warn,'#3d2e1a'], vacant:[T.text2,T.bg3],
    open:[T.accent,'#1a2e3a'], closed:[T.text2,T.bg3], 'in progress':[T.warn,'#3d2e1a'],
    high:[T.danger,'#3d1f1f'], medium:[T.warn,'#3d2e1a'], low:[T.success,'#1e2a1e'],
  };
  const [color,bg] = map[s]||[T.text2,T.bg3];
  return <span style={css.badge(color,bg)}>{status||'—'}</span>;
};

const EditableField = ({ label, value, onSave, type='text', display }) => {
  const [editing,setEditing] = useState(false);
  const [val,setVal] = useState(value||'');
  const [saved,setSaved] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);
  useEffect(()=>{ setVal(value||''); },[value]);
  useEffect(()=>()=>{ if(timerRef.current) clearTimeout(timerRef.current); },[]);

  if (type === 'textarea') return <RichTextEditor label={label} value={value} onSave={onSave}/>;

  const doSave = async (v) => {
    if(String(v) === String(value||'')) return;
    try {
      await onSave(v);
      setSaved(true);
      if(timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(()=>setSaved(false), 1500);
    } catch { alert('Save failed'); }
  };
  const handleBlur = () => { setEditing(false); doSave(val); };
  const cancel = () => { setVal(value||''); setEditing(false); };
  const displayVal = display !== undefined ? display : val;

  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px',display:'flex',alignItems:'center',gap:'6px'}}>
        {label}
        {saved&&<span style={{color:T.success,fontSize:'11px',fontWeight:'500'}}>✓ Saved</span>}
      </div>
      {editing ? (
        <input ref={inputRef} type={type} value={val} onChange={e=>setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e=>{if(e.key==='Enter'){inputRef.current?.blur();}if(e.key==='Escape')cancel();}}
          style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none'}}/>
      ):(
        <div onClick={()=>setEditing(true)} title="Click to edit"
          style={{fontSize:F.base,color:displayVal?T.text0:T.text3,cursor:'text',padding:'3px 5px',borderRadius:'4px',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4'}}
          onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
          onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
          {displayVal||<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>click to edit</span>}
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

// ── Weather Card ──────────────────────────────────────────────────────────────
const WeatherCard = ({ city, lat, lon, url }) => {
  const [days,setDays]=useState(null);
  const [current,setCurrent]=useState(null);
  useEffect(()=>{
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,weathercode&current_weather=true&temperature_unit=fahrenheit&forecast_days=7&timezone=auto`)
      .then(r=>r.json()).then(data=>{
        setCurrent(Math.round(data.current_weather.temperature));
        const d=data.daily;
        setDays(d.time.slice(0,7).map((date,i)=>({
          dow:new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'}),
          hi:Math.round(d.temperature_2m_max[i]),pop:d.precipitation_probability_max[i]??0,code:d.weathercode[i],
        })));
      }).catch(()=>{});
  },[lat,lon]);
  const wmoIcon=(code,pop)=>{
    if(pop>=70)return{icon:'🌧',color:T.accent};if(pop>=30)return{icon:'⛅',color:T.text1};
    if(code===0)return{icon:'☀',color:T.warn};if(code<=3)return{icon:'⛅',color:T.text1};
    if(code<=48)return{icon:'🌫',color:T.text2};if(code<=77)return{icon:'🌧',color:T.accent};
    return{icon:'⛈',color:T.warn};
  };
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{flex:'1 1 260px',minWidth:0,display:'block',textDecoration:'none',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 10px'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
      onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
        <span style={{fontSize:F.sm,fontWeight:'500',color:T.text2,textTransform:'uppercase',letterSpacing:'0.05em'}}>
          {city}{current!==null&&<span style={{color:T.text1}}> · {current}°F</span>}
        </span>
      </div>
      {days?(
        <div style={{display:'flex',gap:'2px'}}>
          {days.map((d,i)=>{const{icon,color}=wmoIcon(d.code,d.pop);return(
            <div key={i} style={{flex:1,textAlign:'center'}}>
              <div style={{fontSize:'10px',color:T.text3}}>{d.dow}</div>
              <div style={{fontSize:'13px',color}}>{icon}</div>
              <div style={{fontSize:F.xs,fontWeight:'500',color:T.text0}}>{d.hi}°</div>
              <div style={{fontSize:'10px',color:d.pop>=30?T.accent:T.text3}}>{d.pop}%</div>
            </div>
          );})}
        </div>
      ):<div style={{fontSize:F.sm,color:T.text3}}>Loading…</div>}
    </a>
  );
};

// ── Nav Item ──────────────────────────────────────────────────────────────────
const NavItem = ({ iconComp,label,active,onClick,href,collapsed,expandedMenu,setExpandedMenu,setCurrentView,submenu }) => {
  const isExp = expandedMenu===label;
  return (
    <div>
      <a href={href}
        onClick={e=>{
          if(e.ctrlKey||e.metaKey) return;
          e.preventDefault();
          submenu?setExpandedMenu(isExp?null:label):onClick?.();
        }}
        title={collapsed?label:undefined}
        style={{width:'100%',padding:collapsed?'8px 0':'7px 10px',background:active?T.bg2:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:collapsed?'center':'flex-start',gap:'9px',fontSize:F.base,color:active?T.accent:T.text1,borderRadius:'4px',borderRight:active?`2px solid ${T.accent}`:'2px solid transparent',whiteSpace:'nowrap',textDecoration:'none'}}
        onMouseEnter={e=>{if(!active)e.currentTarget.style.color=T.text0;}}
        onMouseLeave={e=>{if(!active)e.currentTarget.style.color=T.text1;}}>
        {collapsed
          ? (iconComp
              ? <span style={{display:'flex',alignItems:'center'}}>{iconComp}</span>
              : <span style={{fontSize:'16px',fontWeight:'600'}}>{label[0]}</span>)
          : <>
              {iconComp && <span style={{display:'flex',alignItems:'center',flexShrink:0}}>{iconComp}</span>}
              <span style={{flex:1}}>{label}</span>
              {submenu && <i className="ti ti-chevron-down" style={{fontSize:'13px',transform:isExp?'rotate(180deg)':'none',transition:'transform 200ms'}} aria-hidden="true"></i>}
            </>
        }
      </a>
      {!collapsed&&submenu&&isExp&&(
        <div style={{paddingLeft:'24px'}}>
          {submenu.map(item=>(
            <button key={item.id} onClick={()=>{setCurrentView(item.view);setExpandedMenu(null);}}
              style={{width:'100%',padding:'5px 8px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',fontSize:F.sm,color:T.text2,borderRadius:'4px',whiteSpace:'nowrap'}}
              onMouseEnter={e=>e.currentTarget.style.color=T.text0}
              onMouseLeave={e=>e.currentTarget.style.color=T.text2}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Activity Panel ────────────────────────────────────────────────────────────
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
                    Comments and attached files will sync from Podio via API at go-live.
                  </p>
                </div>
                <div style={{textAlign:'center',marginTop:'32px'}}>
                  <i className="ti ti-message-circle" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
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
                  <i className="ti ti-history" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
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

// ── Rent Roll PDF ─────────────────────────────────────────────────────────────
const generateRentRollPDF = (property, rentRows, occupancy) => {
  const win = window.open('','_blank');
  const fmt = n => n!=null?'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const fmtD = d => fmtDate(d);
  const rows = rentRows.map(r=>`
    <tr>
      <td>${r.tenant_dba||'—'}</td><td>${r.suite_num||'—'}</td>
      <td style="text-align:right">${fmtNum(r.sqft)}</td>
      <td style="text-align:right">${fmt(r.security_deposit)}</td>
      <td>${fmtD(r.lease_ends)}</td>
      <td style="text-align:right">${fmt(r.base_rent)}</td>
      <td style="text-align:right">${fmt(r.nnn)}</td>
      <td style="text-align:right">${fmt(r.other_amt)}</td>
      <td style="text-align:right">${fmt(r.cam_impound)}</td>
      <td style="text-align:right">${fmt(r.tpt_tax)}</td>
      <td style="text-align:right">${fmt(r.total)}</td>
      <td style="text-align:right">${r.base_per_sf?Number(r.base_per_sf).toFixed(2):'—'}</td>
      <td style="text-align:right">${r.nnn_per_sf?Number(r.nnn_per_sf).toFixed(2):'—'}</td>
    </tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rent Roll - ${property.prop_code}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{font-size:14px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f0f0f0;border:1px solid #ccc;padding:4px 6px;font-size:10px}
  td{border:1px solid #ddd;padding:4px 6px}tfoot td{background:#f0f0f0;font-weight:bold}
  .summary{margin-bottom:12px;font-size:11px}.summary span{margin-right:20px}</style></head><body>
  <h2>Rent Roll — ${property.property_name||property.prop_code}</h2>
  <div style="font-size:11px;color:#666;margin-bottom:8px">${property.address||''} · As of ${(d => `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`)(new Date())}</div>
  <div class="summary">
    <span>Occupied: ${fmtNum(occupancy.occupied_sf)} sf</span>
    <span>Vacant: ${fmtNum(occupancy.vacant_sf)} sf</span>
    <span>Gross: ${fmtNum(occupancy.gross_sf)} sf</span>
    <span>Occupancy: ${occupancy.occ_pct}%</span>
    <span>Monthly Total: ${fmt(occupancy.monthly_total)}</span>
  </div>
  <table><thead><tr>
    <th>Tenant DBA</th><th>Suite</th><th>Sq Ft</th><th>Security</th><th>Lease Ends</th>
    <th>Base Rent</th><th>NNN</th><th>Other</th><th>CAMi</th><th>TPT Tax</th><th>Total</th><th>Base/sf</th><th>NNN/sf</th>
  </tr></thead><tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="5">TOTALS</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.base_rent)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.nnn)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.other_amt)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.cam_impound)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.total)||0),0))}</td>
    <td colspan="2"></td>
  </tr></tfoot></table>
  <script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
};

// ── Property Detail micro-components ─────────────────────────────────────────
const PropFieldRow = ({ label, children, topAlign = false, hoverable = true }) => (
  <div className="crm-field-row"
    style={{display:'grid',gridTemplateColumns:'160px 1fr',borderBottom:`0.5px solid ${T.border}`,padding:'10px 0',minHeight:'48px'}}
    onMouseEnter={hoverable ? e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';} : undefined}
    onMouseLeave={hoverable ? e=>{e.currentTarget.style.background='';} : undefined}
  >
    <div className="crm-field-label" style={{fontSize:F.sm,fontWeight:'600',color:'#6B7280',textAlign:'right',paddingRight:'16px',alignSelf:topAlign?'start':'center',paddingTop:topAlign?'4px':'0',lineHeight:'1.4',userSelect:'none'}}>
      {label}
    </div>
    <div style={{alignSelf:topAlign?'start':'center',paddingRight:'4px'}}>
      {children}
    </div>
  </div>
);

const PropInlineBlur = ({ value, onSave, type='text', highlight=false, readOnly=false, displayTransform }) => {
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
  const rawDisplay = type === 'date' && val ? fmtDate(val) : (val != null ? String(val) : '');
  const displayVal = displayTransform ? displayTransform(val) : rawDisplay;
  if (readOnly) return <div style={{fontSize:F.base,color:T.text1,lineHeight:'1.4'}}>{displayVal||'—'}</div>;
  return editing ? (
    <input ref={inputRef} type={type} value={val} onChange={e=>setVal(e.target.value)}
      onFocus={type==='date'?(e=>{try{e.target.showPicker();}catch(_){}}) : undefined}
      onBlur={commit}
      onKeyDown={e=>{if(e.key==='Escape'){setVal(value??'');setEditing(false);}if(e.key==='Enter')commit();}}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',
        ...(type==='date'?{appearance:'none',WebkitAppearance:'none',MozAppearance:'none'}:{})}}
    />
  ) : (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{fontSize:F.base,color:highlight?'#E8630A':(rawDisplay?T.text0:T.text3),fontWeight:highlight?'700':'normal',cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {displayVal || <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving && <span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

const ListingExpiryField = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value ?? '');
  const inputRef = useRef(null);
  useEffect(() => { setVal(value ?? ''); }, [value]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); try { inputRef.current?.showPicker(); } catch(_) {} } }, [editing]);
  const commit = async () => {
    setEditing(false);
    if (val === (value ?? '')) return;
    try { await onSave(val || null); } catch { setVal(value ?? ''); }
  };
  const urgStyle = d => {
    if (!d) return {};
    const days = Math.round((new Date(d) - new Date()) / (1000*60*60*24));
    if (days < 0)    return {color:'#fff',fontWeight:'700',background:'#7a0000',borderRadius:'3px',padding:'2px 6px'};
    if (days <= 30)  return {color:'#e07070',fontWeight:'700'};
    if (days <= 60)  return {color:'#d4924a',fontWeight:'700'};
    if (days <= 90)  return {color:'#f0d060',fontWeight:'700'};
    if (days <= 120) return {color:'#6ab06a',fontWeight:'700'};
    return {};
  };
  if (editing) return (
    <input ref={inputRef} type="date" value={val} onChange={e=>setVal(e.target.value)}
      onFocus={e=>{try{e.target.showPicker();}catch(_){}}}
      onBlur={commit}
      onKeyDown={e=>{if(e.key==='Escape'){setVal(value??'');setEditing(false);}if(e.key==='Enter')commit();}}
      style={{background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',appearance:'none',WebkitAppearance:'none'}}
    />
  );
  return (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{cursor:'text',padding:'4px 0',minHeight:'24px',lineHeight:'1.4',border:'1px solid transparent',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {val
        ? <span style={{fontSize:F.base,...urgStyle(val)}}>{fmtDate(val)}</span>
        : <span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
    </div>
  );
};

const PropInlineSelect = ({ value, options, onSave }) => (
  <select value={value||''} onChange={async e=>{await onSave(e.target.value||null);}}
    style={{width:'100%',boxSizing:'border-box',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:value?T.text0:T.text3,fontSize:F.base,outline:'none',cursor:'pointer'}}>
    <option value="">—</option>
    {options.map(o=>typeof o==='object'
      ?<option key={o.value} value={o.value}>{o.label}</option>
      :<option key={o} value={o}>{o}</option>)}
  </select>
);

const BoolPill = ({ value, onSave }) => {
  const opts = [
    {val:true,  label:'Yes', activeBg:T.success,  activeColor:'#fff',  border:T.success, hoverBg:'rgba(106,176,106,0.20)'},
    {val:false, label:'No',  activeBg:T.bg3,      activeColor:T.text0, border:T.text2,   hoverBg:'rgba(107,114,128,0.20)'},
  ];
  return (
    <div style={{display:'flex',gap:'5px'}}>
      {opts.map(o=>{
        const active = value === o.val;
        return (
          <button key={o.label} onClick={()=>!active&&onSave(o.val)}
            style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',
              border:`1px solid ${o.border}`,background:active?o.activeBg:'transparent',color:active?o.activeColor:o.border,
              transition:'background 0.15s ease'}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=o.hoverBg;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

// ── Property Detail ───────────────────────────────────────────────────────────
export const PropertyDetail = ({ property, onBack, onUpdate, initialTab }) => {
  const router = useRouter();
  const [tab,setTab] = useState(initialTab || 'dashboard');
  const [data,setData] = useState(property);
  const [rentRows,setRentRows] = useState([]);
  const [workOrders,setWorkOrders] = useState([]);
  const [issues,setIssues] = useState([]);
  const [insurance,setInsurance] = useState([]);
  const [monthlyReports,setMonthlyReports] = useState([]);
  const [propTaxes,setPropTaxes] = useState([]);
  const [agreement,setAgreement] = useState(null);
  const [suites,setSuites] = useState([]);
  const [propOwners,setPropOwners] = useState([]);
  const [propOwnerContacts,setPropOwnerContacts] = useState([]);
  const [cois, setCois] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const listingFetched = useRef(false);
  const dashFetched = useRef(false);
  const insuranceFetched = useRef(false);
  const monthlyFetched = useRef(false);
  const taxesFetched = useRef(false);
  const coisFetched = useRef(false);
  const pipelineFetched = useRef(false);
  const [rightCollapsed,setRightCollapsed] = useState(true);
  const [rightWidth,setRightWidth] = useState(280);
  const resizingRight = useRef(false);
  const [navList,setNavList]     = useState(null);
  const [navIdx,setNavIdx]       = useState(-1);
  const [navLoading,setNavLoading] = useState(false);

  const startRightResize = useCallback((e) => {
    resizingRight.current = true;
    const startX = e.clientX, startW = rightWidth;
    const onMove = me => { if(!resizingRight.current)return; setRightWidth(Math.max(180,Math.min(500,startW-(me.clientX-startX)))); };
    const onUp = () => { resizingRight.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  },[rightWidth]);

  useEffect(()=>{
    const onKey = e => { if(e.key==='Escape') onBack?.(); };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[onBack]);

  // Nav list from sessionStorage
  useEffect(()=>{
    try{
      const nl=sessionStorage.getItem('propertiesNavList');
      const ni=sessionStorage.getItem('propertiesNavIndex');
      if(nl){setNavList(JSON.parse(nl));setNavIdx(ni!=null?parseInt(ni,10):-1);}
    }catch{}
  },[]);

  // Sync active tab to URL so window.location.href is /properties/LPP?tab=tasks
  // when TasksView (embeddedMode) writes tasksBackUrl on row click
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const url=`/properties/${data.prop_code}?tab=${tab}`;
    window.history.replaceState({...window.history.state,url,as:url},'',url);
  },[tab,data.prop_code]);

  const goNav = async (dir) => {
    if(!navList||navLoading) return;
    const next=navIdx+dir;
    if(next<0||next>=navList.length) return;
    setNavLoading(true);
    const entry=navList[next];
    try{
      const rows=await sbFetch('properties',`prop_code=eq.${entry.prop_code}&select=*&limit=1`);
      if(rows&&rows[0]){
        const newRec=rows[0];
        setData(newRec);
        setNavIdx(next);
        sessionStorage.setItem('propertiesNavIndex',String(next));
        const newUrl=`/properties/${newRec.prop_code}`;
        window.history.replaceState({...window.history.state,url:newUrl,as:newUrl},'',newUrl);
        document.title=`${newRec.property_name||newRec.prop_code} | SedonaCRM`;
        setTab('dashboard');
        setRentRows([]); setWorkOrders([]); setIssues([]); setInsurance([]);
        setMonthlyReports([]); setPropTaxes([]); setAgreement(null);
        setSuites([]); setPropOwners([]); setPropOwnerContacts([]); setCois([]); setPipeline([]);
        dashFetched.current=false; insuranceFetched.current=false; monthlyFetched.current=false;
        taxesFetched.current=false; coisFetched.current=false; pipelineFetched.current=false; listingFetched.current=false;
      }
    }catch{}
    setNavLoading(false);
  };

  const goNavRef = useRef(goNav);
  goNavRef.current = goNav;

  useEffect(()=>{
    const onKey=e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
      const tag=e.target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select') return;
      if(e.target?.isContentEditable) return;
      goNavRef.current(e.key==='ArrowLeft'?-1:1);
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);

  // Dashboard lazy fetch — rent-roll occupancy, suites count, open WO/issue counts, agreement for listing card
  useEffect(()=>{
    if(tab!=='dashboard'||dashFetched.current) return;
    dashFetched.current=true;
    const pc=data.prop_code;
    const today=new Date().toISOString().slice(0,10);
    Promise.all([
      sbFetch('rent_schedule',`prop_code=eq.${pc}&rent_status=eq.Current&rent_starts=lte.${today}&rent_ends=gte.${today}&select=sqft,total,suite_num&order=suite_num.asc`),
      sbFetch('suites',`prop_code=eq.${pc}&select=id`),
      sbFetch('work_orders',`prop_code=eq.${pc}&wo_status=not.in.(Closed,Closed%20-%20Not%20Done)&select=id`),
      sbFetch('issues',`prop_code=eq.${pc}&status=eq.Open&select=id`),
      sbFetch('property_agreements',`prop_code=eq.${pc}&select=*&limit=1`),
    ]).then(([rent,stes,wos,iss,agrs])=>{
      setRentRows(rent||[]);
      setSuites(stes||[]);
      setWorkOrders(wos||[]);
      setIssues(iss||[]);
      setAgreement(agrs?.[0]||null);
    }).catch(()=>{});
  },[tab,data.prop_code]);

  // Insurance — fetched lazily for Dashboard card AND Insurance tab (whichever comes first)
  useEffect(()=>{
    if(!['dashboard','insurance'].includes(tab)||insuranceFetched.current) return;
    insuranceFetched.current=true;
    sbFetch('property_insurance',`prop_code=eq.${data.prop_code}&select=*&order=expiry_date.desc`)
      .then(setInsurance).catch(()=>{});
  },[tab,data.prop_code]);

  // Monthly Reports tab lazy fetch
  useEffect(()=>{
    if(tab!=='monthly-reports'||monthlyFetched.current) return;
    monthlyFetched.current=true;
    sbFetch('monthly_reports',`prop_code=eq.${data.prop_code}&select=*&order=report_date.desc&limit=24`)
      .then(setMonthlyReports).catch(()=>{});
  },[tab,data.prop_code]);

  // Property Taxes tab lazy fetch
  useEffect(()=>{
    if(tab!=='property-taxes'||taxesFetched.current) return;
    taxesFetched.current=true;
    sbFetch('property_taxes',`prop_code=eq.${data.prop_code}&select=*&order=year.desc`)
      .then(setPropTaxes).catch(()=>{});
  },[tab,data.prop_code]);

  // COIs tab lazy fetch
  useEffect(()=>{
    if(tab!=='cois'||coisFetched.current) return;
    coisFetched.current=true;
    sbFetch('tnt_cois',`prop_code=eq.${data.prop_code}&select=*,tenants!tnt_cois_tenant_id_fkey(id,tenant_dba,podio_id)&order=expiry_date.asc`)
      .then(setCois).catch(()=>{});
  },[tab,data.prop_code]);

  // Leasing Pipeline tab lazy fetch — open only by default
  useEffect(()=>{
    if(tab!=='pipeline'||pipelineFetched.current) return;
    pipelineFetched.current=true;
    sbFetch('leasing_pipeline',`prop_code=eq.${data.prop_code}&status=eq.Open&select=id,prospect_name,stage,suite_num,size_sqft_interest,priority,source,follow_up_date,created_at&order=follow_up_date.asc`)
      .then(setPipeline).catch(()=>{});
  },[tab,data.prop_code]);

  useEffect(()=>{
    if(tab!=='listing'||listingFetched.current) return;
    listingFetched.current=true;
    const pc=data.prop_code;
    sbFetch('property_owners',`prop_code=eq.${pc}&select=*`)
      .then(async rows=>{
        setPropOwners(rows||[]);
        const ids=[...new Set((rows||[]).map(r=>r.primary_contact_id).filter(Boolean))];
        if(ids.length){
          const cs=await sbFetch('contacts',`id=in.(${ids.join(',')})&select=id,full_name,podio_id`);
          setPropOwnerContacts(cs||[]);
        }
      }).catch(()=>{});
  },[tab,data.prop_code]);

  const save = async (field, val) => {
    const stored = (val === '' || val === undefined) ? null : val;
    await sbPatch('properties', data.id, { [field]: stored });
    const updated = {...data,[field]:val};
    setData(updated); onUpdate?.(updated);
  };

  const saveAgreement = async (field, val) => {
    if(!agreement) return;
    const stored = (val === '' || val === undefined) ? null : val;
    await sbPatch('property_agreements', agreement.id, { [field]: stored });
    setAgreement(prev=>({...prev,[field]:val}));
  };

  const pctIn  = v => v != null ? String((Number(v)*100).toFixed(4).replace(/\.?0+$/,'')) : '';
  const pctOut = v => v ? String(parseFloat(v)/100) : null;
  const pctFmt = v => v ? Number(v).toFixed(2)+'%' : '';

  const listingExpiryStyle = d => {
    if(!d) return {};
    const now=new Date(); now.setHours(0,0,0,0);
    const exp=new Date(d+'T00:00:00');
    const days=Math.round((exp-now)/(1000*60*60*24));
    if(days<0)   return {color:'#fff',fontWeight:'700',background:'#7a0000',padding:'2px 7px',borderRadius:'3px',display:'inline-block'};
    if(days<=30)  return {color:T.danger,fontWeight:'700'};
    if(days<=60)  return {color:'#d4924a',fontWeight:'700'};
    if(days<=90)  return {color:'#f0d060',fontWeight:'700'};
    if(days<=120) return {color:T.success,fontWeight:'700'};
    return {};
  };

  const calcMoLeft = endDate => {
    if(!endDate) return null;
    const end = new Date(endDate);
    if(isNaN(end.getTime())) return null;
    return (end - new Date()) / (1000*60*60*24*30.44);
  };

  const moLeftColor = mo => {
    if(mo===null||mo<0) return T.text3;
    if(mo<=3)  return T.danger;
    if(mo<=12) return T.warn;
    return T.success;
  };

  const occupancy = (() => {
    const occupied_sf = rentRows.reduce((s,r)=>s+(Number(r.sqft)||0),0);
    const gross_sf = data.gross_sqft||0;
    const vacant_sf = Math.max(0, gross_sf - occupied_sf);
    const occ_pct = gross_sf>0?Math.round(occupied_sf/gross_sf*100):0;
    const monthly_total = rentRows.reduce((s,r)=>s+(Number(r.total)||0),0);
    return { occupied_sf, vacant_sf, gross_sf, occ_pct, monthly_total };
  })();

  const openWOs    = workOrders.length;  // server-side filtered to open only
  const openIssues = issues.length;      // server-side filtered to open only

  const TABS = ['Dashboard','Tasks','Tenants','Suites','Pipeline','Monthly Reports','Insurance','COIs','Property Taxes','Prop Info','Listing','CAMs','Inspections','Contacts','Documents'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px',flexWrap:'wrap'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Properties
          </button>
          <StatusBadge status={data.status}/>
          {navList&&navList.length>1&&(
            <div style={{display:'flex',alignItems:'center',gap:'3px',marginLeft:'auto',flexShrink:0}}>
              <button onClick={()=>goNav(-1)} disabled={navIdx<=0||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 6px',cursor:navIdx<=0?'not-allowed':'pointer',opacity:navIdx<=0?0.3:1,color:T.text1,display:'flex',alignItems:'center'}}
                onMouseEnter={e=>{if(navIdx>0)e.currentTarget.style.borderColor=T.accent;}}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <CaretLeft size={18} weight="bold"/>
              </button>
              <span style={{fontSize:F.xs,color:T.text3,padding:'0 6px',whiteSpace:'nowrap'}}>{navLoading?'…':`${navIdx+1} of ${navList.length}`}</span>
              <button onClick={()=>goNav(1)} disabled={navIdx>=navList.length-1||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 6px',cursor:navIdx>=navList.length-1?'not-allowed':'pointer',opacity:navIdx>=navList.length-1?0.3:1,color:T.text1,display:'flex',alignItems:'center'}}
                onMouseEnter={e=>{if(navIdx<navList.length-1)e.currentTarget.style.borderColor=T.accent;}}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <CaretRight size={18} weight="bold"/>
              </button>
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Buildings size={20} weight="bold" color="#E8630A"/>
          <div style={{minWidth:0,overflow:'hidden'}}>
            <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{data.property_name||data.prop_code}</div>
            <div style={{fontSize:F.sm,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{data.prop_code} · {data.address||''}{data.city?`, ${data.city}`:''}</div>
          </div>
        </div>
      </div>
      {/* Tab bar */}
      <div className="crm-detail-tab-bar" style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0,overflowX:'auto',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t.toLowerCase().replace(/ /g,'-'))}
            style={{background:'transparent',border:'none',padding:'6px 10px',fontSize:F.xs,cursor:'pointer',borderRadius:'4px 4px 0 0',whiteSpace:'nowrap',
              color:tab===t.toLowerCase().replace(/ /g,'-')?T.accent:T.text1,
              borderBottom:tab===t.toLowerCase().replace(/ /g,'-')?`2px solid ${T.accent}`:'2px solid transparent',
              fontWeight:tab===t.toLowerCase().replace(/ /g,'-')?'600':'400'}}>
            {t}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* Tasks tab — shared TasksTable filtered by prop_code */}
        {tab==='tasks'&&(
          <div style={{flex:1,overflow:'hidden'}}>
            <TasksView filterPropCode={data.prop_code} hidePropertyPills embeddedMode/>
          </div>
        )}

        {/* Contacts tab — full component, needs overflow:hidden wrapper */}
        {tab==='contacts'&&(
          <div style={{flex:1,overflow:'hidden'}}>
            <ContactsTable filterPropCode={data.prop_code} hidePropertyFilter={true}/>
          </div>
        )}

        {/* Suites tab — self-fetching shared component */}
        {tab==='suites'&&(
          <div style={{flex:1,overflow:'hidden'}}>
            <SuitesTable filterPropCode={data.prop_code} hidePropertyFilter={true}/>
          </div>
        )}

        {/* All other tabs — scrollable padded container */}
        {tab!=='tasks'&&tab!=='contacts'&&tab!=='suites'&&(
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

            {/* DASHBOARD */}
            {tab==='dashboard'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
                  <div style={css.card}>
                    <div style={css.secTitle}>Occupancy</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:occupancy.occ_pct>=90?T.success:occupancy.occ_pct>=70?T.warn:T.danger}}>{occupancy.occ_pct}%</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>{fmtNum(occupancy.occupied_sf)} / {fmtNum(occupancy.gross_sf)} sf</div>
                    <div style={{fontSize:F.xs,color:T.text3}}>{rentRows.length} tenant{rentRows.length!==1?'s':''} · {suites.length} suite{suites.length!==1?'s':''}</div>
                  </div>
                  <div style={css.card}>
                    <div style={css.secTitle}>Monthly Rent</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:T.accent}}>{fmtMoney(occupancy.monthly_total)}</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>Current rent roll total</div>
                  </div>
                  <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('tasks')}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={css.secTitle}>Work Orders</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:openWOs>0?T.warn:T.text3}}>{openWOs}</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>open</div>
                  </div>
                  <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('tasks')}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={css.secTitle}>Issues</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:openIssues>0?T.danger:T.text3}}>{openIssues}</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>open</div>
                  </div>
                  {insurance.length>0&&(()=>{
                    const ins=insurance[0];
                    const mo=calcMoLeft(ins.expiry_date);
                    return (
                      <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('insurance')}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                        <div style={css.secTitle}>Insurance Expiry</div>
                        <div style={{fontSize:F.md,fontWeight:'600',color:moLeftColor(mo)}}>{fmtDate(ins.expiry_date)}</div>
                        <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>{ins.insurance_co||'—'}</div>
                      </div>
                    );
                  })()}
                  {agreement&&(()=>{
                    const mo=calcMoLeft(agreement.listing_expiry_date);
                    return (
                      <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('listing')}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                        <div style={css.secTitle}>Listing Expiry</div>
                        <div style={{fontSize:F.md,fontWeight:'600',color:moLeftColor(mo)}}>{fmtDate(agreement.listing_expiry_date)}</div>
                        <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>{agreement.listing_agreement_type||'—'}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TENANTS / RENT ROLL */}
            {tab==='tenants'&&(
              <div style={{flex:1,overflow:'hidden'}}>
                <TenantsList
                  filterPropCode={data.prop_code}
                  hidePropertyPills={true}
                  onSelect={t => {
                    try { sessionStorage.setItem('tenantsBackUrl', window.location.href); } catch {}
                    window.location.href = '/tenants/' + (t.podio_id ?? 'X' + t.id.slice(-6));
                  }}
                />
              </div>
            )}

            {/* LEASING PIPELINE */}
            {tab==='pipeline'&&(()=>{
              const stageColor = s => {
                if(!s) return [T.text2,T.bg3];
                if(['CLOSED-New TNT','LS - Signed','Lease'].includes(s)) return [T.success,'#1e2a1e'];
                if(['LS - Out For Sigs','LS APP','LOI'].includes(s))      return [T.accent,'#1a2e3a'];
                if(['Showing','Replied'].includes(s))                      return [T.warn,'#3d2e1a'];
                if(['CLOSED-Hang-up','Closed - Hang-up','Duplicate'].includes(s)) return [T.text2,T.bg3];
                return [T.text1,T.bg2];
              };
              const priBadge = p => {
                if(p==='Urgent') return css.badge(T.danger,'#3d1f1f');
                if(p==='High')   return css.badge(T.warn,'#3d2e1a');
                if(p==='Medium') return css.badge('#f0d060','#3d3500');
                return css.badge(T.text2,T.bg3);
              };
              const fuStyle = d => {
                if(!d) return {color:T.text3};
                const days=Math.round((new Date(d+'T00:00:00')-new Date())/(1000*60*60*24));
                if(days<0)   return {color:T.danger,fontWeight:'700'};
                if(days<=7)  return {color:T.danger};
                if(days<=30) return {color:T.warn};
                return {color:T.text1};
              };
              return (
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                    <span style={{fontSize:F.sm,color:T.text2}}>{pipeline.length} open lead{pipeline.length!==1?'s':''}</span>
                    <span style={{fontSize:F.xs,color:T.text3}}>Closed leads not shown</span>
                  </div>
                  {pipeline.length===0&&<div style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No open pipeline leads</div>}
                  {pipeline.length>0&&(
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>
                        <th style={css.th}>Prospect</th>
                        <th style={css.th}>Stage</th>
                        <th style={css.th}>Suite</th>
                        <th style={css.th}>SF Interest</th>
                        <th style={css.th}>Priority</th>
                        <th style={css.th}>Source</th>
                        <th style={css.th}>Follow Up</th>
                        <th style={css.th}>Created</th>
                      </tr></thead>
                      <tbody>
                        {pipeline.map((p,i)=>{
                          const [sc,sb]=stageColor(p.stage);
                          return (
                            <tr key={p.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                              <td style={css.td}>{p.prospect_name||'—'}</td>
                              <td style={css.td}><span style={css.badge(sc,sb)}>{p.stage||'—'}</span></td>
                              <td style={{...css.td,color:T.text2}}>{p.suite_num||'—'}</td>
                              <td style={{...css.td,textAlign:'right',color:T.text1}}>{p.size_sqft_interest?fmtNum(p.size_sqft_interest)+' sf':'—'}</td>
                              <td style={css.td}>{p.priority&&p.priority!=='???'?<span style={priBadge(p.priority)}>{p.priority}</span>:<span style={{color:T.text3}}>—</span>}</td>
                              <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{p.source&&p.source!=='???'?p.source:'—'}</td>
                              <td style={{...css.td,...fuStyle(p.follow_up_date)}}>{fmtDate(p.follow_up_date)}</td>
                              <td style={{...css.td,fontSize:F.xs,color:T.text3}}>{fmtDate(p.created_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            {/* MONTHLY REPORTS */}
            {tab==='monthly-reports'&&(
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  <th style={css.th}>Month</th>
                  <th style={css.th}>Status</th>
                  <th style={{...css.th,textAlign:'right'}}>QBO Balance</th>
                  <th style={{...css.th,textAlign:'right'}}>Distribution</th>
                  <th style={css.th}>Email Sent</th>
                  <th style={css.th}>PDFs Filed</th>
                </tr></thead>
                <tbody>
                  {monthlyReports.length===0&&<tr><td colSpan={6} style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No monthly reports</td></tr>}
                  {monthlyReports.map((r,i)=>(
                    <tr key={r.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                      <td style={css.td}>{fmtDate(r.report_date)}</td>
                      <td style={css.td}><StatusBadge status={r.status}/></td>
                      <td style={css.tdNum}>{fmtMoney(r.qbo_balance)}</td>
                      <td style={css.tdNum}>{fmtMoney(r.actual_distribution_made)}</td>
                      <td style={{...css.td,color:r.email_sent?T.success:T.text3}}>{r.email_sent?'✓':'—'}</td>
                      <td style={{...css.td,color:r.pdfs_filed?T.success:T.text3}}>{r.pdfs_filed?'✓':'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* INSURANCE */}
            {tab==='insurance'&&(()=>{
              const activeIns   = insurance.filter(i=>i.status!=='ARCHIVED');
              const archivedIns = insurance.filter(i=>i.status==='ARCHIVED');
              const daysLeft = ins => {
                if(!ins.expiry_date) return null;
                return Math.round((new Date(ins.expiry_date)-today)/(1000*60*60*24));
              };
              const insRow = (ins,i,isArchived) => (
                <tr key={ins.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                  <td style={css.td}>{ins.insurance_co||'—'}</td>
                  <td style={css.td}><StatusBadge status={ins.status}/></td>
                  <td style={{...css.td,color:ins.expiry_date&&new Date(ins.expiry_date)<today?T.danger:T.text0}}>{fmtDate(ins.expiry_date)}</td>
                  <td style={css.td}>
                    {!isArchived&&ins.status==='Policy Is Current'&&daysLeft(ins)!==null
                      ? <span style={{color:daysLeft(ins)<=30?T.danger:daysLeft(ins)<=90?T.warn:T.text1}}>{daysLeft(ins)} days</span>
                      : null}
                  </td>
                  <td style={css.tdNum}>{fmtMoney(ins.annual_premium)}</td>
                  <td style={{...css.td,color:ins.acp_named_additional_insured?T.success:T.danger}}>{ins.acp_named_additional_insured?'Yes':'No'}</td>
                </tr>
              );
              return (
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:'560px'}}>
                  <thead><tr>
                    <th style={css.th}>Insurance Co</th>
                    <th style={css.th}>Status</th>
                    <th style={css.th}>Expiry</th>
                    <th style={css.th}>Remaining</th>
                    <th style={{...css.th,textAlign:'right'}}>Annual Premium</th>
                    <th style={css.th}>ACP Named</th>
                  </tr></thead>
                  <tbody>
                    {insurance.length===0&&<tr><td colSpan={6} style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No insurance records</td></tr>}
                    {activeIns.map((ins,i)=>insRow(ins,i,false))}
                    {archivedIns.length>0&&(
                      <tr>
                        <td colSpan={6} style={{padding:'7px 10px 7px 12px',background:'#3a3f4b',borderLeft:`4px solid ${T.accent}`,borderTop:`8px solid ${T.bg1}`}}>
                          <span style={{fontSize:F.sm,fontWeight:'700',color:T.text0,textTransform:'uppercase',letterSpacing:'0.06em'}}>Archived</span>
                        </td>
                      </tr>
                    )}
                    {archivedIns.map((ins,i)=>insRow(ins,i,true))}
                  </tbody>
                </table>
                </div>
              );
            })()}

            {/* COIs */}
            {tab==='cois'&&(()=>{
              const coiStatusStyle = s => {
                if(s==='COI Current')       return css.badge(T.success,'#1e2a1e');
                if(s==='Expired')           return css.badge(T.danger,'#3d1f1f');
                if(s==='Expiring Soon')     return css.badge(T.warn,'#3d2e1a');
                if(s==='New ..Awaiting COI') return css.badge(T.accent,'#1a2e3a');
                return css.badge(T.text2,T.bg3);
              };
              const addlStyle = s => {
                if(s==='Add. Insured - Is Correct') return {color:T.success};
                if(s==='Request Sent - Waiting')    return {color:T.warn};
                if(s==='Missing'||s==='Wrong')      return {color:T.danger,fontWeight:'600'};
                return {color:T.text2};
              };
              const expiryStyle = d => {
                if(!d) return {};
                const days=Math.round((new Date(d+'T00:00:00')-new Date())/(1000*60*60*24));
                if(days<0)   return {color:'#fff',fontWeight:'700',background:'#7a0000',borderRadius:'3px',padding:'1px 5px'};
                if(days<=30) return {color:T.danger,fontWeight:'700'};
                if(days<=90) return {color:T.warn,fontWeight:'700'};
                return {};
              };
              return (
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:'620px'}}>
                  <thead><tr>
                    <th style={css.th}>Tenant</th>
                    <th style={css.th}>COI Status</th>
                    <th style={css.th}>Expiry</th>
                    <th style={css.th}>Add. Insured</th>
                    <th style={css.th}>Request</th>
                    <th style={css.th}>Insured Co</th>
                    <th style={css.th}>Follow Up</th>
                  </tr></thead>
                  <tbody>
                    {cois.length===0&&<tr><td colSpan={7} style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No COI records</td></tr>}
                    {cois.map((c,i)=>{
                      const tnt=c.tenants;
                      const href=tnt?.podio_id?`/tenants/${tnt.podio_id}`:tnt?.id?`/tenants/X${tnt.id.slice(-6)}`:null;
                      return (
                        <tr key={c.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                          <td style={css.td}>
                            {tnt&&href
                              ? <a href={href} style={{color:T.accent,textDecoration:'none',fontSize:F.sm}}
                                  onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                                  onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                                  {tnt.tenant_dba||'—'}
                                </a>
                              : <span>{tnt?.tenant_dba||'—'}</span>}
                          </td>
                          <td style={css.td}><span style={coiStatusStyle(c.coi_status)}>{c.coi_status||'—'}</span></td>
                          <td style={css.td}><span style={expiryStyle(c.expiry_date)}>{fmtDate(c.expiry_date)}</span></td>
                          <td style={{...css.td,fontSize:F.xs,...addlStyle(c.additional_insured_status)}}>{c.additional_insured_status||'—'}</td>
                          <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{c.coi_request_status||'—'}</td>
                          <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{c.insured_company||'—'}</td>
                          <td style={{...css.td,fontSize:F.xs,color:c.follow_up_date?T.warn:T.text3}}>{fmtDate(c.follow_up_date)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              );
            })()}

            {/* PROPERTY TAXES */}
            {tab==='property-taxes'&&(
              <div>
                {propTaxes.length===0&&<div style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No property tax records</div>}
                {(()=>{
                  const years=[...new Set(propTaxes.map(t=>t.year))].sort((a,b)=>b-a);
                  return years.map(year=>{
                    const rows=propTaxes.filter(t=>t.year===year);
                    const fullYr=rows.reduce((s,t)=>s+(Number(t.annual_amt)||0),0);
                    return (
                      <div key={year} style={{marginBottom:'24px'}}>
                        <div style={{display:'flex',gap:'12px',alignItems:'baseline',flexWrap:'wrap',marginTop:'16px',marginBottom:'6px',padding:'7px 10px 7px 12px',background:'#3a3f4b',borderLeft:`4px solid ${T.accent}`,borderRadius:'0 4px 4px 0'}}>
                          <span style={{fontSize:F.sm,fontWeight:'700',color:T.text0}}>{year}</span>
                          <span style={{fontSize:F.xs,color:T.text1}}>{rows.length} parcel{rows.length!==1?'s':''}</span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Full Year <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr)}</span></span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Half Yr <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr/2)}</span></span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Mo. <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr/12)}</span></span>
                        </div>
                        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',width:'100%'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',minWidth:'500px'}}>
                          <thead><tr>
                            <th style={css.th}>Parcel #</th>
                            <th style={css.th}>Who Pays</th>
                            <th style={{...css.th,textAlign:'right'}}>Annual</th>
                            <th style={css.th}>1st Half</th>
                            <th style={css.th}>2nd Half</th>
                            <th style={css.th}>Overall</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((t,i)=>(
                              <tr key={t.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                                <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{t.parcel_num||'—'}</td>
                                <td style={{...css.td,color:T.text2}}>{t.who_pays||'—'}</td>
                                <td style={css.tdNum}>{fmtMoney(t.annual_amt)}</td>
                                <td style={{...css.td,fontSize:F.xs}}>{t.first_half_status||'—'}</td>
                                <td style={{...css.td,fontSize:F.xs}}>{t.second_half_status||'—'}</td>
                                <td style={css.td}><StatusBadge status={t.paid_overall_status}/></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* PROP INFO */}
            {tab==='prop-info'&&(
              <div>
                <PropFieldRow label="Property Name">
                  <PropInlineBlur value={data.property_name||''} onSave={v=>save('property_name',v)} highlight/>
                </PropFieldRow>
                <PropFieldRow label="Prop Code" hoverable={false}>
                  <span style={{fontSize:F.base,color:T.text1,fontFamily:'monospace'}}>{data.prop_code}</span>
                </PropFieldRow>
                <PropFieldRow label="Ownership Link" hoverable={false}>
                  {data.ownership_company
                    ? <span style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline'}}
                        onClick={()=>router.push('/owners?prop='+data.prop_code)}>
                        {data.ownership_company}
                      </span>
                    : <span style={{fontSize:F.base,color:T.text3,fontStyle:'italic'}}>—</span>
                  }
                </PropFieldRow>
                <PropFieldRow label="Status">
                  <PropInlineSelect value={data.status} options={['acp-entity','active','archived']} onSave={v=>save('status',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Location">
                  <PropInlineBlur value={data.location_area||''} onSave={v=>save('location_area',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Marketing Name">
                  <PropInlineBlur value={data.property_marketing_name||''} onSave={v=>save('property_marketing_name',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Address">
                  <PropInlineBlur value={data.address||''} onSave={v=>save('address',v)}/>
                </PropFieldRow>
                <PropFieldRow label="City">
                  <PropInlineBlur value={data.city||''} onSave={v=>save('city',v)}/>
                </PropFieldRow>
                <PropFieldRow label="State">
                  <PropInlineBlur value={data.state||''} onSave={v=>save('state',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Zip">
                  <PropInlineBlur value={data.zip||''} onSave={v=>save('zip',v)}/>
                </PropFieldRow>
                <PropFieldRow label="TPT Tax %">
                  <PropInlineBlur
                    value={pctIn(data.tpt_tax_pct)}
                    type="number"
                    onSave={v=>save('tpt_tax_pct',pctOut(v))}
                    displayTransform={pctFmt}
                  />
                </PropFieldRow>
                <PropFieldRow label="Cross Streets">
                  <PropInlineBlur value={data.nearest_cross_streets||''} onSave={v=>save('nearest_cross_streets',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Zoning">
                  <PropInlineBlur value={data.zoning||''} onSave={v=>save('zoning',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Acres">
                  <PropInlineBlur value={data.acres!=null?String(data.acres):''} type="number" onSave={v=>save('acres',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Year Built">
                  <PropInlineBlur value={data.year_built!=null?String(data.year_built):''} type="number" onSave={v=>save('year_built',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Fire Sprinkled">
                  <BoolPill value={data.fire_sprinkled} onSave={v=>save('fire_sprinkled',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Fire Monitored">
                  <BoolPill value={data.fire_monitored} onSave={v=>save('fire_monitored',v)}/>
                </PropFieldRow>
                <PropFieldRow label="# of Stories">
                  <PropInlineBlur value={data.num_stories!=null?String(data.num_stories):''} type="number" onSave={v=>save('num_stories',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Standard Parking">
                  <PropInlineBlur value={data.parking_stalls_standard!=null?String(data.parking_stalls_standard):''} type="number" onSave={v=>save('parking_stalls_standard',v)}/>
                </PropFieldRow>
                <PropFieldRow label="H/C Parking">
                  <PropInlineBlur value={data.parking_stalls_hc!=null?String(data.parking_stalls_hc):''} type="number" onSave={v=>save('parking_stalls_hc',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Construction Type">
                  <PropInlineBlur value={data.construction_type||''} onSave={v=>save('construction_type',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Roof Type">
                  <PropInlineBlur value={data.roof_type||''} onSave={v=>save('roof_type',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Other Notes" topAlign>
                  <RichTextEditor value={data.other_notes||''} onSave={v=>save('other_notes',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Bank 1">
                  <PropInlineBlur value={data.bank_account_name||''} onSave={v=>save('bank_account_name',v)}/>
                </PropFieldRow>
                <PropFieldRow label="ADOR Lic. #">
                  <PropInlineBlur value={data.ador_license_num||''} onSave={v=>save('ador_license_num',v)}/>
                </PropFieldRow>
                <PropFieldRow label="APS LL Agreement">
                  <BoolPill value={data.aps_landlord_agreement} onSave={v=>save('aps_landlord_agreement',v)}/>
                </PropFieldRow>
                <PropFieldRow label="APS Notes" topAlign>
                  <RichTextEditor value={data.aps_notes||''} onSave={v=>save('aps_notes',v)}/>
                </PropFieldRow>
                <PropFieldRow label="Gross Sq Ftg">
                  <PropInlineBlur value={data.gross_sqft!=null?String(data.gross_sqft):''} type="number"
                    displayTransform={v=>v?Number(v).toLocaleString():''}
                    onSave={v=>save('gross_sqft',v?parseInt(v,10):null)}/>
                </PropFieldRow>
                <PropFieldRow label="Snow & Ice" topAlign>
                  <RichTextEditor value={data.snow_ice_instructions||''} onSave={v=>save('snow_ice_instructions',v)}/>
                </PropFieldRow>
              </div>
            )}

            {/* LISTING — management agreement from property_agreements */}
            {tab==='listing'&&(
              <div>
                {!agreement&&(
                  <div style={{background:'#3a1a00',border:`0.5px solid #c47a20`,borderRadius:'6px',padding:'16px',marginBottom:'16px',color:'#f0a040',fontSize:F.base,fontWeight:'600'}}>
                    ⚠ No listing agreement on record for this property.
                  </div>
                )}
                {agreement&&(()=>{
                  const agr=agreement;
                  const boxStyle={...css.card,padding:'16px',marginBottom:'16px'};
                  return (
                    <div>
                      {/* BOX 1: STATUS */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>Status</div>
                        <PropFieldRow label="Property" hoverable={false}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{fontSize:F.base,color:T.text0,fontWeight:'600'}}>{data.property_name||data.prop_code}</span>
                            <span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{data.prop_code}</span>
                          </div>
                        </PropFieldRow>
                        <PropFieldRow label="Prop Code" hoverable={false}>
                          <span style={{fontSize:F.base,color:T.text1,fontFamily:'monospace'}}>{agr.prop_code}</span>
                        </PropFieldRow>
                        <PropFieldRow label="LL Company" hoverable={false}>
                          {propOwners.length>0
                            ? propOwners.map(o=>(
                                <span key={o.id}
                                  style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline',marginRight:'8px'}}
                                  onClick={()=>router.push('/owners/'+(o.podio_id??'X'+o.id.slice(-6)))}>
                                  {o.company_dba||'(no name)'}
                                </span>
                              ))
                            : <span style={{fontSize:F.base,color:T.text3}}>—</span>
                          }
                        </PropFieldRow>
                        <PropFieldRow label="LL Contact(s)" hoverable={false}>
                          {propOwnerContacts.length>0
                            ? propOwnerContacts.map(c=>(
                                <span key={c.id}
                                  style={{fontSize:F.base,color:T.accent,cursor:'pointer',textDecoration:'underline',marginRight:'8px'}}
                                  onClick={()=>router.push('/contacts/'+(c.podio_id??'X'+c.id.slice(-6)))}>
                                  {c.full_name}
                                </span>
                              ))
                            : <span style={{fontSize:F.base,color:T.text3}}>—</span>
                          }
                        </PropFieldRow>
                        <PropFieldRow label="Agreement Type">
                          <PropInlineSelect value={agr.listing_agreement_type} options={['PM+LSG']} onSave={v=>saveAgreement('listing_agreement_type',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Listing Expiry">
                          <ListingExpiryField value={agr.listing_expiry_date||''} onSave={v=>saveAgreement('listing_expiry_date',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="ACP Listing Status">
                          <PropInlineSelect value={agr.acp_listing_status} options={['Active','Expired']} onSave={v=>saveAgreement('acp_listing_status',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="General Notes" topAlign>
                          <RichTextEditor value={agr.general_listing_notes||''} onSave={v=>saveAgreement('general_listing_notes',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 2: PM FEE INFO */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>PM Fee Info</div>
                        <PropFieldRow label="PM Fee Type">
                          <PropInlineSelect value={agr.pm_fee_type} options={["% of Base Rent - But 'No Less Than'...","% of Gross Rent - But 'No Less Than'...",'Fixed Mo. $ Amount']} onSave={v=>saveAgreement('pm_fee_type',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="PM Fee %">
                          <PropInlineBlur value={pctIn(agr.pm_fee_pct)} type="number" onSave={v=>saveAgreement('pm_fee_pct',pctOut(v))} displayTransform={pctFmt}/>
                        </PropFieldRow>
                        <PropFieldRow label="But No Less Than">
                          <PropInlineBlur value={agr.pm_fee_no_less_than!=null?String(agr.pm_fee_no_less_than):''} type="number" onSave={v=>saveAgreement('pm_fee_no_less_than',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Fixed Mo. $ Amount">
                          <PropInlineBlur value={agr.pm_fee_fixed_amt!=null?String(agr.pm_fee_fixed_amt):''} type="number" onSave={v=>saveAgreement('pm_fee_fixed_amt',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="How Paid?">
                          <PropInlineSelect value={agr.pm_fee_how_paid} options={['EFT']} onSave={v=>saveAgreement('pm_fee_how_paid',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Current Recurring EFT">
                          <PropInlineBlur value={agr.pm_fee_current_eft_amt!=null?String(agr.pm_fee_current_eft_amt):''} type="number" onSave={v=>saveAgreement('pm_fee_current_eft_amt',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Current Recurring QBO">
                          <PropInlineBlur value={agr.pm_fee_current_qbo_amt!=null?String(agr.pm_fee_current_qbo_amt):''} type="number" onSave={v=>saveAgreement('pm_fee_current_qbo_amt',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="PM Fee Notes" topAlign>
                          <RichTextEditor value={agr.pm_fee_notes||''} onSave={v=>saveAgreement('pm_fee_notes',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 3: LL EXPENSE APPROVAL THRESHOLD */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>Landlord Expense Approval Threshold</div>
                        <PropFieldRow label="LL Approval for Exp. Over">
                          <PropInlineBlur value={agr.ll_approval_over_amt!=null?String(agr.ll_approval_over_amt):''} type="number" onSave={v=>saveAgreement('ll_approval_over_amt',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Req. Min. Bank Balance">
                          <PropInlineBlur value={agr.min_bank_balance!=null?String(agr.min_bank_balance):''} type="number" onSave={v=>saveAgreement('min_bank_balance',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Reserve Op. Funds">
                          <PropInlineBlur value={agr.reserve_op_funds!=null?String(agr.reserve_op_funds):''} type="number" onSave={v=>saveAgreement('reserve_op_funds',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Bank Acct Type">
                          <PropInlineBlur value={agr.bank_acct_type||''} onSave={v=>saveAgreement('bank_acct_type',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 4: PM OWNER REPORTS */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>PM Owner Reports</div>
                        <PropFieldRow label="Internal Notes" topAlign>
                          <RichTextEditor value={agr.pm_reports_notes||''} onSave={v=>saveAgreement('pm_reports_notes',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Email To">
                          <PropInlineBlur value={agr.pm_reports_email_to||''} onSave={v=>saveAgreement('pm_reports_email_to',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Current Distribution">
                          <PropInlineSelect value={agr.distribution_type} options={['Calculated Monthly','Fixed $ Amt (see below)','Gets None']} onSave={v=>saveAgreement('distribution_type',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Distribution Fixed Amt">
                          <PropInlineBlur value={agr.distribution_fixed_amt!=null?String(agr.distribution_fixed_amt):''} type="number" onSave={v=>saveAgreement('distribution_fixed_amt',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Distribution Notes" topAlign>
                          <RichTextEditor value={agr.distribution_notes||''} onSave={v=>saveAgreement('distribution_notes',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 5: NEW LEASING COMMISSIONS */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>New Leasing Commissions</div>
                        <PropFieldRow label="Leasing Fee Type" topAlign>
                          <PropInlineBlur value={agr.leasing_fee_type||''} onSave={v=>saveAgreement('leasing_fee_type',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Leasing Fee %">
                          <PropInlineBlur value={pctIn(agr.leasing_fee_pct)} type="number" onSave={v=>saveAgreement('leasing_fee_pct',pctOut(v))} displayTransform={pctFmt}/>
                        </PropFieldRow>
                        <PropFieldRow label="Leasing Fee Notes" topAlign>
                          <RichTextEditor value={agr.leasing_fee_notes||''} onSave={v=>saveAgreement('leasing_fee_notes',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 6: LEASE RENEWAL COMMISSION */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>Lease Renewal Commission</div>
                        <PropFieldRow label="Lease Renewal Type" topAlign>
                          <PropInlineBlur value={agr.lease_renewal_type||''} onSave={v=>saveAgreement('lease_renewal_type',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="Lease Renewal Fee %">
                          <PropInlineBlur value={pctIn(agr.lease_renewal_fee_pct)} type="number" onSave={v=>saveAgreement('lease_renewal_fee_pct',pctOut(v))} displayTransform={pctFmt}/>
                        </PropFieldRow>
                        <PropFieldRow label="Lease Renewal Notes" topAlign>
                          <RichTextEditor value={agr.lease_renewal_fee_notes||''} onSave={v=>saveAgreement('lease_renewal_fee_notes',v)}/>
                        </PropFieldRow>
                      </div>

                      {/* BOX 7: OTHER FEES */}
                      <div style={boxStyle}>
                        <div style={css.secTitle}>Other Fees</div>
                        <PropFieldRow label="Other Fees - Hourly Rate">
                          <PropInlineBlur value={agr.other_fees_hourly_rate!=null?String(agr.other_fees_hourly_rate):''} type="number" onSave={v=>saveAgreement('other_fees_hourly_rate',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Project Mgmt - Hourly">
                          <PropInlineBlur value={agr.project_mgmt_hourly_rate!=null?String(agr.project_mgmt_hourly_rate):''} type="number" onSave={v=>saveAgreement('project_mgmt_hourly_rate',v)} displayTransform={v=>v?fmtMoney(v):''}/>
                        </PropFieldRow>
                        <PropFieldRow label="Asset Improv. - Fee %">
                          <PropInlineBlur value={pctIn(agr.asset_improv_fee_pct)} type="number" onSave={v=>saveAgreement('asset_improv_fee_pct',pctOut(v))} displayTransform={pctFmt}/>
                        </PropFieldRow>
                        <PropFieldRow label="Asset Improv. - Term (mo.)">
                          <PropInlineBlur value={agr.asset_improv_term_months!=null?String(agr.asset_improv_term_months):''} type="number" onSave={v=>saveAgreement('asset_improv_term_months',v)}/>
                        </PropFieldRow>
                        <PropFieldRow label="TNT Late Fee %">
                          <PropInlineBlur value={pctIn(agr.tnt_late_fee_pct)} type="number" onSave={v=>saveAgreement('tnt_late_fee_pct',pctOut(v))} displayTransform={pctFmt}/>
                        </PropFieldRow>
                        <PropFieldRow label="Other Fees Notes" topAlign>
                          <RichTextEditor value={agr.other_fees_notes||''} onSave={v=>saveAgreement('other_fees_notes',v)}/>
                        </PropFieldRow>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CAMs — placeholder */}
            {tab==='cams'&&(
              <div style={{...css.card,textAlign:'center',padding:'32px'}}>
                <i className="ti ti-calculator" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
                <div style={{fontSize:F.sm,color:T.text3}}>CAM reconciliation — coming soon</div>
              </div>
            )}

            {/* INSPECTIONS — placeholder */}
            {tab==='inspections'&&(
              <div style={{...css.card,textAlign:'center',padding:'32px'}}>
                <i className="ti ti-clipboard-check" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
                <div style={{fontSize:F.sm,color:T.text3}}>Property inspections — coming soon</div>
              </div>
            )}

            {/* DOCUMENTS */}
            {tab==='documents'&&(
              <div style={css.card}>
                <div style={css.secTitle}>Google Drive Folders</div>
                {[
                  ['Root Folder','gdrive_root_folder_id'],
                  ['Tenants Folder','gdrive_tenants_folder_id'],
                  ['Photos Folder','gdrive_photos_folder_id'],
                  ['Work Orders Folder','gdrive_work_orders_folder_id'],
                  ['Reports Folder','gdrive_reports_folder_id'],
                  ['Issues Folder','gdrive_issues_folder_id'],
                  ['Insurance Folder','gdrive_insurance_folder_id'],
                  ['Archives Folder','gdrive_archives_folder_id'],
                ].map(([label,field])=>(
                  <div key={field} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                    <span style={{fontSize:F.sm,color:T.text2,width:'160px',flexShrink:0}}>{label}</span>
                    {data[field]
                      ? <a href={`https://drive.google.com/drive/folders/${data[field]}`} target="_blank" rel="noreferrer"
                          style={{fontSize:F.sm,color:T.accent,textDecoration:'none'}}>Open in Drive ↗</a>
                      : <span style={{fontSize:F.sm,color:T.text3,fontStyle:'italic'}}>not linked</span>
                    }
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
        <div className="mobile-hidden" style={{display:'flex',height:'100%'}}>
          <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={startRightResize}/>
        </div>
      </div>
    </div>
  );
};

// ── Properties List ───────────────────────────────────────────────────────────
export const PropertiesView = () => {
  const [properties,setProperties] = useState([]);
  const [agreementMap,setAgreementMap] = useState({});
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const [filter,setFilter] = useState('active');
  const [search,setSearch] = useState('');

  const handleSelectProp = useCallback((p) => {
    window.history.pushState({ propId: p.id }, '', `/properties/${p.prop_code}`);
    setSelected(p);
  }, []);

  const handleBackProp = useCallback(() => {
    if (window.history.state?.propId) history.replaceState({}, '');
    setSelected(null);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(()=>{
    setLoading(true);
    let params = 'select=*';
    if(filter!=='all') params+=`&status=eq.${filter}`;
    params+='&order=prop_code.asc';
    sbFetch('properties',params).then(d=>{setProperties(d);setLoading(false);}).catch(()=>setLoading(false));
  },[filter]);

  useEffect(()=>{
    sbFetch('property_agreements','select=prop_code,listing_expiry_date&order=listing_expiry_date.desc')
      .then(rows=>{
        const map={};
        rows.forEach(r=>{ if(r.prop_code && !map[r.prop_code]) map[r.prop_code]=r.listing_expiry_date; });
        setAgreementMap(map);
      }).catch(()=>{});
  },[]);

  const daysUntilExpiry = d => {
    if(!d) return null;
    const dt=new Date(d+'T00:00:00'); const now=new Date(); now.setHours(0,0,0,0);
    return Math.round((dt-now)/(1000*60*60*24));
  };

  const expiryStyle = d => {
    const days=daysUntilExpiry(d);
    if(days===null) return {color:T.text3};
    if(days<0)   return {color:'#fff',fontWeight:'700',background:'#7a0000',padding:'1px 5px',borderRadius:'3px',display:'inline-block'};
    if(days<=30)  return {color:T.danger, fontWeight:'700'};
    if(days<=60)  return {color:'#d4924a',fontWeight:'700'};
    if(days<=90)  return {color:'#f0d060',fontWeight:'700'};
    if(days<=120) return {color:T.success,fontWeight:'700'};
    return {color:T.text1};
  };

  const propertiesWithExpiry = properties.map(p=>({...p,_expires:agreementMap[p.prop_code]||null}));
  const { sorted, Th } = useSortable(propertiesWithExpiry, 'prop_code', 'asc');

  const filtered = sorted.filter(p=>{
    if(!search)return true;
    const q=search.toLowerCase();
    return (p.prop_code||'').toLowerCase().includes(q)||(p.property_name||'').toLowerCase().includes(q)||(p.city||'').toLowerCase().includes(q);
  });

  if(selected) return <PropertyDetail property={selected} onBack={handleBackProp} onUpdate={u=>setSelected(u)}/>;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <BuildingOffice size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Properties</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length} shown</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['active','archived','all'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                style={{padding:'4px 12px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:filter===s?T.bg3:'transparent',color:filter===s?T.text0:T.text2,
                  fontWeight:filter===s?'600':'400',textTransform:'capitalize'}}>
                {s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur(); } }}
            placeholder="Search properties…"
            style={{flex:1,background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading…</div>}
        {!loading&&(<>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'7%'}}/>
              <col style={{width:'26%'}}/>
              <col style={{width:'23%'}}/>
              <col style={{width:'13%'}}/>
              <col style={{width:'10%'}}/>
              <col style={{width:'12%'}}/>
              <col style={{width:'9%'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="prop_code"      label="Prop"/>
                <Th c="property_name"  label="Property Name"/>
                <Th c="address"        label="Address"/>
                <Th c="city"           label="City"/>
                <Th c="status"         label="Status"/>
                <Th c="_expires"       label="Expires"/>
                <Th c="gross_sqft"     label="Sq Ftg" align="right"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={7} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No properties match</td></tr>}
              {filtered.map((p,i)=>{
                const expStyle=expiryStyle(p._expires);
                return (
                  <tr key={p.id}
                    onClick={e=>{
                      if(e.target.closest('a'))return;
                      if(e.ctrlKey||e.metaKey){window.open(`/properties/${p.podio_id??'X'+p.id.slice(-6)}`, '_blank');}
                      else{
                        const navL=filtered.map(r=>({id:r.id,prop_code:r.prop_code}));
                        sessionStorage.setItem('propertiesNavList',JSON.stringify(navL));
                        sessionStorage.setItem('propertiesNavIndex',String(filtered.findIndex(r=>r.id===p.id)));
                        handleSelectProp(p);
                      }
                    }}
                    style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                    <td style={{...css.td,color:T.accent,fontWeight:'600'}}>
                      <a href={`/properties/${p.podio_id??'X'+p.id.slice(-6)}`}
                        onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();handleSelectProp(p);}}}
                        style={{color:'inherit',textDecoration:'none'}}>
                        {p.prop_code}
                      </a>
                    </td>
                    <td style={css.td}>{p.property_name||'—'}</td>
                    <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{p.address||'—'}</td>
                    <td style={{...css.td,color:T.text2}}>{p.city||'—'}</td>
                    <td style={css.td}><StatusBadge status={p.status}/></td>
                    <td style={{...css.td}}>
                      {p._expires
                        ? <span style={expStyle}>{fmtDate(p._expires)}</span>
                        : <span style={{color:T.text3}}>—</span>}
                    </td>
                    <td style={css.tdNum}>{fmtNum(p.gross_sqft)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="crm-mobile-cards">
            {filtered.map((p,i) => (
              <div key={p.id}
                onClick={e => {
                  if(e.target.closest('a')) return;
                  const navL = filtered.map(r => ({id:r.id, prop_code:r.prop_code}));
                  sessionStorage.setItem('propertiesNavList', JSON.stringify(navL));
                  sessionStorage.setItem('propertiesNavIndex', String(filtered.findIndex(r => r.id === p.id)));
                  handleSelectProp(p);
                }}
                style={{padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', background:'transparent'}}
                onTouchStart={e => e.currentTarget.style.background = T.bg2}
                onTouchEnd={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                  <span style={{fontSize:F.sm, fontWeight:'700', color:T.accent}}>{p.prop_code}</span>
                  <StatusBadge status={p.status}/>
                  {p._expires && (
                    <span style={{...expiryStyle(p._expires), fontSize:F.xs, marginLeft:'auto'}}>{fmtDate(p._expires)}</span>
                  )}
                </div>
                <div style={{fontSize:F.base, fontWeight:'600', color:T.text0, marginBottom:'2px'}}>{p.property_name||'—'}</div>
                <div style={{fontSize:F.xs, color:T.text2}}>{[p.address, p.city].filter(Boolean).join(', ')||'—'}</div>
                {p.gross_sqft && (
                  <div style={{fontSize:F.xs, color:T.text3, marginTop:'2px'}}>{fmtNum(p.gross_sqft)} sf</div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{padding:'32px', textAlign:'center', color:T.text3}}>No properties match</div>
            )}
          </div>
        </>)}
      </div>
    </div>
  );
};

// ── Tenant Detail ─────────────────────────────────────────────────────────────
const TenantDetail = ({ tenant, onBack, onUpdate }) => {
  const [tab,setTab] = useState('info');
  const [data,setData] = useState(tenant);
  const [rightCollapsed,setRightCollapsed] = useState(true);
  const [rightWidth,setRightWidth] = useState(280);
  const resizingRight = useRef(false);

  const startRightResize = useCallback((e)=>{
    resizingRight.current=true;
    const startX=e.clientX,startW=rightWidth;
    const onMove=me=>{if(!resizingRight.current)return;setRightWidth(Math.max(180,Math.min(500,startW-(me.clientX-startX))));};
    const onUp=()=>{resizingRight.current=false;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
  },[rightWidth]);

  const save = async (field,val) => {
    await sbPatch('tenants',data.id,{[field]:val||null});
    const updated={...data,[field]:val};
    setData(updated);onUpdate?.(updated);
  };

  const daysUntil = d => {
    if(!d)return null;
    return Math.round((new Date(d)-today)/(1000*60*60*24));
  };
  const exp = daysUntil(data.lease_ends);

  const TABS = ['Info','Lease','Contact','Notes'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Tenants
          </button>
          <StatusBadge status={data.tenant_status}/>
          <StatusBadge status={data.lease_status}/>
          {exp!==null&&(
            <span style={{fontSize:F.xs,padding:'2px 7px',borderRadius:'3px',background:exp<60?'#3d1f1f':exp<180?'#3d2e1a':'#1e2a1e',color:exp<60?T.danger:exp<180?T.warn:T.success}}>
              {exp<0?`${Math.abs(exp)}d overdue`:`${exp}d to exp`}
            </span>
          )}
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{data.tenant_dba}</div>
        <div style={{fontSize:F.sm,color:T.text2}}>{data.prop_code} · Suite {data.suite_num||'—'} · {fmtNum(data.sqft)} sf</div>
      </div>
      <div style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t.toLowerCase())}
            style={{background:'transparent',border:'none',padding:'6px 12px',fontSize:F.sm,cursor:'pointer',borderRadius:'4px 4px 0 0',
              color:tab===t.toLowerCase()?T.accent:T.text1,
              borderBottom:tab===t.toLowerCase()?`2px solid ${T.accent}`:'2px solid transparent',
              fontWeight:tab===t.toLowerCase()?'600':'400'}}>
            {t}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

          {tab==='info'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Tenant Info</div>
                <EditableField label="Tenant DBA" value={data.tenant_dba} onSave={v=>save('tenant_dba',v)}/>
                <EditableField label="Entity Name" value={data.entity_name} onSave={v=>save('entity_name',v)}/>
                <EditableField label="Entity Type" value={data.entity_type} onSave={v=>save('entity_type',v)}/>
                <EditableField label="Entity State" value={data.entity_state} onSave={v=>save('entity_state',v)}/>
                <EditableField label="Tenant Use" value={data.tenant_use} onSave={v=>save('tenant_use',v)}/>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Suite & Property</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Property</div>
                  <div style={{fontSize:F.base,color:T.accent,fontWeight:'600',padding:'3px 5px'}}>{data.prop_code}</div>
                </div>
                <EditableField label="Suite #" value={data.suite_num} onSave={v=>save('suite_num',v)}/>
                <EditableField label="Sq Ft" value={data.sqft} onSave={v=>save('sqft',v)} type="number"/>
                <EditableField label="Security Deposit" value={data.security_deposit} onSave={v=>save('security_deposit',v)} type="number"/>
                <EditableField label="NNN Prorata %" value={data.nnn_prorata_share_pct} onSave={v=>save('nnn_prorata_share_pct',v)} type="number"/>
              </div>
            </div>
          )}

          {tab==='lease'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Lease Dates</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Lease Start</div>
                  <div style={{fontSize:F.base,color:T.text0,padding:'3px 5px'}}>{fmtDate(data.lease_starts)}</div>
                </div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Lease End</div>
                  <div style={{fontSize:F.base,color:exp!==null&&exp<60?T.danger:exp!==null&&exp<180?T.warn:T.text0,padding:'3px 5px',fontWeight:'600'}}>
                    {fmtDate(data.lease_ends)}{exp!==null&&<span style={{fontSize:F.xs,marginLeft:'8px',fontWeight:'400',color:T.text2}}>{exp<0?`(${Math.abs(exp)}d overdue)`:`(${exp}d)`}</span>}
                  </div>
                </div>
                <EditableField label="Term (months)" value={data.lease_term_months} onSave={v=>save('lease_term_months',v)} type="number"/>
                <EditableField label="Amendment #" value={data.amendment_num} onSave={v=>save('amendment_num',v)} type="number"/>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Lease Terms</div>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>Lease Type</div>
                  <div style={{fontSize:F.base,color:T.text0,padding:'3px 5px'}}>{data.lease_type||'—'}</div>
                </div>
                <EditableField label="Rent Due Day" value={data.day_rent_due} onSave={v=>save('day_rent_due',v)} type="number"/>
                <EditableField label="Late Fee %" value={data.late_fee_pct} onSave={v=>save('late_fee_pct',v)} type="number"/>
                <EditableField label="Pays Rent How" value={data.pays_rent_how} onSave={v=>save('pays_rent_how',v)}/>
                <div style={{marginBottom:'8px'}}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>TPT Exempt</div>
                  <span style={{fontSize:F.sm,color:data.tpt_tax_exempt?T.success:T.text2}}>{data.tpt_tax_exempt?'Yes — Exempt':'No'}</span>
                </div>
              </div>
              <div style={{...css.card,gridColumn:'1 / -1'}}>
                <div style={css.secTitle}>Lease Notes</div>
                <EditableField label="" value={data.lease_notes} onSave={v=>save('lease_notes',v)} type="textarea"/>
              </div>
            </div>
          )}

          {tab==='contact'&&(
            <div style={css.card}>
              <div style={css.secTitle}>Contact Info</div>
              <EditableField label="Main Phone" value={data.main_phone} onSave={v=>save('main_phone',v)}/>
              <EditableField label="Address" value={data.address} onSave={v=>save('address',v)}/>
              <EditableField label="City" value={data.city} onSave={v=>save('city',v)}/>
              <EditableField label="State" value={data.state} onSave={v=>save('state',v)}/>
              <EditableField label="Zip" value={data.zip} onSave={v=>save('zip',v)}/>
              <EditableField label="Entity Signature Block" value={data.entity_sig_block} onSave={v=>save('entity_sig_block',v)} type="textarea"/>
            </div>
          )}

          {tab==='notes'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div style={css.card}>
                <div style={css.secTitle}>Company Notes</div>
                <EditableField label="" value={data.company_notes} onSave={v=>save('company_notes',v)} type="textarea"/>
              </div>
              <div style={css.card}>
                <div style={css.secTitle}>Future Lease Change Notes</div>
                <EditableField label="" value={data.future_lease_change_notes} onSave={v=>save('future_lease_change_notes',v)} type="textarea"/>
              </div>
            </div>
          )}

        </div>
        <div className="mobile-hidden" style={{display:'flex',height:'100%'}}>
          <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={startRightResize}/>
        </div>
      </div>
    </div>
  );
};

// ── Tenants View ──────────────────────────────────────────────────────────────
const TenantsView = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    sbFetch('tenants', 'select=*&order=tenant_dba.asc')
      .then(d => { setTenants(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (selected) return <TenantDetail tenant={selected} onBack={() => setSelected(null)} onUpdate={u => setSelected(u)}/>;

  return (
    <TenantsList
      tenants={tenants}
      loading={loading}
      error={null}
      onSelect={t => setSelected(t)}
    />
  );
};

// ── Home / Morning Briefing ───────────────────────────────────────────────────
const HomeView = () => {
  const [stats,setStats] = useState({properties:0,suites:0,tenants:0,workOrders:0});
  useEffect(()=>{
    sbFetch('properties','select=id&status=eq.active').then(d=>setStats(s=>({...s,properties:d.length}))).catch(()=>{});
    sbFetch('suites','select=id').then(d=>setStats(s=>({...s,suites:d.length}))).catch(()=>{});
    sbFetch('tenants','select=id&tenant_status=eq.Active').then(d=>setStats(s=>({...s,tenants:d.length}))).catch(()=>{});
    sbFetch('work_orders','select=id&status=eq.Open').then(d=>setStats(s=>({...s,workOrders:d.length}))).catch(()=>{});
  },[]);
  return (
    <div style={{padding:'20px',overflowY:'auto',height:'100%'}}>
      <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,marginBottom:'16px'}}>Good morning, Scott.</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          ['Active Properties',stats.properties,T.accent,'ti-building-store'],
          ['Suites',stats.suites,T.purple,'ti-door'],
          ['Active Tenants',stats.tenants,T.success,'ti-users'],
          ['Open Work Orders',stats.workOrders,stats.workOrders>10?T.warn:T.text1,'ti-tool'],
        ].map(([label,val,color,icon])=>(
          <div key={label} style={{...css.card,display:'flex',alignItems:'center',gap:'12px'}}>
            <i className={`ti ${icon}`} style={{fontSize:'22px',color,flexShrink:0}} aria-hidden="true"></i>
            <div>
              <div style={{fontSize:F.xl,fontWeight:'700',color}}>{val}</div>
              <div style={{fontSize:F.xs,color:T.text2,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
        <WeatherCard city="Sedona AZ" lat={34.8697} lon={-111.7610} url="https://forecast.weather.gov/MapClick.php?CityName=Sedona&state=AZ"/>
        <WeatherCard city="Olympia WA" lat={47.0379} lon={-122.9007} url="https://forecast.weather.gov/MapClick.php?CityName=Olympia&state=WA"/>
      </div>
      <div style={{...css.card,color:T.text2,fontSize:F.sm,fontStyle:'italic'}}>
        Urgent items, recent activity, and leasing pipeline will populate here as agents are activated in Phase 4.
      </div>
    </div>
  );
};

// ── Leasing Pipeline Portfolio View ──────────────────────────────────────────
const PIPELINE_ACTIVE_STAGES = ['Replied','Showing','LS APP','LOI','LS - Out For Sigs','LS - Signed','CLOSED-New TNT','Lease'];

const LeasingPipelineView = () => {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [stageGroup, setGroup]  = useState('Active');
  const [propFilter, setProp]   = useState('All');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    setLoading(true);
    sbFetch('leasing_pipeline', 'select=id,prop_code,prospect_name,stage,priority,suite_num,size_sqft_interest,source,follow_up_date,created_at&status=eq.Open&order=follow_up_date.asc.nullslast,created_at.desc')
      .then(d => { setRows(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const props = [...new Set(rows.map(r => r.prop_code).filter(p => p && !p.includes('?') && !p.includes(';')))].sort();
  const STAGE_GROUPS = ['Active', 'All', 'Untouched', 'Showing+'];

  const stageFilter = r => {
    if (stageGroup === 'All')       return true;
    if (stageGroup === 'Untouched') return r.stage === 'Untouched';
    if (stageGroup === 'Showing+')  return ['Showing','LS APP','LOI','LS - Out For Sigs','LS - Signed'].includes(r.stage);
    return PIPELINE_ACTIVE_STAGES.includes(r.stage);
  };

  const filtered = rows.filter(r => {
    if (!stageFilter(r)) return false;
    if (propFilter !== 'All') {
      if (r.prop_code !== propFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!(r.prospect_name||'').toLowerCase().includes(q) && !(r.prop_code||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const { sorted, Th } = useSortable(filtered, 'follow_up_date', 'asc');

  const stageColor = s => {
    if (['CLOSED-New TNT','LS - Signed','Lease'].includes(s)) return css.badge(T.success,'#1e2a1e');
    if (['LS - Out For Sigs','LS APP','LOI'].includes(s))      return css.badge(T.accent,'#1a2e3a');
    if (['Showing','Replied'].includes(s))                      return css.badge(T.warn,'#3d2e1a');
    return css.badge(T.text2,T.bg3);
  };
  const priBadge = p => {
    if (p === 'Urgent') return css.badge(T.danger,'#3d1f1f');
    if (p === 'High')   return css.badge(T.warn,'#3d2e1a');
    if (p === 'Medium') return css.badge('#f0d060','#3d3500');
    return null;
  };
  const fuStyle = d => {
    if (!d) return { color:T.text3 };
    const days = Math.round((new Date(d+'T00:00:00') - new Date()) / (1000*60*60*24));
    if (days < 0)   return { color:T.danger, fontWeight:'700' };
    if (days <= 7)  return { color:T.danger };
    if (days <= 30) return { color:T.warn };
    return { color:T.text1 };
  };

  const counts = { total: rows.length, shown: sorted.length };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px 8px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Leasing Pipeline</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{counts.shown} shown · {counts.total} open total</span>
        </div>
        {/* Stage group filter */}
        <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
          {STAGE_GROUPS.map(g => (
            <button key={g} onClick={() => setGroup(g)}
              style={{padding:'3px 12px',borderRadius:'4px',border:`0.5px solid ${stageGroup===g?T.accent:T.border}`,cursor:'pointer',fontSize:F.xs,
                background:stageGroup===g?'#1a2e3a':'transparent',color:stageGroup===g?T.accent:T.text2,fontWeight:stageGroup===g?'600':'400'}}>
              {g}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search prospect, prop…"
            style={{marginLeft:'auto',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'3px 10px',color:T.text0,fontSize:F.xs,outline:'none',minWidth:'160px'}}/>
        </div>
        {/* Property filter */}
        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
          {['All',...props].map(p => (
            <button key={p} onClick={() => setProp(p)}
              style={{padding:'2px 8px',borderRadius:'3px',border:`0.5px solid ${propFilter===p?T.accent:T.border}`,cursor:'pointer',fontSize:F.xs,
                background:propFilter===p?'#1a2e3a':'transparent',color:propFilter===p?T.accent:T.text2,fontWeight:propFilter===p?'600':'400',whiteSpace:'nowrap'}}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading…</div>}
        {!loading && (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="prop_code"          label="Prop"/>
                <Th c="prospect_name"      label="Prospect"/>
                <Th c="stage"              label="Stage"/>
                <Th c="suite_num"          label="Suite"/>
                <Th c="size_sqft_interest" label="SF Interest" align="right"/>
                <Th c="priority"           label="Priority"/>
                <Th c="source"             label="Source"/>
                <Th c="follow_up_date"     label="Follow Up"/>
                <Th c="created_at"         label="Created"/>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={9} style={{...css.td,textAlign:'center',color:T.text3,padding:'32px'}}>No leads match</td></tr>}
              {sorted.map((p, i) => {
                const pb = p.priority && p.priority !== '???' ? priBadge(p.priority) : null;
                return (
                  <tr key={p.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                    <td style={{...css.td,color:T.accent,fontWeight:'600',whiteSpace:'nowrap'}}>{p.prop_code&&!p.prop_code.includes('?')?p.prop_code:<span style={{color:T.text3}}>—</span>}</td>
                    <td style={css.td}>{p.prospect_name||<span style={{color:T.text3}}>—</span>}</td>
                    <td style={css.td}><span style={stageColor(p.stage)}>{p.stage||'—'}</span></td>
                    <td style={{...css.td,color:T.text2}}>{p.suite_num||'—'}</td>
                    <td style={{...css.tdNum,color:T.text1}}>{p.size_sqft_interest?fmtNum(p.size_sqft_interest)+' sf':'—'}</td>
                    <td style={css.td}>{pb?<span style={pb}>{p.priority}</span>:<span style={{color:T.text3,fontSize:F.xs}}>—</span>}</td>
                    <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{p.source&&!p.source.includes('?')?p.source:'—'}</td>
                    <td style={{...css.td,...fuStyle(p.follow_up_date)}}>{fmtDate(p.follow_up_date)}</td>
                    <td style={{...css.td,fontSize:F.xs,color:T.text3}}>{fmtDate(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Tenant COIs Portfolio View ────────────────────────────────────────────────
const TntCoisView = () => {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('All');
  const [propFilter, setProp]     = useState('All');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    setLoading(true);
    sbFetch('tnt_cois', 'select=*,tenants!tnt_cois_tenant_id_fkey(id,tenant_dba,podio_id)&order=expiry_date.asc')
      .then(d => { setRows(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const props = [...new Set(rows.map(r => r.prop_code).filter(Boolean))].sort();
  const STATUSES = ['All', 'COI Current', 'Expiring Soon', 'Expired', 'New ..Awaiting COI'];

  const filtered = rows.filter(r => {
    if (statusFilter !== 'All' && r.coi_status !== statusFilter) return false;
    if (propFilter !== 'All' && r.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const tname = (r.tenants?.tenant_dba || '').toLowerCase();
      if (!tname.includes(q) && !(r.prop_code||'').toLowerCase().includes(q) && !(r.insured_company||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const withName = filtered.map(r => ({ ...r, _tenant_dba: r.tenants?.tenant_dba || '' }));
  const { sorted, Th } = useSortable(withName, 'expiry_date', 'asc');

  const coiBadge = s => {
    if (s === 'COI Current')        return css.badge(T.success,'#1e2a1e');
    if (s === 'Expired')            return css.badge(T.danger,'#3d1f1f');
    if (s === 'Expiring Soon')      return css.badge(T.warn,'#3d2e1a');
    if (s === 'New ..Awaiting COI') return css.badge(T.accent,'#1a2e3a');
    return css.badge(T.text2,T.bg3);
  };
  const addlStyle = s => {
    if (s === 'Add. Insured - Is Correct') return { color:T.success };
    if (s === 'Request Sent - Waiting')    return { color:T.warn };
    if (s === 'Missing' || s === 'Wrong')  return { color:T.danger, fontWeight:'600' };
    return { color:T.text2 };
  };
  const expiryStyle = d => {
    if (!d) return {};
    const days = Math.round((new Date(d+'T00:00:00') - new Date()) / (1000*60*60*24));
    if (days < 0)   return { color:'#fff', fontWeight:'700', background:'#7a0000', borderRadius:'3px', padding:'1px 5px' };
    if (days <= 30) return { color:T.danger, fontWeight:'700' };
    if (days <= 90) return { color:T.warn, fontWeight:'700' };
    return {};
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px 8px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Tenant COIs</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length} of {rows.length}</span>
        </div>
        {/* Status filter */}
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{padding:'3px 10px',borderRadius:'4px',border:`0.5px solid ${statusFilter===s?T.accent:T.border}`,cursor:'pointer',fontSize:F.xs,
                background:statusFilter===s?'#1a2e3a':'transparent',color:statusFilter===s?T.accent:T.text2,fontWeight:statusFilter===s?'600':'400'}}>
              {s}
            </button>
          ))}
        </div>
        {/* Property filter + search */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'4px',flexWrap:'wrap',flex:1}}>
            {['All',...props].map(p => (
              <button key={p} onClick={()=>setProp(p)}
                style={{padding:'2px 8px',borderRadius:'3px',border:`0.5px solid ${propFilter===p?T.accent:T.border}`,cursor:'pointer',fontSize:F.xs,
                  background:propFilter===p?'#1a2e3a':'transparent',color:propFilter===p?T.accent:T.text2,fontWeight:propFilter===p?'600':'400',whiteSpace:'nowrap'}}>
                {p}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenant, company…"
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'4px 10px',color:T.text0,fontSize:F.sm,outline:'none',minWidth:'180px'}}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading…</div>}
        {!loading && (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="prop_code"                  label="Prop"/>
                <Th c="_tenant_dba"                label="Tenant"/>
                <Th c="coi_status"                 label="COI Status"/>
                <Th c="expiry_date"                label="Expiry"/>
                <Th c="additional_insured_status"  label="Add. Insured"/>
                <Th c="insured_company"            label="Insured Co"/>
                <Th c="follow_up_date"             label="Follow Up"/>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={7} style={{...css.td,textAlign:'center',color:T.text3,padding:'32px'}}>No COI records match</td></tr>}
              {sorted.map((r, i) => {
                const tnt = r.tenants;
                const href = tnt?.podio_id ? `/tenants/${tnt.podio_id}` : tnt?.id ? `/tenants/X${tnt.id.slice(-6)}` : null;
                return (
                  <tr key={r.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                    <td style={{...css.td,color:T.accent,fontWeight:'600',whiteSpace:'nowrap'}}>{r.prop_code||'—'}</td>
                    <td style={css.td}>
                      {tnt && href
                        ? <a href={href} style={{color:T.text0,textDecoration:'none',fontSize:F.sm}}
                            onMouseEnter={e=>e.currentTarget.style.color=T.accent}
                            onMouseLeave={e=>e.currentTarget.style.color=T.text0}>{tnt.tenant_dba||'—'}</a>
                        : <span style={{fontSize:F.sm}}>{tnt?.tenant_dba||'—'}</span>}
                    </td>
                    <td style={css.td}><span style={coiBadge(r.coi_status)}>{r.coi_status||'—'}</span></td>
                    <td style={css.td}><span style={expiryStyle(r.expiry_date)}>{fmtDate(r.expiry_date)}</span></td>
                    <td style={{...css.td,fontSize:F.xs,...addlStyle(r.additional_insured_status)}}>{r.additional_insured_status||'—'}</td>
                    <td style={{...css.td,fontSize:F.xs,color:T.text2}}>{r.insured_company||'—'}</td>
                    <td style={{...css.td,fontSize:F.xs,color:r.follow_up_date?T.warn:T.text3}}>{fmtDate(r.follow_up_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Stub View ─────────────────────────────────────────────────────────────────
const StubView = ({ title, note }) => (
  <div style={{padding:'32px'}}>
    <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0,marginBottom:'8px'}}>{title}</div>
    <div style={{fontSize:F.sm,color:T.text2}}>{note}</div>
  </div>
);

// ── Property Pills Popover ────────────────────────────────────────────────────
function PropertyPillsPopover({ activeProps, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{position:'relative',flexShrink:0}}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{height:'28px',padding:'0 10px',minWidth:'32px',borderRadius:'4px',background:T.bg2,border:`0.5px solid ${T.border}`,color:T.text1,fontSize:'11px',fontWeight:'500',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'6px',flexShrink:0,whiteSpace:'nowrap',transition:'border-color 0.15s,color 0.15s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.text0;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text1;}}>
        <SquaresFour size={14}/>
        <span className="crm-desktop-only" style={{marginLeft:'4px'}}>Properties</span>
      </button>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,zIndex:9998,background:T.bg1,border:`0.5px solid ${T.border}`,borderRadius:'6px',boxShadow:'0 8px 24px rgba(0,0,0,0.4)',padding:'10px',display:'flex',flexWrap:'wrap',gap:'5px',maxWidth:'min(400px, calc(100vw - 24px))'}}>
          {activeProps.map(p => {
            const href = `/properties/${p.podio_id ?? 'X'+p.id.slice(-6)}`;
            return (
              <a key={p.prop_code}
                href={href}
                title={p.property_name}
                onClick={e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); onNavigate(href); setOpen(false); } }}
                style={{height:'28px',padding:'0 10px',borderRadius:'4px',background:T.bg3,border:`0.5px solid ${T.border}`,color:T.text1,fontSize:'11px',fontWeight:'500',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',textDecoration:'none'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#E8630A';e.currentTarget.style.color=T.text0;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text1;}}>
                {p.prop_code}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────
export default function SedonaCRM() {
  const router = useRouter();
  const [currentView,setCurrentView] = useState('morning-briefing');
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);
  const [mobileNavOpen,setMobileNavOpen] = useState(false);
  const [sidebarWidth,setSidebarWidth] = useState(168);
  const [expandedMenu,setExpandedMenu] = useState(null);
  const [resetKey,setResetKey] = useState(0);
  const [activeProps,setActiveProps] = useState([]);
  const [showLegacy,setShowLegacy] = useState(()=>{
    if(typeof window==='undefined')return false;
    return localStorage.getItem('showLegacyNav')==='true';
  });
  const resizingSidebar = useRef(false);

  useEffect(() => {
    if (router.query.view) setCurrentView(router.query.view);
  }, [router.query.view]);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/properties?select=prop_code,property_name,podio_id,id&status=eq.active&order=prop_code.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.json()).then(data => setActiveProps(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const startSidebarResize = useCallback((e)=>{
    resizingSidebar.current=true;
    const startX=e.clientX,startW=sidebarWidth;
    const onMove=me=>{if(!resizingSidebar.current)return;setSidebarWidth(Math.max(155,Math.min(280,startW+(me.clientX-startX))));};
    const onUp=()=>{resizingSidebar.current=false;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
  },[sidebarWidth]);

  const navTo = (view) => {
    setMobileNavOpen(false);
    setCurrentView(view);
    setResetKey(k=>k+1);
  };

  const handleNav = (path) => {
    setMobileNavOpen(false);
    router.push(path);
  };

  const navProps = { collapsed:sidebarCollapsed, expandedMenu, setExpandedMenu, setCurrentView:navTo };

  const navItems = (
    <>
      <NavItem iconComp={<EnvelopeSimple size={18} weight="bold"/>} label="Inbox" href="/inbox" active={currentView==='inbox'} onClick={()=>handleNav('/inbox')} {...navProps}/>
      <NavItem iconComp={<HouseLine size={18} weight="bold"/>} label="Home" href="/?view=morning-briefing" active={currentView==='morning-briefing'} onClick={()=>navTo('morning-briefing')} {...navProps}/>
      {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Operations</div>}
      <NavItem iconComp={<BuildingOffice size={18} weight="bold"/>} label="Properties"  href="/?view=properties"  active={currentView==='properties'}  onClick={()=>navTo('properties')}        {...navProps}/>
      <NavItem iconComp={<ClipboardText size={18} weight="bold"/>} label="Tasks"       href="/tasks"              active={currentView==='tasks'}       onClick={()=>handleNav('/tasks')}        {...navProps}/>
      <NavItem iconComp={<Storefront size={18} weight="bold"/>} label="Tenants"     href="/tenants"            active={currentView==='tenants'}     onClick={()=>handleNav('/tenants')}      {...navProps}/>
      <NavItem iconComp={<Truck size={18} weight="bold"/>} label="Vendors"     href="/vendors"            active={currentView==='vendors'}     onClick={()=>handleNav('/vendors')}      {...navProps}/>
      <NavItem iconComp={<Briefcase size={18} weight="bold"/>} label="Owners"      href="/owners"             active={currentView==='owners'}      onClick={()=>handleNav('/owners')}       {...navProps}/>
      <NavItem iconComp={<UserCircle size={18} weight="bold"/>} label="Contacts"    href="/contacts"           active={currentView==='contacts'}    onClick={()=>handleNav('/contacts')}     {...navProps}/>
      <NavItem iconComp={<Cube size={18} weight="bold"/>} label="Suites"      href="/suites"             active={currentView==='suites'}      onClick={()=>handleNav('/suites')}       {...navProps}/>
      <NavItem iconComp={<Key size={18} weight="bold"/>} label="Key Safes"   href="/key-safes"          active={currentView==='key-safes'}   onClick={()=>handleNav('/key-safes')}    {...navProps}/>
      {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Leasing</div>}
      <NavItem label="Pipeline" href="/?view=leasing"       active={currentView==='leasing'}       onClick={()=>navTo('leasing')}             {...navProps}/>
      <NavItem label="Leases"   href="/?view=leases"        active={currentView==='leases'}        onClick={()=>navTo('leases')}              {...navProps}/>
      <NavItem iconComp={<ChartBar size={18} weight="bold"/>} label="Rents"    href="/rent-schedule"       active={currentView==='rent-schedule'} onClick={()=>handleNav('/rent-schedule')} {...navProps}/>
      {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Compliance</div>}
      <NavItem iconComp={<Umbrella size={18} weight="bold"/>} label="Insurance"   href="/?view=tnt-cois"    active={currentView==='tnt-cois'}    onClick={()=>navTo('tnt-cois')}    {...navProps}/>
      <NavItem iconComp={<ClipboardText size={18} weight="bold"/>} label="Inspections" href="/?view=inspections" active={currentView==='inspections'} onClick={()=>navTo('inspections')} {...navProps}/>
      {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Finance</div>}
      <NavItem label="QBO Dashboard" href="/?view=qbo"      active={currentView==='qbo'}      onClick={()=>navTo('qbo')}      {...navProps}/>
      <NavItem label="Invoices"      href="/?view=invoices" active={currentView==='invoices'} onClick={()=>navTo('invoices')} {...navProps}/>
      {!sidebarCollapsed&&(
        <button onClick={()=>{const next=!showLegacy;setShowLegacy(next);localStorage.setItem('showLegacyNav',String(next));}}
          style={{width:'100%',padding:'5px 4px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:T.text3,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:'600',userSelect:'none',marginTop:'4px'}}
          onMouseEnter={e=>e.currentTarget.style.color=T.text2}
          onMouseLeave={e=>e.currentTarget.style.color=T.text3}>
          <span style={{fontSize:'10px'}}>{showLegacy?'▾':'▸'}</span> Legacy
        </button>
      )}
      {showLegacy&&(
        <div style={{opacity:0.6}}>
          <NavItem iconComp={<Wrench size={18} weight="bold"/>} label="Work Orders" href="/work-orders" active={currentView==='work-orders'} onClick={()=>navTo('work-orders')} {...navProps}/>
          <NavItem iconComp={<CheckFat size={18} weight="bold"/>} label="Issues"    href="/issues"      active={currentView==='issues'}      onClick={()=>handleNav('/issues')}   {...navProps}/>
        </div>
      )}
    </>
  );

  const renderView = () => {
    switch(currentView) {
      case 'morning-briefing':   return <HomeView key={resetKey}/>;
      case 'properties':         return <PropertiesView key={resetKey}/>;
      case 'tenants':            return <TenantsView key={resetKey}/>;
      case 'work-orders':        return <WorkOrdersView key={resetKey}/>;
      case 'suites':             return <SuitesView />;
      case 'issues':             return <IssuesView key={resetKey}/>;
      case 'leasing':            return <LeasingPipelineView key={resetKey}/>;
      case 'leases':             return <StubView title="Leases" note="Lease management — coming soon."/>;
      case 'tnt-cois':           return <TntCoisView key={resetKey}/>;
      case 'property-insurance': return <StubView title="Property Insurance" note="Property insurance management — coming soon."/>;
      case 'inspections':        return <StubView title="Inspections" note="Inspection module — coming soon."/>;
      case 'qbo':                return <StubView title="QBO Dashboard" note="QuickBooks Online dashboard — coming soon."/>;
      case 'invoices':           return <StubView title="Invoices" note="ACP invoice management — coming soon."/>;
      default:                   return <HomeView key={resetKey}/>;
    }
  };

  return (
    <div style={css.shell}>
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="crm-mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {/* Mobile nav drawer */}
      <div style={{
        position:'fixed',top:0,left:0,height:'100vh',zIndex:50,
        width:'220px',background:T.bg0,borderRight:`0.5px solid ${T.border}`,
        display:'flex',flexDirection:'column',overflow:'hidden',
        transform:mobileNavOpen?'translateX(0)':'translateX(-100%)',
        transition:'transform 0.2s ease',
      }}>
        <div style={{padding:'8px 16px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexShrink:0,minHeight:'42px'}}>
          <span style={{fontSize:F.sm,fontWeight:'700',color:'#d4924a',letterSpacing:'0.02em'}}>ACP</span>
          <button onClick={()=>setMobileNavOpen(false)}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',borderRadius:'4px',fontSize:'13px',lineHeight:1}}>
            ✕
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 6px'}}>
          {navItems}
        </div>
      </div>
      {/* Sidebar */}
      <div className="crm-desktop-sidebar" style={{width:sidebarCollapsed?'48px':`${sidebarWidth}px`,background:T.bg0,borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 200ms ease'}}>
        {/* Top bar */}
        <div style={{...css.topbar,justifyContent:'space-between',flexShrink:0}}>
          {!sidebarCollapsed&&<span style={{fontSize:F.sm,fontWeight:'700',color:'#d4924a',letterSpacing:'0.02em'}}>ACP</span>}
          <button onClick={()=>setSidebarCollapsed(c=>!c)}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',borderRadius:'4px',fontSize:'13px',lineHeight:1,flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {sidebarCollapsed?'»':'«'}
          </button>
        </div>
        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 6px'}}>
          {navItems}
        </div>
        {/* Bottom */}
        <div style={{padding:'8px 6px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavItem iconComp={<Gear size={18} weight="bold"/>} label="Settings" href="/settings" active={currentView==='settings'} onClick={()=>handleNav('/settings')} {...navProps}/>
        </div>
      </div>

      {/* Sidebar resize handle */}
      {!sidebarCollapsed&&(
        <div onMouseDown={startSidebarResize}
          style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background=T.accent}
          onMouseLeave={e=>e.currentTarget.style.background=T.border}/>
      )}

      {/* Main content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Topbar */}
        <div style={{padding:'0 16px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:'12px',flexShrink:0,minHeight:'42px'}}>
          <button
            className="crm-hamburger"
            onClick={()=>setMobileNavOpen(o=>!o)}
            style={{background:'transparent',border:'none',color:T.text1,cursor:'pointer',padding:'4px',borderRadius:'4px',minWidth:'44px',minHeight:'44px',display:'none'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <List size={24} weight="bold"/>
          </button>
          <GlobalSearch />
          <PropertyPillsPopover activeProps={activeProps} onNavigate={handleNav} />
          <div style={{flex:1}}/>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:F.sm,fontWeight:'700',color:'#fff',flexShrink:0}}>SA</div>
        </div>
        {/* View */}
        <div style={{flex:1,overflow:'hidden'}}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}
