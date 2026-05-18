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
  tdNum: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', textAlign:'right' },
};

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
    occupied:[T.success,'#1e2a1e'], vacant:[T.danger,'#3d1f1f'],
    'for lease':[T.accent,'#1a2e3a'], 'occupied / for lease':[T.warn,'#3d2e1a'],
    office:[T.purple,'#2a1e3a'], retail:[T.accent,'#1a2e3a'],
    restaurant:[T.warn,'#3d2e1a'], other:[T.text2,T.bg3],
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

// ── Suite Detail ──────────────────────────────────────────────────────────────
const SuiteDetail = ({ suite, onBack, onUpdate }) => {
  const [data, setData] = useState(suite);

  const save = async (field, val) => {
    await sbPatch('suites', data.id, { [field]: val||null });
    const updated = {...data, [field]: val};
    setData(updated); onUpdate?.(updated);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            ← Suites
          </button>
          <StatusBadge status={data.status}/>
          <StatusBadge status={data.space_type}/>
        </div>
        <div style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>
          Suite {data.suite_num||'—'}
        </div>
        <div style={{fontSize:F.sm,color:T.text2}}>
          {data.prop_code} · {fmtNum(data.sqft)} sf · {data.space_type||'—'}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

          <div style={css.card}>
            <div style={css.secTitle}>Suite Info</div>
            <EditableField label="Suite Number" value={data.suite_num} onSave={v=>save('suite_num',v)}/>
            <div style={{marginBottom:'10px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Space Type</div>
              <select value={data.space_type||''} onChange={e=>save('space_type',e.target.value)}
                style={{width:'100%',background:T.bg3,border:`1px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                <option value="">— select —</option>
                {['Office','Retail','Restaurant','Other'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{marginBottom:'10px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Status</div>
              <select value={data.status||''} onChange={e=>save('status',e.target.value)}
                style={{width:'100%',background:T.bg3,border:`1px solid ${T.border}`,borderRadius:'4px',padding:'5px 8px',color:T.text0,fontSize:F.base,outline:'none',cursor:'pointer'}}>
                <option value="">— select —</option>
                {['Occupied','Vacant','For Lease','Occupied / For Lease'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <EditableField label="Sq Ft" value={data.sqft} onSave={v=>save('sqft',v)} type="number"/>
            <EditableField label="Location Description" value={data.location_desc} onSave={v=>save('location_desc',v)}/>
          </div>

          <div style={css.card}>
            <div style={css.secTitle}>Current Rent</div>
            <EditableField label="Base Rent (mo)" value={data.current_base_rent} onSave={v=>save('current_base_rent',v)} type="number"/>
            <EditableField label="NNN (mo)" value={data.current_nnn} onSave={v=>save('current_nnn',v)} type="number"/>
            <EditableField label="CAM Impound (mo)" value={data.current_cam_impound} onSave={v=>save('current_cam_impound',v)} type="number"/>
            <EditableField label="TPT Tax (mo)" value={data.current_tpt_tax} onSave={v=>save('current_tpt_tax',v)} type="number"/>
            <EditableField label="Total Rent (mo)" value={data.current_total_rent} onSave={v=>save('current_total_rent',v)} type="number"/>
            <div style={{marginTop:'8px',padding:'8px',background:T.bg3,borderRadius:'4px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Total</div>
              <div style={{fontSize:F.lg,fontWeight:'700',color:T.accent}}>{fmtMoney(data.current_total_rent)}</div>
            </div>
          </div>

          <div style={css.card}>
            <div style={css.secTitle}>Asking Rates (Vacant)</div>
            <EditableField label="Asking Base (mo/sf)" value={data.asking_base_per_sf} onSave={v=>save('asking_base_per_sf',v)} type="number"/>
            <EditableField label="Asking Base (yr/sf)" value={data.asking_base_per_sf_yr} onSave={v=>save('asking_base_per_sf_yr',v)} type="number"/>
            <EditableField label="Asking NNN (mo/sf)" value={data.asking_nnn_per_sf} onSave={v=>save('asking_nnn_per_sf',v)} type="number"/>
            <EditableField label="Asking NNN (yr/sf)" value={data.asking_nnn_per_sf_yr} onSave={v=>save('asking_nnn_per_sf_yr',v)} type="number"/>
            <EditableField label="Available Date" value={data.available_date} onSave={v=>save('available_date',v)} type="date"/>
            <EditableField label="TPT Tax %" value={data.tpt_tax_pct} onSave={v=>save('tpt_tax_pct',v)} type="number"/>
          </div>

          <div style={css.card}>
            <div style={css.secTitle}>Notes & Links</div>
            <EditableField label="Suite Notes" value={data.suite_notes} onSave={v=>save('suite_notes',v)} type="textarea"/>
            <EditableField label="Amenities" value={data.amenities} onSave={v=>save('amenities',v)} type="textarea"/>
            {data.gdrive_slide_url && (
              <div style={{marginTop:'8px'}}>
                <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'4px'}}>Listing Slide</div>
                <a href={data.gdrive_slide_url} target="_blank" rel="noreferrer"
                  style={{fontSize:F.sm,color:T.accent,textDecoration:'none'}}>Open in Drive ↗</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Suites List ───────────────────────────────────────────────────────────────
const SuitesList = ({ onSelect }) => {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [propFilter, setPropFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeProps, setActiveProps] = useState([]);
  const { sorted, Th } = useSortable(suites, 'prop_code');

  useEffect(() => {
    setLoading(true);
    sbFetch('suites', 'select=*&order=prop_code.asc,suite_num.asc')
      .then(d => { setSuites(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    sbFetch('properties', 'select=prop_code&status=eq.active&order=prop_code.asc')
      .then(d => setActiveProps(d.map(p => p.prop_code)))
      .catch(() => {});
  }, []);

  const statuses = ['All','Occupied','Vacant','For Lease','Occupied / For Lease'];

  const filtered = sorted.filter(s => {
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    if (propFilter && s.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (s.suite_num||'').toLowerCase().includes(q) ||
        (s.prop_code||'').toLowerCase().includes(q) ||
        (s.space_type||'').toLowerCase().includes(q) ||
        (s.location_desc||'').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary counts
  const counts = {
    occupied: suites.filter(s=>s.status==='Occupied').length,
    vacant: suites.filter(s=>s.status==='Vacant'||s.status==='For Lease').length,
    totalSf: suites.reduce((sum,s)=>sum+(Number(s.sqft)||0),0),
    occupiedSf: suites.filter(s=>s.status==='Occupied').reduce((sum,s)=>sum+(Number(s.sqft)||0),0),
  };
  const occPct = counts.totalSf > 0 ? Math.round(counts.occupiedSf/counts.totalSf*100) : 0;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Suites</span>
          <span style={{fontSize:F.sm,color:T.text2}}>{filtered.length} shown</span>
        </div>

        {/* Summary cards */}
        <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
          {[
            ['Occupied', counts.occupied, T.success],
            ['Vacant / For Lease', counts.vacant, T.danger],
            ['Occupancy', `${occPct}%`, occPct>=90?T.success:occPct>=70?T.warn:T.danger],
            ['Total Sq Ft', fmtNum(counts.totalSf), T.text1],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'6px',padding:'8px 14px',minWidth:'110px'}}>
              <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
              <div style={{fontSize:F.xl,fontWeight:'700',color,marginTop:'2px'}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'2px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`}}>
            {statuses.map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                style={{padding:'4px 10px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.sm,
                  background:statusFilter===s?T.bg3:'transparent',
                  color:statusFilter===s?T.text0:T.text2,
                  fontWeight:statusFilter===s?'600':'400'}}>
                {s}
              </button>
            ))}
          </div>
          <select value={propFilter} onChange={e=>setPropFilter(e.target.value)}
            style={{background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:propFilter?T.text0:T.text2,fontSize:F.sm,outline:'none',cursor:'pointer'}}>
            <option value="">All Properties</option>
            {activeProps.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search suites…"
            style={{flex:1,minWidth:'180px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:'5px 10px',color:T.text0,fontSize:F.sm,outline:'none'}}/>
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'32px',textAlign:'center',color:T.text3}}>Loading suites…</div>}
        {!loading && (
          <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'60px'}}/>  {/* Prop */}
              <col style={{width:'70px'}}/>  {/* Suite # */}
              <col style={{width:'90px'}}/>  {/* Type */}
              <col style={{width:'100px'}}/> {/* Status */}
              <col style={{width:'80px'}}/>  {/* Sq Ft */}
              <col style={{width:'110px'}}/> {/* Base Rent */}
              <col style={{width:'100px'}}/> {/* NNN */}
              <col style={{width:'110px'}}/> {/* Total */}
              <col style={{width:'auto'}}/>  {/* Location */}
              <col style={{width:'90px'}}/>  {/* Available */}
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr>
                <Th c="prop_code" label="Prop"/>
                <Th c="suite_num" label="Suite"/>
                <Th c="space_type" label="Type"/>
                <Th c="status" label="Status"/>
                <Th c="sqft" label="Sq Ft" align="right"/>
                <Th c="current_base_rent" label="Base Rent" align="right"/>
                <Th c="current_nnn" label="NNN" align="right"/>
                <Th c="current_total_rent" label="Total" align="right"/>
                <Th c="location_desc" label="Location"/>
                <Th c="available_date" label="Available"/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No suites match filters</td></tr>
              )}
              {filtered.map((s,i) => (
                <tr key={s.id}
                  onClick={()=>onSelect(s)}
                  style={{borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:i%2===0?'transparent':T.bg0}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.bg0}>
                  <td style={{...css.td,color:T.accent,fontWeight:'500'}}>{s.prop_code}</td>
                  <td style={{...css.td,fontWeight:'500'}}>{s.suite_num||'—'}</td>
                  <td style={{...css.td,color:T.text2}}>{s.space_type||'—'}</td>
                  <td style={css.td}><StatusBadge status={s.status}/></td>
                  <td style={css.tdNum}>{fmtNum(s.sqft)}</td>
                  <td style={css.tdNum}>{s.current_base_rent?fmtMoney(s.current_base_rent):<span style={{color:T.text3}}>—</span>}</td>
                  <td style={css.tdNum}>{s.current_nnn?fmtMoney(s.current_nnn):<span style={{color:T.text3}}>—</span>}</td>
                  <td style={{...css.tdNum,fontWeight:'600',color:s.current_total_rent?T.accent:T.text3}}>{s.current_total_rent?fmtMoney(s.current_total_rent):'—'}</td>
                  <td style={{...css.td,color:T.text2}}>{s.location_desc||'—'}</td>
                  <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{s.available_date?fmtDate(s.available_date):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SuitesView() {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'#1e2128'}}>
      {selected
        ? <SuiteDetail suite={selected} onBack={()=>setSelected(null)} onUpdate={u=>setSelected(u)}/>
        : <SuitesList onSelect={setSelected}/>
      }
    </div>
  );
}
