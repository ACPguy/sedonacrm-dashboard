import React, { useState, useEffect } from 'react';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const BRIEFING_SECRET = process.env.NEXT_PUBLIC_BRIEFING_SECRET || '';

const STATUS_STYLES = {
  draft:    { background: '#1e3a5f', color: '#4a9eff', fontWeight: '600' },
  edited:   { background: '#451a03', color: '#f59e0b', fontWeight: '600' },
  approved: { background: '#14532d', color: '#4ade80', fontWeight: '600' },
};

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span style={{
      ...style,
      fontSize: F.xs,
      padding: '2px 7px',
      borderRadius: '10px',
      flexShrink: 0,
      display: 'inline-block',
    }}>
      {status}
    </span>
  );
}

function DraftRow({ draft, onDismiss, dismissingId }) {
  const [hov, setHov] = useState(false);
  const isBusy = dismissingId === draft.id;

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: `0.5px solid ${T.border}`,
        background: hov ? T.bg3 : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Top row: status pill | name | email | buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'nowrap' }}>
        <StatusPill status={draft.status} />
        <span style={{
          fontSize: F.sm, color: T.text0, fontWeight: '600',
          minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {draft.prospect_name || '—'}
        </span>
        <span style={{ fontSize: F.xs, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {draft.prospect_email || ''}
        </span>
        <button
          onClick={() => {}}
          style={{
            background: 'transparent',
            border: `0.5px solid ${T.border}`,
            borderRadius: '4px',
            padding: '2px 8px',
            color: T.text2,
            fontSize: F.xs,
            cursor: 'not-allowed',
            opacity: 0.45,
            flexShrink: 0,
          }}
        >
          Approve
        </button>
        <button
          onClick={() => onDismiss(draft.id)}
          disabled={isBusy}
          style={{
            background: isBusy ? T.bg2 : '#2a1010',
            border: `0.5px solid ${T.danger}55`,
            borderRadius: '4px',
            padding: '2px 8px',
            color: T.danger,
            fontSize: F.xs,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {isBusy ? '…' : 'Dismiss'}
        </button>
      </div>

      {/* Subject */}
      <div style={{
        fontSize: F.xs, color: T.text1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: draft.body ? '1px' : 0,
      }}>
        {draft.subject || '—'}
      </div>

      {/* Body preview */}
      {draft.body && (
        <div style={{
          fontSize: F.xs, color: T.text3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {draft.body.slice(0, 100)}
        </div>
      )}
    </div>
  );
}

export default function NewInquiryDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState(null);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/agents/new-inquiry', {
        headers: { 'x-briefing-secret': BRIEFING_SECRET },
      });
      const data = await res.json();
      if (Array.isArray(data)) setDrafts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleDismiss = async (id) => {
    setDismissingId(id);
    try {
      await fetch('/api/agents/new-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-briefing-secret': BRIEFING_SECRET,
        },
        body: JSON.stringify({ action: 'dismiss', id }),
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '8px', overflow: 'visible' }}>
      {/* Card header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '10px 16px',
          borderBottom: `0.5px solid ${T.border}`,
          background: T.bg3,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minHeight: '44px',
        }}>
        <span style={{ fontSize: F.md }}>🏢</span>
        <span style={{ fontSize: F.sm, fontWeight: '700', color: T.text1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          New Leasing Inquiries
        </span>
        <span style={{
          fontSize: F.xs,
          background: T.bg2,
          color: T.text1,
          padding: '1px 7px',
          borderRadius: '10px',
          fontWeight: '600',
        }}>
          {loading ? '…' : drafts.length}
        </span>
        <span style={{ fontSize: F.xs, color: T.text2, flexShrink: 0, marginLeft: 'auto' }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          {loading && (
            <div style={{ padding: '16px', fontSize: F.sm, color: T.text2, textAlign: 'center' }}>Loading…</div>
          )}
          {error && !loading && (
            <div style={{ padding: '12px 16px', fontSize: F.sm, color: T.danger }}>{error}</div>
          )}
          {!loading && !error && drafts.length === 0 && (
            <div style={{ padding: '16px', fontSize: F.sm, color: T.text3, textAlign: 'center' }}>
              No new inquiries
            </div>
          )}
          <div style={{ maxHeight: '320px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {!loading && drafts.map(d => (
              <DraftRow key={d.id} draft={d} onDismiss={handleDismiss} dismissingId={dismissingId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
