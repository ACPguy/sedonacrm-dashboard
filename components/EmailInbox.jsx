import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EnvelopeSimple, CheckCircle, Circle, Spinner, Robot, Archive, Trash, X, MagnifyingGlass, Paperclip, Info } from '@phosphor-icons/react';
import EmailCompose from './EmailCompose';
import { T } from '../lib/theme';

const SUPABASE_URL  = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px' };

const sbFetch = async (table, params = '') => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

const relativeTime = d => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(diff / 86400000);
  if (days < 7)  return `${days}d`;
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
};

const formatSmartTime = d => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US',
    sameYear ? { month:'short', day:'numeric' } : { month:'short', day:'numeric', year:'2-digit' });
};

const stripHtml = html => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Scott's confirmed 14 managed properties — NOT properties.status='active' (that returns 16, includes OLY+WNT which are excluded)
const LSG_PROPERTIES = [
  { code:'CR1',  name:'Castle Rock Plaza I' },
  { code:'DCM',  name:'Dry Creek Professional' },
  { code:'LAP',  name:'La Pasada Plaza' },
  { code:'LEEN', name:'Leenhouts Plaza' },
  { code:'LPP',  name:'Lakeside Partners Property' },
  { code:'MYN',  name:'Mayan Building' },
  { code:'OMP',  name:'Old Marketplace' },
  { code:'PWP',  name:'Parkway Plaza' },
  { code:'RHS',  name:'Ranch House Square' },
  { code:'SAC',  name:'Sacajawea Plaza' },
  { code:'SSB',  name:'Sedona Silverado Bldg.' },
  { code:'VDN',  name:'Vista del Norte' },
  { code:'VVP',  name:'Verde Valley Plaza' },
  { code:'WSP',  name:'West Sedona Plaza' },
];

const FILTER_TABS = [
  { key:'inbox',   label:'Inbox' },
  { key:'unread',  label:'Unread' },
  { key:'all',     label:'All' },
  { key:'linked',  label:'Linked' },
  { key:'flagged', label:'Flagged' },
];

