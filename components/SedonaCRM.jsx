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

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};

// Font scale — 14-15px base
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const css = {
  shell:    { display:'flex', height:'100vh', background:T.bg1, fontFamily:'var(--font-sans)', color:T.text0, fontSize:F.base, overflow:'hidden' },
  topbar:   { padding:'8px 16px', background:T.bg0, borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', gap:'12px', flexShrink:0 },
  card:     { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  secTitle: { fontSize:F.xs, fontWeight:'600', color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  badge:    (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th:       { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', cursor:'pointer', userSelect:'none', background:T.bg2 },
  td:       { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  tdNum:    { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', textAlign:'right' },
  tfoot:    { fontSize:F.sm, fontWeight:'600', color:T.text0, padding:'5px 8px', whiteSpace:'nowrap', background:T.bg3, textAlign:'right' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = new Date();
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const fmtMoney = n => n != null && n !== '' ? '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
const fmtNum   = n => n != null && n !== '' ? Number(n).toLocaleString() : '—';
const fmtSf    = n => n != null && n !== '' ? Number(n).toLocaleString()+' sf' : '—';
const fmtPsf   = n => n != null && n !== '' ? '$'+Number(n).toFixed(2) : '—';
const fmtPct   = n => n != null && n !== '' ? Number(n).toFixed(1)+'%' : '—';
const isCurrentRent = r => {
  if (!r.rent_starts || !r.rent_ends) return false;
  return new Date(r.rent_starts) <= today && new Date(r.rent_ends) >= today;
};

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

// ── Inline editable field ─────────────────────────────────────────────────────
const EditableField = ({ label, value, onSave, type='text' }) => {
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(value||'');
  const [saving,setSaving]   = useState(false);
  const inputRef             = useRef(null);
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

// ── Sortable hook ─────────────────────────────────────────────────────────────
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

// ── Weather ───────────────────────────────────────────────────────────────────
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
        <i className="ti ti-external-link" style={{fontSize:F.xs,color:T.text3}} aria-hidden="true"></i>
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

// ── Nav item ──────────────────────────────────────────────────────────────────
const NavItem = ({ icon,label,active,onClick,collapsed,expandedMenu,setExpandedMenu,setCurrentView,submenu }) => {
  const isExp = expandedMenu===label;
  return (
    <div>
      <button onClick={()=>submenu?setExpandedMenu(isExp?null:label):onClick?.()}
        title={collapsed?label:undefined}
        style={{width:'100%',padding:collapsed?'8px 0':'7px 10px',background:active?T.bg2:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:collapsed?'center':'flex-start',gap:'9px',fontSize:F.base,color:active?T.accent:T.text1,borderRadius:'4px',borderRight:active?`2px solid ${T.accent}`:'2px solid transparent',whiteSpace:'nowrap'}}
        onMouseEnter={e=>{if(!active)e.currentTarget.style.color=T.text0;}}
        onMouseLeave={e=>{if(!active)e.currentTarget.style.color=T.text1;}}>
        <i className={`ti ${icon}`} style={{fontSize:'17px',flexShrink:0}} aria-hidden="true"></i>
        {!collapsed&&<span style={{flex:1}}>{label}</span>}
        {!collapsed&&submenu&&<i className="ti ti-chevron-down" style={{fontSize:'13px',transform:isExp?'rotate(180deg)':'none',transition:'transform 200ms'}} aria-hidden="true"></i>}
      </button>
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

// ── Right activity panel ──────────────────────────────────────────────────────
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
                  <i className="ti ti-message-circle" style={{fontSize:'32px',color:T.bg3,display:'block',marginBottom:'8px'}} aria-hidden="true"></i>
                  <span style={{fontSize:F.sm,color:T.text3}}>Comments sync at go-live</span>
                </div>
              </div>
            )}
            {tab==='activity'&&(
              <div>
                <div style={{...css.card,marginBottom:'10px'}}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                    Activity tracking begins at go-live when the full Podio API sync runs. Field changes, status updates, and user actions will appear here chronologically.
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

// ── Rent Roll PDF generator ───────────────────────────────────────────────────
const generateRentRollPDF = (prop, rows) => {
  const dateStr = new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});
  const totals = {
    sqft:     rows.reduce((s,r)=>s+(Number(r.sqft)||0),0),
    security: rows.reduce((s,r)=>s+(Number(r.security_deposit)||0),0),
    base:     rows.reduce((s,r)=>s+(Number(r.base_rent)||0),0),
    nnn:      rows.reduce((s,r)=>s+(Number(r.nnn)||0),0),
    other:    rows.reduce((s,r)=>s+(Number(r.other_amt)||0),0),
    tpt:      rows.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0),
    total:    rows.reduce((s,r)=>s+(Number(r.total)||0),0),
  };
  const occupied = rows.reduce((s,r)=>s+(Number(r.sqft)||0),0);
  const gross    = Number(prop.gross_sqft)||occupied;
  const vacant   = Math.max(0,gross-occupied);
  const occPct   = gross>0?(occupied/gross*100).toFixed(1):0;

  const fmt  = n => n?'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  const fmtN = n => n?Number(n).toLocaleString():'';
  const fmtP = n => n?'$'+Number(n).toFixed(2):'';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Rent Roll - ${prop.property_name||prop.prop_code}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:9pt;margin:20px;color:#111}
  h2{font-size:11pt;margin:0 0 2px}
  h3{font-size:9pt;font-weight:normal;margin:0 0 12px;color:#444}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#2c3e50;color:white;padding:4px 6px;font-size:8pt;text-align:left;white-space:nowrap}
  th.r{text-align:right}
  td{padding:3px 6px;border-bottom:1px solid #eee;font-size:8.5pt;white-space:nowrap}
  td.r{text-align:right}
  tr:nth-child(even){background:#f8f8f8}
  .totrow td{font-weight:bold;border-top:2px solid #2c3e50;background:#eef2f5}
  .summary{display:flex;gap:40px;margin-top:8px}
  .sumcol{font-size:9pt}
  .sumcol div{margin-bottom:3px}
  .label{color:#666;display:inline-block;width:160px}
  .footer{margin-top:20px;font-size:8pt;color:#666;border-top:1px solid #ccc;padding-top:6px}
  @media print{body{margin:10px}}
</style></head><body>
<h2>RENT ROLL REPORT — ${(prop.property_name||prop.prop_code).toUpperCase()}</h2>
<h3>${prop.address||''}, ${prop.city||''}, ${prop.state||''} · Created: ${dateStr}</h3>
<table>
  <thead><tr>
    <th>Tenant DBA</th><th>Suite</th><th class="r">Sq Ft</th><th class="r">Security</th>
    <th>Lease Ends</th><th class="r">Base Rent</th><th class="r">NNN</th>
    <th class="r">Other</th><th class="r">TPT Tax</th><th class="r">TOTAL</th>
    <th class="r">Base/sf</th><th class="r">NNN/sf</th>
  </tr></thead>
  <tbody>
    ${rows.map(r=>`<tr>
      <td>${r.tenant_dba||'—'}</td>
      <td>${r.suite_num||'—'}</td>
      <td class="r">${fmtN(r.sqft)}</td>
      <td class="r">${fmt(r.security_deposit)}</td>
      <td>${fmtDate(r.lease_ends)}</td>
      <td class="r">${fmt(r.base_rent)}</td>
      <td class="r">${fmt(r.nnn)}</td>
      <td class="r">${fmt(r.other_amt)}</td>
      <td class="r">${fmt(r.tpt_tax)}</td>
      <td class="r">${fmt(r.total)}</td>
      <td class="r">${r.sqft&&r.base_rent?fmtP(r.base_rent/r.sqft):''}</td>
      <td class="r">${r.sqft&&r.nnn?fmtP(r.nnn/r.sqft):''}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot><tr class="totrow">
    <td><strong>TOTALS</strong></td><td></td>
    <td class="r"><strong>${fmtN(totals.sqft)}</strong></td>
    <td class="r"><strong>${fmt(totals.security)}</strong></td>
    <td></td>
    <td class="r"><strong>${fmt(totals.base)}</strong></td>
    <td class="r"><strong>${fmt(totals.nnn)}</strong></td>
    <td class="r"><strong>${fmt(totals.other)}</strong></td>
    <td class="r"><strong>${fmt(totals.tpt)}</strong></td>
    <td class="r"><strong>${fmt(totals.total)}</strong></td>
    <td></td><td></td>
  </tr></tfoot>
</table>
<div class="summary">
  <div class="sumcol">
    <div><span class="label">Total Base Rent:</span><strong>${fmt(totals.base)}</strong></div>
    <div><span class="label">Total NNN:</span><strong>${fmt(totals.nnn)}</strong></div>
    <div><span class="label">Total Other:</span><strong>${fmt(totals.other)}</strong></div>
    <div><span class="label">Total TPT Tax:</span><strong>${fmt(totals.tpt)}</strong></div>
    <div><span class="label">Grand Total:</span><strong>${fmt(totals.total)}</strong></div>
  </div>
  <div class="sumcol">
    <div><span class="label">Occupied:</span><strong>${fmtN(occupied)} sf</strong></div>
    <div><span class="label">Vacant:</span><strong>${fmtN(vacant)} sf</strong></div>
    <div><span class="label">Gross:</span><strong>${fmtN(gross)} sf</strong></div>
    <div><span class="label">Occupancy:</span><strong>${occPct}%</strong></div>
    <div><span class="label">Vacancy:</span><strong>${(100-occPct).toFixed(1)}%</strong></div>
  </div>
</div>
<div class="footer">Compiled by Anderson Commercial Properties · 928.282.3777 · www.andersoncp.com</div>
</body></html>`;

  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),500);
};

// ── Property detail ───────────────────────────────────────────────────────────
const PropertyDetail = ({ prop: initialProp, onBack }) => {
  const [prop,setProp]           = useState(initialProp);
  const [activeTab,setActiveTab] = useState(0);
  const [rentRoll,setRentRoll]   = useState([]);
  const [workOrders,setWorkOrders] = useState([]);
  const [issues,setIssues]       = useState([]);
  const [listing,setListing]     = useState([]);
  const [propIns,setPropIns]     = useState([]);
  const [tntCois,setTntCois]     = useState([]);
  const [reports,setReports]     = useState([]);
  const [taxes,setTaxes]         = useState([]);
  const [loading,setLoading]     = useState({});
  const [tntFilter,setTntFilter] = useState('current');
  const [rightCollapsed,setRightCollapsed] = useState(false);
  const [rightWidth,setRightWidth]         = useState(300);

  const isResizingRight=useRef(false),startXRight=useRef(0),startWRight=useRef(0);
  const onRightMouseDown=useCallback(e=>{
    isResizingRight.current=true; startXRight.current=e.clientX; startWRight.current=rightWidth;
    document.body.style.cursor='col-resize'; document.body.style.userSelect='none';
  },[rightWidth]);
  useEffect(()=>{
    const onMove=e=>{ if(!isResizingRight.current)return; setRightWidth(Math.min(520,Math.max(200,startWRight.current-(e.clientX-startXRight.current)))); };
    const onUp=()=>{ isResizingRight.current=false; document.body.style.cursor=''; document.body.style.userSelect=''; };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
    return()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
  },[]);

  const loaded = useRef({});
  const load = useCallback((key,table,params,setter)=>{
    if(loaded.current[key]) return;
    loaded.current[key]=true;
    setLoading(l=>({...l,[key]:'loading'}));
    sbFetch(table,params).then(data=>{ setter(data); setLoading(l=>({...l,[key]:'done'})); })
      .catch(()=>setLoading(l=>({...l,[key]:'error'})));
  },[]);

  useEffect(()=>{
    const pc=prop.prop_code;
    // Tab 1 — rent roll: join rent_schedule with tenants via tenant_id
    if(activeTab===1) load('rentRoll','rent_schedule',
      `prop_code=eq.${pc}&rent_status=eq.Current&select=*,tenants(tenant_dba,security_deposit)&order=suite_num`,
      data=>{
        const today2=new Date();
        const current=data.filter(r=>{ if(!r.rent_starts||!r.rent_ends) return false; return new Date(r.rent_starts)<=today2&&new Date(r.rent_ends)>=today2; });
        const withNames=current.map(r=>({
          ...r,
          tenant_dba:r.tenants?.tenant_dba||'—',
          security_deposit:r.tenants?.security_deposit||null,
        }));
        setRentRoll(withNames);
      });
    if(activeTab===2) load('workOrders','work_orders',`prop_code=eq.${pc}&select=id,wo_num,short_description,category,priority,status,stage,close_date,created_at&order=created_at.desc`,setWorkOrders);
    if(activeTab===3) load('issues','issues',`prop_code=eq.${pc}&select=*&order=create_date.desc`,setIssues);
    if(activeTab===4){ load('propIns','property_insurance',`prop_code=eq.${pc}&select=*`,setPropIns); load('tntCois','tnt_cois',`prop_code=eq.${pc}&select=*&order=expiration_date`,setTntCois); }
    if(activeTab===5) load('reports','monthly_reports',`prop_code=eq.${pc}&select=*&order=report_date.desc&limit=36`,setReports);
    if(activeTab===6) load('taxes','property_taxes',`prop_code=eq.${pc}&select=*&order=tax_year.desc`,setTaxes);
    if(activeTab===7) load('listing','leasing_pipeline',`prop_code=eq.${pc}&select=*&order=created_at.desc`,setListing);
  },[activeTab]);

  const saveField = async (field,value) => {
    const updated=await sbPatch('properties',prop.id,{[field]:value});
    if(updated&&updated[0]) setProp(updated[0]);
  };

  const tabs=['Property info','Tenants','Work orders','Issues','Insurance','Monthly reports','Property taxes','Listing info','Documents'];

  // ── Tab 0: Property info ──
  const TabInfo = () => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <div style={css.card}>
        <div style={css.secTitle}>Property details</div>
        <EditableField label="Property name"      value={prop.property_name}            onSave={v=>saveField('property_name',v)}/>
        <EditableField label="Marketing name"     value={prop.property_marketing_name}  onSave={v=>saveField('property_marketing_name',v)}/>
        <EditableField label="Address"            value={prop.address}                  onSave={v=>saveField('address',v)}/>
        <EditableField label="City"               value={prop.city}                     onSave={v=>saveField('city',v)}/>
        <EditableField label="State"              value={prop.state}                    onSave={v=>saveField('state',v)}/>
        <EditableField label="Zip"                value={prop.zip}                      onSave={v=>saveField('zip',v)}/>
        <EditableField label="Location area"      value={prop.location_area}            onSave={v=>saveField('location_area',v)}/>
        <EditableField label="Ownership company"  value={prop.ownership_company}        onSave={v=>saveField('ownership_company',v)}/>
        <EditableField label="Year built"         value={prop.year_built}               onSave={v=>saveField('year_built',v)} type="number"/>
        <EditableField label="Gross sq ft"        value={prop.gross_sqft}               onSave={v=>saveField('gross_sqft',v)} type="number"/>
        <EditableField label="Zoning"             value={prop.zoning}                   onSave={v=>saveField('zoning',v)}/>
        <EditableField label="Acres"              value={prop.acres}                    onSave={v=>saveField('acres',v)}/>
        <EditableField label="Stories"            value={prop.num_stories}              onSave={v=>saveField('num_stories',v)} type="number"/>
        <EditableField label="TPT tax %"          value={prop.tpt_tax_pct}              onSave={v=>saveField('tpt_tax_pct',v)}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
        <div style={css.card}>
          <div style={css.secTitle}>Building info</div>
          <EditableField label="Construction type"    value={prop.construction_type}      onSave={v=>saveField('construction_type',v)}/>
          <EditableField label="Roof type"            value={prop.roof_type}              onSave={v=>saveField('roof_type',v)}/>
          <EditableField label="Fire sprinkled"       value={prop.fire_sprinkled}         onSave={v=>saveField('fire_sprinkled',v)}/>
          <EditableField label="Fire monitored"       value={prop.fire_monitored}         onSave={v=>saveField('fire_monitored',v)}/>
          <EditableField label="Parking — standard"   value={prop.parking_stalls_standard} onSave={v=>saveField('parking_stalls_standard',v)} type="number"/>
          <EditableField label="Parking — HC"         value={prop.parking_stalls_hc}      onSave={v=>saveField('parking_stalls_hc',v)} type="number"/>
          <EditableField label="Bank account"         value={prop.bank_account_name}      onSave={v=>saveField('bank_account_name',v)}/>
          <EditableField label="ADOR license #"       value={prop.ador_license_num}       onSave={v=>saveField('ador_license_num',v)}/>
        </div>
        <div style={css.card}>
          <div style={css.secTitle}>Notes</div>
          <EditableField label="Other notes"              value={prop.other_notes}              onSave={v=>saveField('other_notes',v)}              type="textarea"/>
          <EditableField label="Rent roll notes"          value={prop.rent_roll_notes}          onSave={v=>saveField('rent_roll_notes',v)}          type="textarea"/>
          <EditableField label="Snow / ice instructions"  value={prop.snow_ice_instructions}    onSave={v=>saveField('snow_ice_instructions',v)}    type="textarea"/>
          <EditableField label="APS notes"                value={prop.aps_notes}                onSave={v=>saveField('aps_notes',v)}                type="textarea"/>
        </div>
      </div>
    </div>
  );

  // ── Tab 1: Tenants (rent roll) ──
  const TabTenants = () => {
    const { sorted, Th } = useSortable(rentRoll,'suite_num','asc');

    const totSqft     = sorted.reduce((s,r)=>s+(Number(r.sqft)||0),0);
    const totSecurity = sorted.reduce((s,r)=>s+(Number(r.security_deposit)||0),0);
    const totBase     = sorted.reduce((s,r)=>s+(Number(r.base_rent)||0),0);
    const totNNN      = sorted.reduce((s,r)=>s+(Number(r.nnn)||0),0);
    const totOther    = sorted.reduce((s,r)=>s+(Number(r.other_amt)||0),0);
    const totTPT      = sorted.reduce((s,r)=>s+(Number(r.tpt_tax)||0),0);
    const totTotal    = sorted.reduce((s,r)=>s+(Number(r.total)||0),0);

    const grossSqft   = Number(prop.gross_sqft)||totSqft;
    const vacantSqft  = Math.max(0,grossSqft-totSqft);
    const occPct      = grossSqft>0?(totSqft/grossSqft*100).toFixed(1):0;
    const vacPct      = grossSqft>0?(vacantSqft/grossSqft*100).toFixed(1):0;

    const tfTd = (v,right=true) => <td style={{...css.tfoot,textAlign:right?'right':'left'}}>{v}</td>;

    return (
      <div style={css.card}>
        {/* Header row */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:F.sm,fontWeight:'600',color:T.text1}}>{sorted.length} tenants</span>
          <div style={{flex:1}}/>
          <button onClick={()=>generateRentRollPDF(prop,sorted)}
            style={{display:'flex',alignItems:'center',gap:'6px',background:T.accent,border:'none',borderRadius:'5px',padding:'6px 14px',color:'#fff',fontSize:F.sm,fontWeight:'500',cursor:'pointer'}}>
            <i className="ti ti-file-download" style={{fontSize:'15px'}} aria-hidden="true"></i> Generate Rent Roll PDF
          </button>
        </div>

        {loading.rentRoll==='loading'?<div style={{color:T.text2,fontSize:F.base,padding:'20px 0'}}>Loading…</div>:sorted.length===0?<div style={{color:T.text3,fontSize:F.base,padding:'20px 0'}}>No current rent schedule found for this property.</div>:(
          <>
            {/* Occupancy summary — above table */}
            <div style={{display:'flex',gap:'24px',marginBottom:'12px',padding:'10px 12px',background:T.bg3,borderRadius:'5px',flexWrap:'wrap'}}>
              {[
                {label:'Occupied',    value:Number(totSqft).toLocaleString()+' sf'},
                {label:'Vacant',      value:Number(vacantSqft).toLocaleString()+' sf'},
                {label:'Gross',       value:Number(grossSqft).toLocaleString()+' sf'},
                {label:'Occupancy',   value:occPct+'%', color:Number(occPct)>=95?T.success:Number(occPct)>=80?T.warn:T.danger},
                {label:'Vacancy',     value:vacPct+'%', color:Number(vacPct)>20?T.danger:Number(vacPct)>5?T.warn:T.success},
                {label:'Monthly total',value:fmtMoney(totTotal)},
              ].map(s=>(
                <div key={s.label}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{s.label}</div>
                  <div style={{fontSize:F.md,fontWeight:'600',color:s.color||T.text0}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:F.sm}}>
                <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
                  <Th c="tenant_dba"       label="Tenant DBA"/>
                  <Th c="suite_num"        label="Suite"/>
                  <Th c="sqft"             label="Sq Ft"       align="right"/>
                  <Th c="security_deposit" label="Security"    align="right"/>
                  <Th c="lease_ends"       label="Lease Ends"/>
                  <Th c="base_rent"        label="Base Rent"   align="right"/>
                  <Th c="nnn"              label="NNN"         align="right"/>
                  <Th c="other_amt"        label="Other"       align="right"/>
                  <Th c="tpt_tax"          label="TPT Tax"     align="right"/>
                  <Th c="total"            label="Total"       align="right"/>
                  <Th c="base_per_sf"      label="Base/sf"     align="right"/>
                  <Th c="nnn_per_sf"       label="NNN/sf"      align="right"/>
                </tr></thead>
                <tbody>
                  {sorted.map((r,i)=>{
                    const bpsf = r.sqft&&r.base_rent ? r.base_rent/r.sqft : null;
                    const npsf = r.sqft&&r.nnn       ? r.nnn/r.sqft       : null;
                    return (
                      <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{...css.td,color:T.accent,maxWidth:'160px'}}>{r.tenant_dba||'—'}</td>
                        <td style={css.td}>{r.suite_num||'—'}</td>
                        <td style={css.tdNum}>{r.sqft?Number(r.sqft).toLocaleString():'—'}</td>
                        <td style={css.tdNum}>{r.security_deposit?fmtMoney(r.security_deposit):'—'}</td>
                        <td style={css.td}>{fmtDate(r.lease_ends)}</td>
                        <td style={css.tdNum}>{fmtMoney(r.base_rent)}</td>
                        <td style={css.tdNum}>{r.nnn?fmtMoney(r.nnn):'—'}</td>
                        <td style={css.tdNum}>{r.other_amt?fmtMoney(r.other_amt):'—'}</td>
                        <td style={css.tdNum}>{r.tpt_tax?fmtMoney(r.tpt_tax):'—'}</td>
                        <td style={{...css.tdNum,fontWeight:'500'}}>{fmtMoney(r.total)}</td>
                        <td style={css.tdNum}>{bpsf?'$'+bpsf.toFixed(2):'—'}</td>
                        <td style={css.tdNum}>{npsf?'$'+npsf.toFixed(2):'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr style={{borderTop:`2px solid ${T.accent}`}}>
                  {tfTd('Totals',false)}
                  {tfTd('')}
                  {tfTd(Number(totSqft).toLocaleString())}
                  {tfTd(fmtMoney(totSecurity))}
                  {tfTd('')}
                  {tfTd(fmtMoney(totBase))}
                  {tfTd(fmtMoney(totNNN))}
                  {tfTd(fmtMoney(totOther))}
                  {tfTd(fmtMoney(totTPT))}
                  {tfTd(fmtMoney(totTotal))}
                  {tfTd('')}{tfTd('')}
                </tr></tfoot>
              </table>
            </div>

            {/* Totals row is in tfoot above */}
          </>
        )}
      </div>
    );
  };

  // ── Tab 2: Work orders ──
  const TabWorkOrders = () => {
    const { sorted, Th } = useSortable(workOrders,'created_at','desc');
    return (
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Work orders</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{workOrders.length} total</span>
        </div>
        {loading.workOrders==='loading'?<div style={{color:T.text2,padding:'20px 0'}}>Loading…</div>:workOrders.length===0?<div style={{color:T.text3,padding:'20px 0'}}>No work orders found</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="wo_num"            label="WO #"/>
              <Th c="short_description" label="Description"/>
              <Th c="category"          label="Category"/>
              <Th c="priority"          label="Priority"/>
              <Th c="status"            label="Status"/>
              <Th c="stage"             label="Stage"/>
              <Th c="close_date"        label="Closed"/>
            </tr></thead>
            <tbody>
              {sorted.map((w,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,color:T.accent,whiteSpace:'nowrap'}}>{w.wo_num||w.podio_wo_number||'—'}</td>
                  <td style={{...css.td,maxWidth:'300px'}}>{w.short_description||'—'}</td>
                  <td style={css.td}>{w.category||'—'}</td>
                  <td style={css.td}><StatusBadge status={w.priority}/></td>
                  <td style={css.td}><StatusBadge status={w.status||w.wo_status}/></td>
                  <td style={css.td}>{w.stage||'—'}</td>
                  <td style={{...css.td,whiteSpace:'nowrap'}}>{fmtDate(w.close_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ── Tab 3: Issues ──
  const TabIssues = () => {
    const { sorted, Th } = useSortable(issues,'create_date','desc');
    return (
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Issues</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{issues.length} total</span>
        </div>
        {loading.issues==='loading'?<div style={{color:T.text2,padding:'20px 0'}}>Loading…</div>:issues.length===0?<div style={{color:T.text3,padding:'20px 0'}}>No issues found</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="issue_name"   label="Issue"/>
              <Th c="category"     label="Category"/>
              <Th c="priority"     label="Priority"/>
              <Th c="status"       label="Status"/>
              <Th c="progress_pct" label="Progress"/>
              <Th c="create_date"  label="Created"/>
              <Th c="close_date"   label="Closed"/>
            </tr></thead>
            <tbody>
              {sorted.map((iss,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,maxWidth:'260px',color:T.accent}}>{iss.issue_name||iss.scope||'—'}</td>
                  <td style={css.td}>{iss.category||'—'}</td>
                  <td style={css.td}><StatusBadge status={iss.priority}/></td>
                  <td style={css.td}><StatusBadge status={iss.status}/></td>
                  <td style={css.td}>{iss.progress_pct!=null?iss.progress_pct+'%':'—'}</td>
                  <td style={{...css.td,whiteSpace:'nowrap'}}>{fmtDate(iss.create_date)}</td>
                  <td style={{...css.td,whiteSpace:'nowrap'}}>{fmtDate(iss.close_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ── Tab 4: Insurance ──
  const TabInsurance = () => (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={css.card}>
        <div style={css.secTitle}>Property insurance</div>
        {loading.propIns==='loading'?<div style={{color:T.text2}}>Loading…</div>:propIns.length===0?<div style={{color:T.text3}}>No property insurance records found</div>:(
          propIns.map((ins,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',padding:'10px 0',borderBottom:i<propIns.length-1?`0.5px solid ${T.border}`:'none'}}>
              {Object.entries(ins).filter(([k])=>!['id','prop_code','created_at','updated_at','created_by','podio_id'].includes(k)).map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'2px'}}>{k.replace(/_/g,' ')}</div>
                  <div style={{fontSize:F.base,color:T.text0}}>{v!=null?String(v):'—'}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Tenant COIs</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{tntCois.length} certs</span>
        </div>
        {loading.tntCois==='loading'?<div style={{color:T.text2}}>Loading…</div>:tntCois.length===0?<div style={{color:T.text3}}>No COIs found</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              {['Tenant','Policy type','Carrier','Expiration','Status'].map(h=><th key={h} style={css.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {tntCois.map((c,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,color:T.accent}}>{c.tenant_dba||c.tenant_id||'—'}</td>
                  <td style={css.td}>{c.policy_type||c.coi_type||'—'}</td>
                  <td style={css.td}>{c.carrier||'—'}</td>
                  <td style={css.td}>{fmtDate(c.expiration_date||c.expires)}</td>
                  <td style={css.td}><StatusBadge status={c.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ── Tab 5: Monthly reports ──
  const TabReports = () => {
    const { sorted, Th } = useSortable(reports,'report_date','desc');
    return (
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Monthly reports</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{reports.length} records</span>
        </div>
        {loading.reports==='loading'?<div style={{color:T.text2,padding:'20px 0'}}>Loading…</div>:reports.length===0?<div style={{color:T.text3,padding:'20px 0'}}>No reports found</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="report_date" label="Date"/>
              <Th c="status"      label="Status"/>
              <Th c="notes"       label="Notes"/>
            </tr></thead>
            <tbody>
              {sorted.map((r,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,whiteSpace:'nowrap',color:T.accent}}>{fmtDate(r.report_date||r.created_at)}</td>
                  <td style={css.td}><StatusBadge status={r.status}/></td>
                  <td style={{...css.td,maxWidth:'500px',color:T.text1,whiteSpace:'normal'}}>{r.notes||r.report_notes||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ── Tab 6: Property taxes ──
  const TabTaxes = () => {
    const { sorted, Th } = useSortable(taxes,'tax_year','desc');
    return (
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Property taxes</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{taxes.length} records</span>
        </div>
        {loading.taxes==='loading'?<div style={{color:T.text2,padding:'20px 0'}}>Loading…</div>:taxes.length===0?<div style={{color:T.text3,padding:'20px 0'}}>No tax records found</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="tax_year"   label="Year"/>
              <Th c="amount"     label="Amount"   align="right"/>
              <Th c="status"     label="Status"/>
              <Th c="due_date"   label="Due date"/>
              <Th c="paid_date"  label="Paid date"/>
              <Th c="notes"      label="Notes"/>
            </tr></thead>
            <tbody>
              {sorted.map((t,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,color:T.accent}}>{t.tax_year||'—'}</td>
                  <td style={css.tdNum}>{fmtMoney(t.amount||t.tax_amount)}</td>
                  <td style={css.td}><StatusBadge status={t.status}/></td>
                  <td style={css.td}>{fmtDate(t.due_date)}</td>
                  <td style={css.td}>{fmtDate(t.paid_date)}</td>
                  <td style={{...css.td,maxWidth:'300px',color:T.text1}}>{t.notes||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ── Tab 7: Listing info ──
  const TabListing = () => {
    const { sorted, Th } = useSortable(listing,'created_at','desc');
    return (
      <div style={css.card}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
          <div style={css.secTitle}>Leasing pipeline / listing info</div>
          <span style={{fontSize:F.xs,color:T.text3}}>{listing.length} records</span>
        </div>
        {loading.listing==='loading'?<div style={{color:T.text2,padding:'20px 0'}}>Loading…</div>:listing.length===0?<div style={{color:T.text3,padding:'20px 0'}}>No listing records</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="stage"              label="Stage"/>
              <Th c="prospect_name"      label="Prospect"/>
              <Th c="sqft"              label="Sq ft"        align="right"/>
              <Th c="size_sqft_interest" label="Size interest"/>
              <Th c="source"             label="Source"/>
              <Th c="status"             label="Status"/>
              <Th c="created_at"         label="Created"/>
            </tr></thead>
            <tbody>
              {sorted.map((ls,i)=>(
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={css.td}><StatusBadge status={ls.stage}/></td>
                  <td style={{...css.td,color:T.accent}}>{ls.prospect_name||ls.tnt_dba_name||'—'}</td>
                  <td style={css.tdNum}>{ls.sqft?Number(ls.sqft).toLocaleString():'-'}</td>
                  <td style={css.td}>{ls.size_sqft_interest||'—'}</td>
                  <td style={css.td}>{ls.source||'—'}</td>
                  <td style={css.td}><StatusBadge status={ls.status}/></td>
                  <td style={{...css.td,whiteSpace:'nowrap'}}>{fmtDate(ls.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ── Tab 8: Documents ──
  const TabDocuments = () => {
    const links=[
      {label:'Root folder',          id:prop.gdrive_root_folder_id,         icon:'ti-folder'},
      {label:'Tenants folder',       id:prop.gdrive_tenants_folder_id,      icon:'ti-users'},
      {label:'Photos folder',        id:prop.gdrive_photos_folder_id,       icon:'ti-photo'},
      {label:'Issues folder',        id:prop.gdrive_issues_folder_id,       icon:'ti-alert-circle'},
      {label:'Reports folder',       id:prop.gdrive_reports_folder_id,      icon:'ti-chart-bar'},
      {label:'Work orders folder',   id:prop.gdrive_work_orders_folder_id,  icon:'ti-tool'},
      {label:'Property taxes folder',id:prop.gdrive_ptaxes_folder_id,       icon:'ti-receipt'},
    ].filter(l=>l.id);
    return (
      <div style={css.card}>
        <div style={css.secTitle}>Google Drive folders</div>
        {links.length===0?<div style={{color:T.text3,fontSize:F.base}}>No Drive folders linked yet</div>:(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:'8px'}}>
            {links.map(link=>(
              <a key={link.label} href={`https://drive.google.com/drive/folders/${link.id}`} target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:T.bg3,border:`0.5px solid ${T.border}`,borderRadius:'6px',textDecoration:'none',color:T.text0}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text0;}}>
                <i className={`ti ${link.icon}`} style={{fontSize:'18px',color:T.accent}} aria-hidden="true"></i>
                <span style={{fontSize:F.base}}>{link.label}</span>
                <i className="ti ti-external-link" style={{fontSize:F.xs,color:T.text3,marginLeft:'auto'}} aria-hidden="true"></i>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const tabContent = [<TabInfo/>,<TabTenants/>,<TabWorkOrders/>,<TabIssues/>,<TabInsurance/>,<TabReports/>,<TabTaxes/>,<TabListing/>,<TabDocuments/>];

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden',height:'100%'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',padding:'12px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
            <h1 style={{fontSize:F.lg,fontWeight:'500',margin:0,color:T.text0}}>{prop.property_name||prop.prop_code}</h1>
            <span style={{fontSize:F.base,color:T.text2}}>{prop.prop_code}</span>
            <StatusBadge status={prop.status}/>
          </div>
          <div style={{display:'flex',gap:'0',marginBottom:'14px',borderBottom:`0.5px solid ${T.border}`,flexWrap:'wrap'}}>
            {tabs.map((t,i)=>(
              <button key={t} onClick={()=>setActiveTab(i)}
                style={{background:'transparent',border:'none',padding:'8px 16px',cursor:'pointer',fontSize:F.base,color:activeTab===i?T.accent:T.text1,fontWeight:activeTab===i?'600':'400',borderBottom:activeTab===i?`2px solid ${T.accent}`:'2px solid transparent',marginBottom:'-1px',whiteSpace:'nowrap'}}>
                {t}
              </button>
            ))}
          </div>
          {tabContent[activeTab]}
        </div>
      </div>
      <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={onRightMouseDown}/>
    </div>
  );
};

// ── Properties list ───────────────────────────────────────────────────────────
const PropertiesView = ({ resetKey }) => {
  const [properties,setProperties]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState('active');
  const [search,setSearch]=useState('');
  const { sorted, Th } = useSortable(properties,'prop_code');

  // Reset to list when nav item clicked again
  useEffect(()=>{ setSelected(null); },[resetKey]);

  useEffect(()=>{
    sbFetch('properties','select=*&order=prop_code')
      .then(setProperties).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  if(selected) return <PropertyDetail prop={selected} onBack={()=>setSelected(null)}/>;

  const filtered=sorted.filter(p=>{
    const matchStatus=filter==='all'||p.status===filter;
    const q=search.toLowerCase();
    const matchSearch=!q||(p.property_name||'').toLowerCase().includes(q)||(p.prop_code||'').toLowerCase().includes(q)||(p.city||'').toLowerCase().includes(q);
    return matchStatus&&matchSearch;
  });

  return (
    <div style={{padding:'12px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
        <h1 style={{fontSize:F.lg,fontWeight:'500',margin:0,color:T.text0,flex:1}}>Properties</h1>
        {['active','archived','all'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{background:filter===f?T.bg3:'transparent',border:`0.5px solid ${filter===f?T.accent:T.border}`,borderRadius:'4px',padding:'5px 12px',fontSize:F.base,color:filter===f?T.accent:T.text2,cursor:'pointer'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <div style={{position:'relative'}}>
          <i className="ti ti-search" style={{position:'absolute',left:'8px',top:'50%',transform:'translateY(-50%)',fontSize:'15px',color:T.text3}} aria-hidden="true"></i>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, code, city…"
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px 6px 30px',fontSize:F.base,color:T.text0,outline:'none',width:'210px'}}/>
        </div>
      </div>
      {loading?<p style={{color:T.text2}}>Loading…</p>:error?(
        <div style={css.card}><p style={{color:T.danger,margin:0}}>Error: {error}</p></div>
      ):(
        <>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="prop_code"                label="Code"/>
              <Th c="property_name"            label="Property name"/>
              <Th c="city"                     label="City"/>
              <Th c="gross_sqft"               label="Gross sf"  align="right"/>
              <Th c="parking_stalls_standard"  label="Parking"   align="right"/>
              <Th c="status"                   label="Status"/>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>
              {filtered.map(prop=>(
                <tr key={prop.id} onClick={()=>setSelected(prop)} style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...css.td,color:T.accent,fontWeight:'600'}}>{prop.prop_code}</td>
                  <td style={{...css.td,maxWidth:'260px'}}>{prop.property_name||prop.property_marketing_name||'—'}</td>
                  <td style={css.td}>{prop.city||'—'}</td>
                  <td style={css.tdNum}>{prop.gross_sqft?Number(prop.gross_sqft).toLocaleString():'-'}</td>
                  <td style={css.tdNum}>{prop.parking_stalls_standard||'—'}</td>
                  <td style={css.td}><StatusBadge status={prop.status}/></td>
                  <td style={css.td}><i className="ti ti-chevron-right" style={{fontSize:'15px',color:T.text3}} aria-hidden="true"></i></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:F.sm,color:T.text3,marginTop:'8px'}}>{filtered.length} of {properties.length} properties</div>
        </>
      )}
    </div>
  );
};

// ── Tenant detail ─────────────────────────────────────────────────────────────
const TenantDetail = ({ tenant: initialTenant, onBack }) => {
  const [tenant,setTenant]=useState(initialTenant);
  const [rightCollapsed,setRightCollapsed]=useState(false);
  const [rightWidth,setRightWidth]=useState(300);
  const isResizingRight=useRef(false),startXRight=useRef(0),startWRight=useRef(0);
  const onRightMouseDown=useCallback(e=>{ isResizingRight.current=true; startXRight.current=e.clientX; startWRight.current=rightWidth; document.body.style.cursor='col-resize'; document.body.style.userSelect='none'; },[rightWidth]);
  useEffect(()=>{
    const onMove=e=>{ if(!isResizingRight.current)return; setRightWidth(Math.min(520,Math.max(200,startWRight.current-(e.clientX-startXRight.current)))); };
    const onUp=()=>{ isResizingRight.current=false; document.body.style.cursor=''; document.body.style.userSelect=''; };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
    return()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
  },[]);

  const saveField=async(field,value)=>{
    const updated=await sbPatch('tenants',tenant.id,{[field]:value});
    if(updated&&updated[0]) setTenant(updated[0]);
  };
  const daysLeft=tenant.lease_ends?Math.round((new Date(tenant.lease_ends)-new Date())/86400000):null;
  const dlColor=daysLeft===null?T.text3:daysLeft<0?T.danger:daysLeft<60?T.danger:daysLeft<180?T.warn:T.success;

  return (
    <div style={{display:'flex',flex:1,overflow:'hidden',height:'100%'}}>
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:'12px',marginBottom:'4px'}}>
          <h1 style={{fontSize:F.lg,fontWeight:'500',margin:0,color:T.text0}}>{tenant.tenant_dba||'—'}</h1>
          <span style={{fontSize:F.base,color:T.text2}}>{tenant.prop_code} · Suite {tenant.suite_num||'—'}</span>
          <StatusBadge status={tenant.tenant_status}/>
        </div>
        {daysLeft!==null&&<p style={{fontSize:F.base,color:dlColor,margin:'0 0 14px'}}>{daysLeft<0?`Lease expired ${Math.abs(daysLeft)} days ago`:daysLeft===0?'Lease expires today':`${daysLeft} days until lease expiry · ${fmtDate(tenant.lease_ends)}`}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <div style={css.card}>
            <div style={css.secTitle}>Lease info</div>
            <EditableField label="Lease status"     value={tenant.lease_status}    onSave={v=>saveField('lease_status',v)}/>
            <EditableField label="Lease type"       value={tenant.lease_type}      onSave={v=>saveField('lease_type',v)}/>
            <EditableField label="Suite"            value={tenant.suite_num}       onSave={v=>saveField('suite_num',v)}/>
            <EditableField label="Sq ft"            value={tenant.sqft}            onSave={v=>saveField('sqft',v)} type="number"/>
            <EditableField label="NNN pro-rata %"   value={tenant.nnn_prorata_share_pct} onSave={v=>saveField('nnn_prorata_share_pct',v)}/>
            <EditableField label="Lease starts"     value={tenant.lease_starts}    onSave={v=>saveField('lease_starts',v)} type="date"/>
            <EditableField label="Lease ends"       value={tenant.lease_ends}      onSave={v=>saveField('lease_ends',v)} type="date"/>
            <EditableField label="Term (months)"    value={tenant.lease_term_months} onSave={v=>saveField('lease_term_months',v)} type="number"/>
            <EditableField label="Amendment #"      value={tenant.amendment_num}   onSave={v=>saveField('amendment_num',v)}/>
            <EditableField label="Rent due day"     value={tenant.day_rent_due}    onSave={v=>saveField('day_rent_due',v)} type="number"/>
            <EditableField label="Late fee %"       value={tenant.late_fee_pct}    onSave={v=>saveField('late_fee_pct',v)}/>
            <EditableField label="Pays rent how"    value={tenant.pays_rent_how}   onSave={v=>saveField('pays_rent_how',v)}/>
            <EditableField label="Security deposit" value={tenant.security_deposit} onSave={v=>saveField('security_deposit',v)} type="number"/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            <div style={css.card}>
              <div style={css.secTitle}>Entity / contact</div>
              <EditableField label="Entity name"  value={tenant.entity_name}  onSave={v=>saveField('entity_name',v)}/>
              <EditableField label="Entity state" value={tenant.entity_state} onSave={v=>saveField('entity_state',v)}/>
              <EditableField label="Entity type"  value={tenant.entity_type}  onSave={v=>saveField('entity_type',v)}/>
              <EditableField label="Phone"        value={tenant.main_phone}   onSave={v=>saveField('main_phone',v)}/>
              <EditableField label="Address"      value={tenant.address}      onSave={v=>saveField('address',v)}/>
              <EditableField label="City"         value={tenant.city}         onSave={v=>saveField('city',v)}/>
              <EditableField label="State"        value={tenant.state}        onSave={v=>saveField('state',v)}/>
              <EditableField label="Zip"          value={tenant.zip}          onSave={v=>saveField('zip',v)}/>
              <EditableField label="Tenant use"   value={tenant.tenant_use}   onSave={v=>saveField('tenant_use',v)}/>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>Notes</div>
              <EditableField label="Lease notes"   value={tenant.lease_notes}   onSave={v=>saveField('lease_notes',v)}   type="textarea"/>
              <EditableField label="Company notes" value={tenant.company_notes} onSave={v=>saveField('company_notes',v)} type="textarea"/>
            </div>
          </div>
        </div>
      </div>
      <ActivityPanel collapsed={rightCollapsed} onCollapse={()=>setRightCollapsed(c=>!c)} width={rightWidth} onMouseDown={onRightMouseDown}/>
    </div>
  );
};

// ── Tenants list ──────────────────────────────────────────────────────────────
const TenantsView = ({ resetKey }) => {
  const [tenants,setTenants]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState('active');
  const [search,setSearch]=useState('');
  const { sorted, Th } = useSortable(tenants,'prop_code');

  useEffect(()=>{ setSelected(null); },[resetKey]);

  useEffect(()=>{
    sbFetch('tenants','select=*&order=prop_code,suite_num')
      .then(setTenants).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  if(selected) return <TenantDetail tenant={selected} onBack={()=>setSelected(null)}/>;

  const daysLeft=d=>d?Math.round((new Date(d)-new Date())/86400000):null;
  const dlColor=d=>d===null?T.text3:d<0?T.danger:d<60?T.danger:d<180?T.warn:T.text2;

  const filtered=sorted.filter(t=>{
    const matchStatus=filter==='all'||(t.tenant_status||'').toLowerCase()===filter;
    const q=search.toLowerCase();
    const matchSearch=!q||(t.tenant_dba||'').toLowerCase().includes(q)||(t.prop_code||'').toLowerCase().includes(q)||(t.suite_num||'').toLowerCase().includes(q);
    return matchStatus&&matchSearch;
  });

  return (
    <div style={{padding:'12px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
        <h1 style={{fontSize:F.lg,fontWeight:'500',margin:0,color:T.text0,flex:1}}>Tenants</h1>
        {['active','archived','all'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{background:filter===f?T.bg3:'transparent',border:`0.5px solid ${filter===f?T.accent:T.border}`,borderRadius:'4px',padding:'5px 12px',fontSize:F.base,color:filter===f?T.accent:T.text2,cursor:'pointer'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <div style={{position:'relative'}}>
          <i className="ti ti-search" style={{position:'absolute',left:'8px',top:'50%',transform:'translateY(-50%)',fontSize:'15px',color:T.text3}} aria-hidden="true"></i>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tenant, prop, suite…"
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 10px 6px 30px',fontSize:F.base,color:T.text0,outline:'none',width:'200px'}}/>
        </div>
      </div>
      {loading?<p style={{color:T.text2}}>Loading…</p>:error?(
        <div style={css.card}><p style={{color:T.danger,margin:0}}>Error: {error}</p></div>
      ):(
        <>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`0.5px solid ${T.border}`}}>
              <Th c="prop_code"    label="Prop"/>
              <Th c="suite_num"    label="Suite"/>
              <Th c="tenant_dba"   label="Tenant DBA"/>
              <Th c="sqft"         label="Sq ft"      align="right"/>
              <Th c="lease_ends"   label="Lease ends"/>
              <Th c="tenant_status" label="Status"/>
              <th style={css.th}>Days left</th>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>
              {filtered.map((t,i)=>{
                const d=daysLeft(t.lease_ends);
                return(
                  <tr key={i} onClick={()=>setSelected(t)} style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...css.td,color:T.accent,fontWeight:'600'}}>{t.prop_code}</td>
                    <td style={css.td}>{t.suite_num||'—'}</td>
                    <td style={{...css.td,maxWidth:'200px'}}>{t.tenant_dba||'—'}</td>
                    <td style={css.tdNum}>{t.sqft?Number(t.sqft).toLocaleString():'-'}</td>
                    <td style={css.td}>{fmtDate(t.lease_ends)}</td>
                    <td style={css.td}><StatusBadge status={t.tenant_status}/></td>
                    <td style={{...css.td,color:dlColor(d),fontWeight:d!==null&&d<60?'600':'400'}}>
                      {d===null?'—':d<0?`${Math.abs(d)}d exp`:`${d}d`}
                    </td>
                    <td style={css.td}><i className="ti ti-chevron-right" style={{fontSize:'15px',color:T.text3}} aria-hidden="true"></i></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{fontSize:F.sm,color:T.text3,marginTop:'8px'}}>{filtered.length} of {tenants.length} tenants</div>
        </>
      )}
    </div>
  );
};

// ── Home (morning briefing) ───────────────────────────────────────────────────
const HomeView = ({ properties }) => {
  const today2=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const activeProps=properties.filter(p=>p.status==='active');
  const urgentItems=[
    {id:1,type:'Lease expiry',       property:'777 Oak Street',status:'overdue',date:'2026-05-11'},
    {id:2,type:'Insurance cert',     property:'FOX Commons',   status:'today',  date:'2026-05-14'},
    {id:3,type:'CAM reconciliation', property:'CVP Plaza',     status:'week',   date:'2026-05-16'},
    {id:4,type:'Rent due',           property:'RHS Plaza',     status:'future', date:'2026-05-20'},
    {id:5,type:'Move-out inspection',property:'DCP Office',    status:'future', date:'2026-05-27'},
  ];
  const urgencyStyle=s=>({
    overdue:{badge:T.danger,badgeBg:'#3d1f1f',label:'Overdue'},
    today:  {badge:T.warn,  badgeBg:'#3d2e1a',label:'Today'},
    week:   {badge:T.accent,badgeBg:'#1a2e3a',label:'This week'},
  }[s]||{badge:T.success,badgeBg:'#1e2a1e',label:'Upcoming'});

  return (
    <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'10px'}}>
      <div>
        <h1 style={{fontSize:F.lg,fontWeight:'500',margin:'0 0 3px',color:T.text0}}>Good morning, Scott</h1>
        <p style={{fontSize:F.base,color:T.text2,margin:0}}>{today2} · {activeProps.length} active properties</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
        {[
          {label:'Active properties',value:activeProps.length,sub:'Sedona + N. AZ'},
          {label:'Total suites',     value:177, sub:'all properties'},
          {label:'Active tenants',   value:312, sub:'3 expiring soon'},
          {label:'Open work orders', value:48,  sub:'6 overdue',color:T.warn},
        ].map(s=>(
          <div key={s.label} style={css.card}>
            <div style={{fontSize:F.sm,color:T.text2,marginBottom:'4px'}}>{s.label}</div>
            <div style={{fontSize:F.xl,fontWeight:'500',color:s.color||T.text0}}>{s.value}</div>
            <div style={{fontSize:F.xs,color:T.text3,marginTop:'3px'}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
        <div style={{...css.card,flex:1.3,minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
            <div style={css.secTitle}>Urgent · needs attention</div>
            <span style={{fontSize:F.sm,color:T.text3}}>{urgentItems.length} items</span>
          </div>
          {urgentItems.map((item,i)=>{const u=urgencyStyle(item.status);return(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:i<urgentItems.length-1?`0.5px solid ${T.border}`:'none'}}>
              <span style={css.badge(u.badge,u.badgeBg)}>{u.label}</span>
              <span style={{fontSize:F.sm,color:T.text2,whiteSpace:'nowrap'}}>{item.type}</span>
              <span style={{fontSize:F.base,color:T.text0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.property}</span>
              <span style={{fontSize:F.sm,color:T.text3,whiteSpace:'nowrap'}}>{item.date}</span>
            </div>
          );})}
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:'10px',minWidth:0}}>
          <div style={{...css.card,padding:'10px 12px'}}>
            <div style={{...css.secTitle,marginBottom:'8px'}}>Weather</div>
            <div style={{display:'flex',gap:'10px'}}>
              <WeatherCard city="Sedona AZ" lat={34.8697} lon={-111.7609} url="https://forecast.weather.gov/MapClick.php?CityName=Sedona&state=AZ"/>
              <WeatherCard city="Olympia WA" lat={47.0379} lon={-122.9007} url="https://forecast.weather.gov/MapClick.php?CityName=Olympia&state=WA"/>
            </div>
          </div>
          <div style={css.card}>
            <div style={css.secTitle}>Recent activity</div>
            {[
              {dot:T.accent, text:'Email sent to Whole Foods re: lease renewal · CHQ',time:'8:42am'},
              {dot:T.success,text:'Work order #2847 closed — HVAC repair · ART',      time:'Yesterday'},
              {dot:T.warn,   text:'Late rent flag — FOX Commons Suite 3',              time:'Yesterday'},
            ].map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',padding:'6px 0',borderBottom:i<2?`0.5px solid ${T.border}`:'none'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:a.dot,flexShrink:0,marginTop:'5px'}}></div>
                <span style={{fontSize:F.base,color:T.text1,flex:1}}>{a.text}</span>
                <span style={{fontSize:F.sm,color:T.text3,whiteSpace:'nowrap'}}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:'10px'}}>
        <div style={{...css.card,flex:1,minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
            <div style={css.secTitle}>Leasing pipeline</div>
            <span style={{fontSize:F.sm,color:T.text3}}>4 active</span>
          </div>
          {[
            {stage:'New inquiry', stageBg:'#1e2a3a',sc:T.accent,  prop:'CPP · Suite 2B · 1,200 sf',tenant:'Unnamed prospect'},
            {stage:'Tour sched.',stageBg:'#2a2a1e',sc:'#c4b06a', prop:'SAC · Suite 1A · 800 sf',  tenant:'Verde Wellness'},
            {stage:"LOI recv'd", stageBg:'#2a1e3a',sc:T.purple,  prop:'OLY · Suite 4 · 2,100 sf', tenant:'Desert Sun Yoga'},
            {stage:'Negotiating',stageBg:'#1a2e2a',sc:'#5ab4a0', prop:'WAL · Suite B · 3,400 sf', tenant:'N. AZ Dental'},
          ].map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:i<3?`0.5px solid ${T.border}`:'none'}}>
              <span style={{fontSize:F.xs,padding:'2px 7px',borderRadius:'3px',background:p.stageBg,color:p.sc,whiteSpace:'nowrap'}}>{p.stage}</span>
              <span style={{fontSize:F.base,color:T.text1,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.prop}</span>
              <span style={{fontSize:F.sm,color:T.text2,whiteSpace:'nowrap'}}>{p.tenant}</span>
            </div>
          ))}
        </div>
        <div style={{...css.card,flex:1,minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
            <div style={css.secTitle}>Open work orders</div>
            <span style={{fontSize:F.sm,color:T.danger}}>6 overdue</span>
          </div>
          {[
            {pri:T.danger, desc:'Roof leak — NW corner', prop:'CRMS',age:'12d',ac:T.danger},
            {pri:T.danger, desc:'HVAC not cooling',      prop:'DCC', age:'8d', ac:T.danger},
            {pri:T.warn,   desc:'Parking lot light out', prop:'VVP', age:'3d', ac:T.text2},
            {pri:T.warn,   desc:'Door handle broken',    prop:'SS',  age:'2d', ac:T.text2},
            {pri:T.success,desc:'Touch-up paint — lobby',prop:'ATS', age:'1d', ac:T.text2},
          ].map((w,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:i<4?`0.5px solid ${T.border}`:'none'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:w.pri,flexShrink:0}}></div>
              <span style={{fontSize:F.base,color:T.text1,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.desc}</span>
              <span style={{fontSize:F.base,color:T.text2}}>{w.prop}</span>
              <span style={{fontSize:F.sm,color:w.ac}}>{w.age}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StubView = ({ title, note }) => (
  <div style={{padding:'12px 16px'}}>
    <h1 style={{fontSize:F.lg,fontWeight:'500',margin:'0 0 8px',color:T.text0}}>{title}</h1>
    <p style={{color:T.text2,fontSize:F.base}}>{note}</p>
  </div>
);

// ── Root ──────────────────────────────────────────────────────────────────────
const SedonaCRM = () => {
  const [collapsed,setCollapsed]       = useState(false);
  const [sidebarWidth,setSidebarWidth] = useState(220);
  const [currentView,setCurrentView]   = useState('home');
  const [properties,setProperties]     = useState([]);
  const [expandedMenu,setExpandedMenu] = useState(null);
  const [propResetKey,setPropResetKey] = useState(0);
  const [tntResetKey,setTntResetKey]   = useState(0);
  const isResizing=useRef(false),startX=useRef(0),startW=useRef(0);

  useEffect(()=>{
    sbFetch('properties','select=prop_code,property_name,status&order=prop_code').then(setProperties).catch(()=>{});
  },[]);

  const onMouseDown=useCallback(e=>{
    if(collapsed)return;
    isResizing.current=true; startX.current=e.clientX; startW.current=sidebarWidth;
    document.body.style.cursor='col-resize'; document.body.style.userSelect='none';
  },[collapsed,sidebarWidth]);

  useEffect(()=>{
    const onMove=e=>{ if(!isResizing.current)return; setSidebarWidth(Math.min(360,Math.max(40,startW.current+(e.clientX-startX.current)))); };
    const onUp=()=>{ isResizing.current=false; document.body.style.cursor=''; document.body.style.userSelect=''; };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
    return()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
  },[]);

  const renderView=()=>{
    switch(currentView){
      case'home':         return <HomeView properties={properties}/>;
      case'properties':   return <PropertiesView resetKey={propResetKey}/>;
      case'tenants':      return <TenantsView resetKey={tntResetKey}/>;
      case'leasing':      return <StubView title="Leasing pipeline"    note="Coming soon."/>;
      case'work-orders':  return <StubView title="Work orders & issues" note="Coming soon."/>;
      case'tnt-cois':     return <StubView title="Insurance"            note="Coming soon."/>;
      case'inspections':  return <StubView title="Inspections"          note="Coming soon."/>;
      case'suites':       return <StubView title="Suites"               note="Coming soon."/>;
      case'qbo':          return <StubView title="QBO Dashboard"        note="Coming in Phase 7."/>;
      case'invoices':     return <StubView title="Invoices"             note="Coming soon."/>;
      default:            return <HomeView properties={properties}/>;
    }
  };

  const navProps={collapsed,expandedMenu,setExpandedMenu,setCurrentView};
  const sidebarCollapsed = collapsed || sidebarWidth<=42;

  return (
    <div style={css.shell}>
      {/* ── Sidebar ── */}
      <div style={{width:collapsed?'40px':`${sidebarWidth}px`,background:T.bg0,borderRight:`0.5px solid ${T.border}`,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column',transition:isResizing.current?'none':'width 200ms ease'}}>
        {/* Header with collapse button — always visible */}
        <div style={{display:'flex',alignItems:'center',justifyContent:sidebarCollapsed?'center':'space-between',padding:sidebarCollapsed?'9px 0':'9px 12px',borderBottom:`0.5px solid ${T.border}`,minHeight:'44px',flexShrink:0}}>
          {!sidebarCollapsed&&<span style={{fontSize:F.sm,fontWeight:'600',color:T.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>ACP</span>}
          <button onClick={()=>{ setCollapsed(c=>!c); if(sidebarWidth<=42) setSidebarWidth(220); }}
            title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',borderRadius:'4px',flexShrink:0,fontSize:'14px',lineHeight:1}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:sidebarCollapsed?'6px 2px':'8px 8px'}}>
          <NavItem icon="ti-home" label="Home" active={currentView==='home'} onClick={()=>setCurrentView('home')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 4px 4px',fontWeight:'600'}}>Operations</div>}
          <NavItem icon="ti-building-store" label="Properties"  active={currentView==='properties'}  onClick={()=>{ setCurrentView('properties'); setPropResetKey(k=>k+1); }}  {...navProps}/>
          <NavItem icon="ti-users"          label="Tenants"     active={currentView==='tenants'}     onClick={()=>{ setCurrentView('tenants');    setTntResetKey(k=>k+1);  }}  {...navProps}/>
          <NavItem icon="ti-door"           label="Suites"      active={currentView==='suites'}      onClick={()=>setCurrentView('suites')}      {...navProps}/>
          <NavItem icon="ti-tool"           label="Work Orders" active={currentView==='work-orders'} onClick={()=>setCurrentView('work-orders')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 4px 4px',fontWeight:'600'}}>Leasing</div>}
          <NavItem icon="ti-pipeline"  label="Pipeline" active={currentView==='leasing'} onClick={()=>setCurrentView('leasing')} {...navProps}/>
          <NavItem icon="ti-file-text" label="Leases"   active={currentView==='leases'}  onClick={()=>setCurrentView('leases')}  {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 4px 4px',fontWeight:'600'}}>Compliance</div>}
          <NavItem icon="ti-shield-check"    label="Insurance"   active={currentView==='tnt-cois'}    onClick={()=>setCurrentView('tnt-cois')}    {...navProps}/>
          <NavItem icon="ti-clipboard-check" label="Inspections" active={currentView==='inspections'} onClick={()=>setCurrentView('inspections')} {...navProps}/>
          {!sidebarCollapsed&&<div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 4px 4px',fontWeight:'600'}}>Finance</div>}
          <NavItem icon="ti-chart-bar" label="QBO Dashboard" active={currentView==='qbo'}      onClick={()=>setCurrentView('qbo')}      {...navProps}/>
          <NavItem icon="ti-receipt"   label="Invoices"      active={currentView==='invoices'} onClick={()=>setCurrentView('invoices')} {...navProps}/>
        </div>

        <div style={{padding:sidebarCollapsed?'6px 2px':'6px 8px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavItem icon="ti-settings" label="Settings" {...navProps}/>
        </div>
      </div>

      {/* Left resize handle */}
      {!collapsed&&(
        <div onMouseDown={onMouseDown}
          style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background=T.accent}
          onMouseLeave={e=>e.currentTarget.style.background=T.border}/>
      )}

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={css.topbar}>
          <span style={{fontSize:F.base,fontWeight:'700',color:T.warn,flex:1,letterSpacing:'0.01em'}}>Anderson Commercial Properties</span>
          <i className="ti ti-bell" style={{fontSize:'17px',color:T.text2,cursor:'pointer'}} aria-hidden="true"></i>
          <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'#2a3a52',display:'flex',alignItems:'center',justifyContent:'center',fontSize:F.sm,color:T.accent,fontWeight:'600',cursor:'pointer'}}>SA</div>
        </div>
        <div style={{flex:1,overflowY:'auto',background:T.bg1,display:'flex',flexDirection:'column'}}>
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default SedonaCRM;
