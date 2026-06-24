import React, { useState, useEffect, useRef } from 'react';
import { Sun } from '@phosphor-icons/react';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const BRIEFING_SECRET = process.env.NEXT_PUBLIC_BRIEFING_SECRET || '';

async function runBriefing() {
  const res = await fetch('/api/agents/morning-briefing', {
    method: 'POST',
    headers: { 'x-briefing-secret': BRIEFING_SECRET },
  });
  return res.json();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getAZDateStr() {
  const now = new Date();
  const azOffset = -7 * 60;
  const azTime = new Date(now.getTime() + (azOffset - now.getTimezoneOffset()) * 60000);
  return azTime.toISOString().slice(0, 10);
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ emoji, title, items, color }) {
  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
      <div style={{ padding: '10px 16px', borderBottom: `0.5px solid ${T.border}`, background: T.bg3, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: F.md }}>{emoji}</span>
        <span style={{ fontSize: F.sm, fontWeight: '700', color: color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        <span style={{ fontSize: F.xs, background: T.bg2, color: T.text1, padding: '1px 7px', borderRadius: '10px', fontWeight: '600', marginLeft: 'auto' }}>
          {items.length}
        </span>
      </div>
      <div>
        {items.length === 0 ? (
          <div style={{ padding: '16px', fontSize: F.sm, color: T.text2, textAlign: 'center' }}>Nothing to report</div>
        ) : (
          items.map((item, i) => <BriefingItem key={i} item={item} />)
        )}
      </div>
    </div>
  );
}

// ── Briefing item row ─────────────────────────────────────────────────────────
function BriefingItem({ item }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `0.5px solid ${T.border}`, gap: '12px', background: hov ? T.bg3 : 'transparent', transition: 'background 0.1s', cursor: item.url ? 'pointer' : 'default' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: F.sm, color: T.text0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
      {item.meta && <span style={{ fontSize: F.xs, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.meta}</span>}
    </div>
  );
  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        {inner}
      </a>
    );
  }
  return inner;
}

// ── Snapshot stat pill ────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '8px 16px', textAlign: 'center', minWidth: '120px' }}>
      <div style={{ fontSize: F.xl, fontWeight: '700', color: T.text0 }}>{value}</div>
      <div style={{ fontSize: F.xs, color: T.text2, marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BriefingView() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const pollRef = useRef(null);

  const fetchBriefing = async () => {
    try {
      const res = await fetch('/api/agents/morning-briefing');
      const data = await res.json();
      setBriefing(data);
      return data;
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  // Poll when status=running
  useEffect(() => {
    if (briefing?.status === 'running') {
      pollRef.current = setInterval(async () => {
        const data = await fetchBriefing();
        if (data?.status !== 'running') clearInterval(pollRef.current);
      }, 5000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [briefing?.status]);

  const handleRunNow = async () => {
    setRunning(true);
    setFetchError(null);
    try {
      const data = await runBriefing();
      setBriefing(data);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const todayStr = getAZDateStr();
  const todayFormatted = formatDate(todayStr);

  const urgent    = briefing?.urgent    || [];
  const attention = briefing?.attention || [];
  const fyi       = briefing?.fyi       || [];
  const snapshot  = briefing?.snapshot  || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: T.bg1 }}>

      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `0.5px solid ${T.border}`, background: T.bg0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sun size={22} weight="fill" style={{ color: '#d4924a', flexShrink: 0 }} />
              <span style={{ fontSize: F.lg, fontWeight: '700', color: T.text0 }}>Morning Briefing</span>
            </div>
            <div style={{ fontSize: F.sm, color: T.text2, marginTop: '2px', paddingLeft: '32px' }}>{todayFormatted}</div>
            {briefing?.updated_at && briefing.status === 'complete' && (
              <div style={{ fontSize: F.xs, color: T.text3, marginTop: '1px', paddingLeft: '32px' }}>
                Last run: {formatTime(briefing.updated_at)}
              </div>
            )}
          </div>
          <button
            onClick={handleRunNow}
            disabled={running}
            style={{ background: running ? T.bg3 : '#E8630A', border: 'none', borderRadius: '5px', padding: '7px 18px', color: '#fff', fontSize: F.sm, fontWeight: '600', cursor: running ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: running ? 0.7 : 1 }}>
            {running ? 'Running…' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: T.text2, fontSize: F.base }}>Loading briefing…</div>
        )}

        {fetchError && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: T.danger, fontSize: F.base }}>{fetchError}</div>
        )}

        {!loading && !fetchError && briefing?.status === 'none' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.text2 }}>
            <div style={{ fontSize: F.lg, marginBottom: '12px' }}>No briefing yet today</div>
            <div style={{ fontSize: F.sm, color: T.text3 }}>Click "Run Now" to generate today's briefing.</div>
          </div>
        )}

        {!loading && briefing?.status === 'running' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.text2 }}>
            <div style={{ fontSize: F.lg, marginBottom: '8px' }}>⏳ Briefing in progress…</div>
            <div style={{ fontSize: F.sm, color: T.text3 }}>Refreshing automatically.</div>
          </div>
        )}

        {!loading && briefing?.status === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.danger }}>
            <div style={{ fontSize: F.md, marginBottom: '8px' }}>Error generating briefing</div>
            <div style={{ fontSize: F.sm, color: T.text2, marginBottom: '16px' }}>{briefing.error_message}</div>
          </div>
        )}

        {!loading && briefing?.status === 'complete' && (
          <>
            {/* Three section cards */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <SectionCard emoji="🔴" title="Urgent" items={urgent}    color={T.danger} />
              <SectionCard emoji="🟡" title="Attention" items={attention} color={T.warn}   />
              <SectionCard emoji="🟢" title="FYI"    items={fyi}       color={T.success} />
            </div>

            {/* Snapshot bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <StatPill label="Active Properties" value={snapshot.activePropertiesCount ?? '—'} />
              <StatPill label="Active Tenants"    value={snapshot.activeTenantsCount ?? '—'} />
              <StatPill label="Open Tasks"        value={snapshot.openTasksCount ?? '—'} />
              <StatPill label="Urgent Items"      value={snapshot.urgentCount ?? 0} />
              <StatPill label="Attention Items"   value={snapshot.attentionCount ?? 0} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
