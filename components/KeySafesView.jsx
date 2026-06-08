import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Key, ChatCircle, CaretLeft, CaretRight } from '@phosphor-icons/react';
import RichTextEditor from './RichTextEditor';
import { ActivityPanel } from './TasksView';

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

export const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
export const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };
const css = {
  card: { background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'12px 14px' },
  badge: (color,bg) => ({ fontSize:F.xs, padding:'2px 7px', borderRadius:'3px', fontWeight:'500', whiteSpace:'nowrap', color, background:bg }),
  th: { fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', padding:'5px 8px', fontWeight:'600', whiteSpace:'nowrap', textAlign:'left', background:T.bg2 },
  td: { fontSize:F.sm, color:T.text0, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};

export const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}-${dt.getUTCFullYear()}`;
};

const StatusBadge = ({ status }) => {
  const [color,bg] = status === 'In Use' ? [T.success,'#1a3a1a'] : [T.text2,T.bg3];
  return <span style={css.badge(color,bg)}>{status||'—'}</span>;
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
const InlineBlurField = ({ value, onSave, type='text', readOnly=false }) => {
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

  const displayVal = type==='date'&&val ? fmtDate(val) : val;

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
      style={{fontSize:F.base,color:displayVal?T.text0:T.text3,cursor:'text',padding:'4px 0',minHeight:'24px',border:'1px solid transparent',lineHeight:'1.4',borderRadius:'4px'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {displayVal||<span style={{color:T.text3,fontStyle:'italic',fontSize:F.sm}}>—</span>}
      {saving&&<span style={{color:T.text3,fontSize:F.xs,marginLeft:'6px'}}>saving…</span>}
    </div>
  );
};

// ── InlineTextarea ────────────────────────────────────────────────────────────
const InlineTextarea = ({ value, onSave }) => {
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(value??'');
  const [saving,setSaving]   = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ setVal(value??''); },[value]);
  useEffect(()=>{ if(editing) ref.current?.focus(); },[editing]);

  const commit = async () => {
    setEditing(false);
    if (val===String(value??'')) return;
    setSaving(true);
    try { await onSave(val||null); }
    catch { setVal(value??''); }
    finally { setSaving(false); }
  };

  return editing ? (
    <textarea ref={ref} value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={commit}
      rows={5}
      style={{width:'100%',boxSizing:'border-box',background:T.bg3,border:`1px solid ${T.accent}`,borderRadius:'4px',padding:'6px 8px',color:T.text0,fontSize:F.base,outline:'none',resize:'vertical',lineHeight:'1.5',minHeight:'120px',paddingBottom:'72px'}}
    />
  ) : (
    <div onClick={()=>setEditing(true)} title="Click to edit"
      style={{fontSize:F.base,color:val?T.text0:T.text3,cursor:'text',padding:'4px 0',minHeight:'40px',border:'1px solid transparent',borderRadius:'4px',lineHeight:'1.5',whiteSpace:'pre-wrap',wordBreak:'break-word'}}
      onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${T.border}`}
      onMouseLeave={e=>e.currentTarget.style.border='1px solid transparent'}>
      {val||<span style={{fontStyle:'italic',fontSize:F.sm}}>—</span>}
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