const FilterPill = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${T.accent}33`; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    style={{
      padding:'4px 12px', borderRadius:'4px', fontSize:F.xs, fontWeight:'500',
      cursor: active ? 'default' : 'pointer',
      border:`1px solid ${T.accent}`,
      background: active ? T.accent : 'transparent',
      color: active ? '#fff' : T.accent,
      transition:'background 0.15s ease', whiteSpace:'nowrap',
    }}>
    {label}
  </button>
);

const ActionBtn = ({ label, icon, onClick, disabled, variant, color }) => {
  const base = variant === 'primary'
    ? { background:T.accent, border:`0.5px solid ${T.accent}`, color:'#fff' }
    : { background:T.bg2, border:`0.5px solid ${color || T.border}`, color: disabled ? T.text3 : (color || T.text0) };
  return (
    <button type="button" onClick={disabled ? undefined : onClick}
      onMouseEnter={e => { if (!disabled && variant !== 'primary') e.currentTarget.style.background = T.bg3; }}
      onMouseLeave={e => { if (!disabled && variant !== 'primary') e.currentTarget.style.background = T.bg2; }}
      style={{
        padding:'5px 12px', borderRadius:'4px', fontSize:F.xs, fontWeight:'500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', gap:'5px',
        opacity: disabled ? 0.5 : 1,
        transition:'background 0.15s ease',
        ...base,
      }}>
      {icon}{label}
    </button>
  );
};

// ── Thread List Item ───────────────────────────────────────────────────────────
const ThreadListItem = ({ thread, selected, onClick, isChecked, onCheckboxClick, index, isMobile, onLsgClick }) => {
  const isUnread = !thread.is_read;
  const senderDisplay = thread.last_sender_name || thread.last_sender_address || '(unknown)';
  const [hovered, setHovered] = useState(false);

  const bg = selected ? T.bg2 : (hovered ? 'rgba(255,255,255,0.025)' : 'transparent');
  const cellStyle = {
    background: bg,
    borderBottom: `0.5px solid ${T.border}`,
    padding: '6px 0',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.12s',
    minHeight: '32px',
    boxSizing: 'border-box',
  };
  const cellHandlers = {
    onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  return (
    <>
      <div style={{ ...cellStyle, paddingLeft:'12px' }} {...cellHandlers}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          onClick={e => onCheckboxClick(index, thread, e)}
          style={{ cursor:'pointer', width:'14px', height:'14px', accentColor: T.accent }}
        />
      </div>
      <div style={cellStyle} {...cellHandlers}>
        {isUnread
          ? <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:T.accent }}/>
          : <div style={{ width:'7px', height:'7px' }}/>
        }
      </div>
      <div style={{ ...cellStyle, minWidth:0 }} {...cellHandlers}>
        {!isMobile && (
          <span style={{
            fontSize:F.xs, fontWeight: isUnread ? '700' : '400',
            color: isUnread ? T.text0 : T.text1,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {senderDisplay}
          </span>
        )}
      </div>
      <div style={{ ...cellStyle, minWidth:0 }} {...cellHandlers}>
        <span style={{ minWidth:0, fontSize:F.xs, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>
          <span style={{ fontWeight: isUnread ? '600' : '400', color: isUnread ? T.text0 : T.text1 }}>
            {thread.subject || '(no subject)'}
          </span>
          {thread.snippet && (
            <span style={{ color:T.text2 }}> — {thread.snippet}</span>
          )}
        </span>
      </div>
      <div style={{ ...cellStyle, gap:'4px', overflow:'hidden', justifyContent:'flex-end' }} {...cellHandlers}>
        {thread.linked_record_type && (
          <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>
            {thread.linked_record_type.toUpperCase().slice(0, 3)}
          </span>
        )}
        {thread.link_status === 'flagged' && (
          <span style={{ width:'6px', height:'6px', borderRadius:'1px', background:T.danger, display:'inline-block' }}/>
        )}
        {thread.has_attachment && <Paperclip size={13} color={T.text2}/>}
        {thread.linked_record_type !== 'leasing_pipeline' && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onLsgClick?.(thread, e); }}
            title="Capture as leasing inquiry"
            style={{
              fontSize:'9px', padding:'1px 4px', borderRadius:'2px',
              background:`${T.accent}22`, color:T.accent, fontWeight:'700',
              border:`1px solid ${T.accent}44`, cursor:'pointer',
              lineHeight:'1.4', whiteSpace:'nowrap', flexShrink:0,
            }}
          >+LSG</button>
        )}
      </div>
      <div style={{ ...cellStyle, paddingRight:'12px', justifyContent:'flex-end' }} {...cellHandlers}>
        <span style={{ fontSize:'11px', color:T.text3, whiteSpace:'nowrap' }}>{formatSmartTime(thread.last_message_at)}</span>
      </div>
    </>
  );
};

// ── Message Row ────────────────────────────────────────────────────────────────
const MessageRow = ({ msg, defaultExpanded }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const dir = msg.is_outbound ? 'outbound' : 'inbound';

  const fmtFull = d => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      + ' ' + dt.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  };

  return (
    <div style={{ borderBottom:`0.5px solid ${T.border}` }}>
      {/* Collapsed header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:'flex', alignItems:'center', gap:'10px',
          padding:'10px 16px', cursor:'pointer',
          background: expanded ? T.bg2 : 'transparent',
          transition:'background 0.12s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:T.bg3, border:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:F.xs, color:T.text1, fontWeight:'700' }}>
          {(msg.from_name || msg.from_address || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:F.sm, fontWeight:'600', color:T.text0 }}>
              {msg.is_outbound ? 'Scott Anderson' : (msg.from_name || msg.from_address)}
            </span>
            <span style={{ fontSize:F.xs, color: dir==='inbound' ? T.success : T.warn }}>
              {dir==='inbound' ? '↓' : '↑'}
            </span>
            <span style={{ fontSize:F.xs, color:T.text3, marginLeft:'auto' }}>{fmtFull(msg.sent_at || msg.received_at)}</span>
          </div>
          {!expanded && (
            <div style={{ fontSize:F.xs, color:T.text2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'1px' }}>
              {msg.snippet || stripHtml(msg.body_html || '').substring(0, 100)}
            </div>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding:'12px 16px 16px 54px', background:T.bg2 }}>
          {msg.body_html ? (
            <iframe
              srcDoc={msg.body_html}
              style={{ width:'100%', border:'none', borderRadius:'6px', minHeight:'200px', background:'#ffffff' }}
              scrolling="no"
              title="email-body"
              onLoad={e => {
                try {
                  const h = e.target.contentDocument.body.scrollHeight;
                  e.target.style.height = (h + 32) + 'px';
                } catch(_) {}
              }}
            />
          ) : msg.body_text ? (
            <pre style={{ fontSize:F.sm, color:T.text0, lineHeight:'1.6', whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>
              {msg.body_text}
            </pre>
          ) : (
            <div style={{ fontSize:F.sm, color:T.text2, fontStyle:'italic' }}>
              {msg.snippet || 'No body stored.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Thread Detail Panel ────────────────────────────────────────────────────────
const ThreadDetail = ({ thread, onClose, onMarkRead, onArchive, onSpam, onReply, onThreadUpdate, onLink, navigateThread, hasPrev, hasNext }) => {
  const [messages,     setMessages]     = useState([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(true);
  const [aiSummary,    setAiSummary]    = useState('');
  const [aiDraft,      setAiDraft]      = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiMode,       setAiMode]       = useState(null); // 'summarize' | 'draft'
  const [showCompose,  setShowCompose]  = useState(false);
  const [composeMode,  setComposeMode]  = useState('reply');
  const [composeTo,    setComposeTo]    = useState([]);
  const [composeSubj,  setComposeSubj]  = useState('');
  const [composeBody,  setComposeBody]  = useState('');
  const [showLinkPanel,  setShowLinkPanel]  = useState(false);
  const [linkType,       setLinkType]       = useState('work_order');
  const [linkSearch,     setLinkSearch]     = useState('');
  const [linkResults,    setLinkResults]    = useState([]);
  const [linkSearching,  setLinkSearching]  = useState(false);
  const [linkFlash,      setLinkFlash]      = useState(false);
  const [linkSuccess,    setLinkSuccess]    = useState(null);
  const linkDebounceRef = useRef(null);

  useEffect(() => {
    if (!thread) return;
    setMessages([]);
    setAiSummary('');
    setAiDraft('');
    setAiMode(null);
    setShowLinkPanel(false);
    setLinkSearch('');
    setLinkResults([]);
    setLinkFlash(false);
    setLinkSuccess(null);
    setLinkType('work_order');
    setLoadingMsgs(true);

    sbFetch('email_messages', `thread_id=eq.${thread.id}&order=sent_at.asc.nullslast&select=*`)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [thread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildThreadText = useCallback(() => {
    return messages.map(m => {
      const from = m.is_outbound ? 'Scott Anderson' : (m.from_name || m.from_address || '');
      const date = new Date(m.sent_at || m.received_at || m.created_at || '').toLocaleString();
      const body = m.body_text || stripHtml(m.body_html || m.snippet || '');
      return `[From: ${from}, Date: ${date}]\n${body}`;
    }).join('\n\n---\n\n');
  }, [messages]);

  const runAi = async (mode) => {
    setAiLoading(true);
    setAiMode(mode);
    setAiSummary('');
    setAiDraft('');
    try {
      const endpoint = mode === 'summarize' ? '/api/ai/summarize' : '/api/ai/draft-reply';
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ threadText: buildThreadText() }),
      });
      const data = await res.json();
      if (mode === 'summarize') setAiSummary(data.summary || '');
      if (mode === 'draft') {
        setAiDraft(data.draft || '');
        // Pre-build reply-to list from latest inbound message
        const lastInbound = [...messages].reverse().find(m => !m.is_outbound);
        const replyTo = lastInbound
          ? [{ email: lastInbound.from_address, name: lastInbound.from_name || '' }]
          : [];
        setComposeTo(replyTo);
        setComposeSubj(`Re: ${thread.subject || ''}`);
        setComposeBody(`<p>${(data.draft || '').replace(/\n/g, '</p><p>')}</p>`);
        setComposeMode('reply');
        setShowCompose(true);
      }
    } catch {
      // fail silently
    } finally {
      setAiLoading(false);
    }
  };

  const handleReply = () => {
    const lastInbound = [...messages].reverse().find(m => !m.is_outbound);
    setComposeTo(lastInbound ? [{ email: lastInbound.from_address, name: lastInbound.from_name || '' }] : []);
    setComposeSubj(`Re: ${thread.subject || ''}`);
    setComposeBody('');
    setComposeMode('reply');
    setShowCompose(true);
  };

  const doSearch = useCallback(async (query, type) => {
    if (!query.trim()) { setLinkResults([]); return; }
    setLinkSearching(true);
    try {
      let table, params, toResult;
      const q = encodeURIComponent(query.trim());
      if (type === 'work_order') {
        table = 'tasks';
        params = `title=ilike.*${q}*&record_type=eq.work_order&limit=6&order=title.asc&select=id,task_num,prop_code,title`;
        toResult = r => ({ id: r.id, label: `${r.prop_code ? r.prop_code + '-' : ''}${r.task_num} — ${r.title}`, url: `/tasks/${r.task_num}` });
      } else if (type === 'issue') {
        table = 'issues';
        params = `title=ilike.*${q}*&limit=6&order=title.asc&select=id,podio_id,title`;
        toResult = r => ({ id: r.id, label: `${r.podio_id} — ${r.title}`, url: `/issues/${r.podio_id}` });
      } else if (type === 'tenant') {
        table = 'tenants';
        params = `tenant_dba=ilike.*${q}*&limit=6&order=tenant_dba.asc&select=id,podio_id,tenant_dba`;
        toResult = r => ({ id: r.id, label: r.tenant_dba, url: `/tenants/${r.podio_id}` });
      } else if (type === 'contact') {
        table = 'contacts';
        params = `full_name=ilike.*${q}*&limit=6&order=full_name.asc&select=id,podio_id,full_name`;
        toResult = r => ({ id: r.id, label: r.full_name, url: `/contacts/${r.podio_id}` });
      } else {
        table = 'tasks';
        params = `title=ilike.*${q}*&record_type=neq.work_order&limit=6&order=title.asc&select=id,task_num,prop_code,title`;
        toResult = r => ({ id: r.id, label: `${r.prop_code ? r.prop_code + '-' : ''}${r.task_num} — ${r.title}`, url: `/tasks/${r.task_num}` });
      }
      const data = await sbFetch(table, params);
      setLinkResults(Array.isArray(data) ? data.map(toResult) : []);
    } catch {
      setLinkResults([]);
    } finally {
      setLinkSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(linkDebounceRef.current);
    if (!linkSearch.trim()) { setLinkResults([]); return; }
    linkDebounceRef.current = setTimeout(() => doSearch(linkSearch, linkType), 300);
    return () => clearTimeout(linkDebounceRef.current);
  }, [linkSearch, linkType, doSearch]);

  const handleLinkRecord = async (result) => {
    setShowLinkPanel(false);
    setLinkSearch('');
    setLinkResults([]);
    try {
      await fetch('/api/gmail/link-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, recordType: linkType, recordId: result.id }),
      });
    } catch {
      // fail silently — optimistic update still applied
    }
    onLink?.({ linked_record_type: linkType, linked_record_id: result.id, link_status: 'manually_linked' });
    setLinkFlash(true);
    setLinkSuccess({ label: result.label, url: result.url });
    setTimeout(() => setLinkFlash(false), 2000);
  };

  const latestMsgId = messages.length > 0 ? messages[messages.length - 1]?.gmail_message_id : null;

  if (!thread) return null;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:T.bg1 }}>
      {/* Thread header */}
      <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0 }}>
        <div style={{ fontSize:F.md, fontWeight:'600', color:T.text0, marginBottom:'8px', lineHeight:'1.3' }}>
          {thread.subject || '(no subject)'}
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center' }}>
          <ActionBtn label="Reply" variant="primary" onClick={handleReply}/>
          <ActionBtn label="Archive" icon={<Archive size={13}/>} onClick={() => onArchive(thread.id)}/>
          <ActionBtn label="Spam" icon={<span>🚫</span>} color={T.warn} onClick={() => onSpam(thread.id)}/>
          <ActionBtn
            label={thread.is_read ? 'Mark Unread' : 'Mark Read'}
            icon={thread.is_read ? <Circle size={13}/> : <CheckCircle size={13}/>}
            onClick={() => onMarkRead(thread.id, !thread.is_read)}
          />
          <ActionBtn label="‹" disabled={!hasPrev} onClick={() => navigateThread('prev')}/>
          <ActionBtn label="›" disabled={!hasNext} onClick={() => navigateThread('next')}/>
          {linkFlash ? (
            <span style={{ fontSize:F.xs, color:T.success, fontWeight:'600', padding:'5px 10px', border:`0.5px solid ${T.success}`, borderRadius:'4px' }}>✓ Linked</span>
          ) : linkSuccess ? (
            <a href={linkSuccess.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:F.xs, color:T.warn, fontWeight:'500', padding:'5px 10px', border:`0.5px solid ${T.warn}`, borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Linked: {linkSuccess.label} →
            </a>
          ) : (
            <ActionBtn label="Link to record" onClick={() => setShowLinkPanel(p => !p)}/>
          )}
          {thread.gmail_thread_id && (
            <a href={`https://mail.google.com/mail/u/0/#all/${thread.gmail_thread_id}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize:F.xs, color:T.accent, textDecoration:'none', marginLeft:'auto' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
              View in Gmail →
            </a>
          )}
        </div>

        {showLinkPanel && (
          <div style={{ marginTop:'10px', width:'280px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'5px', padding:'10px' }}>
            <div style={{ marginBottom:'7px' }}>
              <select value={linkType} onChange={e => { setLinkType(e.target.value); setLinkSearch(''); setLinkResults([]); }}
                style={{ width:'100%', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', color:T.text0, fontSize:F.xs, padding:'4px 6px', cursor:'pointer', outline:'none' }}>
                <option value="work_order">Work Order</option>
                <option value="issue">Issue</option>
                <option value="tenant">Tenant</option>
                <option value="contact">Contact</option>
                <option value="task">Task</option>
              </select>
            </div>
            <input
              type="text"
              value={linkSearch}
              onChange={e => setLinkSearch(e.target.value)}
              placeholder="Search by title or ID…"
              autoFocus
              style={{ width:'100%', boxSizing:'border-box', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', color:T.text0, fontSize:F.xs, padding:'5px 8px', outline:'none', marginBottom:'6px' }}
            />
            {linkSearching && (
              <div style={{ fontSize:F.xs, color:T.text3, padding:'3px 0' }}>Searching…</div>
            )}
            {!linkSearching && linkResults.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
                {linkResults.map(r => (
                  <div key={r.id} onClick={() => handleLinkRecord(r)}
                    style={{ fontSize:F.xs, color:T.text0, padding:'5px 7px', borderRadius:'3px', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {r.label}
                  </div>
                ))}
              </div>
            )}
            {!linkSearching && linkSearch.trim() && linkResults.length === 0 && (
              <div style={{ fontSize:F.xs, color:T.text2, padding:'3px 0' }}>No results.</div>
            )}
            <div style={{ marginTop:'8px', textAlign:'right' }}>
              <button type="button"
                onClick={() => { setShowLinkPanel(false); setLinkSearch(''); setLinkResults([]); }}
                style={{ fontSize:F.xs, color:T.accent, background:'transparent', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loadingMsgs && (
          <div style={{ padding:'24px', textAlign:'center', color:T.text3, fontSize:F.sm }}>Loading messages…</div>
        )}
        {!loadingMsgs && messages.length === 0 && (
          <div style={{ padding:'24px', textAlign:'center', color:T.text2, fontSize:F.sm }}>No messages stored for this thread.</div>
        )}
        {!loadingMsgs && messages.map((msg, i) => (
          <MessageRow key={msg.id} msg={msg} defaultExpanded={i === messages.length - 1}/>
        ))}
      </div>

      {/* AI panel */}
      <div style={{ borderTop:`0.5px solid ${T.border}`, flexShrink:0, background:T.bg0 }}>
        <div style={{ padding:'10px 16px', display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
          <Robot size={15} color={T.purple}/>
          <span style={{ fontSize:F.xs, color:T.purple, fontWeight:'600', marginRight:'4px' }}>AI</span>
          <ActionBtn
            label="Summarize"
            disabled={aiLoading || messages.length === 0}
            icon={aiLoading && aiMode==='summarize' ? <Spinner size={13} className="spin"/> : null}
            onClick={() => runAi('summarize')}
          />
          <ActionBtn
            label="Draft Reply"
            disabled={aiLoading || messages.length === 0}
            icon={aiLoading && aiMode==='draft' ? <Spinner size={13} className="spin"/> : null}
            onClick={() => runAi('draft')}
          />
        </div>
        {aiSummary && (
          <div style={{ margin:'0 16px 12px', padding:'10px 12px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'4px' }}>
            <div style={{ fontSize:F.xs, color:T.purple, fontWeight:'600', marginBottom:'4px' }}>Summary</div>
            <div style={{ fontSize:F.sm, color:T.text0, lineHeight:'1.5', whiteSpace:'pre-wrap' }}>{aiSummary}</div>
          </div>
        )}
      </div>

      {showCompose && (
        <EmailCompose
          mode={composeMode}
          inReplyToMessageId={latestMsgId}
          gmailThreadId={thread.gmail_thread_id}
          crmRecordType={thread.linked_record_type}
          crmRecordId={thread.linked_record_id}
          prefilledTo={composeTo}
          defaultSubject={composeSubj}
          initialBody={composeBody}
          onSend={() => { setShowCompose(false); onThreadUpdate?.(); }}
          onClose={() => setShowCompose(false)}
        />
      )}
      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ── Responsive hook ────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function EmailInbox() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [filter,         setFilter]         = useState('inbox');
  const [threads,        setThreads]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [refreshKey,     setRefreshKey]     = useState(0);
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [showLegend,     setShowLegend]     = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [lastCheckedIndex, setLastCheckedIndex] = useState(null);
  const [listWidth, setListWidth] = useState(() => {
    if (typeof window === 'undefined') return 570;
    try {
      const saved = localStorage.getItem('sedonacrm_inbox_list_width');
      const parsed = saved ? parseInt(saved, 10) : 570;
      return Number.isNaN(parsed) ? 570 : parsed;
    } catch (err) {
      return 570;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const listWidthRef = useRef(listWidth);

  const [lsgThread,     setLsgThread]     = useState(null);
  const [lsgForm,       setLsgForm]       = useState({ prospect_name:'', prospect_email:'', prop_code:'', initial_message:'' });
  const [lsgSubmitting, setLsgSubmitting] = useState(false);
  const [lsgError,      setLsgError]      = useState(null);


  const buildQuery = useCallback((f) => {
    let params = `order=last_message_at.desc.nullslast&limit=100&select=*`;
    if (f === 'inbox')   params = `is_archived=eq.false&is_deleted=eq.false&${params}`;
    if (f === 'unread')  params = `is_read=eq.false&${params}`;
    if (f === 'linked')  params = `link_status=eq.auto_linked&${params}`;
    if (f === 'flagged') params = `link_status=eq.flagged&${params}`;
    return params;
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedThread(null);
    setSelectedIds(new Set());
    setLastCheckedIndex(null);
    sbFetch('email_threads', buildQuery(filter))
      .then(setThreads)
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [filter, refreshKey, buildQuery]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await fetch('/api/gmail/sync-now', { method: 'POST' });
    } catch (err) {
      console.error('[sync-now]', err);
    } finally {
      setIsSyncing(false);
      setRefreshKey(k => k + 1); // re-fetch from DB after sync
    }
  };

  const handleMarkRead = async (threadId, isRead) => {
    setThreads(ts => ts.map(t => t.id === threadId ? { ...t, is_read: isRead, unread_count: isRead ? 0 : t.unread_count } : t));
    if (selectedThread?.id === threadId) setSelectedThread(t => ({ ...t, is_read: isRead }));
    await fetch('/api/gmail/thread-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, updates: { is_read: isRead, unread_count: isRead ? 0 : undefined } }),
    }).catch(() => {});
  };

  const handleArchive = async (threadId) => {
    setThreads(ts => ts.filter(t => t.id !== threadId));
    if (selectedThread?.id === threadId) setSelectedThread(null);
    await fetch('/api/gmail/batch-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-briefing-secret': process.env.NEXT_PUBLIC_BRIEFING_SECRET },
      body: JSON.stringify({ threadIds: [threadId], action: 'archive' }),
    }).catch(() => {});
  };

  const handleSpam = async (threadId) => {
    setThreads(ts => ts.filter(t => t.id !== threadId));
    if (selectedThread?.id === threadId) setSelectedThread(null);
    await fetch('/api/gmail/spam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-briefing-secret': process.env.NEXT_PUBLIC_BRIEFING_SECRET },
      body: JSON.stringify({ threadId }),
    }).catch(() => {});
  };

  const handleLink = (updates) => {
    if (!selectedThread) return;
    setSelectedThread(t => ({ ...t, ...updates }));
    setThreads(ts => ts.map(t => t.id === selectedThread.id ? { ...t, ...updates } : t));
  };

  const handleLsgClick = useCallback((thread, e) => {
    e.stopPropagation();
    const message = [thread.subject, thread.snippet].filter(Boolean).join(' — ');
    setLsgForm({
      prospect_name: thread.last_sender_name || '',
      prospect_email: thread.last_sender_address || '',
      prop_code: '',
      initial_message: message.slice(0, 500),
    });
    setLsgThread(thread);
    setLsgError(null);
  }, []);

  const handleLsgSubmit = async () => {
    setLsgSubmitting(true);
    setLsgError(null);
    try {
      const res = await fetch('/api/pipeline/lead-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-briefing-secret': process.env.NEXT_PUBLIC_BRIEFING_SECRET,
        },
        body: JSON.stringify({
          ...lsgForm,
          source: 'manual_lsg',
          thread_id: lsgThread.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      // Optimistic UI: show LEA badge immediately
      const linkedUpdates = { linked_record_type: 'leasing_pipeline', link_status: 'manual_linked' };
      setThreads(ts => ts.map(t => t.id === lsgThread.id ? { ...t, ...linkedUpdates } : t));
      if (selectedThread?.id === lsgThread.id) setSelectedThread(t => ({ ...t, ...linkedUpdates }));
      setLsgThread(null);
    } catch (err) {
      setLsgError(err.message);
    } finally {
      setLsgSubmitting(false);
    }
  };

  const toggleSelect = (threadId) => {
    setSelectedIds(ids => {
      const next = new Set(ids);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const clearSelection = () => { setSelectedIds(new Set()); setLastCheckedIndex(null); };

  const handleCheckboxClick = (index, thread, e) => {
    e.stopPropagation();
    if (e.shiftKey && lastCheckedIndex !== null) {
      const [start, end] = [lastCheckedIndex, index].sort((a, b) => a - b);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) next.add(threads[i].id);
        return next;
      });
    } else {
      toggleSelect(thread.id);
    }
    setLastCheckedIndex(index);
  };

  const handleDividerPointerDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // capture not supported — drag still works, just without out-of-window guarantee
    }
    listWidthRef.current = listWidth;
    setIsDragging(true);
  };

  const handleDividerPointerMove = (e) => {
    if (!isDragging) return;
    const left = containerRef.current?.getBoundingClientRect().left || 0;
    const newWidth = Math.max(280, Math.min(700, e.clientX - left));
    setListWidth(newWidth);
    listWidthRef.current = newWidth;
  };

  const handleDividerPointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // non-fatal
    }
    try {
      localStorage.setItem('sedonacrm_inbox_list_width', String(listWidthRef.current));
    } catch (err) {
      // localStorage unavailable — width won't persist this session, non-fatal
    }
  };

  const handleBatchAction = async (action) => {
    const ids = Array.from(selectedIds);
    setThreads(ts => ts.filter(t => !ids.includes(t.id)));
    if (selectedThread && ids.includes(selectedThread.id)) setSelectedThread(null);
    clearSelection();
    await fetch('/api/gmail/batch-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-briefing-secret': process.env.NEXT_PUBLIC_BRIEFING_SECRET },
      body: JSON.stringify({ threadIds: ids, action }),
    }).catch(() => {});
  };

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    if (!thread.is_read) {
      setThreads(ts => ts.map(t => t.id === thread.id ? { ...t, is_read: true, unread_count: 0 } : t));
      await fetch('/api/gmail/thread-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, updates: { is_read: true, unread_count: 0 } }),
      }).catch(() => {});
    }
  };

  const navigateThread = (direction) => {
    if (!selectedThread) return;
    const idx = threads.findIndex(t => t.id === selectedThread.id);
    if (idx === -1) return;
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= threads.length) return;
    handleSelectThread(threads[nextIdx]);
  };

  const selectedIdx = selectedThread ? threads.findIndex(t => t.id === selectedThread.id) : -1;
  const hasPrev = selectedIdx > 0;
  const hasNext = selectedIdx !== -1 && selectedIdx < threads.length - 1;

  useEffect(() => {
    const handler = (e) => {
      if (!selectedThread) return;
      const tag = document.activeElement?.tagName;
      const isEditable = document.activeElement?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;
      if (e.key === 'ArrowLeft') navigateThread('prev');
      if (e.key === 'ArrowRight') navigateThread('next');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedThread, threads]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ display:'flex', height:'100%', background:T.bg1, fontFamily:'var(--font-sans)', color:T.text0, fontSize:F.base, overflow:'hidden', userSelect: isDragging ? 'none' : 'auto' }}>

      {/* Left panel — thread list */}
      <div style={{ width:isMobile?'100%':listWidth+'px', flexShrink:0, display:isMobile&&selectedThread?'none':'flex', flexDirection:'column', borderRight:isMobile?`0.5px solid ${T.border}`:'none', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <EnvelopeSimple size={18} weight="bold" color={T.accent}/>
              <span style={{ fontSize:F.md, fontWeight:'700', color:T.text0 }}>Inbox</span>
            </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', position:'relative' }}>
                <button type="button"
                  onClick={() => setShowLegend(v => !v)}
                  title="What do these icons mean?"
                  style={{ background:'transparent', border:`1px solid ${T.border}`, color: showLegend ? T.accent : T.text2, cursor:'pointer', width:'22px', height:'22px', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Info size={13}/>
                </button>
                <button type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  title="Sync new mail from Gmail"
                  style={{ background:'transparent', border:`1px solid ${T.border}`, color: isSyncing ? T.text3 : T.accent, cursor: isSyncing ? 'not-allowed' : 'pointer', padding:'3px 8px', borderRadius:'4px', display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'600' }}
                  onMouseEnter={e => { if (!isSyncing) e.currentTarget.style.borderColor = T.accent; }}
                  onMouseLeave={e => { if (!isSyncing) e.currentTarget.style.borderColor = T.border; }}>
                  {isSyncing
                    ? <><Spinner size={13} className="spin"/> <span>Syncing…</span></>
                    : <span>Sync</span>
                  }
                </button>
                {showLegend && (
                  <div style={{ position:'absolute', top:'26px', right:0, zIndex:20, width:'240px', maxWidth:'80vw', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'10px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.35)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:F.xs, fontWeight:'700', color:T.text0 }}>Icon legend</span>
                      <button type="button" onClick={() => setShowLegend(false)} style={{ background:'transparent', border:'none', color:T.text2, cursor:'pointer', padding:'2px' }}>
                        <X size={12}/>
                      </button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', fontSize:'11px', color:T.text1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>CON</span>
                        <span>Linked to a Contact</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>LEA</span>
                        <span>Linked to a Leasing Pipeline lead</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>WOR</span>
                        <span>Linked to a Work Order</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>ISS</span>
                        <span>Linked to an Issue</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>TEN</span>
                        <span>Linked to a Tenant</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 4px', borderRadius:'2px', background:`${T.warn}22`, color:T.warn, fontWeight:'700' }}>TAS</span>
                        <span>Linked to a Task</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ width:'6px', height:'6px', borderRadius:'1px', background:T.danger, display:'inline-block', flexShrink:0 }}/>
                        <span>Flagged — sender not recognized, needs review</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <Paperclip size={12} color={T.text2}/>
                        <span>Message has an attachment</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'9px', padding:'1px 4px', borderRadius:'2px', background:`${T.accent}22`, color:T.accent, fontWeight:'700', border:`1px solid ${T.accent}44` }}>+LSG</span>
                        <span>Manually capture as leasing lead</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' }}>
            <input
              type="checkbox"
              ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < threads.length; }}
              checked={threads.length > 0 && selectedIds.size === threads.length}
              onChange={() => {
                if (selectedIds.size === threads.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(threads.map(t => t.id)));
                }
              }}
              style={{ cursor:'pointer', width:'14px', height:'14px', accentColor:T.accent, marginRight:'6px' }}
            />
            {FILTER_TABS.map(({ key, label }) => (
              <FilterPill key={key} label={label} active={filter === key} onClick={() => setFilter(key)}/>
            ))}
          </div>
        </div>

        {/* Batch action toolbar */}
        {selectedIds.size > 0 && (
          <div style={{ padding:'7px 12px', background:T.bg3, borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', flexShrink:0 }}>
            <span style={{ fontSize:F.xs, color:T.text1, fontWeight:'600', marginRight:'4px' }}>{selectedIds.size} selected</span>
            <ActionBtn label="Archive" icon={<Archive size={13}/>} onClick={() => handleBatchAction('archive')}/>
            <ActionBtn label="Spam" icon={<span>🚫</span>} color={T.warn} onClick={() => handleBatchAction('spam')}/>
            <ActionBtn label="Delete" icon={<Trash size={13}/>} color={T.danger} onClick={() => handleBatchAction('delete')}/>
            <button type="button" onClick={clearSelection}
              style={{ marginLeft:'auto', background:'transparent', border:'none', color:T.text2, cursor:'pointer', fontSize:F.xs, display:'flex', alignItems:'center', gap:'3px', padding:'2px 4px' }}>
              <X size={13}/> Cancel
            </button>
          </div>
        )}

        {/* Thread list */}
        <div style={{ flex:1, overflowY:'auto', display:'grid', gridTemplateColumns:'32px 20px fit-content(130px) minmax(0,1fr) 64px 60px', columnGap:'6px', alignContent:'start' }}>
          {loading && (
            <div style={{ gridColumn:'1 / -1', padding:'24px', textAlign:'center', color:T.text3, fontSize:F.sm }}>Loading…</div>
          )}
          {!loading && threads.length === 0 && (
            <div style={{ gridColumn:'1 / -1', padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:'28px', color:T.bg3, marginBottom:'8px' }}>✉</div>
              <div style={{ fontSize:F.sm, color:T.text2 }}>
                {filter === 'inbox'   ? 'Inbox is empty.'
                  : filter === 'unread' ? 'No unread messages.'
                  : filter === 'flagged' ? 'No flagged messages.'
                  : 'No messages found.'}
              </div>
            </div>
          )}
          {!loading && threads.map((thread, index) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              selected={selectedThread?.id === thread.id}
              onClick={() => handleSelectThread(thread)}
              isChecked={selectedIds.has(thread.id)}
              onCheckboxClick={handleCheckboxClick}
              index={index}
              isMobile={isMobile}
              onLsgClick={handleLsgClick}
            />
          ))}
        </div>
      </div>

      {/* Resizable divider */}
      {!isMobile && (
        <div
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={handleDividerPointerUp}
          onPointerCancel={(e) => { handleDividerPointerUp(e); }}
          style={{
            width:'4px', flexShrink:0, cursor:'col-resize', touchAction:'none',
            background: isDragging ? T.accent : T.border,
            transition: isDragging ? 'none' : 'background 0.15s ease',
          }}
          onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = T.accent; }}
          onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = T.border; }}
        />
      )}

      {/* Right panel — thread detail */}
      <div style={{ flex:1, overflow:'hidden', display:isMobile&&!selectedThread?'none':'flex', flexDirection:'column' }}>
        {selectedThread ? (
          <>
            {isMobile && (
              <button
                onClick={() => setSelectedThread(null)}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:T.bg0, border:'none', borderBottom:`0.5px solid ${T.border}`, color:T.accent, fontSize:F.sm, fontWeight:'600', cursor:'pointer', flexShrink:0 }}>
                ← Inbox
              </button>
            )}
            <ThreadDetail
              thread={selectedThread}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onSpam={handleSpam}
              onReply={() => {}}
              onThreadUpdate={() => setRefreshKey(k => k + 1)}
              onLink={handleLink}
              navigateThread={navigateThread}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          </>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px' }}>
            <EnvelopeSimple size={48} color={T.bg3} weight="bold"/>
            <div style={{ fontSize:F.base, color:T.text3 }}>Select a thread to read</div>
          </div>
        )}
      </div>

      {/* +LSG modal — capture email thread as leasing inquiry */}
      {lsgThread && (
        <div
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={e => { if (e.target === e.currentTarget) { setLsgThread(null); setLsgError(null); } }}
        >
          <div style={{ background:T.bg1, border:`0.5px solid ${T.border}`, borderRadius:'8px', padding:'20px 24px', width:'100%', maxWidth:'420px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontSize:F.md, fontWeight:'700', color:T.text0 }}>Capture Leasing Inquiry</span>
              <button type="button" onClick={() => { setLsgThread(null); setLsgError(null); }}
                style={{ background:'transparent', border:'none', color:T.text2, cursor:'pointer', padding:'2px', display:'flex', alignItems:'center' }}>
                <X size={14}/>
              </button>
            </div>
            <div style={{ fontSize:F.xs, color:T.text2, marginBottom:'14px', padding:'7px 10px', background:T.bg2, borderRadius:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {lsgThread.subject || '(no subject)'}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <label style={{ fontSize:F.xs, color:T.text2, display:'block', marginBottom:'3px' }}>Prospect name</label>
                <input
                  type="text"
                  value={lsgForm.prospect_name}
                  onChange={e => setLsgForm(f => ({ ...f, prospect_name: e.target.value }))}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:'4px', border:`0.5px solid ${T.border}`, background:T.bg2, color:T.text0, fontSize:F.sm, boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize:F.xs, color:T.text2, display:'block', marginBottom:'3px' }}>Prospect email</label>
                <input
                  type="email"
                  value={lsgForm.prospect_email}
                  onChange={e => setLsgForm(f => ({ ...f, prospect_email: e.target.value }))}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:'4px', border:`0.5px solid ${T.border}`, background:T.bg2, color:T.text0, fontSize:F.sm, boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize:F.xs, color:T.text2, display:'block', marginBottom:'3px' }}>
                  Property <span style={{ color:T.text3 }}>(optional)</span>
                </label>
                <select
                  value={lsgForm.prop_code}
                  onChange={e => setLsgForm(f => ({ ...f, prop_code: e.target.value }))}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:'4px', border:`0.5px solid ${T.border}`, background:T.bg2, color:T.text0, fontSize:F.sm, boxSizing:'border-box' }}
                >
                  <option value="">— General inquiry, no specific property —</option>
                  {LSG_PROPERTIES.map(({ code, name }) => (
                    <option key={code} value={code}>{code} — {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:F.xs, color:T.text2, display:'block', marginBottom:'3px' }}>
                  Initial message <span style={{ color:T.text3 }}>(optional)</span>
                </label>
                <textarea
                  value={lsgForm.initial_message}
                  onChange={e => setLsgForm(f => ({ ...f, initial_message: e.target.value }))}
                  rows={3}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:'4px', border:`0.5px solid ${T.border}`, background:T.bg2, color:T.text0, fontSize:F.sm, resize:'vertical', boxSizing:'border-box' }}
                />
              </div>
            </div>
            {lsgError && (
              <div style={{ marginTop:'8px', fontSize:F.xs, color:T.danger }}>{lsgError}</div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'16px' }}>
              <ActionBtn label="Cancel" onClick={() => { setLsgThread(null); setLsgError(null); }}/>
              <ActionBtn
                label={lsgSubmitting ? 'Saving…' : 'Create Lead'}
                variant="primary"
                disabled={lsgSubmitting}
                onClick={handleLsgSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
