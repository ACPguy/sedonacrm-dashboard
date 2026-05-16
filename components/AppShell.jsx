import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const NavBtn = ({ label, active, onClick, collapsed }) => (
  <button onClick={onClick}
    title={collapsed ? label : undefined}
    style={{
      width:'100%', padding:collapsed?'8px 0':'7px 10px',
      background:active?T.bg2:'transparent', border:'none',
      textAlign:'left', cursor:'pointer', display:'flex',
      alignItems:'center', justifyContent:collapsed?'center':'flex-start',
      gap:'9px', fontSize:F.base, color:active?T.accent:T.text1,
      borderRadius:'4px', borderRight:active?`2px solid ${T.accent}`:'2px solid transparent',
      whiteSpace:'nowrap',
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.color=T.text0; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.color=T.text1; }}>
    {collapsed
      ? <span style={{fontSize:'16px',fontWeight:'600'}}>{label[0]}</span>
      : <span style={{flex:1}}>{label}</span>
    }
  </button>
);

const SectionLabel = ({ label, collapsed }) => collapsed ? null : (
  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>
    {label}
  </div>
);

export default function AppShell({ children, activeView }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(190);
  const resizing = useRef(false);

  const startResize = useCallback((e) => {
    resizing.current = true;
    const startX = e.clientX, startW = width;
    const onMove = me => {
      if (!resizing.current) return;
      setWidth(Math.max(150, Math.min(300, startW + (me.clientX - startX))));
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  const go = path => router.push(path);
  const is = view => activeView === view;

  return (
    <div style={{display:'flex',height:'100vh',background:T.bg1,fontFamily:'var(--font-sans)',color:T.text0,fontSize:F.base,overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:collapsed?'48px':`${width}px`,background:T.bg0,borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 200ms ease'}}>
        {/* Top bar */}
        <div style={{padding:'8px 16px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexShrink:0,minHeight:'42px'}}>
          {!collapsed && <span style={{fontSize:F.sm,fontWeight:'700',color:'#d4924a',letterSpacing:'0.02em'}}>ACP</span>}
          <button onClick={()=>setCollapsed(c=>!c)}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',borderRadius:'4px',fontSize:'13px',lineHeight:1,flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {collapsed?'»':'«'}
          </button>
        </div>
        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 6px'}}>
          <NavBtn label="Morning Briefing" active={is('morning-briefing')} onClick={()=>go('/?view=morning-briefing')} collapsed={collapsed}/>
          <SectionLabel label="Operations" collapsed={collapsed}/>
          <NavBtn label="Properties"  active={is('properties')}  onClick={()=>go('/?view=properties')}  collapsed={collapsed}/>
          <NavBtn label="Tenants"     active={is('tenants')}     onClick={()=>go('/?view=tenants')}     collapsed={collapsed}/>
          <NavBtn label="Suites"      active={is('suites')}      onClick={()=>go('/?view=suites')}      collapsed={collapsed}/>
          <NavBtn label="Work Orders" active={is('work-orders')} onClick={()=>go('/?view=work-orders')} collapsed={collapsed}/>
          <NavBtn label="Issues"      active={is('issues')}      onClick={()=>go('/issues')}             collapsed={collapsed}/>
          <SectionLabel label="Leasing" collapsed={collapsed}/>
          <NavBtn label="Pipeline" active={is('leasing')}  onClick={()=>go('/?view=leasing')}  collapsed={collapsed}/>
          <NavBtn label="Leases"   active={is('leases')}   onClick={()=>go('/?view=leases')}   collapsed={collapsed}/>
          <SectionLabel label="Compliance" collapsed={collapsed}/>
          <NavBtn label="Insurance"   active={is('tnt-cois')}    onClick={()=>go('/?view=tnt-cois')}    collapsed={collapsed}/>
          <NavBtn label="Inspections" active={is('inspections')} onClick={()=>go('/?view=inspections')} collapsed={collapsed}/>
          <SectionLabel label="Finance" collapsed={collapsed}/>
          <NavBtn label="QBO Dashboard" active={is('qbo')}      onClick={()=>go('/?view=qbo')}      collapsed={collapsed}/>
          <NavBtn label="Invoices"      active={is('invoices')} onClick={()=>go('/?view=invoices')} collapsed={collapsed}/>
        </div>
        {/* Bottom */}
        <div style={{padding:'8px 6px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavBtn label="Settings" active={is('settings')} onClick={()=>go('/?view=settings')} collapsed={collapsed}/>
        </div>
      </div>

      {/* Sidebar resize handle */}
      {!collapsed && (
        <div onMouseDown={startResize}
          style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background=T.accent}
          onMouseLeave={e=>e.currentTarget.style.background=T.border}/>
      )}

      {/* Main content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Topbar */}
        <div style={{padding:'8px 16px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexShrink:0}}>
          <span style={{fontSize:F.md,fontWeight:'600',color:'#d4924a'}}>Anderson Commercial Properties</span>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:F.sm,fontWeight:'700',color:'#fff',flexShrink:0}}>SA</div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflow:'hidden'}}>
          {children}
        </div>
      </div>
    </div>
  );
}
