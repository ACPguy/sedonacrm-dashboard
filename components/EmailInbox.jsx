import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EnvelopeSimple, CheckCircle, Circle, Spinner, Robot, Archive, MagnifyingGlass } from '@phosphor-icons/react';
import EmailCompose from './EmailCompose';

const SUPABASE_URL  = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
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

const stripHtml = html => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const FILTER_TABS = [
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

const ActionBtn = ({ label, icon, onClick, disabled, variant }) => {
  const base = variant === 'primary'
    ? { background:T.accent, border:`0.5px solid ${T.accent}`, color:'#fff' }
    : { background:T.bg2, border:`0.5px solid ${T.border}`, color: disabled ? T.text3 : T.text0 };
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
const ThreadListItem = ({ thread, selected, onClick }) => {
  const isUnread  = !thread.is_read;
  const sender    = thread.snippet_from || thread.linked_record_type || '—';

  return (
    <div onClick={onClick}
      style={{
        padding:'10px 14px', borderBottom:`0.5px solid ${T.border}`,
        background: selected ? T.bg2 : 'transparent',
        cursor:'pointer', transition:'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
        {isUnread
          ? <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:T.accent, flexShrink:0, marginTop:'5px' }}/>
          : <div style={{ width:'7px', height:'7px', flexShrink:0 }}/>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px', marginBottom:'2px' }}>
            <span style={{
              fontSize:F.sm, fontWeight: isUnread ? '700' : '500',
              color: isUnread ? T.text0 : T.text1,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
            }}>
              {thread.subject || '(no subject)'}
            </span>
            <span style={{ fontSize:'11px', color:T.text3, flexShrink:0 }}>{relativeTime(thread.last_message_at)}</span>
          </div>
          <div style={{ fontSize:F.xs, color:T.text2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'4px' }}>
            {thread.snippet || ''}
          </div>
          <div style={{ display:'flex', gap:'4px', alignItems:'center', flexWrap:'wrap' }}>
            {thread.linked_record_type && (
              <span style={{ fontSize:'10px', padding:'1px 5px', borderRadius:'3px', background:`${T.warn}22`, color:T.warn, fontWeight:'600' }}>
                {thread.linked_record_type}
              </span>
            )}
            {thread.link_status === 'flagged' && (
              <span style={{ fontSize:'10px', padding:'1px 5px', borderRadius:'3px', background:`${T.danger}22`, color:T.danger, fontWeight:'600' }}>
                Unlinked
              </span>
            )}
            {thread.unread_count > 0 && (
              <span style={{ fontSize:'10px', padding:'1px 5px', borderRadius:'3px', background:`${T.accent}22`, color:T.accent }}>
                {thread.unread_count} unread
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
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
            <div
              style={{ fontSize:F.sm, color:T.text0, lineHeight:'1.6', maxWidth:'100%', overflowX:'auto', wordBreak:'break-word' }}
              dangerouslySetInnerHTML={{ __html: msg.body_html }}
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
const ThreadDetail = ({ thread, onClose, onMarkRead, onArchive, onReply, onThreadUpdate, onLink }) => {
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
          <ActionBtn
            label={thread.is_read ? 'Mark Unread' : 'Mark Read'}
            icon={thread.is_read ? <Circle size={13}/> : <CheckCircle size={13}/>}
            onClick={() => onMarkRead(thread.id, !thread.is_read)}
          />
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

  const [filter,         setFilter]         = useState('unread');
  const [threads,        setThreads]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [refreshKey,     setRefreshKey]     = useState(0);
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [inboxSearch,    setInboxSearch]    = useState('');

  const buildQuery = useCallback((f) => {
    let params = `order=last_message_at.desc&limit=100&select=*`;
    if (f === 'unread')  params = `is_read=eq.false&${params}`;
    if (f === 'linked')  params = `link_status=eq.auto_linked&${params}`;
    if (f === 'flagged') params = `link_status=eq.flagged&${params}`;
    return params;
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedThread(null);
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
    await fetch('/api/gmail/thread-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, updates: { is_archived: true } }),
    }).catch(() => {});
  };

  const handleLink = (updates) => {
    if (!selectedThread) return;
    setSelectedThread(t => ({ ...t, ...updates }));
    setThreads(ts => ts.map(t => t.id === selectedThread.id ? { ...t, ...updates } : t));
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

  const filteredThreads = inboxSearch.trim().length < 2
    ? threads
    : (() => {
        const q = inboxSearch.trim().toLowerCase();
        const seen = new Set();
        return threads.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return (
            (t.subject || '').toLowerCase().includes(q) ||
            (t.from_name || '').toLowerCase().includes(q) ||
            (t.from_address || '').toLowerCase().includes(q) ||
            (t.body_preview || '').toLowerCase().includes(q)
          );
        });
      })();

  return (
    <div style={{ display:'flex', height:'100%', background:T.bg1, fontFamily:'var(--font-sans)', color:T.text0, fontSize:F.base, overflow:'hidden' }}>

      {/* Left panel — thread list */}
      <div style={{ width:isMobile?'100%':'340px', flexShrink:0, display:isMobile&&selectedThread?'none':'flex', flexDirection:'column', borderRight:`0.5px solid ${T.border}`, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <EnvelopeSimple size={18} weight="bold" color={T.accent}/>
              <span style={{ fontSize:F.md, fontWeight:'700', color:T.text0 }}>Inbox</span>
            </div>
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
          </div>
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {FILTER_TABS.map(({ key, label }) => (
              <FilterPill key={key} label={label} active={filter === key} onClick={() => setFilter(key)}/>
            ))}
          </div>
          <div style={{ marginTop:'8px', position:'relative' }}>
            <span style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', display:'flex', alignItems:'center' }}>
              <MagnifyingGlass size={13} weight="bold" color={T.text3}/>
            </span>
            <input
              type="text"
              value={inboxSearch}
              onChange={e => setInboxSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setInboxSearch(''); e.target.blur(); } }}
              placeholder="Search inbox…"
              style={{
                width:'100%', height:'28px', background:T.bg2,
                border:`0.5px solid ${T.border}`, borderRadius:'5px',
                padding:'4px 28px 4px 26px', color:T.text0,
                fontSize:F.sm, outline:'none', boxSizing:'border-box',
              }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            {inboxSearch.length > 0 && (
              <button
                onClick={() => setInboxSearch('')}
                style={{ position:'absolute', right:'6px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:T.text2, cursor:'pointer', fontSize:'14px', lineHeight:1, padding:'2px 4px' }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Thread list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && (
            <div style={{ padding:'24px', textAlign:'center', color:T.text3, fontSize:F.sm }}>Loading…</div>
          )}
          {!loading && filteredThreads.length === 0 && (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:'28px', color:T.bg3, marginBottom:'8px' }}>✉</div>
              <div style={{ fontSize:F.sm, color:T.text2 }}>
                {inboxSearch.trim().length >= 2
                  ? `No results for "${inboxSearch.trim()}"`
                  : filter === 'unread' ? 'No unread messages.'
                  : filter === 'flagged' ? 'No flagged messages.'
                  : 'No messages found.'}
              </div>
            </div>
          )}
          {!loading && filteredThreads.map(thread => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              selected={selectedThread?.id === thread.id}
              onClick={() => handleSelectThread(thread)}
            />
          ))}
        </div>
      </div>

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
              onReply={() => {}}
              onThreadUpdate={() => setRefreshKey(k => k + 1)}
              onLink={handleLink}
            />
          </>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px' }}>
            <EnvelopeSimple size={48} color={T.bg3} weight="bold"/>
            <div style={{ fontSize:F.base, color:T.text3 }}>Select a thread to read</div>
          </div>
        )}
      </div>
    </div>
  );
}
