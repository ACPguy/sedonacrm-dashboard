import React, { useState, useEffect } from 'react';
import { EnvelopeSimple, NotePencil, Phone } from '@phosphor-icons/react';
import EmailCompose from './EmailCompose';
import { T } from '../lib/theme';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const sbInsert = async (table, row) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const fmtDateTime = d => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const mm  = String(dt.getMonth()+1).padStart(2,'0');
  const dd  = String(dt.getDate()).padStart(2,'0');
  const yyyy = dt.getFullYear();
  let h = dt.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(dt.getMinutes()).padStart(2,'0');
  return `${mm}-${dd}-${yyyy} ${h}:${min} ${ampm}`;
};

const FILTER_TABS = [
  { key:'all',   label:'All' },
  { key:'email', label:'Email' },
  { key:'sms',   label:'SMS' },
  { key:'notes', label:'Notes' },
  { key:'calls', label:'Calls' },
];

const FilterPill = ({ label, active, onClick }) => (
  <button onClick={onClick}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${T.accent}33`; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? T.accent : 'transparent'; }}
    style={{
      padding:'4px 12px', borderRadius:'4px', fontSize:F.xs, fontWeight:'500',
      cursor: active ? 'default' : 'pointer',
      border:`1px solid ${T.accent}`,
      background: active ? T.accent : 'transparent',
      color: active ? '#fff' : T.accent,
      transition:'background 0.15s ease',
      whiteSpace:'nowrap',
    }}>
    {label}
  </button>
);

const ActionBtn = ({ label, onClick, disabled }) => (
  <button onClick={disabled ? undefined : onClick}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = T.bg3; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = T.bg2; }}
    style={{
      padding:'5px 14px', borderRadius:'4px', fontSize:F.sm, fontWeight:'500',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border:`1px solid ${disabled ? T.text3 : T.border}`,
      background: T.bg2,
      color: disabled ? T.text3 : T.text0,
      transition:'background 0.15s ease',
      opacity: disabled ? 0.5 : 1,
    }}>
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function CommunicationTimeline({ recordType, recordId, fromAccount = 'scott@andersoncp.com', crmRecordLabel, crmRecordUrl }) {
  const [entries, setEntries]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [gmailMap, setGmailMap]           = useState({});
  const [expandedPrev, setExpandedPrev]   = useState({});
  const [expandedThread, setExpandedThread] = useState({});
  const [showNoteCompose, setShowNoteCompose] = useState(false);
  const [noteText, setNoteText]           = useState('');
  const [savingNote, setSavingNote]       = useState(false);
  const [showCallLog, setShowCallLog]     = useState(false);
  const [callFields, setCallFields]       = useState({ datetime:'', duration:'', direction:'inbound', notes:'' });
  const [savingCall, setSavingCall]       = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0);
  const [showCompose, setShowCompose]     = useState(false);

  useEffect(() => {
    if (!recordId) return;
    setLoading(true);

    sbFetch('communication_timeline',
      `record_type=eq.${recordType}&record_id=eq.${recordId}&order=entry_at.desc&limit=200`
    ).then(async data => {
      setEntries(data);
      const threadIds = [...new Set(data.filter(e => e.email_thread_id).map(e => e.email_thread_id))];
      if (threadIds.length > 0) {
        const threads = await sbFetch('email_threads', `id=in.(${threadIds.join(',')})&select=id,gmail_thread_id`);
        const m = {};
        threads.forEach(t => { m[t.id] = t.gmail_thread_id; });
        setGmailMap(m);
      }
    }).catch(err => {
      console.error('[CommunicationTimeline] load:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [recordId, recordType, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await sbInsert('communication_timeline', {
        record_type: recordType,
        record_id:   recordId,
        entry_type:  'note',
        body_preview: noteText.trim(),
        direction:   'internal',
        entry_at:    new Date().toISOString(),
      });
      setNoteText('');
      setShowNoteCompose(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('[CommunicationTimeline] saveNote:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const saveCall = async () => {
    if (!callFields.datetime) return;
    setSavingCall(true);
    try {
      await sbInsert('communication_timeline', {
        record_type: recordType,
        record_id:   recordId,
        entry_type:  'call',
        direction:   callFields.direction,
        body_preview: callFields.notes || '',
        entry_at:    new Date(callFields.datetime).toISOString(),
      });
      setCallFields({ datetime:'', duration:'', direction:'inbound', notes:'' });
      setShowCallLog(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('[CommunicationTimeline] saveCall:', err);
    } finally {
      setSavingCall(false);
    }
  };

  const filtered = entries.filter(e => {
    if (filter === 'all')   return true;
    if (filter === 'email') return e.entry_type === 'email';
    if (filter === 'sms')   return e.entry_type === 'sms';
    if (filter === 'notes') return e.entry_type === 'note';
    if (filter === 'calls') return e.entry_type === 'call';
    return true;
  });

  // Group email entries by thread so the newest is shown with older messages collapsible
  const groupedEntries = (() => {
    const result = [];
    const seen = {};
    for (const entry of filtered) {
      if (entry.entry_type === 'email' && entry.email_thread_id) {
        const tid = entry.email_thread_id;
        if (tid in seen) {
          result[seen[tid]]._threadMsgs.push(entry);
        } else {
          seen[tid] = result.length;
          result.push({ ...entry, _threadMsgs: [] });
        }
      } else {
        result.push(entry);
      }
    }
    return result;
  })();

  // ── Entry renderers ────────────────────────────────────────────────────────
  const renderEmailEntry = entry => {
    const gmailTid      = gmailMap[entry.email_thread_id];
    const isExpanded    = expandedPrev[entry.id];
    const threadMsgs    = entry._threadMsgs || [];
    const threadOpen    = expandedThread[entry.id];
    const dir           = entry.direction;

    return (
      <div key={entry.id}
        style={{padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, minHeight:'48px', background:'transparent', transition:'background 0.12s'}}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{display:'flex', alignItems:'flex-start', gap:'10px'}}>
          <div style={{flexShrink:0, marginTop:'2px', display:'flex', alignItems:'center', gap:'3px'}}>
            <EnvelopeSimple size={15} weight="bold" color={T.text2}/>
            <span style={{fontSize:F.xs, color: dir==='inbound' ? T.success : T.warn, fontWeight:'700', lineHeight:1}}>
              {dir==='inbound' ? '↓' : '↑'}
            </span>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'2px'}}>
              <span style={{fontSize:F.sm, color:T.text1, fontWeight:'500'}}>
                {dir==='inbound'
                  ? (entry.from_name || entry.from_address || '—')
                  : `To: ${entry.from_address || '—'}`}
              </span>
              {entry.is_reference && (
                <a href={entry.reference_url || '#'} style={{fontSize:F.xs, color:'#d4924a', background:'rgba(212,146,74,0.12)', padding:'1px 6px', borderRadius:'3px', textDecoration:'none'}}
                  onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                  re: {entry.reference_label || entry.reference_record_type}
                </a>
              )}
              <span style={{marginLeft:'auto', fontSize:F.xs, color:T.text3, flexShrink:0}}>
                {fmtDateTime(entry.entry_at)}
              </span>
            </div>
            {entry.subject && (
              <div style={{fontSize:F.sm, color:T.text0, fontWeight:'600', marginBottom:'4px'}}>{entry.subject}</div>
            )}
            {entry.body_preview && (
              <div style={{
                fontSize:F.sm, color:T.text2, lineHeight:'1.45',
                overflow: isExpanded ? 'visible' : 'hidden',
                display: isExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isExpanded ? undefined : 2,
                WebkitBoxOrient: isExpanded ? undefined : 'vertical',
              }}>
                {entry.body_preview}
              </div>
            )}
            {entry.body_preview && entry.body_preview.length > 120 && (
              <button onClick={() => setExpandedPrev(p => ({...p, [entry.id]: !p[entry.id]}))}
                style={{background:'none', border:'none', color:T.accent, fontSize:F.xs, cursor:'pointer', padding:'2px 0', marginTop:'2px'}}
                onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'6px', flexWrap:'wrap'}}>
              {gmailTid && (
                <a href={`https://mail.google.com/mail/u/0/#all/${gmailTid}`} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:F.xs, color:T.accent, textDecoration:'none'}}
                  onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                  View in Gmail →
                </a>
              )}
              {threadMsgs.length > 0 && (
                <button onClick={() => setExpandedThread(p => ({...p, [entry.id]: !p[entry.id]}))}
                  style={{background:'none', border:'none', color:T.text2, fontSize:F.xs, cursor:'pointer', padding:0}}
                  onMouseEnter={e => e.currentTarget.style.color=T.accent}
                  onMouseLeave={e => e.currentTarget.style.color=T.text2}>
                  {threadOpen
                    ? 'Hide earlier messages'
                    : `Show ${threadMsgs.length} earlier message${threadMsgs.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
            {threadOpen && threadMsgs.map(m => (
              <div key={m.id} style={{marginTop:'8px', paddingLeft:'12px', borderLeft:`2px solid ${T.border}`}}>
                <div style={{display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap', marginBottom:'2px'}}>
                  <span style={{fontSize:F.xs, color:T.text2}}>{m.from_name || m.from_address}</span>
                  <span style={{fontSize:F.xs, color: m.direction==='inbound' ? T.success : T.warn}}>
                    {m.direction==='inbound' ? '↓' : '↑'}
                  </span>
                  <span style={{fontSize:F.xs, color:T.text3, marginLeft:'auto'}}>{fmtDateTime(m.entry_at)}</span>
                </div>
                {m.body_preview && <div style={{fontSize:F.xs, color:T.text2, lineHeight:'1.4'}}>{m.body_preview}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderNoteEntry = entry => (
    <div key={entry.id}
      style={{padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, minHeight:'48px', background:'transparent', transition:'background 0.12s'}}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{display:'flex', alignItems:'flex-start', gap:'10px'}}>
        <NotePencil size={15} weight="bold" color={T.purple} style={{marginTop:'2px', flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px'}}>
            <span style={{fontSize:F.xs, color:T.purple, fontWeight:'600'}}>Note</span>
            <span style={{marginLeft:'auto', fontSize:F.xs, color:T.text3}}>{fmtDateTime(entry.entry_at)}</span>
          </div>
          {entry.body_preview && (
            <div style={{fontSize:F.sm, color:T.text1, lineHeight:'1.5', whiteSpace:'pre-wrap'}}>{entry.body_preview}</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCallEntry = entry => {
    const dir = entry.direction || 'inbound';
    return (
      <div key={entry.id}
        style={{padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, minHeight:'48px', background:'transparent', transition:'background 0.12s'}}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{display:'flex', alignItems:'flex-start', gap:'10px'}}>
          <Phone size={15} weight="bold" color={T.success} style={{marginTop:'2px', flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px', flexWrap:'wrap'}}>
              <span style={{fontSize:F.xs, color: dir==='inbound' ? T.success : T.warn, fontWeight:'600'}}>
                {dir==='inbound' ? '↓ Incoming Call' : '↑ Outgoing Call'}
              </span>
              <span style={{marginLeft:'auto', fontSize:F.xs, color:T.text3, flexShrink:0}}>{fmtDateTime(entry.entry_at)}</span>
            </div>
            {entry.body_preview && (
              <div style={{fontSize:F.sm, color:T.text1, lineHeight:'1.5'}}>{entry.body_preview}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Compose areas ──────────────────────────────────────────────────────────
  const noteCompose = showNoteCompose && (
    <div style={{margin:'0 0 8px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'10px'}}>
      <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
        placeholder="Add a note…"
        style={{width:'100%', minHeight:'96px', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px',
          padding:'8px', color:T.text0, fontSize:F.sm, resize:'vertical', outline:'none',
          fontFamily:'inherit', boxSizing:'border-box', paddingBottom:'72px'}}/>
      <div style={{display:'flex', gap:'6px', marginTop:'6px', justifyContent:'flex-end'}}>
        <button onClick={() => { setShowNoteCompose(false); setNoteText(''); }}
          style={{padding:'4px 12px', borderRadius:'4px', fontSize:F.sm, cursor:'pointer', border:`0.5px solid ${T.border}`, background:'transparent', color:T.text1}}>
          Cancel
        </button>
        <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
          style={{padding:'4px 12px', borderRadius:'4px', fontSize:F.sm,
            cursor: savingNote || !noteText.trim() ? 'not-allowed' : 'pointer',
            border:`0.5px solid ${T.accent}`, background:T.accent, color:'#fff',
            opacity: savingNote || !noteText.trim() ? 0.5 : 1}}>
          {savingNote ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </div>
  );

  const callCompose = showCallLog && (
    <div style={{margin:'0 0 8px', background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:'6px', padding:'10px'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px'}}>
        <div>
          <div style={{fontSize:F.xs, color:T.text3, marginBottom:'3px'}}>Date &amp; Time</div>
          <input type="datetime-local" value={callFields.datetime}
            onChange={e => setCallFields(f => ({...f, datetime: e.target.value}))}
            style={{width:'100%', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'5px 8px', color:T.text0, fontSize:F.sm, outline:'none', boxSizing:'border-box'}}/>
        </div>
        <div>
          <div style={{fontSize:F.xs, color:T.text3, marginBottom:'3px'}}>Duration</div>
          <input type="text" value={callFields.duration} placeholder="e.g. 15 min"
            onChange={e => setCallFields(f => ({...f, duration: e.target.value}))}
            style={{width:'100%', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'5px 8px', color:T.text0, fontSize:F.sm, outline:'none', boxSizing:'border-box'}}/>
        </div>
        <div>
          <div style={{fontSize:F.xs, color:T.text3, marginBottom:'3px'}}>Direction</div>
          <select value={callFields.direction}
            onChange={e => setCallFields(f => ({...f, direction: e.target.value}))}
            style={{width:'100%', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'5px 8px', color:T.text0, fontSize:F.sm, outline:'none'}}>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:F.xs, color:T.text3, marginBottom:'3px'}}>Notes</div>
          <input type="text" value={callFields.notes} placeholder="Brief notes…"
            onChange={e => setCallFields(f => ({...f, notes: e.target.value}))}
            style={{width:'100%', background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'5px 8px', color:T.text0, fontSize:F.sm, outline:'none', boxSizing:'border-box'}}/>
        </div>
      </div>
      <div style={{display:'flex', gap:'6px', justifyContent:'flex-end'}}>
        <button onClick={() => { setShowCallLog(false); setCallFields({ datetime:'', duration:'', direction:'inbound', notes:'' }); }}
          style={{padding:'4px 12px', borderRadius:'4px', fontSize:F.sm, cursor:'pointer', border:`0.5px solid ${T.border}`, background:'transparent', color:T.text1}}>
          Cancel
        </button>
        <button onClick={saveCall} disabled={savingCall || !callFields.datetime}
          style={{padding:'4px 12px', borderRadius:'4px', fontSize:F.sm,
            cursor: savingCall || !callFields.datetime ? 'not-allowed' : 'pointer',
            border:`0.5px solid ${T.accent}`, background:T.accent, color:'#fff',
            opacity: savingCall || !callFields.datetime ? 0.5 : 1}}>
          {savingCall ? 'Saving…' : 'Save Call'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', background:T.bg1, position:'relative'}}>

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div style={{padding:'10px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg0, flexShrink:0}}>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginBottom:'8px'}}>
          <ActionBtn label="✉ Email" onClick={() => { setShowCompose(true); setShowNoteCompose(false); setShowCallLog(false); }}/>
          <ActionBtn label="SMS — Phase 6" disabled/>
          <ActionBtn label="📋 Note" onClick={() => { setShowNoteCompose(n => !n); setShowCallLog(false); }}/>
          <ActionBtn label="📞 Call" onClick={() => { setShowCallLog(c => !c); setShowNoteCompose(false); }}/>
        </div>

        {noteCompose}
        {callCompose}

        {/* ── Filter pills ──────────────────────────────────────────────── */}
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {FILTER_TABS.map(({ key, label }) => (
            <FilterPill key={key} label={label} active={filter === key} onClick={() => setFilter(key)}/>
          ))}
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <div style={{flex:1, overflowY:'auto'}}>
        {loading && (
          <div style={{padding:'24px', textAlign:'center', color:T.text3, fontSize:F.sm}}>Loading…</div>
        )}
        {!loading && groupedEntries.length === 0 && (
          <div style={{padding:'40px 24px', textAlign:'center'}}>
            <div style={{fontSize:'32px', color:T.bg3, marginBottom:'8px'}}>✉</div>
            <div style={{fontSize:F.base, color:T.text2, marginBottom:'4px'}}>No communications yet.</div>
            <div style={{fontSize:F.sm, color:T.text3}}>Send an email to get started.</div>
          </div>
        )}
        {!loading && groupedEntries.map(entry => {
          if (entry.entry_type === 'email') return renderEmailEntry(entry);
          if (entry.entry_type === 'note')  return renderNoteEntry(entry);
          if (entry.entry_type === 'call')  return renderCallEntry(entry);
          return null;
        })}
      </div>

      {showCompose && (
        <EmailCompose
          mode="new"
          crmRecordType={recordType}
          crmRecordId={recordId}
          crmRecordLabel={crmRecordLabel}
          crmRecordUrl={crmRecordUrl}
          fromAccount={fromAccount}
          onSend={() => { setShowCompose(false); setRefreshKey(k => k + 1); }}
          onClose={() => setShowCompose(false)}
        />
      )}
    </div>
  );
}
