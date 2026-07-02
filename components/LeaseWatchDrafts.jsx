import React, { useState, useEffect, useRef } from 'react';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const BRIEFING_SECRET = process.env.NEXT_PUBLIC_BRIEFING_SECRET || '';

const MILESTONE_STYLES = {
  '12mo': { background: '#374151', color: '#9ca3af', fontWeight: '600' },
  '6mo':  { background: '#1e3a5f', color: '#4a9eff', fontWeight: '600' },
  '3mo':  { background: '#451a03', color: '#f59e0b', fontWeight: '600' },
  '2mo':  { background: '#450a0a', color: '#ef4444', fontWeight: '600' },
  '1mo':  { background: '#3b0000', color: '#dc2626', fontWeight: '700' },
};

const MILESTONE_ORDER = ['1mo', '2mo', '3mo', '6mo', '12mo'];

function MilestonePill({ ms }) {
  const style = MILESTONE_STYLES[ms] || MILESTONE_STYLES['12mo'];
  return (
    <span style={{
      ...style,
      fontSize: F.xs,
      padding: '2px 7px',
      borderRadius: '10px',
      flexShrink: 0,
      display: 'inline-block',
    }}>
      {ms}
    </span>
  );
}

function DraftRow({ draft }) {
  const [hov, setHov] = useState(false);
  const tenant = draft.tenants || {};
  const tenantUrl = tenant.podio_id
    ? `/tenants/${tenant.podio_id}`
    : tenant.id ? `/tenants/X${tenant.id.slice(-6)}` : '#';
  const tenantName = tenant.tenant_dba || draft.to_name || '—';

  return (
    <a
      href={tenantUrl}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '7px 16px',
          borderBottom: `0.5px solid ${T.border}`,
          background: hov ? T.bg3 : 'transparent',
          transition: 'background 0.1s',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <MilestonePill ms={draft.milestone} />
        <span style={{ fontSize: F.sm, color: T.text0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tenantName}
          <span style={{ color: T.text2 }}> · {draft.prop_code}</span>
        </span>
        <span style={{ fontSize: F.xs, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {draft.lease_ends ? new Date(draft.lease_ends + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
        <span style={{ fontSize: F.xs, color: T.text3, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {draft.days_remaining}d
        </span>
        <span style={{ fontSize: F.xs, color: T.text3, flexShrink: 0 }}>→</span>
      </div>
    </a>
  );
}

export default function LeaseWatchDrafts({ compact = false }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const pollRef = useRef(null);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/agents/lease-watch');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDrafts(data);
      }
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
    return () => clearInterval(pollRef.current);
  }, []);

  const pendingDrafts = drafts.filter(d => d.status === 'draft' || d.status === 'edited');

  // Sort by milestone urgency then lease_ends
  const sortedDrafts = [...drafts].sort((a, b) => {
    const ao = MILESTONE_ORDER.indexOf(a.milestone);
    const bo = MILESTONE_ORDER.indexOf(b.milestone);
    if (ao !== bo) return ao - bo;
    return new Date(a.lease_ends) - new Date(b.lease_ends);
  });

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
        <span style={{ fontSize: F.md }}>📋</span>
        <span style={{ fontSize: F.sm, fontWeight: '700', color: T.text1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Lease Watch
        </span>
        <span style={{
          fontSize: F.xs,
          background: T.bg2,
          color: T.text1,
          padding: '1px 7px',
          borderRadius: '10px',
          fontWeight: '600',
        }}>
          {loading ? '…' : pendingDrafts.length}
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
          {!loading && !error && sortedDrafts.length === 0 && (
            <div style={{ padding: '16px', fontSize: F.sm, color: T.text3, textAlign: 'center' }}>
              No pending lease notices
            </div>
          )}
          <div style={{ maxHeight: '320px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {!loading && sortedDrafts.length > 0 && sortedDrafts.map(d => (
              <DraftRow key={`${d.tenant_id}:${d.milestone}`} draft={d} />
            ))}
          </div>
          {!compact && (
            <div style={{ padding: '10px 16px', fontSize: F.xs, color: T.text3, borderTop: sortedDrafts.length > 0 ? `0.5px solid ${T.border}` : 'none' }}>
              Full draft editor available in tenant record (coming in Phase 5).
            </div>
          )}
        </>
      )}
    </div>
  );
}
