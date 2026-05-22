import WorkOrdersView, { WorkOrdersList } from './WorkOrdersView';
import SuitesView from './SuitesView';
import IssuesView, { IssuesList } from './IssuesView';
import RichTextEditor from './RichTextEditor';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

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
      style={{flex:1,display:'block',textDecoration:'none',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 10px'}}
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
const NavItem = ({ icon,label,active,onClick,href,collapsed,expandedMenu,setExpandedMenu,setCurrentView,submenu }) => {
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
        <i className={`ti ${icon}`} style={{fontSize:'17px',flexShrink:0}} aria-hidden="true"></i>
        {!collapsed&&<span style={{flex:1}}>{label}</span>}
        {!collapsed&&submenu&&<i className="ti ti-chevron-down" style={{fontSize:'13px',transform:isExp?'rotate(180deg)':'none',transition:'transform 200ms'}} aria-hidden="true"></i>}
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
  const fmtD = d => d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
  const rows = rentRows.map(r=>`
    <tr>
      <td>${r.tenant_dba||'—'}</td><td>${r.suite_num||'—'}</td>
      <td style="text-align:right">${fmtNum(r.sqft)}</td>
      <td style="text-align:right">${fmt(r.security_deposit)}</td>
      <td>${fmtD(r.lease_ends)}</td>
      <td style="text-align:right">${fmt(r.base_rent)}</td>
      <td style="text-align:right">${fmt(r.nnn)}</td>
      <td style="text-align:right">${fmt(r.other_amt)}</td>
      <td style="text-align:right">${fmt(r.tpt_tax)}</td>
      <td style="text-align:right">${fmt(r.total)}</td>
      <td style="text-align:right">${r.base_per_sf?Number(r.base_per_sf).toFixed(2):'—'}</td>
      <td style="text-align:right">${r.nnn_per_sf?Number(r.nnn_per_sf).toFixed(2):'—'}</td>
    </tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><title>Rent Roll - ${property.prop_code}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{font-size:14px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f0f0f0;border:1px solid #ccc;padding:4px 6px;font-size:10px}
  td{border:1px solid #ddd;padding:4px 6px}tfoot td{background:#f0f0f0;font-weight:bold}
  .summary{margin-bottom:12px;font-size:11px}.summary span{margin-right:20px}</style></head><body>
  <h2>Rent Roll — ${property.property_name||property.prop_code}</h2>
  <div style="font-size:11px;color:#666;margin-bottom:8px">${property.address||''} · As of ${new Date().toLocaleDateString()}</div>
  <div class="summary">
    <span>Occupied: ${fmtNum(occupancy.occupied_sf)} sf</span>
    <span>Vacant: ${fmtNum(occupancy.vacant_sf)} sf</span>
    <span>Gross: ${fmtNum(occupancy.gross_sf)} sf</span>
    <span>Occupancy: ${occupancy.occ_pct}%</span>
    <span>Monthly Total: ${fmt(occupancy.monthly_total)}</span>
  </div>
  <table><thead><tr>
    <th>Tenant DBA</th><th>Suite</th><th>Sq Ft</th><th>Security</th><th>Lease Ends</th>
    <th>Base Rent</th><th>NNN</th><th>Other</th><th>TPT Tax</th><th>Total</th><th>Base/sf</th><th>NNN/sf</th>
  </tr></thead><tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="5">TOTALS</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.base_rent)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.nnn)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.other_amt)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0))}</td>
    <td style="text-align:right">${fmt(rentRows.reduce((s,r)=>s+(Number(r.total)||0),0))}</td>
    <td colspan="2"></td>
  </tr></tfoot></table>
  <script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
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
  const [rightCollapsed,setRightCollapsed] = useState(true);
  const [rightWidth,setRightWidth] = useState(280);
  const resizingRight = useRef(false);

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

  useEffect(()=>{
    const pc = data.prop_code;
    const todayStr = new Date().toISOString().slice(0,10);
    sbFetch('rent_schedule',`prop_code=eq.${pc}&rent_status=eq.Current&rent_starts=lte.${todayStr}&rent_ends=gte.${todayStr}&select=*,tenants!rent_schedule_tenant_id_fkey(id,podio_id)&order=suite_num.asc`).then(setRentRows).catch(()=>{});
    sbFetch('work_orders',`prop_code=eq.${pc}&select=*&order=created_at.desc`).then(setWorkOrders).catch(()=>{});
    sbFetch('issues',`prop_code=eq.${pc}&select=*&order=created_at.desc`).then(setIssues).catch(()=>{});
    sbFetch('property_insurance',`prop_code=eq.${pc}&select=*&order=expiry_date.desc`).then(setInsurance).catch(()=>{});
    sbFetch('monthly_reports',`prop_code=eq.${pc}&select=*&order=report_date.desc&limit=24`).then(setMonthlyReports).catch(()=>{});
    sbFetch('property_taxes',`prop_code=eq.${pc}&select=*&order=year.desc`).then(setPropTaxes).catch(()=>{});
    sbFetch('property_agreements',`prop_code=eq.${pc}&select=*&limit=1`).then(rows=>setAgreement(rows[0]||null)).catch(()=>{});
    sbFetch('suites',`prop_code=eq.${pc}&select=*&order=suite_num.asc`).then(setSuites).catch(()=>{});
  },[data.prop_code]);

  const save = async (field, val) => {
    await sbPatch('properties', data.id, { [field]: val||null });
    const updated = {...data,[field]:val};
    setData(updated); onUpdate?.(updated);
  };

  const saveAgreement = async (field, val) => {
    if(!agreement) return;
    await sbPatch('property_agreements', agreement.id, { [field]: val||null });
    setAgreement(prev=>({...prev,[field]:val}));
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

  const openWOs    = workOrders.filter(w=>w.wo_status!=='Closed'&&w.wo_status!=='Closed - Not Done').length;
  const openIssues = issues.filter(i=>(i.status||'').toLowerCase()!=='closed').length;

  const TABS = ['Dashboard','Tenants','Work Orders','Issues','Monthly Reports','Insurance','COIs','Property Taxes','Info','Listing Info','CAMs','Inspections','Documents'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Properties
          </button>
          <StatusBadge status={data.status}/>
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>{data.property_name||data.prop_code}</div>
        <div style={{fontSize:F.sm,color:T.text2}}>{data.prop_code} · {data.address||''}{data.city?`, ${data.city}`:''}</div>
      </div>
      {/* Tab bar */}
      <div style={{display:'flex',gap:'2px',padding:'6px 16px 0',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,flexShrink:0,overflowX:'auto'}}>
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

        {/* Work Orders tab — full component, needs overflow:hidden wrapper */}
        {tab==='work-orders'&&(
          <div style={{flex:1,overflow:'hidden'}}>
            <WorkOrdersList
              wos={workOrders} setWos={setWorkOrders}
              loading={false} error={null}
              onSelect={wo=>{
                if(typeof window!=='undefined'){
                  const base = window.location.href.split('?')[0];
                  sessionStorage.setItem('workOrdersBackUrl', `${base}?tab=work-orders`);
                }
                router.push(`/work-orders/${wo.podio_id??'X'+wo.id.slice(-6)}?from=properties`);
              }}
              hidePropStrip={true}
            />
          </div>
        )}

        {/* Issues tab — full component, needs overflow:hidden wrapper */}
        {tab==='issues'&&(
          <div style={{flex:1,overflow:'hidden'}}>
            <IssuesList
              issues={issues} setIssues={setIssues}
              loading={false} error={null}
              onSelect={iss=>{
                if(typeof window!=='undefined'){
                  const base = window.location.href.split('?')[0];
                  sessionStorage.setItem('issuesBackUrl', `${base}?tab=issues`);
                }
                router.push(`/issues/${iss.podio_id??'X'+iss.id.slice(-6)}?from=properties`);
              }}
              hidePropStrip={true}
            />
          </div>
        )}

        {/* All other tabs — scrollable padded container */}
        {tab!=='work-orders'&&tab!=='issues'&&(
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
                  <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('work-orders')}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={css.secTitle}>Work Orders</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:openWOs>0?T.warn:T.text3}}>{openWOs}</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>{workOrders.length} total</div>
                  </div>
                  <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('issues')}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={css.secTitle}>Issues</div>
                    <div style={{fontSize:F.xl,fontWeight:'700',color:openIssues>0?T.danger:T.text3}}>{openIssues}</div>
                    <div style={{fontSize:F.xs,color:T.text2,marginTop:'4px'}}>{issues.length} total</div>
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
                      <div style={{...css.card,cursor:'pointer'}} onClick={()=>setTab('listing-info')}
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
              <div>
                <div style={{display:'flex',gap:'12px',marginBottom:'12px',flexWrap:'wrap'}}>
                  {[
                    ['Occupied',`${fmtNum(occupancy.occupied_sf)} sf`,T.success],
                    ['Vacant',`${fmtNum(occupancy.vacant_sf)} sf`,T.text2],
                    ['Gross',`${fmtNum(occupancy.gross_sf)} sf`,T.text1],
                    ['Occupancy',`${occupancy.occ_pct}%`,occupancy.occ_pct>=90?T.success:occupancy.occ_pct>=70?T.warn:T.danger],
                    ['Monthly Total',fmtMoney(occupancy.monthly_total),T.accent],
                  ].map(([label,val,color])=>(
                    <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 14px',minWidth:'100px'}}>
                      <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
                      <div style={{fontSize:F.md,fontWeight:'600',color,marginTop:'2px'}}>{val}</div>
                    </div>
                  ))}
                  <button onClick={()=>generateRentRollPDF(data,rentRows,occupancy)}
                    style={{marginLeft:'auto',background:T.accent,border:'none',borderRadius:'5px',padding:'6px 14px',color:'#fff',fontSize:F.sm,cursor:'pointer',alignSelf:'center'}}>
                    Generate Rent Roll PDF
                  </button>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        {['Tenant DBA','Suite','Sq Ft','Security','Lease Ends','Base Rent','NNN','Other','TPT Tax','Total','Base/sf','NNN/sf'].map(h=>(
                          <th key={h} style={{...css.th,textAlign:h==='Sq Ft'||h==='Base Rent'||h==='NNN'||h==='Other'||h==='TPT Tax'||h==='Total'||h==='Base/sf'||h==='NNN/sf'||h==='Security'?'right':'left'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rentRows.length===0&&<tr><td colSpan={12} style={{...css.td,textAlign:'center',color:T.text3,padding:'24px'}}>No current rent schedule rows</td></tr>}
                      {rentRows.map((r,i)=>{
                        const mo=calcMoLeft(r.lease_ends);
                        return (
                          <tr key={r.id} style={{borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':T.bg0}}>
                            <td style={css.td}>
                              {r.tenants?.podio_id?(
                                <a href={`/tenants/${r.tenants.podio_id}`}
                                  onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();const base=window.location.href.split('?')[0];sessionStorage.setItem('tenantsBackUrl',`${base}?tab=tenants`);router.push(`/tenants/${r.tenants.podio_id}?from=properties`);}}}
                                  style={{color:T.accent,textDecoration:'none',fontWeight:'500'}}>
                                  {r.tenant_dba||'—'}
                                </a>
                              ):(r.tenant_dba||'—')}
                            </td>
                            <td style={css.td}>{r.suite_num||'—'}</td>
                            <td style={css.tdNum}>{fmtNum(r.sqft)}</td>
                            <td style={css.tdNum}>{fmtMoney(r.security_deposit)}</td>
                            <td style={{...css.td,color:moLeftColor(mo),fontWeight:mo!==null&&mo<=12?'600':'400'}}>{fmtDate(r.lease_ends)}</td>
                            <td style={css.tdNum}>{fmtMoney(r.base_rent)}</td>
                            <td style={css.tdNum}>{fmtMoney(r.nnn)}</td>
                            <td style={css.tdNum}>{fmtMoney(r.other_amt)}</td>
                            <td style={css.tdNum}>{fmtMoney(r.tpt_tax)}</td>
                            <td style={{...css.tdNum,fontWeight:'600',color:T.text0}}>{fmtMoney(r.total)}</td>
                            <td style={css.tdNum}>{r.base_per_sf?Number(r.base_per_sf).toFixed(2):'—'}</td>
                            <td style={css.tdNum}>{r.nnn_per_sf?Number(r.nnn_per_sf).toFixed(2):'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {rentRows.length>0&&(
                      <tfoot>
                        <tr>
                          <td colSpan={2} style={css.tfoot}>TOTALS</td>
                          <td style={css.tfoot}>{fmtNum(rentRows.reduce((s,r)=>s+(Number(r.sqft)||0),0))}</td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.security_deposit)||0),0))}</td>
                          <td style={css.tfoot}></td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.base_rent)||0),0))}</td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.nnn)||0),0))}</td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.other_amt)||0),0))}</td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0))}</td>
                          <td style={css.tfoot}>{fmtMoney(rentRows.reduce((s,r)=>s+(Number(r.total)||0),0))}</td>
                          <td colSpan={2} style={css.tfoot}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

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
                <table style={{width:'100%',borderCollapse:'collapse'}}>
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
              );
            })()}

            {/* COIs — placeholder */}
            {tab==='cois'&&(
              <div style={{...css.card,textAlign:'center',padding:'32px'}}>
                <i className="ti ti-certificate" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
                <div style={{fontSize:F.sm,color:T.text3}}>Certificate of Insurance tracking — coming soon</div>
              </div>
            )}

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
                        <div style={{display:'flex',gap:'20px',alignItems:'baseline',marginTop:'16px',marginBottom:'6px',padding:'7px 10px 7px 12px',background:'#3a3f4b',borderLeft:`4px solid ${T.accent}`,borderRadius:'0 4px 4px 0'}}>
                          <span style={{fontSize:F.sm,fontWeight:'700',color:T.text0}}>{year}</span>
                          <span style={{fontSize:F.xs,color:T.text1}}>{rows.length} parcel{rows.length!==1?'s':''}</span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Full Year <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr)}</span></span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Half Yr <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr/2)}</span></span>
                          <span style={{fontSize:F.xs,color:T.text1}}>Mo. <span style={{color:T.text0,fontWeight:'600'}}>{fmtMoney(fullYr/12)}</span></span>
                        </div>
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
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
                    );
                  });
                })()}
              </div>
            )}

            {/* INFO */}
            {tab==='info'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                <div style={css.card}>
                  <div style={css.secTitle}>Property Info</div>
                  <EditableField label="Property Name" value={data.property_name} onSave={v=>save('property_name',v)}/>
                  <EditableField label="Marketing Name" value={data.property_marketing_name} onSave={v=>save('property_marketing_name',v)}/>
                  <EditableField label="Ownership Company" value={data.ownership_company} onSave={v=>save('ownership_company',v)}/>
                  <EditableField label="Address" value={data.address} onSave={v=>save('address',v)}/>
                  <EditableField label="City" value={data.city} onSave={v=>save('city',v)}/>
                  <EditableField label="Zip" value={data.zip} onSave={v=>save('zip',v)}/>
                </div>
                <div style={css.card}>
                  <div style={css.secTitle}>Building Details</div>
                  <EditableField label="Gross Sq Ft" value={data.gross_sqft} display={fmtNum(data.gross_sqft)||undefined} onSave={v=>save('gross_sqft',v)} type="number"/>
                  <EditableField label="Year Built" value={data.year_built} onSave={v=>save('year_built',v)} type="number"/>
                  <EditableField label="Zoning" value={data.zoning} onSave={v=>save('zoning',v)}/>
                  <EditableField label="Construction Type" value={data.construction_type} onSave={v=>save('construction_type',v)}/>
                  <EditableField label="Roof Type" value={data.roof_type} onSave={v=>save('roof_type',v)}/>
                  <EditableField label="TPT Tax %" value={data.tpt_tax_pct} onSave={v=>save('tpt_tax_pct',v)} type="number"/>
                </div>
                <div style={css.card}>
                  <div style={css.secTitle}>Parking & Access</div>
                  <EditableField label="Standard Stalls" value={data.parking_stalls_standard} onSave={v=>save('parking_stalls_standard',v)} type="number"/>
                  <EditableField label="HC Stalls" value={data.parking_stalls_hc} onSave={v=>save('parking_stalls_hc',v)} type="number"/>
                  <EditableField label="ADOR License #" value={data.ador_license_num} onSave={v=>save('ador_license_num',v)}/>
                  <EditableField label="Bank Account Name" value={data.bank_account_name} onSave={v=>save('bank_account_name',v)}/>
                </div>
                <div style={css.card}>
                  <div style={css.secTitle}>Notes</div>
                  <EditableField label="Other Notes" value={data.other_notes} onSave={v=>save('other_notes',v)} type="textarea"/>
                  <EditableField label="Rent Roll Notes" value={data.rent_roll_notes} onSave={v=>save('rent_roll_notes',v)} type="textarea"/>
                  <EditableField label="Snow / Ice Instructions" value={data.snow_ice_instructions} onSave={v=>save('snow_ice_instructions',v)} type="textarea"/>
                </div>
              </div>
            )}

            {/* LISTING INFO — management agreement from property_agreements */}
            {tab==='listing-info'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                {!agreement&&(
                  <div style={{gridColumn:'1/-1',textAlign:'center',padding:'32px',color:T.text3,fontSize:F.sm}}>No management agreement on file</div>
                )}
                {agreement&&(<>
                  <div style={css.card}>
                    <div style={css.secTitle}>Listing Agreement</div>
                    <EditableField label="Type" value={agreement.listing_agreement_type} onSave={v=>saveAgreement('listing_agreement_type',v)}/>
                    <EditableField label="Start" value={agreement.listing_start_date} display={fmtDate(agreement.listing_start_date)||undefined} onSave={v=>saveAgreement('listing_start_date',v)} type="date"/>
                    <EditableField label="Expiry" value={agreement.listing_expiry_date} display={fmtDate(agreement.listing_expiry_date)||undefined} onSave={v=>saveAgreement('listing_expiry_date',v)} type="date"/>
                    <EditableField label="Closed" value={agreement.listing_closed_date} display={fmtDate(agreement.listing_closed_date)||undefined} onSave={v=>saveAgreement('listing_closed_date',v)} type="date"/>
                    <EditableField label="Status" value={agreement.acp_listing_status} onSave={v=>saveAgreement('acp_listing_status',v)}/>
                    <EditableField label="Notes" value={agreement.general_listing_notes} onSave={v=>saveAgreement('general_listing_notes',v)} type="textarea"/>
                  </div>
                  <div style={css.card}>
                    <div style={css.secTitle}>PM Fee</div>
                    <EditableField label="Fee Type" value={agreement.pm_fee_type} onSave={v=>saveAgreement('pm_fee_type',v)}/>
                    <EditableField label="Fee % (as decimal, e.g. 0.05 = 5%)" value={agreement.pm_fee_pct} display={agreement.pm_fee_pct?(Number(agreement.pm_fee_pct)*100).toFixed(2)+'%':undefined} onSave={v=>saveAgreement('pm_fee_pct',v)} type="number"/>
                    <EditableField label="No Less Than" value={agreement.pm_fee_no_less_than} display={fmtMoney(agreement.pm_fee_no_less_than)||undefined} onSave={v=>saveAgreement('pm_fee_no_less_than',v)} type="number"/>
                    <EditableField label="Fixed Amt" value={agreement.pm_fee_fixed_amt} display={fmtMoney(agreement.pm_fee_fixed_amt)||undefined} onSave={v=>saveAgreement('pm_fee_fixed_amt',v)} type="number"/>
                    <EditableField label="How Paid" value={agreement.pm_fee_how_paid} onSave={v=>saveAgreement('pm_fee_how_paid',v)}/>
                    <EditableField label="Current EFT" value={agreement.pm_fee_current_eft_amt} display={fmtMoney(agreement.pm_fee_current_eft_amt)||undefined} onSave={v=>saveAgreement('pm_fee_current_eft_amt',v)} type="number"/>
                    <EditableField label="Current QBO" value={agreement.pm_fee_current_qbo_amt} display={fmtMoney(agreement.pm_fee_current_qbo_amt)||undefined} onSave={v=>saveAgreement('pm_fee_current_qbo_amt',v)} type="number"/>
                    <EditableField label="Notes" value={agreement.pm_fee_notes} onSave={v=>saveAgreement('pm_fee_notes',v)} type="textarea"/>
                  </div>
                  <div style={css.card}>
                    <div style={css.secTitle}>Distributions</div>
                    <EditableField label="Type" value={agreement.distribution_type} onSave={v=>saveAgreement('distribution_type',v)}/>
                    <EditableField label="Fixed Amt" value={agreement.distribution_fixed_amt} display={fmtMoney(agreement.distribution_fixed_amt)||undefined} onSave={v=>saveAgreement('distribution_fixed_amt',v)} type="number"/>
                    <EditableField label="Paid Via" value={agreement.distribution_paid_via} onSave={v=>saveAgreement('distribution_paid_via',v)}/>
                    <EditableField label="Notes" value={agreement.distribution_notes} onSave={v=>saveAgreement('distribution_notes',v)} type="textarea"/>
                    <EditableField label="Min Bank Balance" value={agreement.min_bank_balance} display={fmtMoney(agreement.min_bank_balance)||undefined} onSave={v=>saveAgreement('min_bank_balance',v)} type="number"/>
                    <EditableField label="Reserve Op Funds" value={agreement.reserve_op_funds} display={fmtMoney(agreement.reserve_op_funds)||undefined} onSave={v=>saveAgreement('reserve_op_funds',v)} type="number"/>
                    <EditableField label="Bank Acct Type" value={agreement.bank_acct_type} onSave={v=>saveAgreement('bank_acct_type',v)}/>
                    <EditableField label="LL Approval Over" value={agreement.ll_approval_over_amt} display={fmtMoney(agreement.ll_approval_over_amt)||undefined} onSave={v=>saveAgreement('ll_approval_over_amt',v)} type="number"/>
                  </div>
                  <div style={css.card}>
                    <div style={css.secTitle}>Leasing Fees</div>
                    <EditableField label="Leasing Fee Type" value={agreement.leasing_fee_type} onSave={v=>saveAgreement('leasing_fee_type',v)}/>
                    <EditableField label="Leasing Fee % (decimal)" value={agreement.leasing_fee_pct} display={agreement.leasing_fee_pct?(Number(agreement.leasing_fee_pct)*100).toFixed(2)+'%':undefined} onSave={v=>saveAgreement('leasing_fee_pct',v)} type="number"/>
                    <EditableField label="Leasing Notes" value={agreement.leasing_fee_notes} onSave={v=>saveAgreement('leasing_fee_notes',v)} type="textarea"/>
                    <EditableField label="Renewal Type" value={agreement.lease_renewal_type} onSave={v=>saveAgreement('lease_renewal_type',v)}/>
                    <EditableField label="Renewal Fee % (decimal)" value={agreement.lease_renewal_fee_pct} display={agreement.lease_renewal_fee_pct?(Number(agreement.lease_renewal_fee_pct)*100).toFixed(2)+'%':undefined} onSave={v=>saveAgreement('lease_renewal_fee_pct',v)} type="number"/>
                    <EditableField label="Renewal Notes" value={agreement.lease_renewal_fee_notes} onSave={v=>saveAgreement('lease_renewal_fee_notes',v)} type="textarea"/>
                    <EditableField label="Hourly Rate" value={agreement.other_fees_hourly_rate} display={fmtMoney(agreement.other_fees_hourly_rate)||undefined} onSave={v=>saveAgreement('other_fees_hourly_rate',v)} type="number"/>
                    <EditableField label="Project Mgmt Hourly" value={agreement.project_mgmt_hourly_rate} display={fmtMoney(agreement.project_mgmt_hourly_rate)||undefined} onSave={v=>saveAgreement('project_mgmt_hourly_rate',v)} type="number"/>
                    <EditableField label="Asset Improv Fee % (decimal)" value={agreement.asset_improv_fee_pct} display={agreement.asset_improv_fee_pct?(Number(agreement.asset_improv_fee_pct)*100).toFixed(2)+'%':undefined} onSave={v=>saveAgreement('asset_improv_fee_pct',v)} type="number"/>
                    <EditableField label="Asset Improv Term (months)" value={agreement.asset_improv_term_months} onSave={v=>saveAgreement('asset_improv_term_months',v)} type="number"/>
                  </div>
                  <div style={css.card}>
                    <div style={css.secTitle}>PM Reports</div>
                    <EditableField label="Email To" value={agreement.pm_reports_email_to} onSave={v=>saveAgreement('pm_reports_email_to',v)}/>
                    <EditableField label="Notes" value={agreement.pm_reports_notes} onSave={v=>saveAgreement('pm_reports_notes',v)} type="textarea"/>
                  </div>
                </>)}
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
        <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={startRightResize}/>
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

  if(selected) return <PropertyDetail property={selected} onBack={()=>setSelected(null)} onUpdate={u=>setSelected(u)}/>;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
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
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search properties…"
            style={{flex:1,background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading…</div>}
        {!loading&&(
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
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
                      else setSelected(p);
                    }}
                    style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                    <td style={{...css.td,color:T.accent,fontWeight:'600'}}>
                      <a href={`/properties/${p.podio_id??'X'+p.id.slice(-6)}`}
                        onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();setSelected(p);}}}
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
        )}
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
        <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={startRightResize}/>
      </div>
    </div>
  );
};

// ── Tenants View ──────────────────────────────────────────────────────────────
const TenantsView = () => {
  const [tenants,setTenants] = useState([]);
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const [filter,setFilter] = useState('Active');
  const [search,setSearch] = useState('');
  const { sorted, Th } = useSortable(tenants,'tenant_dba');

  useEffect(()=>{
    setLoading(true);
    let params='select=*';
    if(filter!=='All') params+=`&tenant_status=eq.${filter}`;
    params+='&order=tenant_dba.asc';
    sbFetch('tenants',params).then(d=>{setTenants(d);setLoading(false);}).catch(()=>setLoading(false));
  },[filter]);

  const filtered = sorted.filter(t=>{
    if(!search)return true;
    const q=search.toLowerCase();
    return (t.tenant_dba||'').toLowerCase().includes(q)||(t.prop_code||'').toLowerCase().includes(q)||(t.suite_num||'').toLowerCase().includes(q);
  });

  const daysUntil = d => d?Math.round((new Date(d)-today)/(1000*60*60*24)):null;

  if(selected) return <TenantDetail tenant={selected} onBack={()=>setSelected(null)} onUpdate={u=>setSelected(u)}/>;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Tenants</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length} shown</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {['Active','Archived','All'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                style={{padding:'4px 12px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:filter===s?T.bg3:'transparent',color:filter===s?T.text0:T.text2,fontWeight:filter===s?'600':'400'}}>
                {s}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenants…"
            style={{flex:1,background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading…</div>}
        {!loading&&(
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'auto'}}/><col style={{width:'70px'}}/><col style={{width:'70px'}}/>
              <col style={{width:'80px'}}/><col style={{width:'100px'}}/><col style={{width:'100px'}}/><col style={{width:'90px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="tenant_dba" label="Tenant DBA"/>
                <Th c="prop_code" label="Prop"/>
                <Th c="suite_num" label="Suite"/>
                <Th c="sqft" label="Sq Ft" align="right"/>
                <Th c="lease_ends" label="Lease Ends"/>
                <Th c="tenant_status" label="Status"/>
                <Th c="lease_ends" label="Expires In"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={7} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No tenants match</td></tr>}
              {filtered.map((t,i)=>{
                const exp=daysUntil(t.lease_ends);
                return (
                  <tr key={t.id} onClick={()=>setSelected(t)} style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                    <td style={css.td}>{t.tenant_dba}</td>
                    <td style={{...css.td,color:T.accent,fontWeight:'500'}}>{t.prop_code}</td>
                    <td style={{...css.td,color:T.text2}}>{t.suite_num||'—'}</td>
                    <td style={css.tdNum}>{fmtNum(t.sqft)}</td>
                    <td style={css.td}>{fmtDate(t.lease_ends)}</td>
                    <td style={css.td}><StatusBadge status={t.tenant_status}/></td>
                    <td style={css.td}>
                      {exp!==null?(
                        <span style={{fontSize:F.xs,padding:'2px 6px',borderRadius:'3px',
                          background:exp<60?'#3d1f1f':exp<180?'#3d2e1a':'transparent',
                          color:exp<60?T.danger:exp<180?T.warn:T.text2}}>
                          {exp<0?`${Math.abs(exp)}d over`:`${exp}d`}
                        </span>
                      ):'—'}
                    </td>
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
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
      <div style={{display:'flex',gap:'12px',marginBottom:'20px'}}>
        <WeatherCard city="Sedona AZ" lat={34.8697} lon={-111.7610} url="https://forecast.weather.gov/MapClick.php?CityName=Sedona&state=AZ"/>
        <WeatherCard city="Olympia WA" lat={47.0379} lon={-122.9007} url="https://forecast.weather.gov/MapClick.php?CityName=Olympia&state=WA"/>
      </div>
      <div style={{...css.card,color:T.text2,fontSize:F.sm,fontStyle:'italic'}}>
        Urgent items, recent activity, and leasing pipeline will populate here as agents are activated in Phase 4.
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

// ── Root Component ────────────────────────────────────────────────────────────
export default function SedonaCRM() {
  const router = useRouter();
  const [currentView,setCurrentView] = useState('morning-briefing');
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);
  const [sidebarWidth,setSidebarWidth] = useState(168);
  const [expandedMenu,setExpandedMenu] = useState(null);
  const [resetKey,setResetKey] = useState(0);
  const resizingSidebar = useRef(false);

  useEffect(() => {
    if (router.query.view) setCurrentView(router.query.view);
  }, [router.query.view]);

  const startSidebarResize = useCallback((e)=>{
    resizingSidebar.current=true;
    const startX=e.clientX,startW=sidebarWidth;
    const onMove=me=>{if(!resizingSidebar.current)return;setSidebarWidth(Math.max(155,Math.min(280,startW+(me.clientX-startX))));};
    const onUp=()=>{resizingSidebar.current=false;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
  },[sidebarWidth]);

  const navTo = (view) => {
    setCurrentView(view);
    setResetKey(k=>k+1);
  };

  const navProps = { collapsed:sidebarCollapsed, expandedMenu, setExpandedMenu, setCurrentView:navTo };

  const renderView = () => {
    switch(currentView) {
      case 'morning-briefing':   return <HomeView key={resetKey}/>;
      case 'properties':         return <PropertiesView key={resetKey}/>;
      case 'tenants':            return <TenantsView key={resetKey}/>;
      case 'work-orders':        return <WorkOrdersView key={resetKey}/>;
      case 'suites':             return <SuitesView />;
      case 'issues':             return <IssuesView key={resetKey}/>;
      case 'leasing':            return <StubView title="Leasing Pipeline" note="Pipeline and stage tracking — coming soon."/>;
      case 'leases':             return <StubView title="Leases" note="Lease management — coming soon."/>;
      case 'tnt-cois':           return <StubView title="Tenant COIs" note="Insurance certificate tracking — coming soon."/>;
      case 'property-insurance': return <StubView title="Property Insurance" note="Property insurance management — coming soon."/>;
      case 'inspections':        return <StubView title="Inspections" note="Inspection module — coming soon."/>;
      case 'qbo':                return <StubView title="QBO Dashboard" note="QuickBooks Online dashboard — coming soon."/>;
      case 'invoices':           return <StubView title="Invoices" note="ACP invoice management — coming soon."/>;
      default:                   return <HomeView key={resetKey}/>;
    }
  };

  return (
    <div style={css.shell}>
      {/* Sidebar */}
      <div style={{width:sidebarCollapsed?'48px':`${sidebarWidth}px`,background:T.bg0,borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 200ms ease'}}>
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
          <NavItem icon="ti-layout-dashboard" label="Home" href="/?view=morning-briefing" active={currentView==='morning-briefing'} onClick={()=>navTo('morning-briefing')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Operations</div>}
          <NavItem icon="ti-building-store" label="Properties"  href="/?view=properties"  active={currentView==='properties'}  onClick={()=>navTo('properties')}  {...navProps}/>
          <NavItem icon="ti-users"          label="Tenants"     href="/tenants"            active={currentView==='tenants'}     onClick={()=>router.push('/tenants')} {...navProps}/>
          <NavItem icon="ti-door"           label="Suites"      href="/?view=suites"       active={currentView==='suites'}      onClick={()=>navTo('suites')}      {...navProps}/>
          <NavItem icon="ti-tool"           label="Work Orders" href="/work-orders"        active={currentView==='work-orders'} onClick={()=>navTo('work-orders')} {...navProps}/>
          <NavItem icon="ti-alert-triangle" label="Issues"      href="/issues"             active={currentView==='issues'}      onClick={()=>router.push('/issues')}   {...navProps}/>
          <NavItem icon="ti-address-book"  label="Contacts"    href="/contacts"           active={currentView==='contacts'}    onClick={()=>router.push('/contacts')} {...navProps}/>
          <NavItem icon="ti-building"      label="Vendors"     href="/vendors"            active={currentView==='vendors'}     onClick={()=>router.push('/vendors')}  {...navProps}/>
          <NavItem icon="ti-home"          label="Owners"      href="/owners"             active={currentView==='owners'}      onClick={()=>router.push('/owners')}   {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Leasing</div>}
          <NavItem icon="ti-pipeline"   label="Pipeline" href="/?view=leasing"       active={currentView==='leasing'}       onClick={()=>navTo('leasing')}   {...navProps}/>
          <NavItem icon="ti-file-text"  label="Leases"   href="/?view=leases"        active={currentView==='leases'}        onClick={()=>navTo('leases')}             {...navProps}/>
          <NavItem icon="ti-cash"       label="Rents"    href="/rent-schedule"       active={currentView==='rent-schedule'} onClick={()=>router.push('/rent-schedule')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Compliance</div>}
          <NavItem icon="ti-shield-check"    label="Insurance"   href="/?view=tnt-cois"    active={currentView==='tnt-cois'}    onClick={()=>navTo('tnt-cois')}    {...navProps}/>
          <NavItem icon="ti-clipboard-check" label="Inspections" href="/?view=inspections" active={currentView==='inspections'} onClick={()=>navTo('inspections')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>Finance</div>}
          <NavItem icon="ti-chart-bar" label="QBO Dashboard" href="/?view=qbo"      active={currentView==='qbo'}      onClick={()=>navTo('qbo')}      {...navProps}/>
          <NavItem icon="ti-receipt"   label="Invoices"      href="/?view=invoices" active={currentView==='invoices'} onClick={()=>navTo('invoices')} {...navProps}/>
        </div>
        {/* Bottom */}
        <div style={{padding:'8px 6px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavItem icon="ti-settings" label="Settings" href="/?view=settings" active={currentView==='settings'} onClick={()=>navTo('settings')} {...navProps}/>
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
        <div style={{...css.topbar,justifyContent:'space-between'}}>
          <span style={{fontSize:F.md,fontWeight:'600',color:'#d4924a'}}>Anderson Commercial Properties</span>
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
