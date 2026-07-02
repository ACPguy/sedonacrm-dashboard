import React, { useState, useEffect, useRef } from 'react';
import { Sun } from '@phosphor-icons/react';
import LeaseWatchDrafts from './LeaseWatchDrafts';
import NewInquiryDrafts from './NewInquiryDrafts';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const BRIEFING_SECRET = process.env.NEXT_PUBLIC_BRIEFING_SECRET || '';

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

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

// ── Briefing item row ─────────────────────────────────────────────────────────
function BriefingItem({ item, isMobile }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: `0.5px solid ${T.border}`,
        gap: isMobile ? '2px' : '12px',
        background: hov ? T.bg3 : 'transparent',
        transition: 'background 0.1s',
        cursor: item.url ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: F.sm, color: T.text0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', flex: 1 }}>
        {item.label}
      </span>
      {item.meta && (
        <span style={{ fontSize: F.xs, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.meta}</span>
      )}
    </div>
  );
  if (item.url) {
    return <a href={item.url} style={{ display: 'block', textDecoration: 'none' }}>{inner}</a>;
  }
  return inner;
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({ dotColor, title, items, open, onToggle, isMobile }) {
  if (items.length === 0) return null;
  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '10px 16px',
          borderBottom: open ? `0.5px solid ${T.border}` : 'none',
          background: T.bg3,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minHeight: '44px',
        }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: F.sm, fontWeight: '700', color: T.text0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ fontSize: F.xs, background: T.bg2, color: T.text1, padding: '1px 7px', borderRadius: '10px', fontWeight: '600', flexShrink: 0 }}>
          {items.length}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: F.xs, color: T.text2, flexShrink: 0 }}>{open ? '▼' : '▶'}</span>
      </div>
      {open && (
        <div>
          {items.map((item, i) => <BriefingItem key={i} item={item} isMobile={isMobile} />)}
        </div>
      )}
    </div>
  );
}

