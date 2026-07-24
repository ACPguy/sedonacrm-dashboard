// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel.jsx — canonical right-sidebar Comms/Activity panel
// Canonical source (2026-07-25) for the collapsible detail-view sidebar —
// same tier as LinkField.jsx: build once, use everywhere. See CLAUDE.md's
// "Canonical Comms & Activity Sidebar Architecture" section.
//
// commsProps (optional): when provided, the Comms tab renders
// <CommunicationTimeline {...commsProps}/> instead of the placeholder text.
// Pass undefined when there's no task/record to attach a timeline to (e.g.
// KeySafesView.jsx) — the original "syncs from Podio at go-live" placeholder
// stays exactly as before in that case. Activity tab (#2) is untouched,
// audit-purposes-only placeholder regardless of commsProps.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import CommunicationTimeline from '../CommunicationTimeline';
import { T } from '../../lib/theme';

const F = { xs: '12px', sm: '13px' };
const cardStyle = { background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '12px 14px' };

const ActivityPanel = ({ collapsed, onCollapse, width, onMouseDown, commsProps }) => {
  const [tab, setTab] = useState('comms');
  const showTimeline = tab === 'comms' && commsProps;
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
              {['Comms','Activity'].map(t=>(
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
          <div style={{flex:1,overflowY:'auto',padding:showTimeline?0:'12px'}}>
            {tab==='comms' && (
              commsProps ? (
                <CommunicationTimeline {...commsProps}/>
              ) : (
                <div style={cardStyle}>
                  <p style={{fontSize:F.sm,color:T.text2,fontStyle:'italic',lineHeight:'1.6',margin:0}}>
                    Comments and files will sync from Podio via API at go-live.
                  </p>
                </div>
              )
            )}
            {tab==='activity' && (
              <div style={cardStyle}>
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

export default ActivityPanel;