// ── StatusPills (In Use / Removed) ────────────────────────────────────────────
const StatusPills = ({ value, onSave }) => {
  const opts = [
    { key:'In Use',  activeBg:T.success, activeColor:'#fff', border:T.success, hover:'rgba(106,176,106,0.20)' },
    { key:'Removed', activeBg:T.text2,   activeColor:'#fff', border:T.text2,   hover:'rgba(90,98,114,0.20)' },
  ];
  return (
    <div style={{display:'flex',gap:'5px'}}>
      {opts.map(({key,activeBg,activeColor,border,hover})=>{
        const active=(value||'In Use')===key;
        return (
          <button key={key} onClick={()=>!active&&onSave(key)}
            style={{padding:'3px 10px',borderRadius:'4px',fontSize:F.xs,fontWeight:'600',cursor:active?'default':'pointer',border:`1px solid ${border}`,background:active?activeBg:'transparent',color:active?activeColor:border,transition:'background 0.15s ease'}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hover;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
            {key}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KeySafesList
// ─────────────────────────────────────────────────────────────────────────────
const KeySafesList = ({ onSelect, filterPropCode }) => {
  const [items,setItems]         = useState([]);
  const [loading,setLoading]     = useState(true);
  const [error,setError]         = useState(null);
  const [propCodes,setPropCodes] = useState([]);
  const [statusFilter,setStatusFilter] = useState('All');
  const [propFilter,setPropFilter]     = useState('');
  const [search,setSearch]             = useState('');

  useEffect(()=>{
    setLoading(true); setError(null);
    const parts=[];
    if (statusFilter==='In Use') parts.push('status=eq.In%20Use');
    else if (statusFilter==='Available') parts.push('status=in.(Avail.-D.Holt,Avail.-Office,Avail.-FIT,Avail.-SA%20House)');
    else if (statusFilter==='Archived') parts.push('status=eq.Archived');
    else if (statusFilter==='Other') parts.push('status=in.(Unknown,REPLACE)');
    const pc=filterPropCode||propFilter;
    if (pc) parts.push(`prop_code=eq.${encodeURIComponent(pc)}`);
    if (search) parts.push(`key_safe_code=ilike.*${encodeURIComponent(search)}*`);
    parts.push('order=prop_code.asc.nullslast,created_at.desc');
    sbFetch('key_safes',`select=*&${parts.join('&')}`)
      .then(d=>{ setItems(d||[]); setLoading(false); })
      .catch(e=>{ setError(e.message); setLoading(false); });
  },[statusFilter,propFilter,filterPropCode,search]);

  useEffect(()=>{
    if (!filterPropCode) {
      sbFetch('properties','select=prop_code&status=eq.active&order=prop_code.asc')
        .then(d=>setPropCodes(d.map(r=>r.prop_code)))
        .catch(()=>{});
    }
  },[filterPropCode]);

  useEffect(()=>{
    document.title='Key Safes | SedonaCRM';
    return ()=>{ document.title='SedonaCRM'; };
  },[]);

  const propBtn = active => ({
    padding:'3px 7px',borderRadius:'4px',cursor:'pointer',fontSize:F.xs,whiteSpace:'nowrap',flexShrink:0,
    border:`0.5px solid ${active?T.accent:T.border}`,background:active?T.accent:'transparent',
    color:active?'#fff':T.text2,fontWeight:active?'600':'400',
  });

  const statBtn = (key,active) => ({
    padding:'3px 8px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:F.xs,
    background:active?T.bg3:'transparent',color:active?T.text0:T.text2,fontWeight:active?'600':'400',
  });

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'7px 14px 6px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'5px'}}>
          <Key size={22} weight="bold" style={{color:'#E8630A',flexShrink:0}}/>
          <span style={{fontSize:F.lg,fontWeight:'600',color:T.text0}}>Key Safes</span>
          <span style={{fontSize:F.xs,color:T.text3}}>{items.length} shown</span>
          <div style={{marginLeft:'auto',position:'relative',display:'flex',alignItems:'center',flexShrink:0}}>
            {search&&(
              <button onClick={()=>setSearch('')}
                style={{position:'absolute',left:'7px',background:'transparent',border:'none',cursor:'pointer',color:T.text2,fontSize:'14px',lineHeight:1,padding:0,zIndex:1}}>×</button>
            )}
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code…"
              style={{width:'160px',background:T.bg2,border:`0.5px solid ${T.border}`,borderRadius:'5px',padding:`4px 10px 4px ${search?'26px':'10px'}`,color:T.text0,fontSize:F.xs,outline:'none'}}/>
          </div>
        </div>
        {/* Status filter */}
        <div style={{display:'flex',gap:'1px',background:T.bg2,borderRadius:'5px',padding:'2px',border:`0.5px solid ${T.border}`,width:'fit-content',marginBottom:'5px'}}>
          {['All','In Use','Available','Archived','Other'].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} style={statBtn(s,statusFilter===s)}>{s}</button>
          ))}
        </div>
        {/* Property pills */}
        {!filterPropCode&&propCodes.length>0&&(
          <div style={{display:'flex',gap:'4px',overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:'4px',flexWrap:'nowrap'}}>
            <button onClick={()=>setPropFilter('')} style={propBtn(!propFilter)}>All Props</button>
            {propCodes.map(pc=>(
              <button key={pc} onClick={()=>setPropFilter(propFilter===pc?'':pc)} style={propBtn(propFilter===pc)}>{pc}</button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading&&<div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>Loading…</div>}
      {error&&<div style={{padding:'32px',textAlign:'center',color:T.danger,fontSize:F.sm}}>Error: {error}</div>}
      {!loading&&!error&&(
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="crm-list-table" style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'70px'}}/>
              <col style={{width:'80px'}}/>
              <col style={{width:'120px'}}/>
              <col style={{width:'150px'}}/>
              <col/>
              <col style={{width:'80px'}}/>
              <col style={{width:'100px'}}/>
            </colgroup>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr>
                <th style={css.th}>Prop</th>
                <th style={css.th}>ID#</th>
                <th style={css.th}>Code</th>
                <th style={css.th}>Location</th>
                <th style={css.th}>Contents</th>
                <th style={css.th}>Status</th>
                <th style={css.th}>FU Date</th>
              </tr>
            </thead>
            <tbody>
              {items.length===0&&(
                <tr><td colSpan={7} style={{...css.td,textAlign:'center',padding:'32px',color:T.text3}}>No key safes found</td></tr>
              )}
              {items.map((item,i)=>{
                const href=`/key-safes/X${item.id.slice(-6)}`;
                const rowBg=i%2===0?'transparent':T.bg0;
                return (
                  <tr key={item.id}
                    style={{borderBottom:`0.5px solid ${T.border}`,background:rowBg,cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background=rowBg}
                    onClick={e=>{if(e.target.closest('a'))return;const navL=items.map(r=>({id:r.id}));sessionStorage.setItem('keySafesNavList',JSON.stringify(navL));sessionStorage.setItem('keySafesNavIndex',String(items.findIndex(r=>r.id===item.id)));sessionStorage.setItem('keySafesBackUrl',window.location.pathname);onSelect(item);}}>
                    <td style={{...css.td,color:T.accent,fontWeight:'500',fontSize:F.xs}}>{item.prop_code||''}</td>
                    <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{item.id_num||''}</td>
                    <td style={{...css.td,fontWeight:'600'}}>
                      <a href={href}
                        onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();const navL=items.map(r=>({id:r.id}));sessionStorage.setItem('keySafesNavList',JSON.stringify(navL));sessionStorage.setItem('keySafesNavIndex',String(items.findIndex(r=>r.id===item.id)));sessionStorage.setItem('keySafesBackUrl',window.location.pathname);onSelect(item);}}}
                        style={{color:'inherit',textDecoration:'none'}}>
                        {item.key_safe_code||'—'}
                      </a>
                    </td>
                    <td style={css.td} title={item.on_site_location}>{item.on_site_location||''}</td>
                    <td style={css.td} title={item.contents}>{item.contents||''}</td>
                    <td style={{...css.td,overflow:'visible'}}><StatusBadge status={item.status||'In Use'}/></td>
                    <td style={{...css.td,color:T.text2,fontSize:F.xs}}>{item.follow_up_date?fmtDate(item.follow_up_date):''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Mobile cards */}
          <div className="crm-mobile-cards">
            {items.length===0&&<div style={{padding:'32px',textAlign:'center',color:T.text3,fontSize:F.sm}}>No key safes found</div>}
            {items.map((item,i)=>{
              const rowBg=i%2===0?'transparent':T.bg0;
              return (
                <div key={item.id}
                  style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`,cursor:'pointer',background:rowBg,minHeight:'44px'}}
                  onClick={()=>{const navL=items.map(r=>({id:r.id}));sessionStorage.setItem('keySafesNavList',JSON.stringify(navL));sessionStorage.setItem('keySafesNavIndex',String(items.findIndex(r=>r.id===item.id)));sessionStorage.setItem('keySafesBackUrl',window.location.pathname);onSelect(item);}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                    {item.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'1px 6px',borderRadius:'3px',fontWeight:'600'}}>{item.prop_code}</span>}
                    <span style={{fontWeight:'600',fontSize:F.base,color:T.text0}}>{item.key_safe_code||'—'}</span>
                    <StatusBadge status={item.status||'In Use'}/>
                  </div>
                  {item.on_site_location&&<div style={{fontSize:F.xs,color:T.text2}}>{item.on_site_location}</div>}
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
// KeySafeDetail — named export
// ─────────────────────────────────────────────────────────────────────────────
export const KeySafeDetail = ({ keySafe: initialItem, itemId, onBack, onUpdate }) => {
  const [data,setData]       = useState(initialItem||null);
  const [loading,setLoading] = useState(!initialItem);
  const [notFound,setNotFound] = useState(false);
  const [activeProps,setActiveProps] = useState([]);
  const [copied,setCopied]   = useState(false);
  const [navList,setNavList] = useState(null);
  const [navIdx,setNavIdx]   = useState(-1);
  const [navLoading,setNavLoading] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [activityCollapsed,setActivityCollapsed] = useState(isMobile);
  const [activityWidth,setActivityWidth] = useState(280);
  const activityResizingRef = useRef(false);

  const startActivityResize = useCallback(e => {
    activityResizingRef.current = true;
    const startX = e.clientX, startW = activityWidth;
    const onMove = me => {
      if (!activityResizingRef.current) return;
      setActivityWidth(Math.max(200, Math.min(480, startW - (me.clientX - startX))));
    };
    const onUp = () => {
      activityResizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [activityWidth]);

  useEffect(()=>{
    if (initialItem){setData(initialItem);setLoading(false);return;}
    if (!itemId) return;
    let fetchPromise;
    if (itemId.includes('-')) {
      fetchPromise = sbFetch('key_safes', `select=*&id=eq.${itemId}`);
    } else if (itemId.startsWith('X')) {
      const suffix = itemId.slice(1);
      fetchPromise = sbFetch('key_safes', `select=*`).then(rows=>
        (rows||[]).filter(r=>r.id&&r.id.slice(-6)===suffix)
      );
    } else {
      fetchPromise = sbFetch('key_safes', `select=*&id=eq.${itemId}`);
    }
    fetchPromise
      .then(rows=>{
        if (!rows||!rows.length){setNotFound(true);setLoading(false);return;}
        setData(rows[0]);setLoading(false);
      })
      .catch(()=>{setNotFound(true);setLoading(false);});
  },[itemId,initialItem]);

  useEffect(()=>{
    const stored=sessionStorage.getItem('keySafesNavList');
    if(stored){try{setNavList(JSON.parse(stored));}catch{}}
    const idx=sessionStorage.getItem('keySafesNavIndex');
    if(idx!=null)setNavIdx(parseInt(idx,10));
  },[]);

  useEffect(()=>{
    sbFetch('properties','select=prop_code,property_name&status=eq.active&order=prop_code.asc')
      .then(setActiveProps).catch(()=>{});
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
    document.title=`Key Safe${data.prop_code?' — '+data.prop_code:''} | SedonaCRM`;
    return ()=>{ document.title='SedonaCRM'; };
  },[data?.prop_code]);

  const save = async (field, val) => {
    const now = new Date().toISOString();
    const updates = { [field]: val??null, updated_at: now };
    await sbPatch('key_safes', data.id, updates);
    const updated = { ...data, ...updates };
    setData(updated);
    onUpdate?.(updated);
  };

  const goNav = async (dir) => {
    if(!navList||navLoading)return;
    const next=navIdx+dir;
    if(next<0||next>=navList.length)return;
    setNavLoading(true);
    const entry=navList[next];
    try{
      const rows=await sbFetch('key_safes',`id=eq.${entry.id}&select=*&limit=1`);
      if(!rows||!rows.length){setNavLoading(false);return;}
      const newRec=rows[0];
      setData(newRec);
      setNavIdx(next);
      sessionStorage.setItem('keySafesNavIndex',String(next));
      window.history.replaceState({},'',`/key-safes/X${newRec.id.slice(-6)}`);
      document.title=`Key Safe${newRec.prop_code?' — '+newRec.prop_code:''} | SedonaCRM`;
    }finally{setNavLoading(false);}
  };

  const goNavRef=useRef(goNav);
  goNavRef.current=goNav;

  useEffect(()=>{
    const onKey=e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
      const tag=e.target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select')return;
      if(e.target?.isContentEditable)return;
      goNavRef.current(e.key==='ArrowLeft'?-1:1);
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);

  const copyLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/key-safes/X${data.id.slice(-6)}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});
  };

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:T.text3}}>Loading…</div>;
  if (notFound) return <div style={{padding:'40px',textAlign:'center',color:T.danger}}>Key safe not found.</div>;
  if (!data) return null;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`0.5px solid ${T.border}`,background:T.bg0,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'6px'}}>
          <button onClick={onBack}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'4px 10px',color:T.text1,fontSize:F.sm,cursor:'pointer',flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <Key size={14} weight="bold"/>← Key Safes
          </button>
          {data.prop_code&&<span style={{fontSize:F.xs,background:'#1a2e3a',color:T.accent,padding:'2px 8px',borderRadius:'3px',fontWeight:'600',flexShrink:0}}>{data.prop_code}</span>}
          <StatusBadge status={data.status||'In Use'}/>
          <button onClick={copyLink}
            style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 8px',color:copied?T.success:T.text2,fontSize:F.xs,cursor:'pointer',transition:'color 0.2s',flexShrink:0}}
            onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=T.text0;}}
            onMouseLeave={e=>{if(!copied)e.currentTarget.style.color=T.text2;}}>
            {copied?'✓ Copied':'⧉ Copy Link'}
          </button>
          {navList&&navList.length>1&&(
            <div style={{display:'flex',alignItems:'center',gap:'4px',marginLeft:'auto',flexShrink:0}}>
              <button onClick={()=>goNav(-1)} disabled={navIdx<=0||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 7px',color:navIdx<=0?T.text3:T.text1,cursor:navIdx<=0?'default':'pointer',display:'inline-flex',alignItems:'center',opacity:navIdx<=0?0.4:1}}
                onMouseEnter={e=>{if(navIdx>0)e.currentTarget.style.color=T.text0;}}
                onMouseLeave={e=>{if(navIdx>0)e.currentTarget.style.color=T.text1;}}>
                <CaretLeft size={18} weight="bold"/>
              </button>
              <span style={{fontSize:F.xs,color:T.text3,minWidth:'48px',textAlign:'center',userSelect:'none'}}>{navLoading?'…':`${navIdx+1} of ${navList.length}`}</span>
              <button onClick={()=>goNav(1)} disabled={navIdx>=navList.length-1||navLoading}
                style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'3px 7px',color:navIdx>=navList.length-1?T.text3:T.text1,cursor:navIdx>=navList.length-1?'default':'pointer',display:'inline-flex',alignItems:'center',opacity:navIdx>=navList.length-1?0.4:1}}
                onMouseEnter={e=>{if(navIdx<navList.length-1)e.currentTarget.style.color=T.text0;}}
                onMouseLeave={e=>{if(navIdx<navList.length-1)e.currentTarget.style.color=T.text1;}}>
                <CaretRight size={18} weight="bold"/>
              </button>
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Key size={24} weight="bold" color="#E8630A"/>
          <div style={{fontSize:F.lg,fontWeight:'700',color:'#E8630A'}}>
            {data.key_safe_code||'Key Safe'}{data.prop_code?` — ${data.prop_code}`:''}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',minWidth:0}}>
          <div style={{background:T.bg2,borderRadius:'8px',margin:'12px 16px',overflow:'hidden'}}>
            <FieldRow label="Prop Code">
              <InlineSelect value={data.prop_code} options={activeProps.map(p=>({value:p.prop_code,label:`${p.prop_code} — ${p.property_name}`}))} onSave={v=>save('prop_code',v)}/>
            </FieldRow>
            <FieldRow label="Status">
              <InlineSelect value={data.status}
                options={['In Use','Avail.-D.Holt','Avail.-Office','Avail.-FIT','Avail.-SA House','Unknown','REPLACE','Archived']}
                onSave={v=>save('status',v)}/>
            </FieldRow>
            <FieldRow label="Key Safe Code">
              <InlineBlurField value={data.key_safe_code||''} onSave={v=>save('key_safe_code',v)}/>
            </FieldRow>
            <FieldRow label="Key Safe ID#">
              <InlineBlurField value={data.id_num||''} onSave={v=>save('id_num',v)}/>
            </FieldRow>
            <FieldRow label="On-Site Location">
              <InlineBlurField value={data.on_site_location||''} onSave={v=>save('on_site_location',v)}/>
            </FieldRow>
            <FieldRow label="Contents" topAlign>
              <RichTextEditor value={data.contents} onSave={v=>save('contents',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Other Notes" topAlign>
              <RichTextEditor value={data.other_notes} onSave={v=>save('other_notes',v)} minRows={5}/>
            </FieldRow>
            <FieldRow label="Follow-Up Date">
              <InlineBlurField type="date" value={data.follow_up_date||''} onSave={v=>save('follow_up_date',v)}/>
            </FieldRow>
            <FieldRow label="Created" hoverable={false}>
              <InlineBlurField readOnly value={data.created_at?fmtDate(data.created_at):''}/>
            </FieldRow>
            <FieldRow label="Last Updated" hoverable={false}>
              <InlineBlurField readOnly value={data.updated_at?fmtDate(data.updated_at):''}/>
            </FieldRow>
          </div>
        </div>
        {(!activityCollapsed || !isMobile) && (
          <ActivityPanel
            collapsed={activityCollapsed}
            onCollapse={()=>setActivityCollapsed(c=>!c)}
            width={activityWidth}
            onMouseDown={isMobile ? undefined : startActivityResize}
          />
        )}
      </div>
      {isMobile && activityCollapsed && (
        <button onClick={()=>setActivityCollapsed(false)}
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
export default function KeySafesView({ filterPropCode } = {}) {
  const [selected,setSelected] = useState(null);

  const handleBack = useCallback(()=>{
    if(window.history.state?.keySafeId) history.replaceState({},'');
    setSelected(null);
  },[]);

  useEffect(()=>{
    const onPop=()=>setSelected(null);
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:T.bg1}}>
      <div style={{display:selected?'none':'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <KeySafesList
          onSelect={item=>{history.pushState({keySafeId:item.id},'');setSelected(item);}}
          filterPropCode={filterPropCode}
        />
      </div>
      {selected&&(
        <KeySafeDetail key={selected.id} keySafe={selected} onBack={handleBack} onUpdate={updated=>setSelected(updated)}/>
      )}
    </div>
  );
}