// ── Snapshot stat pill ────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '8px 16px', textAlign: 'center', minWidth: '120px', flexShrink: 0 }}>
      <div style={{ fontSize: F.xl, fontWeight: '700', color: T.text0 }}>{value}</div>
      <div style={{ fontSize: F.xs, color: T.text2, marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BriefingView({ propCode, embedded }) {
  const w = useWindowWidth();
  const isMobile = w < 640;

  const [briefing, setBriefing]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [running, setRunning]         = useState(false);
  const [fetchError, setFetchError]   = useState(null);
  const [openSections, setOpenSections] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pollRef = useRef(null);
  const dropdownRef = useRef(null);

  const lsKey = `briefing_sections_${propCode || 'home'}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored) setOpenSections(JSON.parse(stored));
    } catch {}
  }, [lsKey]);

  useEffect(() => {
    if (openSections !== null) {
      try { localStorage.setItem(lsKey, JSON.stringify(openSections)); } catch {}
    }
  }, [openSections, lsKey]);

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

  useEffect(() => { fetchBriefing(); }, []);

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

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

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

  const todayStr       = getAZDateStr();
  const todayFormatted = formatDate(todayStr);

  // Tag items with source array so dot-color and default-open logic can use it
  const urgent    = briefing?.urgent    || [];
  const attention = briefing?.attention || [];
  const fyi       = briefing?.fyi       || [];
  const snapshot  = briefing?.snapshot  || {};

  const urgentTagged    = urgent.map(i => ({ ...i, _src: 'urgent' }));
  const attentionTagged = attention.map(i => ({ ...i, _src: 'attention' }));
  const allActionable   = [...urgentTagged, ...attentionTagged];

  const filterFn = propCode
    ? (item) => item.meta?.includes(propCode)
    : () => true;

  const woItems        = allActionable.filter(i => i.type === 'task' && i.label?.includes('WO') && filterFn(i));
  const taskItems      = allActionable.filter(i => i.type === 'task' && !i.label?.includes('WO') && filterFn(i));
  const insuranceItems = allActionable.filter(i => (i.type === 'coi' || i.type === 'property_insurance') && filterFn(i));
  const fyiItems       = fyi.filter(filterFn);

  const dotColor = (items) => {
    if (items.some(i => i._src === 'urgent'))    return T.danger;
    if (items.some(i => i._src === 'attention')) return T.warn;
    return T.success;
  };

  const sections = [
    { key: 'wo',        title: 'Work Orders',  items: woItems,        color: dotColor(woItems) },
    { key: 'tasks',     title: 'Tasks',        items: taskItems,      color: dotColor(taskItems) },
    { key: 'insurance', title: 'Insurance',    items: insuranceItems, color: dotColor(insuranceItems) },
    { key: 'fyi',       title: 'FYI',          items: fyiItems,       color: T.success },
  ];

  // Default: open if section has any urgent items; otherwise closed
  const defaultOpen = Object.fromEntries(
    sections.map(s => [s.key, s.items.some(i => i._src === 'urgent')])
  );
  const resolvedOpen = openSections ?? defaultOpen;

  const toggleSection = (key) => {
    setOpenSections({ ...resolvedOpen, [key]: !resolvedOpen[key] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: T.bg1 }}>

      {/* Header */}
      <div style={{ padding: '10px 20px 8px', borderBottom: `0.5px solid ${T.border}`, background: T.bg0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Sun size={16} weight="fill" style={{ color: '#d4924a', flexShrink: 0 }} />
          <span style={{ fontSize: F.sm, color: T.text2 }}>{todayFormatted}</span>
          {briefing?.updated_at && briefing.status === 'complete' && (
            <span style={{ fontSize: F.xs, color: T.text3 }}>· Last run: {formatTime(briefing.updated_at)}</span>
          )}
          <span style={{ flex: 1 }} />
          {briefing?.status === 'complete' && (
            <>
              <button
                onClick={() => {
                  const next = Object.fromEntries(sections.map(s => [s.key, true]));
                  setOpenSections(next);
                }}
                style={{ background: 'none', border: `0.5px solid ${T.border}`, borderRadius: '4px', padding: '3px 10px', fontSize: F.xs, color: T.text1, cursor: 'pointer' }}>
                Expand All
              </button>
              <button
                onClick={() => {
                  const next = Object.fromEntries(sections.map(s => [s.key, false]));
                  setOpenSections(next);
                }}
                style={{ background: 'none', border: `0.5px solid ${T.border}`, borderRadius: '4px', padding: '3px 10px', fontSize: F.xs, color: T.text1, cursor: 'pointer' }}>
                Collapse All
              </button>
            </>
          )}
          <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{ background: 'none', border: `0.5px solid ${T.border}`, borderRadius: '4px', padding: '3px 10px', fontSize: F.xs, color: T.text1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '28px' }}>
              ↻ <span style={{ fontSize: '10px', color: T.text2 }}>▾</span>
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                background: T.bg3, border: `0.5px solid ${T.border}`, borderRadius: '6px',
                minWidth: '160px', zIndex: 100, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}>
                <button
                  onClick={() => { setDropdownOpen(false); setLoading(true); fetchBriefing(); }}
                  style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: F.sm, color: T.text0, cursor: 'pointer', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  ↻ Refresh
                </button>
                <div style={{ height: '0.5px', background: T.border }} />
                <button
                  onClick={async () => { setDropdownOpen(false); await handleRunNow(); }}
                  disabled={running}
                  style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: F.sm, color: running ? T.text3 : T.warn, cursor: running ? 'not-allowed' : 'pointer', display: 'block', opacity: running ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!running) e.currentTarget.style.background = T.bg2; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {running ? '⏳ Running…' : '▶ Re-run Briefing'}
                </button>
              </div>
            )}
          </div>
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
            <div style={{ fontSize: F.sm, color: T.text3 }}>Today's briefing will be ready after 5 AM AZ time.</div>
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
            {/* Draft agent cards — portfolio home only */}
            {!propCode && <LeaseWatchDrafts compact={true} />}
            {!propCode && <NewInquiryDrafts />}

            {/* Collapsible agent sections */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sections.map(sec => (
                <CollapsibleSection
                  key={sec.key}
                  dotColor={sec.color}
                  title={sec.title}
                  items={sec.items}
                  open={!!resolvedOpen[sec.key]}
                  onToggle={() => toggleSection(sec.key)}
                  isMobile={isMobile}
                />
              ))}
            </div>

            {/* Portfolio snapshot strip — home view only */}
            {!propCode && (
              <div style={{
                display: 'flex',
                gap: '10px',
                overflowX: isMobile ? 'auto' : 'visible',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: isMobile ? '4px' : '0',
              }}>
                <StatPill label="Active Properties" value={snapshot.activePropertiesCount ?? '—'} />
                <StatPill label="Active Tenants"    value={snapshot.activeTenantsCount ?? '—'} />
                <StatPill label="Open Tasks"        value={snapshot.openTasksCount ?? '—'} />
                <StatPill label="Urgent Items"      value={snapshot.urgentCount ?? 0} />
                <StatPill label="Attention Items"   value={snapshot.attentionCount ?? 0} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
