import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { HouseLine, BuildingOffice, Storefront, CheckFat, Wrench, Cube, UserCircle, Truck, Briefcase, ChartBar, Umbrella, ClipboardText, List, Gear, Key, EnvelopeSimple, SquaresFour } from '@phosphor-icons/react';
import GlobalSearch from './GlobalSearch';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const NavBtn = ({ label, active, href, onClick, collapsed, icon, badge }) => (
  <a href={href}
    onClick={e=>{ if(!e.ctrlKey && !e.metaKey){ e.preventDefault(); onClick?.(); } }}
    title={collapsed ? label : undefined}
    style={{
      position:'relative',
      width:'100%', padding:collapsed?'8px 0':'7px 10px',
      background:active?T.bg2:'transparent', border:'none',
      textAlign:'left', cursor:'pointer', display:'flex',
      alignItems:'center', justifyContent:collapsed?'center':'flex-start',
      gap:'9px', fontSize:F.base, color:active?T.accent:T.text1,
      borderRadius:'4px', borderRight:active?`2px solid ${T.accent}`:'2px solid transparent',
      whiteSpace:'nowrap', textDecoration:'none',
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.color=T.text0; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.color=T.text1; }}>
    {collapsed
      ? (icon
          ? <span style={{display:'flex',alignItems:'center'}}>{icon}</span>
          : <span style={{fontSize:'16px',fontWeight:'600'}}>{label[0]}</span>)
      : <>{icon && <span style={{display:'flex',alignItems:'center',flexShrink:0}}>{icon}</span>}<span style={{flex:1}}>{label}</span></>
    }
    {badge > 0 && (
      <span style={{
        position:'absolute', top:'4px', right: collapsed ? '4px' : '8px',
        minWidth:'16px', height:'16px', borderRadius:'8px',
        background:T.danger, color:'#fff',
        fontSize:'10px', fontWeight:'700',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'0 3px', lineHeight:1, pointerEvents:'none',
      }}>
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </a>
);

const SectionLabel = ({ label, collapsed }) => collapsed ? null : (
  <div style={{fontSize:F.xs,color:T.text3,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 4px 4px',fontWeight:'600'}}>
    {label}
  </div>
);

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
        style={{height:'28px',padding:'0 10px',borderRadius:'4px',background:T.bg2,border:`0.5px solid ${T.border}`,color:T.text1,fontSize:'11px',fontWeight:'500',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'6px',flexShrink:0,whiteSpace:'nowrap',transition:'border-color 0.15s,color 0.15s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.text0;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text1;}}>
        <SquaresFour size={14}/> Properties
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

export default function AppShell({ children, activeView }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(148);
  const resizing = useRef(false);
  const [activeProps, setActiveProps] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [showLegacy, setShowLegacy] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('showLegacyNav') === 'true';
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/properties?select=prop_code,property_name,podio_id,id&status=eq.active&order=prop_code.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.json()).then(data => setActiveProps(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchUnread = () => {
      fetch(`${SUPABASE_URL}/rest/v1/email_threads?is_read=eq.false&select=id`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      })
        .then(r => r.json())
        .then(data => setUnreadCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const startResize = useCallback((e) => {
    resizing.current = true;
    const startX = e.clientX, startW = width;
    const onMove = me => {
      if (!resizing.current) return;
      setWidth(Math.max(132, Math.min(280, startW + (me.clientX - startX))));
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  const go = path => {
    setMobileNavOpen(false);
    if (router.asPath === path || router.asPath.startsWith(path + '/') || router.asPath.startsWith(path + '?')) {
      router.replace(path).then(() => router.reload());
    } else {
      router.push(path);
    }
  };
  const is = view => activeView === view;
  const effectiveCollapsed = collapsed && !hoverExpanded;

  const navItems = (
    <>
      <NavBtn label="Inbox" href="/inbox" active={is('inbox')} onClick={()=>go('/inbox')} collapsed={effectiveCollapsed} icon={<EnvelopeSimple size={18} weight="bold"/>} badge={unreadCount}/>
      <NavBtn label="Home" href="/?view=morning-briefing" active={is('morning-briefing')} onClick={()=>go('/?view=morning-briefing')} collapsed={effectiveCollapsed} icon={<HouseLine size={18} weight="bold"/>}/>
      <SectionLabel label="Operations" collapsed={effectiveCollapsed}/>
      <NavBtn label="Properties"  href="/properties"   active={is('properties')}  onClick={()=>go('/properties')}   collapsed={effectiveCollapsed} icon={<BuildingOffice size={18} weight="bold"/>}/>
      <NavBtn label="Tasks"       href="/tasks"        active={is('tasks')}       onClick={()=>go('/tasks')}        collapsed={effectiveCollapsed} icon={<ClipboardText size={18} weight="bold"/>}/>
      <NavBtn label="Tenants"     href="/tenants"      active={is('tenants')}     onClick={()=>go('/tenants')}      collapsed={effectiveCollapsed} icon={<Storefront size={18} weight="bold"/>}/>
      <NavBtn label="Vendors"     href="/vendors"      active={is('vendors')}     onClick={()=>go('/vendors')}      collapsed={effectiveCollapsed} icon={<Truck size={18} weight="bold"/>}/>
      <NavBtn label="Owners"      href="/owners"       active={is('owners')}      onClick={()=>go('/owners')}       collapsed={effectiveCollapsed} icon={<Briefcase size={18} weight="bold"/>}/>
      <NavBtn label="Contacts"    href="/contacts"     active={is('contacts')}    onClick={()=>go('/contacts')}     collapsed={effectiveCollapsed} icon={<UserCircle size={18} weight="bold"/>}/>
      <NavBtn label="Suites"      href="/suites"       active={is('suites')}      onClick={()=>go('/suites')}       collapsed={effectiveCollapsed} icon={<Cube size={18} weight="bold"/>}/>
      <NavBtn label="Key Safes"   href="/key-safes"    active={is('key-safes')}   onClick={()=>go('/key-safes')}    collapsed={effectiveCollapsed} icon={<Key size={18} weight="bold"/>}/>
      <SectionLabel label="Leasing" collapsed={effectiveCollapsed}/>
      <NavBtn label="Pipeline"      href="/?view=leasing"       active={is('leasing')}       onClick={()=>go('/?view=leasing')}       collapsed={effectiveCollapsed}/>
      <NavBtn label="Leases"        href="/?view=leases"        active={is('leases')}        onClick={()=>go('/?view=leases')}        collapsed={effectiveCollapsed}/>
      <NavBtn label="Rents"         href="/rent-schedule"       active={is('rent-schedule')} onClick={()=>go('/rent-schedule')}       collapsed={effectiveCollapsed} icon={<ChartBar size={18} weight="bold"/>}/>
      <SectionLabel label="Compliance" collapsed={effectiveCollapsed}/>
      <NavBtn label="Insurance"   href="/?view=tnt-cois"    active={is('tnt-cois')}    onClick={()=>go('/?view=tnt-cois')}    collapsed={effectiveCollapsed} icon={<Umbrella size={18} weight="bold"/>}/>
      <NavBtn label="Inspections" href="/?view=inspections" active={is('inspections')} onClick={()=>go('/?view=inspections')} collapsed={effectiveCollapsed} icon={<ClipboardText size={18} weight="bold"/>}/>
      <SectionLabel label="Finance" collapsed={effectiveCollapsed}/>
      <NavBtn label="QBO Dashboard" href="/?view=qbo"      active={is('qbo')}      onClick={()=>go('/?view=qbo')}      collapsed={effectiveCollapsed}/>
      <NavBtn label="Invoices"      href="/?view=invoices" active={is('invoices')} onClick={()=>go('/?view=invoices')} collapsed={effectiveCollapsed}/>
      {!effectiveCollapsed && (
        <button onClick={()=>{ const next=!showLegacy; setShowLegacy(next); localStorage.setItem('showLegacyNav',String(next)); }}
          style={{width:'100%',padding:'5px 4px',background:'transparent',border:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:T.text3,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:'600',userSelect:'none',marginTop:'4px'}}
          onMouseEnter={e=>e.currentTarget.style.color=T.text2}
          onMouseLeave={e=>e.currentTarget.style.color=T.text3}>
          <span style={{fontSize:'10px'}}>{showLegacy?'▾':'▸'}</span> Legacy
        </button>
      )}
      {showLegacy && (
        <div style={{opacity:0.6}}>
          <NavBtn label="Work Orders" href="/work-orders" active={is('work-orders')} onClick={()=>go('/work-orders')} collapsed={effectiveCollapsed} icon={<Wrench size={18} weight="bold"/>}/>
          <NavBtn label="Issues"      href="/issues"      active={is('issues')}      onClick={()=>go('/issues')}      collapsed={effectiveCollapsed} icon={<CheckFat size={18} weight="bold"/>}/>
        </div>
      )}
    </>
  );

  return (
    <div style={{display:'flex',height:'100vh',background:T.bg1,fontFamily:'var(--font-sans)',color:T.text0,fontSize:F.base,overflow:'hidden'}}>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="crm-mobile-overlay" onClick={()=>setMobileNavOpen(false)}/>
      )}

      {/* Mobile nav drawer (fixed, slides in from left) */}
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
        <div style={{padding:'8px 6px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavBtn label="Settings" href="/settings" active={is('settings')} onClick={()=>go('/settings')} collapsed={false} icon={<Gear size={18} weight="bold"/>}/>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div style={{width:effectiveCollapsed?'48px':`${width}px`,background:T.bg0,borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 200ms ease'}}
        className="crm-desktop-sidebar"
        onMouseEnter={()=>{ if(collapsed) setHoverExpanded(true); }}
        onMouseLeave={()=>setHoverExpanded(false)}>
        <div style={{padding:'8px 16px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexShrink:0,minHeight:'42px'}}>
          {!effectiveCollapsed && <span style={{fontSize:F.sm,fontWeight:'700',color:'#d4924a',letterSpacing:'0.02em'}}>ACP</span>}
          <button onClick={()=>setCollapsed(c=>!c)}
            style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text0,cursor:'pointer',padding:'4px 7px',borderRadius:'4px',fontSize:'13px',lineHeight:1,flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            {collapsed?'»':'«'}
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 6px'}}>
          {navItems}
        </div>
        <div style={{padding:'8px 6px',borderTop:`0.5px solid ${T.border}`,flexShrink:0}}>
          <NavBtn label="Settings" href="/settings" active={is('settings')} onClick={()=>go('/settings')} collapsed={effectiveCollapsed} icon={<Gear size={18} weight="bold"/>}/>
        </div>
      </div>

      {/* Sidebar resize handle (desktop only) */}
      {!collapsed && (
        <div onMouseDown={startResize}
          style={{width:'4px',cursor:'col-resize',background:T.border,flexShrink:0,transition:'background 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background=T.accent}
          onMouseLeave={e=>e.currentTarget.style.background=T.border}
          className="crm-desktop-sidebar"/>
      )}

      {/* Main content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Topbar */}
        <div style={{padding:'0 12px',background:T.bg0,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:'10px',flexShrink:0,minHeight:'42px'}}>
          {/* Hamburger — mobile only */}
          <button className="crm-hamburger"
            onClick={()=>setMobileNavOpen(o=>!o)}
            style={{background:'transparent',border:'none',color:T.text1,cursor:'pointer',padding:'4px',borderRadius:'4px',minWidth:'44px',minHeight:'44px',display:'none'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.text0}
            onMouseLeave={e=>e.currentTarget.style.color=T.text1}>
            <List size={24} weight="bold"/>
          </button>
          <span style={{fontSize:'15px',fontWeight:'800',color:'#d4924a',flexShrink:0,letterSpacing:'0.04em',userSelect:'none'}}>ACP</span>
          <GlobalSearch />
          <div style={{flex:1}}/>
          <PropertyPillsPopover activeProps={activeProps} onNavigate={go} />
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
